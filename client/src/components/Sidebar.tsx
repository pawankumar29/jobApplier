import React from 'react';
import { LayoutDashboard, Compass, Send, Cpu, FileText, Activity, Sliders, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'jobs', label: 'Live Job Feed', icon: Compass },
    { id: 'tracker', label: 'Applications', icon: Send },
    { id: 'integrations', label: 'Platform Integrations', icon: Cpu },
    { id: 'resumes', label: 'Resume Intelligence', icon: FileText },
    { id: 'automation', label: 'Automation Daemon', icon: Activity },
    { id: 'settings', label: 'Profile & Matching', icon: Sliders },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col justify-between p-4 flex-shrink-0">
      <div>
        <div className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase px-3 mb-2">
          Platform Navigation
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-800/80">
        <div className="glass-card rounded-xl p-3 border border-indigo-500/20 bg-indigo-950/20">
          <div className="flex items-center space-x-2 text-indigo-400 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-bold">Compliant & Safe</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Strict OAuth & Session adherence. Rate limits & CAPTCHA guards active. Zero credentials leak.
          </p>
        </div>
      </div>
    </aside>
  );
};

