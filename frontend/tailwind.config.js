/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        terracotta: {
          DEFAULT: '#C04A26',
          dark: '#8F3014',
          light: '#FFEDE6',
        },
        ochre: {
          DEFAULT: '#D97706',
          dark: '#B45309',
          light: '#FEF3C7',
        },
        'trust-green': {
          DEFAULT: '#15803D',
          dark: '#166534',
          light: '#DCFCE7',
        },
        indigo: {
          DEFAULT: '#1E3A8A',
          dark: '#0F172A',
          light: '#EFF6FF',
        },
        silk: {
          DEFAULT: '#FDFBF7',
          dark: '#F7F3EB',
        },
      },
      minHeight: {
        touch: '48px',
      },
      minWidth: {
        touch: '48px',
      },
    },
  },
  plugins: [],
};
