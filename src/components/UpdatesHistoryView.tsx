import React, { useState, useEffect, useMemo } from 'react';
import { History, Search, RefreshCw, GitCommit, Calendar, User, ShieldCheck } from 'lucide-react';

interface UpdateEntry {
  sha: string;
  tag: 'NUEVO' | 'MEJORA' | 'CORRECCIÓN' | 'ACTUALIZACIÓN';
  color: string;
  title: string;
  details: string;
  author: string;
  fullDate: string;
  timestamp: number;
  year: string;
}

const GITHUB_REPO_COMMITS_BASE =
  'https://api.github.com/repos/JyMMerk2/workspace-production-control/commits';
const PERMANENT_STORAGE_KEY = 'boombah_updates_history_permanent_v1';

// Base histórica permanente garantizada (nunca se borra incluso sin conexión)
const SEED_PERMANENT_HISTORY: UpdateEntry[] = [
  {
    sha: 'seed-004',
    tag: 'NUEVO',
    color: 'text-[#00f2fe] border-[#00f2fe]/40 bg-[#00f2fe]/10',
    title: 'Cintillo de Novedades en Vivo e Historial Permanente de Updates',
    details: 'Barra superior automática conectada al repositorio y registro histórico acumulativo de por vida.',
    author: 'Juan Mercado',
    fullDate: '20 nov 2026, 09:45 a. m.',
    timestamp: new Date('2026-11-20T09:45:00').getTime(),
    year: '2026'
  },
  {
    sha: 'seed-003',
    tag: 'MEJORA',
    color: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10',
    title: 'Flechas de salto rápido (▲ / ▼) y contador por operador en Lotes en Proceso',
    details: 'Navegación instantánea entre páginas e ítems activos con resaltado por color único de usuario.',
    author: 'Juan Mercado',
    fullDate: '19 nov 2026, 03:10 p. m.',
    timestamp: new Date('2026-11-19T15:10:00').getTime(),
    year: '2026'
  },
  {
    sha: 'seed-002',
    tag: 'MEJORA',
    color: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10',
    title: 'Búsqueda instantánea (<1ms) en Toma y Pase de Inventario y KPIs en tiempo real',
    details: 'Sincronización continua en memoria vía CSV y métricas protegidas contra caché atrasada.',
    author: 'Juan Mercado',
    fullDate: '19 nov 2026, 10:15 a. m.',
    timestamp: new Date('2026-11-19T10:15:00').getTime(),
    year: '2026'
  },
  {
    sha: 'seed-001',
    tag: 'NUEVO',
    color: 'text-[#00f2fe] border-[#00f2fe]/40 bg-[#00f2fe]/10',
    title: 'Exportación nativa a Excel (.xls) de Nave 7 y Cerrados + Control de Candados con PIN',
    details: 'Descarga directa desde Desglose Operativo y alertas automáticas a Slack.',
    author: 'Juan Mercado',
    fullDate: '18 nov 2026, 04:00 p. m.',
    timestamp: new Date('2026-11-18T16:00:00').getTime(),
    year: '2026'
  }
];

function parseCommitEntry(entry: any): UpdateEntry {
  const rawMsg: string = entry?.commit?.message || '';
  const lines = rawMsg.split('\n').map((l: string) => l.trim()).filter(Boolean);
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
  } else if (lower.startsWith('enhance') || lower.startsWith('update') || lower.startsWith('refactor')) {
    tag = 'MEJORA';
    color = 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10';
  }

  const dateIso = entry?.commit?.author?.date;
  let fullDate = 'Fecha no disponible';
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
        minute: '2-digit'
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
    year
  };
}

