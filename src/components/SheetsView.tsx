import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  AlertTriangle,
  Flame,
  Pin,
  Info,
  X,
  ChevronLeft,
  ChevronRight,
  Megaphone,
} from 'lucide-react';
import { SheetConfig } from '../types';
import { useUrgentAnnouncement, AnnouncementPriority } from '../hooks/useUrgentAnnouncement';

interface SheetsViewProps {
  config: SheetConfig;
  activeGid?: string;
  onSelectSubTab: (gid: string, name: string) => void;
}

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
      'bg-gradient-to-r from-red-600/30 via-red-500/20 to-red-600/30 border-red-400/80 shadow-[0_0_15px_rgba(239,68,68,0.3)]',
    badgeClass: 'bg-red-500 text-white animate-pulse',
    textClass: 'text-red-100',
  },
  PRIORIDAD: {
    containerClass:
      'bg-gradient-to-r from-amber-600/30 via-amber-500/20 to-amber-600/30 border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.28)]',
    badgeClass: 'bg-amber-400 text-black',
    textClass: 'text-amber-100',
  },
  'NO OLVIDAR': {
    containerClass:
      'bg-gradient-to-r from-cyan-600/30 via-sky-500/20 to-cyan-600/30 border-[#00f2fe]/80 shadow-[0_0_15px_rgba(0,242,254,0.25)]',
    badgeClass: 'bg-[#00f2fe] text-[#0b0e14]',
    textClass: 'text-cyan-100',
  },
  AVISO: {
    containerClass:
      'bg-gradient-to-r from-emerald-600/30 via-emerald-500/20 to-emerald-600/30 border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
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

export const SheetsView: React.FC<SheetsViewProps> = ({
  config,
  activeGid,
  onSelectSubTab,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

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

  // Sincronizar visibilidad con el sello de lectura y reabrir si llega un aviso nuevo
  useEffect(() => {
    setCurrentIndex(0);
    if (hasActiveAnnouncement) {
      try {
        const dismissedStamp = localStorage.getItem(DISMISSED_TOOLBAR_ANNOUNCEMENT_KEY);
        setIsBannerVisible(dismissedStamp !== listSignature);
      } catch {
        setIsBannerVisible(true);
      }
    }
  }, [hasActiveAnnouncement, listSignature]);

  // Rotar automáticamente cada 5 segundos en pantalla completa en modo 'rotativo'
  useEffect(() => {
    if (
      displayMode !== 'rotativo' ||
      !isFullscreen ||
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
  }, [displayMode, isFullscreen, hasActiveAnnouncement, isBannerVisible, items.length]);

  // Desplazamiento continuo suave en pantalla completa en modo 'cintillo'
  useEffect(() => {
    if (
      displayMode !== 'cintillo' ||
      !isFullscreen ||
      !hasActiveAnnouncement ||
      !isBannerVisible
    ) {
      return;
    }

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
  }, [displayMode, isFullscreen, hasActiveAnnouncement, isBannerVisible, isMarqueePaused, items]);

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

  const currentGid = activeGid || config.defaultGid;
  const currentSubTab = config.subTabs.find((s) => s.gid === currentGid) || config.subTabs[0];

  const embedUrl = `https://docs.google.com/spreadsheets/d/${config.sheetId}/edit?gid=${currentGid}&widget=true&headers=false`;
  const directUrl = `https://docs.google.com/spreadsheets/d/${config.sheetId}/edit?gid=${currentGid}`;

  const handleRefreshIframe = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const safeIndex = items.length > 0 ? currentIndex % items.length : 0;
  const activeItem = items[safeIndex];
  const priorityKey: AnnouncementPriority = activeItem?.priority || 'URGENTE';
  const badgeConfig = PRIORITY_BADGE_CONFIG[priorityKey] || PRIORITY_BADGE_CONFIG.URGENTE;

  return (
    /* 
      AL ACTIVAR PANTALLA COMPLETA:
      Usa 'fixed inset-x-0 bottom-0 top-16 z-30 p-3'
      Garantiza que la vista ocupe toda la pantalla pero inicie justo debajo del Header (top-16)
    */
    <div
      className={`space-y-3 flex flex-col transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-x-0 bottom-0 top-16 z-30 bg-[#0b0e14] p-3'
          : 'h-[calc(100vh-110px)] relative'
      }`}
    >
      {/* Subtab Pill Navigation Bar */}
      <div className="bg-[#12161f] border border-[#00f2fe]/20 rounded-xl p-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-[#00f2fe] uppercase tracking-wider flex items-center gap-1.5 mr-2">
            <FileSpreadsheet className="w-4 h-4" />
            <span>{config.title}:</span>
          </span>

          {config.subTabs.map((sub) => {
            const isSelected = sub.gid === currentGid;
            return (
              <button
                key={sub.gid}
                onClick={() => onSelectSubTab(sub.gid, sub.nombre)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#00f2fe] text-[#0b0e14] shadow-[0_0_10px_rgba(0,242,254,0.5)]'
                    : 'bg-[#0d1017] text-[#8f9ba8] hover:text-white hover:bg-white/5 border border-white/5'
                }`}
              >
                • {sub.nombre}
              </button>
            );
          })}
        </div>

        {/* Centro: Avisos Globales cuando el Google Sheet está en Pantalla Completa */}
        {isFullscreen && hasActiveAnnouncement && isBannerVisible && activeItem && (
          displayMode === 'cintillo' ? (
            <div className="flex-1 min-w-[240px] max-w-2xl mx-auto px-2.5 py-1 rounded-lg bg-[#0d1017] border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.18)] flex items-center gap-2 overflow-hidden">
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
              className={`flex-1 min-w-[240px] max-w-2xl mx-auto px-3 py-1 rounded-lg border flex items-center justify-between gap-2 transition-all ${badgeConfig.containerClass}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider shrink-0 ${badgeConfig.badgeClass}`}
                >
                  <PriorityIcon priority={priorityKey} />
                  {priorityKey}
                </span>

                <span
                  title={activeItem.message}
                  className={`font-extrabold text-xs tracking-wide truncate ${badgeConfig.textClass}`}
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
                      className="p-0.5 rounded text-white/75 hover:text-white hover:bg-white/15 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-white/80 px-1">
                      {safeIndex + 1}/{items.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((prev) => (prev + 1) % items.length)}
                      title="Siguiente aviso"
                      className="p-0.5 rounded text-white/75 hover:text-white hover:bg-white/15 cursor-pointer"
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

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefreshIframe}
            className="p-1.5 rounded-lg bg-[#0d1017] border border-white/10 text-[#8f9ba8] hover:text-[#00f2fe] hover:border-[#00f2fe]/40 transition-all cursor-pointer"
            title="Recargar hoja"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#00f2fe]' : ''}`} />
          </button>

          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00f2fe]/10 border border-[#00f2fe]/40 text-[#00f2fe] text-xs font-bold hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Abrir en Google Sheets</span>
          </a>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-[#0d1017] border border-white/10 text-[#8f9ba8] hover:text-white transition-all cursor-pointer"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Embedded Google Sheet Frame */}
      <div className="flex-1 bg-[#12161f] border border-white/10 rounded-xl overflow-hidden shadow-2xl relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 bg-[#0d1017] flex flex-col items-center justify-center gap-3 z-10">
            <RefreshCw className="w-8 h-8 text-[#00f2fe] animate-spin" />
            <span className="text-xs font-bold text-gray-300">
              Cargando hoja de cálculo "{currentSubTab.nombre}"...
            </span>
            <span className="text-[11px] text-gray-500">Conectando con Google Docs Workspace</span>
          </div>
        )}

        <iframe
          key={`${embedUrl}-${iframeKey}`}
          src={embedUrl}
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 bg-white"
          title={`${config.title} - ${currentSubTab.nombre}`}
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};
