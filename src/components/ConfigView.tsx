import React, { useState, useEffect } from 'react';
import {
  Settings,
  Lock,
  CheckCircle2,
  AlertCircle,
  Server,
  Megaphone,
  AlertTriangle,
  Send,
  Trash2,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useUrgentAnnouncement } from '../hooks/useUrgentAnnouncement';

interface ConfigViewProps {
  authenticatedUser: string;
}

const SUPABASE_URL = 'https://qpozgkxdzcixjkjblntd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb3pna3hkemNpeGpramJsbnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDAzMjEsImV4cCI6MjEwNDAxNjMyMX0.RYHR0XYeG6-YGI8zmird9FF-KP67_CmVsVpv5gYTS5o';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const ConfigView: React.FC<ConfigViewProps> = ({ authenticatedUser }) => {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({
    type: '',
    text: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado del Comunicado Urgente Global en Cintillo
  const { announcement, saveAnnouncement, isSaving } = useUrgentAnnouncement();
  const [urgentText, setUrgentText] = useState(announcement.message || '');
  const [urgentActive, setUrgentActive] = useState(announcement.active || false);
  const [urgentFeedback, setUrgentFeedback] = useState<string>('');

  useEffect(() => {
    setUrgentText(announcement.message || '');
    setUrgentActive(announcement.active || false);
  }, [announcement.message, announcement.active]);

  const handlePublishUrgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrgentFeedback('');

    const clean = urgentText.trim();
    if (!clean) {
      await saveAnnouncement('', false, authenticatedUser);
      setUrgentActive(false);
      setUrgentFeedback('Aviso retirado del cintillo.');
      return;
    }

    await saveAnnouncement(clean, true, authenticatedUser);
    setUrgentActive(true);
    setUrgentFeedback('¡Aviso urgente publicado! Se mostrará resaltado y reabrirá el cintillo a todos los usuarios.');
  };

  const handleClearUrgent = async () => {
    setUrgentFeedback('');
    setUrgentText('');
    setUrgentActive(false);
    await saveAnnouncement('', false, authenticatedUser);
    setUrgentFeedback('Aviso urgente desactivado.');
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

    // Validar credenciales maestras locales
    const isLocalMaster =
      (authenticatedUser.toLowerCase() === 'jmercado' && oldPass === 'jymmerk2') ||
      (authenticatedUser.toLowerCase() === 'admin' && oldPass === 'adminjymmerk2') ||
      (authenticatedUser.toLowerCase() === 'supervisor' && oldPass === 'boombah2026');

    try {
      // Buscar el usuario en Supabase
      const { data, error: selectError } = await supabase
        .from('app_users')
        .select('*')
        .ilike('username', authenticatedUser);

      if (selectError) {
        setIsSubmitting(false);
        setStatusMsg({ type: 'error', text: 'Error de comunicación con el servidor.' });
        return;
      }

      if (data && data.length > 0) {
        // Usuario existente en Supabase: validar contraseña actual
        if (data[0].password !== oldPass) {
          setIsSubmitting(false);
          setStatusMsg({ type: 'error', text: 'La contraseña actual ingresada es incorrecta.' });
          return;
        }

        // Actualizar contraseña del registro en Supabase
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
        // Si no está en Supabase, verificar contra lista maestra
        if (!isLocalMaster) {
          setIsSubmitting(false);
          setStatusMsg({ type: 'error', text: 'La contraseña actual ingresada es incorrecta.' });
          return;
        }

        // Crear/sincronizar el usuario maestro en Supabase con la nueva clave
        const { error: insertError } = await supabase
          .from('app_users')
          .insert([
            {
              username: authenticatedUser,
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
    } catch (err) {
      setIsSubmitting(false);
      setStatusMsg({
        type: 'error',
        text: 'Error inesperado en la conexión con la base de datos.',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-[#00f2fe]/30">
        <div className="flex items-center gap-2 text-sm md:text-base font-extrabold uppercase tracking-wider text-[#00f2fe]">
          <Settings className="w-5 h-5" />
          <span>CONFIGURACIÓN DE CUENTA Y SISTEMA</span>
        </div>
      </div>

      {/* SECCIÓN DEDICADA: COMUNICADO URGENTE / AVISO IMPORTANTE EN CINTILLO */}
      <div className="bg-[#12161f] border border-amber-500/40 rounded-xl p-6 shadow-[0_0_25px_rgba(245,158,11,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-400">
            <Megaphone className="w-4 h-4" />
            <span>📢 Comunicado Urgente / Aviso Importante en Cintillo</span>
          </div>

          <span
            className={`text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full border ${
              urgentActive && urgentText.trim()
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/60'
                : 'bg-white/5 text-gray-400 border-white/10'
            }`}
          >
            {urgentActive && urgentText.trim() ? '● Activo en Pantalla' : '○ Inactivo'}
          </span>
        </div>

        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
          Escribe aquí cualquier mensaje urgente o instrucción crítica para el equipo. Al publicarlo,{' '}
          <strong className="text-amber-300">reabrirá automáticamente el cintillo superior</strong> a todos los usuarios (incluso si lo tenían cerrado) y aparecerá resaltado con prioridad máxima.
        </p>

        <form onSubmit={handlePublishUrgent} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-1.5">
              Mensaje del Comunicado Urgente
            </label>
            <textarea
              rows={2}
              value={urgentText}
              onChange={(e) => setUrgentText(e.target.value)}
              placeholder="Ej: ATENCIÓN: Priorizar cierre de órdenes del contenedor antes de las 3:00 PM..."
              className="w-full px-3.5 py-2.5 bg-[#0d1017] border border-amber-500/30 rounded-lg text-white text-xs font-medium focus:outline-none focus:border-amber-400 placeholder:text-gray-600"
            />
          </div>

          {/* Vista previa en vivo de cómo se verá en el cintillo */}
          {urgentText.trim() && (
            <div className="p-2.5 rounded-lg bg-[#0d1017] border border-white/10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Vista previa en cintillo:
              </div>
              <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-gradient-to-r from-red-600/30 via-amber-500/25 to-red-600/30 border border-amber-400/70 shadow-[0_0_12px_rgba(245,158,11,0.25)] max-w-full overflow-hidden">
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-black tracking-wider shrink-0">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  AVISO IMPORTANTE
                </span>
                <span className="text-amber-100 font-extrabold text-[11.5px] tracking-wide truncate">
                  {urgentText.trim()}
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-300/90 shrink-0">
                  (Por: {authenticatedUser})
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-[#0b0e14] text-xs font-black uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer shadow-[0_0_14px_rgba(245,158,11,0.35)] disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Publicando...' : 'Publicar Aviso Urgente'}</span>
            </button>

            {(urgentActive || urgentText.trim()) && (
              <button
                type="button"
                onClick={handleClearUrgent}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white/5 hover:bg-red-500/15 text-gray-300 hover:text-red-300 border border-white/10 hover:border-red-500/40 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Quitar Aviso</span>
              </button>
            )}
          </div>

          {urgentFeedback && (
            <div className="p-3 rounded-lg text-xs font-bold flex items-center gap-2 bg-amber-500/10 border border-amber-400/35 text-amber-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{urgentFeedback}</span>
            </div>
          )}
        </form>
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
                <span className="text-[#00f2fe] font-mono font-bold">{authenticatedUser}</span>
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
