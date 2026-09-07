import React, { useState } from 'react';
import { wipEngineService } from '../services/wipEngineService';

type SubPestanaWip = 'buscar-bp' | 'buscar-fd' | 'ordenes-dia' | 'incompletas';

export const WipStocksVendidasView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubPestanaWip>('buscar-bp');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Mapeo de las 7 líneas de BP con sus referencias originales
  const lineasBP = [
    { id: 1, nombre: '1. CUSTOM BAGS', rCust: 'J1:M1', rOtr: 'J2:L2' },
    { id: 2, nombre: '2. SPUT 1', rCust: 'X1:AA1', rOtr: 'X2:Z2' },
    { id: 3, nombre: '3. SPUT 2', rCust: 'AL1:AO1', rOtr: 'AL2:AN2' },
    { id: 4, nombre: '4. BIG BAG UTILITY 1', rCust: 'AZ1:BC1', rOtr: 'AZ2:BB2' },
    { id: 5, nombre: '5. BIG BAG UTILITY 2', rCust: 'BN1:BQ1', rOtr: 'BN2:BP2' },
    { id: 6, nombre: '6. UTILITY BAG LINE 3', rCust: 'CB1:CE1', rOtr: 'CB2:CD2' },
    { id: 7, nombre: '7. LINEA 7 (CN)', rCust: 'CB1:CE1', rOtr: 'CB2:CD2' },
  ];

  // Mapeo de las 7 celdas/líneas de FD
  const lineasFD = [
    { id: 1, nombre: '1. FULL DYE CELDA 1' },
    { id: 2, nombre: '2. FULL DYE CELDA 2' },
    { id: 3, nombre: '3. FULL DYE CELDA 3' },
    { id: 4, nombre: '4. FULL DYE CELDA 4' },
    { id: 5, nombre: '5. PANTS LINE 1' },
    { id: 6, nombre: '6. PANTS LINE 2' },
    { id: 7, nombre: '7. HATS LINE' },
  ];

  // Datos extendidos de prueba por cada tarjeta
  const [datosBPData, setDatosBPData] = useState<Record<string, any[]>>({
    '1. CUSTOM BAGS': [
      { po: '398210', qty: 50, style: 'BP-9010', color: 'NAVY/WHITE', tipo: 'CUSTOM', check: false, estado: 'CAPTURADO PARCIAL' },
      { po: '398211', qty: 25, style: 'BP-9012', color: 'BLACK', tipo: 'CUSTOM', check: true, estado: 'CAPTURADO COMPLETO' },
    ],
    '2. SPUT 1': [
      { po: '412001', qty: 10, style: 'SPUT-01', color: 'RED', tipo: 'STANDARD', check: false, estado: 'CAPTURADO PARCIAL' },
    ],
    '3. SPUT 2': [],
    '4. BIG BAG UTILITY 1': [
      { po: '415090', qty: 100, style: 'BBU-100', color: 'ROYAL BLUE', tipo: 'CUSTOM', check: false, estado: 'CAPTURADO PARCIAL' },
    ],
    '5. BIG BAG UTILITY 2': [],
    '6. UTILITY BAG LINE 3': [],
    '7. LINEA 7 (CN)': [],
  });

  const handleToggleCheck = (nombreTabla: string, index: number) => {
    setDatosBPData(prev => {
      const lista = [...(prev[nombreTabla] || [])];
      if (lista[index]) {
        lista[index].check = !lista[index].check;
        lista[index].estado = lista[index].check ? 'CAPTURADO COMPLETO' : 'CAPTURADO PARCIAL';
      }
      return { ...prev, [nombreTabla]: lista };
    });
  };

  const handleEnviarTabla = async (nombreTabla: string) => {
    alert(`🚚 Procesando envío a Shipping para: ${nombreTabla}`);
  };

  return (
    <div className="space-y-5 font-sans text-slate-100">
      {/* 1. Sub-pestañas superiores */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveSubTab('buscar-bp')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'buscar-bp'
              ? 'bg-[#00f2fe] text-black font-extrabold shadow-lg shadow-[#00f2fe]/20'
              : 'bg-[#121620] text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          🎒 BUSCAR BP (7 TABLAS GRANDES)
        </button>

        <button
          onClick={() => setActiveSubTab('buscar-fd')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'buscar-fd'
              ? 'bg-[#00f2fe] text-black font-extrabold shadow-lg shadow-[#00f2fe]/20'
              : 'bg-[#121620] text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          👕 BUSCAR FD (7 CELDAS GRANDES)
        </button>

        <button
          onClick={() => setActiveSubTab('ordenes-dia')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'ordenes-dia'
              ? 'bg-[#00f2fe] text-black font-extrabold shadow-lg shadow-[#00f2fe]/20'
              : 'bg-[#121620] text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          📋 ÓRDENES DEL DÍA
        </button>

        <div className="ml-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="Filtrar por PO, Estilo o Color..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-[#0b0e14] border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2fe] w-72"
          />

          <button
            onClick={() => wipEngineService.limpiarFilasCompletas('BUSCAR_BP')}
            className="px-3 py-1.5 bg-[#39ff14]/20 border border-[#39ff14]/40 text-[#39ff14] hover:bg-[#39ff14] hover:text-black font-extrabold text-xs rounded-lg transition-all cursor-pointer"
          >
            🧹 Limpiar Completas
          </button>
        </div>
      </div>

      {/* 2. VISTA DETALLADA BUSCAR BP EN TARJETAS DE GRAN TAMAÑO */}
      {activeSubTab === 'buscar-bp' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {lineasBP.map(linea => {
            const filas = (datosBPData[linea.nombre] || []).filter(
              f =>
                f.po.includes(searchTerm) ||
                f.style.toLowerCase().includes(searchTerm.toLowerCase()) ||
                f.color.toLowerCase().includes(searchTerm.toLowerCase())
            );

            const totalPiezas = filas.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);

            return (
              <div
                key={linea.id}
                className="bg-[#121826] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between"
              >
                {/* Encabezado Superior de Tarjeta */}
                <div>
                  <div className="bg-[#0b0e14] px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-[#39ff14] text-sm tracking-wide">
                        {linea.nombre}
                      </h3>
                      <p className="text-[10px] text-gray-400">
                        Configuración de Rango: Cust [{linea.rCust}]
                      </p>
                    </div>

                    <button
                      onClick={() => handleEnviarTabla(linea.nombre)}
                      className="px-3 py-1.5 bg-[#00f2fe]/15 hover:bg-[#00f2fe] hover:text-black border border-[#00f2fe]/50 text-[#00f2fe] text-xs font-extrabold rounded-lg transition-all cursor-pointer shadow-md"
                    >
                      🚚 Enviar Tabla a Shipping
                    </button>
                  </div>

                  {/* Tabla Principal Interna con Datos Completos */}
                  <div className="p-3 overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-[#0b0e14]/60 text-gray-400 border-b border-white/10 font-bold uppercase text-[11px]">
                          <th className="p-2.5">PO / Orden</th>
                          <th className="p-2.5 text-center">QTY</th>
                          <th className="p-2.5">Estilo</th>
                          <th className="p-2.5">Color</th>
                          <th className="p-2.5 text-center">Tipo</th>
                          <th className="p-2.5 text-center">Estatus</th>
                          <th className="p-2.5 text-center">ENV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filas.length > 0 ? (
                          filas.map((f, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                              <td className="p-2.5 font-mono font-bold text-[#00f2fe]">{f.po}</td>
                              <td className="p-2.5 text-center font-mono font-bold text-white">{f.qty}</td>
                              <td className="p-2.5 font-mono text-gray-300">{f.style}</td>
                              <td className="p-2.5 text-gray-300">{f.color}</td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  f.tipo === 'CUSTOM' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}>
                                  {f.tipo}
                                </span>
                              </td>
                              <td className="p-2.5 text-center">
                                {f.check ? (
                                  <span className="px-2 py-0.5 rounded bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/30 text-[10px] font-bold">
                                    COMPLETO
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                    PARCIAL
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={f.check}
                                  onChange={() => handleToggleCheck(linea.nombre, idx)}
                                  className="w-4 h-4 accent-[#39ff14] cursor-pointer"
                                />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-gray-500 italic text-xs">
                              Sin órdenes activas en {linea.nombre}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pie de la Tarjeta con Totales */}
                <div className="bg-[#0b0e14] px-4 py-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                  <span>Órdenes: <strong className="text-white">{filas.length}</strong></span>
                  <span>Total Piezas: <strong className="text-[#39ff14] font-mono">{totalPiezas}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. VISTA PARA BUSCAR FD */}
      {activeSubTab === 'buscar-fd' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {lineasFD.map(linea => (
            <div
              key={linea.id}
              className="bg-[#121826] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between"
            >
              <div className="bg-[#0b0e14] px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-black text-[#ff007f] text-sm tracking-wide">
                  {linea.nombre}
                </h3>
                <button
                  onClick={() => handleEnviarTabla(linea.nombre)}
                  className="px-3 py-1.5 bg-[#ff007f]/15 hover:bg-[#ff007f] hover:text-white border border-[#ff007f]/50 text-[#ff007f] text-xs font-extrabold rounded-lg transition-all cursor-pointer shadow-md"
                >
                  🚚 Enviar Tabla a Shipping
                </button>
              </div>

              <div className="p-3">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0b0e14]/60 text-gray-400 border-b border-white/10 font-bold uppercase text-[11px]">
                      <th className="p-2.5">Contrato / FD</th>
                      <th className="p-2.5 text-center">QTY</th>
                      <th className="p-2.5">Estilo</th>
                      <th className="p-2.5">Color</th>
                      <th className="p-2.5 text-center">ENV</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-500 italic text-xs">
                        Sin órdenes en {linea.nombre}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-[#0b0e14] px-4 py-2 border-t border-white/10 text-xs text-gray-400 text-right">
                Total Registros: <strong className="text-white">0</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WipStocksVendidasView;
