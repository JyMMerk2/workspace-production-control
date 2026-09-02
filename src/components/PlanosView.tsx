import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ZoomIn, X, Upload, Filter, Tag, CheckCircle, Sliders, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { BlueprintItem } from '../types';
import { INITIAL_BLUEPRINTS } from '../data/blueprintsData';

export const PlanosView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [blueprints, setBlueprints] = useState<BlueprintItem[]>(INITIAL_BLUEPRINTS);
  
  // Magnifier / Zoom Modal State
  const [zoomItem, setZoomItem] = useState<BlueprintItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(2.5);
  const [lupaActive, setLupaActive] = useState<boolean>(true);
  const [mousePos, setMousePos] = useState<{ x: number; y: number; relX: number; relY: number }>({
    x: 0,
    y: 0,
    relX: 50,
    relY: 50,
  });

  const zoomContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categories = ['Todos', 'Mochilas BM', 'Mochilas PS', 'Full Dye FD', 'Pantalones PS', 'Forros y Accesorios'];

  const filteredBlueprints = useMemo(() => {
    return blueprints.filter((b) => {
      const matchSearch =
        searchTerm === '' ||
        b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.modelFamily.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = selectedCategory === 'Todos' || b.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [blueprints, searchTerm, selectedCategory]);

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      const codeDetected = fileNameWithoutExt.split(/[-_ ]/)[0].toUpperCase();

      const newBlueprint: BlueprintItem = {
        id: `CUSTOM-${Date.now()}`,
        code: codeDetected || 'CUSTOM',
        title: `Plano Técnico: ${fileNameWithoutExt}`,
        category: 'Mochilas BM',
        modelFamily: 'Plano Subido por Usuario',
        description: 'Plano técnico importado localmente para referencia operativa y control de corte.',
        specs: [`Archivo: ${file.name}`, `Tamaño: ${(file.size / 1024).toFixed(1)} KB`, `Importado: ${new Date().toLocaleDateString()}`],
        colorways: ['Original Técnico'],
        imageUrl: dataUrl,
        isCustom: true,
      };

      setBlueprints((prev) => [newBlueprint, ...prev]);
    };
    reader.readAsDataURL(file);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomContainerRef.current) return;
    const rect = zoomContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const relX = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const relY = Math.max(0, Math.min(100, (y / rect.height) * 100));

    setMousePos({ x, y, relX, relY });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoomLevel((prev) => {
      if (e.deltaY < 0) return Math.min(prev + 0.3, 5);
      return Math.max(prev - 0.3, 1.5);
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-[#12161f] border border-[#00f2fe]/20 rounded-xl p-5 shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00f2fe]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código (ej: 9021, 9025, FD-163, 4070, Superpack, Duffle)..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0d1017] border border-[#00f2fe]/40 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00f2fe] focus:shadow-[0_0_12px_rgba(0,242,254,0.3)] transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCustomUpload}
              accept="image/*,.pdf"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#39ff14]/10 border border-[#39ff14] text-[#39ff14] text-xs font-bold hover:bg-[#39ff14] hover:text-[#0b0e14] transition-all cursor-pointer shadow-[0_0_10px_rgba(57,255,20,0.25)]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Subir Plano (JPG/PNG)</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-white/5">
          <span className="text-xs font-bold text-[#8f9ba8] mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#00f2fe]" /> Filtro:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#00f2fe] text-[#0b0e14] shadow-[0_0_10px_rgba(0,242,254,0.6)]'
                  : 'bg-white/5 text-[#8f9ba8] hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
          <span className="ml-auto text-xs font-semibold text-gray-400">
            {filteredBlueprints.length} plano(s) encontrados
          </span>
        </div>
      </div>

      {/* Blueprints Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBlueprints.map((item) => {
          return (
            <div
              key={item.id}
              className="bg-[#12161f] border border-white/10 rounded-xl overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.3)] hover:border-[#00f2fe]/50 hover:shadow-[0_10px_30px_rgba(0,242,254,0.2)] transition-all flex flex-col group"
            >
              {/* Card Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0d1017]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#00f2fe]/15 border border-[#00f2fe]/40 text-[#00f2fe] font-black text-xs">
                    {item.code}
                  </span>
                  <span className="text-xs font-bold text-gray-200 truncate max-w-[180px]">
                    {item.modelFamily}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-extrabold text-[#8f9ba8] px-2 py-0.5 rounded bg-white/5">
                  {item.category}
                </span>
              </div>

              {/* Blueprint Schematic Preview Box */}
              <div
                onClick={() => setZoomItem(item)}
                className="relative h-48 bg-[#0a0d13] flex items-center justify-center p-4 cursor-pointer overflow-hidden group-hover:bg-[#07090e] transition-colors border-b border-white/5"
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  /* High Quality Blueprint Vector Rendering */
                  <div className="w-full h-full relative flex items-center justify-center bg-[#07090e] rounded-lg border border-[#00f2fe]/20 p-2 select-none">
                    {/* Grid Background */}
                    <div
                      className="absolute inset-0 opacity-15"
                      style={{
                        backgroundImage: `linear-gradient(to right, #00f2fe 1px, transparent 1px), linear-gradient(to bottom, #00f2fe 1px, transparent 1px)`,
                        backgroundSize: '16px 16px',
                      }}
                    ></div>

                    {/* Vector Schematic Graphic */}
                    <div className="relative z-10 flex flex-col items-center justify-center text-center">
                      <div className="w-24 h-24 rounded-lg border-2 border-dashed border-[#00f2fe]/70 flex flex-col items-center justify-center p-2 bg-[#00f2fe]/5 mb-1 group-hover:border-[#00f2fe] group-hover:bg-[#00f2fe]/10 transition-all">
                        <ImageIcon className="w-8 h-8 text-[#00f2fe] mb-1" />
                        <span className="text-[10px] font-black text-white">{item.id}</span>
                        <span className="text-[8px] font-mono text-[#00f2fe]">CAD SCHEMATIC</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono tracking-wider">
                        PLANO TÉCNICO OFICIAL
                      </span>
                    </div>

                    {/* Technical Dimension Marks */}
                    <span className="absolute top-1.5 left-2 text-[9px] font-mono text-[#00f2fe]/60">
                      ID: {item.id}
                    </span>
                    <span className="absolute bottom-1.5 right-2 text-[9px] font-mono text-[#39ff14]/70">
                      BOOMBAH QC PASS
                    </span>
                  </div>
                )}

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-[#00f2fe]/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs">
                  <ZoomIn className="w-4 h-4 text-[#00f2fe]" />
                  <span className="bg-[#12161f]/90 px-3 py-1.5 rounded-full border border-[#00f2fe]/50 shadow-lg text-[#00f2fe]">
                    Abrir Lupa y Zoom 🔍
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1 group-hover:text-[#00f2fe] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Specs bullets */}
                <div className="space-y-1 bg-[#0d1017] p-2.5 rounded-lg border border-white/5">
                  <span className="text-[10px] font-bold text-[#8f9ba8] uppercase block">
                    Especificaciones Clave:
                  </span>
                  {item.specs.slice(0, 2).map((sp, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-1.5 text-[11px] text-gray-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00f2fe]"></span>
                      <span className="truncate">{sp}</span>
                    </div>
                  ))}
                </div>

                {/* Card Action */}
                <button
                  onClick={() => setZoomItem(item)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#00f2fe]/10 border border-[#00f2fe]/30 text-[#00f2fe] text-xs font-bold hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer shadow-[0_0_8px_rgba(0,242,254,0.15)]"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Inspeccionar Plano (Lupa)</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBlueprints.length === 0 && (
        <div className="bg-[#12161f] border border-white/5 rounded-xl p-12 text-center">
          <Search className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-300 mb-1">No se encontraron planos coincidentes</h3>
          <p className="text-xs text-gray-500 mb-4">
            Intente con otro código numérico o suba el plano correspondiente.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('Todos');
            }}
            className="px-4 py-2 rounded-lg bg-[#00f2fe]/20 text-[#00f2fe] text-xs font-bold hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all"
          >
            Limpiar Filtros
          </button>
        </div>
      )}

      {/* Interactive Magnifier (Lupa) Fullscreen Modal */}
      {zoomItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col">
          {/* Top Bar */}
          <div className="h-16 px-6 bg-[#12161f]/90 border-b border-white/10 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-[#00f2fe]/20 border border-[#00f2fe] text-[#00f2fe] font-black text-sm">
                {zoomItem.code}
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-white">{zoomItem.title}</h2>
                <span className="text-xs text-[#8f9ba8]">{zoomItem.category} • {zoomItem.modelFamily}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-[#0d1017] px-3 py-1.5 rounded-lg border border-white/10">
                <span className="text-xs text-gray-400 font-bold">Zoom: {zoomLevel.toFixed(1)}x</span>
                <input
                  type="range"
                  min="1.5"
                  max="5"
                  step="0.1"
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                  className="w-24 accent-[#00f2fe] cursor-pointer"
                />
              </div>

              <button
                onClick={() => setLupaActive(!lupaActive)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  lupaActive
                    ? 'bg-[#39ff14]/20 border-[#39ff14] text-[#39ff14]'
                    : 'bg-white/5 border-white/10 text-gray-400'
                }`}
              >
                {lupaActive ? 'Lupa Activa ✓' : 'Lupa Inactiva'}
              </button>

              <button
                onClick={() => setZoomItem(null)}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#ff007f] text-white text-xs font-black hover:bg-[#ff007f]/80 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,0,127,0.5)]"
              >
                <X className="w-4 h-4" />
                <span>CERRAR [ESC]</span>
              </button>
            </div>
          </div>

          {/* Interactive Zoom Stage */}
          <div
            ref={zoomContainerRef}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
            className="flex-1 relative overflow-hidden flex items-center justify-center p-8 cursor-crosshair select-none bg-[#080a0f]"
          >
            {/* Background Grid */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(to right, #00f2fe 1px, transparent 1px), linear-gradient(to bottom, #00f2fe 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            ></div>

            {/* Main Image Stage */}
            <div className="relative max-w-4xl max-h-[75vh] w-full h-full flex items-center justify-center p-6 bg-[#0e121a] rounded-2xl border-2 border-white/10 shadow-2xl">
              {zoomItem.imageUrl ? (
                <img
                  src={zoomItem.imageUrl}
                  alt={zoomItem.title}
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-[#00f2fe]/40 rounded-xl bg-[#090c12]">
                  <div className="w-36 h-36 rounded-2xl border-2 border-[#00f2fe] bg-[#00f2fe]/10 flex flex-col items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,242,254,0.2)]">
                    <ImageIcon className="w-16 h-16 text-[#00f2fe] mb-2" />
                    <span className="text-sm font-black text-white">{zoomItem.id}</span>
                  </div>
                  <h3 className="text-lg font-black text-[#00f2fe] uppercase tracking-wider mb-1">
                    {zoomItem.title}
                  </h3>
                  <p className="text-xs text-gray-400 max-w-lg mb-4">{zoomItem.description}</p>
                  <div className="grid grid-cols-2 gap-3 max-w-md w-full text-left text-xs bg-[#12161f] p-3 rounded-lg border border-white/5">
                    {zoomItem.specs.map((sp, i) => (
                      <div key={i} className="text-gray-300">
                        • {sp}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Magnifying Glass Lens (Lupa) */}
              {lupaActive && (
                <div
                  className="absolute pointer-events-none rounded-full border-3 border-white shadow-[0_0_30px_rgba(0,0,0,0.9)] overflow-hidden bg-[#07090e] z-30"
                  style={{
                    width: '240px',
                    height: '240px',
                    left: `${mousePos.x - 120}px`,
                    top: `${mousePos.y - 120}px`,
                  }}
                >
                  <div
                    className="w-full h-full relative"
                    style={{
                      backgroundImage: zoomItem.imageUrl
                        ? `url('${zoomItem.imageUrl}')`
                        : undefined,
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: `${zoomLevel * 100}%`,
                      backgroundPosition: `${mousePos.relX}% ${mousePos.relY}%`,
                    }}
                  >
                    {!zoomItem.imageUrl && (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[#07090e] text-center p-4">
                        <span className="text-xs font-mono font-bold text-[#00f2fe]">
                          {zoomItem.id}
                        </span>
                        <span className="text-[10px] text-[#39ff14] font-mono">
                          X:{mousePos.relX.toFixed(0)}% Y:{mousePos.relY.toFixed(0)}%
                        </span>
                        <span className="text-[9px] text-gray-400">Detalle Vector</span>
                      </div>
                    )}
                    {/* Reticle / Crosshair in Center */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                      <div className="w-full h-[1px] bg-[#00f2fe]"></div>
                      <div className="h-full w-[1px] bg-[#00f2fe] absolute"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom info banner */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#12161f]/90 border border-white/10 px-4 py-2 rounded-full text-xs text-gray-300 shadow-xl flex items-center gap-3">
              <span>💡 Mueva el mouse para explorar con la lupa</span>
              <span>• Rueda del mouse para cambiar aumento ({zoomLevel.toFixed(1)}x)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
