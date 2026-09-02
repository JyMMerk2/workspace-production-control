import React from 'react';
import { Menu, ChevronUp, RefreshCw, Shield, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';

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

  return (
    <header className="fixed top-0 left-0 right-0 h-15 bg-[#12161f] border-b border-[#00f2fe]/20 shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex items-center justify-between px-4 lg:px-6 z-40 transition-transform duration-300">
      {/* Left controls and branding */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex items-center justify-center p-1.5 px-2.5 rounded-md border border-[#00f2fe]/40 text-[#00f2fe] hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all shadow-[0_0_8px_rgba(0,242,254,0.25)] text-sm font-bold cursor-pointer"
          title={sidebarOpen ? "Colapsar menú lateral" : "Expandir menú lateral"}
        >
          <Menu className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleHeader}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#00f2fe]/40 text-[#00f2fe] hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all shadow-[0_0_8px_rgba(0,242,254,0.25)] text-xs font-bold cursor-pointer"
          title="Ocultar barra superior"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Header</span>
        </button>

        {/* Boombah Sports Tech Logo Badge */}
        <div className="flex items-center gap-2 pl-2">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#00f2fe]/20 to-[#ff007f]/20 border border-[#00f2fe]/50 shadow-[0_0_12px_rgba(0,242,254,0.3)]">
            <span className="text-sm font-black italic tracking-tighter text-[#00f2fe]">B</span>
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-xs font-black tracking-widest text-[#00f2fe] uppercase leading-tight">BOOMBAH</span>
            <span className="text-[9px] font-bold tracking-wider text-[#8f9ba8] uppercase">PRODUCTION CONTROL</span>
          </div>
        </div>
      </div>

      {/* Center dynamic glowing title */}
      <div className="absolute left-1/2 -translate-x-1/2 max-w-[45%] text-center pointer-events-none">
        <h1 className="text-xs md:text-sm lg:text-base font-extrabold uppercase tracking-wider text-[#00f2fe] text-shadow-[0_0_12px_rgba(0,242,254,0.6)] truncate">
          {currentTitle}
        </h1>
      </div>

      {/* Right User and sync status */}
      <div className="flex items-center gap-3">
        {onRefreshDashboard && (
          <button
            onClick={onRefreshDashboard}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#00f2fe]/10 border border-[#00f2fe]/40 text-[#00f2fe] text-xs font-bold hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer disabled:opacity-50"
            title="Sincronizar datos con Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>
        )}

        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0d1017] border border-white/5 text-[11px] text-[#8f9ba8]">
          <span className={`w-2 h-2 rounded-full ${isLiveConnection ? 'bg-[#39ff14] shadow-[0_0_8px_#39ff14]' : 'bg-[#ffe600] shadow-[0_0_8px_#ffe600]'}`}></span>
          <span>{isLiveConnection ? 'En Vivo' : 'Local Sync'}</span>
          {lastSyncTime && <span className="text-white/40">({lastSyncTime})</span>}
        </div>

        <div className="flex items-center gap-2 pl-1 border-l border-white/10">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs text-white/90">
            <Shield className="w-3 h-3 text-[#39ff14]" />
            <span className="font-semibold">{authenticatedUser}</span>
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
