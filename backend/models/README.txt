========================================================================
Safe Drop Checker - Model Weight Files Directory
========================================================================

Place your trained PyTorch PyTorch model state dict (.pth) files here.

Accepted model filenames:
1. U-Net model weights:
   - backend/models/unet.pth
   OR
   - backend/models/best_model1_unet.pth

2. DeepLabV3+ model weights:
   - backend/models/deeplabv3plus.pth
   OR
   - backend/models/best_model2_deeplabv3plus.pth

3. SegFormer (MiT-B0) model weights:
   - backend/models/segformer_mit_b0.pth
   OR
   - backend/models/best_segformer_mit_b0.pth

Models are expected to be trained with segmentation-models-pytorch (smp) or HuggingFace transformers
using 24 classes. Plain PyTorch state_dict tensors (or dicts containing 'state_dict' or 'model_state_dict') are supported.

Restart the backend server after placing the weight files.

