import React, { useState, useEffect, useRef } from 'react';
import { wipEngineService } from '../services/wipEngineService';

type SubPestanaWip = 'buscar-bp' | 'buscar-fd' | 'ordenes-dia' | 'queue-results';

interface OrdenItem {
  id: string;
  po: string;
  contrato: string;
  qty: number;
  style: string;
  color: string;
  tipo: 'CUSTOM' | 'STOCK' | 'OTHER';
  checkShipping: boolean;
  checkCaptura: boolean;
}

interface FilaQueue {
  department: string;
  po: string;
  units: number;
  styles: string;
  name: string;
  teamName: string;
  date: string;
  dueDate: string;
  memo: string;
  readyForDr: string;
  createdFrom: string;
  classType: string;
}

interface FilaOrdenDia {
  id: string;
  colA_Anotar: string;
  colB_Status: string;
  colC_DespuesCaptura: string;
  department: string;
  po: string;
  qty: number;
  styles: string;
  dueDate: string;
  memo: string;
  esHoy: boolean;
}

interface ModalInfo {
  isOpen: boolean;
  tipo: 'confirm' | 'info' | 'error';
  titulo: string;
  mensaje: string;
  onConfirm?: () => void;
}

const STORAGE_BP_KEY = 'wip_stocks_tablas_bp_v1';
const STORAGE_FD_KEY = 'wip_stocks_tablas_fd_v1';
const STORAGE_ORDENES_DIA_KEY = 'wip_ordenes_dia_filas_v1';
const STORAGE_QUEUE_KEY = 'wip_customization_queue_v1';

const cargarEstadoInicialBP = (): Record<string, OrdenItem[]> => {
  try {
    const guardado = localStorage.getItem(STORAGE_BP_KEY);
    if (guardado) return JSON.parse(guardado);
  } catch (e) {
    console.error('Error cargando tablas BP', e);
  }
  return {
    'CUSTOM BAGS': [], 'SPUT 1': [], 'SPUT 2': [],
    'BIG BAG UTILITY 1': [], 'BIG BAG UTILITY 2': [],
    'UTILITY BAG LINE 3': [], 'LINEA 7 (CN)': [],
  };
};

const cargarEstadoInicialFD = (): Record<string, OrdenItem[]> => {
  try {
    const guardado = localStorage.getItem(STORAGE_FD_KEY);
    if (guardado) return JSON.parse(guardado);
  } catch (e) {
    console.error('Error cargando tablas FD', e);
  }
  return {
    'FULL DYE CELDA 1': [], 'FULL DYE CELDA 2': [], 'FULL DYE CELDA 3': [],
    'FULL DYE CELDA 4': [], 'PANTS LINE 1': [], 'PANTS LINE 2': [], 'HATS LINE': [],
  };
};

const cargarOrdenesDiaIniciales = (): FilaOrdenDia[] => {
  try {
    const guardado = localStorage.getItem(STORAGE_ORDENES_DIA_KEY);
    if (guardado) return JSON.parse(guardado);
  } catch (e) {
    console.error('Error cargando órdenes del día', e);
  }
  return [];
};

const cargarQueueInicial = (): FilaQueue[] => {
  try {
    const guardado = localStorage.getItem(STORAGE_QUEUE_KEY);
    if (guardado) return JSON.parse(guardado);
  } catch (e) {
    console.error('Error cargando queue', e);
  }
  return [];
};

const esMismaFechaHoy = (fechaTexto: string): boolean => {
  if (!fechaTexto) return false;

  const hoy = new Date();
  const anioHoy = hoy.getFullYear();
  const mesHoy = hoy.getMonth() + 1;
  const diaHoy = hoy.getDate();

  let limpia = String(fechaTexto).trim();
  if (limpia.includes('T')) limpia = limpia.split('T')[0];

  let anio = 0, mes = 0, dia = 0;

  if (limpia.includes('-')) {
    const partes = limpia.split('-');
    if (partes.length === 3) {
      anio = parseInt(partes[0], 10);
      mes = parseInt(partes[1], 10);
      dia = parseInt(partes[2], 10);
    }
  } else if (limpia.includes('/')) {
    const partes = limpia.split('/');
    if (partes.length === 3) {
      mes = parseInt(partes[0], 10);
      dia = parseInt(partes[1], 10);
      anio = parseInt(partes[2], 10);
    }
  }

  return anio === anioHoy && mes === mesHoy && dia === diaHoy;
};

