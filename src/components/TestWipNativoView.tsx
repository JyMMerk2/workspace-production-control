import React, { useState } from 'react';
import { Search, RefreshCw, CheckCircle2, Clock, Database, Upload, Trash2, UserCheck, ShieldAlert } from 'lucide-react';

interface WipRow {
  id: string;
  po: string;
  part: string;
  contrato: string;
  estilo: string;
  piezas: number;
  completado: boolean;
  estadoCaptura: 'CAPTURADO COMPLETO' | 'CAPTURADO PARCIAL';
  estadoGeneral: 'AB' | 'CE';
  modificadoPor: string;
  fechaModificacion: string;
}

const INITIAL_WIP_DATA: WipRow[] = [
  { id: '1', po: '426782a', part: 'A', contrato: '426782', estilo: 'FD-500G', piezas: 3, completado: true, estadoCaptura: 'CAPTURADO COMPLETO', estadoGeneral: 'AB', modificadoPor: 'JMERCADO', fechaModificacion: '04/09/2026 10:30 AM' },
  { id: '2', po: '426782b', part: 'B', contrato: '426782', estilo: 'FD-500W', piezas: 3, completado: true, estadoCaptura: 'CAPTURADO COMPLETO', estadoGeneral: 'AB', modificadoPor: 'JMERCADO', fechaModificacion: '04/09/2026 10:30 AM' },
  { id: '3', po: '426782c', part: 'C', contrato: '426782', estilo: 'FD-872', piezas: 1, completado: false, estadoCaptura: 'CAPTURADO PARCIAL', estadoGeneral: 'AB', modificadoPor: 'SISTEMA', fechaModificacion: '04/09/2026 08:00 AM' },
  { id: '4', po: '426782d', part: 'D', contrato: '426782', estilo: 'FD-872Y', piezas: 2, completado: true, estadoCaptura: 'CAPTURADO COMPLETO', estadoGeneral: 'AB', modificadoPor: 'JMERCADO', fechaModificacion: '04/09/2026 10:31 AM' },
  { id: '5', po: '426786B', part: 'B', contrato: '426786', estilo: 'FD-4416W', piezas: 3, completado: false, estadoCaptura: 'CAPTURADO PARCIAL', estadoGeneral: 'AB', modificadoPor: 'OPERADOR2', fechaModificacion: '04/09/2026 09:15 AM' },
  { id: '6', po: '426786A', part: 'A', contrato: '426786', estilo: 'FD-4416G', piezas: 8, completado: false, estadoCaptura: 'CAPTURADO PARCIAL', estadoGeneral: 'AB', modificadoPor: 'OPERADOR2', fechaModificacion: '04/09/2026 09:15 AM' },
  { id: '7', po: '426788a', part: 'A', contrato: '426788', estilo: 'FD-9030', piezas: 2, completado: false, estadoCaptura: 'CAPTURADO PARCIAL', estadoGeneral: 'CE', modificadoPor: 'SUPERVISOR', fechaModificacion: '03/09/2026 05:00 PM' },
];

