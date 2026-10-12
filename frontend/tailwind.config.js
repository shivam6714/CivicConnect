/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          300: '#9FB3C8',
          400: '#627D98',
          500: '#334E68',
          600: '#243B53',
          700: '#1D3048',
          800: '#18293D',
          900: '#14243A', // Primary deep navy
          950: '#0B1522',
          DEFAULT: '#14243A',
        },
        teal: {
          50: '#E8F8F5',
          100: '#C7EFE9',
          200: '#94E0D5',
          300: '#5AC8B8',
          400: '#2EAE9B',
          500: '#0F9D8A', // Accent teal
          600: '#0C8373',
          700: '#09695C',
          800: '#075046',
          900: '#053831',
          DEFAULT: '#0F9D8A',
        },
        civic: {
          bg: '#F5F7FA',
          surface: '#FFFFFF',
          text: '#182230',
          secondary: '#667085',
          border: '#E4E7EC',
          borderDark: '#D0D5DD',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(16, 24, 40, 0.05)',
        card: '0 1px 3px 0 rgba(16, 24, 40, 0.08), 0 1px 2px -1px rgba(16, 24, 40, 0.06)',
        elevated: '0 4px 6px -1px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.04)',
        modal: '0 20px 25px -5px rgba(16, 24, 40, 0.12), 0 8px 10px -6px rgba(16, 24, 40, 0.06)',
      },
    },
  },
  plugins: [],
};
