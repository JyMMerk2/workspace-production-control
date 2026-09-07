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
import { WipStocksVendidasView } from './components/WipStocksVendidasView';
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

  // Selector de Modo Claro / Modo Oscuro
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme_mode') !== 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    localStorage.setItem('theme_mode', darkMode ? 'dark' : 'light');

    if (darkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
      body.classList.add('dark');
      body.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      body.classList.add('light');
      body.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(prevMode => !prevMode);
  };

  const [dashboardData, setDashboardData] = useState<DashboardData>(() => {
    const cached = localStorage.getItem('boombah_dashboard_cached_data');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Error al leer caché del dashboard:', e);
      }
    }
    return INITIAL_FALLBACK_DASHBOARD;
  });

  const [isLiveConnection, setIsLiveConnection] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

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
      console.warn('Falla temporal de red. Se conservan datos previos:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

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
      const title = sheet ? sheet.title : String(tab).toUpperCase();
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
    <div
      className={`min-h-screen ${
        darkMode ? 'dark bg-[#0b0e14] text-[#e1e6ed]' : 'light bg-slate-100 text-slate-900'
      } flex flex-col font-sans antialiased overflow-x-hidden transition-colors duration-200`}
    >
      {/* Encabezado Superior */}
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

      {/* Contenedor de Layout Ajustable */}
      <div className="flex flex-1 w-full overflow-hidden">
        {/* Menú Navegador Lateral */}
        <Sidebar
          activeTab={activeTab}
          activeSubTabGid={activeSubTabGid}
          isOpen={sidebarOpen}
          headerVisible={headerVisible}
          onSelectTab={handleSelectTab}
          onLogout={handleLogout}
        />

        {/* Área Principal de Trabajo */}
        <main className="flex-1 min-w-0 flex flex-col overflow-y-auto custom-scrollbar">
          {/* Barra Flotante Global de Control de Producción */}
          <ProductionControlToolbar />

          <div className="p-3 md:p-5 w-full max-w-[1920px] mx-auto">
            {/* 1. Dashboard en Vivo */}
            {activeTab === 'dashboard-live' && (
              <DashboardView
                data={dashboardData}
                isLive={isLiveConnection}
                isRefreshing={isRefreshing}
                onRefresh={refreshDashboard}
              />
            )}

            {/* 2. Módulo Completo Nativo: WIP Stocks & Vendidas */}
            {(activeTab as string) === 'wip-stocks-vendidas' && <WipStocksVendidasView />}

            {/* 3. Módulo DEMO Existente */}
            {(activeTab as string) === 'wip-demo' && <TestWipNativoView />}

            {/* 4. Buscador de Planos */}
            {activeTab === 'planos' && <PlanosView />}

            {/* 5. Calculadora de Sizing Packs */}
            {activeTab === 'sizing-calculator' && <SizingCalculatorView />}

            {/* 6. Hojas Google Sheets Embebidas */}
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

            {/* 7. Manual de Operaciones */}
            {activeTab === 'manual' && <ManualView />}

            {/* 8. Configuración del Sistema */}
            {activeTab === 'configuracion' && (
              <ConfigView authenticatedUser={authenticatedUser} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
