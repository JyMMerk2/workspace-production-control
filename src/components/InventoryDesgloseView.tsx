import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp,
  ChevronDown,
  Lock, 
  Unlock,
  ExternalLink, 
  X,
  KeyRound,
  AlertCircle,
  ShieldCheck,
  Edit2,
  AlertTriangle,
  Download,
  Send,
  Users,
  Plus,
  Archive,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { supabase } from '../data/supabaseClient';

interface SheetRowItem {
  rowNumber: number;
  validado: boolean;
  candado: boolean;
  digitado: boolean;
  enRevision: boolean;
  codigo: string;
  item: string;
  ns: number;
  almacen: number;
  salida: number;
  nave7: number;
  newsoft: number;
  dif: string | number;
  ubicacion: string;
  comentario: string;
}

interface ArchivedZeroItem {
  trashRowNumber: number;
  filaOriginal: number;
  codigo: string;
  item: string;
  ns: number;
  almacen: number;
  ubicacion: string;
  comentario: string;
  eliminadoPor: string;
  fechaEliminacion: string;
}

interface DigitadoMeta {
  usuario: string;
  fechaHora: string;
  timestamp: number;
}

export interface Nave6ActivityEvent {
  id: string;
  usuario: string;
  accion: 'VALIDADO' | 'CERRADO' | 'DIGITADO' | 'EDICION' | 'SLACK';
  codigo: string;
  item: string;
  ubicacion: string;
  cantidad: number;
  fecha: string;
  timestamp: number;
}

interface InventoryDesgloseViewProps {
  authenticatedUser?: string | null;
}

interface LoteActivo {
  id: string;
  usuario: string;
  lote: string;
  hora: string;
  timestamp: number;
}

