import React, { useState, useEffect, useCallback } from 'react';
import { TabType, DashboardData } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { PlanosView } from './components/PlanosView';
import { SizingCalculatorView } from './components/SizingCalculatorView';
import { SheetsView } from './components/SheetsView';
import { ManualView } from './components/ManualView';
import { ConfigView } from './components/ConfigView';
import { AuthModal } from './components/AuthModal';
import { SHEETS_CONFIG } from './data/sheetsConfig';
import { INITIAL_FALLBACK_DASHBOARD, fetchLiveDashboardData } from './data/dashboardService';

export default function App() {
  const [authenticatedUser, setAuthenticatedUser] = useState<string | null>(() => {
    return sessionStorage.getItem('authenticated_user') || null;
  });

  const [activeTab, setActiveTab] = useState<TabType>('dashboard-live');
  const [activeSubTabGid, setActiveSubTabGid] = useState<string | undefined>(undefined);
  const [currentTabTitle, setCurrentTabTitle] = useState<string>('DASHBOARD EN VIVO');

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [headerVisible, setHeaderVisible] = useState<boolean>(true);

  const [dashboardData, setDashboardData] = useState<DashboardData>(INITIAL_FALLBACK_DASHBOARD);
  const [isLiveConnection, setIsLiveConnection] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Synchronize dashboard
  const refreshDashboard = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data, isLive } = await fetchLiveDashboardData();
      setDashboardData(data);
      setIsLiveConnection(isLive);
    } catch (err) {
      console.warn('Dashboard sync fallback used:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load and periodic refresh
  useEffect(() => {
    if (authenticatedUser) {
      refreshDashboard();
      const interval = setInterval(refreshDashboard, 30000);
      return () => clearInterval(interval);
    }
  }, [authenticatedUser, refreshDashboard]);

  const handleSelectTab = (tab: TabType, subGid?: string, customTitle?: string) => {
    setActiveTab(tab);
    setActiveSubTabGid(subGid);

    if (customTitle) {
      setCurrentTabTitle(customTitle);
      document.title = `${customTitle} - Boombah Workspace`;
    } else {
      const sheet = SHEETS_CONFIG[tab];
      const title = sheet ? sheet.title : tab.toUpperCase();
      setCurrentTabTitle(title);
      document.title = `${title} - Boombah Workspace`;
    }

    // On mobile screens, automatically collapse sidebar
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleLoginSuccess = (username: string) => {
    sessionStorage.setItem('authenticated_user', username);
    setAuthenticatedUser(username);
    refreshDashboard();
  };

  const handleLogout = () => {
    sessionStorage.removeItem('authenticated_user');
    setAuthenticatedUser(null);
  };

  // If not logged in, render authentication modal
  if (!authenticatedUser) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  const isSheetTab = activeTab in SHEETS_CONFIG;
  const currentSheetConfig = isSheetTab ? SHEETS_CONFIG[activeTab] : null;

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#e1e6ed] flex flex-col font-sans antialiased overflow-x-hidden">
      {/* Top Fixed Header */}
      <Header
        currentTitle={currentTabTitle}
        sidebarOpen={sidebarOpen}
        headerVisible={headerVisible}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onToggleHeader={() => setHeaderVisible(!headerVisible)}
        onRefreshDashboard={activeTab === 'dashboard-live' ? refreshDashboard : undefined}
        isRefreshing={isRefreshing}
        lastSyncTime={dashboardData.lastUpdated}
        isLiveConnection={isLiveConnection}
        onLogout={handleLogout}
        authenticatedUser={authenticatedUser}
      />

      {/* Main Workspace Container */}
      <div className={`flex flex-1 ${headerVisible ? 'mt-15' : 'mt-0'} transition-all duration-300`}>
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          activeSubTabGid={activeSubTabGid}
          isOpen={sidebarOpen}
          headerVisible={headerVisible}
          onSelectTab={handleSelectTab}
          onLogout={handleLogout}
        />

        {/* Content View Area */}
        <main
          className={`flex-1 p-4 md:p-6 transition-all duration-300 ${
            sidebarOpen ? 'lg:ml-65 w-full lg:w-[calc(100%-16.25rem)]' : 'ml-0 w-full'
          }`}
        >
          {/* TAB 1: Live Neón Dashboard */}
          {activeTab === 'dashboard-live' && (
            <DashboardView
              data={dashboardData}
              isLive={isLiveConnection}
              isRefreshing={isRefreshing}
              onRefresh={refreshDashboard}
            />
          )}

          {/* TAB 2: Planos & Technical Blueprints Explorer */}
          {activeTab === 'planos' && <PlanosView />}

          {/* TAB 3: Sizing Packs Multi-Style Calculator with OCR */}
          {activeTab === 'sizing-calculator' && <SizingCalculatorView />}

          {/* TAB 4: Embedded Google Sheets Tabs */}
          {isSheetTab && currentSheetConfig && (
            <SheetsView
              config={currentSheetConfig}
              activeGid={activeSubTabGid}
              onSelectSubTab={(gid, name) => {
                setActiveSubTabGid(gid);
                setCurrentTabTitle(`${currentSheetConfig.title} - ${name}`);
              }}
            />
          )}

          {/* TAB 5: Production Control Manual */}
          {activeTab === 'manual' && <ManualView />}

          {/* TAB 6: Settings & Configuration */}
          {activeTab === 'configuracion' && <ConfigView authenticatedUser={authenticatedUser} />}
        </main>
      </div>
    </div>
  );
}
