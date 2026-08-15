export const meta = {
  name: "task-516-impl",
  description:
    "Implement TASK-516 (Forms editor prototype fidelity + form styling + file field type) on its worktree: 7 strictly-sequential subtasks in land order 01→02→04→03→05→06→07, each gated green, then parallel adversarial audits (aggressive prototype-fidelity + hard security lens for the new public upload route), fix real findings, and closure.",
  phases: [{ title: "Implement" }, { title: "Audit" }, { title: "Fix" }, { title: "Closure" }],
};

const WT =
  (typeof args === "string" ? JSON.parse(args) : args)?.wt ||
  "/home/coder/project/Coderso-task-516";
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

const COMMON = `You work ONLY in the isolated git worktree at ${WT} (branch feature/task-516). This is TASK-516 (Forms editor prototype fidelity + form styling + file field type).
ALWAYS read first: _docs/_TASKS/TASK-516_Forms_Editor_Prototype_Fidelity_And_Form_Styling.md (parent: gap analysis, land order, single-writer ownership incl. the documented file-case seam, coordination/collision guards, Security) AND your own subtask contract. Edit ONLY the files your subtask owns (single-writer); the ONLY multi-writer exception is 516-07's additive file-case-only seam edits (documented in the parent).
PROTOTYPE FIDELITY IS THE ACCEPTANCE BAR (owner reviews live side-by-side and rejects old-approach leftovers). Read the prototype SOURCE for the forms builder under ${WT}/_docs/_PROTOTYPE/src/ (classes/tokens/structure), not screenshots. Reproduce the prototype's LAYOUT/STRUCTURE faithfully (builder chrome, field rail, canvas, design/field inspector). CRITICAL RULE (owner mandate from TASK-513/514): if you keep ANYTHING from the old admin approach, ADAPT it to the prototype's UI/UX — do NOT leave old surfaces as-is (no stray switchers/filters/docked panels the prototype lacks; primary actions in the in-page PageHeader, not the outer AdminShell topbar).
The shared theme vocabulary (enum unions, clamp sets, resolveFormTheme) is defined ONCE in 516-01 and imported read-only by 516-02/04/06 — do not redefine or drift it.
GREP TRAP: rg/grep misdetect the large TSX (formEmbed.tsx, FormBuilderPage.tsx, FormCanvas.tsx) as binary and return nothing — use \`grep -an\` or the Read tool for those files.
No DB migration in this task (form theme lives in jsonb settings). New validated keys schema-first (additionalProperties:false) + service normalize + reject-unknown. New props on SHARED components OPTIONAL (root-tsc back-compat).
Do NOT commit (the Closure phase owns the commit). If a gate fails, FIX and re-run until green before returning.`;

