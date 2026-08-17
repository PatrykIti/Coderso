export const meta = {
  name: "task-523-full",
  description:
    "TASK-523 Page Canvas Background + Occlusion-proof Cursor Spotlight — full standard pipeline: author/decompose → pre-audit → gated sequential implement → post-audit → closure. Fixes two live gaps: no whole-page background, and the cursor spotlight being occluded by opaque section backgrounds (only visible through translucent SVG/glass).",
  phases: [
    { title: "Ground", detail: "confirm the exact model/render/spotlight seams on the worktree" },
    { title: "Author", detail: "write TASK-523 contract: parent + 2 subtasks + executable leaves" },
    {
      title: "Pre-audit",
      detail: "drift-audit the contract (grounding + security reject-unknown) → fix",
    },
    {
      title: "Implement",
      detail: "523-01 page background, 523-02 spotlight occlusion — sequential, each gated",
    },
    {
      title: "Post-audit",
      detail: "adversarial lenses (security injection, regression, fidelity) → fix real",
    },
    { title: "Closure", detail: "tests, docs, changelog, board, commit" },
  ],
};

const WT = "/home/coder/project/Coderso-task-523";
const TASKS = `${WT}/_docs/_TASKS`;

// Grounded seams (verified on disk before this workflow) — passed to agents so they do not re-derive.
const GROUNDING = `
GROUNDED SEAMS (verified on feature/tasks-fixes; the worktree is at ${WT}):
- MODEL: core/services/pages/pageDocumentV2.ts
  * PageDocumentSettingsV2 type ~line 464 (has template, showInNav, revisionRetention?, collectionLink?, menuAppearance?, effects?). ADD present-only \`background?: string\`.
  * defaultSettings ~line 740 = { template:"page-v2", showInNav:true } — do NOT add background here (present-only ⇒ byte-identical for legacy docs).
  * normalizeSettings ~line 2349: assertKnownKeys allowlist is ["template","showInNav","revisionRetention","collectionLink","menuAppearance","effects"] — ADD "background". Normalize present-only via sanitizeAuthoringCssBackground (ALREADY imported at line ~22 from ./pageAuthoringSanitizers) which accepts a SAFE color OR gradient and returns null otherwise; omit the key when the result is null/absent (spread pattern like effects).
  * settings JSON schema ~line 1669 (additionalProperties:false): ADD \`background: { type: "string" }\` alongside template/showInNav.
- RENDER: core/services/pages/pageRendererV2.tsx
  * PageDocumentRender ~line 2783 builds \`rootStyle\` (~line 2846) currently only when spotlightOn (the --spotlight-* vars). CHANGE: also thread a re-sanitized \`background\` (defence-in-depth: sanitizeAuthoringCssBackground(effects?… NO — settings.background) at RENDER) into rootStyle, present-only, so a page WITHOUT a background stays byte-identical. The <Root> className default is "min-h-screen bg-white text-slate-950"; an inline style background overrides the bg-white utility.
  * PAGE_SPOTLIGHT_CSS ~line 2700 currently: a @media(no-preference) rule that sets the overlay \`background:radial-gradient(... at var(--spotlight-x) var(--spotlight-y), var(--spotlight-color), transparent 70%)\`. The overlay <div> ~line 2878 has className "pointer-events-none fixed inset-0 z-0". BUG: z-0 puts the glow BEHIND opaque section backgrounds, so it only shows through translucent SVG/glass. FIX: the overlay must render ABOVE the opaque section backgrounds and ADD light without blocking — set a raised z-index AND \`mix-blend-mode:screen\` (pointer-events:none stays). Keep the radial-gradient background inside the reduced-motion gate; put the static positioning (position/inset/z-index/mix-blend-mode/pointer-events) in a NON-gated base rule so reduce users get no moving glow but nothing breaks. Reference (_docs/projekty-domow-wow-site/assets/styles.css .cursor-glow) uses a fixed pointer-following glow; screen-blend is the occlusion-proof equivalent for our opaque sections.
- EDITOR CONTROL: the page-settings side-inspector panel (TASK-521-05 relocated compact panel) is where per-page effects controls live. Find where the page settings panel renders its controls (grep for "cursorSpotlight" / "spotlightColor" in core/admin/ui/**) and add a "Page background" color/gradient control writing settings.background, mirroring the existing spotlightColor control (which already uses the TASK-519 alpha-capable color input). Ground the REAL file/symbol before editing.
- INVARIANTS: present-only (omit when unset ⇒ byte-identical to post-522), reject-unknown (assertKnownKeys + additionalProperties:false round-trip test), colors ONLY via sanitizeAuthoringCssBackground (write + render), NO migration, NO PAGE_DOCUMENT_SCHEMA_VERSION bump (stays 2), NO npm dep.
- TESTS (Vitest lane): tests/vitest/pages/page-document-v2.test.ts (settings.background round-trip + reject-unknown + fail-soft + gradient-safe/injection-rejected + present-only omit), tests/vitest/pages/page-renderer-v2.test.tsx (root emits background present-only + byte-identity when unset; spotlight overlay CSS contains mix-blend-mode:screen + raised z-index + still pointer-events-none + gradient still reduced-motion-gated). Editor-control descriptor test if the panel has a registry.
- CHANGELOG: closure greps next-free (likely 1236; 1235 is TASK-522). Only closure edits _docs/_TASKS/* + _docs/_CHANGELOG/* + README boards.
`;

