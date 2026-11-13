import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Lock, 
  Unlock, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  MapPin, 
  KeyRound, 
  Send, 
  Calculator as CalcIcon, 
  RefreshCw, 
  X, 
  Layers, 
  ShieldAlert,
  Check
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

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwEDMJffjkXLYTPnYpQA3jC51KmyDb8TtNG3haEGv5lYvbzZAMjaAI3Xmy3BF5SQCkL/exec';
const MASTER_PIN = '030621';

// Cliente de conexión híbrido y resistente (Fetch con fallback a JSONP)
async function queryGAS(params: Record<string, string>): Promise<any> {
  const query = new URLSearchParams(params).toString();
  const url = `${APPS_SCRIPT_URL}?${query}`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Fallback a JSONP si fetch es bloqueado por política de redirección
  }

  return new Promise((resolve, reject) => {
    const cb = 'gas_cb_' + Math.round(100000 * Math.random());
    (window as any)[cb] = (data: any) => {
      delete (window as any)[cb];
      if (document.body.contains(script)) document.body.removeChild(script);
      resolve(data);
    };

    const script = document.createElement('script');
    script.src = `${url}&callback=${cb}`;
    script.onerror = () => {
      delete (window as any)[cb];
      if (document.body.contains(script)) document.body.removeChild(script);
      reject(new Error('No se pudo conectar con el servidor.'));
    };
    document.body.appendChild(script);
  });
}

