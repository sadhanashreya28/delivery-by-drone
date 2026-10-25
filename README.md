# Safe Drop Checker 🚁
> AI-powered top-down drone imagery semantic segmentation and landing drop zone safety analyzer.

Safe Drop Checker wraps two deep learning models (**U-Net** and **DeepLabV3+** with ResNet-34 encoders) trained on the 24-class **Semantic Drone Dataset** behind a FastAPI REST API and an interactive React web dashboard.

---

## 🏗️ System Architecture

```text
  [ User Drone Photo / Video ]
               │
               ▼
┌──────────────────────────────┐
│  React + Vite Frontend (5173)│
│  - DropZoneCanvas Bounding   │
│  - Opacity Mask Overlay      │
│  - Model Comparison & Config │
└──────────────┬───────────────┘
               │ HTTP Multipart / JSON
               ▼
┌──────────────────────────────┐
│  FastAPI Backend (8000)      │
│  - PyTorch SMP Models        │
│  - Input Preprocessing       │
│  - Argmax Segmentation Mask  │
│  - Drop-Zone Rule Engine     │
└──────────────┬───────────────┘
               │
     ┌─────────┴─────────┐
     ▼                   ▼
 [ U-Net (24.4M) ]  [ DeepLabV3+ (22.4M) ]
```

---

## 📁 Model Weights & Data Files Placement

Before running full inference, place your trained PyTorch `.pth` weight files in the backend model directory:

### 1. Model Weights Directory: `drone-safe-drop/backend/models/`
Copy your trained weight files into `backend/models/`:
- **U-Net Weights:** `backend/models/unet.pth` (or `best_model1_unet.pth`)
- **DeepLabV3+ Weights:** `backend/models/deeplabv3plus.pth` (or `best_model2_deeplabv3plus.pth`)

> **Note on Missing Weights:** If weights are missing, the server starts cleanly. `/health` and `/models` will report missing weight status and `/assess` returns `503 Service Unavailable` with friendly instructions.

### 2. Custom Data & Visuals Directory: `drone-safe-drop/backend/data/`
Optionally place dataset metadata files in `backend/data/`:
- `class_dict_seg.csv` - Custom class names and RGB colors (24 rows, header `name, r, g, b`).
- `metrics_model1_unet.json` / `metrics_model2_deeplabv3plus.json` - Custom benchmark metrics.
- `training_curves_unet.png`, `training_curves_deeplabv3plus.png`, `predictions_unet.png`, `predictions_deeplabv3plus.png` - Visual plots for the Models page.

---

## 🚀 Quick Start Instructions

### Windows (Primary OS)

#### Option A: Quick Batch Helper Scripts
Double click or execute the batch files from the `drone-safe-drop` folder:
1. Double-click `run_backend.bat`
2. Double-click `run_frontend.bat`
3. Open `http://localhost:5173` in your browser.

#### Option B: Manual Command Line Execution

1. **Start Backend Server:**
   ```cmd
   cd drone-safe-drop\backend
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

2. **Start Frontend Dev Server:**
   ```cmd
   cd drone-safe-drop\frontend
   npm install
   npm run dev
   ```

### macOS / Linux (Single-line alternative)
```bash
# Terminal 1 (Backend):
cd drone-safe-drop/backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

# Terminal 2 (Frontend):
cd drone-safe-drop/frontend && npm install && npm run dev
```

---

## 📡 API Reference & cURL Examples

### 1. Health & Loaded Models Check
```bash
curl -X GET http://localhost:8000/health
```

### 2. Get 24-Class Metadata & Default Rules
```bash
curl -X GET http://localhost:8000/classes
```

### 3. Get Model Benchmarks & Metrics
```bash
curl -X GET http://localhost:8000/models
```

### 4. Evaluate Image Drop Zone Safety
```bash
curl -X POST http://localhost:8000/assess \
  -F "image=@/path/to/drone_image.jpg" \
  -F "model=deeplabv3plus" \
  -F "box=0.35,0.35,0.65,0.65" \
  -F "alpha=0.90"
```

### 5. Evaluate Video Drop Zone Stream (Phase 2)
```bash
curl -X POST http://localhost:8000/assess-video \
  -F "video=@/path/to/flight_clip.mp4" \
  -F "model=deeplabv3plus" \
  -F "box=0.35,0.35,0.65,0.65" \
  -F "alpha=0.90" \
  -F "sample_fps=2.0"
```

---

## 🛠️ Troubleshooting & Common Issues

1. **Model Weights Not Loaded (503 Service Unavailable):**
   - Ensure the `.pth` files are copied into `backend/models/` under the exact name `deeplabv3plus.pth` or `unet.pth`. Restart uvicorn after adding files.
2. **CORS Error in Browser Console:**
   - Default backend allowed origins are `http://localhost:5173` and `http://127.0.0.1:5173`. If running on a custom port, set environment variable `CORS_ORIGINS=http://localhost:PORT` before starting the backend.
3. **PyTorch Installation / CPU-only Build:**
   - If running without a dedicated GPU, PyTorch CPU mode will execute standard inference automatically.
