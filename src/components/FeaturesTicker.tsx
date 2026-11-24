import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, History, ChevronLeft, ChevronRight } from 'lucide-react';

export interface FeatureItem {
  tag: string;
  text: string;
  color: string;
  date?: string;
}

interface FeaturesTickerProps {
  onOpenHistory?: (selectedTitle?: string) => void;
}

const GITHUB_COMMITS_URL =
  'https://api.github.com/repos/JyMMerk2/workspace-production-control/commits?per_page=8';

const FALLBACK_NOVEDADES: FeatureItem[] = [
  {
    tag: 'NUEVO',
    text: 'Lotes en Proceso en Vivo con color personal y flechas ▲ / ▼',
    color: 'text-[#00f2fe] border-[#00f2fe]/40 bg-[#00f2fe]/10',
    date: '20 nov 2026',
  },
  {
    tag: 'NUEVO',
    text: 'Avisos Globales en Tiempo Real y modo Cintillo Deslizante',
    color: 'text-amber-300 border-amber-400/40 bg-amber-500/10',
    date: '23 nov 2026',
  },
  {
    tag: 'MEJORA',
    text: 'Búsqueda instantánea (<1ms) en Toma y Pase de Inventario',
    color: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10',
    date: '19 nov 2026',
  },
  {
    tag: 'NUEVO',
    text: 'Exportación nativa a Excel (.xls) de Nave 7 y Cerrados con Candado',
    color: 'text-purple-300 border-purple-400/40 bg-purple-500/10',
    date: '18 nov 2026',
  },
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
        year: 'numeric',
      });
    } catch {
      formattedDate = '';
    }
  }

  return {
    tag,
    text: firstLine,
    color,
    date: formattedDate,
  };
}

