import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Check from './pages/Check';
import Models from './pages/Models';
import HowItWorks from './pages/HowItWorks';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-white">
        <Header />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Check />} />
            <Route path="/models" element={<Models />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
          </Routes>
        </main>

        <footer className="glass-panel border-t border-slate-800 py-6 text-center text-xs text-slate-500 mt-12">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🚁</span>
              <span className="font-heading font-semibold text-slate-300">Safe Drop Checker</span>
              <span>— Autonomous Drone Delivery Safety System</span>
            </div>
            <p className="text-slate-500">
              Powered by PyTorch, segmentation-models-pytorch (ResNet34), FastAPI & React.
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}
