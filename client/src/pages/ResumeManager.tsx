import React, { useEffect, useState } from 'react';
import {
  FileText,
  Upload,
  CheckCircle,
  Star,
  Trash2,
  AlertCircle,
  Eye,
  Check,
  BrainCircuit,
} from 'lucide-react';
import { apiClient } from '../api/client.js';

interface ResumeItem {
  id: string;
  fileName: string;
  fileType: string;
  isPrimary: boolean;
  targetRoles: string[];
  parsedData: any;
  createdAt: string;
}

export const ResumeManager: React.FC = () => {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedResume, setSelectedResume] = useState<ResumeItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/resume');
      if (res.data.success) {
        setResumes(res.data.resumes);
        if (res.data.resumes.length > 0 && !selectedResume) {
          setSelectedResume(res.data.resumes[0]);
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('targetRoles', JSON.stringify(['Full Stack Engineer', 'Backend Specialist']));

      const res = await apiClient.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        await fetchResumes();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload resume.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const setPrimary = async (id: string) => {
    try {
      await apiClient.put(`/resume/${id}/primary`);
      await fetchResumes();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteResume = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    try {
      await apiClient.delete(`/resume/${id}`);
      await fetchResumes();
      if (selectedResume?.id === id) {
        setSelectedResume(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">AI Resume Intelligence</h2>
          <p className="text-xs text-slate-400">
            Upload PDF & DOCX resumes. The AI parses technical skills, experience duration, and accomplishments.
          </p>
        </div>

        {/* Upload Trigger */}
        <label className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition self-start sm:self-auto">
          <Upload className="w-4 h-4" />
          <span>{uploading ? 'Parsing AI Resume...' : 'Upload New Resume'}</span>
          <input
            type="file"
            accept=".pdf,.docx,.doc"
            className="hidden"
            disabled={uploading}
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resume List */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
            Uploaded Resumes ({resumes.length})
          </h3>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading resumes...</div>
          ) : resumes.length === 0 ? (
            <div className="glass-panel p-8 text-center rounded-2xl border border-slate-800">
              <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-300 font-semibold">No resumes uploaded.</p>
              <p className="text-[11px] text-slate-500 mt-1">Upload a PDF or DOCX to enable autofill.</p>
            </div>
          ) : (
            resumes.map((r) => {
              const isSelected = selectedResume?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedResume(r)}
                  className={`glass-panel p-4 rounded-2xl border transition cursor-pointer ${
                    isSelected ? 'border-indigo-500 bg-slate-900/90 shadow-lg' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate max-w-[180px]">
                        <h4 className="text-xs font-bold text-white truncate">{r.fileName}</h4>
                        <p className="text-[10px] text-slate-400">
                          {r.fileType} • {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {r.isPrimary && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Primary
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80 text-[11px]">
                    {!r.isPrimary ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrimary(r.id);
                        }}
                        className="text-indigo-400 hover:underline flex items-center space-x-1"
                      >
                        <Star className="w-3 h-3 mr-1" />
                        <span>Make Primary</span>
                      </button>
                    ) : (
                      <span className="text-slate-500">Default Submission</span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteResume(r.id);
                      }}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Structured Resume Intelligence Inspector */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800">
          {selectedResume ? (
            <div className="space-y-5 text-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Parsed Profile Intelligence</h3>
                    <p className="text-[11px] text-slate-400">Extracted from {selectedResume.fileName}</p>
                  </div>
                </div>
                {selectedResume.isPrimary && (
                  <span className="text-xs text-emerald-400 font-bold flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Selected for Auto-Apply
                  </span>
                )}
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Candidate</span>
                  <p className="font-bold text-white mt-0.5">{selectedResume.parsedData?.fullName || 'Alex Chen'}</p>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Total Exp</span>
                  <p className="font-bold text-white mt-0.5">{selectedResume.parsedData?.totalExperienceYears || '4.5'} Years</p>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Target Roles</span>
                  <p className="font-bold text-white mt-0.5">Full Stack / Backend</p>
                </div>
              </div>

              {/* Technical Skills Taxonomies */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-200">Extracted Technical Skills</h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(selectedResume.parsedData?.technicalSkills || []).map((skill: string) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Education */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
                <h4 className="font-bold text-slate-200">Education & Credentials</h4>
                {(selectedResume.parsedData?.education || []).map((edu: any, i: number) => (
                  <div key={i} className="text-slate-300 text-xs">
                    • <strong>{edu.degree}</strong> — {edu.institution} ({edu.year || '2020'})
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 text-xs">
              Select a resume to inspect AI extraction data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

