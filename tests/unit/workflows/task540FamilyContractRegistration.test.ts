import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * TASK-540 closure is driven by `_docs/_workflows/task-540-implement.mjs`, which pins
 * the family's physical task contracts in several independent places: the changelog
 * `Tasks:` line, an independently written second copy of that line inside the atomic
 * closure contract, and the `TASK_FILES` array.
 *
 * TASK-540-07 and its two leaves were authored after those pins were written, and the
 * machinery contained ZERO references to them: it hard-failed the closure status
 * transaction on a stale target count and would have written a changelog entry naming
 * only 17 of the 20 contracts.
 *
 * The expectations below are derived from the task files that actually exist on disk
 * rather than from a hand-maintained list, so a future TASK-540-08 cannot be added
 * without this test failing until the closure machinery is taught about it. A
 * hand-pinned list would have rotted in exactly the way that produced this defect.
 */

const root = path.resolve(import.meta.dir, "../../..");
const tasksDir = path.join(root, "_docs/_TASKS");
const implementSource = readFileSync(
  path.join(root, "_docs/_workflows/task-540-implement.mjs"),
  "utf8"
);

const CLOSURE_LEAF_ID = "540-06-L01";

function familyTaskFiles(): readonly string[] {
  return readdirSync(tasksDir)
    .filter((name) => /^TASK-540(?:[-_]|\.md$)/u.test(name) && name.endsWith(".md"))
    .sort();
}

/** "TASK-540-07-L01-Correct-...md" -> "TASK-540-07-L01"; the root file -> "TASK-540". */
function taskIdFromFileName(fileName: string): string {
  const match = /^(TASK-540(?:-\d{2})?(?:-L\d{2})?)/u.exec(fileName);
  if (!match) throw new Error("unrecognised TASK-540 file name: " + fileName);
  return match[1];
}

function tasksLineLiterals(): readonly string[] {
  return [...implementSource.matchAll(/"(Tasks: TASK-540[^"]*)"/gu)].map((match) => match[1]);
}

function idsFromTasksLine(line: string): readonly string[] {
  return line.replace(/^Tasks: /u, "").split(", ");
}

test("the TASK-540 family has exactly the 20 physical contracts the closure machinery pins", () => {
  const files = familyTaskFiles();
  // Guard the discovery itself: if the glob silently matched nothing, every other
  // assertion below would pass vacuously.
  expect(files.length).toBeGreaterThan(0);
  expect(files).toHaveLength(20);

  const ids = files.map(taskIdFromFileName);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids).toContain("TASK-540");
  expect(ids).toContain("TASK-540-07");
  expect(ids).toContain("TASK-540-07-L01");
  expect(ids).toContain("TASK-540-07-L02");
});

test("both independently written Tasks: lines name every contract on disk", () => {
  const literals = tasksLineLiterals();
  // The workflow deliberately keeps two separately authored copies and compares them,
  // so the contract is meaningful only if both exist and agree.
  expect(literals).toHaveLength(2);
  expect(literals[0]).toBe(literals[1]);

  const expectedIds = familyTaskFiles().map(taskIdFromFileName);
  const declaredIds = idsFromTasksLine(literals[0]);
  expect(declaredIds).toHaveLength(expectedIds.length);
  expect([...declaredIds].sort()).toEqual([...expectedIds].sort());
});

test("TASK_FILES registers every family task file, including the TASK-540-07 contracts", () => {
  const declaredBlock = /const TASK_FILES = Object\.freeze\(\[([\s\S]*?)\]\);/u.exec(
    implementSource
  );
  expect(declaredBlock).not.toBeNull();
  const declared = [...(declaredBlock?.[1] ?? "").matchAll(/"(TASK-540[^"]+\.md)"/gu)].map(
    (match) => match[1]
  );
  expect([...declared].sort()).toEqual([...familyTaskFiles()]);
});

test("the closure leaf stays last in LEAF_ORDER so TASK-540-07 lands before closure", () => {
  const orderBlock = /const LEAF_ORDER = Object\.freeze\(\[([\s\S]*?)\]\);/u.exec(implementSource);
  expect(orderBlock).not.toBeNull();
  const leafIds = [...(orderBlock?.[1] ?? "").matchAll(/"(540-[^"]+)"/gu)].map((match) => match[1]);

  expect(leafIds).toContain("540-07-L01");
  expect(leafIds).toContain("540-07-L02");
  expect(new Set(leafIds).size).toBe(leafIds.length);
  // The closure leaf must be last: nothing else enforces it, because the
  // `holdUntilClosure` flag in LEAF_STATUS_GROUPS is never read.
  expect(leafIds[leafIds.length - 1]).toBe(CLOSURE_LEAF_ID);
  expect(leafIds.indexOf(CLOSURE_LEAF_ID)).toBe(leafIds.length - 1);
});

