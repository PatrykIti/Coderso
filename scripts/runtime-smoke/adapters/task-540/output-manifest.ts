import { resolveInsideRoot, type SmokeInput } from "../../contracts";

/**
 * Canonical report evidence root for TASK-540. The shared runner writes
 * `report.json` under `evidence/task-540/<session>/`; the suite's screenshot
 * paths stay adapter-owned (13 flat PNGs declared by the native plan).
 */
export const EVIDENCE_ROOT = "_docs/_workflows/_smoke/evidence/task-540";

export function task540EvidenceDirectory(input: SmokeInput, root: string): string {
  return resolveInsideRoot(root, `${EVIDENCE_ROOT}/${input.session}`, "task_540_evidence");
}
