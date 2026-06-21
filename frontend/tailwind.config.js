/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fundo: '#EDE0C8',
        superficie: '#FAF3E4',
        tinta: '#2B2118',
        'tinta-suave': '#8A7A63',
        acento: '#A8362A',
        douro: '#C68A2E',
      },
      fontFamily: {
        display: ['"Anton"', 'sans-serif'],
        corpo: ['"Inter"', 'sans-serif'],
        carimbo: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}