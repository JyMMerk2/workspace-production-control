import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Users,
  CheckCircle2,
  Lock,
  MonitorCheck,
  Search,
  RefreshCw,
  Calendar,
  Award,
  Layers,
  Edit3,
  Send,
} from 'lucide-react';
import { supabase } from '../data/supabaseClient';

export interface Nave6ActivityEvent {
  id: string;
  usuario: string;
  accion: 'VALIDADO' | 'CERRADO' | 'DIGITADO' | 'EDICION' | 'SLACK';
  codigo: string;
  item: string;
  ubicacion: string;
  cantidad: number;
  fecha: string;
  timestamp: number;
}

interface LoteActivo {
  id: string;
  usuario: string;
  lote: string;
  hora: string;
  timestamp: number;
}

interface SheetSummaryStats {
  totalItems: number;
  validados: number;
  cerrados: number;
  digitados: number;
  pendientes: number;
  unidadesTotales: number;
}

interface InventarioKpiUsuariosViewProps {
  authenticatedUser?: string | null;
}

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwEDMJffjkXLYTPnYpQA3jC51KmyDb8TtNG3haEGv5lYvbzZAMjaAI3Xmy3BF5SQCkL/exec';
const CSV_URL =
  'https://docs.google.com/spreadsheets/d/1g5SoP8q1u7n05v0tABvwf2e6UPClSMM8b2ah_1-9A3M/export?format=csv&gid=1178501683';
const ACTIVITY_LOG_CACHE_KEY = 'nave6_season_activity_v1';
const DIGITADO_META_CACHE_KEY = 'nave6_digitado_meta_v1';

// Inicio oficial de la temporada de inventario: 13 de noviembre de 2026
const SEASON_START_TIMESTAMP = new Date('2026-11-13T00:00:00').getTime();

async function fetchGAS(params: Record<string, string>): Promise<any> {
  const query = new URLSearchParams(params).toString();
  const url = `${APPS_SCRIPT_URL}?${query}`;

  try {
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch {
    // Fallback a JSONP
  }

  return new Promise((resolve, reject) => {
    const cb = 'gas_kpi_cb_' + Math.round(100000 * Math.random());
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
      reject(new Error('No se pudo conectar con Google Apps Script.'));
    };
    document.body.appendChild(script);
  });
}

