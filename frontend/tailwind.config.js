/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cores usam CSS variables pra suportar troca de tema em runtime.
        // O formato 'rgb(var(...) / <alpha-value>)' é o jeito certo no
        // Tailwind v3 de ter variáveis dinâmicas E opacity modifiers
        // funcionando (ex: bg-tinta/10, text-acento/70).
        fundo:        'rgb(var(--color-fundo)       / <alpha-value>)',
        superficie:   'rgb(var(--color-superficie)  / <alpha-value>)',
        tinta:        'rgb(var(--color-tinta)        / <alpha-value>)',
        'tinta-suave':'rgb(var(--color-tinta-suave) / <alpha-value>)',
        acento:       'rgb(var(--color-acento)      / <alpha-value>)',
        douro:        'rgb(var(--color-douro)        / <alpha-value>)',
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