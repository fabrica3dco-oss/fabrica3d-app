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
          50:  '#eef1f6',
          100: '#c5d0de',
          200: '#9dafc6',
          300: '#6b88a8',
          400: '#3d6389',
          500: '#1d3f6b',
          600: '#142236',
          700: '#0f1a29',
          800: '#0a111c',
          900: '#05090e',
        },
        accent: '#3b82f6',
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
