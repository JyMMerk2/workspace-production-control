import React, { useState } from 'react';
import { 
  Boxes, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Lock, 
  Search, 
  X
} from 'lucide-react';

export const InventoryDashboard: React.FC = () => {
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const GOOGLE_SHEETS_URL =
    'https://docs.google.com/spreadsheets/d/1g5SoP8q1u7n05v0tABvwf2e6UPClSMM8b2ah_1-9A3M/edit?gid=1178501683#gid=1178501683';

  // Métricas extraídas de la hoja Dashboard
  const kpis = {
    totalItems: 20544,
    validados: 20452,
    restantes: 92,
    totalUnidades: 155646,
    pctAvance: 99.55,
    pctFalta: 0.45,
  };

  // Cálculo SVG Donut
  const radius = 70;
  const circumference = 2 * Math.PI * radius; // ~439.82
  const strokeDashoffset = circumference - (kpis.pctAvance / 100) * circumference;

  const sampleItems = [
    { validado: true, codigo: '6308', item: 'Belt B', ns: 3398, newsoft: 3479, dif: 81, ubicacion: 'G-14-1' },
    { validado: true, codigo: '6320', item: 'Belt CB', ns: 271, newsoft: 310, dif: 39, ubicacion: 'G-15-1' },
    { validado: false, codigo: '6310', item: 'Belt CRD', ns: 143, newsoft: 143, dif: 0, ubicacion: 'G-16-1' },
    { validado: false, codigo: '6314', item: 'Belt DG', ns: 91, newsoft: 119, dif: 28, ubicacion: 'G-16-1' },
    { validado: false, codigo: '6321', item: 'Belt GD', ns: 235, newsoft: 249, dif: 14, ubicacion: 'G-14-1' },
    { validado: false, codigo: '6322', item: 'Belt GY', ns: 636, newsoft: 636, dif: 0, ubicacion: 'G-14-1' },
    { validado: false, codigo: '150246', item: 'Belt LG', ns: 448, newsoft: 448, dif: 0, ubicacion: 'G-16-1' },
    { validado: false, codigo: '6307', item: 'Belt M', ns: 249, newsoft: 250, dif: 1, ubicacion: 'G-15-1' },
    { validado: false, codigo: '6312', item: 'Belt N', ns: 1723, newsoft: 1748, dif: 25, ubicacion: 'G-14-1' },
    { validado: false, codigo: '6309', item: 'Belt W', ns: 11, newsoft: 0, dif: 'Agregar a NS: 11', ubicacion: 'No encontrado' },
    { validado: false, codigo: '341647', item: 'BM-1000 B-30', ns: 13, newsoft: 15, dif: 2, ubicacion: 'E-7-1' }
  ];

  const filteredItems = sampleItems.filter(
    (it) =>
      it.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.ubicacion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleVerifyPin = () => {
    if (pinInput.trim() === '1501') {
      setIsPinModalOpen(false);
      setPinInput('');
      setPinError(false);
      window.open(GOOGLE_SHEETS_URL, '_blank', 'noopener,noreferrer');
    } else {
      setPinError(true);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Barra de Acciones Superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#12161f] p-4 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase text-white tracking-wide">
              CONTROL DE PRODUCCIÓN & INVENTARIO NAVE 6
            </h2>
            <span className="text-xs text-gray-400">
              Sincronizado con Almacén de Productos Terminados
            </span>
          </div>
        </div>

        {/* Botón con clave 1501 para abrir el Sheet */}
        <button
          onClick={() => setIsPinModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-black font-black text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)]"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Abrir en Google Sheets</span>
          <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
        </button>
      </div>

      {/* 4 TARJETAS KPIS IDÉNTICAS AL DASHBOARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Items */}
        <div className="bg-[#12161f] border border-[#00f2fe]/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <span className="text-[10px] font-black tracking-widest text-[#00f2fe] uppercase block mb-1">
            TOTAL ITEMS
          </span>
          <div className="text-3xl font-black text-white">
            {kpis.totalItems.toLocaleString()}
          </div>
          <span className="text-[11px] font-bold text-gray-400 mt-2 block">
            100% Meta
          </span>
        </div>

        {/* Items Validados */}
        <div className="bg-[#12161f] border border-emerald-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase block mb-1">
            ITEMS VALIDADOS
          </span>
          <div className="text-3xl font-black text-emerald-400">
            {kpis.validados.toLocaleString()}
          </div>
          <span className="text-[11px] font-bold text-emerald-300/80 mt-2 block">
            Avance: {kpis.pctAvance}%
          </span>
        </div>

        {/* Items Restantes */}
        <div className="bg-[#12161f] border border-rose-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <span className="text-[10px] font-black tracking-widest text-rose-400 uppercase block mb-1">
            ITEMS RESTANTES
          </span>
          <div className="text-3xl font-black text-rose-400">
            {kpis.restantes.toLocaleString()}
          </div>
          <span className="text-[11px] font-bold text-rose-300/80 mt-2 block">
            Falta: {kpis.pctFalta}%
          </span>
        </div>

        {/* Unidades Inventariadas */}
        <div className="bg-[#12161f] border border-amber-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase block mb-1">
            UNIDADES INVENTARIADAS
          </span>
          <div className="text-3xl font-black text-amber-400">
            {kpis.totalUnidades.toLocaleString()}
          </div>
          <span className="text-[11px] font-bold text-gray-400 mt-2 block">
            Total Piezas
          </span>
        </div>
      </div>

      {/* SECCIÓN GRÁFICA DE DONA Y DESGLOSE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dona Nativa en SVG */}
        <div className="bg-[#12161f] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col items-center justify-center">
          <h3 className="text-xs font-black uppercase text-gray-300 mb-2 w-full text-left tracking-wider">
            Balance de Validación
          </h3>
          <div className="w-full h-64 relative flex items-center justify-center">
            <svg className="w-52 h-52 -rotate-90" viewBox="0 0 180 180">
              {/* Fondo Restante (Rosa/Rojo) */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                className="text-rose-500 stroke-current"
                strokeWidth="18"
                fill="transparent"
              />
              {/* Progreso Validado (Verde Esmeralda) */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                className="text-emerald-500 stroke-current transition-all duration-1000 ease-out"
                strokeWidth="18"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-emerald-400">
                {kpis.pctAvance}%
              </span>
              <span className="text-[10px] font-bold uppercase text-gray-400">
                Completado
              </span>
            </div>
          </div>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-300">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Validados ({kpis.validados.toLocaleString()})</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-300">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span>Restantes ({kpis.restantes.toLocaleString()})</span>
            </div>
          </div>
        </div>

        {/* TABLA DE DESGLOSE OPERATIVO */}
        <div className="bg-[#12161f] border border-white/10 rounded-2xl p-5 shadow-lg lg:col-span-2 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-xs font-black uppercase text-gray-300 tracking-wider">
              Desglose Operativo de Artículos (Hoja Progreso)
            </h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar SKU, código, ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-[#0d1017] border border-white/10 text-xs text-white placeholder-gray-500 focus:border-[#00f2fe] outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1 max-h-72 custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-bold uppercase text-[10px]">
                  <th className="py-2 px-3">Estado</th>
                  <th className="py-2 px-3">Código</th>
                  <th className="py-2 px-3">Item / Descripción</th>
                  <th className="py-2 px-3 text-right">Cant. NetSuite</th>
                  <th className="py-2 px-3 text-right">Almacén Newsoft</th>
                  <th className="py-2 px-3 text-right">Diferencia</th>
                  <th className="py-2 px-3">Ubicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {filteredItems.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-2 px-3">
                      {row.validado ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          <Clock className="w-3 h-3" /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-gray-300">
                      {row.codigo}
                    </td>
                    <td className="py-2 px-3 text-white font-bold">
                      {row.item}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-300">
                      {row.ns.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-300">
                      {row.newsoft.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {typeof row.dif === 'number' && row.dif > 0 ? (
                        <span className="text-amber-400 font-bold">+{row.dif}</span>
                      ) : typeof row.dif === 'string' ? (
                        <span className="text-rose-400 font-bold text-[10px] bg-rose-500/10 px-1 rounded border border-rose-500/20">
                          {row.dif}
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold">0</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-gray-400 font-mono">
                      {row.ubicacion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL CON PIN 1501 */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#12161f] border border-[#00f2fe]/40 rounded-2xl w-full max-w-sm p-6 shadow-[0_0_35px_rgba(0,242,254,0.3)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-black uppercase text-[#00f2fe] flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" /> Acceso Protegido a Hoja
              </span>
              <button
                onClick={() => {
                  setIsPinModalOpen(false);
                  setPinInput('');
                  setPinError(false);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300 text-center">
              Ingresa la contraseña de seguridad para abrir el documento de Google Sheets:
            </p>

            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              placeholder="••••"
              className="w-full text-center text-2xl tracking-[0.4em] py-2.5 rounded-xl bg-[#0d1017] border border-white/20 text-white focus:border-[#00f2fe] outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
              autoFocus
            />

            {pinError && (
              <p className="text-xs text-rose-400 font-bold text-center">
                Contraseña incorrecta. Inténtalo de nuevo.
              </p>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  setIsPinModalOpen(false);
                  setPinInput('');
                  setPinError(false);
                }}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleVerifyPin}
                className="px-5 py-2 bg-[#00f2fe] text-[#0b0e14] font-black rounded-xl text-xs hover:bg-[#00f2fe]/80 shadow-[0_0_12px_rgba(0,242,254,0.4)]"
              >
                Abrir Documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