// Fusiona los registros existentes con los nuevos sin borrar jamás el historial previo
function mergePermanentUpdates(existing: UpdateEntry[], incoming: UpdateEntry[]): UpdateEntry[] {
  const map = new Map<string, UpdateEntry>();

  for (const item of SEED_PERMANENT_HISTORY) {
    map.set(item.sha, item);
  }
  for (const item of existing) {
    if (item && item.sha) map.set(item.sha, item);
  }
  for (const item of incoming) {
    if (item && item.sha) map.set(item.sha, item);
  }

  return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export const UpdatesHistoryView: React.FC = () => {
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
      // Ignorar si localStorage no está disponible
    }
    return SEED_PERMANENT_HISTORY;
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<'ALL' | 'NUEVO' | 'MEJORA' | 'CORRECCIÓN'>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');

  // Descarga todas las páginas del historial completo y las acumula permanentemente
  const fetchAllPermanentHistory = async () => {
    setLoading(true);
    try {
      const allFetched: UpdateEntry[] = [];
      let page = 1;
      const maxPages = 20; // Hasta 2,000 commits históricos

      while (page <= maxPages) {
        const res = await fetch(`${GITHUB_REPO_COMMITS_BASE}?per_page=100&page=${page}`, {
          headers: { Accept: 'application/vnd.github.v3+json' }
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
            // Ignorar si excede cuota
          }
          return merged;
        });
      }
    } catch {
      // Conserva siempre el historial permanente almacenado
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPermanentHistory();
  }, []);

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

  return (
    <div className="space-y-4 pb-12 max-w-5xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#12161f] p-4 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#00f2fe]/10 border border-[#00f2fe]/30 text-[#00f2fe]">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase text-white tracking-wide flex flex-wrap items-center gap-2">
              <span>Historial Permanente de Updates & Mejoras</span>
              <span className="text-[10px] font-mono font-bold text-[#00f2fe] bg-[#00f2fe]/10 px-2 py-0.5 rounded-full border border-[#00f2fe]/25">
                {updates.length.toLocaleString()} registros guardados
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                <ShieldCheck className="w-3 h-3" />
                Archivo Histórico de por Vida
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Registro acumulativo permanente de todas las funciones, mejoras y correcciones desplegadas en Boombah Workspace
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAllPermanentHistory}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs border border-white/10 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00f2fe]' : ''}`} />
          <span>{loading ? 'Sincronizando...' : 'Sincronizar Nuevos'}</span>
        </button>
      </div>

      {/* Filtros por Tipo, Año y Buscador */}
      <div className="bg-[#12161f] border border-white/10 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center bg-[#0d1017] rounded-xl border border-white/10 p-1 text-xs gap-1">
              {(['ALL', 'NUEVO', 'MEJORA', 'CORRECCIÓN'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTagFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    tagFilter === tab ? 'bg-[#00f2fe]/20 text-[#00f2fe]' : 'text-gray-400 hover:text-white'
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
                className="bg-[#0d1017] border border-white/10 text-xs text-gray-300 rounded-xl px-3 py-2 outline-none font-bold cursor-pointer"
              >
                <option value="ALL">Todos los años</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Año {yr}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar mejora, fecha, autor o año..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-[#0d1017] border border-white/10 text-xs text-white placeholder-gray-500 focus:border-[#00f2fe] outline-none w-64 sm:w-72"
            />
          </div>
        </div>

        {/* Lista Cronológica Permanente */}
        <div className="space-y-2.5 max-h-[68vh] overflow-y-auto custom-scrollbar pr-1">
          {filteredUpdates.length > 0 ? (
            filteredUpdates.map((item, idx) => (
              <div
                key={item.sha + idx}
                className="p-3.5 rounded-xl bg-[#0d1017] border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${item.color}`}>
                      {item.tag}
                    </span>
                    <span className="text-sm font-bold text-white">{item.title}</span>
                  </div>
                  {item.details && (
                    <p className="text-xs text-gray-400 pl-1">{item.details}</p>
                  )}
                </div>

                <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 shrink-0 text-[11px] font-mono text-gray-400">
                  <span className="inline-flex items-center gap-1 text-gray-200 font-bold">
                    <Calendar className="w-3.5 h-3.5 text-[#00f2fe]" />
                    {item.fullDate}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
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
            <div className="py-12 text-center text-gray-500 text-xs">
              {loading ? 'Sincronizando historial permanente...' : 'No se encontraron actualizaciones con ese filtro.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
