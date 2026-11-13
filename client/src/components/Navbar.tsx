import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Bell, Sparkles, RefreshCw, Radio, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useSSE } from '../context/SSEContext.js';
import { apiClient } from '../api/client.js';
import { NotificationItem } from '../types/index.js';

export const Navbar: React.FC = () => {
  const { user, automationConfig, refreshUser } = useAuth();
  const { isConnected } = useSSE();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleControlAction = async (action: 'START' | 'PAUSE' | 'STOP') => {
    try {
      await apiClient.post('/automation/control', { action });
      await refreshUser();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerDiscovery = async () => {
    setIsTriggering(true);
    try {
      await apiClient.post('/jobs/trigger-discovery');
      setTimeout(() => setIsTriggering(false), 2000);
    } catch (e) {
      setIsTriggering(false);
    }
  };

  const markAllRead = async () => {
    try {
      await apiClient.put('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // Ignored
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const isRunning = automationConfig?.status === 'RUNNING';

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              AutoJob AI
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Autonomous Discovery & Applications</p>
          </div>
        </div>

        {/* Live Daemon Status Badge */}
        <div className="hidden md:flex items-center ml-4 px-3 py-1 rounded-full text-xs font-medium border bg-slate-800/80 border-slate-700/80">
          <span className="flex h-2 w-2 relative mr-2">
            {isRunning && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isRunning ? 'bg-emerald-500' : automationConfig?.status === 'PAUSED' ? 'bg-amber-500' : 'bg-rose-500'
              }`}
            ></span>
          </span>
          <span className="text-slate-300 capitalize">{automationConfig?.status?.toLowerCase() || 'Offline'}</span>
          <span className="mx-2 text-slate-600">|</span>
          <Radio className={`w-3.5 h-3.5 mr-1 ${isConnected ? 'text-indigo-400' : 'text-slate-500'}`} />
          <span className="text-[11px] text-slate-400">{isConnected ? 'SSE Live' : 'Connecting'}</span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* On-Demand Trigger */}
        <button
          onClick={handleTriggerDiscovery}
          disabled={isTriggering}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          title="Run instant discovery cycle across all platforms"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isTriggering ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Discover Now</span>
        </button>

        {/* Daemon Controls */}
        <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-lg p-0.5">
          {isRunning ? (
            <button
              onClick={() => handleControlAction('PAUSE')}
              className="px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-slate-700 rounded-md flex items-center space-x-1 transition"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={() => handleControlAction('START')}
              className="px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-slate-700 rounded-md flex items-center space-x-1 transition"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start</span>
            </button>
          )}
          <button
            onClick={() => handleControlAction('STOP')}
            className="px-2 py-1 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-md transition"
            title="Stop daemon"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 glass-panel rounded-xl shadow-2xl p-3 border border-slate-700/80 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-white">Notifications ({unreadCount})</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] text-indigo-400 hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60 mt-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="py-2 px-1 text-xs">
                      <div className="flex items-center space-x-1.5 font-medium text-slate-200">
                        {n.type === 'APP_SUBMITTED' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        )}
                        <span className="truncate">{n.title}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Pill */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-300">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-slate-200 leading-none">{user?.name || 'Alex Chen'}</p>
            <p className="text-[10px] text-slate-400 font-mono">Autonomous Mode</p>
          </div>
        </div>
      </div>
    </header>
  );
};

