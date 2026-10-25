import React from 'react';
import {
  Upload, Sliders, ShieldCheck, Cpu, ArrowRight, Layers, AlertOctagon, CheckCircle2, Video
} from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Image Upload & Normalization',
      desc: 'Top-down aerial drone photo is resized to (576, 384) resolution, converted to RGB float tensors, and normalized with ImageNet mean and std parameters.',
      icon: Upload,
    },
    {
      num: '02',
      title: 'Semantic Segmentation Model',
      desc: 'The input tensor (1, 3, 384, 576) is processed by PyTorch SMP neural networks (DeepLabV3+ or U-Net with ResNet34 encoder) to generate class logits (1, 24, 384, 576).',
      icon: Cpu,
    },
    {
      num: '03',
      title: 'Per-Pixel Class Mapping',
      desc: 'An argmax across dimension 1 determines the exact class index (0 to 23) for all 221,184 pixels in the aerial frame.',
      icon: Layers,
    },
    {
      num: '04',
      title: 'Drop Zone Safety Assessment',
      desc: 'The user-drawn bounding box extracts sub-pixel coordinates. Safe ratio and hazard frequencies are computed against custom safety rules.',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight">
          How Safe Drop Checker Works
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          An end-to-end overview of our autonomous drone delivery drop zone safety verification pipeline.
        </p>
      </div>

      {/* Visual Pipeline Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 relative flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-extrabold text-cyan-500/40">
                    {step.num}
                  </span>
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="font-heading font-bold text-base text-white">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Class Rules & Categorization Table */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6">
        <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          Semantic Drone Dataset 24-Class Taxonomy Rules
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* SAFE Classes */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              SAFE Ground Classes
            </div>
            <p className="text-xs text-slate-300">
              Classes considered smooth, level landing surfaces for drone payloads:
            </p>
            <ul className="text-xs space-y-1.5 font-medium text-emerald-200">
              <li className="flex items-center gap-2">• paved-area (ID 1)</li>
              <li className="flex items-center gap-2">• dirt (ID 2)</li>
              <li className="flex items-center gap-2">• grass (ID 3)</li>
              <li className="flex items-center gap-2">• gravel (ID 4)</li>
            </ul>
          </div>

          {/* HAZARD Classes */}
          <div className="bg-rose-500/10 border border-rose-500/30 p-5 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
              <AlertOctagon className="w-4 h-4" />
              HAZARD Classes (&gt; 0.5% triggers UNSAFE)
            </div>
            <p className="text-xs text-slate-300">
              Immediate collision or submersion hazards. If &gt;0.5% present in zone, verdict is UNSAFE:
            </p>
            <ul className="text-xs space-y-1.5 font-medium text-rose-200">
              <li className="flex items-center gap-2">• water (ID 5), pool (ID 7)</li>
              <li className="flex items-center gap-2">• person (ID 15), dog (ID 16)</li>
              <li className="flex items-center gap-2">• car (ID 17), bicycle (ID 18)</li>
            </ul>
          </div>

          {/* Neutral / Obstacle Classes */}
          <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-slate-300 font-bold text-sm uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Neutral / Obstacle Classes
            </div>
            <p className="text-xs text-slate-400">
              Not immediate hazards, but subtract from total safe ratio:
            </p>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              unlabeled, rocks, vegetation, roof, wall, window, door, fence, fence-pole, tree, bald-tree, ar-marker, obstacle, conflicting.
            </p>
          </div>
        </div>
      </div>

      {/* Threshold Alpha & Phase 2 Video Motion Detection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
          <h4 className="font-heading font-bold text-base text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            Safety Threshold (Alpha α)
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            The safety threshold <code className="text-cyan-400 bg-slate-900 px-1 py-0.5 rounded">α</code> (default 0.90 or 90%) requires that at least 90% of the pixels inside the landing box consist of safe ground (paved area, dirt, grass, gravel). If safe ground is less than 90%, the drop zone is flagged UNSAFE.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
          <h4 className="font-heading font-bold text-base text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-cyan-400" />
            Phase 2 Video Motion Detection
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            For flight video streams, consecutive grayscale frames are compared using mean absolute pixel difference (<code className="text-cyan-400 bg-slate-900 px-1 py-0.5 rounded">eps = 2.0</code>). Unchanged frames reuse previous segmentation masks, saving GPU computation while maintaining safety timelines.
          </p>
        </div>
      </div>
    </div>
  );
}
