import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ZoomIn, X, Upload, Filter, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { BlueprintItem } from '../types';
import { INITIAL_BLUEPRINTS } from '../data/blueprintsData';

const LOCAL_HTML_BLUEPRINTS: BlueprintItem[] = [
  { id: 'BM-9021-LOC', code: '9021', title: '9021 Superpack (BM)', category: 'Mochilas BM', modelFamily: 'Superpack', description: 'Plano local de la red Boombah para mochila 9021 Superpack (BM).', specs: ['Origen: Red Local', 'Ruta: 9021_Superpack/BM'], colorways: ['Original'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/9021_Superpack/BM/BPSP-B_B.jpg' },
  { id: 'PS-9021-LOC', code: '9021', title: '9021 Superpack (PS)', category: 'Mochilas PS', modelFamily: 'Superpack', description: 'Plano local para mochila 9021 Superpack (PS).', specs: ['Origen: Red Local', 'Ruta: 9021_Superpack/PS'], colorways: ['Original'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/9021_Superpack/PS/BPSPCM-B-C_B.jpg' },
  { id: 'BM-9025-600D-LOC', code: '9025', title: '9025 Diamond Duffle 600D', category: 'Mochilas BM', modelFamily: 'Diamond Duffle', description: 'Plano local de la mochila 9025 Diamond Duffle 600D.', specs: ['Material: 600D', 'Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9025_Diamond-Duffle/BM/BM-9025-600D.PNG' },
  { id: 'BM-9014-LOC', code: '9014', title: '9014 Mini Superpack (BM)', category: 'Mochilas BM', modelFamily: 'Mini Superpack', description: 'Plano local para mochila 9014 Mini Superpack (BM).', specs: ['Origen: Red Local'], colorways: ['Original'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/9014_Mini%20Superpack/BM/BM-9014-B-B_B.jpg' },
  { id: 'PS-9014-LOC', code: '9014', title: '9014 Mini Superpack (PS)', category: 'Mochilas PS', modelFamily: 'Mini Superpack', description: 'Plano local para mochila 9014 Mini Superpack (PS).', specs: ['Origen: Red Local'], colorways: ['Original'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/9014_Mini%20Superpack/PS/PS-9014-3001-B-C_B.jpg' },
  { id: 'BM-9068-LOC', code: '9068', title: '9068 DEFCON Superpack XL', category: 'Mochilas BM', modelFamily: 'DEFCON', description: 'Plano local para mochila 9068 DEFCON Superpack XL.', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9068_DEFCON%20Superpack%20XL/BM/BM-9068-B_B.jpg' },
  { id: 'BM-9088-LOC', code: '9088', title: '9088 Ultrapack Hybrid (BM)', category: 'Mochilas BM', modelFamily: 'Ultrapack', description: 'Plano local para mochila 9088 Ultrapack Hybrid (BM).', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9088_Ultrapack_Hybrid/BM/BM-9088-B-RD_B.jpg' },
  { id: 'PS-9088-LOC', code: '9088', title: '9088 Ultrapack Hybrid (PS)', category: 'Mochilas PS', modelFamily: 'Ultrapack', description: 'Plano local para mochila 9088 Ultrapack Hybrid (PS).', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9088_Ultrapack_Hybrid/PS/PS-9088-3000-B-CB_B.jpg' },
  { id: 'BM-9124-LOC', code: '9124', title: '9124 Catchers Rolling (BM)', category: 'Mochilas BM', modelFamily: 'Catchers Rolling', description: 'Plano local para mochila 9124 Catchers Rolling (BM).', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9124_Catchers_Rolling/BM/BM-9124-B_B.jpg' },
  { id: 'PS-9124-LOC', code: '9124', title: '9124 Catchers Rolling (PS)', category: 'Mochilas PS', modelFamily: 'Catchers Rolling', description: 'Plano local para mochila 9124 Catchers Rolling (PS).', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9124_Catchers_Rolling/PS/PS-9124-3000-B-C_B.jpg' },
  { id: 'BM-9092-LOC', code: '9092', title: '9092 Sports Duffle (BM)', category: 'Mochilas BM', modelFamily: 'Sports Duffle', description: 'Plano local para mochila 9092 Sports Duffle.', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9092_Sports%20Duffle/9044/BM/BM-9092-CB_B.jpg' },
  { id: 'BM-9000-LOC', code: '9000', title: '9000 Tyro (BM)', category: 'Mochilas BM', modelFamily: 'Tyro', description: 'Plano local para mochila 9000 Tyro (BM).', specs: ['Origen: Red Local'], colorways: ['Original'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/9000_Tyro/BM/BPT-B_B.jpg' },
  { id: 'PS-9000-LOC', code: '9000', title: '9000 Tyro (PS)', category: 'Mochilas PS', modelFamily: 'Tyro', description: 'Plano local para mochila 9000 Tyro (PS).', specs: ['Origen: Red Local'], colorways: ['Original'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/9000_Tyro/PS/BPTCM-B-CB_B.jpg' },
  { id: 'BM-9024-LOC', code: '9024', title: '9024 Catchers Superpack (BM)', category: 'Mochilas BM', modelFamily: 'Catchers Superpack', description: 'Plano local para mochila 9024 Catchers Superpack (BM).', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9024_Catchers_Superpack/BM/BM-9024-B_B.jpg' },
  { id: 'PS-9024-LOC', code: '9024', title: '9024 Catchers Superpack (PS)', category: 'Mochilas PS', modelFamily: 'Catchers Superpack', description: 'Plano local para mochila 9024 Catchers Superpack (PS).', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9024_Catchers_Superpack/PS/PS-9024-3000-B-CB_B.jpg' },
  { id: 'BM-9037-LOC', code: '9037', title: '9037 Rolling Superpack (BM)', category: 'Mochilas BM', modelFamily: 'Rolling Superpack', description: 'Plano local para mochila 9037 Rolling Superpack (BM).', specs: ['Origen: Red Local'], colorways: ['Original'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/9037_Rolling_Superpack/BM/BRSP2-B_B.jpg' },
  { id: 'PS-9037-LOC', code: '9037', title: '9037 Rolling Superpack (PS)', category: 'Mochilas PS', modelFamily: 'Rolling Superpack', description: 'Plano local para mochila 9037 Rolling Superpack (PS).', specs: ['Origen: Red Local'], colorways: ['Original'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/9037_Rolling_Superpack/PS/BRSP2CM-B-CRD_B.jpg' },
  { id: 'BM-9043-LOC', code: '9043', title: '9043 Beast (BM)', category: 'Mochilas BM', modelFamily: 'Beast', description: 'Plano local para mochila 9043 Beast.', specs: ['Origen: Red Local'], colorways: ['Original'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/9043_Beast/BM-9043%20B-TL_page-0001.jpg' },
  { id: 'BM-9045-LOC', code: '9045', title: '9044 Brute (BM)', category: 'Mochilas BM', modelFamily: 'Brute', description: 'Plano local para mochila 9044 Brute.', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9044_Brute/BM/BBR2-B_B.jpg' },
  { id: 'BM-9049-LOC', code: '9049', title: '9049 Prospect (BM)', category: 'Mochilas BM', modelFamily: 'Prospect', description: 'Plano local para mochila 9049 Prospect.', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9049_Prospect/BM/_BM-9049_Master%20Color%20Map-01.jpg' },
  { id: 'BM-9051-LOC', code: '9051', title: '9051 Hybrid Superpack (BM)', category: 'Mochilas BM', modelFamily: 'Hybrid Superpack', description: 'Plano local para mochila 9051 Hybrid Superpack (BM).', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9051_Hybrid_Superpack/BM/BM-9051-B_B.jpg' },
  { id: 'PS-9051-LOC', code: '9051', title: '9051 Hybrid Superpack (PS)', category: 'Mochilas PS', modelFamily: 'Hybrid Superpack', description: 'Plano local para mochila 9051 Hybrid Superpack (PS).', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9051_Hybrid_Superpack/PS/PS-9051-3000-B-C_B.jpg' },
  { id: 'BM-9053-LOC', code: '9053', title: '9053 Superpack XL (BM)', category: 'Mochilas BM', modelFamily: 'Superpack XL', description: 'Plano local para mochila 9053 Superpack XL (BM).', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9053_Superpack_XL/BM/BM-9053-B_B.jpg' },
  { id: 'PS-9053-LOC', code: '9053', title: '9053 Superpack XL (PS)', category: 'Mochilas PS', modelFamily: 'Superpack XL', description: 'Plano local para mochila 9053 Superpack XL (PS).', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9053_Superpack_XL/PS/PS-9053-3001_B-CB_B.jpg' },
  { id: 'BM-9060-LOC', code: '9060', title: '9060 Hybrid Catchers (BM)', category: 'Mochilas BM', modelFamily: 'Hybrid Catchers', description: 'Plano local para mochila 9060 Hybrid Catchers (BM).', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9060_Hybrid%20Catchers/BM/BM-9060-B_B.jpg' },
  { id: 'PS-9060-LOC', code: '9060', title: '9060 Hybrid Catchers (PS)', category: 'Mochilas PS', modelFamily: 'Hybrid Catchers', description: 'Plano local para mochila 9060 Hybrid Catchers (PS).', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9060_Hybrid%20Catchers/PS/PS-9060-3000-B-C_B.jpg' },
  { id: 'BM-9066-LOC', code: '9066', title: '9066 DEFCON Rolling Superpack', category: 'Mochilas BM', modelFamily: 'DEFCON', description: 'Plano local para mochila 9066 DEFCON Rolling Superpack.', specs: ['Origen: Disco P:'], colorways: ['Original'], imageUrl: 'file:///P:/Product%20Development/user/Juan%20Mercado/BD%20icm/9066_DEFCON%20Rolling%20Superpack/BM/BM-9066-B_B.jpg' },
  { id: 'FD-9000-LOC', code: 'FD-9000', title: 'Plano Técnico FD-9000', category: 'Full Dye FD', modelFamily: 'Full Dye', description: 'Plano técnico local Full Dye FD-9000.', specs: ['Origen: Red Local'], colorways: ['Full Dye'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/FD/FD-9000.jpg' },
  { id: 'FD-9003-LOC', code: 'FD-9003', title: 'Plano Técnico FD-9003', category: 'Full Dye FD', modelFamily: 'Full Dye', description: 'Plano técnico local Full Dye FD-9003.', specs: ['Origen: Red Local'], colorways: ['Full Dye'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/FD/FD-9003.jpg' },
  { id: 'FD-9006-LOC', code: 'FD-9006', title: 'Plano Técnico FD-9006', category: 'Full Dye FD', modelFamily: 'Full Dye', description: 'Plano técnico local Full Dye FD-9006.', specs: ['Origen: Red Local'], colorways: ['Full Dye'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/FD/FD-9006.jpg' },
  { id: 'FD-9010-LOC', code: 'FD-9010', title: 'Plano Técnico FD-9010', category: 'Full Dye FD', modelFamily: 'Full Dye', description: 'Plano técnico local Full Dye FD-9010.', specs: ['Origen: Red Local'], colorways: ['Full Dye'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/FD/FD-9010.jpg' },
  { id: 'FD-9012-LOC', code: 'FD-9012', title: 'Plano Técnico FD-9012', category: 'Full Dye FD', modelFamily: 'Full Dye', description: 'Plano técnico local Full Dye FD-9012.', specs: ['Origen: Red Local'], colorways: ['Full Dye'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/FD/FD-9012.jpg' },
  { id: 'FD-9031-LOC', code: 'FD-9031', title: 'Plano Técnico FD-9031', category: 'Full Dye FD', modelFamily: 'Full Dye', description: 'Plano técnico local Full Dye FD-9031.', specs: ['Origen: Red Local'], colorways: ['Full Dye'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/FD/FD-9031.jpg' },
  { id: 'FD-163-LOC', code: 'FD-163', title: 'Plano Técnico FD-163', category: 'Full Dye FD', modelFamily: 'Full Dye', description: 'Plano técnico local Full Dye FD-163.', specs: ['Origen: Red Local'], colorways: ['Full Dye'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/FD/FD-163.jpg' },
  { id: 'PS-4070-LOC', code: 'PS-4070', title: 'Plano Técnico PS-4070', category: 'Pantalones PS', modelFamily: 'Pantalones', description: 'Plano técnico local Pantalón PS-4070.', specs: ['Origen: Red Local'], colorways: ['Pantalón'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/FD/PS-4070.jpg' },
  { id: 'FORRO-9088-LOC', code: 'FORRO 9088', title: 'Esquema Forros 9088', category: 'Forros y Accesorios', modelFamily: 'Forros', description: 'Plano de forros y piezas internas para modelo 9088.', specs: ['Origen: Red Local'], colorways: ['Forro'], imageUrl: 'file://boombah.local/Shares/Public/Product%20Development/user/Juan%20Mercado/BD%20icm/FORROS%209088.png' },
];

export const PlanosView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  
  const [blueprints, setBlueprints] = useState<BlueprintItem[]>(() => {
    const combined = [...INITIAL_BLUEPRINTS];
    LOCAL_HTML_BLUEPRINTS.forEach((localBp) => {
      if (!combined.some((b) => b.id === localBp.id || b.imageUrl === localBp.imageUrl)) {
        combined.push(localBp);
      }
    });
    return combined;
  });

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
      if (e.deltaY < 0) return Math.min(prev + 0.3, 6);
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

  const abrirEnlaceLocal = (url: string) => {
    if (url.startsWith('file://')) {
      window.open(url, '_blank');
    }
  };

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
        {filteredBlueprints.map((item) => (
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

            {/* Blueprint Preview Box */}
            <div
              onClick={() => setZoomItem(item)}
              className="relative h-48 bg-[#0a0d13] flex items-center justify-center p-4 cursor-pointer overflow-hidden group-hover:bg-[#07090e] transition-colors border-b border-white/5"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : null}

              <div className="w-full h-full relative flex items-center justify-center bg-[#07090e] rounded-lg border border-[#00f2fe]/20 p-2 select-none group-hover:border-[#00f2fe]/50 transition-colors">
                <div
                  className="absolute inset-0 opacity-15"
                  style={{
                    backgroundImage: `linear-gradient(to right, #00f2fe 1px, transparent 1px), linear-gradient(to bottom, #00f2fe 1px, transparent 1px)`,
                    backgroundSize: '16px 16px',
                  }}
                ></div>
                <div className="relative z-10 flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-[#00f2fe]/70 flex flex-col items-center justify-center p-2 bg-[#00f2fe]/5 mb-1 group-hover:border-[#00f2fe] group-hover:bg-[#00f2fe]/10 transition-all">
                    <ImageIcon className="w-8 h-8 text-[#00f2fe] mb-1" />
                    <span className="text-[10px] font-black text-white">{item.code}</span>
                    <span className="text-[8px] font-mono text-[#00f2fe]">RED LOCAL</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono tracking-wider truncate max-w-[200px]">
                    {item.title}
                  </span>
                </div>
              </div>

              <div className="absolute inset-0 bg-[#00f2fe]/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs z-20">
                <ZoomIn className="w-4 h-4 text-[#00f2fe]" />
                <span className="bg-[#12161f]/90 px-3 py-1.5 rounded-full border border-[#00f2fe]/50 shadow-lg text-[#00f2fe]">
                  Abrir Lupa e Inspeccionar
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

              <button
                onClick={() => setZoomItem(item)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#00f2fe]/10 border border-[#00f2fe]/30 text-[#00f2fe] text-xs font-bold hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer shadow-[0_0_8px_rgba(0,242,254,0.15)]"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Inspeccionar Plano (Pantalla Completa)</span>
              </button>
            </div>
          </div>
        ))}
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

      {/* FULLSCREEN Interactive Magnifier Modal */}
      {zoomItem && (
        <div className="fixed inset-0 z-50 bg-black backdrop-blur-md flex flex-col w-screen h-screen">
          {/* Top Control Bar */}
          <div className="h-14 px-6 bg-[#12161f] border-b border-white/10 flex items-center justify-between shrink-0 z-20">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-[#00f2fe]/20 border border-[#00f2fe] text-[#00f2fe] font-black text-sm">
                {zoomItem.code}
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-white">{zoomItem.title}</h2>
                <span className="text-xs text-[#8f9ba8]">{zoomItem.category} • {zoomItem.modelFamily}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {zoomItem.imageUrl?.startsWith('file://') && (
                <button
                  onClick={() => abrirEnlaceLocal(zoomItem.imageUrl!)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00f2fe]/20 border border-[#00f2fe] text-[#00f2fe] text-xs font-bold hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Archivo de Red</span>
                </button>
              )}

              <div className="hidden sm:flex items-center gap-2 bg-[#0d1017] px-3 py-1.5 rounded-lg border border-white/10">
                <span className="text-xs text-gray-400 font-bold">Zoom: {zoomLevel.toFixed(1)}x</span>
                <input
                  type="range"
                  min="1.5"
                  max="6"
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
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#ff007f] text-white text-xs font-black hover:bg-[#ff007f]/80 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,0,127,0.5)]"
              >
                <X className="w-4 h-4" />
                <span>CERRAR [ESC]</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Stage */}
          <div
            ref={zoomContainerRef}
            onClick={() => setLupaActive(!lupaActive)}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
            className="flex-1 relative overflow-hidden flex items-center justify-center p-2 cursor-crosshair select-none bg-[#080a0f] w-full h-full"
          >
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(to right, #00f2fe 1px, transparent 1px), linear-gradient(to bottom, #00f2fe 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            ></div>

            <div className="relative w-full h-full flex items-center justify-center p-2 bg-[#0e121a] rounded-lg border border-white/10 overflow-hidden">
              {zoomItem.imageUrl ? (
                <img
                  src={zoomItem.imageUrl}
                  alt={zoomItem.title}
                  className="w-full h-full object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : null}

              <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-[#00f2fe]/40 rounded-xl bg-[#090c12]">
                <div className="w-36 h-36 rounded-2xl border-2 border-[#00f2fe] bg-[#00f2fe]/10 flex flex-col items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,242,254,0.2)]">
                  <ImageIcon className="w-16 h-16 text-[#00f2fe] mb-2" />
                  <span className="text-sm font-black text-white">{zoomItem.code}</span>
                </div>
                <h3 className="text-lg font-black text-[#00f2fe] uppercase tracking-wider mb-1">
                  {zoomItem.title}
                </h3>
                <p className="text-xs text-gray-400 max-w-lg mb-4">{zoomItem.description}</p>
                
                <div className="flex flex-col gap-2 items-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#39ff14]/15 border border-[#39ff14] text-[#39ff14] text-xs font-bold hover:bg-[#39ff14] hover:text-[#0b0e14] transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Cargar Imagen Directa para este Plano</span>
                  </button>
                </div>
              </div>

              {lupaActive && zoomItem.imageUrl && (
                <div
                  className="absolute pointer-events-none rounded-full border-3 border-white shadow-[0_0_30px_rgba(0,0,0,0.9)] overflow-hidden bg-[#07090e] z-30"
                  style={{
                    width: '260px',
                    height: '260px',
                    left: `${mousePos.x - 130}px`,
                    top: `${mousePos.y - 130}px`,
                  }}
                >
                  <div
                    className="w-full h-full relative"
                    style={{
                      backgroundImage: `url('${zoomItem.imageUrl}')`,
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: `${zoomLevel * 100}%`,
                      backgroundPosition: `${mousePos.relX}% ${mousePos.relY}%`,
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                      <div className="w-full h-[1px] bg-[#00f2fe]"></div>
                      <div className="h-full w-[1px] bg-[#00f2fe] absolute"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#12161f]/90 border border-white/10 px-5 py-2 rounded-full text-xs text-gray-300 shadow-xl flex items-center gap-4 z-30">
              <span>💡 Haz clic en el plano para Activar/Desactivar Lupa</span>
              <span>• Rueda del mouse para Zoom ({zoomLevel.toFixed(1)}x)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
