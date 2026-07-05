export const meta = {
  name: "task-482-implement",
  description:
    "TASK-482 sequential implementation: subtasks 01..08 in land order with per-subtask gates, closure (09), then ~5-lens post-audit",
  phases: [{ title: "Implement" }, { title: "Closure" }, { title: "Post-audit" }],
};

const WT = "/home/coder/project/Coderso-task-482";
const TREE = "TASK-482";
const TASKS_DIR = WT + "/_docs/_TASKS";

// Land order: 01→02→03 (phase 1) then 04→05→06→07→08 (phase 2), strictly sequential,
// single-writer per file. Closure (09) is separate and owns tests+docs+changelog+board.
const SUBTASKS = [
  {
    id: "482-01",
    title: "Pre-Auth Installer Foundation",
    files: [
      "TASK-482-01-Pre-Auth-Installer-Foundation.md",
      "TASK-482-01-L01-FirstRun-Service.md",
      "TASK-482-01-L02-Install-Route-Namespace-And-Status.md",
    ],
  },
  {
    id: "482-02",
    title: "First-Admin Bootstrap",
    files: [
      "TASK-482-02-First-Admin-Bootstrap.md",
      "TASK-482-02-L01-CreateFirstAdmin-Service.md",
      "TASK-482-02-L02-Install-Admin-Route.md",
    ],
  },
  {
    id: "482-03",
    title: "Installer UI & Gate Ordering",
    files: [
      "TASK-482-03-Installer-UI-And-Gate-Ordering.md",
      "TASK-482-03-L01-Installer-Wizard-UI.md",
      "TASK-482-03-L02-AdminApp-Gate-Ordering.md",
    ],
  },
  {
    id: "482-04",
    title: "Phase-2 Wizard Shell",
    files: [
      "TASK-482-04-Phase2-Wizard-Shell.md",
      "TASK-482-04-L01-Step-Framework.md",
      "TASK-482-04-L02-Wizard-Shell-Restyle.md",
    ],
  },
  {
    id: "482-05",
    title: "Phase-2 Basic Steps & Settings Keys",
    files: [
      "TASK-482-05-Phase2-Basic-Steps-And-Settings-Keys.md",
      "TASK-482-05-L01-Timezone-Settings-Key.md",
      "TASK-482-05-L02-Basic-Steps-UI.md",
    ],
  },
  {
    id: "482-06",
    title: "Starter Content via Kits",
    files: [
      "TASK-482-06-Starter-Content-Via-Kits.md",
      "TASK-482-06-L01-Starter-Content-Service.md",
      "TASK-482-06-L02-Starter-Content-Route.md",
    ],
  },
  {
    id: "482-07",
    title: "Advanced Track & TTL Reconciliation",
    files: [
      "TASK-482-07-Advanced-Track-And-TTL-Reconciliation.md",
      "TASK-482-07-L01-Advanced-Steps-Adapters.md",
      "TASK-482-07-L02-Session-TTL-Reconciliation.md",
    ],
  },
  {
    id: "482-08",
    title: "Install-Lock, Finalize & Self-Disable",
    files: [
      "TASK-482-08-Install-Lock-Finalize-Self-Disable.md",
      "TASK-482-08-L01-Finalize-And-Install-Lock.md",
      "TASK-482-08-L02-Self-Disable-Boundary.md",
    ],
  },
];

const CLOSURE = {
  id: "482-09",
  title: "E2E Tests & Docs",
  files: [
    "TASK-482-09-E2E-Tests-And-Docs.md",
    "TASK-482-09-L01-E2E-Onboarding-Flow.md",
    "TASK-482-09-L02-Docs-Updates.md",
  ],
};

const KNOWN_NOTES = `
Verified-review notes to honor (from the independent final-reviewer pass — guidance, mostly already applied):
- mapInstallRouteError (installRoutes.ts) returns ApiError | null (repo convention, cf. emailSettingsRoutes.ts / pageRoutes.ts). BOTH the GET /auth/install/status route (01-L02) and the POST /auth/install/admin route (02-L02) use the guard: const mapped = mapInstallRouteError(error); if (mapped) throw mapped; throw error;. Do NOT make it never-null.
- The query-guard helper is assertNoInstallStatusQuery (assertNo*Query pattern, cf. assertNoAuthMeQuery at authRoutes.ts).
- First-admin creation uses pg_advisory_xact_lock (transaction-scoped, auto-released at tx end) with an in-tx TOCTOU re-check of the no-users precondition — the two-int-arg form; the startupMigrations.ts precedent uses the session-scoped pg_advisory_lock, so adapt, don't copy verbatim.
- usersService createUser random-password default is at usersService.ts:145 (randomBytes(16)); seedAdmin() begins at seed.ts:13 — re-ground line numbers yourself, symbols are correct.
`;

