export const meta = {
  name: "task-484-author-audit",
  description:
    "TASK-484 drift-audit loop: 5 sequential rounds of per-subtask audits + cross-subtask reconcile + fixers, then residual protocol",
  phases: [
    { title: "Round 1" },
    { title: "Round 2" },
    { title: "Round 3" },
    { title: "Round 4" },
    { title: "Round 5" },
    { title: "Residual" },
  ],
};

const WT = "/home/coder/project/Coderso-task-484";
const TREE = "TASK-484";
const TASKS_DIR = WT + "/_docs/_TASKS";

const GROUPS = [
  { id: "parent", files: ["TASK-484_Backups_Scheduler_Retention_Restore_And_Remote_Storage.md"] },
  {
    id: "484-01",
    files: [
      "TASK-484-01-Schema-And-Schedule-Run-Metadata.md",
      "TASK-484-01-L01-Backup-Schedule-Run-Metadata-Columns.md",
      "TASK-484-01-L02-Next-Run-Calculator-And-Schedule-Wiring.md",
    ],
  },
  {
    id: "484-02",
    files: [
      "TASK-484-02-Scheduler-And-Worker.md",
      "TASK-484-02-L01-In-Process-Backup-Scheduler-Job.md",
      "TASK-484-02-L02-Scheduler-Tests.md",
    ],
  },
  {
    id: "484-03",
    files: [
      "TASK-484-03-Retention-Pruning.md",
      "TASK-484-03-L01-Retention-Prune-Service.md",
      "TASK-484-03-L02-Retention-Route-And-Tests.md",
    ],
  },
  {
    id: "484-04",
    files: [
      "TASK-484-04-Restore-Implementation.md",
      "TASK-484-04-L01-Restore-From-Artifact.md",
      "TASK-484-04-L02-Restore-Route-Hardening-And-Tests.md",
    ],
  },
  {
    id: "484-05",
    files: [
      "TASK-484-05-Remote-Artifact-Storage.md",
      "TASK-484-05-L01-Remote-Artifact-Upload.md",
      "TASK-484-05-L02-Remote-Storage-Tests.md",
    ],
  },
  {
    id: "484-06",
    files: [
      "TASK-484-06-Storage-Usage-Docs-And-Closure.md",
      "TASK-484-06-L01-Storage-Usage-Source-And-Surface.md",
      "TASK-484-06-L02-Docs-Gates-And-Closure.md",
    ],
  },
];

