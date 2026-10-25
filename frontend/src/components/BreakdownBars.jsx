import React from 'react';

export default function BreakdownBars({ breakdown, classMeta = [] }) {
  if (!breakdown || Object.keys(breakdown).length === 0) {
    return <p className="text-xs text-slate-500 italic">No breakdown available.</p>;
  }

  // Build color map from classMeta if available
  const colorMap = {};
  classMeta.forEach((item) => {
    colorMap[item.name] = `rgb(${item.color.join(',')})`;
  });

  // Sort by percentage descending
  const sortedEntries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-2">
      {sortedEntries.map(([cname, pct]) => {
        const color = colorMap[cname] || '#0284c7';
        return (
          <div key={cname} className="flex items-center gap-3 text-xs">
            <span className="w-28 truncate font-medium text-slate-300" title={cname}>
              {cname}
            </span>
            <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
                className="h-full rounded-full transition-all duration-300"
              />
            </div>
            <span className="w-12 text-right font-mono text-slate-400 font-semibold">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
