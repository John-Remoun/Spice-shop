import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          forest: '#2A3C2B', // primary — rich botanical forest green
          sage: '#7A9171', // secondary — soothing sage green
          ochre: '#D4A344', // highlight — warm golden amber
          sand: '#F7F5EF', // light-mode background
          lightSurface: '#FCFAF5', // light-mode warm beige surface
          lightBorder: '#E3DCB9', // light-mode warm beige border
          lightSageBorder: '#C8D8C5', // light-mode soft green border
          
          // Custom Dark Mode Palette Requested by User
          olive: '#121814',      /* --bg-primary: خلفية الصفحة الأساسية */
          slate: '#1C241F',      /* --bg-surface: الكروت والسيكشنز */
          darkBorder: '#2D3830', /* --border-color: الحدود والفواصل */
          beige: '#F4EFE6',      /* --text-primary: العناوين (بيج ناعم) */
          beigeSoft: '#E6DCB8',  /* soft golden sand beige */
          beigeMuted: '#A8A296', /* --text-secondary: الفقرات */
          accentGreen: '#5E9C76', /* --accent-green: الأزرار الرئيسية */
          accentGreenHover: '#72B38B', /* --accent-green-hover */
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        arabic: ['"Cairo"', 'sans-serif'],
      },
      borderRadius: {
        organic: '1rem',
      },
      boxShadow: {
        botanical: '0 4px 20px -2px rgba(42, 60, 43, 0.06)',
        darkGlow: '0 0 25px -5px rgba(94, 156, 118, 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config;
