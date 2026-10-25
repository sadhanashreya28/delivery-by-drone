import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Cpu, HelpCircle, Activity, AlertCircle } from 'lucide-react';
import { fetchHealth } from '../api';

export default function Header() {
  const location = useLocation();
  const [health, setHealth] = useState({ status: 'loading', loaded_models: [] });

  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      const data = await fetchHealth();
      if (isMounted) setHealth(data);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const getStatusBadge = () => {
    if (health.status === 'loading') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></span>
          Checking backend...
        </span>
      );
    }
    if (health.status === 'ok') {
      const loadedCount = health.loaded_models.length;
      if (loadedCount >= 3) {
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            All 3 Models Online ({health.device.toUpperCase()})
          </span>
        );
      } else if (loadedCount > 0) {
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" title="Some models missing weights">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            {loadedCount} Models Online ({health.device.toUpperCase()})
          </span>
        );
      }
 else {
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30" title="Backend running, weights missing">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Weights Missing
          </span>
        );
      }
    }
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
        Backend Disconnected
      </span>
    );
  };

  const navLinks = [
    { path: '/', label: 'Check Drop Zone', icon: ShieldCheck },
    { path: '/models', label: 'Model Benchmarks', icon: Cpu },
    { path: '/how-it-works', label: 'How It Works', icon: HelpCircle },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <span className="text-xl">🚁</span>
          </div>
          <div>
            <span className="font-heading font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              Safe Drop <span className="text-cyan-400">Checker</span>
            </span>
            <p className="text-[10px] text-slate-400 -mt-1 font-medium">Autonomous Drone Delivery AI</p>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-950/50 p-1 rounded-xl border border-slate-800">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Backend Health Badge */}
        <div>{getStatusBadge()}</div>
      </div>
    </header>
  );
}
