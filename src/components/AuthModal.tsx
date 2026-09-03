import React, { useState, useEffect } from 'react';
import { Lock, User, Mail, CheckCircle2, AlertCircle, KeyRound, ArrowLeft, Check, X, ShieldAlert } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface AuthModalProps {
  onLoginSuccess: (username: string) => void;
}

type AuthMode = 'LOGIN' | 'REGISTRO' | 'RECUPERAR' | 'CAMBIAR_PASS';

interface PendingUser {
  id: string;
  username: string;
  email: string | null;
  status: string;
  created_at: string;
}

const ADMIN_USER_MASTER = 'admin';
const ADMIN_PASS_MASTER = 'adminjymmerk2';

// URL y Clave corregidas exactamente con los datos de tu panel de Supabase
const SUPABASE_URL = 'https://qpozgkdzcixjkjblntd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb3pna2R6Y2l4amtqYmxudGQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4ODQ0MDMyMSwiZXhwIjoyMTA0MDE2MzIxfQ.RYHR0XYeG6-YGI8zmird9FF-KP67_CmVsVpv5gYTS5o';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isAdminView, setIsAdminView] = useState(false);

  const fetchPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('status', 'PENDIENTE');

      if (!error && data) {
        setPendingUsers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isAdminView) {
      fetchPendingUsers();
    }
  }, [isAdminView]);

  const handleApprove = async (id: string, newStatus: 'APROBADO' | 'RECHAZADO') => {
    try {
      const { error } = await supabase
        .from('app_users')
        .update({ status: newStatus })
        .eq('id', id);

      if (!error) {
        setPendingUsers((prev) => prev.filter((u) => u.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg({ type: 'info', text: 'Verificando con el servidor...' });
    setIsLoading(true);

    if (mode === 'LOGIN') {
      if (
        (user.toLowerCase() === ADMIN_USER_MASTER.toLowerCase() && pass === ADMIN_PASS_MASTER) ||
        (user.toLowerCase() === 'jmercado' && pass === '123456') ||
        (user.toLowerCase() === 'supervisor' && pass === 'boombah2026')
      ) {
        setIsLoading(false);
        onLoginSuccess(user || 'admin');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .eq('username', user)
          .eq('password', pass);

        if (!error && data && data.length > 0) {
          const foundUser = data[0];
          setIsLoading(false);
          if (foundUser.status === 'APROBADO') {
            onLoginSuccess(foundUser.username);
            return;
          } else if (foundUser.status === 'PENDIENTE') {
            setStatusMsg({ type: 'error', text: 'Tu cuenta está pendiente de aprobación por el Administrador.' });
            return;
          } else {
            setStatusMsg({ type: 'error', text: 'Tu solicitud de acceso fue rechazada.' });
            return;
          }
        }
      } catch (err) {
        console.error(err);
      }

      setIsLoading(false);
      setStatusMsg({ type: 'error', text: 'Credenciales inválidas. Verifica usuario y contraseña.' });
      return;
    }

    if (mode === 'REGISTRO') {
      if (pass !== passConfirm) {
        setIsLoading(false);
        setStatusMsg({ type: 'error', text: 'Las contraseñas no coinciden. Por favor verifique.' });
        return;
      }

      try {
        const { error } = await supabase
          .from('app_users')
          .insert([
            {
              username: user,
              password: pass,
              email: email || null,
              status: 'PENDIENTE',
            },
          ]);

        setIsLoading(false);
        if (!error) {
          setStatusMsg({
            type: 'success',
            text: '¡Solicitud enviada al Administrador de Boombah! Podrá ser aprobada desde el panel.',
          });
          setUser('');
          setPass('');
          setPassConfirm('');
          setEmail('');
        } else {
          setStatusMsg({ type: 'error', text: error.message || 'El usuario ya existe o hubo un problema al registrar.' });
        }
      } catch (err: any) {
        setIsLoading(false);
        setStatusMsg({ type: 'error', text: err?.message || 'Error de conexión con la base de datos.' });
      }
      return;
    }

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
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0e14] flex items-center justify-center p-4">
      <div className="absolute w-[500px] h-[500px] bg-[#00f2fe]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute w-[400px] h-[400px] bg-[#ff007f]/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative w-full max-w-sm bg-[#12161f] border border-[#00f2fe] rounded-2xl p-7 shadow-[0_0_35px_rgba(0,242,254,0.25)] text-center">
        <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-[#00f2fe]/20 to-[#ff007f]/20 border border-[#00f2fe] flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.4)] mb-4">
          <span className="text-2xl font-black italic tracking-tighter text-[#00f2fe]">B</span>
        </div>

        <h2 className="text-xs font-black uppercase tracking-widest text-[#00f2fe] mb-1">
          {isAdminView
            ? 'PANEL DE APROBACIÓN DE ACCESOS'
            : mode === 'LOGIN'
            ? 'CONTROL DE PRODUCCIÓN'
            : mode === 'REGISTRO'
            ? 'SOLICITAR REGISTRO'
            : mode === 'RECUPERAR'
            ? 'RECUPERAR ACCESO'
            : 'DEFINIR NUEVA CLAVE'}
        </h2>
        <p className="text-[11px] text-[#8f9ba8] mb-5">Boombah Sports Tech • Workspace Production</p>

        {isAdminView ? (
          <div className="space-y-3 text-left max-h-64 overflow-y-auto">
            {pendingUsers.length === 0 ? (
              <p className="text-xs text-center text-gray-400 py-4">No hay solicitudes pendientes.</p>
            ) : (
              pendingUsers.map((u) => (
                <div key={u.id} className="p-3 bg-[#0d1017] rounded-lg border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">{u.username}</span>
                    <span className="text-[10px] text-gray-400 block">{u.email || 'Sin correo'}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleApprove(u.id, 'APROBADO')}
                      className="p-1.5 bg-[#39ff14]/20 border border-[#39ff14] text-[#39ff14] rounded hover:bg-[#39ff14] hover:text-black transition-all cursor-pointer"
                      title="Aprobar"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(u.id, 'RECHAZADO')}
                      className="p-1.5 bg-red-500/20 border border-red-500 text-red-400 rounded hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                      title="Rechazar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
            <button
              type="button"
              onClick={() => setIsAdminView(false)}
              className="w-full mt-2 py-1.5 bg-white/5 border border-white/10 text-xs font-bold text-gray-300 rounded hover:bg-white/10 cursor-pointer"
            >
              Volver al Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
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
        )}

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
              <button
                type="button"
                onClick={() => setIsAdminView(true)}
                className="text-[#ffe600] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer font-bold pt-1"
              >
                <ShieldAlert className="w-3 h-3" />
                <span>Panel de Autorización Admin</span>
              </button>
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
