import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  Lock, 
  Unlock, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  MapPin, 
  KeyRound, 
  Send, 
  Calculator as CalcIcon, 
  RefreshCw, 
  X, 
  Layers, 
  ShieldAlert,
  Check,
  AlertTriangle,
  Printer,
  UserCheck
} from 'lucide-react';
import { supabase } from '../data/supabaseClient';
import { Nave6ActivityEvent } from './InventarioKpiUsuariosView';

interface InventoryItem {
  rowNumber: number;
  colA_Validado: boolean;
  colB_Codigo: string;
  colC_Item: string;
  colD_NetSuite: number;
  colE_Newsoft: number;
  colF_Diferencia: number;
  colG_Salida: number;
  colH_Ubicacion: string;
  colI_Candado: boolean;
  colL_Comentario: string;
  colN_Nave7: number;
  isLocked: boolean;
}

interface PaseInventarioViewProps {
  authenticatedUser?: string | null;
}

export interface PaseActiveSession {
  usuario: string;
  modulo: 'PASE_INVENTARIO';
  ubicacionActiva?: string;
  codigoActivo?: string;
  hora: string;
  timestamp: number;
}

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwEDMJffjkXLYTPnYpQA3jC51KmyDb8TtNG3haEGv5lYvbzZAMjaAI3Xmy3BF5SQCkL/exec';
const CSV_URL = 'https://docs.google.com/spreadsheets/d/1g5SoP8q1u7n05v0tABvwf2e6UPClSMM8b2ah_1-9A3M/export?format=csv&gid=1178501683';
const MASTER_PIN = '030621';
const ACTIVITY_LOG_CACHE_KEY = 'nave6_season_activity_v1';
const PASE_SESSIONS_CACHE_KEY = 'nave6_pase_active_sessions_v1';
const BROADCAST_CHANNEL_NAME = 'nave6_realtime_sync_channel';

function broadcastSyncMessage(payload: Record<string, any>) {
  try {
    const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    bc.postMessage(payload);
    bc.close();
  } catch {
    // Ignorar si el navegador no soporta BroadcastChannel
  }
}

// Helper para limpiar la marca automática [REVISIÓN ...] al volver a cerrar el candado
function limpiarEtiquetaRevision(comentario: string): string {
  return comentario.replace(/\[REVISIÓN[^\]]*\]\s*/gi, '').trim();
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Parser CSV exacto para sincronización en tiempo real sin consumir cuota de Apps Script
function parseCSVExact(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }
  if (current !== '' || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

// Cliente de conexión híbrido y resistente (Fetch con fallback a JSONP)
async function queryGAS(params: Record<string, string>): Promise<any> {
  const query = new URLSearchParams(params).toString();
  const url = `${APPS_SCRIPT_URL}?${query}`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Fallback a JSONP si fetch es bloqueado por política de redirección
  }

  return new Promise((resolve, reject) => {
    const cb = 'gas_cb_' + Math.round(100000 * Math.random());
    (window as any)[cb] = (data: any) => {
      delete (window as any)[cb];
      if (document.body.contains(script)) document.body.removeChild(script);
      resolve(data);
    };

    const script = document.createElement('script');
    script.src = `${url}&callback=${cb}`;
    script.onerror = () => {
      delete (window as any)[cb];
      if (document.body.contains(script)) document.body.removeChild(script);
      reject(new Error('No se pudo conectar con el servidor.'));
    };
    document.body.appendChild(script);
  });
}