test("the status transaction covers every contract plus the task board README", () => {
  // 20 contracts + 1 board README. These are two different numbers and writing the
  // contract count where the transaction count belongs fails only once closure runs.
  expect(implementSource).toContain("const TASK_540_CONTRACT_COUNT = 20;");
  expect(implementSource).toContain(
    "const TASK_540_STATUS_TRANSACTION_COUNT = TASK_540_CONTRACT_COUNT + 1;"
  );
  expect(implementSource).toContain("targets.length !== TASK_540_STATUS_TRANSACTION_COUNT");
  // The stale literal must be gone, not merely shadowed.
  expect(implementSource).not.toContain("targets.length !== 18");
});

test("no closure prompt still claims the family has 17 contracts", () => {
  for (const stale of [
    "all 17 physical",
    "All 17 physical",
    "all 17 statuses",
    "All 17 task files",
    "all 17 contracts",
    "full 17-contract",
  ]) {
    expect(implementSource).not.toContain(stale);
  }
});

/**
 * FORBIDDEN_PATHS is agent-prompt policy referenced at exactly one site, with nothing
 * verifying it afterwards. The family mutated 32 paths across 9 of its globs, so an agent
 * was being handed a prohibition the family had visibly broken. The prohibition stays and
 * the landed exceptions are recorded; this test keeps both halves honest.
 *
 * The ninth glob, core/db/tables/**, was added after the schema split moved 1,679 of
 * schema.ts's 1,722 lines to paths no entry named; task540ForbiddenSchemaPaths.test.ts
 * derives that coverage from core/db/ on disk, while the pinned list here proves the
 * whole record stayed complete rather than only the schema half.
 */
test("every forbidden glob the family actually mutated carries a recorded exception", () => {
  const expectedGlobs = [
    "core/db/schema.ts",
    "core/db/tables/**",
    "core/db/migrations/**",
    "package.json",
    "core/widgets/**",
    "packages/**",
    "core/package.json",
    "bun.lock",
    "_docs/_TASKS/TASK-545*",
  ];

  const exceptionsBlock =
    /const AUTHORIZED_FORBIDDEN_PATH_EXCEPTIONS = Object\.freeze\(\[([\s\S]*?)\n\]\);/u.exec(
      implementSource
    );
  expect(exceptionsBlock).not.toBeNull();
  const recorded = [...(exceptionsBlock?.[1] ?? "").matchAll(/glob: "([^"]+)"/gu)].map(
    (match) => match[1]
  );

  expect([...recorded].sort()).toEqual([...expectedGlobs].sort());
  // The prohibition itself must not have been weakened to make the audit pass.
  const forbiddenBlock = /const FORBIDDEN_PATHS = Object\.freeze\(\[([\s\S]*?)\n\]\);/u.exec(
    implementSource
  );
  expect(forbiddenBlock).not.toBeNull();
  const forbidden = [...(forbiddenBlock?.[1] ?? "").matchAll(/"([^"]+)"/gu)].map(
    (match) => match[1]
  );
  for (const glob of expectedGlobs) {
    expect(forbidden).toContain(glob);
  }
  // Every exception needs a real reason and the commit that landed it, or the record is noise.
  expect(recorded).toHaveLength(9);
  expect([...(exceptionsBlock?.[1] ?? "").matchAll(/reason:/gu)]).toHaveLength(9);
  expect([...(exceptionsBlock?.[1] ?? "").matchAll(/commits: Object\.freeze\(\[/gu)]).toHaveLength(
    9
  );
});

/**
 * The 1,000-line limit does not reach workflow tooling: AGENTS.md scopes it to "a
 * human-authored production module or test file". A doc revision claimed otherwise for all
 * seven top-level helpers, three of which exceed it, making the claim unsatisfiable without
 * splitting ~34,500 lines of tooling no gate measures. The owner's decision was to correct
 * the documents. This test keeps the reasoning from being deleted and re-litigated.
 */
test("the settled helper line-limit scope decision stays recorded next to the predicate", () => {
  expect(implementSource).toContain("SETTLED SCOPE DECISION");
  expect(implementSource).toContain(
    'AGENTS.md § "File Size and Modularity" binds the 1,000-line limit to "a human-authored'
  );
  // The three helpers that exceed the limit must stay named, so the claim stays checkable.
  for (const helper of [
    "task-540-implement.mjs (~28,000 lines)",
    "task-540-local-orchestrator.mjs (3,966)",
    "task-540-test-name-contract.mjs (2,459)",
  ]) {
    expect(implementSource).toContain(helper);
  }
  // And the predicate must still exclude them by their real paths, not only via a
  // placeholder example path that a targeted widening could route around.
  for (const helper of [
    "_docs/_workflows/task-540-implement.mjs",
    "_docs/_workflows/task-540-local-orchestrator.mjs",
    "_docs/_workflows/task-540-test-name-contract.mjs",
  ]) {
    expect(implementSource).toContain(`Object.freeze({ path: "${helper}", expected: false })`);
  }
});

test("the agent prompt says the exceptions are a record, not permission", () => {
  expect(implementSource).toContain(
    "Those are a historical record, not permission: the paths above remain forbidden to you"
  );
  expect(implementSource).toContain(
    "an existing exception never justifies a new edit to the same path"
  );
});