interface UserColorTheme {
  chipBg: string;
  chipBorder: string;
  chipText: string;
  dotBg: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

const USER_COLOR_PALETTE: UserColorTheme[] = [
  {
    chipBg: 'bg-cyan-500/15',
    chipBorder: 'border-cyan-400/50',
    chipText: 'text-cyan-300',
    dotBg: 'bg-cyan-400',
    badgeBg: 'bg-cyan-500/20',
    badgeBorder: 'border-cyan-400/60',
    badgeText: 'text-cyan-200'
  },
  {
    chipBg: 'bg-pink-500/15',
    chipBorder: 'border-pink-400/50',
    chipText: 'text-pink-300',
    dotBg: 'bg-pink-400',
    badgeBg: 'bg-pink-500/20',
    badgeBorder: 'border-pink-400/60',
    badgeText: 'text-pink-200'
  },
  {
    chipBg: 'bg-amber-500/15',
    chipBorder: 'border-amber-400/50',
    chipText: 'text-amber-300',
    dotBg: 'bg-amber-400',
    badgeBg: 'bg-amber-500/20',
    badgeBorder: 'border-amber-400/60',
    badgeText: 'text-amber-200'
  },
  {
    chipBg: 'bg-purple-500/15',
    chipBorder: 'border-purple-400/50',
    chipText: 'text-purple-300',
    dotBg: 'bg-purple-400',
    badgeBg: 'bg-purple-500/20',
    badgeBorder: 'border-purple-400/60',
    badgeText: 'text-purple-200'
  },
  {
    chipBg: 'bg-emerald-500/15',
    chipBorder: 'border-emerald-400/50',
    chipText: 'text-emerald-300',
    dotBg: 'bg-emerald-400',
    badgeBg: 'bg-emerald-500/20',
    badgeBorder: 'border-emerald-400/60',
    badgeText: 'text-emerald-200'
  },
  {
    chipBg: 'bg-orange-500/15',
    chipBorder: 'border-orange-400/50',
    chipText: 'text-orange-300',
    dotBg: 'bg-orange-400',
    badgeBg: 'bg-orange-500/20',
    badgeBorder: 'border-orange-400/60',
    badgeText: 'text-orange-200'
  },
  {
    chipBg: 'bg-sky-500/15',
    chipBorder: 'border-sky-400/50',
    chipText: 'text-sky-300',
    dotBg: 'bg-sky-400',
    badgeBg: 'bg-sky-500/20',
    badgeBorder: 'border-sky-400/60',
    badgeText: 'text-sky-200'
  },
  {
    chipBg: 'bg-lime-500/15',
    chipBorder: 'border-lime-400/50',
    chipText: 'text-lime-300',
    dotBg: 'bg-lime-400',
    badgeBg: 'bg-lime-500/20',
    badgeBorder: 'border-lime-400/60',
    badgeText: 'text-lime-200'
  },
  {
    chipBg: 'bg-rose-500/15',
    chipBorder: 'border-rose-400/50',
    chipText: 'text-rose-300',
    dotBg: 'bg-rose-400',
    badgeBg: 'bg-rose-500/20',
    badgeBorder: 'border-rose-400/60',
    badgeText: 'text-rose-200'
  },
  {
    chipBg: 'bg-indigo-500/15',
    chipBorder: 'border-indigo-400/50',
    chipText: 'text-indigo-300',
    dotBg: 'bg-indigo-400',
    badgeBg: 'bg-indigo-500/20',
    badgeBorder: 'border-indigo-400/60',
    badgeText: 'text-indigo-200'
  }
];

function getInitials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Extraer cantidad numérica y ubicación opcional (ej. "14", "Cant. 12 A-11", "12 B-7-2")
function parseLoteTarget(loteText: string): { qty: number | null; locationFilter: string | null } {
  const clean = loteText.trim().toUpperCase();
  if (!clean) return { qty: null, locationFilter: null };

  const locMatch = clean.match(/\b([A-Z]{1,3}-\d+(?:-\d+)?)\b/);
  const locationFilter = locMatch ? locMatch[1] : null;

  const sinUbicacion = locationFilter ? clean.replace(locationFilter, ' ') : clean;
  const numMatch = sinUbicacion.match(/(?:^|\s|[:=#])(-?\d+(?:\.\d+)?)(?:\s|$)/);

  if (numMatch) {
    const parsed = parseFloat(numMatch[1]);
    return { qty: isNaN(parsed) ? null : parsed, locationFilter };
  }

  return { qty: null, locationFilter };
}

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwEDMJffjkXLYTPnYpQA3jC51KmyDb8TtNG3haEGv5lYvbzZAMjaAI3Xmy3BF5SQCkL/exec';
const MASTER_PIN = '030621';
const DIGITADO_META_CACHE_KEY = 'nave6_digitado_meta_v1';
const ACTIVITY_LOG_CACHE_KEY = 'nave6_season_activity_v1';
const LOTES_CACHE_KEY = 'nave6_lotes_activos_cache_v1';
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

// Parser CSV que respeta saltos de línea dentro de comillas (mantiene el rowNumber 100% exacto)
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

// Cliente híbrido para actualizar celdas, mover ítems en 0 o enviar alertas en Google Apps Script sin problemas de CORS
async function updateSheetRowGAS(params: Record<string, string>): Promise<any> {
  const query = new URLSearchParams(params).toString();
  const url = `${APPS_SCRIPT_URL}?${query}`;

  try {
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch {
    // Fallback a JSONP
  }

  return new Promise((resolve, reject) => {
    const cb = 'gas_desg_cb_' + Math.round(100000 * Math.random());
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
      reject(new Error('No se pudo conectar con Google Apps Script.'));
    };
    document.body.appendChild(script);
  });
}

export const InventoryDesgloseView: React.FC<InventoryDesgloseViewProps> = ({
  authenticatedUser,
}) => {
  const [items, setItems] = useState<SheetRowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>('');
  const [updatingRow, setUpdatingRow] = useState<number | null>(null);
  const [updatingDigitadoRow, setUpdatingDigitadoRow] = useState<number | null>(null);
  const [sendingSlackRow, setSendingSlackRow] = useState<number | null>(null);
  const [archivingZeroRows, setArchivingZeroRows] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Metadatos en vivo de quién y a qué hora marcó cada fila como Digitado (Col O)
  const [digitadoMetaMap, setDigitadoMetaMap] = useState<Record<string, DigitadoMeta>>(() => {
    try {
      const saved = localStorage.getItem(DIGITADO_META_CACHE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignorar
    }
    return {};
  });

  // Control Colaborativo de Lotes Activos en Tiempo Real
  const [lotesActivos, setLotesActivos] = useState<LoteActivo[]>(() => {
    try {
      const saved = localStorage.getItem(LOTES_CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignorar
    }
    return [];
  });
  const [operadorNombre, setOperadorNombre] = useState<string>(() => {
    try {
      return authenticatedUser || localStorage.getItem('nave6_operador_lote') || '';
    } catch {
      return authenticatedUser || '';
    }
  });
  const [loteInput, setLoteInput] = useState<string>('');
  const [claimingLote, setClaimingLote] = useState<boolean>(false);
  const [releasingLoteId, setReleasingLoteId] = useState<string | null>(null);

  useEffect(() => {
    if (authenticatedUser && !operadorNombre) {
      setOperadorNombre(authenticatedUser);
    }
  }, [authenticatedUser, operadorNombre]);

  const activeUserLabel = (authenticatedUser || operadorNombre || 'OPERADOR').trim().toUpperCase();

  // Navegación rápida entre coincidencias de lotes activos (flechas ▲ / ▼)
  const [activeMatchIndices, setActiveMatchIndices] = useState<Record<string, number>>({});
  const [highlightedRowNum, setHighlightedRowNum] = useState<number | null>(null);
  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

  // Estados para edición en línea de Cantidad NetSuite (Col D)
  const [editingNsRow, setEditingNsRow] = useState<number | null>(null);
  const [editingNsValue, setEditingNsValue] = useState<string>('');

  // Estados para edición en línea de Cantidad Inventario / Almacén (Col E)
  const [editingAlmacenRow, setEditingAlmacenRow] = useState<number | null>(null);
  const [editingAlmacenValue, setEditingAlmacenValue] = useState<string>('');

  // Estados para edición en línea de Salidas (Col G)
  const [editingSalidaRow, setEditingSalidaRow] = useState<number | null>(null);
  const [editingSalidaValue, setEditingSalidaValue] = useState<string>('');

  // Estados para edición en línea de Nave 7 (Col N)
  const [editingNave7Row, setEditingNave7Row] = useState<number | null>(null);
  const [editingNave7Value, setEditingNave7Value] = useState<string>('');

  // Estados para edición en línea de Ubicación (Col H)
  const [editingUbicacionRow, setEditingUbicacionRow] = useState<number | null>(null);
  const [editingUbicacionValue, setEditingUbicacionValue] = useState<string>('');

  // Estados para edición en línea de Comentarios (Col L)
  const [editingCommentRow, setEditingCommentRow] = useState<number | null>(null);
  const [editingCommentValue, setEditingCommentValue] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDIENTE' | 'OK' | 'REVISION' | 'CERRADO' | 'NAVE7' | 'ENCERO'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [inputPage, setInputPage] = useState('1');

  // Modal PIN 1501 para abrir Google Sheets
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Modal PIN 030621 para desbloquear un registro Cerrado
  const [unlockTargetRow, setUnlockTargetRow] = useState<SheetRowItem | null>(null);
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [unlockPinError, setUnlockPinError] = useState(false);

  // Modal de confirmación + PIN 030621 para mover artículos en 0 a "ELIMINADOS EN 0"
  const [archiveZeroTargets, setArchiveZeroTargets] = useState<SheetRowItem[] | null>(null);
  const [archiveZeroPinInput, setArchiveZeroPinInput] = useState('');
  const [archiveZeroPinError, setArchiveZeroPinError] = useState(false);

  // Estados de la Papelera ("ELIMINADOS EN 0")
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [trashItems, setTrashItems] = useState<ArchivedZeroItem[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [trashSearchTerm, setTrashSearchTerm] = useState('');
  const [restoringTrashItem, setRestoringTrashItem] = useState<ArchivedZeroItem | null>(null);
  const [restorePinInput, setRestorePinInput] = useState('');
  const [restorePinError, setRestorePinError] = useState(false);
  const [restoringInProgress, setRestoringInProgress] = useState(false);

  // Controles de concurrencia para evitar solapamiento de red o interrumpir ediciones activas
  const isFetchingRef = useRef(false);
  const isFetchingLotesRef = useRef(false);
  const isBusyRef = useRef(false);

  useEffect(() => {
    isBusyRef.current = Boolean(
      editingNsRow !== null ||
      editingAlmacenRow !== null ||
      editingSalidaRow !== null ||
      editingNave7Row !== null ||
      editingUbicacionRow !== null ||
      editingCommentRow !== null ||
      updatingRow !== null ||
      updatingDigitadoRow !== null ||
      sendingSlackRow !== null ||
      archivingZeroRows ||
      unlockTargetRow !== null ||
      archiveZeroTargets !== null ||
      restoringInProgress
    );
  }, [
    editingNsRow,
    editingAlmacenRow,
    editingSalidaRow,
    editingNave7Row,
    editingUbicacionRow,
    editingCommentRow,
    updatingRow,
    updatingDigitadoRow,
    sendingSlackRow,
    archivingZeroRows,
    unlockTargetRow,
    archiveZeroTargets,
    restoringInProgress
  ]);

  const GOOGLE_SHEETS_URL =
    'https://docs.google.com/spreadsheets/d/1g5SoP8q1u7n05v0tABvwf2e6UPClSMM8b2ah_1-9A3M/edit?gid=1178501683#gid=1178501683';
  const CSV_URL =
    'https://docs.google.com/spreadsheets/d/1g5SoP8q1u7n05v0tABvwf2e6UPClSMM8b2ah_1-9A3M/export?format=csv&gid=1178501683';

  // Registrar evento de actividad del operador para los KPI de temporada (desde 13 nov 2026)
  const recordOperatorActivity = useCallback(
    async (
      accion: Nave6ActivityEvent['accion'],
      row: SheetRowItem,
      cantidadOverride?: number
    ) => {
      const nuevoEvento: Nave6ActivityEvent = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        usuario: activeUserLabel,
        accion,
        codigo: row.codigo,
        item: row.item,
        ubicacion: row.ubicacion,
        cantidad: cantidadOverride !== undefined ? cantidadOverride : Number(row.newsoft) || 0,
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

      // Notificar al instante (0ms) a la ventana de KPI por Usuario
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

  // Cargar registros de la Papelera ("ELIMINADOS EN 0")
  const fetchTrashItems = useCallback(async (silent = false) => {
    if (!silent) setLoadingTrash(true);
    try {
      const res = await updateSheetRowGAS({ action: 'GET_ARCHIVED_ZERO' });
      if (res && res.success && Array.isArray(res.items)) {
        setTrashItems(res.items);
      }
    } catch {
      // Silencioso
    } finally {
      if (!silent) setLoadingTrash(false);
    }
  }, []);

  const handleOpenTrashModal = () => {
    setIsTrashModalOpen(true);
    setTrashSearchTerm('');
    setRestoringTrashItem(null);
    setRestorePinInput('');
    setRestorePinError(false);
    fetchTrashItems(false);
  };

  // Cargar y sincronizar metadatos de Digitado (quién y cuándo lo marcó) vía Supabase
  const loadDigitadoMeta = useCallback(async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('boombah_announcements')
        .select('message')
        .eq('id', 'global_nave6_digitado_meta')
        .maybeSingle();

      if (!error && data?.message) {
        const parsed = JSON.parse(data.message);
        if (parsed && typeof parsed === 'object') {
          setDigitadoMetaMap(parsed);
          localStorage.setItem(DIGITADO_META_CACHE_KEY, JSON.stringify(parsed));
        }
      }
    } catch {
      // Mantener caché local
    }
  }, []);

  useEffect(() => {
    loadDigitadoMeta();
    const interval = setInterval(loadDigitadoMeta, 8000);
    return () => clearInterval(interval);
  }, [loadDigitadoMeta]);

  const persistDigitadoMeta = async (nextMap: Record<string, DigitadoMeta>) => {
    setDigitadoMetaMap(nextMap);
    try {
      localStorage.setItem(DIGITADO_META_CACHE_KEY, JSON.stringify(nextMap));
    } catch {
      // Ignorar
    }
    try {
      if (supabase) {
        await supabase.from('boombah_announcements').upsert({
          id: 'global_nave6_digitado_meta',
          message: JSON.stringify(nextMap),
          active: true,
          priority: 'AVISO',
          updated_by: activeUserLabel,
          updated_at: new Date().toISOString(),
        });
      }
    } catch {
      // Silencioso
    }
  };

  // Marcar / Desmarcar Columna O (DIGITADO NEWSOFT) sin afectar ninguna lógica actual
  const handleToggleDigitado = async (row: SheetRowItem) => {
    const nuevoEstado = !row.digitado;
    const fechaHora = new Date().toLocaleString('es-DO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    setUpdatingDigitadoRow(row.rowNumber);
    setNotification(null);

    setItems((prev) =>
      prev.map((it) =>
        it.rowNumber === row.rowNumber ? { ...it, digitado: nuevoEstado } : it
      )
    );

    const nextMetaMap = { ...digitadoMetaMap };
    const metaKey = `${row.rowNumber}_${row.codigo}`;
    if (nuevoEstado) {
      nextMetaMap[metaKey] = {
        usuario: activeUserLabel,
        fechaHora,
        timestamp: Date.now(),
      };
    } else {
      delete nextMetaMap[metaKey];
    }
    persistDigitadoMeta(nextMetaMap);

    try {
      const res = await updateSheetRowGAS({
        action: 'TOGGLE_DIGITADO',
        payload: JSON.stringify({
          rowNumber: row.rowNumber,
          codigo: row.codigo,
          digitado: nuevoEstado,
          usuario: activeUserLabel,
        }),
      });

      if (res && res.success) {
        if (nuevoEstado) {
          recordOperatorActivity('DIGITADO', row);
        }
      } else {
        setItems((prev) =>
          prev.map((it) =>
            it.rowNumber === row.rowNumber ? { ...it, digitado: !nuevoEstado } : it
          )
        );
        setNotification({
          type: 'error',
          text: res?.error || 'No se pudo actualizar Digitado (Col O) en Google Sheets.',
        });
      }
    } catch (err: any) {
      setItems((prev) =>
        prev.map((it) =>
          it.rowNumber === row.rowNumber ? { ...it, digitado: !nuevoEstado } : it
        )
      );
      setNotification({ type: 'error', text: 'Error de conexión: ' + err.message });
    } finally {
      setUpdatingDigitadoRow(null);
    }
  };

  // Asignación consistente de un color distinto por cada usuario activo + conteo y filas coincidentes en Validados OK
  const parsedLotesActivos = useMemo(() => {
    const userColorMap = new Map<string, UserColorTheme>();
    let colorIdx = 0;

    return lotesActivos.map((itemLote) => {
      const userKey = itemLote.usuario.trim().toLowerCase();
      let theme = userColorMap.get(userKey);
      if (!theme) {
        theme = USER_COLOR_PALETTE[colorIdx % USER_COLOR_PALETTE.length];
        userColorMap.set(userKey, theme);
        colorIdx++;
      }

      const { qty, locationFilter } = parseLoteTarget(itemLote.lote);

      const matchedRows: SheetRowItem[] = [];
      if (qty !== null) {
        for (const row of items) {
          if (!row.validado || row.candado || row.enRevision) continue;
          if (Number(row.newsoft) !== qty) continue;

          if (locationFilter) {
            const rowUbi = row.ubicacion.trim().toUpperCase();
            if (rowUbi !== locationFilter && !rowUbi.startsWith(`${locationFilter}-`)) {
              continue;
            }
          }
          matchedRows.push(row);
        }
      }

      return {
        ...itemLote,
        theme,
        initials: getInitials(itemLote.usuario),
        targetQty: qty,
        targetLocation: locationFilter,
        matchedRows,
        matchCount: matchedRows.length
      };
    });
  }, [lotesActivos, items]);

  // Buscar si una fila abierta coincide con el lote activo del operador de la sesión actual
  const getMatchLoteForRow = useCallback(
    (row: SheetRowItem) => {
      if (row.validado && row.candado) return null;

      const sesionActiva = operadorNombre.trim().toLowerCase();
      if (!sesionActiva) return null;

      const rowUbi = row.ubicacion.trim().toUpperCase();

      for (const lote of parsedLotesActivos) {
        if (lote.usuario.trim().toLowerCase() !== sesionActiva) continue;

        if (lote.targetQty === null) continue;
        if (Number(row.newsoft) !== lote.targetQty) continue;

        if (lote.targetLocation) {
          if (
            rowUbi !== lote.targetLocation &&
            !rowUbi.startsWith(`${lote.targetLocation}-`)
          ) {
            continue;
          }
        }

        return lote;
      }

      return null;
    },
    [parsedLotesActivos, operadorNombre]
  );

  // Sincronizar lotes en caché local y emitir al instante a otras pestañas
  const syncLotesToLocalAndBroadcast = useCallback((nextLotes: LoteActivo[]) => {
    setLotesActivos(nextLotes);
    try {
      localStorage.setItem(LOTES_CACHE_KEY, JSON.stringify(nextLotes));
    } catch {
      // Ignorar
    }
    broadcastSyncMessage({ type: 'LOTES_UPDATED', lotes: nextLotes });
  }, []);

  // Consultar lotes activos de los compañeros en tiempo real
  const fetchLotesActivos = useCallback(async () => {
    if (isFetchingLotesRef.current || claimingLote || releasingLoteId !== null) return;
    isFetchingLotesRef.current = true;
    try {
      const res = await updateSheetRowGAS({ action: 'GET_LOTES' });
      if (res && res.success && Array.isArray(res.lotes)) {
        syncLotesToLocalAndBroadcast(res.lotes);
      }
    } catch {
      // Silencioso en segundo plano
    } finally {
      isFetchingLotesRef.current = false;
    }
  }, [claimingLote, releasingLoteId, syncLotesToLocalAndBroadcast]);

  // Registrar un nuevo lote/grupo tomado por el operador
  const handleClaimLote = async () => {
    const user = operadorNombre.trim();
    const lote = loteInput.trim();

    if (!user || !lote) {
      setNotification({
        type: 'error',
        text: 'Escribe tu nombre y el grupo o cantidad fija que vas a trabajar.'
      });
      return;
    }

    try {
      localStorage.setItem('nave6_operador_lote', user);
    } catch {
      // Ignorar si localStorage no está disponible
    }

    setClaimingLote(true);
    setNotification(null);

    try {
      const res = await updateSheetRowGAS({
        action: 'CLAIM_LOTE',
        usuario: user,
        lote: lote
      });

      if (res && res.success && Array.isArray(res.lotes)) {
        syncLotesToLocalAndBroadcast(res.lotes);
        setLoteInput('');
      } else {
        setNotification({
          type: 'error',
          text: res?.error || 'No se pudo registrar el lote.'
        });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error al registrar lote: ' + err.message });
    } finally {
      setClaimingLote(false);
    }
  };

  // Liberar un lote cuando el compañero termina su grupo
  const handleReleaseLote = async (id: string) => {
    setReleasingLoteId(id);
    try {
      const res = await updateSheetRowGAS({
        action: 'RELEASE_LOTE',
        id
      });
      if (res && res.success && Array.isArray(res.lotes)) {
        syncLotesToLocalAndBroadcast(res.lotes);
      }
    } catch {
      // Silencioso
    } finally {
      setReleasingLoteId(null);
    }
  };

  const fetchSheetData = useCallback(async (silent = false) => {
    if (isFetchingRef.current) return;
    if (silent && (isBusyRef.current || document.hidden)) return;

    isFetchingRef.current = true;
    if (!silent) setLoading(true);

    try {
      const res = await fetch(`${CSV_URL}&t=${Date.now()}`, { cache: 'no-store' });
      const csvText = await res.text();
      const allRows = parseCSVExact(csvText);
      const parsedItems: SheetRowItem[] = [];

      // El índice 3 corresponde exactamente a la fila 4 de Google Sheets
      for (let i = 3; i < allRows.length; i++) {
        const cols = allRows[i];
        if (!cols || cols.length < 3) continue;
        
        const rawValidado = (cols[0] || '').toUpperCase();
        const isValid = rawValidado === 'TRUE' || rawValidado === 'VERDADERO' || rawValidado === 'OK' || rawValidado === '1';

        const rawCandado = (cols[8] || '').toUpperCase();
        const isLocked = rawCandado === 'TRUE' || rawCandado === 'VERDADERO' || rawCandado === 'OK' || rawCandado === '1';

        const rawDigitado = (cols[14] || '').toUpperCase();
        const isDigitado = rawDigitado === 'TRUE' || rawDigitado === 'VERDADERO' || rawDigitado === 'OK' || rawDigitado === '1';

        const codigo = cols[1] || '';
        const itemName = cols[2] || '';
        if (!itemName && !codigo) continue;

        if (codigo.toUpperCase() === 'COMENTARIO' || itemName.toUpperCase() === 'COMENTARIO') continue;

        const nsVal = parseFloat(cols[3]?.replace(/[^0-9.-]+/g, '')) || 0;
        const almacenEVal = parseFloat(cols[4]?.replace(/[^0-9.-]+/g, '')) || 0;
        const salidaGVal = parseFloat(cols[6]?.replace(/[^0-9.-]+/g, '')) || 0;
        const nave7NVal = parseFloat(cols[13]?.replace(/[^0-9.-]+/g, '')) || 0;
        
        const newsoftKVal = parseFloat(cols[10]?.replace(/[^0-9.-]+/g, ''));
        const finalNewsoftVal = !isNaN(newsoftKVal) ? newsoftKVal : ((almacenEVal - salidaGVal) + nave7NVal);

        const difVal = cols[5] !== undefined && cols[5] !== '' ? cols[5] : (finalNewsoftVal - nsVal);
        const ubicacion = cols[7] || cols[6] || '-';
        const comentario = cols[11] || '';

        const enRevision = isValid && !isLocked && /\[REVISIÓN/i.test(comentario);

        parsedItems.push({
          rowNumber: i + 1,
          validado: isValid,
          candado: isLocked,
          digitado: isDigitado,
          enRevision,
          codigo,
          item: itemName,
          ns: nsVal,
          almacen: almacenEVal,
          salida: salidaGVal,
          nave7: nave7NVal,
          newsoft: finalNewsoftVal,
          dif: difVal,
          ubicacion,
          comentario
        });
      }

      if (parsedItems.length > 0 && (!silent || !isBusyRef.current)) {
        setItems(parsedItems);
        setLastSync(new Date().toLocaleTimeString());
      }
    } catch {
      if (!silent) setItems([]);
    } finally {
      isFetchingRef.current = false;
      if (!silent) setLoading(false);
    }
  }, [CSV_URL]);

  // Carga inicial + Sincronización en tiempo real cada 2 segundos
  useEffect(() => {
    fetchSheetData(false);
    fetchLotesActivos();
    fetchTrashItems(true);

    const interval = setInterval(() => {
      fetchSheetData(true);
      if (!document.hidden) fetchLotesActivos();
    }, 2000);

    const onVisibilityChange = () => {
      if (!document.hidden) {
        fetchSheetData(true);
        fetchLotesActivos();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchSheetData, fetchLotesActivos, fetchTrashItems]);

  // Enviar alerta de descuadre directamente al canal #alerta-inventario-nave-6 en Slack y mover a Revisión
  const handleSendSlackAlert = async (row: SheetRowItem) => {
    setSendingSlackRow(row.rowNumber);
    setNotification(null);

    const payload = {
      rowNumber: row.rowNumber,
      codigo: row.codigo,
      item: row.item,
      ubicacion: row.ubicacion,
      ns: row.ns,
      almacen: row.almacen,
      salida: row.salida,
      nave7: row.nave7,
      newsoft: row.newsoft,
      dif: row.dif,
      comentario: row.comentario
    };

    try {
      const res = await updateSheetRowGAS({
        action: 'SEND_SLACK_ALERT',
        payload: JSON.stringify(payload)
      });

      if (res && res.success) {
        const comentarioActualizado =
          res.nuevoComentario ||
          (/\[REVISIÓN/i.test(row.comentario)
            ? row.comentario
            : `[REVISIÓN SLACK] ${row.comentario}`.trim());

        setItems((prev) =>
          prev.map((it) =>
            it.rowNumber === row.rowNumber
              ? {
                  ...it,
                  validado: true,
                  candado: false,
                  enRevision: true,
                  comentario: comentarioActualizado
                }
              : it
          )
        );

        recordOperatorActivity('SLACK', row);

        setNotification({
          type: 'success',
          text: res.message || `Alerta del ítem ${row.codigo} enviada a Slack y movida a Revisión.`
        });
      } else {
        setNotification({
          type: 'error',
          text: res?.error || 'No se pudo enviar la alerta a Slack.'
        });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error de conexión con Slack: ' + err.message });
    } finally {
      setSendingSlackRow(null);
    }
  };

  // Helper reutilizable para exportar listas a Excel nativo (.xls SpreadsheetML)
  const exportToExcelXML = (
    rowsToExport: SheetRowItem[],
    sheetName: string,
    filePrefix: string,
    getEstadoLabel?: (row: SheetRowItem) => string
  ) => {
    const escapeXML = (val: string | number) =>
      String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const headers = [
      'Fila Sheet',
      'Estado',
      'Digitado Newsoft (Col O)',
      'Código Componente',
      'Item NT/NS Descripción',
      'Cantidad NetSuite',
      'Cantidad Inventario (Col E)',
      'Salida (Col G)',
      'Nave 7 (Col N)',
      'Total Balance Disponible Newsoft',
      'Diferencia',
      'Ubicación',
      'Comentarios'
    ];

    const headerCells = headers
      .map(
        (h) =>
          `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXML(h)}</Data></Cell>`
      )
      .join('');

    const dataRows = rowsToExport
      .map((row) => {
        const estadoTexto = getEstadoLabel
          ? getEstadoLabel(row)
          : row.validado && row.candado
          ? 'Cerrado'
          : row.enRevision
          ? 'Revisión'
          : row.validado
          ? 'Validado OK'
          : 'Pendiente';

        const difNum = typeof row.dif === 'number' ? row.dif : Number(row.dif);
        const difCell = !isNaN(difNum)
          ? `<Cell><Data ss:Type="Number">${difNum}</Data></Cell>`
          : `<Cell><Data ss:Type="String">${escapeXML(row.dif)}</Data></Cell>`;

        return `<Row>
          <Cell><Data ss:Type="Number">${row.rowNumber}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXML(estadoTexto)}</Data></Cell>
          <Cell><Data ss:Type="String">${row.digitado ? 'SÍ' : 'NO'}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXML(row.codigo)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXML(row.item)}</Data></Cell>
          <Cell><Data ss:Type="Number">${Number(row.ns) || 0}</Data></Cell>
          <Cell><Data ss:Type="Number">${Number(row.almacen) || 0}</Data></Cell>
          <Cell><Data ss:Type="Number">${Number(row.salida) || 0}</Data></Cell>
          <Cell><Data ss:Type="Number">${Number(row.nave7) || 0}</Data></Cell>
          <Cell><Data ss:Type="Number">${Number(row.newsoft) || 0}</Data></Cell>
          ${difCell}
          <Cell><Data ss:Type="String">${escapeXML(row.ubicacion)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXML(row.comentario)}</Data></Cell>
        </Row>`;
      })
      .join('');

    const xmlExcel = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escapeXML(sheetName)}">
    <Table>
      <Row>${headerCells}</Row>
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

    const blob = new Blob([xmlExcel], {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    });

    const now = new Date();
    const fechaStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filePrefix}_${fechaStr}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Descargar Excel nativo de la Papelera ("ELIMINADOS EN 0")
  const handleDownloadTrashExcel = () => {
    if (trashItems.length === 0) return;

    const escapeXML = (val: string | number) =>
      String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const headers = [
      'Fila Original',
      'Código Componente',
      'Item NT/NS Descripción',
      'NetSuite',
      'Almacén',
      'Ubicación',
      'Comentarios',
      'Eliminado Por',
      'Fecha Eliminación'
    ];

    const headerCells = headers
      .map((h) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXML(h)}</Data></Cell>`)
      .join('');

    const dataRows = trashItems
      .map(
        (t) => `<Row>
        <Cell><Data ss:Type="Number">${t.filaOriginal}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(t.codigo)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(t.item)}</Data></Cell>
        <Cell><Data ss:Type="Number">${t.ns}</Data></Cell>
        <Cell><Data ss:Type="Number">${t.almacen}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(t.ubicacion)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(t.comentario)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(t.eliminadoPor)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(t.fechaEliminacion)}</Data></Cell>
      </Row>`
      )
      .join('');

    const xmlExcel = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Eliminados en 0">
    <Table>
      <Row>${headerCells}</Row>
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

    const blob = new Blob([xmlExcel], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const now = new Date();
    const fechaStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Eliminados_En_0_Nave6_${fechaStr}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Descargar archivo de Excel nativo (.xls SpreadsheetML) únicamente de los ítems CERRADOS
  const handleDownloadCerradosExcel = () => {
    const cerradosList = items.filter((it) => it.validado && it.candado);

    if (cerradosList.length === 0) {
      setNotification({
        type: 'error',
        text: 'No hay artículos cerrados con candado disponibles para descargar.'
      });
      return;
    }

    exportToExcelXML(cerradosList, 'Cerrados Nave 6', 'Inventario_Cerrados_Nave6', () => 'Cerrado');

    setNotification({
      type: 'success',
      text: `Se descargó el Excel con ${cerradosList.length.toLocaleString()} artículo(s) cerrado(s).`
    });
  };

  // Descargar archivo de Excel nativo (.xls SpreadsheetML) de todos los artículos con stock en NAVE 7 (Col N > 0)
  const handleDownloadNave7Excel = () => {
    const nave7List = items.filter((it) => (Number(it.nave7) || 0) > 0);

    if (nave7List.length === 0) {
      setNotification({
        type: 'error',
        text: 'No hay artículos con unidades en Nave 7 (Col N) disponibles para descargar.'
      });
      return;
    }

    exportToExcelXML(nave7List, 'Inventario Nave 7', 'Inventario_Nave7');

    setNotification({
      type: 'success',
      text: `Se descargó el Excel de Nave 7 con ${nave7List.length.toLocaleString()} artículo(s).`
    });
  };

  // Guardar nuevo valor de Cantidad NetSuite (Col D) en Google Sheets
  const handleSaveNetSuite = async (row: SheetRowItem) => {
    setEditingNsRow(null);
    if (row.candado) return;

    const nuevoNs = parseFloat(editingNsValue);
    if (isNaN(nuevoNs) || nuevoNs === row.ns) return;

    setUpdatingRow(row.rowNumber);
    setNotification(null);

    const payload = {
      rowNumber: row.rowNumber,
      codigo: row.codigo,
      colD: nuevoNs
    };

    try {
      const res = await updateSheetRowGAS({
        action: 'UPDATE_ITEM',
        payload: JSON.stringify(payload)
      });

      if (res && res.success) {
        const nuevaDif = row.newsoft - nuevoNs;
        setItems(prev =>
          prev.map(it =>
            it.rowNumber === row.rowNumber
              ? { ...it, ns: nuevoNs, dif: nuevaDif }
              : it
          )
        );
        recordOperatorActivity('EDICION', row, nuevoNs);
        setNotification({
          type: 'success',
          text: `Cantidad NetSuite del ítem ${row.codigo} actualizada a ${nuevoNs}.`
        });
      } else {
        setNotification({ type: 'error', text: res?.error || 'No se pudo actualizar NetSuite en Sheets.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error de conexión: ' + err.message });
    } finally {
      setUpdatingRow(null);
    }
  };

  // Guardar nuevo valor de Cantidad Inventario / Almacén (Col E) en Google Sheets
  const handleSaveAlmacen = async (row: SheetRowItem) => {
    setEditingAlmacenRow(null);
    if (row.candado) return;

    const nuevoAlmacen = parseFloat(editingAlmacenValue);
    if (isNaN(nuevoAlmacen) || nuevoAlmacen === row.almacen) return;

    setUpdatingRow(row.rowNumber);
    setNotification(null);

    const payload = {
      rowNumber: row.rowNumber,
      codigo: row.codigo,
      colE: nuevoAlmacen
    };

    try {
      const res = await updateSheetRowGAS({
        action: 'UPDATE_ITEM',
        payload: JSON.stringify(payload)
      });

      if (res && res.success) {
        const nuevoBalance = (nuevoAlmacen - row.salida) + row.nave7;
        const nuevaDif = nuevoBalance - row.ns;
        setItems(prev =>
          prev.map(it =>
            it.rowNumber === row.rowNumber
              ? { ...it, almacen: nuevoAlmacen, newsoft: nuevoBalance, dif: nuevaDif }
              : it
          )
        );
        recordOperatorActivity('EDICION', row, nuevoAlmacen);
        setNotification({
          type: 'success',
          text: `Cantidad Inventario (Col E) del ítem ${row.codigo} actualizada a ${nuevoAlmacen}.`
        });
      } else {
        setNotification({ type: 'error', text: res?.error || 'No se pudo actualizar Cantidad Inventario (Col E) en Sheets.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error de conexión: ' + err.message });
    } finally {
      setUpdatingRow(null);
    }
  };

  // Guardar nuevo valor de Salidas (Col G) en Google Sheets
  const handleSaveSalida = async (row: SheetRowItem) => {
    setEditingSalidaRow(null);
    if (row.candado) return;

    const nuevaSalida = parseFloat(editingSalidaValue);
    if (isNaN(nuevaSalida) || nuevaSalida === row.salida) return;

    setUpdatingRow(row.rowNumber);
    setNotification(null);

    const payload = {
      rowNumber: row.rowNumber,
      codigo: row.codigo,
      colG: nuevaSalida
    };

    try {
      const res = await updateSheetRowGAS({
        action: 'UPDATE_ITEM',
        payload: JSON.stringify(payload)
      });

      if (res && res.success) {
        const nuevoBalance = (row.almacen - nuevaSalida) + row.nave7;
        const nuevaDif = nuevoBalance - row.ns;
        setItems(prev =>
          prev.map(it =>
            it.rowNumber === row.rowNumber
              ? { ...it, salida: nuevaSalida, newsoft: nuevoBalance, dif: nuevaDif }
              : it
          )
        );
        recordOperatorActivity('EDICION', row, nuevaSalida);
        setNotification({
          type: 'success',
          text: `Salida del ítem ${row.codigo} actualizada a ${nuevaSalida}.`
        });
      } else {
        setNotification({ type: 'error', text: res?.error || 'No se pudo actualizar la salida en Sheets.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error de conexión: ' + err.message });
    } finally {
      setUpdatingRow(null);
    }
  };

  // Guardar nuevo valor de Nave 7 (Col N) en Google Sheets
  const handleSaveNave7 = async (row: SheetRowItem) => {
    setEditingNave7Row(null);
    if (row.candado) return;

    const nuevaNave7 = parseFloat(editingNave7Value);
    if (isNaN(nuevaNave7) || nuevaNave7 === row.nave7) return;

    setUpdatingRow(row.rowNumber);
    setNotification(null);

    const payload = {
      rowNumber: row.rowNumber,
      codigo: row.codigo,
      colN: nuevaNave7
    };

    try {
      const res = await updateSheetRowGAS({
        action: 'UPDATE_ITEM',
        payload: JSON.stringify(payload)
      });

      if (res && res.success) {
        const nuevoBalance = (row.almacen - row.salida) + nuevaNave7;
        const nuevaDif = nuevoBalance - row.ns;
        setItems(prev =>
          prev.map(it =>
            it.rowNumber === row.rowNumber
              ? { ...it, nave7: nuevaNave7, newsoft: nuevoBalance, dif: nuevaDif }
              : it
          )
        );
        recordOperatorActivity('EDICION', row, nuevaNave7);
        setNotification({
          type: 'success',
          text: `Cantidad Nave 7 del ítem ${row.codigo} actualizada a ${nuevaNave7}.`
        });
      } else {
        setNotification({ type: 'error', text: res?.error || 'No se pudo actualizar Nave 7 en Sheets.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error de conexión: ' + err.message });
    } finally {
      setUpdatingRow(null);
    }
  };

  // Guardar nueva Ubicación (Col H) en Google Sheets
  const handleSaveUbicacion = async (row: SheetRowItem) => {
    setEditingUbicacionRow(null);
    if (row.candado) return;

    const nuevaUbicacion = editingUbicacionValue.trim().toUpperCase();
    if (!nuevaUbicacion || nuevaUbicacion === row.ubicacion.trim().toUpperCase()) return;

    setUpdatingRow(row.rowNumber);
    setNotification(null);

    const payload = {
      rowNumber: row.rowNumber,
      codigo: row.codigo,
      colH: nuevaUbicacion
    };

    try {
      const res = await updateSheetRowGAS({
        action: 'UPDATE_ITEM',
        payload: JSON.stringify(payload)
      });

      if (res && res.success) {
        setItems(prev =>
          prev.map(it =>
            it.rowNumber === row.rowNumber
              ? { ...it, ubicacion: nuevaUbicacion }
              : it
          )
        );
        recordOperatorActivity('EDICION', { ...row, ubicacion: nuevaUbicacion });
        setNotification({
          type: 'success',
          text: `Ubicación del ítem ${row.codigo} actualizada a ${nuevaUbicacion}.`
        });
      } else {
        setNotification({ type: 'error', text: res?.error || 'No se pudo actualizar la ubicación en Sheets.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error de conexión: ' + err.message });
    } finally {
      setUpdatingRow(null);
    }
  };

  // Guardar nuevo Comentario (Col L) en Google Sheets
  const handleSaveComment = async (row: SheetRowItem) => {
    setEditingCommentRow(null);
    if (row.candado) return;

    const nuevoComentario = editingCommentValue.trim();
    if (nuevoComentario === row.comentario.trim()) return;

    setUpdatingRow(row.rowNumber);
    setNotification(null);

    const payload = {
      rowNumber: row.rowNumber,
      codigo: row.codigo,
      colL: nuevoComentario
    };

    try {
      const res = await updateSheetRowGAS({
        action: 'UPDATE_ITEM',
        payload: JSON.stringify(payload)
      });

      if (res && res.success) {
        const sigueEnRevision = row.validado && !row.candado && /\[REVISIÓN/i.test(nuevoComentario);
        setItems(prev =>
          prev.map(it =>
            it.rowNumber === row.rowNumber
              ? { ...it, comentario: nuevoComentario, enRevision: sigueEnRevision }
              : it
          )
        );
        setNotification({
          type: 'success',
          text: `Comentario del ítem ${row.codigo} actualizado en Google Sheets.`
        });
      } else {
        setNotification({ type: 'error', text: res?.error || 'No se pudo actualizar el comentario.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error de conexión: ' + err.message });
    } finally {
      setUpdatingRow(null);
    }
  };

  // Verificar si un registro tiene Diferencia = 0
  const tieneDiferenciaCero = (row: SheetRowItem): boolean => {
    if (typeof row.dif === 'number') return row.dif === 0;
    const strDif = String(row.dif).trim();
    if (strDif === '' || strDif === '0') return true;
    const parsedNum = Number(strDif);
    if (!isNaN(parsedNum)) return parsedNum === 0;
    return row.newsoft === row.ns;
  };

  // Verificar si un registro está completamente en 0 (NetSuite = 0 y Total Balance Disponible Newsoft = 0)
  const estaEnCeroTotal = (row: SheetRowItem): boolean => {
    return (Number(row.ns) || 0) === 0 && (Number(row.newsoft) || 0) === 0;
  };

  // Abrir modal de confirmación para mover artículos en 0 a la pestaña "ELIMINADOS EN 0"
  const handlePromptArchiveZero = (targets: SheetRowItem[]) => {
    const validZeroTargets = targets.filter(estaEnCeroTotal);
    if (validZeroTargets.length === 0) {
      setNotification({
        type: 'error',
        text: 'No hay artículos con NetSuite = 0 y Balance Newsoft = 0 para mover.'
      });
      return;
    }
    setArchiveZeroTargets(validZeroTargets);
    setArchiveZeroPinInput('');
    setArchiveZeroPinError(false);
  };

  // Ejecutar traslado a la pestaña "ELIMINADOS EN 0" en micro-lotes de 25 para no bloquear a otros operadores
  const handleConfirmArchiveZero = async () => {
    if (archiveZeroPinInput.trim() !== MASTER_PIN || !archiveZeroTargets) {
      setArchiveZeroPinError(true);
      return;
    }

    const targetsToMove = [...archiveZeroTargets];
    setArchiveZeroTargets(null);
    setArchiveZeroPinInput('');
    setArchiveZeroPinError(false);
    setArchivingZeroRows(true);
    setNotification(null);

    const BATCH_SIZE = 25;
    let totalMoved = 0;

    try {
      for (let i = 0; i < targetsToMove.length; i += BATCH_SIZE) {
        const chunk = targetsToMove.slice(i, i + BATCH_SIZE);

        const res = await updateSheetRowGAS({
          action: 'ARCHIVE_ZERO_ITEMS',
          payload: JSON.stringify({
            usuario: activeUserLabel,
            items: chunk.map((it) => ({
              rowNumber: it.rowNumber,
              codigo: it.codigo,
            })),
          }),
        });

        if (res && res.success) {
          const movedCount = Number(res.deletedCount) || chunk.length;
          totalMoved += movedCount;

          const movedCodeSet = new Set(chunk.map((c) => c.codigo));
          const movedRowSet = new Set<number>(
            Array.isArray(res.deletedRows) && res.deletedRows.length > 0
              ? res.deletedRows
              : chunk.map((t) => t.rowNumber)
          );

          // Remover al instante de la tabla local
          setItems((prev) =>
            prev.filter(
              (it) =>
                !movedRowSet.has(it.rowNumber) &&
                !(movedCodeSet.has(it.codigo) && estaEnCeroTotal(it))
            )
          );

          // Ceder paso 400ms entre micro-lotes para que otros usuarios puedan guardar sin espera
          if (i + BATCH_SIZE < targetsToMove.length) {
            await new Promise((r) => setTimeout(r, 400));
          }
        } else {
          setNotification({
            type: 'error',
            text:
              res?.error ||
              `Se movieron ${totalMoved} artículo(s), pero ocurrió un error en el lote actual.`,
          });
          break;
        }
      }

      if (totalMoved > 0) {
        setNotification({
          type: 'success',
          text: `${totalMoved} artículo(s) en 0 movido(s) a la pestaña "ELIMINADOS EN 0".`,
        });

        setTimeout(() => {
          fetchSheetData(true);
          fetchTrashItems(true);
        }, 1200);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: 'Error al mover artículos en 0: ' + err.message,
      });
    } finally {
      setArchivingZeroRows(false);
    }
  };

  // Restaurar un registro desde la Papelera ("ELIMINADOS EN 0") de vuelta a "PROGRESO"
  const handleConfirmRestoreTrash = async () => {
    if (restorePinInput.trim() !== MASTER_PIN || !restoringTrashItem) {
      setRestorePinError(true);
      return;
    }

    const target = restoringTrashItem;
    setRestoringInProgress(true);
    setRestorePinError(false);

    try {
      const res = await updateSheetRowGAS({
        action: 'RESTORE_ARCHIVED_ZERO',
        payload: JSON.stringify({
          trashRowNumber: target.trashRowNumber,
          usuario: activeUserLabel
        })
      });

      if (res && res.success) {
        setRestoringTrashItem(null);
        setRestorePinInput('');
        setNotification({
          type: 'success',
          text: res.message || `Artículo ${target.codigo} restaurado a PROGRESO.`
        });
        await fetchTrashItems(true);
        setTimeout(() => {
          fetchSheetData(true);
        }, 1000);
      } else {
        setNotification({
          type: 'error',
          text: res?.error || 'No se pudo restaurar el artículo desde la papelera.'
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: 'Error al restaurar artículo: ' + err.message
      });
    } finally {
      setRestoringInProgress(false);
    }
  };

  // Acción directa para activar o desactivar el candado (Col I) en Google Sheets
  const toggleCandadoFila = async (row: SheetRowItem, nuevoEstadoCandado: boolean, conPinAutorizado = false) => {
    if (nuevoEstadoCandado && !tieneDiferenciaCero(row)) {
      setNotification({
        type: 'error',
        text: `No se puede cerrar el ítem ${row.codigo}: La diferencia debe ser 0 para activar el candado.`
      });
      return;
    }

    if (!nuevoEstadoCandado && row.candado && !conPinAutorizado) {
      setUnlockTargetRow(row);
      setUnlockPinInput('');
      setUnlockPinError(false);
      return;
    }

    setUpdatingRow(row.rowNumber);
    setNotification(null);

    const comentarioFinal = nuevoEstadoCandado
      ? limpiarEtiquetaRevision(row.comentario)
      : row.comentario;

    const payload: Record<string, any> = {
      rowNumber: row.rowNumber,
      codigo: row.codigo,
      colI: nuevoEstadoCandado,
      forceUnlock: conPinAutorizado
    };

    if (nuevoEstadoCandado) {
      payload.colO = true;
      payload.usuario = activeUserLabel;
    }

    if (nuevoEstadoCandado && comentarioFinal !== row.comentario) {
      payload.colL = comentarioFinal;
    }

    try {
      const res = await updateSheetRowGAS({
        action: 'UPDATE_ITEM',
        payload: JSON.stringify(payload)
      });

      if (res && res.success) {
        const fechaHora = new Date().toLocaleString('es-DO', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });

        setItems(prev =>
          prev.map(it =>
            it.rowNumber === row.rowNumber
              ? {
                  ...it,
                  candado: nuevoEstadoCandado,
                  digitado: nuevoEstadoCandado ? true : it.digitado,
                  comentario: comentarioFinal,
                  enRevision: nuevoEstadoCandado ? false : it.enRevision
                }
              : it
          )
        );

        if (nuevoEstadoCandado) {
          const nextMetaMap = { ...digitadoMetaMap };
          nextMetaMap[`${row.rowNumber}_${row.codigo}`] = {
            usuario: activeUserLabel,
            fechaHora,
            timestamp: Date.now(),
          };
          persistDigitadoMeta(nextMetaMap);
          recordOperatorActivity('CERRADO', row);
        }

        setNotification({
          type: 'success',
          text: nuevoEstadoCandado
            ? `Ítem ${row.codigo} cerrado con candado y marcado como Digitado (Col O).`
            : `Candado desbloqueado para el ítem ${row.codigo}.`
        });
      } else {
        setNotification({ type: 'error', text: res?.error || 'Error al actualizar el candado en Google Sheets.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error de conexión: ' + err.message });
    } finally {
      setUpdatingRow(null);
    }
  };

  // Confirmar desbloqueo con PIN maestro 030621
  const handleConfirmarDesbloqueo = () => {
    if (unlockPinInput.trim() === MASTER_PIN && unlockTargetRow) {
      const target = unlockTargetRow;
      setUnlockTargetRow(null);
      setUnlockPinInput('');
      setUnlockPinError(false);
      toggleCandadoFila(target, false, true);
    } else {
      setUnlockPinError(true);
    }
  };

  // Contadores por categoría para las pestañas
  const counts = useMemo(() => {
    let pendientes = 0;
    let validadosOk = 0;
    let revision = 0;
    let cerrados = 0;
    let nave7 = 0;
    let enCero = 0;

    for (const it of items) {
      if ((Number(it.nave7) || 0) > 0) {
        nave7++;
      }
      if ((Number(it.ns) || 0) === 0 && (Number(it.newsoft) || 0) === 0) {
        enCero++;
      }
      if (it.validado && it.candado) {
        cerrados++;
      } else if (it.enRevision) {
        revision++;
      } else if (it.validado && !it.candado) {
        validadosOk++;
      } else {
        pendientes++;
      }
    }
    return { pendientes, validadosOk, revision, cerrados, nave7, enCero };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchSearch =
        it.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.comentario.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchSearch) return false;
      if (filterStatus === 'PENDIENTE') return !it.validado && !it.candado;
      if (filterStatus === 'OK') return it.validado && !it.candado && !it.enRevision;
      if (filterStatus === 'REVISION') return it.enRevision;
      if (filterStatus === 'CERRADO') return it.validado && it.candado;
      if (filterStatus === 'NAVE7') return (Number(it.nave7) || 0) > 0;
      if (filterStatus === 'ENCERO') return (Number(it.ns) || 0) === 0 && (Number(it.newsoft) || 0) === 0;
      return true;
    });
  }, [items, searchTerm, filterStatus]);

  const filteredTrashItems = useMemo(() => {
    const q = trashSearchTerm.trim().toLowerCase();
    if (!q) return trashItems;
    return trashItems.filter(
      (t) =>
        t.codigo.toLowerCase().includes(q) ||
        t.item.toLowerCase().includes(q) ||
        t.ubicacion.toLowerCase().includes(q) ||
        t.eliminadoPor.toLowerCase().includes(q)
    );
  }, [trashItems, trashSearchTerm]);

  // Saltar al ítem anterior (-1) o siguiente (+1) de un lote activo (incluye cambio de página automático)
  const handleJumpToMatch = useCallback(
    (loteId: string, matchedRows: SheetRowItem[], direction: -1 | 1) => {
      if (matchedRows.length === 0) return;

      const currentIdx = activeMatchIndices[loteId] ?? 0;
      const nextIdx = (currentIdx + direction + matchedRows.length) % matchedRows.length;

      setActiveMatchIndices((prev) => ({ ...prev, [loteId]: nextIdx }));

      const targetRow = matchedRows[nextIdx];
      if (!targetRow) return;

      const effectiveFilter =
        filterStatus !== 'ALL' && filterStatus !== 'OK' ? 'OK' : filterStatus;
      if (effectiveFilter !== filterStatus) {
        setFilterStatus(effectiveFilter);
      }

      const targetList = items.filter((it) => {
        const matchSearch =
          it.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
          it.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          it.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
          it.comentario.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchSearch) return false;
        if (effectiveFilter === 'OK') return it.validado && !it.candado && !it.enRevision;
        return true;
      });

      const targetIndex = targetList.findIndex(
        (it) => it.rowNumber === targetRow.rowNumber
      );

      if (targetIndex !== -1) {
        const targetPage = Math.floor(targetIndex / pageSize) + 1;
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }
      }

      setHighlightedRowNum(targetRow.rowNumber);

      setTimeout(() => {
        const el = rowRefs.current[targetRow.rowNumber];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 90);
    },
    [activeMatchIndices, filterStatus, items, searchTerm, pageSize, currentPage]
  );

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;

  useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const handlePageJump = () => {
    const pageNum = parseInt(inputPage, 10);
    if (!isNaN(pageNum)) {
      const validPage = Math.max(1, Math.min(pageNum, totalPages));
      setCurrentPage(validPage);
      setInputPage(String(validPage));
    } else {
      setInputPage(String(currentPage));
    }
  };

  const handleVerifyPin = () => {
    if (pinInput.trim() === '1501') {
      setIsPinModalOpen(false);
      setPinInput('');
      setPinError(false);
      window.open(GOOGLE_SHEETS_URL, '_blank', 'noopener,noreferrer');
    } else {
      setPinError(true);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Barra Superior con Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#12161f] p-4 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase text-white tracking-wide flex items-center gap-2">
              <span>DESGLOSE OPERATIVO COMPLETO (NAVE 6)</span>
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                En Vivo (2s)
              </span>
            </h2>
            <span className="text-xs text-gray-400">
              Registros Totales: {items.length.toLocaleString()} artículos
              {lastSync ? ` • Sincronizado: ${lastSync}` : ''}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadNave7Excel}
            disabled={counts.nave7 === 0}
            title="Descargar archivo Excel con todos los artículos que tienen stock en Nave 7 (Col N)"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500 hover:text-white text-purple-300 font-black text-xs border border-purple-500/40 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Nave 7 ({counts.nave7.toLocaleString()})</span>
          </button>

          <button
            onClick={handleDownloadCerradosExcel}
            disabled={counts.cerrados === 0}
            title="Descargar archivo Excel con todos los artículos cerrados con candado"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-300 font-black text-xs border border-emerald-500/40 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Cerrados ({counts.cerrados.toLocaleString()})</span>
          </button>

          <button
            onClick={() => fetchSheetData(false)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs border border-white/10 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00f2fe]' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={() => setIsPinModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-black font-black text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Abrir Sheet (1501)</span>
            <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Ventana Colaborativa de Lotes / Grupos Activos en Tiempo Real */}
      <div className="bg-[#12161f] border border-cyan-500/25 rounded-2xl p-3.5 shadow-lg space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#00f2fe]/10 border border-[#00f2fe]/30 text-[#00f2fe]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase text-white tracking-wide flex items-center gap-2">
                <span>Lotes en Proceso (Equipo en Vivo)</span>
                <span className="text-[10px] font-mono font-bold text-[#00f2fe] bg-[#00f2fe]/10 px-2 py-0.5 rounded-full border border-[#00f2fe]/25">
                  {parsedLotesActivos.length} {parsedLotesActivos.length === 1 ? 'activo' : 'activos'}
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Anota la cantidad fija o grupo que estás pasando a Newsoft (ej. 14 o Cant. 12 A-11) para resaltarlo por color
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Tu nombre..."
              value={operadorNombre}
              onChange={(e) => setOperadorNombre(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#0d1017] border border-white/15 text-xs text-white placeholder-gray-500 focus:border-[#00f2fe] outline-none w-32 sm:w-36 font-bold"
            />
            <input
              type="text"
              placeholder="Cantidad o Grupo (ej. 14 o 12 B-7)..."
              value={loteInput}
              onChange={(e) => setLoteInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleClaimLote()}
              className="px-3 py-1.5 rounded-xl bg-[#0d1017] border border-white/15 text-xs text-white placeholder-gray-500 focus:border-[#00f2fe] outline-none w-52 sm:w-64"
            />
            <button
              type="button"
              onClick={handleClaimLote}
              disabled={claimingLote || !operadorNombre.trim() || !loteInput.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00f2fe] hover:bg-[#00f2fe]/85 text-[#0b0e14] font-black text-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {claimingLote ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Tomar Lote</span>
            </button>
          </div>
        </div>

        {/* Lista de Etiquetas de Lotes Activos con Color Único por Usuario y Flechas de Navegación */}
        {parsedLotesActivos.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            {parsedLotesActivos.map((itemLote) => {
              const isReleasing = releasingLoteId === itemLote.id;
              const { theme } = itemLote;
              const currentMatchIdx = Math.min(
                activeMatchIndices[itemLote.id] ?? 0,
                Math.max(0, itemLote.matchCount - 1)
              );

              return (
                <div
                  key={itemLote.id}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${theme.chipBg} ${theme.chipBorder}`}
                >
                  <span className={`w-2 h-2 rounded-full ${theme.dotBg} animate-pulse shrink-0`} />
                  <span className={`font-black ${theme.chipText}`}>
                    {itemLote.usuario} ({itemLote.initials}):
                  </span>
                  <span className="font-black text-white">{itemLote.lote}</span>
                  {itemLote.targetQty !== null && (
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/40 border border-white/15 text-[10px] font-mono font-black text-emerald-300">
                      <span>
                        {itemLote.matchCount > 0
                          ? `${currentMatchIdx + 1}/${itemLote.matchCount} ${itemLote.matchCount === 1 ? 'ítem' : 'ítems'}`
                          : '0 ítems'}
                      </span>
                      {itemLote.matchCount > 0 && (
                        <div className="inline-flex items-center border-l border-white/15 pl-1 ml-0.5 gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleJumpToMatch(itemLote.id, itemLote.matchedRows, -1)}
                            title="Ir al ítem anterior de este lote"
                            className="p-0.5 rounded hover:bg-white/15 text-gray-200 hover:text-white cursor-pointer"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleJumpToMatch(itemLote.id, itemLote.matchedRows, 1)}
                            title="Ir al siguiente ítem de este lote"
                            className="p-0.5 rounded hover:bg-white/15 text-gray-200 hover:text-white cursor-pointer"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <span className="text-[10px] font-mono text-gray-300/80">({itemLote.hora})</span>
                  <button
                    type="button"
                    disabled={isReleasing}
                    onClick={() => handleReleaseLote(itemLote.id)}
                    title="Liberar lote al terminar"
                    className="ml-0.5 p-0.5 rounded-md text-gray-300 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isReleasing ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[11px] text-gray-500 pt-1 border-t border-white/5">
            Ningún lote registrado en este momento. Escribe tu nombre y la cantidad fija que estás trabajando para avisar al equipo.
          </div>
        )}
      </div>

      {/* Notificaciones de Candado / Guardado / Slack / Archivo en 0 */}
      {notification && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabla Completa */}
      <div className="bg-[#12161f] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col">
        {/* Filtros y Buscador */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center bg-[#0d1017] rounded-xl border border-white/10 p-1 text-xs gap-1">
              <button
                onClick={() => { setFilterStatus('ALL'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterStatus === 'ALL' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Todos ({items.length.toLocaleString()})
              </button>

              <button
                onClick={() => { setFilterStatus('PENDIENTE'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterStatus === 'PENDIENTE' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Pendientes ({counts.pendientes.toLocaleString()})
              </button>

              <button
                onClick={() => { setFilterStatus('OK'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterStatus === 'OK' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Validados OK ({counts.validadosOk.toLocaleString()})
              </button>

              <button
                onClick={() => { setFilterStatus('REVISION'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterStatus === 'REVISION'
                    ? 'bg-orange-500/25 text-orange-300 border border-orange-500/40'
                    : counts.revision > 0
                    ? 'text-orange-400 hover:bg-orange-500/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Revisión ({counts.revision.toLocaleString()})</span>
              </button>

              <button
                onClick={() => { setFilterStatus('CERRADO'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterStatus === 'CERRADO' ? 'bg-rose-500/20 text-rose-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>Cerrados ({counts.cerrados.toLocaleString()})</span>
              </button>

              <button
                onClick={() => { setFilterStatus('NAVE7'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterStatus === 'NAVE7'
                    ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40'
                    : counts.nave7 > 0
                    ? 'text-purple-400 hover:bg-purple-500/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Nave 7 ({counts.nave7.toLocaleString()})</span>
              </button>

              <button
                onClick={() => { setFilterStatus('ENCERO'); setCurrentPage(1); }}
                title="Artículos con NetSuite = 0 y Balance Newsoft = 0 listos para archivar en ELIMINADOS EN 0"
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterStatus === 'ENCERO'
                    ? 'bg-slate-600/40 text-slate-200 border border-slate-400/50'
                    : counts.enCero > 0
                    ? 'text-slate-300 hover:bg-white/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Archive className="w-3.5 h-3.5 text-slate-300" />
                <span>En Cero ({counts.enCero.toLocaleString()})</span>
              </button>
            </div>

            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-[#0d1017] border border-white/10 text-xs text-gray-300 rounded-xl px-2.5 py-1.5 outline-none font-bold cursor-pointer"
            >
              <option value={25}>25 por pág.</option>
              <option value={50}>50 por pág.</option>
              <option value={100}>100 por pág.</option>
              <option value={200}>200 por pág.</option>
            </select>

            {filterStatus === 'ENCERO' && filteredItems.length > 0 && (
              <button
                type="button"
                disabled={archivingZeroRows}
                onClick={() => handlePromptArchiveZero(filteredItems)}
                title='Mover todos los artículos visibles en 0 a la pestaña "ELIMINADOS EN 0" en Google Sheets'
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 font-black text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {archivingZeroRows ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>
                  {archivingZeroRows
                    ? 'Moviendo a pestaña...'
                    : `Mover todos a "ELIMINADOS EN 0" (${filteredItems.length.toLocaleString()})`}
                </span>
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar SKU, código, ubicación o comentario..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-4 py-2 rounded-xl bg-[#0d1017] border border-white/10 text-xs text-white placeholder-gray-500 focus:border-amber-400 outline-none w-64 sm:w-80"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto min-h-[500px] max-h-[65vh] custom-scrollbar border border-white/5 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0d1017] z-10 shadow-sm">
              <tr className="border-b border-white/10 text-gray-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3 text-center">Digitado (Col O)</th>
                <th className="py-3 px-3 text-center">Candado (Col I)</th>
                <th className="py-3 px-3">Código Componente</th>
                <th className="py-3 px-3">Item NT/NS Descripción</th>
                <th className="py-3 px-3 text-right">Cantidad NetSuite</th>
                <th className="py-3 px-3 text-right text-emerald-400">Cantidad Inventario (Col E)</th>
                <th className="py-3 px-3 text-right">Salida (Col G)</th>
                <th className="py-3 px-3 text-right">Nave 7 (Col N)</th>
                <th className="py-3 px-3 text-right">Total Balance Disponible Newsoft</th>
                <th className="py-3 px-3 text-right">Diferencia</th>
                <th className="py-3 px-3">Ubicación</th>
                <th className="py-3 px-3">Comentarios</th>
                <th className="py-3 px-3 text-center">Slack / En 0</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {paginatedItems.map((row) => {
                const isDifCero = tieneDiferenciaCero(row);
                const isEnCero = estaEnCeroTotal(row);
                const isRowUpdating = updatingRow === row.rowNumber;
                const isDigitadoUpdating = updatingDigitadoRow === row.rowNumber;
                const isSendingSlack = sendingSlackRow === row.rowNumber;
                const isEditingNs = editingNsRow === row.rowNumber;
                const isEditingAlmacen = editingAlmacenRow === row.rowNumber;
                const isEditingSalida = editingSalidaRow === row.rowNumber;
                const isEditingNave7 = editingNave7Row === row.rowNumber;
                const isEditingUbicacion = editingUbicacionRow === row.rowNumber;
                const isEditingComment = editingCommentRow === row.rowNumber;
                const matchedLote = getMatchLoteForRow(row);
                const digitadoMeta = digitadoMetaMap[`${row.rowNumber}_${row.codigo}`];

                return (
                  <tr
                    key={row.rowNumber}
                    ref={(el) => { rowRefs.current[row.rowNumber] = el; }}
                    className={`transition-colors ${
                      highlightedRowNum === row.rowNumber
                        ? 'bg-[#00f2fe]/15 ring-1 ring-[#00f2fe]/50'
                        : row.enRevision
                        ? 'bg-orange-500/5 hover:bg-orange-500/10'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    {/* ESTADO */}
                    <td className="py-2.5 px-3">
                      {row.validado && row.candado ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                          <ShieldCheck className="w-3 h-3" /> Cerrado
                        </span>
                      ) : row.enRevision ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-orange-300 bg-orange-500/15 px-2 py-0.5 rounded border border-orange-500/40">
                          <AlertTriangle className="w-3 h-3" /> Revisión
                        </span>
                      ) : row.validado ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          <Clock className="w-3 h-3" /> Pendiente
                        </span>
                      )}
                    </td>

                    {/* CASILLA DIGITADO (COL O) */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex flex-col items-center justify-center">
                        <button
                          type="button"
                          disabled={isDigitadoUpdating}
                          onClick={() => handleToggleDigitado(row)}
                          title={
                            row.digitado
                              ? digitadoMeta
                                ? `Digitado por ${digitadoMeta.usuario} • ${digitadoMeta.fechaHora} (Clic para desmarcar)`
                                : 'Digitado en Newsoft (Clic para desmarcar)'
                              : 'Marcar como Digitado en Newsoft (Col O)'
                          }
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                            isDigitadoUpdating
                              ? 'bg-white/10 border-white/20 text-gray-400 cursor-wait'
                              : row.digitado
                              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/30'
                              : 'bg-white/5 border-white/15 text-gray-400 hover:border-cyan-400/50 hover:text-cyan-200'
                          }`}
                        >
                          {isDigitadoUpdating ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00f2fe]" />
                          ) : (
                            <input
                              type="checkbox"
                              checked={row.digitado}
                              readOnly
                              className="w-3.5 h-3.5 accent-[#00f2fe] pointer-events-none rounded"
                            />
                          )}
                          <span>{row.digitado ? 'Digitado' : 'Marcar'}</span>
                        </button>
                        {row.digitado && digitadoMeta && (
                          <span className="text-[9px] font-mono text-cyan-300/80 mt-0.5 max-w-[125px] truncate">
                            {getInitials(digitadoMeta.usuario)} • {digitadoMeta.fechaHora}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* CASILLA / BOTÓN DE CANDADO (COL I) */}
                    <td className="py-2.5 px-3 text-center">
                      {row.validado ? (
                        <div className="inline-flex items-center justify-center">
                          <button
                            type="button"
                            disabled={isRowUpdating || (!row.candado && !isDifCero)}
                            onClick={() => toggleCandadoFila(row, !row.candado)}
                            title={
                              row.candado
                                ? 'Cerrado (Clic para desbloquear con PIN 030621)'
                                : isDifCero
                                ? 'Activar Candado (Cerrar ítem y marcar Digitado automáticamente)'
                                : 'Requiere Diferencia = 0 para cerrar candado'
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                              isRowUpdating
                                ? 'bg-white/10 border-white/20 text-gray-400 cursor-wait'
                                : row.candado
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30 cursor-pointer'
                                : isDifCero
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-black cursor-pointer'
                                : 'bg-white/5 border-white/10 text-gray-600 cursor-not-allowed opacity-50'
                            }`}
                          >
                            {isRowUpdating ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : row.candado ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Cerrado</span>
                              </>
                            ) : (
                              <>
                                <input
                                  type="checkbox"
                                  checked={false}
                                  readOnly
                                  disabled={!isDifCero}
                                  className="w-3.5 h-3.5 accent-amber-400 pointer-events-none"
                                />
                                <span>Cerrar</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-600 font-mono">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono font-bold text-gray-300">{row.codigo}</td>
                    <td className="py-2.5 px-3 text-white font-bold">{row.item}</td>

                    {/* CANTIDAD NETSUITE */}
                    <td className="py-2.5 px-3 text-right font-mono">
                      {isEditingNs ? (
                        <input
                          type="number"
                          autoFocus
                          value={editingNsValue}
                          onChange={(e) => setEditingNsValue(e.target.value)}
                          onBlur={() => handleSaveNetSuite(row)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNetSuite(row);
                            if (e.key === 'Escape') setEditingNsRow(null);
                          }}
                          className="w-20 px-2 py-1 text-right font-bold text-white bg-[#0d1017] border border-indigo-400 rounded-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <div
                          onClick={() => {
                            if (!row.candado && !isRowUpdating) {
                              setEditingNsRow(row.rowNumber);
                              setEditingNsValue(String(row.ns));
                            }
                          }}
                          title={row.candado ? 'Bloqueado con candado' : 'Clic para editar Cantidad NetSuite'}
                          className={`inline-flex items-center justify-end gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                            row.candado
                              ? 'text-gray-400 cursor-default'
                              : 'text-gray-200 hover:bg-indigo-500/15 hover:text-indigo-300 cursor-pointer group'
                          }`}
                        >
                          <span>{row.ns.toLocaleString()}</span>
                          {!row.candado && (
                            <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* CANTIDAD INVENTARIO / ALMACÉN (COL E) */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {isEditingAlmacen ? (
                        <input
                          type="number"
                          autoFocus
                          value={editingAlmacenValue}
                          onChange={(e) => setEditingAlmacenValue(e.target.value)}
                          onBlur={() => handleSaveAlmacen(row)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveAlmacen(row);
                            if (e.key === 'Escape') setEditingAlmacenRow(null);
                          }}
                          className="w-20 px-2 py-1 text-right font-bold text-white bg-[#0d1017] border border-emerald-400 rounded-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <div
                          onClick={() => {
                            if (!row.candado && !isRowUpdating) {
                              setEditingAlmacenRow(row.rowNumber);
                              setEditingAlmacenValue(String(row.almacen));
                            }
                          }}
                          title={row.candado ? 'Bloqueado con candado' : 'Clic para editar Cantidad Inventario (Col E)'}
                          className={`inline-flex items-center justify-end gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                            row.candado
                              ? 'text-emerald-400/60 cursor-default'
                              : 'text-emerald-300 hover:bg-emerald-500/15 cursor-pointer group'
                          }`}
                        >
                          <span>{row.almacen.toLocaleString()}</span>
                          {!row.candado && (
                            <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* SALIDA (COL G) */}
                    <td className="py-2.5 px-3 text-right font-mono">
                      {isEditingSalida ? (
                        <input
                          type="number"
                          autoFocus
                          value={editingSalidaValue}
                          onChange={(e) => setEditingSalidaValue(e.target.value)}
                          onBlur={() => handleSaveSalida(row)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveSalida(row);
                            if (e.key === 'Escape') setEditingSalidaRow(null);
                          }}
                          className="w-20 px-2 py-1 text-right font-bold text-white bg-[#0d1017] border border-rose-400 rounded-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <div
                          onClick={() => {
                            if (!row.candado && !isRowUpdating) {
                              setEditingSalidaRow(row.rowNumber);
                              setEditingSalidaValue(String(row.salida));
                            }
                          }}
                          title={row.candado ? 'Bloqueado con candado' : 'Clic para editar Salida (Col G)'}
                          className={`inline-flex items-center justify-end gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                            row.candado
                              ? 'text-gray-400 cursor-default'
                              : row.salida > 0
                              ? 'text-rose-300 hover:bg-rose-500/15 cursor-pointer group font-bold'
                              : 'text-gray-400 hover:bg-rose-500/15 hover:text-rose-300 cursor-pointer group'
                          }`}
                        >
                          <span>{row.salida.toLocaleString()}</span>
                          {!row.candado && (
                            <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-rose-400 transition-opacity" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* NAVE 7 (COL N) */}
                    <td className="py-2.5 px-3 text-right font-mono">
                      {isEditingNave7 ? (
                        <input
                          type="number"
                          autoFocus
                          value={editingNave7Value}
                          onChange={(e) => setEditingNave7Value(e.target.value)}
                          onBlur={() => handleSaveNave7(row)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNave7(row);
                            if (e.key === 'Escape') setEditingNave7Row(null);
                          }}
                          className="w-20 px-2 py-1 text-right font-bold text-white bg-[#0d1017] border border-purple-400 rounded-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <div
                          onClick={() => {
                            if (!row.candado && !isRowUpdating) {
                              setEditingNave7Row(row.rowNumber);
                              setEditingNave7Value(String(row.nave7));
                            }
                          }}
                          title={row.candado ? 'Bloqueado con candado' : 'Clic para editar Nave 7 (Col N)'}
                          className={`inline-flex items-center justify-end gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                            row.candado
                              ? 'text-gray-400 cursor-default'
                              : row.nave7 > 0
                              ? 'text-purple-300 hover:bg-purple-500/15 cursor-pointer group font-bold'
                              : 'text-gray-400 hover:bg-purple-500/15 hover:text-purple-300 cursor-pointer group'
                          }`}
                        >
                          <span>{row.nave7.toLocaleString()}</span>
                          {!row.candado && (
                            <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* TOTAL BALANCE DISPONIBLE NEWSOFT */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {matchedLote ? (
                        <span
                          title={`Tomado por ${matchedLote.usuario} (${matchedLote.lote})`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border font-black ${matchedLote.theme.badgeBg} ${matchedLote.theme.badgeBorder} ${matchedLote.theme.badgeText}`}
                        >
                          <span>{row.newsoft.toLocaleString()}</span>
                          <span className="text-[10px] opacity-90">({matchedLote.initials})</span>
                        </span>
                      ) : (
                        <span className="text-[#00f2fe]">{row.newsoft.toLocaleString()}</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono">
                      {typeof row.dif === 'number' && row.dif > 0 ? (
                        <span className="text-amber-400 font-bold">+{row.dif}</span>
                      ) : typeof row.dif === 'number' && row.dif < 0 ? (
                        <span className="text-rose-400 font-bold">{row.dif}</span>
                      ) : typeof row.dif === 'string' && (row.dif.includes('Restar') || row.dif.includes('Agregar') || row.dif.includes('No')) ? (
                        <span className="text-rose-400 font-bold text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                          {row.dif}
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold">0</span>
                      )}
                    </td>

                    {/* UBICACIÓN (COL H) */}
                    <td className="py-2.5 px-3 font-mono font-bold">
                      {isEditingUbicacion ? (
                        <input
                          type="text"
                          autoFocus
                          value={editingUbicacionValue}
                          onChange={(e) => setEditingUbicacionValue(e.target.value.toUpperCase())}
                          onBlur={() => handleSaveUbicacion(row)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveUbicacion(row);
                            if (e.key === 'Escape') setEditingUbicacionRow(null);
                          }}
                          placeholder="Ej. G-15-1"
                          className="w-24 px-2 py-1 font-bold text-white uppercase bg-[#0d1017] border border-amber-400 rounded-lg outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => {
                            if (!row.candado && !isRowUpdating) {
                              setEditingUbicacionRow(row.rowNumber);
                              setEditingUbicacionValue(row.ubicacion === '-' ? '' : row.ubicacion);
                            }
                          }}
                          title={row.candado ? 'Bloqueado con candado' : 'Clic para editar Ubicación (Col H)'}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                            row.candado
                              ? 'text-gray-400 cursor-default'
                              : 'text-gray-300 hover:bg-amber-500/15 hover:text-amber-300 cursor-pointer group'
                          }`}
                        >
                          <span>{row.ubicacion}</span>
                          {!row.candado && (
                            <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-amber-400 transition-opacity" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* COMENTARIOS (COL L) */}
                    <td className="py-2.5 px-3 text-gray-300 text-[11px] min-w-[200px] max-w-[280px]">
                      {isEditingComment ? (
                        <input
                          type="text"
                          autoFocus
                          value={editingCommentValue}
                          onChange={(e) => setEditingCommentValue(e.target.value)}
                          onBlur={() => handleSaveComment(row)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveComment(row);
                            if (e.key === 'Escape') setEditingCommentRow(null);
                          }}
                          placeholder="Escribir comentario..."
                          className="w-full px-2 py-1 text-xs text-white bg-[#0d1017] border border-amber-400 rounded-lg outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => {
                            if (!row.candado && !isRowUpdating) {
                              setEditingCommentRow(row.rowNumber);
                              setEditingCommentValue(row.comentario);
                            }
                          }}
                          title={row.candado ? 'Bloqueado con candado' : (row.comentario ? `${row.comentario} (Clic para editar)` : 'Clic para agregar comentario')}
                          className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                            row.candado
                              ? 'text-gray-400 cursor-default'
                              : row.enRevision
                              ? 'text-orange-300 hover:bg-orange-500/15 cursor-pointer group font-semibold'
                              : 'hover:bg-amber-500/15 hover:text-amber-200 cursor-pointer group'
                          }`}
                        >
                          <span className="truncate">
                            {row.comentario || <span className="text-gray-600">—</span>}
                          </span>
                          {!row.candado && (
                            <Edit2 className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 text-amber-400 transition-opacity" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* ACCIÓN: ENVIAR DESCUADRE A SLACK O MOVER ÍTEM EN 0 A PESTAÑA "ELIMINADOS EN 0" */}
                    <td className="py-2.5 px-3 text-center">
                      {!isDifCero ? (
                        <button
                          type="button"
                          disabled={isSendingSlack}
                          onClick={() => handleSendSlackAlert(row)}
                          title="Reportar este descuadre en Slack (#alerta-inventario-nave-6) y mover a Revisión"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#4A154B]/60 hover:bg-[#611f69] text-purple-200 hover:text-white border border-purple-400/30 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isSendingSlack ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          <span>Alertar</span>
                        </button>
                      ) : isEnCero ? (
                        <button
                          type="button"
                          disabled={archivingZeroRows}
                          onClick={() => handlePromptArchiveZero([row])}
                          title='Eliminar de PROGRESO y guardar en la pestaña "ELIMINADOS EN 0" (NetSuite = 0 y Newsoft = 0)'
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700/60 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-500/40 hover:border-rose-400 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Archive className="w-3 h-3" />
                          <span>A Pestaña 0</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-600 font-mono">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación Inferior + Botón de Papelera ("ELIMINADOS EN 0") */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-3 border-t border-white/10 text-xs text-gray-400">
          <span>
            Mostrando <strong>{paginatedItems.length}</strong> de <strong>{filteredItems.length.toLocaleString()}</strong> artículos
          </span>

          <div className="flex flex-wrap items-center gap-3">
            {/* Botón Papelera para ver todos los eliminados en 0 */}
            <button
              type="button"
              onClick={handleOpenTrashModal}
              title='Ver historial de artículos movidos a "ELIMINADOS EN 0" o restaurar un registro'
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 font-black text-xs transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Papelera</span>
              {trashItems.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-100 font-mono text-[10px]">
                  {trashItems.length.toLocaleString()}
                </span>
              )}
            </button>

            <div className="flex items-center gap-1.5">
              <span>Página</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={inputPage}
                onChange={(e) => setInputPage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePageJump()}
                onBlur={handlePageJump}
                className="w-16 px-2 py-1 text-center font-bold text-white bg-[#0d1017] border border-white/15 rounded-lg outline-none focus:border-[#00f2fe] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span>de <strong>{totalPages}</strong></span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all cursor-pointer"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Papelera ("ELIMINADOS EN 0") */}
      {isTrashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#12161f] border border-rose-500/40 rounded-2xl w-full max-w-5xl max-h-[88vh] flex flex-col p-5 shadow-[0_0_40px_rgba(244,63,94,0.25)] space-y-4">
            {/* Cabecera Papelera */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wide flex items-center gap-2">
                    <span>Papelera • Artículos Archivados en Cero (ELIMINADOS EN 0)</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[11px]">
                      {trashItems.length.toLocaleString()}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Registro histórico de artículos depurados con NetSuite = 0 y Newsoft = 0
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar código, ítem, ubicación o usuario..."
                    value={trashSearchTerm}
                    onChange={(e) => setTrashSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-[#0d1017] border border-white/15 text-xs text-white placeholder-gray-500 focus:border-rose-400 outline-none w-56 sm:w-64"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTrashExcel}
                  disabled={trashItems.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/40 text-xs font-black transition-all cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => fetchTrashItems(false)}
                  disabled={loadingTrash}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-bold transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTrash ? 'animate-spin text-rose-400' : ''}`} />
                  <span>Refrescar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTrashModalOpen(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-barra de confirmación PIN para restaurar un registro */}
            {restoringTrashItem && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-amber-200">
                  Restaurar <strong className="font-mono text-white">{restoringTrashItem.codigo}</strong> ({restoringTrashItem.item}) a la hoja <strong>PROGRESO</strong>:
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="PIN 030621"
                    value={restorePinInput}
                    onChange={(e) => { setRestorePinInput(e.target.value); setRestorePinError(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirmRestoreTrash()}
                    className="w-28 px-2.5 py-1 text-center font-mono text-white bg-[#0d1017] border border-amber-400/50 rounded-lg outline-none"
                    autoFocus
                  />
                  {restorePinError && <span className="text-rose-400 font-bold">PIN inválido</span>}
                  <button
                    type="button"
                    disabled={restoringInProgress}
                    onClick={handleConfirmRestoreTrash}
                    className="px-3.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black cursor-pointer disabled:opacity-50"
                  >
                    {restoringInProgress ? 'Restaurando...' : 'Confirmar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRestoringTrashItem(null); setRestorePinInput(''); setRestorePinError(false); }}
                    className="px-2.5 py-1 rounded-lg border border-white/15 text-gray-300 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Tabla de la Papelera */}
            <div className="overflow-auto flex-1 custom-scrollbar border border-white/10 rounded-xl">
              {loadingTrash ? (
                <div className="py-16 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
                  <span>Cargando artículos de la papelera...</span>
                </div>
              ) : filteredTrashItems.length > 0 ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[#0d1017] z-10">
                    <tr className="border-b border-white/10 text-gray-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3 text-center">Fila Orig.</th>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Item NT/NS Descripción</th>
                      <th className="py-2.5 px-3">Ubicación</th>
                      <th className="py-2.5 px-3">Eliminado Por</th>
                      <th className="py-2.5 px-3">Fecha / Hora</th>
                      <th className="py-2.5 px-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTrashItems.map((t) => (
                      <tr key={t.trashRowNumber} className="hover:bg-white/5">
                        <td className="py-2 px-3 text-center font-mono text-gray-400">#{t.filaOriginal}</td>
                        <td className="py-2 px-3 font-mono font-bold text-amber-400">{t.codigo}</td>
                        <td className="py-2 px-3 text-white font-semibold">{t.item}</td>
                        <td className="py-2 px-3 font-mono text-gray-300">{t.ubicacion}</td>
                        <td className="py-2 px-3 font-bold text-cyan-300 uppercase">{t.eliminadoPor}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-gray-400">{t.fechaEliminacion}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setRestoringTrashItem(t);
                              setRestorePinInput('');
                              setRestorePinError(false);
                            }}
                            title="Devolver este artículo a la hoja PROGRESO"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/40 text-[11px] font-bold transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restaurar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-16 text-center text-gray-500 text-xs space-y-1">
                  <Archive className="w-8 h-8 mx-auto opacity-30" />
                  <p className="font-bold text-gray-400">La papelera está vacía</p>
                  <p>Aquí aparecerán todos los artículos en 0 que muevas a la pestaña "ELIMINADOS EN 0".</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal PIN 1501 para abrir Google Sheets */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#12161f] border border-[#00f2fe]/40 rounded-2xl w-full max-w-sm p-6 shadow-[0_0_35px_rgba(0,242,254,0.3)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-black uppercase text-[#00f2fe] flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" /> Acceso Protegido
              </span>
              <button onClick={() => { setIsPinModalOpen(false); setPinInput(''); }} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-300 text-center">Ingresa la contraseña para abrir Google Sheets:</p>
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
              placeholder="••••"
              className="w-full text-center text-2xl tracking-[0.4em] py-2.5 rounded-xl bg-[#0d1017] border border-white/20 text-white focus:border-[#00f2fe] outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
              autoFocus
            />
            {pinError && <p className="text-xs text-rose-400 font-bold text-center">Contraseña incorrecta.</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => { setIsPinModalOpen(false); setPinInput(''); }} className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-300 cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleVerifyPin} className="px-5 py-2 bg-[#00f2fe] text-[#0b0e14] font-black rounded-xl text-xs cursor-pointer">
                Abrir Documento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal PIN Maestro 030621 para Desbloquear un Ítem Cerrado */}
      {unlockTargetRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#12161f] border border-rose-500/50 rounded-2xl w-full max-w-sm p-6 shadow-[0_0_35px_rgba(244,63,94,0.3)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-black uppercase text-rose-400 flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> Desbloquear Candado (Col I)
              </span>
              <button
                onClick={() => { setUnlockTargetRow(null); setUnlockPinInput(''); setUnlockPinError(false); }}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300 text-center">
              Introduce el PIN maestro de 6 dígitos para abrir el candado del código{' '}
              <strong className="text-amber-400 font-mono">{unlockTargetRow.codigo}</strong>:
            </p>

            <input
              type="password"
              maxLength={6}
              value={unlockPinInput}
              onChange={(e) => { setUnlockPinInput(e.target.value); setUnlockPinError(false); }}
              placeholder="••••••"
              className="w-full text-center text-xl tracking-[0.4em] py-2.5 rounded-xl bg-[#0d1017] border border-rose-500/40 text-white focus:border-rose-400 outline-none font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmarDesbloqueo()}
              autoFocus
            />

            {unlockPinError && (
              <p className="text-xs text-rose-400 font-bold text-center">
                PIN maestro incorrecto. Inténtalo de nuevo.
              </p>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => { setUnlockTargetRow(null); setUnlockPinInput(''); setUnlockPinError(false); }}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarDesbloqueo}
                className="px-5 py-2 bg-rose-500 text-white font-black rounded-xl text-xs hover:bg-rose-600 flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Desbloquear</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación + PIN 030621 para Mover Artículos en 0 a "ELIMINADOS EN 0" */}
      {archiveZeroTargets && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#12161f] border border-amber-500/50 rounded-2xl w-full max-w-md p-6 shadow-[0_0_35px_rgba(245,158,11,0.25)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-2">
                <Archive className="w-4 h-4" /> Mover a Pestaña "ELIMINADOS EN 0"
              </span>
              <button
                onClick={() => { setArchiveZeroTargets(null); setArchiveZeroPinInput(''); setArchiveZeroPinError(false); }}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-300 space-y-2">
              <p>
                Se moverán <strong className="text-white">{archiveZeroTargets.length.toLocaleString()}</strong> artículo(s) con{' '}
                <strong className="text-cyan-300">NetSuite = 0</strong> y{' '}
                <strong className="text-cyan-300">Balance Newsoft = 0</strong> desde la hoja{' '}
                <strong className="text-white">PROGRESO</strong> hacia la pestaña de respaldo{' '}
                <strong className="text-amber-300">ELIMINADOS EN 0</strong> en Google Sheets.
              </p>

              {archiveZeroTargets.length === 1 && (
                <div className="p-2.5 rounded-xl bg-[#0d1017] border border-white/10 font-mono text-[11px]">
                  <span className="text-amber-400 font-bold">{archiveZeroTargets[0].codigo}</span> •{' '}
                  <span className="text-white">{archiveZeroTargets[0].item}</span> (Ubi:{' '}
                  {archiveZeroTargets[0].ubicacion})
                </div>
              )}

              <p className="text-[11px] text-gray-400">
                Introduce el PIN maestro de 6 dígitos para confirmar esta operación:
              </p>
            </div>

            <input
              type="password"
              maxLength={6}
              value={archiveZeroPinInput}
              onChange={(e) => { setArchiveZeroPinInput(e.target.value); setArchiveZeroPinError(false); }}
              placeholder="••••••"
              className="w-full text-center text-xl tracking-[0.4em] py-2.5 rounded-xl bg-[#0d1017] border border-amber-500/40 text-white focus:border-amber-400 outline-none font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmArchiveZero()}
              autoFocus
            />

            {archiveZeroPinError && (
              <p className="text-xs text-rose-400 font-bold text-center">
                PIN maestro incorrecto. Inténtalo de nuevo.
              </p>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => { setArchiveZeroTargets(null); setArchiveZeroPinInput(''); setArchiveZeroPinError(false); }}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmArchiveZero}
                className="px-5 py-2 bg-rose-500 text-white font-black rounded-xl text-xs hover:bg-rose-600 flex items-center gap-1.5 cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Confirmar y Mover</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
