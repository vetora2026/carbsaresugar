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
        // Green, coral and muted are one step darker than the original palette
        // so that small text on white and on warm reaches WCAG AA (4.5:1).
        green: "#17805F",
        coral: {
          // The accent on light backgrounds.
          DEFAULT: "#AC5C26",
          // The same orange lightened for the footer's dark background.
          soft: "#D78148",
        },
        blue: "#3A7CA5",
        muted: "#75706B",
        body: "#6B6560",
      },
      fontFamily: {
        // The "Fallback" families are metric-matched stand-ins declared in
        // global.css, so text does not move when the web font arrives.
        serif: ["Lora", '"Lora Fallback"', "Georgia", "serif"],
        sans: ['"Source Sans 3"', '"Source Sans 3 Fallback"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      maxWidth: {
        prose: "68ch",
      },
    },
  },
  plugins: [],
};
