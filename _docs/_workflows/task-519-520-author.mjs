export const meta = {
  name: "task-519-520-author",
  description:
    "Author TASK-519 (advanced alpha color input across all admin editors) + TASK-520 (menu Design: scrolled-state colors, menu-bar card radius, brand icon + graphic-and-text) as GRANULAR execution-ready contracts (parent + NN technical subtasks + NN-LNN executable leaves with implementation pseudocode), grounded in real file:line, then run a drift-audit LOOP (up to 5 sequential rounds: per-lens audits + cross-file reconcile + fixers) until 0 HIGH/MEDIUM. Docs-only (no code).",
  phases: [{ title: "Author" }, { title: "DriftAudit" }, { title: "FinalReconcile" }],
};

const ROOT = "/home/coder/project/Coderso";

const GROUNDING = `GROUNDED FACTS (verify each against the live code at ${ROOT} before citing; large .tsx read as binary to rg — use grep -an or Read):

COLOR INPUT (UI):
- core/admin/ui/pages/editorControls/ColorSwatchControl.tsx — MENU/page swatch control. HEX_COLOR_PATTERN (:33) = 3/6-digit hex ONLY. Native input type=color (:144) + hex text field (:154-172). toSafeHexColor (:38-46) clamps invalid to #000000 → REJECTS alpha. Transparent swatch emits null (:99-117).
- core/admin/ui/widgets/editors/SharedColorControl.tsx + core/admin/ui/widgets/editors/ClearableFields.tsx — widget-editor control. hexColorPattern (ClearableFields:10) 3/6-digit; rgbColorPattern (:11-12) accepts rgb()/rgba(). isPickerRepresentableColorValue (:36-45) returns false when rgba HAS ALPHA (:44) — native picker cannot round-trip alpha → rgba STORED but not editable. 'Use transparent' sets string 'transparent' (:219-227).
- SCHEMA LAYER ALREADY ACCEPTS RICH FORMATS: normalizeMenuColorValue (core/.../normalizeMenuAppearance.ts:152-165) accepts #rgb/#rrggbb/#rrggbbaa/8-digit, rgb()/rgba(), hsl()/hsla(), var(--x), transparent. So the GAP is UI AUTHORING + round-trip display, NOT storage.
- Breadth: ~123 color-control usages across 31 editor files. ColorSwatchControl → MenuDesignEditor.tsx (:990,1000,1383,1526,1622,1924,2193,2207,2221,2236) + MenuAppearancePanel.tsx. SharedColorControl → 31 widget editors (TabsEditors, AppointmentFormEditors, ProductTable/Compare, BookingCalendar, FeatureGrid, PricingPlans, ContentList, Footer, Navigation, FormEmbed, ToggleBlock, ProductGallery, LogoCloud, SearchBox, ListingFilters, RichTextSection, EntryTeaser, Timeline, Testimonials, Team, PostsFeed, Newsletter, GridColumns, Divider, CompareTimeline, Accordion, etc.).

MENU DESIGN (core/admin/ui/menus/MenuDesignEditor.tsx + core/.../menuDocumentV2.ts):
- MENU_BAR_LAYOUT_KEYS (menuDocumentV2.ts:114-123) = surfaceColor, paddingX, paddingY, alignment, borderColor, borderWidth, shadow (enum none/sm/md), sticky (bool @ MenuDesignEditor:1069). NO scrolled/floating color VARIANTS. shadow is a 3-preset enum (no custom blur/spread/color).
- Menu-bar (level 0) border-RADIUS: MISSING. NavLevelStyle.radius (:186) exists for submenus (level>=1) ONLY.
- sticky is a CSS position:sticky gate; there is NO scroll-state machine (no 'scrolled' class/IntersectionObserver) driving a visual variant.

BRAND / LOGO (menuDocumentV2.ts BrandProps :298-312 = {mode:'text'|'image', href, image?, text?, style?:BrandStyle}):
- text + image modes BOTH supported (MenuDesignEditor brand text styling :1349-1414; BrandLogoPicker/MediaPickerControl :1210-1276). Render: core/site/siteShell.tsx MenuBrandRender (:498-536), resolveBrandImageSrc (menuDocumentV2.ts:1039).
- MISSING: (c) a named ICON mode (no lucide icon field on BrandProps, no icon picker). (d) text+image COMBO — mode is exclusive enum (text XOR image).

OWNER-REQUESTED HEADER/MENU TOKENS (TASK-520 scrolled-vs-normal variants): header bg normal #0812209e (hex8 alpha), header bg scrolled rgba(8,17,31,.84), border normal #ffffff1f, border scrolled rgba(255,255,255,.18), shadow 0 18px 50px rgba(0,0,0,.24), logo main text #f7fbff, logo sub-text #7e8ba0.`;

