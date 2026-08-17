export const meta = {
  name: "task-521-author",
  description:
    "Author TASK-521 (Page Motion & Interaction Effects: section scroll/parallax/reveal + hero mouse-tilt + lightweight animated-icon block + per-page effects incl. cursor spotlight + relocate page-settings into a compact side-inspector panel) as a GRANULAR execution-ready contract (parent + NN subtasks + NN-LNN leaves with implementation pseudocode), grounded in real file:line, then a drift-audit LOOP (up to 5 rounds: per-lens audits + reconcile + fixers) until 0 HIGH/MEDIUM. Docs-only.",
  phases: [{ title: "Author" }, { title: "DriftAudit" }, { title: "FinalReconcile" }],
};

const ROOT = "/home/coder/project/Coderso";
const TASK = "TASK-521";

const GROUNDING = `GROUNDED FACTS (verify each vs live code at ${ROOT}; large .tsx read as binary to rg — use grep -an/Read; PageEditor.tsx, pageRendererV2.tsx, pageDocumentV2.ts are big):

SECTION / BLOCK MODEL:
- core/services/pages/pageDocumentV2.ts: PageSectionV2 type (:477-488: id,type,name,variant,layout,style,spacing,visibility,responsive); PageSectionStyleV2 (:380-387: background,backgroundType,backgroundImage,accent,radius,shadow — NO motion/scrollEffect); PageBlockV2 (:460-468); PageBlockStyleV2 (:412-448 — NO motion). Normalization/allowlist + present-only pattern lives in the same file (resolveHeroMotionPreset ~:555 is a reference).
- SECTION front render: core/services/pages/pageRendererV2.tsx PageSectionRender (:2291-2315) emits <section className={renderProps.sectionClassName}> (:2305); classes/vars via toPageSectionRenderProps (~:2301) — no section-level motion today.
- Existing widget CSS-motion pattern (REUSE, respects reduced-motion): hero.tsx (HeroMotionPreset none|fade-in|slide-up :23, style.motion :133, motionClassMap :444-450 using motion-safe:animate-in / motion-reduce:animate-none, applied :1178); section.tsx (SectionMotion :45, schema :384, defaults :445, render :1138-1178). Same motion-safe/motion-reduce guard across ctaBanner/compareTimeline/galleryMosaic/tabs/toggleBlock/postsFeed.

HERO:
- core/widgets/core/hero.tsx: HeroData (:14-144), style.motion (:133), image/video background + overlay; NO tilt / mouse-parallax today. Add a present-only tilt option on hero style + a front tilt behavior.

PAGE SETTINGS + PAGE SHELL:
- Per-page settings live in the page DOCUMENT: PageDocumentSettingsV2 (pageDocumentV2.ts:346-360, e.g. showInNav) inside currentData.settings / publishedData.settings. pages table (core/db/schema.ts:218-235) has currentData/publishedData jsonb + NO separate settings column — a per-page effects config hangs off currentData.settings.effects (present-only, NO migration).
- Current page-settings authoring UI: PageCreateDrawer.tsx (create only); the live per-page settings surface is a FULL-HEIGHT slide-out drawer (owner calls it poor). PageEditor.tsx imports Settings2 (:34) UNUSED — a natural trigger.
- Section/block settings live in the RIGHT side-inspector (core/admin/ui/pages/builder/BlockSettings.tsx + VisualPanel.tsx), opened from a toolbar/inspector button. OWNER DECISION: relocate page settings into a COMPACT panel in the SAME side-inspector rail as section/block settings, triggered by a button NEXT TO the section-panel icon (reuse the unused Settings2), with an 'Effects' section — NOT the full-height drawer.
- Page shell front render: core/site/renderPublicPage.tsx renderPageDocumentAsHtml (:240-283) wraps sections; pageRendererV2.tsx PageDocumentRender emits <Root className={rootClassName}> (:2324-2350) — page-level effect wrapper/overlay + cursor-spotlight attach here.

RUNTIME SCRIPT INJECTION (for scroll/tilt/spotlight behaviors):
- core/widgets/runtimeScripts.tsx createWidgetRuntimeScriptRegistry + renderSharedWidgetRuntimeScript (:1-43); WidgetRuntimeScriptRegistry.registerScript(id, source) (core/widgets/types.ts:59-62). renderPublicPage.tsx registers scripts + emits them before </body> via renderBodyScripts (:249-283). Existing examples: listingRuntimeScript.ts, bookingRuntimeScript.ts, formRuntimeScript.ts. New effect scripts follow this exact mechanism (one small, idempotent, dependency-free IIFE; guard on prefers-reduced-motion; use rAF/throttle; no layout thrash).

ACCESSIBILITY + DEPS:
- prefers-reduced-motion already respected via motion-safe/motion-reduce (hero.tsx:447-450) — ALL new effects MUST honor it (CSS guard + the runtime scripts early-return when matchMedia('(prefers-reduced-motion: reduce)').matches).
- Dependencies: ZERO animation libs (core/package.json), only lucide-react + Tailwind. OWNER DECISION: animated icons = a LIGHTWEIGHT curated inline-SVG + CSS-keyframes set (NO new npm dependency, CSP-safe, self-hosted), NOT Lottie.`;

