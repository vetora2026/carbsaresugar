/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,ts,md}"],
  theme: {
    extend: {
      colors: {
        ink: "#2C2C2A",
        paper: "#FFFFFF",
        warm: "#FAFAF6",
        line: "#E4DFD6",
        sand: "#F0EBE2",
        green: "#1D9E75",
        coral: "#D4793C",
        blue: "#3A7CA5",
        muted: "#8A8580",
        body: "#6B6560",
      },
      fontFamily: {
        serif: ["Lora", "Georgia", "serif"],
        sans: ['"Source Sans 3"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      maxWidth: {
        prose: "68ch",
      },
    },
  },
  plugins: [],
};
