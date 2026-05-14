/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Forzamos modo oscuro en el HTML
  theme: {
    extend: {},
  },
  plugins: [],
}