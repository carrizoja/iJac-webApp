/**
 * A theme color read from a CSS variable that still takes opacity modifiers such as
 * `bg-bg-primary/60`. A plain `var(--color-x)` makes Tailwind skip those classes silently;
 * without a modifier, `<alpha-value>` is 1 and the color is unchanged.
 */
const withAlpha = (name) =>
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
        'bg-primary': withAlpha('bg-primary'),
        'bg-secondary': withAlpha('bg-secondary'),
        'bg-tertiary': withAlpha('bg-tertiary'),

        /* Panels */
        'panel-default': withAlpha('panel-default'),
        'panel-hover': withAlpha('panel-hover'),
        'panel-active': withAlpha('panel-active'),
        'panel-elevated': withAlpha('panel-elevated'),

        /* Borders */
        'border-default': withAlpha('border-default'),
        'border-subtle': withAlpha('border-subtle'),
        'border-strong': withAlpha('border-strong'),
        'border-active': withAlpha('border-active'),
        'border-primary': withAlpha('border-primary'),
        'border-muted': withAlpha('border-muted'),

        /* Foreground */
        'fg-primary': withAlpha('fg-primary'),
        'fg-secondary': withAlpha('fg-secondary'),
        'fg-tertiary': withAlpha('fg-tertiary'),
        /* Labels and secondary details; same tone as tertiary text. */
        'fg-muted': withAlpha('fg-tertiary'),

        /* Muted */
        'muted-bg': withAlpha('muted-bg'),
        'muted-fg': withAlpha('muted-fg'),
        'bg-accent': withAlpha('bg-accent'),

        /* Accent */
        'accent-brand': withAlpha('accent-brand'),

        /* Status */
        'status-open': withAlpha('status-open'),
        'status-in-progress': withAlpha('status-in-progress'),
        'status-completed': withAlpha('status-completed'),
        'status-cancelled': withAlpha('status-cancelled'),

        /* Warning; supports opacity modifiers such as bg-warning/10 */
        warning: withAlpha('warning'),

        /* Danger tint for delete confirmations; supports opacity modifiers such as bg-danger/10 */
        danger: withAlpha('destructive'),

        /* Destructive */
        destructive: {
          DEFAULT: withAlpha('destructive'),
          hover: withAlpha('destructive-hover'),
          active: withAlpha('destructive-active'),
          text: withAlpha('destructive-text'),
        },

        /* Focus */
        focus: withAlpha('focus'),

        /* Legacy status for compatibility */
        status: {
          open: withAlpha('status-open'),
          'in-progress': withAlpha('status-in-progress'),
          completed: withAlpha('status-completed'),
          cancelled: withAlpha('status-cancelled'),
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
