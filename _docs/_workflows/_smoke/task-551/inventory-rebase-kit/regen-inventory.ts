/**
 * Transient TASK-551-06 fixture regen driver (.tmp — gitignored, never committed).
 *
 * FAIL-CLOSED: review-owned fields for new call sites must be supplied in
 * ./new-row-classifications.json (one entry per new call site); dropping stale
 * pre-existing rows requires --authorize-drops. The driver never infers a
 * review field and never dials a database (airtight form:
 *   env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null .tmp/task-551/regen-inventory.ts [--write] [--authorize-drops]
 * ).
 */
import {
  digestDiscoveredCallers,
  scanProductionDbCallers,
} from "../../scripts/task-551-query-inventory";
import {
  buildCanonicalReceipt,
  canonicalizeInventoryRecords,
  digestInventoryRecords,
} from "../../scripts/task551QueryInventory/canonical";
import type { QueryInventoryRecord } from "../../scripts/task551QueryInventory/contracts";
import {
  PLANNED_QUERY_DELTAS,
  TASK551_QUERY_INVENTORY_RECEIPT,
} from "../../tests/perf/fixtures/task551QueryInventory";
import { serializeCurrentRows, type DecodedRow } from "./emit-rows";

const REVIEW_FIELDS = [
  "kind",
  "statementRole",
  "projectionSensitivity",
  "filterShape",
  "joinShape",
  "orderShape",
  "bound",
  "queryCountBudget",
  "cacheEligibility",
  "freshnessPolicy",
  "transactionMode",
  "constraintOwner",
  "owner",
  "disposition",
] as const;

const old = JSON.parse(await Bun.file(new URL("./old-inventory.json", import.meta.url)).text());
type StoredRow = (string | number | null)[];
const oldRows: StoredRow[] = old.rows;
const keyOf = (f: string, s: string, fam: string, op: string) => `${f}#${s}:${fam}:${op}`;

const discovered = await scanProductionDbCallers();
const oldByKey = new Map<string, StoredRow[]>();
for (const r of oldRows) {
  const k = keyOf(String(r[0]), String(r[1]), String(r[4]), String(r[5]));
  (oldByKey.get(k) ?? oldByKey.set(k, []).get(k)!).push(r);
}
const discByKey = new Map<string, typeof discovered>();
for (const d of discovered) {
  const k = keyOf(d.source.file, d.source.symbol, d.caller.family, d.caller.operation);
  (discByKey.get(k) ?? discByKey.set(k, []).get(k)!).push(d);
}

const authorizeDrops = process.argv.includes("--authorize-drops");
const write = process.argv.includes("--write");
const classificationsUrl = new URL("./new-row-classifications.json", import.meta.url);
const classifications: Array<Record<string, unknown>> = (await Bun.file(
  classificationsUrl
).exists())
  ? await Bun.file(classificationsUrl).json()
  : [];

const keptRows: DecodedRow[] = [];
const stale: StoredRow[] = [];
const unmatchedNew: typeof discovered = [];
let nextBudget = 1150;

for (const [, olds] of oldByKey) {
  const news = discByKey.get(
    keyOf(String(olds[0]![0]), String(olds[0]![1]), String(olds[0]![4]), String(olds[0]![5]))
  );
  if (!news || news.length === 0) {
    stale.push(...olds);
    continue;
  }
  const sortedOld = [...olds].sort((a, b) => Number(a[2]) - Number(b[2]));
  const sortedNew = [...news].sort((a, b) => a.source.line - b.source.line);
  const pairable = Math.min(sortedOld.length, sortedNew.length);
  for (let i = 0; i < pairable; i++) {
    const o = sortedOld[i]!,
      n = sortedNew[i]!;
    keptRows.push([
      n.source.file,
      n.source.symbol,
      n.source.line,
      n.source.column,
      ...o.slice(4),
    ] as unknown as DecodedRow);
  }
  stale.push(...sortedOld.slice(pairable));
  for (const surplus of sortedNew.slice(pairable)) unmatchedNew.push(surplus);
}
for (const [k, news] of discByKey) if (!oldByKey.has(k)) unmatchedNew.push(...news);
unmatchedNew.sort(
  (a, b) =>
    `${a.source.file}#${a.source.symbol}`.localeCompare(`${b.source.file}#${b.source.symbol}`) ||
    a.source.line - b.source.line ||
    a.source.column - b.source.column
);

console.log(
  JSON.stringify({
    discovered: discovered.length,
    kept: keptRows.length,
    stale: stale.length,
    new: unmatchedNew.length,
  })
);

let blocked = false;
if (stale.length > 0 && !authorizeDrops) {
  blocked = true;
  console.error(
    `BLOCKED: ${stale.length} pre-existing rows no longer match the scanned tree (re-run with --authorize-drops to drop):`
  );
  for (const r of stale) console.error(`  ${r[0]}#${r[1]}:L${r[2]}:C${r[3]}:${r[4]}:${r[5]}`);
}
if (unmatchedNew.length > 0 && classifications.length !== unmatchedNew.length) {
  blocked = true;
  console.error(
    `BLOCKED: ${unmatchedNew.length} new call sites need review-owned classifications in ${classificationsUrl.pathname} (have ${classifications.length}); scanned fields are in ./new-rows.scanned.json.`
  );
}
if (blocked) process.exit(1);

