/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-charcoal': '#2d3748',
        'medium-gray': '#4a5568',
        'darker-charcoal': '#1a202c',
        'light-gray': '#374151',
        'darkest-gray': '#1f2937',
      },
      backgroundImage: {
        'dark-gradient': 'linear-gradient(135deg, #2d3748 0%, #4a5568 50%, #1a202c 100%)',
        'button-gradient': 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
        'button-hover': 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
      }
    },
  },
  plugins: [],
}
