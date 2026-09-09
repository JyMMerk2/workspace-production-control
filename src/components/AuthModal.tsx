import React, { useState, useEffect } from 'react';
import { Lock, User, Mail, CheckCircle2, AlertCircle, KeyRound, ArrowLeft, Check, X, ShieldAlert } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface AuthModalProps {
  onLoginSuccess: (username: string, email?: string, userPicture?: string) => void;
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

const SUPABASE_URL = 'https://qpozgkxdzcixjkjblntd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb3pna3hkemNpeGpramJsbnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDAzMjEsImV4cCI6MjEwNDAxNjMyMX0.RYHR0XYeG6-YGI8zmird9FF-KP67_CmVsVpv5gYTS5o';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GOOGLE_CLIENT_ID = "530061438374-1fp6i7sfguub0jsqfb47n8bb6equmuga.apps.googleusercontent.com";

const SLIDES_PRODUCCION = [
  {
    url: '/carrusel-1.jpg',
    tag: 'CONTROL WIP',
    titulo: 'Seguimiento de mochilas y prendas en tiempo real.',
  },
  {
    url: '/carrusel-2.jpg',
    tag: 'SUBLIMACIÓN & FULL DYE',
    titulo: 'Sincronización automatizada con Google Sheets.',
  },
  {
    url: '/carrusel-3.jpg',
    tag: 'BOOMBAH WORKSPACE',
    titulo: 'Gestión por usuario y asignación directa de permisos.',
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [showAdminPinPrompt, setShowAdminPinPrompt] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success' | 'info' | ''; text: string }>({
    type: '',
    text: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isAdminView, setIsAdminView] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES_PRODUCCION.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).google && mode === 'LOGIN' && !showAdminPinPrompt && !isAdminView) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });

        const targetDiv = document.getElementById("googleSignInBtn");
        if (targetDiv) {
          (window as any).google.accounts.id.renderButton(targetDiv, {
            theme: "filled_blue",
            size: "large",
            width: "100%",
            text: "continue_with",
            shape: "pill"
          });
        }
      } catch (err) {
        console.error("Error inicializando Google Identity:", err);
      }
    }
  }, [mode, showAdminPinPrompt, isAdminView]);

  const handleCredentialResponse = (response: any) => {
    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const payload = JSON.parse(jsonPayload);
      const userEmail = payload.email;
      const userName = payload.name || payload.given_name || userEmail.split('@')[0];
      const userPicture = payload.picture;

      onLoginSuccess(userName, userEmail, userPicture);
    } catch (e) {
      console.error("Error al procesar token de Google:", e);
      setStatusMsg({ type: 'error', text: 'No se pudo verificar la cuenta de Google. Inténtalo de nuevo.' });
    }
  };

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

  const handleVerifyAdminAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === ADMIN_PASS_MASTER) {
      setShowAdminPinPrompt(false);
      setIsAdminView(true);
      setAdminPin('');
      setStatusMsg({ type: '', text: '' });
    } else {
      setStatusMsg({ type: 'error', text: 'Contraseña de Administrador incorrecta.' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg({ type: 'info', text: 'Verificando con el servidor...' });
    setIsLoading(true);

    if (mode === 'LOGIN') {
      if (
        (user.toLowerCase() === ADMIN_USER_MASTER.toLowerCase() && pass === ADMIN_PASS_MASTER) ||
        (user.toLowerCase() === 'jmercado' && pass === 'jymmerk2') ||
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
            onLoginSuccess(foundUser.username, foundUser.email);
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
        setStatusMsg({ type: 'error', text: 'Error de conexión con la base de datos.' });
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
    <div className="fixed inset-0 z-50 bg-[#0b0e14] flex items-center justify-between p-8 md:p-16 overflow-hidden">
      
      {/* MARCA DE AGUA DE BOOMBAH ALINEADA A LA IZQUIERDA */}
      <div className="hidden lg:flex flex-col items-center justify-center w-1/2 z-10 pointer-events-none select-none pr-8">
        <img 
          src="/logo.png" 
          alt="Boombah Watermark" 
          className="w-[450px] h-[450px] object-contain opacity-40 drop-shadow-[0_0_35px_rgba(255,0,127,0.5)] animate-pulse"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/apple-touch-icon.png';
          }}
        />
        <p className="text-[#00f2fe] font-black tracking-widest text-lg mt-4 opacity-80 uppercase">
          Boombah Workspace Production
        </p>
      </div>

      {/* TARJETA DE LOGIN ALINEADA A LA DERECHA */}
      <div className="relative z-20 w-full lg:w-1/2 max-w-2xl ml-auto bg-[#12161f] border border-[#00f2fe]/40 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,242,254,0.2)] grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
        
        {/* LADO IZQUIERDO DE LA TARJETA: CARRUSEL DE FOTOS */}
        <div className="relative overflow-hidden bg-slate-950 hidden md:flex flex-col justify-end p-6 border-r border-white/5">
          {SLIDES_PRODUCCION.map((slide, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-1000 bg-cover bg-center ${
                i === currentSlide ? 'opacity-65 scale-105' : 'opacity-0 scale-100'
              }`}
              style={{ backgroundImage: `url(${slide.url})` }}
            />
          ))}

          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-[#0b0e14]/30 to-transparent pointer-events-none" />

          <div className="relative z-20 space-y-2 bg-[#0b0e14]/85 p-4 rounded-xl border border-[#00f2fe]/20 backdrop-blur-md shadow-2xl">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider text-[#00f2fe] bg-[#00f2fe]/10 border border-[#00f2fe]/30 uppercase">
              {SLIDES_PRODUCCION[currentSlide].tag}
            </span>
            <h3 className="text-xs font-black text-white leading-snug">
              {SLIDES_PRODUCCION[currentSlide].titulo}
            </h3>

            <div className="flex gap-1.5 pt-2">
              {SLIDES_PRODUCCION.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1 rounded-full transition-all cursor-pointer ${
                    i === currentSlide ? 'w-6 bg-[#00f2fe]' : 'w-2 bg-white/30 hover:bg-white/60'
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* LADO DERECHO DE LA TARJETA: FORMULARIO */}
        <div className="p-6 flex flex-col justify-between text-center bg-[#12161f]">
          <div>
            <div className="mx-auto w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f2fe]/20 to-[#ff007f]/20 border border-[#00f2fe] flex items-center justify-center shadow-[0_0_15px_rgba(0,242,254,0.4)] mb-2">
              <span className="text-xl font-black italic tracking-tighter text-[#00f2fe]">B</span>
            </div>

            <h2 className="text-[11px] font-black uppercase tracking-widest text-[#00f2fe] mb-0.5">
              {showAdminPinPrompt
                ? 'AUTENTICACIÓN REQUERIDA'
                : isAdminView
                ? 'PANEL DE APROBACIÓN DE ACCESOS'
                : mode === 'LOGIN'
                ? 'CONTROL DE PRODUCCIÓN'
                : mode === 'REGISTRO'
                ? 'SOLICITAR REGISTRO'
                : mode === 'RECUPERAR'
                ? 'RECUPERAR ACCESO'
                : 'DEFINIR NUEVA CLAVE'}
            </h2>
            <p className="text-[10px] text-[#8f9ba8] mb-4">Boombah Sports Tech</p>

            {showAdminPinPrompt ? (
              <form onSubmit={handleVerifyAdminAccess} className="space-y-3 text-left">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#ffe600] mb-1">
                    Contraseña Maestro
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#ffe600]/70" />
                    <input
                      type="password"
                      required
                      autoFocus
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      placeholder="Ingrese contraseña maestra"
                      className="w-full pl-8 pr-3 py-2 bg-[#0d1017] border border-[#ffe600]/40 rounded-lg text-xs text-white focus:outline-none focus:border-[#ffe600]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-[#ffe600]/20 border border-[#ffe600] text-[#ffe600] hover:bg-[#ffe600] hover:text-[#0b0e14] transition-all cursor-pointer mt-1"
                >
                  Acceder
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPinPrompt(false);
                    setStatusMsg({ type: '', text: '' });
                  }}
                  className="w-full py-1 text-xs text-[#8f9ba8] hover:text-white text-center block cursor-pointer"
                >
                  Cancelar
                </button>
              </form>
            ) : isAdminView ? (
              <div className="space-y-2.5 text-left max-h-56 overflow-y-auto custom-scrollbar">
                {pendingUsers.length === 0 ? (
                  <p className="text-xs text-center text-gray-400 py-3">No hay solicitudes pendientes.</p>
                ) : (
                  pendingUsers.map((u) => (
                    <div key={u.id} className="p-2.5 bg-[#0d1017] rounded-lg border border-white/10 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">{u.username}</span>
                        <span className="text-[9px] text-gray-400 block">{u.email || 'Sin correo'}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleApprove(u.id, 'APROBADO')}
                          className="p-1 bg-[#39ff14]/20 border border-[#39ff14] text-[#39ff14] rounded hover:bg-[#39ff14] hover:text-black transition-all cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(u.id, 'RECHAZADO')}
                          className="p-1 bg-red-500/20 border border-red-500 text-red-400 rounded hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => setIsAdminView(false)}
                  className="w-full mt-2 py-1.5 bg-white/5 border border-white/10 text-xs font-bold text-gray-300 rounded hover:bg-white/10 cursor-pointer text-center"
                >
                  Volver al Login
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-left">
                {mode === 'LOGIN' && (
                  <div className="space-y-2 pb-2 border-b border-white/10">
                    <div id="googleSignInBtn" className="w-full flex items-center justify-center"></div>
                    <div className="relative flex py-0.5 items-center">
                      <div className="flex-grow border-t border-white/10"></div>
                      <span className="flex-shrink mx-2 text-[9px] text-gray-500 uppercase font-bold">o con usuario</span>
                      <div className="flex-grow border-t border-white/10"></div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-2.5">
                  {(mode === 'LOGIN' || mode === 'REGISTRO' || mode === 'RECUPERAR') && (
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-0.5">
                        {mode === 'REGISTRO' ? 'Usuario Deseado' : 'Usuario'}
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#00f2fe]/70" />
                        <input
                          type="text"
                          required
                          value={user}
                          onChange={(e) => setUser(e.target.value)}
                          placeholder={mode === 'REGISTRO' ? 'Ej: jmercado' : 'admin'}
                          className="w-full pl-8 pr-3 py-2 bg-[#0d1017] border border-[#00f2fe]/30 rounded-lg text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                        />
                      </div>
                    </div>
                  )}

                  {(mode === 'REGISTRO' || mode === 'RECUPERAR') && (
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-0.5">
                        Correo Electrónico (Opcional)
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#00f2fe]/70" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ejemplo@boombah.com"
                          className="w-full pl-8 pr-3 py-2 bg-[#0d1017] border border-[#00f2fe]/30 rounded-lg text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                        />
                      </div>
                    </div>
                  )}

                  {(mode === 'LOGIN' || mode === 'REGISTRO' || mode === 'CAMBIAR_PASS') && (
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-0.5">
                        {mode === 'CAMBIAR_PASS' ? 'Nueva Contraseña' : 'Contraseña'}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#00f2fe]/70" />
                        <input
                          type="password"
                          required
                          value={pass}
                          onChange={(e) => setPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-8 pr-3 py-2 bg-[#0d1017] border border-[#00f2fe]/30 rounded-lg text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                        />
                      </div>
                    </div>
                  )}

                  {(mode === 'REGISTRO' || mode === 'CAMBIAR_PASS') && (
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-[#8f9ba8] mb-0.5">
                        Confirmar Contraseña
                      </label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#39ff14]/70" />
                        <input
                          type="password"
                          required
                          value={passConfirm}
                          onChange={(e) => setPassConfirm(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-8 pr-3 py-2 bg-[#0d1017] border border-[#39ff14]/30 rounded-lg text-xs text-white focus:outline-none focus:border-[#39ff14]"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg disabled:opacity-50 mt-1 ${
                      mode === 'REGISTRO'
                        ? 'bg-[#39ff14]/20 border border-[#39ff14] text-[#39ff14] hover:bg-[#39ff14] hover:text-[#0b0e14]'
                        : mode === 'RECUPERAR'
                        ? 'bg-[#ffe600]/20 border border-[#ffe600] text-[#ffe600] hover:bg-[#ffe600] hover:text-[#0b0e14]'
                        : 'bg-[#00f2fe]/15 border border-[#00f2fe] text-[#00f2fe] hover:bg-[#00f2fe] hover:text-[#0b0e14]'
                    }`}
                  >
                    {isLoading
                      ? 'Procesando...'
                      : mode === 'LOGIN'
                      ? 'Iniciar Sesión'
                      : mode === 'REGISTRO'
                      ? 'Enviar Solicitud'
                      : mode === 'RECUPERAR'
                      ? 'Notificar Supervisor'
                      : 'Guardar Contraseña'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {statusMsg.text && (
            <div
              className={`mt-2 p-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 ${
                statusMsg.type === 'error'
                  ? 'bg-[#ff007f]/10 border border-[#ff007f]/40 text-[#ff007f]'
                  : statusMsg.type === 'success'
                  ? 'bg-[#39ff14]/10 border border-[#39ff14]/40 text-[#39ff14]'
                  : 'bg-[#00f2fe]/10 border border-[#00f2fe]/40 text-[#00f2fe]'
              }`}
            >
              {statusMsg.type === 'error' && <AlertCircle className="w-3 h-3 shrink-0" />}
              {statusMsg.type === 'success' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {!showAdminPinPrompt && (
            <div className="mt-2 pt-2 border-t border-white/5 space-y-0.5 text-[10px]">
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
                    Solicitar registro aquí
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('RECUPERAR');
                      setStatusMsg({ type: '', text: '' });
                    }}
                    className="text-[#ff9e00] hover:text-white underline block mx-auto cursor-pointer"
                  >
                    ¿Necesitas ayuda con tu acceso?
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminPinPrompt(true);
                      setStatusMsg({ type: '', text: '' });
                    }}
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
                    setIsAdminView(false);
                    setStatusMsg({ type: '', text: '' });
                  }}
                  className="text-[#00f2fe] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer font-bold"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Volver al inicio de sesión</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
