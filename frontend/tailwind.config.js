/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        vd: {
          'slate-green': '#1E3A2F',   // panel y sidebar principal
          sidebar:       '#1E3A2F',   // alias para bg-vd-sidebar
          surface:       '#F4F4F8',
          white:         '#FAFAFC',
          blue:          '#4CAF8A',   // acento verde suave (ex-azul #6C8EF5)
          amber:         '#E8A030',
          green:         '#3DB88A',
          red:           '#E57373',
          border:        '#E8E8F0',
        },
      },
      fontFamily: {
        syne:  ['Syne', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
