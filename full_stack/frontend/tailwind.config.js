/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          soft: 'var(--color-primary-soft)',
          text: 'var(--color-primary-text)',
          hover: 'var(--color-primary-dark)',
        },
        dark: 'var(--color-dark)',
        n50: 'var(--color-n50)',
        n100: 'var(--color-n100)',
        n200: 'var(--color-n200)',
        n300: 'var(--color-n300)',
        n500: 'var(--color-n500)',
        n700: 'var(--color-n700)',
        n900: 'var(--color-n900)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        critical: 'var(--color-danger)',
        info: 'var(--color-info)',
      },
      fontFamily: {
        heading: ['Montserrat', 'system-ui', 'sans-serif'],
        sans: ['Open Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['11px', '14px'],
        sm: ['12px', '16px'],
        base: ['13px', '20px'],
        lg: ['14px', '20px'],
        xl: ['16px', '24px'],
        '2xl': ['18px', '24px'],
        '3xl': ['22px', '28px'],
        '4xl': ['28px', '36px'],
      },
      borderRadius: {
        r4: 'var(--radius-sm)',
        r8: 'var(--radius-md)',
        r12: 'var(--radius-lg)',
        r16: 'var(--radius-xl)',
      },
      boxShadow: {
        'sh-sm': '0 1px 2px rgba(0,0,0,0.04)',
        'sh-md': '0 4px 12px rgba(0,0,0,0.08)',
        'sh-xl': '0 16px 40px rgba(0,0,0,0.12)',
      },
      spacing: {
        topbar: 'var(--topbar-height)',
      },
    },
  },
  plugins: [],
}