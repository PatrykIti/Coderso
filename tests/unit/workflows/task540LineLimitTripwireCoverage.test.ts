import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * `TASK_540_LINE_LIMIT_TRIPWIRE_PATHS` in `_docs/_workflows/task-540-implement.mjs` is the
 * hermetic proof that the family's 1,000-line gate really rejects its own most at-risk
 * modules: the self-test feeds each listed path 1,001 synthetic lines and requires the gate
 * to fail with `<path>=1001`.
 *
 * That proof is only worth having if the list names the paths actually closest to the limit.
 * It did not. `tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx` sits
 * at EXACTLY 1,000 lines and `tests/vitest/ui/use-screen-related-entries.test.tsx` at 999 --
 * zero and one line of headroom, since 1,000 is an inclusive pass -- while the list pinned
 * `backupService.ts` (990) and `footer.tsx` (989) instead, which have ten and eleven.
 *
 * A hand-maintained list is what let that happen, so the expectations below are derived from
 * the gate's OWN report of the paths it governs and their real line counts. If any governed
 * module grows to within HEADROOM_LINES of the limit and the tripwire does not name it, this
 * fails until the tripwire is extended.
 */

const root = path.resolve(import.meta.dir, "../../..");
const workflowRelative = "_docs/_workflows/task-540-implement.mjs";
const implementSource = readFileSync(path.join(root, workflowRelative), "utf8");

const LINE_LIMIT = 1000;
/** How close to the limit a governed module may get before the tripwire must name it. */
const HEADROOM_LINES = 15;

type GovernedModule = { readonly path: string; readonly lines: number; readonly owner: string };

function isGovernedModule(value: unknown): value is GovernedModule {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.path === "string" &&
    typeof record.lines === "number" &&
    typeof record.owner === "string"
  );
}

/** The gate's own authority over which paths it governs, and how long each one is. */
function governedModules(): readonly GovernedModule[] {
  const result = spawnSync("node", [workflowRelative, "--check-task-family-line-limit"], {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
  });
  expect(result.status).toBe(0);
  const parsed: unknown = JSON.parse(result.stdout);
  if (!Array.isArray(parsed) || !parsed.every(isGovernedModule)) {
    throw new Error("unexpected --check-task-family-line-limit report shape");
  }
  return parsed;
}

function tripwirePaths(): readonly string[] {
  const block =
    /const TASK_540_LINE_LIMIT_TRIPWIRE_PATHS = Object\.freeze\(\[([\s\S]*?)\n\]\);/u.exec(
      implementSource
    );
  if (!block) throw new Error("could not locate TASK_540_LINE_LIMIT_TRIPWIRE_PATHS");
  return [...block[1].matchAll(/"([^"]+)"/gu)].map((match) => match[1]);
}

test("the line-limit tripwire names every governed module close to the limit", () => {
  const modules = governedModules();
  const tripwire = tripwirePaths();

  // Guard the guard: an emptied report or list would make every assertion below vacuous.
  expect(modules.length).toBeGreaterThan(100);
  expect(tripwire.length).toBeGreaterThanOrEqual(2);

  const atRisk = [...modules]
    .filter((module) => module.lines > LINE_LIMIT - HEADROOM_LINES)
    .sort((left, right) => right.lines - left.lines);

  // The defect: the two modules with the least headroom were the two absent from the list.
  expect(atRisk.slice(0, 2).map((module) => module.path)).toEqual([
    "tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx",
    "tests/vitest/ui/use-screen-related-entries.test.tsx",
  ]);
  expect(atRisk[0].lines).toBe(LINE_LIMIT);
  expect(atRisk[1].lines).toBe(LINE_LIMIT - 1);

  const uncovered = atRisk
    .filter((module) => !tripwire.includes(module.path))
    .map((module) => module.path + "=" + String(module.lines));
  expect(uncovered).toEqual([]);
});

test("the tripwire is ordered most-urgent-first and every entry is a compliant governed module", () => {
  const byPath = new Map(governedModules().map((module) => [module.path, module.lines]));
  const tripwire = tripwirePaths();

  expect(tripwire.length).toBe(new Set(tripwire).size);

  const counts = tripwire.map((relativePath) => {
    const lines = byPath.get(relativePath);
    if (lines === undefined) {
      throw new Error("tripwire path is not governed by the gate: " + relativePath);
    }
    return lines;
  });

  // A tripwire entry above the limit would mean the family gate is already red, and its
  // 1,001-line rejection would prove nothing a real run had not already proven.
  for (const count of counts) expect(count).toBeLessThanOrEqual(LINE_LIMIT);
  expect(Math.max(...counts)).toBe(LINE_LIMIT);
  for (let index = 1; index < counts.length; index += 1) {
    expect(counts[index]).toBeLessThan(counts[index - 1]);
  }
});
