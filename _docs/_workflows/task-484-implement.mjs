export const meta = {
  name: "task-484-implement",
  description:
    "TASK-484 sequential implementation: subtasks 01..06 in land order with per-subtask gates, closure (06-L02), then ~5-lens post-audit",
  phases: [{ title: "Implement" }, { title: "Closure" }, { title: "Post-audit" }],
};

const WT = "/home/coder/project/Coderso-task-484";
const TREE = "TASK-484";
const TASKS_DIR = WT + "/_docs/_TASKS";

const SUBTASKS = [
  {
    id: "484-01",
    title: "Schema & Schedule-Run Metadata",
    files: [
      "TASK-484-01-Schema-And-Schedule-Run-Metadata.md",
      "TASK-484-01-L01-Backup-Schedule-Run-Metadata-Columns.md",
      "TASK-484-01-L02-Next-Run-Calculator-And-Schedule-Wiring.md",
    ],
    migration: true,
  },
  {
    id: "484-02",
    title: "Scheduler & Worker",
    files: [
      "TASK-484-02-Scheduler-And-Worker.md",
      "TASK-484-02-L01-In-Process-Backup-Scheduler-Job.md",
      "TASK-484-02-L02-Scheduler-Tests.md",
    ],
  },
  {
    id: "484-03",
    title: "Retention Pruning",
    files: [
      "TASK-484-03-Retention-Pruning.md",
      "TASK-484-03-L01-Retention-Prune-Service.md",
      "TASK-484-03-L02-Retention-Route-And-Tests.md",
    ],
  },
  {
    id: "484-04",
    title: "Restore Implementation",
    files: [
      "TASK-484-04-Restore-Implementation.md",
      "TASK-484-04-L01-Restore-From-Artifact.md",
      "TASK-484-04-L02-Restore-Route-Hardening-And-Tests.md",
    ],
  },
  {
    id: "484-05",
    title: "Remote Artifact Storage",
    files: [
      "TASK-484-05-Remote-Artifact-Storage.md",
      "TASK-484-05-L01-Remote-Artifact-Upload.md",
      "TASK-484-05-L02-Remote-Storage-Tests.md",
    ],
  },
  {
    id: "484-06-L01",
    title: "Storage Usage Source & Surface",
    files: [
      "TASK-484-06-Storage-Usage-Docs-And-Closure.md",
      "TASK-484-06-L01-Storage-Usage-Source-And-Surface.md",
    ],
  },
];

const CLOSURE = {
  id: "484-06-L02",
  title: "Docs, Gates & Closure",
  files: ["TASK-484-06-L02-Docs-Gates-And-Closure.md"],
};

const MIGRATION_NOTE = `
MIGRATION 0065 — READ CAREFULLY (orchestrator has pre-synced 483's 0064 base):
The worktree already contains, synced from the TASK-483 stream: core/db/schema.ts WITH the analytics traffic tables, core/db/migrations/0064_analytics_traffic_tables.sql, meta/0064_snapshot.json, and the _journal.json idx-64 entry. These are the correct base — DO NOT modify, revert, or remove the analytics tables/columns in schema.ts or the 0064 files; you only ADD the backup columns on top.
Add to schema.ts: backup_schedules.next_run_at + last_run_at (timestamp, nullable, no default) + a backup_schedules_next_run_at index, and backups.artifact_key (text, nullable). Leave the pre-existing backup_schedules_frequency_idx untouched.
Then generate the migration with the repo drizzle-kit flow: \`set -a && source ${WT}/.env && set +a && bun run db:generate\`. The pinned index is 0065 (tag 0065_backup_run_metadata). CRITICAL VERIFICATION: open the generated 0065_*.sql and CONFIRM it contains ONLY the additive backup column/index statements and does NOT contain any DROP TABLE / DROP of the analytics tables. If it tries to drop analytics, the schema.ts base sync is wrong — STOP and report as a blocker (do not apply it). Confirm meta/0065_snapshot.json and the _journal.json idx-65 entry were produced.
Apply with \`set -a && source ${WT}/.env && set +a && bun run db:migrate\` — the shared DB already has 0064 applied (by the 483 stream), so only 0065 applies. Confirm the new columns exist.
`;