export const WipStocksVendidasView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubPestanaWip>('buscar-bp');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [inputsPorTabla, setInputsPorTabla] = useState<Record<string, string>>({});
  const [inputOrdenDiaManual, setInputOrdenDiaManual] = useState('');
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);

  const [tablasBP, setTablasBP] = useState<Record<string, OrdenItem[]>>(cargarEstadoInicialBP);
  const [tablasFD, setTablasFD] = useState<Record<string, OrdenItem[]>>(cargarEstadoInicialFD);
  const [filasOrdenesDia, setFilasOrdenesDia] = useState<FilaOrdenDia[]>(cargarOrdenesDiaIniciales);
  const [queueResults, setQueueResults] = useState<FilaQueue[]>(cargarQueueInicial);

  const [modal, setModal] = useState<ModalInfo>({
    isOpen: false,
    tipo: 'info',
    titulo: '',
    mensaje: '',
  });

  const fileInputQueueRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_BP_KEY, JSON.stringify(tablasBP));
  }, [tablasBP]);

  useEffect(() => {
    localStorage.setItem(STORAGE_FD_KEY, JSON.stringify(tablasFD));
  }, [tablasFD]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ORDENES_DIA_KEY, JSON.stringify(filasOrdenesDia));
  }, [filasOrdenesDia]);

  useEffect(() => {
    localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(queueResults));
  }, [queueResults]);

  useEffect(() => {
    const listener = () => {
      confirmarYActualizarOrdenesDelDia();
    };
    window.addEventListener('actualizar-ordenes-dia-event', listener);
    return () => {
      window.removeEventListener('actualizar-ordenes-dia-event', listener);
    };
  }, [queueResults, filasOrdenesDia]);

  const activeTablas = activeSubTab === 'buscar-bp' ? tablasBP : tablasFD;
  const todasOrdenesTablas = Object.values(activeTablas).flat();

  // Contratos anotados explícitamente en la Columna A de la hoja Órdenes del Día
  const contratosAnotadosColA = filasOrdenesDia
    .map(f => f.colA_Anotar.replace(/[A-Za-z]/g, '').trim())
    .filter(c => c !== '');

  // Lógica de Evaluación Jerárquica para las Tablas de BP y FD
  const calcularEstadoFormulaJerarquica = (item: OrdenItem): { texto: string; estiloClass: string; checkAuto: boolean } => {
    const estaEnOrdenesDelDiaLocal = contratosAnotadosColA.includes(item.contrato);

    let estaEnOrdenesDelDiaServicio = false;
    let datosIncompletos: any = null;

    try {
      if (wipEngineService && typeof wipEngineService.estaEnOrdenesDelDia === 'function') {
        estaEnOrdenesDelDiaServicio = wipEngineService.estaEnOrdenesDelDia(item.contrato);
      }
      if (wipEngineService && typeof wipEngineService.obtenerEstadoIncompleto === 'function') {
        datosIncompletos = wipEngineService.obtenerEstadoIncompleto(item.po);
      }
    } catch (e) {
      console.warn('Servicio no disponible', e);
    }

    const registradoEnOrdenesDelDia = estaEnOrdenesDelDiaLocal || estaEnOrdenesDelDiaServicio;

    if (registradoEnOrdenesDelDia || item.checkCaptura) {
      return {
        texto: 'CAPTURADO COMPLETO',
        estiloClass: 'bg-emerald-500/20 text-emerald-600 dark:text-[#39ff14] border-emerald-500/40',
        checkAuto: true,
      };
    }

    if (datosIncompletos && !datosIncompletos.completado) {
      return {
        texto: 'PARCIAL / EN PROCESO',
        estiloClass: 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40',
        checkAuto: false,
      };
    }

    return {
      texto: 'FALTA CAPTURA',
      estiloClass: 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/40',
      checkAuto: false,
    };
  };

  // Cálculo para cada fila en la sub-pestaña Órdenes del Día
  const calcularFormulasFilaOrdenDia = (fila: FilaOrdenDia) => {
    const poContrato = fila.po.replace(/[A-Za-z]/g, '').trim();
    const colA_Limpia = fila.colA_Anotar.replace(/[A-Za-z]/g, '').trim();

    // Revisa si esa PO está capturada en alguna de las tablas activas de BP o FD
    const capturadaEnTablas = todasOrdenesTablas.some(
      o => o.contrato === poContrato && (o.checkCaptura || calcularEstadoFormulaJerarquica(o).checkAuto)
    );

    let statusB = 'FALTA CAPTURA';
    let despuesCapturaC = 'NO ENTREGADO';

    if (colA_Limpia !== '' || capturadaEnTablas) {
      statusB = 'CAPTURADO COMPLETO';
      despuesCapturaC = 'CONTEO';
    }

    return { statusB, despuesCapturaC };
  };

  // MÉTIRICAS REALES BASADAS EN ÓRDENES DEL DÍA (HOY)
  const ordenesHoyEnDia = filasOrdenesDia.filter(f => f.esHoy);
  const totalOrdenesHoy = ordenesHoyEnDia.length;

  const capturadosHoyCount = ordenesHoyEnDia.filter(f => {
    const res = calcularFormulasFilaOrdenDia(f);
    return res.statusB === 'CAPTURADO COMPLETO';
  }).length;

  const restaHoyCount = totalOrdenesHoy - capturadosHoyCount;

  // Métricas de las Tablas Activas
  const totalOrders = todasOrdenesTablas.length;
  const ctmOrders = todasOrdenesTablas.filter(o => o.tipo === 'CUSTOM').length;
  const stockOrders = todasOrdenesTablas.filter(o => o.tipo === 'STOCK').length;
  const capturadosTablas = todasOrdenesTablas.filter(o => {
    const evalRes = calcularEstadoFormulaJerarquica(o);
    return o.checkCaptura || evalRes.checkAuto;
  }).length;
  const restaTablas = totalOrders - capturadosTablas;

  const confirmarYActualizarOrdenesDelDia = () => {
    if (queueResults.length === 0) {
      setModal({
        isOpen: true,
        tipo: 'error',
        titulo: 'Cola Vacía',
        mensaje: "La pestaña 'QUEUE RESULTS' no tiene registros. Por favor, sube primero el archivo CustomizationQueue2Results.xls.",
      });
      return;
    }

    setModal({
      isOpen: true,
      tipo: 'confirm',
      titulo: 'Actualizar Órdenes del Día',
      mensaje: `¿Deseas procesar la cola activa (${queueResults.length} filas) para filtrar las órdenes de HOY y conservar las pendientes?`,
      onConfirm: () => ejecutarProcesamientoActualizar(),
    });
  };

  const ejecutarProcesamientoActualizar = () => {
    const pendientesAAnadir = filasOrdenesDia.filter(row => {
      const dpto = (row.department || '').trim().toUpperCase();
      const po = (row.po || '').trim();
      const statusCaptura = (row.colB_Status || '').trim().toUpperCase();
      const despuesCaptura = (row.colC_DespuesCaptura || '').trim().toUpperCase();

      return po !== '' && dpto !== 'TEAM SPIRIT (QUEUED)' && statusCaptura !== 'CAPTURADO COMPLETO' && despuesCaptura !== 'DESPACHADO';
    });

    const ordenesHoy: FilaOrdenDia[] = [];
    const ordenesOtrosDias: FilaOrdenDia[] = [];

    queueResults.forEach((item, idx) => {
      const dpto = (item.department || '').trim().toUpperCase();
      if (dpto === 'TEAM SPIRIT (QUEUED)') return;

      const esHoy = esMismaFechaHoy(item.dueDate);

      const nuevaFila: FilaOrdenDia = {
        id: `qd-${idx}-${Date.now()}`,
        colA_Anotar: '',
        colB_Status: 'FALTA CAPTURA',
        colC_DespuesCaptura: 'NO ENTREGADO',
        department: item.department,
        po: item.po,
        qty: item.units,
        styles: item.styles,
        dueDate: item.dueDate,
        memo: item.memo,
        esHoy: esHoy
      };

      if (esHoy) {
        ordenesHoy.push(nuevaFila);
      } else {
        ordenesOtrosDias.push(nuevaFila);
      }
    });

    const listaCompletaActualizada = [...ordenesHoy, ...pendientesAAnadir, ...ordenesOtrosDias];
    setFilasOrdenesDia(listaCompletaActualizada);

    setModal({
      isOpen: true,
      tipo: 'info',
      titulo: 'Proceso Completado',
      mensaje: `✅ Órdenes del Día actualizadas correctamente.\n\n• Órdenes del Día (HOY): ${ordenesHoy.length}\n• Pendientes conservadas: ${pendientesAAnadir.length}\n• Registros de 'Team Spirit (Queued)' omitidos.`,
    });
  };

  const handleFileUploadQueue = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const queueImportado: FilaQueue[] = [];

      if (text.includes('<Workbook') || text.includes('xmlns="urn:schemas-microsoft-com:office:spreadsheet"')) {
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, 'text/xml');
          const rows = xmlDoc.getElementsByTagName('Row');

          for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].getElementsByTagName('Cell');
            const rowValues: string[] = [];

            for (let j = 0; j < cells.length; j++) {
              const dataTag = cells[j].getElementsByTagName('Data')[0];
              rowValues.push(dataTag ? dataTag.textContent || '' : '');
            }

            if (rowValues.length >= 8) {
              queueImportado.push({
                department: rowValues[0] || '',
                po: rowValues[1] || '',
                units: Number(rowValues[2]) || 1,
                styles: rowValues[3] || '',
                name: rowValues[4] || '',
                teamName: rowValues[5] || '',
                date: rowValues[6] || '',
                dueDate: rowValues[7] || '',
                memo: rowValues[8] || '',
                readyForDr: rowValues[9] || '',
                createdFrom: rowValues[10] || '',
                classType: rowValues[11] || '',
              });
            }
          }
        } catch (err) {
          console.error('Error leyendo XML NetSuite', err);
        }
      } else {
        const lineas = text.split(/\r\n|\n/);
        lineas.slice(1).forEach(linea => {
          const cols = linea.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/);
          if (cols.length >= 8) {
            queueImportado.push({
              department: cols[0]?.replace(/"/g, '').trim() || '',
              po: cols[1]?.replace(/"/g, '').trim() || '',
              units: Number(cols[2]) || 1,
              styles: cols[3]?.replace(/"/g, '').trim() || '',
              name: cols[4]?.replace(/"/g, '').trim() || '',
              teamName: cols[5]?.replace(/"/g, '').trim() || '',
              date: cols[6]?.replace(/"/g, '').trim() || '',
              dueDate: cols[7]?.replace(/"/g, '').trim() || '',
              memo: cols[8]?.replace(/"/g, '').trim() || '',
              readyForDr: cols[9]?.replace(/"/g, '').trim() || '',
              createdFrom: cols[10]?.replace(/"/g, '').trim() || '',
              classType: cols[11]?.replace(/"/g, '').trim() || '',
            });
          }
        });
      }

      if (queueImportado.length > 0) {
        setQueueResults(queueImportado);
        setModal({
          isOpen: true,
          tipo: 'info',
          titulo: 'Carga Exitosa',
          mensaje: `Se importaron ${queueImportado.length} registros a QUEUE RESULTS.`,
        });
      }
    };

    reader.readAsText(file);
    if (fileInputQueueRef.current) fileInputQueueRef.current.value = '';
  };

  const ejecutarAgregarOrdenEnTabla = async (nombreTabla: string) => {
    const valorInput = (inputsPorTabla[nombreTabla] || '').trim().toUpperCase();

    if (!valorInput) return;

    setLoadingBusqueda(true);

    try {
      let detalles: any = null;

      if (wipEngineService && typeof wipEngineService.buscarDetallesPO === 'function') {
        detalles = await wipEngineService.buscarDetallesPO(valorInput);
      }

      const contratoSoloNumeros = valorInput.replace(/[A-Za-z]/g, '');

      const itemNuevo: OrdenItem = {
        id: Date.now().toString(),
        po: valorInput,
        contrato: contratoSoloNumeros || valorInput,
        qty: detalles ? detalles.qty : 1,
        style: detalles ? detalles.style : 'FD-STANDARD',
        color: detalles ? detalles.color : 'CUSTOM',
        tipo: detalles ? detalles.tipo : 'CUSTOM',
        checkShipping: false,
        checkCaptura: false,
      };

      if (activeSubTab === 'buscar-bp') {
        setTablasBP(prev => ({
          ...prev,
          [nombreTabla]: [itemNuevo, ...(prev[nombreTabla] || [])],
        }));
      } else {
        setTablasFD(prev => ({
          ...prev,
          [nombreTabla]: [itemNuevo, ...(prev[nombreTabla] || [])],
        }));
      }

      setInputsPorTabla(prev => ({ ...prev, [nombreTabla]: '' }));
    } catch (error) {
      console.error(error);
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
    setModal({
      isOpen: true,
      tipo: 'confirm',
      titulo: 'Eliminar Orden',
      mensaje: '¿Deseas eliminar esta orden de la lista?',
      onConfirm: () => {
        const setter = activeSubTab === 'buscar-bp' ? setTablasBP : setTablasFD;
        setter(prev => ({
          ...prev,
          [tabla]: prev[tabla].filter(item => item.id !== id),
        }));
      },
    });
  };

  const handleAnotarColAManual = (e: React.FormEvent) => {
    e.preventDefault();
    const contratoLimpio = inputOrdenDiaManual.trim().replace(/[A-Za-z]/g, '');

    if (!contratoLimpio) return;

    setFilasOrdenesDia(prev => [
      {
        id: `manual-${Date.now()}`,
        colA_Anotar: contratoLimpio,
        colB_Status: 'CAPTURADO COMPLETO',
        colC_DespuesCaptura: 'CONTEO',
        department: 'MANUAL',
        po: contratoLimpio,
        qty: 1,
        styles: 'MANUAL',
        dueDate: 'HOY',
        memo: 'Anotación manual Col A',
        esHoy: true
      },
      ...prev
    ]);

    setInputOrdenDiaManual('');
  };

  const handleModificarColAInFila = (id: string, nuevoValor: string) => {
    setFilasOrdenesDia(prev =>
      prev.map(f => (f.id === id ? { ...f, colA_Anotar: nuevoValor } : f))
    );
  };

  const handleLimpiarOrdenesDia = () => {
    setModal({
      isOpen: true,
      tipo: 'confirm',
      titulo: 'Limpiar Órdenes del Día',
      mensaje: '¿Estás seguro de vaciar por completo la lista de Órdenes del Día?',
      onConfirm: () => setFilasOrdenesDia([]),
    });
  };

  const handleLimpiarQueue = () => {
    setModal({
      isOpen: true,
      tipo: 'confirm',
      titulo: 'Limpiar Queue Results',
      mensaje: '¿Estás seguro de eliminar los registros cargados de CustomizationQueue2Results?',
      onConfirm: () => setQueueResults([]),
    });
  };

  return (
    <div className="w-full space-y-4 font-sans text-slate-800 dark:text-slate-100 px-1 transition-colors duration-300">
      <input
        type="file"
        ref={fileInputQueueRef}
        onChange={handleFileUploadQueue}
        accept=".xls, .xlsx, .csv, .xml, .txt"
        className="hidden"
      />

      {/* Modal Profesional Integrado */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#121826] border border-slate-300 dark:border-[#00f2fe]/40 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-800 dark:text-white transition-colors duration-300">
            <h3 className={`text-lg font-black tracking-wide ${modal.tipo === 'error' ? 'text-red-500' : 'text-cyan-600 dark:text-[#00f2fe]'}`}>
              {modal.titulo}
            </h3>
            <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{modal.mensaje}</p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
              {modal.tipo === 'confirm' && (
                <button
                  onClick={() => setModal({ ...modal, isOpen: false })}
                  className="px-4 py-1.5 bg-slate-200 dark:bg-gray-800 hover:bg-slate-300 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 text-xs font-bold rounded-lg cursor-pointer transition-all"
                >
                  Cancelar
                </button>
              )}

              <button
                onClick={() => {
                  if (modal.onConfirm) modal.onConfirm();
                  setModal({ ...modal, isOpen: false });
                }}
                className="px-4 py-1.5 bg-cyan-500 dark:bg-[#00f2fe] hover:bg-cyan-600 dark:hover:bg-[#00c8d4] text-white dark:text-black font-extrabold text-xs rounded-lg cursor-pointer shadow-md transition-all"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Selector de Sub-pestañas */}
      <div className="flex items-center gap-2 border-b border-slate-300 dark:border-white/10 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveSubTab('buscar-bp')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'buscar-bp'
              ? 'bg-cyan-500 dark:bg-[#00f2fe] text-white dark:text-black font-extrabold shadow-lg'
              : 'bg-slate-200 dark:bg-[#121620] text-slate-600 dark:text-gray-400 hover:text-black dark:hover:text-white border border-slate-300 dark:border-white/5'
          }`}
        >
          🎒 TABLAS MOCHILAS
        </button>

        <button
          onClick={() => setActiveSubTab('buscar-fd')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'buscar-fd'
              ? 'bg-cyan-500 dark:bg-[#00f2fe] text-white dark:text-black font-extrabold shadow-lg'
              : 'bg-slate-200 dark:bg-[#121620] text-slate-600 dark:text-gray-400 hover:text-black dark:hover:text-white border border-slate-300 dark:border-white/5'
          }`}
        >
          👕 FD (FULL DYE)
        </button>

        <button
          onClick={() => setActiveSubTab('ordenes-dia')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'ordenes-dia'
              ? 'bg-cyan-500 dark:bg-[#00f2fe] text-white dark:text-black font-extrabold shadow-lg'
              : 'bg-slate-200 dark:bg-[#121620] text-slate-600 dark:text-gray-400 hover:text-black dark:hover:text-white border border-slate-300 dark:border-white/5'
          }`}
        >
          📋 ÓRDENES DEL DÍA ({filasOrdenesDia.length})
        </button>

        <button
          onClick={() => setActiveSubTab('queue-results')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'queue-results'
              ? 'bg-purple-600 dark:bg-purple-500 text-white font-extrabold shadow-lg'
              : 'bg-slate-200 dark:bg-[#121620] text-slate-600 dark:text-gray-400 hover:text-black dark:hover:text-white border border-slate-300 dark:border-white/5'
          }`}
        >
          📥 QUEUE RESULTS ({queueResults.length})
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={confirmarYActualizarOrdenesDelDia}
            className="px-3 py-1.5 bg-cyan-500/10 dark:bg-[#00f2fe]/20 border border-cyan-500/40 dark:border-[#00f2fe]/50 text-cyan-600 dark:text-[#00f2fe] hover:bg-cyan-500 dark:hover:bg-[#00f2fe] hover:text-white dark:hover:text-black font-extrabold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            🔄 Actualizar Órdenes del Día
          </button>

          <input
            type="text"
            placeholder="Filtrar por PO..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-white dark:bg-[#0b0e14] border border-slate-300 dark:border-white/20 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-cyan-500 dark:focus:border-[#00f2fe] w-56 transition-colors"
          />

          <button
            onClick={() => {
              setModal({
                isOpen: true,
                tipo: 'confirm',
                titulo: 'Limpiar Tablas Activas',
                mensaje: '¿Deseas vaciar las órdenes registradas en las tablas activas?',
                onConfirm: () => {
                  if (activeSubTab === 'buscar-bp') {
                    setTablasBP({
                      'CUSTOM BAGS': [], 'SPUT 1': [], 'SPUT 2': [],
                      'BIG BAG UTILITY 1': [], 'BIG BAG UTILITY 2': [],
                      'UTILITY BAG LINE 3': [], 'LINEA 7 (CN)': []
                    });
                  } else {
                    setTablasFD({
                      'FULL DYE CELDA 1': [], 'FULL DYE CELDA 2': [], 'FULL DYE CELDA 3': [],
                      'FULL DYE CELDA 4': [], 'PANTS LINE 1': [], 'PANTS LINE 2': [], 'HATS LINE': []
                    });
                  }
                }
              });
            }}
            className="px-3 py-1.5 bg-emerald-500/10 dark:bg-[#39ff14]/20 border border-emerald-500/40 dark:border-[#39ff14]/40 text-emerald-600 dark:text-[#39ff14] hover:bg-emerald-500 dark:hover:bg-[#39ff14] hover:text-white dark:hover:text-black font-extrabold text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap"
          >
            🧹 Limpiar
          </button>
        </div>
      </div>

      {/* 2. Banner de Totales (Consolidado) */}
      <div className="w-full bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#00f2fe]/40 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4 transition-colors duration-300">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-gray-400 block">ÓRDENES DÍA (HOY)</span>
            <span className="text-xl font-black text-slate-800 dark:text-white">{totalOrdenesHoy}</span>
          </div>

          <div className="border-l border-slate-200 dark:border-white/10 pl-6">
            <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-[#39ff14] block">CAPTURADO HOY</span>
            <span className="text-xl font-black text-emerald-600 dark:text-[#39ff14]">{capturadosHoyCount}</span>
          </div>

          <div className="border-l border-slate-200 dark:border-white/10 pl-6">
            <span className="text-[10px] uppercase tracking-wider text-pink-600 dark:text-[#ff007f] block">RESTA HOY</span>
            <span className="text-xl font-black text-pink-600 dark:text-[#ff007f]">{restaHoyCount}</span>
          </div>

          <div className="border-l border-slate-200 dark:border-white/10 pl-6">
            <span className="text-[10px] uppercase tracking-wider text-cyan-600 dark:text-[#00f2fe] block">TOTAL TABLAS</span>
            <span className="text-xl font-black text-cyan-600 dark:text-[#00f2fe]">{totalOrders}</span>
          </div>

          <div className="border-l border-slate-200 dark:border-white/10 pl-6">
            <span className="text-[10px] uppercase tracking-wider text-purple-600 dark:text-purple-400 block">ANOTACIONES COL A</span>
            <span className="text-xl font-black text-purple-600 dark:text-purple-400">{contratosAnotadosColA.length}</span>
          </div>
        </div>
      </div>

      {/* 3. Sub-Pestaña CUSTOMIZATION QUEUE RESULTS */}
      {activeSubTab === 'queue-results' && (
        <div className="w-full bg-white dark:bg-[#121826] border border-purple-300 dark:border-purple-500/40 rounded-xl p-6 shadow-2xl space-y-4 transition-colors duration-300">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-black text-purple-600 dark:text-purple-400">📥 CustomizationQueue2Results</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Sube el archivo <code>CustomizationQueue2Results.xls</code> exportado de NetSuite.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputQueueRef.current?.click()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-lg shadow transition-all cursor-pointer flex items-center gap-2"
              >
                📂 Cargar CustomizationQueue2Results (.xls / .csv)
              </button>

              <button
                onClick={handleLimpiarQueue}
                className="px-4 py-2 bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 dark:border-red-500/40 text-red-600 dark:text-red-300 hover:bg-red-500 hover:text-white font-extrabold text-xs rounded-lg shadow transition-all cursor-pointer"
              >
                🗑️ Limpiar Queue
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 custom-scrollbar">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-[#0b0e14] text-slate-600 dark:text-gray-400 font-bold border-b border-slate-200 dark:border-white/10 uppercase text-[11px] sticky top-0">
                  <th className="p-2.5">Department</th>
                  <th className="p-2.5 text-cyan-600 dark:text-[#00f2fe]">PO</th>
                  <th className="p-2.5 text-center">Units</th>
                  <th className="p-2.5">Styles</th>
                  <th className="p-2.5 text-amber-600 dark:text-amber-300">Due Date</th>
                  <th className="p-2.5">Memo / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {queueResults.length > 0 ? (
                  queueResults.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-2.5 font-bold text-slate-700 dark:text-gray-300">{row.department}</td>
                      <td className="p-2.5 font-mono font-bold text-cyan-600 dark:text-[#00f2fe]">{row.po}</td>
                      <td className="p-2.5 text-center font-mono">{row.units}</td>
                      <td className="p-2.5 font-mono text-slate-500 dark:text-gray-400">{row.styles}</td>
                      <td className="p-2.5 font-mono font-bold text-amber-600 dark:text-amber-300">{row.dueDate}</td>
                      <td className="p-2.5 text-slate-500 dark:text-gray-400">{row.memo}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-gray-500 italic text-xs">
                      No hay datos cargados. Haz clic arriba para cargar el archivo <code>CustomizationQueue2Results.xls</code>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Sub-Pestaña ÓRDENES DEL DÍA */}
      {activeSubTab === 'ordenes-dia' && (
        <div className="w-full bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#00f2fe]/40 rounded-xl p-6 shadow-2xl space-y-4 transition-colors duration-300">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-black text-cyan-600 dark:text-[#00f2fe]">📋 ÓRDENES DEL DÍA</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Estructura exacta: <strong>Col A</strong> (Anotar aquí), <strong>Col B</strong> (Status), <strong>Col C</strong> (Después de captura), <strong>Col D3 en adelante</strong> (Departamento, PO, QTY, etc.).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLimpiarOrdenesDia}
                className="px-3 py-1.5 bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 dark:border-red-500/40 text-red-600 dark:text-red-300 hover:bg-red-500 hover:text-white font-extrabold text-xs rounded-lg shadow transition-all cursor-pointer"
              >
                🧹 Limpiar Órdenes del Día
              </button>

              <form onSubmit={handleAnotarColAManual} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Anotar en Col A..."
                  value={inputOrdenDiaManual}
                  onChange={e => setInputOrdenDiaManual(e.target.value)}
                  className="bg-slate-50 dark:bg-[#0b0e14] border border-cyan-500/50 dark:border-[#00f2fe]/50 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:border-cyan-500 dark:focus:border-[#00f2fe] focus:outline-none w-56 font-mono font-bold"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-500 dark:bg-[#00f2fe] hover:bg-cyan-600 dark:hover:bg-[#00c8d4] text-white dark:text-black font-extrabold text-xs rounded-lg shadow transition-all cursor-pointer"
                >
                  + Anotar Col A
                </button>
              </form>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-[#0b0e14] text-slate-600 dark:text-gray-400 font-bold border-b border-slate-200 dark:border-white/10 uppercase text-[11px] sticky top-0 z-10">
                  <th className="p-2.5 text-center text-cyan-600 dark:text-[#00f2fe] bg-blue-100 dark:bg-blue-950/40">Col A: Anotar aquí ↓</th>
                  <th className="p-2.5 text-center bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300">Col B: Status</th>
                  <th className="p-2.5 text-center bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300">Col C: Después de Captura</th>
                  <th className="p-2.5 text-amber-600 dark:text-amber-300 border-l border-slate-200 dark:border-white/10">Col D: Departamento</th>
                  <th className="p-2.5 font-bold text-cyan-600 dark:text-[#00f2fe]">Col E: PO</th>
                  <th className="p-2.5 text-center">Col F: QTY</th>
                  <th className="p-2.5">Col G: STYLES</th>
                  <th className="p-2.5 text-amber-600 dark:text-amber-300">Col H: DUE DATE</th>
                  <th className="p-2.5">Col I: MEMO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono">
                {filasOrdenesDia.length > 0 ? (
                  filasOrdenesDia.map(row => {
                    const evalColBC = calcularFormulasFilaOrdenDia(row);

                    return (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="p-2 bg-blue-50 dark:bg-blue-950/10">
                          <input
                            type="text"
                            value={row.colA_Anotar}
                            onChange={e => handleModificarColAInFila(row.id, e.target.value)}
                            placeholder="Digit aquí..."
                            className="w-full bg-white dark:bg-[#0b0e14] border border-cyan-500/40 dark:border-[#00f2fe]/40 rounded px-2 py-0.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-cyan-500 dark:focus:border-[#00f2fe] font-bold"
                          />
                        </td>

                        <td className="p-2 text-center bg-emerald-50 dark:bg-emerald-950/10 font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${
                            evalColBC.statusB === 'CAPTURADO COMPLETO'
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-[#39ff14] border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/40'
                          }`}>
                            {evalColBC.statusB}
                          </span>
                        </td>

                        <td className="p-2 text-center bg-purple-50 dark:bg-purple-950/10 font-bold text-purple-600 dark:text-purple-300">
                          {evalColBC.despuesCapturaC}
                        </td>

                        <td className="p-2.5 text-amber-600 dark:text-amber-300 font-bold border-l border-slate-200 dark:border-white/10">{row.department}</td>
                        <td className="p-2.5 font-bold text-cyan-600 dark:text-[#00f2fe]">{row.po}</td>
                        <td className="p-2.5 text-center text-slate-800 dark:text-white">{row.qty}</td>
                        <td className="p-2.5 text-slate-600 dark:text-gray-300">{row.styles}</td>
                        <td className="p-2.5 text-amber-600 dark:text-amber-300">{row.dueDate}</td>
                        <td className="p-2.5 text-slate-500 dark:text-gray-400 max-w-xs truncate">{row.memo}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 dark:text-gray-500 italic text-xs">
                      No hay órdenes registradas. Sube la cola en QUEUE RESULTS y presiona "Actualizar Órdenes del Día".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Renderizado de Tablas BP y FD */}
      {(activeSubTab === 'buscar-bp' || activeSubTab === 'buscar-fd') && (
        <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Object.entries(activeTablas).map(([nombreLinea, filas]) => {
            const filasFiltradas = filas.filter(
              f =>
                f.po.includes(searchTerm) ||
                f.contrato.includes(searchTerm) ||
                f.style.toLowerCase().includes(searchTerm.toLowerCase()) ||
                f.color.toLowerCase().includes(searchTerm.toLowerCase())
            );

            const totalPiezas = filasFiltradas.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);

            return (
              <div
                key={nombreLinea}
                className="w-full bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between transition-colors duration-300"
              >
                <div>
                  <div className="bg-slate-100 dark:bg-[#0b0e14] px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-black text-emerald-600 dark:text-[#39ff14] text-sm tracking-wide">
                        📑 {nombreLinea}
                      </h3>
                      <span className="text-[10px] text-slate-500 dark:text-gray-400">
                        {filasFiltradas.length} Órdenes | {totalPiezas} Piezas Acumuladas
                      </span>
                    </div>

                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        ejecutarAgregarOrdenEnTabla(nombreLinea);
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        placeholder="Escanear / PO..."
                        value={inputsPorTabla[nombreLinea] || ''}
                        onChange={e =>
                          setInputsPorTabla({
                            ...inputsPorTabla,
                            [nombreLinea]: e.target.value,
                          })
                        }
                        className="bg-white dark:bg-[#121620] border border-cyan-500/50 dark:border-[#00f2fe]/50 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-white focus:border-cyan-500 dark:focus:border-[#00f2fe] focus:outline-none w-36 font-mono font-bold"
                      />

                      <button
                        type="submit"
                        disabled={loadingBusqueda}
                        className="px-3 py-1 bg-cyan-500 dark:bg-[#00f2fe] hover:bg-cyan-600 dark:hover:bg-[#00c8d4] text-white dark:text-black font-extrabold text-xs rounded-lg shadow transition-all cursor-pointer whitespace-nowrap"
                      >
                        + Agregar
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setModal({
                            isOpen: true,
                            tipo: 'info',
                            titulo: 'Shipping',
                            mensaje: `Enviando datos de ${nombreLinea} a Shipping...`,
                          });
                        }}
                        className="px-2.5 py-1 bg-cyan-500/10 dark:bg-[#00f2fe]/10 hover:bg-cyan-500 dark:hover:bg-[#00f2fe] text-cyan-600 dark:text-[#00f2fe] hover:text-white dark:hover:text-black border border-cyan-500/40 dark:border-[#00f2fe]/40 text-xs font-bold rounded-lg transition-all cursor-pointer"
                        title="Enviar a Shipping"
                      >
                        🚚 Enviar
                      </button>
                    </form>
                  </div>

                  <div className="p-2 overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-[#0b0e14]/60 text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-white/10 font-bold uppercase text-[11px]">
                          <th className="p-2.5">PO / Orden</th>
                          <th className="p-2.5 text-amber-600 dark:text-amber-300">Contrato</th>
                          <th className="p-2.5 text-center">QTY</th>
                          <th className="p-2.5">Estilo</th>
                          <th className="p-2.5">Color</th>
                          <th className="p-2.5 text-center">Tipo</th>
                          <th className="p-2.5 text-center bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">1. ENV (Shipping)</th>
                          <th className="p-2.5 text-center bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">2. CAPTURA (Custom)</th>
                          <th className="p-2.5 text-center">Estatus Fórmulas</th>
                          <th className="p-2.5 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                        {filasFiltradas.length > 0 ? (
                          filasFiltradas.map(f => {
                            const evalJerarquica = calcularEstadoFormulaJerarquica(f);
                            const checkEfectivo = f.checkCaptura || evalJerarquica.checkAuto;

                            return (
                              <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                <td className="p-2.5 font-mono font-bold text-cyan-600 dark:text-[#00f2fe]">{f.po}</td>
                                <td className="p-2.5 font-mono font-bold text-amber-600 dark:text-amber-300">{f.contrato}</td>
                                <td className="p-2.5 text-center font-mono font-bold text-slate-800 dark:text-white">{f.qty}</td>
                                <td className="p-2.5 font-mono text-slate-600 dark:text-gray-300">{f.style}</td>
                                <td className="p-2.5 text-slate-600 dark:text-gray-300">{f.color}</td>
                                <td className="p-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    f.tipo === 'CUSTOM' ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30' : 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                                  }`}>
                                    {f.tipo}
                                  </span>
                                </td>

                                <td className="p-2.5 text-center bg-blue-50 dark:bg-blue-950/20">
                                  <input
                                    type="checkbox"
                                    checked={f.checkShipping}
                                    onChange={() => toggleShipping(nombreLinea, f.id)}
                                    className="w-4 h-4 accent-cyan-500 dark:accent-[#00f2fe] cursor-pointer"
                                  />
                                </td>

                                <td className="p-2.5 text-center bg-emerald-50 dark:bg-emerald-950/20">
                                  <input
                                    type="checkbox"
                                    checked={checkEfectivo}
                                    onChange={() => toggleCaptura(nombreLinea, f.id)}
                                    className="w-4 h-4 accent-emerald-500 dark:accent-[#39ff14] cursor-pointer"
                                  />
                                </td>

                                <td className="p-2.5 text-center font-bold">
                                  <span className={`px-2 py-0.5 rounded text-[10px] border font-mono ${evalJerarquica.estiloClass}`}>
                                    {evalJerarquica.texto}
                                  </span>
                                </td>

                                <td className="p-2.5 text-center">
                                  <button
                                    onClick={() => handleEliminarOrden(nombreLinea, f.id)}
                                    className="p-1 text-red-500 hover:bg-red-500/10 rounded cursor-pointer transition-all"
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
                            <td colSpan={10} className="p-6 text-center text-slate-400 dark:text-gray-500 italic text-xs">
                              Sin órdenes registradas en {nombreLinea}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-slate-100 dark:bg-[#0b0e14] px-4 py-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
                  <span>Envíos Listos: <strong className="text-cyan-600 dark:text-[#00f2fe]">{filasFiltradas.filter(f => f.checkShipping).length}</strong></span>
                  <span>Capturados: <strong className="text-emerald-600 dark:text-[#39ff14]">{filasFiltradas.filter(f => f.checkCaptura || calcularEstadoFormulaJerarquica(f).checkAuto).length}</strong></span>
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
