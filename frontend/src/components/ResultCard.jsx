import React from 'react';
import { CheckCircle2, AlertOctagon, Zap, ShieldAlert, Cpu } from 'lucide-react';
import BreakdownBars from './BreakdownBars';

export default function ResultCard({ result, title = 'Drop Zone Assessment' }) {
  if (!result) return null;

  const isSafe = result.status === 'SAFE';
  const safeRatioPct = Math.round(result.safe_ratio * 100);
  const alphaPct = Math.round(result.alpha * 100);

  const hasHazards = result.hazards_pct && Object.keys(result.hazards_pct).length > 0;

  return (
    <div
      className={`relative w-full rounded-2xl p-6 glass-card border transition-all shadow-xl ${
        isSafe
          ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-slate-900/90 shadow-emerald-950/30'
          : 'border-rose-500/40 bg-gradient-to-b from-rose-950/20 to-slate-900/90 shadow-rose-950/30'
      }`}
    >
      {/* Header: Title & Model info badge */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-300">
            <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono text-cyan-300">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              {result.model}
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {result.inference_ms} ms
            </span>
          </div>
        </div>

        {/* Verdict Badge */}
        <div
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-extrabold text-lg tracking-wide shadow-lg ${
            isSafe
              ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
              : 'bg-rose-500 text-white shadow-rose-500/20'
          }`}
        >
          {isSafe ? (
            <>
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              SAFE
            </>
          ) : (
            <>
              <AlertOctagon className="w-6 h-6 stroke-[2.5]" />
              UNSAFE
            </>
          )}
        </div>
      </div>

      {/* Human Readable Reason Text */}
      <div className="mb-6 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 text-sm text-slate-200 leading-relaxed flex items-start gap-2.5">
        <span className="text-lg">💡</span>
        <span>{result.reason}</span>
      </div>

      {/* Safe Ground Progress Bar */}
      <div className="mb-6 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-2">
          <span>Safe Ground Coverage</span>
          <span className="font-mono text-sm font-bold text-white">
            {safeRatioPct}% <span className="text-slate-400 text-xs font-normal">(Req: ≥{alphaPct}%)</span>
          </span>
        </div>
        <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden">
          {/* Alpha threshold target marker line */}
          <div
            style={{ left: `${alphaPct}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 shadow-sm"
            title={`Required Threshold: ${alphaPct}%`}
          />
          {/* Progress fill */}
          <div
            style={{ width: `${safeRatioPct}%` }}
            className={`h-full rounded-full transition-all duration-500 ${
              safeRatioPct >= alphaPct ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
        </div>
      </div>

      {/* Hazards Detected section */}
      {hasHazards && (
        <div className="mb-6 bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-4 h-4" />
            Hazards Detected in Drop Zone
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(result.hazards_pct).map(([hazardName, pct]) => (
              <span
                key={hazardName}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                {hazardName}: <span className="font-mono text-white">{pct}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Class Breakdown Bars */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Class Breakdown (% of Drop Zone)
        </h4>
        <BreakdownBars breakdown={result.breakdown_pct} />
      </div>
    </div>
  );
}
