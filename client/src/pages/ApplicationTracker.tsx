import React, { useEffect, useState } from 'react';
import {
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Building,
  MapPin,
  FileText,
  ChevronRight,
  Calendar,
  Filter,
  User,
  Zap,
} from 'lucide-react';
import { apiClient } from '../api/client.js';
import { Application } from '../types/index.js';
import { useSSE } from '../context/SSEContext.js';

export const ApplicationTracker: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'CUSTOM'>('ALL');
  const [customDate, setCustomDate] = useState('');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [appliedTodayCount, setAppliedTodayCount] = useState(0);
  const [totalAppliedCount, setTotalAppliedCount] = useState(0);
  const { lastEvent } = useSSE();

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 150 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (platformFilter !== 'ALL') params.platform = platformFilter;
      if (dateFilter === 'TODAY') params.todayOnly = 'true';
      if (dateFilter === 'YESTERDAY') params.yesterdayOnly = 'true';
      if (dateFilter === 'CUSTOM' && customDate) params.date = customDate;

      const [res, metricsRes] = await Promise.all([
        apiClient.get('/applications', { params }),
        apiClient.get('/applications/metrics'),
      ]);

      if (res.data.success) {
        setApplications(res.data.applications);
        if (metricsRes.data.success) {
          const totalFromMetrics = metricsRes.data.metrics.totalSubmitted || 0;
          const appsLength = res.data.applications.length || 0;
          setAppliedTodayCount(metricsRes.data.metrics.totalSubmittedToday || appsLength);
          setTotalAppliedCount(Math.max(totalFromMetrics, appsLength));
        }
      }
    } catch (e) {
      console.error('Error fetching applications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter, platformFilter, dateFilter, customDate]);

  useEffect(() => {
    if (lastEvent?.type === 'APPLICATION_UPDATED') {
      fetchApplications();
    }
  }, [lastEvent]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'PROCESSING':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'ACTION_REQUIRED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'FAILED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Pending';
    const date = new Date(dateStr);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Today at ${timeStr}`;
    }
    if (isYesterday) {
      return `Yesterday at ${timeStr}`;
    }
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeStr}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & KPI Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Application Pipeline & Tracker</h2>
          <p className="text-xs text-slate-400">
            Date-wise (Today, Yesterday, Calendar) & Platform-wise live audit trail.
          </p>
        </div>

        {/* Quick KPI Count Pills */}
        <div className="flex items-center space-x-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200">
            Total Submissions: <span className="text-indigo-400">{totalAppliedCount}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center space-x-1">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Today: {appliedTodayCount}</span>
          </div>
        </div>
      </div>

      {/* Primary Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border border-slate-800">
        {/* Date Filter Tabs (Default: Total Applied) */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setDateFilter('ALL')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              dateFilter === 'ALL' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Total Applied ({totalAppliedCount})
          </button>
          <button
            onClick={() => setDateFilter('TODAY')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              dateFilter === 'TODAY' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Today ({appliedTodayCount})
          </button>
          <button
            onClick={() => setDateFilter('YESTERDAY')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              dateFilter === 'YESTERDAY' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Yesterday
          </button>
          <button
            onClick={() => setDateFilter('CUSTOM')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center space-x-1 ${
              dateFilter === 'CUSTOM' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 mr-1" />
            <span>By Calendar Date</span>
          </button>
        </div>

        {/* Platform Tabs & Date Picker */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto text-xs">
          {dateFilter === 'CUSTOM' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          )}

          {/* Platform Pills */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {['ALL', 'LINKEDIN', 'NAUKRI'].map((platform) => (
              <button
                key={platform}
                onClick={() => setPlatformFilter(platform)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  platformFilter === platform ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {platform === 'ALL' ? 'All' : platform === 'LINKEDIN' ? 'LinkedIn' : 'Naukri'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-xs">Loading application records...</div>
      ) : applications.length === 0 ? (
        <div className="glass-panel py-16 text-center rounded-2xl border border-slate-800">
          <Send className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">
            {dateFilter === 'TODAY'
              ? 'No applications submitted today yet.'
              : dateFilter === 'YESTERDAY'
              ? 'No applications found from yesterday.'
              : 'No applications found matching the selected filters.'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Daemon har 5 minute me nayi jobs par automatically apply kar raha hai.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const isOffLinkedIn = app.job?.applicationType === 'EXTERNAL_ATS' || app.status === 'ACTION_REQUIRED';

            return (
              <div
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="flex items-start space-x-4">
                  {/* Platform Badge Icon */}
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-sm border ${
                      app.job?.source === 'LINKEDIN'
                        ? 'bg-[#0077b5]/20 text-[#0077b5] border-[#0077b5]/30'
                        : 'bg-[#4a90e2]/20 text-[#4a90e2] border-[#4a90e2]/30'
                    }`}
                  >
                    {app.job?.source === 'LINKEDIN' ? 'in' : 'N'}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                        {app.job?.title || 'Engineer Role'}
                      </h3>
                      <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {app.job?.source}
                      </span>
                      {app.job?.evaluation?.score && (
                        <span className="px-2 py-0.2 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {app.job.evaluation.score}% Match
                        </span>
                      )}
                      {app.job?.source === 'NAUKRI' ? (
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Naukri 1-Click Applied
                        </span>
                      ) : isOffLinkedIn ? (
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          External Employer Portal ↗
                        </span>
                      ) : (
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          LinkedIn Easy Apply
                        </span>
                      )}
                    </div>

                    {/* Company & Location */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                      <span className="flex items-center text-slate-300 font-medium">
                        <Building className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        {app.job?.company}
                      </span>
                      <span className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        {app.job?.location}
                      </span>
                      <span className="flex items-center text-slate-500">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        {formatDateTime(app.appliedAt || app.createdAt)}
                      </span>
                    </div>

                    {/* Profile & Confirmation ID metadata */}
                    <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500 mt-2">
                      <span className="flex items-center text-slate-400">
                        <User className="w-3 h-3 mr-1 text-indigo-400" />
                        Applied as: <strong>{(app as any).candidateProfile?.fullName || 'Pawan Kumar'}</strong>
                      </span>
                      {app.confirmationId && (
                        <span className="font-mono text-slate-400">
                          Conf ID: <strong className="text-slate-300">{app.confirmationId}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action: Status & Direct Original Link */}
                <div
                  className="flex items-center justify-between md:justify-end space-x-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(app.status)}`}>
                    {app.status}
                  </span>

                  {app.job?.applicationUrl && (
                    <a
                      href={app.job.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white font-bold text-xs border border-slate-700 flex items-center space-x-1.5 transition"
                      title="Open original job posting"
                    >
                      <span>View Job Posting</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Modal on Card Click */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col border border-slate-700 shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/60">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(selectedApp.status)}`}>
                    {selectedApp.status}
                  </span>
                  <span className="text-xs text-slate-400">{selectedApp.job?.source} Application</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1.5">{selectedApp.job?.title}</h3>
                <p className="text-xs text-slate-400">
                  {selectedApp.job?.company} • {selectedApp.job?.location}
                </p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="px-3 py-1 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Submission Metadata */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Applied Timestamp:</span>
                  <span className="text-white font-medium">{formatDateTime(selectedApp.appliedAt || selectedApp.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Applicant Name:</span>
                  <span className="text-white font-semibold">{(selectedApp as any).candidateProfile?.fullName || 'Pawan Kumar'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Application Type:</span>
                  <span className="text-indigo-400 font-semibold">{selectedApp.job?.applicationType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Confirmation ID:</span>
                  <span className="text-indigo-400 font-mono font-semibold">{selectedApp.confirmationId || 'Pending'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Original Posting Link:</span>
                  <a
                    href={selectedApp.job?.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline flex items-center font-medium"
                  >
                    <span>Open Live Job URL</span>
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>

              {/* Complete Job Description */}
              {selectedApp.job?.description && (
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                  <h4 className="font-bold text-white mb-1.5">Complete Job Description:</h4>
                  <div className="text-slate-300 max-h-48 overflow-y-auto whitespace-pre-line leading-relaxed">
                    {selectedApp.job.description}
                  </div>
                </div>
              )}

              {/* Verified Answers Submitted */}
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <h4 className="font-bold text-white mb-2">Verified Profile Answers Submitted:</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {Object.entries(selectedApp.screeningAnswers || {}).map(([q, a]) => (
                    <div key={q} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <p className="text-slate-500 font-medium">{q}</p>
                      <p className="text-slate-200 font-semibold mt-0.5">{String(a)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <span className="text-xs text-slate-500">AutoJob AI Verified Audit Trail</span>
              <button
                onClick={() => setSelectedApp(null)}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
