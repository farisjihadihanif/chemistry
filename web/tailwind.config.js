/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: v("paper"),
        surface: v("surface"),
        sunk: v("sunk"),
        line: v("line"),
        ink: { DEFAULT: v("ink"), soft: v("ink-soft"), mute: v("ink-mute") },
        cobalt: { DEFAULT: v("cobalt"), soft: v("cobalt-soft"), ink: v("cobalt-ink") },
        // skala indikator bromtimol biru: kuning (rendah) -> hijau -> biru (tinggi)
        ind: { low: v("ind-low"), mid: v("ind-mid"), high: v("ind-high") },
        danger: v("danger"),
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        lift: "0 10px 30px -12px rgb(15 26 34 / 0.25)",
      },
    },
  },
  plugins: [],
};
