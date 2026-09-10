import { DashboardData } from '../types';

export const INITIAL_FALLBACK_DASHBOARD: DashboardData = {
  status: 'SUCCESS',
  kpiMochilas: {
    ordenes: 0,
    balance: 0,
    captura: 0,
    meta: 0,
  },
  mochilas: [],
  kpiApparel: {
    ordenes: 0,
    balance: 0,
    captura: 0,
    meta: 0,
  },
  apparel: [],
  contenedor: {
    textoOrdenes: 'Contenedor en proceso',
    pctShipping: 0,
    pctEnCurso: 0,
    pctAcumulado: 0,
  },
  lastUpdated: new Date().toLocaleTimeString(),
};

const WEB_APP_DASHBOARD_URL =
  'https://script.google.com/macros/s/AKfycbxMN9J7ZwYqRehAU5H5ugbTtAtbySfC8dNb05PhhUWlmJBtRJILVV0EMylxjdjkpT862w/exec';

export async function fetchLiveDashboardData(): Promise<{ data: DashboardData | null; isLive: boolean }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s de margen para Google Apps Script

  try {
    const response = await fetch(`${WEB_APP_DASHBOARD_URL}?action=getDashboard&_t=${Date.now()}`, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response || !response.ok) {
      return { data: null, isLive: false };
    }

    const json = await response.json();

    if (!json) {
      return { data: null, isLive: false };
    }

    const parsedData: DashboardData = {
      ...json,
      status: json.status || 'SUCCESS',
      kpiMochilas: json.kpiMochilas || INITIAL_FALLBACK_DASHBOARD.kpiMochilas,
      mochilas: json.mochilas || [],
      kpiApparel: json.kpiApparel || INITIAL_FALLBACK_DASHBOARD.kpiApparel,
      apparel: json.apparel || [],
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
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Reintentando sincronización con Google Apps Script...', err);
    return { data: null, isLive: false };
  }
}
