import React, { useState, useEffect, useMemo } from 'react';
import { 
  Boxes, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Lock, 
  Search, 
  X,
  ArrowRight,
  History,
  Trash2,
  Loader2
} from 'lucide-react';

interface SheetRowItem {
  validado: boolean;
  codigo: string;
  item: string;
  ns: number;
  newsoft: number;
  dif: string | number;
  ubicacion: string;
}

interface InventoryDashboardProps {
  onNavigateDesglose?: () => void;
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({ onNavigateDesglose }) => {
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  
  // Búsqueda y Datos reales
  const [quickSearch, setQuickSearch] = useState('');
  const [allItems, setAllItems] = useState<SheetRowItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  
  // Historial de artículos consultados (persistente)
  const [recentSearches, setRecentSearches] = useState<SheetRowItem[]>(() => {
    try {
      const saved = localStorage.getItem('boombah_inventory_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const GOOGLE_SHEETS_URL =
    'https://docs.google.com/spreadsheets/d/1g5SoP8q1u7n05v0tABvwf2e6UPClSMM8b2ah_1-9A3M/edit?gid=1178501683#gid=1178501683';
  const CSV_URL =
    'https://docs.google.com/spreadsheets/d/1g5SoP8q1u7n05v0tABvwf2e6UPClSMM8b2ah_1-9A3M/export?format=csv&gid=1178501683';

  // Cargar toda la base de datos de la hoja PROGRESO
  useEffect(() => {
    let isMounted = true;
    const loadFullInventory = async () => {
      setLoadingData(true);
      try {
        const res = await fetch(CSV_URL);
        const csvText = await res.text();
        const lines = csvText.split('\n');
        const parsed: SheetRowItem[] = [];

        for (let i = 3; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
          
          const rawValidado = (cols[0] || '').toUpperCase();
          const isValid = rawValidado === 'TRUE' || rawValidado === 'VERDADERO' || rawValidado === 'OK' || rawValidado === '1';
          const codigo = cols[1] || '';
          const itemName = cols[2] || '';
          if (!itemName && !codigo) continue;

          const nsVal = parseFloat(cols[3]?.replace(/[^0-9.-]+/g, '')) || 0;
          const newsoftVal = parseFloat(cols[4]?.replace(/[^0-9.-]+/g, '')) || 0;
          const difVal = cols[5] || (newsoftVal - nsVal);
          const ubicacion = cols[7] || cols[6] || '-';

          parsed.push({
            validado: isValid,
            codigo,
            item: itemName,
            ns: nsVal,
            newsoft: newsoftVal,
            dif: difVal,
            ubicacion
          });
        }

        if (isMounted && parsed.length > 0) {
          setAllItems(parsed);
        }
      } catch (err) {
        console.warn('Error al precargar inventario para búsqueda:', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };

    loadFullInventory();
    return () => { isMounted = false; };
  }, []);

  // KPIs
  const kpis = {
    totalItems: 20544,
    validados: 20452,
    restantes: 92,
    totalUnidades: 155646,
    pctAvance: 99.55,
    pctFalta: 0.45,
  };

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (kpis.pctAvance / 100) * circumference;

  // Filtrado en vivo sobre toda la base de datos
  const searchResults = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    if (!q) return [];
    return allItems
      .filter(it => 
        it.codigo.toLowerCase().includes(q) ||
        it.item.toLowerCase().includes(q) ||
        it.ubicacion.toLowerCase().includes(q)
      )
      .slice(0, 20); // Muestra los mejores 20 resultados
  }, [quickSearch, allItems]);

  // Guardar en el historial al hacer clic en un registro
  const handleSelectItem = (item: SheetRowItem) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(p => p.codigo !== item.codigo || p.item !== item.item);
      const updated = [item, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('boombah_inventory_search_history', JSON.stringify(updated));
      } catch {
        // Ignorar excepciones de almacenamiento
      }
      return updated;
    });
  };

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('boombah_inventory_search_history');
  };

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

        <button
          onClick={() => setIsPinModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-black font-black text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)]"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Abrir en Google Sheets</span>
          <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
        </button>
      </div>

      {/* 4 TARJETAS KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#12161f] border border-[#00f2fe]/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <span className="text-[10px] font-black tracking-widest text-[#00f2fe] uppercase block mb-1">
            TOTAL ITEMS
          </span>
          <div className="text-3xl font-black text-white">{kpis.totalItems.toLocaleString()}</div>
          <span className="text-[11px] font-bold text-gray-400 mt-2 block">100% Meta</span>
        </div>

        <div className="bg-[#12161f] border border-emerald-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase block mb-1">
            ITEMS VALIDADOS
          </span>
          <div className="text-3xl font-black text-emerald-400">{kpis.validados.toLocaleString()}</div>
          <span className="text-[11px] font-bold text-emerald-300/80 mt-2 block">Avance: {kpis.pctAvance}%</span>
        </div>

        <div className="bg-[#12161f] border border-rose-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <span className="text-[10px] font-black tracking-widest text-rose-400 uppercase block mb-1">
            ITEMS RESTANTES
          </span>
          <div className="text-3xl font-black text-rose-400">{kpis.restantes.toLocaleString()}</div>
          <span className="text-[11px] font-bold text-rose-300/80 mt-2 block">Falta: {kpis.pctFalta}%</span>
        </div>

        <div className="bg-[#12161f] border border-amber-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase block mb-1">
            UNIDADES INVENTARIADAS
          </span>
          <div className="text-3xl font-black text-amber-400">{kpis.totalUnidades.toLocaleString()}</div>
          <span className="text-[11px] font-bold text-gray-400 mt-2 block">Total Piezas</span>
        </div>
      </div>

      {/* SECCIÓN BALANCE + BUSCADOR RÁPIDO CON HISTORIAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dona Nativa en SVG */}
        <div className="bg-[#12161f] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col items-center justify-center lg:col-span-4">
          <h3 className="text-xs font-black uppercase text-gray-300 mb-2 w-full text-left tracking-wider">
            Balance de Validación
          </h3>
          <div className="w-full h-64 relative flex items-center justify-center">
            <svg className="w-52 h-52 -rotate-90" viewBox="0 0 180 180">
              <circle
                cx="90"
                cy="90"
                r={radius}
                className="text-rose-500 stroke-current opacity-80"
                strokeWidth="18"
                fill="transparent"
              />
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
              <span className="text-3xl font-black text-emerald-400">{kpis.pctAvance}%</span>
              <span className="text-[10px] font-bold uppercase text-gray-400">Completado</span>
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

