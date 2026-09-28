/* ============================================================
   FYP Desk - site footer for the Contribution Tracker.
   Brand pattern: bg-secondary band, top border, muted bottom
   row. No slogan, no personal name (brand rule).
   ============================================================ */

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="bar-container">
        <div className="footer-bottom">
          <span>&copy; 2026 FYP Desk</span>
          <span>Append-only records. Source of truth: contribution-history/ per repo.</span>
        </div>
      </div>
    </footer>
  );
}
