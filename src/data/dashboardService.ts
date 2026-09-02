import { DashboardData } from '../types';

export const INITIAL_FALLBACK_DASHBOARD: DashboardData = {
  status: 'SUCCESS',
  kpiMochilas: {
    ordenes: 36,
    balance: 437,
    captura: 15,
    meta: 2743,
  },
  mochilas: [
    { nombre: 'CUSTOM BAGS', ordenes: 1, balance: 1, captura: 183, meta: 538 },
    { nombre: 'UTILITY BAG LINE 3', ordenes: 4, balance: 13, captura: 0, meta: 930 },
    { nombre: 'BIG BAG UTILITY 1', ordenes: 6, balance: 73, captura: 1, meta: 154 },
    { nombre: 'SPUT 1', ordenes: 7, balance: 163, captura: 6, meta: 518 },
    { nombre: 'BIG BAG UTILITY 2', ordenes: 8, balance: 75, captura: 2, meta: 178 },
    { nombre: 'SPUT 2', ordenes: 10, balance: 112, captura: 1, meta: 780 },
  ],
  kpiApparel: {
    ordenes: 23,
    balance: 228,
    captura: 4417,
    meta: 8565,
  },
  apparel: [
    { nombre: 'Pants 1', ordenes: 0, balance: 0, captura: 393, meta: 975, reportado: 306 },
    { nombre: 'Hats', ordenes: 0, balance: 0, captura: 231, meta: 488, reportado: 166 },
    { nombre: 'Pants 2', ordenes: 2, balance: 3, captura: 493, meta: 975, reportado: 362 },
    { nombre: 'Celda 1', ordenes: 4, balance: 16, captura: 1526, meta: 2292, reportado: 1258 },
    { nombre: 'Celda 2', ordenes: 4, balance: 97, captura: 1125, meta: 1828, reportado: 899 },
    { nombre: 'Celda 3', ordenes: 5, balance: 112, captura: 196, meta: 707, reportado: 261 },
    { nombre: 'Celda 4', ordenes: 8, balance: 0, captura: 453, meta: 1300, reportado: 433 },
  ],
  contenedor: {
    textoOrdenes: 'Contenedor JBHU-892104 (40ft HQ) - 1,480 cajas en nave',
    pctShipping: 19.32,
    pctEnCurso: 0.0,
    pctAcumulado: 19.32,
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
      headers: { Accept: 'application/json' },
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
