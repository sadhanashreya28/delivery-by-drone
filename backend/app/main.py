import io
import os
import json
import tempfile
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image, ImageOps
import cv2
import numpy as np

from app.config import (
    CORS_ORIGINS, INPUT_SIZE_HW, CLASS_INFO, DATA_DIR, MODEL_DIR,
    DEFAULT_SAFE_IDS, DEFAULT_HAZARD_IDS
)
from app.models import (
    DEVICE, MODEL_SPECS, init_models, loaded_models, load_errors, get_model
)
from app.inference import preprocess_image, predict_mask, colorize_mask, mask_to_base64_png
from app.safety import assess, parse_class_ids, frame_changed

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("safe_drop_checker")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize model registry at startup."""
    logger.info("Initializing PyTorch models...")
    init_models()
    logger.info(f"Models initialized. Loaded: {list(loaded_models.keys())}")
    yield

app = FastAPI(
    title="Safe Drop Checker API",
    description="Backend API for Drone Delivery Drop Zone Safety Checker",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - allow all origins so frontend works from any local IP
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """Returns backend status, device info, loaded models and load errors."""
    return {
        "status": "ok",
        "device": str(DEVICE),
        "input_size_hw": INPUT_SIZE_HW,
        "loaded_models": list(loaded_models.keys()),
        "load_errors": load_errors
    }

@app.get("/classes")
def get_classes():
    """Returns class metadata list and default safe/hazard ID configurations."""
    return {
        "classes": CLASS_INFO,
        "default_safe_ids": DEFAULT_SAFE_IDS,
        "default_hazard_ids": DEFAULT_HAZARD_IDS
    }

@app.get("/models")
def get_model_benchmarks():
    """Returns benchmark metrics, status, and visualization plot URLs for all supported models."""
    # Read default metrics JSON
    metrics_file = DATA_DIR / "metrics.json"
    metrics_data = {}
    if metrics_file.exists():
        try:
            with open(metrics_file, "r", encoding="utf-8") as f:
                metrics_data = json.load(f)
        except Exception as e:
            logger.error(f"Error reading metrics.json: {e}")

    models_info = []

    for model_id, spec in MODEL_SPECS.items():
        # Check override metrics file
        override_file = DATA_DIR / f"metrics_model{1 if model_id=='unet' else 2}_{model_id}.json"
        m_data = metrics_data.get(model_id, {})
        if override_file.exists():
            try:
                with open(override_file, "r", encoding="utf-8") as f:
                    m_data = json.load(f)
            except Exception as e:
                logger.error(f"Error reading {override_file.name}: {e}")

        # Check for training & prediction plots in backend/data
        plots = {}
        t_curve = f"training_curves_{model_id}.png"
        p_sample = f"predictions_{model_id}.png"
        if (DATA_DIR / t_curve).exists():
            plots["training_curves"] = f"/files/{t_curve}"
        if (DATA_DIR / p_sample).exists():
            plots["predictions"] = f"/files/{p_sample}"

        is_loaded = model_id in loaded_models

        models_info.append({
            "id": model_id,
            "display_name": spec["display_name"],
            "architecture": spec["architecture"],
            "loaded": is_loaded,
            "load_error": load_errors.get(model_id),
            "params_millions": m_data.get("params_millions", 24.44 if model_id == "unet" else 22.44),
            "metrics": m_data,
            "plots": plots
        })

    return {
        "models": models_info,
        "training_metadata": metrics_data.get("training", {})
    }

@app.get("/files/{filename}")
def serve_data_file(filename: str):
    """Serves static files strictly from backend/data directory (prevents path traversal)."""
    safe_name = Path(filename).name
    file_path = DATA_DIR / safe_name
    
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(path=file_path)

def parse_box(box_str: str) -> Tuple[float, float, float, float]:
    """Parses and validates normalized bounding box string 'x1,y1,x2,y2'."""
    try:
        parts = [float(p.strip()) for p in box_str.split(",")]
        if len(parts) != 4:
            raise ValueError()
        x1, y1, x2, y2 = parts
        if not (0.0 <= x1 < x2 <= 1.0 and 0.0 <= y1 < y2 <= 1.0):
            raise ValueError()
        return x1, y1, x2, y2
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid box parameter. Must be 'x1,y1,x2,y2' with 0 <= x1 < x2 <= 1 and 0 <= y1 < y2 <= 1."
        )

@app.post("/assess")
async def assess_image(
    image: UploadFile = File(...),
    model: str = Form("deeplabv3plus"),
    box: str = Form("0.35,0.35,0.65,0.65"),
    alpha: float = Form(0.90),
    safe_classes: Optional[str] = Form(None),
    hazard_classes: Optional[str] = Form(None)
):
    """
    Evaluates drone drop zone safety for an uploaded aerial image.
    """
    # 1. Validate model selection & availability
    if model not in MODEL_SPECS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown model '{model}'. Allowed models: {list(MODEL_SPECS.keys())}"
        )

    model_inst = get_model(model)
    if model_inst is None:
        err_detail = load_errors.get(
            model,
            f"Model '{model}' is not loaded. Copy trained weights ({', '.join(MODEL_SPECS[model]['weight_files'])}) to backend/models/ and restart."
        )
        raise HTTPException(status_code=503, detail=err_detail)

    # 2. Validate box coordinates
    parsed_box = parse_box(box)

    # 3. Read image contents & validate size (Max 15MB)
    MAX_IMAGE_SIZE = 15 * 1024 * 1024  # 15MB
    image_bytes = await image.read()
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Image file size exceeds limit of 15 MB.")

    # 4. Open and validate PIL Image
    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        # Handle EXIF orientation if present
        pil_img = ImageOps.exif_transpose(pil_img)
    except Exception:
        raise HTTPException(status_code=400, detail="Unreadable or invalid image file.")

    # 5. Parse custom safe & hazard classes if supplied
    safe_ids = parse_class_ids(safe_classes, DEFAULT_SAFE_IDS)
    hazard_ids = parse_class_ids(hazard_classes, DEFAULT_HAZARD_IDS)

    # 6. Preprocessing & Model Inference
    tensor, _ = preprocess_image(pil_img)
    pred_mask, inference_ms = predict_mask(model_inst, tensor)

    # 7. Safety assessment
    assessment = assess(
        mask=pred_mask,
        box=parsed_box,
        alpha=alpha,
        safe_ids=safe_ids,
        hazard_ids=hazard_ids
    )

    # 8. Render color mask & encode to Base64
    colored_mask = colorize_mask(pred_mask)
    mask_b64 = mask_to_base64_png(colored_mask)

    return {
        "status": assessment["status"],
        "safe_ratio": assessment["safe_ratio"],
        "alpha": assessment["alpha"],
        "reason": assessment["reason"],
        "hazards_pct": assessment["hazards_pct"],
        "breakdown_pct": assessment["breakdown_pct"],
        "model": model,
        "inference_ms": inference_ms,
        "input_size_hw": INPUT_SIZE_HW,
        "mask_png_base64": mask_b64
    }

@app.post("/assess-video")
async def assess_video(
    video: UploadFile = File(...),
    model: str = Form("deeplabv3plus"),
    box: str = Form("0.35,0.35,0.65,0.65"),
    alpha: float = Form(0.90),
    sample_fps: float = Form(2.0),
    safe_classes: Optional[str] = Form(None),
    hazard_classes: Optional[str] = Form(None)
):
    """
    Phase 2: Video drop zone analysis with motion detection frame skipping.
    """
    if model not in MODEL_SPECS:
        raise HTTPException(status_code=400, detail=f"Unknown model '{model}'.")

    model_inst = get_model(model)
    if model_inst is None:
        err_detail = load_errors.get(
            model,
            f"Model '{model}' is not loaded. Copy trained weights to backend/models/ and restart."
        )
        raise HTTPException(status_code=503, detail=err_detail)

    parsed_box = parse_box(box)
    safe_ids = parse_class_ids(safe_classes, DEFAULT_SAFE_IDS)
    hazard_ids = parse_class_ids(hazard_classes, DEFAULT_HAZARD_IDS)

    # Limit video size: 50MB
    MAX_VIDEO_SIZE = 50 * 1024 * 1024
    video_bytes = await video.read()
    if len(video_bytes) > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=413, detail="Video file size exceeds maximum limit of 50 MB.")

    # Save temp video file for OpenCV decoding
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Unreadable or corrupt video file.")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_sec = total_frames / fps

        if duration_sec > 60.0:
            raise HTTPException(status_code=400, detail=f"Video duration ({round(duration_sec, 1)}s) exceeds limit of 60 seconds.")

        frame_interval = max(1, int(round(fps / max(0.5, sample_fps))))

        timeline = []
        frames_analysed = 0
        frames_reused = 0
        
        prev_gray = None
        last_mask = None

        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_interval == 0:
                timestamp = frame_idx / fps
                cur_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

                # Motion detection check
                if prev_gray is not None and not frame_changed(prev_gray, cur_gray, eps=2.0):
                    # Reuse previous assessment result
                    frames_reused += 1
                    assessment = assess(
                        mask=last_mask,
                        box=parsed_box,
                        alpha=alpha,
                        safe_ids=safe_ids,
                        hazard_ids=hazard_ids
                    )
                else:
                    # Run model inference
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    pil_img = Image.fromarray(rgb_frame)
                    tensor, _ = preprocess_image(pil_img)
                    last_mask, _ = predict_mask(model_inst, tensor)
                    frames_analysed += 1
                    
                    assessment = assess(
                        mask=last_mask,
                        box=parsed_box,
                        alpha=alpha,
                        safe_ids=safe_ids,
                        hazard_ids=hazard_ids
                    )

                prev_gray = cur_gray
                timeline.append({
                    "t": round(timestamp, 2),
                    "status": assessment["status"],
                    "safe_ratio": assessment["safe_ratio"],
                    "reason": assessment["reason"]
                })

            frame_idx += 1

        cap.release()

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    if not timeline:
        raise HTTPException(status_code=400, detail="No readable frames found in video.")

    safe_count = sum(1 for item in timeline if item["status"] == "SAFE")
    safe_frame_pct = round((safe_count / len(timeline)) * 100, 1)
    overall_status = "SAFE" if safe_count == len(timeline) else "UNSAFE"

    return {
        "overall_status": overall_status,
        "safe_frame_pct": safe_frame_pct,
        "frames_analysed": frames_analysed,
        "frames_reused": frames_reused,
        "timeline": timeline
    }