function parseCSVExact(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }
  if (current !== '' || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

export const InventarioKpiUsuariosView: React.FC<InventarioKpiUsuariosViewProps> = ({
  authenticatedUser,
}) => {
  const [events, setEvents] = useState<Nave6ActivityEvent[]>(() => {
    try {
      const saved = localStorage.getItem(ACTIVITY_LOG_CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignorar
    }
    return [];
  });

  const [lotesActivos, setLotesActivos] = useState<LoteActivo[]>([]);

  const [sheetStats, setSheetStats] = useState<SheetSummaryStats>({
    totalItems: 0,
    validados: 0,
    cerrados: 0,
    digitados: 0,
    pendientes: 0,
    unidadesTotales: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadAllKpiData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      // 1. Consultar lotes activos en vivo en Apps Script (equipo trabajando ahora mismo)
      fetchGAS({ action: 'GET_LOTES' })
        .then((lotesRes) => {
          if (lotesRes && lotesRes.success && Array.isArray(lotesRes.lotes)) {
            setLotesActivos(lotesRes.lotes);
          }
        })
        .catch(() => {});

      // 2. Leer totales reales actuales desde PROGRESO (Google Sheets CSV)
      const res = await fetch(`${CSV_URL}&t=${Date.now()}`, { cache: 'no-store' });
      const csvText = await res.text();
      const allRows = parseCSVExact(csvText);

      let totalItems = 0;
      let validados = 0;
      let cerrados = 0;
      let digitados = 0;
      let pendientes = 0;
      let unidadesTotales = 0;

      const itemInfoByRow = new Map<
        number,
        { codigo: string; item: string; ubicacion: string; cantidad: number }
      >();

      for (let i = 3; i < allRows.length; i++) {
        const cols = allRows[i];
        if (!cols || cols.length < 3) continue;

        const codigo = String(cols[1] || '').trim();
        const itemDesc = String(cols[2] || '').trim();
        if (!codigo && !itemDesc) continue;
        if (codigo.toUpperCase() === 'COMENTARIO' || itemDesc.toUpperCase() === 'COMENTARIO') continue;

        const rawA = (cols[0] || '').toUpperCase();
        const rawI = (cols[8] || '').toUpperCase();
        const rawO = (cols[14] || '').toUpperCase();

        const isColA = rawA === 'TRUE' || rawA === 'VERDADERO' || rawA === 'OK' || rawA === '1';
        const isColI = rawI === 'TRUE' || rawI === 'VERDADERO' || rawI === 'OK' || rawI === '1';
        const isColO = rawO === 'TRUE' || rawO === 'VERDADERO' || rawO === 'OK' || rawO === '1';

        const almacenE = parseFloat(cols[4]?.replace(/[^0-9.-]+/g, '')) || 0;
        const salidaG = parseFloat(cols[6]?.replace(/[^0-9.-]+/g, '')) || 0;
        const nave7N = parseFloat(cols[13]?.replace(/[^0-9.-]+/g, '')) || 0;
        const newsoftK = parseFloat(cols[10]?.replace(/[^0-9.-]+/g, ''));
        const finalNewsoft = !isNaN(newsoftK) ? newsoftK : almacenE - salidaG + nave7N;

        totalItems++;
        unidadesTotales += finalNewsoft;
        if (isColA) validados++;
        if (isColA && isColI) cerrados++;
        if (isColO) digitados++;
        if (!isColA && !isColI) pendientes++;

        itemInfoByRow.set(i + 1, {
          codigo,
          item: itemDesc,
          ubicacion: String(cols[7] || '-').trim(),
          cantidad: finalNewsoft,
        });
      }

      setSheetStats({
        totalItems,
        validados,
        cerrados,
        digitados,
        pendientes,
        unidadesTotales,
      });

      // 3. Leer bitácora de actividad de usuarios desde Supabase
      const mergedMap = new Map<string, Nave6ActivityEvent>();

      let localEvents: Nave6ActivityEvent[] = [];
      try {
        const saved = localStorage.getItem(ACTIVITY_LOG_CACHE_KEY);
        if (saved) localEvents = JSON.parse(saved);
      } catch {
        // Ignorar
      }
      for (const ev of localEvents) {
        if (ev && ev.id && (ev.timestamp || 0) >= SEASON_START_TIMESTAMP) {
          mergedMap.set(ev.id, ev);
        }
      }

      if (supabase) {
        const { data } = await supabase
          .from('boombah_announcements')
          .select('message')
          .eq('id', 'global_nave6_season_activity')
          .maybeSingle();

        if (data?.message) {
          const parsed = JSON.parse(data.message);
          if (Array.isArray(parsed)) {
            for (const ev of parsed) {
              if (ev && ev.id && (ev.timestamp || 0) >= SEASON_START_TIMESTAMP) {
                mergedMap.set(ev.id, ev);
              }
            }
          }
        }

        // Incorporar también los metadatos de Digitado si no estaban duplicados
        const { data: digData } = await supabase
          .from('boombah_announcements')
          .select('message')
          .eq('id', 'global_nave6_digitado_meta')
          .maybeSingle();

        if (digData?.message) {
          const parsedDig = JSON.parse(digData.message);
          if (parsedDig && typeof parsedDig === 'object') {
            Object.entries(parsedDig).forEach(([key, meta]: [string, any]) => {
              if (!meta || (meta.timestamp || 0) < SEASON_START_TIMESTAMP) return;
              const synId = `dig_${key}_${meta.timestamp}`;
              const alreadyHas = Array.from(mergedMap.values()).some(
                (e) =>
                  e.accion === 'DIGITADO' &&
                  e.codigo === key.split('_').slice(1).join('_') &&
                  Math.abs((e.timestamp || 0) - (meta.timestamp || 0)) < 15000
              );
              if (!alreadyHas) {
                const rowNum = parseInt(key.split('_')[0], 10);
                const rowInfo = itemInfoByRow.get(rowNum);
                mergedMap.set(synId, {
                  id: synId,
                  usuario: String(meta.usuario || 'OPERADOR').toUpperCase(),
                  accion: 'DIGITADO',
                  codigo: rowInfo?.codigo || key.split('_').slice(1).join('_'),
                  item: rowInfo?.item || 'Artículo Inventario Nave 6',
                  ubicacion: rowInfo?.ubicacion || '-',
                  cantidad: rowInfo?.cantidad || 0,
                  fecha: meta.fechaHora || 'Temporada Nov 2026',
                  timestamp: meta.timestamp || Date.now(),
                });
              }
            });
          }
        }
      } else {
        // Respaldo con caché local de digitados
        try {
          const savedDig = localStorage.getItem(DIGITADO_META_CACHE_KEY);
          if (savedDig) {
            const parsedDig = JSON.parse(savedDig);
            Object.entries(parsedDig).forEach(([key, meta]: [string, any]) => {
              if (!meta || (meta.timestamp || 0) < SEASON_START_TIMESTAMP) return;
              const synId = `dig_${key}_${meta.timestamp}`;
              const rowNum = parseInt(key.split('_')[0], 10);
              const rowInfo = itemInfoByRow.get(rowNum);
              mergedMap.set(synId, {
                id: synId,
                usuario: String(meta.usuario || 'OPERADOR').toUpperCase(),
                accion: 'DIGITADO',
                codigo: rowInfo?.codigo || key.split('_').slice(1).join('_'),
                item: rowInfo?.item || 'Artículo Inventario Nave 6',
                ubicacion: rowInfo?.ubicacion || '-',
                cantidad: rowInfo?.cantidad || 0,
                fecha: meta.fechaHora || 'Temporada Nov 2026',
                timestamp: meta.timestamp || Date.now(),
              });
            });
          }
        } catch {
          // Ignorar
        }
      }

      const sortedEvents = Array.from(mergedMap.values()).sort(
        (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
      );
      setEvents(sortedEvents);
      try {
        localStorage.setItem(ACTIVITY_LOG_CACHE_KEY, JSON.stringify(sortedEvents));
      } catch {
        // Ignorar
      }
    } catch {
      // Conservar datos previos
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllKpiData(false);
    const interval = setInterval(() => loadAllKpiData(true), 8000);
    return () => clearInterval(interval);
  }, [loadAllKpiData]);

  // Agrupar KPI por cada usuario (combina bitácora de acciones + lotes activos en vivo)
  const userSummaries = useMemo(() => {
    const map = new Map<
      string,
      {
        usuario: string;
        totalAcciones: number;
        validados: number;
        cerrados: number;
        digitados: number;
        ediciones: number;
        alertasSlack: number;
        unidadesProcesadas: number;
        codigosUnicos: Set<string>;
        ultimaActividad: string;
        ultimoTimestamp: number;
        lotesEnVivo: string[];
      }
    >();

    const ensureUser = (rawName: string) => {
      const user = (rawName || 'OPERADOR').trim().toUpperCase();
      if (!map.has(user)) {
        map.set(user, {
          usuario: user,
          totalAcciones: 0,
          validados: 0,
          cerrados: 0,
          digitados: 0,
          ediciones: 0,
          alertasSlack: 0,
          unidadesProcesadas: 0,
          codigosUnicos: new Set<string>(),
          ultimaActividad: 'Activo ahora',
          ultimoTimestamp: 0,
          lotesEnVivo: [],
        });
      }
      return map.get(user)!;
    };

    for (const ev of events) {
      const stat = ensureUser(ev.usuario);
      stat.totalAcciones++;
      if (ev.codigo) stat.codigosUnicos.add(ev.codigo);
      stat.unidadesProcesadas += Number(ev.cantidad) || 0;

      if (ev.accion === 'VALIDADO') stat.validados++;
      else if (ev.accion === 'CERRADO') stat.cerrados++;
      else if (ev.accion === 'DIGITADO') stat.digitados++;
      else if (ev.accion === 'EDICION') stat.ediciones++;
      else if (ev.accion === 'SLACK') stat.alertasSlack++;

      if ((ev.timestamp || 0) > stat.ultimoTimestamp) {
        stat.ultimoTimestamp = ev.timestamp || 0;
        stat.ultimaActividad = ev.fecha;
      }
    }

    for (const lote of lotesActivos) {
      if (!lote || !lote.usuario) continue;
      const stat = ensureUser(lote.usuario);
      if (lote.lote && !stat.lotesEnVivo.includes(lote.lote)) {
        stat.lotesEnVivo.push(lote.lote);
      }
      if ((lote.timestamp || 0) > stat.ultimoTimestamp) {
        stat.ultimoTimestamp = lote.timestamp || 0;
        stat.ultimaActividad = `Lote activo (${lote.hora})`;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.totalAcciones !== a.totalAcciones) return b.totalAcciones - a.totalAcciones;
      return b.lotesEnVivo.length - a.lotesEnVivo.length;
    });
  }, [events, lotesActivos]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (
        selectedUserFilter !== 'ALL' &&
        ev.usuario.trim().toUpperCase() !== selectedUserFilter
      ) {
        return false;
      }
      if (actionFilter !== 'ALL' && ev.accion !== actionFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          ev.codigo.toLowerCase().includes(q) ||
          ev.item.toLowerCase().includes(q) ||
          ev.ubicacion.toLowerCase().includes(q) ||
          ev.usuario.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, selectedUserFilter, actionFilter, searchTerm]);

  const getActionBadge = (accion: Nave6ActivityEvent['accion']) => {
    switch (accion) {
      case 'DIGITADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-[10px] font-black">
            <MonitorCheck className="w-3 h-3" /> DIGITADO NEWSOFT
          </span>
        );
      case 'CERRADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-400/40 text-rose-300 text-[10px] font-black">
            <Lock className="w-3 h-3" /> CERRADO CANDADO
          </span>
        );
      case 'VALIDADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-black">
            <CheckCircle2 className="w-3 h-3" /> VALIDADO CONTEO
          </span>
        );
      case 'SLACK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/15 border border-purple-400/40 text-purple-300 text-[10px] font-black">
            <Send className="w-3 h-3" /> ALERTA SLACK
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[10px] font-black">
            <Edit3 className="w-3 h-3" /> EDICIÓN CANTIDAD/UBI
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 pb-12 max-w-[1700px] mx-auto">
      {/* Cabecera de Temporada */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#12161f] p-4 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#00f2fe]/15 border border-[#00f2fe]/40 text-[#00f2fe]">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black uppercase text-white tracking-wide flex flex-wrap items-center gap-2">
              <span>KPI de Productividad por Usuario • Inventario Nave 6</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-400/40">
                <Calendar className="w-3 h-3" />
                Temporada desde 13 Nov 2026
              </span>
            </h1>
            <p className="text-xs text-gray-400">
              Detalle individual de qué artículos y qué cantidad ha procesado cada usuario en esta temporada
              {authenticatedUser ? ` • Sesión: ${authenticatedUser}` : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadAllKpiData(false)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 font-bold text-xs border border-white/10 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00f2fe]' : ''}`} />
          <span>{loading ? 'Actualizando...' : 'Actualizar KPI'}</span>
        </button>
      </div>

      {/* Tarjetas Globales de la Temporada */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#12161f] border border-white/10 rounded-2xl p-3.5">
          <div className="text-[10px] font-black uppercase text-gray-400">Total Artículos</div>
          <div className="text-2xl font-black text-white mt-1">
            {sheetStats.totalItems.toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Base Nave 6</div>
        </div>

        <div className="bg-[#12161f] border border-emerald-500/30 rounded-2xl p-3.5">
          <div className="text-[10px] font-black uppercase text-emerald-400">Validados (Col A)</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {sheetStats.validados.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-300/70 mt-0.5">
            {sheetStats.totalItems > 0
              ? `${((sheetStats.validados / sheetStats.totalItems) * 100).toFixed(1)}%`
              : '0%'}
          </div>
        </div>

        <div className="bg-[#12161f] border border-rose-500/30 rounded-2xl p-3.5">
          <div className="text-[10px] font-black uppercase text-rose-400">Cerrados Candado</div>
          <div className="text-2xl font-black text-rose-400 mt-1">
            {sheetStats.cerrados.toLocaleString()}
          </div>
          <div className="text-[10px] text-rose-300/70 mt-0.5">Col A + Col I</div>
        </div>

        <div className="bg-[#12161f] border border-cyan-500/30 rounded-2xl p-3.5">
          <div className="text-[10px] font-black uppercase text-[#00f2fe]">Digitado Newsoft</div>
          <div className="text-2xl font-black text-[#00f2fe] mt-1">
            {sheetStats.digitados.toLocaleString()}
          </div>
          <div className="text-[10px] text-cyan-300/70 mt-0.5">Columna O marcada</div>
        </div>

        <div className="bg-[#12161f] border border-amber-500/30 rounded-2xl p-3.5">
          <div className="text-[10px] font-black uppercase text-amber-400">Pendientes</div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {sheetStats.pendientes.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-300/70 mt-0.5">Por contar/validar</div>
        </div>

        <div className="bg-[#12161f] border border-purple-500/30 rounded-2xl p-3.5">
          <div className="text-[10px] font-black uppercase text-purple-300">Usuarios Activos</div>
          <div className="text-2xl font-black text-purple-300 mt-1">
            {userSummaries.length}
          </div>
          <div className="text-[10px] text-purple-300/70 mt-0.5">
            {lotesActivos.length > 0
              ? `${lotesActivos.length} lote(s) en vivo ahora`
              : 'Con registros desde 13 Nov'}
          </div>
        </div>
      </div>

      {/* RESUMEN POR USUARIO: QUÉ Y QUÉ CANTIDAD HIZO CADA QUIEN */}
      <div className="bg-[#12161f] border border-white/10 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#00f2fe]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              Desglose por Operador (Qué y qué cantidad hizo cada quien)
            </h2>
          </div>
          {selectedUserFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedUserFilter('ALL')}
              className="text-[11px] font-bold text-[#00f2fe] hover:underline cursor-pointer"
            >
              Ver todos los usuarios
            </button>
          )}
        </div>

        {userSummaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {userSummaries.map((u, idx) => {
              const isSelected = selectedUserFilter === u.usuario;
              return (
                <div
                  key={u.usuario}
                  onClick={() =>
                    setSelectedUserFilter(isSelected ? 'ALL' : u.usuario)
                  }
                  className={`p-4 rounded-2xl border transition-colors cursor-pointer space-y-3 ${
                    isSelected
                      ? 'bg-[#00f2fe]/15 border-[#00f2fe] shadow-[0_0_16px_rgba(0,242,254,0.2)]'
                      : 'bg-[#0d1017] border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-black text-xs flex items-center justify-center">
                        {idx === 0 && u.totalAcciones > 0 ? <Award className="w-3.5 h-3.5" /> : idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-black text-white uppercase flex items-center gap-1.5">
                          <span>{u.usuario}</span>
                          {u.lotesEnVivo.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-[9px] font-mono text-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              EN VIVO
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {u.lotesEnVivo.length > 0
                            ? `Trabajando lote: ${u.lotesEnVivo.join(', ')}`
                            : `Última acción: ${u.ultimaActividad}`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-[#00f2fe]">
                        {u.totalAcciones.toLocaleString()}
                      </div>
                      <div className="text-[9px] uppercase font-bold text-gray-400">
                        Acciones Totales
                      </div>
                    </div>
                  </div>

                  {/* Desglose exacto de qué hizo este usuario */}
                  <div className="grid grid-cols-4 gap-1.5 text-center pt-2 border-t border-white/10">
                    <div className="p-1.5 rounded-lg bg-[#12161f] border border-cyan-500/20">
                      <div className="text-[9px] text-gray-400 font-bold">Digitados</div>
                      <div className="text-xs font-black text-[#00f2fe]">{u.digitados}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#12161f] border border-rose-500/20">
                      <div className="text-[9px] text-gray-400 font-bold">Cerrados</div>
                      <div className="text-xs font-black text-rose-400">{u.cerrados}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#12161f] border border-emerald-500/20">
                      <div className="text-[9px] text-gray-400 font-bold">Validados</div>
                      <div className="text-xs font-black text-emerald-400">{u.validados}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#12161f] border border-amber-500/20">
                      <div className="text-[9px] text-gray-400 font-bold">Ediciones</div>
                      <div className="text-xs font-black text-amber-300">{u.ediciones}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                    <span>
                      SKUs distintos: <strong className="text-white">{u.codigosUnicos.size}</strong>
                    </span>
                    <span>
                      Unidades movidas:{' '}
                      <strong className="text-emerald-300">
                        {u.unidadesProcesadas.toLocaleString()}
                      </strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-gray-400 bg-[#0d1017] rounded-xl border border-white/5">
            Aún no hay acciones individuales registradas desde esta actualización. Cada vez que un operador valide, cierre un candado, edite una cantidad o marque <strong>Digitado (Col O)</strong>, aparecerá aquí automáticamente.
          </div>
        )}
      </div>

      {/* BITÁCORA DETALLADA DE ARTÍCULOS TRABAJADOS POR CADA USUARIO */}
      <div className="bg-[#12161f] border border-white/10 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              Detalle de Artículos Procesados ({filteredEvents.length.toLocaleString()})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="bg-[#0d1017] border border-white/15 text-xs text-white rounded-xl px-3 py-1.5 outline-none font-bold cursor-pointer"
            >
              <option value="ALL">Todos los Usuarios</option>
              {userSummaries.map((u) => (
                <option key={u.usuario} value={u.usuario}>
                  {u.usuario} ({u.totalAcciones})
                </option>
              ))}
            </select>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-[#0d1017] border border-white/15 text-xs text-white rounded-xl px-3 py-1.5 outline-none font-bold cursor-pointer"
            >
              <option value="ALL">Todas las Acciones</option>
              <option value="DIGITADO">Digitado Newsoft (Col O)</option>
              <option value="CERRADO">Cerrado con Candado (Col I)</option>
              <option value="VALIDADO">Validado Conteo (Col A)</option>
              <option value="EDICION">Edición Cantidad / Ubicación</option>
              <option value="SLACK">Alerta Slack</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar código, ítem o rack..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-[#0d1017] border border-white/15 text-xs text-white placeholder-gray-500 focus:border-[#00f2fe] outline-none w-52"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[45vh] custom-scrollbar border border-white/5 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0d1017] z-10">
              <tr className="border-b border-white/10 text-gray-400 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Usuario</th>
                <th className="py-2.5 px-3">Qué Hizo</th>
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Artículo</th>
                <th className="py-2.5 px-3">Ubicación</th>
                <th className="py-2.5 px-3 text-right">Cantidad</th>
                <th className="py-2.5 px-3 text-right">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEvents.length > 0 ? (
                filteredEvents.slice(0, 300).map((ev) => (
                  <tr key={ev.id} className="hover:bg-white/5">
                    <td className="py-2 px-3 font-black text-white uppercase">{ev.usuario}</td>
                    <td className="py-2 px-3">{getActionBadge(ev.accion)}</td>
                    <td className="py-2 px-3 font-mono font-bold text-amber-400">{ev.codigo}</td>
                    <td className="py-2 px-3 text-gray-200 max-w-[260px] truncate">{ev.item}</td>
                    <td className="py-2 px-3 font-mono text-gray-300">{ev.ubicacion || '-'}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#00f2fe]">
                      {(Number(ev.cantidad) || 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[11px] text-gray-400">
                      {ev.fecha}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500 text-xs">
                    No hay registros que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
