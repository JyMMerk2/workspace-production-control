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
  Mail 
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { evaluarFlujoOrden, ValidationResult } from '../services/orderValidationService';

const SUPABASE_URL = 'https://qpozgkxdzcixjkjblntd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb3pna3hkemNpeGpramJsbnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDAzMjEsImV4cCI6MjEwNDAxNjMyMX0.RYHR0XYeG6-YGI8zmird9FF-KP67_CmVsVpv5gYTS5o';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface StoredValidation {
  id: string;
  created_at: string;
  updated_at?: string;
  contrato: string;
  area: string;
  modulo: string;
  subprocesos: string[];
  estado: string;
  anomalias: string[];
  texto_slack: string;
  usuario: string;
}

export const SlackValidationView: React.FC = () => {
  const [textoSlack, setTextoSlack] = useState('');
  const [subprocesosManuales, setSubprocesosManuales] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [resultado, setResultado] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState<StoredValidation[]>([]);

  // Estados para Edición
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEstado, setEditEstado] = useState<string>('');
  const [editAnomalias, setEditAnomalias] = useState<string>('');

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

  const limpiarFormulario = () => {
    setTextoSlack('');
    setSubprocesosManuales('');
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

  const handleValidacionOpenAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !imageBase64) return;
    setLoading(true);

    try {
      const payload = {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: "Extrae los subprocesos de la imagen y devuélvelos en JSON como 'subprocesos' (arreglo de strings).",
              },
              { type: 'image_url', image_url: { url: imageBase64 } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      const parsedContent = JSON.parse(json.choices[0].message.content);
      const subprocesosExtraidos: string[] = parsedContent.subprocesos || [];

      const res = evaluarFlujoOrden(textoSlack, subprocesosExtraidos);
      setResultado(res);
      await guardarEnSupabase(res, textoSlack);
    } catch (err) {
      console.error(err);
      alert('Error al procesar la imagen.');
    } finally {
      setLoading(false);
    }
  };

  // Funciones de Edición y Eliminación
  const startEditing = (row: StoredValidation) => {
    setEditingId(row.id);
    setEditEstado(row.estado);
    setEditAnomalias(Array.isArray(row.anomalias) ? row.anomalias.join(', ') : '');
  };

  const saveEdit = async (id: string) => {
    try {
      const listaAnomalias = editAnomalias
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      const { error } = await supabase
        .from('slack_validations')
        .update({
          estado: editEstado,
          anomalias: listaAnomalias,
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
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro de la base de datos?')) return;
    try {
      const { error } = await supabase.from('slack_validations').delete().eq('id', id);
      if (!error) fetchHistorial();
    } catch (e) {
      console.error('Error al eliminar registro:', e);
    }
  };

  // Exportar a CSV
  const exportarCSV = () => {
    if (historial.length === 0) return;
    const headers = ['Fecha Creación', 'Fecha Edición', 'Contrato', 'Área', 'Módulo', 'Estado', 'Anomalías', 'Usuario'];
    const rows = historial.map((h) => [
      `"${new Date(h.created_at).toLocaleString()}"`,
      `"${h.updated_at ? new Date(h.updated_at).toLocaleString() : ''}"`,
      `"${h.contrato}"`,
      `"${h.area}"`,
      `"${h.modulo}"`,
      `"${h.estado}"`,
      `"${Array.isArray(h.anomalias) ? h.anomalias.join('; ') : ''}"`,
      `"${h.usuario}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Validaciones_Slack_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Redactar Correo
  const enviarPorCorreo = () => {
    const total = historial.length;
    const correctos = historial.filter((h) => h.estado === 'CORRECTO').length;
    const anomalias = historial.filter((h) => h.estado === 'INCONGRUENTE').length;

    const subject = encodeURIComponent(`Reporte de Validaciones Slack - Boombah Workspace (${new Date().toLocaleDateString()})`);
    const body = encodeURIComponent(
      `Resumen de Auditoría de Validaciones Slack:\n\n` +
      `- Total Evaluaciones: ${total}\n` +
      `- Cumplimientos Correctos: ${correctos}\n` +
      `- Incongruencias Detectadas: ${anomalias}\n\n` +
      `Se adjunta el reporte detallado generado desde Boombah Workspace.`
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const totalAnalizados = historial.length;
  const totalCorrectos = historial.filter((h) => h.estado === 'CORRECTO').length;
  const pctCumplimiento = totalAnalizados > 0 ? Math.round((totalCorrectos / totalAnalizados) * 100) : 0;
  const totalAnomalias = historial.filter((h) => h.estado === 'INCONGRUENTE').length;

  return (
    <div className="p-4 md:p-6 w-full text-white space-y-6" onPaste={handlePaste}>
      {/* CABECERA */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#00f2fe]/20 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-[#00f2fe]" />
          <div>
            <h1 className="text-xl font-black text-[#00f2fe] uppercase tracking-wider">
              Validación de Rutas y Flujos (Slack / OCR)
            </h1>
            <p className="text-xs text-gray-400">
              Análisis persistente para auditoría semanal y mensual. Pega capturas con Ctrl + V.
            </p>
          </div>
        </div>

        {/* BOTONES DE EXPORTACIÓN */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 px-3 py-2 bg-[#00f2fe]/10 border border-[#00f2fe] text-[#00f2fe] font-bold text-xs rounded-lg hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" /> Descargar CSV
          </button>
          <button
            onClick={enviarPorCorreo}
            className="flex items-center gap-2 px-3 py-2 bg-[#39ff14]/10 border border-[#39ff14] text-[#39ff14] font-bold text-xs rounded-lg hover:bg-[#39ff14] hover:text-[#0b0e14] transition-all cursor-pointer"
          >
            <Mail className="w-4 h-4" /> Redactar Correo
          </button>
        </div>
      </div>

      {/* LAYOUT PRINCIPAL */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* KPIS LATERALES */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-[#12161f] border border-[#00f2fe]/30 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-[#00f2fe]/10 rounded-xl text-[#00f2fe]">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-gray-400 block">Total Evaluaciones</span>
              <span className="text-3xl font-black text-white">{totalAnalizados}</span>
            </div>
          </div>

          <div className="bg-[#12161f] border border-[#39ff14]/30 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-[#39ff14]/10 rounded-xl text-[#39ff14]">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-gray-400 block">% Cumplimiento Global</span>
              <span className="text-3xl font-black text-[#39ff14]">{pctCumplimiento}%</span>
            </div>
          </div>

          <div className="bg-[#12161f] border border-[#ff007f]/30 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-[#ff007f]/10 rounded-xl text-[#ff007f]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-gray-400 block">Incongruencias</span>
              <span className="text-3xl font-black text-[#ff007f]">{totalAnomalias}</span>
            </div>
          </div>
        </div>

        {/* FORMULARIO Y RESULTADOS */}
        <div className="xl:col-span-9 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form autoComplete="off" className="bg-[#12161f] border border-[#00f2fe]/30 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#00f2fe] flex items-center gap-2">
              <FileText className="w-4 h-4" /> Evaluador de Orden
            </h2>

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">
                Texto del Mensaje de Slack
              </label>
              <textarea
                rows={3}
                value={textoSlack}
                onChange={(e) => setTextoSlack(e.target.value)}
                placeholder="Ejemplo: Orden 123456C1 enviada a Celda 1..."
                className="w-full bg-[#0d1017] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00f2fe] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">
                Subprocesos (Separados por coma)
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

            {/* SECCIÓN OCR OPIONAL */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <span className="text-[10px] font-bold uppercase text-gray-400 block">
                OCR por Imagen (Pega con Ctrl + V)
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

              <input
                type="password"
                placeholder="OpenAI API Key (Opcional)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-[#0d1017] border border-white/10 rounded-lg p-2 text-xs text-white"
              />

              <button
                onClick={handleValidacionOpenAI}
                type="button"
                disabled={loading || !apiKey || !imageBase64}
                className="w-full py-2 bg-[#ff007f]/20 border border-[#ff007f] text-[#ff007f] font-bold text-xs uppercase rounded-lg hover:bg-[#ff007f] hover:text-white disabled:opacity-40 cursor-pointer"
              >
                {loading ? 'Procesando...' : 'Escanear Imagen con GPT-4o-mini'}
              </button>
            </div>
          </form>

          {/* DIAGNÓSTICO EN TIEMPO REAL */}
          <div className="bg-[#12161f] border border-[#00f2fe]/30 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#00f2fe] mb-4">Resultado de la Evaluación</h2>

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
                  Ingresa una orden para realizar el diagnóstico.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* HISTORIAL SUPABASE CON EDICIÓN Y ELIMINACIÓN */}
      <div className="bg-[#12161f] border border-[#00f2fe]/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#00f2fe] flex items-center gap-2">
            <History className="w-4 h-4" /> Historial de Validaciones (Edición, Control y Exportación)
          </h2>
          <span className="text-xs text-gray-400">Total registros: {historial.length}</span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#0d1017] text-[10px] uppercase font-bold text-[#00f2fe]">
              <tr>
                <th className="p-2.5">Fecha Creación / Edición</th>
                <th className="p-2.5">Contrato</th>
                <th className="p-2.5">Área</th>
                <th className="p-2.5">Módulo</th>
                <th className="p-2.5">Estado</th>
                <th className="p-2.5">Anomalías / Observaciones</th>
                <th className="p-2.5">Usuario</th>
                <th className="p-2.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {historial.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-500 italic">
                    Aún no hay registros en la base de datos.
                  </td>
                </tr>
              ) : (
                historial.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors">
                    {/* FECHAS */}
                    <td className="p-2.5 whitespace-nowrap text-gray-400 text-[10px]">
                      <div>
                        <span className="text-gray-300 font-bold">Creado:</span>{' '}
                        {new Date(row.created_at).toLocaleString()}
                      </div>
                      {row.updated_at && row.updated_at !== row.created_at && (
                        <div className="text-[#00f2fe]">
                          <span className="font-bold">Editado:</span>{' '}
                          {new Date(row.updated_at).toLocaleString()}
                        </div>
                      )}
                    </td>

                    <td className="p-2.5 font-bold text-white">{row.contrato}</td>
                    <td className="p-2.5 text-[#00f2fe] font-semibold">{row.area}</td>
                    <td className="p-2.5">{row.modulo}</td>

                    {/* ESTADO */}
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

                    {/* ANOMALÍAS */}
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

                    <td className="p-2.5 text-gray-400">{row.usuario}</td>

                    {/* ACCIONES (EDITAR Y ELIMINAR) */}
                    <td className="p-2.5 text-center whitespace-nowrap">
                      {editingId === row.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => saveEdit(row.id)}
                            className="p-1 bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14] rounded hover:bg-[#39ff14] hover:text-[#0b0e14]"
                            title="Guardar"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 bg-gray-500/20 text-gray-400 border border-gray-500 rounded hover:bg-gray-500 hover:text-white"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => startEditing(row)}
                            className="p-1.5 bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/40 rounded hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer"
                            title="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteRow(row.id)}
                            className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/40 rounded hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                            title="Eliminar"
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
