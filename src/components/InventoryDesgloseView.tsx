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
  ExternalLink,
  X
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

export const InventoryDesgloseView: React.FC = () => {
  const [items, setItems] = useState<SheetRowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OK' | 'PENDIENTE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const GOOGLE_SHEETS_URL =
    'https://docs.google.com/spreadsheets/d/1g5SoP8q1u7n05v0tABvwf2e6UPClSMM8b2ah_1-9A3M/edit?gid=1178501683#gid=1178501683';
  const CSV_URL =
    'https://docs.google.com/spreadsheets/d/1g5SoP8q1u7n05v0tABvwf2e6UPClSMM8b2ah_1-9A3M/export?format=csv&gid=1178501683';

  const fetchSheetData = async () => {
    setLoading(true);
    try {
      const res = await fetch(CSV_URL);
      const csvText = await res.text();
      const lines = csvText.split('\n');
      const parsedItems: SheetRowItem[] = [];

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

        parsedItems.push({
          validado: isValid,
          codigo,
          item: itemName,
          ns: nsVal,
          newsoft: newsoftVal,
          dif: difVal,
          ubicacion
        });
      }

      if (parsedItems.length > 0) setItems(parsedItems);
    } catch {
      setItems([
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
        { validado: false, codigo: '341647', item: 'BM-1000 B-30', ns: 13, newsoft: 15, dif: 2, ubicacion: 'E-7-1' },
        { validado: false, codigo: '998331', item: 'FD-1874-3037 B/CB : FD-1874-3037 B/CB-XL', ns: 0, newsoft: 4, dif: 'Restar a NS: 4', ubicacion: 'A-12-2' },
        { validado: false, codigo: '998332', item: 'FD-1874-3037 B/CB : FD-1874-3037 B/CB-2X', ns: 0, newsoft: 0, dif: 'No encontrado', ubicacion: 'A-12-2' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheetData();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchSearch =
        it.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.ubicacion.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchSearch) return false;
      if (filterStatus === 'OK') return it.validado;
      if (filterStatus === 'PENDIENTE') return !it.validado;
      return true;
    });
  }, [items, searchTerm, filterStatus]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

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

      {/* Tabla Completa a Pantalla Completa */}
      <div className="bg-[#12161f] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col">
        {/* Filtros y Buscador */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#0d1017] rounded-xl border border-white/10 p-1 text-xs">
              <button
                onClick={() => { setFilterStatus('ALL'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filterStatus === 'ALL' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Todos ({items.length.toLocaleString()})
              </button>
              <button
                onClick={() => { setFilterStatus('PENDIENTE'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filterStatus === 'PENDIENTE' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Pendientes
              </button>
              <button
                onClick={() => { setFilterStatus('OK'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filterStatus === 'OK' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Validados OK
              </button>
            </div>

            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-[#0d1017] border border-white/10 text-xs text-gray-300 rounded-xl px-2.5 py-1.5 outline-none font-bold"
            >
              <option value={25}>25 por pág.</option>
              <option value={50}>50 por pág.</option>
              <option value={100}>100 por pág.</option>
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar SKU, código o ubicación..."
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
                <th className="py-3 px-3">Código Componente</th>
                <th className="py-3 px-3">Item NT/NS Descripción</th>
                <th className="py-3 px-3 text-right">Cantidad NetSuite</th>
                <th className="py-3 px-3 text-right">Almacén Newsoft</th>
                <th className="py-3 px-3 text-right">Diferencia</th>
                <th className="py-3 px-3">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {paginatedItems.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-3">
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
                  <td className="py-2.5 px-3 font-mono font-bold text-gray-300">{row.codigo}</td>
                  <td className="py-2.5 px-3 text-white font-bold">{row.item}</td>
                  <td className="py-2.5 px-3 text-right text-gray-300 font-mono">{row.ns.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-gray-300 font-mono">{row.newsoft.toLocaleString()}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación Inferior */}
        <div className="flex items-center justify-between pt-4 mt-3 border-t border-white/10 text-xs text-gray-400">
          <span>
            Mostrando <strong>{paginatedItems.length}</strong> de <strong>{filteredItems.length.toLocaleString()}</strong> artículos
          </span>
          <div className="flex items-center gap-2">
            <span>
              Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal PIN 1501 */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#12161f] border border-[#00f2fe]/40 rounded-2xl w-full max-w-sm p-6 shadow-[0_0_35px_rgba(0,242,254,0.3)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-black uppercase text-[#00f2fe] flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" /> Acceso Protegido
              </span>
              <button onClick={() => { setIsPinModalOpen(false); setPinInput(''); }} className="text-gray-400 hover:text-white">
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
              <button onClick={() => { setIsPinModalOpen(false); setPinInput(''); }} className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-300">
                Cancelar
              </button>
              <button onClick={handleVerifyPin} className="px-5 py-2 bg-[#00f2fe] text-[#0b0e14] font-black rounded-xl text-xs">
                Abrir Documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
