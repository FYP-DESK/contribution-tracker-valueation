import ThemeToggle from "@/components/ThemeToggle";

/* ============================================================
   FYP Desk - site header for the Contribution Tracker.
   Same chrome pattern as the brand source: DESK wordmark with
   the emerald dot, 60px non-sticky bar, theme toggle on the
   right. No offer bell (no offer here) and no nav links (single
   page) — the 32px control height stays consistent.
   ============================================================ */

export function DeskWordmark() {
  return (
    <svg
      className="header-wordmark"
      viewBox="0 0 92 38"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <text
        x="0"
        y="30"
        fill="var(--color-text-primary)"
        fontFamily="Oxanium, sans-serif"
        fontWeight="800"
        fontSize="26"
        letterSpacing="0"
      >
        DESK
      </text>
      <circle
        className="dot-bounce"
        cx="82"
        cy="26.5"
        r="3.5"
        fill="var(--color-emerald)"
      />
    </svg>
  );
}

export default function SiteHeader() {
  return (
    <header className="site-header" id="top">
      <div className="bar-container header-inner">
        <span className="header-logo" aria-label="FYP Desk">
          <DeskWordmark />
        </span>
        <p className="header-nav-link hidden sm:block">
          Contribution Tracker &amp; Valuation
        </p>
        <ThemeToggle />
      </div>
    </header>
  );
}
