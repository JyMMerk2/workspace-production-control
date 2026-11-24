import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  RefreshCw,
  GitCommit,
  Calendar,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Image as ImageIcon,
  Video,
  Check,
  Trash2,
  ArrowUpRight,
  Lightbulb,
  Layers,
  Zap,
  Megaphone,
  FileSpreadsheet,
  Sliders,
} from 'lucide-react';
import { supabase } from '../data/supabaseClient';

export interface UpdateEntry {
  sha: string;
  tag: 'NUEVO' | 'MEJORA' | 'CORRECCIÓN' | 'ACTUALIZACIÓN';
  color: string;
  title: string;
  details: string;
  author: string;
  fullDate: string;
  timestamp: number;
  year: string;
  steps?: string[];
  tip?: string;
  mockupType?: 'lotes' | 'inventario' | 'avisos' | 'excel' | 'auto';
}

interface MediaOverride {
  url: string;
  type: 'image' | 'video';
}

interface UpdatesHistoryViewProps {
  authenticatedUser?: string | null;
  initialSelectedTitle?: string | null;
  onNavigateTab?: (tab: any, subGid?: string, customTitle?: string) => void;
}

const GITHUB_REPO_COMMITS_BASE =
  'https://api.github.com/repos/JyMMerk2/workspace-production-control/commits';
const PERMANENT_STORAGE_KEY = 'boombah_updates_history_permanent_v2';
const MEDIA_CACHE_KEY = 'boombah_whats_new_media_v1';

const ADMIN_USERS = ['JMERCADO', 'ADMIN', 'SUPERVISOR'];

// Novedades destacadas con explicación paso a paso y mockup interactivo
const FEATURED_SHOWCASE: UpdateEntry[] = [
  {
    sha: 'feat-lotes',
    tag: 'NUEVO',
    color: 'text-[#00f2fe] border-[#00f2fe]/40 bg-[#00f2fe]/10',
    title: 'Lotes en Proceso en Vivo con color personal y flechas ▲ / ▼',
    details:
      'Toma tu cantidad o rack asignado en tiempo real, resalta tus filas con tu color único de operador y salta al instante entre páginas e ítems activos.',
    steps: [
      'Entra a Desglose Operativo y selecciona la cantidad o rack de tu lote activo.',
      'Tus filas quedarán marcadas con tu color personal para que ningún compañero duplique conteo.',
      'Usa las flechas (▲ / ▼) en tu etiqueta superior para saltar directo entre tus ítems.',
    ],
    tip: 'Cada operador tiene un contador y color distinto visible en tiempo real para todo el piso.',
    mockupType: 'lotes',
    author: 'Juan Mercado',
    fullDate: '20 nov 2026',
    timestamp: new Date('2026-11-24T09:00:00').getTime(),
    year: '2026',
  },
  {
    sha: 'feat-avisos',
    tag: 'NUEVO',
    color: 'text-amber-300 border-amber-400/40 bg-amber-500/10',
    title: 'Avisos Globales en Tiempo Real y modo Cintillo Deslizante',
    details:
      'Publica múltiples comunicados con nivel URGENTE, PRIORIDAD, NO OLVIDAR o AVISO visibles tanto en la barra principal como en Google Sheets a pantalla completa.',
    steps: [
      'Abre Configuración y elige el nivel de prioridad (Urgente, Prioridad, No Olvidar o Aviso).',
      'Selecciona si deseas mostrarlos como Tarjeta Rotativa o como Cintillo Deslizante Continuo.',
      'Todos los usuarios conectados verán el comunicado al instante sin recargar la página.',
    ],
    tip: 'Puedes publicar varios avisos a la vez y pausar el cintillo pasando el cursor encima.',
    mockupType: 'avisos',
    author: 'Juan Mercado',
    fullDate: '23 nov 2026',
    timestamp: new Date('2026-11-23T15:00:00').getTime(),
    year: '2026',
  },
  {
    sha: 'feat-inventario',
    tag: 'MEJORA',
    color: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10',
    title: 'Búsqueda instantánea (<1ms) en Toma y Pase de Inventario',
    details:
      'Motor de filtrado en memoria sincronizado cada 2 segundos para localizar al instante cualquier SKU, código componente, ubicación o comentario sin esperas.',
    steps: [
      'Abre Nave 6 o Pase de Inventario y escribe el SKU, código o ubicación en el buscador.',
      'Los resultados aparecen en menos de 1 milisegundo mientras escribes.',
      'Filtra por Pendientes, Validados OK, Revisión, Cerrados con candado o Nave 7.',
    ],
    tip: 'Puedes buscar por número de rack (ej. F-11-1) para auditar toda una estantería completa.',
    mockupType: 'inventario',
    author: 'Juan Mercado',
    fullDate: '19 nov 2026',
    timestamp: new Date('2026-11-19T10:15:00').getTime(),
    year: '2026',
  },
  {
    sha: 'feat-excel',
    tag: 'NUEVO',
    color: 'text-purple-300 border-purple-400/40 bg-purple-500/10',
    title: 'Exportación nativa a Excel (.xls) de Nave 7 y Cerrados con Candado',
    details:
      'Descarga reportes limpios en formato Excel directamente desde Desglose Operativo y controla el cierre de registros mediante candado con PIN.',
    steps: [
      'Filtra por Nave 7 o registros Cerrados dentro de Desglose Operativo.',
      'Haz clic en el botón de exportación para descargar el archivo .xls listo para auditar.',
      'Los registros cerrados quedan protegidos con candado y alertas automáticas a Slack.',
    ],
    tip: 'El archivo descargado conserva códigos, ubicaciones, diferencias y responsables.',
    mockupType: 'excel',
    author: 'Juan Mercado',
    fullDate: '18 nov 2026',
    timestamp: new Date('2026-11-18T16:00:00').getTime(),
    year: '2026',
  },
];