// Land order per parent §211: 516-01 -> 516-02 -> 516-04 -> 516-03 -> 516-05 -> 516-06 -> 516-07.
const SUBTASKS = [
  {
    id: "516-01",
    file: "TASK-516-01-Form-Theme-Model-And-Resolver.md",
    owns: "core/services/forms/formSettings.ts, NEW core/services/forms/formTheme.ts (theme model + enum unions + clamp sets + resolveFormTheme — the ONE source of truth), core/admin/services/formsClient.ts (FormSettings type mirror)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:bun + test:vitest for the form settings/theme tests",
  },
  {
    id: "516-02",
    file: "TASK-516-02-Form-Design-Inspector-Panel.md",
    owns: "NEW core/admin/ui/forms/FormDesignPanel.tsx (design inspector — imports theme vocab read-only from 516-01)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the design panel tests",
  },
  {
    id: "516-04",
    file: "TASK-516-04-Canvas-Fidelity-And-Preview-Fixes.md",
    owns: "core/admin/ui/forms/FormCanvas.tsx (canvas fidelity + field-preview fixes + theme apply; ADD optional deviceWidth?/theme? props to FormCanvasProps so 516-03 can wire them — no-op until supplied)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the form canvas tests",
  },
  {
    id: "516-03",
    file: "TASK-516-03-Builder-Chrome-And-Rail-Fidelity.md",
    owns: "core/admin/ui/forms/FormBuilderPage.tsx, core/admin/ui/forms/FieldLibrary.tsx (builder chrome + rail fidelity + mount the 516-02 FormDesignPanel + pass deviceWidth/theme to FormCanvas; STOP rendering FieldListPanel but leave FieldListPanel.tsx file unchanged)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the form builder page tests",
  },
  {
    id: "516-05",
    file: "TASK-516-05-Field-Settings-Control-Fixes.md",
    owns: "core/admin/ui/forms/FieldSettingsPanel.tsx, core/services/forms/fieldSettings.ts (field settings control fixes B1 wiring/B4/B5/B6)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the field settings tests",
  },
  {
    id: "516-06",
    file: "TASK-516-06-Runtime-Theme-Application.md",
    owns: "core/admin/ui/forms/FormRuntimePreviewDialog.tsx, core/widgets/core/formEmbed.tsx, AND the per-region mapFormBindingToEmbedData block in core/services/pages/pageRendererV2.tsx (~:1329-1361 — present-only `theme` passthrough ONLY; the projection currently drops theme so the public embed renders un-themed)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest + test:bun for the runtime theme / page renderer form-embed tests",
  },
  {
    id: "516-07",
    file: "TASK-516-07-File-Field-Type.md",
    owns: 'core/services/forms/validation.ts, core/services/forms/submissionService.ts; NEW core/services/forms/formAttachment.ts + core/services/forms/mimeMatchesAccept.ts; core/server/routes/formsRoutes.ts (submission branch + NEW public route POST /forms/:id/uploads handleFormAttachmentUploadRoute + additive mapFormError media cases); NEW formAttachmentUploadSchema in core/server/validation/formSchemas.ts; additive edits to core/services/media/mediaService.ts (uploadMedia `constraints?` param) + core/services/media/mediaUsageService.ts ("submission" MediaUsageTargetType + form_submissions scan); PLUS the documented additive file-case-ONLY seam edits to FieldLibrary.tsx/FormBuilderPage.tsx (rail item), FormCanvas.tsx (preview), formEmbed.tsx (control), FormRuntimePreviewDialog.tsx (control)',
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:bun (upload route: mime/size constraints enforced, reject-unknown, unauthorized/oversized/wrong-mime rejected, media usage tracked as submission) + test:vitest for the file-field UI",
  },
];

phase("Implement");
let prevNote = "";
const implResults = [];
for (const st of SUBTASKS) {
  const r = await agent(
    `${COMMON}

YOUR SUBTASK: ${st.id} — read ${WT}/_docs/_TASKS/${st.file} for the execution-ready contract and follow it PRECISELY.
OWNED FILES (single writer${st.id === "516-07" ? " + the documented additive file-case seam" : ""}): ${st.owns}.
${prevNote ? `PRIOR SUBTASK CONTEXT (for consuming its output): ${prevNote}` : "This is the foundation subtask (defines the theme vocabulary consumed by later subtasks)."}
${st.id === "516-07" ? 'SECURITY (heaviest subtask): the NEW public POST /forms/:id/uploads route MUST enforce max size + an accept/mime allowlist server-side (mimeMatchesAccept), reject unknown/oversized/disallowed with a clear 4xx, never trust client-declared mime alone, never path-traverse, and track the upload as a "submission" media usage. Do NOT loosen any existing auth. Follow the 516-07 Security contract exactly.' : ""}

GATES (run in ${WT} with .env sourced — prefix each with: ${ENV} && ...): ${st.gates}. Capture PASS/FAIL + first error line for each in the gates field.

Return the structured result. In notes, include anything the NEXT sequential subtask needs (theme enum/type names + resolveFormTheme signature, new component names + props, FormCanvas prop additions, route path/schema names).`,
    { label: `impl:${st.id}`, phase: "Implement", schema: IMPL_SCHEMA }
  );
  implResults.push(r);
  log(`Implement ${st.id}: done=${r?.done} gates=${(r?.gates || "").slice(0, 120)}`);
  if (!r?.done) {
    log(
      `STOP: ${st.id} did not land green — halting (later subtasks consume it). Resume with resumeFromRunId after diagnosis.`
    );
    return { task: "TASK-516", halted: st.id, implResults };
  }
  prevNote = `${st.id} done. ${(r?.notes || "").slice(0, 800)}`;
}

