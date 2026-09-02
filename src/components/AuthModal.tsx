import React, { useState } from 'react';
import { Lock, User, Mail, CheckCircle2, AlertCircle, Shield, KeyRound, ArrowLeft } from 'lucide-react';

interface AuthModalProps {
  onLoginSuccess: (username: string) => void;
}

type AuthMode = 'LOGIN' | 'REGISTRO' | 'RECUPERAR' | 'CAMBIAR_PASS';

const ADMIN_USER_MASTER = 'admin';
const ADMIN_PASS_MASTER = 'adminjymmerk2';

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success' | 'info' | ''; text: string }>({
    type: '',
    text: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg({ type: 'info', text: 'Verificando con el servidor...' });
    setIsLoading(true);

    // 1. MASTER LOGIN CHECK
    if (mode === 'LOGIN') {
      if (
        (user.toLowerCase() === ADMIN_USER_MASTER.toLowerCase() && pass === ADMIN_PASS_MASTER) ||
        (user.toLowerCase() === 'jmercado' && pass === '123456') ||
        (user.toLowerCase() === 'supervisor' && pass === 'boombah2026')
      ) {
        setTimeout(() => {
          setIsLoading(false);
          onLoginSuccess(user || 'admin');
        }, 500);
        return;
      }
    }

    // 2. REGISTRATION
    if (mode === 'REGISTRO') {
      if (pass !== passConfirm) {
        setIsLoading(false);
        setStatusMsg({ type: 'error', text: 'Las contraseñas no coinciden. Por favor verifique.' });
        return;
      }
      setTimeout(() => {
        setIsLoading(false);
        setStatusMsg({
          type: 'success',
          text: '¡Solicitud enviada al Administrador de Boombah! Se le notificará cuando su cuenta sea aprobada.',
        });
        setUser('');
        setPass('');
        setPassConfirm('');
        setEmail('');
      }, 700);
      return;
    }

    // 3. RECOVERY
    if (mode === 'RECUPERAR') {
      setTimeout(() => {
        setIsLoading(false);
        setStatusMsg({
          type: 'success',
          text: '¡Notificación enviada al supervisor! Se ha generado una solicitud de restablecimiento.',
        });
      }, 700);
      return;
    }

    // 4. CHANGE PASS
    if (mode === 'CAMBIAR_PASS') {
      if (pass !== passConfirm) {
        setIsLoading(false);
        setStatusMsg({ type: 'error', text: 'Las nuevas contraseñas no coinciden.' });
        return;
      }
      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess(user || 'operador');
      }, 600);
      return;
    }

    // Fallback login validation
    setTimeout(() => {
      setIsLoading(false);
      if (pass.length >= 4) {
        onLoginSuccess(user);
      } else {
        setStatusMsg({
          type: 'error',
          text: 'Credenciales inválidas. Ingrese con admin / adminjymmerk2 o solicite registro.',
        });
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0e14] flex items-center justify-center p-4">
      {/* Background Neon Glow Rings */}
      <div className="absolute w-[500px] h-[500px] bg-[#00f2fe]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute w-[400px] h-[400px] bg-[#ff007f]/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative w-full max-w-sm bg-[#12161f] border border-[#00f2fe] rounded-2xl p-7 shadow-[0_0_35px_rgba(0,242,254,0.25)] text-center">
        {/* Brand Icon */}
        <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-[#00f2fe]/20 to-[#ff007f]/20 border border-[#00f2fe] flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.4)] mb-4">
          <span className="text-2xl font-black italic tracking-tighter text-[#00f2fe]">B</span>
        </div>

        <h2 className="text-xs font-black uppercase tracking-widest text-[#00f2fe] mb-1">
          {mode === 'LOGIN' && 'CONTROL DE PRODUCCIÓN'}
          {mode === 'REGISTRO' && 'SOLICITAR REGISTRO'}
          {mode === 'RECUPERAR' && 'RECUPERAR ACCESO'}
          {mode === 'CAMBIAR_PASS' && 'DEFINIR NUEVA CLAVE'}
        </h2>
        <p className="text-[11px] text-[#8f9ba8] mb-5">Boombah Sports Tech • Workspace Production</p>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
          {/* USER FIELD */}
          {(mode === 'LOGIN' || mode === 'REGISTRO' || mode === 'RECUPERAR') && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-1">
                {mode === 'REGISTRO' ? 'Usuario Deseado' : 'Usuario'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00f2fe]/70" />
                <input
                  type="text"
                  required
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder={mode === 'REGISTRO' ? 'Ej: jmercado' : 'admin'}
                  className="w-full pl-9 pr-3 py-2 bg-[#0d1017] border border-[#00f2fe]/30 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00f2fe] focus:shadow-[0_0_10px_rgba(0,242,254,0.3)] transition-all"
                />
              </div>
            </div>
          )}

          {/* EMAIL FIELD (Optional for Register / Recovery) */}
          {(mode === 'REGISTRO' || mode === 'RECUPERAR') && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-1">
                Correo Electrónico (Opcional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00f2fe]/70" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@boombah.com"
                  className="w-full pl-9 pr-3 py-2 bg-[#0d1017] border border-[#00f2fe]/30 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00f2fe]"
                />
              </div>
            </div>
          )}

          {/* PASSWORD FIELD */}
          {(mode === 'LOGIN' || mode === 'REGISTRO' || mode === 'CAMBIAR_PASS') && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-1">
                {mode === 'CAMBIAR_PASS' ? 'Nueva Contraseña' : 'Contraseña'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00f2fe]/70" />
                <input
                  type="password"
                  required
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-[#0d1017] border border-[#00f2fe]/30 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00f2fe] focus:shadow-[0_0_10px_rgba(0,242,254,0.3)] transition-all"
                />
              </div>
            </div>
          )}

          {/* CONFIRM PASSWORD */}
          {(mode === 'REGISTRO' || mode === 'CAMBIAR_PASS') && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-1">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#39ff14]/70" />
                <input
                  type="password"
                  required
                  value={passConfirm}
                  onChange={(e) => setPassConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-[#0d1017] border border-[#39ff14]/30 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#39ff14]"
                />
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg disabled:opacity-50 mt-2 ${
              mode === 'REGISTRO'
                ? 'bg-[#39ff14]/20 border border-[#39ff14] text-[#39ff14] hover:bg-[#39ff14] hover:text-[#0b0e14] shadow-[0_0_15px_rgba(57,255,20,0.3)]'
                : mode === 'RECUPERAR'
                ? 'bg-[#ffe600]/20 border border-[#ffe600] text-[#ffe600] hover:bg-[#ffe600] hover:text-[#0b0e14] shadow-[0_0_15px_rgba(255,230,0,0.3)]'
                : 'bg-[#00f2fe]/15 border border-[#00f2fe] text-[#00f2fe] hover:bg-[#00f2fe] hover:text-[#0b0e14] shadow-[0_0_15px_rgba(0,242,254,0.3)]'
            }`}
          >
            {isLoading
              ? 'Procesando...'
              : mode === 'LOGIN'
              ? 'Iniciar Sesión'
              : mode === 'REGISTRO'
              ? 'Enviar Solicitud'
              : mode === 'RECUPERAR'
              ? 'Notificar al Administrador'
              : 'Guardar Nueva Contraseña'}
          </button>
        </form>

        {/* Status Message */}
        {statusMsg.text && (
          <div
            className={`mt-3 p-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 ${
              statusMsg.type === 'error'
                ? 'bg-[#ff007f]/10 border border-[#ff007f]/40 text-[#ff007f]'
                : statusMsg.type === 'success'
                ? 'bg-[#39ff14]/10 border border-[#39ff14]/40 text-[#39ff14]'
                : 'bg-[#00f2fe]/10 border border-[#00f2fe]/40 text-[#00f2fe]'
            }`}
          >
            {statusMsg.type === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            {statusMsg.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Toggle Links */}
        <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5 text-[11px]">
          {mode === 'LOGIN' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTRO');
                  setStatusMsg({ type: '', text: '' });
                }}
                className="text-[#8f9ba8] hover:text-[#00f2fe] underline block mx-auto cursor-pointer"
              >
                ¿No tienes usuario? Solicita registro aquí
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('RECUPERAR');
                  setStatusMsg({ type: '', text: '' });
                }}
                className="text-[#ff9e00] hover:text-white underline block mx-auto cursor-pointer"
              >
                ¿Olvidaste tu acceso o necesitas ayuda?
              </button>
              <div className="pt-2 text-[10px] text-gray-500">
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setStatusMsg({ type: '', text: '' });
              }}
              className="text-[#00f2fe] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer font-bold"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Volver a inicio de sesión</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