const DECISIONS = `OWNER DECISIONS (baked in):
- ONE task family TASK-521 'Page Motion & Interaction Effects' covering: (A) section scroll/parallax/reveal effects, (B) lightweight animated-icon block (inline-SVG+CSS keyframes, NO npm dep), (C) hero image mouse-tilt (3D parallax-on-hover), (D) per-page effects (cursor-follow spotlight on dark bg, etc.) + relocating page settings into a compact side-inspector panel.
- Panel: page settings + a new 'Effects' section live in a COMPACT panel in the SAME right side-inspector rail as section/block settings, triggered by a button next to the section-panel icon (reuse unused Settings2). NOT the full-height drawer.
- No new npm dependency. No DB migration (effects/motion live in existing jsonb: currentData.settings.effects for page; section.style / hero.style for section/hero). All new keys present-only + reject-unknown allowlist + round-trip test; legacy docs byte-identical.
- ALL effects respect prefers-reduced-motion (CSS motion-safe + runtime early-return). Runtime behaviors use the existing runtimeScripts.tsx injection, dependency-free IIFEs, rAF/throttle, no CSP-nonce violation.`;

const GRANULARITY = `GRANULARITY + FILE RULES (AGENTS.md — MANDATORY):
- board parent ${TASK}_Short_Title.md (Overview; grounded gap analysis with file:line; Schema-extension plan; Subtask breakdown table with SINGLE-WRITER file ownership + strict land order; Coordination/collision guards; Security Contract [runtime-script injection safety, no CSS/HTML injection via effect config, reject-unknown]; Hard Invariants [present-only, reduced-motion, no-dep, no-migration]; Acceptance Criteria measured LIVE; changelog pin 1234) → technical subtasks ${TASK}-NN → EXECUTABLE LEAVES ${TASK}-NN-LNN wherever a subtask spans multiple files/surfaces.
- Every EXECUTABLE LEAF carries execution-ready implementation PSEUDOCODE (helper/function shape, data flow, error handling) + regression-TEST shape + lane (per _docs/TESTING_STRATEGY.md — Bun tests/unit/*, Vitest tests/vitest/*).
- File naming: parent underscores; children hyphens (${TASK}-NN-Title.md, ${TASK}-NN-LNN-Title.md); H1 == physical ID; a '# FileName:' line == filename; child parent field (**Parent Task:** ${TASK} / **Parent Subtask:** ${TASK}-NN); Status ⏳ To Do; zero-padded NN from 01, LNN from L01.
- SINGLE-WRITER: one owner per production file (or a documented additive seam). Strict land order: shared effects MODEL + runtime-infra + normalize FIRST, then section/hero/icon consumers, then the page-settings panel + per-page effects, then closure.
- Do NOT edit _docs/_TASKS/README.md or _docs/_CHANGELOG/* (orchestrator owns those); just PIN changelog 1234 in the contract text (verify next-free at closure; 519=1232/520=1233 precede).

SUGGESTED DECOMPOSITION (author may refine, keep granular):
- 521-01 Effects MODEL + shared runtime-effects infra + normalize/reject-unknown (section.style scrollEffect/parallax + hero.style tilt + PageDocumentSettingsV2.effects; shared enums/clamps; a dependency-free runtime-effects script module registered via runtimeScripts.tsx; reduced-motion guard helper). Foundation — leaves for each model region + the runtime module + tests.
- 521-02 Section scroll/parallax/reveal — admin control in the section inspector (BlockSettings) + front render (pageRendererV2 section) + runtime binding. Leaves + tests.
- 521-03 Hero mouse-tilt — hero.tsx schema + hero editor control + front tilt (CSS perspective + mousemove runtime, reduced-motion off). Leaves + tests.
- 521-04 Animated-icon block — NEW block/widget (schema/defaults/normalize/editor/render) using the lightweight inline-SVG+CSS-keyframes set; register in the widget/pack matrix. Leaves + tests.
- 521-05 Page-settings side-inspector panel relocation + per-page effects (cursor spotlight) — the compact panel (button next to section-panel icon via Settings2), an 'Effects' section, persist currentData.settings.effects, front injection into the page shell (PageDocumentRender/renderPublicPage). Leaves + tests.
- 521-06 Tests/docs/closure (PAGE_MODEL/WIDGETS/DESIGN_TOKENS docs, widget pack matrix if a new block, changelog 1234, board rows).`;

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
    "newDependency",
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
    newDependency: { type: "boolean" },
    singleWriterOk: { type: "boolean" },
    summary: { type: "string" },
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
  required: ["applied", "residual"],
  properties: {
    applied: { type: "array", items: { type: "string" } },
    residual: { type: "array", items: { type: "string" } },
  },
};

