import React, { useState } from 'react';
import { ExternalLink, RefreshCw, Maximize2, Minimize2, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { SheetConfig, SubmenuItem } from '../types';

interface SheetsViewProps {
  config: SheetConfig;
  activeGid?: string;
  onSelectSubTab: (gid: string, name: string) => void;
}

export const SheetsView: React.FC<SheetsViewProps> = ({
  config,
  activeGid,
  onSelectSubTab,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const currentGid = activeGid || config.defaultGid;
  const currentSubTab = config.subTabs.find((s) => s.gid === currentGid) || config.subTabs[0];

  const embedUrl = `https://docs.google.com/spreadsheets/d/${config.sheetId}/edit?gid=${currentGid}&widget=true&headers=false`;
  const directUrl = `https://docs.google.com/spreadsheets/d/${config.sheetId}/edit?gid=${currentGid}`;

  const handleRefreshIframe = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className={`space-y-4 flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0b0e14] p-4' : 'h-[calc(100vh-120px)]'}`}>
      {/* Subtab Pill Navigation Bar */}
      <div className="bg-[#12161f] border border-[#00f2fe]/20 rounded-xl p-3 shadow-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#00f2fe] uppercase tracking-wider flex items-center gap-1.5 mr-2">
            <FileSpreadsheet className="w-4 h-4" />
            <span>{config.title}:</span>
          </span>

          {config.subTabs.map((sub) => {
            const isSelected = sub.gid === currentGid;
            return (
              <button
                key={sub.gid}
                onClick={() => onSelectSubTab(sub.gid, sub.nombre)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#00f2fe] text-[#0b0e14] shadow-[0_0_10px_rgba(0,242,254,0.5)]'
                    : 'bg-[#0d1017] text-[#8f9ba8] hover:text-white hover:bg-white/5 border border-white/5'
                }`}
              >
                • {sub.nombre}
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshIframe}
            className="p-1.5 rounded-lg bg-[#0d1017] border border-white/10 text-[#8f9ba8] hover:text-[#00f2fe] hover:border-[#00f2fe]/40 transition-all cursor-pointer"
            title="Recargar hoja"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#00f2fe]' : ''}`} />
          </button>

          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00f2fe]/10 border border-[#00f2fe]/40 text-[#00f2fe] text-xs font-bold hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Abrir en Google Sheets</span>
          </a>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-[#0d1017] border border-white/10 text-[#8f9ba8] hover:text-white transition-all cursor-pointer"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Embedded Google Sheet Frame */}
      <div className="flex-1 bg-[#12161f] border border-white/10 rounded-xl overflow-hidden shadow-2xl relative min-h-[500px]">
        {isLoading && (
          <div className="absolute inset-0 bg-[#0d1017] flex flex-col items-center justify-center gap-3 z-10">
            <RefreshCw className="w-8 h-8 text-[#00f2fe] animate-spin" />
            <span className="text-xs font-bold text-gray-300">
              Cargando hoja de cálculo "{currentSubTab.nombre}"...
            </span>
            <span className="text-[11px] text-gray-500">Conectando con Google Docs Workspace</span>
          </div>
        )}

        <iframe
          key={`${embedUrl}-${iframeKey}`}
          src={embedUrl}
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 bg-white"
          title={`${config.title} - ${currentSubTab.nombre}`}
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};
