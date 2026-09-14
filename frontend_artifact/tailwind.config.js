/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terracotta: {
          50: '#FDF8F5',
          100: '#FBF0E9',
          200: '#F6DCCE',
          300: '#EEBFAB',
          400: '#E29775',
          500: '#C05621', // Primary Terracotta
          600: '#A34215',
          700: '#83310D',
          800: '#67260D',
          900: '#54220E',
        },
        cream: {
          50: '#FFFDF9',
          100: '#FAF7F2', // Primary Warm Cream Background
          200: '#F5EFE6',
          300: '#EAE1D3',
          400: '#D8CBB6',
          500: '#C1AF96',
        },
        ochre: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          400: '#FBBF24',
          500: '#D69E2E', // Heritage Ochre / Gold
          600: '#B7791F',
          700: '#975A16',
        },
        charcoal: {
          700: '#4A5568',
          800: '#2D3748', // Primary Dark Charcoal Text
          900: '#1A202C',
        },
        heritage: {
          gold: '#D4AF37',
          goldDark: '#AA820A',
          forest: '#2F855A', // Verification Green
          crimson: '#C53030', // Warning Red
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'warm': '0 4px 20px -2px rgba(192, 86, 33, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'warm-lg': '0 10px 30px -4px rgba(192, 86, 33, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.06)',
        'inner-warm': 'inset 0 2px 4px 0 rgba(192, 86, 33, 0.06)',
      }
    },
  },
  plugins: [],
}
