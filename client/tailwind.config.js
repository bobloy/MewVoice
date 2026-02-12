/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        mew: {
          bg: 'var(--color-charcoal)',
          surface: 'var(--color-mushroom)',
          accent: 'var(--color-ember)',
          highlight: 'var(--color-olive)',
          text: 'var(--color-cream)',
          muted: 'var(--color-parchment)',
          sage: 'var(--color-sage)',
        },
      },
    },
  },
  plugins: [],
}
