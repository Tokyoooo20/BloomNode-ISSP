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
      },
      screens: {
        // Custom breakpoints for better control
        'xs': '475px',   // Extra small devices (large phones)
        // Default Tailwind breakpoints:
        // 'sm': '640px',   // Small devices (tablets)
        // 'md': '768px',   // Medium devices (small laptops)
        // 'lg': '1024px', // Large devices (laptops)
        // 'xl': '1280px', // Extra large devices (desktops)
        // '2xl': '1536px' // 2X Extra large devices (large desktops)
      },
      spacing: {
        // Custom spacing for responsive layouts
        '18': '4.5rem',  // 72px
        '88': '22rem',   // 352px - common sidebar width
      },
      maxWidth: {
        // Responsive container max-widths
        'container-sm': '640px',
        'container-md': '768px',
        'container-lg': '1024px',
        'container-xl': '1280px',
      },
      zIndex: {
        // Z-index scale for responsive overlays
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      }
    },
  },
  plugins: [],
}
