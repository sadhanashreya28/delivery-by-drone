import os
import csv
import logging
from pathlib import Path
from typing import List, Dict, Tuple, Any

logger = logging.getLogger("safe_drop_checker")

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent

# MODEL_DIR from env or default to backend/models
env_model_dir = os.environ.get("MODEL_DIR")
if env_model_dir:
    MODEL_DIR = Path(env_model_dir).resolve()
else:
    MODEL_DIR = BASE_DIR / "models"

DATA_DIR = BASE_DIR / "data"

# Image parameters
# Target model input shape: (batch, channels, height 384, width 576)
INPUT_HEIGHT = 384
INPUT_WIDTH = 576
INPUT_SIZE_HW = [INPUT_HEIGHT, INPUT_WIDTH]
PIL_RESIZE = (INPUT_WIDTH, INPUT_HEIGHT)  # PIL resize expects (width, height)

# Image normalization parameters
NORM_MEAN = [0.485, 0.456, 0.406]
NORM_STD = [0.229, 0.224, 0.225]

# CORS Origins
raw_cors = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,"
    "http://0.0.0.0:5173,http://192.168.252.177:5173"
)
CORS_ORIGINS = [origin.strip() for origin in raw_cors.split(",") if origin.strip()]


# 24 Canonical Classes from Semantic Drone Dataset
DEFAULT_CLASSES = [
    "unlabeled",    # 0
    "paved-area",   # 1
    "dirt",         # 2
    "grass",        # 3
    "gravel",       # 4
    "water",        # 5
    "rocks",        # 6
    "pool",         # 7
    "vegetation",   # 8
    "roof",         # 9
    "wall",         # 10
    "window",       # 11
    "door",         # 12
    "fence",        # 13
    "fence-pole",   # 14
    "person",       # 15
    "dog",          # 16
    "car",          # 17
    "bicycle",      # 18
    "tree",         # 19
    "bald-tree",    # 20
    "ar-marker",    # 21
    "obstacle",     # 22
    "conflicting"   # 23
]

DEFAULT_SAFE_IDS = [1, 2, 3, 4]             # paved-area, dirt, grass, gravel
DEFAULT_HAZARD_IDS = [5, 7, 15, 16, 17, 18]  # water, pool, person, dog, car, bicycle

# Pre-curated distinct RGB palette for 24 classes (Visually clear for segmentation masks)
DEFAULT_PALETTE: List[Tuple[int, int, int]] = [
    (0, 0, 0),        # 0: unlabeled (black)
    (128, 128, 128),  # 1: paved-area (grey)
    (139, 69, 19),    # 2: dirt (brown)
    (34, 139, 34),    # 3: grass (forest green)
    (192, 192, 192),  # 4: gravel (light grey)
    (0, 191, 255),    # 5: water (deep sky blue)
    (105, 105, 105),  # 6: rocks (dim grey)
    (0, 255, 255),    # 7: pool (cyan)
    (50, 205, 50),    # 8: vegetation (lime green)
    (178, 34, 34),    # 9: roof (firebrick red)
    (160, 82, 45),    # 10: wall (saddle brown)
    (245, 222, 179),  # 11: window (wheat)
    (210, 105, 30),   # 12: door (chocolate)
    (255, 140, 0),    # 13: fence (dark orange)
    (255, 165, 0),    # 14: fence-pole (orange)
    (255, 0, 0),      # 15: person (bright red)
    (255, 20, 147),   # 16: dog (deep pink)
    (138, 43, 226),   # 17: car (blue violet)
    (255, 105, 180),  # 18: bicycle (hot pink)
    (0, 100, 0),      # 19: tree (dark green)
    (85, 107, 47),    # 20: bald-tree (dark olive green)
    (255, 255, 0),    # 21: ar-marker (yellow)
    (255, 69, 0),     # 22: obstacle (orange red)
    (148, 0, 211),    # 23: conflicting (dark violet)
]

def load_class_metadata() -> List[Dict[str, Any]]:
    """
    Reads data/class_dict_seg.csv if present.
    Format expected: header like 'name, r, g, b' (or 'name,r,g,b').
    Returns a list of dicts: [{'id': int, 'name': str, 'color': [r, g, b]}]
    """
    csv_file = DATA_DIR / "class_dict_seg.csv"
    classes = []
    
    if csv_file.exists():
        try:
            with open(csv_file, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                if len(rows) == 24:
                    for idx, row in enumerate(rows):
                        # Clean key names (handling whitespace)
                        row_cleaned = {k.strip(): v.strip() for k, v in row.items() if k}
                        name = row_cleaned.get("name", DEFAULT_CLASSES[idx])
                        if name != DEFAULT_CLASSES[idx]:
                            logger.warning(
                                f"Class dict row {idx} name '{name}' differs from default '{DEFAULT_CLASSES[idx]}'"
                            )
                        r = int(row_cleaned.get("r", DEFAULT_PALETTE[idx][0]))
                        g = int(row_cleaned.get("g", DEFAULT_PALETTE[idx][1]))
                        b = int(row_cleaned.get("b", DEFAULT_PALETTE[idx][2]))
                        classes.append({"id": idx, "name": name, "color": [r, g, b]})
                    return classes
                else:
                    logger.warning(
                        f"class_dict_seg.csv found but has {len(rows)} rows instead of 24. Falling back to default list."
                    )
        except Exception as e:
            logger.error(f"Error reading class_dict_seg.csv: {e}. Using defaults.")

    # Fallback to default canonical classes
    for idx, name in enumerate(DEFAULT_CLASSES):
        r, g, b = DEFAULT_PALETTE[idx]
        classes.append({"id": idx, "name": name, "color": [r, g, b]})
    
    return classes

CLASS_INFO = load_class_metadata()
