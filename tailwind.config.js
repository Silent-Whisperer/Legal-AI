/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A8A',
          container: '#172554',
          light: '#2563EB',
          subtle: '#EFF6FF',
        },
        navy: {
          900: '#0F172A',
          800: '#1E3A8A',
          700: '#1D4ED8',
          100: '#DBEAFE',
          50: '#F0F7FF',
        },
        surface: {
          DEFAULT: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          hover: '#F1F5F9',
          muted: '#64748B',
        },
        secondary: '#475569',
        'on-surface': '#0B1C30',
        'risk-high': {
          DEFAULT: '#DC2626',
          bg: '#FEF2F2',
          border: '#FECACA',
          text: '#991B1B',
        },
        'risk-caution': {
          DEFAULT: '#D97706',
          bg: '#FFFBEB',
          border: '#FDE68A',
          text: '#92400E',
        },
        'risk-safe': {
          DEFAULT: '#059669',
          bg: '#ECFDF5',
          border: '#A7F3D0',
          text: '#065F46',
        }
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)',
        'card-hover': '0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        'elevation': '0 10px 15px -3px rgba(15, 23, 42, 0.05), 0 4px 6px -2px rgba(15, 23, 42, 0.03)',
      }
    },
  },
  plugins: [],
}