const GRANULARITY = `GRANULARITY + FILE RULES (AGENTS.md — MANDATORY):
- Decompose GRANULARLY: board parent TASK-### (Overview, grounded gap analysis with file:line, Schema-extension plan, Subtask breakdown table with SINGLE-WRITER file ownership + strict land order, Coordination/collision guards, Security Contract, Hard Invariants, Acceptance Criteria measured LIVE, changelog pin) → technical subtasks TASK-###-NN → and EXECUTABLE LEAVES TASK-###-NN-LNN whenever a subtask is too large for one file (e.g. a rollout across many editors, or a multi-part control upgrade).
- Every EXECUTABLE LEAF must be execution-ready: implementation PSEUDOCODE for the expected code changes — the main helper/function shape, data flow, error handling, and the regression-TEST shape (lane per _docs/TESTING_STRATEGY.md) — so an implementer executes without rediscovering the strategy.
- File naming: board file TASK-###_Short_Title.md (underscores); child files TASK-###-NN-Title.md and TASK-###-NN-LNN-Title.md (hyphens). H1 matches the physical task ID; a '# FileName:' line equals the actual filename; child files carry a parent field (**Parent Task:** TASK-### or **Parent Subtask:** TASK-###-NN). Status field canonical (⏳ To Do). Zero-padded NN from 01, LNN from L01.
- SINGLE-WRITER: every production file has exactly ONE owning leaf/subtask; declare the ownership map; if two must touch one file, document an explicit additive seam. Strict land order (shared control/model/helper lands before consumers).
- Any subtask/leaf touching an API route needs an explicit **Security Contract** subsection (visibility, auth, RBAC, CSRF, reject-unknown, anti-abuse). For 519/520 also treat color-value validation as security (whitelist formats, no CSS injection) and brand icon name as an allowlist.
- New schema keys are present-only + join a reject-unknown allowlist + ship a round-trip test; legacy docs stay byte-identical (no forced migration). State migration need explicitly (expect NONE — jsonb).
- Do NOT edit _docs/_TASKS/README.md or _docs/_CHANGELOG/* (orchestrator owns those); just PIN the changelog number in the contract text.`;

const AUTHOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "task",
    "parentFile",
    "subtaskFiles",
    "leafFiles",
    "changelogPin",
    "migrationNeeded",
    "singleWriterOk",
    "summary",
  ],
  properties: {
    task: { type: "string" },
    parentFile: { type: "string" },
    subtaskFiles: { type: "array", items: { type: "string" } },
    leafFiles: { type: "array", items: { type: "string" } },
    changelogPin: { type: "string" },
    migrationNeeded: { type: "boolean" },
    singleWriterOk: { type: "boolean" },
    summary: { type: "string" },
  },
};
const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["task", "lens", "findings", "verdict"],
  properties: {
    task: { type: "string" },
    lens: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "file", "problem", "fix", "isReal"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          file: { type: "string" },
          problem: { type: "string" },
          fix: { type: "string" },
          isReal: { type: "boolean" },
        },
      },
    },
    verdict: { type: "string", enum: ["clean", "issues"] },
  },
};
const FIX_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["task", "applied", "residual"],
  properties: {
    task: { type: "string" },
    applied: { type: "array", items: { type: "string" } },
    residual: { type: "array", items: { type: "string" } },
  },
};

const AUTHOR_COMMON = `You are AUTHORING task contracts (DOCUMENTATION ONLY — write .md files under ${ROOT}/_docs/_TASKS/, do NOT write or run production code). Read a couple of existing granular contracts first for house style + granularity bar (e.g. ${ROOT}/_docs/_TASKS/TASK-516_Forms_Editor_Prototype_Fidelity_And_Form_Styling.md and its TASK-516-0N children, and a menu task TASK-506/508).
${GRANULARITY}
${GROUNDING}`;

