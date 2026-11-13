import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Lock, 
  Unlock, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  MapPin, 
  KeyRound, 
  Send,
  Calculator,
  RefreshCw
} from 'lucide-react';

interface InventoryItem {
  rowNumber: number;
  colA_Validado: boolean;
  colB_Codigo: string;
  colC_Item: string;
  colD_NetSuite: number;
  colE_Newsoft: number;
  colF_Diferencia: number;
  colG_Salida: number;
  colH_Ubicacion: string;
  colI_Candado: boolean;
  colL_Comentario: string;
  isLocked: boolean;
}

interface InventoryPassModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwEDMJffjkXLYTPnYpQA3jC51KmyDb8TtNG3haEGv5lYvbzZAMjaAI3Xmy3BF5SQCkL/exec';
const MASTER_PIN = '030621';

export const InventoryPassModal: React.FC<InventoryPassModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUbicacion, setSelectedUbicacion] = useState('');
  const [ubicacionesList, setUbicacionesList] = useState<string[]>([]);
  
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados editables
  const [colA, setColA] = useState(false);
  const [colB, setColB] = useState('');
  const [colC, setColC] = useState('');
  const [colD, setColD] = useState<number | string>(0);
  const [colE, setColE] = useState<number | string>(0);
  const [colG, setColG] = useState<number | string>(0);
  const [colH, setColH] = useState('');
  const [colI, setColI] = useState(false);
  const [colL, setColL] = useState('');

  // Candado y Desbloqueo por PIN
  const [isUnlockedByPin, setIsUnlockedByPin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [sendingPinEmail, setSendingPinEmail] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cargar ubicaciones únicas al abrir
  useEffect(() => {
    if (!isOpen) return;
    fetch(`${APPS_SCRIPT_URL}?action=GET_UBICACIONES`)
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.ubicaciones)) {
          setUbicacionesList(data.ubicaciones);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Regla del candado activa si Col A e I están marcadas y no se ha introducido el PIN
  const isLocked = (colA && colI) && !isUnlockedByPin;

  // Cálculo de Diferencia en tiempo real: (Almacén + Salidas) - NetSuite
  const numNetSuite = Number(colD) || 0;
  const numAlmacen = Number(colE) || 0;
  const numSalida = Number(colG) || 0;
  const diferenciaCalculada = (numAlmacen + numSalida) - numNetSuite;

  const handleSearch = async () => {
    if (!searchTerm.trim() && !selectedUbicacion) return;
    setSearching(true);
    setNotification(null);
    setItem(null);
    setIsUnlockedByPin(false);

    try {
      const url = `${APPS_SCRIPT_URL}?action=SEARCH_ITEM&query=${encodeURIComponent(searchTerm.trim())}&ubicacion=${encodeURIComponent(selectedUbicacion)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.success && data.item) {
        const it: InventoryItem = data.item;
        setItem(it);
        setColA(it.colA_Validado);
        setColB(it.colB_Codigo);
        setColC(it.colC_Item);
        setColD(it.colD_NetSuite);
        setColE(it.colE_Newsoft);
        setColG(it.colG_Salida);
        setColH(it.colH_Ubicacion);
        setColI(it.colI_Candado);
        setColL(it.colL_Comentario);
      } else {
        setNotification({ type: 'error', text: data.error || 'Artículo no encontrado.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error al consultar: ' + err.message });
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (!item) return;

    if (isLocked) {
      setNotification({ type: 'error', text: 'Este artículo está bloqueado. Debes desbloquearlo con el PIN.' });
      return;
    }

    setSaving(true);
    setNotification(null);

    const payload = {
      rowNumber: item.rowNumber,
      codigo: colB,
      colA,
      colB,
      colC,
      colD: Number(colD) || 0,
      colE: Number(colE) || 0,
      colG: Number(colG) || 0,
      colH,
      colI,
      colL,
      forceUnlock: isUnlockedByPin
    };

    try {
      const url = `${APPS_SCRIPT_URL}?action=UPDATE_ITEM&payload=${encodeURIComponent(JSON.stringify(payload))}`;
      await fetch(url, { method: 'GET', mode: 'no-cors' });

      setNotification({ type: 'success', text: `Ítem ${colB} guardado en la hoja correctamente.` });
      
      // Limpiar para el siguiente escaneo
      setTimeout(() => {
        setItem(null);
        setSearchTerm('');
        setIsUnlockedByPin(false);
        searchInputRef.current?.focus();
      }, 1200);

    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error al registrar conteo: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleValidatePin = () => {
    if (pinInput === MASTER_PIN) {
      setIsUnlockedByPin(true);
      setShowPinModal(false);
      setPinInput('');
      setNotification({ type: 'success', text: 'Candado desbloqueado para edición.' });
    } else {
      setNotification({ type: 'error', text: 'PIN incorrecto. Intenta de nuevo.' });
      setPinInput('');
    }
  };

  const handleRequestPinByEmail = async () => {
    setSendingPinEmail(true);
    try {
      await fetch(`${APPS_SCRIPT_URL}?action=RECOVER_PIN`, { method: 'GET', mode: 'no-cors' });
      setNotification({ type: 'success', text: 'La clave fue enviada a juan.mercado@dr.boombah.com' });
    } catch (e: any) {
      setNotification({ type: 'error', text: 'No se pudo enviar el correo: ' + e.message });
    } finally {
      setSendingPinEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#12161f] border border-[#00f2fe]/40 rounded-2xl w-full max-w-2xl max-h-[94vh] flex flex-col shadow-[0_0_40px_rgba(0,242,254,0.25)] text-gray-200">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00f2fe]/10 border border-[#00f2fe]/30 text-[#00f2fe]">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-white tracking-wide">
                Pase de Inventario Nave 6
              </h3>
              <span className="text-[11px] text-gray-400">Captura en Vivo & Validación Multiusuario</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificaciones */}
        {notification && (
          <div className={`mx-4 mt-3 p-3 rounded-xl text-xs flex items-center gap-2 shrink-0 ${
            notification.type === 'success' 
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300' 
              : 'bg-rose-500/15 border border-rose-500/40 text-rose-300'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{notification.text}</span>
          </div>
        )}

        {/* Barra de Filtros y Búsqueda */}
        <div className="p-4 border-b border-white/10 space-y-3 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Filtro Ubicación */}
            <div className="relative">
              <select
                value={selectedUbicacion}
                onChange={(e) => setSelectedUbicacion(e.target.value)}
                className="w-full bg-[#0d1017] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white font-bold outline-none focus:border-[#00f2fe]"
              >
                <option value="">Todas las Ubicaciones</option>
                {ubicacionesList.map((ubi, i) => (
                  <option key={i} value={ubi}>{ubi}</option>
                ))}
              </select>
            </div>

            {/* Input Escáner / Tipeo */}
            <div className="sm:col-span-2 flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Escanear o escribir Código / Ítem..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full bg-[#0d1017] border border-white/15 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#00f2fe]"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-4 py-2 bg-[#00f2fe] text-black font-black text-xs rounded-xl hover:bg-[#00f2fe]/80 transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${searching ? 'animate-spin' : ''}`} />
                <span>Buscar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Formulario de Conteo */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {item ? (
            <>
              {/* Barra de Estatus del Candado */}
              {isLocked ? (
                <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>Registro Bloqueado (Col A & I activas).</span>
                  </div>
                  <button
                    onClick={() => setShowPinModal(true)}
                    className="px-3 py-1 bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-rose-600 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Desbloquear con PIN</span>
                  </button>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-400 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <Unlock className="w-4 h-4" />
                    <span>{isUnlockedByPin ? 'Desbloqueado temporalmente con PIN' : 'Modo Edición Abierto'}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-normal">Fila #{item.rowNumber}</span>
                </div>
              )}

              {/* Casillas de Candado: Col A y Col I */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#0d1017] rounded-xl border border-white/10">
                <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isLocked}
                    checked={colA}
                    onChange={(e) => setColA(e.target.checked)}
                    className="w-4 h-4 accent-[#00f2fe] rounded cursor-pointer"
                  />
                  <span>Col A: Validado</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isLocked}
                    checked={colI}
                    onChange={(e) => setColI(e.target.checked)}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                  <span>Col I: Candado Bloqueo</span>
                </label>
              </div>

              {/* Códigos (Col B y C) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Col B: Código Componente</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={colB}
                    onChange={(e) => setColB(e.target.value)}
                    className="w-full bg-[#0d1017] border border-white/10 rounded-xl p-2 text-xs text-white font-mono disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Col C: Ítems NT/NS</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={colC}
                    onChange={(e) => setColC(e.target.value)}
                    className="w-full bg-[#0d1017] border border-white/10 rounded-xl p-2 text-xs text-white disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Métricas y Diferencia en Vivo */}
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase">NetSuite (D)</label>
                  <input
                    type="number"
                    disabled={isLocked}
                    value={colD}
                    onChange={(e) => setColD(e.target.value)}
                    className="w-full bg-[#0d1017] border border-indigo-500/40 rounded-xl p-2 text-xs text-center font-bold text-white outline-none focus:border-indigo-400 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-amber-400 uppercase">Almacén (E)</label>
                  <input
                    type="number"
                    disabled={isLocked}
                    value={colE}
                    onChange={(e) => setColE(e.target.value)}
                    className="w-full bg-[#0d1017] border border-amber-500/40 rounded-xl p-2 text-xs text-center font-bold text-white outline-none focus:border-amber-400 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-rose-400 uppercase">Salida (G)</label>
                  <input
                    type="number"
                    disabled={isLocked}
                    value={colG}
                    onChange={(e) => setColG(e.target.value)}
                    className="w-full bg-[#0d1017] border border-rose-500/40 rounded-xl p-2 text-xs text-center font-bold text-white outline-none focus:border-rose-400 disabled:opacity-50"
                  />
                </div>

                {/* Diferencia Calculada al Vuelo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00f2fe] uppercase flex items-center gap-1">
                    <Calculator className="w-3 h-3" /> Dif (F)
                  </label>
                  <div className={`w-full rounded-xl p-2 text-xs text-center font-black border ${
                    diferenciaCalculada === 0 
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' 
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                  }`}>
                    {diferenciaCalculada}
                  </div>
                </div>
              </div>

              {/* Ubicación (Col H) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#00f2fe]" /> Col H: Ubicación
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={colH}
                  onChange={(e) => setColH(e.target.value)}
                  className="w-full bg-[#0d1017] border border-white/10 rounded-xl p-2 text-xs text-white font-mono uppercase disabled:opacity-50"
                />
              </div>

              {/* Comentarios (Col L) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Col L: Comentarios</label>
                <textarea
                  rows={2}
                  disabled={isLocked}
                  value={colL}
                  onChange={(e) => setColL(e.target.value)}
                  placeholder="Detalles sobre faltantes, empaques dañados..."
                  className="w-full bg-[#0d1017] border border-white/10 rounded-xl p-2 text-xs text-white disabled:opacity-50"
                />
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500 space-y-2">
              <Search className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs">Escanea un código de barras o escribe el número de parte para iniciar el conteo.</p>
            </div>
          )}
        </div>

        {/* Botón de Confirmación y Guardado */}
        {item && (
          <div className="p-4 border-t border-white/10 flex justify-end gap-2 shrink-0">
            <button
              onClick={handleSave}
              disabled={saving || isLocked}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando en Sheets...' : 'Confirmar & Guardar Conteo'}</span>
            </button>
          </div>
        )}

      </div>

      {/* Modal Emergente de Solicitud de PIN */}
      {showPinModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90">
          <div className="bg-[#12161f] border border-rose-500/50 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <KeyRound className="w-4 h-4" />
                <span>Desbloquear Candado</span>
              </div>
              <button onClick={() => setShowPinModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Introduce el PIN maestro para editar este registro bloqueado:
            </p>

            <input
              type="password"
              maxLength={6}
              autoFocus
              placeholder="••••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleValidatePin()}
              className="w-full bg-[#0d1017] border border-rose-500/40 rounded-xl p-2.5 text-center text-lg tracking-[8px] text-white outline-none font-mono"
            />

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleValidatePin}
                className="w-full py-2 bg-rose-500 text-white font-bold rounded-xl text-xs hover:bg-rose-600 cursor-pointer"
              >
                Confirmar PIN
              </button>
              
              <button
                onClick={handleRequestPinByEmail}
                disabled={sendingPinEmail}
                className="text-[11px] text-gray-400 hover:text-[#00f2fe] flex items-center justify-center gap-1 py-1 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>{sendingPinEmail ? 'Enviando...' : '¿Olvidaste la clave? Enviar a mi correo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