export const PaseInventarioView: React.FC<PaseInventarioViewProps> = ({
  authenticatedUser,
}) => {
  const activeUserLabel = (
    authenticatedUser ||
    sessionStorage.getItem('authenticated_user') ||
    localStorage.getItem('authenticated_user') ||
    'OPERADOR'
  )
    .trim()
    .toUpperCase();

  const [searchTerm, setSearchTerm] = useState('');
  
  // Ubicaciones con autocompletado y búsqueda escrita
  const [selectedUbicacion, setSelectedUbicacion] = useState('');
  const [ubicacionInput, setUbicacionInput] = useState('');
  const [ubicacionesList, setUbicacionesList] = useState<string[]>([]);
  const [showUbiDropdown, setShowUbiDropdown] = useState(false);

  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingSlack, setSendingSlack] = useState(false);
  const [itemsList, setItemsList] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [baseListaEnMemoria, setBaseListaEnMemoria] = useState(false);
  const [activePaseSessions, setActivePaseSessions] = useState<PaseActiveSession[]>([]);

  // Modal de selección de filtro para imprimir localidad
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Estados de edición del ítem seleccionado
  const [colA, setColA] = useState(false);
  const [colB, setColB] = useState('');
  const [colC, setColC] = useState('');
  const [colD, setColD] = useState<number | string>(0);
  const [colE, setColE] = useState<number | string>(0);
  const [colG, setColG] = useState<number | string>(0);
  const [colH, setColH] = useState('');
  const [colI, setColI] = useState(false);
  const [colL, setColL] = useState('');
  const [colN, setColN] = useState<number | string>(0);

  // Candado y PIN
  const [isUnlockedByPin, setIsUnlockedByPin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [sendingPinEmail, setSendingPinEmail] = useState(false);

  // Mini Calculadora Independiente
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const ubiContainerRef = useRef<HTMLDivElement>(null);
  const allInventoryRef = useRef<InventoryItem[]>([]);
  const isSyncingRef = useRef(false);
  const selectedUbicacionRef = useRef('');

  useEffect(() => {
    selectedUbicacionRef.current = selectedUbicacion;
  }, [selectedUbicacion]);

  // --- PRESENCIA EN VIVO INSTANTÁNEA EN TOMA Y PASE DE INVENTARIO ---
  const publishPasePresence = useCallback(
    async (isLeaving = false) => {
      const now = Date.now();
      const hora = new Date().toLocaleTimeString('es-DO', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const currentSession: PaseActiveSession = {
        usuario: activeUserLabel,
        modulo: 'PASE_INVENTARIO',
        ubicacionActiva: selectedUbicacion || ubicacionInput.trim().toUpperCase() || undefined,
        codigoActivo: selectedItem?.colB_Codigo || undefined,
        hora,
        timestamp: now,
      };

      let localMap: Record<string, PaseActiveSession> = {};
      try {
        const saved = localStorage.getItem(PASE_SESSIONS_CACHE_KEY);
        if (saved) localMap = JSON.parse(saved);
      } catch {
        // Ignorar
      }

      if (isLeaving) {
        delete localMap[activeUserLabel];
      } else {
        localMap[activeUserLabel] = currentSession;
      }

      Object.keys(localMap).forEach((k) => {
        if (now - (localMap[k]?.timestamp || 0) > 35000) {
          delete localMap[k];
        }
      });

      const activeArray = Object.values(localMap);
      setActivePaseSessions(activeArray);

      try {
        localStorage.setItem(PASE_SESSIONS_CACHE_KEY, JSON.stringify(localMap));
      } catch {
        // Ignorar
      }

      // Emitir al instante (0ms) al panel KPI por Usuario
      broadcastSyncMessage({
        type: 'PASE_PRESENCE_UPDATED',
        sessions: activeArray,
      });

      try {
        if (supabase) {
          const { data } = await supabase
            .from('boombah_announcements')
            .select('message')
            .eq('id', 'global_nave6_pase_sessions')
            .maybeSingle();

          let remoteMap: Record<string, PaseActiveSession> = {};
          if (data?.message) {
            const parsed = JSON.parse(data.message);
            if (parsed && typeof parsed === 'object') remoteMap = parsed;
          }

          if (isLeaving) {
            delete remoteMap[activeUserLabel];
          } else {
            remoteMap[activeUserLabel] = currentSession;
          }

          Object.keys(remoteMap).forEach((k) => {
            if (now - (remoteMap[k]?.timestamp || 0) > 35000) {
              delete remoteMap[k];
            }
          });

          const mergedList = Object.values(remoteMap);
          setActivePaseSessions(mergedList);
          try {
            localStorage.setItem(PASE_SESSIONS_CACHE_KEY, JSON.stringify(remoteMap));
          } catch {
            // Ignorar
          }

          await supabase.from('boombah_announcements').upsert({
            id: 'global_nave6_pase_sessions',
            message: JSON.stringify(remoteMap),
            active: true,
            priority: 'AVISO',
            updated_by: activeUserLabel,
            updated_at: new Date().toISOString(),
          });
        }
      } catch {
        // Silencioso
      }
    },
    [activeUserLabel, selectedUbicacion, ubicacionInput, selectedItem]
  );

  useEffect(() => {
    publishPasePresence(false);
    const heartbeat = setInterval(() => {
      if (!document.hidden) publishPasePresence(false);
    }, 2000);

    const onBeforeUnload = () => {
      publishPasePresence(true);
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', onBeforeUnload);
      publishPasePresence(true);
    };
  }, [publishPasePresence]);

  // Registrar acción del operador al instante (0ms) en la bitácora global de KPI por Usuario
  const recordOperatorActivity = useCallback(
    async (
      accion: Nave6ActivityEvent['accion'],
      datos: { codigo: string; item: string; ubicacion: string; cantidad: number }
    ) => {
      const nuevoEvento: Nave6ActivityEvent = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        usuario: activeUserLabel,
        accion,
        codigo: datos.codigo,
        item: datos.item,
        ubicacion: datos.ubicacion,
        cantidad: Number(datos.cantidad) || 0,
        fecha: new Date().toLocaleString('es-DO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: Date.now(),
      };

      let listaActual: Nave6ActivityEvent[] = [];
      try {
        const saved = localStorage.getItem(ACTIVITY_LOG_CACHE_KEY);
        if (saved) listaActual = JSON.parse(saved);
      } catch {
        // Ignorar
      }

      const actualizada = [nuevoEvento, ...listaActual].slice(0, 3000);
      try {
        localStorage.setItem(ACTIVITY_LOG_CACHE_KEY, JSON.stringify(actualizada));
      } catch {
        // Ignorar
      }

      // Notificar al instante (0ms) a la vista de KPI por Usuario
      broadcastSyncMessage({ type: 'ACTIVITY_UPDATED', event: nuevoEvento });

      try {
        if (supabase) {
          const { data } = await supabase
            .from('boombah_announcements')
            .select('message')
            .eq('id', 'global_nave6_season_activity')
            .maybeSingle();

          let remota: Nave6ActivityEvent[] = [];
          if (data?.message) {
            const parsed = JSON.parse(data.message);
            if (Array.isArray(parsed)) remota = parsed;
          }

          const merged = [nuevoEvento, ...remota].slice(0, 3000);
          await supabase.from('boombah_announcements').upsert({
            id: 'global_nave6_season_activity',
            message: JSON.stringify(merged),
            active: true,
            priority: 'AVISO',
            updated_by: activeUserLabel,
            updated_at: new Date().toISOString(),
          });
        }
      } catch {
        // Continuar silenciosamente
      }
    },
    [activeUserLabel]
  );

  // Sincronización global ultrarrápida en memoria vía CSV cada 2s (elimina esperas de Apps Script al buscar)
  const syncInventarioEnMemoria = useCallback(async () => {
    if (isSyncingRef.current || saving || document.hidden) return;
    isSyncingRef.current = true;

    try {
      const res = await fetch(`${CSV_URL}&t=${Date.now()}`, { cache: 'no-store' });
      const csvText = await res.text();
      const allRows = parseCSVExact(csvText);

      const parsedAll: InventoryItem[] = [];
      const setUbis = new Set<string>();

      for (let i = 3; i < allRows.length; i++) {
        const cols = allRows[i];
        if (!cols || cols.length < 3) continue;

        const codigo = String(cols[1] || '').trim();
        const itemDesc = String(cols[2] || '').trim();
        if (!codigo && !itemDesc) continue;
        if (codigo.toUpperCase() === 'COMENTARIO' || itemDesc.toUpperCase() === 'COMENTARIO') continue;

        const rawA = (cols[0] || '').toUpperCase();
        const rawI = (cols[8] || '').toUpperCase();
        const isColA = rawA === 'TRUE' || rawA === 'VERDADERO' || rawA === 'OK' || rawA === '1';
        const isColI = rawI === 'TRUE' || rawI === 'VERDADERO' || rawI === 'OK' || rawI === '1';
        const ubi = String(cols[7] || '').trim();

        if (ubi && ubi !== '-' && ubi.toUpperCase() !== 'UBICACION' && ubi.toUpperCase() !== 'LOCATION') {
          setUbis.add(ubi);
        }

        parsedAll.push({
          rowNumber: i + 1,
          colA_Validado: isColA,
          colB_Codigo: codigo,
          colC_Item: itemDesc,
          colD_NetSuite: parseFloat(cols[3]?.replace(/[^0-9.-]+/g, '')) || 0,
          colE_Newsoft: parseFloat(cols[4]?.replace(/[^0-9.-]+/g, '')) || 0,
          colF_Diferencia: parseFloat(cols[5]?.replace(/[^0-9.-]+/g, '')) || 0,
          colG_Salida: parseFloat(cols[6]?.replace(/[^0-9.-]+/g, '')) || 0,
          colH_Ubicacion: ubi,
          colI_Candado: isColI,
          colL_Comentario: String(cols[11] || ''),
          colN_Nave7: parseFloat(cols[13]?.replace(/[^0-9.-]+/g, '')) || 0,
          isLocked: isColA && isColI
        });
      }

      if (parsedAll.length > 0) {
        allInventoryRef.current = parsedAll;
        setBaseListaEnMemoria(true);
        setUbicacionesList(Array.from(setUbis).sort());

        // Si hay un rack seleccionado, mantener su lista izquierda actualizada en vivo
        const ubiActiva = selectedUbicacionRef.current.trim().toLowerCase();
        if (ubiActiva && !saving) {
          const itemsRack = parsedAll.filter(
            (it) => it.colH_Ubicacion.trim().toLowerCase() === ubiActiva
          );
          if (itemsRack.length > 0) {
            setItemsList(itemsRack);
          }
        }
      }
    } catch {
      // Silencioso en segundo plano
    } finally {
      isSyncingRef.current = false;
    }
  }, [saving]);

  useEffect(() => {
    syncInventarioEnMemoria();

    const interval = setInterval(() => {
      syncInventarioEnMemoria();
    }, 2000);

    const onVisibilityChange = () => {
      if (!document.hidden) syncInventarioEnMemoria();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [syncInventarioEnMemoria]);

  // Cerrar dropdown de ubicaciones al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ubiContainerRef.current && !ubiContainerRef.current.contains(e.target as Node)) {
        setShowUbiDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const seleccionarItemParaEditar = (it: InventoryItem) => {
    setSelectedItem(it);
    setColA(it.colA_Validado);
    setColB(it.colB_Codigo);
    setColC(it.colC_Item);
    setColD(it.colD_NetSuite);
    setColE(it.colE_Newsoft);
    setColG(it.colG_Salida);
    setColH(it.colH_Ubicacion);
    setColI(it.colI_Candado);
    setColL(it.colL_Comentario || '');
    setColN(it.colN_Nave7 || 0);
    setIsUnlockedByPin(false);
  };

  // Búsqueda instantánea en memoria (<1ms) con respaldo automático a Apps Script si aún está cargando la base inicial
  const ejecutarBusqueda = async (queryTerm = searchTerm, ubiTerm = selectedUbicacion) => {
    setNotification(null);
    setIsUnlockedByPin(false);

    const busqueda = queryTerm.trim().toLowerCase();
    const ubiFiltro = ubiTerm.trim().toLowerCase();
    const tieneTerminoArticulo = busqueda !== '';

    // 1. VÍA RÁPIDA EN MEMORIA LOCAL (0ms de latencia de red)
    if (allInventoryRef.current.length > 0) {
      const base = allInventoryRef.current;

      if (tieneTerminoArticulo) {
        // Priorizar coincidencia exacta por código antes que coincidencia parcial
        const exactos = base.filter((it) => it.colB_Codigo.trim().toLowerCase() === busqueda);
        const encontrados =
          exactos.length > 0
            ? exactos
            : base
                .filter(
                  (it) =>
                    it.colB_Codigo.toLowerCase().includes(busqueda) ||
                    it.colC_Item.toLowerCase().includes(busqueda)
                )
                .slice(0, 200);

        if (encontrados.length === 0) {
          setItemsList([]);
          setNotification({ type: 'error', text: 'No se encontraron artículos con ese criterio.' });
          return;
        }

        const primerItem = encontrados[0];
        const ubicacionDetectada = primerItem.colH_Ubicacion;

        if (ubicacionDetectada && ubicacionDetectada !== '-') {
          setSelectedUbicacion(ubicacionDetectada);
          setUbicacionInput(ubicacionDetectada);
          const itemsRack = base.filter(
            (it) => it.colH_Ubicacion.trim().toLowerCase() === ubicacionDetectada.trim().toLowerCase()
          );
          setItemsList(itemsRack.length > 0 ? itemsRack : encontrados);
        } else {
          setItemsList(encontrados);
        }

        seleccionarItemParaEditar(primerItem);
        return;
      } else {
        // Filtro por ubicación (rack)
        const filtradosUbi = ubiFiltro
          ? base.filter((it) => it.colH_Ubicacion.trim().toLowerCase() === ubiFiltro)
          : base.slice(0, 200);

        if (filtradosUbi.length === 0) {
          setItemsList([]);
          setNotification({ type: 'error', text: 'No se encontraron artículos en esa ubicación.' });
          return;
        }

        setItemsList(filtradosUbi);
        if (filtradosUbi.length === 1) {
          seleccionarItemParaEditar(filtradosUbi[0]);
        }
        return;
      }
    }

    // 2. RESPALDO POR APPS SCRIPT (solo si el usuario busca durante los primeros 1-2s antes de terminar la carga inicial)
    setSearching(true);
    try {
      const data = await queryGAS({
        action: 'SEARCH_ITEM',
        query: queryTerm.trim(),
        ubicacion: tieneTerminoArticulo ? '' : ubiTerm.trim()
      });

      if (data && data.success) {
        const items: InventoryItem[] = Array.isArray(data.items) ? data.items : (data.item ? [data.item] : []);

        if (tieneTerminoArticulo && items.length > 0) {
          const primerItem = items[0];
          const ubicacionDetectada = primerItem.colH_Ubicacion;

          if (ubicacionDetectada) {
            setSelectedUbicacion(ubicacionDetectada);
            setUbicacionInput(ubicacionDetectada);

            const dataRack = await queryGAS({
              action: 'SEARCH_ITEM',
              query: '',
              ubicacion: ubicacionDetectada
            });

            if (dataRack && dataRack.success && Array.isArray(dataRack.items)) {
              setItemsList(dataRack.items);
            } else {
              setItemsList(items);
            }
          } else {
            setItemsList(items);
          }

          seleccionarItemParaEditar(primerItem);
        } else {
          setItemsList(items);
          if (items.length === 1) {
            seleccionarItemParaEditar(items[0]);
          }
        }
      } else {
        setItemsList([]);
        setNotification({ type: 'error', text: data?.error || 'No se encontraron artículos con ese criterio.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error al consultar datos: ' + err.message });
    } finally {
      setSearching(false);
    }
  };

  // Seleccionar ubicación desde el autocompletado
  const handleSelectUbicacion = (ubi: string) => {
    setSelectedUbicacion(ubi);
    setUbicacionInput(ubi);
    setShowUbiDropdown(false);
    setSelectedItem(null);
    ejecutarBusqueda('', ubi);
  };

  const handleCerrarFormulario = () => {
    setSelectedItem(null);
    setIsUnlockedByPin(false);
    setNotification(null);
    setShowCalculator(false);
  };

  // Subgrupos de la ubicación actual para el modal de impresión
  const faltanValidarList = itemsList.filter((it) => !it.colA_Validado);
  const faltanCerrarList = itemsList.filter((it) => !it.colI_Candado);

  // Imprimir hoja de conteo/auditoría según la opción elegida (Todos, Faltan Validar o Faltan Cerrar)
  const handlePrintUbicacion = (mode: 'ALL' | 'PENDIENTE_VALIDAR' | 'PENDIENTE_CERRAR') => {
    setShowPrintModal(false);

    const targetItems =
      mode === 'PENDIENTE_VALIDAR'
        ? faltanValidarList
        : mode === 'PENDIENTE_CERRAR'
        ? faltanCerrarList
        : itemsList;

    if (targetItems.length === 0) {
      setNotification({
        type: 'error',
        text: 'No hay artículos pendientes en esa categoría para imprimir.',
      });
      return;
    }

    const filterTitle =
      mode === 'PENDIENTE_VALIDAR'
        ? 'FALTAN POR VALIDAR (COL A)'
        : mode === 'PENDIENTE_CERRAR'
        ? 'FALTAN POR CERRAR CANDADO (COL I)'
        : 'TODOS LOS ARTÍCULOS';

    const labelLocalidad = selectedUbicacion || ubicacionInput.trim() || 'TODAS LAS UBICACIONES';
    const fechaHora = new Date().toLocaleString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const totalNetSuite = targetItems.reduce((acc, it) => acc + (Number(it.colD_NetSuite) || 0), 0);
    const totalNewsoft = targetItems.reduce(
      (acc, it) =>
        acc + ((Number(it.colE_Newsoft) || 0) - (Number(it.colG_Salida) || 0)) + (Number(it.colN_Nave7) || 0),
      0
    );

    const rowsHtml = targetItems
      .map((it, index) => {
        const bal = ((Number(it.colE_Newsoft) || 0) - (Number(it.colG_Salida) || 0)) + (Number(it.colN_Nave7) || 0);
        const dif = bal - (Number(it.colD_NetSuite) || 0);
        const estadoTexto = it.colI_Candado
          ? 'CERRADO'
          : it.colA_Validado
          ? 'VALIDADO (SIN CERRAR)'
          : 'SIN VALIDAR';

        return `
          <tr>
            <td style="text-align:center;">${index + 1}</td>
            <td style="font-family:monospace;font-weight:bold;">${escapeHtml(it.colB_Codigo)}</td>
            <td>${escapeHtml(it.colC_Item)}</td>
            <td style="text-align:center;">${escapeHtml(it.colH_Ubicacion || labelLocalidad)}</td>
            <td style="text-align:center;font-weight:bold;">${it.colD_NetSuite}</td>
            <td style="text-align:center;font-weight:bold;">${bal}</td>
            <td style="text-align:center;font-weight:bold;color:${dif === 0 ? '#047857' : '#be123c'};">${dif}</td>
            <td style="text-align:center;width:72px;"></td>
            <td style="text-align:center;font-size:9.5px;font-weight:bold;">${estadoTexto}</td>
            <td style="font-size:10px;">${escapeHtml(it.colL_Comentario || '')}</td>
          </tr>
        `;
      })
      .join('');

    const printWindow = window.open('', '_blank', 'width=1050,height=780');
    if (!printWindow) {
      setNotification({
        type: 'error',
        text: 'El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes e inténtalo de nuevo.',
      });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Inventario Localidad ${escapeHtml(labelLocalidad)} - ${escapeHtml(filterTitle)}</title>
        <style>
          @page { size: letter landscape; margin: 12mm; }
          body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; padding: 12px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px; }
          .title { font-size: 17px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
          .subtitle { font-size: 11px; color: #4b5563; margin-top: 3px; }
          .badge-ubi { font-size: 18px; font-weight: 900; font-family: monospace; border: 2px solid #111827; padding: 4px 14px; border-radius: 6px; background: #f3f4f6; text-align: right; }
          .badge-filter { display: block; font-size: 10px; font-family: Arial, sans-serif; color: #b91c1c; margin-top: 2px; }
          .summary { display: flex; gap: 20px; font-size: 11px; margin-bottom: 10px; background: #f9fafb; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #111827; color: #ffffff; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.4px; padding: 6px 5px; border: 1px solid #111827; }
          td { border: 1px solid #9ca3af; padding: 5px; vertical-align: middle; }
          tr:nth-child(even) { background: #f9fafb; }
          .signatures { display: flex; justify-content: space-between; gap: 40px; margin-top: 28px; font-size: 11px; }
          .sig-box { flex: 1; border-top: 1px solid #111827; padding-top: 4px; text-align: center; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Boombah Workspace • Hoja de Conteo de Inventario (Nave 6)</h1>
            <div class="subtitle">Fecha y hora de impresión: ${escapeHtml(fechaHora)}</div>
          </div>
          <div class="badge-ubi">
            LOCALIDAD: ${escapeHtml(labelLocalidad)}
            <span class="badge-filter">FILTRO: ${escapeHtml(filterTitle)}</span>
          </div>
        </div>

        <div class="summary">
          <div><strong>Artículos Impresos:</strong> ${targetItems.length} de ${itemsList.length}</div>
          <div><strong>Suma NetSuite (NS):</strong> ${totalNetSuite}</div>
          <div><strong>Suma Bal. Newsoft:</strong> ${totalNewsoft}</div>
          <div><strong>Diferencia Neta:</strong> ${totalNewsoft - totalNetSuite}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:28px;">#</th>
              <th style="width:85px;">Código</th>
              <th>Ítem / Descripción</th>
              <th style="width:75px;">Ubicación</th>
              <th style="width:55px;">NS</th>
              <th style="width:65px;">Newsoft</th>
              <th style="width:50px;">DIF</th>
              <th style="width:75px;">Conteo Físico</th>
              <th style="width:95px;">Estado</th>
              <th style="width:145px;">Comentarios</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">Contado por (Operador)</div>
          <div class="sig-box">Auditado por (Supervisor)</div>
          <div class="sig-box">Fecha / Hora de Cierre</div>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Cálculos dinámicos en tiempo real: Tot. Bal. Newsoft = (Almacén - Salida) + Nave 7
  const numNetSuite = Number(colD) || 0;
  const numAlmacen = Number(colE) || 0;
  const numSalida = Number(colG) || 0;
  const numNave7 = Number(colN) || 0;
  const totalBalanceNewsoft = (numAlmacen - numSalida) + numNave7;
  const diferenciaCalculada = totalBalanceNewsoft - numNetSuite;
  const cuadranCantidades = totalBalanceNewsoft === numNetSuite;

  // Estado del candado: Bloquea inputs si ya estaba cerrado en Sheets y no se ha metido el PIN
  const isLocked = Boolean(selectedItem?.isLocked && !isUnlockedByPin);

  // Manejador de la calculadora auxiliar independiente
  const handleCalcBtn = (val: string) => {
    if (val === 'C') {
      setCalcDisplay('');
    } else if (val === '=') {
      try {
        const sanitized = calcDisplay.replace(/[^0-9+\-*/.]/g, '');
        const res = Function(`'use strict'; return (${sanitized})`)();
        setCalcDisplay(String(res));
      } catch {
        setCalcDisplay('Error');
      }
    } else {
      setCalcDisplay(prev => prev + val);
    }
  };

  // Enviar reporte de descuadre directamente al canal #alerta-inventario-nave-6 en Slack y mover a Revisión
  const handleSendSlackAlert = async () => {
    if (!selectedItem) return;
    setSendingSlack(true);
    setNotification(null);

    const payload = {
      rowNumber: selectedItem.rowNumber,
      codigo: colB,
      item: colC,
      ubicacion: colH,
      ns: numNetSuite,
      almacen: numAlmacen,
      salida: numSalida,
      nave7: numNave7,
      newsoft: totalBalanceNewsoft,
      dif: diferenciaCalculada,
      comentario: colL
    };

    try {
      const res = await queryGAS({
        action: 'SEND_SLACK_ALERT',
        payload: JSON.stringify(payload)
      });

      if (res && res.success) {
        const comentarioActualizado =
          res.nuevoComentario ||
          (/\[REVISIÓN/i.test(colL) ? colL : `[REVISIÓN SLACK] ${colL}`.trim());

        setColA(true);
        setColI(false);
        setColL(comentarioActualizado);

        const updatedItem: InventoryItem = {
          ...selectedItem,
          colA_Validado: true,
          colI_Candado: false,
          colL_Comentario: comentarioActualizado,
          isLocked: false
        };
        setSelectedItem(updatedItem);
        setItemsList((prev) =>
          prev.map((it) => (it.rowNumber === selectedItem.rowNumber ? updatedItem : it))
        );
        allInventoryRef.current = allInventoryRef.current.map((it) =>
          it.rowNumber === selectedItem.rowNumber ? updatedItem : it
        );

        recordOperatorActivity('SLACK', {
          codigo: colB,
          item: colC,
          ubicacion: colH,
          cantidad: totalBalanceNewsoft,
        });

        setNotification({
          type: 'success',
          text: res.message || `Alerta del ítem ${colB} enviada a Slack y movida a Revisión.`
        });
      } else {
        setNotification({
          type: 'error',
          text: res?.error || 'No se pudo enviar la alerta a Slack.'
        });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error al enviar a Slack: ' + err.message });
    } finally {
      setSendingSlack(false);
    }
  };

  // Guardar en Google Sheets (incluyendo Col D: NetSuite y Col N: Nave 7) y sincronizar estado reactivo local
  const handleSave = async () => {
    if (!selectedItem) return;

    if (isLocked) {
      setNotification({ type: 'error', text: 'El registro está bloqueado. Requiere PIN de desbloqueo.' });
      return;
    }

    if (colI && !cuadranCantidades) {
      setNotification({ type: 'error', text: 'No puedes cerrar el candado (Col I): El Balance Newsoft debe coincidir con NetSuite.' });
      return;
    }

    setSaving(true);
    setNotification(null);

    const willBeLocked = Boolean(colA && colI);
    const comentarioFinal = colI ? limpiarEtiquetaRevision(colL) : colL;

    const payload = {
      rowNumber: selectedItem.rowNumber,
      codigo: colB,
      colA,
      colB,
      colC,
      colD: Number(colD) || 0,
      colE: Number(colE) || 0,
      colG: Number(colG) || 0,
      colH,
      colI,
      ...(colI ? { colO: true, usuario: activeUserLabel } : {}),
      colL: comentarioFinal,
      colN: Number(colN) || 0,
      forceUnlock: isUnlockedByPin
    };

    try {
      const data = await queryGAS({
        action: 'UPDATE_ITEM',
        payload: JSON.stringify(payload)
      });

      if (data && data.success) {
        setColL(comentarioFinal);
        setNotification({ type: 'success', text: `Ítem ${colB} guardado exitosamente en fila ${selectedItem.rowNumber}.` });

        // Registrar efectividad del usuario al instante (0ms) en la temporada (13 Nov 2026)
        const actividadMeta = {
          codigo: colB,
          item: colC,
          ubicacion: colH,
          cantidad: totalBalanceNewsoft,
        };

        if (colI && !selectedItem.colI_Candado) {
          recordOperatorActivity('CERRADO', actividadMeta);
        } else if (colA && !selectedItem.colA_Validado) {
          recordOperatorActivity('VALIDADO', actividadMeta);
        } else {
          recordOperatorActivity('EDICION', actividadMeta);
        }

        const updatedItem: InventoryItem = {
          ...selectedItem,
          ...payload,
          colA_Validado: colA,
          colD_NetSuite: Number(colD) || 0,
          colE_Newsoft: Number(colE) || 0,
          colG_Salida: Number(colG) || 0,
          colN_Nave7: Number(colN) || 0,
          colF_Diferencia: diferenciaCalculada,
          colI_Candado: colI,
          colL_Comentario: comentarioFinal,
          isLocked: willBeLocked
        };
        setSelectedItem(updatedItem);

        setItemsList(prev => prev.map(it => it.rowNumber === selectedItem.rowNumber ? updatedItem : it));
        allInventoryRef.current = allInventoryRef.current.map(it =>
          it.rowNumber === selectedItem.rowNumber ? updatedItem : it
        );
        setIsUnlockedByPin(false);
      } else {
        setNotification({ type: 'error', text: data?.error || 'No se pudo guardar el registro.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error al registrar: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleValidatePin = () => {
    if (pinInput === MASTER_PIN) {
      setIsUnlockedByPin(true);
      setShowPinModal(false);
      setPinInput('');
      setNotification({ type: 'success', text: 'Candado desbloqueado para edición.' });
    } else {
      setNotification({ type: 'error', text: 'PIN incorrecto.' });
      setPinInput('');
    }
  };

  const handleRequestPinByEmail = async () => {
    setSendingPinEmail(true);
    try {
      await queryGAS({ action: 'RECOVER_PIN' });
      setNotification({ type: 'success', text: 'Clave enviada a juan.mercado@dr.boombah.com' });
    } catch (e: any) {
      setNotification({ type: 'error', text: 'Error enviando correo: ' + e.message });
    } finally {
      setSendingPinEmail(false);
    }
  };

  const ubicacionesFiltradas = ubicacionesList.filter(u => 
    u.toLowerCase().includes(ubicacionInput.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-5 space-y-4 text-gray-200 max-w-[1700px] mx-auto">
      
      {/* Cabecera con Sesión Activa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black uppercase text-white tracking-wide flex flex-wrap items-center gap-2">
              <span>Toma y Pase de Inventario</span>
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {baseListaEnMemoria ? 'En Vivo (2s) • Caché Rápida' : 'Sincronizando base...'}
              </span>
            </h1>
            <p className="text-[11px] text-gray-400">Captura en Vivo, Ubicaciones & Control de Candado (Nave 6)</p>
          </div>
        </div>

        {/* Badge de Sesión Activa del Operador */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#00f2fe]/10 border border-[#00f2fe]/35 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-[#00f2fe]" />
            <span className="text-gray-400 font-semibold">Sesión activa:</span>
            <span className="font-black text-white uppercase">{activeUserLabel}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {activePaseSessions.length > 1 && (
            <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-xl border border-amber-400/30">
              {activePaseSessions.length} operadores en Toma/Pase
            </span>
          )}
        </div>
      </div>

      {/* Notificaciones */}
      {notification && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
          notification.type === 'success' 
            ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300' 
            : 'bg-rose-500/15 border border-rose-500/40 text-rose-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-[#12161f] border border-white/10 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Ubicación Escribible con Autocompletado */}
          <div className="relative" ref={ubiContainerRef}>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Buscar o Escribir Ubicación (Rack)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Escribe ubicación (ej. G-14-1, A-1)..."
                value={ubicacionInput}
                onChange={(e) => {
                  setUbicacionInput(e.target.value);
                  setShowUbiDropdown(true);
                }}
                onFocus={() => setShowUbiDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSelectUbicacion(ubicacionInput.trim());
                  }
                }}
                className="w-full bg-[#0d1017] border border-white/15 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400 uppercase font-mono"
              />
              <MapPin className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-2.5" />
            </div>

            {showUbiDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#0d1017] border border-amber-500/30 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-40 custom-scrollbar">
                <div 
                  onClick={() => handleSelectUbicacion('')}
                  className="px-3 py-2 text-xs text-gray-400 hover:bg-white/5 cursor-pointer font-bold border-b border-white/5"
                >
                  Todas las Ubicaciones ({ubicacionesList.length})
                </div>
                {ubicacionesFiltradas.length > 0 ? (
                  ubicacionesFiltradas.slice(0, 40).map((ubi, i) => (
                    <div
                      key={i}
                      onClick={() => handleSelectUbicacion(ubi)}
                      className={`px-3 py-1.5 text-xs font-mono cursor-pointer transition-colors flex items-center justify-between ${
                        selectedUbicacion === ubi 
                          ? 'bg-amber-500/20 text-amber-300 font-bold' 
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <span>{ubi}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-500">Sin coincidencias</div>
                )}
              </div>
            )}
          </div>

          {/* Buscador Global Inteligente de Código / Ítem */}
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Escanear Pistola o Escribir Código / Ítem (Búsqueda Global)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Escanea o escribe el código y presiona Enter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && ejecutarBusqueda()}
                  className="w-full bg-[#0d1017] border border-white/15 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-400 font-mono"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>
              <button
                onClick={() => ejecutarBusqueda()}
                disabled={searching}
                className="px-5 py-2 bg-amber-500 text-black font-black text-xs rounded-xl hover:bg-amber-400 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${searching ? 'animate-spin' : ''}`} />
                <span>{searching ? 'Cargando...' : 'Buscar'}</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Grid: Lista Izquierda | Formulario Derecho */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LADO IZQUIERDO: Artículos de la Ubicación */}
        <div className="lg:col-span-5 bg-[#12161f] border border-white/10 rounded-2xl p-4 flex flex-col max-h-[750px]">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10 mb-2">
            <span className="text-xs font-black uppercase text-white tracking-wider">
              Artículos en Ubicación ({itemsList.length})
            </span>

            <div className="flex items-center gap-2">
              {selectedUbicacion && (
                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-mono border border-amber-500/30">
                  {selectedUbicacion}
                </span>
              )}

              {itemsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  title={`Imprimir listado de ${selectedUbicacion || 'la ubicación seleccionada'}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#00f2fe]/15 hover:bg-[#00f2fe] text-[#00f2fe] hover:text-[#0b0e14] border border-[#00f2fe]/40 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <Printer className="w-3 h-3" />
                  <span>Imprimir</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto space-y-2 flex-1 custom-scrollbar pr-1">
            {itemsList.length > 0 ? (
              itemsList.map((it) => {
                const bal = ((Number(it.colE_Newsoft) || 0) - (Number(it.colG_Salida) || 0)) + (Number(it.colN_Nave7) || 0);
                const dif = bal - (Number(it.colD_NetSuite) || 0);

                return (
                  <div
                    key={it.rowNumber}
                    onClick={() => seleccionarItemParaEditar(it)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedItem?.rowNumber === it.rowNumber
                        ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                        : 'bg-[#0d1017] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-1 truncate pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">{it.colB_Codigo}</span>
                        <span className="text-[11px] text-gray-300 font-medium truncate">{it.colC_Item}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        <span>NS: <strong className="text-white">{it.colD_NetSuite}</strong></span>
                        <span>Bal. Newsoft: <strong className="text-cyan-300">{bal}</strong></span>
                        {(Number(it.colN_Nave7) || 0) > 0 && (
                          <span>N7: <strong className="text-purple-400">+{it.colN_Nave7}</strong></span>
                        )}
                        <span>DIF: <strong className={dif === 0 ? 'text-emerald-400' : 'text-rose-400'}>{dif}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {it.colA_Validado && (
                        <span className="p-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400" title="Validado (Col A)">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {it.colI_Candado && (
                        <span className="p-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-400" title="Candado Bloqueado (Col I)">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 text-gray-500 text-xs">
                Selecciona una ubicación arriba o usa el escáner global para cargar los artículos.
              </div>
            )}
          </div>
        </div>

        {/* LADO DERECHO: Formulario de Conteo con Botón X de Cierre y Calculadora */}
        <div className="lg:col-span-7 relative">
          {selectedItem ? (
            <div className="bg-[#12161f] border border-amber-500/30 rounded-2xl p-4 shadow-xl space-y-4">
              
              {/* Barra Superior con Estatus y Botón X de Cierre */}
              <div className="flex items-center justify-between gap-2">
                {isLocked ? (
                  <div className="flex-1 p-2.5 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>Registro Bloqueado (Col A & I activas). Campos protegidos.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPinModal(true)}
                      className="px-3 py-1 bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-rose-600 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Desbloquear con PIN</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-400 text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <Unlock className="w-4 h-4" />
                      <span>{isUnlockedByPin ? 'Desbloqueado temporalmente con PIN' : 'Modo Edición Abierto'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCalculator(!showCalculator)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          showCalculator 
                            ? 'bg-[#00f2fe] text-black border-[#00f2fe]' 
                            : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <CalcIcon className="w-3.5 h-3.5" />
                        <span>Calculadora</span>
                      </button>
                      <span className="text-[10px] text-gray-400 font-normal">Fila #{selectedItem.rowNumber}</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCerrarFormulario}
                  title="Cerrar Formulario"
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Popup Mini Calculadora */}
              {showCalculator && (
                <div className="bg-[#0b0e14] border border-[#00f2fe]/40 rounded-xl p-3 shadow-2xl max-w-xs ml-auto space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold border-b border-white/10 pb-1">
                    <span>Calculadora Auxiliar</span>
                    <button type="button" onClick={() => setShowCalculator(false)} className="hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="bg-[#12161f] border border-white/10 rounded-lg p-2 text-right font-mono text-base font-bold text-[#00f2fe] overflow-x-auto min-h-[36px]">
                    {calcDisplay || '0'}
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                    {['7','8','9','/','4','5','6','*','1','2','3','-','C','0','=','+'].map((btn) => (
                      <button
                        key={btn}
                        type="button"
                        onClick={() => handleCalcBtn(btn)}
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${
                          btn === '=' 
                            ? 'bg-emerald-500 text-black font-black col-span-1' 
                            : btn === 'C' 
                            ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30' 
                            : ['+','-','*','/'].includes(btn)
                            ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                            : 'bg-white/5 text-white hover:bg-white/10'
                        }`}
                      >
                        {btn}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Casillas Col A y Col I (Candado) */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#0d1017] rounded-xl border border-white/10">
                <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isLocked}
                    checked={colA}
                    onChange={(e) => setColA(e.target.checked)}
                    className="w-4 h-4 accent-[#00f2fe] rounded cursor-pointer"
                  />
                  <span>Col A: Validado</span>
                </label>

                <div>
                  <label className={`flex items-center gap-2 text-xs font-bold ${
                    cuadranCantidades ? 'text-white cursor-pointer' : 'text-gray-500 cursor-not-allowed opacity-50'
                  }`}>
                    <input
                      type="checkbox"
                      disabled={isLocked || !cuadranCantidades}
                      checked={colI}
                      onChange={(e) => {
                        if (!cuadranCantidades && e.target.checked) return;
                        setColI(e.target.checked);
                      }}
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                    <span>Col I: Candado Bloqueo</span>
                  </label>
                  {!cuadranCantidades && (
                    <span className="text-[10px] text-rose-400 flex items-center gap-1 mt-1 font-semibold">
                      <ShieldAlert className="w-3 h-3 shrink-0" />
                      Requiere que Total Balance Newsoft cuadre con NetSuite para cerrar candado.
                    </span>
                  )}
                </div>
              </div>

              {/* Códigos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Col B: Código Componente</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={colB}
                    onChange={(e) => setColB(e.target.value)}
                    className="w-full bg-[#0d1017] border border-white/10 rounded-xl p-2 text-xs text-white font-mono disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Col C: Ítems NT/NS</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={colC}
                    onChange={(e) => setColC(e.target.value)}
                    className="w-full bg-[#0d1017] border border-white/10 rounded-xl p-2 text-xs text-white disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase">NetSuite (D)</label>
                  <input
                    type="number"
                    disabled={isLocked}
                    value={colD}
                    onChange={(e) => setColD(e.target.value)}
                    className="w-full bg-[#0d1017] border border-indigo-500/40 rounded-xl p-2.5 text-xs text-center font-bold text-white outline-none focus:border-indigo-400 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-amber-400 uppercase">Almacén (E)</label>
                  <input
                    type="number"
                    disabled={isLocked}
                    value={colE}
                    onChange={(e) => setColE(e.target.value)}
                    className="w-full bg-[#0d1017] border border-amber-500/40 rounded-xl p-2.5 text-xs text-center font-bold text-white outline-none focus:border-amber-400 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-rose-400 uppercase">Salida (G)</label>
                  <input
                    type="number"
                    disabled={isLocked}
                    value={colG}
                    onChange={(e) => setColG(e.target.value)}
                    className="w-full bg-[#0d1017] border border-rose-500/40 rounded-xl p-2.5 text-xs text-center font-bold text-white outline-none focus:border-rose-400 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-purple-400 uppercase">Nave 7 (N)</label>
                  <input
                    type="number"
                    disabled={isLocked}
                    value={colN}
                    onChange={(e) => setColN(e.target.value)}
                    className="w-full bg-[#0d1017] border border-purple-500/40 rounded-xl p-2.5 text-xs text-center font-bold text-white outline-none focus:border-purple-400 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-cyan-400 uppercase truncate block text-center" title="Total Balance Disponible Newsoft ((E - G) + N)">
                    Tot. Bal. Newsoft
                  </label>
                  <div className="w-full bg-[#0d1017] border border-cyan-500/40 rounded-xl p-2.5 text-xs text-center font-black text-cyan-300">
                    {totalBalanceNewsoft}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00f2fe] uppercase flex items-center justify-center gap-1">
                    <CalcIcon className="w-3 h-3" /> DIF (F)
                  </label>
                  <div className={`w-full rounded-xl p-2.5 text-xs text-center font-black border ${
                    cuadranCantidades 
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' 
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                  }`}>
                    {diferenciaCalculada}
                  </div>
                </div>

              </div>

              {/* Ubicación (Col H) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> Col H: Ubicación
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={colH}
                  onChange={(e) => setColH(e.target.value)}
                  className="w-full bg-[#0d1017] border border-white/10 rounded-xl p-2 text-xs text-white font-mono uppercase disabled:opacity-50"
                />
              </div>

              {/* Col L: Comentarios */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Col L: Comentarios</label>
                <textarea
                  rows={2}
                  disabled={isLocked}
                  value={colL}
                  onChange={(e) => setColL(e.target.value)}
                  placeholder="Observaciones de conteo o discrepancias..."
                  className="w-full bg-[#0d1017] border border-white/10 rounded-xl p-2 text-xs text-white disabled:opacity-50 custom-scrollbar"
                />
              </div>

              {/* Botonera */}
              <div className="pt-3 flex flex-wrap justify-between items-center gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCerrarFormulario}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {!cuadranCantidades && (
                    <button
                      type="button"
                      onClick={handleSendSlackAlert}
                      disabled={sendingSlack}
                      title="Reportar este descuadre en el canal #alerta-inventario-nave-6 de Slack y mover a Revisión"
                      className="px-5 py-2.5 rounded-xl bg-[#4A154B] hover:bg-[#611f69] text-purple-100 border border-purple-400/40 font-black text-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {sendingSlack ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-300" />
                      )}
                      <span>{sendingSlack ? 'Enviando a Slack...' : 'Reportar Descuadre a Slack'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || isLocked}
                    className="px-7 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Guardando en Sheets...' : 'Confirmar & Guardar Conteo'}</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-[#12161f] border border-white/10 rounded-2xl p-16 text-center text-gray-500 space-y-2">
              <Layers className="w-12 h-12 mx-auto opacity-20" />
              <p className="text-sm font-bold text-gray-400">Ningún artículo en edición</p>
              <p className="text-xs text-gray-500">
                Selecciona cualquier artículo del listado izquierdo para abrir el formulario de conteo.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Modal de Selección de Qué Imprimir en la Localidad */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#12161f] border border-[#00f2fe]/40 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-[0_0_30px_rgba(0,242,254,0.25)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2 text-[#00f2fe] font-black text-xs uppercase tracking-wider">
                <Printer className="w-4 h-4" />
                <span>Imprimir Localidad {selectedUbicacion || ''}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              ¿Qué artículos de la ubicación <strong className="text-amber-400 font-mono">{selectedUbicacion || 'seleccionada'}</strong> deseas incluir en la hoja de impresión?
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handlePrintUbicacion('PENDIENTE_VALIDAR')}
                disabled={faltanValidarList.length === 0}
                className="w-full p-3 rounded-xl bg-[#0d1017] hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-400/50 flex items-center justify-between text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div>
                  <div className="text-xs font-black text-white">Faltan por Validar (Col A)</div>
                  <div className="text-[11px] text-gray-400">Artículos que aún no tienen el check de validación</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-black text-xs">
                  {faltanValidarList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintUbicacion('PENDIENTE_CERRAR')}
                disabled={faltanCerrarList.length === 0}
                className="w-full p-3 rounded-xl bg-[#0d1017] hover:bg-amber-500/15 border border-white/10 hover:border-amber-400/50 flex items-center justify-between text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div>
                  <div className="text-xs font-black text-white">Faltan por Cerrar Candado (Col I)</div>
                  <div className="text-[11px] text-gray-400">Artículos cuyo candado aún sigue abierto</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-black text-xs">
                  {faltanCerrarList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintUbicacion('ALL')}
                className="w-full p-3 rounded-xl bg-[#0d1017] hover:bg-[#00f2fe]/15 border border-white/10 hover:border-[#00f2fe]/50 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div>
                  <div className="text-xs font-black text-white">Todos los Artículos</div>
                  <div className="text-[11px] text-gray-400">Listado completo de la ubicación seleccionada</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#00f2fe]/20 text-[#00f2fe] font-mono font-black text-xs">
                  {itemsList.length}
                </span>
              </button>
            </div>

            <div className="pt-1 text-right">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-gray-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Emergente de Solicitud de PIN */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#12161f] border border-rose-500/50 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <KeyRound className="w-4 h-4" />
                <span>Desbloquear Candado</span>
              </div>
              <button onClick={() => setShowPinModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Introduce el PIN de 6 dígitos para desbloquear este registro:
            </p>

            <input
              type="password"
              maxLength={6}
              autoFocus
              placeholder="••••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleValidatePin()}
              className="w-full bg-[#0d1017] border border-rose-500/40 rounded-xl p-2.5 text-center text-lg tracking-[8px] text-white outline-none font-mono"
            />

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleValidatePin}
                className="w-full py-2 bg-rose-500 text-white font-bold rounded-xl text-xs hover:bg-rose-600 cursor-pointer"
              >
                Confirmar PIN
              </button>
              
              <button
                type="button"
                onClick={handleRequestPinByEmail}
                disabled={sendingPinEmail}
                className="text-[11px] text-gray-400 hover:text-[#00f2fe] flex items-center justify-center gap-1 py-1 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>{sendingPinEmail ? 'Enviando...' : '¿Olvidaste la clave? Enviar a mi correo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
