import fs from "node:fs";
import path from "node:path";

import { computeValuation, DEFAULT_SPLITS } from "@/lib/valuation";
import type { Member, Contribution, Deal, Splits } from "@/lib/types";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

function load<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export default function Page() {
  const members = load<Member[]>("ids.json", []);
  const contributions = load<Contribution[]>("contributions.json", []);
  const deals = load<Deal[]>("deals.json", []);
  const splits = load<Splits>("splits.json", DEFAULT_SPLITS);

  const { errors, rows, grandTotalPkr } = computeValuation(
    members,
    contributions,
    deals,
    splits,
  );

  return (
    <Dashboard
      rows={rows}
      deals={deals}
      errors={errors}
      grandTotalPkr={grandTotalPkr}
    />
  );
}
