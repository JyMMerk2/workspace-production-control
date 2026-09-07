import React, { useState } from 'react';
import { wipEngineService } from '../services/wipEngineService';

type SubPestanaWip = 'buscar-bp' | 'buscar-fd' | 'ordenes-dia' | 'database-contratos';

interface OrdenItem {
  id: string;
  po: string;
  part?: string;
  contrato: string;
  qty: number;
  style: string;
  color: string;
  tipo: 'CUSTOM' | 'STOCK' | 'OTHER';
  checkShipping: boolean;
  checkCaptura: boolean;
}

interface RegistroIncompleto {
  po: string;
  completado: boolean;
  piezasFaltantes: number;
}

export const WipStocksVendidasView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubPestanaWip>('buscar-bp');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);

  // Formulario rápido (Solo digitas la PO)
  const [nuevaOrden, setNuevaOrden] = useState({
    tablaTarget: 'CUSTOM BAGS',
    po: '',
  });

  // Base de Datos Centralizada de Mock / Supabase para Autocompletado Instantáneo
  const baseDatosInventario: Record<string, { qty: number; style: string; color: string; tipo: 'CUSTOM' | 'STOCK' }> = {
    '427713B': { qty: 20, style: 'FD-9031', color: 'CUSTOM', tipo: 'CUSTOM' },
    '427432A': { qty: 10, style: 'FD-9010', color: 'CUSTOM', tipo: 'CUSTOM' },
    '427797A': { qty: 3, style: 'FD-9031', color: 'CUSTOM', tipo: 'CUSTOM' },
    '427418A': { qty: 14, style: 'FD-9006', color: 'CUSTOM', tipo: 'CUSTOM' },
    '419211A': { qty: 10, style: 'PS-9100', color: 'M/O/FLE', tipo: 'STOCK' },
    '426281A': { qty: 22, style: 'FD-9031', color: 'CUSTOM', tipo: 'CUSTOM' },
    '427685A': { qty: 14, style: 'FD-9047', color: 'CUSTOM', tipo: 'CUSTOM' },
  };

  const [baseIncompletos] = useState<Record<string, RegistroIncompleto>>({
    '427713B': { po: '427713B', completado: true, piezasFaltantes: 0 },
    '427432A': { po: '427432A', completado: true, piezasFaltantes: 0 },
    '427797A': { po: '427797A', completado: false, piezasFaltantes: 2 },
    '427418A': { po: '427418A', completado: true, piezasFaltantes: 0 },
    '426281A': { po: '426281A', completado: true, piezasFaltantes: 0 },
  });

  const [ordenesDelDiaRegistradas] = useState<string[]>([
    '427713',
    '427432',
    '427418',
    '426281',
  ]);

  // Tablas de Mochilas
  const [tablasBP, setTablasBP] = useState<Record<string, OrdenItem[]>>({
    'CUSTOM BAGS': [
      { id: 'bp-1', po: '427713B', contrato: '427713', qty: 20, style: 'FD-9031', color: 'CUSTOM', tipo: 'CUSTOM', checkShipping: false, checkCaptura: true },
      { id: 'bp-2', po: '427432A', contrato: '427432', qty: 10, style: 'FD-9010', color: 'CUSTOM', tipo: 'CUSTOM', checkShipping: false, checkCaptura: true },
      { id: 'bp-3', po: '427797A', contrato: '427797', qty: 3, style: 'FD-9031', color: 'CUSTOM', tipo: 'CUSTOM', checkShipping: false, checkCaptura: false },
      { id: 'bp-4', po: '427418A', contrato: '427418', qty: 14, style: 'FD-9006', color: 'CUSTOM', tipo: 'CUSTOM', checkShipping: false, checkCaptura: true },
      { id: 'bp-5', po: '419211A', contrato: '419211', qty: 10, style: 'PS-9100', color: 'M/O/FLE', tipo: 'STOCK', checkShipping: false, checkCaptura: false },
    ],
    'SPUT 1': [
      { id: 'bp-6', po: '426281A', contrato: '426281', qty: 22, style: 'FD-9031', color: 'CUSTOM', tipo: 'CUSTOM', checkShipping: false, checkCaptura: true },
    ],
    'SPUT 2': [],
    'BIG BAG UTILITY 1': [],
    'BIG BAG UTILITY 2': [],
    'UTILITY BAG LINE 3': [],
    'LINEA 7 (CN)': [],
  });

  // Tablas de Full Dye
  const [tablasFD, setTablasFD] = useState<Record<string, OrdenItem[]>>({
    'FULL DYE CELDA 1': [
      { id: 'fd-1', po: '427713', contrato: '427713', qty: 20, style: 'FD-9031', color: 'CUSTOM', tipo: 'CUSTOM', checkShipping: false, checkCaptura: true },
    ],
    'FULL DYE CELDA 2': [],
    'FULL DYE CELDA 3': [],
    'FULL DYE CELDA 4': [],
    'PANTS LINE 1': [],
    'PANTS LINE 2': [],
    'HATS LINE': [],
  });

  const lineasBPNames = Object.keys(tablasBP);
  const lineasFDNames = Object.keys(tablasFD);

  const activeTablas = activeSubTab === 'buscar-bp' ? tablasBP : tablasFD;
  const todasOrdenes = Object.values(activeTablas).flat();
  const totalOrders = todasOrdenes.length;
  const ctmOrders = todasOrdenes.filter(o => o.tipo === 'CUSTOM').length;
  const stockOrders = todasOrdenes.filter(o => o.tipo === 'STOCK').length;
  const capturados = todasOrdenes.filter(o => o.checkCaptura).length;
  const resta = totalOrders - capturados;

  // Lógica de Fórmulas Jerárquicas
  const calcularEstadoFormulaJerarquica = (item: OrdenItem): { texto: string; estiloClass: string; checkAuto: boolean } => {
    const registroIncompleto = baseIncompletos[item.po];
    const estaEnOrdenesDia = ordenesDelDiaRegistradas.includes(item.contrato);

    if (!registroIncompleto) {
      return {
        texto: 'FALTA CAPTURA',
        estiloClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        checkAuto: false,
      };
    }

    if (!registroIncompleto.completado) {
      return {
        texto: 'PARCIAL / EN PROCESO',
        estiloClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        checkAuto: false,
      };
    }

    if (registroIncompleto.completado && !estaEnOrdenesDia) {
      return {
        texto: 'REVISAR WIP E INCOMPLETOS',
        estiloClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        checkAuto: true,
      };
    }

    return {
      texto: 'CAPTURADO COMPLETO',
      estiloClass: 'bg-[#39ff14]/20 text-[#39ff14] border-[#39ff14]/40',
      checkAuto: true,
    };
  };

  // Función Principal: Buscar datos en BD e insertar inmediatamente al escribir la PO
  const handleAgregarOrdenBuscandoEnBD = async (e: React.FormEvent) => {
    e.preventDefault();
    const poBuscada = nuevaOrden.po.trim().toUpperCase();

    if (!poBuscada) {
      return alert('Ingresa un número de PO/Contrato');
    }

    setLoadingBusqueda(true);

    try {
      // 1. Consultar detalles en la base de datos
      let detalles = baseDatosInventario[poBuscada];

      if (!detalles) {
        // Intento de fallback por servicio de Supabase
        const resService = await wipEngineService.buscarDetallesPO(poBuscada);
        if (resService) {
          detalles = resService;
        }
      }

      // 2. Armar el objeto con datos de BD o valores por defecto
      const contratoLimpio = poBuscada.replace(/[A-Za-z]/g, '');
      const itemNuevo: OrdenItem = {
        id: Date.now().toString(),
        po: poBuscada,
        contrato: contratoLimpio || poBuscada,
        qty: detalles ? detalles.qty : 1,
        style: detalles ? detalles.style : 'FD-GENERIC',
        color: detalles ? detalles.color : 'CUSTOM',
        tipo: detalles ? detalles.tipo : 'CUSTOM',
        checkShipping: false,
        checkCaptura: false,
      };

      // 3. Insertar inmediatamente en la tabla correspondiente
      const setter = activeSubTab === 'buscar-bp' ? setTablasBP : setTablasFD;
      const target = nuevaOrden.tablaTarget;

      setter(prev => ({
        ...prev,
        [target]: [itemNuevo, ...(prev[target] || [])],
      }));

      // Limpiar input para la siguiente orden
      setNuevaOrden(prev => ({ ...prev, po: '' }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBusqueda(false);
    }
  };

  const toggleShipping = (tabla: string, id: string) => {
    const setter = activeSubTab === 'buscar-bp' ? setTablasBP : setTablasFD;
    setter(prev => ({
      ...prev,
      [tabla]: prev[tabla].map(item =>
        item.id === id ? { ...item, checkShipping: !item.checkShipping } : item
      ),
    }));
  };

  const toggleCaptura = (tabla: string, id: string) => {
    const setter = activeSubTab === 'buscar-bp' ? setTablasBP : setTablasFD;
    setter(prev => ({
      ...prev,
      [tabla]: prev[tabla].map(item =>
        item.id === id ? { ...item, checkCaptura: !item.checkCaptura } : item
      ),
    }));
  };

  const handleEliminarOrden = (tabla: string, id: string) => {
    if (confirm('¿Deseas eliminar esta orden de la tabla?')) {
      const setter = activeSubTab === 'buscar-bp' ? setTablasBP : setTablasFD;
      setter(prev => ({
        ...prev,
        [tabla]: prev[tabla].filter(item => item.id !== id),
      }));
    }
  };

  return (
    <div className="w-full space-y-4 font-sans text-slate-100 px-1">
      {/* 1. Sub-pestañas */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => {
            setActiveSubTab('buscar-bp');
            setNuevaOrden(p => ({ ...p, tablaTarget: 'CUSTOM BAGS' }));
          }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'buscar-bp'
              ? 'bg-[#00f2fe] text-black font-extrabold shadow-lg shadow-[#00f2fe]/20'
              : 'bg-[#121620] text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          🎒 BUSCAR BP (7 TABLAS MOCHILAS)
        </button>

        <button
          onClick={() => {
            setActiveSubTab('buscar-fd');
            setNuevaOrden(p => ({ ...p, tablaTarget: 'FULL DYE CELDA 1' }));
          }}
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
            className="bg-[#0b0e14] border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2fe] w-64"
          />

          <button
            onClick={() => wipEngineService.limpiarFilasCompletas(activeSubTab === 'buscar-bp' ? 'BUSCAR_BP' : 'BUSCAR_FD')}
            className="px-3 py-1.5 bg-[#39ff14]/20 border border-[#39ff14]/40 text-[#39ff14] hover:bg-[#39ff14] hover:text-black font-extrabold text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap"
          >
            🧹 Limpiar Completas
          </button>
        </div>
      </div>

      {/* 2. Formulario de Búsqueda Rápida e Inserción Automática */}
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

        {/* Escribes la PO + Enter / Botón y consulta la BD para armar la fila */}
        <form onSubmit={handleAgregarOrdenBuscandoEnBD} className="flex items-center gap-2 flex-wrap">
          <select
            value={nuevaOrden.tablaTarget}
            onChange={e => setNuevaOrden({ ...nuevaOrden, tablaTarget: e.target.value })}
            className="bg-[#0b0e14] border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white"
          >
            {(activeSubTab === 'buscar-bp' ? lineasBPNames : lineasFDNames).map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Digitar / Escanear PO..."
            value={nuevaOrden.po}
            onChange={e => setNuevaOrden({ ...nuevaOrden, po: e.target.value })}
            className="bg-[#0b0e14] border border-[#00f2fe]/50 rounded-lg px-3 py-1.5 text-xs text-white focus:border-[#00f2fe] focus:outline-none w-44 font-mono font-bold"
          />

          <button
            type="submit"
            disabled={loadingBusqueda}
            className="px-4 py-1.5 bg-[#00f2fe] hover:bg-[#00c8d4] text-black font-extrabold text-xs rounded-lg shadow-md cursor-pointer transition-all flex items-center gap-1"
          >
            {loadingBusqueda ? '🔍 Buscando en BD...' : '⚡ Agregar y Autocompletar'}
          </button>
        </form>
      </div>

      {/* 3. Renderizado de Tablas */}
      {(activeSubTab === 'buscar-bp' || activeSubTab === 'buscar-fd') && (
        <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Object.entries(activeTablas).map(([nombreLinea, filas]) => {
            const filasFiltradas = filas.filter(
              f =>
                f.po.includes(searchTerm) ||
                f.style.toLowerCase().includes(searchTerm.toLowerCase()) ||
                f.color.toLowerCase().includes(searchTerm.toLowerCase())
            );

            const totalPiezas = filasFiltradas.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);

            return (
              <div
                key={nombreLinea}
                className="w-full bg-[#121826] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="bg-[#0b0e14] px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-[#39ff14] text-sm tracking-wide">
                        📑 {nombreLinea}
                      </h3>
                      <span className="text-[10px] text-gray-400">
                        {filasFiltradas.length} Órdenes | {totalPiezas} Piezas Acumuladas
                      </span>
                    </div>

                    <button
                      onClick={() => alert(`🚚 Enviando datos de ${nombreLinea} a Shipping`)}
                      className="px-3 py-1.5 bg-[#00f2fe]/15 hover:bg-[#00f2fe] hover:text-black border border-[#00f2fe]/50 text-[#00f2fe] text-xs font-extrabold rounded-lg transition-all cursor-pointer"
                    >
                      🚚 Enviar a Shipping
                    </button>
                  </div>

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
                          <th className="p-2.5 text-center">Estatus Fórmulas</th>
                          <th className="p-2.5 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filasFiltradas.length > 0 ? (
                          filasFiltradas.map(f => {
                            const evalJerarquica = calcularEstadoFormulaJerarquica(f);
                            const checkEfectivo = f.checkCaptura || evalJerarquica.checkAuto;

                            return (
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

                                {/* Casilla 1: ENV */}
                                <td className="p-2.5 text-center bg-blue-950/20">
                                  <input
                                    type="checkbox"
                                    checked={f.checkShipping}
                                    onChange={() => toggleShipping(nombreLinea, f.id)}
                                    className="w-4 h-4 accent-[#00f2fe] cursor-pointer"
                                  />
                                </td>

                                {/* Casilla 2: CAPTURA */}
                                <td className="p-2.5 text-center bg-emerald-950/20">
                                  <input
                                    type="checkbox"
                                    checked={checkEfectivo}
                                    onChange={() => toggleCaptura(nombreLinea, f.id)}
                                    className="w-4 h-4 accent-[#39ff14] cursor-pointer"
                                  />
                                </td>

                                {/* Estado Evaluado */}
                                <td className="p-2.5 text-center font-bold">
                                  <span className={`px-2 py-0.5 rounded text-[10px] border font-mono ${evalJerarquica.estiloClass}`}>
                                    {evalJerarquica.texto}
                                  </span>
                                </td>

                                {/* Eliminar */}
                                <td className="p-2.5 text-center">
                                  <button
                                    onClick={() => handleEliminarOrden(nombreLinea, f.id)}
                                    className="p-1 text-red-400 hover:bg-red-500/10 rounded cursor-pointer transition-all"
                                    title="Eliminar orden de la lista"
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={9} className="p-6 text-center text-gray-500 italic text-xs">
                              Sin órdenes registradas en {nombreLinea}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-[#0b0e14] px-4 py-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                  <span>Envíos Listos: <strong className="text-[#00f2fe]">{filasFiltradas.filter(f => f.checkShipping).length}</strong></span>
                  <span>Capturados: <strong className="text-[#39ff14]">{filasFiltradas.filter(f => f.checkCaptura).length}</strong></span>
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
