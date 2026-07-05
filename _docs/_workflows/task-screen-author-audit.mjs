export const meta = {
  name: "task-screen-author-audit",
  description:
    "Generic single-task author + drift-audit (parameterized via args). One run per task — authors ONE board task contract (parent + subtasks) grounded in prototype + current source, then a 6-round drift-audit loop over that task's own files. Authored in the main tree; implementation happens later on a per-task worktree.",
  phases: [
    { title: "Author" },
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

// args may arrive as an object or as a JSON string depending on how it was passed.
const T = typeof args === "string" ? JSON.parse(args) : args; // { id, slug, title, changelog, proto, admin, spec }
if (!T || !T.id)
  throw new Error(
    "args must be a task descriptor { id, slug, title, changelog, proto, admin, spec }"
  );

const PRINCIPLES = `
OWNER MANDATES (apply throughout):
- MAXIMUM configuration flexibility for the end user.
- UI/UX must match the PROTOTYPE — read prototype SOURCE (not just screenshots), reproduce layout/structure/tokens faithfully, then adapt/extend functionality. No conservative fallbacks that keep the old look.
- New controls integrated into the prototype UI/UX cleanly and tastefully.
- Extend the DB schema/model where the prototype/feature implies missing fields — full migration artifacts (SQL + snapshot + journal) when DDL is needed.
- Full functionality, not a cosmetic shell.
`;

const COMMON = `
You work EXCLUSIVELY inside ${WT} (branch feature/tasks). Author task CONTRACTS only — do NOT edit source code, and do NOT edit _docs/_TASKS/README.md or _docs/_CHANGELOG/* (the orchestrator adds board rows). Implementation happens later on a separate worktree.
This run is SCOPED TO TASK-${T.id} ONLY. Do not create or edit any other task's files.
Ground EVERY anchor against REAL source: prototype screen source under ${PROTO} AND the current admin implementation + service/route/schema. Verify paths/component names/route shapes/schema columns before writing them; correct wrong assumptions explicitly. rg misdetects large TSX as binary — use grep -an / Read; never trust an empty rg.
LIVE ENVIRONMENT (running now — use it, don't just read source):
- The PROTOTYPE is running live at http://localhost:5180/ (hash router — screens live under /#/..., e.g. #/media, #/analytics, #/advanced/engine, #/advanced/entries, #/backups, #/settings, #/advanced/forms). This is the visual source of truth.
- The current app is running via coderso-dev-core-host: admin SPA at http://coderso-a.localhost:5173/admin/ (login with ADMIN_EMAIL/ADMIN_PASSWORD from ${WT}/.env), public front at http://coderso-a.localhost:3000/ (and :5174).
- Use \`playwright-cli\` with a UNIQUE task-scoped session (\`-s=wf${T.id}author\`) to OPEN the matching prototype screen at :5180 AND the current admin screen at :5173 and VISUALLY COMPARE them (layout, structure, controls, tokens, spacing) — this is required in addition to reading source, so the gap analysis is real, not guessed. Save comparison screenshots to ${WT}/_docs/_workflows/_smoke/ (e.g. wf${T.id}-proto-*.png / wf${T.id}-admin-*.png). Default chromium (no --browser=chrome). Close your session when done.
Contract-quality (AGENTS.md): parent ${"`TASK-###_Short_Title.md`"} + hyphen-slug child ${"`TASK-###-NN-Title.md`"}; canonical **Status:** ⏳ To Do; parent linkage fields; execution-ready pseudocode per subtask (helper/function shape, data flow, error handling, regression-test shape); **Security Contract** subsection for route-touching subtasks; correct test lanes (Bun runtime/route/Bun.serve/DB, Vitest Bun-free pure + admin/UI); schema-first reject-unknown + normalize*; new validated keys join allowlist + round-trip test; present-only/byte-identity for new optional fields where applicable; admin cache contract for new cached resources; DB changes ship full migration artifacts; single-writer file ownership across this task's subtasks; strictly sequential land order.
${PRINCIPLES}
`;

const AUTHOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "taskId",
    "filesWritten",
    "protoGaps",
    "schemaExtensions",
    "touchesSharedSourceFiles",
    "openQuestions",
  ],
  properties: {
    taskId: { type: "string" },
    filesWritten: {
      type: "array",
      items: { type: "string" },
      description: "task filenames created (parent + subtasks)",
    },
    protoGaps: { type: "array", items: { type: "string" } },
    schemaExtensions: { type: "array", items: { type: "string" } },
    touchesSharedSourceFiles: {
      type: "array",
      items: { type: "string" },
      description: "source files this task plans to edit that OTHER screens/tasks might also touch",
    },
    openQuestions: { type: "array", items: { type: "string" } },
  },
};

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

// ---- AUTHOR ----
phase("Author");
const authorPrompt = `You are a fresh-context AUTHOR for TASK-${T.id} — "${T.title}". Create the board contract in ${TASKS_DIR}: parent ${T.slug}.md + hyphen-slug subtask files (TASK-${T.id}-NN-*.md) for substantial pieces. Write ONLY TASK-${T.id}* files.
${COMMON}
Pinned changelog (closure only): ${T.changelog}.
Prototype source to study: ${T.proto}
Current admin/source to compare + extend: ${T.admin}
Scope: ${T.spec}
Do a REAL prototype-vs-current gap analysis first: read BOTH sides' source AND visually compare the LIVE prototype screen (:5180) vs the LIVE current admin screen (:5173) with playwright-cli (session -s=wf${T.id}author, screenshots to _docs/_workflows/_smoke/). Then author an execution-ready contract: parent (goal, gap summary, schema-extension plan, subtask breakdown, coordination/changelog pin, sequential land order) + subtask files (owning modules single-writer, Security Contract where routes are touched, pseudocode grounded in real code, testing requirements + lanes + shared-DB safety, UI/UX-fidelity + max-config-flexibility notes). Report filesWritten, protoGaps, schemaExtensions, touchesSharedSourceFiles, openQuestions.`;
let authorRes = null;
for (let attempt = 1; attempt <= 3 && !authorRes; attempt++) {
  authorRes = await agent(authorPrompt, {
    label: "author:" + T.id + (attempt > 1 ? ":retry" + attempt : ""),
    phase: "Author",
    schema: AUTHOR_SCHEMA,
  });
}
if (!authorRes) return { taskId: T.id, pass: false, error: "author agent returned null" };
const FILES = (authorRes.filesWritten || []).filter((f) => /^TASK-/.test(f));
log(
  "TASK-" +
    T.id +
    " authored " +
    FILES.length +
    " files; " +
    (authorRes.openQuestions || []).length +
    " open Qs; " +
    (authorRes.schemaExtensions || []).length +
    " schema ext"
);

// ---- DRIFT-AUDIT LOOP (within this task) ----
const auditPrompt = (
  file,
  round
) => `Fresh-context READ-ONLY drift auditor (round ${round}) for TASK-${T.id}. Do NOT edit.
${COMMON}
Audit the task file ${file} in ${TASKS_DIR} against the real prototype + current source. Verify anchors real, pseudocode execution-ready, prototype-fidelity + max-config-flexibility reflected, schema extensions have full migration-artifact plans, Security Contract present/correct for route work, test lanes right, single-writer ownership, land order, changelog ${T.changelog} only in closure. Report findings; empty + summary if clean.`;
const reconcilePrompt = (
  round
) => `Fresh-context READ-ONLY within-task RECONCILE auditor (round ${round}) for TASK-${T.id}. Do NOT edit.
${COMMON}
Read ALL TASK-${T.id}* files in ${TASKS_DIR}. Check ONLY cross-file contradictions WITHIN this task: single-writer ownership (no source file claimed by two of this task's subtasks), identical shared type/enum/route shapes across its subtasks, helper names consumers reference vs owners define, consistent land order, changelog ${T.changelog} only in closure scope, test-file names promised vs delivered. Report each contradiction naming BOTH files.`;
const fixerPrompt = (
  file,
  findings,
  round
) => `Drift FIXER (round ${round}) for TASK-${T.id}. Edit ONLY ${file} in ${TASKS_DIR}. Never touch source, other files, README, changelog.
${COMMON}
Fix these HIGH/MEDIUM findings, verifying corrected anchors against real source first: ${JSON.stringify(findings)}. Report fixed + rejected.`;
const crossFixerPrompt = (findings, round) =>
  `CROSS-FILE fixer (round ${round}) for TASK-${T.id}. Edit any TASK-${T.id}* file in ${TASKS_DIR} (nothing else). Owner subtask's definition is source of truth; align consumers. Verify against real source. Findings: ${JSON.stringify(findings)}. Report changes + rejections.`;
const wholeSetPrompt = (
  residual
) => `Fresh READ-ONLY whole-set auditor for TASK-${T.id} (residual). Unresolved: ${JSON.stringify(residual)}.
${COMMON}
Read ALL TASK-${T.id}* files as one set; name residual contradictions precisely (file, to what, why). Return only findings that still hold.`;

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
    log("TASK-" + T.id + " round " + round + ": " + missing + " null audits — VOID, retry");
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
      T.id +
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
  taskId: T.id,
  pass: genuinePass && residual.length === 0,
  filesWritten: FILES,
  protoGaps: authorRes.protoGaps,
  schemaExtensions: authorRes.schemaExtensions,
  touchesSharedSourceFiles: authorRes.touchesSharedSourceFiles,
  openQuestions: authorRes.openQuestions,
  rounds,
  residualFindings: residual,
};
