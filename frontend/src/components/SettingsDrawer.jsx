import React from 'react';
import { X, Sliders, CheckCircle2, AlertOctagon, RotateCcw } from 'lucide-react';

export default function SettingsDrawer({
  isOpen,
  onClose,
  classes = [],
  safeClasses = [],
  hazardClasses = [],
  onSafeClassesChange,
  onHazardClassesChange,
  onResetDefaults
}) {
  if (!isOpen) return null;

  const toggleSafeClass = (id) => {
    if (safeClasses.includes(id)) {
      onSafeClassesChange(safeClasses.filter((x) => x !== id));
    } else {
      // Remove from hazard if present
      onHazardClassesChange(hazardClasses.filter((x) => x !== id));
      onSafeClassesChange([...safeClasses, id]);
    }
  };

  const toggleHazardClass = (id) => {
    if (hazardClasses.includes(id)) {
      onHazardClassesChange(hazardClasses.filter((x) => x !== id));
    } else {
      // Remove from safe if present
      onSafeClassesChange(safeClasses.filter((x) => x !== id));
      onHazardClassesChange([...hazardClasses, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md h-full glass-panel border-l border-slate-800 p-6 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-heading font-bold text-lg text-white">Custom Safety Rules</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Configure which drone semantic segmentation classes are treated as safe ground vs immediate hazards.
        </p>

        {/* Class Selection List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
          {classes.map((item) => {
            const isSafe = safeClasses.includes(item.id);
            const isHazard = hazardClasses.includes(item.id);

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    style={{ backgroundColor: `rgb(${item.color.join(',')})` }}
                    className="w-3.5 h-3.5 rounded-md border border-white/20"
                  />
                  <span className="font-medium text-slate-200">{item.name}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleSafeClass(item.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      isSafe
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Safe
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleHazardClass(item.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      isHazard
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700'
                    }`}
                  >
                    <AlertOctagon className="w-3 h-3" />
                    Hazard
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