const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lens", "verdict", "findings"],
  properties: {
    lens: { type: "string" },
    verdict: { type: "string", enum: ["clean", "issues"] },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "file", "title", "detail", "fix"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          file: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
          fix: { type: "string" },
        },
      },
    },
  },
};
const GATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subtask", "done", "gatesGreen", "summary"],
  properties: {
    subtask: { type: "string" },
    done: { type: "boolean" },
    gatesGreen: { type: "boolean" },
    summary: { type: "string" },
  },
};

phase("Ground");
const ground = await agent(
  `Confirm (read-only) the exact seams for TASK-523 on the worktree ${WT}. Verify each grounded claim below still matches disk (line numbers may drift; find the real symbol). Report any correction.\n${GROUNDING}\nReturn a concise plain-text confirmation + any drift you found (e.g. the real editor-panel file:symbol for the spotlightColor control).`,
  { label: "ground:523", phase: "Ground" }
);
log(`ground: ${ground.slice(0, 300)}`);

phase("Author");
const author = await agent(
  `Author the TASK-523 contract under ${TASKS} following the AGENTS.md Multi-Agent Workflow Process and the EXACT format of existing TASK-52x leaf files (read one first for frontmatter/structure). Create: parent TASK-523_Page_Canvas_Background_And_Spotlight_Occlusion.md + two subtasks with executable leaves:
- 523-01 Page canvas background (model field + JSON schema + normalizeSettings allowlist/normalize via sanitizeAuthoringCssBackground + PageDocumentRender root emit + page-settings panel color/gradient control + tests). Leaves: L01 model+schema+normalize, L02 render root emit (present-only, re-sanitize), L03 editor control in the page-settings side-panel, L04 tests (round-trip/reject-unknown/gradient-safe/injection/byte-identity).
- 523-02 Occlusion-proof cursor spotlight (PAGE_SPOTLIGHT_CSS overlay raised z-index + mix-blend-mode:screen, base positioning rule ungated, gradient stays reduced-motion-gated; overlay className) + tests. Leaves: L01 CSS+overlay fix, L02 tests (mix-blend-mode:screen + z-index + pointer-events-none + reduced-motion gate + spotlight-off byte-identity).
Land order 523-01 → 523-02. Each leaf: execution-ready pseudocode citing the grounded file:symbol, a Security note (colors ONLY via sanitizeAuthoringCssBackground write+render; present-only), the Vitest test lane, regression-test shape. Pin: NO migration, NO schemaVersion bump, NO dep; changelog greps next-free at closure. Set all Status ⏳ To Do. Use this grounding verbatim:\n${GROUNDING}\nAlso incorporate any correction from the ground phase: ${ground.slice(0, 500)}\nReturn a concise summary of files created.`,
  { label: "author:523", phase: "Author" }
);
log(`author: ${author.slice(0, 200)}`);

