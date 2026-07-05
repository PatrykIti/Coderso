export const meta = {
  name: "task-483-implement",
  description:
    "TASK-483 sequential implementation: subtasks 01..06 in land order with per-subtask gates, closure, then ~5-lens post-audit",
  phases: [{ title: "Implement" }, { title: "Closure" }, { title: "Post-audit" }],
};

const WT = "/home/coder/project/Coderso-task-483";
const TREE = "TASK-483";
const TASKS_DIR = WT + "/_docs/_TASKS";

// Land order: strictly sequential, single-writer per file. Closure (06-L02) is separate.
const SUBTASKS = [
  {
    id: "483-01",
    title: "Traffic Schema & Domain Contract",
    files: [
      "TASK-483-01-Traffic-Schema-And-Domain-Contract.md",
      "TASK-483-01-L01-Traffic-Event-Domain-Contract-And-Normalizers.md",
      "TASK-483-01-L02-Traffic-Tables-And-Migration-Artifacts.md",
      "TASK-483-01-L03-Traffic-Repository-Writers-And-Readers.md",
    ],
    migration: true,
  },
  {
    id: "483-02",
    title: "Public Ingestion Route & Anti-Abuse",
    files: [
      "TASK-483-02-Public-Ingestion-Route-And-Anti-Abuse.md",
      "TASK-483-02-L01-Beacon-Payload-Contract-And-Nonce-Issuance.md",
      "TASK-483-02-L02-Public-Ingestion-Route-And-Bun-Serve-Wiring.md",
      "TASK-483-02-L03-IP-PII-Redaction-And-Bot-DNT-Classification.md",
    ],
  },
  {
    id: "483-03",
    title: "Front-End Tracking Snippet",
    files: [
      "TASK-483-03-Front-End-Tracking-Snippet.md",
      "TASK-483-03-L01-Tracking-Snippet-Asset-And-Payload-Builder.md",
      "TASK-483-03-L02-Public-Site-Injection-And-Snippet-Delivery-Route.md",
    ],
  },
  {
    id: "483-04",
    title: "Traffic Aggregation Service & Admin API",
    files: [
      "TASK-483-04-Traffic-Aggregation-Service-And-Admin-API.md",
      "TASK-483-04-L01-Traffic-Aggregation-Contract-And-Types.md",
      "TASK-483-04-L02-Aggregation-Queries-Replacing-computeScore.md",
      "TASK-483-04-L03-Traffic-Analytics-Admin-API-And-CSV-Export.md",
    ],
  },
  {
    id: "483-05",
    title: "Admin Client & Analytics Page Rewire",
    files: [
      "TASK-483-05-Admin-Client-And-Analytics-Page-Rewire.md",
      "TASK-483-05-L01-Traffic-Analytics-Client-And-Cache-Contract.md",
      "TASK-483-05-L02-Analytics-Page-And-Charts-Real-Series-Rewire.md",
    ],
  },
  {
    id: "483-06-L01",
    title: "Retention Pruning & Privacy Enforcement (source)",
    files: [
      "TASK-483-06-Retention-Privacy-Tests-And-Docs.md",
      "TASK-483-06-L01-Retention-Pruning-And-Privacy-Enforcement.md",
    ],
  },
];

const CLOSURE = {
  id: "483-06-L02",
  title: "Test Matrix & Documentation Closure",
  files: ["TASK-483-06-L02-Test-Matrix-And-Documentation-Closure.md"],
};

const KNOWN_NOTES = `
Verified-review notes to honor (from the independent final-reviewer pass — not defects, guidance):
- The local validation helpers (assertRecord / rejectUnknownKeys / asString / safeHost / clampLang) referenced in 01-L01 trafficSchemas.ts and 02-L01 beaconContract.ts are NOT existing shared exports — DEFINE them locally per-module, matching the established per-module pattern (e.g. core/services/assistant/actionFamilyContracts.ts).
- Several source files have multiple SEQUENTIAL writer leaves under the strict land order (trafficRepository.ts, analyticsRoutes.ts, trafficAggregationService.ts, publicSite.tsx). Each later leaf EXTENDS at the reserved marker / "extends" language — read the current on-disk state and build on it, never clobber prior leaves' symbols.
- readCappedJson (02-L02) throws ApiError("invalid_json",400) on parse failure via the instanceof ApiError branch — keep that behavior even though the L02 prose enumeration omits it.
`;