phase("Author");
const authored = await parallel([
  () =>
    agent(
      `${AUTHOR_COMMON}

AUTHOR TASK-519 — "Advanced (alpha-capable) color input across all admin editors" (GRANULAR: parent + NN subtasks + NN-LNN leaves).
Goal: everywhere a color is authored in the admin, the user can enter + round-trip alpha-capable values (8-digit hex #rrggbbaa like #0812209e, rgba(), hsla()) with an ALPHA channel/slider, keep the transparent option, and NOT lose the token/palette swatch UX. STORAGE already accepts these (normalizeMenuColorValue) — this is a shared-UI-control upgrade + consistent rollout.
Decompose granularly, e.g.:
- 519-01 shared color-value normalize/parse helper (admin-UI mirror of the server accepted-set; compose/decompose #rrggbbaa <-> {hex,alpha}; reject-unknown/clamp) — LEAVES for the helper + its unit tests.
- 519-02 upgrade ColorSwatchControl (menu/page) to author+display alpha (native picker for base color + opacity slider + hex8/rgba text; fix round-trip) — LEAVES for the control + tests.
- 519-03 upgrade SharedColorControl+ClearableFields (widgets) similarly (fix isPickerRepresentableColorValue so alpha round-trips) — LEAVES + tests.
- 519-04..NN rollout across the ~31 widget editors + the 10 menu usages, GROUPED into executable LEAVES by editor cluster (do NOT dump 31 editors into one subtask — split into leaf groups, each leaf listing its exact files + the per-editor verification). Verify each editor's persisted value stays schema-valid; PREFER no schema widening (note any that genuinely needs it).
- final closure subtask (tests/docs — DESIGN_TOKENS.md / relevant editor docs — + changelog pin + board rows).
Each LEAF: execution-ready pseudocode (helper/function shape, data flow, error handling, regression-test shape + lane). Single-writer per file. Land order: helper → controls → rollout → closure. PIN changelog 1232 (verify next-free at closure; 511=1229/517=1230/518=1231 precede). Migration: expect NONE — state explicitly. Write parent + all subtask + all leaf .md files. Return the structured result (list every file).`,
      { label: "author:519", phase: "Author", schema: AUTHOR_SCHEMA }
    ),
  () =>
    agent(
      `${AUTHOR_COMMON}

AUTHOR TASK-520 — "Menu Design: scrolled/floating-state colors + menu-bar card radius + custom shadow + brand icon & graphic-with-text" (GRANULAR: parent + NN subtasks + NN-LNN leaves). Depends on TASK-519 (alpha color input) for authoring alpha tokens.
Three owner-reported gaps (grounded in MenuDesignEditor.tsx + menuDocumentV2.ts + siteShell.tsx):
1. SCROLLED/FLOATING STATE COLORS — add present-only 'scrolled' variant keys (surfaceColorScrolled/borderColorScrolled/shadowScrolled, names consistent with the model) so a sticky/floating menu shows DIFFERENT bg/border/shadow once scrolled vs at rest; unset variant falls back to base (back-compat). Spec the FRONT scroll-state machine (a 'scrolled' class toggled past a threshold via scroll/IntersectionObserver in siteShell.tsx menu render) + the ADMIN controls (only meaningful when sticky). Owner tokens as acceptance example.
2. MENU-BAR CARD RADIUS + CUSTOM SHADOW — additive menu-bar (level 0) container border-radius (per-device if the model is per-device); extend shadow beyond the none/sm/md enum to accept a CUSTOM box-shadow value (e.g. 0 18px 50px rgba(0,0,0,.24)). Confirm the rest is already granular (per-level/per-device from 504/506/508) — do NOT re-spec what exists.
3. BRAND ICON + GRAPHIC-WITH-TEXT — (a) NEW icon mode/field: named lucide icon (allowlist, e.g. house) with its own style (color via 519 alpha input, size) next to/instead of brand text; (b) 'image+text' combo. Cover ADMIN control (icon picker + style; combo) AND PUBLIC render (siteShell.tsx MenuBrandRender :498-536 renders img XOR text — extend to icon + combo). text-only + image-only already work.
Decompose granularly into NN subtasks + NN-LNN leaves, e.g.: 520-01 menu-bar model/schema (scrolled variants + radius + custom shadow keys; normalize/reject-unknown/clamp) with leaves; 520-02 admin Design controls (scrolled-state group + radius + shadow) with leaves; 520-03 brand model + icon allowlist + combo (schema) with leaves; 520-04 admin brand controls (icon picker/style + combo toggle); 520-05 FRONT render (scroll-state machine + brand icon/combo in siteShell.tsx) with leaves; closure. Each LEAF: execution-ready pseudocode + regression-test shape. Single-writer per file (menuDocumentV2.ts model, MenuDesignEditor.tsx controls, siteShell.tsx render, the appearance normalizer). Add a **Security Contract** note (color-value whitelist / brand icon-name allowlist / render sanitization; no new route expected — confirm). Land order: model → admin → front → closure. PIN changelog 1233 (verify next-free at closure). Migration: expect NONE (jsonb) — state explicitly. Write parent + all subtask + all leaf .md files. Return the structured result (list every file).`,
      { label: "author:520", phase: "Author", schema: AUTHOR_SCHEMA }
    ),
]);
for (const a of authored.filter(Boolean)) {
  log(
    `Authored ${a.task}: ${a.subtaskFiles?.length || 0} subtasks + ${a.leafFiles?.length || 0} leaves, changelog ${a.changelogPin}, migration=${a.migrationNeeded}, single-writer=${a.singleWriterOk}`
  );
}

