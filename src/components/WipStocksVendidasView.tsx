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
  const [activeSubTab, setActiveSubTab] = useState<SubPestanaWip>('buscar-bp');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Líneas de producción para BUSCAR BP (7 Tablas paralelas)
  const lineasBP = [
    { id: 1, nombre: 'CUSTOM', colCasilla: 12 },
    { id: 2, nombre: 'SPUT 1', colCasilla: 26 },
    { id: 3, nombre: 'SPUT 2', colCasilla: 40 },
    { id: 4, nombre: 'BB 1', colCasilla: 54 },
    { id: 5, nombre: 'BB 2', colCasilla: 68 },
    { id: 6, nombre: 'UBL 3', colCasilla: 82 },
    { id: 7, nombre: 'LINEA 7', colCasilla: 96 },
  ];

  // Líneas de producción para BUSCAR FD (7 Tablas paralelas)
  const lineasFD = [
    { id: 1, nombre: 'FULL DYE CELDA 1' },
    { id: 2, nombre: 'FULL DYE CELDA 2' },
    { id: 3, nombre: 'FULL DYE CELDA 3' },
    { id: 4, nombre: 'FULL DYE CELDA 4' },
    { id: 5, nombre: 'PANTS LINE 1' },
    { id: 6, nombre: 'PANTS LINE 2' },
    { id: 7, nombre: 'HATS LINE' },
  ];

  // Datos de prueba estructurados por tabla
  const [tablasBPData] = useState<Record<string, any[]>>({
    'CUSTOM': [
      { po: '398210', qty: 50, style: 'BP-CUSTOM', color: 'NAVY', check: false },
      { po: '398211', qty: 25, style: 'BP-CUSTOM2', color: 'BLACK', check: true },
    ],
    'SPUT 1': [
      { po: '412001', qty: 10, style: 'SP-101', color: 'RED', check: false },
    ],
    'SPUT 2': [],
    'BB 1': [
      { po: '415090', qty: 100, style: 'BB-B1', color: 'ROYAL', check: false },
    ],
    'BB 2': [],
    'UBL 3': [],
    'LINEA 7': [],
  });

  const [ordenesDia] = useState<any[]>([
    { po: '422370', units: 1, style: 'FD-9037', status: 'NO ENTREGADO', general: 'AB', color: 'CUSTOM' },
    { po: '424855', units: 11, style: 'FD-9051,FD-9060', status: 'CONTEO', general: 'AB', color: 'CUSTOM' },
    { po: '426237', units: 12, style: 'FD-9030,FD-9024', status: 'NO ENTREGADO', general: 'AB', color: 'CUSTOM' },
    { po: '426362', units: 1, style: 'FD-9051', status: 'DESPACHADO', general: 'AB', color: 'CUSTOM' },
    { po: '427738', units: 3, style: 'FD-9031', status: 'CAPTURADO PARCIAL', general: 'AB', color: 'CUSTOM' },
  ]);

  const handleEnviarTablaShipping = async (nombreTabla: string) => {
    alert(`🚚 Preparando envío masivo a Shipping para la tabla: ${nombreTabla}`);
  };

  return (
    <div className="space-y-4 font-sans text-slate-100">
      {/* 1. Selector de Sub-pestañas en estilo Neón */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar border-b border-white/10">
        {[
          { id: 'ordenes-dia', label: '📋 ÓRDENES DEL DÍA' },
          { id: 'buscar-bp', label: '🎒 BUSCAR BP (7 TABLAS)' },
          { id: 'buscar-fd', label: '👕 BUSCAR FD (7 TABLAS)' },
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

      {/* 2. Banner Principal */}
      <div className="bg-[#121826] border border-[#00f2fe]/30 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#00f2fe] flex items-center gap-2">
            Módulo Activo:{' '}
            <span className="text-white">
              {activeSubTab.toUpperCase().replace(/-/g, ' ')}
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Estructura multitabla en paralelo sincronizada con Supabase
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por PO o Estilo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#0b0e14] border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2fe] w-60"
          />

          {activeSubTab === 'buscar-bp' && (
            <button
              onClick={() => wipEngineService.limpiarFilasCompletas('BUSCAR_BP')}
              className="px-3 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold rounded-lg cursor-pointer"
            >
              🧹 Limpiar Completas BP
            </button>
          )}

          {activeSubTab === 'buscar-fd' && (
            <button
              onClick={() => wipEngineService.limpiarFilasCompletas('BUSCAR_FD')}
              className="px-3 py-2 bg-pink-500/20 border border-pink-500/40 text-pink-300 hover:bg-pink-500/30 text-xs font-bold rounded-lg cursor-pointer"
            >
              🧹 Limpiar Completas FD
            </button>
          )}
        </div>
      </div>

      {/* 3. VISTA MULTI-TABLA EN PARALELO PARA BUSCAR BP */}
      {activeSubTab === 'buscar-bp' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {lineasBP.map((linea) => {
            const filas = tablasBPData[linea.nombre] || [];
            return (
              <div
                key={linea.id}
                className="bg-[#121826] border border-white/10 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between"
              >
                <div>
                  {/* Encabezado de la Tabla por Línea */}
                  <div className="bg-[#0b0e14] px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
                    <span className="font-extrabold text-[#39ff14] text-xs tracking-wider">
                      📑 {linea.nombre}
                    </span>
                    <button
                      onClick={() => handleEnviarTablaShipping(linea.nombre)}
                      className="px-2 py-1 bg-[#00f2fe]/10 hover:bg-[#00f2fe] hover:text-black border border-[#00f2fe]/40 text-[#00f2fe] text-[10px] font-bold rounded transition-all cursor-pointer"
                    >
                      🚚 Enviar a Shipping
                    </button>
                  </div>

                  {/* Tabla de Datos */}
                  <div className="p-2 overflow-x-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="text-gray-400 border-b border-white/5 font-semibold">
                          <th className="p-1.5">PO</th>
                          <th className="p-1.5">QTY</th>
                          <th className="p-1.5">ESTILO</th>
                          <th className="p-1.5">COLOR</th>
                          <th className="p-1.5 text-center">ENV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filas.length > 0 ? (
                          filas
                            .filter(
                              (f) =>
                                f.po.includes(searchTerm) ||
                                f.style.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .map((f, idx) => (
                              <tr key={idx} className="hover:bg-white/5">
                                <td className="p-1.5 font-mono font-bold text-[#00f2fe]">{f.po}</td>
                                <td className="p-1.5 font-mono font-bold">{f.qty}</td>
                                <td className="p-1.5 text-gray-300">{f.style}</td>
                                <td className="p-1.5 text-gray-400">{f.color}</td>
                                <td className="p-1.5 text-center">
                                  <input
                                    type="checkbox"
                                    defaultChecked={f.check}
                                    className="accent-[#39ff14] cursor-pointer"
                                  />
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-gray-500 italic">
                              Sin órdenes registradas
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-[#0b0e14]/50 px-3 py-1.5 border-t border-white/5 text-[10px] text-gray-500 text-right">
                  Total Registros: {filas.length}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. VISTA MULTI-TABLA EN PARALELO PARA BUSCAR FD */}
      {activeSubTab === 'buscar-fd' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {lineasFD.map((linea) => (
            <div
              key={linea.id}
              className="bg-[#121826] border border-white/10 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="bg-[#0b0e14] px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
                  <span className="font-extrabold text-[#ff007f] text-xs tracking-wider">
                    👕 {linea.nombre}
                  </span>
                  <button
                    onClick={() => handleEnviarTablaShipping(linea.nombre)}
                    className="px-2 py-1 bg-[#ff007f]/10 hover:bg-[#ff007f] hover:text-white border border-[#ff007f]/40 text-[#ff007f] text-[10px] font-bold rounded transition-all cursor-pointer"
                  >
                    🚚 Enviar a Shipping
                  </button>
                </div>

                <div className="p-2 overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="text-gray-400 border-b border-white/5 font-semibold">
                        <th className="p-1.5">PO / FD</th>
                        <th className="p-1.5">QTY</th>
                        <th className="p-1.5">ESTILO</th>
                        <th className="p-1.5">COLOR</th>
                        <th className="p-1.5 text-center">ENV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-500 italic">
                          Sin órdenes registradas en esta celda
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[#0b0e14]/50 px-3 py-1.5 border-t border-white/5 text-[10px] text-gray-500 text-right">
                Total Registros: 0
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. VISTA ÓRDENES DEL DÍA */}
      {activeSubTab === 'ordenes-dia' && (
        <div className="bg-[#121826] border border-white/10 rounded-xl overflow-hidden shadow-2xl p-4">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#0b0e14] text-gray-400 border-b border-white/10 font-bold uppercase">
                  <th className="p-3">PO / Contrato</th>
                  <th className="p-3">Estatus</th>
                  <th className="p-3">Después de Captura</th>
                  <th className="p-3">Departamento</th>
                  <th className="p-3">QTY (Piezas)</th>
                  <th className="p-3">Estilos</th>
                  <th className="p-3">Color</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ordenesDia
                  .filter(
                    (item) =>
                      item.po.includes(searchTerm) ||
                      item.style.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#00f2fe]">{row.po}</td>
                      <td className="p-3 font-bold">
                        {row.status === 'CAPTURADO PARCIAL' ? (
                          <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            CAPTURADO PARCIAL
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
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. VISTAS ADICIONALES */}
      {![ 'ordenes-dia', 'buscar-bp', 'buscar-fd' ].includes(activeSubTab) && (
        <div className="bg-[#121826] border border-white/10 rounded-xl p-12 text-center space-y-3">
          <div className="text-3xl">📥</div>
          <p className="text-sm font-bold text-[#00f2fe]">
            Módulo {activeSubTab.toUpperCase().replace(/-/g, ' ')} listo para consulta de datos.
          </p>
          <p className="text-xs text-gray-500">
            Los registros se actualizarán automáticamente desde Supabase.
          </p>
        </div>
      )}
    </div>
  );
};

export default WipStocksVendidasView;
