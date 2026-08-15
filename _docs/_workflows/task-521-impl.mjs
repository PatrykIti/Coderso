export const meta = {
  name: "task-521-impl",
  description:
    "Implement TASK-521 (Page Motion & Interaction Effects: section scroll/parallax/reveal + hero mouse-tilt + animated-icon block + per-page effects + page-settings compact panel) on its worktree: 5 strictly-sequential subtasks + closure, each gated green, then parallel adversarial audits (fidelity/UX + security + regression), fix real findings, closure.",
  phases: [{ title: "Implement" }, { title: "Audit" }, { title: "Fix" }, { title: "Closure" }],
};

const WT =
  (typeof args === "string" ? JSON.parse(args) : args)?.wt ||
  "/home/coder/project/Coderso-task-521";
const BASE = (typeof args === "string" ? JSON.parse(args) : args)?.base || "feature/tasks-fixes";
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

const COMMON = `You work ONLY in the isolated git worktree at ${WT} (branch feature/task-521, off ${BASE} which INCLUDES TASK-519 alpha color input + TASK-520 menu Design). This is TASK-521 (Page Motion & Interaction Effects).
ALWAYS read first: ${WT}/_docs/_TASKS/TASK-521_Page_Motion_And_Interaction_Effects.md (parent) AND your subtask's file(s) INCLUDING its NN-LNN leaves (execution-ready pseudocode + test shapes). Edit ONLY the files/REGIONS your subtask owns. GREP TRAP: PageEditor.tsx, pageRendererV2.tsx, pageDocumentV2.ts, pageEditorControlRegistry.ts read as binary to rg — use grep -an or Read.
DOCUMENTED ADDITIVE SEAMS (edit DISJOINT symbol regions only, in land order): pageRendererV2.tsx — 521-02 SECTION region (toPageSectionRenderProps + PageSectionRender), 521-04 BLOCK-CONTENT region (renderPageBlockContent case "icon"), 521-05 PAGE-ROOT region (PageDocumentRender). pageEditorControlRegistry.ts — 521-02 pageUniversalSectionControls region, 521-04 pageBlockControlRegistry.icon region. hero.tsx (521-03) + PageEditor.tsx (521-05) edit disjoint intra-file regions. Read the CURRENT on-disk state of a shared file before editing so you build on prior subtasks, not clobber them.
GOAL: (A) section scroll/parallax/reveal effects — FRONT (and preview) only; the builder canvas shows content at rest (Hard Invariant 7). (B) lightweight ANIMATED-ICON block using a curated inline-SVG + CSS-keyframes set (NEW animatedIconGlyphs.tsx) — canvas-active via block render. (C) hero image mouse-TILT (3D parallax-on-hover). (D) per-page effects (cursor-follow spotlight etc.) + RELOCATE page settings from the full-height drawer into a COMPACT panel in the SAME side-inspector rail as section/block settings, triggered by a button next to the section-panel icon (reuse the unused Settings2 import in PageEditor.tsx), with an 'Effects' section.
HARD INVARIANTS: NO npm dependency (animated icons are inline-SVG+CSS). NO DB migration (effects/motion live in existing jsonb: currentData.settings.effects for page; section.style / hero.style for section/hero). All new keys PRESENT-ONLY + reject-unknown allowlist + round-trip test; legacy docs byte-identical (no seeded default, zero emitted bytes when unauthored). ALL effects respect prefers-reduced-motion (CSS motion-safe + the runtime scripts early-return on matchMedia('(prefers-reduced-motion: reduce)').matches). Runtime behaviors use the existing runtimeScripts.tsx injection — dependency-free idempotent IIFEs, rAF/throttle, no CSP-nonce violation, no eval / no innerHTML of user data. Effect config values are whitelisted (no CSS/HTML/JS injection); animated-icon glyph name is a fixed ALLOWLIST (use Object.prototype.hasOwnProperty.call / a Set, never a bare bracket lookup on a prototype-carrying map).
Do NOT commit (the Closure phase owns the commit). If a gate fails, FIX and re-run until green before returning.`;

