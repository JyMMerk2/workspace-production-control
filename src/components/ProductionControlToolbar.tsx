import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Flame,
  Pin,
  Info,
  X,
  ChevronLeft,
  ChevronRight,
  Megaphone,
} from 'lucide-react';
import { wipEngineService } from '../services/wipEngineService';
import { useUrgentAnnouncement, AnnouncementPriority } from '../hooks/useUrgentAnnouncement';

const DISMISSED_TOOLBAR_ANNOUNCEMENT_KEY = 'boombah_dismissed_toolbar_announcement_v3';

const PRIORITY_BADGE_CONFIG: Record<
  AnnouncementPriority,
  {
    containerClass: string;
    badgeClass: string;
    textClass: string;
  }
> = {
  URGENTE: {
    containerClass:
      'bg-gradient-to-r from-red-600/30 via-red-500/20 to-red-600/30 border-red-400/80 shadow-[0_0_12px_rgba(239,68,68,0.25)]',
    badgeClass: 'bg-red-500 text-white',
    textClass: 'text-red-100',
  },
  PRIORIDAD: {
    containerClass:
      'bg-gradient-to-r from-amber-600/30 via-amber-500/20 to-amber-600/30 border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
    badgeClass: 'bg-amber-400 text-black',
    textClass: 'text-amber-100',
  },
  'NO OLVIDAR': {
    containerClass:
      'bg-gradient-to-r from-cyan-600/30 via-sky-500/20 to-cyan-600/30 border-[#00f2fe]/80 shadow-[0_0_12px_rgba(0,242,254,0.22)]',
    badgeClass: 'bg-[#00f2fe] text-[#0b0e14]',
    textClass: 'text-cyan-100',
  },
  AVISO: {
    containerClass:
      'bg-gradient-to-r from-emerald-600/30 via-emerald-500/20 to-emerald-600/30 border-emerald-400/80 shadow-[0_0_12px_rgba(16,185,129,0.22)]',
    badgeClass: 'bg-emerald-400 text-[#0b0e14]',
    textClass: 'text-emerald-100',
  },
};

const PriorityIcon: React.FC<{ priority: AnnouncementPriority }> = ({ priority }) => {
  if (priority === 'URGENTE') return <AlertTriangle className="w-3 h-3" />;
  if (priority === 'PRIORIDAD') return <Flame className="w-3 h-3" />;
  if (priority === 'NO OLVIDAR') return <Pin className="w-3 h-3" />;
  return <Info className="w-3 h-3" />;
};

