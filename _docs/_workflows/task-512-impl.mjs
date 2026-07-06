export const meta = {
  name: "task-512-impl",
  description:
    "Implement TASK-512 (Media Library prototype fidelity + schema extension) on its worktree: 6 strictly-sequential subtasks (schema/migration → services/quota → routes → client → UI components → page assembly), each gated green, then parallel adversarial audits, fix real findings, and closure (tests/docs/changelog/board).",
  phases: [{ title: "Implement" }, { title: "Audit" }, { title: "Fix" }, { title: "Closure" }],
};

const WT =
  (typeof args === "string" ? JSON.parse(args) : args)?.wt ||
  "/home/coder/project/Coderso-task-512";
const ENV = `cd ${WT} && set -a && [ -f .env ] || cp /home/coder/project/Coderso/.env .env 2>/dev/null; . ./.env 2>/dev/null; set +a`;

const IMPL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subtask", "done", "filesEdited", "gates", "notes"],
  properties: {
    subtask: { type: "string" },
    done: { type: "boolean" },
    filesEdited: { type: "array", items: { type: "string" } },
    gates: { type: "string", description: "each gate name -> PASS/FAIL + first error if any" },
    notes: { type: "string" },
  },
};

const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lens", "findings", "verdict"],
  properties: {
    lens: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "file", "title", "detail", "isReal"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          file: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
          isReal: { type: "boolean" },
        },
      },
    },
    verdict: { type: "string", enum: ["clean", "issues"] },
  },
};

const CLOSURE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "done",
    "changelogFile",
    "docsUpdated",
    "boardUpdated",
    "gates",
    "committed",
    "commitSha",
    "notes",
  ],
  properties: {
    done: { type: "boolean" },
    changelogFile: { type: "string" },
    docsUpdated: { type: "boolean" },
    boardUpdated: { type: "boolean" },
    gates: { type: "string" },
    committed: { type: "boolean" },
    commitSha: { type: "string" },
    notes: { type: "string" },
  },
};

const COMMON = `You work ONLY in the isolated git worktree at ${WT} (branch feature/task-512). This is TASK-512 (Media Library prototype fidelity + schema extension).
ALWAYS read first: _docs/_TASKS/TASK-512_Media_Library_Prototype_Fidelity_And_Schema.md (parent: land order, single-writer map, coordination notes, Security Contract) AND your own subtask contract file. Edit ONLY the files your subtask owns per the single-writer map — touching another subtask's file breaks the one-owner rule.
LIVE ENVIRONMENT for fidelity reference: the prototype is the visual source of truth. Read prototype SOURCE at ${WT}/_docs/_PROTOTYPE/src/pages/media/MediaLibraryPage.tsx (classes/tokens/structure), not just screenshots. Reproduce layout/structure/tokens FAITHFULLY and adapt/extend functionality — do NOT invent conservative deviations from the prototype.
Shared test DB: the worktree needs .env (copy from main tree if absent). Migrations are additive+idempotent. New validated keys MUST be schema-first (additionalProperties:false) + service-side normalize + reject-unknown. New props on SHARED leaf components MUST be OPTIONAL (root-tsc back-compat).
Do NOT commit (the Closure phase owns the commit). If a gate fails, FIX and re-run until green before returning.`;

const SUBTASKS = [
  {
    id: "512-01",
    file: "TASK-512-01-Schema-And-Migration.md",
    owns: "the media/media_folders region of core/db/schema.ts + a NEW migration (next-free index; grep the migrations dir + meta/_journal.json — 480 took 0066 so expected 0067; do NOT hardcode a colliding index) with full artifacts (SQL + meta/<idx>_snapshot.json + meta/_journal.json entry)",
    gates:
      "bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; generate the migration via the repo `bun run db:generate` flow then apply with `bun run db:migrate` (source .env for DATABASE_URL) and confirm it applies cleanly; re-run db:migrate to confirm idempotent no-op",
  },
  {
    id: "512-02",
    file: "TASK-512-02-Services-Validation-Storage-Quota.md",
    owns: "core/services/media/mediaService.ts, NEW core/services/media/mediaFoldersService.ts, core/server/validation/mediaSchemas.ts, core/services/settings/storageSettings.ts, and a SCOPED single-key edit to core/server/validation/settingsSchemas.ts (add nested quota to storageSettingsSchema ONLY)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:bun for the media/settings service tests (re-run any named file that times out under load once in isolation)",
  },
  {
    id: "512-03",
    file: "TASK-512-03-Routes-And-Security.md",
    owns: "core/server/routes/mediaRoutes.ts (+ a NEW registerMediaFolderRoutes invoked FROM registerMediaRoutes — do NOT touch core/server/routes/index.ts)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:bun for the media route tests (RBAC media:read/media:write, reject-unknown, CSRF)",
  },
  {
    id: "512-04",
    file: "TASK-512-04-Admin-Client-Cache-Types.md",
    owns: "core/admin/services/mediaClient.ts, NEW core/admin/services/mediaFoldersClient.ts, core/admin/ui/media/types.ts, core/admin/ui/media/utils.ts; scoped append-only edits to core/admin/services/cachePolicy.ts (new mediaFolders key) + core/admin/services/settingsClient.ts (quota shape)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the media client/types tests",
  },
  {
    id: "512-05",
    file: "TASK-512-05-UI-Components-Fidelity-And-Controls.md",
    owns: "core/admin/ui/media/ leaf components: MediaCard.tsx, MediaGrid.tsx, MediaToolbar.tsx, MediaDetailsDrawer.tsx, MediaSettingsDrawer.tsx, NEW StorageQuotaCard.tsx, MediaFolderRail.tsx, NEW leaf controls TagInput.tsx + FocalPointPicker.tsx",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit (MANDATORY — catches excess/missing-prop breaks in unowned test renders of MediaGrid/MediaToolbar/MediaDetailsDrawer; keep new shared-component props OPTIONAL); bun run test:vitest for the media UI tests + confirm MediaPicker.tsx still compiles",
  },
  {
    id: "512-06",
    file: "TASK-512-06-Page-Assembly-And-Layout.md",
    owns: "core/admin/ui/media/MediaLibraryPage.tsx",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the media library page tests",
  },
];

