import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { TabType, DashboardData, ThemeType } from './types';
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
import { InventoryDashboard } from './components/InventoryDashboard';
import { InventoryDesgloseView } from './components/InventoryDesgloseView';
import { PaseInventarioView } from './views/PaseInventarioView';
import { InventarioKpiUsuariosView } from './views/InventarioKpiUsuariosView';
import ProductionControlToolbar from './components/ProductionControlToolbar';
import { FeaturesTicker } from './components/FeaturesTicker';
import { UpdatesHistoryView } from './components/UpdatesHistoryView';
import { AuthModal } from './components/AuthModal';
import { SHEETS_CONFIG } from './data/sheetsConfig';
import { INITIAL_FALLBACK_DASHBOARD, fetchLiveDashboardData } from './data/dashboardService';

const SUPABASE_URL = 'https://qpozgkxdzcixjkjblntd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb3pna3hkemNpeGpramJsbnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDAzMjEsImV4cCI6MjEwNDAxNjMyMX0.RYHR0XYeG6-YGI8zmird9FF-KP67_CmVsVpv5gYTS5o';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SAVED_NAV_STATE_KEY = 'boombah_active_nav_state_v1';

interface SavedNavState {
  tab: TabType;
  subGid?: string;
  title: string;
}

function getInitialNavState(): SavedNavState {
  try {
    const raw = sessionStorage.getItem(SAVED_NAV_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.tab) {
        return {
          tab: parsed.tab as TabType,
          subGid: parsed.subGid || undefined,
          title: parsed.title || 'DASHBOARD EN VIVO',
        };
      }
    }
  } catch {
    // Ignorar errores de storage
  }
  return {
    tab: 'dashboard-live',
    subGid: undefined,
    title: 'DASHBOARD EN VIVO',
  };
}

// Blindar las barras superiores para que NO se re-rendericen ni parpadeen con el polling de 5s
const MemoizedProductionToolbar = React.memo(ProductionControlToolbar);
const MemoizedFeaturesTicker = React.memo(FeaturesTicker);

