import React, { useState, useEffect } from 'react';
import { Sparkles, X, History } from 'lucide-react';

export interface FeatureItem {
  tag: string;
  text: string;
  color: string;
  date?: string;
}

interface FeaturesTickerProps {
  onOpenHistory?: () => void;
}

const GITHUB_COMMITS_URL =
  'https://api.github.com/repos/JyMMerk2/workspace-production-control/commits?per_page=8';

const FALLBACK_NOVEDADES: FeatureItem[] = [
  {
    tag: 'NUEVO',
    text: 'Lotes en Proceso en Vivo: toma tu cantidad o rack y resalta tus ítems con tu color personal.',
    color: 'text-[#00f2fe] border-[#00f2fe]/40 bg-[#00f2fe]/10',
    date: '19 nov 2026'
  },
  {
    tag: 'MEJORA',
    text: 'Flechas de salto rápido (▲ / ▼) en tu etiqueta de lote para navegar directo entre páginas e ítems.',
    color: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10',
    date: '19 nov 2026'
  },
  {
    tag: 'VELOCIDAD',
    text: 'Búsqueda instantánea (<1ms) en Toma y Pase de Inventario con caché sincronizada cada 2 segundos.',
    color: 'text-amber-300 border-amber-400/40 bg-amber-500/10',
    date: '19 nov 2026'
  },
  {
    tag: 'EXPORTACIÓN',
    text: 'Descarga directa en Excel (.xls) de artículos en Nave 7 y registros Cerrados con candado.',
    color: 'text-purple-300 border-purple-400/40 bg-purple-500/10',
    date: '18 nov 2026'
  }
];

function classifyCommit(message: string, dateIso?: string): FeatureItem {
  const firstLine = message.split('\n')[0].trim();
  const lower = firstLine.toLowerCase();

  let tag = 'ACTUALIZACIÓN';
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

  let formattedDate = '';
  if (dateIso) {
    try {
      const d = new Date(dateIso);
      formattedDate = d.toLocaleDateString('es-DO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      formattedDate = '';
    }
  }

  return {
    tag,
    text: firstLine,
    color,
    date: formattedDate
  };
}

export const FeaturesTicker: React.FC<FeaturesTickerProps> = ({ onOpenHistory }) => {
  const [visible, setVisible] = useState(true);
  const [items, setItems] = useState<FeatureItem[]>(() => {
    try {
      const cached = localStorage.getItem('boombah_github_ticker_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignorar errores de lectura de caché
    }
    return FALLBACK_NOVEDADES;
  });

  useEffect(() => {
    let isMounted = true;

    const loadLatestCommits = async () => {
      try {
        const res = await fetch(GITHUB_COMMITS_URL, {
          headers: { Accept: 'application/vnd.github.v3+json' }
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return;

        const mapped: FeatureItem[] = data
          .filter((entry: any) => entry?.commit?.message)
          .map((entry: any) =>
            classifyCommit(entry.commit.message, entry.commit?.author?.date)
          );

        if (mapped.length > 0 && isMounted) {
          setItems(mapped);
          try {
            localStorage.setItem('boombah_github_ticker_v2', JSON.stringify(mapped));
          } catch {
            // Ignorar si localStorage está lleno
          }
        }
      } catch {
        // Mantener caché o respaldo silenciosamente
      }
    };

    loadLatestCommits();
    const interval = setInterval(loadLatestCommits, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="w-full bg-[#0d111a] border-b border-cyan-500/20 px-3 py-1.5 flex items-center gap-3 overflow-hidden select-none">
      {/* Insignia fija izquierda (clic abre el Historial de Updates) */}
      <button
        type="button"
        onClick={onOpenHistory}
        title="Ver historial completo de actualizaciones"
        className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#00f2fe]/15 hover:bg-[#00f2fe]/25 border border-[#00f2fe]/35 text-[#00f2fe] text-[10px] font-black uppercase tracking-wider shrink-0 transition-colors cursor-pointer"
      >
        <Sparkles className="w-3 h-3" />
        <span>Novedades</span>
      </button>

      {/* Carril animado (se pausa al pasar el cursor encima) */}
      <div
        onClick={onOpenHistory}
        title="Clic para abrir el Historial de Updates"
        className="relative flex-1 overflow-hidden group cursor-pointer"
      >
        <style>{`
          @keyframes boombah-marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .animate-boombah-ticker {
            display: flex;
            width: max-content;
            animation: boombah-marquee 45s linear infinite;
          }
          .group:hover .animate-boombah-ticker {
            animation-play-state: paused;
          }
        `}</style>

        <div className="animate-boombah-ticker items-center gap-8 text-xs">
          {[...items, ...items].map((item, idx) => (
            <div key={idx} className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${item.color}`}>
                {item.tag}
              </span>
              <span className="text-gray-300 font-medium text-[11px]">{item.text}</span>
              {item.date && (
                <span className="text-[10px] font-mono text-gray-400">({item.date})</span>
              )}
              <span className="text-white/15 ml-4">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* Botón rápido para ver historial completo */}
      {onOpenHistory && (
        <button
          type="button"
          onClick={onOpenHistory}
          className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-[10px] font-bold transition-colors cursor-pointer shrink-0"
        >
          <History className="w-3 h-3 text-[#00f2fe]" />
          <span>Historial</span>
        </button>
      )}

      {/* Botón discreto para cerrar */}
      <button
        type="button"
        onClick={() => setVisible(false)}
        title="Ocultar cintillo de novedades"
        className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
