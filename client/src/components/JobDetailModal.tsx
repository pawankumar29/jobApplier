import React from 'react';
import { X, ExternalLink, Check, AlertTriangle, Building, MapPin, Clock, DollarSign, BrainCircuit, ShieldCheck, Zap } from 'lucide-react';
import { DiscoveredJob } from '../types/index.js';

interface JobDetailModalProps {
  job: DiscoveredJob | null;
  onClose: () => void;
  onApplyNow?: (job: DiscoveredJob) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, onClose, onApplyNow }) => {
  if (!job) return null;

  const evalData = job.evaluation;
  const score = evalData?.score ?? 0;
  const isExcellent = score >= 90;
  const isHigh = score >= 80 && score < 90;
  const isRelevant = score >= 70 && score < 80;

  const scoreBadgeColor = isExcellent
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    : isHigh
    ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
    : isRelevant
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    : 'text-rose-400 bg-rose-500/10 border-rose-500/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/60">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {job.source}
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {job.externalJobId}</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5">{job.title}</h2>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300 mt-2">
              <span className="flex items-center">
                <Building className="w-3.5 h-3.5 mr-1 text-slate-400" />
                {job.company}
              </span>
              <span className="flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                {job.location} ({job.workArrangement})
              </span>
              {job.minSalary && (
                <span className="flex items-center text-emerald-400 font-semibold">
                  <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                  {((job.minSalary) / 100000).toFixed(1)}L - {((job.maxSalary || job.minSalary) / 100000).toFixed(1)}L INR
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* AI Match Overview Box */}
          {evalData && (
            <div className="glass-card rounded-2xl p-5 border border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 via-slate-900/40 to-slate-900/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm font-bold text-white">AI Semantic Match Assessment</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-black border ${scoreBadgeColor}`}>
                  {evalData.score}/100 • {evalData.classification}
                </div>
              </div>

              {/* Skills breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-3">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-emerald-500/20">
                  <span className="font-bold text-emerald-400 flex items-center mb-2">
                    <Check className="w-4 h-4 mr-1" />
                    Matching Skills ({evalData.matchingSkills.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {evalData.matchingSkills.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-medium text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-amber-500/20">
                  <span className="font-bold text-amber-400 flex items-center mb-2">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Missing or Desirable Skills ({evalData.missingSkills.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {evalData.missingSkills.length > 0 ? (
                      evalData.missingSkills.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-medium text-[11px]">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400">None! Complete skill match.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contextual rationale */}
              <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-slate-200">Evaluation Analysis:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  {evalData.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                  {evalData.experienceCompatibility && <li>{evalData.experienceCompatibility}</li>}
                </ul>
              </div>
            </div>
          )}

          {/* Job Description */}
          <div>
            <h3 className="text-sm font-bold text-white mb-2">Full Job Description</h3>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
              {job.description}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <a
            href={job.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            <span>Open Original Portal Listing</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </a>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Close
            </button>
            {onApplyNow && job.status !== 'APPLIED' && (
              <button
                onClick={() => onApplyNow(job)}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition"
              >
                <Zap className="w-4 h-4" />
                <span>Submit Autonomous Application</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

