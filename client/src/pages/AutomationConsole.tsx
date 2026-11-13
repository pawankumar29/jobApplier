import React, { useEffect, useState } from 'react';
import {
  Activity,
  Play,
  Pause,
  Square,
  Terminal,
  Settings,
  RefreshCw,
  Clock,
  Shield,
  Layers,
} from 'lucide-react';
import { apiClient } from '../api/client.js';
import { AutomationConfig, AutomationLog } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useSSE } from '../context/SSEContext.js';

export const AutomationConsole: React.FC = () => {
  const { automationConfig, refreshUser } = useAuth();
  const [config, setConfig] = useState<AutomationConfig | null>(automationConfig);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkInterval, setCheckInterval] = useState(15);
  const [maxConcurrency, setMaxConcurrency] = useState(3);
  const [savingSettings, setSavingSettings] = useState(false);
  const { lastEvent } = useSSE();

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/automation/status');
      if (res.data.success) {
        setConfig(res.data.config);
        setLogs(res.data.recentLogs);
        setCheckInterval(res.data.config.checkIntervalMinutes);
        setMaxConcurrency(res.data.config.maxConcurrency);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (lastEvent?.type === 'LOG_ENTRY') {
      setLogs((prev) => [lastEvent.data, ...prev.slice(0, 30)]);
    }
  }, [lastEvent]);

  const handleAction = async (action: 'START' | 'PAUSE' | 'RESUME' | 'STOP') => {
    try {
      await apiClient.post('/automation/control', { action });
      await refreshUser();
      await fetchStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await apiClient.put('/automation/settings', {
        checkIntervalMinutes: checkInterval,
        maxConcurrency,
      });
      await fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSettings(false);
    }
  };

  const isRunning = config?.status === 'RUNNING';
  const isPaused = config?.status === 'PAUSED';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Autonomous Background Daemon</h2>
        <p className="text-xs text-slate-400">
          Standalone worker controls, execution scheduling, and real-time telemetry logs.
        </p>
      </div>

      {/* Main Status & Controls Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                isRunning
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : isPaused
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}
            >
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-white">Worker Daemon</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${
                    isRunning
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : isPaused
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {config?.status || 'OFFLINE'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Next scheduled cycle in {config?.checkIntervalMinutes || 15} minutes (or trigger on-demand).
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {isRunning ? (
              <button
                onClick={() => handleAction('PAUSE')}
                className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Daemon</span>
              </button>
            ) : (
              <button
                onClick={() => handleAction('START')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Daemon</span>
              </button>
            )}

            <button
              onClick={() => handleAction('STOP')}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition"
              title="Stop"
            >
              <Square className="w-3.5 h-3.5 text-rose-400" />
            </button>
          </div>
        </div>

        {/* Runtime Tuning */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-semibold block mb-1">Cycle Frequency</span>
            <div className="flex items-center justify-between text-white font-bold mb-2">
              <span className="text-indigo-400">Every {checkInterval} minutes ⚡</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={checkInterval}
              onChange={(e) => setCheckInterval(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-semibold block mb-1">Max Concurrency</span>
            <div className="flex items-center justify-between text-white font-bold mb-2">
              <span>{maxConcurrency} simultaneous applications</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={maxConcurrency}
              onChange={(e) => setMaxConcurrency(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-slate-400 font-semibold block mb-1">Application Limit</span>
              <p className="text-white font-bold text-sm">
                {config?.dailyApplicationsCount ?? 0} Submissions (Unlimited 🚀)
              </p>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg border border-slate-700 transition"
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Live Log Terminal Output */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Daemon Event Stream</h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Stream active via SSE</span>
        </div>

        <div className="p-4 bg-black/60 font-mono text-[11px] max-h-72 overflow-y-auto space-y-2">
          {logs.length === 0 ? (
            <p className="text-slate-600">Waiting for next daemon execution tick...</p>
          ) : (
            logs.map((log, index) => {
              const isError = log.level === 'ERROR';
              const isWarn = log.level === 'WARN';
              return (
                <div key={index} className="flex items-start space-x-2 leading-relaxed">
                  <span className="text-slate-600 shrink-0">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span
                    className={`font-bold shrink-0 ${
                      isError ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-indigo-400'
                    }`}
                  >
                    [{log.action}]
                  </span>
                  <span className={isError ? 'text-rose-300' : 'text-slate-300'}>{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

