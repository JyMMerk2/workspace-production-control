import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Clock, 
  Send, 
  Plus, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Power, 
  FileSpreadsheet, 
  Calendar,
  Zap,
  Sliders
} from 'lucide-react';

interface EmailConfig {
  enabled: boolean;
  recipients: string[];
  scheduleTime: string; // formato "HH:mm"
  days: number[]; // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
  attachExcel: boolean;
  senderName: string;
}

interface ScheduleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
}

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwEDMJffjkXLYTPnYpQA3jC51KmyDb8TtNG3haEGv5lYvbzZAMjaAI3Xmy3BF5SQCkL/exec';

const DAYS_MAP = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
];

export const ScheduleReportModal: React.FC<ScheduleReportModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail = 'juan.mercado@boombah.com'
}) => {
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'NOW' | 'TEST'>('CONFIG');

  const [config, setConfig] = useState<EmailConfig>({
    enabled: true,
    recipients: [],
    scheduleTime: '18:00',
    days: [1, 2, 3, 4, 5],
    attachExcel: true,
    senderName: 'Sistema Automático de Control de Producción'
  });

  const [testEmail, setTestEmail] = useState(currentUserEmail);
  const [testAttachExcel, setTestAttachExcel] = useState(true);
  const [nowAttachExcel, setNowAttachExcel] = useState(true);

  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const local = localStorage.getItem('nave6_email_config');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch {}
    }

    setLoading(true);
    fetch(APPS_SCRIPT_URL)
      .then(r => r.json())
      .then((data: any) => {
        if (data && Array.isArray(data.recipients)) {
          setConfig(prev => ({
            ...prev,
            enabled: data.enabled !== undefined ? data.enabled : prev.enabled,
            recipients: data.recipients || prev.recipients,
            scheduleTime: data.scheduleTime || (data.scheduleHour ? `${String(data.scheduleHour).padStart(2, '0')}:00` : '18:00'),
            days: data.days || [1, 2, 3, 4, 5],
            attachExcel: data.attachExcel !== undefined ? data.attachExcel : prev.attachExcel
          }));
          localStorage.setItem('nave6_email_config', JSON.stringify(data));
        }
      })
      .catch(err => console.warn('Usando configuración local:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleAddEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (email && email.includes('@') && !config.recipients.includes(email)) {
      setConfig(prev => ({
        ...prev,
        recipients: [...prev.recipients, email]
      }));
      setNewEmail('');
    }
  };

  const handleRemoveEmail = (index: number) => {
    setConfig(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }));
  };

  const handleToggleDay = (dayId: number) => {
    setConfig(prev => {
      const exists = prev.days.includes(dayId);
      const nextDays = exists 
        ? prev.days.filter(d => d !== dayId) 
        : [...prev.days, dayId];
      return { ...prev, days: nextDays.sort() };
    });
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    setNotification(null);
    try {
      localStorage.setItem('nave6_email_config', JSON.stringify(config));

      const payloadUrl = `${APPS_SCRIPT_URL}?action=SAVE&payload=${encodeURIComponent(JSON.stringify(config))}`;
      await fetch(payloadUrl, { method: 'GET', mode: 'no-cors' });

      setNotification({ type: 'success', text: 'Configuración guardada y programada correctamente.' });
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error al sincronizar: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setNotification({ type: 'error', text: 'Ingresa un correo de prueba válido.' });
      return;
    }
    setActionInProgress(true);
    setNotification(null);
    try {
      const testUrl = `${APPS_SCRIPT_URL}?action=TEST&userEmail=${encodeURIComponent(testEmail)}&attachExcel=${testAttachExcel}`;
      await fetch(testUrl, { method: 'GET', mode: 'no-cors' });

      setNotification({
        type: 'success',
        text: `Prueba solicitada exitosamente. Revisa en unos segundos la bandeja de entrada de ${testEmail}.`
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error al solicitar prueba: ' + err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSendNow = async () => {
    if (config.recipients.length === 0) {
      setNotification({ type: 'error', text: 'No hay destinatarios registrados en la lista oficial.' });
      return;
    }
    setActionInProgress(true);
    setNotification(null);
    try {
      const nowUrl = `${APPS_SCRIPT_URL}?action=NOW&attachExcel=${nowAttachExcel}`;
      await fetch(nowUrl, { method: 'GET', mode: 'no-cors' });

      setNotification({
        type: 'success',
        text: `Reporte inmediato enviado a ${config.recipients.length} destinatario(s).`
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error al emitir reporte: ' + err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#12161f] border border-[#00f2fe]/40 rounded-2xl w-full max-w-lg p-6 shadow-[0_0_35px_rgba(0,242,254,0.25)] space-y-4 text-gray-200">
        
        {/* Cabecera Principal */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-white tracking-wide">
                Centro de Reportes por Correo
              </h3>
              <span className="text-[11px] text-gray-400">Control de Producción & Inventario Nave 6</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas Superiores */}
        <div className="grid grid-cols-3 gap-1 bg-[#0d1017] p-1 rounded-xl border border-white/10 text-xs">
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'CONFIG'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#00f2fe]" />
            <span>Programado</span>
          </button>

          <button
            onClick={() => setActiveTab('NOW')}
            className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'NOW'
                ? 'bg-amber-500/20 text-amber-400 shadow-sm border border-amber-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Enviar Ahora</span>
          </button>

          <button
            onClick={() => setActiveTab('TEST')}
            className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'TEST'
                ? 'bg-emerald-500/20 text-emerald-400 shadow-sm border border-emerald-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span>Prueba</span>
          </button>
        </div>

        {/* Notificaciones */}
        {notification && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            notification.type === 'success' 
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300' 
              : 'bg-rose-500/15 border border-rose-500/40 text-rose-300'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{notification.text}</span>
          </div>
        )}

        {/* PESTAÑA 1: PROGRAMADO */}
        {activeTab === 'CONFIG' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[#0d1017] rounded-xl border border-white/10">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${config.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
                  <Power className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Automatización Diaria</div>
                  <div className="text-[10px] text-gray-400">
                    {config.enabled ? 'Se enviará en los días y hora fijada' : 'Pausado temporalmente'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))}
                className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  config.enabled 
                    ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                {config.enabled ? 'ACTIVO' : 'PAUSADO'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#0d1017] p-3 rounded-xl border border-white/10 space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#00f2fe]" /> Hora Exacta de Corte
                </span>
                <input
                  type="time"
                  value={config.scheduleTime}
                  onChange={(e) => setConfig(c => ({ ...c, scheduleTime: e.target.value }))}
                  className="w-full bg-[#12161f] border border-white/15 rounded-lg py-1.5 px-3 text-white font-mono font-bold text-sm outline-none focus:border-[#00f2fe]"
                />
              </div>

              <div className="bg-[#0d1017] p-3 rounded-xl border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Copia en Excel (.xlsx)
                </span>
                <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={config.attachExcel}
                    onChange={(e) => setConfig(c => ({ ...c, attachExcel: e.target.checked }))}
                    className="w-4 h-4 accent-[#00f2fe] rounded cursor-pointer"
                  />
                  <span>Adjuntar Libro Completo</span>
                </label>
              </div>
            </div>

            <div className="bg-[#0d1017] p-3 rounded-xl border border-white/10 space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" /> Días de Envío Automático
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_MAP.map(d => {
                  const isSelected = config.days.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleToggleDay(d.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#00f2fe] text-black font-black shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Destinatarios Registrados ({config.recipients.length})
              </span>

              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="correo@boombah.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEmail())}
                  className="flex-1 bg-[#0d1017] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#00f2fe]"
                />
                <button
                  onClick={handleAddEmail}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>

              <div className="max-h-24 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                {config.recipients.length > 0 ? (
                  config.recipients.map((rec, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-[#0d1017] border border-white/5 text-xs">
                      <span className="text-gray-300 font-mono truncate">{rec}</span>
                      <button
                        onClick={() => handleRemoveEmail(idx)}
                        className="text-gray-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-xs text-gray-500">
                    No hay correos añadidos.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={handleSaveConfig}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-[#00f2fe] text-[#0b0e14] font-black text-xs hover:bg-[#00f2fe]/80 shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all cursor-pointer"
              >
                {loading ? 'Guardando...' : 'Guardar y Programar'}
              </button>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: ENVIAR AHORA */}
        {activeTab === 'NOW' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
              <div className="text-xs font-black text-amber-400 uppercase flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> Despacho Inmediato
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Esta acción generará el corte de Nave 6 con los datos actuales y lo enviará de inmediato a los{' '}
                <strong>{config.recipients.length}</strong> destinatario(s) configurados en la lista oficial.
              </p>
            </div>

            <div className="p-3 bg-[#0d1017] rounded-xl border border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Adjuntar copia de Excel (.xlsx)
              </span>
              <input
                type="checkbox"
                checked={nowAttachExcel}
                onChange={(e) => setNowAttachExcel(e.target.checked)}
                className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
              />
            </div>

            <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                Se enviará a:
              </span>
              {config.recipients.map((rec, i) => (
                <div key={i} className="text-xs font-mono text-gray-300 bg-[#0d1017] px-2.5 py-1.5 rounded-lg border border-white/5">
                  {rec}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={handleSendNow}
                disabled={actionInProgress || config.recipients.length === 0}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all cursor-pointer flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>{actionInProgress ? 'Enviando...' : 'Enviar Reporte Ahora'}</span>
              </button>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: ENVIAR PRUEBA */}
        {activeTab === 'TEST' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
              <div className="text-xs font-black text-emerald-400 uppercase flex items-center gap-1.5">
                <Send className="w-4 h-4" /> Verificación de Contenido
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Envía una copia del reporte exclusivamente a la dirección que indiques abajo sin notificar a los destinatarios oficiales.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Correo Receptor de la Prueba
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="tu.correo@boombah.com"
                className="w-full bg-[#0d1017] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-400 font-mono"
              />
            </div>

            <div className="p-3 bg-[#0d1017] rounded-xl border border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Incluir copia de Excel (.xlsx) en la prueba
              </span>
              <input
                type="checkbox"
                checked={testAttachExcel}
                onChange={(e) => setTestAttachExcel(e.target.checked)}
                className="w-4 h-4 accent-emerald-400 rounded cursor-pointer"
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={handleSendTest}
                disabled={actionInProgress}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{actionInProgress ? 'Generando y enviando prueba...' : 'Enviar Prueba a Este Correo'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
