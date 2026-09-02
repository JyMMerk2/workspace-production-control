import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { motion } from 'motion/react';
import { DashboardData } from '../types';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  Package,
  AlertCircle,
  Layers,
  Target,
  Sparkles,
  Flame,
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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.45,
        delay: delayIndex * 0.08,
        ease: [0.21, 1.02, 0.49, 1],
      }}
      whileHover={{
        y: -5,
        scale: 1.02,
        transition: { duration: 0.2, ease: 'easeOut' },
      }}
      whileTap={{ scale: 0.98 }}
      className="group relative bg-[#12161f] border border-white/10 rounded-xl p-5 shadow-[0_8px_25px_rgba(0,0,0,0.35)] overflow-hidden cursor-default transition-all duration-300"
      style={{
        borderColor: 'rgba(255, 255, 255, 0.08)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${colorHex}70`;
        e.currentTarget.style.boxShadow = `0 14px 35px ${colorHex}25`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.35)';
      }}
    >
      {/* Top Neon Accent Strip with dynamic hover intensity */}
      <div
        className="absolute top-0 left-0 w-full h-[3px] transition-all duration-300 group-hover:h-[4px]"
        style={{
          backgroundColor: colorHex,
          boxShadow: `0 0 14px ${colorHex}`,
        }}
      />

      {/* Radial Neon Backlight on top-right */}
      <div
        className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-15 group-hover:opacity-35 transition-opacity duration-300 pointer-events-none"
        style={{ backgroundColor: colorHex }}
      />

      {/* Header with Title and Neon Icon Badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8f9ba8] group-hover:text-gray-200 transition-colors">
          {title}
        </span>
        <motion.div
          whileHover={{ rotate: 12, scale: 1.15 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          className="w-7 h-7 rounded-lg flex items-center justify-center border transition-all duration-300 shadow-sm"
          style={{
            backgroundColor: `${colorHex}15`,
            borderColor: `${colorHex}40`,
            color: colorHex,
            boxShadow: `0 0 10px ${colorHex}20`,
          }}
        >
          <Icon className="w-3.5 h-3.5" />
        </motion.div>
      </div>

      {/* Big Value Number */}
      <div
        className="text-3xl lg:text-4xl font-black my-1.5 tracking-tight transition-transform duration-300 group-hover:scale-[1.02] origin-left"
        style={{
          color: colorHex,
          textShadow: `0 0 18px ${colorHex}55`,
        }}
      >
        {value}
      </div>

      {/* Footer Subtitle */}
      <div className="flex items-center justify-between text-xs text-[#5f6e7d] group-hover:text-gray-300 transition-colors mt-2">
        <span>{subtitle}</span>
        <span
          className="w-1.5 h-1.5 rounded-full transition-all duration-300 group-hover:scale-150"
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
  const chartDoughnutRef = useRef<HTMLCanvasElement | null>(null);
  const chartBarsRef = useRef<HTMLCanvasElement | null>(null);
  const chartApparelBarsRef = useRef<HTMLCanvasElement | null>(null);

  const doughnutInstance = useRef<Chart | null>(null);
  const barsInstance = useRef<Chart | null>(null);
  const apparelBarsInstance = useRef<Chart | null>(null);

  useEffect(() => {
    // 1. Doughnut Chart: Mochilas module distribution
    if (chartDoughnutRef.current && data.mochilas.length > 0) {
      if (doughnutInstance.current) {
        doughnutInstance.current.destroy();
      }

      const labels = data.mochilas.map((m) => m.nombre);
      const orders = data.mochilas.map((m) => m.ordenes);

      doughnutInstance.current = new Chart(chartDoughnutRef.current, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: orders,
              backgroundColor: ['#00f2fe', '#ff007f', '#39ff14', '#ffe600', '#9d4edd', '#ff9e00'],
              borderColor: '#12161f',
              borderWidth: 3,
              hoverOffset: 8,
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
                font: { size: 10, family: 'Plus Jakarta Sans' },
                boxWidth: 12,
                padding: 12,
              },
            },
            tooltip: {
              backgroundColor: '#12161f',
              titleColor: '#00f2fe',
              bodyColor: '#e1e6ed',
              borderColor: 'rgba(0,242,254,0.3)',
              borderWidth: 1,
            },
          },
        },
      });
    }

    // 2. Bar Chart: Mochilas (Captura vs Meta)
    if (chartBarsRef.current && data.mochilas.length > 0) {
      if (barsInstance.current) {
        barsInstance.current.destroy();
      }

      const labels = data.mochilas.map((m) => m.nombre.split(' ')[0] + ' ' + (m.nombre.split(' ')[1] || ''));
      const capturas = data.mochilas.map((m) => m.captura);
      const metas = data.mochilas.map((m) => m.meta);

      barsInstance.current = new Chart(chartBarsRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Captura Pcs',
              data: capturas,
              backgroundColor: '#39ff14',
              borderRadius: 4,
            },
            {
              label: 'Meta Pcs',
              data: metas,
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
              labels: {
                color: '#8f9ba8',
                font: { size: 10, family: 'Plus Jakarta Sans' },
                boxWidth: 12,
              },
            },
          },
        },
      });
    }

    // 3. Bar Chart: Apparel (Captura vs Meta)
    if (chartApparelBarsRef.current && data.apparel.length > 0) {
      if (apparelBarsInstance.current) {
        apparelBarsInstance.current.destroy();
      }

      const labels = data.apparel.map((m) => m.nombre.split(' (')[0]);
      const capturas = data.apparel.map((m) => m.captura);
      const metas = data.apparel.map((m) => m.meta);

      apparelBarsInstance.current = new Chart(chartApparelBarsRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Captura Pcs',
              data: capturas,
              backgroundColor: '#ff007f',
              borderRadius: 4,
            },
            {
              label: 'Meta Pcs',
              data: metas,
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
              labels: {
                color: '#8f9ba8',
                font: { size: 10, family: 'Plus Jakarta Sans' },
                boxWidth: 12,
              },
            },
          },
        },
      });
    }

    return () => {
      if (doughnutInstance.current) doughnutInstance.current.destroy();
      if (barsInstance.current) barsInstance.current.destroy();
      if (apparelBarsInstance.current) apparelBarsInstance.current.destroy();
    };
  }, [data]);

  const { kpiMochilas, mochilas, kpiApparel, apparel, contenedor, lastUpdated } = data;

  return (
    <div className="space-y-6">
      {/* Live Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#12161f] border-l-4 border-[#00f2fe] rounded-xl p-4 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39ff14] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#39ff14] shadow-[0_0_10px_#39ff14]"></span>
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold uppercase tracking-wider text-white">
              Panel de Control de Producción en Vivo
            </span>
            <span className="text-[11px] text-[#8f9ba8]">
              {isLive ? 'Conectado a Google Sheets Apps Script API' : 'Modo Operativo Local Activo'} • {lastUpdated || 'Actualizado'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00f2fe]/10 border border-[#00f2fe] text-[#00f2fe] text-xs font-bold hover:bg-[#00f2fe] hover:text-[#0b0e14] transition-all cursor-pointer shadow-[0_0_12px_rgba(0,242,254,0.3)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </button>
        </div>
      </div>

      {/* 1. PROGRAMA MOCHILAS */}
      <div>
        <div className="flex items-center gap-2 text-sm md:text-base font-extrabold uppercase tracking-wider text-[#00f2fe] pb-2 border-b-2 border-[#00f2fe]/30 mb-4">
          <span>🎒 PROGRAMA MOCHILAS (BACKPACKS)</span>
        </div>

        {/* Mochilas KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Órdenes Abiertas"
            value={kpiMochilas.ordenes}
            subtitle="Total en Módulos Mochilas"
            colorHex="#00f2fe"
            icon={Package}
            delayIndex={0}
          />
          <MetricCard
            title="Balance Piezas (Pcs)"
            value={kpiMochilas.balance.toLocaleString()}
            subtitle="Piezas Pendientes en Flujo"
            colorHex="#ff007f"
            icon={Layers}
            delayIndex={1}
          />
          <MetricCard
            title="Piezas Capturadas"
            value={kpiMochilas.captura.toLocaleString()}
            subtitle="Registradas en Turno Actual"
            colorHex="#39ff14"
            icon={CheckCircle2}
            delayIndex={2}
          />
          <MetricCard
            title="Meta Global"
            value={kpiMochilas.meta.toLocaleString()}
            subtitle="Objetivo Mochilas Diario"
            colorHex="#ffe600"
            icon={Target}
            delayIndex={3}
          />
        </div>

        {/* Charts Mochilas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <div className="bg-[#12161f] border border-white/10 rounded-xl p-5 shadow-[0_8px_25px_rgba(0,0,0,0.3)] h-[380px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-200">
                Distribución de Órdenes Abiertas
              </span>
              <span className="text-[11px] font-bold text-[#00f2fe]">Por Módulo</span>
            </div>
            <div className="relative flex-1 w-full min-h-0">
              <canvas ref={chartDoughnutRef}></canvas>
            </div>
          </div>

          <div className="bg-[#12161f] border border-white/10 rounded-xl p-5 shadow-[0_8px_25px_rgba(0,0,0,0.3)] h-[380px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-200">
                Desempeño Módulos vs Meta
              </span>
              <span className="text-[11px] font-bold text-[#39ff14]">Captura vs Objetivo</span>
            </div>
            <div className="relative flex-1 w-full min-h-0">
              <canvas ref={chartBarsRef}></canvas>
            </div>
          </div>
        </div>

        {/* Container Status & Progress Bars */}
        <div className="bg-[#12161f] border border-[#00f2fe]/20 rounded-xl p-5 mb-6 shadow-[0_8px_25px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-[#00f2fe] flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>ESTATUS DE CONTENEDOR Y ÓRDENES DEL DÍA</span>
            </span>
            <span className="text-xs font-bold text-[#39ff14] bg-[#39ff14]/10 px-2.5 py-1 rounded border border-[#39ff14]/30">
              {contenedor.textoOrdenes}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5 text-[#00f2fe]">
                <span>Porcentaje Contenedor (Shipping Etiquetado)</span>
                <span>{contenedor.pctShipping.toFixed(2)}%</span>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00f2fe] rounded-full shadow-[0_0_10px_#00f2fe] transition-all duration-700"
                  style={{ width: `${Math.min(contenedor.pctShipping, 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5 text-[#00f2fe]">
                <span>Porcentaje en curso: Contenedor JBHU</span>
                <span>{contenedor.pctEnCurso.toFixed(2)}%</span>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00f2fe] rounded-full shadow-[0_0_10px_#00f2fe] transition-all duration-700"
                  style={{ width: `${Math.min(contenedor.pctEnCurso, 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5 text-[#ff9e00]">
                <span>Porcentaje Acumulado Total</span>
                <span>{contenedor.pctAcumulado.toFixed(2)}%</span>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ff9e00] rounded-full shadow-[0_0_10px_#ff9e00] transition-all duration-700"
                  style={{ width: `${Math.min(contenedor.pctAcumulado, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Table Mochilas */}
        <div className="bg-[#12161f] border border-white/10 rounded-xl p-5 shadow-[0_8px_25px_rgba(0,0,0,0.3)] overflow-x-auto mb-8">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-200 mb-4">
            Desglose Operativo por Módulo (Mochilas)
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
                const colorClass =
                  pct >= 100 ? 'text-[#39ff14]' : pct >= 50 ? 'text-[#ffe600]' : 'text-[#ff007f]';

                return (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-bold text-white">{m.nombre}</td>
                    <td className="p-3 text-center font-bold text-[#00f2fe]">{m.ordenes}</td>
                    <td className="p-3 text-center font-bold text-[#ff007f]">{m.balance}</td>
                    <td className="p-3 text-center text-gray-300">{m.captura.toLocaleString()}</td>
                    <td className="p-3 text-center text-gray-400">{m.meta.toLocaleString()}</td>
                    <td className={`p-3 text-right font-black ${colorClass}`}>
                      {pct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. PROGRAMA APPAREL */}
      <div>
        <div className="flex items-center gap-2 text-sm md:text-base font-extrabold uppercase tracking-wider text-[#ff007f] pb-2 border-b-2 border-[#ff007f]/30 mb-4">
          <span>👕 PROGRAMA APPAREL (FULL DYE & UNIFORMS)</span>
        </div>

        {/* Apparel KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Órdenes Abiertas"
            value={kpiApparel.ordenes}
            subtitle="Total Módulos Apparel"
            colorHex="#00f2fe"
            icon={Package}
            delayIndex={0}
          />
          <MetricCard
            title="Balance Piezas (Pcs)"
            value={kpiApparel.balance.toLocaleString()}
            subtitle="Piezas Pendientes en Flujo"
            colorHex="#ff007f"
            icon={Layers}
            delayIndex={1}
          />
          <MetricCard
            title="Piezas Capturadas"
            value={kpiApparel.captura.toLocaleString()}
            subtitle="Registradas en Turno Actual"
            colorHex="#39ff14"
            icon={CheckCircle2}
            delayIndex={2}
          />
          <MetricCard
            title="Meta Global"
            value={kpiApparel.meta.toLocaleString()}
            subtitle="Objetivo Apparel Diario"
            colorHex="#ffe600"
            icon={Target}
            delayIndex={3}
          />
        </div>

        {/* Apparel Bar Chart */}
        <div className="bg-[#12161f] border border-white/10 rounded-xl p-5 shadow-[0_8px_25px_rgba(0,0,0,0.3)] h-[380px] flex flex-col mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-200">
              Registro de Producción vs Meta (Apparel)
            </span>
            <span className="text-[11px] font-bold text-[#ff007f]">Captura vs Objetivo</span>
          </div>
          <div className="relative flex-1 w-full min-h-0">
            <canvas ref={chartApparelBarsRef}></canvas>
          </div>
        </div>

        {/* Operational Table Apparel */}
        <div className="bg-[#12161f] border border-white/10 rounded-xl p-5 shadow-[0_8px_25px_rgba(0,0,0,0.3)] overflow-x-auto">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-200 mb-4">
            Desglose Operativo por Módulo (Apparel)
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
                const colorClass =
                  pct >= 100 ? 'text-[#39ff14]' : pct >= 50 ? 'text-[#ffe600]' : 'text-[#ff007f]';

                return (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-bold text-white">{m.nombre}</td>
                    <td className="p-3 text-center font-bold text-[#00f2fe]">{m.ordenes}</td>
                    <td className="p-3 text-center font-bold text-[#ff007f]">{m.balance}</td>
                    <td className="p-3 text-center text-gray-300">{m.captura.toLocaleString()}</td>
                    <td className="p-3 text-center text-gray-400">{m.meta.toLocaleString()}</td>
                    <td className="p-3 text-center text-gray-300">{(m.reportado || 0).toLocaleString()}</td>
                    <td className={`p-3 text-right font-black ${colorClass}`}>
                      {pct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
