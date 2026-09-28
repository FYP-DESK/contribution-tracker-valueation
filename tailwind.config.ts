import type { Config } from "tailwindcss";

/* ============================================================
   FYP Desk brand tokens, mapped to the CSS custom properties
   defined in src/app/globals.css (ported 1:1 from the brand
   source FYPCE/apps/fyp-service-page-v2). Semantic names only —
   components never hardcode hex values. Light/dark switching
   happens at the CSS-variable layer via [data-theme="dark"].
   ============================================================ */

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-primary": "var(--color-bg-primary)",
        "bg-secondary": "var(--color-bg-secondary)",
        "bg-tertiary": "var(--color-bg-tertiary)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted": "var(--color-text-muted)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        "certainty-blue": "var(--color-certainty-blue)",
        "cyan-accent": "var(--color-cyan-accent)",
        emerald: "var(--color-emerald)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        "error-bg": "var(--color-error-bg)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "system-ui", "sans-serif"],
        display: ["var(--font-oxanium)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
