export const meta = {
  name: "task-513-impl",
  description:
    "Implement TASK-513 (Engine / Content-Type Editor prototype fidelity) on its worktree: 5 strictly-sequential subtasks in land order 01→02→04→03→05 (config schema, date+slug field types, permissions panel, editor rebuild, functional schema builder), each gated green, then parallel adversarial audits, fix real findings, and closure (tests/docs/changelog/board).",
  phases: [{ title: "Implement" }, { title: "Audit" }, { title: "Fix" }, { title: "Closure" }],
};

const WT =
  (typeof args === "string" ? JSON.parse(args) : args)?.wt ||
  "/home/coder/project/Coderso-task-513";
const ENV = `cd ${WT} && set -a && { [ -f .env ] || cp /home/coder/project/Coderso/.env .env 2>/dev/null; }; . ./.env 2>/dev/null; set +a`;

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

const COMMON = `You work ONLY in the isolated git worktree at ${WT} (branch feature/task-513). This is TASK-513 (Engine / Content-Type Editor prototype fidelity).
ALWAYS read first: _docs/_TASKS/TASK-513_Engine_Content_Type_Editor_Prototype_Fidelity.md (parent: prototype sources, gap analysis, land order, single-writer ownership, per-subtask execution-ready contracts, coordination notes) AND your own subtask contract. Edit ONLY the files your subtask owns (single-writer) — touching another subtask's file breaks the one-owner rule.
LIVE ENVIRONMENT / fidelity: the prototype is the visual source of truth — read prototype SOURCE for the content-type/engine editor pages under ${WT}/_docs/_PROTOTYPE/src/ (classes/tokens/structure), not just screenshots. Reproduce layout/structure/tokens FAITHFULLY (4 tabs incl. Permissions, Type settings card with mono API ID, Slug+Date field types, drag-to-reorder rows) and adapt/extend functionality — do NOT invent conservative deviations.
Config/permissions architecture (critical): the AUTHORITATIVE config shape + server normalizeContentTypeConfig live in the NEW db/Bun-free module core/services/content/contentTypeConfig.ts (513-01). typeService.ts imports the normalizer + re-exports types; the admin UI must NOT import typeService.ts — it imports the client MIRROR from core/admin/services/contentTypesClient.ts (513-01). 513-04 defines its OWN UI-side normalizePermissionsMatrix aliasing 513-01's client-mirrored types, importing NO server module.
Shared test DB: worktree needs .env (copy from main if absent). Migrations additive+idempotent. New validated keys schema-first (additionalProperties:false) + service normalize + reject-unknown. New props on SHARED components OPTIONAL (root-tsc back-compat). SchemaBuilder's ContentField/FieldType union widening (add "date"|"slug") is additive; downstream consumers passthrough unknown types.
Do NOT commit (the Closure phase owns the commit). If a gate fails, FIX and re-run until green before returning.`;

