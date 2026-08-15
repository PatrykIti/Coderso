export const meta = {
  name: "task-531-534-author",
  description:
    "Author + reconcile + drift-audit the 4 CMS-limitation bundles from _TMP-cms-ograniczenia.md: 531 premium backgrounds+glow, 532 typography, 533 layout, 534 interactivity. Coordinated so they don't collide on the shared model/render/registry regions; each present-only, reject-unknown, no migration.",
  phases: [
    {
      title: "Ground",
      detail: "map the shared seams all 4 bundles touch + the sanitizer/security constraints",
    },
    { title: "Author", detail: "4 parallel bundle contracts (531/532/533/534), grounded" },
    { title: "Reconcile", detail: "cross-bundle collision + convention + land-order pass" },
    { title: "Drift-audit", detail: "per-bundle grounding audits → fixers, loop" },
    { title: "Finalize", detail: "verdict + residual + recommended impl order" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = `${ROOT}/_docs/_TASKS`;

const SHARED = `
CONTEXT: close the page-toolkit fidelity gaps catalogued in ${ROOT}/_TMP-cms-ograniczenia.md (owner's 7-agent report). Reproduce prototype _docs/projekty-domow-wow-site. ALL bundles are additive to PageDocumentV2: present-only (omit when unset ⇒ byte-identical to post-530), reject-unknown (assertKnownKeys + additionalProperties:false + round-trip test), colors ONLY via sanitizeAuthoringCssColor / sanitizeAuthoringCssBackground, NO DB migration, NO PAGE_DOCUMENT_SCHEMA_VERSION bump, NO npm dep. Each bundle updates any owned breaking test explicitly. Changelog numbers grep next-free at closure (1242 is the last used = TASK-530; 531-534 take 1243+).
SHARED SEAMS all 4 will touch (coordinate to avoid collision):
- core/services/pages/pageDocumentV2.ts: PageBlockStyleV2 / PageSectionStyleV2 types, the pageBlockStyleKeys + section-style allowlists, the block-style + section-style JSON schemas, normalizeBlockStyle / normalizeSectionStyle. (Each bundle ADDS distinct new fields here — keep additions in disjoint, clearly-labelled regions so parallel worktrees merge additively.)
- core/services/pages/pageRendererV2.tsx: toPageBlockVisualStyle / toPageSectionStyle (emit), toPageBlockRenderProps.
- core/services/pages/pageCompositionEffects.tsx: composition CSS + resolvers (for glow/shadow).
- core/services/pages/pageEditorControlRegistry.ts: pageUniversalBlockControls / section controls (each bundle adds its controls).
- core/services/pages/pageEditorControlUiModel.ts: control kinds (new input kinds if needed, e.g. gradient / shadow / textTransform).
- core/admin/ui/pages/editorControls/*: control components (new control UIs if needed).
- core/services/pages/pageAuthoringSanitizers.ts: isSafeAuthoringCssGradient / isSingleGradientLayer / sanitizeAuthoringCssBackground (bundle 531 must relax multi-layer HERE, security-critically).
`;

const BUNDLES = [
  {
    task: "TASK-531",
    key: "premium-backgrounds",
    title: "Premium Backgrounds & Glow",
    scope: `Bundle A (report §4.1-3, §1 🔴 multi-layer / block-gradient / box-shadow). (1) MULTI-LAYER backgrounds (radial glow + gradient) on section AND block: RELAX pageAuthoringSanitizers so a COMMA-SEPARATED list of safe gradient/color layers is accepted (currently isSingleGradientLayer rejects them), while STILL rejecting url()/javascript:/expression/data:text-html/@import and any non-gradient/non-color layer — SECURITY-CRITICAL, this is the core new attack surface: allowlist each comma-split layer through the existing single-layer validator, cap layer count, fail-closed. (2) GRADIENT as BLOCK background: block.style already has background(color)+backgroundType — wire backgroundType:"gradient" for blocks through sanitizeAuthoringCssBackground at emit (toPageBlockVisualStyle) like sections do. (3) Arbitrary COLORED box-shadow (glow): add a present-only style.glow field (a safe shadow spec: color via sanitizeAuthoringCssColor + numeric blur/spread/x/y clamps → composed to a box-shadow string at render; NOT a raw arbitrary string) on block + section, alongside the existing shadow enum. Controls + tests + owned rebaselines. This bundle OWNS pageAuthoringSanitizers multi-layer changes.`,
  },
  {
    task: "TASK-532",
    key: "typography",
    title: "Typography Fidelity",
    scope: `Bundle B (report §4.7,4,8; §1 font-size tokens / font-weight bold / text-transform / eyebrow / textColor-on-text). (1) FLUID font-size: allow a clamp()/rem value alongside the discrete tokens (a present-only style.fontSizeCustom or extend the font-size control to accept a safe clamp/rem string validated to a numeric-unit-clamp grammar — NO arbitrary CSS). (2) font-weight beyond bold: extend the weight enum to include heavier (e.g. 800/900/black). (3) text-transform: add a present-only style.textTransform enum (none/uppercase/lowercase/capitalize). (4) decorative eyebrow RULE: a lightweight divider/rule primitive or a block option for a gradient underline/line (reuse divider block if present). (5) textColor on the TEXT block: the t()/text block currently does NOT expose textColor — add it (present-only, sanitizeAuthoringCssColor). Controls + tests.`,
  },
  {
    task: "TASK-533",
    key: "layout",
    title: "Layout — Grid Span / Asymmetric / Border / Timeline",
    scope: `Bundle C (report §4.5,6,10; §1 grids symmetric / no span; per-edge border; timeline). (1) GRID row/col SPAN + ASYMMETRIC column ratios: extend section layout so a block can span columns/rows (present-only block.style.colSpan/rowSpan clamped) AND a section can express asymmetric column ratios (e.g. a template or a ratio field like "1.15fr .85fr") — reproduce .project-card.large (span-2) + hero 1/1.2fr. (2) PER-EDGE border (border-block): present-only section border (color+width per edge, or at least top/bottom) via sanitizeAuthoringCssColor + numeric width. (3) TIMELINE: verify whether the existing "timeline" section type renders a vertical axis + dots; if it exists but is unused, document how to use it; if it does not deliver the axis, add the axis+dots render. Controls + tests + owned layout-test rebaselines.`,
  },
  {
    task: "TASK-534",
    key: "interactivity",
    title: "Declarative Interactivity — Tabs/Switcher + Filter + Polish (absorbs 527)",
    scope: `Bundle D (report §4.9; §1 JS interactivity). This ABSORBS the previously-queued TASK-527. (1) TABS / segmented SWITCHER as a DECLARATIVE block primitive (barn/villa/eco): a new block type with N labelled panels; the runtime (dependency-free IIFE via pageEffectsRuntime, like tilt/spotlight) toggles active panel on click; reduced-motion/keyboard/aria-tablist safe. (2) FILTERABLE gallery/portfolio (filter by data-category): declarative filter chips + runtime show/hide. (3) POLISH: noise/grain texture overlay (present-only page/section option), hero scroll-hint indicator block, magnetic button hover (runtime). All runtime additions ride the existing single pageEffectsRuntime <script> emit, present-only, reduced-motion-gated, no npm dep. Controls + behavioral tests (run the IIFE + simulate click/scroll/pointer).`,
  },
];

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

phase("Ground");
const ground = await agent(
  `Read-only: map the shared seams at ${ROOT} that the 4 CMS-limitation bundles will touch (list each file:symbol from the SHARED section below + confirm it exists), and detail the SECURITY constraints for bundle 531's multi-layer background relaxation (how isSingleGradientLayer / isSafeAuthoringCssGradient / sanitizeAuthoringCssBackground currently work + the safe way to allow comma-separated layers without opening url()/injection). Read _TMP-cms-ograniczenia.md for the gap list. Return a shared-seams map + the sanitizer relaxation approach + which existing tests each bundle will likely need to rebaseline.\n${SHARED}`,
  { label: "ground:program", phase: "Ground" }
);
log(`ground: ${ground.slice(0, 300)}`);

phase("Author");
const authored = await parallel(
  BUNDLES.map(
    (b) => () =>
      agent(
        `Author the ${b.task} (${b.title}) contract under ${TASKS} per the AGENTS.md Multi-Agent Workflow Process, matching the format of existing TASK-52x/53x leaf files (read one first). Parent + subtasks + executable leaves with pseudocode citing REAL file:symbol (ground against ${ROOT}), a Security note per leaf, correct test lane (Vitest for model/render; behavioral for runtime), regression/owned-breaking-test notes. Scope:\n${b.scope}\n\nShared invariants + seams (coordinate — keep your model/schema/control additions in a clearly-labelled ${b.task} region so parallel worktrees merge additively):\n${SHARED}\nShared-seams ground map:\n${ground.slice(0, 1500)}\nSet all Status ⏳ To Do. Return a concise summary of files created + the exact shared-file symbols you add to (so Reconcile can check collisions).`,
        { label: `author:${b.key}`, phase: "Author" }
      )
  )
);
authored.forEach((a, i) => log(`${BUNDLES[i].task}: ${(a || "").slice(0, 120)}`));

phase("Reconcile");
const reconcile = await agent(
  `Cross-bundle RECONCILE of the 4 authored contracts (TASK-531/532/533/534) under ${TASKS}. They all add fields/controls/CSS to the SAME shared files (pageDocumentV2 types+allowlists+schemas+normalizers, pageRendererV2 emit, pageCompositionEffects, pageEditorControlRegistry, pageEditorControlUiModel, pageAuthoringSanitizers). CHECK: (1) no two bundles add the SAME field name / control id / CSS token with different meaning; (2) additions are in disjoint labelled regions so parallel-worktree merges are ADDITIVE (both-keep), not overlapping edits to the same line/function body; (3) consistent conventions (present-only spread, reject-unknown, sanitizer usage); (4) bundle 531 is the SOLE owner of pageAuthoringSanitizers multi-layer changes (others must not touch it); (5) recommend an impl land-order + which bundles can run in PARALLEL worktrees vs must serialize (based on whether they edit the same function bodies). Author summaries:\n${authored.map((a, i) => `${BUNDLES[i].task}: ${a}`).join("\n\n")}\nEdit the contracts to fix any collision. Return the reconciliation result + recommended parallel/serial impl plan.`,
  { label: "reconcile", phase: "Reconcile" }
);
log(`reconcile: ${reconcile.slice(0, 300)}`);

phase("Drift-audit");
let round = 0;
let residual = [];
while (round < 3) {
  round++;
  const audits = await parallel(
    BUNDLES.map(
      (b) => () =>
        agent(
          `GROUNDING + SECURITY audit of the ${b.task} contract under ${TASKS}: verify every cited file:symbol exists at ${ROOT}; every new field is present-only + reject-unknown + schema'd + normalized; colors only via the sanitizers; ${b.key === "premium-backgrounds" ? "the multi-layer relaxation is fail-closed (rejects url()/injection/non-gradient layers, caps layer count)" : "no raw CSS string reaches the DOM unsanitized"}; owned breaking tests are named. Flag ungrounded/insecure/unowned-breakage ≥MEDIUM. Return structured audit (lens="${b.key}").`,
          { label: `audit:${b.key}#${round}`, phase: "Drift-audit", schema: AUDIT_SCHEMA }
        )
    )
  );
  const all = audits
    .filter(Boolean)
    .flatMap((a) => (a.findings || []).map((f) => ({ ...f, lens: a.lens })));
  const blk = all.filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM");
  log(`round ${round}: ${all.length} findings, ${blk.length} blocking`);
  if (!blk.length) {
    residual = all;
    break;
  }
  await agent(
    `Fix these BLOCKING drift-audit findings in the respective TASK-531/532/533/534 contract docs under ${TASKS} (edit .md only). Keep pins (no migration, present-only, reject-unknown, 531 owns sanitizer). Findings:\n${JSON.stringify(blk, null, 2)}\nReturn a summary.`,
    { label: `fix#${round}`, phase: "Drift-audit" }
  );
  residual = all.filter((f) => f.severity === "LOW");
}

phase("Finalize");
return {
  program: "TASK-531..534 (CMS limitation bundles)",
  rounds: round,
  finalVerdict: residual.every((f) => f.severity === "LOW") ? "clean" : "residual-blocking",
  residualLow: residual,
  reconcile: reconcile.slice(0, 800),
};