const COMMON = `
You are a fresh-context IMPLEMENTER working EXCLUSIVELY inside the git worktree ${WT} (branch feature/task-484, HEAD fbe93dae). Never read from or write to /home/coder/project/Coderso or the sibling task-482/task-483 worktrees.
The task contracts were drift-audited and independently verified READY (0 HIGH/MEDIUM). Implement EXACTLY to the contract; do not silently downgrade scope and do not re-open contract decisions.
FORBIDDEN PATHS (other streams own these — never touch): core/services/analytics/** (traffic files), analytics route modules, core/admin/ui/setup/**, auth/install route surfaces, usersService first-admin logic. NOTE: this worktree legitimately contains synced analytics DB base (schema.ts analytics tables + 0064) — you may NOT modify those; you only add backup columns to schema.ts. Also NEVER touch _docs/_TASKS/* or _docs/_CHANGELOG/* — only the closure subtask does that.
Pins: changelog 1222 (closure only), migration index 0065 (see the migration note per-subtask).
RESTORE IS DESTRUCTIVE (subtask 04): require explicit confirmation semantics (confirm===true at BOTH service and route via a strict schema requiring confirm), RBAC backups:write + central enforceCsrf, fail-closed strict artifact validation (version check, reject-unknown) BEFORE any write, a single outer db.transaction (all-or-nothing, sharing importConfigTx), and machine-readable errors. Tests MUST NEVER commit a destructive restore over the shared remote DB — use rollback-scoped dry-run seams / fixture-scoped targets / stubbed restore on the makeRouter pattern.
SCHEDULER (subtask 02): in-process job wired in httpServer.ts startHttpServer() (NOT dockerStart.ts — that would be dead in dev); env-gated opt-in outside prod; uses pg advisory lock BACKUP_SCHEDULER_LOCK_NAMESPACE=20260628 / KEY=484. Tests must snapshot/restore the singleton schedule, clean up per-id, and leave NO enabled schedule or held lock behind, gate kept OFF.
SECRETS: S3/Azure credentials stay backend-only — reuse getMediaStorageAdapter()/getStorageSettingsInternal(); never read/log/return raw keys or persist raw adapter error text to client-visible fields (wrap upload failures to backup_upload_failed). artifact_key is server-internal (redacted maps keep it null to clients).
AGENTS.md rules: model payloads schema-first reject-unknown + normalize*; route modules orchestration-only with mapBackupError at the boundary (keep existing backup_restore_unsupported→409 for back-compat); machine-readable domain errors; full migration artifacts (SQL + snapshot + journal); admin cache contract end-to-end for any new cached resource (+ update _docs/ADMIN_CACHE.md / _docs/ADMIN_CACHE_MAP.md).
Test lanes (_docs/TESTING_STRATEGY.md): Bun lane for scheduler job / routes / security / DB-backed suites; Vitest ONLY for the pure computeNextRunAt calculator. DB-backed tests use uniquely scoped fixtures + delta assertions + settings snapshot/restore with cache resets — the DATABASE_URL is a SHARED REMOTE Postgres; never truncate shared tables.
Known rg binary-detection trap: some large TS/TSX read as binary and return empty rg — use grep -an or Read.
Before any DB/runtime test or db:generate/db:migrate, load env in the same bash command: \`set -a && source ${WT}/.env && set +a && <cmd>\`.
`;

const IMPL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subtask", "filesWritten", "gatesPassed", "gateSummary", "notes", "blockers"],
  properties: {
    subtask: { type: "string" },
    filesWritten: { type: "array", items: { type: "string" } },
    gatesPassed: { type: "boolean" },
    gateSummary: { type: "string" },
    notes: { type: "string" },
    blockers: { type: "array", items: { type: "string" } },
  },
};

const POSTAUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lens", "findings", "summary"],
  properties: {
    lens: { type: "string" },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "file", "finding", "evidence", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          file: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
};

