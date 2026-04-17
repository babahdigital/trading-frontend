/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        profit: 'hsl(var(--profit))',
        loss: 'hsl(var(--loss))',
        // Brand tokens
        midnight: {
          DEFAULT: 'var(--brand-midnight)',
          2: 'var(--brand-midnight-2)',
          3: 'var(--brand-midnight-3)',
          4: 'var(--brand-midnight-4)',
        },
        amber: {
          DEFAULT: 'var(--brand-amber)',
          soft: 'var(--brand-amber-soft)',
          deep: 'var(--brand-amber-deep)',
          400: '#F5B547',
          500: '#F5B547',
        },
        paper: {
          DEFAULT: 'var(--brand-paper)',
          2: 'var(--brand-paper-2)',
          3: 'var(--brand-paper-3)',
        },
        ink: {
          900: 'var(--ink-900)',
          700: 'var(--ink-700)',
          500: 'var(--ink-500)',
          400: 'var(--ink-400)',
          300: 'var(--ink-300)',
          200: 'var(--ink-200)',
        },
        data: {
          positive: 'var(--data-positive)',
          'positive-soft': 'var(--data-positive-soft)',
          negative: 'var(--data-negative)',
          'negative-soft': 'var(--data-negative-soft)',
          neutral: 'var(--data-neutral)',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'monospace'],
      },
      fontSize: {
        'display-2xl': ['clamp(2.75rem, 5vw, 4.75rem)', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
        'display-xl': ['clamp(2.25rem, 4vw, 3.75rem)', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
        'display-lg': ['clamp(2rem, 3.5vw, 3rem)', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'display-md': ['clamp(1.75rem, 3vw, 2.25rem)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'display-sm': ['clamp(1.375rem, 2.5vw, 1.75rem)', { lineHeight: '1.25', letterSpacing: '-0.015em' }],
        'label-sm': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.05em' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      maxWidth: {
        'legal': '720px',
        'prose': '720px',
        'default': '1200px',
        'wide': '1360px',
        'full-content': '1600px',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'glow-amber': 'var(--shadow-glow-amber)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'shimmer': 'shimmer 2s infinite linear',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
};
