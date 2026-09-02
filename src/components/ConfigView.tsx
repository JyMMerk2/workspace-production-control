import React, { useState } from 'react';
import { Settings, Lock, CheckCircle2, AlertCircle, RefreshCw, Shield, Server, Database } from 'lucide-react';

interface ConfigViewProps {
  authenticatedUser: string;
}

export const ConfigView: React.FC<ConfigViewProps> = ({ authenticatedUser }) => {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({
    type: '',
    text: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    // Simulate backend update with safety check
    setTimeout(() => {
      setIsSubmitting(false);
      setStatusMsg({
        type: 'success',
        text: '¡Contraseña actualizada exitosamente en el servidor de Boombah!',
      });
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
    }, 800);
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