export const TestWipNativoView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<WipRow[]>(INITIAL_WIP_DATA);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pastedData, setPastedData] = useState('');
  const [auditingRow, setAuditingRow] = useState<WipRow | null>(null);
  const [transferredContracts, setTransferredContracts] = useState<string[]>([]);

  const activeUser = sessionStorage.getItem('authenticated_user') || 'JMERCADO';

  const filteredData = data.filter(
    (item) =>
      item.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.estilo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.po.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOrdenes = data.length;
  const completadas = data.filter((d) => d.completado).length;
  const pendientes = totalOrdenes - completadas;

  // Evaluar si todas las partes del contrato están completas y simular transferencia
  const checkAndTransferContract = (contratoId: string, currentDataset: WipRow[]) => {
    const sameContractRows = currentDataset.filter((r) => r.contrato === contratoId);
    const allCompleted = sameContractRows.length > 0 && sameContractRows.every((r) => r.completado);

    if (allCompleted && !transferredContracts.includes(contratoId)) {
      setTransferredContracts((prev) => [...prev, contratoId]);
      alert(`⚡ ¡CONTRATO COMPLETO! El contrato ${contratoId} ha completado todas sus partes y ha sido transferido automáticamente a "WIP Stocks & Vendidas" (Columna A).`);
    }
  };

  const toggleStatus = (id: string) => {
    let updatedContrato = '';
    let nextDataset: WipRow[] = [];

    setData((prev) => {
      nextDataset = prev.map((item) => {
        if (item.id === id) {
          updatedContrato = item.contrato;
          const nextState = !item.completado;
          return {
            ...item,
            completado: nextState,
            estadoCaptura: nextState ? 'CAPTURADO COMPLETO' : 'CAPTURADO PARCIAL',
            modificadoPor: activeUser,
            fechaModificacion: new Date().toLocaleString(),
          };
        }
        return item;
      });
      return nextDataset;
    });

    if (updatedContrato) {
      setTimeout(() => checkAndTransferContract(updatedContrato, nextDataset), 100);
    }
  };

  const handleCleanCE = () => {
    if (window.confirm('¿Desea limpiar/ocultar todos los registros con ESTADO GENERAL "CE" (Cerrados)?')) {
      setData((prev) => prev.filter((item) => item.estadoGeneral !== 'CE'));
    }
  };

  const handleProcessPastedData = () => {
    if (!pastedData.trim()) return;
    const lines = pastedData.trim().split('\n');
    const newRows: WipRow[] = lines.map((line, idx) => {
      const cols = line.split('\t');
      return {
        id: `imported-${Date.now()}-${idx}`,
        po: cols[0] || `PO-${idx}`,
        part: cols[1] || 'A',
        contrato: cols[2] || 'CONTRATO-NEW',
        estilo: cols[3] || 'ESTILO-GENERICO',
        piezas: parseInt(cols[4], 10) || 1,
        completado: false,
        estadoCaptura: 'CAPTURADO PARCIAL',
        estadoGeneral: (cols[5] as 'AB' | 'CE') || 'AB',
        modificadoPor: activeUser,
        fechaModificacion: new Date().toLocaleString(),
      };
    });

    setData((prev) => [...newRows, ...prev]);
    setPastedData('');
    setShowImportModal(false);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans text-white p-2 md:p-4">
      {/* Panel Superior KPI */}
      <div className="bg-[#12161f] border border-[#00f2fe]/30 rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00f2fe]/10 border border-[#00f2fe]/40 flex items-center justify-center text-[#00f2fe]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#00f2fe]">
              CONTROL WIP INCOMPLETOS (SISTEMA NATIVO EN VIVO)
            </h2>
            <p className="text-xs text-[#8f9ba8]">
              Órdenes del día: <span className="text-white font-bold">{totalOrdenes}</span> | Capturado:{' '}
              <span className="text-[#39ff14] font-bold">{completadas}</span> | Resta:{' '}
              <span className="text-[#ff007f] font-bold">{pendientes}</span>
            </p>
          </div>
        </div>

        {/* Acciones y Búsqueda */}
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
            onClick={() => { setIsRefreshing(true); setTimeout(() => setIsRefreshing(false), 500); }}
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
                <th className="p-3 text-center">QTY (PIEZAS)</th>
                <th className="p-3 text-center">CAPTURA</th>
                <th className="p-3 text-center">ESTADO DE CAPTURA</th>
                <th className="p-3 text-center">ESTADO GENERAL</th>
                <th className="p-3 text-right">AUDITORÍA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-3 font-mono font-bold text-white">{row.po}</td>
                  <td className="p-3 text-center font-bold text-gray-400">{row.part}</td>
                  <td className="p-3 text-center font-mono font-bold text-[#00f2fe]">{row.contrato}</td>
                  <td className="p-3 font-bold text-gray-200">{row.estilo}</td>
                  <td className="p-3 text-center font-black text-white">{row.piezas}</td>

                  {/* Toggle Checkbox */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleStatus(row.id)}
                      className={`w-6 h-6 rounded border flex items-center justify-center mx-auto transition-all cursor-pointer ${
                        row.completado
                          ? 'bg-[#39ff14]/20 border-[#39ff14] text-[#39ff14] shadow-[0_0_8px_rgba(57,255,20,0.4)]'
                          : 'bg-[#0d1017] border-white/20 text-transparent hover:border-white/50'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </td>

                  {/* Estado de Captura */}
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

                  {/* Estado General (AB / CE) */}
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.estadoGeneral === 'AB'
                          ? 'bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {row.estadoGeneral}
                    </span>
                  </td>

                  {/* Historial Auditoría */}
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

        <div className="p-3 bg-[#0d1017] border-t border-white/5 flex items-center justify-between text-[11px] text-[#5f6e7d]">
          <span>Mostrando {filteredData.length} registros</span>
          <span className="text-[#39ff14] font-mono">● Conexión WebSocket Realtime Lista</span>
        </div>
      </div>

      {/* Modal para Cargar o Pegar Excel */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12161f] border border-[#00f2fe]/40 rounded-xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#00f2fe] flex items-center gap-2">
              <Upload className="w-5 h-5" /> Importar / Pegar desde Excel
            </h3>
            <p className="text-xs text-[#8f9ba8]">
              Copia las celdas desde tu archivo Excel y pégalas directamente en el cuadro de abajo (Formato: PO, PART, CONTRATO, ESTILO, QTY, ESTADO GENERAL).
            </p>
            <textarea
              rows={6}
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              placeholder="Pega las filas aquí desde Excel..."
              className="w-full bg-[#0d1017] border border-white/10 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-[#00f2fe]"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg text-xs font-bold hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcessPastedData}
                className="px-4 py-2 bg-[#00f2fe] text-black rounded-lg text-xs font-extrabold hover:bg-[#00f2fe]/80"
              >
                Procesar e Insertar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Auditoría de Cambios */}
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
            <button
              onClick={() => setAuditingRow(null)}
              className="w-full py-2 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestWipNativoView;
