/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#1f2937',
          light: '#334155',
        },
        surface: {
          DEFAULT: '#0f172a',
          raised: '#1e293b',
          panel: '#111827',
        },
        status: {
          open: '#3b82f6',
          'in-progress': '#f59e0b',
          completed: '#22c55e',
          cancelled: '#64748b',
        },
        priority: {
          low: '#64748b',
          normal: '#3b82f6',
          high: '#f59e0b',
          urgent: '#ef4444',
        },
        focus: '#60a5fa',
      },
    },
  },
  plugins: [],
};