export const FeaturesTicker: React.FC<FeaturesTickerProps> = ({ onOpenHistory }) => {
  const [visible, setVisible] = useState(true);
  const isPausedRef = useRef<boolean>(false);
  const offsetPxRef = useRef<number>(0);
  const halfWidthRef = useRef<number>(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const resumeTimeoutRef = useRef<number | null>(null);

  const [items, setItems] = useState<FeatureItem[]>(() => {
    try {
      const cached = localStorage.getItem('boombah_github_ticker_v3');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignorar errores de lectura de caché
    }
    return FALLBACK_NOVEDADES;
  });

  // Medir el ancho de la mitad del carrusel solo cuando cambian los items o el tamaño de ventana
  const measureHalfWidth = useCallback(() => {
    if (trackRef.current) {
      halfWidthRef.current = trackRef.current.scrollWidth / 2;
    }
  }, []);

  useEffect(() => {
    measureHalfWidth();
    window.addEventListener('resize', measureHalfWidth);
    return () => window.removeEventListener('resize', measureHalfWidth);
  }, [items, measureHalfWidth]);

  useEffect(() => {
    let isMounted = true;

    const loadLatestCommits = async () => {
      try {
        const res = await fetch(GITHUB_COMMITS_URL, {
          headers: { Accept: 'application/vnd.github.v3+json' },
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return;

        const mappedCommits: FeatureItem[] = data
          .filter((entry: any) => entry?.commit?.message)
          .map((entry: any) =>
            classifyCommit(entry.commit.message, entry.commit?.author?.date)
          );

        if (mappedCommits.length > 0 && isMounted) {
          const combined = [...FALLBACK_NOVEDADES, ...mappedCommits];
          const nextSerialized = JSON.stringify(combined);
          const prevSerialized = localStorage.getItem('boombah_github_ticker_v3');
          if (nextSerialized !== prevSerialized) {
            setItems(combined);
            try {
              localStorage.setItem('boombah_github_ticker_v3', nextSerialized);
            } catch {
              // Ignorar si localStorage está lleno
            }
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

  // Animación pura por GPU (transform: translate3d) sin provocar repintados ni parpadeos
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    const speedPxPerSec = 42;

    const step = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const track = trackRef.current;
      if (track) {
        if (halfWidthRef.current <= 0) {
          halfWidthRef.current = track.scrollWidth / 2;
        }

        const halfWidth = halfWidthRef.current;
        if (!isPausedRef.current && halfWidth > 0) {
          offsetPxRef.current += speedPxPerSec * dt;
          if (offsetPxRef.current >= halfWidth) {
            offsetPxRef.current -= halfWidth;
          }
          track.style.transform = `translate3d(-${offsetPxRef.current}px, 0, 0)`;
        }
      }

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [items]);

  // Limpiar temporizador de reanudación al desmontar
  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        window.clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, []);

  // Desplazamiento manual suave sin reflows
  const handleManualScroll = (direction: 'left' | 'right') => {
    const track = trackRef.current;
    if (!track) return;

    const halfWidth = halfWidthRef.current || track.scrollWidth / 2;
    const delta = direction === 'right' ? 280 : -280;

    isPausedRef.current = true;
    if (resumeTimeoutRef.current) {
      window.clearTimeout(resumeTimeoutRef.current);
    }

    if (halfWidth > 0) {
      let nextOffset = offsetPxRef.current + delta;
      if (nextOffset < 0) nextOffset += halfWidth;
      if (nextOffset >= halfWidth) nextOffset -= halfWidth;
      offsetPxRef.current = nextOffset;

      track.style.transition = 'transform 300ms ease-out';
      track.style.transform = `translate3d(-${offsetPxRef.current}px, 0, 0)`;
      window.setTimeout(() => {
        if (trackRef.current) trackRef.current.style.transition = 'none';
      }, 310);
    }

    resumeTimeoutRef.current = window.setTimeout(() => {
      isPausedRef.current = false;
    }, 3000);
  };

  if (!visible) return null;

  return (
    <div
      style={{ contain: 'layout paint' }}
      className="w-full h-[34px] bg-[#0d111a] border-b border-cyan-500/20 px-3 flex items-center gap-2 overflow-hidden select-none shrink-0"
    >
      {/* Insignia fija izquierda (clic abre el escaparate de Novedades) */}
      <button
        type="button"
        onClick={() => onOpenHistory?.()}
        title="Explorar Novedades y Guías Interactivas"
        className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#00f2fe]/15 hover:bg-[#00f2fe]/25 border border-[#00f2fe]/35 text-[#00f2fe] text-[10px] font-black uppercase tracking-wider shrink-0 transition-colors cursor-pointer"
      >
        <Sparkles className="w-3 h-3" />
        <span>Novedades</span>
      </button>

      {/* Flecha Izquierda */}
      <button
        type="button"
        onClick={() => handleManualScroll('left')}
        title="Retroceder novedades"
        aria-label="Retroceder novedades"
        className="p-1 rounded-md bg-white/5 hover:bg-[#00f2fe]/20 text-gray-400 hover:text-[#00f2fe] border border-white/10 hover:border-[#00f2fe]/40 transition-colors cursor-pointer shrink-0"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Carril acelerado por GPU: clic en un ítem abre directamente esa novedad */}
      <div
        onMouseEnter={() => {
          isPausedRef.current = true;
        }}
        onMouseLeave={() => {
          isPausedRef.current = false;
        }}
        className="relative flex-1 overflow-hidden"
      >
        <div
          ref={trackRef}
          style={{ willChange: 'transform' }}
          className="flex w-max items-center gap-8 text-xs"
        >
          {[...items, ...items].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onOpenHistory?.(item.text)}
              title="Clic para ver explicación y ejemplo visual"
              className="inline-flex items-center gap-2 whitespace-nowrap hover:brightness-125 cursor-pointer"
            >
              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${item.color}`}>
                {item.tag}
              </span>
              <span className="text-gray-300 font-medium text-[11px]">{item.text}</span>
              {item.date && (
                <span className="text-[10px] font-mono text-gray-400">({item.date})</span>
              )}
              <span className="text-white/15 ml-4">•</span>
            </button>
          ))}
        </div>
      </div>

      {/* Flecha Derecha */}
      <button
        type="button"
        onClick={() => handleManualScroll('right')}
        title="Adelantar novedades"
        aria-label="Adelantar novedades"
        className="p-1 rounded-md bg-white/5 hover:bg-[#00f2fe]/20 text-gray-400 hover:text-[#00f2fe] border border-white/10 hover:border-[#00f2fe]/40 transition-colors cursor-pointer shrink-0"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Botón rápido para ver historial completo */}
      {onOpenHistory && (
        <button
          type="button"
          onClick={() => onOpenHistory()}
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
