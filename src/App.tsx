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
import { TestWipNativoView } from './components/TestWipNativoView';
import WipStocksVendidasView from './components/WipStocksVendidasView';
import ProductionControlToolbar from './components/ProductionControlToolbar';
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

  // Modo Día / Modo Noche
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme_mode') !== 'light';
  });

  const toggleTheme = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    localStorage.setItem('theme_mode', nextMode ? 'dark' : 'light');
  };

  // 1. Inicializar con datos guardados en caché si existen
  const [dashboardData, setDashboardData] = useState<DashboardData>(() => {
    const cached = localStorage.getItem('boombah_dashboard_cached_data');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Error parseando cache:', e);
      }
    }
    return INITIAL_FALLBACK_DASHBOARD;
  });

  const [isLiveConnection, setIsLiveConnection] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Sincronizar dashboard con protección anti-reseteo
  const refreshDashboard = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data, isLive } = await fetchLiveDashboardData();

      if (
        data &&
        data.kpiApparel &&
        data.kpiApparel.captura !== undefined &&
        data.kpiApparel.captura > 0
      ) {
        setDashboardData(data);
        setIsLiveConnection(isLive);
        localStorage.setItem('boombah_dashboard_cached_data', JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Dashboard sync fallback mantenido:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Carga inicial e intervalo
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

  if (!authenticatedUser) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  const isSheetTab = activeTab in SHEETS_CONFIG;
  const currentSheetConfig = isSheetTab ? SHEETS_CONFIG[activeTab] : null;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#0b0e14] text-[#e1e6ed]' : 'bg-slate-100 text-slate-900'} flex flex-col font-sans antialiased overflow-x-hidden transition-colors duration-200`}>
      {/* Encabezado Principal */}
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
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
      />

      {/* Contenedor Principal */}
      <div className={`flex flex-1 ${headerVisible ? 'mt-15' : 'mt-0'} transition-all duration-300`}>
        {/* Menú Lateral (Sidebar) */}
        <Sidebar
          activeTab={activeTab}
          activeSubTabGid={activeSubTabGid}
          isOpen={sidebarOpen}
          headerVisible={headerVisible}
          onSelectTab={handleSelectTab}
          onLogout={handleLogout}
        />

        {/* Área de Contenido */}
        <main
          className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? 'lg:ml-65 w-full lg:w-[calc(100%-16.25rem)]' : 'ml-0 w-full'
          }`}
        >
          {/* Barra de Control de Producción */}
          <ProductionControlToolbar />

          <div className="p-4 md:p-6">
            {/* TAB 1: Live Neón Dashboard */}
            {activeTab === 'dashboard-live' && (
              <DashboardView
                data={dashboardData}
                isLive={isLiveConnection}
                isRefreshing={isRefreshing}
                onRefresh={refreshDashboard}
              />
            )}

            {/* TAB: WIP Stocks & Vendidas (Vista Nativa) */}
            {(activeTab as string) === 'wip-stocks-vendidas' && <WipStocksVendidasView />}

            {/* TAB 2: Planos & Technical Blueprints Explorer */}
            {activeTab === 'planos' && <PlanosView />}

            {/* TAB 3: Sizing Packs Multi-Style Calculator */}
            {activeTab === 'sizing-calculator' && <SizingCalculatorView />}

            {/* TAB DEMO: Test WIP Nativo */}
            {(activeTab as string) === 'wip-demo' && <TestWipNativoView />}

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
          </div>
        </main>
      </div>
    </div>
  );
}
