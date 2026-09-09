import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Activity, 
  History, 
  BarChart3, 
  Upload, 
  Edit3, 
  Save, 
  X, 
  Trash2, 
  Download, 
  Printer,
  Scan,
  UserCheck,
  Calendar,
  Filter,
  User
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Tesseract from 'tesseract.js';
import { evaluarFlujoOrden, ValidationResult } from '../services/orderValidationService';

const SUPABASE_URL = 'https://qpozgkxdzcixjkjblntd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb3pna3hkemNpeGpramJsbnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDAzMjEsImV4cCI6MjEwNDAxNjMyMX0.RYHR0XYeG6-YGI8zmird9FF-KP67_CmVsVpv5gYTS5o';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SUBPROCESOS_CONOCIDOS = [
  'CORTE ZUND', 'CORTE', 'ENTRADA ALMACEN', 'ENTRADA ALMACÉN',
  'SALIDA ALMACEN', 'SALIDA ALMACÉN', 'PRINTING', 'PRENSA',
  'SORTEO', 'MANUFACTURA', 'COSTURA', 'EMPAQUE'
];

interface StoredValidation {
  id: string;
  created_at: string;
  updated_at?: string;
  fecha_registro?: string;
  contrato: string;
  area: string;
  modulo: string;
  subprocesos: string[];
  estado: string;
  anomalias: string[];
  texto_slack: string;
  usuario: string; // Digitador Creador
  editado_por?: string; // Trazabilidad de Edición
  usuario_responsable: string;
}

