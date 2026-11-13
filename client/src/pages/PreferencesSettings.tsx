import React, { useState, useEffect } from 'react';
import { Sliders, Save, CheckCircle, User, Briefcase, DollarSign, MapPin, Building, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiClient } from '../api/client.js';

export const PreferencesSettings: React.FC = () => {
  const { profile, preferences, refreshUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [totalExperienceYears, setTotalExperienceYears] = useState(4.5);
  const [currentCTC, setCurrentCTC] = useState<number | string>(2400000);
  const [expectedCTC, setExpectedCTC] = useState<number | string>(3400000);
  const [noticePeriodDays, setNoticePeriodDays] = useState<number>(0);

  // Preferences
  const [preferredTitles, setPreferredTitles] = useState('');
  const [preferredLocations, setPreferredLocations] = useState('');
  const [preferredCompanies, setPreferredCompanies] = useState('');
  const [excludedCompanies, setExcludedCompanies] = useState('');
  const [remotePreference, setRemotePreference] = useState('ANY');
  const [minRelevanceScore, setMinRelevanceScore] = useState(75);
  const [maxDailyApplications, setMaxDailyApplications] = useState(20);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setCurrentLocation(profile.currentLocation || '');
      setTotalExperienceYears(profile.totalExperienceYears || 4.5);
      setCurrentCTC(profile.currentCTC || 2400000);
      setExpectedCTC(profile.expectedCTC || 3400000);
      setNoticePeriodDays(profile.noticePeriodDays !== undefined && profile.noticePeriodDays !== null ? profile.noticePeriodDays : 0);
    }

    if (preferences) {
      const titles = Array.isArray(preferences.preferredTitles)
        ? preferences.preferredTitles
        : JSON.parse((preferences.preferredTitles as any) || '[]');
      setPreferredTitles(titles.join(', '));

      const locs = Array.isArray(preferences.preferredLocations)
        ? preferences.preferredLocations
        : JSON.parse((preferences.preferredLocations as any) || '[]');
      setPreferredLocations(locs.join(', '));

      const comps = Array.isArray(preferences.preferredCompanies)
        ? preferences.preferredCompanies
        : JSON.parse((preferences.preferredCompanies as any) || '[]');
      setPreferredCompanies(comps.join(', '));

      const exComps = Array.isArray(preferences.excludedCompanies)
        ? preferences.excludedCompanies
        : JSON.parse((preferences.excludedCompanies as any) || '[]');
      setExcludedCompanies(exComps.join(', '));

      setRemotePreference(preferences.remotePreference || 'ANY');
      setMinRelevanceScore(preferences.minRelevanceScore || 75);
      setMaxDailyApplications(preferences.maxDailyApplications || 20);
    }
  }, [profile, preferences]);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(false);

    try {
      const parsedTitles = preferredTitles.split(',').map((s) => s.trim()).filter(Boolean);
      const parsedLocations = preferredLocations.split(',').map((s) => s.trim()).filter(Boolean);
      const parsedCompanies = preferredCompanies.split(',').map((s) => s.trim()).filter(Boolean);
      const parsedExcluded = excludedCompanies.split(',').map((s) => s.trim()).filter(Boolean);

      await Promise.all([
        apiClient.put('/profile', {
          fullName,
          email,
          phone,
          currentLocation,
          totalExperienceYears,
          currentCTC: Number(currentCTC),
          expectedCTC: Number(expectedCTC),
          noticePeriodDays: Number(noticePeriodDays),
          preferredLocations: parsedLocations,
        }),
        apiClient.put('/preferences', {
          preferredTitles: parsedTitles,
          preferredLocations: parsedLocations,
          preferredCompanies: parsedCompanies,
          excludedCompanies: parsedExcluded,
          remotePreference,
          minRelevanceScore: Number(minRelevanceScore),
          maxDailyApplications: Number(maxDailyApplications),
        }),
      ]);

      await refreshUser();
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err) {
      console.error('Save settings error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Profile & Matching Preferences</h2>
          <p className="text-xs text-slate-400">
            Tune your candidate parameters and autonomous matching criteria dynamically.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4" />
          <span>Settings updated successfully! Background daemon adopted new preferences immediately.</span>
        </div>
      )}

      {/* Candidate Profile Details */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center">
          <User className="w-4 h-4 mr-2 text-indigo-400" />
          Verified Professional Information (Used in Autofill)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Full Legal Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Contact Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Mobile Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Current Residence City</label>
            <input
              type="text"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Total Years Experience</label>
            <input
              type="number"
              step="0.5"
              value={totalExperienceYears}
              onChange={(e) => setTotalExperienceYears(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400">Notice Period (Days)</label>
              {noticePeriodDays === 0 && (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  ⚡ Immediate Joiner (0 Days)
                </span>
              )}
            </div>
            <input
              type="number"
              min="0"
              value={noticePeriodDays}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                setNoticePeriodDays(isNaN(val) ? 0 : val);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setNoticePeriodDays(0)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition ${
                  noticePeriodDays === 0
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                ⚡ Immediate (0 Days)
              </button>
              <button
                type="button"
                onClick={() => setNoticePeriodDays(15)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition ${
                  noticePeriodDays === 15
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                15 Days
              </button>
              <button
                type="button"
                onClick={() => setNoticePeriodDays(30)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition ${
                  noticePeriodDays === 30
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Current CTC (Annual INR)</label>
            <input
              type="number"
              value={currentCTC}
              onChange={(e) => setCurrentCTC(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Expected CTC (Annual INR)</label>
            <input
              type="number"
              value={expectedCTC}
              onChange={(e) => setExpectedCTC(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Autonomous Discovery Preferences */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center">
          <Briefcase className="w-4 h-4 mr-2 text-indigo-400" />
          Autonomous Discovery & Filtering Parameters
        </h3>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Target Job Titles (Comma-separated)</label>
            <input
              type="text"
              value={preferredTitles}
              onChange={(e) => setPreferredTitles(e.target.value)}
              placeholder="e.g. Senior Software Engineer, Full Stack Engineer, Tech Lead"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 block">Target Locations</label>
                <span className="text-[10px] text-slate-500">Quick presets:</span>
              </div>
              <input
                type="text"
                value={preferredLocations}
                onChange={(e) => setPreferredLocations(e.target.value)}
                placeholder="e.g. India, Worldwide, Remote"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setPreferredLocations('India, Remote')}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition"
                >
                  🇮🇳 All Over India
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredLocations('Worldwide, Remote, Global')}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition"
                >
                  🌍 Worldwide / Global
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredLocations('India, Worldwide, Remote, Global')}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-500/30 transition"
                >
                  🚀 All Over India + Worldwide
                </button>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Work Arrangement Preference</label>
              <select
                value={remotePreference}
                onChange={(e) => setRemotePreference(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ANY">Any Arrangement</option>
                <option value="REMOTE">Remote Only</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">Onsite</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 block mb-1">Preferred Target Companies</label>
              <input
                type="text"
                value={preferredCompanies}
                onChange={(e) => setPreferredCompanies(e.target.value)}
                placeholder="e.g. Stripe, Razorpay, Vercel"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Excluded Companies (Anti-Spam)</label>
              <input
                type="text"
                value={excludedCompanies}
                onChange={(e) => setExcludedCompanies(e.target.value)}
                placeholder="e.g. UnverifiedAgency, SpamConsultancy"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <label className="text-slate-300 font-semibold block mb-1">
                Minimum AI Relevance Score: {minRelevanceScore}%
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Only submit to jobs with a calculated score equal or higher than this threshold.
              </p>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={minRelevanceScore}
                onChange={(e) => setMinRelevanceScore(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold block">
                  Application Limit: {maxDailyApplications >= 99999 || maxDailyApplications === 0 ? 'Unlimited (No Limit 🚀)' : `${maxDailyApplications} / day`}
                </label>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Apply to unlimited jobs or set a daily limit.
              </p>
              <div className="space-y-2">
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={maxDailyApplications >= 99999 ? 100 : maxDailyApplications}
                  disabled={maxDailyApplications >= 99999}
                  onChange={(e) => setMaxDailyApplications(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-500 disabled:opacity-40"
                />
                <label className="flex items-center space-x-2 text-xs text-indigo-400 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maxDailyApplications >= 99999 || maxDailyApplications === 0}
                    onChange={(e) => setMaxDailyApplications(e.target.checked ? 99999 : 50)}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Unlimited Applications (Apply without limit)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

