export const meta = {
  name: "task-514-impl",
  description:
    "Implement TASK-514 (Entries editor prototype fidelity + entry visibility) on its worktree: 5 strictly-sequential subtasks in land order 01→02→04→03→05 (visibility backend, admin client, metadata panel, editor layout, list view), each gated green, then parallel adversarial audits (with an aggressive prototype-fidelity lens that hunts old-approach leftovers), fix real findings, and closure.",
  phases: [{ title: "Implement" }, { title: "Audit" }, { title: "Fix" }, { title: "Closure" }],
};

const WT =
  (typeof args === "string" ? JSON.parse(args) : args)?.wt ||
  "/home/coder/project/Coderso-task-514";
const ENV = `cd ${WT} && set -a && { [ -f .env ] || cp /home/coder/project/Coderso/.env .env 2>/dev/null; }; . ./.env 2>/dev/null; set +a`;

const IMPL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subtask", "done", "filesEdited", "gates", "notes"],
  properties: {
    subtask: { type: "string" },
    done: { type: "boolean" },
    filesEdited: { type: "array", items: { type: "string" } },
    gates: { type: "string" },
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

const COMMON = `You work ONLY in the isolated git worktree at ${WT} (branch feature/task-514). This is TASK-514 (Entries editor prototype fidelity + entry visibility).
ALWAYS read first: _docs/_TASKS/TASK-514_Entries_Editor_Prototype_Fidelity.md (parent: gap analysis, land order, single-writer ownership, per-subtask execution-ready pseudocode) AND your own subtask contract. Edit ONLY the files your subtask owns (single-writer).
PROTOTYPE FIDELITY IS THE ACCEPTANCE BAR (owner reviews live side-by-side). Read the prototype SOURCE for the entries editor + entries list under ${WT}/_docs/_PROTOTYPE/src/ (classes/tokens/structure), not screenshots. Reproduce the prototype's LAYOUT/STRUCTURE faithfully. CRITICAL RULE (owner mandate, learned from TASK-513): if you keep ANYTHING from the old admin approach, ADAPT it to the prototype's UI/UX — do NOT leave old surfaces as-is. Specifically DO NOT carry over old-approach leftovers that the prototype does not have: no type/entry switchers or "filter" sidebars inside a single-entry editor, no permanently-docked side panels that the prototype shows on-demand, no primary actions parked in the outer AdminShell topbar when the prototype puts them in the in-page PageHeader. When in doubt, match the prototype's placement exactly.
VISIBILITY SECURITY: accessPassword is an argon2 hash, WRITE-ONLY (never echoed in any GET/list/detail response); visibility writes are reject-unknown validated (400 on unknown); password never logged.
Shared test DB: worktree needs .env (copy from main if absent). Migrations additive+idempotent. New validated keys schema-first (additionalProperties:false) + service normalize + reject-unknown. New props on SHARED components OPTIONAL (root-tsc back-compat).
Do NOT commit (the Closure phase owns the commit). If a gate fails, FIX and re-run until green before returning.`;

// Land order per parent §549: 514-01 -> 514-02 -> 514-04 -> 514-03 -> 514-05 -> (514-06 closure).
const SUBTASKS = [
  {
    id: "514-01",
    file: "TASK-514-01-Entry-Visibility-Backend-Schema-Service-Routes.md",
    owns: "core/db/schema.ts (contentEntries block: add `visibility text NOT NULL DEFAULT 'public'` + `access_password text` nullable), a NEW migration (next-free index — 512=0067, 513=0068 already landed so expected 0069; grep migrations dir + meta/_journal.json, do NOT hardcode) via ROOT `bun run db:generate` with full artifacts, core/services/content/entryService.ts (EntryVisibility type + EntryDetail.visibility + accessPassword argon2 hash write-only, present-only normalize), core/server/validation/contentSchemas.ts (visibility enum + password, reject-unknown), core/server/routes/contentEntryRoutes.ts (visibility PATCH; password never echoed)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; ROOT `bun run db:generate` + `bun run db:migrate` (source .env) applies cleanly + idempotent; bun run test:bun for the entry route/service tests (visibility PATCH round-trip 200 + reject-unknown 400 + password NEVER echoed in GET/list)",
  },
  {
    id: "514-02",
    file: "TASK-514-02-Entries-Admin-Client-Visibility-Roundtrip.md",
    owns: "core/admin/services/entriesClient.ts (visibility types mirror + cache round-trip; accessPassword write-only in payload, never read back)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the entries client tests",
  },
  {
    id: "514-04",
    file: "TASK-514-04-Entry-Metadata-Panel-Publish-Visibility-Metadata-Cards.md",
    owns: "core/admin/ui/entries/EntryMetadataPanel.tsx (Publish card: Status+Visibility+Schedule; Taxonomy card; Metadata card) — match prototype cards/structure exactly",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the entry metadata panel tests",
  },
  {
    id: "514-03",
    file: "TASK-514-03-Entry-Editor-Prototype-Fidelity-Layout.md",
    owns: "core/admin/ui/entries/EntryEditor.tsx, core/admin/ui/entries/EntryEditorHeader.tsx (PageHeader + SectionCard grid + Content/Media grouping + wire EntryMetadataPanel + visibility + revisions seam) — reproduce prototype layout FAITHFULLY; actions in the in-page PageHeader, NOT the outer topbar; no old-approach leftovers",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the entry editor tests",
  },
  {
    id: "514-05",
    file: "TASK-514-05-Entries-List-View-Toggle-And-Row-Fidelity.md",
    owns: "core/admin/ui/entries/EntryList.tsx, core/admin/ui/entries/EntryTable.tsx, core/admin/ui/entries/EntryGrid.tsx, core/admin/ui/entries/EntryFilters.tsx, AND (region-owned, same commit) ONLY the EntryGrid/EntryFilters render blocks in tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx (coupled to the EntryGrid prop-contract change)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the entries list/table/grid tests",
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

Return the structured result. In notes, include anything the NEXT sequential subtask needs (new types/exports, new component props, visibility field shape, migration index used).`,
    { label: `impl:${st.id}`, phase: "Implement", schema: IMPL_SCHEMA }
  );
  implResults.push(r);
  log(`Implement ${st.id}: done=${r?.done} gates=${(r?.gates || "").slice(0, 120)}`);
  if (!r?.done) {
    log(
      `STOP: ${st.id} did not land green — halting (later subtasks consume it). Resume with resumeFromRunId after diagnosis.`
    );
    return { task: "TASK-514", halted: st.id, implResults };
  }
  prevNote = `${st.id} done. ${(r?.notes || "").slice(0, 800)}`;
}

phase("Audit");
const LENSES = [
  {
    key: "schema-security",
    prompt: `Adversarial SCHEMA + SECURITY audit of TASK-514 in worktree ${WT}. Review \`cd ${WT} && git diff feature/tasks...feature/task-514\`. Verify: visibility migration additive (2 columns, DEFAULT 'public') with full artifacts + non-colliding index; accessPassword is an argon2 hash that is WRITE-ONLY — grep the route/service/client to PROVE it is NEVER echoed in any GET/list/detail response and never logged; visibility validated as an enum with reject-unknown (400); legacy rows read byte-identical (visibility defaults 'public'). Flag deviations. isReal only if defensible with file:line.`,
  },
  {
    key: "fidelity",
    prompt: `AGGRESSIVE PROTOTYPE-FIDELITY audit of TASK-514 in worktree ${WT} — the owner reviews live side-by-side and rejected TASK-513 for carrying over old-approach UI. Read the prototype SOURCE for the entries editor + entries list under ${WT}/_docs/_PROTOTYPE/src/ and compare to the implemented core/admin/ui/entries/* (git diff feature/tasks...feature/task-514). Hunt for OLD-APPROACH LEFTOVERS the prototype does NOT have and flag each as at least MEDIUM: (a) any type/entry switcher or "filter types"/status-filter sidebar rendered INSIDE a single-entry editor; (b) any permanently-docked side panel (preview/JSON/meta) that the prototype shows on-demand behind a toggle; (c) primary actions (Save/Publish/Discard) parked in the outer AdminShell topbar when the prototype puts them in the in-page PageHeader right above the content; (d) card/section structure, grouping (Content/Media), tokens, or field placement that diverges from the prototype; (e) light AND dark mode token breaks (literal bg-white etc.). For each finding cite the prototype file:line vs the impl file:line. Do NOT pass "looks roughly similar" — the bar is faithful structural match with old surfaces adapted, not preserved. isReal only if defensible.`,
  },
  {
    key: "regression",
    prompt: `Adversarial REGRESSION + BACK-COMPAT audit of TASK-514 in worktree ${WT}. Verify: new props on shared entry components (EntryGrid/EntryFilters/EntryTable) are OPTIONAL so unowned test renders compile; the region-owned test edit in analytics-settings-entries-seo-leafs.test.tsx is limited to the EntryGrid/EntryFilters blocks; no unrelated file touched. Run \`${ENV} && ./node_modules/.bin/tsc -p tsconfig.json --noEmit\` + \`${ENV} && bun run test:vitest\` (entries files) + \`${ENV} && bun run test:bun\` (entry route/service; re-run under-load timeouts isolated) and report exact pass/fail counts. Flag real regressions. isReal only if defensible.`,
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

Fix these REAL audit findings on the TASK-514 implementation in worktree ${WT}. Respect the single-writer map; do NOT weaken tests. Prototype-fidelity findings MUST be fixed by adapting to the prototype (remove/relocate old surfaces), not by tweaking cosmetics. After fixing, re-run: ${ENV} && bun --cwd core lint && bun --cwd core lint:types && ./node_modules/.bin/tsc -p tsconfig.json --noEmit and the affected vitest/bun tests. Findings:\n${fixList}\n\nReport what you changed + re-run gate results in the gates field.`,
    { label: "fix:514", phase: "Fix", schema: IMPL_SCHEMA }
  );
  log(`Fix: done=${fix?.done} gates=${(fix?.gates || "").slice(0, 140)}`);
} else {
  log("Fix: no real HIGH/MEDIUM findings — skipping.");
}

phase("Closure");
const closure = await agent(
  `${COMMON.replace("Do NOT commit (the Closure phase owns the commit).", "You OWN the commit for this task.")}

YOUR SUBTASK: 514-06 (Tests, docs, closure) — read ${WT}/_docs/_TASKS/TASK-514-06-Tests-Docs-Closure.md. The 5 implementation subtasks are applied + audited in this worktree; do NOT edit their owned production files. Your job:

1) TESTS — add/complete the Vitest + Bun tests the closure contract specifies (visibility PATCH round-trip + reject-unknown + password-never-echoed; editor layout; metadata panel cards; list view toggle + visibility badge). Ensure gates green.
2) DOCS — _docs/DATA_MODEL.md visibility note + any entries/API doc the contract names.
3) CHANGELOG — the contract pins 1226 but 1226 is TAKEN (TASK-513). Determine NEXT-FREE: \`cd ${WT} && ls _docs/_CHANGELOG/ | grep -oE '^[0-9]+' | sort -n | tail -1\` and use highest+1 (expected 1227). Create _docs/_CHANGELOG/<N>-2026-07-06-task-514-entries-editor.md covering TASK-514 + all 6 leaves + the migration index used. Update _docs/_CHANGELOG/README.md next-pointer to <N>+1. Fix stale 1226 refs in the 514 task files to <N>.
4) BOARD — _docs/_TASKS/README.md: ensure parent TASK-514 + 6 child rows exist (no duplicates); flip all to Done (2026-07-06); bump Statistics consistently. NOTE: TASK-517 (entry visibility FRONT enforcement) is a SEPARATE deferred task — do NOT mark it done here.
5) TASK FILES — set Status ✅ Done in parent + all 6 subtask files.
6) FINAL GATES (run in ${WT}, capture PASS/FAIL + first error each): ${ENV} && bun --cwd core lint ; bun --cwd core lint:types ; ./node_modules/.bin/tsc -p tsconfig.json --noEmit ; bun run test:bun (re-run named under-load timeouts isolated) ; bun run test:vitest ; bun run gates:coderso.
NOTE: the ≥5-scenario LIVE prototype-fidelity playwright smoke is run by the ORCHESTRATOR post-merge (dev host serves the MAIN tree, not this worktree) — do NOT restart the dev host. Note this deferral.
7) COMMIT — cd ${WT} && git add -A && git commit -m "feat(entries): TASK-514 entries editor prototype fidelity + entry visibility (public/private/password)" with a body summarizing the work + changelog <N>. End the body with:\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>\nThe precommit hook runs lint+typecheck — if it blocks, fix and re-commit. Return the structured result with the actual changelog file, commit sha, and gate results.`,
  { label: "closure:514-06", phase: "Closure", schema: CLOSURE_SCHEMA }
);
log(
  `Closure: done=${closure?.done} changelog=${closure?.changelogFile} committed=${closure?.committed} sha=${closure?.commitSha}`
);
log(`Closure gates: ${(closure?.gates || "").slice(0, 200)}`);

return {
  task: "TASK-514",
  worktree: WT,
  implResults: implResults.map((r) => ({ subtask: r?.subtask, done: r?.done })),
  auditVerdicts: audits.filter(Boolean).map((a) => ({ lens: a.key, verdict: a.verdict })),
  realFindings,
  closure,
};
