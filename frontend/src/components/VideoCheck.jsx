import React, { useState } from 'react';
import { Video, Play, AlertOctagon, CheckCircle2, Zap, Film } from 'lucide-react';
import { assessVideo } from '../api';

export default function VideoCheck({ model, box, alpha, safeClasses, hazardClasses }) {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError('Video file exceeds size limit of 50 MB.');
        return;
      }
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setError(null);
      setResult(null);
    }
  };

  const handleRunAssessment = async () => {
    if (!videoFile) return;
    setLoading(true);
    setError(null);

    try {
      const boxStr = box.join(',');
      const res = await assessVideo({
        videoFile,
        model,
        box: boxStr,
        alpha,
        sampleFps: 2.0,
        safeClasses,
        hazardClasses,
      });
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-white">
              Phase 2: Video Stream Drop Zone Analyzer
            </h3>
            <p className="text-xs text-slate-400">
              Analyzes aerial flight footage with frame motion detection optimization.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/40 p-4 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Video Upload Drop Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Upload Flight Video (.mp4, .webm, &lt;60s)
          </label>
          {videoUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
              <video src={videoUrl} controls className="w-full h-full object-contain" />
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl cursor-pointer bg-slate-950/50 hover:bg-slate-900/60 transition-all text-center p-4">
              <Film className="w-8 h-8 text-slate-500 mb-2" />
              <span className="text-xs font-medium text-slate-300">Click or Drag & Drop Video</span>
              <span className="text-[10px] text-slate-500 mt-1">MP4 / WEBM / MOV (Max 50MB, &lt;60s)</span>
              <input type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
            </label>
          )}

          <div className="mt-4 flex items-center justify-between">
            {videoFile && (
              <label className="text-xs text-cyan-400 underline cursor-pointer hover:text-cyan-300">
                Change Video File
                <input type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
              </label>
            )}

            <button
              onClick={handleRunAssessment}
              disabled={!videoFile || loading}
              className={`ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all ${
                !videoFile || loading
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  Analyzing Motion & Segmentation...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Analyze Video Drop Zone
                </>
              )}
            </button>
          </div>
        </div>

        {/* Video Assessment Results */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Temporal Safety Analysis
          </label>
          {result ? (
            <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Overall Video Status</span>
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                    result.overall_status === 'SAFE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {result.overall_status === 'SAFE' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertOctagon className="w-4 h-4" />
                  )}
                  {result.overall_status}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Safe Frame %</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">{result.safe_frame_pct}%</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Frames Model Evaluated</span>
                  <span className="font-mono text-sm font-bold text-cyan-400">{result.frames_analysed}</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Motion Skipped</span>
                  <span className="font-mono text-sm font-bold text-amber-400">{result.frames_reused}</span>
                </div>
              </div>

              {/* Timeline Graphic */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Frame Safety Timeline over Flight Duration (sec)
                </span>
                <div className="flex items-center gap-1 overflow-x-auto py-2 px-1 bg-slate-900 rounded-lg border border-slate-800">
                  {result.timeline.map((frame, idx) => (
                    <div
                      key={idx}
                      title={`t = ${frame.t}s: ${frame.status} (${Math.round(frame.safe_ratio * 100)}% safe)`}
                      className={`h-8 min-w-[8px] flex-1 rounded-sm cursor-pointer transition-transform hover:scale-110 ${
                        frame.status === 'SAFE' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>0.0s</span>
                  <span>{result.timeline[result.timeline.length - 1]?.t}s</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 border border-slate-800 bg-slate-950/40 rounded-xl flex items-center justify-center text-xs text-slate-500 italic p-4 text-center">
              Upload video flight clip and click "Analyze Video Drop Zone" to process frame-by-frame timeline.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
