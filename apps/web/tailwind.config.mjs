/**
 * A theme color read from a CSS variable that still takes opacity modifiers such as
 * `bg-bg-primary/60`. A plain `var(--color-x)` makes Tailwind skip those classes silently;
 * without a modifier, `<alpha-value>` is 1 and the color is unchanged.
 */
const token = (name) =>
  `color-mix(in srgb, var(--color-${name}) calc(<alpha-value> * 100%), transparent)`;

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
        'focus-ring': '0 0 0 2px var(--color-focus-offset), 0 0 0 4px var(--color-focus)',
        'glow-brand': 'var(--shadow-glow-brand)',

        /* Inner shadow for inset effects */
        'inset-sm': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.5)',
        'inset-base': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.5)',
      },
      colors: {
        /* Semantic backgrounds */
        'bg-primary': token('bg-primary'),
        'bg-secondary': token('bg-secondary'),
        'bg-tertiary': token('bg-tertiary'),

        /* Panels */
        'panel-default': token('panel-default'),
        'panel-hover': token('panel-hover'),
        'panel-active': token('panel-active'),
        'panel-elevated': token('panel-elevated'),

        /* Borders */
        'border-default': token('border-default'),
        'border-subtle': token('border-subtle'),
        'border-strong': token('border-strong'),
        'border-active': token('border-active'),
        'border-primary': token('border-primary'),
        'border-muted': token('border-muted'),

        /* Foreground */
        'fg-primary': token('fg-primary'),
        'fg-secondary': token('fg-secondary'),
        'fg-tertiary': token('fg-tertiary'),
        /* Labels and secondary details; same tone as tertiary text. */
        'fg-muted': token('fg-tertiary'),

        /* Muted */
        'muted-bg': token('muted-bg'),
        'muted-fg': token('muted-fg'),
        'bg-accent': token('bg-accent'),

        /* Accent */
        'accent-brand': token('accent-brand'),

        /* Status */
        'status-open': token('status-open'),
        'status-in-progress': token('status-in-progress'),
        'status-completed': token('status-completed'),
        'status-cancelled': token('status-cancelled'),

        /* Warning; supports opacity modifiers such as bg-warning/10 */
        warning: token('warning'),

        /* Danger tint for delete confirmations; supports opacity modifiers such as bg-danger/10 */
        danger: token('destructive'),

        /* Destructive */
        destructive: {
          DEFAULT: token('destructive'),
          hover: token('destructive-hover'),
          active: token('destructive-active'),
          text: token('destructive-text'),
        },

        /* Focus */
        focus: token('focus'),

        /* Legacy status for compatibility */
        status: {
          open: token('status-open'),
          'in-progress': token('status-in-progress'),
          completed: token('status-completed'),
          cancelled: token('status-cancelled'),
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
