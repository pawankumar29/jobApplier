import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: 'emerald' | 'indigo' | 'amber' | 'rose';
  trend?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  badge,
  badgeColor = 'indigo',
  trend,
}) => {
  const badgeClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">{title}</span>
        <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-black text-white">{value}</span>
          {badge && (
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${badgeClasses[badgeColor]}`}>
              {badge}
            </span>
          )}
        </div>
        {subtext && <p className="text-xs text-slate-400 mt-1 font-medium">{subtext}</p>}
        {trend && <p className="text-[11px] text-emerald-400 mt-1.5 font-medium">{trend}</p>}
      </div>
    </div>
  );
};