export const SlackValidationView: React.FC = () => {
  const [textoSlack, setTextoSlack] = useState('');
  const [subprocesosManuales, setSubprocesosManuales] = useState('');
  const [usuarioResponsable, setUsuarioResponsable] = useState('');
  const [fechaEvaluacion, setFechaEvaluacion] = useState(new Date().toISOString().slice(0, 10));
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState<StoredValidation[]>([]);

  // Filtros
  const [filtroPeriodo, setFiltroPeriodo] = useState<'TODOS' | 'SEMANA' | 'MES' | 'CUSTOM'>('TODOS');
  const [fechaInicioFilter, setFechaInicioFilter] = useState('');
  const [fechaFinFilter, setFechaFinFilter] = useState('');

  // Edición Completa en Tabla
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFecha, setEditFecha] = useState<string>('');
  const [editContrato, setEditContrato] = useState<string>('');
  const [editArea, setEditArea] = useState<string>('');
  const [editModulo, setEditModulo] = useState<string>('');
  const [editEstado, setEditEstado] = useState<string>('');
  const [editAnomalias, setEditAnomalias] = useState<string>('');
  const [editResponsable, setEditResponsable] = useState<string>('');

  const fetchHistorial = async () => {
    try {
      const { data, error } = await supabase
        .from('slack_validations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) setHistorial(data);
    } catch (e) {
      console.error('Error al cargar historial de Supabase:', e);
    }
  };

  useEffect(() => {
    fetchHistorial();
  }, []);

  const responsablesSugeridos = Array.from(
    new Set(
      historial
        .map((h) => h.usuario_responsable?.trim())
        .filter((resp) => resp && resp !== 'Sin Especificar' && resp !== 'Sin Asignar')
    )
  );

  const limpiarFormulario = () => {
    setTextoSlack('');
    setSubprocesosManuales('');
    setUsuarioResponsable('');
    setImageBase64(null);
  };

  const guardarEnSupabase = async (res: ValidationResult, texto: string) => {
    try {
      const currentUser = sessionStorage.getItem('authenticated_user') || 'operador';
      const { error } = await supabase.from('slack_validations').insert([
        {
          contrato: res.contrato,
          area: res.area,
          modulo: res.modulo,
          subprocesos: res.subprocesosDetectados,
          estado: res.estado,
          anomalias: res.anomalias,
          texto_slack: texto,
          usuario: currentUser,
          usuario_responsable: usuarioResponsable.trim() || 'Sin Especificar',
          fecha_registro: fechaEvaluacion,
          updated_at: new Date().toISOString(),
        },
      ]);

      if (!error) {
        fetchHistorial();
        limpiarFormulario();
      }
    } catch (e) {
      console.error('Error de conexión:', e);
    }
  };

  const handleValidacionManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textoSlack.trim()) return;

    const listaSubprocesos = subprocesosManuales
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const res = evaluarFlujoOrden(textoSlack, listaSubprocesos);
    setResultado(res);
    await guardarEnSupabase(res, textoSlack);
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setImageBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) handleImageUpload(blob);
      }
    }
  };

  const handleValidacionTesseract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageBase64 || !textoSlack.trim()) return;

    setLoading(true);

    try {
      const { data } = await Tesseract.recognize(imageBase64, 'spa');
      const textoLimpioOCR = data.text.toUpperCase();
      
      const detectados: string[] = [];
      SUBPROCESOS_CONOCIDOS.forEach((subp) => {
        if (textoLimpioOCR.includes(subp) && !detectados.includes(subp)) {
          detectados.push(subp);
        }
      });

      const subprocesosFinales = detectados.length > 0 
        ? detectados 
        : data.text.split('\n').filter((linea) => linea.trim().length > 3);

      const res = evaluarFlujoOrden(textoSlack, subprocesosFinales);
      setResultado(res);
      await guardarEnSupabase(res, textoSlack);
    } catch (err) {
      console.error('Error en Tesseract OCR:', err);
      alert('No se pudo procesar la captura con Tesseract.');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (row: StoredValidation) => {
    setEditingId(row.id);
    setEditFecha(row.fecha_registro || new Date(row.created_at).toISOString().slice(0, 10));
    setEditContrato(row.contrato);
    setEditArea(row.area);
    setEditModulo(row.modulo);
    setEditEstado(row.estado);
    setEditAnomalias(Array.isArray(row.anomalias) ? row.anomalias.join(', ') : '');
    setEditResponsable(row.usuario_responsable || '');
  };

  const saveEdit = async (id: string) => {
    try {
      const currentUser = sessionStorage.getItem('authenticated_user') || 'operador';
      const listaAnomalias = editAnomalias
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      const { error } = await supabase
        .from('slack_validations')
        .update({
          fecha_registro: editFecha,
          contrato: editContrato,
          area: editArea,
          modulo: editModulo,
          estado: editEstado,
          anomalias: listaAnomalias,
          usuario_responsable: editResponsable,
          editado_por: currentUser,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (!error) {
        setEditingId(null);
        fetchHistorial();
      }
    } catch (e) {
      console.error('Error al actualizar registro:', e);
    }
  };

  const deleteRow = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro?')) return;
    try {
      const { error } = await supabase.from('slack_validations').delete().eq('id', id);
      if (!error) fetchHistorial();
    } catch (e) {
      console.error('Error al eliminar registro:', e);
    }
  };

  // Filtrado
  const historialFiltrado = historial.filter((item) => {
    const fechaItem = new Date(item.fecha_registro || item.created_at);
    const hoy = new Date();

    if (filtroPeriodo === 'SEMANA') {
      const haceUnaSemana = new Date();
      haceUnaSemana.setDate(hoy.getDate() - 7);
      return fechaItem >= haceUnaSemana;
    }

    if (filtroPeriodo === 'MES') {
      return (
        fechaItem.getMonth() === hoy.getMonth() &&
        fechaItem.getFullYear() === hoy.getFullYear()
      );
    }

    if (filtroPeriodo === 'CUSTOM') {
      if (!fechaInicioFilter && !fechaFinFilter) return true;
      const inicio = fechaInicioFilter ? new Date(fechaInicioFilter) : new Date('2000-01-01');
      const fin = fechaFinFilter ? new Date(fechaFinFilter + 'T23:59:59') : new Date('2099-12-31');
      return fechaItem >= inicio && fechaItem <= fin;
    }

    return true;
  });

  const exportarCSV = () => {
    if (historialFiltrado.length === 0) return;
    const headers = ['Fecha Registro', 'Fecha Creacion', 'Contrato', 'Area', 'Modulo', 'Estado', 'Anomalias', 'Responsable Flujo', 'Creado Por', 'Editado Por'];
    const rows = historialFiltrado.map((h) => [
      `"${h.fecha_registro || ''}"`,
      `"${new Date(h.created_at).toLocaleString()}"`,
      `"${h.contrato}"`,
      `"${h.area}"`,
      `"${h.modulo}"`,
      `"${h.estado}"`,
      `"${Array.isArray(h.anomalias) ? h.anomalias.join('; ') : ''}"`,
      `"${h.usuario_responsable || 'Sin Asignar'}"`,
      `"${h.usuario}"`,
      `"${h.editado_por || 'Sin Cambios'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Validaciones_Slack_${filtroPeriodo}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarPDF = () => {
    window.print();
  };

  // KPIs
  const totalAnalizados = historialFiltrado.length;
  const totalCorrectos = historialFiltrado.filter((h) => h.estado === 'CORRECTO').length;
  const totalAnomalias = historialFiltrado.filter((h) => h.estado === 'INCONGRUENTE').length;

  const porArea = historialFiltrado.reduce((acc, h) => {
    if (h.estado === 'INCONGRUENTE') acc[h.area] = (acc[h.area] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const porModulo = historialFiltrado.reduce((acc, h) => {
    if (h.estado === 'INCONGRUENTE') acc[h.modulo] = (acc[h.modulo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const porAnomalia = historialFiltrado.reduce((acc, h) => {
    if (h.estado === 'INCONGRUENTE' && Array.isArray(h.anomalias)) {
      h.anomalias.forEach((a) => { acc[a] = (acc[a] || 0) + 1; });
    }
    return acc;
  }, {} as Record<string, number>);

  const porResponsable = historialFiltrado.reduce((acc, h) => {
    if (h.estado === 'INCONGRUENTE') {
      const resp = h.usuario_responsable || 'Sin Asignar';
      acc[resp] = (acc[resp] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4 md:p-6 w-full text-white space-y-6 print:p-0 print:bg-[#0b0e14]" onPaste={handlePaste}>
      <datalist id="lista-responsables">
        {responsablesSugeridos.map((resp, idx) => (
          <option key={idx} value={resp} />
        ))}
      </datalist>

      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          cursor: pointer;
        }
        @media print {
          body {
            background-color: #0b0e14 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* CABECERA */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#00f2fe]/20 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-[#00f2fe]" />
          <div>
            <h1 className="text-xl font-black text-[#00f2fe] uppercase tracking-wider">
              Validación de Rutas y Flujos (Slack / OCR)
            </h1>
            <p className="text-xs text-gray-400">
              Informe de auditoría operativa y control de incongruencias de producción.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 px-3 py-2 bg-[#00f2fe]/10 border border-[#00f2fe] text-[#00f2fe] font-bold text-xs rounded-lg hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" /> Descargar CSV (Excel)
          </button>
          <button
            onClick={exportarPDF}
            className="flex items-center gap-2 px-3 py-2 bg-[#ff007f]/10 border border-[#ff007f] text-[#ff007f] font-bold text-xs rounded-lg hover:bg-[#ff007f] hover:text-white transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Descargar PDF Reporte
          </button>
        </div>
      </div>

      {/* FORMULARIO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        <form autoComplete="off" className="bg-[#12161f] border border-[#00f2fe]/30 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#00f2fe] flex items-center gap-2">
            <FileText className="w-4 h-4" /> Evaluador de Orden
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#00f2fe]" /> Fecha de la Orden
              </label>
              <input
                type="date"
                value={fechaEvaluacion}
                onClick={(e) => (e.currentTarget as any).showPicker?.()}
                onChange={(e) => setFechaEvaluacion(e.target.value)}
                className="w-full bg-[#0d1017] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-[#00f2fe] focus:outline-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-[#ff007f]" /> Responsable del Mensaje/Flujo
              </label>
              <input
                type="text"
                list="lista-responsables"
                value={usuarioResponsable}
                onChange={(e) => setUsuarioResponsable(e.target.value)}
                placeholder="Ej: Emely Jimenez, Nicole M."
                className="w-full bg-[#0d1017] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-[#00f2fe] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">
              Texto del Mensaje de Slack
            </label>
            <textarea
              rows={2}
              value={textoSlack}
              onChange={(e) => setTextoSlack(e.target.value)}
              placeholder="Ejemplo: SPUT2 425623A..."
              className="w-full bg-[#0d1017] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00f2fe] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">
              Subprocesos Manuales (Separados por coma)
            </label>
            <input
              type="text"
              value={subprocesosManuales}
              onChange={(e) => setSubprocesosManuales(e.target.value)}
              placeholder="ENTRADA ALMACEN, SORTEO, SALIDA ALMACEN"
              className="w-full bg-[#0d1017] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00f2fe] focus:outline-none"
            />
          </div>

          <button
            onClick={handleValidacionManual}
            type="button"
            className="w-full py-2.5 bg-[#00f2fe]/20 border border-[#00f2fe] text-[#00f2fe] font-black text-xs uppercase rounded-lg hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer"
          >
            Evaluar y Guardar Registro
          </button>

          {/* OCR TESSERACT */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <span className="text-[10px] font-bold uppercase text-[#00f2fe] block">
              OCR Gratuito Integrado (Tesseract)
            </span>
            <div className="border border-dashed border-white/20 rounded-lg p-2 text-center bg-[#0d1017]">
              {imageBase64 ? (
                <div className="space-y-1">
                  <img src={imageBase64} alt="Captura" className="max-h-24 mx-auto rounded border border-white/20" />
                  <button type="button" onClick={() => setImageBase64(null)} className="text-[10px] text-red-400 underline">
                    Quitar imagen
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer space-y-1 block py-1">
                  <Upload className="w-4 h-4 mx-auto text-[#00f2fe]" />
                  <span className="text-[10px] text-gray-400 block font-semibold">
                    Subir o presionar <kbd className="bg-white/10 px-1 rounded text-[#00f2fe]">Ctrl + V</kbd>
                  </span>
                </label>
              )}
            </div>

            <button
              onClick={handleValidacionTesseract}
              type="button"
              disabled={loading || !imageBase64 || !textoSlack.trim()}
              className="w-full py-2.5 bg-[#39ff14]/20 border border-[#39ff14] text-[#39ff14] font-bold text-xs uppercase rounded-lg hover:bg-[#39ff14] hover:text-[#0b0e14] disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Scan className="w-4 h-4" />
              {loading ? 'Escaneando con Tesseract...' : 'Escanear Captura con Tesseract (Gratis)'}
            </button>
          </div>
        </form>

        {/* DIAGNÓSTICO */}
        <div className="bg-[#12161f] border border-[#00f2fe]/30 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#00f2fe] mb-4">Resultado del Diagnóstico</h2>

            {resultado ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#0d1017] p-2.5 rounded-lg border border-white/5">
                    <span className="text-[9px] uppercase text-gray-500 block">Contrato</span>
                    <span className="text-xs font-black text-white">{resultado.contrato}</span>
                  </div>
                  <div className="bg-[#0d1017] p-2.5 rounded-lg border border-white/5">
                    <span className="text-[9px] uppercase text-gray-500 block">Área</span>
                    <span className="text-xs font-black text-[#00f2fe]">{resultado.area}</span>
                  </div>
                  <div className="bg-[#0d1017] p-2.5 rounded-lg border border-white/5">
                    <span className="text-[9px] uppercase text-gray-500 block">Módulo</span>
                    <span className="text-xs font-black text-[#ff007f]">{resultado.modulo}</span>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 ${
                    resultado.estado === 'CORRECTO'
                      ? 'bg-[#39ff14]/10 border-[#39ff14]/40 text-[#39ff14]'
                      : 'bg-[#ff007f]/10 border-[#ff007f]/40 text-[#ff007f]'
                  }`}
                >
                  {resultado.estado === 'CORRECTO' ? (
                    <CheckCircle className="w-5 h-5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                  )}
                  <div>
                    <span className="font-black text-xs block">ESTADO: {resultado.estado}</span>
                    <span className="text-[10px]">
                      {resultado.estado === 'CORRECTO'
                        ? 'Validado y guardado correctamente.'
                        : 'Anomalía registrada en la base de datos.'}
                    </span>
                  </div>
                </div>

                {resultado.anomalias.length > 0 && (
                  <div className="bg-[#0d1017] p-3 rounded-xl border border-red-500/30">
                    <span className="text-[10px] font-bold text-red-400 uppercase block mb-1">
                      Anomalías Detectadas:
                    </span>
                    <ul className="list-disc list-inside space-y-1">
                      {resultado.anomalias.map((anomalia, idx) => (
                        <li key={idx} className="text-xs text-red-300 font-semibold">
                          {anomalia}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-gray-500 italic text-center">
                Ingresa una orden o escanéa con Tesseract para realizar el diagnóstico.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BARRA DE FILTRO */}
      <div className="bg-[#12161f] border border-[#00f2fe]/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-2 text-xs font-bold text-[#00f2fe] uppercase">
          <Filter className="w-4 h-4" /> Filtro de Auditoría:
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFiltroPeriodo('TODOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filtroPeriodo === 'TODOS'
                ? 'bg-[#00f2fe] text-[#0b0e14]'
                : 'bg-[#0d1017] border border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            Histórico Completo
          </button>
          <button
            onClick={() => setFiltroPeriodo('SEMANA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filtroPeriodo === 'SEMANA'
                ? 'bg-[#00f2fe] text-[#0b0e14]'
                : 'bg-[#0d1017] border border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            Últimos 7 Días (Semanal)
          </button>
          <button
            onClick={() => setFiltroPeriodo('MES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filtroPeriodo === 'MES'
                ? 'bg-[#00f2fe] text-[#0b0e14]'
                : 'bg-[#0d1017] border border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            Este Mes
          </button>
          <button
            onClick={() => setFiltroPeriodo('CUSTOM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filtroPeriodo === 'CUSTOM'
                ? 'bg-[#00f2fe] text-[#0b0e14]'
                : 'bg-[#0d1017] border border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            Rango de Fechas
          </button>
        </div>

        {filtroPeriodo === 'CUSTOM' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fechaInicioFilter}
              onClick={(e) => (e.currentTarget as any).showPicker?.()}
              onChange={(e) => setFechaInicioFilter(e.target.value)}
              className="bg-[#0d1017] border border-white/10 rounded p-1 text-xs text-white cursor-pointer"
            />
            <span className="text-xs text-gray-500">a</span>
            <input
              type="date"
              value={fechaFinFilter}
              onClick={(e) => (e.currentTarget as any).showPicker?.()}
              onChange={(e) => setFechaFinFilter(e.target.value)}
              className="bg-[#0d1017] border border-white/10 rounded p-1 text-xs text-white cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* KPIS */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-[#00f2fe] flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Desglose de KPIs e Incongruencias ({filtroPeriodo})
        </h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#12161f] border border-[#00f2fe]/30 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 bg-[#00f2fe]/10 rounded-lg text-[#00f2fe]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase text-gray-400 block">Total Evaluaciones</span>
              <span className="text-2xl font-black text-white">{totalAnalizados}</span>
            </div>
          </div>

          <div className="bg-[#12161f] border border-[#39ff14]/30 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 bg-[#39ff14]/10 rounded-lg text-[#39ff14]">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase text-gray-400 block">Flujos Correctos</span>
              <span className="text-2xl font-black text-[#39ff14]">{totalCorrectos}</span>
            </div>
          </div>

          <div className="bg-[#12161f] border border-[#ff007f]/30 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 bg-[#ff007f]/10 rounded-lg text-[#ff007f]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase text-gray-400 block">Incongruencias Totales</span>
              <span className="text-2xl font-black text-[#ff007f]">{totalAnomalias}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#12161f] border border-white/10 rounded-xl p-3 space-y-2">
            <span className="text-[10px] font-bold uppercase text-[#00f2fe] block">Por Área</span>
            {Object.keys(porArea).length === 0 ? (
              <span className="text-[10px] text-gray-500 italic block">Sin registros</span>
            ) : (
              Object.entries(porArea).map(([area, cant]) => (
                <div key={area} className="flex justify-between text-xs border-b border-white/5 pb-1">
                  <span className="text-gray-300 font-medium">{area}</span>
                  <span className="font-bold text-[#ff007f]">{cant}</span>
                </div>
              ))
            )}
          </div>

          <div className="bg-[#12161f] border border-white/10 rounded-xl p-3 space-y-2">
            <span className="text-[10px] font-bold uppercase text-[#00f2fe] block">Por Módulo</span>
            {Object.keys(porModulo).length === 0 ? (
              <span className="text-[10px] text-gray-500 italic block">Sin registros</span>
            ) : (
              Object.entries(porModulo).map(([modulo, cant]) => (
                <div key={modulo} className="flex justify-between text-xs border-b border-white/5 pb-1">
                  <span className="text-gray-300 font-medium">{modulo}</span>
                  <span className="font-bold text-[#ff007f]">{cant}</span>
                </div>
              ))
            )}
          </div>

          <div className="bg-[#12161f] border border-white/10 rounded-xl p-3 space-y-2">
            <span className="text-[10px] font-bold uppercase text-[#00f2fe] block">Por Proceso Faltante</span>
            {Object.keys(porAnomalia).length === 0 ? (
              <span className="text-[10px] text-gray-500 italic block">Sin registros</span>
            ) : (
              Object.entries(porAnomalia).map(([anom, cant]) => (
                <div key={anom} className="flex justify-between text-xs border-b border-white/5 pb-1 gap-2">
                  <span className="text-gray-300 font-medium truncate">{anom}</span>
                  <span className="font-bold text-[#ff007f] shrink-0">{cant}</span>
                </div>
              ))
            )}
          </div>

          <div className="bg-[#12161f] border border-white/10 rounded-xl p-3 space-y-2">
            <span className="text-[10px] font-bold uppercase text-[#00f2fe] block">Por Responsable Flujo</span>
            {Object.keys(porResponsable).length === 0 ? (
              <span className="text-[10px] text-gray-500 italic block">Sin registros</span>
            ) : (
              Object.entries(porResponsable).map(([resp, cant]) => (
                <div key={resp} className="flex justify-between text-xs border-b border-white/5 pb-1">
                  <span className="text-gray-300 font-medium">{resp}</span>
                  <span className="font-bold text-[#ff007f]">{cant}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* HISTORIAL TABLA */}
      <div className="bg-[#12161f] border border-[#00f2fe]/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#00f2fe] flex items-center gap-2">
            <History className="w-4 h-4" /> Historial de Validaciones ({historialFiltrado.length} de {historial.length})
          </h2>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#0d1017] text-[10px] uppercase font-bold text-[#00f2fe]">
              <tr>
                <th className="p-2.5">Fecha Orden / Creado</th>
                <th className="p-2.5">Contrato</th>
                <th className="p-2.5">Área</th>
                <th className="p-2.5">Módulo</th>
                <th className="p-2.5">Estado</th>
                <th className="p-2.5">Anomalías / Observaciones</th>
                <th className="p-2.5">Responsable Flujo</th>
                <th className="p-2.5">Trazabilidad / Digitador</th>
                <th className="p-2.5 text-center no-print">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {historialFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-gray-500 italic">
                    No se encontraron registros para el período seleccionado.
                  </td>
                </tr>
              ) : (
                historialFiltrado.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors">
                    {/* FECHA EDITABLE */}
                    <td className="p-2.5 whitespace-nowrap text-gray-400 text-[10px]">
                      {editingId === row.id ? (
                        <input
                          type="date"
                          value={editFecha}
                          onClick={(e) => (e.currentTarget as any).showPicker?.()}
                          onChange={(e) => setEditFecha(e.target.value)}
                          className="bg-[#0d1017] border border-[#00f2fe] text-xs text-white p-1 rounded cursor-pointer"
                        />
                      ) : (
                        <>
                          <div className="text-white font-bold">{row.fecha_registro || 'N/A'}</div>
                          <div className="text-gray-500">{new Date(row.created_at).toLocaleTimeString()}</div>
                        </>
                      )}
                    </td>

                    {/* CONTRATO EDITABLE */}
                    <td className="p-2.5 font-bold text-white">
                      {editingId === row.id ? (
                        <input
                          type="text"
                          value={editContrato}
                          onChange={(e) => setEditContrato(e.target.value)}
                          className="bg-[#0d1017] border border-[#00f2fe] text-xs text-white p-1 rounded w-24 font-bold"
                        />
                      ) : (
                        row.contrato
                      )}
                    </td>

                    {/* ÁREA EDITABLE */}
                    <td className="p-2.5 text-[#00f2fe] font-semibold">
                      {editingId === row.id ? (
                        <select
                          value={editArea}
                          onChange={(e) => setEditArea(e.target.value)}
                          className="bg-[#0d1017] border border-[#00f2fe] text-xs text-white p-1 rounded"
                        >
                          <option value="APPAREL">APPAREL</option>
                          <option value="MOCHILAS">MOCHILAS</option>
                          <option value="GENERAL">GENERAL</option>
                          <option value="TEAM SPIRIT">TEAM SPIRIT</option>
                          <option value="SIZING PACK">SIZING PACK</option>
                        </select>
                      ) : (
                        row.area
                      )}
                    </td>

                    {/* MÓDULO EDITABLE */}
                    <td className="p-2.5">
                      {editingId === row.id ? (
                        <input
                          type="text"
                          value={editModulo}
                          onChange={(e) => setEditModulo(e.target.value)}
                          className="bg-[#0d1017] border border-[#00f2fe] text-xs text-white p-1 rounded w-28"
                        />
                      ) : (
                        row.modulo
                      )}
                    </td>

                    {/* ESTADO EDITABLE */}
                    <td className="p-2.5">
                      {editingId === row.id ? (
                        <select
                          value={editEstado}
                          onChange={(e) => setEditEstado(e.target.value)}
                          className="bg-[#0d1017] border border-[#00f2fe] text-xs text-white p-1 rounded"
                        >
                          <option value="CORRECTO">CORRECTO</option>
                          <option value="INCONGRUENTE">INCONGRUENTE</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            row.estado === 'CORRECTO'
                              ? 'bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/40'
                              : 'bg-red-500/20 text-red-400 border border-red-500/40'
                          }`}
                        >
                          {row.estado}
                        </span>
                      )}
                    </td>

                    {/* ANOMALÍAS EDITABLES */}
                    <td className="p-2.5 text-red-300">
                      {editingId === row.id ? (
                        <input
                          type="text"
                          value={editAnomalias}
                          onChange={(e) => setEditAnomalias(e.target.value)}
                          className="w-full bg-[#0d1017] border border-[#00f2fe] text-xs text-white p-1 rounded"
                          placeholder="Anomalías separadas por coma"
                        />
                      ) : Array.isArray(row.anomalias) && row.anomalias.length > 0 ? (
                        row.anomalias.join(', ')
                      ) : (
                        'Ninguna'
                      )}
                    </td>

                    {/* RESPONSABLE EDITABLE */}
                    <td className="p-2.5 text-white font-semibold">
                      {editingId === row.id ? (
                        <input
                          type="text"
                          list="lista-responsables"
                          value={editResponsable}
                          onChange={(e) => setEditResponsable(e.target.value)}
                          className="w-full bg-[#0d1017] border border-[#00f2fe] text-xs text-white p-1 rounded"
                        />
                      ) : (
                        row.usuario_responsable || 'Sin Especificar'
                      )}
                    </td>

                    {/* TRAZABILIDAD DIGITADOR Y EDITOR */}
                    <td className="p-2.5 text-[10px]">
                      <div>
                        <span className="text-gray-400">Creado:</span>{' '}
                        <span className="text-white font-semibold">{row.usuario}</span>
                      </div>
                      {row.editado_por && (
                        <div className="text-[#00f2fe]">
                          <span>Editado por:</span>{' '}
                          <span className="font-bold">{row.editado_por}</span>
                        </div>
                      )}
                    </td>

                    <td className="p-2.5 text-center whitespace-nowrap no-print">
                      {editingId === row.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => saveEdit(row.id)}
                            className="p-1 bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14] rounded hover:bg-[#39ff14] hover:text-[#0b0e14]"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 bg-gray-500/20 text-gray-400 border border-gray-500 rounded hover:bg-gray-500 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => startEditing(row)}
                            className="p-1.5 bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/40 rounded hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteRow(row.id)}
                            className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/40 rounded hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