const SUBTASKS = [
  {
    id: "521-01",
    file: "TASK-521-01-Effects-Model-And-Runtime-Infra.md",
    owns: "core/services/pages/pageDocumentV2.ts (present-only section.style scrollEffect/parallax + hero tilt hook + PageDocumentSettingsV2.effects + animated-icon block model; reject-unknown allowlists; NO seeded default) + NEW core/services/pages/pageEffectsRuntime.ts (dependency-free runtime-effects script module + reduced-motion guard)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:bun + test:vitest for the model + runtime-infra tests (present-only round-trip, reject-unknown, legacy byte-identical)",
  },
  {
    id: "521-02",
    file: "TASK-521-02-Section-Scroll-Parallax-Reveal.md",
    owns: "pageEditorControlRegistry.ts [pageUniversalSectionControls region — seam] + pageRendererV2.tsx [SECTION region: toPageSectionRenderProps + PageSectionRender — seam] (section scroll/parallax/reveal control descriptors + FRONT render binding; canvas stays at rest)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:bun + test:vitest for the section-effect tests (front render stamps data-attrs + runtime; canvas byte-identical at rest)",
  },
  {
    id: "521-03",
    file: "TASK-521-03-Hero-Mouse-Tilt.md",
    owns: "core/widgets/core/hero.tsx (disjoint intra-file regions: tilt model + editor control + render + tilt runtime script)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:bun + test:vitest for the hero tilt tests (present-only, reduced-motion, front tilt behavior)",
  },
  {
    id: "521-04",
    file: "TASK-521-04-Animated-Icon-Block.md",
    owns: 'NEW core/services/pages/animatedIconGlyphs.tsx (curated inline-SVG + CSS-keyframes set + ALLOWLIST) + core/admin/ui/pages/editor/pageEditorOptions.ts (palette copy) + pageRendererV2.tsx [block-content case "icon" region — seam] + pageEditorControlRegistry.ts [pageBlockControlRegistry.icon region — seam]',
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:bun + test:vitest for the animated-icon block tests (glyph allowlist hasOwnProperty-guarded, render, editor controls, reduced-motion)",
  },
  {
    id: "521-05",
    file: "TASK-521-05-Page-Settings-Panel-And-Per-Page-Effects.md",
    owns: "core/admin/ui/pages/PageEditor.tsx (disjoint regions: compact side-inspector page-settings panel relocation via Settings2 button + Effects section + persistence to currentData.settings.effects) + pageRendererV2.tsx [PAGE-ROOT region: PageDocumentRender — seam] (page-shell effect wrapper + cursor-spotlight runtime injection)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the page-settings panel + per-page-effects tests + bun run test:bun for the page-shell render/injection tests",
  },
];

phase("Implement");
let prevNote = "";
const implResults = [];
for (const st of SUBTASKS) {
  const r = await agent(
    `${COMMON}

YOUR SUBTASK: ${st.id} — read ${WT}/_docs/_TASKS/${st.file} + ALL its NN-LNN leaf files for the execution-ready pseudocode + test shapes. Follow them PRECISELY. Edit ONLY this subtask's owned files/REGIONS (respect the documented seams — read current on-disk state first).
OWNED FILES/REGIONS: ${st.owns}.
${prevNote ? `PRIOR SUBTASK CONTEXT: ${prevNote}` : "This is the foundation subtask (the effects model + runtime infra the consumers use)."}

GATES (run in ${WT} with .env sourced — prefix each with: ${ENV} && ...): ${st.gates}. Capture PASS/FAIL + first error line each.

Return the structured result. In notes, include what the NEXT subtask needs (new model keys/types, runtime-effect registration names, control-descriptor ids, glyph-allowlist export, the effects config shape, seam region boundaries you touched).`,
    { label: `impl:${st.id}`, phase: "Implement", schema: IMPL_SCHEMA }
  );
  implResults.push(r);
  log(`Implement ${st.id}: done=${r?.done} gates=${(r?.gates || "").slice(0, 120)}`);
  if (!r?.done) {
    log(`STOP: ${st.id} not green — halting (resume via resumeFromRunId).`);
    return { task: "TASK-521", halted: st.id, implResults };
  }
  prevNote = `${st.id} done. ${(r?.notes || "").slice(0, 800)}`;
}

