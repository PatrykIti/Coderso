import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * TASK-540 has twice shipped a repair whose own prose restated a count that the code beside
 * it already owned, and the restatement then went stale when the list grew:
 *
 *   - `AUTHORIZED_FORBIDDEN_PATH_EXCEPTIONS`: a reason string said "the most clearly
 *     unintended of the eight" while the cardinality pin five lines below asserted nine. The
 *     ninth glob, core/db/tables/**, was appended after the schema split without revisiting
 *     the prose.
 *   - `TASK_540_LINE_LIMIT_TRIPWIRE_PATHS`: the self-test's comment said "the two tripwire
 *     paths" after the list had grown to four.
 *
 * Neither was load-bearing on its own, which is exactly why both survived review. A comment
 * that disagrees with the code next to it is how a reader learns to distrust every other
 * comment in a 28,000-line module that closure evidence depends on.
 *
 * So the rule these tests enforce is: a list's length is stated in exactly one place, the
 * list. Where a number genuinely earns its place in prose -- the eleven-line tripwire
 * headroom claim -- it is measured against disk here instead of merely being tolerated.
 */

const root = path.resolve(import.meta.dir, "../../..");
const implementSource = readFileSync(
  path.join(root, "_docs/_workflows/task-540-implement.mjs"),
  "utf8"
);

const LINE_LIMIT = 1000;
/** The headroom the tripwire comment claims for every path it names. */
const CLAIMED_HEADROOM_LINES = 11;

const NUMBER_WORDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
] as const;

function frozenBlock(constName: string): string {
  const pattern = new RegExp(
    "const " + constName + " = Object\\.freeze\\(\\[([\\s\\S]*?)\\n\\]\\);",
    "u"
  );
  const block = pattern.exec(implementSource);
  if (!block) throw new Error("could not locate " + constName);
  return block[1];
}

test("the forbidden-path exception record states its size only through its own length", () => {
  const block = frozenBlock("AUTHORIZED_FORBIDDEN_PATH_EXCEPTIONS");
  const entryCount = [...block.matchAll(/glob: "/gu)].length;

  // Guard the guard: a failed parse would make every phrase check below vacuous.
  expect(entryCount).toBeGreaterThan(1);
  // The cardinality pin must agree with the list it guards. It stays a literal on purpose --
  // deriving it from the same array would make the tripwire unable to fire.
  expect(implementSource).toContain(
    "AUTHORIZED_FORBIDDEN_PATH_EXCEPTIONS.length !== " + String(entryCount)
  );

  // "of the <number>" is a count restatement, not ordinary prose. None may disagree, and the
  // agreeing form is not wanted either: the length is the single authority.
  for (const word of NUMBER_WORDS) {
    expect(block).not.toContain("of the " + word + " ");
  }
  // The exact phrase that was stale, pinned so it cannot come back by another route.
  expect(block).not.toContain("unintended of the eight");
});

test("the line-limit tripwire comment states no count and its headroom claim is true", () => {
  const tripwire = [
    ...frozenBlock("TASK_540_LINE_LIMIT_TRIPWIRE_PATHS").matchAll(/"([^"]+)"/gu),
  ].map((match) => match[1]);
  expect(tripwire.length).toBeGreaterThanOrEqual(2);

  // No spelled-out count of the tripwire list, in any wrong form or the right one.
  for (const word of NUMBER_WORDS) {
    expect(implementSource).not.toContain("The " + word + " tripwire path");
    expect(implementSource).not.toContain("the " + word + " tripwire path");
  }
  // The self-test's own case total must keep deriving the count from the list.
  expect(implementSource).toContain("TASK_540_LINE_LIMIT_TRIPWIRE_PATHS.length");

  // The one number the comment still asserts is measured, not assumed: every named path must
  // really sit within the claimed headroom, and none may exceed the limit.
  const lineCounts = tripwire.map((relativePath) => {
    const contents = readFileSync(path.join(root, relativePath), "utf8");
    return contents.split("\n").length - (contents.endsWith("\n") ? 1 : 0);
  });
  expect(implementSource).toContain("within eleven lines of the limit");
  for (const lines of lineCounts) {
    expect(lines).toBeLessThanOrEqual(LINE_LIMIT);
    expect(lines).toBeGreaterThanOrEqual(LINE_LIMIT - CLAIMED_HEADROOM_LINES);
  }
});