export const ProductionControlToolbar: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { announcement } = useUrgentAnnouncement();
  const [isBannerVisible, setIsBannerVisible] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isMarqueePaused, setIsMarqueePaused] = useState<boolean>(false);

  const marqueeContainerRef = useRef<HTMLDivElement | null>(null);
  const marqueeTrackRef = useRef<HTMLDivElement | null>(null);

  const items = announcement?.items || [];
  const displayMode = announcement?.displayMode || 'rotativo';
  const hasActiveAnnouncement = items.length > 0;
  const listSignature = items.map((it) => `${it.id}:${it.message}`).join('|');

  // Reabrir automáticamente el aviso si llega uno nuevo o cambia la lista
  useEffect(() => {
    setCurrentIndex(0);
    if (hasActiveAnnouncement) {
      try {
        const dismissedStamp = localStorage.getItem(DISMISSED_TOOLBAR_ANNOUNCEMENT_KEY);
        if (dismissedStamp !== listSignature) {
          setIsBannerVisible(true);
        }
      } catch {
        setIsBannerVisible(true);
      }
    }
  }, [hasActiveAnnouncement, listSignature]);

  // Rotar automáticamente cada 5 segundos cuando hay más de 1 aviso activo en modo 'rotativo'
  useEffect(() => {
    if (
      displayMode !== 'rotativo' ||
      !hasActiveAnnouncement ||
      !isBannerVisible ||
      items.length <= 1
    ) {
      return;
    }
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [displayMode, hasActiveAnnouncement, isBannerVisible, items.length]);

  // Desplazamiento continuo suave en modo 'cintillo'
  useEffect(() => {
    if (displayMode !== 'cintillo' || !hasActiveAnnouncement || !isBannerVisible) return;

    let animId: number;
    let lastTime = performance.now();
    const speedPxPerSec = 45;

    const step = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const container = marqueeContainerRef.current;
      const track = marqueeTrackRef.current;

      if (container && track && !isMarqueePaused) {
        const halfWidth = track.scrollWidth / 2;
        if (halfWidth > 0) {
          container.scrollLeft += speedPxPerSec * dt;
          if (container.scrollLeft >= halfWidth) {
            container.scrollLeft -= halfWidth;
          }
        }
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [displayMode, hasActiveAnnouncement, isBannerVisible, isMarqueePaused, items]);

  const handleDismissAnnouncement = () => {
    if (hasActiveAnnouncement) {
      try {
        localStorage.setItem(DISMISSED_TOOLBAR_ANNOUNCEMENT_KEY, listSignature);
      } catch {
        // Ignorar errores de almacenamiento
      }
    }
    setIsBannerVisible(false);
  };

  const handleActualizarDia = async () => {
    setLoading(true);
    try {
      // Intenta actualizar via evento local desacoplado de la vista del Queue
      const event = new CustomEvent('actualizar-ordenes-dia-event');
      window.dispatchEvent(event);

      // Si wipEngineService está configurado localmente, sincroniza el estado
      if (wipEngineService && typeof wipEngineService.actualizarOrdenesDelDia === 'function') {
        await wipEngineService.actualizarOrdenesDelDia();
      }
    } catch (e: any) {
      console.warn('Ejecutando actualización con la cola de la vista activa', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBorrarCE = async () => {
    if (confirm('¿Eliminar todos los contratos cerrados (CE) de la base central?')) {
      if (wipEngineService && typeof wipEngineService.borrarContratosCerrados === 'function') {
        await wipEngineService.borrarContratosCerrados();
      }
      alert('⚡ Limpieza turbo completada. Se eliminaron los contratos (CE).');
    }
  };

  const safeIndex = items.length > 0 ? currentIndex % items.length : 0;
  const activeItem = items[safeIndex];
  const priorityKey: AnnouncementPriority = activeItem?.priority || 'URGENTE';
  const badgeConfig = PRIORITY_BADGE_CONFIG[priorityKey] || PRIORITY_BADGE_CONFIG.URGENTE;

  return (
    <div className="bg-[#0d1017] border-b border-white/10 px-2.5 py-2 min-h-[48px] flex flex-wrap items-center justify-between gap-2.5 text-xs font-sans shadow-md">
      {/* Grupo Izquierdo: Controles de Producción */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <span className="font-extrabold text-[#00f2fe] flex items-center gap-1">
          🚀 Control de Producción:
        </span>

        <button
          onClick={handleActualizarDia}
          disabled={loading}
          className="px-3 py-1.5 bg-[#1d2756] hover:bg-[#00f2fe] hover:text-black text-white font-extrabold rounded-lg transition-colors cursor-pointer border border-[#00f2fe]/30"
        >
          {loading ? 'Procesando...' : '🔄 Actualizar Órdenes del Día'}
        </button>

        <button
          onClick={() => {
            if (wipEngineService && typeof wipEngineService.limpiarFilasCompletas === 'function') {
              wipEngineService.limpiarFilasCompletas('BUSCAR_BP');
            }
          }}
          className="px-3 py-1.5 bg-[#12161f] border border-white/20 hover:border-[#39ff14] text-gray-200 rounded-lg transition-colors cursor-pointer"
        >
          🧹 Limpiar Completas BP
        </button>

        <button
          onClick={() => {
            if (wipEngineService && typeof wipEngineService.limpiarFilasCompletas === 'function') {
              wipEngineService.limpiarFilasCompletas('BUSCAR_FD');
            }
          }}
          className="px-3 py-1.5 bg-[#12161f] border border-white/20 hover:border-[#ff007f] text-gray-200 rounded-lg transition-colors cursor-pointer"
        >
          🧹 Limpiar Completas FD
        </button>
      </div>

      {/* Centro: Tarjeta Rotativa OR Cintillo Deslizante Continuo (altura y ancho estabilizados) */}
      {hasActiveAnnouncement && isBannerVisible && activeItem && (
        displayMode === 'cintillo' ? (
          <div className="flex-1 basis-[280px] max-w-3xl h-[32px] px-2.5 rounded-lg bg-[#12161f] border border-amber-400/50 flex items-center gap-2 overflow-hidden">
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-400 text-black tracking-wider shrink-0">
              <Megaphone className="w-3 h-3" />
              COMUNICADOS ({items.length})
            </span>

            <div
              ref={marqueeContainerRef}
              onMouseEnter={() => setIsMarqueePaused(true)}
              onMouseLeave={() => setIsMarqueePaused(false)}
              className="relative flex-1 overflow-x-hidden select-none"
            >
              <div ref={marqueeTrackRef} className="flex w-max items-center gap-6">
                {[...items, ...items].map((it, idx) => {
                  const cfg = PRIORITY_BADGE_CONFIG[it.priority] || PRIORITY_BADGE_CONFIG.URGENTE;
                  return (
                    <div key={`${it.id}_${idx}`} className="inline-flex items-center gap-2 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider ${cfg.badgeClass}`}
                      >
                        <PriorityIcon priority={it.priority} />
                        {it.priority}
                      </span>
                      <span className={`font-extrabold text-xs tracking-wide ${cfg.textClass}`}>
                        {it.message}
                      </span>
                      {it.updatedBy && (
                        <span className="text-[10px] font-mono text-white/65">
                          ({it.updatedBy})
                        </span>
                      )}
                      <span className="text-white/20 ml-2">•</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismissAnnouncement}
              title="Cerrar cintillo después de leer"
              className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div
            className={`flex-1 basis-[280px] max-w-3xl h-[32px] px-3 rounded-lg border flex items-center justify-between gap-2 transition-colors duration-300 overflow-hidden ${badgeConfig.containerClass}`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className={`inline-flex items-center justify-center gap-1 min-w-[86px] text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider shrink-0 transition-colors duration-300 ${badgeConfig.badgeClass}`}
              >
                <PriorityIcon priority={priorityKey} />
                {priorityKey}
              </span>

              <span
                title={activeItem.message}
                className={`font-extrabold text-xs tracking-wide truncate transition-colors duration-300 ${badgeConfig.textClass}`}
              >
                {activeItem.message}
              </span>

              {activeItem.updatedBy && (
                <span className="hidden xl:inline text-[10px] font-mono text-white/75 shrink-0">
                  ({activeItem.updatedBy})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)}
                    title="Aviso anterior"
                    className="p-0.5 rounded text-white/75 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono font-bold text-white/80 px-1 min-w-[26px] text-center">
                    {safeIndex + 1}/{items.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => (prev + 1) % items.length)}
                    title="Siguiente aviso"
                    className="p-0.5 rounded text-white/75 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleDismissAnnouncement}
                title="Cerrar aviso después de leer"
                className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      )}

      {/* Grupo Derecho: Borrar Contratos Cerrados */}
      <div className="shrink-0">
        <button
          onClick={handleBorrarCE}
          className="px-3 py-1.5 bg-red-950/60 border border-red-500/40 text-red-300 hover:bg-red-900 rounded-lg cursor-pointer font-bold transition-colors"
        >
          🗑️ Borrar Contratos Cerrados (CE)
        </button>
      </div>
    </div>
  );
};

export default ProductionControlToolbar;
