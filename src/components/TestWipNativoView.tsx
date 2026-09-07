import React, { useState, useEffect } from 'react';
import { wipEngineService } from '../services/wipEngineService';

interface OrdenIncompletaItem {
  id: string;
  po: string;
  part: string;
  contrato: string;
  estilo: string;
  qty: number;
  piezas: number;
  capturadoCheck: boolean;
  estatusGeneral: string;
}

const STORAGE_INCOMPLETAS_KEY = 'wip_control_incompletas_v1';

const cargarIncompletasIniciales = (): OrdenIncompletaItem[] => {
  try {
    const guardado = localStorage.getItem(STORAGE_INCOMPLETAS_KEY);
    if (guardado) return JSON.parse(guardado);
  } catch (e) {
    console.error('Error cargando incompletas de localStorage', e);
  }
  return [
    { id: 'inc-1', po: '426268A', part: 'A', contrato: '426268', estilo: 'FD-9031', qty: 10, piezas: 0, capturadoCheck: false, estatusGeneral: 'AB' },
    { id: 'inc-2', po: '427269A', part: 'A', contrato: '427269', estilo: 'FD-9010', qty: 5, piezas: 0, capturadoCheck: false, estatusGeneral: 'AB' },
  ];
};

export const TestWipNativoView: React.FC = () => {
  const [poInput, setPoInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [ordenesIncompletas, setOrdenesIncompletas] = useState<OrdenIncompletaItem[]>(cargarIncompletasIniciales);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_INCOMPLETAS_KEY, JSON.stringify(ordenesIncompletas));
    } catch (e) {
      console.error('Error guardando incompletas', e);
    }
  }, [ordenesIncompletas]);

  // LÓGICA DE ESTADO EVALUADO:
  // Por el simple hecho de estar en esta tabla, se considera ya en proceso -> CAPTURADO PARCIAL.
  // Pasa a CAPTURADO COMPLETO si se marca el check o las piezas completan la cantidad.
  const evaluarEstadoIncompleta = (item: OrdenIncompletaItem): { texto: string; estiloClass: string } => {
    if (item.capturadoCheck || (item.qty > 0 && item.piezas >= item.qty)) {
      return {
        texto: 'CAPTURADO COMPLETO',
        estiloClass: 'bg-emerald-500/20 text-emerald-600 dark:text-[#39ff14] border-emerald-500/40',
      };
    }

    return {
      texto: 'CAPTURADO PARCIAL',
      estiloClass: 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40',
    };
  };

  const handleAgregarIncompleta = async (e: React.FormEvent) => {
    e.preventDefault();
    const poCompleta = poInput.trim().toUpperCase();

    if (!poCompleta) return alert('Ingresa un número de PO/Contrato válido');

    setLoading(true);

    try {
      let detalles: any = null;
      if (wipEngineService && typeof wipEngineService.buscarDetallesPO === 'function') {
        detalles = await wipEngineService.buscarDetallesPO(poCompleta);
      }

      const contratoLimpio = poCompleta.replace(/[A-Za-z]/g, '');

      const nuevaFila: OrdenIncompletaItem = {
        id: Date.now().toString(),
        po: poCompleta,
        part: 'A',
        contrato: contratoLimpio || poCompleta,
        estilo: detalles ? detalles.style : 'FD-9031',
        qty: detalles ? detalles.qty : 10,
        piezas: 0,
        capturadoCheck: false,
        estatusGeneral: 'AB',
      };

setOrdenesIncompletas(prev => [...prev, nuevaFila]);      setPoInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCheckCaptura = (id: string) => {
    setOrdenesIncompletas(prev =>
      prev.map(item =>
        item.id === id ? { ...item, capturadoCheck: !item.capturadoCheck } : item
      )
    );
  };

  const handleEliminarFila = (id: string) => {
    if (confirm('¿Eliminar esta orden de Incompletas?')) {
      setOrdenesIncompletas(prev => prev.filter(item => item.id !== id));
    }
  };

  const totalOrdenes = ordenesIncompletas.length;
  const capturadosCount = ordenesIncompletas.filter(
    i => i.capturadoCheck || (i.qty > 0 && i.piezas >= i.qty)
  ).length;
  const restaCount = totalOrdenes - capturadosCount;

  return (
    <div className="w-full space-y-4 font-sans text-slate-800 dark:text-slate-100 p-2 transition-colors duration-300">
      <div className="w-full bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#00f2fe]/40 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4 transition-colors duration-300">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-gray-400 block">ÓRDENES EN WIP</span>
            <span className="text-xl font-black text-cyan-600 dark:text-[#00f2fe]">{totalOrdenes}</span>
          </div>
          <div className="border-l border-slate-200 dark:border-white/10 pl-6">
            <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-[#39ff14] block">CAPTURADO COMPLETO</span>
            <span className="text-xl font-black text-emerald-600 dark:text-[#39ff14]">{capturadosCount}</span>
          </div>
          <div className="border-l border-slate-200 dark:border-white/10 pl-6">
            <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 block">CAPTURADO PARCIAL</span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{restaCount}</span>
          </div>
        </div>

        <form onSubmit={handleAgregarIncompleta} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Escanear o digitar PO..."
            value={poInput}
            onChange={e => setPoInput(e.target.value)}
            className="bg-slate-50 dark:bg-[#0b0e14] border border-cyan-500/50 dark:border-[#00f2fe]/60 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-cyan-500 dark:focus:border-[#00f2fe] w-64 font-mono font-bold"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 bg-cyan-500 dark:bg-[#00f2fe] hover:bg-cyan-600 dark:hover:bg-[#00c8d4] text-white dark:text-black font-extrabold text-xs rounded-lg cursor-pointer shadow-md transition-all"
          >
            {loading ? '🔍 Buscando...' : '+ Agregar'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl transition-colors duration-300">
        <div className="p-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-100 dark:bg-[#0b0e14]">
          <h3 className="font-black text-cyan-600 dark:text-[#00f2fe] text-sm">📋 CONTROL WIP INCOMPLETOS (DEMO)</h3>
          <input
            type="text"
            placeholder="Filtrar por PO o Contrato..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-white dark:bg-[#121620] border border-slate-300 dark:border-white/20 rounded-lg px-3 py-1 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-cyan-500 dark:focus:border-[#00f2fe] w-56"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#161b22] text-slate-500 dark:text-gray-400 font-bold border-b border-slate-200 dark:border-white/10 text-[11px] uppercase">
                <th className="p-3">PO</th>
                <th className="p-3 text-center">PART</th>
                <th className="p-3 text-amber-600 dark:text-amber-300">CONTRATO</th>
                <th className="p-3">ESTILO</th>
                <th className="p-3 text-center">QTY</th>
                <th className="p-3 text-center">PIEZAS</th>
                <th className="p-3 text-center bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">CAPTURA (CHECK)</th>
                <th className="p-3 text-center">ESTADO EVALUADO</th>
                <th className="p-3 text-center">ESTATUS GENERAL</th>
                <th className="p-3 text-center">ACCIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono">
              {ordenesIncompletas
                .filter(item => item.po.includes(searchTerm) || item.contrato.includes(searchTerm))
                .map(row => {
                  const evalRes = evaluarEstadoIncompleta(row);

                  return (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-3 font-bold text-cyan-600 dark:text-[#00f2fe]">{row.po}</td>
                      <td className="p-3 text-center text-slate-500 dark:text-gray-400">{row.part}</td>
                      <td className="p-3 font-bold text-amber-600 dark:text-amber-300">{row.contrato}</td>
                      <td className="p-3 text-slate-600 dark:text-gray-300">{row.estilo}</td>
                      <td className="p-3 text-center font-bold text-slate-800 dark:text-white">{row.qty}</td>
                      <td className="p-3 text-center font-bold text-emerald-600 dark:text-[#39ff14]">{row.piezas}</td>

                      <td className="p-3 text-center bg-emerald-50 dark:bg-emerald-950/20">
                        <input
                          type="checkbox"
                          checked={row.capturadoCheck}
                          onChange={() => toggleCheckCaptura(row.id)}
                          className="w-4 h-4 accent-emerald-500 dark:accent-[#39ff14] cursor-pointer"
                        />
                      </td>

                      <td className="p-3 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${evalRes.estiloClass}`}>
                          {evalRes.texto}
                        </span>
                      </td>

                      <td className="p-3 text-center font-bold text-sky-600 dark:text-sky-400">{row.estatusGeneral}</td>

                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleEliminarFila(row.id)}
                          className="p-1 text-red-500 hover:bg-red-500/20 rounded cursor-pointer transition-all"
                          title="Eliminar fila"
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
    </div>
  );
};

export default TestWipNativoView;
