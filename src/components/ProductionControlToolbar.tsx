import React, { useState } from 'react';
import { wipEngineService } from '../services/wipEngineService';

export const ProductionControlToolbar: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleActualizarDia = async () => {
    setLoading(true);
    try {
      const res = await wipEngineService.actualizarOrdenesDelDia();
      alert(`✅ Órdenes actualizadas: ${res.totalHoy} órdenes de hoy procesadas.`);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBorrarCE = async () => {
    if (confirm('¿Eliminar todos los contratos cerrados (CE) de la base central?')) {
      await wipEngineService.borrarContratosCerrados();
      alert('⚡ Limpieza turbo completada. Se eliminaron los contratos (CE).');
    }
  };

  return (
    <div className="bg-[#0d1017] border-b border-white/10 p-2 flex flex-wrap items-center justify-between gap-3 text-xs font-sans shadow-md">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-extrabold text-[#00f2fe] flex items-center gap-1">
          🚀 Control de Producción:
        </span>

        <button
          onClick={handleActualizarDia}
          disabled={loading}
          className="px-3 py-1.5 bg-[#1d2756] hover:bg-[#00f2fe] hover:text-black text-white font-extrabold rounded-lg transition-all cursor-pointer border border-[#00f2fe]/30"
        >
          {loading ? 'Procesando...' : '🔄 Actualizar Órdenes del Día'}
        </button>

        <button
          onClick={() => wipEngineService.limpiarFilasCompletas('BUSCAR_BP')}
          className="px-3 py-1.5 bg-[#12161f] border border-white/20 hover:border-[#39ff14] text-gray-200 rounded-lg cursor-pointer"
        >
          🧹 Limpiar Completas BP
        </button>

        <button
          onClick={() => wipEngineService.limpiarFilasCompletas('BUSCAR_FD')}
          className="px-3 py-1.5 bg-[#12161f] border border-white/20 hover:border-[#ff007f] text-gray-200 rounded-lg cursor-pointer"
        >
          🧹 Limpiar Completas FD
        </button>
      </div>

      <div>
        <button
          onClick={handleBorrarCE}
          className="px-3 py-1.5 bg-red-950/60 border border-red-500/40 text-red-300 hover:bg-red-900 rounded-lg cursor-pointer font-bold transition-all"
        >
          🗑️ Borrar Contratos Cerrados (CE)
        </button>
      </div>
    </div>
  );
};

export default ProductionControlToolbar;