const TASKS = ["TASK-519", "TASK-520"];
const LENSES = [
  {
    key: "grounding",
    ask: "GROUNDING: open every file:line the contract cites (grep -an/Read for large tsx) and verify it exists + says what the contract claims. Flag wrong/stale/invented citations and any API/schema assumed but absent.",
  },
  {
    key: "granularity",
    ask: "GRANULARITY + EXECUTION-READINESS (AGENTS.md): are there technical subtasks (NN) AND executable leaves (NN-LNN) where scope is large (esp. 519's 31-editor rollout — must be split into leaf groups, NOT one subtask)? Does every executable leaf carry implementation PSEUDOCODE (function/helper shape, data flow, error handling) + a regression-test shape + lane? Flag any leaf that is vague/hand-wavy or any oversized subtask that should be split.",
  },
  {
    key: "completeness",
    ask: "COMPLETENESS + FEASIBILITY: does the contract deliver everything the owner asked (alpha color params across ALL editors; menu scrolled-state colors; menu-as-card radius; custom shadow; brand icon + graphic-with-text)? Back-compat + no-forced-migration honored? FRONT render path covered, not just admin?",
  },
  {
    key: "single-writer",
    ask: "SINGLE-WRITER + LAND ORDER + NAMING: is every production file owned by exactly one leaf/subtask (or a documented additive seam)? Correct dependency-ordered land order? File naming/H1/FileName/parent-field/Status per AGENTS.md? Changelog pinned + consistent across all files?",
  },
  {
    key: "security",
    ask: "SECURITY: color-value validation must whitelist formats (no CSS/style injection via crafted color string); brand icon must be an allowlist (not arbitrary component/name); image render stays sanitized; confirm whether any new route is introduced and that a Security Contract exists where needed.",
  },
];

