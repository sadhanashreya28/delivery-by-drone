import io
import base64
import time
from typing import Tuple, Dict, Any
import numpy as np
from PIL import Image
import torch

from app.config import PIL_RESIZE, NORM_MEAN, NORM_STD, CLASS_INFO
from app.models import DEVICE

def preprocess_image(pil_img: Image.Image) -> Tuple[torch.Tensor, Image.Image]:
    """
    Preprocesses PIL image for Semantic Segmentation:
    1. Ensure RGB mode
    2. Resize to (576, 384) [width=576, height=384] with BILINEAR
    3. Scale to 0..1 float
    4. Normalize with mean [0.485, 0.456, 0.406] and std [0.229, 0.224, 0.225]
    5. Returns tensor (1, 3, 384, 576) on DEVICE and the resized PIL image.
    """
    if pil_img.mode != "RGB":
        pil_img = pil_img.convert("RGB")

    resized_img = pil_img.resize(PIL_RESIZE, Image.Resampling.BILINEAR)
    
    # Convert to float numpy array (384, 576, 3) in range 0..1
    img_np = np.array(resized_img, dtype=np.float32) / 255.0

    # Normalize
    mean = np.array(NORM_MEAN, dtype=np.float32)
    std = np.array(NORM_STD, dtype=np.float32)
    norm_img = (img_np - mean) / std

    # Transpose to (3, 384, 576) and add batch dimension -> (1, 3, 384, 576)
    tensor = torch.from_numpy(norm_img).permute(2, 0, 1).unsqueeze(0).float()
    return tensor.to(DEVICE), resized_img

def predict_mask(model: torch.nn.Module, tensor: torch.Tensor) -> Tuple[np.ndarray, float]:
    """
    Runs inference on input tensor and returns (2D numpy mask of shape (384, 576), inference_time_ms).
    """
    start_time = time.perf_counter()
    with torch.no_grad():
        logits = model(tensor)  # Expected shape (1, 24, 384, 576)
        pred_mask = torch.argmax(logits, dim=1).squeeze(0).cpu().numpy().astype(np.uint8)
    inference_ms = round((time.perf_counter() - start_time) * 1000, 2)
    return pred_mask, inference_ms

def colorize_mask(mask_2d: np.ndarray) -> Image.Image:
    """
    Converts 2D integer class mask (384, 576) to RGB PIL Image using CLASS_INFO colors.
    """
    h, w = mask_2d.shape
    rgb_mask = np.zeros((h, w, 3), dtype=np.uint8)

    # Build color lookup table
    palette = np.zeros((256, 3), dtype=np.uint8)
    for c in CLASS_INFO:
        idx = c["id"]
        palette[idx] = c["color"]

    # Map mask values to RGB colors
    rgb_mask = palette[mask_2d]
    return Image.fromarray(rgb_mask)

def mask_to_base64_png(mask_img: Image.Image) -> str:
    """Encodes a PIL Image into a base64 PNG string."""
    buf = io.BytesIO()
    mask_img.save(buf, format="PNG")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")