phase("Implement");
let prevNote = "";
const implResults = [];
for (const st of SUBTASKS) {
  const r = await agent(
    `${COMMON}

YOUR SUBTASK: ${st.id} — read ${WT}/_docs/_TASKS/${st.file} for the execution-ready contract and follow it PRECISELY.
OWNED FILES (single writer): ${st.owns}.
${prevNote ? `PRIOR SUBTASK CONTEXT (for consuming its output): ${prevNote}` : "This is the keystone subtask (nothing consumes it yet)."}

GATES (run in ${WT} with .env sourced — prefix each with: ${ENV} && ...): ${st.gates}. Capture PASS/FAIL + first error line for each in the gates field.

Return the structured result. In notes, include anything the NEXT sequential subtask needs (e.g. new column names/types, new service function signatures, new route paths, new client function names, migration index used).`,
    { label: `impl:${st.id}`, phase: "Implement", schema: IMPL_SCHEMA }
  );
  implResults.push(r);
  log(`Implement ${st.id}: done=${r?.done} gates=${(r?.gates || "").slice(0, 120)}`);
  if (!r?.done) {
    log(
      `STOP: ${st.id} did not land green — halting the sequential chain (later subtasks consume it).`
    );
    return { task: "TASK-512", halted: st.id, implResults };
  }
  prevNote = `${st.id} done. ${(r?.notes || "").slice(0, 700)}`;
}

phase("Audit");
const LENSES = [
  {
    key: "schema-security",
    prompt: `Adversarial SCHEMA + SECURITY audit of TASK-512 in worktree ${WT}. Review the full diff \`cd ${WT} && git diff feature/tasks...feature/task-512\`. Verify: migration is additive/reversible with full artifacts (SQL + snapshot + journal) and a non-colliding index; every NEW validated payload key has a JSON-schema entry with additionalProperties:false AND a service-side normalize/reject-unknown (mediaSchemas + the settingsSchemas quota key); all media/folder writes stay behind media:write, reads behind media:read (NO new RBAC bucket, NO loosened auth); new routes ride CSRF/session; nullable/back-compat columns; NO byte-identity regression on existing payloads. Flag deviations. isReal only if defensible.`,
  },
  {
    key: "fidelity",
    prompt: `Adversarial PROTOTYPE-FIDELITY audit of TASK-512 in worktree ${WT}. Read the prototype SOURCE ${WT}/_docs/_PROTOTYPE/src/pages/media/MediaLibraryPage.tsx + its components, and compare to the implemented core/admin/ui/media/* (git diff feature/tasks...feature/task-512). Verify the layout/structure/tokens match the prototype FAITHFULLY (storage quota card with progress, folder rail, FilterBar with Filters control, grid card with top-left type badge + tone chip) AND that new controls (folders, tags, focal point, quota) are genuinely functional (not cosmetic). Flag any place the impl invented a conservative deviation instead of reproducing the prototype, or any dark-mode/token break (literal bg-white etc.). isReal only if defensible with a file:line + prototype reference.`,
  },
  {
    key: "regression",
    prompt: `Adversarial REGRESSION + BACK-COMPAT audit of TASK-512 in worktree ${WT}. Verify: new props on SHARED leaf components (MediaGrid, MediaToolbar, MediaDetailsDrawer) are OPTIONAL so unowned test renders + MediaPicker.tsx compile unchanged; core/server/routes/index.ts was NOT edited (folder routes register from registerMediaRoutes); cachePolicy.ts + settingsClient.ts edits are append-only (no existing key touched). Run \`${ENV} && ./node_modules/.bin/tsc -p tsconfig.json --noEmit\` and \`${ENV} && bun run test:vitest\` (media-related files) + \`${ENV} && bun run test:bun\` (media/settings service+route files; re-run under-load timeouts in isolation) and report exact pass/fail counts. Flag any real regression. isReal only if defensible.`,
  },
];
const audits = await parallel(
  LENSES.map(
    (l) => () =>
      agent(l.prompt, { label: `audit:${l.key}`, phase: "Audit", schema: AUDIT_SCHEMA }).then(
        (a) => ({ ...a, key: l.key })
      )
  )
);
const realFindings = audits
  .filter(Boolean)
  .flatMap((a) => (a.findings || []).filter((f) => f.isReal).map((f) => ({ ...f, lens: a.key })));
