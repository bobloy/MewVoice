/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        mew: {
          bg: '#1a1a2e',
          surface: '#16213e',
          accent: '#e94560',
          highlight: '#0f3460',
          text: '#eee',
          muted: '#888',
        },
      },
    },
  },
  plugins: [],
}
