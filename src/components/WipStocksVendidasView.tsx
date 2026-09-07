import React, { useState } from 'react';
import { wipEngineService } from '../services/wipEngineService';

type SubPestanaWip = 'buscar-bp' | 'buscar-fd' | 'ordenes-dia' | 'database-contratos';

interface OrdenReal {
  id: string;
  po: string;
  qty: number;
  style: string;
  color: string;
  contrato: string;
  ed: number;
  pc: number;
  fecha: string;
  checkEnv: boolean;      // Casilla L (Shipping)
  checkCustom: boolean;   // Casilla M (Custom/Taller)
  estadoTexto?: string;
}

export const WipStocksVendidasView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubPestanaWip>('buscar-bp');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Formulario Agregar Orden
  const [nuevaOrden, setNuevaOrden] = useState({
    po: '',
    qty: 10,
    style: 'FD-9031',
    color: 'CUSTOM',
  });

  // Datos 100% reales extraídos del Spreadsheet en vivo (Foto de la derecha)
  const [ordenesCustomBags, setOrdenesCustomBags] = useState<OrdenReal[]>([
    { id: '1', po: '427713', qty: 20, style: 'FD-9031', color: 'CUSTOM', contrato: '427713B', ed: 0, pc: 20, fecha: '7-sep', checkEnv: false, checkCustom: false },
    { id: '2', po: '427432', qty: 10, style: 'FD-9010', color: 'CUSTOM', contrato: '427432A', ed: 0, pc: 10, fecha: '', checkEnv: false, checkCustom: false },
    { id: '3', po: '427797', qty: 3, style: 'FD-9031', color: 'CUSTOM', contrato: '427797A', ed: 0, pc: 3, fecha: '', checkEnv: false, checkCustom: false },
    { id: '4', po: '427418', qty: 14, style: 'FD-9006', color: 'CUSTOM', contrato: '427418A', ed: 0, pc: 14, fecha: '', checkEnv: false, checkCustom: false },
    { id: '5', po: '427769', qty: 1, style: 'FD-9031', color: 'CUSTOM', contrato: '427769B', ed: 0, pc: 1, fecha: '', checkEnv: false, checkCustom: false },
    { id: '6', po: '419211', qty: 10, style: 'PS-9100', color: 'M/O/FLE', contrato: '419211A', ed: 0, pc: 10, fecha: '', checkEnv: false, checkCustom: false },
    { id: '7', po: '419217', qty: 10, style: 'PS-9100', color: 'TL/N/HCR', contrato: '419217A', ed: 10, pc: 0, fecha: '', checkEnv: true, checkCustom: true, estadoTexto: 'ENTREGADO A SHIPPING' },
    { id: '8', po: '427685', qty: 14, style: 'FD-9047', color: 'CUSTOM', contrato: '427685A', ed: 0, pc: 14, fecha: '', checkEnv: false, checkCustom: false },
    { id: '9', po: '426281', qty: 22, style: 'FD-9031', color: 'CUSTOM', contrato: '426281A', ed: 0, pc: 22, fecha: '', checkEnv: false, checkCustom: false },
    { id: '10', po: '419213', qty: 10, style: 'PS-9100', color: 'CB/FLPK', contrato: '419213a', ed: 10, pc: 0, fecha: '', checkEnv: true, checkCustom: true, estadoTexto: 'ENTREGADO A SHIPPING' },
    { id: '11', po: '419216', qty: 10, style: 'PS-9100', color: 'RB/RD', contrato: '419216a', ed: 10, pc: 0, fecha: '', checkEnv: true, checkCustom: true, estadoTexto: 'ENTREGADO A SHIPPING' },
    { id: '12', po: '419215', qty: 10, style: 'PS-9100', color: 'PU/PK/BPU', contrato: '419215a', ed: 10, pc: 0, fecha: '', checkEnv: true, checkCustom: true, estadoTexto: 'ENTREGADO A SHIPPING' },
  ]);

  // Lista lateral "Ordenes del dia" (Columna Q de la foto derecha)
  const ordenesDelDiaColQ = [
    '424191', '426846', '426847', '426850', '426773', '427383', '427828',
    '427821', '427713', '427622', '427703', '427765', '428864'
  ];

  // Alternar Casilla ENV
  const handleToggleEnv = (id: string) => {
    setOrdenesCustomBags(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newEnv = !item.checkEnv;
          return {
            ...item,
            checkEnv: newEnv,
            estadoTexto: newEnv ? 'ENTREGADO A SHIPPING' : undefined
          };
        }
        return item;
      })
    );
  };

  // Alternar Casilla Custom (Captura)
  const handleToggleCustom = (id: string) => {
    setOrdenesCustomBags(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checkCustom: !item.checkCustom } : item
      )
    );
  };

  // Agregar Orden
  const handleAgregar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaOrden.po) return;

    const nueva: OrdenReal = {
      id: Date.now().toString(),
      po: nuevaOrden.po,
      qty: nuevaOrden.qty,
      style: nuevaOrden.style,
      color: nuevaOrden.color,
      contrato: nuevaOrden.po + 'A',
      ed: 0,
      pc: nuevaOrden.qty,
      fecha: '7-sep',
      checkEnv: false,
      checkCustom: false,
    };

    setOrdenesCustomBags(prev => [nueva, ...prev]);
    setNuevaOrden({ po: '', qty: 10, style: 'FD-9031', color: 'CUSTOM' });
  };

  // Eliminar Orden
  const handleEliminar = (id: string) => {
    setOrdenesCustomBags(prev => prev.filter(o => o.id !== id));
  };

  const totalPiezasOrders = ordenesCustomBags.reduce((a, b) => a + b.qty, 0);
  const totalCustomContratos = ordenesCustomBags.length;

  return (
    <div className="w-full space-y-4 font-sans text-slate-100 p-2">
      {/* Selector de Sub-pestañas */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('buscar-bp')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'buscar-bp'
              ? 'bg-[#00f2fe] text-black font-extrabold shadow-lg'
              : 'bg-[#121620] text-gray-400 hover:text-white'
          }`}
        >
          🎒 BUSCAR BP
        </button>

        <button
          onClick={() => setActiveSubTab('buscar-fd')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'buscar-fd'
              ? 'bg-[#00f2fe] text-black font-extrabold shadow-lg'
              : 'bg-[#121620] text-gray-400 hover:text-white'
          }`}
        >
          👕 BUSCAR FD
        </button>

        <button
          onClick={() => setActiveSubTab('ordenes-dia')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'ordenes-dia'
              ? 'bg-[#00f2fe] text-black font-extrabold shadow-lg'
              : 'bg-[#121620] text-gray-400 hover:text-white'
          }`}
        >
          📋 ÓRDENES DEL DÍA
        </button>

        <div className="ml-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="Filtrar PO / Contrato..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-[#0b0e14] border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2fe] w-60"
          />
        </div>
      </div>

      {/* Banner de Control Superior */}
      <div className="bg-[#121826] border border-[#00f2fe]/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-xs font-bold">
          <div>Ordenes del día: <span className="text-[#00f2fe]">162</span></div>
          <div>CAPTURADO: <span className="text-[#39ff14]">42</span></div>
          <div>RESTA: <span className="text-[#ff007f]">120</span></div>
        </div>

        {/* Formulario Agregar Orden */}
        <form onSubmit={handleAgregar} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="PO / Contrato..."
            value={nuevaOrden.po}
            onChange={e => setNuevaOrden({ ...nuevaOrden, po: e.target.value })}
            className="bg-[#0b0e14] border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white w-28"
          />
          <input
            type="number"
            placeholder="QTY"
            value={nuevaOrden.qty}
            onChange={e => setNuevaOrden({ ...nuevaOrden, qty: Number(e.target.value) })}
            className="bg-[#0b0e14] border border-white/20 rounded-lg px-2 py-1 text-xs text-white w-16 text-center"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-[#00f2fe] hover:bg-[#00c8d4] text-black font-extrabold text-xs rounded-lg cursor-pointer"
          >
            + Agregar Orden
          </button>
        </form>
      </div>

      {/* REPLICA EXACTA DEL SPREADSHEET (FOTO DERECHA) */}
      <div className="grid grid-cols-1 2xl:grid-cols-4 gap-4">
        {/* TABLA PRINCIPAL PARALELA (3 Columnas de Ancho) */}
        <div className="2xl:col-span-3 bg-[#0d1117] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                {/* Fila Encabezado Azul de Secciones */}
                <tr className="bg-blue-700 text-white font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="p-2 border-r border-blue-600">Orders ({ordenesCustomBags.length})</th>
                  <th colSpan={4} className="p-2 border-r border-blue-600 text-center">
                    DATOS QUE VAN PARA EL SHIPPING
                  </th>
                  <th colSpan={4} className="p-2 border-r border-blue-600 text-center bg-blue-900">
                    CUSTOM ({totalCustomContratos})
                  </th>
                  <th className="p-2 text-center bg-blue-950">ENV</th>
                  <th className="p-2 text-center bg-blue-950">ACCION</th>
                </tr>

                {/* Sub-Encabezado de Columnas */}
                <tr className="bg-[#161b22] text-gray-300 font-bold border-b border-white/10 text-[10px] uppercase">
                  <th className="p-2 text-center">#</th>
                  <th className="p-2">PO</th>
                  <th className="p-2 text-center">QTY</th>
                  <th className="p-2">STYLE</th>
                  <th className="p-2 border-r border-white/10">COLOR</th>

                  <th className="p-2 bg-blue-950/40">CONTRATO</th>
                  <th className="p-2 text-center bg-blue-950/40">ED</th>
                  <th className="p-2 text-center bg-blue-950/40">PC</th>
                  <th className="p-2 border-r border-white/10 bg-blue-950/40">FECHA</th>

                  <th className="p-2 text-center">SHIPPING / CAPTURA</th>
                  <th className="p-2 text-center">BORRAR</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {ordenesCustomBags
                  .filter(o => o.po.includes(searchTerm) || o.contrato.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((row, idx) => {
                    const esEntregado = row.checkEnv || row.estadoTexto === 'ENTREGADO A SHIPPING';

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          esEntregado
                            ? 'bg-emerald-500/25 text-emerald-200 font-bold border-l-4 border-emerald-400'
                            : 'hover:bg-white/5 text-gray-200'
                        }`}
                      >
                        <td className="p-2 text-center font-mono font-bold text-gray-400">{idx + 1}</td>
                        <td className="p-2 font-mono font-bold text-[#00f2fe]">{row.po}</td>
                        <td className="p-2 text-center font-mono font-bold">{row.qty}</td>
                        <td className="p-2 font-mono text-gray-300">{row.style}</td>
                        <td className="p-2 border-r border-white/10">{row.color}</td>

                        {/* Columna Derecha Custom */}
                        <td className="p-2 font-mono font-bold text-amber-300 bg-black/20">{row.contrato}</td>
                        <td className="p-2 text-center font-mono bg-black/20">{row.ed}</td>
                        <td className="p-2 text-center font-mono font-bold text-[#39ff14] bg-black/20">{row.pc}</td>
                        <td className="p-2 border-r border-white/10 text-gray-400 text-[10px] bg-black/20">
                          {row.fecha || '7-sep'}
                        </td>

                        {/* Mensaje o Casillas de Acción */}
                        <td className="p-2 text-center">
                          {esEntregado ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 font-black text-[10px] tracking-wide border border-emerald-400/50">
                              ENTREGADO A SHIPPING
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-3">
                              <label className="flex items-center gap-1 text-[10px] text-sky-400 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={row.checkEnv}
                                  onChange={() => handleToggleEnv(row.id)}
                                  className="w-4 h-4 accent-[#00f2fe] cursor-pointer"
                                />
                                <span>ENV</span>
                              </label>

                              <label className="flex items-center gap-1 text-[10px] text-emerald-400 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={row.checkCustom}
                                  onChange={() => handleToggleCustom(row.id)}
                                  className="w-4 h-4 accent-[#39ff14] cursor-pointer"
                                />
                                <span>CAPT</span>
                              </label>
                            </div>
                          )}
                        </td>

                        {/* Botón Eliminar */}
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleEliminar(row.id)}
                            className="p-1 text-red-400 hover:bg-red-500/20 rounded cursor-pointer transition-all"
                            title="Eliminar orden"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMNA LATERAL (Columna Q del Spreadsheet: VALIDAR EN ORDENES DEL DIA) */}
        <div className="bg-[#0d1117] border border-blue-600/40 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          <div className="bg-blue-700 px-3 py-2 text-white font-black text-xs uppercase tracking-wider text-center">
            Ordenes del dia (Col Q)
          </div>
          <div className="p-3 overflow-y-auto max-h-[500px] custom-scrollbar">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-gray-400 border-b border-white/10 font-bold">
                  <th className="pb-1">#</th>
                  <th className="pb-1">PO / Contrato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ordenesDelDiaColQ.map((poNum, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="py-1.5 text-gray-500 font-mono">{i + 1}</td>
                    <td className="py-1.5 font-mono font-bold text-[#00f2fe]">{poNum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WipStocksVendidasView;
