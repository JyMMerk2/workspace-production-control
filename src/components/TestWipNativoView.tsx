import React, { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, CheckCircle2, Clock, Database, Upload, Trash2, UserCheck, ShieldAlert, Wifi, FileSpreadsheet, Plus, Table, AlertTriangle } from 'lucide-react';
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

export const TestWipNativoView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'INCOMPLETAS' | 'DATABASE'>('INCOMPLETAS');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados de datos
  const [masterDbList, setMasterDbList] = useState<MasterDbItem[]>([]);
  const [masterDbLookup, setMasterDbLookup] = useState<Record<string, MasterDbItem>>({});
  const [capturasData, setCapturasData] = useState<WipCapturaRow[]>([]);
  
  // Entrada para captura rápida (Columna A)
  const [inputPo, setInputPo] = useState('');
  const [ordenesDelDia, setOrdenesDelDia] = useState<number>(128);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedData, setPastedData] = useState('');
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Modal de confirmación para transferir a WIP Stocks & Vendidas
  const [pendingTransferContract, setPendingTransferContract] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUser = sessionStorage.getItem('authenticated_user') || 'JMERCADO';

  // 1. Cargar datos de Supabase (Capturas e Importación de Database Máster)
  const fetchSupabaseData = async () => {
    setIsRefreshing(true);
    try {
      // Cargar Capturas Incompletas
      const { data: dbCapturas } = await supabase
        .from('wip_incompletos')
        .select('*')
        .order('updated_at', { ascending: false });

      if (dbCapturas) {
        const grouped: Record<string, WipCapturaRow[]> = {};

        const mapped: WipCapturaRow[] = dbCapturas.map((item: any) => ({
          id: item.id,
          po: item.po,
          part: item.part,
          contrato: item.contrato,
          estilo: item.estilo || '',
          qty: item.qty || 0,
          piezasTotal: null,
          completado: item.completado || false,
          estadoCaptura: item.estado_captura || (item.completado ? 'CAPTURADO COMPLETO' : 'CAPTURADO PARCIAL'),
          estadoGeneral: item.estado_general || 'AB',
          modificadoPor: item.modificado_por || 'SISTEMA',
          fechaModificacion: item.updated_at ? new Date(item.updated_at).toLocaleString() : '',
        }));

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

      // Cargar Database Máster de Contratos
      const { data: dbMaster } = await supabase
        .from('wip_master_db')
        .select('*')
        .order('po', { ascending: true });

      if (dbMaster) {
        const lookup: Record<string, MasterDbItem> = {};
        const list: MasterDbItem[] = dbMaster.map((item: any) => {
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
    } catch (err) {
      console.error('Error cargando Supabase:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSupabaseData();

    const channel = supabase
      .channel('public:wip_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wip_incompletos' }, () => fetchSupabaseData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wip_master_db' }, () => fetchSupabaseData())
      .subscribe((status) => {
        setIsLiveConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Confirmar y Ejecutar Transferencia
  const confirmAndExecuteTransfer = async (contratoId: string) => {
    const { error } = await supabase
      .from('wip_stocks_vendidas')
      .upsert([{ contrato: contratoId }], { onConflict: 'contrato' });

    if (!error) {
      alert(`✅ Contrato ${contratoId} transferido a "WIP Stocks & Vendidas" (Columna A).`);
    } else {
      alert('Error al transferir contrato: ' + error.message);
    }
    setPendingTransferContract(null);
  };

  const revertTransferIfIncomplete = async (contratoId: string) => {
    await supabase.from('wip_stocks_vendidas').delete().eq('contrato', contratoId);
  };

  const evaluateContractCompletion = (contratoId: string, dataset: WipCapturaRow[]) => {
    const sameContractRows = dataset.filter((r) => r.contrato === contratoId);
    const allCompleted = sameContractRows.length > 0 && sameContractRows.every((r) => r.completado);

    if (allCompleted) {
      setPendingTransferContract(contratoId);
    } else {
      revertTransferIfIncomplete(contratoId);
    }
  };

  // Agregar nuevo PO a Incompletas (Consultando la Master DB)
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
      completado: true,
      estado_captura: 'CAPTURADO COMPLETO',
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

  // Toggle Checkbox
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
      evaluateContractCompletion(row.contrato, updatedLocal);
    }
  };

  // Guardar Excel DIRECTAMENTE en la Pestaña DATABASE DE CONTRATOS (`wip_master_db`)
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
      // Guardar en la tabla wip_master_db
      const { error } = await supabase.from('wip_master_db').upsert(rowsToUpsert, { onConflict: 'po' });
      if (!error) {
        alert(`✅ Base de datos máster guardada correctamente con ${rowsToUpsert.length} contratos.`);
        setShowImportModal(false);
        setSelectedFile(null);
        setPastedData('');
        fetchSupabaseData();
      } else {
        alert('Error al guardar en Database Máster: ' + error.message);
      }
    } else {
      alert('No se detectaron filas válidas de NewSoft.');
    }
  };

  const handleProcessImport = async () => {
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

  const totalCapturados = capturasData.filter((c) => c.completado).length;
  const restaCalculada = Math.max(0, ordenesDelDia - totalCapturados);

  const filteredCapturas = capturasData.filter(
    (c) =>
      c.po.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.estilo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMasterList = masterDbList.filter(
    (m) =>
      m.po.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.estilo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans text-white p-2 md:p-4">
      {/* Selector de Pestañas */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
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

        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#39ff14]/15 border border-[#39ff14] text-[#39ff14] rounded-lg text-xs font-bold hover:bg-[#39ff14] hover:text-black transition-all cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Cargar Database</span>
        </button>
      </div>

      {/* PESTAÑA 1: INCOMPLETAS */}
      {activeTab === 'INCOMPLETAS' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-[#1d2756] via-[#151c3d] to-[#0d1017] border border-[#00f2fe]/40 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="text-center md:text-left">
              <h2 className="text-lg font-black text-white tracking-wide">
                Órdenes del día: <span className="text-[#00f2fe]">{ordenesDelDia}</span> / CAPTURADO:{' '}
                <span className="text-[#39ff14]">{totalCapturados}</span> / RESTA:{' '}
                <span className="text-[#ff007f]">{restaCalculada}</span>
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
              <button type="submit" className="px-3 py-2 bg-[#00f2fe] text-black font-extrabold text-xs rounded-lg flex items-center gap-1">
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
                    <th className="p-3 text-center">ESTADO</th>
                    <th className="p-3 text-center">ESTATUS GENERAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCapturas.map((row) => (
                    <tr key={row.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-white">{row.po}</td>
                      <td className="p-3 text-center font-bold text-gray-400">{row.part}</td>
                      <td className="p-3 text-center font-mono font-bold text-[#00f2fe]">{row.contrato}</td>
                      <td className="p-3 font-bold text-gray-200">{row.estilo}</td>
                      <td className="p-3 text-center font-bold text-gray-300">{row.qty}</td>
                      <td className="p-3 text-center font-black text-[#39ff14] text-sm">
                        {row.piezasTotal !== null ? row.piezasTotal : ''}
                      </td>

                      <td className="p-3 text-center">
                        <button
                          onClick={() => toggleStatus(row)}
                          className={`px-3 py-1 rounded text-[10px] font-black border cursor-pointer ${
                            row.completado
                              ? 'bg-[#39ff14] text-black border-[#39ff14] shadow-[0_0_8px_rgba(57,255,20,0.4)]'
                              : 'bg-[#ffe600]/20 text-[#ffe600] border-[#ffe600]'
                          }`}
                        >
                          {row.completado ? 'CAPTURADO COMPLETO' : 'CAPTURADO PARCIAL'}
                        </button>
                      </td>

                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.estadoGeneral === 'AB' ? 'bg-[#00f2fe]/20 text-[#00f2fe]' : 'bg-red-500/20 text-red-400'}`}>
                          {row.estadoGeneral}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: DATABASE DE CONTRATOS (AHORA PERSISTENTE DESDE SUPABASE) */}
      {activeTab === 'DATABASE' && (
        <div className="bg-[#12161f] border border-white/10 rounded-xl p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-[#00f2fe] uppercase">
              Base de Datos Master de Contratos (NewSoft) — Total cargados: {masterDbList.length}
            </h3>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar en Database..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#0d1017] border border-white/10 rounded text-xs text-white focus:outline-none focus:border-[#00f2fe]"
              />
            </div>
          </div>

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

      {/* Modal Pregunta Confirmación Transferencia */}
      {pendingTransferContract && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12161f] border border-[#00f2fe]/50 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-[#00f2fe]">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
              <h3 className="text-base font-bold uppercase">Confirmar Transferencia</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              El contrato <strong className="text-[#39ff14]">{pendingTransferContract}</strong> completó todas sus partes. ¿Desea enviarlo a <strong className="text-white">"WIP STOCKS & VENDIDAS"</strong> (Columna A)?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPendingTransferContract(null)}
                className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg text-xs font-bold hover:bg-white/20 transition-all cursor-pointer"
              >
                No / Cancelar
              </button>
              <button
                onClick={() => confirmAndExecuteTransfer(pendingTransferContract)}
                className="px-4 py-2 bg-[#00f2fe] text-black font-black rounded-lg text-xs hover:brightness-110 transition-all cursor-pointer"
              >
                Sí, Transferir
              </button>
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
            <p className="text-xs text-[#8f9ba8]">
              Sube el archivo <strong className="text-white">database de contratos.xls</strong> o pega el contenido. Se guardará directamente en la pestaña <strong className="text-[#00f2fe]">DATABASE DE CONTRATOS</strong>.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#00f2fe]/40 hover:border-[#00f2fe] rounded-xl p-4 text-center bg-[#0d1017]/60 cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-8 h-8 text-[#00f2fe]" />
              <p className="text-xs text-gray-200">
                {selectedFile ? (
                  <span className="text-[#39ff14] font-bold">Archivo seleccionado: {selectedFile.name}</span>
                ) : (
                  <>Haz clic para <span className="text-[#00f2fe] underline font-bold">Seleccionar Archivo Excel (.xls, .xlsx, .csv)</span></>
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

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedFile(null);
                  setPastedData('');
                }}
                className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg text-xs font-bold"
              >
                Cancelar
              </button>
              <button onClick={handleProcessImport} className="px-4 py-2 bg-[#00f2fe] text-black rounded-lg text-xs font-extrabold hover:brightness-110">
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
