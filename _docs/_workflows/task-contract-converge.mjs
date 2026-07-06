export const meta = {
  name: "task-contract-converge",
  description:
    "LIGHT convergence for an oscillated task contract (args {id, files}): fresh whole-set read-only audit names residual HIGH/MED (cross-file + per-file, grounded in prototype + source), ONE surgical cross-file fixer applies them, then a fresh reconcile re-verifies. Up to 2 fix iterations, then reports residual. Far lighter than the 6-round per-file loop that oscillated.",
  phases: [{ title: "Converge" }],
};

const A = typeof args === "string" ? JSON.parse(args) : args;
if (!A || !A.id) throw new Error("args must be { id, files }");
const WT = A.wt || "/home/coder/project/Coderso";
const TASKS_DIR = WT + "/_docs/_TASKS";
const PROTO = "/home/coder/project/Coderso/_docs/_PROTOTYPE/src";
const PIN_NOTE = A.note ? "\nPINNED (orchestrator, do NOT change): " + A.note : "";
const FILES = (Array.isArray(A.files) ? A.files : String(A.files || "").split(","))
  .map((s) => s.trim())
  .filter(Boolean);
if (!FILES.length) throw new Error("args.files required");

const COMMON = `
You work in ${WT} (branch feature/tasks), CONTRACT-QA for TASK-${A.id}. Edit ONLY TASK-${A.id}* files in ${TASKS_DIR}; never source, README, or _CHANGELOG. This task's per-file audit loop OSCILLATED (didn't cleanly converge) — your job is to name + fix the RESIDUAL cross-file/per-file contradictions surgically so the contract is genuinely implementation-ready.
Ground anchors against REAL source (current admin/service/route/schema) AND the LIVE prototype (http://localhost:5180/ hash-router, no auth) via playwright-cli (session -s=wf${A.id}conv) — the prototype is the source of truth; verify the contract targets it faithfully. rg misdetects large TSX — use grep -an/Read.
Files: ${FILES.join(", ")}.${PIN_NOTE}
Bar (AGENTS.md): execution-ready pseudocode; Security Contract for route-touching subtasks; correct test lanes; schema-first reject-unknown + normalize*; new validated keys join allowlist + round-trip test; single-writer/explicit-region ownership; strictly sequential land order; changelog number only in closure; FULL migration artifacts (SQL+snapshot+journal) with a concrete NON-COLLIDING index.
`;

const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings", "summary"],
  properties: {
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "area", "file", "finding", "evidence", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          area: { type: "string" },
          file: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
};
const FIX_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["fixed", "skipped", "summary"],
  properties: {
    summary: { type: "string" },
    fixed: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["file", "what"],
        properties: { file: { type: "string" }, what: { type: "string" } },
      },
    },
    skipped: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["finding", "reason"],
        properties: { finding: { type: "string" }, reason: { type: "string" } },
      },
    },
  },
};

async function run(prompt, opts) {
  for (let i = 0; i < 3; i++) {
    const r = await agent(prompt, opts);
    if (r) return r;
  }
  return null;
}
const auditPrompt = (n) =>
  `Fresh READ-ONLY whole-set auditor (pass ${n}) for TASK-${A.id}. Do NOT edit.\n${COMMON}\nRead ALL of ${FILES.join(", ")} as ONE set + ground against source/prototype. Report EVERY remaining HIGH/MEDIUM contradiction or contract gap (per-file anchor errors, cross-file inconsistency, missing pseudocode/Security-Contract, migration-index collision, prototype-fidelity misses). Empty findings + summary if genuinely implementation-ready.`;
const fixPrompt = (findings, n) =>
  `Surgical CROSS-FILE fixer (pass ${n}) for TASK-${A.id}. Edit any of ${FILES.join(", ")} (nothing else).\n${COMMON}\nApply these residual findings; owner subtask's definition is source of truth; verify corrected anchors against real source first. Findings: ${JSON.stringify(findings)}. Report fixed + rejected (with evidence).`;

phase("Converge");
let residual = [];
let pass = false;
const passes = [];
for (let n = 1; n <= 3 && !pass; n++) {
  const audit = await run(auditPrompt(n), {
    label: "verify:" + n,
    phase: "Converge",
    schema: AUDIT_SCHEMA,
  });
  if (!audit) {
    residual = [
      {
        severity: "HIGH",
        area: "infra",
        file: "(loop)",
        finding: "audit null (limit)",
        evidence: "",
        recommendation: "rerun",
      },
    ];
    break;
  }
  const hm = (audit.findings || []).filter((f) => f.severity !== "LOW");
  passes.push({ pass: n, highMed: hm.length });
  residual = hm;
  if (!hm.length) {
    pass = true;
    break;
  }
  if (n === 3) break; // out of fix budget; report residual
  await agent(fixPrompt(hm, n), { label: "fix:" + n, phase: "Converge", schema: FIX_SCHEMA });
}

return { taskId: A.id, pass, passes, residualFindings: residual };