phase("Pre-audit");
let preRounds = 0;
while (preRounds < 3) {
  preRounds++;
  const audits = await parallel(
    [
      {
        key: "grounding",
        p: "GROUNDING lens: verify every file:symbol the TASK-523 contract cites exists on disk and the described change is coherent with the real code (normalizeSettings allowlist, settings schema, rootStyle build, PAGE_SPOTLIGHT_CSS, the real editor-panel control file). Flag ungrounded references ≥MEDIUM.",
      },
      {
        key: "security-invariants",
        p: "SECURITY/INVARIANTS lens: does the contract route settings.background through sanitizeAuthoringCssBackground at BOTH write (normalize) AND render (defence-in-depth)? Is it reject-unknown (allowlist + additionalProperties:false + round-trip test)? Is it present-only (omit when unset ⇒ byte-identical, asserted)? Does the spotlight mix-blend-mode change avoid regressing spotlight-off / reduced-motion? Flag gaps ≥MEDIUM.",
      },
    ].map(
      (l) => () =>
        agent(
          `${l.p}\nRead the TASK-523 contract under ${TASKS} and ground against real code at ${WT}. Return the structured audit (lens="${l.key}").`,
          { label: `preaudit:${l.key}#${preRounds}`, phase: "Pre-audit", schema: AUDIT_SCHEMA }
        )
    )
  );
  const blocking = audits
    .filter(Boolean)
    .flatMap((a) => a.findings || [])
    .filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM");
  log(`pre-audit round ${preRounds}: ${blocking.length} blocking`);
  if (!blocking.length) break;
  await agent(
    `Fix these BLOCKING pre-audit findings in the TASK-523 contract docs under ${TASKS} (edit .md only). Keep pins consistent. Findings:\n${JSON.stringify(blocking, null, 2)}\nReturn a summary.`,
    { label: `preaudit-fix#${preRounds}`, phase: "Pre-audit" }
  );
}

phase("Implement");
const SUBTASKS = [
  {
    id: "523-01",
    prompt: `Implement TASK-523-01 (Page canvas background) on the worktree ${WT} per the authored contract under ${TASKS}. Steps: (1) MODEL core/services/pages/pageDocumentV2.ts — add present-only \`background?: string\` to PageDocumentSettingsV2; add "background" to the normalizeSettings assertKnownKeys allowlist and normalize present-only via sanitizeAuthoringCssBackground (omit when null); add \`background: { type: "string" }\` to the settings JSON schema. (2) RENDER core/services/pages/pageRendererV2.tsx — thread a RENDER-time re-sanitized settings.background into the PageDocumentRender rootStyle present-only (byte-identical when unset). (3) EDITOR — add a "Page background" color/gradient control to the page-settings side-inspector panel, mirroring the spotlightColor control (alpha-capable TASK-519 input), writing settings.background. (4) TESTS in the Vitest lane: settings.background round-trip + reject-unknown + fail-soft + gradient-safe + injection-rejected (javascript:/url()/expression) + present-only omit + render byte-identity when unset + render emits background when set. Then run gates on the worktree: \`bun --cwd core lint\`, \`bun --cwd core lint:types\`, root \`tsc -p tsconfig.json --noEmit\`, and the changed vitest files. Return the gate result.`,
  },
  {
    id: "523-02",
    prompt: `Implement TASK-523-02 (Occlusion-proof cursor spotlight) on the worktree ${WT}. In core/services/pages/pageRendererV2.tsx: change PAGE_SPOTLIGHT_CSS so the overlay [data-page-spotlight-overlay] renders ABOVE opaque section backgrounds and ADDS light without blocking — a NON-gated base rule with position:fixed; inset:0; a raised z-index (above section content); mix-blend-mode:screen; pointer-events:none — while the radial-gradient background (the moving glow) stays inside the @media(prefers-reduced-motion:no-preference) gate. Update the overlay <div> className accordingly (drop z-0 so it does not fight the CSS; keep pointer-events-none fixed inset-0). Add Vitest assertions: PAGE_SPOTLIGHT_CSS contains mix-blend-mode:screen + a raised z-index + pointer-events, the gradient stays reduced-motion-gated, the overlay is still pointer-events-none, and a spotlight-OFF document is byte-identical (no overlay/CSS emitted). Run gates: core lint, lint:types, root tsc, changed vitest. Return the gate result.`,
  },
];
const implResults = [];
for (const st of SUBTASKS) {
  const r = await agent(st.prompt, {
    label: `impl:${st.id}`,
    phase: "Implement",
    schema: GATE_SCHEMA,
  });
  implResults.push(r);
  log(`impl ${st.id}: done=${r?.done} gates=${r?.gatesGreen}`);
}

