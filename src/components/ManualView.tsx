import React, { useState } from 'react';
import { BookOpen, CheckCircle, AlertTriangle, ShieldCheck, Truck, Package, Shirt, Box, HelpCircle } from 'lucide-react';

export const ManualView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('intro');

  const sections = [
    { id: 'intro', title: '1. Introducción y Flujo General', icon: BookOpen },
    { id: 'mochilas', title: '2. Operación de Mochilas (Backpacks)', icon: Box },
    { id: 'apparel', title: '3. Operación de Apparel (Full Dye)', icon: Shirt },
    { id: 'sizing', title: '4. Reglas de Sizing Packs & Precios', icon: HelpCircle },
    { id: 'qc', title: '5. Control de Calidad (AQL 2.5)', icon: ShieldCheck },
    { id: 'shipping', title: '6. Carga de Contenedor & Nave 6', icon: Truck },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-[#00f2fe]/30">
        <div className="flex items-center gap-2 text-sm md:text-base font-extrabold uppercase tracking-wider text-[#00f2fe]">
          <BookOpen className="w-5 h-5" />
          <span>MANUAL OPERATIVO DE CONTROL DE PRODUCCIÓN — BOOMBAH</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Index */}
        <div className="lg:col-span-1 space-y-2 bg-[#12161f] border border-white/10 rounded-xl p-4 shadow-lg h-fit">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8f9ba8] block mb-2">
            Índice del Manual
          </span>
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/40 shadow-[0_0_10px_rgba(0,242,254,0.2)]'
                    : 'text-[#8f9ba8] hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{sec.title}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="lg:col-span-3 bg-[#12161f] border border-white/10 rounded-xl p-6 shadow-xl space-y-6 text-sm text-gray-300 leading-relaxed">
          {activeSection === 'intro' && (
            <div className="space-y-4">
              <h2 className="text-base font-extrabold text-[#00f2fe] uppercase tracking-wider border-b border-white/10 pb-2">
                1. Introducción y Flujo General de Planta
              </h2>
              <p>
                El presente sistema centraliza el control de avance operativo en planta para los programas de{' '}
                <strong className="text-white">Mochilas (Bags)</strong> y <strong className="text-white">Apparel (Sublimación Full Dye)</strong>,
                garantizando que cada orden se verifique desde el corte de tela hasta el embalaje y cubicaje en el contenedor de exportación.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
                <div className="bg-[#0d1017] p-4 rounded-lg border border-white/5">
                  <div className="text-xs font-bold text-[#00f2fe] mb-1">1. Entrada & Newsoft</div>
                  <p className="text-xs text-gray-400">
                    Recepción de contratos, validación de Sizing Packs, desglose de tallas y asignación a módulo.
                  </p>
                </div>
                <div className="bg-[#0d1017] p-4 rounded-lg border border-white/5">
                  <div className="text-xs font-bold text-[#39ff14] mb-1">2. Confección & Ensamble</div>
                  <p className="text-xs text-gray-400">
                    Control por hora de captura, cuadre de balances y seguimiento de piezas incompletas.
                  </p>
                </div>
                <div className="bg-[#0d1017] p-4 rounded-lg border border-white/5">
                  <div className="text-xs font-bold text-[#ff9e00] mb-1">3. Control de Calidad & Shipping</div>
                  <p className="text-xs text-gray-400">
                    Inspección por AQL 2.5, etiquetado de códigos de barra UPS y paletizado para contenedor.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'mochilas' && (
            <div className="space-y-4">
              <h2 className="text-base font-extrabold text-[#00f2fe] uppercase tracking-wider border-b border-white/10 pb-2">
                2. Protocolo de Operación en Líneas de Mochilas
              </h2>
              <p>
                La división de mochilas abarca 6 módulos principales: Superpack (BM-9021, BM-9037), Diamond Duffle (BM-9025), DEFCON (BM-9068), Ultrapack (BM-9088), Catchers (BM-9124) y Player Series (PS-9021).
              </p>
              <div className="space-y-2 bg-[#0d1017] p-4 rounded-lg border border-white/5">
                <h4 className="text-xs font-bold text-[#00f2fe] uppercase">Checkpoints Críticos de Costura:</h4>
                <ul className="list-disc list-inside text-xs space-y-1 text-gray-300">
                  <li><strong>Refuerzo de hombreras:</strong> Doble costura en 'X' con hilo de nylon calibre #69.</li>
                  <li><strong>Bolsillo de bates:</strong> Confirmar que el elástico mantenga tensión mínima de retención.</li>
                  <li><strong>Ruedas y mango telescópico:</strong> Verificación de remaches de acero inoxidable sin juego axial.</li>
                  <li><strong>Gancho J-Hook:</strong> Resistencia a tracción probada hasta 25 kg de carga de impacto.</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'apparel' && (
            <div className="space-y-4">
              <h2 className="text-base font-extrabold text-[#00f2fe] uppercase tracking-wider border-b border-white/10 pb-2">
                3. Operación de Apparel & Sublimación Full Dye
              </h2>
              <p>
                Todos los jerseys sublimados (FD-163, FD-161, FD-105, FD-205) pasan por calandra continua a una temperatura controlada de 205°C ± 2°C con velocidad ajustada según el gramaje del poliéster (160 GSM vs 280 GSM).
              </p>
              <div className="space-y-2 bg-[#0d1017] p-4 rounded-lg border border-white/5">
                <h4 className="text-xs font-bold text-[#ff007f] uppercase">Parámetros de Prensa y Confección:</h4>
                <ul className="list-disc list-inside text-xs space-y-1 text-gray-300">
                  <li><strong>Calandra térmica:</strong> 205°C / 32 segundos de contacto continuo.</li>
                  <li><strong>Corte Láser CNC:</strong> Verificación de quemado de orillas para evitar deshilachado.</li>
                  <li><strong>Costura Flatlock:</strong> 4 agujas, hilo suave de poliéster texturizado para contacto dérmico sin roce.</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'sizing' && (
            <div className="space-y-4">
              <h2 className="text-base font-extrabold text-[#00f2fe] uppercase tracking-wider border-b border-white/10 pb-2">
                4. Reglas de Cálculo en Sizing Packs & Redondeo
              </h2>
              <p>
                Al calcular el precio unitario de prendas en Newsoft a partir de un PO con monto global:
              </p>
              <div className="space-y-3 bg-[#0d1017] p-4 rounded-lg border border-white/5 text-xs">
                <div className="p-2.5 rounded bg-[#00f2fe]/10 border border-[#00f2fe]/30 text-white">
                  <strong>Regla de Redondeo a .50:</strong> Si el precio unitario exacto tiene más de 2 decimales y el estilo es de categoría <span className="text-[#00f2fe]">ADULTO</span> o <span className="text-[#ffe600]">WOMENS</span>, se redondea al múltiplo más cercano de $0.50 USD (e.g. $36.3636 → $36.50).
                </div>
                <div className="p-2.5 rounded bg-[#ff007f]/10 border border-[#ff007f]/30 text-white">
                  <strong>Regla Youth / Niños:</strong> Si el código corresponde a <span className="text-[#ff007f]">YOUTH / GIRLS</span> (e.g. FD-163Y), se mantiene el valor exacto con 4 decimales o se ajusta la tarifa de catálogo sin forzar .50.
                </div>
              </div>
            </div>
          )}

          {activeSection === 'qc' && (
            <div className="space-y-4">
              <h2 className="text-base font-extrabold text-[#00f2fe] uppercase tracking-wider border-b border-white/10 pb-2">
                5. Estándar de Calidad (AQL 2.5) & Defectos
              </h2>
              <p>
                Cada lote terminado se audita bajo la tabla de muestreo militar estándar AQL 2.5 Nivel II.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-[#0d1017] p-3 rounded-lg border border-red-500/30">
                  <span className="text-red-400 font-bold uppercase block mb-1">Defectos Críticos (Cero Tolerancia):</span>
                  <ul className="list-disc list-inside text-gray-400 space-y-1">
                    <li>Nombre o número de jugador incorrecto vs orden.</li>
                    <li>Agujeros o roturas en la tela.</li>
                    <li>Desprendimiento de cremalleras o ganchos.</li>
                  </ul>
                </div>
                <div className="bg-[#0d1017] p-3 rounded-lg border border-yellow-500/30">
                  <span className="text-yellow-400 font-bold uppercase block mb-1">Defectos Menores:</span>
                  <ul className="list-disc list-inside text-gray-400 space-y-1">
                    <li>Hilos sueltos sin recortar (deben deshebrarse).</li>
                    <li>Arrugas leves de empaque en polybag.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'shipping' && (
            <div className="space-y-4">
              <h2 className="text-base font-extrabold text-[#00f2fe] uppercase tracking-wider border-b border-white/10 pb-2">
                6. Carga de Contenedor & Despacho Nave 6
              </h2>
              <p>
                Los contenedores JBHU de 40 pies High Cube se cargan de acuerdo con el manifiesto de exportación marítimo/terrestre.
              </p>
              <div className="space-y-2 bg-[#0d1017] p-4 rounded-lg border border-white/5 text-xs">
                <p>• Toda caja debe contar con etiqueta de código de barras 2D legible por pistolas Honeywell.</p>
                <p>• Distribución de peso balanceada: Cajas pesadas de mochilas y pantalones en base; jerseys en niveles superiores.</p>
                <p>• Al alcanzar el 100% de cubicaje, se coloca el precinto de seguridad numerado y se firma acta de despacho.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
