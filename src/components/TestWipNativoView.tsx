import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, CheckCircle2, Clock, Database, Upload, Trash2, UserCheck, ShieldAlert, Wifi } from 'lucide-react';
import { supabase } from '../data/supabaseClient';

interface ContractDbItem {
  po: string;
  estilo: string;
  part: string;
  qty: number;
  estadoGeneral: 'AB' | 'CE';
}

interface WipRow {
  id: string;
  po: string;
  part: string;
  contrato: string;
  estilo: string;
  qty: number; // Columna E (Individual)
  piezasTotal: number | null; // Columna F (Suma global en primera fila del contrato)
  completado: boolean;
  estadoCaptura: 'CAPTURADO COMPLETO' | 'CAPTURADO PARCIAL';
  estadoGeneral: 'AB' | 'CE';
  modificadoPor: string;
  fechaModificacion: string;
}

export const TestWipNativoView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<WipRow[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pastedData, setPastedData] = useState('');
  const [auditingRow, setAuditingRow] = useState<WipRow | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const activeUser = sessionStorage.getItem('authenticated_user') || 'JMERCADO';

  // 1. Cargar datos iniciales desde Supabase y calcular estructuras
  const fetchSupabaseData = async () => {
    setIsRefreshing(true);
    try {
      const { data: dbRows, error } = await supabase
        .from('wip_incompletos')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error cargando de Supabase:', error);
        setIsRefreshing(false);
        return;
      }

      if (dbRows) {
        // Agrupar por contrato para calcular Columna E y Columna F (PIEZAS TOTAL)
        const grouped: Record<string, WipRow[]> = {};

        const mapped: WipRow[] = dbRows.map((item: any) => ({
          id: item.id,
          po: item.po,
          part: item.part,
          contrato: item.contrato,
          estilo: item.estilo || '',
          qty: item.qty || 0,
          piezasTotal: null,
          completado: item.completado || false,
          estadoCaptura: item.estado_captura || (item.completado ? 'CAPTURADO COMPLETO' : 'CAPTURADO PARCIAL'),
          estadoGeneral: item.estado_general || 'AB',
          modificadoPor: item.modificado_por || 'SISTEMA',
          fechaModificacion: item.updated_at ? new Date(item.updated_at).toLocaleString() : '',
        }));

        mapped.forEach((row) => {
          if (!grouped[row.contrato]) grouped[row.contrato] = [];
          grouped[row.contrato].push(row);
        });

        const structured: WipRow[] = [];
        Object.values(grouped).forEach((group) => {
          const sumTotal = group.reduce((acc, curr) => acc + curr.qty, 0);
          group.forEach((item, index) => {
            if (index === 0) item.piezasTotal = sumTotal;
            structured.push(item);
          });
        });

        setData(structured);
      }
    } catch (err) {
      console.error('Error general:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 2. Suscripción a WebSockets para Sincronización en Tiempo Real
  useEffect(() => {
    fetchSupabaseData();

    const channel = supabase
      .channel('public:wip_incompletos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wip_incompletos' },
        () => {
          fetchSupabaseData();
        }
      )
      .subscribe((status) => {
        setIsLiveConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Evaluador de Transferencia a WIP Stocks & Vendidas
  const checkAndTransferContract = async (contratoId: string, dataset: WipRow[]) => {
    const sameContractRows = dataset.filter((r) => r.contrato === contratoId);
    const allCompleted = sameContractRows.length > 0 && sameContractRows.every((r) => r.completado);

    if (allCompleted) {
      const { error } = await supabase
        .from('wip_stocks_vendidas')
        .upsert([{ contrato: contratoId }], { onConflict: 'contrato' });

      if (!error) {
        alert(`⚡ ¡CONTRATO COMPLETO! El contrato ${contratoId} completó todas sus partes y fue transferido en vivo a "WIP Stocks & Vendidas" (Columna A).`);
      }
    }
  };

  // Toggle de Captura con Persistencia en Supabase
  const toggleStatus = async (row: WipRow) => {
    const nextCompletado = !row.completado;
    const nextEstadoCaptura = nextCompletado ? 'CAPTURADO COMPLETO' : 'CAPTURADO PARCIAL';

    const { error } = await supabase
      .from('wip_incompletos')
      .update({
        completado: nextCompletado,
        estado_captura: nextEstadoCaptura,
        modificado_por: activeUser,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (!error) {
      const updatedLocal = data.map((item) =>
        item.id === row.id
          ? {
              ...item,
              completado: nextCompletado,
              estadoCaptura: nextEstadoCaptura as any,
              modificadoPor: activeUser,
              fechaModificacion: new Date().toLocaleString(),
            }
          : item
      );
      setData(updatedLocal);
      checkAndTransferContract(row.contrato, updatedLocal);
    }
  };

  // Procesar Pegado Masivo de Excel de NewSoft
  const handleProcessImport = async () => {
    if (!pastedData.trim()) return;
    const lines = pastedData.trim().split('\n');

    const rowsToUpsert: any[] = [];

    lines.forEach((line) => {
      const cols = line.split('\t');
      if (cols.length >= 2) {
        const poFull = cols[1]?.trim() || cols[0]?.trim(); // Col B de NewSoft o primera celda
        if (poFull && poFull !== 'CODIGO_') {
          const partExtracted = poFull.replace(/[^a-zA-Z]/g, '');
          const contratoExtracted = poFull.replace(/[a-zA-Z]/g, '');
          const estiloVal = cols[3]?.trim() || '';
          const qtyVal = parseInt(cols[11]?.trim(), 10) || parseInt(cols[4]?.trim(), 10) || 0;
          const estadoGenVal = (cols[9]?.trim() as 'AB' | 'CE') || 'AB';

          rowsToUpsert.push({
            po: poFull,
            part: partExtracted || 'A',
            contrato: contratoExtracted,
            estilo: estiloVal,
            qty: qtyVal,
            completado: false,
            estado_captura: 'CAPTURADO PARCIAL',
            estado_general: estadoGenVal,
            modificado_por: activeUser,
            updated_at: new Date().toISOString(),
          });
        }
      }
    });

    if (rowsToUpsert.length > 0) {
      const { error } = await supabase.from('wip_incompletos').insert(rowsToUpsert);
      if (!error) {
        fetchSupabaseData();
        setShowImportModal(false);
        setPastedData('');
      } else {
        alert('Error al guardar datos en Supabase: ' + error.message);
      }
    }
  };

  // Limpiar / Ocultar Registros CE
  const handleCleanCE = async () => {
    if (window.confirm('¿Desea eliminar permanentemente los registros cerrados (CE) de Supabase?')) {
      const { error } = await supabase.from('wip_incompletos').delete().eq('estado_general', 'CE');
      if (!error) fetchSupabaseData();
    }
  };

  const filteredData = data.filter(
    (item) =>
      item.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.estilo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.po.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOrdenes = data.length;
  const completadas = data.filter((d) => d.completado).length;
  const pendientes = totalOrdenes - completadas;

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans text-white p-2 md:p-4">
      {/* Panel KPI */}
      <div className="bg-[#12161f] border border-[#00f2fe]/30 rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00f2fe]/10 border border-[#00f2fe]/40 flex items-center justify-center text-[#00f2fe]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#00f2fe]">
                CONTROL WIP INCOMPLETOS (SUPABASE REALTIME)
              </h2>
              {isLiveConnected && (
                <span className="flex items-center gap-1 text-[10px] bg-[#39ff14]/15 text-[#39ff14] border border-[#39ff14]/30 px-2 py-0.5 rounded-full font-mono">
                  <Wifi className="w-3 h-3 animate-pulse" /> EN VIVO
                </span>
              )}
            </div>
            <p className="text-xs text-[#8f9ba8]">
              Órdenes del día: <span className="text-white font-bold">{totalOrdenes}</span> | Capturado:{' '}
              <span className="text-[#39ff14] font-bold">{completadas}</span> | Resta:{' '}
              <span className="text-[#ff007f] font-bold">{pendientes}</span>
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8f9ba8]" />
            <input
              type="text"
              placeholder="Buscar Contrato, Estilo o PO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0d1017] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#00f2fe]"
            />
          </div>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#39ff14]/15 border border-[#39ff14] text-[#39ff14] rounded-lg text-xs font-bold hover:bg-[#39ff14] hover:text-black transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Cargar Excel</span>
          </button>

          <button
            onClick={handleCleanCE}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#ff007f]/15 border border-[#ff007f] text-[#ff007f] rounded-lg text-xs font-bold hover:bg-[#ff007f] hover:text-white transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpiar CE</span>
          </button>

          <button
            onClick={fetchSupabaseData}
            className="p-2 bg-[#00f2fe]/15 border border-[#00f2fe] text-[#00f2fe] rounded-lg hover:bg-[#00f2fe] hover:text-black transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-[#12161f] border border-white/10 rounded-xl shadow-[0_8px_25px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0d1017] text-[#00f2fe] border-b border-white/10 uppercase font-extrabold tracking-wider">
                <th className="p-3">PO</th>
                <th className="p-3 text-center">PART</th>
                <th className="p-3 text-center">CONTRATO</th>
                <th className="p-3">ESTILO</th>
                <th className="p-3 text-center">QTY (COL E)</th>
                <th className="p-3 text-center text-[#39ff14]">PIEZAS (COL F)</th>
                <th className="p-3 text-center">CAPTURA</th>
                <th className="p-3 text-center">ESTADO DE CAPTURA</th>
                <th className="p-3 text-center">ESTADO GENERAL</th>
                <th className="p-3 text-right">AUDITORÍA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 font-mono font-bold text-white">{row.po}</td>
                  <td className="p-3 text-center font-bold text-gray-400">{row.part}</td>
                  <td className="p-3 text-center font-mono font-bold text-[#00f2fe]">{row.contrato}</td>
                  <td className="p-3 font-bold text-gray-200">{row.estilo}</td>
                  <td className="p-3 text-center font-bold text-gray-300">{row.qty}</td>
                  <td className="p-3 text-center font-black text-[#39ff14] text-sm">
                    {row.piezasTotal !== null ? row.piezasTotal : ''}
                  </td>

                  {/* Toggle Checkbox */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleStatus(row)}
                      className={`w-6 h-6 rounded border flex items-center justify-center mx-auto transition-all cursor-pointer ${
                        row.completado
                          ? 'bg-[#39ff14]/20 border-[#39ff14] text-[#39ff14] shadow-[0_0_8px_rgba(57,255,20,0.4)]'
                          : 'bg-[#0d1017] border-white/20 text-transparent hover:border-white/50'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </td>

                  <td className="p-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                        row.completado
                          ? 'bg-[#39ff14]/15 text-[#39ff14] border-[#39ff14]/30'
                          : 'bg-[#ffe600]/15 text-[#ffe600] border-[#ffe600]/30'
                      }`}
                    >
                      {row.completado ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {row.estadoCaptura}
                    </span>
                  </td>

                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.estadoGeneral === 'AB' ? 'bg-[#00f2fe]/20 text-[#00f2fe]' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {row.estadoGeneral}
                    </span>
                  </td>

                  <td className="p-3 text-right">
                    <button
                      onClick={() => setAuditingRow(row)}
                      className="text-[11px] text-[#8f9ba8] hover:text-[#00f2fe] underline flex items-center justify-end gap-1 ml-auto cursor-pointer"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>{row.modificadoPor}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Carga Excel */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12161f] border border-[#00f2fe]/40 rounded-xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#00f2fe] flex items-center gap-2">
              <Upload className="w-5 h-5" /> Importar Excel a Supabase
            </h3>
            <p className="text-xs text-[#8f9ba8]">
              Copia las celdas desde tu archivo Excel <strong className="text-white">database de contratos.xls</strong> y pégalas abajo. Se guardarán en la nube en tiempo real.
            </p>
            <textarea
              rows={8}
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              placeholder="Pega las filas de Excel aquí..."
              className="w-full bg-[#0d1017] border border-white/10 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-[#00f2fe]"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg text-xs font-bold">
                Cancelar
              </button>
              <button onClick={handleProcessImport} className="px-4 py-2 bg-[#00f2fe] text-black rounded-lg text-xs font-extrabold">
                Guardar en Supabase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Auditoría */}
      {auditingRow && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12161f] border border-[#39ff14]/40 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-[#39ff14] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Historial de Cambios (Auditoría)
            </h3>
            <div className="text-xs space-y-2 bg-[#0d1017] p-3 rounded-lg font-mono">
              <p><span className="text-[#8f9ba8]">PO:</span> {auditingRow.po}</p>
              <p><span className="text-[#8f9ba8]">Contrato:</span> {auditingRow.contrato}</p>
              <p><span className="text-[#8f9ba8]">Último Usuario:</span> <strong className="text-white">{auditingRow.modificadoPor}</strong></p>
              <p><span className="text-[#8f9ba8]">Fecha / Hora:</span> {auditingRow.fechaModificacion}</p>
            </div>
            <button onClick={() => setAuditingRow(null)} className="w-full py-2 bg-white/10 text-white rounded-lg text-xs font-bold">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestWipNativoView;
