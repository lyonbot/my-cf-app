/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './frontend/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
