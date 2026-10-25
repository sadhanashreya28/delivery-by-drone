from typing import Tuple, Dict, List, Optional, Any
import numpy as np
import cv2

from app.config import DEFAULT_SAFE_IDS, DEFAULT_HAZARD_IDS, CLASS_INFO

def parse_class_ids(raw_input: Optional[Any], default_list: List[int]) -> List[int]:
    """
    Parses comma-separated string or list of class IDs.
    Returns default_list if input is empty or invalid.
    """
    if not raw_input:
        return default_list
    if isinstance(raw_input, list):
        return [int(x) for x in raw_input]
    if isinstance(raw_input, str):
        try:
            return [int(x.strip()) for x in raw_input.split(",") if x.strip().isdigit()]
        except ValueError:
            pass
    return default_list

def assess(
    mask: np.ndarray,
    box: Tuple[float, float, float, float],
    alpha: float = 0.90,
    safe_ids: Optional[List[int]] = None,
    hazard_ids: Optional[List[int]] = None
) -> Dict[str, Any]:
    """
    Assesses drop-zone safety from a 2D segmentation mask and normalized bounding box.

    Args:
        mask: 2D integer numpy array of shape (height, width) containing class IDs.
        box: Normalized tuple (x1, y1, x2, y2) with values in range [0, 1].
        alpha: Minimum safe ratio threshold (default 0.90).
        safe_ids: List of class IDs considered safe ground.
        hazard_ids: List of class IDs considered hazards.

    Returns:
        Dict containing status, safe_ratio, alpha, reason, hazards_pct, breakdown_pct.
    """
    if safe_ids is None:
        safe_ids = DEFAULT_SAFE_IDS
    if hazard_ids is None:
        hazard_ids = DEFAULT_HAZARD_IDS

    mask_h, mask_w = mask.shape
    x1, y1, x2, y2 = box

    # Convert normalized coordinates to pixel coordinates
    px1 = int(round(x1 * mask_w))
    py1 = int(round(y1 * mask_h))
    px2 = int(round(x2 * mask_w))
    py2 = int(round(y2 * mask_h))

    # Clamp coordinates to ensure valid bounding box with at least 1 pixel size
    px1 = max(0, min(px1, mask_w - 1))
    py1 = max(0, min(py1, mask_h - 1))
    px2 = max(px1 + 1, min(px2, mask_w))
    py2 = max(py1 + 1, min(py2, mask_h))

    # Extract drop zone sub-matrix
    zone = mask[py1:py2, px1:px2]
    total_pixels = zone.size

    # Calculate class frequencies in zone
    unique_ids, counts = np.unique(zone, return_counts=True)
    class_counts = dict(zip(unique_ids.tolist(), counts.tolist()))

    # Calculate safe ground ratio
    safe_pixel_count = sum(class_counts.get(cid, 0) for cid in safe_ids)
    safe_ratio = float(safe_pixel_count / total_pixels) if total_pixels > 0 else 0.0

    # Build map of class names for reporting
    id_to_name = {c["id"]: c["name"] for c in CLASS_INFO}

    # Class breakdown (percentages of zone)
    breakdown_pct: Dict[str, float] = {}
    for cid, cnt in class_counts.items():
        cname = id_to_name.get(cid, f"class_{cid}")
        breakdown_pct[cname] = round(float((cnt / total_pixels) * 100), 2)

    # Check for hazards (present in > 0.5% of zone)
    detected_hazards: Dict[str, float] = {}
    hazard_details: List[str] = []
    
    for hid in hazard_ids:
        h_cnt = class_counts.get(hid, 0)
        h_ratio = float(h_cnt / total_pixels) if total_pixels > 0 else 0.0
        h_pct = round(h_ratio * 100, 1)
        if h_ratio > 0.005:  # threshold 0.5%
            h_name = id_to_name.get(hid, f"class_{hid}")
            detected_hazards[h_name] = h_pct
            hazard_details.append(f"{h_name} ({h_pct}% of the zone)")

    # Determine status & reason string
    alpha_pct = round(alpha * 100, 1)
    safe_ratio_pct = round(safe_ratio * 100, 1)

    if detected_hazards:
        status = "UNSAFE"
        hazards_str = ", ".join(hazard_details)
        reason = f"Hazard detected in the drop zone: {hazards_str}"
    elif safe_ratio < alpha:
        status = "UNSAFE"
        reason = f"Only {safe_ratio_pct}% of the zone is safe ground, need at least {alpha_pct}%"
    else:
        status = "SAFE"
        reason = f"{safe_ratio_pct}% of the zone is safe ground and no hazards were found"

    return {
        "status": status,
        "safe_ratio": round(safe_ratio, 4),
        "alpha": alpha,
        "reason": reason,
        "hazards_pct": detected_hazards,
        "breakdown_pct": breakdown_pct
    }

def frame_changed(prev_gray: np.ndarray, cur_gray: np.ndarray, eps: float = 2.0) -> bool:
    """
    Computes mean absolute difference between two grayscale frames.
    Returns True if difference > eps.
    """
    if prev_gray is None or cur_gray is None:
        return True
    diff = cv2.absdiff(prev_gray, cur_gray)
    mean_diff = float(np.mean(diff))
    return mean_diff > eps
