import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * `--self-test-current-resume=<mode>` is the only cheap way to ask whether TASK-540's resume
 * graph is coherent, and it is the acceptance gate for every bookkeeping repair the family
 * makes. Its `initial` branch pinned the landed set as a hand-written nine-id array.
 *
 * That array went stale the moment TASK-540-07's two leaves joined `LEAF_ORDER`. Once those
 * leaves were landed the resolver agreed with the graph and the SELF-TEST was the only thing
 * left rejecting it, with `TASK-540 current-resume initial cursor is not exact` -- a checker
 * failing the very state it exists to certify. That is the same stale-literal class as the
 * count comments this file has already had to repair, one layer further in.
 *
 * The fix is derivation, not a longer list: the branch already pins the cursor at the closure
 * leaf, and given that, "landed" is exactly the other leaves in land order. So the
 * expectations below check that no resume-cursor branch spells leaf ids out, and they
 * reconstruct the derived set from `LEAF_ORDER` in source to prove the retired literal no
 * longer describes the family.
 *
 * Deliberately source-derived rather than spawning the self-test: the resume MODE legitimately
 * changes as the family advances -- once the closure leaf lands, `initial` is supposed to stop
 * matching -- so a behavioural assertion here would have to be rewritten at the next real step.
 */

const root = path.resolve(import.meta.dir, "../../..");
const implementSource = readFileSync(
  path.join(root, "_docs/_workflows/task-540-implement.mjs"),
  "utf8"
);

const CLOSURE_LEAF_ID = "540-06-L01";
/** The list that was hardcoded, kept here as the exact thing that must no longer be needed. */
const RETIRED_LITERAL = [
  "540-01-L01",
  "540-02-L01",
  "540-03-L01",
  "540-04-L01",
  "540-04-L02",
  "540-04-L03",
  "540-04-L04",
  "540-05-L01",
  "540-05-L02",
];

function leafOrder(): readonly string[] {
  const block = /const LEAF_ORDER = Object\.freeze\(\[([\s\S]*?)\n\]\);/u.exec(implementSource);
  if (!block) throw new Error("could not locate LEAF_ORDER");
  const ids = [...block[1].matchAll(/"(540-\d{2}-L\d{2})"/gu)].map((match) => match[1]);
  if (ids.length === 0) throw new Error("no leaf ids parsed from LEAF_ORDER");
  return ids;
}

/** The body of one `expectedMode === "<mode>"` cursor check, up to its throw. */
function cursorBranch(mode: string): string {
  const pattern = new RegExp(
    'expectedMode === "' +
      mode +
      '" &&([\\s\\S]*?)throw new Error\\("TASK-540 current-resume ' +
      mode +
      ' cursor is not exact"\\);',
    "u"
  );
  const match = pattern.exec(implementSource);
  if (!match) throw new Error("could not locate the " + mode + " cursor branch");
  return match[1];
}

test("the initial cursor branch derives its landed set instead of spelling leaf ids out", () => {
  const branch = cursorBranch("initial");

  // No leaf id may be written by hand anywhere in the branch, including the closure leaf:
  // a named constant already exists for it.
  expect(branch).not.toMatch(/"540-\d{2}-L\d{2}"/u);
  for (const staleId of RETIRED_LITERAL) {
    expect(branch).not.toContain(staleId);
  }

  // And it must derive both sets from the single source of land order.
  expect(branch).toContain("LEAF_ORDER.filter((leafId) => leafId !== CLOSURE_LEAF_ID)");
  expect(branch).toContain("JSON.stringify([CLOSURE_LEAF_ID])");
  expect(branch).toContain("currentResume.startLeafId !== CLOSURE_LEAF_ID");
});

test("the retired literal genuinely no longer describes the family's landed set", () => {
  const order = leafOrder();
  const derived = order.filter((leafId) => leafId !== CLOSURE_LEAF_ID);

  // Guard the guard: a bad LEAF_ORDER parse would make the inequality below meaningless.
  expect(order.length).toBeGreaterThan(RETIRED_LITERAL.length);
  expect(order[order.length - 1]).toBe(CLOSURE_LEAF_ID);

  // The whole defect: the hand-written list is missing the TASK-540-07 leaves.
  expect(derived).not.toEqual(RETIRED_LITERAL);
  expect(derived).toContain("540-07-L01");
  expect(derived).toContain("540-07-L02");
  expect(derived).toHaveLength(order.length - 1);
  // Land order must be preserved, not merely set membership.
  expect(derived).toEqual(order.slice(0, -1));
});

test("the sibling cursor branches were already derived and stay that way", () => {
  // The prepared branch compares against the whole of LEAF_ORDER, and the repair branch
  // filters it by the repair owner. Both are the idiom the initial branch now follows.
  expect(cursorBranch("prepared")).toContain("JSON.stringify(LEAF_ORDER)");
  expect(cursorBranch("repair")).toContain("LEAF_ORDER.filter((leafId) => leafId !== repairId)");
});
