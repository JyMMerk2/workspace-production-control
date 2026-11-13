import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Unlock,
  ExternalLink, 
  X,
  KeyRound,
  AlertCircle,
  ShieldCheck,
  Edit2
} from 'lucide-react';

interface SheetRowItem {
  rowNumber: number;
  validado: boolean;
  candado: boolean;
  codigo: string;
  item: string;
  ns: number;
  newsoft: number;
  dif: string | number;
  ubicacion: string;
  comentario: string;
}

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwEDMJffjkXLYTPnYpQA3jC51KmyDb8TtNG3haEGv5lYvbzZAMjaAI3Xmy3BF5SQCkL/exec';
const MASTER_PIN = '030621';

// Parser CSV que respeta saltos de línea dentro de comillas (mantiene el rowNumber 100% exacto)
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

// Cliente híbrido para actualizar celdas en Google Sheets sin problemas de CORS
async function updateSheetRowGAS(params: Record<string, string>): Promise<any> {
  const query = new URLSearchParams(params).toString();
  const url = `${APPS_SCRIPT_URL}?${query}`;

  try {
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch {
    // Fallback a JSONP
  }

  return new Promise((resolve, reject) => {
    const cb = 'gas_desg_cb_' + Math.round(100000 * Math.random());
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

export const InventoryDesgloseView: React.FC = () => {
  const [items, setItems] = useState<SheetRowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingRow, setUpdatingRow] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados para edición en línea de Cantidad NetSuite (Col D)
  const [editingNsRow, setEditingNsRow] = useState<number | null>(null);
  const [editingNsValue, setEditingNsValue] = useState<string>('');

  // Estados para edición en línea de Comentarios (Col L)
  const [editingCommentRow, setEditingCommentRow] = useState<number | null>(null);
  const [editingCommentValue, setEditingCommentValue] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDIENTE' | 'OK' | 'CERRADO'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [inputPage, setInputPage] = useState('1');

  // Modal PIN 1501 para abrir Google Sheets
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Modal PIN 030621 para desbloquear un registro Cerrado
  const [unlockTargetRow, setUnlockTargetRow] = useState<SheetRowItem | null>(null);
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [unlockPinError, setUnlockPinError] = useState(false);

  const GOOGLE_SHEETS_URL =
    'https://docs.google.com/spreadsheets/d/1g5SoP8q1u7n05v0tABvwf2e6UPClSMM8b2ah_1-9A3M/edit?gid=1178501683#gid=1178501683';
  const CSV_URL =
    'https://docs.google.com/spreadsheets/d/1g5SoP8q1u7n05v0tABvwf2e6UPClSMM8b2ah_1-9A3M/export?format=csv&gid=1178501683';

  const fetchSheetData = async () => {
    setLoading(true);
    try {
      const res = await fetch(CSV_URL);
      const csvText = await res.text();
      const allRows = parseCSVExact(csvText);
      const parsedItems: SheetRowItem[] = [];

      // El índice 3 corresponde exactamente a la fila 4 de Google Sheets
      for (let i = 3; i < allRows.length; i++) {
        const cols = allRows[i];
        if (!cols || cols.length < 3) continue;
        
        // Columna A (Índice 0): Validado
        const rawValidado = (cols[0] || '').toUpperCase();
        const isValid = rawValidado === 'TRUE' || rawValidado === 'VERDADERO' || rawValidado === 'OK' || rawValidado === '1';

        // Columna I (Índice 8): Candado Bloqueo
        const rawCandado = (cols[8] || '').toUpperCase();
        const isLocked = rawCandado === 'TRUE' || rawCandado === 'VERDADERO' || rawCandado === 'OK' || rawCandado === '1';

        const codigo = cols[1] || '';
        const itemName = cols[2] || '';
        if (!itemName && !codigo) continue;

        // Omitir filas de comentario o encabezados repetidos
        if (codigo.toUpperCase() === 'COMENTARIO' || itemName.toUpperCase() === 'COMENTARIO') continue;

        const nsVal = parseFloat(cols[3]?.replace(/[^0-9.-]+/g, '')) || 0;
        
        // Columna K (Índice 10) o Columna E (Índice 4) para Balance Newsoft
        const newsoftKVal = parseFloat(cols[10]?.replace(/[^0-9.-]+/g, ''));
        const newsoftEVal = parseFloat(cols[4]?.replace(/[^0-9.-]+/g, '')) || 0;
        const salidaGVal = parseFloat(cols[6]?.replace(/[^0-9.-]+/g, '')) || 0;
        const finalNewsoftVal = !isNaN(newsoftKVal) ? newsoftKVal : (newsoftEVal - salidaGVal);

        const difVal = cols[5] !== undefined && cols[5] !== '' ? cols[5] : (finalNewsoftVal - nsVal);
        const ubicacion = cols[7] || cols[6] || '-';
        const comentario = cols[11] || ''; // Columna L (Índice 11)

        parsedItems.push({
          rowNumber: i + 1, // Fila real exacta en Google Sheets (1-based)
          validado: isValid,
          candado: isLocked,
          codigo,
          item: itemName,
          ns: nsVal,
          newsoft: finalNewsoftVal,
          dif: difVal,
          ubicacion,
          comentario
        });
      }

      if (parsedItems.length > 0) setItems(parsedItems);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheetData();
  }, []);

  // Guardar nuevo valor de Cantidad NetSuite (Col D) en Google Sheets
  const handleSaveNetSuite = async (row: SheetRowItem) => {
    setEditingNsRow(null);
    if (row.candado) return;

    const nuevoNs = parseFloat(editingNsValue);
    if (isNaN(nuevoNs) || nuevoNs === row.ns) return;

    setUpdatingRow(row.rowNumber);
    setNotification(null);

    const payload = {
      rowNumber: row.rowNumber,
      codigo: row.codigo,
      colD: nuevoNs
    };

    try {
      const res = await updateSheetRowGAS({
        action: 'UPDATE_ITEM',
        payload: JSON.stringify(payload)
      });

      if (res && res.success) {
        const nuevaDif = row.newsoft - nuevoNs;
        setItems(prev =>
          prev.map(it =>
            it.rowNumber === row.rowNumber
              ? { ...it, ns: nuevoNs, dif: nuevaDif }
              : it
          )
        );
        setNotification({
          type: 'success',
          text: `Cantidad NetSuite del ítem ${row.codigo} actualizada a ${nuevoNs}.`
        });
      } else {
        setNotification({ type: 'error', text: res?.error || 'No se pudo actualizar NetSuite en Sheets.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error de conexión: ' + err.message });
    } finally {
      setUpdatingRow(null);
    }
  };

  // Guardar nuevo Comentario (Col L) en Google Sheets
  const handleSaveComment = async (row: SheetRowItem) => {
    setEditingCommentRow(null);
    if (row.candado) return;

    const nuevoComentario = editingCommentValue.trim();
    if (nuevoComentario === row.comentario.trim()) return;

    setUpdatingRow(row.rowNumber);
    setNotification(null);

    const payload = {
      rowNumber: row.rowNumber,
      codigo: row.codigo,
      colL: nuevoComentario
    };

    try {
      const res = await updateSheetRowGAS({
        action: 'UPDATE_ITEM',
        payload: JSON.stringify(payload)
      });

      if (res && res.success) {
        setItems(prev =>
          prev.map(it =>
            it.rowNumber === row.rowNumber
              ? { ...it, comentario: nuevoComentario }
              : it
          )
        );
        setNotification({
          type: 'success',
          text: `Comentario del ítem ${row.codigo} actualizado en Google Sheets.`
        });
      } else {
        setNotification({ type: 'error', text: res?.error || 'No se pudo actualizar el comentario.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error de conexión: ' + err.message });
    } finally {
      setUpdatingRow(null);
    }
  };

  // Verificar si un registro tiene Diferencia = 0
  const tieneDiferenciaCero = (row: SheetRowItem): boolean => {
    if (typeof row.dif === 'number') return row.dif === 0;
    const strDif = String(row.dif).trim();
    if (strDif === '' || strDif === '0') return true;
    const parsedNum = Number(strDif);
    if (!isNaN(parsedNum)) return parsedNum === 0;
    return row.newsoft === row.ns;
  };

  // Acción directa para activar o desactivar el candado (Col I) en Google Sheets
  const toggleCandadoFila = async (row: SheetRowItem, nuevoEstadoCandado: boolean, conPinAutorizado = false) => {
    // Si intenta cerrar el candado, exigir Diferencia === 0
    if (nuevoEstadoCandado && !tieneDiferenciaCero(row)) {
      setNotification({
        type: 'error',
        text: `No se puede cerrar el ítem ${row.codigo}: La diferencia debe ser 0 para activar el candado.`
      });
      return;
    }

    // Si el ítem ya está cerrado y quiere abrirlo, exigir el modal de PIN 030621
    if (!nuevoEstadoCandado && row.candado && !conPinAutorizado) {
      setUnlockTargetRow(row);
      setUnlockPinInput('');
      setUnlockPinError(false);
      return;
    }

    setUpdatingRow(row.rowNumber);
    setNotification(null);

    const payload = {
      rowNumber: row.rowNumber,
      codigo: row.codigo, // Respaldo de seguridad para ubicar fila exacta en Apps Script
      colI: nuevoEstadoCandado,
      forceUnlock: conPinAutorizado
    };

    try {
      const res = await updateSheetRowGAS({
        action: 'UPDATE_ITEM',
        payload: JSON.stringify(payload)
      });

      if (res && res.success) {
        setItems(prev =>
          prev.map(it => (it.rowNumber === row.rowNumber ? { ...it, candado: nuevoEstadoCandado } : it))
        );
        setNotification({
          type: 'success',
          text: nuevoEstadoCandado
            ? `Ítem ${row.codigo} cerrado con candado exitosamente.`
            : `Candado desbloqueado para el ítem ${row.codigo}.`
        });
      } else {
        setNotification({ type: 'error', text: res?.error || 'Error al actualizar el candado en Google Sheets.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error de conexión: ' + err.message });
    } finally {
      setUpdatingRow(null);
    }
  };

  // Confirmar desbloqueo con PIN maestro 030621
  const handleConfirmarDesbloqueo = () => {
    if (unlockPinInput.trim() === MASTER_PIN && unlockTargetRow) {
      const target = unlockTargetRow;
      setUnlockTargetRow(null);
      setUnlockPinInput('');
      setUnlockPinError(false);
      toggleCandadoFila(target, false, true);
    } else {
      setUnlockPinError(true);
    }
  };

  // Contadores por categoría para las pestañas
  const counts = useMemo(() => {
    let pendientes = 0;
    let validadosOk = 0;
    let cerrados = 0;

    for (const it of items) {
      if (it.validado && it.candado) {
        cerrados++;
      } else if (it.validado && !it.candado) {
        validadosOk++;
      } else {
        pendientes++;
      }
    }
    return { pendientes, validadosOk, cerrados };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchSearch =
        it.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.comentario.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchSearch) return false;
      if (filterStatus === 'PENDIENTE') return !it.validado && !it.candado;
      if (filterStatus === 'OK') return it.validado && !it.candado;
      if (filterStatus === 'CERRADO') return it.validado && it.candado;
      return true;
    });
  }, [items, searchTerm, filterStatus]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;

  useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const handlePageJump = () => {
    const pageNum = parseInt(inputPage, 10);
    if (!isNaN(pageNum)) {
      const validPage = Math.max(1, Math.min(pageNum, totalPages));
      setCurrentPage(validPage);
      setInputPage(String(validPage));
    } else {
      setInputPage(String(currentPage));
    }
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
    <div className="space-y-4 pb-12">
      {/* Barra Superior con Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#12161f] p-4 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase text-white tracking-wide">
              DESGLOSE OPERATIVO COMPLETO (NAVE 6)
            </h2>
            <span className="text-xs text-gray-400">
              Registros Totales: {items.length.toLocaleString()} artículos
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSheetData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs border border-white/10 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00f2fe]' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={() => setIsPinModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-black font-black text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Abrir Sheet (1501)</span>
            <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Notificaciones de Candado / Guardado */}
      {notification && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabla Completa */}
      <div className="bg-[#12161f] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col">
        {/* Filtros y Buscador */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center bg-[#0d1017] rounded-xl border border-white/10 p-1 text-xs gap-1">
              <button
                onClick={() => { setFilterStatus('ALL'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterStatus === 'ALL' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Todos ({items.length.toLocaleString()})
              </button>

              <button
                onClick={() => { setFilterStatus('PENDIENTE'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterStatus === 'PENDIENTE' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Pendientes ({counts.pendientes.toLocaleString()})
              </button>

              <button
                onClick={() => { setFilterStatus('OK'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterStatus === 'OK' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Validados OK ({counts.validadosOk.toLocaleString()})
              </button>

              <button
                onClick={() => { setFilterStatus('CERRADO'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterStatus === 'CERRADO' ? 'bg-rose-500/20 text-rose-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>Cerrados ({counts.cerrados.toLocaleString()})</span>
              </button>
            </div>

            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-[#0d1017] border border-white/10 text-xs text-gray-300 rounded-xl px-2.5 py-1.5 outline-none font-bold cursor-pointer"
            >
              <option value={25}>25 por pág.</option>
              <option value={50}>50 por pág.</option>
              <option value={100}>100 por pág.</option>
              <option value={200}>200 por pág.</option>
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar SKU, código, ubicación o comentario..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-4 py-2 rounded-xl bg-[#0d1017] border border-white/10 text-xs text-white placeholder-gray-500 focus:border-amber-400 outline-none w-64 sm:w-80"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto min-h-[500px] max-h-[65vh] custom-scrollbar border border-white/5 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0d1017] z-10 shadow-sm">
              <tr className="border-b border-white/10 text-gray-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3 text-center">Candado (Col I)</th>
                <th className="py-3 px-3">Código Componente</th>
                <th className="py-3 px-3">Item NT/NS Descripción</th>
                <th className="py-3 px-3 text-right">Cantidad NetSuite</th>
                <th className="py-3 px-3 text-right">Total Balance Disponible Newsoft</th>
                <th className="py-3 px-3 text-right">Diferencia</th>
                <th className="py-3 px-3">Ubicación</th>
                <th className="py-3 px-3">Comentarios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {paginatedItems.map((row) => {
                const isDifCero = tieneDiferenciaCero(row);
                const isRowUpdating = updatingRow === row.rowNumber;
                const isEditingNs = editingNsRow === row.rowNumber;
                const isEditingComment = editingCommentRow === row.rowNumber;

                return (
                  <tr key={row.rowNumber} className="hover:bg-white/5 transition-colors">
                    {/* ESTADO */}
                    <td className="py-2.5 px-3">
                      {row.validado && row.candado ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                          <ShieldCheck className="w-3 h-3" /> Cerrado
                        </span>
                      ) : row.validado ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          <Clock className="w-3 h-3" /> Pendiente
                        </span>
                      )}
                    </td>

                    {/* CASILLA / BOTÓN DE CANDADO (COL I) */}
                    <td className="py-2.5 px-3 text-center">
                      {row.validado ? (
                        <div className="inline-flex items-center justify-center">
                          <button
                            type="button"
                            disabled={isRowUpdating || (!row.candado && !isDifCero)}
                            onClick={() => toggleCandadoFila(row, !row.candado)}
                            title={
                              row.candado
                                ? 'Cerrado (Clic para desbloquear con PIN 030621)'
                                : isDifCero
                                ? 'Activar Candado (Cerrar ítem)'
                                : 'Requiere Diferencia = 0 para cerrar candado'
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                              isRowUpdating
                                ? 'bg-white/10 border-white/20 text-gray-400 cursor-wait'
                                : row.candado
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30 cursor-pointer'
                                : isDifCero
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-black cursor-pointer'
                                : 'bg-white/5 border-white/10 text-gray-600 cursor-not-allowed opacity-50'
                            }`}
                          >
                            {isRowUpdating ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : row.candado ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Cerrado</span>
                              </>
                            ) : (
                              <>
                                <input
                                  type="checkbox"
                                  checked={false}
                                  readOnly
                                  disabled={!isDifCero}
                                  className="w-3.5 h-3.5 accent-amber-400 pointer-events-none"
                                />
                                <span>Cerrar</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-600 font-mono">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono font-bold text-gray-300">{row.codigo}</td>
                    <td className="py-2.5 px-3 text-white font-bold">{row.item}</td>

                    {/* CANTIDAD NETSUITE (EDITABLE EN LÍNEA SI NO ESTÁ CERRADO CON CANDADO) */}
                    <td className="py-2.5 px-3 text-right font-mono">
                      {isEditingNs ? (
                        <input
                          type="number"
                          autoFocus
                          value={editingNsValue}
                          onChange={(e) => setEditingNsValue(e.target.value)}
                          onBlur={() => handleSaveNetSuite(row)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNetSuite(row);
                            if (e.key === 'Escape') setEditingNsRow(null);
                          }}
                          className="w-20 px-2 py-1 text-right font-bold text-white bg-[#0d1017] border border-indigo-400 rounded-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <div
                          onClick={() => {
                            if (!row.candado && !isRowUpdating) {
                              setEditingNsRow(row.rowNumber);
                              setEditingNsValue(String(row.ns));
                            }
                          }}
                          title={row.candado ? 'Bloqueado con candado' : 'Clic para editar Cantidad NetSuite'}
                          className={`inline-flex items-center justify-end gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                            row.candado
                              ? 'text-gray-400 cursor-default'
                              : 'text-gray-200 hover:bg-indigo-500/15 hover:text-indigo-300 cursor-pointer group'
                          }`}
                        >
                          <span>{row.ns.toLocaleString()}</span>
                          {!row.candado && (
                            <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity" />
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right text-[#00f2fe] font-mono font-bold">{row.newsoft.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {typeof row.dif === 'number' && row.dif > 0 ? (
                        <span className="text-amber-400 font-bold">+{row.dif}</span>
                      ) : typeof row.dif === 'number' && row.dif < 0 ? (
                        <span className="text-rose-400 font-bold">{row.dif}</span>
                      ) : typeof row.dif === 'string' && (row.dif.includes('Restar') || row.dif.includes('Agregar') || row.dif.includes('No')) ? (
                        <span className="text-rose-400 font-bold text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                          {row.dif}
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-gray-400 font-mono font-bold">{row.ubicacion}</td>

                    {/* COMENTARIOS (COL L - EDITABLE EN LÍNEA SI NO ESTÁ CERRADO CON CANDADO) */}
                    <td className="py-2.5 px-3 text-gray-300 text-[11px] min-w-[200px] max-w-[280px]">
                      {isEditingComment ? (
                        <input
                          type="text"
                          autoFocus
                          value={editingCommentValue}
                          onChange={(e) => setEditingCommentValue(e.target.value)}
                          onBlur={() => handleSaveComment(row)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveComment(row);
                            if (e.key === 'Escape') setEditingCommentRow(null);
                          }}
                          placeholder="Escribir comentario..."
                          className="w-full px-2 py-1 text-xs text-white bg-[#0d1017] border border-amber-400 rounded-lg outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => {
                            if (!row.candado && !isRowUpdating) {
                              setEditingCommentRow(row.rowNumber);
                              setEditingCommentValue(row.comentario);
                            }
                          }}
                          title={row.candado ? 'Bloqueado con candado' : (row.comentario ? `${row.comentario} (Clic para editar)` : 'Clic para agregar comentario')}
                          className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                            row.candado
                              ? 'text-gray-400 cursor-default'
                              : 'hover:bg-amber-500/15 hover:text-amber-200 cursor-pointer group'
                          }`}
                        >
                          <span className="truncate">
                            {row.comentario || <span className="text-gray-600">—</span>}
                          </span>
                          {!row.candado && (
                            <Edit2 className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 text-amber-400 transition-opacity" />
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación Inferior */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-3 border-t border-white/10 text-xs text-gray-400">
          <span>
            Mostrando <strong>{paginatedItems.length}</strong> de <strong>{filteredItems.length.toLocaleString()}</strong> artículos
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Página</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={inputPage}
                onChange={(e) => setInputPage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePageJump()}
                onBlur={handlePageJump}
                className="w-16 px-2 py-1 text-center font-bold text-white bg-[#0d1017] border border-white/15 rounded-lg outline-none focus:border-[#00f2fe] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span>de <strong>{totalPages}</strong></span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all cursor-pointer"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal PIN 1501 para abrir Google Sheets */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#12161f] border border-[#00f2fe]/40 rounded-2xl w-full max-w-sm p-6 shadow-[0_0_35px_rgba(0,242,254,0.3)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-black uppercase text-[#00f2fe] flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" /> Acceso Protegido
              </span>
              <button onClick={() => { setIsPinModalOpen(false); setPinInput(''); }} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-300 text-center">Ingresa la contraseña para abrir Google Sheets:</p>
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
              placeholder="••••"
              className="w-full text-center text-2xl tracking-[0.4em] py-2.5 rounded-xl bg-[#0d1017] border border-white/20 text-white focus:border-[#00f2fe] outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
              autoFocus
            />
            {pinError && <p className="text-xs text-rose-400 font-bold text-center">Contraseña incorrecta.</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => { setIsPinModalOpen(false); setPinInput(''); }} className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-300 cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleVerifyPin} className="px-5 py-2 bg-[#00f2fe] text-[#0b0e14] font-black rounded-xl text-xs cursor-pointer">
                Abrir Documento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal PIN Maestro 030621 para Desbloquear un Ítem Cerrado */}
      {unlockTargetRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#12161f] border border-rose-500/50 rounded-2xl w-full max-w-sm p-6 shadow-[0_0_35px_rgba(244,63,94,0.3)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-black uppercase text-rose-400 flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> Desbloquear Candado (Col I)
              </span>
              <button
                onClick={() => { setUnlockTargetRow(null); setUnlockPinInput(''); setUnlockPinError(false); }}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300 text-center">
              Introduce el PIN maestro de 6 dígitos para abrir el candado del código{' '}
              <strong className="text-amber-400 font-mono">{unlockTargetRow.codigo}</strong>:
            </p>

            <input
              type="password"
              maxLength={6}
              value={unlockPinInput}
              onChange={(e) => { setUnlockPinInput(e.target.value); setUnlockPinError(false); }}
              placeholder="••••••"
              className="w-full text-center text-xl tracking-[0.4em] py-2.5 rounded-xl bg-[#0d1017] border border-rose-500/40 text-white focus:border-rose-400 outline-none font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmarDesbloqueo()}
              autoFocus
            />

            {unlockPinError && (
              <p className="text-xs text-rose-400 font-bold text-center">
                PIN maestro incorrecto. Inténtalo de nuevo.
              </p>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => { setUnlockTargetRow(null); setUnlockPinInput(''); setUnlockPinError(false); }}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarDesbloqueo}
                className="px-5 py-2 bg-rose-500 text-white font-black rounded-xl text-xs hover:bg-rose-600 flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Desbloquear</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
