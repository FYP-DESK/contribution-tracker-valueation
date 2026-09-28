#!/usr/bin/env node
// Import contribution records from FYP-Desk project repos into this tracker.
//
// Usage:
//   node scripts/import-contributions.mjs /path/to/fyp-idea-01-x [/path/to/fyp-idea-02-y ...]
//
// For each repo: reads contribution-history/c*.md, parses frontmatter,
// keeps status: complete records, merges into data/contributions.json
// (keyed by repo+id — re-imports update rather than duplicate).
// Also registers unknown repos in data/deals.json with feePkr 0 (set the fee
// there once a deal is signed). Zero dependencies.

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath2()), "..");
function fileURLToPath2() {
  return new URL(".", import.meta.url).pathname;
}

const dataDir = path.join(root, "data");
const readJson = (f, fb) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8"));
  } catch {
    return fb;
  }
};
const writeJson = (f, v) =>
  fs.writeFileSync(path.join(dataDir, f), JSON.stringify(v, null, 2) + "\n");

const contributions = readJson("contributions.json", []);
const deals = readJson("deals.json", []);

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.+)$/);
    if (kv) meta[kv[1].trim()] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return meta;
}

const repoArgs = process.argv.slice(2);
if (repoArgs.length === 0) {
  console.error("usage: node scripts/import-contributions.mjs <repo-path> [more-repo-paths...]");
  process.exit(1);
}

let imported = 0;
let skipped = 0;

for (const repoPath of repoArgs) {
  const abs = path.resolve(repoPath);
  const repo = path.basename(abs);
  const chDir = path.join(abs, "contribution-history");
  if (!fs.existsSync(chDir)) {
    console.error(`[skip] ${repo}: no contribution-history/ directory`);
    skipped++;
    continue;
  }

  // register the repo as a deal placeholder if unknown
  if (!deals.some((d) => d.repo === repo)) {
    deals.push({
      id: `deal-${String(deals.length + 1).padStart(3, "0")}`,
      ideaId: "IDEA-???",
      repo,
      client: "unassigned",
      feePkr: 0,
      notes: "auto-registered on import — set ideaId, client, feePkr",
    });
  }

  for (const file of fs.readdirSync(chDir).sort()) {
    if (!/^c\d+\.md$/.test(file)) continue;
    const meta = parseFrontmatter(fs.readFileSync(path.join(chDir, file), "utf8"));
    if (!meta) {
      console.warn(`[warn] ${repo}/${file}: no frontmatter`);
      continue;
    }
    if (meta.status !== "complete") {
      skipped++;
      continue;
    }
    const rec = {
      id: meta.id || file.replace(/\.md$/, ""),
      date: meta.date || "",
      contributor: meta.contributor || "",
      workType: meta.work_type || meta.workType || "",
      ideaId: meta.idea_id || meta.ideaId || "IDEA-???",
      repo,
      status: "complete",
    };
    if (!rec.contributor || !rec.workType) {
      console.warn(`[warn] ${repo}/${file}: missing contributor or work_type`);
      continue;
    }
    const existing = contributions.findIndex((c) => c.repo === rec.repo && c.id === rec.id);
    if (existing >= 0) contributions[existing] = rec;
    else contributions.push(rec);
    imported++;
  }
}

writeJson("contributions.json", contributions);
writeJson("deals.json", deals);
console.log(`imported ${imported} record(s), skipped ${skipped}. data/ updated.`);