const COMMON = `You are AUTHORING the ${TASK} task contract (DOCUMENTATION ONLY — write .md files under ${ROOT}/_docs/_TASKS/, no production code). Read a couple of existing granular contracts first for house style + granularity bar (e.g. ${ROOT}/_docs/_TASKS/TASK-516_*.md + its children, and TASK-519-* leaves).
${GRANULARITY}
${DECISIONS}
${GROUNDING}`;

phase("Author");
const authored = await agent(
  `${COMMON}\n\nAUTHOR the full ${TASK} family now (parent + all NN subtasks + all NN-LNN executable leaves) per the suggested decomposition (refine as needed but keep it granular + execution-ready). Ground every file:line vs live code (grep -an/Read for the big files). Return the structured result listing every file written.`,
  { label: "author:521", phase: "Author", schema: AUTHOR_SCHEMA }
);
log(
  `Authored ${TASK}: ${authored?.subtaskFiles?.length || 0} subtasks + ${authored?.leafFiles?.length || 0} leaves, changelog ${authored?.changelogPin}, migration=${authored?.migrationNeeded}, newDep=${authored?.newDependency}, single-writer=${authored?.singleWriterOk}`
);

const LENSES = [
  {
    key: "grounding",
    ask: "GROUNDING: open every cited file:line (grep -an/Read for big files) — exists + says what is claimed; no invented API/symbol; the section-style/hero-style/page-settings extension points + the runtimeScripts injection mechanism are real as described.",
  },
  {
    key: "granularity",
    ask: "GRANULARITY/EXECUTION-READINESS: parent + NN + NN-LNN present; every executable leaf has implementation pseudocode (function/helper shape, data flow, error handling) + regression-test shape + correct lane (Bun tests/unit/* vs Vitest tests/vitest/*); no oversized subtask that should be split.",
  },
  {
    key: "completeness",
    ask: "COMPLETENESS + FEASIBILITY: delivers all of A (section scroll/parallax/reveal) + B (lightweight animated-icon block, NO npm dep) + C (hero mouse-tilt) + D (per-page cursor spotlight + compact side-inspector page-settings panel next to the section-panel button); FRONT render + runtime binding covered, not just admin; reduced-motion honored everywhere; present-only + no-migration + no-dependency invariants stated.",
  },
  {
    key: "single-writer",
    ask: "SINGLE-WRITER + LAND ORDER + NAMING: one owner per production file (or documented additive seam); model/runtime-infra land before consumers, panel after; file naming/H1/FileName/parent-field/Status/changelog-pin (1234) consistent across all files.",
  },
  {
    key: "security",
    ask: "SECURITY: effect config values are reject-unknown allowlisted + clamped (no CSS/HTML/JS injection via a crafted effect/color/icon value into style/attributes or the runtime script); the runtime-effect scripts are dependency-free, idempotent, and do not open an injection or CSP-nonce hole; the animated-icon set is a fixed allowlist (not arbitrary SVG); a Security Contract subsection exists.",
  },
];