for (const n of unmatchedNew) {
  const k = keyOf(n.source.file, n.source.symbol, n.caller.family, n.caller.operation);
  const c = classifications.find(
    (x) => keyOf(String(x.file), String(x.symbol), String(x.family), String(x.operation)) === k
  );
  if (!c) {
    console.error(`BLOCKED: no classification row for ${k}`);
    process.exit(1);
  }
  for (const f of REVIEW_FIELDS)
    if (!(f in c)) {
      console.error(`BLOCKED: classification ${k} lacks review field ${f}`);
      process.exit(1);
    }
  nextBudget += 1;
  const external = c.disposition === "external-handoff";
  keptRows.push([
    n.source.file,
    n.source.symbol,
    n.source.line,
    n.source.column,
    n.caller.family,
    n.caller.operation,
    c.kind,
    c.statementRole,
    c.projectionSensitivity,
    c.filterShape,
    c.joinShape,
    c.orderShape,
    c.bound,
    c.queryCountBudget,
    c.cacheEligibility,
    c.freshnessPolicy,
    c.transactionMode,
    c.constraintOwner,
    `current-${nextBudget}`,
    null,
    external ? null : `task551_current_${nextBudget}`,
    c.owner,
    c.disposition,
  ] as unknown as DecodedRow);
}

const currentRecords: QueryInventoryRecord[] = keptRows.map((row) => {
  const [file, symbol, line, column, family, operation, ...rest] = row as unknown as [
    string,
    string,
    number,
    number,
    string,
    string,
    ...unknown[],
  ];
  const [
    kind,
    statementRole,
    projectionSensitivity,
    filterShape,
    joinShape,
    orderShape,
    bound,
    queryCountBudget,
    cacheEligibility,
    freshnessPolicy,
    transactionMode,
    constraintOwner,
    budgetId,
    plannedShapeId,
    telemetryFingerprintKey,
    owner,
    disposition,
  ] = rest as [
    QueryInventoryRecord["kind"],
    QueryInventoryRecord["statementRole"],
    QueryInventoryRecord["projectionSensitivity"],
    QueryInventoryRecord["filterShape"],
    QueryInventoryRecord["joinShape"],
    QueryInventoryRecord["orderShape"],
    QueryInventoryRecord["bound"],
    QueryInventoryRecord["queryCountBudget"],
    QueryInventoryRecord["cacheEligibility"],
    QueryInventoryRecord["freshnessPolicy"],
    QueryInventoryRecord["transactionMode"],
    QueryInventoryRecord["constraintOwner"],
    string,
    null,
    string | null,
    QueryInventoryRecord["owner"],
    QueryInventoryRecord["disposition"],
  ];
  return {
    schemaVersion: 1,
    recordState: "current",
    id: `${file}#${symbol}:L${line}:C${column}:${family}:${operation}`,
    source: { file, symbol, line, column },
    caller: { family, operation },
    kind,
    statementRole,
    projectionSensitivity,
    filterShape,
    joinShape,
    orderShape,
    bound,
    queryCountBudget,
    cacheEligibility,
    freshnessPolicy,
    transactionMode,
    constraintOwner,
    budgetId,
    plannedShapeId,
    telemetryFingerprintKey,
    owner,
    disposition,
  } as unknown as QueryInventoryRecord;
});
const canonical = canonicalizeInventoryRecords(currentRecords);
const associations: Record<string, string> = {};
for (const record of [...canonical, ...PLANNED_QUERY_DELTAS]) {
  if (record.telemetryFingerprintKey !== null)
    associations[record.id] = record.telemetryFingerprintKey;
}
const receipt = buildCanonicalReceipt({
  phase: "initial",
  discovered,
  current: canonical,
  planned: PLANNED_QUERY_DELTAS,
  associations,
  validatedAt: TASK551_QUERY_INVENTORY_RECEIPT.validatedAt,
});
console.log(
  "receipt:",
  JSON.stringify(receipt, null, 1),
  "\nsourceTreeDigest(scan-only):",
  digestDiscoveredCallers(discovered),
  "\ninventoryDigest:",
  digestInventoryRecords(canonical)
);

if (!write) process.exit(0);
const fixturePath = "tests/perf/fixtures/task551QueryInventory.ts";
const fixture = await Bun.file(fixturePath).text();
const lines = fixture.split("\n");
const start = lines.findIndex((l) => l.startsWith("const CURRENT_ROWS:"));
let end = start;
while (lines[end] !== "];") end += 1;
const out = [...lines.slice(0, start), serializeCurrentRows(keptRows), ...lines.slice(end + 1)]
  .join("\n")
  .replace(/sourceTreeDigest: "[0-9a-f]{64}",/, `sourceTreeDigest: "${receipt.sourceTreeDigest}",`)
  .replace(/inventoryDigest: "[0-9a-f]{64}",/, `inventoryDigest: "${receipt.inventoryDigest}",`)
  .replace(
    /fingerprintAssociationDigest: "[0-9a-f]{64}",/,
    `fingerprintAssociationDigest: "${receipt.fingerprintAssociationDigest}",`
  )
  .replace(/discoveredCount: \d+,/, `discoveredCount: ${receipt.discoveredCount},`)
  .replace(/ownedCount: \d+,/, `ownedCount: ${receipt.ownedCount},`);
await Bun.write(fixturePath, out);
console.log(`WROTE ${fixturePath}: ${keptRows.length} rows, receipt fields updated`);
