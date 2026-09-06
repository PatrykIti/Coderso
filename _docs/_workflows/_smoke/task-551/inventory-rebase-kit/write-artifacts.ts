import { scanProductionDbCallers } from "../../scripts/task-551-query-inventory";
const discovered = await scanProductionDbCallers();
const old = JSON.parse(await Bun.file(new URL("./old-inventory.json", import.meta.url)).text());
type Row = (string | number | null)[];
const oldRows: Row[] = old.rows as Row[];
const keyOf = (f: string, s: string, fam: string, op: string) => `${f}#${s}:${fam}:${op}`;
const oldByKey = new Map<string, Row[]>();
for (const r of oldRows) {
  const k = keyOf(String(r[0]), String(r[1]), String(r[4]), String(r[5]));
  (oldByKey.get(k) ?? oldByKey.set(k, []).get(k)!).push(r);
}
const discByKey = new Map<string, typeof discovered>();
for (const d of discovered) {
  const k = keyOf(d.source.file, d.source.symbol, d.caller.family, d.caller.operation);
  (discByKey.get(k) ?? discByKey.set(k, []).get(k)!).push(d);
}
const newRows: Array<Record<string, unknown>> = [];
const keptLineShifts: string[] = [];
const stale: Array<Record<string, unknown>> = [];
for (const [k, olds] of oldByKey) {
  const news = discByKey.get(k);
  if (!news) {
    for (const o of olds)
      stale.push({
        id: `${o[0]}#${o[1]}:L${o[2]}:C${o[3]}:${o[4]}:${o[5]}`,
        file: o[0],
        symbol: o[1],
        line: o[2],
        column: o[3],
        family: o[4],
        operation: o[5],
        budgetId: o[18],
      });
    continue;
  }
  const so = [...olds].sort((a, b) => Number(a[2]) - Number(b[2]));
  const sn = [...news].sort((a, b) => a.source.line - b.source.line);
  so.forEach((o, i) => {
    const n = sn[i];
    if (!n) return;
    if (Number(o[2]) !== n.source.line)
      keptLineShifts.push(
        `${o[0]}#${o[1]}:${o[4]}:${o[5]} L${o[2]}:C${o[3]} -> L${n.source.line}:C${n.source.column}`
      );
  });
  if (sn.length > so.length) for (const n of sn.slice(so.length)) newRows.push(scanOf(n));
}
for (const [k, news] of discByKey)
  if (!oldByKey.has(k)) for (const n of news) newRows.push(scanOf(n));
newRows.sort((a, b) => `${a.file}:${a.symbol}`.localeCompare(`${b.file}:${b.symbol}`));
function scanOf(n: (typeof discovered)[number]) {
  return {
    file: n.source.file,
    symbol: n.source.symbol,
    line: n.source.line,
    column: n.source.column,
    family: n.caller.family,
    operation: n.caller.operation,
    id: n.id,
  };
}
await Bun.write(
  new URL("./new-rows.scanned.json", import.meta.url),
  JSON.stringify(newRows, null, 1)
);
await Bun.write(
  new URL("./stale-rows.json", import.meta.url),
  JSON.stringify({ stale, keptLineShifts }, null, 1)
);
const byModule = new Map<string, number>();
for (const r of newRows) {
  const m = String(r.file).split("/").slice(0, 3).join("/");
  byModule.set(m, (byModule.get(m) ?? 0) + 1);
}
console.log(
  "new rows:",
  newRows.length,
  "stale rows:",
  stale.length,
  "kept line shifts:",
  keptLineShifts.length
);
console.log(
  "new rows by module:",
  JSON.stringify(Object.fromEntries([...byModule].sort()), null, 1)
);
const byOp = new Map<string, number>();
for (const r of newRows)
  byOp.set(`${r.family}:${r.operation}`, (byOp.get(`${r.family}:${r.operation}`) ?? 0) + 1);
console.log("new rows by caller:", JSON.stringify(Object.fromEntries([...byOp].sort())));
