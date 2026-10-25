import os
import io
import tempfile
import pytest
from pathlib import Path
from PIL import Image
import torch
import numpy as np
from fastapi.testclient import TestClient

import segmentation_models_pytorch as smp

# 1. Setup temporary directory for random weights before importing backend modules
temp_dir = tempfile.TemporaryDirectory()
os.environ["MODEL_DIR"] = temp_dir.name

print(f"\n[Smoke Test] Setting MODEL_DIR to temporary directory: {temp_dir.name}")

# Create dummy random-weight model files for unet, deeplabv3plus, and segformer
unet_dummy = smp.Unet(encoder_name="resnet34", encoder_weights=None, in_channels=3, classes=24)
deeplab_dummy = smp.DeepLabV3Plus(encoder_name="resnet34", encoder_weights=None, in_channels=3, classes=24)

from app.models import SegformerWrapper
segformer_dummy = SegformerWrapper(num_classes=24)

torch.save(unet_dummy.state_dict(), Path(temp_dir.name) / "unet.pth")
torch.save(deeplab_dummy.state_dict(), Path(temp_dir.name) / "deeplabv3plus.pth")
torch.save(segformer_dummy.state_dict(), Path(temp_dir.name) / "segformer_mit_b0.pth")

# Import backend modules now that MODEL_DIR is configured
from app.main import app
from app.models import init_models, loaded_models
from app.inference import preprocess_image, predict_mask

client = TestClient(app)

def test_model_architecture_and_logits_shape():
    """Verify PyTorch models build and return tensor shape (1, 24, 384, 576)."""
    print("\n--- Testing Model Architecture & Logits Shape ---")
    dummy_img = Image.new("RGB", (576, 384), color=(120, 180, 200))
    
    # Test U-Net
    unet_model = smp.Unet(encoder_name="resnet34", encoder_weights=None, in_channels=3, classes=24)
    unet_model.eval()
    
    tensor, _ = preprocess_image(dummy_img)
    assert tensor.shape == (1, 3, 384, 576), f"Expected tensor shape (1, 3, 384, 576), got {tensor.shape}"

    with torch.no_grad():
        logits_unet = unet_model(tensor)
    assert logits_unet.shape == (1, 24, 384, 576), f"U-Net logits shape mismatch: {logits_unet.shape}"
    print("[PASS] U-Net model output shape (1, 24, 384, 576) verified.")

    # Test DeepLabV3+
    deeplab_model = smp.DeepLabV3Plus(encoder_name="resnet34", encoder_weights=None, in_channels=3, classes=24)
    deeplab_model.eval()

    with torch.no_grad():
        logits_deeplab = deeplab_model(tensor)
    assert logits_deeplab.shape == (1, 24, 384, 576), f"DeepLabV3+ logits shape mismatch: {logits_deeplab.shape}"
    print("[PASS] DeepLabV3+ model output shape (1, 24, 384, 576) verified.")

def test_endpoints_with_loaded_random_weights():
    """Verify FastAPI endpoints /health, /classes, /models, and /assess with temporary random weights."""
    print("\n--- Testing FastAPI Endpoints ---")
    
    # Initialize models from temp dir
    init_models(custom_dir=Path(temp_dir.name))
    assert "unet" in loaded_models, "U-Net failed to load from temp dir"
    assert "deeplabv3plus" in loaded_models, "DeepLabV3+ failed to load from temp dir"
    assert "segformer" in loaded_models, "SegFormer failed to load from temp dir"

    # Test /health
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "unet" in data["loaded_models"]
    assert "deeplabv3plus" in data["loaded_models"]
    assert "segformer" in data["loaded_models"]
    print("[PASS] GET /health verified.")

    # Test /classes
    resp = client.get("/classes")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["classes"]) == 24
    print("[PASS] GET /classes verified.")

    # Test /models
    resp = client.get("/models")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["models"]) == 3
    print("[PASS] GET /models verified.")


    # Create dummy PNG image bytes
    buf = io.BytesIO()
    test_img = Image.new("RGB", (800, 600), color=(100, 200, 100))
    test_img.save(buf, format="PNG")
    buf.seek(0)
    img_bytes = buf.getvalue()

    # Test POST /assess with valid parameters
    resp = client.post(
        "/assess",
        files={"image": ("test.png", img_bytes, "image/png")},
        data={
            "model": "deeplabv3plus",
            "box": "0.2,0.2,0.8,0.8",
            "alpha": "0.85"
        }
    )
    assert resp.status_code == 200, f"Failed POST /assess: {resp.text}"
    assess_data = resp.json()
    assert "status" in assess_data
    assert assess_data["status"] in ["SAFE", "UNSAFE"]
    assert "mask_png_base64" in assess_data
    assert "breakdown_pct" in assess_data
    print(f"[PASS] POST /assess valid test passed. Verdict: {assess_data['status']} (reason: {assess_data['reason']})")

    # Test POST /assess with invalid box
    resp_invalid_box = client.post(
        "/assess",
        files={"image": ("test.png", img_bytes, "image/png")},
        data={"model": "deeplabv3plus", "box": "1.5,0.2,0.8,0.8"}
    )
    assert resp_invalid_box.status_code == 400
    print("[PASS] POST /assess invalid box error handling verified (400 Bad Request).")

    # Test POST /assess with unknown model
    resp_invalid_model = client.post(
        "/assess",
        files={"image": ("test.png", img_bytes, "image/png")},
        data={"model": "unknown_model", "box": "0.1,0.1,0.5,0.5"}
    )
    assert resp_invalid_model.status_code == 400
    print("[PASS] POST /assess unknown model error handling verified (400 Bad Request).")

    print("\n==========================================================================")
    print("NOTE: Smoke tests used TEMPORARY RANDOM WEIGHTS to verify plumbing.")
    print("Results from random weights prove server execution, not segmentation accuracy.")
    print("==========================================================================\n")

@pytest.fixture(scope="session", autouse=True)
def cleanup(request):
    """Cleanup temporary directory after all tests run."""
    def remove_temp():
        temp_dir.cleanup()
        print("\n[Smoke Test] Cleaned up temporary random-weight directory.")
    request.addfinalizer(remove_temp)
