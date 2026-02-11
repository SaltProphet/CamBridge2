/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./api/**/*.js",
    "./public/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#0B0B0B',
        'text-primary': '#F2F2F2',
        'text-muted': '#7A7A7A',
        'border-normal': '#1C1C1C',
        'border-hover': '#F2F2F2',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
      letterSpacing: {
        'tighter-custom': '-0.02em',
      },
    },
  },
  plugins: [],
}
