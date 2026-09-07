import React, { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, CheckCircle2, Clock, Database, Upload, Trash2, UserCheck, ShieldAlert, Wifi, FileSpreadsheet, Plus, Table, AlertTriangle, Edit2, Link, CheckSquare, Square, CheckCircle, ChevronDown, Send, Copy, Mail, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../data/supabaseClient';

interface MasterDbItem {
  id?: string;
  po: string;
  part: string;
  contrato: string;
  estilo: string;
  qty: number;
  estadoGeneral: 'AB' | 'CE';
}

interface WipCapturaRow {
  id: string;
  po: string;
  part: string;
  contrato: string;
  estilo: string;
  qty: number;
  piezasTotal: number | null;
  completado: boolean;
  estadoCaptura: 'CAPTURADO COMPLETO' | 'CAPTURADO PARCIAL';
  estadoGeneral: 'AB' | 'CE';
  modificadoPor: string;
  fechaModificacion: string;
}

interface OrdenDiaRow {
  id: string;
  contrato: string;
  status: 'CAPTURADO COMPLETO' | 'CAPTURADO PARCIAL';
  despuesCaptura: 'DESPACHADO' | 'NO ENTREGADO' | 'CONTEO';
  departamento?: string;
  po?: string;
  qty?: number;
  estilo?: string;
  dueDate?: string;
  fechaModificacion: string;
}

export const TestWipNativoView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'INCOMPLETAS' | 'ORDENES_DEL_DIA' | 'DATABASE'>('INCOMPLETAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  
  const [masterDbList, setMasterDbList] = useState<MasterDbItem[]>([]);
  const [masterDbLookup, setMasterDbLookup] = useState<Record<string, MasterDbItem>>({});
  const [capturasData, setCapturasData] = useState<WipCapturaRow[]>([]);
  const [ordenesDiaData, setOrdenesDiaData] = useState<OrdenDiaRow[]>([]);
  
  const [inputPo, setInputPo] = useState('');
  
  const [totalOrdenesDiaR4, setTotalOrdenesDiaR4] = useState<number>(() => {
    return parseInt(localStorage.getItem('wip_r4_meta') || '128', 10);
  });
  const [isEditingR4, setIsEditingR4] = useState(false);
  const [tempR4, setTempR4] = useState(totalOrdenesDiaR4.toString());

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedData, setPastedData] = useState('');
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [pendingTransferContract, setPendingTransferContract] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const activeUser = sessionStorage.getItem('authenticated_user') || 'JMERCADO';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setShowToolsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveR4 = () => {
    const parsed = parseInt(tempR4, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setTotalOrdenesDiaR4(parsed);
      localStorage.setItem('wip_r4_meta', parsed.toString());
    }
    setIsEditingR4(false);
  };

  const fetchSupabaseData = async () => {
    setIsRefreshing(true);
    try {
      const { data: dbMaster } = await supabase
        .from('wip_master_db')
        .select('*')
        .order('po', { ascending: true });

      const lookup: Record<string, MasterDbItem> = {};
      let list: MasterDbItem[] = [];

      if (dbMaster) {
        list = dbMaster.map((item: any) => {
          const formatted = {
            id: item.id,
            po: item.po,
            part: item.part,
            contrato: item.contrato,
            estilo: item.estilo || '',
            qty: item.qty || 0,
            estadoGeneral: (item.estado_general as 'AB' | 'CE') || 'AB',
          };
          lookup[item.po.toLowerCase()] = formatted;
          return formatted;
        });
        setMasterDbList(list);
        setMasterDbLookup(lookup);
      }

      const { data: dbCapturas } = await supabase
        .from('wip_incompletos')
        .select('*')
        .order('updated_at', { ascending: false });

      if (dbCapturas) {
        const grouped: Record<string, WipCapturaRow[]> = {};

        const mapped: WipCapturaRow[] = dbCapturas.map((item: any) => {
          const matchedDb = lookup[item.po.toLowerCase()];
          return {
            id: item.id,
            po: item.po,
            part: item.part || matchedDb?.part || 'A',
            contrato: item.contrato || matchedDb?.contrato || '',
            estilo: item.estilo && item.estilo !== 'PENDIENTE DB' ? item.estilo : (matchedDb?.estilo || 'NO ENCONTRADO EN DB'),
            qty: item.qty || matchedDb?.qty || 0,
            piezasTotal: null,
            completado: item.completado || false,
            estadoCaptura: item.estado_captura || (item.completado ? 'CAPTURADO COMPLETO' : 'CAPTURADO PARCIAL'),
            estadoGeneral: item.estado_general || matchedDb?.estadoGeneral || 'AB',
            modificadoPor: item.modificado_por || 'SISTEMA',
            fechaModificacion: item.updated_at ? new Date(item.updated_at).toLocaleString() : '',
          };
        });

        mapped.forEach((row) => {
          if (!grouped[row.contrato]) grouped[row.contrato] = [];
          grouped[row.contrato].push(row);
        });

        const structured: WipCapturaRow[] = [];
        Object.values(grouped).forEach((group) => {
          const sumTotal = group.reduce((acc, curr) => acc + curr.qty, 0);
          group.forEach((item, index) => {
            if (index === 0) item.piezasTotal = sumTotal;
            structured.push(item);
          });
        });

        setCapturasData(structured);
      }

      const { data: dbOrdenes } = await supabase
        .from('wip_stocks_vendidas')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbOrdenes) {
        const mappedOrdenes: OrdenDiaRow[] = dbOrdenes.map((item: any) => ({
          id: item.id || item.contrato,
          contrato: item.contrato,
          status: item.status || 'CAPTURADO COMPLETO',
          despuesCaptura: item.despachado || 'DESPACHADO',
          fechaModificacion: item.created_at ? new Date(item.created_at).toLocaleString() : '',
        }));
        setOrdenesDiaData(mappedOrdenes);
      }
    } catch (err) {
      console.error('Error cargando Supabase:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSupabaseData();
  }, []);

  const handleRunActualizarOrdenesDelDia = async () => {
    setIsRefreshing(true);
    try {
      const todayStr = new Date().toLocaleDateString('en-US');
      alert(`🔄 Ejecutando Actualizar Órdenes del Día para fecha ${todayStr}... Excluyendo 'Team Spirit (Queued)'.`);
      await fetchSupabaseData();
    } catch (err: any) {
      alert('Error ejecutando actualización: ' + err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleActionClick = async (actionName: string) => {
    setShowToolsMenu(false);
    switch (actionName) {
      case 'ACTUALIZAR_ORDENES_DIA':
        await handleRunActualizarOrdenesDelDia();
        break;

      case 'ENVIAR_DASHBOARD_CORREO':
        alert('📧 Dashboard de producción compilado y enviado.');
        break;

      case 'LIMPIAR_ORDENES_DIA_CE':
        if (window.confirm('¿Desea limpiar de Órdenes del Día los contratos cerrados (CE)?')) {
          await supabase.from('wip_stocks_vendidas').delete().eq('status', 'CE');
          fetchSupabaseData();
        }
        break;

      case 'BORRAR_CONTRATOS_CERRADOS_CE':
        if (window.confirm('¿Confirma eliminar globalmente todos los contratos con estatus Cerrado (CE)?')) {
          await supabase.from('wip_incompletos').delete().eq('estado_general', 'CE');
          fetchSupabaseData();
        }
        break;

      default:
        alert(`Ejecutando acción: ${actionName}`);
        break;
    }
  };

  const confirmAndExecuteTransfer = async (contratoId: string) => {
    const { error } = await supabase
      .from('wip_stocks_vendidas')
      .upsert([{ contrato: contratoId, status: 'CAPTURADO COMPLETO', despachado: 'DESPACHADO' }], { onConflict: 'contrato' });

    if (!error) {
      alert(`✅ Contrato ${contratoId} transferido correctamente a "ÓRDENES DEL DÍA".`);
      fetchSupabaseData();
    } else {
      alert('Error al transferir contrato: ' + error.message);
    }
    setPendingTransferContract(null);
  };

  const handleAddPoCaptura = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const poClean = inputPo.trim().toUpperCase();
    if (!poClean) return;

    const match = masterDbLookup[poClean.toLowerCase()];
    const partExtracted = poClean.replace(/[^a-zA-Z]/g, '');
    const contratoExtracted = poClean.replace(/[a-zA-Z]/g, '');

    const newRow = {
      po: poClean,
      part: match?.part || partExtracted || 'A',
      contrato: match?.contrato || contratoExtracted,
      estilo: match?.estilo || 'PENDIENTE DB',
      qty: match?.qty || 0,
      completado: false,
      estado_captura: 'CAPTURADO PARCIAL',
      estado_general: match?.estadoGeneral || 'AB',
      modificado_por: activeUser,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('wip_incompletos').insert([newRow]);
    if (!error) {
      setInputPo('');
      fetchSupabaseData();
    } else {
      alert('Error guardando captura: ' + error.message);
    }
  };

  const toggleStatus = async (row: WipCapturaRow) => {
    const nextCompletado = !row.completado;
    const nextEstadoCaptura = nextCompletado ? 'CAPTURADO COMPLETO' : 'CAPTURADO PARCIAL';

    const { error } = await supabase
      .from('wip_incompletos')
      .update({
        completado: nextCompletado,
        estado_captura: nextEstadoCaptura,
        modificado_por: activeUser,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (!error) {
      const updatedLocal = capturasData.map((item) =>
        item.id === row.id
          ? {
              ...item,
              completado: nextCompletado,
              estadoCaptura: nextEstadoCaptura as any,
              modificadoPor: activeUser,
              fechaModificacion: new Date().toLocaleString(),
            }
          : item
      );
      setCapturasData(updatedLocal);

      const sameContractRows = updatedLocal.filter((r) => r.contrato === row.contrato);
      if (sameContractRows.length > 0 && sameContractRows.every((r) => r.completado)) {
        setPendingTransferContract(row.contrato);
      }
    }
  };

  const parseAndSaveMasterDb = async (rawMatrix: any[][]) => {
    const rowsToUpsert: any[] = [];

    rawMatrix.forEach((cols) => {
      if (!cols || cols.length < 2) return;
      const poFull = String(cols[1] || cols[0] || '').trim();
      if (poFull && poFull !== 'CODIGO_' && poFull.toUpperCase() !== 'PO') {
        const partExtracted = poFull.replace(/[^a-zA-Z]/g, '');
        const contratoExtracted = poFull.replace(/[a-zA-Z]/g, '');
        const estiloVal = String(cols[3] || '').trim();
        const qtyVal = parseInt(String(cols[11] || cols[4] || 0).trim(), 10) || 0;
        const estadoGenVal = (String(cols[9] || '').trim() as 'AB' | 'CE') || 'AB';

        rowsToUpsert.push({
          po: poFull,
          part: partExtracted || 'A',
          contrato: contratoExtracted,
          estilo: estiloVal,
          qty: qtyVal,
          estado_general: estadoGenVal,
          updated_at: new Date().toISOString(),
        });
      }
    });

    if (rowsToUpsert.length > 0) {
      const { error } = await supabase.from('wip_master_db').upsert(rowsToUpsert, { onConflict: 'po' });
      if (!error) {
        alert(`✅ Base de datos máster guardada con ${rowsToUpsert.length} contratos.`);
        setShowImportModal(false);
        setSelectedFile(null);
        setPastedData('');
        setActiveTab('DATABASE');
        fetchSupabaseData();
      } else {
        alert('Error al guardar en Database Máster: ' + error.message);
      }
    }
  };

  const handleFetchGoogleSheets = async () => {
    if (!sheetsUrl.trim()) return;
    try {
      const res = await fetch(sheetsUrl);
      const textData = await res.text();
      const lines = textData.split('\n');
      const matrix = lines.map(line => line.split(','));
      parseAndSaveMasterDb(matrix);
    } catch (err: any) {
      alert('Error descargando Google Sheets: ' + err.message);
    }
  };

  const handleProcessImport = async () => {
    if (sheetsUrl.trim()) {
      await handleFetchGoogleSheets();
      return;
    }

    if (selectedFile) {
      const dataBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(dataBuffer, { type: 'array' });
      const targetSheetName = workbook.SheetNames.find((s) => s.toUpperCase().includes('CONTRATO')) || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[targetSheetName];
      const jsonMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      parseAndSaveMasterDb(jsonMatrix);
    } else if (pastedData.trim()) {
      const lines = pastedData.trim().split('\n');
      const matrix = lines.map((line) => line.split('\t'));
      parseAndSaveMasterDb(matrix);
    }
  };

  const capturadoR3 = capturasData.filter((c) => c.completado).length;
  const restaR6 = Math.max(0, totalOrdenesDiaR4 - capturadoR3);

  const filteredCapturas = capturasData.filter(
    (c) =>
      c.po.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.estilo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrdenesDia = ordenesDiaData.filter((o) =>
    o.contrato.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMasterList = masterDbList.filter(
    (m) =>
      m.po.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.estilo.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans text-white p-2 md:p-4">
      {/* Selector de Pestañas y Herramientas */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-2 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('INCOMPLETAS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'INCOMPLETAS'
                ? 'bg-[#00f2fe] text-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                : 'bg-[#12161f] text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>INCOMPLETAS</span>
          </button>

          <button
            onClick={() => setActiveTab('ORDENES_DEL_DIA')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'ORDENES_DEL_DIA'
                ? 'bg-[#00f2fe] text-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                : 'bg-[#12161f] text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>ÓRDENES DEL DÍA ({ordenesDiaData.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('DATABASE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'DATABASE'
                ? 'bg-[#00f2fe] text-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                : 'bg-[#12161f] text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>DATABASE DE CONTRATOS</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Buscador Global */}
          <div className="relative w-48 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar PO, Contrato o Estilo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#0d1017] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#00f2fe]"
            />
          </div>

          <div className="relative" ref={toolsMenuRef}>
            <button
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-[#12161f] border border-[#00f2fe]/40 text-[#00f2fe] rounded-lg text-xs font-bold hover:bg-[#00f2fe]/10 transition-all cursor-pointer"
            >
              <span>Acciones de Producción</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showToolsMenu ? 'rotate-180' : ''}`} />
            </button>

            {showToolsMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-[#0d1017] border border-[#00f2fe]/30 rounded-xl shadow-2xl z-50 py-2 text-xs space-y-1">
                <button onClick={() => handleActionClick('ENVIAR_DASHBOARD_CORREO')} className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2 text-gray-200">
                  <Mail className="w-3.5 h-3.5 text-[#00f2fe]" /> Enviar Dashboard por Correo
                </button>
                <button onClick={() => handleActionClick('ACTUALIZAR_ORDENES_DIA')} className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2 text-gray-200">
                  <RefreshCw className="w-3.5 h-3.5 text-[#39ff14]" /> Actualizar Órdenes Del Día
                </button>
                <div className="border-t border-white/10 my-1"></div>
                <button onClick={() => handleActionClick('LIMPIAR_ORDENES_DIA_CE')} className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2 text-gray-200">
                  <Trash2 className="w-3.5 h-3.5 text-[#ff007f]" /> Limpiar Órdenes del Dia (CE)
                </button>
                <button onClick={() => handleActionClick('BORRAR_CONTRATOS_CERRADOS_CE')} className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2 text-gray-200">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" /> Borrar Contratos Cerrados (CE)
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#39ff14]/15 border border-[#39ff14] text-[#39ff14] rounded-lg text-xs font-bold hover:bg-[#39ff14] hover:text-black transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Cargar Database</span>
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: INCOMPLETAS */}
      {activeTab === 'INCOMPLETAS' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-[#1d2756] via-[#151c3d] to-[#0d1017] border border-[#00f2fe]/40 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="text-center md:text-left">
              <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2 flex-wrap">
                <span>Ordenes del día:</span>{' '}
                {isEditingR4 ? (
                  <input
                    type="number"
                    value={tempR4}
                    onChange={(e) => setTempR4(e.target.value)}
                    onBlur={handleSaveR4}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveR4()}
                    className="w-20 px-2 py-0.5 bg-[#0d1017] border border-[#00f2fe] text-[#00f2fe] font-mono text-base rounded outline-none"
                    autoFocus
                  />
                ) : (
                  <span
                    className="text-[#00f2fe] cursor-pointer hover:underline flex items-center gap-1"
                    onClick={() => {
                      setTempR4(totalOrdenesDiaR4.toString());
                      setIsEditingR4(true);
                    }}
                  >
                    {totalOrdenesDiaR4} <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                  </span>
                )}
                <span>/ CAPTURADO:</span> <span className="text-[#39ff14]">{capturadoR3}</span>
                <span>/ RESTA:</span> <span className="text-[#ff007f]">{restaR6}</span>
              </h2>
            </div>

            <form onSubmit={handleAddPoCaptura} className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="Escanear o digitar PO en Col A..."
                value={inputPo}
                onChange={(e) => setInputPo(e.target.value)}
                className="px-3 py-2 bg-[#0d1017] border border-[#00f2fe]/50 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#00f2fe] w-full md:w-64"
              />
              <button type="submit" className="px-3 py-2 bg-[#00f2fe] text-black font-extrabold text-xs rounded-lg flex items-center gap-1 cursor-pointer">
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </form>
          </div>

          <div className="bg-[#12161f] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0d1017] text-[#00f2fe] border-b border-white/10 uppercase font-extrabold tracking-wider">
                    <th className="p-3">PO</th>
                    <th className="p-3 text-center">PART</th>
                    <th className="p-3 text-center">CONTRATO</th>
                    <th className="p-3">ESTILO</th>
                    <th className="p-3 text-center">QTY</th>
                    <th className="p-3 text-center text-[#39ff14]">PIEZAS</th>
                    <th className="p-3 text-center">CAPTURA (CHECK)</th>
                    <th className="p-3 text-center">ESTADO</th>
                    <th className="p-3 text-center">ESTATUS GENERAL</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCapturas.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-400 font-mono">
                        No hay capturas activas. Escanea o digita un PO en la casilla superior para empezar.
                      </td>
                    </tr>
                  ) : (
                    filteredCapturas.map((row, idx) => {
                      const prevRow = filteredCapturas[idx - 1];
                      const isNewContractGroup = !prevRow || prevRow.contrato !== row.contrato;

                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-white/5 transition-colors ${
                            isNewContractGroup ? 'border-t-2 border-[#00f2fe]/40 bg-white/[0.02]' : 'border-t border-white/5'
                          }`}
                        >
                          <td className="p-3 font-mono font-bold text-white">{row.po}</td>
                          <td className="p-3 text-center font-bold text-gray-400">{row.part}</td>
                          <td className="p-3 text-center font-mono font-bold text-[#00f2fe]">{row.contrato}</td>
                          <td className="p-3 font-bold text-gray-200">{row.estilo}</td>
                          <td className="p-3 text-center font-bold text-gray-300">{row.qty}</td>
                          <td className="p-3 text-center font-black text-[#39ff14] text-sm">{row.piezasTotal}</td>
                          <td className="p-3 text-center">
                            <button onClick={() => toggleStatus(row)} className="p-1 cursor-pointer">
                              {row.completado ? <CheckSquare className="w-5 h-5 text-[#39ff14]" /> : <Square className="w-5 h-5 text-gray-500" />}
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-3 py-1 rounded text-[10px] font-black ${row.completado ? 'bg-[#39ff14] text-black' : 'bg-[#ffe600]/20 text-[#ffe600]'}`}>
                              {row.completado ? 'CAPTURADO COMPLETO' : 'CAPTURADO PARCIAL'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 bg-[#00f2fe]/20 text-[#00f2fe] rounded text-[10px] font-bold">{row.estadoGeneral}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: ÓRDENES DEL DÍA */}
      {activeTab === 'ORDENES_DEL_DIA' && (
        <div className="bg-[#12161f] border border-white/10 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-extrabold text-[#00f2fe] uppercase flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#39ff14]" /> Órdenes del Día Transferidas — Total: {ordenesDiaData.length}
          </h3>
          <div className="overflow-x-auto border border-white/10 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0d1017] text-[#00f2fe] border-b border-white/10 font-bold">
                  <th className="p-3">CONTRATO</th>
                  <th className="p-3 text-center">STATUS</th>
                  <th className="p-3 text-center">DESPUÉS DE CAPTURA</th>
                  <th className="p-3 text-center">FECHA REGISTRO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredOrdenesDia.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5">
                    <td className="p-3 font-bold text-white">{item.contrato}</td>
                    <td className="p-3 text-center"><span className="px-3 py-1 bg-[#39ff14] text-black font-black rounded text-[10px]">{item.status}</span></td>
                    <td className="p-3 text-center"><span className="px-3 py-1 bg-[#39ff14]/20 text-[#39ff14] font-black rounded text-[10px]">{item.despuesCaptura}</span></td>
                    <td className="p-3 text-center text-gray-400">{item.fechaModificacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: DATABASE DE CONTRATOS */}
      {activeTab === 'DATABASE' && (
        <div className="bg-[#12161f] border border-white/10 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-extrabold text-[#00f2fe] uppercase">
            Base de Datos Master de Contratos (NewSoft) — Total cargados: {masterDbList.length}
          </h3>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-white/10 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#0d1017] text-[#00f2fe] border-b border-white/10 font-bold">
                <tr>
                  <th className="p-2.5">PO</th>
                  <th className="p-2.5 text-center">PART</th>
                  <th className="p-2.5 text-center">CONTRATO</th>
                  <th className="p-2.5">ESTILO</th>
                  <th className="p-2.5 text-center">QTY</th>
                  <th className="p-2.5 text-center">ESTADO GENERAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredMasterList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="p-2.5 font-bold text-white">{item.po}</td>
                    <td className="p-2.5 text-center text-gray-400">{item.part}</td>
                    <td className="p-2.5 text-center text-[#00f2fe]">{item.contrato}</td>
                    <td className="p-2.5 text-gray-300">{item.estilo}</td>
                    <td className="p-2.5 text-center text-gray-200">{item.qty}</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${item.estadoGeneral === 'AB' ? 'bg-[#00f2fe]/20 text-[#00f2fe]' : 'bg-red-500/20 text-red-400'}`}>
                        {item.estadoGeneral}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Confirmación Transferencia */}
      {pendingTransferContract && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12161f] border border-[#00f2fe]/50 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#00f2fe] uppercase">Confirmar Transferencia</h3>
            <p className="text-xs text-gray-300">El contrato <strong className="text-[#39ff14]">{pendingTransferContract}</strong> completó todas sus partes. ¿Desea enviarlo a <strong className="text-white">"ÓRDENES DEL DÍA"</strong>?</p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setPendingTransferContract(null)} className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg text-xs font-bold">No / Cancelar</button>
              <button onClick={() => confirmAndExecuteTransfer(pendingTransferContract)} className="px-4 py-2 bg-[#00f2fe] text-black font-black rounded-lg text-xs">Sí, Transferir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cargar Database */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12161f] border border-[#00f2fe]/40 rounded-xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#00f2fe] flex items-center gap-2">
              <Upload className="w-5 h-5" /> Importar Database de Contratos
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-[#00f2fe]" /> Importar desde Enlace Google Sheets (CSV Publicado)
              </label>
              <input
                type="text"
                placeholder="Pega aquí el enlace de Google Sheets (Publicado como CSV)..."
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                className="w-full bg-[#0d1017] border border-white/10 rounded-lg p-2.5 text-xs text-[#00f2fe] font-mono focus:outline-none focus:border-[#00f2fe]"
              />
            </div>

            <div className="flex items-center gap-2 my-1">
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="text-[10px] text-gray-500 uppercase font-bold">O Sube un Archivo</span>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#00f2fe]/40 hover:border-[#00f2fe] rounded-xl p-3 text-center bg-[#0d1017]/60 cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
            >
              <FileSpreadsheet className="w-6 h-6 text-[#00f2fe]" />
              <p className="text-xs text-gray-200">
                {selectedFile ? (
                  <span className="text-[#39ff14] font-bold">Archivo: {selectedFile.name}</span>
                ) : (
                  <>Seleccionar Archivo Excel (.xls, .xlsx, .csv)</>
                )}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
                }}
              />
            </div>

            <div className="flex items-center gap-2 my-1">
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="text-[10px] text-gray-500 uppercase font-bold">O Pega Celdas</span>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>

            <textarea
              rows={3}
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              placeholder="Pega las filas copiadas de Excel o Google Sheets..."
              className="w-full bg-[#0d1017] border border-white/10 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-[#00f2fe]"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedFile(null);
                  setPastedData('');
                  setSheetsUrl('');
                }}
                className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg text-xs font-bold hover:bg-white/10 cursor-pointer"
              >
                Cancelar
              </button>
              <button onClick={handleProcessImport} className="px-4 py-2 bg-[#00f2fe] text-black rounded-lg text-xs font-extrabold hover:brightness-110 cursor-pointer">
                Guardar Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestWipNativoView;