const PINS = `
PINNED COORDINATION FACTS for the TASK-484 stream (task files must state these; a missing or contradicting pin is a HIGH finding):
- Pinned changelog number: 1222 (closure creates _docs/_CHANGELOG/1222-*.md). Numbers 1219 (TASK-510, in flight in the shared main tree — may be absent from this worktree's checkout, do NOT reallocate it), 1220 (TASK-482) and 1221 (TASK-483) are RESERVED by parallel streams.
- Pinned migration index: 0065 — NOT 0064. The current max migration in this worktree is 0063_yummy_glorian.sql, but the parallel TASK-483 stream OWNS 0064 (analytics tables) and merges FIRST. Sync precondition (must be stated in 484-01): before TASK-484-01 authors its migration and runs db:migrate, the orchestrator syncs TASK-483's 0064 artifacts (SQL + meta/0064_snapshot.json + meta/_journal.json entry) into this worktree so the journal stays gapless; 484's own artifacts are 0065_*.sql + meta/0065_snapshot.json + journal entry idx 65. Any 484 file claiming index 0064 is a HIGH finding.
- Parallel streams: TASK-482 (setup wizard, worktree /home/coder/project/Coderso-task-482) and TASK-483 (analytics, /home/coder/project/Coderso-task-483) run concurrently on sibling branches. FORBIDDEN PATHS for TASK-484: core/services/analytics/** (traffic files), analytics route modules, core/admin/ui/setup/**, auth/install route surfaces, usersService first-admin logic.
- Shared surfaces that all three streams touch ADDITIVELY (contracts must scope edits to their own sections/lines and must not restructure): the server route registration module (verify its real filename in this worktree), the security-gate test expectations under tests/security/, _docs/CMS_API.md, _docs/SECURITY_SPEC.md, _docs/DATA_MODEL.md (483 and 484 both add sections — own section only), core/db/schema.ts (484 touches ONLY backup_schedules/backups tables; 483 separately adds analytics tables — 484 files must not reserve or restructure anything beyond its own additions).
- Shared REMOTE test database: all three streams and the owner share ONE Postgres (render.com, DATABASE_URL in .env). All DB-backed test contracts must use uniquely scoped fixtures and clean up only rows they created; truncating/deleting whole shared tables is a HIGH finding. Scheduler tests must not leave enabled schedules or advisory locks behind; restore tests must NEVER restore over the shared DB destructively (use scoped dry-run seams / fixture-scoped targets).
- RESTORE IS DESTRUCTIVE: the restore contract must require explicit confirmation semantics, RBAC + CSRF on the admin route, fail-closed validation of the artifact before any write, and a transactional/rollback-safe path. A contract allowing unconfirmed or partial destructive restore is HIGH.
- Board/changelog discipline: ONLY the closure leaf (TASK-484-06-L02) edits _docs/_TASKS/README.md and _docs/_CHANGELOG/*; it touches only TASK-484 rows and its own statistics deltas. Implementation subtasks never touch them.
- Land order: 01 -> 02 -> 03 -> 04 -> 05 -> 06, strictly sequential, single writer per source file.
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
          file: { type: "string", description: "task filename the finding is about" },
          finding: { type: "string" },
          evidence: {
            type: "string",
            description: "file:line references in task file and/or source",
          },
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

const COMMON = `
You work EXCLUSIVELY inside the git worktree ${WT} (branch feature/task-484, HEAD fbe93dae). Never read from or write to /home/coder/project/Coderso or the sibling task-482/task-483 worktrees.
The task files were authored 2026-06-28 against an older HEAD; the codebase has since merged the admin redesign, Pages/Screens Editor V2, menu design system and security hardening — expect anchor drift.
Ground EVERY anchor the task files claim (file path, exported symbol, function, line number, route path, schema key, settings key, test path, command) against the real source in ${WT}. Seed hints and pins below are facts to VERIFY are stated, not excuses to skip verification of anchors.
Known trap: rg misdetects some large TS/TSX files as binary and silently returns no matches (e.g. PageEditor.tsx, MenuDesignEditor.tsx, menuDocumentV2.ts, menuDocumentCss.ts). Use grep -an or Read for those; never trust an empty rg result on them.
Contract-quality bar (from AGENTS.md, all mandatory): canonical **Status:** field; parent/child linkage fields; execution-ready implementation pseudocode in every leaf (helper/function shape, data flow, error handling, regression-test shape); an explicit Security Contract subsection in every task touching API routes (internal vs public, auth model, RBAC, CSRF for admin writes, rate-limit bucket, strict reject-unknown validation, anti-abuse); correct test lanes per _docs/TESTING_STRATEGY.md (Bun for runtime/Bun.serve/security/plugin lifecycle/scheduler jobs, Vitest only for Bun-free layers like pure next-run calculators); DB changes ship full migration artifacts (SQL + snapshot + journal); route modules stay orchestration-only with map*Error at the boundary; machine-readable domain errors; secrets (S3/Azure credentials) stay backend-only per _docs/SECURITY_SPEC.md — never in browser cache/localStorage/debug payloads; reuse existing media storage adapters rather than inventing new credential flows (verify the real adapter files in source).
${PINS}
Severity: HIGH = would cause wrong implementation, cross-stream collision, security gap, or destructive shared-DB behavior; MEDIUM = wrong/stale anchor, missing mandatory section, contradicting sibling files; LOW = cosmetic.
`;

function auditPrompt(g, round) {
  return `You are a fresh-context READ-ONLY drift auditor (round ${round}) for the ${TREE} tree. Do NOT edit, create or delete ANY file — you only read and report.
${COMMON}
Your assigned task files (audit each fully, in ${TASKS_DIR}): ${g.files.join(", ")}.
Also read the parent file TASK-484_Backups_Scheduler_Retention_Restore_And_Remote_Storage.md for context (report contradictions with it against YOUR files).
Return your findings via structured output. If you verified everything and found nothing, return an empty findings array with a summary of what you checked (name the source files you actually opened).`;
}

function reconcilePrompt(round) {
  return `You are a fresh-context READ-ONLY cross-subtask RECONCILE auditor (round ${round}) for the whole ${TREE} tree. Do NOT edit any file.