const COMMON = `
You are a fresh-context IMPLEMENTER working EXCLUSIVELY inside the git worktree ${WT} (branch feature/task-483, HEAD fbe93dae). Never read from or write to /home/coder/project/Coderso or the sibling task-482/task-484 worktrees.
The task contracts were drift-audited and independently verified READY (0 HIGH/MEDIUM). Implement EXACTLY to the contract; do not silently downgrade scope to a smaller MVP and do not re-open contract decisions.
FORBIDDEN PATHS (other streams own these — never touch): core/services/backups/**, backup route modules, core/admin/ui/setup/**, auth/install route surfaces, usersService first-admin logic. Also NEVER touch _docs/_TASKS/* or _docs/_CHANGELOG/* — only the closure subtask does that.
Pins: changelog 1221 (closure only), migration index 0064 with FULL artifacts (SQL + core/db/migrations/meta/0064_snapshot.json + meta/_journal.json idx-64 version-7). Current max migration on disk is 0063_yummy_glorian.sql.
AGENTS.md implementation rules you MUST follow: model payloads schema-first with reject-unknown + explicit normalize* helpers; every new validated-document schema key consciously joins its reject-unknown allowlist AND ships a round-trip persistence test; new optional styling/config fields are present-only (byte-identity when unauthored); route modules stay orchestration-only and map domain errors via a centralized map*Error at the boundary; keep domain errors machine-readable (*_invalid/*_not_found/*_conflict); public write endpoints use the SHARED access evaluators + nonce/HMAC anti-abuse from forms/booking (createFormSubmissionNonce/assertFormSubmissionNonce pattern, checkRateLimit public_write bucket) — no weaker one-off flow; never put secrets/keys in browser cache/localStorage/debug payloads; new admin cached resources follow the shared cache contract end-to-end (keys/TTLs, cached client wrapper, invalidation + cacheBus, cache-hydrate + background revalidation, no mount-force refetch loops) and you must also update _docs/ADMIN_CACHE.md + _docs/ADMIN_CACHE_MAP.md when adding cached resources; for Bun-free modules avoid import-time coupling to db/client — keep pure logic importable by Vitest.
Test lanes (_docs/TESTING_STRATEGY.md): Bun lane for the public route / Bun.serve wiring / security / DB-backed suites (and pure aggregation logic that imports db/client stays Bun-lane); Vitest only for genuinely Bun-free pure logic and admin/UI. DB-backed tests MUST use uniquely scoped fixtures and clean up only their own rows — the DATABASE_URL points to a SHARED REMOTE Postgres; never truncate shared tables or depend on global table emptiness.
Known rg binary-detection trap: PageEditor.tsx, MenuDesignEditor.tsx, menuDocumentV2.ts, menuDocumentCss.ts, publicSite.tsx may read as binary and return empty rg — use grep -an or Read for those.
Before running any DB test or db:migrate, load env: run in bash \`set -a && source ${WT}/.env && set +a\` in the same command as the test/migrate.
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
    gateSummary: {
      type: "string",
      description: "which gate commands were run and their pass/fail result",
    },
    notes: { type: "string" },
    blockers: {
      type: "array",
      items: { type: "string" },
      description: "unresolved failures after the internal fix loop; empty if clean",
    },
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
You implement subtask ${st.id} — "${st.title}" — position ${index + 1} of ${SUBTASKS.length} in the land order (all earlier subtasks are already implemented on disk; read their current state before editing shared files).
Read these task files fully first (in ${TASKS_DIR}): ${st.files.join(", ")}. Implement every leaf's pseudocode into real source under ${WT}.
${st.migration ? "This subtask CREATES the DB migration. Produce the full artifact set: the SQL file (0064_*.sql), meta/0064_snapshot.json, and the meta/_journal.json idx-64 entry (version 7, matching 0063). After writing, apply it to the shared DB with `set -a && source " + WT + "/.env && set +a && bun run db:migrate` and confirm success." : ""}
Prior-subtask blockers you should be aware of (work around / build on current on-disk state): ${JSON.stringify(priorBlockers)}.
After implementing, GATE this subtask before returning: run \`bun --cwd core lint:types\`, \`bun --cwd core lint\`, and the targeted test suites this subtask's task files name (Bun lane via the appropriate bun test path; Vitest for Bun-free UI/pure suites). Load env before DB/runtime tests. Fix failures (max 3 rounds) — prefer fixing the SOURCE when it diverged from the contract; only re-baseline a test for an intended contract change and NEVER weaken a behavior assertion. Report the exact commands you ran and their results in gateSummary. Set gatesPassed=false and list blockers only if something still fails after 3 rounds.`;
}