phase("DriftAudit");
let round = 0,
  clean = false;
while (round < 5 && !clean) {
  round += 1;
  const audits = await parallel([
    ...LENSES.map(
      (l) => () =>
        agent(
          `Round ${round} adversarial DRIFT-AUDIT of ${TASK} (read parent + ALL NN + NN-LNN files under ${ROOT}/_docs/_TASKS/). LENS: ${l.ask}\n${GROUNDING}\n${DECISIONS}\nFindings with concrete fixes; isReal only if defensible.`,
          { label: `audit-r${round}:${l.key}`, phase: "DriftAudit", schema: AUDIT_SCHEMA }
        ).then((a) => ({ ...a, key: l.key }))
    ),
    () =>
      agent(
        `Round ${round} cross-file RECONCILE of ${TASK} (read ALL files). Check ONLY cross-file contradictions: single-writer ownership, identical shared enum/clamp/type/CSS-selector/CSS-var shapes across files, helper/effect names consumers reference == names the owning subtask defines, per-device/responsive representation consistency, promised test-file names vs delivered, land order, changelog pin 1234. ${GROUNDING}\nFindings (isReal + fix).`,
        { label: `reconcile-r${round}`, phase: "DriftAudit", schema: AUDIT_SCHEMA }
      ).then((a) => ({ ...a, key: "reconcile" })),
  ]);
  const returned = audits.filter(Boolean);
  const expected = LENSES.length + 1;
  const real = returned.flatMap((a) =>
    (a.findings || []).filter((f) => f.isReal).map((f) => ({ ...f, lens: a.key }))
  );
  const hm = real.filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM");
  log(
    `Round ${round}: audits ${returned.length}/${expected} | real HIGH/MED=${hm.length} LOW=${real.length - hm.length}`
  );
  if (returned.length === expected && hm.length === 0) {
    clean = true;
    log(`Round ${round}: CLEAN.`);
    break;
  }
  const list = hm
    .map((f, i) => `${i + 1}. [${f.severity}] (${f.lens}) ${f.file}: ${f.problem} → FIX: ${f.fix}`)
    .join("\n");
  if (list)
    await agent(
      `${COMMON}\n\nRound ${round} CONVERGE: apply these real HIGH/MEDIUM drift fixes to the ${TASK} contract (edit .md files under ${ROOT}/_docs/_TASKS/). Correct citations, close granularity/completeness/single-writer/security gaps, keep changelog pin + naming consistent. If a finding is wrong, justify in residual. Findings:\n${list}\n\nReturn applied vs residual.`,
      { label: `fix-r${round}`, phase: "DriftAudit", schema: FIX_SCHEMA }
    );
}

phase("FinalReconcile");
const final = await agent(
  `FINAL fresh read-only reconcile + readiness check of ${TASK} (parent + all NN + NN-LNN files). Confirm 0 HIGH/MEDIUM drift across grounding/granularity/completeness/single-writer/security; every executable leaf has pseudocode + test shape + correct lane; land order + changelog pin 1234 consistent; no-dependency + no-migration + present-only + reduced-motion invariants hold. ${GROUNDING}\n${DECISIONS}\nReturn remaining REAL findings — empty + verdict 'clean' = implementation-ready.`,
  { label: "final-reconcile:521", phase: "FinalReconcile", schema: AUDIT_SCHEMA }
);

return {
  authored: {
    subtasks: authored?.subtaskFiles?.length,
    leaves: authored?.leafFiles?.length,
    changelog: authored?.changelogPin,
    migration: authored?.migrationNeeded,
    newDependency: authored?.newDependency,
  },
  driftRounds: round,
  convergedClean: clean,
  finalVerdict: final?.verdict,
  finalResidual: (final?.findings || [])
    .filter((f) => f.isReal)
    .map((f) => `[${f.severity}] ${f.file}: ${f.problem}`),
};