${COMMON}
Read ALL TASK-484* files in ${TASKS_DIR} and check ONLY cross-file contradictions: (1) single-writer ownership — every source file has exactly ONE writer subtask across the tree; (2) shared type shapes, enum values, route paths, table/column names, settings keys, clamp ranges are IDENTICAL wherever repeated; (3) helper/component names consumers import match the names the owning subtask defines; (4) the land order is stated consistently; (5) the pinned changelog 1222 and migration 0065 (incl. the 0064-sync precondition) appear consistently; (6) forbidden-paths / collision-guard statements are present and consistent; (7) test-file names promised by one file vs delivered by another match; (8) no two files both claim to edit the same shared additive surface line-range. Report each contradiction as a finding naming BOTH files in evidence.`;
}

function fixerPrompt(g, findings, round) {
  return `You are a drift FIXER (round ${round}) for the ${TREE} tree. You may edit ONLY these task files in ${TASKS_DIR}: ${g.files.join(", ")}. Never touch source code, other task files, _docs/_TASKS/README.md, or _docs/_CHANGELOG/*.
${COMMON}
Fix the following HIGH/MEDIUM audit findings. Before writing each correction, verify the corrected anchor/claim against the real source in ${WT} (do not replace one wrong anchor with another unverified one). Preserve agreed scope — never downgrade to a smaller MVP. Keep all pins exactly as pinned.
FINDINGS (JSON): ${JSON.stringify(findings)}
Report what you changed per file, and list any finding you intentionally did not apply with the reason (e.g. finding is factually wrong — cite evidence).`;
}

function crossFixerPrompt(findings, round) {
  return `You are the single CROSS-FILE drift fixer (round ${round}) for the ${TREE} tree. You may edit any TASK-484* file in ${TASKS_DIR} (and nothing else — no source, no board README, no changelog).
${COMMON}
Apply the following cross-subtask RECONCILE findings consistently across the tree. Rule: the OWNING subtask's definition is the source of truth; align consumers to the owner. Verify corrected anchors against real source in ${WT} before writing.
FINDINGS (JSON): ${JSON.stringify(findings)}
Report changes per file and any finding you rejected with evidence.`;
}

function wholeSetPrompt(residual) {
  return `You are a fresh-context READ-ONLY whole-set auditor for the ${TREE} tree (post-loop residual pass). The 5-round loop ended with these unresolved HIGH/MEDIUM findings (possibly oscillating): ${JSON.stringify(residual)}.
${COMMON}
Read ALL TASK-484* files in ${TASKS_DIR} as one set. Name the RESIDUAL contradictions precisely (which file must change, to what exact value, and why that direction is correct given the owning subtask). Ignore anything already consistent. Return only findings that still hold on the current file state.`;
}

const rounds = [];
let residual = [];
let genuinePass = false;

// Retry a single audit up to 3x: a null return means the agent died (e.g. session/API
// limit). Retrying rescues transient single-agent failures; a full outage still yields
// null after 3 tries and is caught by the false-clean guard below.
async function runAudit(prompt, opts) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await agent(prompt, opts);
    if (r) return r;
  }
  return null;
}

for (let round = 1; round <= 6 && !genuinePass; round++) {
  const phaseName = "Round " + round;
  const results = await parallel([
    ...GROUPS.map(
      (g) => () =>
        runAudit(auditPrompt(g, round), {
          label: "audit:" + g.id,
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
  const groupAudits = results.slice(0, GROUPS.length);
  const recon = results[GROUPS.length];
  const missing = results.filter((r) => !r).length;
  const hmOf = (r) => ((r && r.findings) || []).filter((f) => f.severity !== "LOW");
  const groupHM = groupAudits.flatMap((r) => hmOf(r));
  const reconHM = hmOf(recon);
  const total = groupHM.length + reconHM.length;
  rounds.push({ round, highMed: total, crossFile: reconHM.length, missingAudits: missing });
  // FALSE-CLEAN GUARD: a round with any missing audit result is VOID, never clean —
  // its empty findings prove nothing. Record it and retry on the next round.
  if (missing > 0) {
    log(
      TREE +
        " round " +
        round +
        ": " +
        missing +
        " audit(s) returned null (likely session/API limit) — round VOID, retrying next round"
    );
    residual = [
      {
        severity: "HIGH",
        area: "infra",
        file: "(loop)",
        finding: missing + " audits did not return a result",
        evidence: "missingAudits=" + missing,
        recommendation: "rerun the audit loop after limits reset",
      },
    ];
    continue;
  }
  log(
    TREE +
      " round " +
      round +
      ": " +
      total +
      " HIGH/MED (" +
      reconHM.length +
      " cross-file), all audits returned"
  );
  residual = [...groupHM, ...reconHM];
  if (total === 0) {
    genuinePass = true;
    break;
  }
  const fixThunks = [];
  GROUPS.forEach((g, i) => {
    const f = hmOf(groupAudits[i]);
    if (f.length)
      fixThunks.push(() =>
        agent(fixerPrompt(g, f, round), {
          label: "fix:" + g.id,
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
        finding: "residual whole-set audit returned null",
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
        finding: "final reconcile returned null",
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
  tree: TREE,
  pass: genuinePass && residual.length === 0,
  rounds,
  residualFindings: residual,
};