const COMMON = `
You are a fresh-context IMPLEMENTER working EXCLUSIVELY inside the git worktree ${WT} (branch feature/task-482, HEAD fbe93dae). Never read from or write to /home/coder/project/Coderso or the sibling task-483/task-484 worktrees.
The task contracts were drift-audited and independently verified READY (0 HIGH; the one MEDIUM cross-file contradiction was already fixed). Implement EXACTLY to the contract; do not silently downgrade scope to a smaller MVP and do not re-open contract decisions.
FORBIDDEN PATHS (other streams own these — never touch): core/services/analytics/** (traffic files), analytics route modules, core/services/backups/**, backup route modules, core/db/schema.ts, core/db/migrations/**. Also NEVER touch _docs/_TASKS/* or _docs/_CHANGELOG/* — only the closure subtask does that.
NO DB MIGRATION in this stream: settings (branding/locale/timezone/URLs) are KV rows via the settings service (site.timezone is genuinely absent from DEFAULT_SETTINGS and must be added there, NOT via DDL); the first admin uses the existing users table. If you think you need DDL, STOP and report it as a blocker instead.
Pins: changelog 1220 (closure only).
SECURITY (this stream is sensitive — the installer creates the FIRST ADMIN): the pre-auth installer must be fail-closed via a no-users / first-run gate, with an in-transaction TOCTOU re-check under pg_advisory_xact_lock so it cannot create two admins or run after setup. It must self-disable once an admin exists / the install lock is set (08). Client gate ordering (03-L02) must fail closed (fetch failure ⇒ treat as unavailable/disabled). Install writes need the auth rate-limit bucket, strict reject-unknown schemas, audit events (auth.install.admin.created / auth.install.blocked), and session-less CSRF handling per the existing absence-based skip (csrf.ts). Never weaken any of these.
AGENTS.md implementation rules you MUST follow: model payloads schema-first with reject-unknown + explicit normalize* helpers; route modules stay orchestration-only and map domain errors via map*Error at the boundary (ApiError | null convention); machine-readable domain errors (*_invalid/*_not_found/*_conflict); follow existing admin UX cache/prefetch/SPA patterns and use the shared canonical helpers (adminPaths / AdminLink / prefetchAdminRoute) for any admin nav; for admin React under ESLint 9 + React Hooks rules, treat react-hooks/* findings as contract issues (no synchronous setState in effect bodies; lazy initializers / render-time derivation / event handlers); never put secrets/keys in browser cache/localStorage/debug payloads.
UI/UX FIDELITY: the installer + wizard shell must faithfully reproduce the prototype. BEFORE building any wizard/installer screen, read the matching prototype source under ${WT}/_docs/_PROTOTYPE/src/ and reproduce its layout/structure/tokens (adapt/extend function; do NOT invent conservative fallbacks that keep an old look). The owner is final reviewer and will eyeball fidelity against the live prototype.
Test lanes (_docs/TESTING_STRATEGY.md): Bun lane for runtime/route/Bun.serve/security/DB-backed suites; Vitest for Bun-free pure logic + admin/UI (wizard components). DB-backed tests MUST use injected seams / uniquely scoped fixtures — the DATABASE_URL is a SHARED REMOTE Postgres. NEVER engineer a real empty-users DB state, truncate users, or reset shared settings rows; test first-run/no-users behavior via injected isFirstRun stubs (InstallRouteDeps.isFirstRun) and mocks. Do not broaden the pre-existing destructive afterAll in sessionService.test.ts.
Known rg binary-detection trap: AdminApp.tsx, SetupWizard.tsx and other large TSX may read as binary and return empty rg — use grep -an or Read for those.
Before running any DB/runtime test, load env: run \`set -a && source ${WT}/.env && set +a\` in the same bash command as the test.
${KNOWN_NOTES}
`;

const IMPL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subtask", "filesWritten", "gatesPassed", "gateSummary", "notes", "blockers"],
  properties: {
    subtask: { type: "string" },
    filesWritten: { type: "array", items: { type: "string" } },
    gatesPassed: {
      type: "boolean",
      description: "true only if lint:types + lint + the targeted tests for this subtask all pass",
    },
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
You implement subtask ${st.id} — "${st.title}" — position ${index + 1} of ${SUBTASKS.length} in the land order (all earlier subtasks are already implemented on disk; read their current state before editing shared files like AdminApp.tsx, SetupWizard.tsx, setupWizardValidation.ts, wizardSteps.ts, installRoutes.ts).
Read these task files fully first (in ${TASKS_DIR}): ${st.files.join(", ")}. Implement every leaf's pseudocode into real source under ${WT}.
Prior-subtask blockers to be aware of (work around / build on current on-disk state): ${JSON.stringify(priorBlockers)}.
After implementing, GATE this subtask before returning: run \`bun --cwd core lint:types\`, \`bun --cwd core lint\`, and the targeted test suites this subtask's task files name (Bun lane for route/service/security; Vitest for wizard UI / pure logic). Load env before DB/runtime tests. Fix failures (max 3 rounds) — prefer fixing the SOURCE; only re-baseline a test for an intended contract change and NEVER weaken a behavior/security assertion. Report exact commands + results in gateSummary. Set gatesPassed=false and list blockers only if something still fails after 3 rounds.`;
}

