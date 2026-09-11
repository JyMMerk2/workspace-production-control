import React, { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardData } from '../types';
import {
  RefreshCw,
  CheckCircle2,
  Package,
  Layers,
  Target,
  Tv,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Clock,
  LucideIcon,
} from 'lucide-react';

Chart.register(...registerables);

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  colorHex: string;
  icon: LucideIcon;
  delayIndex: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  colorHex,
  icon: Icon,
  delayIndex,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.35,
        delay: delayIndex * 0.05,
        ease: 'easeOut',
      }}
      className="group relative bg-[#12161f] border border-white/10 rounded-xl p-4 shadow-[0_8px_25px_rgba(0,0,0,0.35)] overflow-hidden cursor-default transition-all duration-300"
    >
      <div
        className="absolute top-0 left-0 w-full h-[3px]"
        style={{
          backgroundColor: colorHex,
          boxShadow: `0 0 12px ${colorHex}`,
        }}
      />
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8f9ba8]">
          {title}
        </span>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center border shadow-sm"
          style={{
            backgroundColor: `${colorHex}15`,
            borderColor: `${colorHex}40`,
            color: colorHex,
          }}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div
        className="text-3xl lg:text-4xl font-black my-1 tracking-tight"
        style={{
          color: colorHex,
          textShadow: `0 0 16px ${colorHex}55`,
        }}
      >
        {value}
      </div>
      <div className="flex items-center justify-between text-xs text-[#5f6e7d] mt-1.5">
        <span>{subtitle}</span>
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: colorHex,
            boxShadow: `0 0 8px ${colorHex}`,
          }}
        />
      </div>
    </motion.div>
  );
};

