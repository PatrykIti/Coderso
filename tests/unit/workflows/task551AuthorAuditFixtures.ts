import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { TASK551_PHASE_IMPORT_CLOSURE } from "../../../_docs/_workflows/lib/task-551-contract.mjs";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const ALL_PHASES = ["sidecar", "l01", "l03", "l04", "l02", "05-l02"] as const;
export function fullDiscovery(): Record<string, string[]> {
  const discovered: Record<string, string[]> = {};
  for (const phase of ALL_PHASES) {
    discovered[phase] = [...TASK551_PHASE_IMPORT_CLOSURE.get(phase)!];
  }
  return discovered;
}
export type Finding = {
  severity: "HIGH" | "MEDIUM" | "LOW";
  area: string;
  finding: string;
  evidence: string;
};
export function completed(findings: Finding[] = []) {
  return { status: "completed" as const, findings };
}
export const lowFinding: Finding = {
  severity: "LOW",
  area: "docs",
  finding: "minor wording drift",
  evidence: "_docs/_TASKS/TASK-551.md:42",
};
export const highFinding: Finding = {
  severity: "HIGH",
  area: "ownership",
  finding: "two writers own one file",
  evidence: "scripts/task-551-database-baseline.ts:17",
};

export async function uniqueTempDir(label: string): Promise<string> {
  return mkdtemp(path.join(tmpdir(), `task551-author-audit-${label}-`));
}
export async function currentTask551DispatchSnapshot() {
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