phase("Audit");
const LENSES = [
  {
    key: "security",
    prompt: `HARD SECURITY audit of TASK-516 in worktree ${WT}, focused on 516-07's NEW public route POST /forms/:id/uploads + media edits. Review \`cd ${WT} && grep -an handleFormAttachmentUploadRoute core/server/routes/formsRoutes.ts\` and the new formAttachment.ts / mimeMatchesAccept.ts / formAttachmentUploadSchema. PROVE: (a) server-side max-size enforced (not just client); (b) accept/mime allowlist enforced server-side via mimeMatchesAccept — a wrong/spoofed mime is rejected; (c) reject-unknown on the schema (400); (d) no path traversal / no attacker-controlled storage key; (e) the route does not leak or loosen auth vs other form routes, and rate/abuse posture is reasonable for a PUBLIC endpoint; (f) uploaded media tracked as \"submission\" usage; (g) no secret/password echoed or logged. Also confirm the form theme jsonb writes are reject-unknown validated + clamped. Flag each gap at the right severity. isReal only if defensible with file:line.`,
  },
  {
    key: "fidelity",
    prompt: `AGGRESSIVE PROTOTYPE-FIDELITY audit of TASK-516 in worktree ${WT} — owner reviews the forms builder live side-by-side and rejects old-approach leftovers. Read the prototype SOURCE for the forms builder under ${WT}/_docs/_PROTOTYPE/src/ and compare to the implemented core/admin/ui/forms/* (use grep -an or Read for the large TSX). Verify FAITHFUL reproduction of: builder chrome (in-page PageHeader with actions, NOT outer topbar), the field rail, the canvas + field previews, the Design inspector panel + Field settings panel, device-width + theme application. Flag (≥MEDIUM) any old-approach leftover the prototype does not have: stray docked panels that should be on-demand, duplicated controls, actions in the wrong shell, FieldListPanel still rendered, token/dark-mode breaks, structure/grouping divergence. Cite prototype file:line vs impl file:line. The bar is faithful structural match with old surfaces adapted, not preserved. isReal only if defensible.`,
  },
  {
    key: "regression",
    prompt: `Adversarial REGRESSION + BACK-COMPAT + SINGLE-WRITER audit of TASK-516 in worktree ${WT}. Verify: (a) the shared theme vocabulary is defined ONCE in formTheme.ts and imported read-only (no drift/redefinition in 02/04/06); (b) FormCanvas deviceWidth?/theme? props are OPTIONAL; (c) the ONLY multi-writer file edits are 516-07's documented additive file-case-only seam (FieldLibrary/FormBuilderPage/FormCanvas/formEmbed/FormRuntimePreviewDialog) — confirm they are file-case-only + additive, not rewrites; (d) pageRendererV2.tsx mapFormBindingToEmbedData now passes theme through (present-only) so public embeds render themed; (e) FieldListPanel.tsx left unchanged (still test-covered) though no longer rendered. Run \`${ENV} && ./node_modules/.bin/tsc -p tsconfig.json --noEmit\` + \`${ENV} && bun run test:vitest\` (forms files) + \`${ENV} && bun run test:bun\` (forms/media service+route; re-run under-load timeouts isolated) and report exact pass/fail counts. Flag real regressions. isReal only if defensible.`,
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

Fix these REAL audit findings on the TASK-516 implementation in worktree ${WT}. Respect single-writer ownership + the file-case seam; do NOT weaken tests. Security findings MUST be fully closed (server-side enforcement, not client-only). Prototype-fidelity findings MUST be fixed by adapting to the prototype. After fixing, re-run: ${ENV} && bun --cwd core lint && bun --cwd core lint:types && ./node_modules/.bin/tsc -p tsconfig.json --noEmit and the affected vitest/bun tests. Findings:\n${fixList}\n\nReport what you changed + re-run gate results in the gates field.`,
    { label: "fix:516", phase: "Fix", schema: IMPL_SCHEMA }
  );
  log(`Fix: done=${fix?.done} gates=${(fix?.gates || "").slice(0, 140)}`);
} else {
  log("Fix: no real HIGH/MEDIUM findings — skipping.");
}

phase("Closure");
const closure = await agent(
  `${COMMON.replace("Do NOT commit (the Closure phase owns the commit).", "You OWN the commit for this task.")}

YOUR SUBTASK: closure — read the closure/tests requirements in the parent + subtask contracts. The 7 implementation subtasks are applied + audited in this worktree; do NOT edit their owned production files. Your job:

1) TESTS — add/complete the Vitest + Bun tests the contracts specify (theme resolver clamp/reject-unknown; design + field inspector panels; canvas theme apply; runtime theme inherit on public embed; file upload route security: size/mime/reject-unknown/usage-tracked). Ensure gates green.
2) DOCS — update the docs the contracts name (forms theme/styling model + file field + upload route + security) in FORMS spec / CMS_API / SECURITY_SPEC as applicable.
3) CHANGELOG — pinned 1228; verify next-free via \`cd ${WT} && ls _docs/_CHANGELOG/ | grep -oE '^[0-9]+' | sort -n | tail -1\` (expected 1227 → use 1228). Create _docs/_CHANGELOG/1228-2026-07-06-task-516-forms-editor.md covering TASK-516 + all 7 leaves (note: NO DB migration; new public upload route). Update _docs/_CHANGELOG/README.md next-pointer to 1229.
4) BOARD — _docs/_TASKS/README.md: ensure parent TASK-516 + 7 child rows exist (no duplicates); flip all to Done (2026-07-06); bump Statistics consistently.
5) TASK FILES — set Status ✅ Done in parent + all 7 subtask files.
6) FINAL GATES (run in ${WT}, capture PASS/FAIL + first error each): ${ENV} && bun --cwd core lint ; bun --cwd core lint:types ; ./node_modules/.bin/tsc -p tsconfig.json --noEmit ; bun run test:bun (re-run named under-load timeouts isolated) ; bun run test:vitest ; bun run gates:coderso.
NOTE: the ≥5-scenario LIVE prototype-fidelity playwright smoke is run by the ORCHESTRATOR post-merge (dev host serves the MAIN tree, not this worktree) — do NOT restart the dev host. Note this deferral.
7) COMMIT — cd ${WT} && git add -A && git commit -m "feat(forms): TASK-516 forms editor prototype fidelity + form styling + file field type" with a body summarizing theme model, builder/canvas/inspector fidelity, runtime theme inherit, file field + upload route + changelog 1228. End the body with:\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>\nThe precommit hook runs lint+typecheck — if it blocks, fix and re-commit. Return the structured result with the actual changelog file, commit sha, and gate results.`,
  { label: "closure:516", phase: "Closure", schema: CLOSURE_SCHEMA }
);
log(
  `Closure: done=${closure?.done} changelog=${closure?.changelogFile} committed=${closure?.committed} sha=${closure?.commitSha}`
);
log(`Closure gates: ${(closure?.gates || "").slice(0, 200)}`);

return {
  task: "TASK-516",
  worktree: WT,
  implResults: implResults.map((r) => ({ subtask: r?.subtask, done: r?.done })),
  auditVerdicts: audits.filter(Boolean).map((a) => ({ lens: a.key, verdict: a.verdict })),
  realFindings,
  closure,
};
