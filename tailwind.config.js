/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '360px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: '#000000',
        'surface-dark': '#0A0A0A',
        'card-dark': '#111111',
        'border-dark': '#1A1A1A',
        surface: 'rgba(255, 255, 255, 0.04)',
        surfaceHover: 'rgba(255, 255, 255, 0.08)',
        surfaceActive: 'rgba(255, 255, 255, 0.12)',
        border: 'rgba(255, 255, 255, 0.08)',
        borderHover: 'rgba(255, 255, 255, 0.15)',
        primary: {
          DEFAULT: '#8b5cf6',
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        secondary: {
          DEFAULT: '#00E5FF',
          300: '#33EBFF',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        accent: {
          DEFAULT: '#f43f5e',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
        },
        success: {
          DEFAULT: '#10b981',
          400: '#34d399',
          500: '#10b981',
        },
        warning: {
          DEFAULT: '#f59e0b',
          400: '#fbbf24',
          500: '#f59e0b',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
        'glass-strong': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.03) 100%)',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
      },
      boxShadow: {
        'glow-primary': '0 0 30px -5px rgba(139, 92, 246, 0.4)',
        'glow-secondary': '0 0 30px -5px rgba(34, 211, 238, 0.4)',
        'glow-accent': '0 0 30px -5px rgba(244, 63, 94, 0.4)',
        'glow-success': '0 0 30px -5px rgba(16, 185, 129, 0.4)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glass-lg': '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 10s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slower': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
        'spin-slow': 'spin 8s linear infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px -5px rgba(139, 92, 246, 0.3)' },
          '50%': { boxShadow: '0 0 40px -5px rgba(139, 92, 246, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
