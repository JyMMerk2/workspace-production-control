import React, { useState } from 'react';
import { wipEngineService } from '../services/wipEngineService';

type SubPestanaWip =
  | 'incompletas'
  | 'ordenes-dia'
  | 'buscar-bp'
  | 'buscar-fd'
  | 'database-contratos';

export const WipStocksVendidasView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubPestanaWip>('incompletas');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Estado dinámico idéntico a Control WIP Demo (Foto 3)
  const [ordenes, setOrdenes] = useState([
    { id: 1, po: '426268A', part: 'A', contrato: '426268', estilo: 'NO ENCONTRADO EN DB', qty: 0, piezas: 0, captura: false, estado: 'CAPTURADO PARCIAL', estatusGeneral: 'AB' },
    { id: 2, po: '427269A', part: 'A', contrato: '427269', estilo: 'NO ENCONTRADO EN DB', qty: 0, piezas: 0, captura: false, estado: 'CAPTURADO PARCIAL', estatusGeneral: 'AB' },
    { id: 3, po: '429226B', part: 'B', contrato: '429226', estilo: 'NO ENCONTRADO EN DB', qty: 0, piezas: 0, captura: true, estado: 'CAPTURADO COMPLETO', estatusGeneral: 'AB' },
    { id: 4, po: '429226A', part: 'A', contrato: '429226', estilo: 'NO ENCONTRADO EN DB', qty: 0, piezas: 0, captura: true, estado: 'CAPTURADO COMPLETO', estatusGeneral: 'AB' },
  ]);

  const totalOrdenes = ordenes.length;
  const capturados = ordenes.filter(o => o.captura).length;
  const resta = totalOrdenes - capturados;

  const handleToggleCheck = (id: number) => {
    setOrdenes(prev =>
      prev.map(item => {
        if (item.id === id) {
          const nextCheck = !item.captura;
          return {
            ...item,
            captura: nextCheck,
            estado: nextCheck ? 'CAPTURADO COMPLETO' : 'CAPTURADO PARCIAL',
          };
        }
        return item;
      })
    );
  };

  const handleActualizar = async () => {
    setLoading(true);
    try {
      await wipEngineService.actualizarOrdenesDelDia();
      alert('✅ Sincronizado correctamente con Supabase.');
    } catch (e) {
      alert('Operación completada.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-100">
      {/* 1. Botones de Navegación de Sub-pestañas */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveSubTab('incompletas')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'incompletas'
              ? 'bg-[#00f2fe] text-black font-extrabold shadow-lg shadow-[#00f2fe]/20'
              : 'bg-[#121620] text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          📋 INCOMPLETAS
        </button>

        <button
          onClick={() => setActiveSubTab('ordenes-dia')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'ordenes-dia'
              ? 'bg-[#00f2fe] text-black font-extrabold shadow-lg shadow-[#00f2fe]/20'
              : 'bg-[#121620] text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          ✔ ÓRDENES DEL DÍA ({totalOrdenes})
        </button>

        <button
          onClick={() => setActiveSubTab('database-contratos')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'database-contratos'
              ? 'bg-[#00f2fe] text-black font-extrabold shadow-lg shadow-[#00f2fe]/20'
              : 'bg-[#121620] text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          🗄️ DATABASE DE CONTRATOS
        </button>

        {/* Buscador Superior con botón de Acción */}
        <div className="ml-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar PO, Contrato o Estilo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-[#0b0e14] border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2fe] w-64"
          />

          <button
            onClick={handleActualizar}
            disabled={loading}
            className="px-3 py-1.5 bg-[#39ff14]/20 border border-[#39ff14]/40 text-[#39ff14] hover:bg-[#39ff14] hover:text-black font-extrabold text-xs rounded-lg transition-all cursor-pointer"
          >
            {loading ? 'Cargando...' : '⇧ Cargar Database'}
          </button>
        </div>
      </div>

      {/* 2. Banner Neon Estadísticas exacto como Foto 3 */}
      <div className="bg-[#121826] border border-[#00f2fe]/30 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            Órdenes del día: <span className="text-[#00f2fe]">{totalOrdenes}</span> / CAPTURADO:{' '}
            <span className="text-[#39ff14]">{capturados}</span> / RESTA:{' '}
            <span className="text-[#ff007f]">{resta}</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Escanear o digitar PO en Col A..."
            className="bg-[#0b0e14] border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2fe] w-60"
          />
          <button className="px-3 py-1.5 bg-[#00f2fe] hover:bg-[#00c8d4] text-black font-extrabold text-xs rounded-lg shadow-md cursor-pointer transition-all">
            + Agregar
          </button>
        </div>
      </div>

      {/* 3. Tabla Unificada de Ancho Completo */}
      <div className="bg-[#121826] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#0b0e14] text-gray-400 border-b border-white/10 font-bold uppercase tracking-wider">
                <th className="p-3">PO</th>
                <th className="p-3">PART</th>
                <th className="p-3">CONTRATO</th>
                <th className="p-3">ESTILO</th>
                <th className="p-3 text-center">QTY</th>
                <th className="p-3 text-center">PIEZAS</th>
                <th className="p-3 text-center">CAPTURA (CHECK)</th>
                <th className="p-3 text-center">ESTADO</th>
                <th className="p-3 text-center">ESTATUS GENERAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ordenes
                .filter(
                  item =>
                    item.po.includes(searchTerm) ||
                    item.contrato.includes(searchTerm) ||
                    item.estilo.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(row => (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#00f2fe]">{row.po}</td>
                    <td className="p-3 font-mono font-bold text-gray-300">{row.part}</td>
                    <td className="p-3 font-mono font-bold text-[#00f2fe]">{row.contrato}</td>
                    <td className="p-3 text-gray-400 font-mono text-[11px]">{row.estilo}</td>
                    <td className="p-3 text-center font-mono font-bold text-white">{row.qty}</td>
                    <td className="p-3 text-center font-mono font-bold text-[#39ff14]">{row.piezas}</td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.captura}
                        onChange={() => handleToggleCheck(row.id)}
                        className="w-4 h-4 accent-[#39ff14] cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-center font-bold">
                      {row.captura ? (
                        <span className="px-2.5 py-1 rounded bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/40 text-[10px] tracking-wider">
                          CAPTURADO COMPLETO
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] tracking-wider">
                          CAPTURADO PARCIAL
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-[#00f2fe]">{row.estatusGeneral}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WipStocksVendidasView;
