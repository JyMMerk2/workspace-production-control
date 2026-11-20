import React, { useState } from 'react';
import {
  Settings,
  Lock,
  CheckCircle2,
  AlertCircle,
  Server,
  Megaphone,
  AlertTriangle,
  Plus,
  Trash2,
  Flame,
  Pin,
} from 'lucide-react';
import { supabase } from '../data/supabaseClient';
import { useUrgentAnnouncement, AnnouncementPriority } from '../hooks/useUrgentAnnouncement';

interface ConfigViewProps {
  authenticatedUser: string;
}

const PRIORITY_STYLES: Record<
  AnnouncementPriority,
  {
    label: string;
    badgeClass: string;
    pillClass: string;
    textClass: string;
    btnActiveClass: string;
  }
> = {
  URGENTE: {
    label: 'URGENTE',
    badgeClass: 'bg-red-500 text-white',
    pillClass:
      'bg-gradient-to-r from-red-600/35 via-red-500/25 to-red-600/35 border-red-400/80 shadow-[0_0_14px_rgba(239,68,68,0.35)]',
    textClass: 'text-red-100',
    btnActiveClass: 'bg-red-500 text-white border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.45)]',
  },
  PRIORIDAD: {
    label: 'PRIORIDAD',
    badgeClass: 'bg-amber-400 text-black',
    pillClass:
      'bg-gradient-to-r from-amber-600/35 via-amber-500/25 to-amber-600/35 border-amber-400/80 shadow-[0_0_14px_rgba(245,158,11,0.35)]',
    textClass: 'text-amber-100',
    btnActiveClass: 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.45)]',
  },
  'NO OLVIDAR': {
    label: 'NO OLVIDAR',
    badgeClass: 'bg-[#00f2fe] text-[#0b0e14]',
    pillClass:
      'bg-gradient-to-r from-cyan-600/35 via-sky-500/25 to-cyan-600/35 border-[#00f2fe]/80 shadow-[0_0_14px_rgba(0,242,254,0.3)]',
    textClass: 'text-cyan-100',
    btnActiveClass: 'bg-[#00f2fe] text-[#0b0e14] border-[#00f2fe] shadow-[0_0_12px_rgba(0,242,254,0.45)]',
  },
};