phase("Post-audit");
const POST = [
  {
    key: "security",
    p: "SECURITY lens: try to break settings.background — can any injection reach the DOM (semicolon CSS injection, url(javascript:), expression(), gradient with a script-ish payload) past sanitizeAuthoringCssBackground at write OR render? Is the render path re-sanitizing (not trusting stored)? Is present-only byte-identity real? Read the diff on ${WT}.",
  },
  {
    key: "regression",
    p: "REGRESSION lens: run/read the spotlight + settings tests. Does the mix-blend-mode / z-index change regress the spotlight-OFF path (must emit nothing), the reduced-motion gate, or any existing page-renderer/document test? Does adding settings.background break defaultSettings byte-identity or any existing settings round-trip? Read the diff + run the relevant vitest on ${WT}.",
  },
  {
    key: "fidelity",
    p: "FIDELITY lens: does this ACTUALLY fix the two live bugs? (a) settings.background emits on the page root so the whole-page canvas is paintable; (b) the spotlight overlay now shows the glow OVER opaque section backgrounds (screen-blend above sections), not only through translucent SVG/glass — confirm the z-index is actually above section content and mix-blend-mode:screen is present. Flag if the fix is cosmetic-only or misses the occlusion cause.",
  },
];
let postRounds = 0;
let residual = [];
while (postRounds < 3) {
  postRounds++;
  const audits = await parallel(
    POST.map(
      (l) => () =>
        agent(`${l.p}\nWorktree ${WT}. Return the structured audit (lens="${l.key}").`, {
          label: `postaudit:${l.key}#${postRounds}`,
          phase: "Post-audit",
          schema: AUDIT_SCHEMA,
        })
    )
  );
  const all = audits.filter(Boolean).flatMap((a) => a.findings || []);
  const blocking = all.filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM");
  log(`post-audit round ${postRounds}: ${all.length} findings, ${blocking.length} blocking`);
  if (!blocking.length) {
    residual = all;
    break;
  }
  await agent(
    `Fix these BLOCKING post-audit findings in the code on ${WT}. After fixing, re-run gates (core lint, lint:types, root tsc, changed vitest). Findings:\n${JSON.stringify(blocking, null, 2)}\nReturn a summary + gate result.`,
    { label: `postaudit-fix#${postRounds}`, phase: "Post-audit" }
  );
  residual = all.filter((f) => f.severity === "LOW");
}

phase("Closure");
const closure = await agent(
  `Close out TASK-523 on the worktree ${WT}. (1) Ensure ALL gates green: \`bun --cwd core lint\`, \`bun --cwd core lint:types\`, root \`tsc -p tsconfig.json --noEmit\`, \`bun run test:bun\`, \`bun run test:vitest\` (or the 523 files + a broad pages run), \`bun run gates:coderso\`. (2) Update docs: PAGE_MODEL.md (settings.background) + DESIGN_TOKENS.md / SECURITY_SPEC.md if a color boundary note fits. (3) Changelog: grep the next-free number in ${WT}/_docs/_CHANGELOG (likely 1236) and create it; bump the README next-pointer + add the row. (4) Board: add TASK-523 + children to _docs/_TASKS/README.md Done, set every TASK-523*.md Status ✅ Done, bump the Done statistic. (5) Commit everything on the worktree with a clear feat message. Return: the changelog file path, the commit sha, the final gate results verbatim, and any residual follow-up.`,
  { label: "closure:523", phase: "Closure" }
);

return {
  task: "TASK-523",
  ground: ground.slice(0, 300),
  implResults,
  postResidualLow: residual,
  closure,
};
