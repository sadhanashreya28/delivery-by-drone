import logging
from pathlib import Path
from typing import Dict, Optional, Tuple, Any
import torch
import segmentation_models_pytorch as smp

from app.config import MODEL_DIR

logger = logging.getLogger("safe_drop_checker")

# Device configuration
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Model Registry
loaded_models: Dict[str, torch.nn.Module] = {}
load_errors: Dict[str, str] = {}

class SegformerWrapper(torch.nn.Module):
    """Wrapper around HuggingFace SegFormer to output interpolated logits matching input resolution."""
    def __init__(self, num_classes: int = 24):
        super().__init__()
        from transformers import SegformerForSemanticSegmentation, SegformerConfig
        config = SegformerConfig.from_pretrained("nvidia/mit-b0", num_labels=num_classes)
        self.segformer = SegformerForSemanticSegmentation(config)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out = self.segformer(x)
        logits = torch.nn.functional.interpolate(out.logits, size=x.shape[-2:], mode="bilinear", align_corners=False)
        return logits

    def load_state_dict(self, state_dict: Dict[str, Any], strict: bool = True):
        # Strip 'model.' prefix if checkpoint came from PyTorch Lightning / wrapper
        cleaned = {}
        for k, v in state_dict.items():
            key_name = k[6:] if k.startswith("model.") else k
            cleaned[key_name] = v
        return self.segformer.load_state_dict(cleaned, strict=strict)

MODEL_SPECS = {
    "unet": {
        "display_name": "U-Net (ResNet34 encoder)",
        "architecture": "smp.Unet",
        "constructor": lambda: smp.Unet(encoder_name="resnet34", encoder_weights=None, in_channels=3, classes=24),
        "weight_files": ["unet.pth", "best_model1_unet.pth"]
    },
    "deeplabv3plus": {
        "display_name": "DeepLabV3+ (ResNet34 encoder)",
        "architecture": "smp.DeepLabV3Plus",
        "constructor": lambda: smp.DeepLabV3Plus(encoder_name="resnet34", encoder_weights=None, in_channels=3, classes=24),
        "weight_files": ["deeplabv3plus.pth", "best_model2_deeplabv3plus.pth"]
    },
    "segformer": {
        "display_name": "SegFormer (MiT-B0 encoder)",
        "architecture": "transformers.SegformerForSemanticSegmentation",
        "constructor": lambda: SegformerWrapper(num_classes=24),
        "weight_files": ["segformer_mit_b0.pth", "best_segformer_mit_b0.pth"]
    }
}

def find_weight_file(model_key: str, custom_dir: Optional[Path] = None) -> Optional[Path]:
    """Search for matching weight file in model_dir."""
    target_dir = custom_dir or MODEL_DIR
    spec = MODEL_SPECS.get(model_key)
    if not spec:
        return None
    
    for filename in spec["weight_files"]:
        filepath = target_dir / filename
        if filepath.exists() and filepath.is_file():
            return filepath
    return None

def load_single_model(model_key: str, custom_dir: Optional[Path] = None) -> Tuple[Optional[torch.nn.Module], Optional[str]]:
    """
    Constructs and attempts to load weights for a single model.
    Returns (model_instance, error_message).
    """
    spec = MODEL_SPECS.get(model_key)
    if not spec:
        return None, f"Unknown model key: {model_key}"
    
    weight_path = find_weight_file(model_key, custom_dir=custom_dir)
    target_dir = custom_dir or MODEL_DIR

    if not weight_path:
        expected = " or ".join(spec["weight_files"])
        err_msg = f"File not found in {target_dir}: [{expected}]. Copy your trained weights there and restart."
        logger.warning(f"[{model_key}] {err_msg}")
        return None, err_msg

    try:
        model = spec["constructor"]()
        model.to(DEVICE)
        
        # Load weights
        checkpoint = torch.load(weight_path, map_location=DEVICE, weights_only=False)
        
        # Unwrap state dict if nested
        if isinstance(checkpoint, dict):
            if "state_dict" in checkpoint:
                state_dict = checkpoint["state_dict"]
            elif "model_state_dict" in checkpoint:
                state_dict = checkpoint["model_state_dict"]
            else:
                state_dict = checkpoint
        else:
            state_dict = checkpoint

        # Clean state dict keys (strip 'module.' prefix if trained with DataParallel)
        cleaned_state_dict = {}
        for k, v in state_dict.items():
            key_name = k[7:] if k.startswith("module.") else k
            cleaned_state_dict[key_name] = v

        res = model.load_state_dict(cleaned_state_dict, strict=False)

        
        missing_keys = res.missing_keys
        unexpected_keys = res.unexpected_keys

        if missing_keys or unexpected_keys:
            err_summary = f"Loaded with key mismatches (Missing: {len(missing_keys)}, Unexpected: {len(unexpected_keys)})."
            logger.warning(f"[{model_key}] Loaded {weight_path.name} with warnings: {err_summary}")
            if missing_keys:
                logger.warning(f"[{model_key}] Sample missing keys: {missing_keys[:5]}")
            if unexpected_keys:
                logger.warning(f"[{model_key}] Sample unexpected keys: {unexpected_keys[:5]}")
        else:
            logger.info(f"[{model_key}] Successfully loaded weights from {weight_path.name}")

        model.eval()
        return model, None

    except Exception as e:
        err_msg = f"Failed to load weights from {weight_path.name}: {str(e)}"
        logger.error(f"[{model_key}] {err_msg}")
        return None, err_msg

def init_models(custom_dir: Optional[Path] = None):
    """Initialize all model instances at startup."""
    global loaded_models, load_errors
    loaded_models.clear()
    load_errors.clear()

    for model_key in MODEL_SPECS.keys():
        model, error = load_single_model(model_key, custom_dir=custom_dir)
        if model is not None:
            loaded_models[model_key] = model
        else:
            load_errors[model_key] = error

def get_model(model_key: str) -> Optional[torch.nn.Module]:
    """Retrieves a loaded model instance by key."""
    return loaded_models.get(model_key)