phase("Audit");
const LENSES = [
  {
    key: "fidelity-ux",
    prompt: `Adversarial FIDELITY/UX audit of TASK-521 in worktree ${WT}. Review \`cd ${WT} && git diff ${BASE}...feature/task-521\` (grep -an/Read for big files). Verify the owner asks are delivered: (A) section scroll/parallax/reveal apply on the FRONT (and preview), builder canvas at rest; (B) a lightweight animated-icon block insertable on the page (inline-SVG+CSS, visibly animated); (C) hero image mouse-tilt (tilts toward corners on hover); (D) per-page cursor-follow spotlight + the page settings RELOCATED into a COMPACT side-inspector panel (button next to the section-panel icon, NOT the old full-height drawer) with an Effects section. Flag anything under-delivered, the panel still being the full-height drawer, or old-approach leftovers (owner rejects those). isReal only if defensible with file:line.`,
  },
  {
    key: "security",
    prompt: `Adversarial SECURITY audit of TASK-521 in worktree ${WT}. PROVE: (a) all effect config values (section scrollEffect/parallax params, hero tilt params, page effects, icon glyph name) are reject-unknown allowlisted + clamped — no crafted value injects CSS/HTML/JS into a style attribute, a <style> block, or a data-attr; (b) the animated-icon glyph name is a fixed ALLOWLIST resolved via Object.prototype.hasOwnProperty.call / a Set (NOT a bare bracket lookup on a prototype-carrying map — the 'constructor'/'__proto__' key must NOT resolve to an inherited value and crash/inject); (c) the runtime-effect scripts (reveal/parallax/tilt/spotlight) are dependency-free, idempotent IIFEs with no eval / no innerHTML of user data, cannot be influenced by attacker-authored document data beyond clamped numeric params, and respect prefers-reduced-motion; (d) no new unauth surface / no CSP-nonce hole. Flag any injection/DoS path. isReal only if defensible with file:line.`,
  },
  {
    key: "regression",
    prompt: `Adversarial REGRESSION + BACK-COMPAT audit of TASK-521 in worktree ${WT}. Verify: (1) all new keys are PRESENT-ONLY with NO seeded default — a legacy page/section/hero with no effects renders byte-identical (no data-attrs, no runtime script, no CSS); (2) NO migration, NO new npm dependency (package.json diff empty); (3) the documented additive seams held — pageRendererV2.tsx (521-02 section / 521-04 block-icon / 521-05 page-root) + pageEditorControlRegistry.ts regions are DISJOINT, each region one writer, no clobbering; (4) existing section/hero/block render + the existing page editor still work; (5) reduced-motion honored everywhere. Run \`${ENV} && ./node_modules/.bin/tsc -p tsconfig.json --noEmit\` + \`${ENV} && bun run test:bun\` (page model/render) + \`${ENV} && bun run test:vitest\` (page editor) and report exact pass/fail counts. Flag real regressions. isReal only if defensible.`,
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
    `${COMMON}\n\nFix these REAL audit findings on the TASK-521 implementation in worktree ${WT}. Respect single-writer + the documented seams; do NOT weaken tests. Security findings fully closed (allowlist/clamp/hasOwnProperty). Fidelity findings fixed by adapting to the owner ask (compact panel, no old drawer). After fixing, re-run: ${ENV} && bun --cwd core lint && bun --cwd core lint:types && ./node_modules/.bin/tsc -p tsconfig.json --noEmit and the affected bun/vitest tests. Findings:\n${fixList}\n\nReport changes + re-run gates.`,
    { label: "fix:521", phase: "Fix", schema: IMPL_SCHEMA }
  );
  log(`Fix: done=${fix?.done} gates=${(fix?.gates || "").slice(0, 140)}`);
} else log("Fix: no real HIGH/MEDIUM — skipping.");

phase("Closure");
const closure = await agent(
  `${COMMON.replace("Do NOT commit (the Closure phase owns the commit).", "You OWN the commit for this task.")}

YOUR SUBTASK: 521-06 (Tests, Docs, Closure) — read ${WT}/_docs/_TASKS/TASK-521-06-Tests-Docs-Closure.md. The 5 implementation subtasks are applied + audited; do NOT edit their owned production files. Your job:
1) TESTS — complete closure-specified tests (correct LANE: page model/render = Bun tests/unit/*; page editor = Vitest tests/vitest/*). Ensure gates green.
2) DOCS — update PAGE_MODEL.md / WIDGETS / DESIGN_TOKENS the contract names (section effects, animated-icon block, hero tilt, per-page effects + panel). If a new block was added, update the widget pack matrix.
3) CHANGELOG — determine NEXT-FREE (\`cd ${WT} && ls _docs/_CHANGELOG/ | grep -oE '^[0-9]+' | sort -n | tail -1\`; 1233=TASK-520, 1229-1231 reserved for 511/517/518) and use the actual next-free (expected 1234); create _docs/_CHANGELOG/<N>-2026-07-08-task-521-page-motion-effects.md; bump README next-pointer; fix stale pins in 521 files.
4) BOARD — _docs/_TASKS/README.md: add parent TASK-521 + all children rows to Done; bump Statistics.
5) TASK FILES — Status ✅ Done in parent + all subtask + leaf files.
6) FINAL GATES (run in ${WT}, capture each): ${ENV} && bun --cwd core lint ; bun --cwd core lint:types ; ./node_modules/.bin/tsc -p tsconfig.json --noEmit ; bun run test:bun (re-run named under-load timeouts isolated) ; bun run test:vitest ; bun run gates:coderso.
NOTE: LIVE playwright smoke (effects on front + panel in admin) is run by the ORCHESTRATOR post-merge — do NOT restart the dev host.
7) COMMIT — cd ${WT} && git add -A && git commit -m "feat(pages): TASK-521 page motion & interaction effects (section scroll/parallax, hero tilt, animated-icon block, per-page effects + compact panel)" with a body summarizing the model/section/hero/icon/panel work + changelog <N>. End the body with:\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>\nPrecommit hook runs lint+typecheck — fix + re-commit if it blocks. Return the structured result with the actual changelog file, commit sha, and gate results.`,
  { label: "closure:521-06", phase: "Closure", schema: CLOSURE_SCHEMA }
);
log(
  `Closure: done=${closure?.done} changelog=${closure?.changelogFile} committed=${closure?.committed} sha=${closure?.commitSha}`
);
log(`Closure gates: ${(closure?.gates || "").slice(0, 200)}`);

return {
  task: "TASK-521",
  worktree: WT,
  implResults: implResults.map((r) => ({ subtask: r?.subtask, done: r?.done })),
  auditVerdicts: audits.filter(Boolean).map((a) => ({ lens: a.key, verdict: a.verdict })),
  realFindings,
  closure,
};
