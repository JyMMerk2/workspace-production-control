import React, { useState } from 'react';
import { wipEngineService } from '../services/wipEngineService';

type SubPestanaWip = 'ordenes-dia' | 'buscar-bp' | 'buscar-fd' | 'database-contratos';

interface OrdenItem {
  id: string;
  po: string;
  part?: string;
  contrato: string;
  qty: number;
  style: string;
  color: string;
  tipo: 'CUSTOM' | 'STOCK' | 'OTHER';
  checkShipping: boolean;  // Casilla 1: Enviar a Shipping
  checkCaptura: boolean;   // Casilla 2: Capturado en Taller (Custom)
}

export const WipStocksVendidasView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubPestanaWip>('buscar-bp');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Formulario para Agregar Nueva Orden
  const [nuevaOrden, setNuevaOrden] = useState({
    tablaTarget: 'CUSTOM BAGS',
    po: '',
    contrato: '',
    qty: 1,
    style: '',
    color: 'CUSTOM',
    tipo: 'CUSTOM' as 'CUSTOM' | 'STOCK' | 'OTHER',
  });

  // Datos reales iniciales por cada tabla
  const [tablasData, setTablasData] = useState<Record<string, OrdenItem[]>>({
    'CUSTOM BAGS': [
      { id: '1', po: '427713B', contrato: '427713', qty: 20, style: 'FD-9031', color: 'CUSTOM', tipo: 'CUSTOM', checkShipping: false, checkCaptura: true },
      { id: '2', po: '427432A', contrato: '427432', qty: 10, style: 'FD-9010', color: 'CUSTOM', tipo: 'CUSTOM', checkShipping: true, checkCaptura: true },
      { id: '3', po: '427797A', contrato: '427797', qty: 3, style: 'FD-9031', color: 'CUSTOM', tipo: 'CUSTOM', checkShipping: false, checkCaptura: false },
      { id: '4', po: '427418A', contrato: '427418', qty: 14, style: 'FD-9006', color: 'CUSTOM', tipo: 'CUSTOM', checkShipping: false, checkCaptura: true },
      { id: '5', po: '419211A', contrato: '419211', qty: 10, style: 'PS-9100', color: 'M/O/FLE', tipo: 'STOCK', checkShipping: false, checkCaptura: false },
    ],
    'SPUT 1': [
      { id: '6', po: '426281A', contrato: '426281', qty: 22, style: 'FD-9031', color: 'CUSTOM', tipo: 'CUSTOM', checkShipping: false, checkCaptura: true },
    ],
    'SPUT 2': [],
    'BIG BAG UTILITY 1': [],
    'BIG BAG UTILITY 2': [],
    'UTILITY BAG LINE 3': [],
    'LINEA 7 (CN)': [],
  });

  const lineasBP = [
    'CUSTOM BAGS',
    'SPUT 1',
    'SPUT 2',
    'BIG BAG UTILITY 1',
    'BIG BAG UTILITY 2',
    'UTILITY BAG LINE 3',
    'LINEA 7 (CN)',
  ];

  // Cálculo Global de Resumen (Banner)
  const todasLasOrdenes = Object.values(tablasData).flat();
  const totalOrders = todasLasOrdenes.length;
  const ctmOrders = todasLasOrdenes.filter(o => o.tipo === 'CUSTOM').length;
  const stockOrders = todasLasOrdenes.filter(o => o.tipo === 'STOCK').length;
  const capturados = todasLasOrdenes.filter(o => o.checkCaptura).length;
  const resta = totalOrders - capturados;

  // Manejo de Casilla 1 (Shipping)
  const handleToggleShipping = (tabla: string, id: string) => {
    setTablasData(prev => ({
      ...prev,
      [tabla]: prev[tabla].map(item =>
        item.id === id ? { ...item, checkShipping: !item.checkShipping } : item
      ),
    }));
  };

  // Manejo de Casilla 2 (Captura)
  const handleToggleCaptura = (tabla: string, id: string) => {
    setTablasData(prev => ({
      ...prev,
      [tabla]: prev[tabla].map(item =>
        item.id === id ? { ...item, checkCaptura: !item.checkCaptura } : item
      ),
    }));
  };

  // Agregar Nueva Orden
  const handleAgregarOrden = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaOrden.po) return alert('Por favor ingresa el número de PO/Contrato');

    const newItem: OrdenItem = {
      id: Date.now().toString(),
      po: nuevaOrden.po,
      contrato: nuevaOrden.contrato || nuevaOrden.po,
      qty: Number(nuevaOrden.qty) || 1,
      style: nuevaOrden.style || 'FD-STANDARD',
      color: nuevaOrden.color,
      tipo: nuevaOrden.tipo,
      checkShipping: false,
      checkCaptura: false,
    };

    setTablasData(prev => ({
      ...prev,
      [nuevaOrden.tablaTarget]: [newItem, ...(prev[nuevaOrden.tablaTarget] || [])],
    }));

    setNuevaOrden(prev => ({ ...prev, po: '', contrato: '', style: '' }));
  };

  // Eliminar Orden
  const handleEliminarOrden = (tabla: string, id: string) => {
    if (confirm('¿Eliminar esta orden de la tabla?')) {
      setTablasData(prev => ({
        ...prev,
        [tabla]: prev[tabla].filter(item => item.id !== id),
      }));
    }
  };

  return (
    <div className="w-full space-y-4 font-sans text-slate-100 px-1">
      {/* 1. Selector Superior de Sub-pestañas */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveSubTab('buscar-bp')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'buscar-bp'
              ? 'bg-[#00f2fe] text-black font-extrabold shadow-lg shadow-[#00f2fe]/20'
              : 'bg-[#121620] text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          🎒 BUSCAR BP (7 TABLAS MOCHILAS)
        </button>

        <button
          onClick={() => setActiveSubTab('buscar-fd')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'buscar-fd'
              ? 'bg-[#00f2fe] text-black font-extrabold shadow-lg shadow-[#00f2fe]/20'
              : 'bg-[#121620] text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          👕 BUSCAR FD (FULL DYE)
        </button>

        <button
          onClick={() => setActiveSubTab('ordenes-dia')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'ordenes-dia'
              ? 'bg-[#00f2fe] text-black font-extrabold shadow-lg shadow-[#00f2fe]/20'
              : 'bg-[#121620] text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          📋 ÓRDENES DEL DÍA ({totalOrders})
        </button>

        <div className="ml-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="Filtrar por PO, Contrato o Estilo..."
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

      {/* 2. Banner Azul de Resumen con métricas idénticas a la foto original */}
      <div className="w-full bg-[#121826] border border-[#00f2fe]/40 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 block">TOTAL ÓRDENES</span>
            <span className="text-xl font-black text-white">{totalOrders}</span>
          </div>

          <div className="border-l border-white/10 pl-6">
            <span className="text-[10px] uppercase tracking-wider text-[#00f2fe] block">CTM ORDERS</span>
            <span className="text-xl font-black text-[#00f2fe]">{ctmOrders}</span>
          </div>

          <div className="border-l border-white/10 pl-6">
            <span className="text-[10px] uppercase tracking-wider text-amber-400 block">STOCK ORDERS</span>
            <span className="text-xl font-black text-amber-400">{stockOrders}</span>
          </div>

          <div className="border-l border-white/10 pl-6">
            <span className="text-[10px] uppercase tracking-wider text-[#39ff14] block">CAPTURADO</span>
            <span className="text-xl font-black text-[#39ff14]">{capturados}</span>
          </div>

          <div className="border-l border-white/10 pl-6">
            <span className="text-[10px] uppercase tracking-wider text-[#ff007f] block">RESTA</span>
            <span className="text-xl font-black text-[#ff007f]">{resta}</span>
          </div>
        </div>

        {/* Formularios Rápidos para Agregar Orden */}
        <form onSubmit={handleAgregarOrden} className="flex items-center gap-2">
          <select
            value={nuevaOrden.tablaTarget}
            onChange={e => setNuevaOrden({ ...nuevaOrden, tablaTarget: e.target.value })}
            className="bg-[#0b0e14] border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white"
          >
            {lineasBP.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="PO / Contrato..."
            value={nuevaOrden.po}
            onChange={e => setNuevaOrden({ ...nuevaOrden, po: e.target.value })}
            className="bg-[#0b0e14] border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-[#00f2fe] w-32"
          />

          <input
            type="number"
            placeholder="QTY"
            value={nuevaOrden.qty}
            onChange={e => setNuevaOrden({ ...nuevaOrden, qty: Number(e.target.value) })}
            className="bg-[#0b0e14] border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white w-16 text-center"
          />

          <button
            type="submit"
            className="px-3 py-1.5 bg-[#00f2fe] hover:bg-[#00c8d4] text-black font-extrabold text-xs rounded-lg shadow-md cursor-pointer transition-all"
          >
            + Agregar Orden
          </button>
        </form>
      </div>

      {/* 3. VISTA COMPLETA 100% ANCHO CON LAS 7 TABLAS RECONFIGURADAS */}
      {activeSubTab === 'buscar-bp' && (
        <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-6">
          {lineasBP.map(linea => {
            const filas = (tablasData[linea] || []).filter(
              f =>
                f.po.includes(searchTerm) ||
                f.style.toLowerCase().includes(searchTerm.toLowerCase()) ||
                f.color.toLowerCase().includes(searchTerm.toLowerCase())
            );

            const totalPiezas = filas.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);

            return (
              <div
                key={linea}
                className="w-full bg-[#121826] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between"
              >
                <div>
                  {/* Header de la Tabla */}
                  <div className="bg-[#0b0e14] px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-[#39ff14] text-sm tracking-wide flex items-center gap-2">
                        📑 {linea}
                      </h3>
                      <span className="text-[10px] text-gray-400">
                        {filas.length} Órdenes | {totalPiezas} Piezas Acumuladas
                      </span>
                    </div>

                    <button
                      onClick={() => alert(`🚚 Enviando tabla ${linea} a Shipping`)}
                      className="px-3 py-1.5 bg-[#00f2fe]/15 hover:bg-[#00f2fe] hover:text-black border border-[#00f2fe]/50 text-[#00f2fe] text-xs font-extrabold rounded-lg transition-all cursor-pointer"
                    >
                      🚚 Enviar a Shipping
                    </button>
                  </div>

                  {/* Tabla con Doble Casilla exactas */}
                  <div className="p-2 overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-[#0b0e14]/60 text-gray-400 border-b border-white/10 font-bold uppercase text-[11px]">
                          <th className="p-2.5">PO / Contrato</th>
                          <th className="p-2.5 text-center">QTY</th>
                          <th className="p-2.5">Estilo</th>
                          <th className="p-2.5">Color</th>
                          <th className="p-2.5 text-center">Tipo</th>
                          <th className="p-2.5 text-center bg-blue-950/40 text-blue-300">1. ENV (Shipping)</th>
                          <th className="p-2.5 text-center bg-emerald-950/40 text-emerald-300">2. CAPTURA (Custom)</th>
                          <th className="p-2.5 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filas.length > 0 ? (
                          filas.map(f => (
                            <tr key={f.id} className="hover:bg-white/5 transition-colors">
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

                              {/* Casilla 1: ENV (Shipping) */}
                              <td className="p-2.5 text-center bg-blue-950/20">
                                <input
                                  type="checkbox"
                                  checked={f.checkShipping}
                                  onChange={() => handleToggleShipping(linea, f.id)}
                                  className="w-4 h-4 accent-[#00f2fe] cursor-pointer"
                                />
                              </td>

                              {/* Casilla 2: CAPTURA (Custom / Taller) */}
                              <td className="p-2.5 text-center bg-emerald-950/20">
                                <input
                                  type="checkbox"
                                  checked={f.checkCaptura}
                                  onChange={() => handleToggleCaptura(linea, f.id)}
                                  className="w-4 h-4 accent-[#39ff14] cursor-pointer"
                                />
                              </td>

                              {/* Acción: Eliminar */}
                              <td className="p-2.5 text-center">
                                <button
                                  onClick={() => handleEliminarOrden(linea, f.id)}
                                  className="p-1 text-red-400 hover:bg-red-500/10 rounded cursor-pointer transition-all"
                                  title="Eliminar esta orden"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="p-6 text-center text-gray-500 italic text-xs">
                              Sin órdenes registradas en {linea}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-[#0b0e14] px-4 py-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                  <span>Envíos Listos: <strong className="text-[#00f2fe]">{filas.filter(f => f.checkShipping).length}</strong></span>
                  <span>Capturados: <strong className="text-[#39ff14]">{filas.filter(f => f.checkCaptura).length}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WipStocksVendidasView;
