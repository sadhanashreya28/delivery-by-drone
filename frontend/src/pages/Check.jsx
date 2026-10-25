import React, { useState, useEffect } from 'react';
import {
  Upload, Sliders, Layers, ArrowRightLeft, Sparkles, AlertCircle, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import DropZoneCanvas from '../components/DropZoneCanvas';
import ResultCard from '../components/ResultCard';
import Legend from '../components/Legend';
import SettingsDrawer from '../components/SettingsDrawer';
import VideoCheck from '../components/VideoCheck';
import { assessImage, fetchHealth, fetchClasses } from '../api';

export default function Check() {
  // State for upload & image
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [activeTab, setActiveTab] = useState('image'); // 'image' or 'video'

  // Bounding box in normalized coordinates [x1, y1, x2, y2]
  const [box, setBox] = useState([0.35, 0.35, 0.65, 0.65]);

  // Model & safety controls
  const [model, setModel] = useState('deeplabv3plus');
  const [alpha, setAlpha] = useState(0.90);
  const [compareMode, setCompareMode] = useState(false);

  // Mask display options
  const [showMask, setShowMask] = useState(true);
  const [maskOpacity, setMaskOpacity] = useState(0.65);

  // Backend metadata
  const [healthData, setHealthData] = useState({ loaded_models: [], load_errors: {} });
  const [classMeta, setClassMeta] = useState({ classes: [], default_safe_ids: [], default_hazard_ids: [] });

  // Custom safe & hazard class overrides
  const [safeClasses, setSafeClasses] = useState([]);
  const [hazardClasses, setHazardClasses] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Execution states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [primaryResult, setPrimaryResult] = useState(null);
  const [compareResults, setCompareResults] = useState([]);

  // Sample default image generator for instant testing
  useEffect(() => {
    // Fetch initial health & class metadata
    fetchHealth().then(setHealthData);
    fetchClasses().then((data) => {
      setClassMeta(data);
      setSafeClasses(data.default_safe_ids);
      setHazardClasses(data.default_hazard_ids);
    }).catch((err) => console.error(err));
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setError('Image file size exceeds limit of 15 MB.');
        return;
      }
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
      setError(null);
      setPrimaryResult(null);
      setCompareResults([]);
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 15 * 1024 * 1024) {
        setError('Image file size exceeds limit of 15 MB.');
        return;
      }
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
      setError(null);
      setPrimaryResult(null);
      setCompareResults([]);
    }
  };

  const handleRunAssessment = async () => {
    if (!imageFile) return;

    setLoading(true);
    setError(null);
    setPrimaryResult(null);
    setCompareResults([]);

    const boxStr = box.join(',');

    try {
      if (compareMode) {
        // Run all 3 models concurrently
        const ALL_MODELS = ['deeplabv3plus', 'unet', 'segformer'];
        const otherModels = ALL_MODELS.filter((mKey) => mKey !== model);

        const promises = [
          assessImage({
            imageFile,
            model,
            box: boxStr,
            alpha,
            safeClasses,
            hazardClasses,
          }),
          ...otherModels.map((mKey) =>
            assessImage({
              imageFile,
              model: mKey,
              box: boxStr,
              alpha,
              safeClasses,
              hazardClasses,
            })
          ),
        ];

        const settled = await Promise.allSettled(promises);

        const primarySettled = settled[0];
        if (primarySettled.status === 'fulfilled') {
          setPrimaryResult(primarySettled.value);
        } else {
          setError(`[${model}] ${primarySettled.reason.message}`);
        }

        const secondaries = [];
        const errMsgs = [];
        for (let i = 1; i < settled.length; i++) {
          const item = settled[i];
          const mKey = otherModels[i - 1];
          if (item.status === 'fulfilled') {
            secondaries.push(item.value);
          } else {
            errMsgs.push(`[${mKey}] ${item.reason.message}`);
          }
        }

        setCompareResults(secondaries);

        if (errMsgs.length > 0 && primarySettled.status === 'fulfilled') {
          setError(errMsgs.join(' | '));
        }
      } else {
        const res = await assessImage({
          imageFile,
          model,
          box: boxStr,
          alpha,
          safeClasses,
          hazardClasses,
        });
        setPrimaryResult(res);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const resetDefaults = () => {
    setSafeClasses(classMeta.default_safe_ids);
    setHazardClasses(classMeta.default_hazard_ids);
  };

  const isModelLoaded = (mKey) => healthData.loaded_models?.includes(mKey);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight flex items-center gap-2">
            Drone Landing Drop Zone Checker
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload top-down drone imagery, position your landing box, and run semantic segmentation safety checks.
          </p>
        </div>

        {/* Tab Switcher: Image vs Video */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('image')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'image'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Aerial Image Check
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'video'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Video Stream (Phase 2)
          </button>
        </div>
      </div>

      {/* Model missing weights banner alert */}
      {healthData.load_errors && Object.keys(healthData.load_errors).length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/40 p-4 rounded-2xl text-amber-200 text-xs flex items-start gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-300">Model Weight File Status:</span>
            {Object.entries(healthData.load_errors).map(([mName, errText]) => (
              <p key={mName} className="font-mono text-[11px] text-amber-200/90">
                • <strong className="text-white uppercase">{mName}:</strong> {errText}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/40 p-4 rounded-2xl text-rose-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-slate-400 hover:text-white text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content View */}
      {activeTab === 'video' ? (
        <VideoCheck
          model={model}
          box={box}
          alpha={alpha}
          safeClasses={safeClasses}
          hazardClasses={hazardClasses}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Image Canvas & Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {!imageUrl ? (
              /* Drag and Drop Zone */
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="relative aspect-[3/2] w-full border-2 border-dashed border-slate-700 hover:border-cyan-500/80 rounded-2xl bg-slate-950/60 hover:bg-slate-900/60 transition-all flex flex-col items-center justify-center p-8 text-center group cursor-pointer shadow-2xl"
              >
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="font-heading font-bold text-lg text-white mb-1">
                  Drag & Drop Top-Down Drone Image
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Supports JPG, PNG, WEBP aerial photos up to 15 MB.
                </p>
              </div>
            ) : (
              /* Canvas Overlay Component */
              <div className="space-y-4">
                <DropZoneCanvas
                  imageUrl={imageUrl}
                  maskUrl={primaryResult?.mask_png_base64}
                  showMask={showMask}
                  maskOpacity={maskOpacity}
                  box={box}
                  onBoxChange={setBox}
                />

                {/* Mask Display Overlay Bar */}
                {primaryResult?.mask_png_base64 && (
                  <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowMask(!showMask)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                          showMask
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {showMask ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        {showMask ? 'Mask Visible' : 'Mask Hidden'}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 flex-1 max-w-xs ml-4">
                      <span className="text-slate-400 font-medium">Opacity:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={maskOpacity}
                        onChange={(e) => setMaskOpacity(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                      <span className="font-mono text-cyan-400 w-10 text-right">
                        {Math.round(maskOpacity * 100)}%
                      </span>
                    </div>

                    <label className="text-xs text-slate-400 underline cursor-pointer hover:text-white ml-2">
                      Change Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Controls Bar */}
            <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Model Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Segmentation Neural Net
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="deeplabv3plus">
                      DeepLabV3+ (ResNet34) {!isModelLoaded('deeplabv3plus') ? '⚠️ [Unloaded]' : '✓'}
                    </option>
                    <option value="unet">
                      U-Net (ResNet34) {!isModelLoaded('unet') ? '⚠️ [Unloaded]' : '✓'}
                    </option>
                    <option value="segformer">
                      SegFormer (MiT-B0) {!isModelLoaded('segformer') ? '⚠️ [Unloaded]' : '✓'}
                    </option>
                  </select>

                </div>

                {/* Alpha Threshold Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      Safety Threshold (α)
                    </label>
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      {Math.round(alpha * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.50"
                    max="1.00"
                    step="0.01"
                    value={alpha}
                    onChange={(e) => setAlpha(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Minimum safe ground required in zone for a SAFE verdict.
                  </p>
                </div>
              </div>

              {/* Toggles & Submit Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-4">
                  {/* Compare toggle */}
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                    <input
                      type="checkbox"
                      checked={compareMode}
                      onChange={(e) => setCompareMode(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                    Compare All 3 Models
                  </label>

                  {/* Settings drawer button */}
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Custom Rules
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRunAssessment}
                  disabled={!imageUrl || loading}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all ${
                    !imageUrl || loading
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/25 group'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      Running Neural Nets...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Check Drop Zone Safety
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Legend section */}
            <Legend
              classes={classMeta.classes}
              defaultSafeIds={classMeta.default_safe_ids}
              defaultHazardIds={classMeta.default_hazard_ids}
              presentClassNames={primaryResult ? Object.keys(primaryResult.breakdown_pct) : null}
            />
          </div>

          {/* Right Column: Assessment Result Cards (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {primaryResult ? (
              <div className="space-y-6">
                <ResultCard
                  result={primaryResult}
                  title={compareMode ? `Primary: ${primaryResult.model.toUpperCase()}` : 'Drop Zone Safety Verdict'}
                />

                {compareMode &&
                  compareResults.map((compRes) => (
                    <ResultCard
                      key={compRes.model}
                      result={compRes}
                      title={`Comparison: ${compRes.model.toUpperCase()}`}
                    />
                  ))}
              </div>
            ) : (

              <div className="h-full min-h-[350px] glass-card rounded-2xl p-8 border border-slate-800 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-heading font-bold text-base text-slate-300">
                  Ready for Assessment
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Position the landing box on your aerial photo and click "Check Drop Zone Safety" to run segmentation.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Rules Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        classes={classMeta.classes}
        safeClasses={safeClasses}
        hazardClasses={hazardClasses}
        onSafeClassesChange={setSafeClasses}
        onHazardClassesChange={setHazardClasses}
        onResetDefaults={resetDefaults}
      />
    </div>
  );
}
