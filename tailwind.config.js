/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.html",
    "./public/js/**/*.js",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f5f7ff",
          100: "#eaeefe",
          200: "#cfd9fd",
          300: "#a7bbfb",
          400: "#7994f7",
          500: "#5b78f2",
          600: "#4159e6",
          700: "#3246c2",
          800: "#2b3a99",
          900: "#253277"
        }
      }
    }
  },
  plugins: [],
}
