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
  CalendarCheck
} from 'lucide-react';

interface EmailConfig {
  enabled: boolean;
  recipients: string[];
  scheduleHour: number;
  attachExcel: boolean;
  senderName: string;
}

interface ScheduleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
}

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwEDMJffjkXLYTPnYpQA3jC51KmyDb8TtNG3haEGv5lYvbzZAMjaAI3Xmy3BF5SQCkL/exec';

export const ScheduleReportModal: React.FC<ScheduleReportModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail = 'juan.mercado@boombah.com'
}) => {
  const [config, setConfig] = useState<EmailConfig>({
    enabled: true,
    recipients: [],
    scheduleHour: 18,
    attachExcel: true,
    senderName: 'Sistema Automático de Control de Producción'
  });

  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    const local = localStorage.getItem('nave6_email_config');
    if (local) {
      try {
        setConfig(JSON.parse(local));
      } catch {}
    }

    setLoading(true);
    fetch(APPS_SCRIPT_URL)
      .then(r => r.json())
      .then((data: EmailConfig) => {
        if (data && Array.isArray(data.recipients)) {
          setConfig(data);
          localStorage.setItem('nave6_email_config', JSON.stringify(data));
        }
      })
      .catch(err => console.warn('Usando configuración guardada localmente:', err))
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

  const handleSaveConfig = async () => {
    setLoading(true);
    setNotification(null);
    try {
      localStorage.setItem('nave6_email_config', JSON.stringify(config));

      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SAVE', config })
      });

      setNotification({ type: 'success', text: 'Configuración guardada y programada correctamente.' });
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error al sincronizar: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!currentUserEmail) return;
    setSendingTest(true);
    setNotification(null);
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST',
          userEmail: currentUserEmail,
          attachExcel: config.attachExcel
        })
      });
      setNotification({
        type: 'success',
        text: `Prueba en proceso. Revisa en unos momentos la bandeja de entrada de ${currentUserEmail}.`
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error al disparar la prueba: ' + err.message });
    } finally {
      setSendingTest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#12161f] border border-[#00f2fe]/40 rounded-2xl w-full max-w-lg p-6 shadow-[0_0_35px_rgba(0,242,254,0.25)] space-y-5 text-gray-200">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-white tracking-wide">
                Reporte Automático por Correo
              </h3>
              <span className="text-[11px] text-gray-400">Corte diario de Nave 6 (Lunes a Viernes)</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
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

        {/* Switch Principal */}
        <div className="flex items-center justify-between p-3.5 bg-[#0d1017] rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
              <Power className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Servicio de Envíos Diarios</div>
              <div className="text-[10px] text-gray-400">
                {config.enabled ? 'Activo: se enviará automáticamente al final del día' : 'Pausado: no se emitirán reportes'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              config.enabled 
                ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            {config.enabled ? 'ACTIVADO' : 'DESACTIVADO'}
          </button>
        </div>

        {/* Opciones de Hora y Frecuencia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-[#0d1017] p-3 rounded-xl border border-white/10 space-y-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#00f2fe]" /> Hora de Envío
            </span>
            <select
              value={config.scheduleHour}
              onChange={(e) => setConfig(c => ({ ...c, scheduleHour: Number(e.target.value) }))}
              className="w-full bg-[#12161f] border border-white/15 rounded-lg py-1.5 px-2.5 text-white font-bold outline-none"
            >
              <option value={15}>3:00 PM</option>
              <option value={16}>4:00 PM</option>
              <option value={17}>5:00 PM</option>
              <option value={18}>6:00 PM (Fin de turno)</option>
              <option value={19}>7:00 PM</option>
              <option value={20}>8:00 PM</option>
            </select>
          </div>

          <div className="bg-[#0d1017] p-3 rounded-xl border border-white/10 space-y-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" /> Frecuencia
            </span>
            <div className="py-1.5 px-2.5 bg-[#12161f] border border-white/15 rounded-lg text-emerald-400 font-bold text-xs">
              Lunes a Viernes
            </div>
          </div>
        </div>

        {/* Checkbox Adjuntar Excel */}
        <div className="flex items-center justify-between p-3.5 bg-[#0d1017] rounded-xl border border-white/10">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-xs font-bold text-white block">Adjuntar copia en Excel (.xlsx)</span>
              <span className="text-[10px] text-gray-400">Incluye el libro completo con todas las pestañas</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={config.attachExcel}
            onChange={(e) => setConfig(c => ({ ...c, attachExcel: e.target.checked }))}
            className="w-4 h-4 accent-[#00f2fe] rounded cursor-pointer"
          />
        </div>

        {/* Destinatarios */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Destinatarios Programados ({config.recipients.length})
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
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </div>

          <div className="max-h-28 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {config.recipients.length > 0 ? (
              config.recipients.map((rec, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#0d1017] border border-white/5 text-xs">
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
              <div className="text-center py-3 text-xs text-gray-500">
                No hay destinatarios agregados todavía.
              </div>
            )}
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
          <button
            onClick={handleSendTest}
            disabled={sendingTest}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-black font-bold text-xs transition-all cursor-pointer"
            title={`Se enviará una prueba a ${currentUserEmail}`}
          >
            <Send className={`w-3.5 h-3.5 ${sendingTest ? 'animate-spin' : ''}`} />
            <span>{sendingTest ? 'Enviando...' : 'Enviar Prueba a Mí'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:bg-white/5 cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={handleSaveConfig}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[#00f2fe] text-[#0b0e14] font-black text-xs hover:bg-[#00f2fe]/80 shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all cursor-pointer"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