interface DashboardViewProps {
  data: DashboardData;
  isLive: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  isLive,
  isRefreshing,
  onRefresh,
}) => {
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [rotationInterval, setRotationInterval] = useState<number>(10);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const slideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const chartDoughnutRef = useRef<HTMLCanvasElement | null>(null);
  const chartBarsRef = useRef<HTMLCanvasElement | null>(null);
  const chartApparelBarsRef = useRef<HTMLCanvasElement | null>(null);

  const doughnutInstance = useRef<Chart | null>(null);
  const barsInstance = useRef<Chart | null>(null);
  const apparelBarsInstance = useRef<Chart | null>(null);

  const totalSlides = 4;

  useEffect(() => {
    if (isPresentationMode && !isPaused) {
      slideTimerRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
      }, rotationInterval * 1000);
    }
    return () => {
      if (slideTimerRef.current) {
        clearInterval(slideTimerRef.current);
      }
    };
  }, [isPresentationMode, isPaused, rotationInterval, totalSlides]);

  const togglePresentation = () => {
    if (!isPresentationMode) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsPresentationMode(true);
      setCurrentSlide(0);
      setIsPaused(false);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsPresentationMode(false);
    }
  };

  useEffect(() => {
    // 1. Doughnut Chart: Mochilas
    if (chartDoughnutRef.current && data.mochilas.length > 0) {
      if (doughnutInstance.current) {
        doughnutInstance.current.destroy();
      }

      doughnutInstance.current = new Chart(chartDoughnutRef.current, {
        type: 'doughnut',
        data: {
          labels: data.mochilas.map((m) => m.nombre),
          datasets: [
            {
              data: data.mochilas.map((m) => m.ordenes),
              backgroundColor: ['#00f2fe', '#ff007f', '#39ff14', '#ffe600', '#9d4edd', '#ff9e00'],
              borderColor: '#12161f',
              borderWidth: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#8f9ba8',
                font: { size: 10 },
                boxWidth: 10,
              },
            },
          },
        },
      });
    }

    // 2. Bar Chart: Mochilas (Ordenado de mayor a menor % cumplimiento)
    if (chartBarsRef.current && data.mochilas.length > 0) {
      if (barsInstance.current) {
        barsInstance.current.destroy();
      }

      // ORDENAMIENTO AUTOMÁTICO DINÁMICO POR % CUMPLIMIENTO (CAPTURA / META)
      const sortedMochilas = [...data.mochilas].sort((a, b) => {
        const pctA = a.meta > 0 ? a.captura / a.meta : 0;
        const pctB = b.meta > 0 ? b.captura / b.meta : 0;
        return pctB - pctA;
      });

      barsInstance.current = new Chart(chartBarsRef.current, {
        type: 'bar',
        data: {
          labels: sortedMochilas.map((m) => m.nombre.split(' ')[0]),
          datasets: [
            {
              label: 'Captura Pcs',
              data: sortedMochilas.map((m) => m.captura),
              backgroundColor: '#39ff14',
              borderRadius: 4,
            },
            {
              label: 'Meta Pcs',
              data: sortedMochilas.map((m) => m.meta),
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: { color: '#8f9ba8', font: { size: 9 } },
              grid: { display: false },
            },
            y: {
              ticks: { color: '#8f9ba8' },
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
            },
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#8f9ba8', boxWidth: 10 },
            },
          },
        },
      });
    }

    // 3. Bar Chart: Apparel (Ordenado de mayor a menor % cumplimiento)
    if (chartApparelBarsRef.current && data.apparel.length > 0) {
      if (apparelBarsInstance.current) {
        apparelBarsInstance.current.destroy();
      }

      // ORDENAMIENTO AUTOMÁTICO DINÁMICO POR % CUMPLIMIENTO (CAPTURA / META)
      const sortedApparel = [...data.apparel].sort((a, b) => {
        const pctA = a.meta > 0 ? a.captura / a.meta : 0;
        const pctB = b.meta > 0 ? b.captura / b.meta : 0;
        return pctB - pctA;
      });

      apparelBarsInstance.current = new Chart(chartApparelBarsRef.current, {
        type: 'bar',
        data: {
          labels: sortedApparel.map((m) => m.nombre.split(' (')[0]),
          datasets: [
            {
              label: 'Captura Pcs',
              data: sortedApparel.map((m) => m.captura),
              backgroundColor: '#ff007f',
              borderRadius: 4,
            },
            {
              label: 'Meta Pcs',
              data: sortedApparel.map((m) => m.meta),
              backgroundColor: 'rgba(0, 242, 254, 0.15)',
              borderColor: '#00f2fe',
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: { color: '#8f9ba8', font: { size: 9 } },
              grid: { display: false },
            },
            y: {
              ticks: { color: '#8f9ba8' },
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
            },
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#8f9ba8', boxWidth: 10 },
            },
          },
        },
      });
    }
  }, [data, currentSlide, isPresentationMode]);

  const { kpiMochilas, mochilas, kpiApparel, apparel, contenedor, lastUpdated } = data;

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#12161f] border-l-4 border-[#00f2fe] rounded-xl p-4 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39ff14] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#39ff14] shadow-[0_0_10px_#39ff14]"></span>
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
              Panel de Control de Producción en Vivo
              {isPresentationMode && (
                <span className="text-[10px] bg-[#ff007f] text-white px-2 py-0.5 rounded-md font-bold tracking-widest animate-pulse">
                  MODO TV ({currentSlide + 1}/{totalSlides})
                </span>
              )}
            </span>
            <span className="text-[11px] text-[#8f9ba8]">
              {isLive ? 'Conectado a Google Sheets API' : 'Modo Operativo Local'} • {lastUpdated || 'Actualizado'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPresentationMode && (
            <div className="flex items-center gap-1.5 bg-[#0d1017] border border-white/10 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-300">
              <Clock className="w-3.5 h-3.5 text-[#00f2fe]" />
              <span className="hidden md:inline">Rotación:</span>
              <select
                value={rotationInterval}
                onChange={(e) => setRotationInterval(Number(e.target.value))}
                className="bg-transparent text-[#00f2fe] font-bold focus:outline-none cursor-pointer"
              >
                <option value={5} className="bg-[#12161f]">5 Segundos</option>
                <option value={10} className="bg-[#12161f]">10 Segundos</option>
                <option value={15} className="bg-[#12161f]">15 Segundos</option>
                <option value={20} className="bg-[#12161f]">20 Segundos</option>
                <option value={30} className="bg-[#12161f]">30 Segundos</option>
              </select>
            </div>
          )}

          {isPresentationMode && (
            <div className="flex items-center gap-1 bg-black/50 p-1 rounded-lg border border-white/10">
              <button
                onClick={() => setCurrentSlide((prev) => (prev === 0 ? totalSlides - 1 : prev - 1))}
                className="p-1 hover:text-[#00f2fe] text-gray-300 cursor-pointer"
                title="Diapositiva Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-1 hover:text-[#39ff14] text-gray-200 cursor-pointer"
                title={isPaused ? 'Reanudar' : 'Pausar'}
              >
                {isPaused ? <Play className="w-4 h-4 text-amber-400" /> : <Pause className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setCurrentSlide((prev) => (prev + 1) % totalSlides)}
                className="p-1 hover:text-[#00f2fe] text-gray-300 cursor-pointer"
                title="Diapositiva Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={togglePresentation}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              isPresentationMode
                ? 'bg-[#ff007f] text-white border-[#ff007f] shadow-[0_0_15px_#ff007f]'
                : 'bg-[#00f2fe]/10 text-[#00f2fe] border-[#00f2fe] hover:bg-[#00f2fe] hover:text-[#0b0e14]'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>{isPresentationMode ? 'Salir Modo TV' : 'Modo Presentación'}</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#00f2fe]/10 border border-[#00f2fe] text-[#00f2fe] text-xs font-bold hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </button>
        </div>
      </div>

      {/* RENDERIZADO MODO PRESENTACIÓN O NORMAL */}
      <AnimatePresence mode="wait">
        {/* SLIDE 1: MOCHILAS KPIs, CHARTS & CONTENEDOR */}
        {(!isPresentationMode || currentSlide === 0) && (
          <motion.div
            key="slide-0"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div>
              <div className="flex items-center justify-between text-sm font-extrabold uppercase tracking-wider text-[#00f2fe] pb-2 border-b-2 border-[#00f2fe]/30 mb-4">
                <span>🎒 PROGRAMA MOCHILAS (KPIs & GRÁFICAS)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard
                  title="Órdenes Abiertas"
                  value={kpiMochilas.ordenes}
                  subtitle="Módulos Mochilas"
                  colorHex="#00f2fe"
                  icon={Package}
                  delayIndex={0}
                />
                <MetricCard
                  title="Balance Piezas (Pcs)"
                  value={kpiMochilas.balance.toLocaleString()}
                  subtitle="Piezas Pendientes"
                  colorHex="#ff007f"
                  icon={Layers}
                  delayIndex={1}
                />
                <MetricCard
                  title="Piezas Capturadas"
                  value={kpiMochilas.captura.toLocaleString()}
                  subtitle="Turno Actual"
                  colorHex="#39ff14"
                  icon={CheckCircle2}
                  delayIndex={2}
                />
                <MetricCard
                  title="Meta Global"
                  value={kpiMochilas.meta.toLocaleString()}
                  subtitle="Objetivo Diario"
                  colorHex="#ffe600"
                  icon={Target}
                  delayIndex={3}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                <div className="bg-[#12161f] border border-white/10 rounded-xl p-4 h-[320px] flex flex-col">
                  <span className="text-xs font-bold uppercase text-gray-200 mb-2">
                    Distribución de Órdenes Abiertas
                  </span>
                  <div className="relative flex-1 w-full min-h-0">
                    <canvas ref={chartDoughnutRef}></canvas>
                  </div>
                </div>

                <div className="bg-[#12161f] border border-white/10 rounded-xl p-4 h-[320px] flex flex-col">
                  <span className="text-xs font-bold uppercase text-gray-200 mb-2">
                    Desempeño Módulos vs Meta
                  </span>
                  <div className="relative flex-1 w-full min-h-0">
                    <canvas ref={chartBarsRef}></canvas>
                  </div>
                </div>
              </div>

              {/* CONTENEDOR STATUS CON LAS 3 BARRAS COMPLETAS */}
              <div className="bg-[#12161f] border border-[#00f2fe]/20 rounded-xl p-4 shadow-[0_8px_25px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase text-[#00f2fe] flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>ESTATUS DE CONTENEDOR Y ÓRDENES DEL DÍA</span>
                  </span>
                  <span className="text-xs font-bold text-[#39ff14] bg-[#39ff14]/10 px-2.5 py-1 rounded border border-[#39ff14]/30">
                    {contenedor.textoOrdenes}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* 1. Porcentaje Contenedor (Shipping Etiquetado) */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 text-[#00f2fe]">
                      <span>Porcentaje Contenedor (Shipping Etiquetado)</span>
                      <span>
                        {(
                          (contenedor.pctShipping <= 5
                            ? contenedor.pctShipping * 100
                            : contenedor.pctShipping) || 0
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00f2fe]"
                        style={{
                          width: `${Math.min(
                            contenedor.pctShipping <= 5
                              ? contenedor.pctShipping * 100
                              : contenedor.pctShipping,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* 2. Porcentaje en curso: Contenedor JBHU */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 text-[#00f2fe]">
                      <span>Porcentaje en curso: Contenedor JBHU</span>
                      <span>
                        {(
                          (contenedor.pctEnCurso <= 5
                            ? contenedor.pctEnCurso * 100
                            : contenedor.pctEnCurso) || 0
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00f2fe]"
                        style={{
                          width: `${Math.min(
                            contenedor.pctEnCurso <= 5
                              ? contenedor.pctEnCurso * 100
                              : contenedor.pctEnCurso,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* 3. Porcentaje Acumulado Total */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 text-[#ff9e00]">
                      <span>Porcentaje Acumulado Total</span>
                      <span>
                        {(
                          (contenedor.pctAcumulado <= 5
                            ? contenedor.pctAcumulado * 100
                            : contenedor.pctAcumulado) || 0
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#ff9e00]"
                        style={{
                          width: `${Math.min(
                            contenedor.pctAcumulado <= 5
                              ? contenedor.pctAcumulado * 100
                              : contenedor.pctAcumulado,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SLIDE 2: DESGLOSE OPERATIVO MOCHILAS */}
        {(!isPresentationMode || currentSlide === 1) && (
          <motion.div
            key="slide-1"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="bg-[#12161f] border border-white/10 rounded-xl p-5 overflow-x-auto shadow-lg">
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                <span className="text-sm font-extrabold uppercase text-[#00f2fe] tracking-wider">
                  📋 DESGLOSE OPERATIVO COMPLETO POR MÓDULO (PROGRAMA MOCHILAS)
                </span>
                {isPresentationMode && (
                  <span className="text-xs font-bold text-gray-400">
                    PANTALLA 2 DE {totalSlides}
                  </span>
                )}
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#00f2fe]/10 text-[#00f2fe] border-b border-[#00f2fe]/20">
                    <th className="p-3 font-bold uppercase">Módulo</th>
                    <th className="p-3 font-bold uppercase text-center">Órdenes WIP</th>
                    <th className="p-3 font-bold uppercase text-center">Balance Pcs</th>
                    <th className="p-3 font-bold uppercase text-center">Captura</th>
                    <th className="p-3 font-bold uppercase text-center">Meta</th>
                    <th className="p-3 font-bold uppercase text-right">% Cumplimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mochilas.map((m, idx) => {
                    const pct = m.meta > 0 ? (m.captura / m.meta) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-bold text-white">{m.nombre}</td>
                        <td className="p-3 text-center font-bold text-[#00f2fe]">{m.ordenes}</td>
                        <td className="p-3 text-center font-bold text-[#ff007f]">{m.balance}</td>
                        <td className="p-3 text-center text-gray-300">{m.captura.toLocaleString()}</td>
                        <td className="p-3 text-center text-gray-400">{m.meta.toLocaleString()}</td>
                        <td
                          className={`p-3 text-right font-black ${
                            pct >= 100
                              ? 'text-[#39ff14]'
                              : pct >= 50
                              ? 'text-[#ffe600]'
                              : 'text-[#ff007f]'
                          }`}
                        >
                          {pct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* SLIDE 3: APPAREL KPIs & CHART */}
        {(!isPresentationMode || currentSlide === 2) && (
          <motion.div
            key="slide-2"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div>
              <div className="flex items-center justify-between text-sm font-extrabold uppercase text-[#ff007f] pb-2 border-b-2 border-[#ff007f]/30 mb-4">
                <span>👕 PROGRAMA APPAREL (KPIs & REGISTRO DE PRODUCCIÓN)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard
                  title="Órdenes Abiertas"
                  value={kpiApparel.ordenes}
                  subtitle="Módulos Apparel"
                  colorHex="#00f2fe"
                  icon={Package}
                  delayIndex={0}
                />
                <MetricCard
                  title="Balance Piezas (Pcs)"
                  value={kpiApparel.balance.toLocaleString()}
                  subtitle="Piezas Pendientes"
                  colorHex="#ff007f"
                  icon={Layers}
                  delayIndex={1}
                />
                <MetricCard
                  title="Piezas Capturadas"
                  value={kpiApparel.captura.toLocaleString()}
                  subtitle="Turno Actual"
                  colorHex="#39ff14"
                  icon={CheckCircle2}
                  delayIndex={2}
                />
                <MetricCard
                  title="Meta Global"
                  value={kpiApparel.meta.toLocaleString()}
                  subtitle="Objetivo Diario"
                  colorHex="#ffe600"
                  icon={Target}
                  delayIndex={3}
                />
              </div>

              <div className="bg-[#12161f] border border-white/10 rounded-xl p-5 h-[380px] flex flex-col shadow-lg">
                <span className="text-xs font-bold uppercase text-gray-200 mb-3">
                  Registro de Producción vs Meta (Apparel)
                </span>
                <div className="relative flex-1 w-full min-h-0">
                  <canvas ref={chartApparelBarsRef}></canvas>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SLIDE 4: DESGLOSE OPERATIVO APPAREL */}
        {(!isPresentationMode || currentSlide === 3) && (
          <motion.div
            key="slide-3"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="bg-[#12161f] border border-white/10 rounded-xl p-5 overflow-x-auto shadow-lg">
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                <span className="text-sm font-extrabold uppercase text-[#ff007f] tracking-wider">
                  📋 DESGLOSE OPERATIVO COMPLETO POR MÓDULO (PROGRAMA APPAREL)
                </span>
                {isPresentationMode && (
                  <span className="text-xs font-bold text-gray-400">
                    PANTALLA 4 DE {totalSlides}
                  </span>
                )}
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#ff007f]/10 text-[#ff007f] border-b border-[#ff007f]/20">
                    <th className="p-3 font-bold uppercase">Módulo</th>
                    <th className="p-3 font-bold uppercase text-center">Órdenes WIP</th>
                    <th className="p-3 font-bold uppercase text-center">Balance Pcs</th>
                    <th className="p-3 font-bold uppercase text-center">Captura</th>
                    <th className="p-3 font-bold uppercase text-center">Meta</th>
                    <th className="p-3 font-bold uppercase text-center">Reportado</th>
                    <th className="p-3 font-bold uppercase text-right">% Cumplimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {apparel.map((m, idx) => {
                    const pct = m.meta > 0 ? (m.captura / m.meta) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-bold text-white">{m.nombre}</td>
                        <td className="p-3 text-center font-bold text-[#00f2fe]">{m.ordenes}</td>
                        <td className="p-3 text-center font-bold text-[#ff007f]">{m.balance}</td>
                        <td className="p-3 text-center text-gray-300">{m.captura.toLocaleString()}</td>
                        <td className="p-3 text-center text-gray-400">{m.meta.toLocaleString()}</td>
                        <td className="p-3 text-center text-gray-300">{(m.reportado || 0).toLocaleString()}</td>
                        <td
                          className={`p-3 text-right font-black ${
                            pct >= 100
                              ? 'text-[#39ff14]'
                              : pct >= 50
                              ? 'text-[#ffe600]'
                              : 'text-[#ff007f]'
                          }`}
                        >
                          {pct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
