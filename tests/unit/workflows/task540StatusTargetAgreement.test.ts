import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * TASK-540's status closure is a two-module transaction. `task-540-implement.mjs` PRODUCES
 * the target payloads from `STATUS_TRANSACTION_PATHS`, and `task-540-local-orchestrator.mjs`
 * CONSUMES them, validating the incoming array against its own independent
 * `STATUS_TARGET_RELATIVE_PATHS` -- both the length and, per index, the path.
 *
 * Registering TASK-540-07 taught only the producer. The producer began sending 21 targets
 * while the consumer still hard-required 18, and its journal grammars only admitted payload
 * indices 0..17, so closure would have failed at the module boundary -- the same defect the
 * registration commit set out to remove, one module further along.
 *
 * Nothing here is hand-pinned. Both lists are read from source and required to be
 * IDENTICAL, index for index, so a future TASK-540-08 taught to one side fails until it is
 * taught to the other. The counts the consumer derives are checked against the same array
 * rather than against a literal, because literals are what rotted.
 */

const root = path.resolve(import.meta.dir, "../../..");

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

const implementSource = source("_docs/_workflows/task-540-implement.mjs");
const orchestratorSource = source("_docs/_workflows/task-540-local-orchestrator.mjs");

/**
 * Quoted entries of a `const X = Object.freeze([...])` block. `keep` filters out strings that
 * appear inside the block's explanatory comments -- both arrays carry them, and a comment
 * phrase silently entering the list would make the comparison meaningless.
 */
function frozenStringArray(
  text: string,
  constName: string,
  keep: (value: string) => boolean
): readonly string[] {
  const pattern = new RegExp(
    "const " + constName + " = Object\\.freeze\\(\\[([\\s\\S]*?)\\n\\]\\);",
    "u"
  );
  const block = pattern.exec(text);
  if (!block) throw new Error("could not locate " + constName);
  const values = [...block[1].matchAll(/"([^"]+)"/gu)].map((match) => match[1]).filter(keep);
  if (values.length === 0) throw new Error("no entries parsed from " + constName);
  return values;
}

const isTaskDocPath = (value: string): boolean => /^_docs\/_TASKS\/.+\.md$/u.test(value);
const isTaskDocFile = (value: string): boolean => /^TASK-540.*\.md$/u.test(value);
const isLeafId = (value: string): boolean => /^540-\d{2}-L\d{2}$/u.test(value);

/** The producer builds its list from three named parts rather than one literal array. */
function producerStatusPaths(): readonly string[] {
  const leaves = frozenStringArray(implementSource, "LEAF_ORDER", isLeafId);
  const groups = /const LEAF_STATUS_GROUPS = Object\.freeze\(\{([\s\S]*?)\n\}\);/u.exec(
    implementSource
  );
  if (!groups) throw new Error("could not locate LEAF_STATUS_GROUPS");
  const taskPaths = frozenStringArray(implementSource, "TASK_FILES", isTaskDocFile).map(
    (name) => "_docs/_TASKS/" + name
  );
  // Resolve each leaf's own document and its child's, in LEAF_ORDER, exactly as
  // LEAF_TASK_PATHS and CHILD_TASK_PATHS do.
  const leafPaths: string[] = [];
  const childPaths: string[] = [];
  for (const leafId of leaves) {
    const entry = new RegExp('"' + leafId + '": \\{([\\s\\S]*?)\\n  \\}', "u").exec(groups[1]);
    if (!entry) throw new Error("could not locate status group for " + leafId);
    const leafIndex = /leafPath: TASK_PATHS\[(\d+)\]/u.exec(entry[1]);
    const childIndex = /childPath: TASK_PATHS\[(\d+)\]/u.exec(entry[1]);
    if (!leafIndex || !childIndex) throw new Error("incomplete status group for " + leafId);
    leafPaths.push(taskPaths[Number(leafIndex[1])]);
    const childPath = taskPaths[Number(childIndex[1])];
    if (!childPaths.includes(childPath)) childPaths.push(childPath);
  }
  const rootPath = taskPaths.find((value) => /TASK-540_Custom_Screens/u.test(value));
  if (rootPath === undefined) throw new Error("could not locate the root task path");
  return [...leafPaths, ...childPaths, rootPath, "_docs/_TASKS/README.md"];
}

test("producer and consumer agree on the status transaction targets, index for index", () => {
  const consumer = frozenStringArray(
    orchestratorSource,
    "STATUS_TARGET_RELATIVE_PATHS",
    isTaskDocPath
  );
  const producer = producerStatusPaths();

  // Guard the guard: an empty parse on either side would make the comparison vacuous.
  expect(producer.length).toBeGreaterThan(18);
  expect(consumer).toEqual([...producer]);
  expect(consumer.length).toBe(new Set(consumer).size);

  // The board README is the sole commit point and must be last on both sides.
  expect(consumer[consumer.length - 1]).toBe("_docs/_TASKS/README.md");
  // The closure leaf and closure child land last within their groups.
  const closureLeaf = "_docs/_TASKS/TASK-540-06-L01-Six-Builder-Save-Entry-Flows-And-Closure.md";
  const closureChild = "_docs/_TASKS/TASK-540-06-Tests-Smoke-And-Closure.md";
  expect(
    consumer.indexOf(
      "_docs/_TASKS/TASK-540-07-L02-Preserve-Browser-Failure-Frames-For-Registered-Unit-Actions.md"
    )
  ).toBeLessThan(consumer.indexOf(closureLeaf));
  expect(
    consumer.indexOf(
      "_docs/_TASKS/TASK-540-07-Smoke-Option-Selector-And-First-Failure-Reporting.md"
    )
  ).toBeLessThan(consumer.indexOf(closureChild));
});

test("the consumer derives every status count from its own target array", () => {
  const consumer = frozenStringArray(
    orchestratorSource,
    "STATUS_TARGET_RELATIVE_PATHS",
    isTaskDocPath
  );

  // The literals these replaced are the whole defect, so their absence is asserted.
  expect(orchestratorSource).toContain(
    "const STATUS_TARGET_COUNT = STATUS_TARGET_RELATIVE_PATHS.length;"
  );
  expect(orchestratorSource).toContain(
    "const STATUS_BOARD_TARGET_INDEX = STATUS_TARGET_COUNT - 1;"
  );
  expect(orchestratorSource).toContain("manifest.targets.length === STATUS_TARGET_COUNT,");
  expect(orchestratorSource).not.toContain("manifest.targets.length === 18,");
  expect(orchestratorSource).not.toContain("index < 18;");
  expect(orchestratorSource).not.toContain("length: 18 }");
  expect(orchestratorSource).not.toContain("let index = 17;");
  // The payload/temp filename grammars capped admissible indices at 17.
  expect(orchestratorSource).not.toContain("(?:[0-9]|1[0-7])");
  expect(orchestratorSource).toContain("STATUS_JOURNAL_INDEX_PATTERN");

  // And the derived grammar must actually admit every real index, including the last.
  const indexPattern =
    "(?:" + Array.from({ length: consumer.length }, (_, index) => String(index)).join("|") + ")";
  const journalName = new RegExp(
    "^(?:status\\.(?:manifest|prepared|rollback-prepared|committed)\\.json|(?:old|new)-" +
      indexPattern +
      "\\.bin)$",
    "u"
  );
  expect(journalName.test("old-" + String(consumer.length - 1) + ".bin")).toBe(true);
  expect(journalName.test("new-" + String(consumer.length - 1) + ".bin")).toBe(true);
  expect(journalName.test("old-" + String(consumer.length) + ".bin")).toBe(false);
});