function detectMockupType(title: string): UpdateEntry['mockupType'] {
  const lower = title.toLowerCase();
  if (lower.includes('lote') || lower.includes('flecha') || lower.includes('color')) return 'lotes';
  if (lower.includes('aviso') || lower.includes('cintillo') || lower.includes('toolbar'))
    return 'avisos';
  if (lower.includes('inventario') || lower.includes('búsqueda') || lower.includes('sku'))
    return 'inventario';
  if (lower.includes('excel') || lower.includes('xls') || lower.includes('candado'))
    return 'excel';
  return 'auto';
}

function buildAutoSteps(entry: UpdateEntry): string[] {
  if (entry.steps && entry.steps.length > 0) return entry.steps;
  return [
    `Esta actualización (${entry.tag}) ya se encuentra activa en Boombah Workspace.`,
    entry.details
      ? `Detalle técnico: ${entry.details}.`
      : 'Aplica automáticamente en tu sesión sin necesidad de configuraciones adicionales.',
    'Si deseas ver una captura o video real, un administrador puede adjuntarlo en este panel.',
  ];
}

function parseCommitEntry(entry: any): UpdateEntry {
  const rawMsg: string = entry?.commit?.message || '';
  const lines = rawMsg
    .split('\n')
    .map((l: string) => l.trim())
    .filter(Boolean);
  const title = lines[0] || 'Actualización del sistema';
  const details = lines.slice(1).join(' • ');
  const lower = title.toLowerCase();

  let tag: UpdateEntry['tag'] = 'ACTUALIZACIÓN';
  let color = 'text-[#00f2fe] border-[#00f2fe]/40 bg-[#00f2fe]/10';

  if (lower.startsWith('add') || lower.startsWith('feat') || lower.startsWith('implement')) {
    tag = 'NUEVO';
    color = 'text-[#00f2fe] border-[#00f2fe]/40 bg-[#00f2fe]/10';
  } else if (lower.startsWith('fix') || lower.startsWith('resolve') || lower.startsWith('correg')) {
    tag = 'CORRECCIÓN';
    color = 'text-amber-300 border-amber-400/40 bg-amber-500/10';
  } else if (
    lower.startsWith('enhance') ||
    lower.startsWith('update') ||
    lower.startsWith('refactor')
  ) {
    tag = 'MEJORA';
    color = 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10';
  }

  const dateIso = entry?.commit?.author?.date;
  let fullDate = 'Reciente';
  let year = '2026';
  let timestamp = 0;

  if (dateIso) {
    try {
      const d = new Date(dateIso);
      timestamp = d.getTime();
      year = String(d.getFullYear());
      fullDate = d.toLocaleDateString('es-DO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      // Mantener valor por defecto
    }
  }

  return {
    sha: String(entry?.sha || '').slice(0, 7),
    tag,
    color,
    title,
    details,
    author: entry?.commit?.author?.name || 'Equipo Boombah',
    fullDate,
    timestamp,
    year,
    mockupType: detectMockupType(title),
  };
}

function mergePermanentUpdates(existing: UpdateEntry[], incoming: UpdateEntry[]): UpdateEntry[] {
  const map = new Map<string, UpdateEntry>();

  for (const item of FEATURED_SHOWCASE) {
    map.set(item.sha, item);
  }
  for (const item of existing) {
    if (item && item.sha && !item.sha.startsWith('feat-')) {
      map.set(item.sha, item);
    }
  }
  for (const item of incoming) {
    if (item && item.sha) {
      map.set(item.sha, item);
    }
  }

  const featured = FEATURED_SHOWCASE;
  const commits = Array.from(map.values())
    .filter((it) => !it.sha.startsWith('feat-'))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return [...featured, ...commits];
}

// Convierte enlaces de Google Drive / Google Vids / YouTube en URL embebible
function resolveEmbedMedia(rawUrl: string, explicitType?: 'image' | 'video') {
  const url = rawUrl.trim();
  const isGoogleDriveOrVids =
    url.includes('docs.google.com/videos') || url.includes('drive.google.com/file');

  if (isGoogleDriveOrVids) {
    const previewUrl = url.replace(/\/(play|view|edit)(\?.*)?$/, '/preview');
    return { kind: 'iframe' as const, src: previewUrl };
  }

  if (
    explicitType === 'video' ||
    /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)
  ) {
    return { kind: 'video' as const, src: url };
  }

  return { kind: 'image' as const, src: url };
}

