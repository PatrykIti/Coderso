export const meta = {
  name: "task-drift-audit-only",
  description:
    "Drift-audit-only pass over an already-authored task's on-disk files (parameterized via args: {id, files}). Runs the per-file drift audits that were skipped when authors reported filesWritten:[] — per-file grounding audits + within-task reconcile + fixers, 6-round loop with false-clean guard + residual protocol. Read-only on source; edits only this task's contract files.",
  phases: [
    { title: "Round 1" },
    { title: "Round 2" },
    { title: "Round 3" },
    { title: "Round 4" },
    { title: "Round 5" },
    { title: "Round 6" },
    { title: "Residual" },
  ],
};

const WT = "/home/coder/project/Coderso";
const TASKS_DIR = WT + "/_docs/_TASKS";
const PROTO = WT + "/_docs/_PROTOTYPE/src";

const A = typeof args === "string" ? JSON.parse(args) : args; // { id, files: [...] | "a.md,b.md" }
if (!A || !A.id) throw new Error("args must be { id, files }");
const FILES = (Array.isArray(A.files) ? A.files : String(A.files || "").split(","))
  .map((s) => s.trim())
  .filter(Boolean);
if (!FILES.length) throw new Error("args.files must list this task's files");

const COMMON = `
You work EXCLUSIVELY inside ${WT} (branch feature/tasks). This is a CONTRACT-QA pass for TASK-${A.id} — verify/repair task CONTRACTS only. Do NOT edit source code, _docs/_TASKS/README.md, or _docs/_CHANGELOG/*.
Ground EVERY anchor against REAL source: prototype screen source under ${PROTO} AND the current admin implementation + service/route/schema. Verify file paths/component names/route shapes/schema columns/migration indices before trusting them; rg misdetects large TSX as binary — use grep -an / Read, never trust an empty rg.
LIVE VISUAL VERIFICATION (mandatory for screen-describing files): the PROTOTYPE is the SOURCE OF TRUTH and everything must end up EXACTLY as in the prototype. Open the matching prototype screen at http://localhost:5180/ (hash router /#/..., no auth) with playwright-cli (unique session -s=wf${A.id}audit, screenshots to ${WT}/_docs/_workflows/_smoke/) and VISUALLY verify that this task's gap analysis + target description capture the prototype layout/structure/controls/tokens FAITHFULLY and COMPLETELY — flag anything the contract misses or misstates vs what the prototype actually shows. Ground the CURRENT implementation in CODE (source is authoritative for what exists today; admin login at :5173 may be captcha/rate-limited under load, so do NOT depend on it — read the current admin/service/route/schema source). The contract must describe, per element, what the prototype shows and how the current code differs + what to change.
Contract-quality bar (AGENTS.md): execution-ready pseudocode per subtask (helper/function shape, data flow, error handling, regression-test shape); Security Contract subsection for route-touching subtasks; correct test lanes (Bun runtime/route/Bun.serve/DB; Vitest Bun-free pure + admin/UI); schema-first reject-unknown + normalize*; new validated keys join allowlist + round-trip test; present-only/byte-identity for new optional fields; admin cache contract for new cached resources; DB changes ship FULL migration artifacts (SQL + snapshot + journal); single-writer (or explicit per-region) file ownership; strictly sequential land order; changelog number only in the closure subtask.
The task must be COMPLETE and implementation-ready — hold it to that bar.
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

async function runAudit(prompt, opts) {
  for (let i = 0; i < 3; i++) {
    const r = await agent(prompt, opts);
    if (r) return r;
  }
  return null;
}

const auditPrompt = (
  file,
  round
) => `Fresh-context READ-ONLY drift auditor (round ${round}) for TASK-${A.id}. Do NOT edit.
${COMMON}
Deep-audit the task file ${file} in ${TASKS_DIR}: is every anchor (prototype + current source) REAL and correctly located? Is the pseudocode execution-ready (helper/function shapes, data flow, error handling, regression-test shape)? Are prototype-fidelity + max-config-flexibility mandates reflected? Do schema extensions carry FULL migration-artifact plans with a concrete (non-colliding) index? Is the Security Contract present/correct for route work? Correct test lanes? Report findings (empty + summary if clean; name the source files you actually opened to ground it).`;
const reconcilePrompt = (
  round
) => `Fresh-context READ-ONLY within-task RECONCILE auditor (round ${round}) for TASK-${A.id}. Do NOT edit.
${COMMON}
Read ALL of: ${FILES.join(", ")} (in ${TASKS_DIR}). Check cross-file contradictions WITHIN this task: single-writer / explicit-per-region ownership (no ambiguous double-write of a source file), identical shared type/enum/route/migration-index values across subtasks, helper names consumers reference vs owners define, consistent land order, changelog number only in closure scope, test-file names promised vs delivered. Report each contradiction naming BOTH files.`;
const fixerPrompt = (
  file,
  findings,
  round
) => `Drift FIXER (round ${round}) for TASK-${A.id}. Edit ONLY ${file} in ${TASKS_DIR}. Never touch source, other files, README, changelog.
${COMMON}
Fix these HIGH/MEDIUM findings, verifying corrected anchors against real source first: ${JSON.stringify(findings)}. Report fixed + rejected (with evidence).`;
const crossFixerPrompt = (findings, round) =>
  `CROSS-FILE fixer (round ${round}) for TASK-${A.id}. Edit any of ${FILES.join(", ")} in ${TASKS_DIR} (nothing else). Owner subtask's definition is source of truth; align consumers. Verify against real source. Findings: ${JSON.stringify(findings)}. Report changes + rejections.`;