export const ConfigView: React.FC<ConfigViewProps> = ({ authenticatedUser }) => {
  const safeUser = authenticatedUser || 'ADMIN';

  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({
    type: '',
    text: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gestión de múltiples avisos globales
  const {
    announcement,
    addAnnouncement,
    removeAnnouncement,
    clearAllAnnouncements,
    isSaving,
  } = useUrgentAnnouncement();

  const [urgentText, setUrgentText] = useState<string>('');
  const [urgentPriority, setUrgentPriority] = useState<AnnouncementPriority>('URGENTE');
  const [urgentFeedback, setUrgentFeedback] = useState<string>('');

  const activeItems = announcement?.items || [];

  const handleAddUrgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrgentFeedback('');

    const clean = urgentText.trim();
    if (!clean) return;

    await addAnnouncement(clean, safeUser, urgentPriority);
    setUrgentText('');
    setUrgentFeedback(
      `¡Aviso [${urgentPriority}] agregado! Ya está visible en vivo para todos los usuarios.`
    );
  };

  const handleRemoveOne = async (id: string) => {
    setUrgentFeedback('');
    await removeAnnouncement(id, safeUser);
    setUrgentFeedback('Aviso eliminado.');
  };

  const handleClearAll = async () => {
    setUrgentFeedback('');
    await clearAllAnnouncements(safeUser);
    setUrgentFeedback('Todos los avisos han sido retirados.');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    if (!oldPass || !newPass || !confirmPass) {
      setStatusMsg({ type: 'error', text: 'Por favor complete todos los campos requeridos.' });
      return;
    }

    if (newPass !== confirmPass) {
      setStatusMsg({ type: 'error', text: 'Las nuevas contraseñas no coinciden. Verifique nuevamente.' });
      return;
    }

    if (newPass.length < 6) {
      setStatusMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setIsSubmitting(true);

    const isLocalMaster =
      (safeUser.toLowerCase() === 'jmercado' && oldPass === 'jymmerk2') ||
      (safeUser.toLowerCase() === 'admin' && oldPass === 'adminjymmerk2') ||
      (safeUser.toLowerCase() === 'supervisor' && oldPass === 'boombah2026');

    try {
      const { data, error: selectError } = await supabase
        .from('app_users')
        .select('*')
        .ilike('username', safeUser);

      if (selectError) {
        setIsSubmitting(false);
        setStatusMsg({ type: 'error', text: 'Error de comunicación con el servidor.' });
        return;
      }

      if (data && data.length > 0) {
        if (data[0].password !== oldPass) {
          setIsSubmitting(false);
          setStatusMsg({ type: 'error', text: 'La contraseña actual ingresada es incorrecta.' });
          return;
        }

        const { error: updateError } = await supabase
          .from('app_users')
          .update({ password: newPass })
          .eq('id', data[0].id);

        if (updateError) {
          setIsSubmitting(false);
          setStatusMsg({ type: 'error', text: 'Error al actualizar la contraseña.' });
          return;
        }
      } else {
        if (!isLocalMaster) {
          setIsSubmitting(false);
          setStatusMsg({ type: 'error', text: 'La contraseña actual ingresada es incorrecta.' });
          return;
        }

        const { error: insertError } = await supabase
          .from('app_users')
          .insert([
            {
              username: safeUser,
              password: newPass,
              status: 'APROBADO',
            },
          ]);

        if (insertError) {
          setIsSubmitting(false);
          setStatusMsg({ type: 'error', text: 'Error al sincronizar el usuario en Supabase.' });
          return;
        }
      }

      setIsSubmitting(false);
      setStatusMsg({
        type: 'success',
        text: '¡Contraseña actualizada e impactada exitosamente en Supabase!',
      });
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
    } catch {
      setIsSubmitting(false);
      setStatusMsg({
        type: 'error',
        text: 'Error inesperado en la conexión con la base de datos.',
      });
    }
  };

  const currentStyle = PRIORITY_STYLES[urgentPriority];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-[#00f2fe]/30">
        <div className="flex items-center gap-2 text-sm md:text-base font-extrabold uppercase tracking-wider text-[#00f2fe]">
          <Settings className="w-5 h-5" />
          <span>CONFIGURACIÓN DE CUENTA Y SISTEMA</span>
        </div>
      </div>

      {/* SECCIÓN DEDICADA: AVISOS GLOBALES EN BARRA DE CONTROL DE PRODUCCIÓN */}
      <div className="bg-[#12161f] border border-amber-500/40 rounded-xl p-6 shadow-[0_0_25px_rgba(245,158,11,0.12)] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-400">
            <Megaphone className="w-4 h-4" />
            <span>📢 Avisos Globales en Barra de Control de Producción</span>
          </div>

          <span
            className={`text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full border ${
              activeItems.length > 0
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60'
                : 'bg-white/5 text-gray-400 border-white/10'
            }`}
          >
            {activeItems.length > 0
              ? `● ${activeItems.length} ${activeItems.length === 1 ? 'Aviso Activo' : 'Avisos Activos'}`
              : '○ Sin Avisos Activos'}
          </span>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          Puedes publicar <strong className="text-white">uno o varios avisos a la vez</strong>. Si hay más de uno, rotarán automáticamente en la barra de{' '}
          <strong className="text-white">Control de Producción</strong> y en el modo{' '}
          <strong className="text-[#00f2fe]">Pantalla Completa de Google Sheets</strong>.
        </p>

        <form onSubmit={handleAddUrgent} className="space-y-4">
          {/* Selector de Estado */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-2">
              1. Selecciona el Estado / Nivel del Nuevo Aviso
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['URGENTE', 'PRIORIDAD', 'NO OLVIDAR'] as AnnouncementPriority[]).map((level) => {
                const isSelected = urgentPriority === level;
                const style = PRIORITY_STYLES[level];
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setUrgentPriority(level)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      isSelected
                        ? style.btnActiveClass
                        : 'bg-[#0d1017] text-gray-400 border-white/10 hover:text-white hover:border-white/30'
                    }`}
                  >
                    {level === 'URGENTE' && <AlertTriangle className="w-3.5 h-3.5" />}
                    {level === 'PRIORIDAD' && <Flame className="w-3.5 h-3.5" />}
                    {level === 'NO OLVIDAR' && <Pin className="w-3.5 h-3.5" />}
                    <span>{level}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campo de texto del aviso */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-1.5">
              2. Escribe el Mensaje para el Equipo
            </label>
            <textarea
              rows={2}
              value={urgentText}
              onChange={(e) => setUrgentText(e.target.value)}
              placeholder="Ej: Priorizar cierre de órdenes del contenedor antes de las 3:00 PM..."
              className="w-full px-3.5 py-2.5 bg-[#0d1017] border border-white/15 rounded-lg text-white text-xs font-medium focus:outline-none focus:border-[#00f2fe] placeholder:text-gray-600"
            />
          </div>

          {/* Vista previa */}
          {urgentText.trim() && (
            <div className="p-2.5 rounded-lg bg-[#0d1017] border border-white/10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Vista previa:
              </div>
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border max-w-full overflow-hidden ${currentStyle.pillClass}`}
              >
                <span
                  className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shrink-0 ${currentStyle.badgeClass}`}
                >
                  {urgentPriority === 'URGENTE' && <AlertTriangle className="w-2.5 h-2.5" />}
                  {urgentPriority === 'PRIORIDAD' && <Flame className="w-2.5 h-2.5" />}
                  {urgentPriority === 'NO OLVIDAR' && <Pin className="w-2.5 h-2.5" />}
                  {urgentPriority}
                </span>
                <span className={`font-extrabold text-[11.5px] tracking-wide truncate ${currentStyle.textClass}`}>
                  {urgentText.trim()}
                </span>
                <span className="text-[10px] font-mono text-white/70 shrink-0">
                  ({safeUser})
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSaving || !urgentText.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-[#0b0e14] text-xs font-black uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer shadow-[0_0_14px_rgba(245,158,11,0.35)] disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
              <span>{isSaving ? 'Publicando...' : `Agregar Aviso (${urgentPriority})`}</span>
            </button>

            {activeItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white/5 hover:bg-red-500/15 text-gray-300 hover:text-red-300 border border-white/10 hover:border-red-500/40 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Quitar Todos ({activeItems.length})</span>
              </button>
            )}
          </div>

          {urgentFeedback && (
            <div className="p-3 rounded-lg text-xs font-bold flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/35 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{urgentFeedback}</span>
            </div>
          )}
        </form>

        {/* Lista de Avisos Publicados Actualmente */}
        {activeItems.length > 0 && (
          <div className="pt-4 border-t border-white/10 space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Avisos activos en pantalla ({activeItems.length}):
            </div>
            <div className="space-y-2">
              {activeItems.map((item) => {
                const style = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.URGENTE;
                return (
                  <div
                    key={item.id}
                    className={`px-3 py-2 rounded-lg border flex items-center justify-between gap-3 ${style.pillClass}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shrink-0 ${style.badgeClass}`}
                      >
                        {item.priority === 'URGENTE' && <AlertTriangle className="w-2.5 h-2.5" />}
                        {item.priority === 'PRIORIDAD' && <Flame className="w-2.5 h-2.5" />}
                        {item.priority === 'NO OLVIDAR' && <Pin className="w-2.5 h-2.5" />}
                        {item.priority}
                      </span>
                      <span className={`font-bold text-xs truncate ${style.textClass}`}>
                        {item.message}
                      </span>
                      <span className="text-[10px] font-mono text-white/65 shrink-0">
                        ({item.updatedBy})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveOne(item.id)}
                      disabled={isSaving}
                      title="Eliminar este aviso"
                      className="p-1 rounded bg-black/25 hover:bg-red-500/40 text-white/75 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Change Password Card */}
        <div className="bg-[#12161f] border border-[#00f2fe]/30 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#00f2fe] mb-4">
            <Lock className="w-4 h-4" />
            <span>🔐 Cambiar Contraseña</span>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-1">
                Contraseña Actual
              </label>
              <input
                type="password"
                value={oldPass}
                onChange={(e) => setOldPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-[#0d1017] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#00f2fe]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-1">
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-[#0d1017] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#00f2fe]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-1">
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-[#0d1017] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#00f2fe]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-[#00f2fe]/15 border border-[#00f2fe] text-[#00f2fe] text-xs font-bold hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer shadow-[0_0_12px_rgba(0,242,254,0.3)] disabled:opacity-50"
            >
              {isSubmitting ? 'Actualizando...' : 'ACTUALIZAR CONTRASEÑA'}
            </button>

            {statusMsg.text && (
              <div
                className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                  statusMsg.type === 'success'
                    ? 'bg-[#39ff14]/10 border border-[#39ff14]/30 text-[#39ff14]'
                    : 'bg-[#ff007f]/10 border border-[#ff007f]/30 text-[#ff007f]'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}
          </form>
        </div>

        {/* System Diagnostics Card */}
        <div className="bg-[#12161f] border border-white/10 rounded-xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#39ff14] mb-4">
              <Server className="w-4 h-4" />
              <span>Diagnóstico del Sistema y Red</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-[#0d1017] rounded-lg border border-white/5">
                <span className="text-gray-400 font-bold">Usuario Activo:</span>
                <span className="text-[#00f2fe] font-mono font-bold">{safeUser}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#0d1017] rounded-lg border border-white/5">
                <span className="text-gray-400 font-bold">Estado del Dashboard:</span>
                <span className="text-[#39ff14] font-mono font-bold">● Sincronizado</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#0d1017] rounded-lg border border-white/5">
                <span className="text-gray-400 font-bold">Intervalo de Polling:</span>
                <span className="text-gray-300 font-mono">30 segundos</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#0d1017] rounded-lg border border-white/5">
                <span className="text-gray-400 font-bold">Motor de OCR:</span>
                <span className="text-[#ffe600] font-mono font-bold">Tesseract.js Engine v5</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 text-[11px] text-[#5f6e7d] text-center">
            Boombah Workspace Production Control Dashboard • Build 2026.1
          </div>
        </div>
      </div>
    </div>
  );
};
