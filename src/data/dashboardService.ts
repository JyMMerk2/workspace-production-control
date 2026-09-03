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
  const timeoutId = setTimeout(() => controller.abort(), 8000); // Elevado a 8s para dar tiempo en redes lentas

  try {
    const response = await fetch(`${WEB_APP_DASHBOARD_URL}?action=getDashboard&_t=${Date.now()}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeoutId);

    if (!response || !response.ok) {
      throw new Error(`Respuesta no válida del servidor HTTP: ${response?.status}`);
    }

    const json = await response.json();

    if (!json || json.status !== 'SUCCESS' || !json.kpiApparel) {
      throw new Error('Respuesta inválida o incompleta enviada por Google Apps Script');
    }

    const parsedData: DashboardData = {
      status: 'SUCCESS',
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
    // Lanzar el error para que App.tsx capture la excepción y Mantenga los datos vivos actuales (6,499) en pantalla
    throw err;
  }
}
