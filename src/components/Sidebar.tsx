import React, { useState, useEffect } from 'react';
import {
  Zap,
  Layers,
  Calculator,
  FileSpreadsheet,
  BookOpen,
  Settings,
  LogOut,
  ChevronDown,
  Box,
  Truck,
  Shirt,
  RotateCcw,
  CheckSquare,
  Users,
  HardHat,
  Database,
} from 'lucide-react';
import { TabType } from '../types';
import { SHEETS_CONFIG } from '../data/sheetsConfig';

interface SidebarProps {
  activeTab: TabType;
  activeSubTabGid?: string;
  isOpen: boolean;
  headerVisible: boolean;
  onSelectTab: (tab: TabType, subGid?: string, customTitle?: string) => void;
  onLogout: () => void;
}

// Enlaces Apps Script originales para leer sub-pestañas dinámicas de Google Sheets
const APPS_SCRIPT_URLS: Record<string, string> = {
  'cuadre-fd': 'https://script.google.com/macros/s/AKfycbwv25duzkoZzhFv1jFXm3IvWxvCCHp2Rien6ELGGh-phzWDXVOJon37SRQ2itdGPGLnew/exec',
  'cuadre-mochilas': 'https://script.google.com/macros/s/AKfycbxEat8pLxn28Jlkq9gHIbw4ilGtXk51St54JuxThXOtA7ZmQ2501rsaQ0LO3vFyWsmI/exec',
  'wip-stocks': 'https://script.google.com/macros/s/AKfycbyTvDcxeOGU4u6gcJPnlEP-sCm-cjRbIZ-FyUS7xC9oIdDtoGrEzx5F9_e_-dxQs1MGXQ/exec',
  'wip-ts': 'https://script.google.com/macros/s/AKfycbxwnmm58b3Cor5Rbblrm7DTwJQU6yD63_veNDlsAjEWiHz5L8X-RHvns6nVgbSmJLsK/exec',
  'helmets-wip': 'https://script.google.com/macros/s/AKfycbzsJjzvY4MuEWjPPp45Y3FWxrcILoIUUSiqQxtZQriw2QPkHeNgzYI7MPgBOraif6CBnA/exec',
  'newsoft-orders': 'https://script.google.com/macros/s/AKfycbx9y-Vethcrst1A0z6yLL_eFOGxwjF-OCyg6mxDG-wV7yVCkXFI3H-i32aqMW4ssX6CJw/exec',
  'ups-shipping': 'https://script.google.com/macros/s/AKfycbyI7IThvJ7U2S41mX2oF-R4O9N_W82Z1iXJ33P9x6_4D9A83c0fG931XG5V9G1f0R4L/exec',
  'reemplazos': 'https://script.google.com/macros/s/AKfycbz_E2R13M1v8G40C1Lg3W298D40H0X_Z17G2Y08V2c4G925L5V4C1f85521H3X25V8G/exec',
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  activeSubTabGid,
  isOpen,
  headerVisible,
  onSelectTab,
  onLogout,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'wip': activeTab === 'wip',
  });

  const [dynamicSubTabs, setDynamicSubTabs] = useState<Record<string, { nombre: string; gid: string }[]>>({});

  // Carga las sub-pestañas reales desde Google Sheets mediante Apps Script
  useEffect(() => {
    Object.entries(APPS_SCRIPT_URLS).forEach(([tabKey, url]) => {
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setDynamicSubTabs((prev) => ({
              ...prev,
              [tabKey]: data,
            }));
          }
        })
        .catch(() => {});
    });
  }, []);

  const toggleGroup = (groupId: string, defaultTab: TabType, defaultTitle: string) => {
    const isCurrentlyOpen = !!openGroups[groupId];
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !isCurrentlyOpen,
    }));

    if (!isCurrentlyOpen) {
      const config = SHEETS_CONFIG[groupId];
      const defaultGid = config ? config.defaultGid : undefined;
      onSelectTab(defaultTab, defaultGid, defaultTitle);
    }
  };

  const renderSubMenuButtons = (tabKey: TabType, mainTitle: string) => {
    const dynamicList = dynamicSubTabs[tabKey];
    const staticConfig = SHEETS_CONFIG[tabKey];
    const tabsToRender = dynamicList && dynamicList.length > 0 ? dynamicList : staticConfig?.subTabs || [];

    return tabsToRender.map((sub) => (
      <button
        key={sub.gid}
        onClick={() => onSelectTab(tabKey, sub.gid, `${mainTitle} - ${sub.nombre}`)}
        className={`px-6 py-2 text-[11px] font-semibold text-left transition-all truncate cursor-pointer ${
          activeTab === tabKey && activeSubTabGid === sub.gid
            ? 'text-[#00f2fe] font-bold bg-[#00f2fe]/15'
            : 'text-[#6c7a89] hover:text-[#00f2fe] hover:bg-white/5'
        }`}
      >
        • {sub.nombre}
      </button>
    ));
  };

  return (
    <aside
      className={`fixed ${headerVisible ? 'top-15' : 'top-0'} bottom-0 left-0 w-65 bg-[#12161f] border-r border-white/5 shadow-[4px_0_20px_rgba(0,0,0,0.5)] z-30 flex flex-col transition-all duration-300 overflow-y-auto ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col py-3 space-y-1">
        {/* Main Live Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard-live', undefined, 'DASHBOARD EN VIVO')}
          className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider text-left transition-all border-l-4 cursor-pointer ${
            activeTab === 'dashboard-live'
              ? 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe] shadow-[inset_0_0_12px_rgba(0,242,254,0.15)]'
              : 'text-[#8f9ba8] border-transparent hover:text-white hover:bg-white/5'
          }`}
        >
          <Zap className="w-4 h-4 text-[#00f2fe] animate-pulse" />
          <span>⚡ DASHBOARD EN VIVO</span>
        </button>

        {/* Planos Search */}
        <button
          onClick={() => onSelectTab('planos', undefined, 'Buscador de Planos')}
          className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider text-left transition-all border-l-4 cursor-pointer ${
            activeTab === 'planos'
              ? 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe] shadow-[inset_0_0_12px_rgba(0,242,254,0.15)]'
              : 'text-[#8f9ba8] border-transparent hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4 text-[#00f2fe]" />
          <span>Buscador de Planos</span>
        </button>

        {/* Sizing Packs Multi-Style Calculator */}
        <button
          onClick={() => onSelectTab('sizing-calculator', undefined, 'Calculadora Multi-Estilo Sizing Packs')}
          className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider text-left transition-all border-l-4 cursor-pointer ${
            activeTab === 'sizing-calculator'
              ? 'text-[#39ff14] bg-[#39ff14]/10 border-[#39ff14] shadow-[inset_0_0_12px_rgba(57,255,20,0.15)]'
              : 'text-[#8f9ba8] border-transparent hover:text-white hover:bg-white/5'
          }`}
        >
          <Calculator className="w-4 h-4 text-[#39ff14]" />
          <span>🧮 CALCULADORA SIZING PACKS</span>
        </button>

        <div className="px-4 pt-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#5f6e7d]">
          Hojas Operativas WIP & Cuadre
        </div>

        {/* WIP Demo Nativo (PRUEBA SEGUIRA) */}
        <button
          onClick={() => onSelectTab('wip-demo' as TabType, undefined, 'CONTROL WIP (DEMO)')}
          className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all border-l-4 cursor-pointer ${
            activeTab === ('wip-demo' as TabType)
              ? 'text-[#39ff14] bg-[#39ff14]/10 border-[#39ff14] shadow-[inset_0_0_12px_rgba(57,255,20,0.15)]'
              : 'text-[#39ff14]/80 border-transparent hover:text-[#39ff14] hover:bg-white/5'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-[#39ff14]" />
          <span>⚡ CONTROL WIP (DEMO)</span>
        </button>

        {/* WIP Incompletos */}
        <div className="flex flex-col">
          <button
            onClick={() => toggleGroup('wip', 'wip', 'Control WIP Incompletos')}
            className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all border-l-4 cursor-pointer ${
              activeTab === 'wip'
                ? 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe]'
                : 'text-[#8f9ba8] border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Control WIP Incompletos</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups['wip'] ? 'rotate-180' : ''}`} />
          </button>
          {openGroups['wip'] && (
            <div className="bg-[#0d1017] border-l-4 border-[#00f2fe] py-1 flex flex-col">
              {renderSubMenuButtons('wip', 'Control WIP Incompletos')}
            </div>
          )}
        </div>

        {/* Cuadre Full Dye */}
        <div className="flex flex-col">
          <button
            onClick={() => toggleGroup('cuadre-fd', 'cuadre-fd', 'Cuadre Full Dye')}
            className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all border-l-4 cursor-pointer ${
              activeTab === 'cuadre-fd'
                ? 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe]'
                : 'text-[#8f9ba8] border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Shirt className="w-3.5 h-3.5" />
              <span>Cuadre Full Dye</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups['cuadre-fd'] ? 'rotate-180' : ''}`} />
          </button>
          {openGroups['cuadre-fd'] && (
            <div className="bg-[#0d1017] border-l-4 border-[#00f2fe] py-1 flex flex-col">
              {renderSubMenuButtons('cuadre-fd', 'Cuadre Full Dye')}
            </div>
          )}
        </div>

        {/* Cuadre Mochilas */}
        <div className="flex flex-col">
          <button
            onClick={() => toggleGroup('cuadre-mochilas', 'cuadre-mochilas', 'Cuadre Mochilas (Backpacks)')}
            className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all border-l-4 cursor-pointer ${
              activeTab === 'cuadre-mochilas'
                ? 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe]'
                : 'text-[#8f9ba8] border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Box className="w-3.5 h-3.5" />
              <span>Cuadre Mochilas</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups['cuadre-mochilas'] ? 'rotate-180' : ''}`} />
          </button>
          {openGroups['cuadre-mochilas'] && (
            <div className="bg-[#0d1017] border-l-4 border-[#00f2fe] py-1 flex flex-col">
              {renderSubMenuButtons('cuadre-mochilas', 'Cuadre Mochilas')}
            </div>
          )}
        </div>

        {/* WIP Stocks & Vendidas */}
        <div className="flex flex-col">
          <button
            onClick={() => toggleGroup('wip-stocks', 'wip-stocks', 'WIP Stocks & ordenes Vendidas')}
            className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all border-l-4 cursor-pointer ${
              activeTab === 'wip-stocks'
                ? 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe]'
                : 'text-[#8f9ba8] border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>WIP Stocks & Vendidas</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups['wip-stocks'] ? 'rotate-180' : ''}`} />
          </button>
          {openGroups['wip-stocks'] && (
            <div className="bg-[#0d1017] border-l-4 border-[#00f2fe] py-1 flex flex-col">
              {renderSubMenuButtons('wip-stocks', 'WIP Stocks & Vendidas')}
            </div>
          )}
        </div>

        {/* WIP TS TeamSpirit */}
        <div className="flex flex-col">
          <button
            onClick={() => toggleGroup('wip-ts', 'wip-ts', 'WIP TS (TeamSpirit)')}
            className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all border-l-4 cursor-pointer ${
              activeTab === 'wip-ts'
                ? 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe]'
                : 'text-[#8f9ba8] border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-3.5 h-3.5" />
              <span>WIP TS (TeamSpirit)</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups['wip-ts'] ? 'rotate-180' : ''}`} />
          </button>
          {openGroups['wip-ts'] && (
            <div className="bg-[#0d1017] border-l-4 border-[#00f2fe] py-1 flex flex-col">
              {renderSubMenuButtons('wip-ts', 'WIP TS')}
            </div>
          )}
        </div>

        {/* Helmets WIP */}
        <div className="flex flex-col">
          <button
            onClick={() => toggleGroup('helmets-wip', 'helmets-wip', 'Helmets WIP')}
            className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all border-l-4 cursor-pointer ${
              activeTab === 'helmets-wip'
                ? 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe]'
                : 'text-[#8f9ba8] border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <HardHat className="w-3.5 h-3.5" />
              <span>Helmets WIP</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups['helmets-wip'] ? 'rotate-180' : ''}`} />
          </button>
          {openGroups['helmets-wip'] && (
            <div className="bg-[#0d1017] border-l-4 border-[#00f2fe] py-1 flex flex-col">
              {renderSubMenuButtons('helmets-wip', 'Helmets WIP')}
            </div>
          )}
        </div>

        {/* Newsoft Orders */}
        <div className="flex flex-col">
          <button
            onClick={() => toggleGroup('newsoft-orders', 'newsoft-orders', 'Newsoft Orders')}
            className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all border-l-4 cursor-pointer ${
              activeTab === 'newsoft-orders'
                ? 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe]'
                : 'text-[#8f9ba8] border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Newsoft Orders</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups['newsoft-orders'] ? 'rotate-180' : ''}`} />
          </button>
          {openGroups['newsoft-orders'] && (
            <div className="bg-[#0d1017] border-l-4 border-[#00f2fe] py-1 flex flex-col">
              {renderSubMenuButtons('newsoft-orders', 'Newsoft Orders')}
            </div>
          )}
        </div>

        {/* UPS Shipping */}
        <div className="flex flex-col">
          <button
            onClick={() => toggleGroup('ups-shipping', 'ups-shipping', 'Shipping Contenedor & Nave 6')}
            className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all border-l-4 cursor-pointer ${
              activeTab === 'ups-shipping'
                ? 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe]'
                : 'text-[#8f9ba8] border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Truck className="w-3.5 h-3.5" />
              <span>Shipping Nave 6</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups['ups-shipping'] ? 'rotate-180' : ''}`} />
          </button>
          {openGroups['ups-shipping'] && (
            <div className="bg-[#0d1017] border-l-4 border-[#00f2fe] py-1 flex flex-col">
              {renderSubMenuButtons('ups-shipping', 'Shipping Nave 6')}
            </div>
          )}
        </div>

        {/* Historial Reemplazos */}
        <div className="flex flex-col">
          <button
            onClick={() => toggleGroup('reemplazos', 'reemplazos', 'Historial Reemplazos')}
            className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all border-l-4 cursor-pointer ${
              activeTab === 'reemplazos'
                ? 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe]'
                : 'text-[#8f9ba8] border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Historial Reemplazos</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openGroups['reemplazos'] ? 'rotate-180' : ''}`} />
          </button>
          {openGroups['reemplazos'] && (
            <div className="bg-[#0d1017] border-l-4 border-[#00f2fe] py-1 flex flex-col">
              {renderSubMenuButtons('reemplazos', 'Historial Reemplazos')}
            </div>
          )}
        </div>

        {/* Manual de Producción */}
        <button
          onClick={() => onSelectTab('manual', undefined, 'Manual de Control de Producción')}
          className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all border-l-4 cursor-pointer ${
            activeTab === 'manual'
              ? 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe]'
              : 'text-[#8f9ba8] border-transparent hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Manual de Producción</span>
        </button>

        {/* Configuración */}
        <button
          onClick={() => onSelectTab('configuracion', undefined, 'Configuración del Sistema')}
          className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all border-l-4 cursor-pointer mt-auto ${
            activeTab === 'configuracion'
              ? 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe]'
              : 'text-[#8f9ba8] border-transparent hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>⚙️ CONFIGURACIÓN</span>
        </button>

        {/* Cerrar Sesión */}
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider text-left text-[#ff007f] hover:bg-[#ff007f]/10 transition-all border-l-4 border-transparent hover:border-[#ff007f] cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>🔒 CERRAR SESIÓN</span>
        </button>
      </div>
    </aside>
  );
};
