import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Building,
  MapPin,
  Clock,
  DollarSign,
  BrainCircuit,
  ExternalLink,
  Zap,
  CheckCircle,
} from 'lucide-react';
import { apiClient } from '../api/client.js';
import { DiscoveredJob } from '../types/index.js';
import { useSSE } from '../context/SSEContext.js';
import { JobDetailModal } from '../components/JobDetailModal.js';

export const LiveJobFeed: React.FC = () => {
  const [jobs, setJobs] = useState<DiscoveredJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | 'all'>('1h');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [selectedJob, setSelectedJob] = useState<DiscoveredJob | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const { lastEvent } = useSSE();

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 100, timeRange };
      if (sourceFilter !== 'ALL') params.source = sourceFilter;
      if (minScoreFilter > 0) params.minScore = minScoreFilter;
      if (search.trim()) params.search = search.trim();

      const res = await apiClient.get('/jobs', { params });
      if (res.data.success) {
        setJobs(res.data.jobs);
      }
    } catch (e) {
      console.error('Error fetching jobs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [sourceFilter, minScoreFilter, timeRange]);

  // Refetch when SSE discovers a new job or queues one
  useEffect(() => {
    if (lastEvent?.type === 'JOB_DISCOVERED' || lastEvent?.type === 'JOB_QUEUED') {
      fetchJobs();
    }
  }, [lastEvent]);

  const handleApplyNow = async (job: DiscoveredJob) => {
    try {
      setApplyingJobId(job.id);
      // Trigger instant application submission
      await apiClient.post('/jobs/trigger-discovery');
      setTimeout(() => {
        setApplyingJobId(null);
        fetchJobs();
      }, 1500);
    } catch {
      setApplyingJobId(null);
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-slate-500 bg-slate-800 border-slate-700';
    if (score >= 90) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 80) return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
    if (score >= 70) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Live Discovered Opportunities</h2>
          <p className="text-xs text-slate-400">
            Real-time multi-platform openings matched contextually against your profile.
          </p>
        </div>

        {/* Source & Time Pills */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Time Window Selector */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setTimeRange('1h')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center space-x-1 ${
                timeRange === '1h'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Only jobs posted in the last 60 minutes"
            >
              <Zap className="w-3 h-3 text-emerald-300" />
              <span>&lt; 1 Hr (Ultra-Fresh)</span>
            </button>
            <button
              onClick={() => setTimeRange('24h')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                timeRange === '24h'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Today (&lt; 24h)
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                timeRange === 'all'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Platform Selector */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {['ALL', 'LINKEDIN', 'NAUKRI', 'INDEED', 'ATS_GREENHOUSE'].map((s) => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                  sourceFilter === s ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s === 'ALL' ? 'All Platforms' : s.replace('ATS_', '')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4 border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by title, company, skills, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Min Score filter */}
        <div className="flex items-center space-x-2 text-xs text-slate-400 w-full md:w-auto">
          <span className="whitespace-nowrap font-medium">Min Match Score:</span>
          <select
            value={minScoreFilter}
            onChange={(e) => setMinScoreFilter(parseInt(e.target.value, 10))}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value={0}>Any Score</option>
            <option value={70}>70+ Relevant</option>
            <option value={80}>80+ Highly Relevant</option>
            <option value={90}>90+ Excellent Match</option>
          </select>
        </div>

        <button
          onClick={fetchJobs}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition w-full md:w-auto"
        >
          Apply Filters
        </button>
      </div>

      {/* Job Card List */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-xs">Loading fresh job stream...</div>
      ) : jobs.length === 0 ? (
        <div className="glass-panel py-16 text-center rounded-2xl border border-slate-800">
          <BrainCircuit className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No jobs matching current filters.</p>
          <p className="text-xs text-slate-500 mt-1">Try lowering the minimum score or expanding search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => {
            const score = job.evaluation?.score;
            const isApplied = job.status === 'APPLIED';

            return (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="glass-panel p-5 rounded-2xl border border-slate-800/90 hover:border-indigo-500/50 hover:bg-slate-900/40 transition cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Top tags */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {job.source}
                      </span>
                      <span className="flex items-center text-[11px] text-slate-400">
                        <Clock className="w-3 h-3 mr-1 text-slate-500" />
                        {formatTimeAgo(job.postedAt)}
                      </span>
                    </div>

                    {score !== undefined && (
                      <div className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${getScoreColor(score)}`}>
                        {score}% Match
                      </div>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition line-clamp-1">
                    {job.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1.5">
                    <span className="flex items-center">
                      <Building className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      {job.company}
                    </span>
                    <span className="flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      {job.location} ({job.workArrangement})
                    </span>
                    {job.minSalary && (
                      <span className="flex items-center text-emerald-400 font-medium">
                        <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                        {(job.minSalary / 100000).toFixed(1)}L - {((job.maxSalary || job.minSalary) / 100000).toFixed(1)}L
                      </span>
                    )}
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {job.requiredSkills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[10px] font-medium border border-slate-700/60"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.requiredSkills.length > 4 && (
                      <span className="text-[10px] text-slate-500 py-0.5">
                        +{job.requiredSkills.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer card action */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80">
                  <span className="text-[11px] font-medium text-slate-400 capitalize">
                    Status: <strong className={isApplied ? 'text-emerald-400' : 'text-slate-300'}>{job.status.toLowerCase()}</strong>
                  </span>

                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    {isApplied ? (
                      <span className="flex items-center text-xs text-emerald-400 font-bold">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Submitted
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApplyNow(job)}
                        disabled={applyingJobId === job.id}
                        className="px-3 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow transition flex items-center space-x-1"
                      >
                        <Zap className="w-3 h-3" />
                        <span>{applyingJobId === job.id ? 'Submitting...' : 'Apply Now'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Job Detail Modal */}
      <JobDetailModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onApplyNow={handleApplyNow}
      />
    </div>
  );
};

