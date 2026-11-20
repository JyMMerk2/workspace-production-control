import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

interface FeatureItem {
  tag: string;
  text: string;
  color: string;
}

const NOVEDADES: FeatureItem[] = [
  {
    tag: 'NUEVO',
    text: 'Lotes en Proceso en Vivo: toma tu cantidad o rack y resalta tus ítems con tu color personal.',
    color: 'text-[#00f2fe] border-[#00f2fe]/40 bg-[#00f2fe]/10'
  },
  {
    tag: 'MEJORA',
    text: 'Flechas de salto rápido (▲ / ▼) en tu etiqueta de lote para navegar directo entre páginas e ítems.',
    color: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10'
  },
  {
    tag: 'VELOCIDAD',
    text: 'Búsqueda instantánea (<1ms) en Toma y Pase de Inventario con caché sincronizada cada 2 segundos.',
    color: 'text-amber-300 border-amber-400/40 bg-amber-500/10'
  },
  {
    tag: 'EXPORTACIÓN',
    text: 'Descarga directa en Excel (.xls) de artículos en Nave 7 y registros Cerrados con candado.',
    color: 'text-purple-300 border-purple-400/40 bg-purple-500/10'
  }
];

export const FeaturesTicker: React.FC = () => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="w-full bg-[#0d111a] border-b border-cyan-500/20 px-3 py-1.5 flex items-center gap-3 overflow-hidden select-none">
      {/* Insignia fija izquierda */}
      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#00f2fe]/15 border border-[#00f2fe]/35 text-[#00f2fe] text-[10px] font-black uppercase tracking-wider shrink-0">
        <Sparkles className="w-3 h-3" />
        <span>Novedades</span>
      </div>

      {/* Carril animado (se pausa al pasar el cursor encima) */}
      <div className="relative flex-1 overflow-hidden group">
        <style>{`
          @keyframes boombah-marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .animate-boombah-ticker {
            display: flex;
            width: max-content;
            animation: boombah-marquee 38s linear infinite;
          }
          .group:hover .animate-boombah-ticker {
            animation-play-state: paused;
          }
        `}</style>

        <div className="animate-boombah-ticker items-center gap-8 text-xs">
          {[...NOVEDADES, ...NOVEDADES].map((item, idx) => (
            <div key={idx} className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${item.color}`}>
                {item.tag}
              </span>
              <span className="text-gray-300 font-medium text-[11px]">{item.text}</span>
              <span className="text-white/15 ml-4">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* Botón discreto para cerrar */}
      <button
        type="button"
        onClick={() => setVisible(false)}
        title="Ocultar cintillo de novedades"
        className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
