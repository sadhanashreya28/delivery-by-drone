========================================================================
Safe Drop Checker - Data & Metrics Directory
========================================================================

Optional data files you can place in this folder:

1. class_dict_seg.csv
   CSV mapping class names to RGB color codes (24 rows).
   Header format: name, r, g, b

2. Custom Model Metrics (Overrides default metrics.json):
   - metrics_model1_unet.json
   - metrics_model2_deeplabv3plus.json

3. Visualisation Plots (Served via GET /files/{filename}):
   - training_curves_unet.png / training_curves_deeplabv3plus.png
   - predictions_unet.png / predictions_deeplabv3plus.png
