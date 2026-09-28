import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f14",
        panel: "#121923",
        line: "#1f2a38",
        mut: "#8494a7",
        accent: "#4da3ff",
        accent2: "#9b8cff",
        ok: "#4ade80",
      },
    },
  },
  plugins: [],
};
export default config;
