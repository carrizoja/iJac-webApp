/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Space Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
        brand: ['SphereFez', 'Space Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xs: '0.25rem',
        sm: '0.375rem',
        base: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        /* Light shadows for subtle depth */
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        base: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
        md: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        lg: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',

        /* Glass surface shadow (subtle) */
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',

        /* Focus shadow */
        'focus-ring': '0 0 0 2px #020617, 0 0 0 4px #60a5fa',
        'glow-brand': 'var(--shadow-glow-brand)',

        /* Inner shadow for inset effects */
        'inset-sm': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.5)',
        'inset-base': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.5)',
      },
      colors: {
        /* Semantic backgrounds */
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-tertiary': 'var(--color-bg-tertiary)',

        /* Panels */
        'panel-default': 'var(--color-panel-default)',
        'panel-hover': 'var(--color-panel-hover)',
        'panel-active': 'var(--color-panel-active)',
        'panel-elevated': 'var(--color-panel-elevated)',

        /* Borders */
        'border-default': 'var(--color-border-default)',
        'border-subtle': 'var(--color-border-subtle)',
        'border-strong': 'var(--color-border-strong)',
        'border-active': 'var(--color-border-active)',
        'border-primary': 'var(--color-border-primary)',
        'border-muted': 'var(--color-border-muted)',

        /* Foreground */
        'fg-primary': 'var(--color-fg-primary)',
        'fg-secondary': 'var(--color-fg-secondary)',
        'fg-tertiary': 'var(--color-fg-tertiary)',
        /* Labels and secondary details; same tone as tertiary text. */
        'fg-muted': 'var(--color-fg-tertiary)',

        /* Muted */
        'muted-bg': 'var(--color-muted-bg)',
        'muted-fg': 'var(--color-muted-fg)',
        'bg-accent': 'var(--color-bg-accent)',

        /* Accent */
        'accent-brand': 'var(--color-accent-brand)',

        /* Status */
        'status-open': 'var(--color-status-open)',
        'status-in-progress': 'var(--color-status-in-progress)',
        'status-completed': 'var(--color-status-completed)',
        'status-cancelled': 'var(--color-status-cancelled)',

        /* Warning; supports opacity modifiers such as bg-warning/10 */
        warning: 'color-mix(in srgb, var(--color-warning) calc(<alpha-value> * 100%), transparent)',

        /* Destructive */
        destructive: {
          DEFAULT: 'var(--color-destructive)',
          hover: 'var(--color-destructive-hover)',
          active: 'var(--color-destructive-active)',
          text: 'var(--color-destructive-text)',
        },

        /* Focus */
        focus: 'var(--color-focus)',

        /* Legacy status for compatibility */
        status: {
          open: 'var(--color-status-open)',
          'in-progress': 'var(--color-status-in-progress)',
          completed: 'var(--color-status-completed)',
          cancelled: 'var(--color-status-cancelled)',
        },
        surface: {
          DEFAULT: '#0f172a',
          raised: '#1e293b',
          panel: '#111827',
        },
      },
    },
  },
  plugins: [],
};