function implPrompt(st, index, priorBlockers) {
  return `${COMMON}
You implement subtask ${st.id} — "${st.title}" — position ${index + 1} of ${SUBTASKS.length} in the land order (all earlier subtasks are already implemented on disk; read their current state before editing shared files like backupService.ts, backupRoutes.ts, backupTypes.ts, schema.ts).
Read these task files fully first (in ${TASKS_DIR}): ${st.files.join(", ")}. Implement every leaf's pseudocode into real source under ${WT}.
${st.migration ? MIGRATION_NOTE : ""}
Prior-subtask blockers to be aware of (work around / build on current on-disk state): ${JSON.stringify(priorBlockers)}.
After implementing, GATE this subtask before returning: run \`bun --cwd core lint:types\`, \`bun --cwd core lint\`, and the targeted test suites this subtask's task files name (Bun lane for scheduler/route/service/security/DB; Vitest for the pure calculator). Load env before DB/runtime tests. Fix failures (max 3 rounds) — prefer fixing the SOURCE; only re-baseline a test for an intended contract change and NEVER weaken a behavior/security assertion. Report exact commands + results in gateSummary. Set gatesPassed=false and list blockers only if something still fails after 3 rounds.`;
}

function fixPrompt(st, blockers) {
  return `${COMMON}
Subtask ${st.id} ("${st.title}") was implemented but its gates did not fully pass. Blockers: ${JSON.stringify(blockers)}.
Read the current on-disk state and the task files (${st.files.join(", ")}), then fix the remaining failures. Re-run \`bun --cwd core lint:types\`, \`bun --cwd core lint\`, and the targeted tests. Prefer fixing SOURCE; never weaken security/behavior assertions. Report gatesPassed + gateSummary + remaining blockers.`;
}

function closurePrompt() {
  return `${COMMON}
You are the CLOSURE subtask ${CLOSURE.id} ("${CLOSURE.title}"). You own TESTS + DOCS ONLY — do NOT re-open or edit implementation source contracts.
Read ${CLOSURE.files.join(", ")} and the parent TASK-484_Backups_Scheduler_Retention_Restore_And_Remote_Storage.md.
Do: (1) complete the test-matrix registration the closure file specifies (wire the new Bun suites incl. tests/integration/runtime/backupScheduler.test.ts into the lane runner + package.json as described) and run the targeted backup suites to confirm green; (2) update the docs the tree changed — _docs/DATA_MODEL.md (backup columns section only), _docs/CMS_API.md (backup endpoints section only), _docs/SECURITY_SPEC.md (scheduler/restore/remote-storage section only), _docs/MEDIA_SPEC.md (remote artifact storage), and _docs/ADMIN_CACHE.md / _docs/ADMIN_CACHE_MAP.md if a cached usage resource was added; (3) create the changelog file _docs/_CHANGELOG/1222-*.md and add its index line to _docs/_CHANGELOG/README.md; (4) update _docs/_TASKS/README.md TASK-484 rows + statistics deltas and flip TASK-484* statuses to Done.
CRITICAL parallel-stream discipline: read _docs/_TASKS/README.md and _docs/_CHANGELOG/README.md FRESH immediately before editing and touch ONLY TASK-484 rows and its own statistics deltas — TASK-482 (changelog 1220) and TASK-483 (changelog 1221) closure agents edit the same files in their own worktrees; do not touch their rows. Scope shared-doc edits to the backups sections only. Do NOT add any analytics/DATA_MODEL analytics content (that belongs to 483).
Report filesWritten, gatesPassed, gateSummary, blockers.`;
}

function postAuditPrompt(lens) {
  return `${COMMON}
You are a READ-ONLY POST-IMPLEMENTATION auditor, lens = "${lens}". Do NOT edit any file. The TASK-484 implementation just landed across subtasks 01..06 + closure in ${WT}.
Audit ONLY through your lens and report evidence-backed findings (file:line):
- scope-fidelity: built code matches contract scope (scheduler actually runs, retention prunes, restore restores, remote upload works, usage surfaced); no silent MVP downgrade.
- migration-safety: 0065 is additive backup columns ONLY (no analytics DROP); full artifacts (SQL + 0065 snapshot + journal idx-65); analytics 0064 base left intact.
- restore-safety: destructive restore is confirm-gated at service+route, RBAC+CSRF, fail-closed artifact validation before writes, transactional/rollback-safe; tests never commit a destructive restore on the shared DB.
- security: scheduler advisory-locked + env-gated; S3/Azure creds backend-only (never in client cache/debug/error text); machine-readable errors mapped via mapBackupError.
- cross-stream-safety: no writes to analytics service/route files or setup/auth; analytics DB base untouched; no truncation of shared tables; scheduler tests leave no enabled schedule/lock; board/changelog edits scoped to TASK-484 (changelog 1222).
- test-integrity: tests assert real behavior (not weakened), correct lanes, no production fallback added only to satisfy a test.
Return your lens, a summary, and findings.`;
}

