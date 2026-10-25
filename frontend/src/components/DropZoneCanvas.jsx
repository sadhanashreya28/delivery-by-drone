import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Move, Maximize2, RotateCcw, Sliders } from 'lucide-react';

export default function DropZoneCanvas({
  imageUrl,
  maskUrl,
  showMask,
  maskOpacity,
  box, // normalized [x1, y1, x2, y2]
  onBoxChange
}) {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null); // 'move' or handle position ('tl', 'tr', 'bl', 'br', etc.)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startBox, setStartBox] = useState([0.35, 0.35, 0.65, 0.65]);

  const [x1, y1, x2, y2] = box;

  // Box size slider calculation (scale around box center)
  const currentWidth = x2 - x1;
  const currentHeight = y2 - y1;
  const avgScale = Math.round(((currentWidth + currentHeight) / 2) * 100);

  const handlePointerDown = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    setIsDragging(true);
    setDragType(type);
    setStartPos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    });
    setStartBox([...box]);
  };

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const curX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const curY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const dx = curX - startPos.x;
    const dy = curY - startPos.y;

    let [sx1, sy1, sx2, sy2] = startBox;
    const minSize = 0.05; // Minimum 5% width/height

    let nx1 = sx1, ny1 = sy1, nx2 = sx2, ny2 = sy2;

    if (dragType === 'move') {
      const w = sx2 - sx1;
      const h = sy2 - sy1;
      nx1 = Math.max(0, Math.min(1 - w, sx1 + dx));
      ny1 = Math.max(0, Math.min(1 - h, sy1 + dy));
      nx2 = nx1 + w;
      ny2 = ny1 + h;
    } else if (dragType === 'tl') {
      nx1 = Math.max(0, Math.min(sx2 - minSize, sx1 + dx));
      ny1 = Math.max(0, Math.min(sy2 - minSize, sy1 + dy));
    } else if (dragType === 'tr') {
      nx2 = Math.min(1, Math.max(sx1 + minSize, sx2 + dx));
      ny1 = Math.max(0, Math.min(sy2 - minSize, sy1 + dy));
    } else if (dragType === 'bl') {
      nx1 = Math.max(0, Math.min(sx2 - minSize, sx1 + dx));
      ny2 = Math.min(1, Math.max(sy1 + minSize, sy2 + dy));
    } else if (dragType === 'br') {
      nx2 = Math.min(1, Math.max(sx1 + minSize, sx2 + dx));
      ny2 = Math.min(1, Math.max(sy1 + minSize, sy2 + dy));
    }

    onBoxChange([
      Number(nx1.toFixed(4)),
      Number(ny1.toFixed(4)),
      Number(nx2.toFixed(4)),
      Number(ny2.toFixed(4))
    ]);
  }, [isDragging, dragType, startPos, startBox, onBoxChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Scale box around center from slider
  const handleScaleSlider = (e) => {
    const newTargetSize = parseFloat(e.target.value) / 100;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const half = newTargetSize / 2;

    let nx1 = Math.max(0, cx - half);
    let nx2 = Math.min(1, cx + half);
    let ny1 = Math.max(0, cy - half);
    let ny2 = Math.min(1, cy + half);

    onBoxChange([
      Number(nx1.toFixed(4)),
      Number(ny1.toFixed(4)),
      Number(nx2.toFixed(4)),
      Number(ny2.toFixed(4))
    ]);
  };

  const resetBox = () => {
    onBoxChange([0.35, 0.35, 0.65, 0.65]);
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Interactive Image & Overlay Area */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[3/2] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 select-none shadow-2xl group"
      >
        {/* Base Aerial Drone Image */}
        <img
          src={imageUrl}
          alt="Drone aerial view"
          className="w-full h-full object-cover pointer-events-none"
        />

        {/* Segmentation Color Mask Overlay */}
        {showMask && maskUrl && (
          <img
            src={`data:image/png;base64,${maskUrl}`}
            alt="Segmentation mask"
            style={{ opacity: maskOpacity }}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-150 mix-blend-screen"
          />
        )}

        {/* Dark dimming layer outside drop zone */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <mask id="dropzone-cutout">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={`${x1 * 100}%`}
                y={`${y1 * 100}%`}
                width={`${(x2 - x1) * 100}%`}
                height={`${(y2 - y1) * 100}%`}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(15, 23, 42, 0.65)"
            mask="url(#dropzone-cutout)"
          />
        </svg>

        {/* Interactive Drop Zone Box */}
        <div
          onPointerDown={(e) => handlePointerDown(e, 'move')}
          style={{
            left: `${x1 * 100}%`,
            top: `${y1 * 100}%`,
            width: `${(x2 - x1) * 100}%`,
            height: `${(y2 - y1) * 100}%`
          }}
          className={`absolute border-2 border-cyan-400 bg-cyan-400/10 cursor-move z-20 shadow-lg ${
            isDragging ? 'border-cyan-300 bg-cyan-400/20' : 'hover:border-cyan-300'
          }`}
        >
          {/* Animated crosshair indicator */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity">
            <div className="w-4 h-0.5 bg-cyan-300"></div>
            <div className="h-4 w-0.5 bg-cyan-300 absolute"></div>
          </div>

          {/* Corner Handles */}
          <div
            onPointerDown={(e) => handlePointerDown(e, 'tl')}
            className="absolute -top-2 -left-2 w-4 h-4 bg-cyan-400 border-2 border-white rounded-sm cursor-nwse-resize shadow hover:scale-125 transition-transform"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'tr')}
            className="absolute -top-2 -right-2 w-4 h-4 bg-cyan-400 border-2 border-white rounded-sm cursor-nesw-resize shadow hover:scale-125 transition-transform"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'bl')}
            className="absolute -bottom-2 -left-2 w-4 h-4 bg-cyan-400 border-2 border-white rounded-sm cursor-nesw-resize shadow hover:scale-125 transition-transform"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'br')}
            className="absolute -bottom-2 -right-2 w-4 h-4 bg-cyan-400 border-2 border-white rounded-sm cursor-nwse-resize shadow hover:scale-125 transition-transform"
          />

          {/* Dimension badge */}
          <div className="absolute top-2 left-2 bg-slate-900/90 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/30 backdrop-blur pointer-events-none">
            Drop Zone [{(x2 - x1).toFixed(2)} × {(y2 - y1).toFixed(2)}]
          </div>
        </div>
      </div>

      {/* Controls under Canvas: Scale slider & Reset button */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-3 flex-1">
          <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="whitespace-nowrap font-medium">Box Size:</span>
          <input
            type="range"
            min="10"
            max="80"
            value={avgScale}
            onChange={handleScaleSlider}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span className="w-8 text-right font-mono text-cyan-400">{avgScale}%</span>
        </div>

        <button
          onClick={resetBox}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 text-xs font-medium shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          Reset Zone
        </button>
      </div>
    </div>
  );
}
