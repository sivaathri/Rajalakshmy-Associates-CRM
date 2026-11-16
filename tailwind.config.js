/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        burgundy: {
          50: '#fdf2f4',
          100: '#fbe6e9',
          200: '#f7cfd6',
          300: '#f0aab6',
          400: '#e5778c',
          500: '#d54764',
          600: '#b92848',
          700: '#9b1b36',
          800: '#79091d', // Primary Burgundy #79091D
          900: '#600516', // Dark Wine #600516
          950: '#3a020c',
        },
        gold: {
          50: '#fbf9ee',
          100: '#f6f0d4',
          200: '#eedda9',
          300: '#e4c474',
          400: '#d9a52e', // Gold Accent #D9A52E
          500: '#c38d21',
          600: '#a76f18',
          700: '#845016',
          800: '#6d4017',
          900: '#5c3517',
        },
        brand: {
          burgundy: '#79091D',
          darkWine: '#600516',
          gold: '#D9A52E',
          goldHover: '#C29124',
          bg: '#FAF6EF',
          card: '#FFFFFF',
          charcoal: '#1F242D',
          charcoalMuted: '#4B5563',
          border: '#E8E1D5',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
