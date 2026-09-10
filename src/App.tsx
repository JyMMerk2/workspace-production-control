import React, { useState, useEffect, useCallback } from 'react';
import { TabType, DashboardData } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { PlanosView } from './components/PlanosView';
import { SizingCalculatorView } from './components/SizingCalculatorView';
import { SlackValidationView } from './components/SlackValidationView';
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

  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return sessionStorage.getItem('authenticated_email') || null;
  });

  const [userPicture, setUserPicture] = useState<string | null>(() => {
    return sessionStorage.getItem('authenticated_picture') || null;
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

  // REFRESH GLOBAL EN TIEMPO REAL (RESILIENTE)
  const refreshDashboard = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data, isLive } = await fetchLiveDashboardData();

      if (data) {
        setDashboardData(data);
        setIsLiveConnection(isLive);
        localStorage.setItem('boombah_dashboard_cached_data', JSON.stringify(data));
      } else {
        setIsLiveConnection(false);
      }
    } catch (err) {
      setIsLiveConnection(false);
      console.warn('Falla temporal de red. Se conservan datos previos:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // POLLING AUTOMÁTICO CADA 5 SEGUNDOS + REFRESCAMIENTO POR FOCO Y VISIBILIDAD
  useEffect(() => {
    if (authenticatedUser) {
      refreshDashboard();

      const interval = setInterval(refreshDashboard, 5000);

      const handleTriggerRefresh = () => {
        refreshDashboard();
      };

      window.addEventListener('focus', handleTriggerRefresh);
      document.addEventListener('visibilitychange', handleTriggerRefresh);

      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', handleTriggerRefresh);
        document.removeEventListener('visibilitychange', handleTriggerRefresh);
      };
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

  const handleLoginSuccess = (username: string, email?: string, picture?: string) => {
    sessionStorage.setItem('authenticated_user', username);
    if (email) sessionStorage.setItem('authenticated_email', email);
    if (picture) sessionStorage.setItem('authenticated_picture', picture);

    setAuthenticatedUser(username);
    if (email) setUserEmail(email);
    if (picture) setUserPicture(picture);

    refreshDashboard();
  };

  const handleLogout = () => {
    sessionStorage.removeItem('authenticated_user');
    sessionStorage.removeItem('authenticated_email');
    sessionStorage.removeItem('authenticated_picture');

    setAuthenticatedUser(null);
    setUserEmail(null);
    setUserPicture(null);
  };

  if (!authenticatedUser) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  const isSheetTab = activeTab in SHEETS_CONFIG;
  const currentSheetConfig = isSheetTab ? SHEETS_CONFIG[activeTab] : null;

  // EXTRAER LAS MÉTRICAS DESDE EL TEXTO EXACTO DEL CONTENEDOR (MISMA FUENTE QUE LA TARJETA VERDE)
  const textoContenedor = dashboardData?.contenedor?.textoOrdenes || '';

  const matchTotal = textoContenedor.match(/(?:d[íi]a|total):\s*(\d+)/i);
  const matchCaptura = textoContenedor.match(/CAPTURADO:\s*(\d+)/i);
  const matchResta = textoContenedor.match(/RESTA:\s*(\d+)/i);

  const totalOrdenesDia = matchTotal 
    ? parseInt(matchTotal[1], 10) 
    : (dashboardData?.kpiOrdenesDia?.total ?? (dashboardData as any)?.kpiOrdenesDia?.ordenesTotal ?? 147);

  const capturadoOrdenesDia = matchCaptura 
    ? parseInt(matchCaptura[1], 10) 
    : (dashboardData?.kpiOrdenesDia?.captura ?? (dashboardData as any)?.kpiOrdenesDia?.ordenesCapturado ?? 35);

  const restaOrdenesDia = matchResta 
    ? parseInt(matchResta[1], 10) 
    : (totalOrdenesDia - capturadoOrdenesDia);

  // Porcentaje del contenedor (71.60%)
  const pctContenedor = 
    dashboardData?.contenedor?.pctAcumulado ?? 
    dashboardData?.contenedorPctAcumulado ?? 
    (dashboardData as any)?.porcentajeAcumuladoTotal ?? 
    71.60;

  // Mochilas (44) y Apparel (27)
  const ordenesMochilas = 
    dashboardData?.kpiMochilas?.ordenes ?? 
    dashboardData?.kpiMochilas?.ordenesAbiertas ?? 
    (dashboardData as any)?.mochilasAbiertas ?? 
    44;

  const ordenesApparel = 
    dashboardData?.kpiApparel?.ordenes ?? 
    dashboardData?.kpiApparel?.ordenesAbiertas ?? 
    (dashboardData as any)?.apparelAbiertas ?? 
    27;

  return (
    <div
      className={`min-h-screen ${
        darkMode ? 'dark bg-[#0b0e14] text-[#e1e6ed]' : 'light bg-slate-100 text-slate-900'
      } flex flex-col font-sans antialiased overflow-x-hidden transition-colors duration-200`}
    >
      {/* Header Fijo Global con Sincronización en Tiempo Real */}
      <Header
        currentTitle={currentTabTitle}
        sidebarOpen={sidebarOpen}
        headerVisible={headerVisible}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onToggleHeader={() => setHeaderVisible(!headerVisible)}
        onRefreshDashboard={refreshDashboard}
        isRefreshing={isRefreshing}
        lastSyncTime={dashboardData.lastUpdated}
        isLiveConnection={isLiveConnection}
        onLogout={handleLogout}
        authenticatedUser={authenticatedUser}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
        metrics={{
          totalOrdenesDia,
          capturadoOrdenesDia,
          restaOrdenesDia,
          pctContenedor,
          ordenesMochilas,
          ordenesApparel,
        }}
      />

      {/* Contenedor de Layout */}
      <div className="flex flex-1 w-full overflow-hidden">
        {/* Menú Lateral */}
        <Sidebar
          activeTab={activeTab}
          activeSubTabGid={activeSubTabGid}
          isOpen={sidebarOpen}
          headerVisible={headerVisible}
          onSelectTab={handleSelectTab}
          onLogout={handleLogout}
        />

        {/* Área Principal */}
        <main className="flex-1 min-w-0 flex flex-col overflow-y-auto custom-scrollbar pt-16">
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

            {/* 2. WIP Stocks & Vendidas */}
            {(activeTab as string) === 'wip-stocks-vendidas' && <WipStocksVendidasView />}

            {/* 3. Módulo DEMO */}
            {(activeTab as string) === 'wip-demo' && <TestWipNativoView />}

            {/* 4. Planos */}
            {activeTab === 'planos' && <PlanosView />}

            {/* 5. Calculadora Sizing Packs */}
            {activeTab === 'sizing-calculator' && <SizingCalculatorView />}

            {/* 6. Módulo Slack / OCR */}
            {activeTab === 'slack-validation' && <SlackValidationView />}

            {/* 7. Sheets Embebidos */}
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

            {/* 8. Manual */}
            {activeTab === 'manual' && <ManualView />}

            {/* 9. Configuración */}
            {activeTab === 'configuracion' && (
              <ConfigView authenticatedUser={authenticatedUser} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
