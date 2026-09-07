import React, { useState } from 'react';
import { wipEngineService } from '../services/wipEngineService';

type SubPestanaWip =
  | 'ordenes-dia'
  | 'buscar-bp'
  | 'buscar-fd'
  | 'dashboard'
  | 'base-contratos'
  | 'captura'
  | 'customization-queue'
  | 'stock-nave6'
  | 'resumen-grafica'
  | 'bd-despacho'
  | 'incompletas';

export const WipStocksVendidasView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubPestanaWip>('ordenes-dia');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const [ordenesDia] = useState([
    { po: '422370', units: 1, style: 'FD-9037', status: 'NO ENTREGADO', general: 'AB', color: 'CUSTOM' },
    { po: '424855', units: 11, style: 'FD-9051,FD-9060', status: 'CONTEO', general: 'AB', color: 'CUSTOM' },
    { po: '426237', units: 12, style: 'FD-9030,FD-9024', status: 'NO ENTREGADO', general: 'AB', color: 'CUSTOM' },
    { po: '426362', units: 1, style: 'FD-9051', status: 'DESPACHADO', general: 'AB', color: 'CUSTOM' },
    { po: '427738', units: 3, style: 'FD-9031', status: 'CAPTURADO PARCIAL', general: 'AB', color: 'CUSTOM' },
  ]);

  const handleActualizar = async () => {
    setLoading(true);
    try {
      const res = await wipEngineService.actualizarOrdenesDelDia();
      alert(`✅ Órdenes sincronizadas correctamente (${res.totalHoy} procesadas).`);
    } catch (e: any) {
      alert('Error en actualización: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-100">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar border-b border-white/10">
        {[
          { id: 'ordenes-dia', label: '📋 ÓRDENES DEL DÍA' },
          { id: 'buscar-bp', label: '🎒 BUSCAR BP' },
          { id: 'buscar-fd', label: '👕 BUSCAR FD' },
          { id: 'dashboard', label: '📊 DASHBOARD' },
          { id: 'base-contratos', label: '🗄️ DATABASE CONTRATOS' },
          { id: 'captura', label: '📝 CAPTURA' },
          { id: 'customization-queue', label: '📥 NETSUITE QUEUE' },
          { id: 'stock-nave6', label: '🚚 STOCK NAVE 6 & SHIPPING' },
          { id: 'resumen-grafica', label: '📈 RESUMEN + GRÁFICA' },
          { id: 'bd-despacho', label: '📦 BD DESPACHO' },
          { id: 'incompletas', label: '⚠️ INCOMPLETAS' },
        ].map((sub) => {
          const isActive = activeSubTab === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => setActiveSubTab(sub.id as SubPestanaWip)}
              className={`px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#00f2fe] text-black shadow-lg shadow-[#00f2fe]/20 font-extrabold'
                  : 'bg-[#121620] text-gray-400 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              {sub.label}
            </button>
          );
        })}
      </div>

      <div className="bg-[#121826] border border-[#00f2fe]/30 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#00f2fe] flex items-center gap-2">
            Órdenes del día: <span className="text-white">162</span> / CAPTURADO:{' '}
            <span className="text-[#39ff14]">34</span> / RESTA:{' '}
            <span className="text-[#ff007f]">128</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Módulo Activo: {activeSubTab.toUpperCase().replace('-', ' ')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Escanear o digitar PO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#0b0e14] border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2fe] w-52"
          />

          <button
            onClick={handleActualizar}
            disabled={loading}
            className="px-4 py-2 bg-[#00f2fe] hover:bg-[#00c8d4] text-black font-extrabold text-xs rounded-lg shadow-md cursor-pointer transition-all"
          >
            {loading ? 'Sincronizando...' : '🔄 Actualizar Órdenes'}
          </button>
        </div>
      </div>

      <div className="bg-[#121826] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#0b0e14] text-gray-400 border-b border-white/10 font-bold uppercase tracking-wider">
                <th className="p-3">PO / Contrato</th>
                <th className="p-3">Estatus</th>
                <th className="p-3">Después de Captura</th>
                <th className="p-3">Departamento</th>
                <th className="p-3">QTY (Piezas)</th>
                <th className="p-3">Estilos</th>
                <th className="p-3">Color</th>
                <th className="p-3 text-center">Estado General</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ordenesDia
                .filter(
                  (item) =>
                    item.po.includes(searchTerm) ||
                    item.style.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((row, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#00f2fe]">{row.po}</td>

                      <td className="p-3 font-bold">
                        {row.status === 'CAPTURADO PARCIAL' ? (
                          <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            CAPTURADO PARCIAL
                          </span>
                        ) : row.status === 'CAPTURADO COMPLETO' ? (
                          <span className="px-2 py-1 rounded bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/40">
                            CAPTURADO COMPLETO
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>

                      <td className="p-3 font-bold">
                        {row.status === 'DESPACHADO' ? (
                          <span className="px-2 py-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                            DESPACHADO
                          </span>
                        ) : row.status === 'CONTEO' ? (
                          <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                            CONTEO
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            NO ENTREGADO
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-gray-300">Bags</td>
                      <td className="p-3 font-mono font-bold">{row.units}</td>
                      <td className="p-3 font-mono text-gray-300">{row.style}</td>
                      <td className="p-3 text-gray-400">{row.color}</td>
                      <td className="p-3 text-center font-bold text-gray-400">{row.general}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WipStocksVendidasView;
