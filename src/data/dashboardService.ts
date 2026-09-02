import { DashboardData } from '../types';

export const INITIAL_FALLBACK_DASHBOARD: DashboardData = {
  status: 'SUCCESS',
  kpiMochilas: {
    ordenes: 142,
    balance: 3840,
    captura: 3120,
    meta: 3500,
  },
  mochilas: [
    { nombre: 'Módulo 1 (Superpack BM)', ordenes: 28, balance: 750, captura: 620, meta: 700 },
    { nombre: 'Módulo 2 (Superpack Rolling)', ordenes: 34, balance: 920, captura: 810, meta: 850 },
    { nombre: 'Módulo 3 (DEFCON & Ultrapack)', ordenes: 22, balance: 590, captura: 480, meta: 550 },
    { nombre: 'Módulo 4 (Catchers Rolling)', ordenes: 19, balance: 510, captura: 410, meta: 450 },
    { nombre: 'Módulo 5 (Diamond Duffle & Tyro)', ordenes: 24, balance: 640, captura: 520, meta: 600 },
    { nombre: 'Módulo 6 (Player Series Custom)', ordenes: 15, balance: 430, captura: 280, meta: 350 },
  ],
  kpiApparel: {
    ordenes: 218,
    balance: 5490,
    captura: 4820,
    meta: 5000,
  },
  apparel: [
    { nombre: 'Módulo A1 (Jersey FD-163 Crew)', ordenes: 45, balance: 1120, captura: 990, meta: 1000, reportado: 970 },
    { nombre: 'Módulo A2 (Jersey FD-163W Womens)', ordenes: 38, balance: 950, captura: 840, meta: 850, reportado: 830 },
    { nombre: 'Módulo A3 (Jersey FD-163Y Youth)', ordenes: 40, balance: 1010, captura: 890, meta: 900, reportado: 880 },
    { nombre: 'Módulo A4 (Full Button FD-105)', ordenes: 25, balance: 630, captura: 550, meta: 600, reportado: 540 },
    { nombre: 'Módulo A5 (Hoodies FD-205)', ordenes: 22, balance: 560, captura: 490, meta: 500, reportado: 480 },
    { nombre: 'Módulo A6 (Baseball Pants PS-4070)', ordenes: 26, balance: 670, captura: 590, meta: 600, reportado: 580 },
    { nombre: 'Módulo A7 (Softball Pants PS-5075)', ordenes: 22, balance: 550, captura: 470, meta: 550, reportado: 460 },
  ],
  contenedor: {
    textoOrdenes: 'Contenedor JBHU-892104 (40ft HQ) - 1,480 cajas en nave',
    pctShipping: 89.14,
    pctEnCurso: 74.25,
    pctAcumulado: 92.40,
  },
  lastUpdated: new Date().toLocaleTimeString(),
};

const WEB_APP_DASHBOARD_URL =
  'https://script.google.com/macros/s/AKfycbxMN9J7ZwYqRehAU5H5ugbTtAtbySfC8dNb05PhhUWlmJBtRJILVV0EMylxjdjkpT862w/exec';

export async function fetchLiveDashboardData(): Promise<{ data: DashboardData; isLive: boolean }> {
  try {
    // 1. Try direct fetch first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${WEB_APP_DASHBOARD_URL}?action=getDashboard&_t=${Date.now()}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (response && response.ok) {
      const json = await response.json().catch(() => null);
      if (json && json.status === 'SUCCESS') {
        const parsedData: DashboardData = {
          status: 'SUCCESS',
          kpiMochilas: (json.kpiMochilas as DashboardData['kpiMochilas']) || INITIAL_FALLBACK_DASHBOARD.kpiMochilas,
          mochilas: (json.mochilas as DashboardData['mochilas']) || INITIAL_FALLBACK_DASHBOARD.mochilas,
          kpiApparel: (json.kpiApparel as DashboardData['kpiApparel']) || INITIAL_FALLBACK_DASHBOARD.kpiApparel,
          apparel: (json.apparel as DashboardData['apparel']) || INITIAL_FALLBACK_DASHBOARD.apparel,
          contenedor: json.contenedor
            ? {
                textoOrdenes: (json.contenedor as Record<string, string>).textoOrdenes || 'Contenedor en proceso',
                pctShipping: parseFloat((json.contenedor as Record<string, string>).pctShipping) || 0,
                pctEnCurso: parseFloat((json.contenedor as Record<string, string>).pctEnCurso) || 0,
                pctAcumulado: parseFloat((json.contenedor as Record<string, string>).pctAcumulado) || 0,
              }
            : INITIAL_FALLBACK_DASHBOARD.contenedor,
          lastUpdated: new Date().toLocaleTimeString(),
        };
        return { data: parsedData, isLive: true };
      }
    }
  } catch (err) {
    // Graceful silent fallback without throwing script errors
  }

  // 2. Safely return fallback with updated timestamp
  return {
    data: {
      ...INITIAL_FALLBACK_DASHBOARD,
      lastUpdated: new Date().toLocaleTimeString(),
    },
    isLive: false,
  };
}