        {/* PANEL: CONSULTA RÁPIDA DE ARTÍCULOS */}
        <div className="bg-[#12161f] border border-white/10 rounded-2xl p-5 shadow-lg lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Search className="w-4 h-4" /> CONSULTA RÁPIDA DE ARTÍCULOS
                </h3>
                <span className="text-[11px] text-gray-400">
                  {loadingData
                    ? 'Conectando con la base de datos de Nave 6...'
                    : `Buscador listo sobre ${allItems.length > 0 ? allItems.length.toLocaleString() : '20,000+'} artículos registrados`}
                </span>
              </div>

              {onNavigateDesglose && (
                <button
                  type="button"
                  onClick={onNavigateDesglose}
                  className="inline-flex items-center gap-1.5 text-xs text-[#00f2fe] hover:text-white bg-[#00f2fe]/10 hover:bg-[#00f2fe]/20 px-3 py-1.5 rounded-xl border border-[#00f2fe]/30 font-bold transition-all cursor-pointer"
                >
                  <span>Ver Desglose Completo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Input de Búsqueda */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Escribe código de componente, SKU o ubicación..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#0d1017] border border-white/15 text-xs text-white placeholder-gray-500 focus:border-amber-400 outline-none shadow-inner"
              />
              {quickSearch ? (
                <button
                  onClick={() => setQuickSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : loadingData ? (
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
              ) : null}
            </div>

            {/* VISTA 1: Resultados de Búsqueda en Vivo */}
            {quickSearch.trim() !== '' ? (
              <div className="overflow-x-auto max-h-64 custom-scrollbar border border-white/5 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[#0d1017] text-gray-400 font-bold uppercase text-[10px]">
                    <tr className="border-b border-white/10">
                      <th className="py-2 px-3">Estado</th>
                      <th className="py-2 px-3">Código</th>
                      <th className="py-2 px-3">Item / Descripción</th>
                      <th className="py-2 px-3 text-right">NetSuite</th>
                      <th className="py-2 px-3 text-right">Almacén</th>
                      <th className="py-2 px-3 text-right">Diferencia</th>
                      <th className="py-2 px-3">Ubicación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {searchResults.length > 0 ? (
                      searchResults.map((row, idx) => (
                        <tr
                          key={idx}
                          onClick={() => handleSelectItem(row)}
                          className="hover:bg-white/5 transition-colors cursor-pointer"
                          title="Clic para registrar en historial reciente"
                        >
                          <td className="py-2 px-3">
                            {row.validado ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" /> OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                                <Clock className="w-3 h-3" /> Pendiente
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-gray-300">{row.codigo}</td>
                          <td className="py-2 px-3 text-white font-bold">{row.item}</td>
                          <td className="py-2 px-3 text-right text-gray-300 font-mono">{row.ns.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-gray-300 font-mono">{row.newsoft.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono">
                            {typeof row.dif === 'number' && row.dif > 0 ? (
                              <span className="text-amber-400 font-bold">+{row.dif}</span>
                            ) : typeof row.dif === 'number' && row.dif < 0 ? (
                              <span className="text-rose-400 font-bold">{row.dif}</span>
                            ) : (
                              <span className="text-emerald-400 font-bold">{row.dif}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-gray-400 font-mono">{row.ubicacion}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          No se encontraron artículos con el término "{quickSearch}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* VISTA 2: Historial de Consultas Recientes */
              <div className="border border-white/5 rounded-xl p-3 bg-[#0d1017]/50 min-h-[180px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                    <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-amber-400" /> Historial de Consultas Recientes
                    </span>
                    {recentSearches.length > 0 && (
                      <button
                        onClick={clearHistory}
                        className="text-[10px] text-gray-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Limpiar
                      </button>
                    )}
                  </div>

                  {recentSearches.length > 0 ? (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar">
                      {recentSearches.map((rec, idx) => (
                        <div
                          key={idx}
                          onClick={() => setQuickSearch(rec.codigo || rec.item)}
                          className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono font-bold text-amber-400">{rec.codigo}</span>
                            <span className="text-white font-medium truncate">{rec.item}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-gray-400 font-mono text-[11px]">
                            <span>Stock: <strong className="text-gray-200">{rec.newsoft}</strong></span>
                            <span className="bg-white/5 px-1.5 py-0.5 rounded text-gray-300">{rec.ubicacion}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500 text-xs">
                      Escribe un código, SKU o ubicación en la barra superior para buscar en toda la base de datos de Nave 6.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 text-[11px] text-gray-500 flex justify-between items-center">
            <span>
              {quickSearch.trim() !== ''
                ? `${searchResults.length} resultados encontrados`
                : `${recentSearches.length} consultas en el historial`}
            </span>
            <span className="text-amber-400/80 font-bold">Nave 6 - Boombah</span>
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
