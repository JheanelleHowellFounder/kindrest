const path = require('path')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, './pages/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(__dirname, './components/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(__dirname, './app/**/*.{js,ts,jsx,tsx,mdx}'),
  ],
  theme: {
    extend: {
      colors: {
        chocolate: '#30211a',
        cream: '#f8f2ee',
        beige: '#d6c9be',
        mustard: '#c9981f',
        'mustard-dark': '#a07810',
      },
      fontFamily: {
        serif: ['PT Serif', 'Georgia', 'serif'],
        sans: ['Open Sans', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        btn: '15px',
      },
    },
  },
  plugins: [],
}
