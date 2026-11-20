import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, History, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { useUrgentAnnouncement } from '../hooks/useUrgentAnnouncement';

export interface FeatureItem {
  tag: string;
  text: string;
  color: string;
  date?: string;
  isUrgent?: boolean;
}

interface FeaturesTickerProps {
  onOpenHistory?: () => void;
}

const GITHUB_COMMITS_URL =
  'https://api.github.com/repos/JyMMerk2/workspace-production-control/commits?per_page=8';

const DISMISSED_URGENT_KEY = 'boombah_dismissed_urgent_stamp';

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
  const { announcement } = useUrgentAnnouncement();
  const [visible, setVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const resumeTimeoutRef = useRef<number | null>(null);

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

  // Si se publica o modifica un comunicado urgente activo y el usuario tenía cerrado el cintillo,
  // volver a abrirlo automáticamente para asegurar que lo vea.
  useEffect(() => {
    if (announcement.active && announcement.message.trim()) {
      const stamp = `${announcement.updatedAt}::${announcement.message.trim()}`;
      try {
        const dismissedStamp = localStorage.getItem(DISMISSED_URGENT_KEY);
        if (dismissedStamp !== stamp) {
          setVisible(true);
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = 0;
          }
        }
      } catch {
        setVisible(true);
      }
    }
  }, [announcement]);

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

  // Avance automático continuo suave + bucle infinito sin cortes
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    const speedPxPerSec = 42; // Velocidad cómoda de lectura

    const step = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const container = scrollContainerRef.current;
      const track = trackRef.current;

      if (container && track && !isPaused) {
        const halfWidth = track.scrollWidth / 2;
        if (halfWidth > 0) {
          container.scrollLeft += speedPxPerSec * dt;
          if (container.scrollLeft >= halfWidth) {
            container.scrollLeft -= halfWidth;
          }
        }
      }

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, items, announcement]);

  // Limpiar temporizador de reanudación al desmontar
  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        window.clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, []);

  // Desplazamiento manual a discreción del usuario (izquierda o derecha)
  const handleManualScroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const halfWidth = track.scrollWidth / 2;
    const delta = direction === 'right' ? 280 : -280;

    setIsPaused(true);
    if (resumeTimeoutRef.current) {
      window.clearTimeout(resumeTimeoutRef.current);
    }

    // Si retrocede estando cerca del inicio, saltar suavemente a la segunda mitad para bucle continuo
    if (direction === 'left' && container.scrollLeft + delta < 0 && halfWidth > 0) {
      container.scrollLeft += halfWidth;
    }

    container.scrollBy({
      left: delta,
      behavior: 'smooth'
    });

    // Reanudar movimiento automático 3.5 segundos después de que el usuario deje de usar las flechas
    resumeTimeoutRef.current = window.setTimeout(() => {
      setIsPaused(false);
    }, 3500);
  };

  // Cerrar el cintillo (y recordar que este comunicado ya fue leído hasta que haya uno nuevo)
  const handleCloseTicker = () => {
    if (announcement.active && announcement.message.trim()) {
      const stamp = `${announcement.updatedAt}::${announcement.message.trim()}`;
      try {
        localStorage.setItem(DISMISSED_URGENT_KEY, stamp);
      } catch {
        // Ignorar
      }
    }
    setVisible(false);
  };

  if (!visible) return null;

  const hasUrgent = Boolean(announcement.active && announcement.message.trim());

  const urgentItem: FeatureItem | null = hasUrgent
    ? {
        tag: 'AVISO IMPORTANTE',
        text: announcement.message.trim(),
        color: 'text-amber-950 border-amber-300 bg-amber-400',
        date: announcement.updatedBy ? `Por: ${announcement.updatedBy}` : undefined,
        isUrgent: true,
      }
    : null;

  const combinedItems = urgentItem ? [urgentItem, ...items] : items;

  return (
    <div
      className={`w-full border-b px-3 py-1.5 flex items-center gap-2 overflow-hidden select-none transition-colors ${
        hasUrgent
          ? 'bg-gradient-to-r from-[#240d12] via-[#1a1114] to-[#0d111a] border-amber-500/50 shadow-[0_2px_16px_rgba(245,158,11,0.18)]'
          : 'bg-[#0d111a] border-cyan-500/20'
      }`}
    >
      {/* Insignia fija izquierda (clic abre el Historial de Updates) */}
      <button
        type="button"
        onClick={onOpenHistory}
        title="Ver historial completo de actualizaciones"
        className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 transition-colors cursor-pointer ${
          hasUrgent
            ? 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-300 animate-pulse'
            : 'bg-[#00f2fe]/15 hover:bg-[#00f2fe]/25 border border-[#00f2fe]/35 text-[#00f2fe]'
        }`}
      >
        {hasUrgent ? (
          <>
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Urgente</span>
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3" />
            <span>Novedades</span>
          </>
        )}
      </button>

      {/* Flecha Izquierda (Retroceder novedades) */}
      <button
        type="button"
        onClick={() => handleManualScroll('left')}
        title="Retroceder novedades"
        aria-label="Retroceder novedades"
        className="p-1 rounded-md bg-white/5 hover:bg-[#00f2fe]/20 text-gray-400 hover:text-[#00f2fe] border border-white/10 hover:border-[#00f2fe]/40 transition-colors cursor-pointer shrink-0"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Carril con scroll horizontal fluido (pausa al pasar el cursor encima) */}
      <div
        ref={scrollContainerRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onClick={onOpenHistory}
        title="Clic para abrir el Historial de Updates"
        className="relative flex-1 overflow-x-hidden cursor-pointer"
      >
        <div ref={trackRef} className="flex w-max items-center gap-8 text-xs">
          {[...combinedItems, ...combinedItems].map((item, idx) =>
            item.isUrgent ? (
              <div
                key={idx}
                className="inline-flex items-center gap-2.5 whitespace-nowrap px-3 py-0.5 rounded-full bg-gradient-to-r from-red-600/30 via-amber-500/25 to-red-600/30 border border-amber-400/70 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
              >
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-black tracking-wider">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {item.tag}
                </span>
                <span className="text-amber-100 font-extrabold text-[11.5px] tracking-wide">
                  {item.text}
                </span>
                {item.date && (
                  <span className="text-[10px] font-mono font-bold text-amber-300/90">
                    ({item.date})
                  </span>
                )}
              </div>
            ) : (
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
            )
          )}
        </div>
      </div>

      {/* Flecha Derecha (Adelantar novedades) */}
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
          onClick={onOpenHistory}
          className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-[10px] font-bold transition-colors cursor-pointer shrink-0"
        >
          <History className="w-3 h-3 text-[#00f2fe]" />
          <span>Historial</span>
        </button>
      )}

      {/* Botón discreto para cerrar después de leerlo */}
      <button
        type="button"
        onClick={handleCloseTicker}
        title="Ocultar cintillo después de leer"
        className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
