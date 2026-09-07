import { supabase } from '../data/supabaseClient';

export const wipEngineService = {
  // 1. Actualizar Órdenes del Día (Filtra Team Spirit Queued, ubica las de HOY primero)
  async actualizarOrdenesDelDia() {
    const hoyStr = new Date().toLocaleDateString('en-US'); // Formato M/d/yyyy

    // Obtener cola desde Supabase (o endpoint de NetSuite)
    const { data: queueData, error } = await supabase
      .from('wip_netsuite_queue')
      .select('*')
      .neq('department', 'Team Spirit (Queued)');

    if (error || !queueData) throw new Error('Error al leer cola de NetSuite');

    const ordenesHoy = queueData.filter((item) => item.due_date === hoyStr);
    const ordenesOtrosDias = queueData.filter((item) => item.due_date !== hoyStr);

    // Obtener pendientes que no se hayan despachado ni completado
    const { data: pendientesAyer } = await supabase
      .from('wip_incompletos')
      .select('*')
      .neq('estado_captura', 'CAPTURADO COMPLETO');

    // Consolidar bloque superior (HOY + Pendientes)
    const bloqueSuperior = [...ordenesHoy, ...(pendientesAyer || [])];

    // Actualizar tabla máster en Supabase
    await supabase.from('wip_ordenes_dia_activo').delete().neq('id', '0');
    if (bloqueSuperior.length > 0) {
      await supabase.from('wip_ordenes_dia_activo').insert(bloqueSuperior);
    }
    if (ordenesOtrosDias.length > 0) {
      await supabase.from('wip_ordenes_dia_historico').insert(ordenesOtrosDias);
    }

    return { totalHoy: ordenesHoy.length, totalOtros: ordenesOtrosDias.length };
  },

  // 2. Transferecia Directa a Shipping / Nave 6
  async enviarAShipping(payload: {
    po: string;
    qty: number;
    style: string;
    color: string;
    destino: '1' | '2'; // 1: BAGS ORDERS, 2: STOCK NAVE 6
    cajas?: number;
  }) {
    if (payload.destino === '1') {
      return await supabase.from('wip_bags_orders').upsert([
        {
          po: payload.po,
          qty: payload.qty,
          style: payload.style,
          color: payload.color,
          created_at: new Date().toISOString(),
        },
      ]);
    } else {
      return await supabase.from('wip_stock_nave6').upsert([
        {
          po: payload.po,
          qty: payload.qty,
          cajas: payload.cajas || 1,
          created_at: new Date().toISOString(),
        },
      ]);
    }
  },

  // 3. Borrar Contratos Cerrados (CE)
  async borrarContratosCerrados() {
    const { data, error } = await supabase
      .from('wip_master_db')
      .delete()
      .eq('estado_general', 'CE');

    return { success: !error, error };
  },

  // 4. Limpiar Filas Completadas en Buscar BP o FD
  async limpiarFilasCompletas(tablaModulo: 'BUSCAR_BP' | 'BUSCAR_FD') {
    const tableTarget = tablaModulo === 'BUSCAR_BP' ? 'wip_buscar_bp' : 'wip_buscar_fd';
    
    const { error } = await supabase
      .from(tableTarget)
      .delete()
      .eq('completado', true);

    return { success: !error };
  },
};