function fixPrompt(st, blockers) {
  return `${COMMON}
Subtask ${st.id} ("${st.title}") was implemented but its gates did not fully pass. Blockers: ${JSON.stringify(blockers)}.
Read the current on-disk state and the task files (${st.files.join(", ")}), then fix the remaining failures. Re-run \`bun --cwd core lint:types\`, \`bun --cwd core lint\`, and the targeted tests. Prefer fixing SOURCE; never weaken assertions. Report gatesPassed + gateSummary + any remaining blockers.`;
}

function closurePrompt() {
  return `${COMMON}
You are the CLOSURE subtask ${CLOSURE.id} ("${CLOSURE.title}"). You own TESTS + DOCS ONLY — do NOT re-open or edit implementation source contracts.
Read ${CLOSURE.files.join(", ")} and the parent TASK-483_Real_Web_Analytics_Pipeline.md.
Do: (1) add/complete the CI test-matrix registration the closure file specifies (e.g. wiring tests/integration/analytics/* + route/security/perf suites into the bun lane runner and package.json scripts as the file describes); (2) update the docs the tree changed — _docs/DATA_MODEL.md (analytics tables section only), _docs/CMS_API.md (analytics traffic endpoints section only), _docs/SECURITY_SPEC.md (public ingestion section only), _docs/ADMIN_CACHE.md + _docs/ADMIN_CACHE_MAP.md (new analytics cache entries); (3) create the changelog file _docs/_CHANGELOG/1221-*.md and add its index line to _docs/_CHANGELOG/README.md; (4) update _docs/_TASKS/README.md TASK-483 rows + statistics deltas and flip TASK-483* statuses to Done.
CRITICAL parallel-stream discipline: read _docs/_TASKS/README.md and _docs/_CHANGELOG/README.md FRESH immediately before editing and touch ONLY TASK-483 rows and its own statistics deltas — TASK-482 (changelog 1220) and TASK-484 (changelog 1222) closure agents edit the same files in their own worktrees; do not touch their rows. Scope all shared-doc edits to the analytics sections only.
Run the targeted analytics test suites once more to confirm green. Report filesWritten, gatesPassed, gateSummary, blockers.`;
}

function postAuditPrompt(lens) {
  return `${COMMON}
You are a READ-ONLY POST-IMPLEMENTATION auditor, lens = "${lens}". Do NOT edit any file. The TASK-483 implementation just landed across subtasks 01..06 + closure in ${WT}.
Audit ONLY through your lens and report evidence-backed findings (file:line):
- scope-fidelity: does the built code match the contract scope (no silent MVP downgrade, all leaves implemented)?
- model-correctness: schema-first reject-unknown + normalize* + fail-closed on read; every new document schema key in its allowlist WITH a round-trip test; machine-readable errors mapped via map*Error at the route boundary.
- security: public ingestion uses shared nonce/HMAC + rate-limit (not a one-off); IP/PII redaction (no raw IP/UA/full-referrer persisted); no secrets in browser cache/debug; DNT/bot dropped.
- cross-stream-safety: no writes to backups/setup/auth files; no truncation of shared DB tables; scoped fixtures; migration is 0064 with full artifacts; board/changelog edits scoped to TASK-483 only.
- test-integrity: tests assert real behavior (not weakened); correct lanes; no production fallback added just to satisfy a test; cache contract + present-only/byte-identity honored where applicable.
Return your lens, a summary, and findings.`;
}

function postFixPrompt(findings) {
  return `${COMMON}
Post-audit found HIGH/MEDIUM issues in the TASK-483 implementation. Fix them at the SOURCE (never weaken tests), then re-run \`bun --cwd core lint:types\`, \`bun --cwd core lint\`, and the affected targeted tests. Findings: ${JSON.stringify(findings)}.
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
  "model-correctness",
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
  smokeDeferred:
    "runtime smoke + prototype side-by-side (localhost:5180 vs :5173/admin analytics) deferred to morning with owner",
};
