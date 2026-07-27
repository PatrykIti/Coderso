import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * `task-540-implement.mjs` resolves a task's status row by TABLE SHAPE, not by heading:
 * `readCanonicalTaskStatusTableRow` scans every markdown table whose first column is `ID`
 * and whose last column is `Status`, collects the rows whose id cell matches, and throws
 * `expected one canonical status row for <id>` unless it found EXACTLY one.
 *
 * TASK-540-07 carried two such tables -- `Leaves and order` and `Sub-Tasks` -- listing the
 * same two leaves. Its six sibling children each carry one, so nothing had ever exercised
 * the duplicate path, and the failure was hidden behind an earlier resume throw. The moment
 * the leaves were landed it surfaced, and it blocked every resume mode: the child lockstep
 * check calls `requireTableStatus` once per leaf.
 *
 * A duplicated status cell is also a drift surface -- two places to update, one of which
 * will be forgotten -- which is the same defect class as the stale count literals this
 * family has already had to repair.
 *
 * The parser below is a faithful port of the workflow's own, and the ids and documents are
 * discovered from disk, so this cannot go stale when a TASK-540-08 is authored.
 */

const root = path.resolve(import.meta.dir, "../../..");
const tasksDir = path.join(root, "_docs/_TASKS");
const implementSource = readFileSync(
  path.join(root, "_docs/_workflows/task-540-implement.mjs"),
  "utf8"
);

/** Port of `parseMarkdownTableCells`, including its escaped-pipe handling. */
function parseMarkdownTableCells(line: string): readonly string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  const cells: string[] = [];
  let cell = "";
  for (let index = 1; index < trimmed.length - 1; index += 1) {
    const character = trimmed[index];
    if (character === "|") {
      let precedingBackslashes = 0;
      for (let cursor = index - 1; cursor >= 1 && trimmed[cursor] === "\\"; cursor -= 1) {
        precedingBackslashes += 1;
      }
      if (precedingBackslashes % 2 === 0) {
        cells.push(cell.trim());
        cell = "";
        continue;
      }
    }
    cell += character;
  }
  cells.push(cell.trim());
  return cells;
}

const isDividerCell = (cell: string): boolean => /^:?-{3,}:?$/u.test(cell);

/** Port of `readCanonicalTaskStatusTableRow`, returning the match count instead of throwing. */
function canonicalStatusRowCount(source: string, taskId: string): number {
  const lines = source.split("\n");
  let matches = 0;
  for (let headerIndex = 0; headerIndex < lines.length - 1; headerIndex += 1) {
    const header = parseMarkdownTableCells(lines[headerIndex]);
    if (!header || header[0] !== "ID" || header[header.length - 1] !== "Status") continue;
    const divider = parseMarkdownTableCells(lines[headerIndex + 1]);
    if (!divider || divider.length !== header.length || !divider.every(isDividerCell)) continue;
    for (let rowIndex = headerIndex + 2; rowIndex < lines.length; rowIndex += 1) {
      if (lines[rowIndex].trim() === "") break;
      const cells = parseMarkdownTableCells(lines[rowIndex]);
      if (!cells || cells.length !== header.length) break;
      if (cells[0] === taskId) matches += 1;
    }
  }
  return matches;
}

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

test("the workflow really demands exactly one canonical status row", () => {
  // If this contract were relaxed, the assertions below would be guarding nothing.
  expect(implementSource).toContain("if (matches.length !== 1) {");
  expect(implementSource).toContain('throw new Error(label + ": expected one canonical status row');
});

test("no TASK-540 document lists any family id in two canonical status tables", () => {
  const files = familyTaskFiles();
  const ids = files.map(taskIdFromFileName);
  expect(files).toHaveLength(20);

  const duplicates: string[] = [];
  let totalRows = 0;
  for (const fileName of files) {
    const source = readFileSync(path.join(tasksDir, fileName), "utf8");
    for (const id of ids) {
      const count = canonicalStatusRowCount(source, id);
      totalRows += count;
      if (count > 1) duplicates.push(fileName + " lists " + id + " " + String(count) + " times");
    }
  }

  // Guard the guard: a broken parser would report zero rows everywhere and pass vacuously.
  expect(totalRows).toBeGreaterThan(18);
  expect(duplicates).toEqual([]);
});

test("every child's leaves and every root child row resolve to exactly one status row", () => {
  const files = familyTaskFiles();
  const childFiles = files.filter((name) => /^TASK-540-\d{2}-(?!L\d{2})/u.test(name));
  const leafIds = files.filter((name) => /-L\d{2}-/u.test(name)).map(taskIdFromFileName);
  const childIds = childFiles.map(taskIdFromFileName);
  expect(childIds).toHaveLength(7);
  expect(leafIds).toHaveLength(12);

  // Each leaf's status must be resolvable from its own child document, exactly once.
  for (const leafId of leafIds) {
    const childId = /^(TASK-540-\d{2})-L\d{2}$/u.exec(leafId)?.[1];
    const childFile = childFiles.find((name) => taskIdFromFileName(name) === childId);
    if (childFile === undefined) throw new Error("no child document for " + leafId);
    const source = readFileSync(path.join(tasksDir, childFile), "utf8");
    expect(canonicalStatusRowCount(source, leafId)).toBe(1);
  }

  // And each child's status must be resolvable from the root, exactly once.
  const rootFile = files.find((name) => /^TASK-540_Custom_Screens/u.test(name));
  if (rootFile === undefined) throw new Error("could not locate the root task document");
  const rootSource = readFileSync(path.join(tasksDir, rootFile), "utf8");
  for (const childId of childIds) {
    expect(canonicalStatusRowCount(rootSource, childId)).toBe(1);
  }
});
