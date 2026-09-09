import React from 'react';
import { 
  Menu, 
  ChevronUp, 
  RefreshCw, 
  Shield, 
  LogOut, 
  Sun, 
  Moon, 
  Package, 
  Box,
  Shirt
} from 'lucide-react';

export interface HeaderMetrics {
  totalOrdenesDia?: number;
  capturadoOrdenesDia?: number;
  restaOrdenesDia?: number;
  pctContenedor?: number;
  ordenesMochilas?: number;
  ordenesApparel?: number;
}

interface HeaderProps {
  currentTitle: string;
  sidebarOpen: boolean;
  headerVisible: boolean;
  onToggleSidebar: () => void;
  onToggleHeader: () => void;
  onRefreshDashboard?: () => void;
  isRefreshing?: boolean;
  lastSyncTime?: string;
  isLiveConnection?: boolean;
  onLogout: () => void;
  authenticatedUser: string;
  darkMode?: boolean;
  onToggleTheme?: () => void;
  metrics?: HeaderMetrics; // <--- MÉTRICAS DINÁMICAS
}

export const Header: React.FC<HeaderProps> = ({
  currentTitle,
  sidebarOpen,
  headerVisible,
  onToggleSidebar,
  onToggleHeader,
  onRefreshDashboard,
  isRefreshing,
  lastSyncTime,
  isLiveConnection,
  onLogout,
  authenticatedUser,
  darkMode = true,
  onToggleTheme,
  metrics = {
    totalOrdenesDia: 172,
    capturadoOrdenesDia: 140, // Actualizado dinámico
    restaOrdenesDia: 32,
    pctContenedor: 64.29,
    ordenesMochilas: 16,
    ordenesApparel: 8,
  }
}) => {
  if (!headerVisible) {
    return (
      <button
        id="restore-header-btn"
        onClick={onToggleHeader}
        className="fixed top-3 right-6 z-50 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#12161f] border border-[#00f2fe]/60 text-[#00f2fe] text-xs font-bold shadow-[0_0_15px_rgba(0,242,254,0.4)] hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer"
      >
        <span>▼ Mostrar Barra</span>
      </button>
    );
  }

  const total = metrics.totalOrdenesDia ?? 172;
  const capturado = metrics.capturadoOrdenesDia ?? 140;
  const resta = metrics.restaOrdenesDia ?? (total - capturado);
  const pct = metrics.pctContenedor ?? 64.29;
  const mochilas = metrics.ordenesMochilas ?? 16;
  const apparel = metrics.ordenesApparel ?? 8;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#12161f] border-b border-[#00f2fe]/20 shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex items-center justify-between px-3 lg:px-5 z-40 transition-transform duration-300 no-print">
      {/* Controles esquinales y Marca */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleSidebar}
          className="flex items-center justify-center p-1.5 px-2 rounded-md border border-[#00f2fe]/40 text-[#00f2fe] hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all shadow-[0_0_8px_rgba(0,242,254,0.25)] text-sm font-bold cursor-pointer"
          title={sidebarOpen ? 'Colapsar menú lateral' : 'Expandir menú lateral'}
        >
          <Menu className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleHeader}
          className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#00f2fe]/40 text-[#00f2fe] hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all shadow-[0_0_8px_rgba(0,242,254,0.25)] text-xs font-bold cursor-pointer"
          title="Ocultar barra superior"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Header</span>
        </button>

        {/* Badge Boombah */}
        <div className="flex items-center gap-2 pl-1">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-[#00f2fe]/20 to-[#ff007f]/20 border border-[#00f2fe]/50 shadow-[0_0_12px_rgba(0,242,254,0.3)]">
            <span className="text-xs font-black italic tracking-tighter text-[#00f2fe]">B</span>
          </div>
          <div className="hidden 2xl:flex flex-col">
            <span className="text-[11px] font-black tracking-widest text-[#00f2fe] uppercase leading-tight">
              BOOMBAH
            </span>
            <span className="text-[8px] font-bold tracking-wider text-[#8f9ba8] uppercase">
              PRODUCTION CONTROL
            </span>
          </div>
        </div>
      </div>

      {/* METRICOS GLOBALES DINÁMICOS */}
      <div className="flex items-center gap-3 bg-[#0d1017] border border-white/10 px-3 py-1 rounded-xl shadow-inner">
        {/* 1. Órdenes del día */}
        <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
          <Package className="w-3.5 h-3.5 text-[#39ff14] shrink-0" />
          <div className="text-[10px] md:text-[11px] font-bold whitespace-nowrap">
            <span className="text-gray-400">Ordenes del día: </span>
            <span className="text-[#39ff14] font-black">{total}</span>
            <span className="text-gray-600 mx-1">/</span>
            <span className="text-gray-400">CAPTURADO: </span>
            <span className="text-[#39ff14] font-black">{capturado}</span>
            <span className="text-gray-600 mx-1">/</span>
            <span className="text-gray-400">RESTA: </span>
            <span className="text-red-400 font-black">{resta}</span>
          </div>
        </div>

        {/* 2. Porcentaje Acumulado Total del Contenedor */}
        <div className="hidden md:flex items-center gap-2 border-r border-white/10 pr-3">
          <div className="space-y-0.5">
            <div className="flex justify-between items-center text-[9px] font-bold gap-2">
              <span className="text-amber-400 uppercase tracking-wide">Acumulado Contenedor</span>
              <span className="text-amber-400 font-black">{pct}%</span>
            </div>
            <div className="w-20 bg-[#12161f] h-1.5 rounded-full overflow-hidden border border-amber-500/30">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(pct, 100)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* 3. Mochilas Abiertas */}
        <div className="hidden lg:flex items-center gap-1.5 border-r border-white/10 pr-3">
          <Box className="w-3.5 h-3.5 text-[#00f2fe] shrink-0" />
          <span className="text-[10px] font-bold uppercase text-gray-400">Mochilas:</span>
          <span className="text-[11px] font-black text-[#00f2fe] bg-[#00f2fe]/10 px-1.5 py-0.5 rounded border border-[#00f2fe]/30">
            {mochilas}
          </span>
        </div>

        {/* 4. Apparel Abiertas */}
        <div className="hidden lg:flex items-center gap-1.5">
          <Shirt className="w-3.5 h-3.5 text-[#ff007f] shrink-0" />
          <span className="text-[10px] font-bold uppercase text-gray-400">Apparel:</span>
          <span className="text-[11px] font-black text-[#ff007f] bg-[#ff007f]/10 px-1.5 py-0.5 rounded border border-[#ff007f]/30">
            {apparel}
          </span>
        </div>
      </div>

      {/* Controles de la Derecha (Sincronización, Usuario y Sesión) */}
      <div className="flex items-center gap-2">
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title={darkMode ? 'Cambiar a Modo Día' : 'Cambiar a Modo Noche'}
          >
            {darkMode ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-sky-400" />
            )}
          </button>
        )}

        {onRefreshDashboard && (
          <button
            onClick={onRefreshDashboard}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#00f2fe]/10 border border-[#00f2fe]/40 text-[#00f2fe] text-xs font-bold hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer disabled:opacity-50"
            title="Sincronizar datos con Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden xl:inline">Sincronizar</span>
          </button>
        )}

        <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0d1017] border border-white/5 text-[10px] text-[#8f9ba8]">
          <span
            className={`w-2 h-2 rounded-full ${
              isLiveConnection
                ? 'bg-[#39ff14] shadow-[0_0_8px_#39ff14]'
                : 'bg-[#ffe600] shadow-[0_0_8px_#ffe600]'
            }`}
          ></span>
          <span>{isLiveConnection ? 'En Vivo' : 'Local Sync'}</span>
        </div>

        <div className="flex items-center gap-1.5 pl-1 border-l border-white/10">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs text-white/90">
            <Shield className="w-3 h-3 text-[#39ff14]" />
            <span className="font-semibold uppercase">{authenticatedUser}</span>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded text-[#ff007f] hover:bg-[#ff007f]/10 border border-[#ff007f]/30 hover:border-[#ff007f] transition-all cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
