import React from 'react';
import { Layers } from 'lucide-react';

export default function Legend({ classes = [], defaultSafeIds = [], defaultHazardIds = [], presentClassNames = null }) {
  if (!classes || classes.length === 0) return null;

  const filteredClasses = presentClassNames
    ? classes.filter((c) => presentClassNames.includes(c.name))
    : classes;

  return (
    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        <Layers className="w-4 h-4 text-cyan-400" />
        Class Color Legend {presentClassNames && '(Present in Image)'}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
        {filteredClasses.map((item) => {
          const isSafe = defaultSafeIds.includes(item.id);
          const isHazard = defaultHazardIds.includes(item.id);

          return (
            <div
              key={item.id}
              className={`flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/60 border ${
                isSafe
                  ? 'border-emerald-500/30'
                  : isHazard
                  ? 'border-rose-500/30'
                  : 'border-slate-800'
              }`}
            >
              {/* Color swatch */}
              <span
                style={{ backgroundColor: `rgb(${item.color.join(',')})` }}
                className="w-3.5 h-3.5 rounded-md shrink-0 border border-white/20 shadow-sm"
              />
              <span className="truncate text-slate-300 font-medium flex-1">{item.name}</span>
              {isSafe && <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-400 font-bold shrink-0">SAFE</span>}
              {isHazard && <span className="text-[9px] px-1 rounded bg-rose-500/20 text-rose-400 font-bold shrink-0">HAZARD</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
