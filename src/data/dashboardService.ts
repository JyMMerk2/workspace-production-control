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

export async function fetchLiveDashboardData(): Promise<{ data: DashboardData; isLive: boolean }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    // Cache-buster con marca de tiempo + headers para desactivar caché
    const response = await fetch(`${WEB_APP_DASHBOARD_URL}?action=getDashboard&_t=${Date.now()}`, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });

    clearTimeout(timeoutId);

    if (!response || !response.ok) {
      throw new Error(`Respuesta no válida del servidor HTTP: ${response?.status}`);
    }

    const json = await response.json();

    if (!json) {
      throw new Error('Respuesta vacía enviada por Google Apps Script');
    }

    // Mapeo flexible: Acepta cualquier objeto válido recibido de la API
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
    console.warn('Error fetching live dashboard data:', err);
    throw err;
  }
}
