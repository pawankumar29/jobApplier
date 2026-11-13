import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { SSEProvider } from './context/SSEContext.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { DashboardOverview } from './pages/DashboardOverview.js';
import { LiveJobFeed } from './pages/LiveJobFeed.js';
import { ApplicationTracker } from './pages/ApplicationTracker.js';
import { IntegrationsManager } from './pages/IntegrationsManager.js';
import { ResumeManager } from './pages/ResumeManager.js';
import { AutomationConsole } from './pages/AutomationConsole.js';
import { PreferencesSettings } from './pages/PreferencesSettings.js';
import { AuthPage } from './pages/AuthPage.js';

export const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('overview');

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-500">
        Loading AutoJob AI...
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return <DashboardOverview onNavigate={setCurrentTab} />;
      case 'jobs':
        return <LiveJobFeed />;
      case 'tracker':
        return <ApplicationTracker />;
      case 'integrations':
        return <IntegrationsManager />;
      case 'resumes':
        return <ResumeManager />;
      case 'automation':
        return <AutomationConsole />;
      case 'settings':
        return <PreferencesSettings />;
      default:
        return <DashboardOverview onNavigate={setCurrentTab} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SSEProvider>
        <MainApp />
      </SSEProvider>
    </AuthProvider>
  );
};

export default App;
