"use client";

import { useState } from "react";

/* ============================================================
   FYP Desk - theme toggle (client component)
   Ported 1:1 from the brand source (theme-script.tsx).
   Light / dark only, no third option (brand rule). Persists to
   localStorage under the brand key, applied before first paint
   by the layout's inline script.
   ============================================================ */

const THEME_KEY = "fyp-desk-theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(function initialTheme() {
    if (typeof document !== "undefined") {
      return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    }
    return "light";
  });

  function apply(theme: "light" | "dark") {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    setTheme(theme);
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      <button
        type="button"
        className={`theme-toggle-btn ${theme === "light" ? "active" : ""}`}
        data-theme-value="light"
        aria-label="Light theme"
        title="Light"
        onClick={() => apply("light")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      </button>
      <button
        type="button"
        className={`theme-toggle-btn ${theme === "dark" ? "active" : ""}`}
        data-theme-value="dark"
        aria-label="Dark theme"
        title="Dark"
        onClick={() => apply("dark")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>
    </div>
  );
}