function postFixPrompt(findings) {
  return `${COMMON}
Post-audit found HIGH/MEDIUM issues in the TASK-484 implementation. Fix them at the SOURCE (never weaken tests/security), then re-run \`bun --cwd core lint:types\`, \`bun --cwd core lint\`, and the affected targeted tests. Findings: ${JSON.stringify(findings)}.
Report filesWritten, gatesPassed, gateSummary, blockers.`;
}

// ---- Implement sequentially ----
phase("Implement");
const implResults = [];
let priorBlockers = [];
for (let i = 0; i < SUBTASKS.length; i++) {
  const st = SUBTASKS[i];
  let res = await agent(implPrompt(st, i, priorBlockers), {
    label: "impl:" + st.id,
    phase: "Implement",
    schema: IMPL_SCHEMA,
  });
  if (res && !res.gatesPassed && res.blockers && res.blockers.length) {
    log(
      TREE +
        " " +
        st.id +
        ": gates not clean, dispatching one fixer for " +
        res.blockers.length +
        " blocker(s)"
    );
    const fixed = await agent(fixPrompt(st, res.blockers), {
      label: "fix:" + st.id,
      phase: "Implement",
      schema: IMPL_SCHEMA,
    });
    if (fixed) res = fixed;
  }
  implResults.push(
    res || {
      subtask: st.id,
      filesWritten: [],
      gatesPassed: false,
      gateSummary: "agent returned null",
      notes: "",
      blockers: ["implementer agent returned null (API/limit failure)"],
    }
  );
  const b = (res && res.blockers) || ["null result"];
  if (b.length) priorBlockers = [...priorBlockers, { subtask: st.id, blockers: b }];
  log(
    TREE +
      " " +
      st.id +
      " done: gatesPassed=" +
      (res && res.gatesPassed) +
      ", files=" +
      ((res && res.filesWritten && res.filesWritten.length) || 0)
  );
}

// ---- Closure ----
phase("Closure");
const closureRes = await agent(closurePrompt(), {
  label: "closure:" + CLOSURE.id,
  phase: "Closure",
  schema: IMPL_SCHEMA,
});

// ---- Post-audit (~5 lenses) ----
phase("Post-audit");
const LENSES = [
  "scope-fidelity",
  "migration-safety",
  "restore-safety",
  "security",
  "cross-stream-safety",
  "test-integrity",
];
const audits = await parallel(
  LENSES.map(
    (l) => () =>
      agent(postAuditPrompt(l), {
        label: "postaudit:" + l,
        phase: "Post-audit",
        schema: POSTAUDIT_SCHEMA,
      })
  )
);
const hm = audits
  .filter(Boolean)
  .flatMap((a) => (a.findings || []).filter((f) => f.severity !== "LOW"));
let postFix = null;
if (hm.length) {
  log(TREE + " post-audit: " + hm.length + " HIGH/MED — dispatching one fixer");
  postFix = await agent(postFixPrompt(hm), {
    label: "postfix",
    phase: "Post-audit",
    schema: IMPL_SCHEMA,
  });
}

return {
  tree: TREE,
  subtasks: implResults.map((r) => ({
    id: r.subtask,
    gatesPassed: r.gatesPassed,
    blockers: r.blockers,
  })),
  closure: closureRes
    ? { gatesPassed: closureRes.gatesPassed, blockers: closureRes.blockers }
    : null,
  postAudit: { highMed: hm.length, findings: hm, fixed: postFix ? postFix.gatesPassed : null },
  mergeNote:
    "This branch is STACKED on TASK-483 DB layer (synced analytics schema.ts + 0064). Merge 483 BEFORE 484; 484 adds 0065 backup columns only.",
  smokeDeferred:
    "runtime smoke (backup settings surface + prototype :5180 side-by-side; scheduler/restore behavior via runtime tests) deferred to morning with owner",
};
