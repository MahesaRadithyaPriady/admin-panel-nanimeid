import { Chart as ChartJS } from 'chart.js';

export const BW_PALETTE = [
  '#000000',
  '#262626',
  '#404040',
  '#525252',
  '#737373',
  '#A3A3A3',
];

export const BW_PALETTE_LIGHT = [
  'rgba(0,0,0,0.85)',
  'rgba(38,38,38,0.80)',
  'rgba(64,64,64,0.75)',
  'rgba(82,82,82,0.70)',
  'rgba(115,115,115,0.65)',
  'rgba(163,163,163,0.60)',
];

export const DISTINCT_PALETTE = [
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#ec4899',
];

export function applyChartDefaults() {
  ChartJS.defaults.font.family = "'Satoshi', 'Inter', system-ui, sans-serif";
  ChartJS.defaults.font.size   = 12;
  ChartJS.defaults.color       = '#737373';

  ChartJS.defaults.plugins.legend.display = false;

  ChartJS.defaults.plugins.tooltip.backgroundColor = '#000000';
  ChartJS.defaults.plugins.tooltip.titleColor       = '#FFFFFF';
  ChartJS.defaults.plugins.tooltip.bodyColor        = '#A3A3A3';
  ChartJS.defaults.plugins.tooltip.borderColor      = '#D4D4D4';
  ChartJS.defaults.plugins.tooltip.borderWidth      = 1;
  ChartJS.defaults.plugins.tooltip.cornerRadius     = 0;
  ChartJS.defaults.plugins.tooltip.padding          = 10;
  ChartJS.defaults.plugins.tooltip.titleFont        = { family: "'Inter', sans-serif", weight: 'bold', size: 11 };
  ChartJS.defaults.plugins.tooltip.bodyFont         = { family: "'Satoshi', 'Inter', sans-serif", size: 12 };

  ChartJS.defaults.scale.grid.color        = '#E5E5E5';
  ChartJS.defaults.scale.grid.borderColor  = '#737373';
  ChartJS.defaults.scale.ticks.color       = '#737373';
  ChartJS.defaults.scale.ticks.font        = { family: "'Inter', sans-serif", size: 10 };
}

export const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#000000',
      titleColor: '#FFFFFF',
      bodyColor: '#A3A3A3',
      borderColor: '#D4D4D4',
      borderWidth: 1,
      cornerRadius: 0,
      padding: 10,
      titleFont: { family: "'Inter', sans-serif", weight: 'bold', size: 11 },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { color: '#737373', width: 2 },
      ticks: { color: '#737373', font: { family: "'Inter', sans-serif", size: 10 }, maxRotation: 0 },
    },
    y: {
      grid: { color: '#E5E5E5' },
      border: { color: '#737373', width: 2 },
      ticks: { color: '#737373', font: { family: "'Inter', sans-serif", size: 10 }, precision: 0 },
      beginAtZero: true,
    },
  },
};

export const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#000000',
      titleColor: '#FFFFFF',
      bodyColor: '#A3A3A3',
      borderColor: '#D4D4D4',
      borderWidth: 1,
      cornerRadius: 0,
      padding: 10,
      titleFont: { family: "'Inter', sans-serif", weight: 'bold', size: 11 },
    },
  },
};