// Land order per parent: 513-01 -> 513-02 -> 513-04 -> 513-03 -> 513-05 -> (513-06 = closure).
const SUBTASKS = [
  {
    id: "513-01",
    file: "TASK-513-01-Content-Type-Config-Schema-Extension.md",
    owns: "core/db/schema.ts (content_types block: add `config jsonb NOT NULL DEFAULT {}`), a NEW migration (next-free index — 512 took 0067 so expected 0068; grep migrations dir + meta/_journal.json, do NOT hardcode) via ROOT `bun run db:generate` with full artifacts (SQL + meta/<idx>_snapshot.json + journal), NEW db/Bun-free module core/services/content/contentTypeConfig.ts (normalizeContentTypeConfig + CONFIG_KEYS/CAP_KEYS/isRecord + ContentTypeConfig/ContentTypePermissionCapabilities types), core/services/content/typeService.ts (import normalizer + re-export types; wire create/update/duplicate/list), core/server/validation/contentSchemas.ts, core/admin/services/contentTypesClient.ts (client MIRROR of config types + resolveDraftsEnabled/resolveVersioning helpers + payload)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; ROOT `bun run db:generate` then `bun run db:migrate` (source .env) applies cleanly + idempotent re-run; bun run test:bun for the content type/config service tests",
  },
  {
    id: "513-02",
    file: "TASK-513-02-Date-And-Slug-Field-Types.md",
    owns: 'core/admin/ui/content-types/SchemaBuilder.tsx (SOLE writer of ContentField/FieldType union — add "date"|"slug" additively), core/admin/ui/content-types/FieldEditor.tsx, core/admin/ui/content-types/schemaMapping.ts, core/admin/ui/entries/FieldRenderer.tsx',
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit (MANDATORY — union widening must not break downstream custom-screens/entries consumers); bun run test:vitest for the content-type schema/field tests",
  },
  {
    id: "513-04",
    file: "TASK-513-04-Permissions-Tab-Panel.md",
    owns: "core/admin/ui/content-types/ContentTypePermissionsPanel.tsx (NEW), core/admin/ui/content-types/contentTypePermissions.ts (NEW UI-side normalizePermissionsMatrix minimizer aliasing 513-01's client-mirrored types — imports NO server module)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the permissions panel/matrix tests",
  },
  {
    id: "513-03",
    file: "TASK-513-03-Editor-Prototype-Fidelity-Rebuild.md",
    owns: 'core/admin/ui/content-types/ContentTypeEditor.tsx (add "permissions" to EditorTab union + TabsTrigger + conditional render importing ContentTypePermissionsPanel from 513-04), core/admin/ui/content-types/ContentTypeFieldsPanel.tsx (NEW), core/admin/ui/content-types/ContentTypeSettingsCard.tsx (NEW — Type settings card w/ mono API ID)',
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the content-type editor tests",
  },
  {
    id: "513-05",
    file: "TASK-513-05-Schema-Builder-Functional.md",
    owns: "core/admin/ui/content-types/SchemaBuilderPage.tsx, core/admin/ui/content-types/SchemaPreviewPanel.tsx",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the schema-builder tests",
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

Return the structured result. In notes, include anything the NEXT sequential subtask needs (new types/exports, new component names + props, new field-type arms, migration index used, config/permission shape).`,
    { label: `impl:${st.id}`, phase: "Implement", schema: IMPL_SCHEMA }
  );
  implResults.push(r);
  log(`Implement ${st.id}: done=${r?.done} gates=${(r?.gates || "").slice(0, 120)}`);
  if (!r?.done) {
    log(
      `STOP: ${st.id} did not land green — halting the sequential chain (later subtasks consume it).`
    );
    return { task: "TASK-513", halted: st.id, implResults };
  }
  prevNote = `${st.id} done. ${(r?.notes || "").slice(0, 800)}`;
}

phase("Audit");
const LENSES = [
  {
    key: "schema-security",
    prompt: `Adversarial SCHEMA + SECURITY audit of TASK-513 in worktree ${WT}. Review the full diff \`cd ${WT} && git diff feature/tasks...feature/task-513\`. Verify: the config migration is additive (one jsonb column DEFAULT '{}') with full artifacts + non-colliding index; normalizeContentTypeConfig is a strict allowlist (reject-unknown) covering per-role permission capabilities; contentSchemas additionalProperties:false with the typed config; NO new endpoint/RBAC bucket; the db-free module architecture holds (admin UI imports the client mirror, NOT typeService.ts; the UI normalizePermissionsMatrix imports no server module); legacy content_types rows read byte-identical (config defaults {}). Flag deviations. isReal only if defensible with file:line.`,
  },
  {
    key: "fidelity",
    prompt: `Adversarial PROTOTYPE-FIDELITY audit of TASK-513 in worktree ${WT}. Read the prototype SOURCE for the content-type/engine editor under ${WT}/_docs/_PROTOTYPE/src/ and compare to the implemented core/admin/ui/content-types/* + entries/FieldRenderer (git diff feature/tasks...feature/task-513). Verify FAITHFUL reproduction: 4 tabs including Permissions, Type settings card (mono API ID = slug), Slug + Date field types present in the field list + rendered, drag-to-reorder + row actions in the Fields area, tokens/structure match (no literal bg-white/dark-mode break, no invented conservative deviation). Flag any gap with a file:line + prototype reference. isReal only if defensible.`,
  },
  {
    key: "regression",
    prompt: `Adversarial REGRESSION + BACK-COMPAT audit of TASK-513 in worktree ${WT}. Verify the ContentField/FieldType union widening (add "date"|"slug") does NOT break downstream consumers (custom-screens/*, entries/*): \`cd ${WT} && grep -rn "FieldType\\|ContentField" core/admin/ui/custom-screens core/admin/ui/entries | head\` and confirm they passthrough unknown types (no broken exhaustive switch). Confirm 513-03's import of ContentTypePermissionsPanel from 513-04 resolves; contentEntryRoutes.ts is NOT edited. Run \`${ENV} && ./node_modules/.bin/tsc -p tsconfig.json --noEmit\` + \`${ENV} && bun run test:vitest\` (content-type + entries + custom-screens files) + \`${ENV} && bun run test:bun\` (content type/config service files; re-run under-load timeouts in isolation) and report exact pass/fail counts. Flag real regressions. isReal only if defensible.`,
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

Fix these REAL audit findings on the TASK-513 implementation in worktree ${WT}. Respect the single-writer map — edit each file per its owning subtask; do NOT weaken tests to pass. After fixing, re-run: ${ENV} && bun --cwd core lint && bun --cwd core lint:types && ./node_modules/.bin/tsc -p tsconfig.json --noEmit and the affected vitest/bun tests. Findings:\n${fixList}\n\nReport what you changed + the re-run gate results in the gates field.`,
    { label: "fix:513", phase: "Fix", schema: IMPL_SCHEMA }
  );
  log(`Fix: done=${fix?.done} gates=${(fix?.gates || "").slice(0, 140)}`);
} else {
  log("Fix: no real HIGH/MEDIUM findings — skipping.");
}

phase("Closure");
const closure = await agent(
  `${COMMON.replace("Do NOT commit (the Closure phase owns the commit).", "You OWN the commit for this task.")}

YOUR SUBTASK: 513-06 (Integration tests, gates, Playwright smoke, closure) — read ${WT}/_docs/_TASKS/TASK-513-06-Integration-Tests-Smoke-Closure.md. The 5 implementation subtasks are already applied + audited in this worktree; do NOT edit their owned production files. Your job:

1) TESTS — add/complete the Vitest + Bun integration tests the closure contract specifies (config round-trip + reject-unknown, date/slug field types, permissions matrix normalize, editor tabs, schema builder; the back-compat guard test that custom-screens/entries type-narrow safely for the widened union). Ensure gates green.
2) DOCS — update the docs the closure contract names (content-type/engine model + config + permissions + field types) in DATA_MODEL / CMS_API / relevant spec docs.
3) CHANGELOG — the contract pins 1225 but 1225 is TAKEN (TASK-512). Determine NEXT-FREE: \`cd ${WT} && ls _docs/_CHANGELOG/ | grep -oE '^[0-9]+' | sort -n | tail -1\` and use highest+1 (expected 1226). Create _docs/_CHANGELOG/<N>-2026-07-06-task-513-engine-content-type-editor.md covering TASK-513 + all 6 leaves, the config-schema/field-types/permissions/editor/schema-builder changes, and the migration index used. Update _docs/_CHANGELOG/README.md next-pointer to <N>+1. Fix stale 1225 references in the 513 task files to <N>.
4) BOARD — _docs/_TASKS/README.md: ensure parent TASK-513 + 6 child rows exist (no duplicates); flip all to Done (2026-07-06); bump Statistics consistently.
5) TASK FILES — set Status ✅ Done in parent + all 6 subtask files.
6) FINAL GATES (run in ${WT}, capture PASS/FAIL + first error each): ${ENV} && bun --cwd core lint ; bun --cwd core lint:types ; ./node_modules/.bin/tsc -p tsconfig.json --noEmit ; bun run test:bun (re-run named under-load timeouts in isolation — confirmed isolated pass = flake) ; bun run test:vitest ; bun run gates:coderso.
NOTE: the ≥5-scenario LIVE prototype-fidelity playwright smoke is run by the ORCHESTRATOR post-merge (dev host serves the MAIN tree, not this worktree) — do NOT restart the dev host. Note this deferral in your result.
7) COMMIT — cd ${WT} && git add -A && git commit -m "feat(content-types): TASK-513 engine content-type editor prototype fidelity (config schema, date/slug fields, permissions tab, schema builder)" with a body summarizing the work + changelog <N>. End the body with:\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>\nThe precommit hook runs lint+typecheck — if it blocks, fix and re-commit. Return the structured result with the actual changelog file, commit sha, and gate results.`,
  { label: "closure:513-06", phase: "Closure", schema: CLOSURE_SCHEMA }
);
log(
  `Closure: done=${closure?.done} changelog=${closure?.changelogFile} committed=${closure?.committed} sha=${closure?.commitSha}`
);
log(`Closure gates: ${(closure?.gates || "").slice(0, 200)}`);

return {
  task: "TASK-513",
  worktree: WT,
  implResults: implResults.map((r) => ({ subtask: r?.subtask, done: r?.done })),
  auditVerdicts: audits.filter(Boolean).map((a) => ({ lens: a.key, verdict: a.verdict })),
  realFindings,
  closure,
};
