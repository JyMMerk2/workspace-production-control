import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  RefreshCw,
  Mail
} from 'lucide-react';
import { ScheduleReportModal } from './ScheduleReportModal';

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

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwEDMJffjkXLYTPnYpQA3jC51KmyDb8TtNG3haEGv5lYvbzZAMjaAI3Xmy3BF5SQCkL/exec';

// Cliente de conexión resiliente dual (Fetch con fallback a JSONP)
async function fetchGASMetrics(): Promise<any> {
  const url = `${APPS_SCRIPT_URL}?action=GET_METRICS`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Si fetch es bloqueado por políticas de cabecera, se resuelve con JSONP
  }

  return new Promise((resolve, reject) => {
    const cb = 'gas_dash_cb_' + Math.round(100000 * Math.random());
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
      reject(new Error('No se pudo conectar con Apps Script.'));
    };
    document.body.appendChild(script);
  });
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({ onNavigateDesglose }) => {
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Estados de datos
  const [allItems, setAllItems] = useState<SheetRowItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [quickSearch, setQuickSearch] = useState('');

  // Historial de búsquedas recientes persistente
  const [searchHistory, setSearchHistory] = useState<SheetRowItem[]>(() => {
    try {
      const stored = localStorage.getItem('nave6_search_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // KPIs reales dinámicos (Sin valores hardcodeados)
  const [kpis, setKpis] = useState({
    totalItems: 0,
    validados: 0,
    restantes: 0,
    totalUnidades: 0,
    pctAvance: 0,
    pctFalta: 0,
  });

  const GOOGLE_SHEETS_URL =
    'https://docs.google.com/spreadsheets/d/1g5SoP8q1u7n05v0tABvwf2e6UPClSMM8b2ah_1-9A3M/edit?gid=1446108023#gid=1446108023';

  // Endpoint CSV para artículos detallados (Hoja PROGRESO: gid=1178501683)
  const CSV_PROGRESO_URL =
    'https://docs.google.com/spreadsheets/d/1g5SoP8q1u7n05v0tABvwf2e6UPClSMM8b2ah_1-9A3M/export?format=csv&gid=1178501683';

  // Endpoint CSV para métricas resumidas (Hoja Dashboard: gid=1446108023)
  const CSV_DASHBOARD_URL =
    'https://docs.google.com/spreadsheets/d/1g5SoP8q1u7n05v0tABvwf2e6UPClSMM8b2ah_1-9A3M/export?format=csv&gid=1446108023';

  // Sincronización oficial con datos 100% reales
  const syncInventoryData = useCallback(async () => {
    setIsRefreshing(true);
    let metricsLoaded = false;

    try {
      // 1. Intentar obtener métricas oficiales directas vía Apps Script
      try {
        const gasData = await fetchGASMetrics();
        if (gasData && gasData.success && typeof gasData.totalItems === 'number') {
          const total = gasData.totalItems;
          const validados = gasData.validados;
          const restantes = gasData.restantes;
          const unidades = gasData.unidades;
          const pct = total > 0 ? Number(((validados / total) * 100).toFixed(2)) : 0;

          setKpis({
            totalItems: total,
            validados: validados,
            restantes: restantes,
            totalUnidades: unidades,
            pctAvance: pct,
            pctFalta: total > 0 ? Number(Math.max(0, 100 - pct).toFixed(2)) : 0,
          });
          metricsLoaded = true;
        }
      } catch (gasErr) {
        console.warn('Endpoint Apps Script no disponible, probando lectura directa de CSV Dashboard:', gasErr);
      }

      // 2. Si Apps Script no respondió, leer directamente la fila 5 de la hoja Dashboard CSV
      if (!metricsLoaded) {
        try {
          const dashRes = await fetch(CSV_DASHBOARD_URL);
          if (dashRes.ok) {
            const dashText = await dashRes.text();
            const dashLines = dashText.split('\n');

            // Fila 5 de Dashboard (índice 4): B5 (Total), E5 (Validados), H5 (Restantes), K5 (Unidades)
            for (let i = 0; i < Math.min(dashLines.length, 10); i++) {
              const rawRow = dashLines[i];
              const cols = rawRow.split(',').map(c => c.replace(/[^0-9.-]+/g, '').trim());
              
              // Buscamos la fila que contiene el número del inventario (alrededor de 20000)
              const foundTotalIdx = cols.findIndex(c => {
                const n = parseInt(c, 10);
                return !isNaN(n) && n >= 20000;
              });

              if (foundTotalIdx !== -1) {
                const total = parseInt(cols[foundTotalIdx], 10) || 0;
                // En celdas combinadas de 3 columnas: siguiente bloque está a 3 columnas de distancia
                const validados = parseInt(cols[foundTotalIdx + 3], 10) || total;
                const restantes = parseInt(cols[foundTotalIdx + 6], 10) || Math.max(0, total - validados);
                const unidades = parseInt(cols[foundTotalIdx + 9], 10) || 0;

                const pct = total > 0 ? Number(((validados / total) * 100).toFixed(2)) : 0;

                setKpis({
                  totalItems: total,
                  validados: validados,
                  restantes: restantes,
                  totalUnidades: unidades,
                  pctAvance: pct,
                  pctFalta: total > 0 ? Number(Math.max(0, 100 - pct).toFixed(2)) : 0,
                });
                metricsLoaded = true;
                break;
              }
            }
          }
        } catch (dashCsvErr) {
          console.warn('Lectura CSV Dashboard omitida:', dashCsvErr);
        }
      }

      // 3. Cargar la base de artículos de PROGRESO para el buscador y respaldo final de métricas
      const progRes = await fetch(CSV_PROGRESO_URL);
      if (progRes.ok) {
        const progText = await progRes.text();
        const lines = progText.split('\n');
        const parsed: SheetRowItem[] = [];

        let validCount = 0;
        let sumUnits = 0;

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

          if (isValid) validCount++;
          sumUnits += (newsoftVal > 0 ? newsoftVal : nsVal);

          parsed.push({
            validado: isValid,
            codigo,
            item: itemName,
            ns: nsVal,
            newsoft: newsoftVal,
            dif: difVal,
            ubicacion,
          });
        }

        if (parsed.length > 0) {
          setAllItems(parsed);

          // Si ni Apps Script ni Dashboard respondieron, usar el cálculo puro de PROGRESO sin alterar
          if (!metricsLoaded) {
            const total = parsed.length;
            const diff = Math.max(0, total - validCount);
            const pct = total > 0 ? Number(((validCount / total) * 100).toFixed(2)) : 0;

            setKpis({
              totalItems: total,
              validados: validCount,
              restantes: diff,
              totalUnidades: sumUnits,
              pctAvance: pct,
              pctFalta: total > 0 ? Number(Math.max(0, 100 - pct).toFixed(2)) : 0,
            });
          }
        }
      }

      setLastSync(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('Error en la sincronización de inventario:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [CSV_DASHBOARD_URL, CSV_PROGRESO_URL]);

  // Polling automático cada 5 segundos y al recuperar el foco de ventana
  useEffect(() => {
    syncInventoryData();
    const interval = setInterval(syncInventoryData, 5000);

    const onFocus = () => syncInventoryData();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [syncInventoryData]);

  // Cálculos SVG Donut
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (kpis.pctAvance / 100) * circumference;

  // Filtrado dinámico sobre los registros en tiempo real
  const searchResults = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    if (!q) return [];
    return allItems
      .filter(it => 
        it.codigo.toLowerCase().includes(q) ||
        it.item.toLowerCase().includes(q) ||
        it.ubicacion.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [quickSearch, allItems]);

  // Guardar en el historial de búsqueda
  const handleItemSelect = (item: SheetRowItem) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(p => !(p.codigo === item.codigo && p.item === item.item));
      const nextHistory = [item, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('nave6_search_history', JSON.stringify(nextHistory));
      } catch {}
      return nextHistory;
    });
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('nave6_search_history');
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
            <h2 className="text-base font-black uppercase text-white tracking-wide flex items-center gap-2">
              <span>CONTROL DE PRODUCCIÓN & INVENTARIO NAVE 6</span>
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                En Vivo (5s)
              </span>
            </h2>
            <span className="text-xs text-gray-400">
              {lastSync ? `Última sincronización: ${lastSync}` : 'Sincronizando con Almacén de Productos Terminados...'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Refrescar Manual */}
          <button
            onClick={() => syncInventoryData()}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs border border-white/10 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00f2fe]' : ''}`} />
            <span>{isRefreshing ? 'Sincronizando...' : 'Actualizar'}</span>
          </button>

          {/* Botón Programar Reporte Automático */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#00f2fe]/10 hover:bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/30 font-bold text-xs transition-all cursor-pointer shadow-[0_0_12px_rgba(0,242,254,0.15)]"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Programar Reporte</span>
          </button>

          {/* Botón con PIN 1501 */}
          <button
            onClick={() => setIsPinModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-black font-black text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Abrir en Google Sheets</span>
            <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      </div>

      {/* 4 TARJETAS KPIS CON DATOS CONSOLIDADOS */}
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

      {/* SECCIÓN BALANCE + BUSCADOR DE CONSULTA RÁPIDA */}
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
                  {allItems.length > 0
                    ? `Búsqueda en vivo sobre ${allItems.length.toLocaleString()} artículos registrados`
                    : 'Conectando con la base de datos...'}
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

            {/* Barra de Búsqueda */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Escribe código de componente, SKU o ubicación..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#0d1017] border border-white/15 text-xs text-white placeholder-gray-500 focus:border-amber-400 outline-none shadow-inner"
              />
              {quickSearch && (
                <button
                  onClick={() => setQuickSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* RESULTADOS DE BÚSQUEDA */}
            {quickSearch.trim() !== '' ? (
              <div className="overflow-x-auto max-h-60 custom-scrollbar border border-white/5 rounded-xl">
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
                          onClick={() => handleItemSelect(row)}
                          className="hover:bg-white/5 transition-colors cursor-pointer"
                          title="Clic para fijar en historial reciente"
                        >
                          <td className="py-2 px-3">
                            {row.validado ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" /> OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
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
                          No se encontraron artículos con "{quickSearch}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* HISTORIAL DE BÚSQUEDAS RECIENTES */
              <div className="border border-white/5 rounded-xl p-3 bg-[#0d1017]/60 min-h-[190px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                    <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-amber-400" /> Historial de Consultas Recientes
                    </span>
                    {searchHistory.length > 0 && (
                      <button
                        onClick={clearHistory}
                        className="text-[10px] text-gray-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Limpiar
                      </button>
                    )}
                  </div>

                  {searchHistory.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                      {searchHistory.map((rec, idx) => (
                        <div
                          key={idx}
                          onClick={() => setQuickSearch(rec.codigo || rec.item)}
                          className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono font-bold text-amber-400">{rec.codigo}</span>
                            <span className="text-white font-medium truncate">{rec.item}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-gray-400 font-mono text-11px]">
                            <span>Stock: <strong className="text-gray-200">{rec.newsoft}</strong></span>
                            <span className="bg-white/5 px-1.5 py-0.5 rounded text-gray-300">{rec.ubicacion}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-gray-500 text-xs">
                      Escribe un código o SKU en el buscador superior para consultar existencias en tiempo real.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 text-[11px] text-gray-500 flex justify-between items-center">
            <span>
              {quickSearch.trim() !== ''
                ? `${searchResults.length} coincidencias encontradas`
                : `${searchHistory.length} artículos en el historial reciente`}
            </span>
            <span className="text-amber-400/80 font-bold">Nave 6 - Boombah</span>
          </div>
        </div>
      </div>

      {/* Modal Programación de Correo Automático */}
      <ScheduleReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        currentUserEmail="juan.mercado@boombah.com"
      />

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
                className="text-gray-400 hover:text-white cursor-pointer"
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
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleVerifyPin}
                className="px-5 py-2 bg-[#00f2fe] text-[#0b0e14] font-black rounded-xl text-xs hover:bg-[#00f2fe]/80 shadow-[0_0_12px_rgba(0,242,254,0.4)] cursor-pointer"
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