export const PaseInventarioView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Ubicaciones con autocompletado y búsqueda escrita
  const [selectedUbicacion, setSelectedUbicacion] = useState('');
  const [ubicacionInput, setUbicacionInput] = useState('');
  const [ubicacionesList, setUbicacionesList] = useState<string[]>([]);
  const [showUbiDropdown, setShowUbiDropdown] = useState(false);

  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemsList, setItemsList] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados de edición del ítem seleccionado
  const [colA, setColA] = useState(false);
  const [colB, setColB] = useState('');
  const [colC, setColC] = useState('');
  const [colD, setColD] = useState<number | string>(0);
  const [colE, setColE] = useState<number | string>(0);
  const [colG, setColG] = useState<number | string>(0);
  const [colH, setColH] = useState('');
  const [colI, setColI] = useState(false);
  const [colL, setColL] = useState('');

  // Candado y PIN
  const [isUnlockedByPin, setIsUnlockedByPin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [sendingPinEmail, setSendingPinEmail] = useState(false);

  // Mini Calculadora Independiente
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const ubiContainerRef = useRef<HTMLDivElement>(null);

  // 1. Cargar lista única de ubicaciones al montar el componente
  const cargarUbicaciones = async () => {
    try {
      const data = await queryGAS({ action: 'GET_UBICACIONES' });
      if (data && data.success && Array.isArray(data.ubicaciones)) {
        setUbicacionesList(data.ubicaciones);
      }
    } catch (e) {
      console.warn('Error cargando ubicaciones:', e);
    }
  };

  useEffect(() => {
    cargarUbicaciones();
  }, []);

  // Cerrar dropdown de ubicaciones al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ubiContainerRef.current && !ubiContainerRef.current.contains(e.target as Node)) {
        setShowUbiDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const seleccionarItemParaEditar = (it: InventoryItem) => {
    setSelectedItem(it);
    setColA(it.colA_Validado);
    setColB(it.colB_Codigo);
    setColC(it.colC_Item);
    setColD(it.colD_NetSuite);
    setColE(it.colE_Newsoft);
    setColG(it.colG_Salida);
    setColH(it.colH_Ubicacion);
    setColI(it.colI_Candado);
    setColL(it.colL_Comentario || '');
    setIsUnlockedByPin(false);
  };

  // 2. Consulta con COMPORTAMIENTO A (Búsqueda global inteligente)
  const ejecutarBusqueda = async (queryTerm = searchTerm, ubiTerm = selectedUbicacion) => {
    setSearching(true);
    setNotification(null);
    setIsUnlockedByPin(false);

    try {
      const tieneTerminoArticulo = queryTerm.trim() !== '';

      // Si escribe/escanea un código, busca en TODA la nave sin restringir por ubicación previa
      const data = await queryGAS({
        action: 'SEARCH_ITEM',
        query: queryTerm.trim(),
        ubicacion: tieneTerminoArticulo ? '' : ubiTerm.trim()
      });

      if (data && data.success) {
        const items: InventoryItem[] = Array.isArray(data.items) ? data.items : (data.item ? [data.item] : []);

        if (tieneTerminoArticulo && items.length > 0) {
          const primerItem = items[0];
          const ubicacionDetectada = primerItem.colH_Ubicacion;

          // Si el ítem tiene ubicación, sincronizamos el rack y cargamos todos sus artículos
          if (ubicacionDetectada) {
            setSelectedUbicacion(ubicacionDetectada);
            setUbicacionInput(ubicacionDetectada);

            const dataRack = await queryGAS({
              action: 'SEARCH_ITEM',
              query: '',
              ubicacion: ubicacionDetectada
            });

            if (dataRack && dataRack.success && Array.isArray(dataRack.items)) {
              setItemsList(dataRack.items);
            } else {
              setItemsList(items);
            }
          } else {
            setItemsList(items);
          }

          // Abrir el ítem escaneado directamente en el formulario
          seleccionarItemParaEditar(primerItem);
        } else {
          setItemsList(items);
          if (items.length === 1) {
            seleccionarItemParaEditar(items[0]);
          }
        }
      } else {
        setItemsList([]);
        setNotification({ type: 'error', text: data?.error || 'No se encontraron artículos con ese criterio.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error al consultar datos: ' + err.message });
    } finally {
      setSearching(false);
    }
  };

  // Seleccionar ubicación desde el autocompletado
  const handleSelectUbicacion = (ubi: string) => {
    setSelectedUbicacion(ubi);
    setUbicacionInput(ubi);
    setShowUbiDropdown(false);
    setSelectedItem(null);
    ejecutarBusqueda('', ubi);
  };

  const handleCerrarFormulario = () => {
    setSelectedItem(null);
    setIsUnlockedByPin(false);
    setNotification(null);
    setShowCalculator(false);
  };

  // Cálculos dinámicos en tiempo real
  const numNetSuite = Number(colD) || 0;
  const numAlmacen = Number(colE) || 0;
  const numSalida = Number(colG) || 0;
  const totalBalanceNewsoft = numAlmacen - numSalida;
  const diferenciaCalculada = totalBalanceNewsoft - numNetSuite;
  const cuadranCantidades = totalBalanceNewsoft === numNetSuite;

  // Estado del candado: Bloquea inputs si ya estaba cerrado en Sheets y no se ha metido el PIN
  const isLocked = Boolean(selectedItem?.isLocked && !isUnlockedByPin);

  // Manejador de la calculadora auxiliar independiente
  const handleCalcBtn = (val: string) => {
    if (val === 'C') {
      setCalcDisplay('');
    } else if (val === '=') {
      try {
        const sanitized = calcDisplay.replace(/[^0-9+\-*/.]/g, '');
        const res = Function(`'use strict'; return (${sanitized})`)();
        setCalcDisplay(String(res));
      } catch {
        setCalcDisplay('Error');
      }
    } else {
      setCalcDisplay(prev => prev + val);
    }
  };

  // Guardar en Google Sheets (incluyendo Col D: NetSuite) y sincronizar estado reactivo local
  const handleSave = async () => {
    if (!selectedItem) return;

    if (isLocked) {
      setNotification({ type: 'error', text: 'El registro está bloqueado. Requiere PIN de desbloqueo.' });
      return;
    }

    if (colI && !cuadranCantidades) {
      setNotification({ type: 'error', text: 'No puedes cerrar el candado (Col I): El Balance Newsoft debe coincidir con NetSuite.' });
      return;
    }

    setSaving(true);
    setNotification(null);

    const willBeLocked = Boolean(colA && colI);

    const payload = {
      rowNumber: selectedItem.rowNumber,
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
      const data = await queryGAS({
        action: 'UPDATE_ITEM',
        payload: JSON.stringify(payload)
      });

      if (data && data.success) {
        setNotification({ type: 'success', text: `Ítem ${colB} guardado exitosamente en fila ${selectedItem.rowNumber}.` });

        // Sincronizar el ítem seleccionado para que permanezca visible con sus valores correctos
        const updatedItem: InventoryItem = {
          ...selectedItem,
          ...payload,
          colA_Validado: colA,
          colD_NetSuite: Number(colD) || 0,
          colE_Newsoft: Number(colE) || 0,
          colG_Salida: Number(colG) || 0,
          colF_Diferencia: diferenciaCalculada,
          colI_Candado: colI,
          isLocked: willBeLocked
        };
        setSelectedItem(updatedItem);

        // Sincronizar la tarjeta en la lista izquierda
        setItemsList(prev => prev.map(it => it.rowNumber === selectedItem.rowNumber ? updatedItem : it));
        setIsUnlockedByPin(false);
      } else {
        setNotification({ type: 'error', text: data?.error || 'No se pudo guardar el registro.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error al registrar: ' + err.message });
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
      setNotification({ type: 'error', text: 'PIN incorrecto.' });
      setPinInput('');
    }
  };

  const handleRequestPinByEmail = async () => {
    setSendingPinEmail(true);
    try {
      await queryGAS({ action: 'RECOVER_PIN' });
      setNotification({ type: 'success', text: 'Clave enviada a juan.mercado@dr.boombah.com' });
    } catch (e: any) {
      setNotification({ type: 'error', text: 'Error enviando correo: ' + e.message });
    } finally {
      setSendingPinEmail(false);
    }
  };

  // Filtro reactivo para el autocompletado de ubicaciones
  const ubicacionesFiltradas = ubicacionesList.filter(u => 
    u.toLowerCase().includes(ubicacionInput.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-5 space-y-4 text-gray-200 max-w-[1700px] mx-auto">
      
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black uppercase text-white tracking-wide">
              Toma y Pase de Inventario
            </h1>
            <p className="text-[11px] text-gray-400">Captura en Vivo, Ubicaciones & Control de Candado (Nave 6)</p>
          </div>
        </div>
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

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-[#12161f] border border-white/10 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Ubicación Escribible con Autocompletado */}
          <div className="relative" ref={ubiContainerRef}>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Buscar o Escribir Ubicación (Rack)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Escribe ubicación (ej. G-14-1, A-1)..."
                value={ubicacionInput}
                onChange={(e) => {
                  setUbicacionInput(e.target.value);
                  setShowUbiDropdown(true);
                }}
                onFocus={() => setShowUbiDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSelectUbicacion(ubicacionInput.trim());
                  }
                }}
                className="w-full bg-[#0d1017] border border-white/15 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400 uppercase font-mono"
              />
              <MapPin className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Dropdown Predictivo */}
            {showUbiDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#0d1017] border border-amber-500/30 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-40 custom-scrollbar">
                <div 
                  onClick={() => handleSelectUbicacion('')}
                  className="px-3 py-2 text-xs text-gray-400 hover:bg-white/5 cursor-pointer font-bold border-b border-white/5"
                >
                  Todas las Ubicaciones ({ubicacionesList.length})
                </div>
                {ubicacionesFiltradas.length > 0 ? (
                  ubicacionesFiltradas.slice(0, 40).map((ubi, i) => (
                    <div
                      key={i}
                      onClick={() => handleSelectUbicacion(ubi)}
                      className={`px-3 py-1.5 text-xs font-mono cursor-pointer transition-colors flex items-center justify-between ${
                        selectedUbicacion === ubi 
                          ? 'bg-amber-500/20 text-amber-300 font-bold' 
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <span>{ubi}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-500">Sin coincidencias</div>
                )}
              </div>
            )}
          </div>

          {/* Buscador Global Inteligente de Código / Ítem */}
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Escanear Pistola o Escribir Código / Ítem (Búsqueda Global)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Escanea o escribe el código y presiona Enter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && ejecutarBusqueda()}
                  className="w-full bg-[#0d1017] border border-white/15 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-400 font-mono"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>
              <button
                onClick={() => ejecutarBusqueda()}
                disabled={searching}
                className="px-5 py-2 bg-amber-500 text-black font-black text-xs rounded-xl hover:bg-amber-400 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${searching ? 'animate-spin' : ''}`} />
                <span>{searching ? 'Cargando...' : 'Buscar'}</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Grid: Lista Izquierda | Formulario Derecho */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LADO IZQUIERDO: Artículos de la Ubicación */}
        <div className="lg:col-span-5 bg-[#12161f] border border-white/10 rounded-2xl p-4 flex flex-col max-h-[750px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-2">
            <span className="text-xs font-black uppercase text-white tracking-wider">
              Artículos en Ubicación ({itemsList.length})
            </span>
            {selectedUbicacion && (
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-mono border border-amber-500/30">
                {selectedUbicacion}
              </span>
            )}
          </div>

          <div className="overflow-y-auto space-y-2 flex-1 custom-scrollbar pr-1">
            {itemsList.length > 0 ? (
              itemsList.map((it) => {
                const bal = (Number(it.colE_Newsoft) || 0) - (Number(it.colG_Salida) || 0);
                const dif = bal - (Number(it.colD_NetSuite) || 0);

                return (
                  <div
                    key={it.rowNumber}
                    onClick={() => seleccionarItemParaEditar(it)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedItem?.rowNumber === it.rowNumber
                        ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                        : 'bg-[#0d1017] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-1 truncate pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">{it.colB_Codigo}</span>
                        <span className="text-[11px] text-gray-300 font-medium truncate">{it.colC_Item}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        <span>NS: <strong className="text-white">{it.colD_NetSuite}</strong></span>
                        <span>Bal. Newsoft: <strong className="text-cyan-300">{bal}</strong></span>
                        <span>DIF: <strong className={dif === 0 ? 'text-emerald-400' : 'text-rose-400'}>{dif}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {it.colA_Validado && (
                        <span className="p-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400" title="Validado (Col A)">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {it.colI_Candado && (
                        <span className="p-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-400" title="Candado Bloqueado (Col I)">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 text-gray-500 text-xs">
                Selecciona una ubicación arriba o usa el escáner global para cargar los artículos.
              </div>
            )}
          </div>
        </div>

        {/* LADO DERECHO: Formulario de Conteo con Botón X de Cierre y Calculadora */}
        <div className="lg:col-span-7 relative">
          {selectedItem ? (
            <div className="bg-[#12161f] border border-amber-500/30 rounded-2xl p-4 shadow-xl space-y-4">
              
              {/* Barra Superior con Estatus y Botón X de Cierre */}
              <div className="flex items-center justify-between gap-2">
                {isLocked ? (
                  <div className="flex-1 p-2.5 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>Registro Bloqueado (Col A & I activas). Campos protegidos.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPinModal(true)}
                      className="px-3 py-1 bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-rose-600 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Desbloquear con PIN</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-400 text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <Unlock className="w-4 h-4" />
                      <span>{isUnlockedByPin ? 'Desbloqueado temporalmente con PIN' : 'Modo Edición Abierto'}</span>
                    </div>
                    
                    {/* Botón para Abrir Mini Calculadora */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCalculator(!showCalculator)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          showCalculator 
                            ? 'bg-[#00f2fe] text-black border-[#00f2fe]' 
                            : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <CalcIcon className="w-3.5 h-3.5" />
                        <span>Calculadora</span>
                      </button>
                      <span className="text-[10px] text-gray-400 font-normal">Fila #{selectedItem.rowNumber}</span>
                    </div>
                  </div>
                )}

                {/* BOTÓN X EN LA PARTE SUPERIOR DERECHA */}
                <button
                  type="button"
                  onClick={handleCerrarFormulario}
                  title="Cerrar Formulario"
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Popup Mini Calculadora (Completamente Independiente) */}
              {showCalculator && (
                <div className="bg-[#0b0e14] border border-[#00f2fe]/40 rounded-xl p-3 shadow-2xl max-w-xs ml-auto space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold border-b border-white/10 pb-1">
                    <span>Calculadora Auxiliar</span>
                    <button type="button" onClick={() => setShowCalculator(false)} className="hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="bg-[#12161f] border border-white/10 rounded-lg p-2 text-right font-mono text-base font-bold text-[#00f2fe] overflow-x-auto min-h-[36px]">
                    {calcDisplay || '0'}
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                    {['7','8','9','/','4','5','6','*','1','2','3','-','C','0','=','+'].map((btn) => (
                      <button
                        key={btn}
                        type="button"
                        onClick={() => handleCalcBtn(btn)}
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${
                          btn === '=' 
                            ? 'bg-emerald-500 text-black font-black col-span-1' 
                            : btn === 'C' 
                            ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30' 
                            : ['+','-','*','/'].includes(btn)
                            ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                            : 'bg-white/5 text-white hover:bg-white/10'
                        }`}
                      >
                        {btn}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Casillas Col A y Col I (Candado) */}
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

                <div>
                  <label className={`flex items-center gap-2 text-xs font-bold ${
                    cuadranCantidades ? 'text-white cursor-pointer' : 'text-gray-500 cursor-not-allowed opacity-50'
                  }`}>
                    <input
                      type="checkbox"
                      disabled={isLocked || !cuadranCantidades}
                      checked={colI}
                      onChange={(e) => {
                        if (!cuadranCantidades && e.target.checked) return;
                        setColI(e.target.checked);
                      }}
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                    <span>Col I: Candado Bloqueo</span>
                  </label>
                  {!cuadranCantidades && (
                    <span className="text-[10px] text-rose-400 flex items-center gap-1 mt-1 font-semibold">
                      <ShieldAlert className="w-3 h-3 shrink-0" />
                      Requiere que Total Balance Newsoft cuadre con NetSuite para cerrar candado.
                    </span>
                  )}
                </div>
              </div>

              {/* Códigos */}
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

              {/* Métricas: NetSuite (EDITABLE), Almacén, Salida, Total Balance Newsoft y DIF */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase">NetSuite (D)</label>
                  <input
                    type="number"
                    disabled={isLocked}
                    value={colD}
                    onChange={(e) => setColD(e.target.value)}
                    className="w-full bg-[#0d1017] border border-indigo-500/40 rounded-xl p-2.5 text-xs text-center font-bold text-white outline-none focus:border-indigo-400 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-amber-400 uppercase">Almacén (E)</label>
                  <input
                    type="number"
                    disabled={isLocked}
                    value={colE}
                    onChange={(e) => setColE(e.target.value)}
                    className="w-full bg-[#0d1017] border border-amber-500/40 rounded-xl p-2.5 text-xs text-center font-bold text-white outline-none focus:border-amber-400 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-rose-400 uppercase">Salida (G)</label>
                  <input
                    type="number"
                    disabled={isLocked}
                    value={colG}
                    onChange={(e) => setColG(e.target.value)}
                    className="w-full bg-[#0d1017] border border-rose-500/40 rounded-xl p-2.5 text-xs text-center font-bold text-white outline-none focus:border-rose-400 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-cyan-400 uppercase truncate block text-center" title="Total Balance Disponible Newsoft (E - G)">
                    Tot. Bal. Newsoft
                  </label>
                  <div className="w-full bg-[#0d1017] border border-cyan-500/40 rounded-xl p-2.5 text-xs text-center font-black text-cyan-300">
                    {totalBalanceNewsoft}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00f2fe] uppercase flex items-center justify-center gap-1">
                    <CalcIcon className="w-3 h-3" /> DIF (F)
                  </label>
                  <div className={`w-full rounded-xl p-2.5 text-xs text-center font-black border ${
                    cuadranCantidades 
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
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> Col H: Ubicación
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={colH}
                  onChange={(e) => setColH(e.target.value)}
                  className="w-full bg-[#0d1017] border border-white/10 rounded-xl p-2 text-xs text-white font-mono uppercase disabled:opacity-50"
                />
              </div>

              {/* Col L: Comentarios */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Col L: Comentarios</label>
                <textarea
                  rows={2}
                  disabled={isLocked}
                  value={colL}
                  onChange={(e) => setColL(e.target.value)}
                  placeholder="Observaciones de conteo o discrepancias..."
                  className="w-full bg-[#0d1017] border border-white/10 rounded-xl p-2 text-xs text-white disabled:opacity-50 custom-scrollbar"
                />
              </div>

              {/* Botonera: Cancelar & Confirmar */}
              <div className="pt-3 flex justify-between items-center border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCerrarFormulario}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || isLocked}
                  className="px-7 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Guardando en Sheets...' : 'Confirmar & Guardar Conteo'}</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-[#12161f] border border-white/10 rounded-2xl p-16 text-center text-gray-500 space-y-2">
              <Layers className="w-12 h-12 mx-auto opacity-20" />
              <p className="text-sm font-bold text-gray-400">Ningún artículo en edición</p>
              <p className="text-xs text-gray-500">
                Selecciona cualquier artículo del listado izquierdo para abrir el formulario de conteo.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Modal Emergente de Solicitud de PIN */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
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
              Introduce el PIN de 6 dígitos para desbloquear este registro:
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
                type="button"
                onClick={handleValidatePin}
                className="w-full py-2 bg-rose-500 text-white font-bold rounded-xl text-xs hover:bg-rose-600 cursor-pointer"
              >
                Confirmar PIN
              </button>
              
              <button
                type="button"
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
