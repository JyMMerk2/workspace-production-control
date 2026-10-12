import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, X, Check } from 'lucide-react';
import { THEME_OPTIONS } from '../data/themesData';
import { ThemeType } from '../types';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  currentTheme: ThemeType;
  onSelectTheme: (theme: ThemeType) => void;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  currentTheme,
  onSelectTheme,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#12161f] border border-[#00f2fe]/30 rounded-2xl w-full max-w-md p-6 shadow-[0_0_35px_rgba(0,242,254,0.2)] space-y-5"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-sm font-black uppercase text-[#00f2fe] flex items-center gap-2 tracking-wider">
              <Palette className="w-4 h-4" /> Personalización de Apariencia
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {THEME_OPTIONS.map((theme) => {
              const isSelected = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    onSelectTheme(theme.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#00f2fe]/10 border-[#00f2fe] text-white shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                      : 'bg-[#0d1017] border-white/5 text-gray-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{theme.icon}</span>
                    <div>
                      <h4 className="text-xs font-extrabold text-white">{theme.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className="w-3 h-3 rounded-full border border-black/30"
                          style={{ backgroundColor: theme.colors.background }}
                          title="Fondo"
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-black/30"
                          style={{ backgroundColor: theme.colors.cardBg }}
                          title="Tarjetas"
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-black/30"
                          style={{ backgroundColor: theme.colors.primary }}
                          title="Primario"
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-black/30"
                          style={{ backgroundColor: theme.colors.secondary }}
                          title="Secundario"
                        />
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-[#00f2fe]" />}
                </button>
              );
            })}
          </div>

          <div className="pt-2 text-right">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Aceptar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
