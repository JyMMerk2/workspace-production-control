import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Search, Upload, FileText, Activity } from 'lucide-react';
import { evaluarFlujoOrden, procesarConOpenAI, ValidationResult } from '../services/orderValidationService';

export const SlackValidationView: React.FC = () => {
  const [textoSlack, setTextoSlack] = useState('');
  const [subprocesosManuales, setSubprocesosManuales] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [resultado, setResultado] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleValidacionManual = (e: React.FormEvent) => {
    e.preventDefault();
    const listaSubprocesos = subprocesosManuales
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const res = evaluarFlujoOrden(textoSlack, listaSubprocesos);
    setResultado(res);
  };

  const handleValidacionOpenAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !imageUrl) return;
    setLoading(true);
    try {
      const res = await procesarConOpenAI(imageUrl, textoSlack, apiKey);
      setResultado(res);
    } catch (err) {
      console.error(err);
      alert('Error procesando la imagen con OpenAI. Verifica tu API Key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto text-white space-y-6">
      <div className="flex items-center gap-3 border-b border-[#00f2fe]/20 pb-4">
        <Activity className="w-8 h-8 text-[#00f2fe]" />
        <div>
          <h1 className="text-xl font-black text-[#00f2fe] uppercase tracking-wider">
            Validación de Rutas y Flujos (Slack / OCR)
          </h1>
          <p className="text-xs text-gray-400">
            Detección automática de inconsistencias en contratos de Apparel y Mochilas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FORMULARIO DE ENTRADA */}
        <div className="bg-[#12161f] border border-[#00f2fe]/30 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#00f2fe] flex items-center gap-2">
            <FileText className="w-4 h-4" /> Datos de la Orden
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
            className="w-full py-2.5 bg-[#00f2fe]/20 border border-[#00f2fe] text-[#00f2fe] font-black text-xs uppercase rounded-lg hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer"
          >
            Evaluar Reglas de Negocio
          </button>

          {/* PARTE INTEGRACIÓN OPENAI (OPCIONAL) */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <span className="text-[10px] font-bold uppercase text-gray-500 block">
              Procesamiento con IA (Imagen OCR)
            </span>
            <input
              type="password"
              placeholder="OpenAI API Key (sk-...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-[#0d1017] border border-white/10 rounded-lg p-2 text-xs text-white"
            />
            <input
              type="text"
              placeholder="URL de la imagen de Slack"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-[#0d1017] border border-white/10 rounded-lg p-2 text-xs text-white"
            />
            <button
              onClick={handleValidacionOpenAI}
              disabled={loading || !apiKey || !imageUrl}
              className="w-full py-2 bg-[#ff007f]/20 border border-[#ff007f] text-[#ff007f] font-bold text-xs uppercase rounded-lg hover:bg-[#ff007f] hover:text-white disabled:opacity-40 cursor-pointer"
            >
              {loading ? 'Analizando Imagen...' : 'Escanear con GPT-4o-mini'}
            </button>
          </div>
        </div>

        {/* PANEL DE RESULTADOS */}
        <div className="bg-[#12161f] border border-[#00f2fe]/30 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#00f2fe] mb-4">Resultado del Análisis</h2>

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
                        ? 'La orden cumple con el flujo operacional.'
                        : 'Se detectaron inconsistencias en la ruta.'}
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

                <div className="bg-[#0d1017] p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                    Subprocesos Detectados ({resultado.subprocesosDetectados.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {resultado.subprocesosDetectados.length > 0 ? (
                      resultado.subprocesosDetectados.map((sub, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white/10 rounded text-[10px] text-gray-300">
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-gray-500 italic">Ningún subproceso ingresado</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-gray-500 italic text-center">
                Ingresa los datos de la orden o analiza una imagen para desplegar el diagnóstico.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