const realHighMed = realFindings.filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM");
log(
  `Audit: ${audits
    .filter(Boolean)
    .map((a) => `${a.key}=${a.verdict}`)
    .join(
      " "
    )} | real HIGH/MED=${realHighMed.length} LOW=${realFindings.length - realHighMed.length}`
);

phase("Fix");
if (realHighMed.length > 0) {
  const fixList = realHighMed
    .map((f, i) => `${i + 1}. [${f.severity}] (${f.lens}) ${f.file} — ${f.title}: ${f.detail}`)
    .join("\n");
  const fix = await agent(
    `${COMMON}

Fix these REAL audit findings on the TASK-512 implementation in worktree ${WT}. Respect the single-writer map — edit each file per its owning subtask's contract; do NOT weaken tests to pass. After fixing, re-run: ${ENV} && bun --cwd core lint && bun --cwd core lint:types && ./node_modules/.bin/tsc -p tsconfig.json --noEmit and the affected vitest/bun tests. Findings:\n${fixList}\n\nReport what you changed + the re-run gate results in the gates field.`,
    { label: "fix:512", phase: "Fix", schema: IMPL_SCHEMA }
  );
  log(`Fix: done=${fix?.done} gates=${(fix?.gates || "").slice(0, 140)}`);
} else {
  log("Fix: no real HIGH/MEDIUM findings — skipping.");
}

phase("Closure");
const closure = await agent(
  `${COMMON.replace("Do NOT commit (the Closure phase owns the commit).", "You OWN the commit for this task.")}

YOUR SUBTASK: 512-07 (Tests, Docs, Smoke & Closure) — read ${WT}/_docs/_TASKS/TASK-512-07-Tests-Docs-Smoke-Closure.md. The 6 implementation subtasks are already applied + audited in this worktree; do NOT edit their owned production files. Your job:

1) TESTS — add/complete the Vitest + Bun tests the closure contract specifies (schema round-trip, service normalize/reject-unknown, route RBAC, client cache, UI fidelity/controls). Ensure full gates green.
2) DOCS — update the docs the closure contract names (media model/spec, DATA_MODEL / CMS_API / SECURITY_SPEC as applicable) to reflect the new folders/tags/focal-point/quota model + routes.
3) CHANGELOG — the contract pins 1224 but 1224 is TAKEN (TASK-515). Determine NEXT-FREE: \`cd ${WT} && ls _docs/_CHANGELOG/ | grep -oE '^[0-9]+' | sort -n | tail -1\` and use highest+1 (expected 1225). Create _docs/_CHANGELOG/<N>-2026-07-06-task-512-media-library-prototype-fidelity.md covering TASK-512 + all 7 leaves, the schema/service/route/client/UI changes, and the migration index used. Update _docs/_CHANGELOG/README.md next-pointer to <N>+1. Fix stale 1224 references in the 512 task files to <N>.
4) BOARD — _docs/_TASKS/README.md: ensure parent TASK-512 + 7 child rows exist (do not duplicate); flip all to Done (2026-07-06); bump Statistics consistently.
5) TASK FILES — set Status ✅ Done in the parent + all 7 subtask files.
6) FINAL GATES (run in ${WT}, capture PASS/FAIL + first error each in gates field): ${ENV} && bun --cwd core lint ; bun --cwd core lint:types ; ./node_modules/.bin/tsc -p tsconfig.json --noEmit ; bun run test:bun (re-run named under-load timeouts in isolation — a confirmed isolated pass = flake) ; bun run test:vitest ; bun run gates:coderso.
NOTE: the ≥5-scenario LIVE prototype-fidelity playwright smoke is run by the ORCHESTRATOR post-merge (the dev host serves the MAIN tree, not this worktree) — do NOT restart the dev host. Note this deferral in your result.
7) COMMIT — cd ${WT} && git add -A && git commit -m "feat(media): TASK-512 media library prototype fidelity + folders/tags/focal-point/quota schema" with a body summarizing the schema/service/route/client/UI work + changelog <N>. End the body with:\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>\nThe precommit hook runs lint+typecheck — if it blocks, fix and re-commit. Return the structured result with the actual changelog file, commit sha, and gate results.`,
  { label: "closure:512-07", phase: "Closure", schema: CLOSURE_SCHEMA }
);
log(
  `Closure: done=${closure?.done} changelog=${closure?.changelogFile} committed=${closure?.committed} sha=${closure?.commitSha}`
);
log(`Closure gates: ${(closure?.gates || "").slice(0, 200)}`);

return {
  task: "TASK-512",
  worktree: WT,
  implResults: implResults.map((r) => ({ subtask: r?.subtask, done: r?.done })),
  auditVerdicts: audits.filter(Boolean).map((a) => ({ lens: a.key, verdict: a.verdict })),
  realFindings,
  closure,
};