export default function App() {
  const [authenticatedUser, setAuthenticatedUser] = useState<string | null>(() => {
    return sessionStorage.getItem('authenticated_user') || localStorage.getItem('authenticated_user') || null;
  });

  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return sessionStorage.getItem('authenticated_email') || localStorage.getItem('authenticated_email') || null;
  });

  const [userPicture, setUserPicture] = useState<string | null>(() => {
    return sessionStorage.getItem('authenticated_picture') || localStorage.getItem('authenticated_picture') || null;
  });

  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const [initialNav] = useState<SavedNavState>(getInitialNavState);
  const [activeTab, setActiveTab] = useState<TabType>(initialNav.tab);
  const [activeSubTabGid, setActiveSubTabGid] = useState<string | undefined>(initialNav.subGid);
  const [currentTabTitle, setCurrentTabTitle] = useState<string>(initialNav.title);
  const [selectedUpdateTitle, setSelectedUpdateTitle] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [headerVisible, setHeaderVisible] = useState<boolean>(true);

  // Persistir continuamente la vista/sheet embebido activo para restaurarlo tras UPDATE • REINICIAR
  useEffect(() => {
    try {
      sessionStorage.setItem(
        SAVED_NAV_STATE_KEY,
        JSON.stringify({
          tab: activeTab,
          subGid: activeSubTabGid,
          title: currentTabTitle,
        })
      );
    } catch {
      // Ignorar
    }
    if (currentTabTitle) {
      document.title = `${currentTabTitle} - Boombah Workspace`;
    }
  }, [activeTab, activeSubTabGid, currentTabTitle]);

  // Selector de Temas / Apariencia
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('boombah_app_theme') as ThemeType) || 'neon-cyber';
  });

  // Selector de Modo Claro / Modo Oscuro
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme_mode') !== 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    localStorage.setItem('boombah_app_theme', currentTheme);
    root.setAttribute('data-theme', currentTheme);

    // Si el usuario elige "Modo Claro Corporativo", cambiar a Modo Claro universal
    if (currentTheme === 'light-corporate') {
      setDarkMode(false);
      localStorage.setItem('theme_mode', 'light');
      root.classList.add('light');
      root.classList.remove('dark');
      body.classList.add('light');
      body.classList.remove('dark');
    } else {
      // Para Neón Cyberpunk, Oscuro Clásico y Azul Táctico, activar Modo Oscuro
      setDarkMode(true);
      localStorage.setItem('theme_mode', 'dark');
      root.classList.add('dark');
      root.classList.remove('light');
      body.classList.add('dark');
      body.classList.remove('light');
    }
  }, [currentTheme]);

  const toggleTheme = () => {
    setDarkMode(prevMode => {
      const nextMode = !prevMode;
      localStorage.setItem('theme_mode', nextMode ? 'dark' : 'light');
      return nextMode;
    });
  };

  // VERIFICACIÓN INICIAL Y TIEMPO REAL DE SUPABASE AUTH (GOOGLE OAUTH)
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // 1. Revisar si hay una sesión activa de Supabase (ej. regreso de Google OAuth)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && isMounted) {
          const email = session.user.email || '';
          const rawName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split('@')[0];
          const name = rawName.toUpperCase();
          const picture = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '';

          sessionStorage.setItem('authenticated_user', name);
          sessionStorage.setItem('authenticated_email', email);
          sessionStorage.setItem('authenticated_picture', picture);
          localStorage.setItem('authenticated_user', name);

          setAuthenticatedUser(name);
          setUserEmail(email);
          setUserPicture(picture);
          setIsAuthChecking(false);
          return;
        }

        // 2. Si ya existía un usuario autenticado en storage local
        const localUser = sessionStorage.getItem('authenticated_user') || localStorage.getItem('authenticated_user');
        if (localUser && isMounted) {
          setAuthenticatedUser(localUser);
        }
      } catch (err) {
        console.error('Error al verificar sesión de autenticación:', err);
      } finally {
        if (isMounted) setIsAuthChecking(false);
      }
    };

    initializeAuth();

    // Escuchar cambios de autenticación (Login / Logout en tiempo real)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        const email = session.user.email || '';
        const rawName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split('@')[0];
        const name = rawName.toUpperCase();
        const picture = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '';

        sessionStorage.setItem('authenticated_user', name);
        sessionStorage.setItem('authenticated_email', email);
        sessionStorage.setItem('authenticated_picture', picture);
        localStorage.setItem('authenticated_user', name);

        setAuthenticatedUser(name);
        setUserEmail(email);
        setUserPicture(picture);
        setIsAuthChecking(false);
      } else if (event === 'SIGNED_OUT') {
        setAuthenticatedUser(null);
        setUserEmail(null);
        setUserPicture(null);
        setIsAuthChecking(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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

  const handleSelectTab = useCallback((tab: TabType, subGid?: string, customTitle?: string) => {
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
  }, []);

  const handleOpenUpdatesHistory = useCallback((selectedTitle?: string) => {
    setSelectedUpdateTitle(selectedTitle || null);
    handleSelectTab('updates-history' as TabType, undefined, 'NOVEDADES E HISTORIAL');
  }, [handleSelectTab]);

  const handleLoginSuccess = (username: string, email?: string, picture?: string) => {
    sessionStorage.setItem('authenticated_user', username);
    localStorage.setItem('authenticated_user', username);
    if (email) {
      sessionStorage.setItem('authenticated_email', email);
      localStorage.setItem('authenticated_email', email);
    }
    if (picture) {
      sessionStorage.setItem('authenticated_picture', picture);
      localStorage.setItem('authenticated_picture', picture);
    }

    setAuthenticatedUser(username);
    if (email) setUserEmail(email);
    if (picture) setUserPicture(picture);

    refreshDashboard();
  };

  const handleLogout = async () => {
    setIsAuthChecking(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Cierre de sesión de Supabase completado o no requerido:', e);
    }

    sessionStorage.removeItem('authenticated_user');
    sessionStorage.removeItem('authenticated_email');
    sessionStorage.removeItem('authenticated_picture');
    sessionStorage.removeItem(SAVED_NAV_STATE_KEY);
    localStorage.removeItem('authenticated_user');
    localStorage.removeItem('authenticated_email');
    localStorage.removeItem('authenticated_picture');

    setTimeout(() => {
      setAuthenticatedUser(null);
      setUserEmail(null);
      setUserPicture(null);
      setIsAuthChecking(false);
    }, 350);
  };

  // PANTALLA DE CARGA SUTIL (EVITA PARPADEO VISUAL)
  if (isAuthChecking) {
    return (
      <div className="fixed inset-0 bg-[#0b0e14] flex flex-col items-center justify-center z-50">
        <div className="relative flex items-center justify-center w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-[#00f2fe]/20 animate-ping" />
          <div className="w-12 h-12 border-4 border-transparent border-t-[#00f2fe] border-r-[#ff007f] rounded-full animate-spin" />
        </div>
        <span className="text-[#00f2fe] font-black text-xs uppercase tracking-widest animate-pulse">
          Validando Sesión Boombah...
        </span>
      </div>
    );
  }

  if (!authenticatedUser) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  const isSheetTab = activeTab in SHEETS_CONFIG;
  const currentSheetConfig = isSheetTab ? SHEETS_CONFIG[activeTab] : null;

  // EXTRAER LAS MÉTRICAS DESDE EL TEXTO EXACTO DEL CONTENEDOR
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

  // Porcentaje del contenedor
  const rawPct = 
    dashboardData?.contenedor?.pctAcumulado ?? 
    dashboardData?.contenedorPctAcumulado ?? 
    (dashboardData as any)?.porcentajeAcumuladoTotal ?? 
    0;

  const pctContenedor = (typeof rawPct === 'number' && rawPct > 0 && rawPct <= 2.5) 
    ? Number((rawPct * 100).toFixed(2)) 
    : Number(rawPct);

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
        currentTheme={currentTheme}
        onSelectTheme={(theme) => setCurrentTheme(theme)}
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
          <MemoizedProductionToolbar />
          <MemoizedFeaturesTicker onOpenHistory={handleOpenUpdatesHistory} />

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

            {/* 7. Módulo Inventario: Nave 6 (Dashboard + Consulta Rápida) */}
            {activeTab === 'inventario-nave-6' && (
              <InventoryDashboard
                onNavigateDesglose={() =>
                  handleSelectTab('inventario-desglose', undefined, 'INVENTARIO - DESGLOSE OPERATIVO')
                }
              />
            )}

            {/* 8. Módulo Inventario: Desglose Operativo Completo */}
            {activeTab === 'inventario-desglose' && (
              <InventoryDesgloseView authenticatedUser={authenticatedUser} />
            )}

            {/* 8.1. Módulo Inventario: Pase de Inventario */}
            {(activeTab as string) === 'inventario-pase' && (
              <PaseInventarioView authenticatedUser={authenticatedUser} />
            )}

            {/* 8.2. Módulo Inventario: KPI por Usuario (Temporada 13 Nov 2026) */}
            {(activeTab as string) === 'inventario-kpi' && (
              <InventarioKpiUsuariosView authenticatedUser={authenticatedUser} />
            )}

            {/* 9. Sheets Embebidos */}
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

            {/* 10. Manual */}
            {activeTab === 'manual' && <ManualView />}

            {/* 11. Configuración */}
            {activeTab === 'configuracion' && (
              <ConfigView authenticatedUser={authenticatedUser} />
            )}

            {/* 12. Historial Permanente de Updates */}
            {(activeTab as string) === 'updates-history' && (
              <UpdatesHistoryView
                authenticatedUser={authenticatedUser}
                initialSelectedTitle={selectedUpdateTitle}
                onNavigateTab={handleSelectTab}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