const wholeSetPrompt = (
  residual
) => `Fresh READ-ONLY whole-set auditor for TASK-${A.id} (residual). Unresolved: ${JSON.stringify(residual)}.
${COMMON}
Read ALL of ${FILES.join(", ")} as one set; name residual contradictions precisely (file, to what, why). Return only findings that still hold.`;

const rounds = [];
let residual = [];
let genuinePass = false;

for (let round = 1; round <= 6 && !genuinePass; round++) {
  const phaseName = "Round " + round;
  const results = await parallel([
    ...FILES.map(
      (f) => () =>
        runAudit(auditPrompt(f, round), {
          label: "audit:" + f.replace(/\.md$/, "").slice(-18),
          phase: phaseName,
          schema: AUDIT_SCHEMA,
        })
    ),
    () =>
      runAudit(reconcilePrompt(round), {
        label: "audit:reconcile",
        phase: phaseName,
        schema: AUDIT_SCHEMA,
      }),
  ]);
  const fileAudits = results.slice(0, FILES.length);
  const recon = results[FILES.length];
  const missing = results.filter((r) => !r).length;
  const hmOf = (r) => ((r && r.findings) || []).filter((f) => f.severity !== "LOW");
  const fileHM = fileAudits.flatMap((r) => hmOf(r));
  const reconHM = hmOf(recon);
  const total = fileHM.length + reconHM.length;
  rounds.push({ round, highMed: total, crossFile: reconHM.length, missingAudits: missing });
  if (missing > 0) {
    log("TASK-" + A.id + " round " + round + ": " + missing + " null audits — VOID, retry");
    residual = [
      {
        severity: "HIGH",
        area: "infra",
        file: "(loop)",
        finding: "missing audits",
        evidence: String(missing),
        recommendation: "rerun",
      },
    ];
    continue;
  }
  log(
    "TASK-" +
      A.id +
      " round " +
      round +
      ": " +
      total +
      " HIGH/MED (" +
      reconHM.length +
      " cross-file)"
  );
  residual = [...fileHM, ...reconHM];
  if (total === 0) {
    genuinePass = true;
    break;
  }
  const fixThunks = [];
  FILES.forEach((f, i) => {
    const ff = hmOf(fileAudits[i]);
    if (ff.length)
      fixThunks.push(() =>
        agent(fixerPrompt(f, ff, round), {
          label: "fix:" + f.replace(/\.md$/, "").slice(-14),
          phase: phaseName,
          schema: FIX_SCHEMA,
        })
      );
  });
  if (fixThunks.length) await parallel(fixThunks);
  if (reconHM.length)
    await agent(crossFixerPrompt(reconHM, round), {
      label: "fix:cross",
      phase: phaseName,
      schema: FIX_SCHEMA,
    });
}

phase("Residual");
let extra = 0;
while (!genuinePass && residual.length && extra < 2) {
  extra++;
  const whole = await runAudit(wholeSetPrompt(residual), {
    label: "residual:audit:" + extra,
    phase: "Residual",
    schema: AUDIT_SCHEMA,
  });
  if (!whole) {
    residual = [
      {
        severity: "HIGH",
        area: "infra",
        file: "(residual)",
        finding: "null",
        evidence: "limit",
        recommendation: "rerun",
      },
    ];
    break;
  }
  const hm = (whole.findings || []).filter((f) => f.severity !== "LOW");
  if (!hm.length) {
    residual = [];
    genuinePass = true;
    break;
  }
  await agent(crossFixerPrompt(hm, "residual-" + extra), {
    label: "residual:fix:" + extra,
    phase: "Residual",
    schema: FIX_SCHEMA,
  });
  const final = await runAudit(reconcilePrompt("final-" + extra), {
    label: "residual:reconcile:" + extra,
    phase: "Residual",
    schema: AUDIT_SCHEMA,
  });
  if (!final) {
    residual = [
      {
        severity: "HIGH",
        area: "infra",
        file: "(residual)",
        finding: "null",
        evidence: "limit",
        recommendation: "rerun",
      },
    ];
    break;
  }
  residual = (final.findings || []).filter((f) => f.severity !== "LOW");
  if (!residual.length) genuinePass = true;
}

return {
  taskId: A.id,
  pass: genuinePass && residual.length === 0,
  files: FILES,
  rounds,
  residualFindings: residual,
};
