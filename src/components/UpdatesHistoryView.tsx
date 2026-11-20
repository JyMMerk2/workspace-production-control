import React, { useState, useEffect, useMemo } from 'react';
import { History, Sparkles, Search, RefreshCw, GitCommit, Calendar, User } from 'lucide-react';

interface UpdateEntry {
  sha: string;
  tag: 'NUEVO' | 'MEJORA' | 'CORRECCIÓN' | 'ACTUALIZACIÓN';
  color: string;
  title: string;
  details: string;
  author: string;
  fullDate: string;
  year: string;
}

const GITHUB_HISTORY_URL =
  'https://api.github.com/repos/JyMMerk2/workspace-production-control/commits?per_page=40';

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

  if (dateIso) {
    try {
      const d = new Date(dateIso);
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
    year
  };
}

export const UpdatesHistoryView: React.FC = () => {
  const [updates, setUpdates] = useState<UpdateEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<'ALL' | 'NUEVO' | 'MEJORA' | 'CORRECCIÓN'>('ALL');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(GITHUB_HISTORY_URL, {
        headers: { Accept: 'application/vnd.github.v3+json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const parsed = data.map(parseCommitEntry);
          setUpdates(parsed);
          try {
            localStorage.setItem('boombah_updates_history_full', JSON.stringify(parsed));
          } catch {}
        }
      }
    } catch {
      try {
        const cached = localStorage.getItem('boombah_updates_history_full');
        if (cached) setUpdates(JSON.parse(cached));
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredUpdates = useMemo(() => {
    return updates.filter((u) => {
      if (tagFilter !== 'ALL' && u.tag !== tagFilter) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        u.title.toLowerCase().includes(q) ||
        u.details.toLowerCase().includes(q) ||
        u.fullDate.toLowerCase().includes(q) ||
        u.sha.toLowerCase().includes(q)
      );
    });
  }, [updates, tagFilter, searchTerm]);

  return (
    <div className="space-y-4 pb-12 max-w-5xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#12161f] p-4 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#00f2fe]/10 border border-[#00f2fe]/30 text-[#00f2fe]">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase text-white tracking-wide flex items-center gap-2">
              <span>Historial de Updates & Mejoras</span>
              <span className="text-[10px] font-mono font-bold text-[#00f2fe] bg-[#00f2fe]/10 px-2 py-0.5 rounded-full border border-[#00f2fe]/25">
                {updates.length} versiones
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Registro cronológico automático de todas las nuevas funciones y mejoras desplegadas en Boombah Workspace
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs border border-white/10 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00f2fe]' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Filtros y Buscador */}
      <div className="bg-[#12161f] border border-white/10 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
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

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar mejora, fecha o año..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-[#0d1017] border border-white/10 text-xs text-white placeholder-gray-500 focus:border-[#00f2fe] outline-none w-64 sm:w-72"
            />
          </div>
        </div>

        {/* Lista Cronológica */}
        <div className="space-y-2.5">
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
              {loading ? 'Cargando historial de actualizaciones...' : 'No se encontraron actualizaciones con ese filtro.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
