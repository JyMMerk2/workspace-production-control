  import React, { useState } from 'react';
import { Search, RefreshCw, CheckCircle2, Clock, Database } from 'lucide-react';

// Datos de prueba idénticos a la hoja de Google Sheets (PO, Contrato, Estilo, Piezas, Estado)
const INITIAL_WIP_DATA = [
  { id: '1', po: '426782a', part: 'A', contrato: '426782', estilo: 'FD-500G', piezas: 3, completado: true, estado: 'CAPTURADO COMPLETO', linea: 'AB' },
  { id: '2', po: '426782b', part: 'B', contrato: '426782', estilo: 'FD-500W', piezas: 3, completado: true, estado: 'CAPTURADO COMPLETO', linea: 'AB' },
  { id: '3', po: '426782c', part: 'C', contrato: '426782', estilo: 'FD-872', piezas: 1, completado: true, estado: 'CAPTURADO COMPLETO', linea: 'AB' },
  { id: '4', po: '426782d', part: 'D', contrato: '426782', estilo: 'FD-872Y', piezas: 2, completado: true, estado: 'CAPTURADO COMPLETO', linea: 'AB' },
  { id: '5', po: '426786B', part: 'B', contrato: '426786', estilo: 'FD-4416W', piezas: 3, completado: false, estado: 'CAPTURADO PARCIAL', linea: 'AB' },
  { id: '6', po: '426786A', part: 'A', contrato: '426786', estilo: 'FD-4416G', piezas: 8, completado: false, estado: 'CAPTURADO PARCIAL', linea: 'AB' },
  { id: '7', po: '426788a', part: 'A', contrato: '426788', estilo: 'FD-9030', piezas: 2, completado: false, estado: 'CAPTURADO PARCIAL', linea: 'AB' },
  { id: '8', po: '426815A', part: 'A', contrato: '426815', estilo: 'FD-9030', piezas: 3, completado: true, estado: 'CAPTURADO COMPLETO', linea: 'AB' },
];

export const TestWipNativoView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState(INITIAL_WIP_DATA);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtrado dinámico por Contrato, Estilo o PO
  const filteredData = data.filter(
    (item) =>
      item.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.estilo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.po.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Simulación de re-sincronización instantánea
  const handleSync = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  // Alternar estado con clic directo
  const toggleStatus = (id: string) => {
    setData((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.completado;
          return {
            ...item,
            completado: nextState,
            estado: nextState ? 'CAPTURADO COMPLETO' : 'CAPTURADO PARCIAL',
          };
        }
        return item;
      })
    );
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto font-sans text-white p-2 md:p-4">
      {/* Encabezado Neón de Control */}
      <div className="bg-[#12161f] border border-[#00f2fe]/30 rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00f2fe]/10 border border-[#00f2fe]/40 flex items-center justify-center text-[#00f2fe]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#00f2fe]">
              CONTROL WIP INCOMPLETOS (VISTA PRUEBA NATI)
            </h2>
            <p className="text-xs text-[#8f9ba8]">
              Órdenes del día: <span className="text-white font-bold">128</span> | Capturado:{' '}
              <span className="text-[#39ff14] font-bold">30</span> | Resta:{' '}
              <span className="text-[#ff007f] font-bold">98</span>
            </p>
          </div>
        </div>

        {/* Buscador y Botón de Recarga */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8f9ba8]" />
            <input
              type="text"
              placeholder="Buscar por Contrato, Estilo o PO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0d1017] border border-white/10 rounded-lg text-xs text-white placeholder-[#5f6e7d] focus:outline-none focus:border-[#00f2fe] transition-all"
            />
          </div>

          <button
            onClick={handleSync}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#00f2fe]/15 border border-[#00f2fe] text-[#00f2fe] text-xs font-bold hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sincronizar API</span>
          </button>
        </div>
      </div>

      {/* Tabla Estilizada Nativa */}
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
                <th className="p-3 text-center">ESTADO GENERAL</th>
                <th className="p-3 text-right">LÍNEA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-white/5 transition-colors group cursor-pointer"
                  onClick={() => toggleStatus(row.id)}
                >
                  <td className="p-3 font-mono font-bold text-white">{row.po}</td>
                  <td className="p-3 text-center font-bold text-gray-400">{row.part}</td>
                  <td className="p-3 text-center font-mono font-bold text-[#00f2fe]">
                    {row.contrato}
                  </td>
                  <td className="p-3 font-bold text-gray-200">{row.estilo}</td>
                  <td className="p-3 text-center font-black text-white">{row.piezas}</td>
                  
                  {/* Checkbox de Captura */}
                  <td className="p-3 text-center">
                    <button
                      className={`w-6 h-6 rounded border flex items-center justify-center mx-auto transition-all ${
                        row.completado
                          ? 'bg-[#39ff14]/20 border-[#39ff14] text-[#39ff14] shadow-[0_0_8px_rgba(57,255,20,0.4)]'
                          : 'bg-[#0d1017] border-white/20 text-transparent hover:border-white/50'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </td>

                  {/* Insignia de Estado */}
                  <td className="p-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide border ${
                        row.completado
                          ? 'bg-[#39ff14]/15 text-[#39ff14] border-[#39ff14]/30'
                          : 'bg-[#ffe600]/15 text-[#ffe600] border-[#ffe600]/30'
                      }`}
                    >
                      {row.completado ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {row.estado}
                    </span>
                  </td>

                  <td className="p-3 text-right font-bold text-gray-400">{row.linea}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pie de tabla */}
        <div className="p-3 bg-[#0d1017] border-t border-white/5 flex items-center justify-between text-[11px] text-[#5f6e7d]">
          <span>Mostrando {filteredData.length} registros</span>
          <span className="text-[#39ff14] font-mono">
            ● Sin dependencia de cuenta de Google
          </span>
        </div>
      </div>
    </div>
  );
};

export default TestWipNativoView;
