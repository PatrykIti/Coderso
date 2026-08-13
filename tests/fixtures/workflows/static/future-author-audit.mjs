// Valid canonical future author-audit workflow fixture. The static gate
// classifies this entry by its task-###-(author-audit|implement|fix) filename
// pattern and requires a REAL import and call of the canonical audit-rounds
// driver: a comment or a numeric literal can never satisfy the gate.
import { runCanonicalAuditRounds } from "./lib/audit-rounds.mjs";

const GROUPS = Object.freeze([
  Object.freeze({ repoRelativePath: "_docs/_TASKS/TASK-777.md" }),
]);

async function main() {
  const drift = await runCanonicalAuditRounds({
    maximumFixPasses: 1,
    groups: GROUPS,
    auditFile: async () => ({ pass: true, summary: "clean", findings: [] }),
    reconcile: async () => ({ pass: true, summary: "clean", findings: [] }),
    fix: async () => {
      throw new Error("read-only contract audit has no fixer");
    },
    fingerprint: async () => "revision",
    fingerprintUniverse: async () => "universe",
    fingerprintEveryScope: async () => ({}),
    label: "task-777:author-audit",
  });
  if (!drift.pass) throw new Error("task_777_audit_not_converged");
}

await main();
