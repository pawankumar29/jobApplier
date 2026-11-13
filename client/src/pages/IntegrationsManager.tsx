import React, { useState } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Key,
  RefreshCw,
  Trash2,
  Info,
  Database,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiClient } from '../api/client.js';

export const IntegrationsManager: React.FC = () => {
  const { integrations, refreshUser } = useAuth();
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [authType, setAuthType] = useState<'CREDENTIALS' | 'SESSION_TOKEN'>('CREDENTIALS');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const getIntegration = (platform: string) => {
    return integrations.find((i) => i.platform === platform);
  };

  const handleTestConnection = async (platform: string, customCreds?: any) => {
    setTestingPlatform(platform);
    setMessage(null);
    try {
      const res = await apiClient.post(
        `/integrations/${platform}/test`,
        customCreds ? { credentials: customCreds } : {}
      );
      if (res.data.valid) {
        setMessage({
          text: `✓ ${platform} connection verified! ${res.data.message || 'Credentials are active and ready.'}`,
          type: 'success',
        });
        await refreshUser();
      } else {
        setMessage({
          text: `✗ ${platform} verification failed: ${res.data.message || 'Could not authenticate.'}`,
          type: 'error',
        });
      }
    } catch (e: any) {
      setMessage({
        text: e.response?.data?.error || e.response?.data?.message || `Error testing ${platform} connection`,
        type: 'error',
      });
    } finally {
      setTestingPlatform(null);
    }
  };

  const handleConnect = async (platform: string) => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const credentialsPayload =
        authType === 'CREDENTIALS'
          ? { username, password, authType }
          : { sessionCookie: sessionToken, authType };

      const res = await apiClient.post('/integrations/connect', {
        platform,
        authType,
        credentials: credentialsPayload,
        metadata: {
          accountUser: username || 'Session User',
          connectedAt: new Date().toISOString(),
        },
      });

      if (res.data.success) {
        setMessage({ text: `${platform} credentials successfully encrypted and saved!`, type: 'success' });
        setConnectingPlatform(null);
        setUsername('');
        setPassword('');
        setSessionToken('');
        await refreshUser();
      } else {
        setMessage({ text: res.data.error || 'Failed to connect', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.response?.data?.error || 'Integration connection error', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      await apiClient.post(`/integrations/${platform}/disconnect`);
      await refreshUser();
      setMessage({ text: `${platform} credentials disconnected.`, type: 'success' });
    } catch (e) {
      console.error(e);
    }
  };

  const linkedIn = getIntegration('LINKEDIN');
  const naukri = getIntegration('NAUKRI');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Platform Credentials & Integrations</h2>
          <p className="text-xs text-slate-400">
            Enter your real LinkedIn and Naukri credentials here. Stored locally with AES-256-GCM encryption.
          </p>
        </div>

        {/* Database Info Pill */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 self-start md:self-auto">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Local DB: <strong>server/dev.db</strong> (SQLite Prisma)</span>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LinkedIn Integration */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0077b5]/20 border border-[#0077b5]/40 flex items-center justify-center font-black text-[#0077b5] text-lg">
                  in
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">LinkedIn Account</h3>
                  <p className="text-xs text-slate-400">Auto-Apply to Easy Apply roles</p>
                </div>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  linkedIn?.status === 'CONNECTED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {linkedIn?.status || 'NOT CONNECTED'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Discovers freshly posted opportunities and submits applications automatically via LinkedIn Easy Apply.
            </p>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5 mt-4">
              <div className="flex justify-between">
                <span>Auth Method:</span>
                <span className="text-slate-200 font-medium">{linkedIn?.authType || 'Email & Password / Session Cookie'}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Sync:</span>
                <span className="text-slate-200 font-medium">
                  {linkedIn?.lastSyncAt ? new Date(linkedIn.lastSyncAt).toLocaleTimeString() : 'Ready'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Security:</span>
                <span className="text-emerald-400 font-medium flex items-center">
                  <Lock className="w-3 h-3 mr-1" /> AES-256-GCM Encrypted
                </span>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => handleTestConnection('LINKEDIN')}
              disabled={testingPlatform === 'LINKEDIN'}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center space-x-1.5 transition disabled:opacity-50"
              title="Test connection with current saved credentials"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingPlatform === 'LINKEDIN' ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{testingPlatform === 'LINKEDIN' ? 'Testing...' : 'Test Connection'}</span>
            </button>
            <button
              onClick={() => {
                setConnectingPlatform('LINKEDIN');
                setAuthType('CREDENTIALS');
              }}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              {linkedIn?.status === 'CONNECTED' ? 'Change / Update LinkedIn Creds' : 'Enter LinkedIn Credentials'}
            </button>
            {linkedIn?.status === 'CONNECTED' && (
              <button
                onClick={() => handleDisconnect('LINKEDIN')}
                className="px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Naukri Integration */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#4a90e2]/20 border border-[#4a90e2]/40 flex items-center justify-center font-black text-[#4a90e2] text-lg">
                  N
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Naukri.com Account</h3>
                  <p className="text-xs text-slate-400">1-Click Apply & FastForward</p>
                </div>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  naukri?.status === 'CONNECTED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {naukri?.status || 'NOT CONNECTED'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Scans Indian tech jobs and submits applications using candidate profile data.
            </p>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5 mt-4">
              <div className="flex justify-between">
                <span>Auth Method:</span>
                <span className="text-slate-200 font-medium">{naukri?.authType || 'Email & Password / Token'}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Sync:</span>
                <span className="text-slate-200 font-medium">
                  {naukri?.lastSyncAt ? new Date(naukri.lastSyncAt).toLocaleTimeString() : 'Ready'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Security:</span>
                <span className="text-emerald-400 font-medium flex items-center">
                  <Lock className="w-3 h-3 mr-1" /> AES-256-GCM Encrypted
                </span>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => handleTestConnection('NAUKRI')}
              disabled={testingPlatform === 'NAUKRI'}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center space-x-1.5 transition disabled:opacity-50"
              title="Test connection with current saved credentials"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingPlatform === 'NAUKRI' ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{testingPlatform === 'NAUKRI' ? 'Testing...' : 'Test Connection'}</span>
            </button>
            <button
              onClick={() => {
                setConnectingPlatform('NAUKRI');
                setAuthType('CREDENTIALS');
              }}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              {naukri?.status === 'CONNECTED' ? 'Change / Update Naukri Creds' : 'Enter Naukri Credentials'}
            </button>
            {naukri?.status === 'CONNECTED' && (
              <button
                onClick={() => handleDisconnect('NAUKRI')}
                className="px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Database Location & Studio Guidance */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/40 flex items-start space-x-3">
        <Database className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
          <p className="font-bold text-white">Database Information (Where is everything saved?)</p>
          <p className="text-slate-400">
            Yeh project <strong>SQLite (Prisma ORM)</strong> use karta hai jo <code>server/dev.db</code> file me store hota hai.
            Aap terminal me <code>npx prisma studio</code> run karke pura database visual table format me browser me dekh sakte hain (`http://localhost:5555`).
          </p>
        </div>
      </div>

      {/* Connection Modal */}
      {connectingPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden p-6 border border-slate-700 shadow-2xl">
            <div className="flex items-center space-x-2 mb-1">
              <Key className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Enter {connectingPlatform} Credentials</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Credentials are encrypted with AES-256-GCM before saving to database.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Select Login Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthType('CREDENTIALS')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition ${
                      authType === 'CREDENTIALS'
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Email & Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthType('SESSION_TOKEN')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition ${
                      authType === 'SESSION_TOKEN'
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Session Cookie / Token
                  </button>
                </div>
              </div>

              {authType === 'CREDENTIALS' ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      {connectingPlatform} Registered Email / Username
                    </label>
                    <input
                      type="text"
                      placeholder="name@example.com"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      {connectingPlatform} Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {connectingPlatform === 'LINKEDIN' ? 'LinkedIn `li_at` Cookie String' : 'Naukri Session Token'}
                  </label>
                  <input
                    type="password"
                    placeholder="Paste cookie string or session token..."
                    value={sessionToken}
                    onChange={(e) => setSessionToken(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Tip for LinkedIn: Inspect element (F12) → Application → Cookies → copy <code>li_at</code>.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() =>
                  handleTestConnection(
                    connectingPlatform,
                    authType === 'CREDENTIALS'
                      ? { username, password, authType }
                      : { sessionCookie: sessionToken, authType }
                  )
                }
                disabled={
                  testingPlatform === connectingPlatform ||
                  (authType === 'CREDENTIALS' ? !username || !password : !sessionToken)
                }
                className="px-3.5 py-2 text-xs font-bold text-indigo-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition disabled:opacity-50 flex items-center space-x-1.5"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    testingPlatform === connectingPlatform ? 'animate-spin text-indigo-400' : ''
                  }`}
                />
                <span>{testingPlatform === connectingPlatform ? 'Testing...' : 'Test Connection'}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setConnectingPlatform(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConnect(connectingPlatform)}
                  disabled={isSubmitting || (authType === 'CREDENTIALS' ? !username || !password : !sessionToken)}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl shadow transition"
                >
                  {isSubmitting ? 'Encrypting & Saving...' : 'Save & Encrypt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