// Mockups interactivos fieles a la UI real de Boombah Workspace
const InteractiveMockupPreview: React.FC<{ item: UpdateEntry }> = ({ item }) => {
  const kind = item.mockupType || detectMockupType(item.title);

  if (kind === 'lotes') {
    return (
      <div className="w-full h-full bg-[#0b0e14] rounded-xl border border-white/15 p-4 flex flex-col justify-between shadow-inner select-none">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#00f2fe]/15 border border-[#00f2fe]/50 text-[#00f2fe] text-[11px] font-black">
              ● TU LOTE ACTIVO: 12 ÍTEMS
            </span>
            <div className="inline-flex items-center rounded-lg bg-[#12161f] border border-white/15 overflow-hidden">
              <span className="px-2 py-0.5 text-[11px] font-bold text-[#00f2fe] border-r border-white/10">
                ▲
              </span>
              <span className="px-2 py-0.5 text-[11px] font-bold text-[#00f2fe]">▼</span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">En Vivo • Sincronizado</span>
        </div>

        <div className="space-y-1.5 my-2">
          {[
            { sku: 'BM-5060NI STL-40', loc: 'F-11-1', qty: 12, mine: true, user: 'TÚ' },
            { sku: 'BM-5060NI W-38', loc: 'F-11-2', qty: 18, mine: true, user: 'TÚ' },
            { sku: 'BM-5060W STL-24', loc: 'D-10-4', qty: 45, mine: false, user: 'CARLOS' },
            { sku: 'BM-5060WC23 C-24', loc: 'E-10-1', qty: 24, mine: true, user: 'TÚ' },
          ].map((row, idx) => (
            <div
              key={idx}
              className={`px-3 py-2 rounded-lg border flex items-center justify-between text-xs ${
                row.mine
                  ? 'bg-[#00f2fe]/12 border-[#00f2fe]/50 text-white'
                  : 'bg-amber-500/10 border-amber-400/35 text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                    row.mine ? 'bg-[#00f2fe] text-black' : 'bg-amber-400 text-black'
                  }`}
                >
                  {row.user}
                </span>
                <span className="font-mono font-bold">{row.sku}</span>
              </div>
              <div className="flex items-center gap-4 font-mono text-[11px]">
                <span className="text-gray-400">{row.loc}</span>
                <span className="font-black text-[#39ff14]">{row.qty} uds</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-[10px] text-gray-400 flex items-center justify-between pt-2 border-t border-white/10">
          <span>Vista previa interactiva • Desglose Operativo</span>
          <span className="text-[#00f2fe] font-bold">Salto rápido entre páginas</span>
        </div>
      </div>
    );
  }

  if (kind === 'avisos') {
    return (
      <div className="w-full h-full bg-[#0b0e14] rounded-xl border border-white/15 p-4 flex flex-col justify-between shadow-inner select-none">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <span className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5" />
            Barra de Control de Producción
          </span>
          <span className="text-[10px] font-mono text-emerald-400">● 4 Niveles Activos</span>
        </div>

        <div className="space-y-2 my-2">
          <div className="px-3 py-2 rounded-lg bg-red-600/25 border border-red-400/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-red-500 text-white text-[9px] font-black">
                URGENTE
              </span>
              <span className="text-xs font-extrabold text-red-100">
                Priorizar cierre de contenedor antes de las 3:00 PM
              </span>
            </div>
            <span className="text-[10px] font-mono text-white/70">1/4</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-400/70 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-400 text-black text-[9px] font-black">
              PRIORIDAD
            </span>
            <span className="text-xs font-extrabold text-amber-100">
              Validar órdenes pendientes de Full Dye
            </span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/70 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-400 text-black text-[9px] font-black">
              AVISO
            </span>
            <span className="text-xs font-extrabold text-emerald-100">
              Modo Cintillo Continuo disponible en Configuración
            </span>
          </div>
        </div>

        <div className="text-[10px] text-gray-400 flex items-center justify-between pt-2 border-t border-white/10">
          <span>Visible también en Google Sheets Pantalla Completa</span>
          <span className="text-amber-300 font-bold">Sincronizado vía Supabase</span>
        </div>
      </div>
    );
  }

  if (kind === 'inventario') {
    return (
      <div className="w-full h-full bg-[#0b0e14] rounded-xl border border-white/15 p-4 flex flex-col justify-between shadow-inner select-none">
        <div className="flex items-center gap-2 bg-[#12161f] border border-[#00f2fe]/50 rounded-lg px-3 py-2">
          <Search className="w-3.5 h-3.5 text-[#00f2fe]" />
          <span className="text-xs font-mono text-white">BM-5060NI</span>
          <span className="ml-auto text-[10px] font-mono text-[#39ff14] bg-[#39ff14]/10 px-2 py-0.5 rounded">
            0.4 ms • 37,610 filas
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 my-2 text-center">
          <div className="p-2 rounded-lg bg-[#12161f] border border-white/10">
            <div className="text-[10px] text-gray-400">Pendientes</div>
            <div className="text-sm font-black text-amber-300">30,965</div>
          </div>
          <div className="p-2 rounded-lg bg-[#12161f] border border-emerald-500/30">
            <div className="text-[10px] text-gray-400">Validados OK</div>
            <div className="text-sm font-black text-emerald-400">533</div>
          </div>
          <div className="p-2 rounded-lg bg-[#12161f] border border-cyan-500/30">
            <div className="text-[10px] text-gray-400">Nave 7</div>
            <div className="text-sm font-black text-[#00f2fe]">503</div>
          </div>
          <div className="p-2 rounded-lg bg-[#12161f] border border-purple-500/30">
            <div className="text-[10px] text-gray-400">Cerrados</div>
            <div className="text-sm font-black text-purple-300">6,126</div>
          </div>
        </div>

        <div className="text-[10px] text-gray-400 flex items-center justify-between pt-2 border-t border-white/10">
          <span>Motor de búsqueda instantánea en memoria</span>
          <span className="text-[#39ff14] font-bold">Caché activa cada 2s</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#0b0e14] rounded-xl border border-white/15 p-4 flex flex-col justify-between shadow-inner select-none">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <span className="text-xs font-black text-[#00f2fe] flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4" />
          Boombah Workspace • {item.tag}
        </span>
        <span className="text-[10px] font-mono text-gray-400">{item.fullDate}</span>
      </div>

      <div className="my-auto py-3 space-y-2">
        <div className="p-3 rounded-xl bg-[#12161f] border border-white/10">
          <div className="text-xs font-bold text-white mb-1">{item.title}</div>
          <div className="text-[11px] text-gray-400">
            {item.details || 'Módulo optimizado y desplegado automáticamente en producción.'}
          </div>
        </div>
      </div>

      <div className="text-[10px] text-gray-400 flex items-center justify-between pt-2 border-t border-white/10">
        <span>Commit: {item.sha}</span>
        <span className="text-emerald-400 font-bold">● Desplegado en Producción</span>
      </div>
    </div>
  );
};

export const UpdatesHistoryView: React.FC<UpdatesHistoryViewProps> = ({
  authenticatedUser,
  initialSelectedTitle,
  onNavigateTab,
}) => {
  const safeUser = (authenticatedUser || '').toUpperCase().trim();
  const isAdmin = ADMIN_USERS.includes(safeUser);

  const [updates, setUpdates] = useState<UpdateEntry[]>(() => {
    try {
      const saved = localStorage.getItem(PERMANENT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergePermanentUpdates(parsed, []);
        }
      }
    } catch {
      // Ignorar error de lectura
    }
    return FEATURED_SHOWCASE;
  });

  // Mapa de URLs multimedia (imagen o video) configuradas por el Admin
  const [mediaMap, setMediaMap] = useState<Record<string, MediaOverride>>(() => {
    try {
      const saved = localStorage.getItem(MEDIA_CACHE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignorar
    }
    return {};
  });

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isEditingMedia, setIsEditingMedia] = useState<boolean>(false);
  const [draftUrl, setDraftUrl] = useState<string>('');
  const [draftType, setDraftType] = useState<'image' | 'video'>('image');
  const [isSavingMedia, setIsSavingMedia] = useState<boolean>(false);
  const [mediaFeedback, setMediaFeedback] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<'ALL' | 'NUEVO' | 'MEJORA' | 'CORRECCIÓN'>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');

  // Cargar URLs multimedia desde Supabase para que todo el equipo las vea en vivo
  useEffect(() => {
    const loadSharedMedia = async () => {
      try {
        if (!supabase) return;
        const { data, error } = await supabase
          .from('boombah_announcements')
          .select('message')
          .eq('id', 'global_whats_new_media')
          .maybeSingle();

        if (!error && data?.message) {
          const parsed = JSON.parse(data.message);
          if (parsed && typeof parsed === 'object') {
            setMediaMap(parsed);
            localStorage.setItem(MEDIA_CACHE_KEY, JSON.stringify(parsed));
          }
        }
      } catch {
        // Mantener caché local
      }
    };
    loadSharedMedia();
  }, []);

  // Descargar commits de GitHub automáticamente
  const fetchAllPermanentHistory = async () => {
    setLoading(true);
    try {
      const allFetched: UpdateEntry[] = [];
      let page = 1;
      const maxPages = 15;

      while (page <= maxPages) {
        const res = await fetch(`${GITHUB_REPO_COMMITS_BASE}?per_page=100&page=${page}`, {
          headers: { Accept: 'application/vnd.github.v3+json' },
        });
        if (!res.ok) break;

        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) break;

        const mapped = data.filter((e: any) => e?.commit?.message).map(parseCommitEntry);
        allFetched.push(...mapped);

        if (data.length < 100) break;
        page++;
      }

      if (allFetched.length > 0) {
        setUpdates((prev) => {
          const merged = mergePermanentUpdates(prev, allFetched);
          try {
            localStorage.setItem(PERMANENT_STORAGE_KEY, JSON.stringify(merged));
          } catch {
            // Ignorar cuota
          }
          return merged;
        });
      }
    } catch {
      // Conservar caché
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPermanentHistory();
  }, []);

  // Lista del carrusel interactivo superior (Destacadas + últimos 8 commits de GitHub)
  const showcaseItems = useMemo(() => {
    return updates.slice(0, 12);
  }, [updates]);

  // Si el usuario hizo clic en una novedad específica del cintillo superior, abrir esa tarjeta
  useEffect(() => {
    if (!initialSelectedTitle || showcaseItems.length === 0) return;
    const needle = initialSelectedTitle.toLowerCase().trim();
    const foundIdx = showcaseItems.findIndex(
      (it) =>
        it.title.toLowerCase().includes(needle) || needle.includes(it.title.toLowerCase().slice(0, 25))
    );
    if (foundIdx >= 0) {
      setActiveIndex(foundIdx);
    }
  }, [initialSelectedTitle, showcaseItems]);

  const safeActiveIndex = showcaseItems.length > 0 ? activeIndex % showcaseItems.length : 0;
  const currentShowcase = showcaseItems[safeActiveIndex] || FEATURED_SHOWCASE[0];
  const currentMedia = mediaMap[currentShowcase.sha];

  const handleOpenMediaEditor = () => {
    setMediaFeedback('');
    setDraftUrl(currentMedia?.url || '');
    setDraftType(currentMedia?.type || 'image');
    setIsEditingMedia((prev) => !prev);
  };

  const persistMediaMap = async (nextMap: Record<string, MediaOverride>) => {
    setIsSavingMedia(true);
    setMediaMap(nextMap);
    try {
      localStorage.setItem(MEDIA_CACHE_KEY, JSON.stringify(nextMap));
    } catch {
      // Ignorar
    }

    try {
      if (supabase) {
        await supabase.from('boombah_announcements').upsert({
          id: 'global_whats_new_media',
          message: JSON.stringify(nextMap),
          active: true,
          priority: 'AVISO',
          updated_by: safeUser || 'ADMIN',
          updated_at: new Date().toISOString(),
        });
      }
      setMediaFeedback('¡Vista previa guardada y publicada en vivo para todo el equipo!');
    } catch {
      setMediaFeedback('Guardado localmente (verifica conexión con Supabase).');
    } finally {
      setIsSavingMedia(false);
    }
  };

  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = draftUrl.trim();
    const nextMap = { ...mediaMap };

    if (!cleanUrl) {
      delete nextMap[currentShowcase.sha];
    } else {
      nextMap[currentShowcase.sha] = { url: cleanUrl, type: draftType };
    }

    await persistMediaMap(nextMap);
    setIsEditingMedia(false);
  };

  const handleRemoveMedia = async () => {
    const nextMap = { ...mediaMap };
    delete nextMap[currentShowcase.sha];
    setDraftUrl('');
    await persistMediaMap(nextMap);
    setIsEditingMedia(false);
  };

  const handleTryFeature = (item: UpdateEntry) => {
    if (!onNavigateTab) return;
    const kind = item.mockupType || detectMockupType(item.title);
    if (kind === 'lotes' || kind === 'inventario' || kind === 'excel') {
      onNavigateTab('inventario-desglose', undefined, 'INVENTARIO - DESGLOSE OPERATIVO');
    } else if (kind === 'avisos') {
      onNavigateTab('configuracion', undefined, 'CONFIGURACIÓN');
    } else {
      onNavigateTab('dashboard-live', undefined, 'DASHBOARD EN VIVO');
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set<string>(updates.map((u) => u.year).filter(Boolean));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [updates]);

  const filteredUpdates = useMemo(() => {
    return updates.filter((u) => {
      if (tagFilter !== 'ALL' && u.tag !== tagFilter) return false;
      if (yearFilter !== 'ALL' && u.year !== yearFilter) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        u.title.toLowerCase().includes(q) ||
        u.details.toLowerCase().includes(q) ||
        u.fullDate.toLowerCase().includes(q) ||
        u.author.toLowerCase().includes(q) ||
        u.sha.toLowerCase().includes(q)
      );
    });
  }, [updates, tagFilter, yearFilter, searchTerm]);

  const stepsToRender = buildAutoSteps(currentShowcase);
  const resolvedMedia = currentMedia?.url
    ? resolveEmbedMedia(currentMedia.url, currentMedia.type)
    : null;

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Encabezado Superior estilo What's New */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#12161f] px-5 py-3.5 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#00f2fe]/15 border border-[#00f2fe]/40 text-[#00f2fe]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-black text-white tracking-wide flex flex-wrap items-center gap-2">
              <span>Novedades de Boombah Workspace</span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Sincronizado en vivo
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Explora paso a paso cada función nueva, mejora operativa y actualización del sistema
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAllPermanentHistory}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0d1017] hover:bg-white/10 text-gray-300 font-bold text-xs border border-white/10 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00f2fe]' : ''}`} />
          <span>{loading ? 'Buscando updates...' : 'Sincronizar GitHub'}</span>
        </button>
      </div>

      {/* ESCAPARATE PRINCIPAL ESTILO CHROME WHAT'S NEW */}
      <div className="bg-[#12161f] border border-[#00f2fe]/25 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Columna Izquierda: Explicación y pasos enumerados */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${currentShowcase.color}`}
              >
                {currentShowcase.tag}
              </span>
              <span className="text-[11px] font-mono text-gray-400">
                {safeActiveIndex + 1} de {showcaseItems.length} • {currentShowcase.fullDate}
              </span>
            </div>

            <h3 className="text-xl md:text-2xl font-black text-white leading-snug">
              {currentShowcase.title}
            </h3>

            <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
              {currentShowcase.details ||
                'Nueva mejora desplegada automáticamente para agilizar el control de producción e inventario.'}
            </p>

            {/* Pasos enumerados 1, 2, 3 */}
            <ol className="space-y-2.5 pt-1">
              {stepsToRender.map((stepText, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-300">
                  <span className="w-5 h-5 rounded-full bg-[#00f2fe]/15 border border-[#00f2fe]/40 text-[#00f2fe] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{stepText}</span>
                </li>
              ))}
            </ol>

            {currentShowcase.tip && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/25 flex items-start gap-2 text-xs text-amber-200">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="font-extrabold">Tip:</strong> {currentShowcase.tip}
                </span>
              </div>
            )}

            {/* Botones de acción (Probar ahora / Siguiente) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => handleTryFeature(currentShowcase)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#00f2fe] hover:brightness-110 text-[#0b0e14] text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.35)]"
                >
                  <span>Probar ahora</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveIndex((prev) => (prev + 1) % showcaseItems.length)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/15 text-xs font-bold transition-colors cursor-pointer"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Botón EXCLUSIVO PARA ADMINISTRADORES para adjuntar imagen o video */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenMediaEditor}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/40 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{currentMedia ? 'Cambiar Foto/Video (Admin)' : 'Poner Foto/Video (Admin)'}</span>
                </button>
              )}
            </div>

            {/* Formulario desplegable EXCLUSIVO ADMIN para pegar URL de imagen o video */}
            {isAdmin && isEditingMedia && (
              <form
                onSubmit={handleSaveMedia}
                className="p-3.5 rounded-2xl bg-[#0d1017] border border-amber-400/40 space-y-3"
              >
                <div className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                  Adjuntar captura o video real (Solo visible para ti como Admin)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftType('image')}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      draftType === 'image'
                        ? 'bg-[#00f2fe]/20 border-[#00f2fe] text-[#00f2fe]'
                        : 'bg-[#12161f] border-white/10 text-gray-400'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Imagen / GIF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftType('video')}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      draftType === 'video'
                        ? 'bg-[#00f2fe]/20 border-[#00f2fe] text-[#00f2fe]'
                        : 'bg-[#12161f] border-white/10 text-gray-400'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Video / Google Vids</span>
                  </button>
                </div>

                <input
                  type="url"
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  placeholder="Pega aquí la URL de la imagen, GIF o video de Google Drive / Vids..."
                  className="w-full px-3 py-2 rounded-lg bg-[#12161f] border border-white/15 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSavingMedia}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400 text-[#0b0e14] text-xs font-black uppercase cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSavingMedia ? 'Guardando...' : 'Guardar para todos'}</span>
                  </button>

                  {currentMedia && (
                    <button
                      type="button"
                      onClick={handleRemoveMedia}
                      disabled={isSavingMedia}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 text-xs font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Volver a Mockup</span>
                    </button>
                  )}
                </div>
              </form>
            )}

            {mediaFeedback && (
              <div className="text-[11px] font-bold text-emerald-300">{mediaFeedback}</div>
            )}
          </div>

          {/* Columna Derecha: Tarjeta visual grande (Imagen/Video real del Admin OR Mockup Interactivo) */}
          <div className="lg:col-span-7">
            <div className="w-full h-[310px] md:h-[360px] rounded-2xl bg-[#0d1017] border border-white/10 p-3 shadow-2xl overflow-hidden flex items-center justify-center">
              {resolvedMedia ? (
                resolvedMedia.kind === 'iframe' ? (
                  <iframe
                    src={resolvedMedia.src}
                    className="w-full h-full rounded-xl border-0 bg-black"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    title={currentShowcase.title}
                  />
                ) : resolvedMedia.kind === 'video' ? (
                  <video
                    src={resolvedMedia.src}
                    controls
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-contain rounded-xl bg-black"
                  />
                ) : (
                  <img
                    src={resolvedMedia.src}
                    alt={currentShowcase.title}
                    className="w-full h-full object-contain rounded-xl bg-[#0b0e14]"
                  />
                )
              ) : (
                <InteractiveMockupPreview item={currentShowcase} />
              )}
            </div>
          </div>
        </div>

        {/* CARRUSEL INFERIOR DE TARJETAS SELECCIONABLES (estilo Chrome What's New) */}
        <div className="pt-4 border-t border-white/10 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              setActiveIndex((prev) => (prev - 1 + showcaseItems.length) % showcaseItems.length)
            }
            title="Anterior novedad"
            className="p-2.5 rounded-full bg-[#0d1017] hover:bg-[#00f2fe]/20 text-gray-300 hover:text-[#00f2fe] border border-white/10 transition-colors cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-hidden">
            {[0, 1, 2, 3].map((offset) => {
              if (showcaseItems.length === 0) return null;
              const idx = (safeActiveIndex + offset) % showcaseItems.length;
              const card = showcaseItems[idx];
              const isSelected = idx === safeActiveIndex;
              const hasCustomMedia = Boolean(mediaMap[card.sha]?.url);

              return (
                <button
                  key={`${card.sha}_${idx}`}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`text-left p-3.5 rounded-2xl border transition-colors cursor-pointer flex flex-col justify-between min-h-[96px] ${
                    isSelected
                      ? 'bg-[#00f2fe]/15 border-[#00f2fe] shadow-[0_0_16px_rgba(0,242,254,0.2)]'
                      : 'bg-[#0d1017] border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${card.color}`}
                    >
                      {card.tag}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      {hasCustomMedia ? '🎬 Media' : '⚡ Guía'}
                    </span>
                  </div>
                  <div className="text-xs font-extrabold text-white line-clamp-2 leading-snug">
                    {card.title}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setActiveIndex((prev) => (prev + 1) % showcaseItems.length)}
            title="Siguiente novedad"
            className="p-2.5 rounded-full bg-[#0d1017] hover:bg-[#00f2fe]/20 text-gray-300 hover:text-[#00f2fe] border border-white/10 transition-colors cursor-pointer shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ARCHIVO HISTÓRICO PERMANENTE DE TODOS LOS COMMITS */}
      <div className="bg-[#12161f] border border-white/10 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#00f2fe]" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              Registro Histórico Completo ({updates.length.toLocaleString()} registros)
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
              <ShieldCheck className="w-3 h-3" />
              Archivo de por Vida
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center bg-[#0d1017] rounded-xl border border-white/10 p-1 text-xs gap-1">
              {(['ALL', 'NUEVO', 'MEJORA', 'CORRECCIÓN'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTagFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    tagFilter === tab
                      ? 'bg-[#00f2fe]/20 text-[#00f2fe]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab === 'ALL' ? 'Todos' : tab}
                </button>
              ))}
            </div>

            {availableYears.length > 0 && (
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="bg-[#0d1017] border border-white/10 text-xs text-gray-300 rounded-xl px-3 py-1.5 outline-none font-bold cursor-pointer"
              >
                <option value="ALL">Todos los años</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Año {yr}
                  </option>
                ))}
              </select>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar mejora, fecha o autor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-[#0d1017] border border-white/10 text-xs text-white placeholder-gray-500 focus:border-[#00f2fe] outline-none w-56"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1">
          {filteredUpdates.length > 0 ? (
            filteredUpdates.map((item, idx) => (
              <div
                key={item.sha + idx}
                onClick={() => {
                  const inShowcase = showcaseItems.findIndex((s) => s.sha === item.sha);
                  if (inShowcase >= 0) {
                    setActiveIndex(inShowcase);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="p-3 rounded-xl bg-[#0d1017] border border-white/10 hover:border-cyan-500/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${item.color}`}
                    >
                      {item.tag}
                    </span>
                    <span className="text-xs font-bold text-white">{item.title}</span>
                  </div>
                  {item.details && <p className="text-[11px] text-gray-400 pl-1">{item.details}</p>}
                </div>

                <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1 shrink-0 text-[10px] font-mono text-gray-400">
                  <span className="inline-flex items-center gap-1 text-gray-200 font-bold">
                    <Calendar className="w-3 h-3 text-[#00f2fe]" />
                    {item.fullDate}
                  </span>
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {item.author}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded">
                      <GitCommit className="w-3 h-3" />
                      {item.sha}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-gray-500 text-xs">
              {loading
                ? 'Sincronizando historial permanente...'
                : 'No se encontraron actualizaciones con ese filtro.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