phase("DriftAudit");
let round = 0;
let clean = false;
while (round < 5 && !clean) {
  round += 1;
  const audits = await parallel(
    TASKS.flatMap((t) => [
      ...LENSES.map(
        (l) => () =>
          agent(
            `Round ${round} adversarial DRIFT-AUDIT of authored contract ${t} (read ${t}'s parent + ALL its NN + NN-LNN .md files under ${ROOT}/_docs/_TASKS/). LENS: ${l.ask}\n${GROUNDING}\nReturn findings with a concrete fix each; isReal true only if defensible against a skeptic.`,
            { label: `audit-r${round}:${t}:${l.key}`, phase: "DriftAudit", schema: AUDIT_SCHEMA }
          ).then((a) => ({ ...a, task: a?.task || t, key: l.key }))
      ),
      () =>
        agent(
          `Round ${round} cross-file RECONCILE audit of ${t} (read ALL ${t} files). Check ONLY cross-file contradictions: single-writer file ownership, identical shared type/enum/clamp/CSS-selector shapes across files, helper names consumers reference == names the owning subtask defines, per-device representation consistency, promised test-file names vs delivered, land order, and the pinned changelog number consistent everywhere. ${GROUNDING}\nReturn findings (isReal + fix).`,
          { label: `reconcile-r${round}:${t}`, phase: "DriftAudit", schema: AUDIT_SCHEMA }
        ).then((a) => ({ ...a, task: a?.task || t, key: "reconcile" })),
    ])
  );
  const returned = audits.filter(Boolean);
  const expected = TASKS.length * (LENSES.length + 1);
  const allReturned = returned.length === expected;
  const byTask = {};
  for (const t of TASKS) byTask[t] = [];
  for (const a of returned)
    (byTask[a.task] || (byTask[a.task] = [])).push(
      ...(a.findings || []).filter((f) => f.isReal).map((f) => ({ ...f, lens: a.key }))
    );
  const totalHM = TASKS.reduce(
    (n, t) =>
      n + (byTask[t] || []).filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM").length,
    0
  );
  log(
    `Round ${round}: audits ${returned.length}/${expected} returned | real HIGH/MED ${TASKS.map((t) => `${t}=${(byTask[t] || []).filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM").length}`).join(" ")}`
  );

  if (allReturned && totalHM === 0) {
    clean = true;
    log(`Round ${round}: CLEAN (0 HIGH/MEDIUM, all audits returned).`);
    break;
  }
  // fixers per task for HIGH/MEDIUM (+ cheap LOW)
  await parallel(
    TASKS.map((t) => () => {
      const real = (byTask[t] || []).filter(
        (f) => f.severity === "HIGH" || f.severity === "MEDIUM"
      );
      if (real.length === 0)
        return Promise.resolve({ task: t, applied: [], residual: ["none this round"] });
      const list = real
        .map(
          (f, i) => `${i + 1}. [${f.severity}] (${f.lens}) ${f.file}: ${f.problem} → FIX: ${f.fix}`
        )
        .join("\n");
      return agent(
        `${AUTHOR_COMMON}\n\nRound ${round} CONVERGE: apply these real HIGH/MEDIUM drift fixes to the ${t} contract (edit the .md files under ${ROOT}/_docs/_TASKS/). Correct citations, close granularity/completeness/single-writer/security gaps, keep changelog pin + naming consistent. If a finding is wrong, justify in residual. Findings:\n${list}\n\nReturn applied vs residual.`,
        { label: `fix-r${round}:${t}`, phase: "DriftAudit", schema: FIX_SCHEMA }
      );
    })
  );
}

phase("FinalReconcile");
const finalRecon = await parallel(
  TASKS.map(
    (t) => () =>
      agent(
        `FINAL fresh read-only RECONCILE + readiness check of ${t} (read parent + all NN + NN-LNN files). Confirm: 0 HIGH/MEDIUM drift remains; single-writer ownership holds; every executable leaf has execution-ready pseudocode + test shape; land order + changelog pin consistent; grounding citations correct. ${GROUNDING}\nReturn findings (isReal + fix) — empty findings + verdict 'clean' means implementation-ready.`,
        { label: `final-reconcile:${t}`, phase: "FinalReconcile", schema: AUDIT_SCHEMA }
      ).then((a) => ({ ...a, task: a?.task || t }))
  )
);

return {
  authored: authored.filter(Boolean).map((a) => ({
    task: a.task,
    subtasks: a.subtaskFiles?.length,
    leaves: a.leafFiles?.length,
    changelog: a.changelogPin,
    migration: a.migrationNeeded,
  })),
  driftRounds: round,
  convergedClean: clean,
  finalReconcile: finalRecon.filter(Boolean).map((r) => ({
    task: r.task,
    verdict: r.verdict,
    residual: (r.findings || []).filter((f) => f.isReal).length,
  })),
};