function fixPrompt(st, blockers) {
  return `${COMMON}
Subtask ${st.id} ("${st.title}") was implemented but its gates did not fully pass. Blockers: ${JSON.stringify(blockers)}.
Read the current on-disk state and the task files (${st.files.join(", ")}), then fix the remaining failures. Re-run \`bun --cwd core lint:types\`, \`bun --cwd core lint\`, and the targeted tests. Prefer fixing SOURCE; never weaken security/behavior assertions. Report gatesPassed + gateSummary + remaining blockers.`;
}

function closurePrompt() {
  return `${COMMON}
You are the CLOSURE subtask ${CLOSURE.id} ("${CLOSURE.title}"). You own TESTS + DOCS ONLY — do NOT re-open or edit implementation source contracts.
Read ${CLOSURE.files.join(", ")} and the parent TASK-482_Setup_And_Onboarding_Wizard.md.
Do: (1) author the onboarding E2E/integration test the closure files specify (author the Playwright E2E flow file if described, but you do NOT need to RUN Playwright now — the runtime onboarding smoke is deferred to a supervised morning run; DO run any Bun/Vitest onboarding suites you can); (2) update the docs the tree changed — _docs/AUTH_SPEC.md, _docs/SECURITY_SPEC.md, _docs/CMS_SPEC.md, _docs/CMS_API.md (install/setup endpoints), and any SETTINGS doc for the new timezone key — scoping edits to the installer/onboarding sections only; (3) create the changelog file _docs/_CHANGELOG/1220-*.md and add its index line to _docs/_CHANGELOG/README.md; (4) update _docs/_TASKS/README.md TASK-482 rows + statistics deltas and flip TASK-482* statuses to Done.
CRITICAL parallel-stream discipline: read _docs/_TASKS/README.md and _docs/_CHANGELOG/README.md FRESH immediately before editing and touch ONLY TASK-482 rows and its own statistics deltas — TASK-483 (changelog 1221) and TASK-484 (changelog 1222) closure agents edit the same files in their own worktrees; do not touch their rows. Scope shared-doc edits to the onboarding/installer sections only.
Report filesWritten, gatesPassed, gateSummary, blockers.`;
}

function postAuditPrompt(lens) {
  return `${COMMON}
You are a READ-ONLY POST-IMPLEMENTATION auditor, lens = "${lens}". Do NOT edit any file. The TASK-482 implementation just landed across subtasks 01..08 + closure in ${WT}.
Audit ONLY through your lens and report evidence-backed findings (file:line):
- scope-fidelity: built code matches contract scope (no silent MVP downgrade, all leaves implemented, wizard reproduces the prototype layout/structure).
- security: installer fail-closed no-users gate + in-tx TOCTOU under advisory lock; self-disable after finalize/lock (cannot create a 2nd admin or run post-setup); auth rate-limit bucket; strict reject-unknown; audit events; client gate fails closed; map*Error ApiError|null guard on both install routes.
- model-correctness: schema-first reject-unknown + normalize*; settings keys written correctly (site.timezone added to DEFAULT_SETTINGS, not DDL); machine-readable errors.
- cross-stream-safety: no writes to analytics/backups/schema.ts/migrations; NO empty-users DB engineering / no truncation of shared users or settings; injected seams used; board/changelog edits scoped to TASK-482 only (changelog 1220).
- test-integrity: tests assert real behavior (not weakened), correct lanes, no production fallback added only to satisfy a test, no react-hooks preset weakening.
Return your lens, a summary, and findings.`;
}

function postFixPrompt(findings) {
  return `${COMMON}
Post-audit found HIGH/MEDIUM issues in the TASK-482 implementation. Fix them at the SOURCE (never weaken tests/security), then re-run \`bun --cwd core lint:types\`, \`bun --cwd core lint\`, and the affected targeted tests. Findings: ${JSON.stringify(findings)}.
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
  "security",
  "model-correctness",
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
  smokeDeferred:
    "runtime onboarding smoke + prototype side-by-side (localhost:5180 vs :5173/admin installer+wizard) + Playwright E2E deferred to supervised morning run",
};
