import React, { useState, useEffect } from 'react';
import { AlertTriangle, Flame, Pin, X } from 'lucide-react';
import { wipEngineService } from '../services/wipEngineService';
import { useUrgentAnnouncement, AnnouncementPriority } from '../hooks/useUrgentAnnouncement';

const DISMISSED_TOOLBAR_ANNOUNCEMENT_KEY = 'boombah_dismissed_toolbar_announcement_v1';

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
};

export const ProductionControlToolbar: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { announcement } = useUrgentAnnouncement();
  const [isBannerVisible, setIsBannerVisible] = useState<boolean>(true);

  const hasActiveAnnouncement = Boolean(
    announcement?.active && String(announcement?.message || '').trim().length > 0
  );

  // Reabrir automáticamente el aviso si llega uno nuevo o se edita el actual
  useEffect(() => {
    if (hasActiveAnnouncement) {
      const stamp = `${announcement.updatedAt}::${announcement.priority}::${announcement.message.trim()}`;
      try {
        const dismissedStamp = localStorage.getItem(DISMISSED_TOOLBAR_ANNOUNCEMENT_KEY);
        if (dismissedStamp !== stamp) {
          setIsBannerVisible(true);
        }
      } catch {
        setIsBannerVisible(true);
      }
    }
  }, [hasActiveAnnouncement, announcement?.updatedAt, announcement?.priority, announcement?.message]);

  const handleDismissAnnouncement = () => {
    if (hasActiveAnnouncement) {
      const stamp = `${announcement.updatedAt}::${announcement.priority}::${announcement.message.trim()}`;
      try {
        localStorage.setItem(DISMISSED_TOOLBAR_ANNOUNCEMENT_KEY, stamp);
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

  const priorityKey: AnnouncementPriority = announcement?.priority || 'URGENTE';
  const badgeConfig = PRIORITY_BADGE_CONFIG[priorityKey] || PRIORITY_BADGE_CONFIG.URGENTE;

  return (
    <div className="bg-[#0d1017] border-b border-white/10 p-2 flex flex-wrap items-center justify-between gap-3 text-xs font-sans shadow-md">
      {/* Grupo Izquierdo: Controles de Producción */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <span className="font-extrabold text-[#00f2fe] flex items-center gap-1">
          🚀 Control de Producción:
        </span>

        <button
          onClick={handleActualizarDia}
          disabled={loading}
          className="px-3 py-1.5 bg-[#1d2756] hover:bg-[#00f2fe] hover:text-black text-white font-extrabold rounded-lg transition-all cursor-pointer border border-[#00f2fe]/30"
        >
          {loading ? 'Procesando...' : '🔄 Actualizar Órdenes del Día'}
        </button>

        <button
          onClick={() => {
            if (wipEngineService && typeof wipEngineService.limpiarFilasCompletas === 'function') {
              wipEngineService.limpiarFilasCompletas('BUSCAR_BP');
            }
          }}
          className="px-3 py-1.5 bg-[#12161f] border border-white/20 hover:border-[#39ff14] text-gray-200 rounded-lg cursor-pointer"
        >
          🧹 Limpiar Completas BP
        </button>

        <button
          onClick={() => {
            if (wipEngineService && typeof wipEngineService.limpiarFilasCompletas === 'function') {
              wipEngineService.limpiarFilasCompletas('BUSCAR_FD');
            }
          }}
          className="px-3 py-1.5 bg-[#12161f] border border-white/20 hover:border-[#ff007f] text-gray-200 rounded-lg cursor-pointer"
        >
          🧹 Limpiar Completas FD
        </button>
      </div>

      {/* Centro: Espacio dedicado para Avisos en Tiempo Real (URGENTE / PRIORIDAD / NO OLVIDAR) */}
      {hasActiveAnnouncement && isBannerVisible && (
        <div
          className={`flex-1 min-w-[260px] max-w-3xl mx-auto px-3 py-1.5 rounded-lg border flex items-center justify-between gap-2.5 transition-all ${badgeConfig.containerClass}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider shrink-0 ${badgeConfig.badgeClass}`}
            >
              {priorityKey === 'URGENTE' && <AlertTriangle className="w-3 h-3" />}
              {priorityKey === 'PRIORIDAD' && <Flame className="w-3 h-3" />}
              {priorityKey === 'NO OLVIDAR' && <Pin className="w-3 h-3" />}
              {priorityKey}
            </span>

            <span
              title={announcement.message}
              className={`font-extrabold text-xs tracking-wide truncate ${badgeConfig.textClass}`}
            >
              {announcement.message}
            </span>

            {announcement.updatedBy && (
              <span className="hidden xl:inline text-[10px] font-mono text-white/75 shrink-0">
                ({announcement.updatedBy})
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleDismissAnnouncement}
            title="Cerrar aviso después de leer"
            className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grupo Derecho: Borrar Contratos Cerrados */}
      <div className="shrink-0">
        <button
          onClick={handleBorrarCE}
          className="px-3 py-1.5 bg-red-950/60 border border-red-500/40 text-red-300 hover:bg-red-900 rounded-lg cursor-pointer font-bold transition-all"
        >
          🗑️ Borrar Contratos Cerrados (CE)
        </button>
      </div>
    </div>
  );
};

export default ProductionControlToolbar;
