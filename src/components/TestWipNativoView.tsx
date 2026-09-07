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

// Carga inicial persistente desde LocalStorage
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

  // Sincronización continua en LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_INCOMPLETAS_KEY, JSON.stringify(ordenesIncompletas));
    } catch (e) {
      console.error('Error guardando incompletas', e);
    }
  }, [ordenesIncompletas]);

  // Regla Unificada de Evaluación
  const evaluarEstadoIncompleta = (item: OrdenIncompletaItem): { texto: string; estiloClass: string } => {
    // 1. Si el usuario marcó manualmente el checkbox de la fila
    if (item.capturadoCheck) {
      return {
        texto: 'CAPTURADO COMPLETO',
        estiloClass: 'bg-[#39ff14]/20 text-[#39ff14] border-[#39ff14]/40',
      };
    }

    // 2. Si las piezas capturadas superan o igualan el total
    if (item.qty > 0 && item.piezas >= item.qty) {
      return {
        texto: 'CAPTURADO COMPLETO',
        estiloClass: 'bg-[#39ff14]/20 text-[#39ff14] border-[#39ff14]/40',
      };
    }

    // 3. Si hay piezas registradas mayor a cero pero menor al total -> PARCIAL / EN PROCESO
    if (item.piezas > 0 && item.piezas < item.qty) {
      return {
        texto: 'PARCIAL / EN PROCESO',
        estiloClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    }

    // 4. Por defecto -> FALTA CAPTURA
    return {
      texto: 'FALTA CAPTURA',
      estiloClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    };
  };

  // Agregar PO con autocompletado y persistencia
  const handleAgregarIncompleta = async (e: React.FormEvent) => {
    e.preventDefault();
    const poLimpia = poInput.trim().toUpperCase();

    if (!poLimpia) return alert('Ingresa un número de PO/Contrato válido');

    setLoading(true);

    try {
      let detalles: any = null;
      if (wipEngineService && typeof wipEngineService.buscarDetallesPO === 'function') {
        detalles = await wipEngineService.buscarDetallesPO(poLimpia);
      }

      const contratoLimpio = poLimpia.replace(/[A-Za-z]/g, '');

      const nuevaFila: OrdenIncompletaItem = {
        id: Date.now().toString(),
        po: poLimpia,
        part: 'A',
        contrato: contratoLimpio || poLimpia,
        estilo: detalles ? detalles.style : 'FD-9031',
        qty: detalles ? detalles.qty : 10,
        piezas: 0,
        capturadoCheck: false,
        estatusGeneral: 'AB',
      };

      setOrdenesIncompletas(prev => [nuevaFila, ...prev]);
      setPoInput('');
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
    <div className="w-full space-y-4 font-sans text-slate-100 p-2">
      {/* Banner de Control */}
      <div className="w-full bg-[#121826] border border-[#00f2fe]/40 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 block">ÓRDENES DEL DÍA</span>
            <span className="text-xl font-black text-[#00f2fe]">{totalOrdenes}</span>
          </div>
          <div className="border-l border-white/10 pl-6">
            <span className="text-[10px] uppercase tracking-wider text-[#39ff14] block">CAPTURADO</span>
            <span className="text-xl font-black text-[#39ff14]">{capturadosCount}</span>
          </div>
          <div className="border-l border-white/10 pl-6">
            <span className="text-[10px] uppercase tracking-wider text-[#ff007f] block">RESTA</span>
            <span className="text-xl font-black text-[#ff007f]">{restaCount}</span>
          </div>
        </div>

        {/* Formulario Agregar Orden */}
        <form onSubmit={handleAgregarIncompleta} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Escanear o digitar PO en Col A..."
            value={poInput}
            onChange={e => setPoInput(e.target.value)}
            className="bg-[#0b0e14] border border-[#00f2fe]/60 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2fe] w-64 font-mono font-bold"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 bg-[#00f2fe] hover:bg-[#00c8d4] text-black font-extrabold text-xs rounded-lg cursor-pointer shadow-md transition-all"
          >
            {loading ? '🔍 Buscando...' : '+ Agregar'}
          </button>
        </form>
      </div>

      {/* Tabla de Control WIP Incompletas */}
      <div className="bg-[#0d1117] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[#0b0e14]">
          <h3 className="font-black text-[#00f2fe] text-sm">📋 CONTROL WIP INCOMPLETOS</h3>
          <input
            type="text"
            placeholder="Filtrar por PO o Contrato..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-[#121620] border border-white/20 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-[#00f2fe] w-56"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#161b22] text-gray-400 font-bold border-b border-white/10 text-[11px] uppercase">
                <th className="p-3">PO</th>
                <th className="p-3 text-center">PART</th>
                <th className="p-3 text-amber-300">CONTRATO</th>
                <th className="p-3">ESTILO</th>
                <th className="p-3 text-center">QTY</th>
                <th className="p-3 text-center">PIEZAS</th>
                <th className="p-3 text-center bg-emerald-950/40 text-emerald-300">CAPTURA (CHECK)</th>
                <th className="p-3 text-center">ESTADO EVALUADO</th>
                <th className="p-3 text-center">ESTATUS GENERAL</th>
                <th className="p-3 text-center">ACCIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ordenesIncompletas
                .filter(item => item.po.includes(searchTerm) || item.contrato.includes(searchTerm))
                .map(row => {
                  const evalRes = evaluarEstadoIncompleta(row);

                  return (
                    <tr key={row.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#00f2fe]">{row.po}</td>
                      <td className="p-3 text-center font-mono text-gray-400">{row.part}</td>
                      <td className="p-3 font-mono font-bold text-amber-300">{row.contrato}</td>
                      <td className="p-3 font-mono text-gray-300">{row.estilo}</td>
                      <td className="p-3 text-center font-mono font-bold">{row.qty}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#39ff14]">{row.piezas}</td>

                      {/* Checkbox Captura Manual */}
                      <td className="p-3 text-center bg-emerald-950/20">
                        <input
                          type="checkbox"
                          checked={row.capturadoCheck}
                          onChange={() => toggleCheckCaptura(row.id)}
                          className="w-4 h-4 accent-[#39ff14] cursor-pointer"
                        />
                      </td>

                      {/* Estado Evaluación */}
                      <td className="p-3 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] border font-mono ${evalRes.estiloClass}`}>
                          {evalRes.texto}
                        </span>
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-sky-400">{row.estatusGeneral}</td>

                      {/* Botón Borrar */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleEliminarFila(row.id)}
                          className="p-1 text-red-400 hover:bg-red-500/20 rounded cursor-pointer transition-all"
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
