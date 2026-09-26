// TASK-551-11 dispatch-contract byte-cap tests (single owner: TASK-551-11 sidecar).
// Lane convention for tests/unit/workflows/* is Bun (`bun test`). These tests
// read the live task files and the dispatch sources; they write nothing.
import { describe, expect, test } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import { preflightTask551AuthorAuditDispatch } from "../../../_docs/_workflows/task-551-author-audit.mjs";

const LIVE_03_L02_SUFFIX = "TASK-551-03-L02-Bounded-Admin-Lists-And-Oversized-Service-Splits.md";
const TASK_FILE_CAP_BYTES = 1_048_576;

async function currentTask551DispatchSnapshot() {
  const taskDirectory = new URL("../../../_docs/_TASKS/", import.meta.url);
  const names = (await readdir(taskDirectory))
    .filter((name) => /^TASK-551(?:[-_].*)?\.md$/u.test(name))
    .sort();
  return {
    sourceHead: "7bc41f75b9de972ce3ee4d794cf5fce14e08c5cb",
    taskFiles: await Promise.all(
      names.map(async (name) => ({
        path: `_docs/_TASKS/${name}`,
        text: await readFile(new URL(name, taskDirectory), "utf8"),
      }))
    ),
  };
}
type DispatchSnapshot = Awaited<ReturnType<typeof currentTask551DispatchSnapshot>>;
function padTask551TaskFileToBytes(
  snapshot: DispatchSnapshot,
  suffix: string,
  bytes: number
): DispatchSnapshot {
  const entry = snapshot.taskFiles.find((file) => file.path.endsWith(suffix));
  if (entry === undefined) throw new Error(`pad target missing: ${suffix}`);
  const padding = bytes - Buffer.byteLength(entry.text, "utf8") - 1;
  if (padding < 0) throw new Error(`pad target already exceeds ${bytes} bytes: ${suffix}`);
  const text = `${entry.text}\n${"x".repeat(padding)}`;
  return {
    ...snapshot,
    taskFiles: snapshot.taskFiles.map((file) => (file === entry ? { ...file, text } : file)),
  };
}
async function readDispatchSource(name: string): Promise<string> {
  return readFile(new URL(`../../../_docs/_workflows/lib/${name}`, import.meta.url), "utf8");
}

describe("dispatch contract task-file byte cap", () => {
  test("accepts a task file of exactly 1,048,576 UTF-8 bytes and pins the cap literal", async () => {
    const primitives = await readDispatchSource("task-551-dispatch-primitives.mjs");
    expect(
      [...primitives.matchAll(/^export const TASK551_MAX_TASK_FILE_BYTES = 1024 \* 1024;$/gmu)]
        .length
    ).toBe(1);
    for (const name of ["task-551-dispatch-contract.mjs", "task-551-dispatch-envelope.mjs"])
      expect(await readDispatchSource(name)).not.toContain("TASK551_MAX_TASK_FILE_BYTES =");
    const snapshot = await currentTask551DispatchSnapshot();
    const live = preflightTask551AuthorAuditDispatch(snapshot);
    const padded = padTask551TaskFileToBytes(snapshot, LIVE_03_L02_SUFFIX, TASK_FILE_CAP_BYTES);
    const entry = padded.taskFiles.find((file) => file.path.endsWith(LIVE_03_L02_SUFFIX));
    expect(Buffer.byteLength(entry?.text ?? "", "utf8")).toBe(TASK_FILE_CAP_BYTES);
    expect(preflightTask551AuthorAuditDispatch(padded).inventory).toEqual(live.inventory);
  });

  test("rejects a task file of 1,048,577 UTF-8 bytes", async () => {
    const snapshot = await currentTask551DispatchSnapshot();
    const padded = padTask551TaskFileToBytes(snapshot, LIVE_03_L02_SUFFIX, TASK_FILE_CAP_BYTES + 1);
    const entry = padded.taskFiles.find((file) => file.path.endsWith(LIVE_03_L02_SUFFIX));
    expect(Buffer.byteLength(entry?.text ?? "", "utf8")).toBe(TASK_FILE_CAP_BYTES + 1);
    expect(() => preflightTask551AuthorAuditDispatch(padded)).toThrow(
      /task551_dispatch_snapshot_file_text/
    );
  });

  test("accepts the live 03-L02 task file", async () => {
    const snapshot = await currentTask551DispatchSnapshot();
    const entry = snapshot.taskFiles.find((file) => file.path.endsWith(LIVE_03_L02_SUFFIX));
    expect(entry).toBeDefined();
    expect(Buffer.byteLength(entry?.text ?? "", "utf8")).toBeLessThanOrEqual(TASK_FILE_CAP_BYTES);
    const plan = preflightTask551AuthorAuditDispatch(snapshot);
    expect(plan.inventory.taskFileCount).toBe(snapshot.taskFiles.length);
  });
});
