export const meta = {
  name: "task-507-fix",
  description:
    "TASK-507 — resolve the two TASK-506 post-audit LOW residuals: Fix A (menuDocumentCss.ts) scope the level-0/navChrome B2 indicator + hover-lift/underline chrome to a TOP-BAR-ONLY selector so it no longer leaks onto dropdown links, and reset transform+opacity in every indicator rest-block so a deeper non-grow override never inherits a stale scaleX(0); Fix B (MenuDesignEditor.tsx) align ControlDefaultHint to the contract (return null whenever value===undefined) so gated-off numerics stop showing an 'Off'/'Not applied' hint while the thumb sits at range.min. Author board task, implement both (parallel, different files), targeted gate, post-audit, focused smoke, closure (changelog 1216).",
  phases: [
    { title: "Author" },
    { title: "Implement" },
    { title: "Gate" },
    { title: "Post-audit" },
    { title: "Smoke" },
    { title: "Closure" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ROOT + "/_docs/_TASKS";
const BOARD = "TASK-507_Menu_Indicator_Scope_And_Hint_Alignment.md";
const CSS = ROOT + "/core/site/menuDocumentCss.ts";
const EDITOR = ROOT + "/core/admin/ui/menus/MenuDesignEditor.tsx";
const V2 = ROOT + "/core/services/menus/menuDocumentV2.ts";
const ENV = "set -a && { [ ! -f .env ] || . ./.env; } && set +a && ";

const CONTEXT = [
  "TASK-507 resolves the 2 LOW residuals from the TASK-506 (menu modern styling) post-audit. Both are small, surgical, on already-shipped 506 code on branch feature/visual. Same architecture family: doc-scoped CSS via the ONE shared buildMenuRuleSetsForDocument (front @media + canvas flatten never diverge); present-only emission; byte-identity: buildSiteShellCss(null) untouched + no-override docs byte-identical. Menu source files read as BINARY to rg — Read + grep -an, NEVER trust an empty rg result.",
  "",
  "FIX A (owns core/site/menuDocumentCss.ts) — B2 indicator cascade-leak. Today navChromeRules emits the level-0 B2 indicator ::before bar (and hover-lift/hover-underline extras) on the cascade-root selector `${menuDocScope} .site-nav-link`, which matches links at ALL depths (0/1/2). So enabling an indicator/hoverLift/hoverUnderline ONLY at level 0 also paints it on every dropdown link, and a deeper level's indicator:none early-returns (emits nothing) so it cannot cancel the inherited bar. Also: a non-grow indicator rest-block declares opacity but NOT transform, so an inherited grow scaleX(0) persists and a deeper non-grow bar can stay invisible.",
  "FIX A REQUIREMENTS: (1) Scope the level-0/navChrome B2 indicator ::before bar AND the hover-lift/hover-underline extras to a TOP-BAR-ONLY selector (e.g. `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-link` and its ::before) so level-0 B2 chrome applies to depth-0 links ONLY and never leaks to dropdown links. Level-1/2 indicators keep emitting on their own per-level container selectors (unchanged). Do NOT change the intentional cascade of linkColor/fontSize/hover-background (those stay cascade-root by design — only the NEW B2 indicator/lift/underline chrome is scoped). (2) In EVERY indicator rest-block (grow AND non-grow, all levels), reset BOTH transform and opacity so a deeper non-grow override never inherits a stale scaleX(0). Keep PRESENT-ONLY (nothing emitted unless authored) and byte-identity for no-override docs. Add/point golden tests: level-0 indicator does NOT appear on a dropdown link selector; the top-bar-only selector is emitted; rest-block resets transform.",
  "",
  "FIX B (owns core/admin/ui/menus/MenuDesignEditor.tsx) — ControlDefaultHint contract alignment. The guard is `if (value === undefined && sourceLabel === 'Not set') return null;` but the 506 contract (TASK-506-01 Step6 / 506-04 F2.a) specifies `if (value === undefined) return null;`. The gated present-only numerics (indicatorThickness, itemDividerWidth, transitionMs, hoverLift, containerPaddingX/Y, navPillRadius/PaddingX/PaddingY) intentionally return {value:undefined, sourceLabel:'Off'|'Not applied'} SO the hint is HIDDEN — but the current guard RENDERS them, producing mixed messaging (thumb at range.min while hint says 'Off').",
  "FIX B REQUIREMENTS: change the guard to `if (value === undefined) return null;` so any control whose resolved default value is undefined shows NO hint (gated-off numerics hide their hint). Do NOT regress the non-gated controls (they have a real numeric/enum/color value + sourceLabel and still render their hint). No '(undefined)' can ever appear (already guaranteed). Update any UI-lane test that asserted an 'Off'/'Not applied' hint RENDERS → assert it is HIDDEN when the gate is off; keep the assertions that a real resolved default (e.g. 'Default 12px', 'Inherited from theme (16px)') still shows. If resolveMenuControlDefault's gated 'Off'/'Not applied' labels become fully dead after this, either leave them (harmless) or note it — do NOT touch menuDocumentV2.ts unless a type/signature genuinely requires it (it should not).",
].join("\n");

// --------------------------------------------------------------------------
phase("Author");
await agent(
  [
    "Author the board task file " +
      TASKS +
      "/" +
      BOARD +
      " for TASK-507 per AGENTS.md (board file, underscores; H1 = TASK-507; '# FileName:' matches; **Status:** ⏳ To Do; Overview; two clearly-separated fix sections A + B with execution-ready pseudocode citing the REAL anchors you verify in " +
      CSS +
      " and " +
      EDITOR +
      " via Read + grep -an; Security note 'UI/client-state + doc-scoped CSS; no route/RBAC/migration'; Testing Requirements incl. the golden/UI-lane assertions; a >=3-scenario focused SMOKE section [indicator no-leak on dropdown when only level-0 set; deeper non-grow indicator visible after a level-0 grow; gated-off numeric shows NO hint while a real default still shows]).",
    CONTEXT,
    "ALSO add a TASK-507 row to the To Do table in " +
      TASKS +
      "/README.md and bump To Do Statistics by 1 (Read README FRESH first; touch ONLY your row). Return the board path.",
  ].join("\n\n"),
  { label: "author:507", phase: "Author" }
);

// --------------------------------------------------------------------------
phase("Implement");
const COMMON =
  "Implement a TASK-507 fix on branch feature/visual IN-PLACE. Read the board " +
  TASKS +
  "/" +
  BOARD +
  " + your target source IN FULL first (Read + grep -an; menu files read as BINARY to rg). Keep byte-identity (buildSiteShellCss(null) untouched; no-override docs byte-identical), present-only emission, reject-unknown, and all TASK-506 behavior intact. Touch ONLY your owned file(s) + its coupled tests. Do NOT edit _docs/* (closure agent owns docs). Return a concise summary: exact edits (file:line), tests re-pointed/added, deviations.";
await parallel([
  () =>
    agent(
      COMMON +
        "\n\nYOUR FIX = A (owns core/site/menuDocumentCss.ts + its coupled vitest goldens tests/vitest/site/menu-document-css.test.ts and the bun tests/unit/site/menu-document-render.test.tsx if a golden lives there).\n" +
        CONTEXT.split("FIX B")[0],
      { label: "impl:fixA", phase: "Implement" }
    ),
  () =>
    agent(
      COMMON +
        "\n\nYOUR FIX = B (owns core/admin/ui/menus/MenuDesignEditor.tsx + its coupled vitest tests/vitest/ui/menu-design-editor.test.tsx). Do NOT touch menuDocumentCss.ts (Fix A owns it) or menuDocumentV2.ts unless a signature truly requires it.\n" +
        "FIX B" +
        CONTEXT.split("FIX B")[1],
      { label: "impl:fixB", phase: "Implement" }
    ),
]);

// --------------------------------------------------------------------------
const GATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "errors"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
  },
};
const GATE_CMD =
  "cd " +
  ROOT +
  " && bun --cwd core lint:types && bun --cwd core lint && " +
  ENV +
  "NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts menu-document menuDocumentCss menu-design menu-editor menu site navigation 2>&1 | tail -55 && " +
  ENV +
  "bun test tests/unit/site/menu-document-render.test.tsx tests/unit/pages/siteShellCss.test.ts tests/integration/runtime/site-shell-runtime.test.ts 2>&1 | tail -25";
async function runGate(label, ph) {
  return await agent(
    "Run from " +
      ROOT +
      " and report — do NOT edit anything:\n" +
      GATE_CMD +
      '\nReturn {pass, summary, errors}. pass=true ONLY if every command exits 0 and both test runs report 0 failed. Known flakes: vitest spurious "Test timed out" under load (re-run the NAMED file once isolated); a bun settings/DB test can transiently fail from earlier smoke-DB pollution (re-run named isolated). List each real failure with file:line in errors[] (cap ~40).',
    { label: label, phase: ph, schema: GATE_SCHEMA }
  );
}
phase("Gate");
let g = await runGate("gate:1", "Gate");
let r = 1;
while (g && !g.pass && r <= 3) {
  log("Gate round " + r + ": " + g.errors.length + " issues -> fixing");
  await agent(
    "TASK-507: the targeted gate FAILS. Fix CORRECTLY (source over test; never weaken a behavior assertion, never break byte-identity/no-override/present-only/reject-unknown or any TASK-506 behavior; do NOT edit _docs/**). Fix A owns menuDocumentCss.ts, Fix B owns MenuDesignEditor.tsx.\nFailures:\n" +
      g.errors.map((e) => "- " + e).join("\n"),
    { label: "fix:gate:" + r, phase: "Gate" }
  );
  r += 1;
  g = await runGate("gate:" + r, "Gate");
}
log("Gate: " + (g && g.pass ? "GREEN" : "RED"));

// --------------------------------------------------------------------------
phase("Post-audit");
const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "area", "finding", "evidence", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["high", "medium", "low"] },
          area: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
};
const audit = await agent(
  "Post-implementation audit of TASK-507 (implemented on disk). Read the board " +
    TASKS +
    "/" +
    BOARD +
    " + the real changed source (core/site/menuDocumentCss.ts, core/admin/ui/menus/MenuDesignEditor.tsx) + tests; run git diff. Verify: (Fix A) the level-0/navChrome B2 indicator + hover-lift/underline is now emitted ONLY on a top-bar-only selector (depth-0 links) and NO LONGER on a selector that matches dropdown links; every indicator rest-block resets BOTH transform and opacity; level-1/2 indicators still emit correctly; PRESENT-ONLY + byte-identity for no-override docs intact; the intentional cascade of linkColor/fontSize/hover-bg is unchanged. (Fix B) ControlDefaultHint returns null whenever value===undefined; gated-off numerics render NO hint; real resolved defaults still render; no '(undefined)'; no regression to non-gated controls. Flag real issues only (evidence-backed, file:line). Return findings[].",
  { label: "audit:507", phase: "Post-audit", schema: AUDIT_SCHEMA }
);
const hm = (audit && audit.findings ? audit.findings : []).filter(
  (f) => f.severity === "high" || f.severity === "medium"
);
if (hm.length > 0) {
  log("Post-audit: " + hm.length + " HIGH/MED -> fixing");
  await agent(
    "TASK-507 post-audit found these HIGH/MEDIUM issues. Fix each correctly (owned source or coupled test; never weaken tests or break byte-identity/present-only/TASK-506 behavior; no _docs).\n" +
      hm
        .map(
          (f) =>
            "- [" +
            f.severity +
            "] " +
            f.area +
            ": " +
            f.finding +
            "\n  evidence: " +
            f.evidence +
            "\n  fix: " +
            f.recommendation
        )
        .join("\n"),
    { label: "audit-fix:507", phase: "Post-audit" }
  );
  const g2 = await runGate("gate:post-audit", "Post-audit");
  log("Post-audit re-gate: " + (g2 && g2.pass ? "GREEN" : "RED"));
}

// --------------------------------------------------------------------------
phase("Smoke");
const SMOKE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "serverUp", "scenarios", "consoleErrors", "screenshots", "failures"],
  properties: {
    pass: { type: "boolean" },
    serverUp: { type: "boolean" },
    scenarios: { type: "array", items: { type: "string" } },
    consoleErrors: { type: "number" },
    screenshots: { type: "array", items: { type: "string" } },
    failures: { type: "array", items: { type: "string" } },
  },
};
const smoke = await agent(
  [
    "FOCUSED runtime SMOKE of TASK-507 (>=3 scenarios), playwright-cli, session -s=wf507smoke on EVERY command; screenshots to " +
      ROOT +
      "/_docs/_workflows/_smoke/. Assert VISIBLE EFFECT (computed styles/geometry/DOM).",
    'SERVER RESTART FIRST: ps aux | grep "bun --eval" | grep -v grep => kill the PID, coderso-dev-core-host >/dev/null 2>&1 &, wait ~15s, verify :5173 + :3000 = 200 (else pass:false serverUp:false). Log in; click through the config wizard if shown. Open a menu with >=2 nesting depths + /design.',
    "S1 INDICATOR NO-LEAK: enable a B2 indicator (underline + color) on LEVEL 0 ONLY; publish; on the front assert the TOP-BAR links show the ::before indicator bar BUT the DROPDOWN links (level 1/2, hover to open) do NOT (computed ::before height 0 / content none / not painted). Contrast with 506 where it leaked.",
    "S2 DEEPER INDICATOR AFTER LEVEL-0 GROW: set level-0 indicator grow=true; set a level-1 indicator (non-grow) different color; on the front the level-1 dropdown link indicator is VISIBLE (its ::before opacity 1 + transform not stuck at scaleX(0)) — no stale inherited scaleX(0).",
    "S3 HINT ALIGNMENT: in the editor, a gated-OFF numeric (e.g. indicator=none so indicatorThickness is gated off, or itemDivider show=off so its width is gated) shows NO default hint line (hidden), while a real resolved default still shows (e.g. Link padding X 'Default 12px', Font size 'Inherited from theme (16px)'). No '(undefined)' anywhere.",
    "S4 REGRESSION SPOT-CHECK: a normal single-level menu still renders correctly; 0 console errors; dark-mode design tab no bg-white break; a no-override menu header looks unchanged (byte-identity intact).",
    "Close the session. Return {pass (true iff serverUp AND all scenarios held AND consoleErrors===0), serverUp, scenarios[] with measured results, consoleErrors, screenshots[], failures[]}.",
  ].join("\n"),
  { label: "smoke:507", phase: "Smoke", schema: SMOKE_SCHEMA }
);
log(
  "Smoke: " +
    (smoke && smoke.pass ? "PASS" : "needs review") +
    " (consoleErrors=" +
    (smoke && smoke.consoleErrors) +
    ")"
);

// --------------------------------------------------------------------------
phase("Closure");
await agent(
  "Close out TASK-507. Verify the targeted gate is green (Fix A + Fix B tests). Docs/board closure per AGENTS.md:\n- Add changelog _docs/_CHANGELOG/1216-2026-07-03-task-507-...md (PINNED 1216; 1215 = TASK-506) + update _docs/_CHANGELOG/README.md.\n- Board: _docs/_TASKS/README.md — Read FRESH immediately before editing; move ONLY the TASK-507 row to Done + adjust Statistics by exactly 1. Set **Status:** ✅ Done + **Completed:** in " +
    TASKS +
    "/" +
    BOARD +
    ".\n- Record in the changelog that these resolve the two TASK-506 post-audit LOW residuals (indicator cascade-leak scoped to top-bar; ControlDefaultHint aligned to return null on value===undefined). Only touch _docs + the board file. Return the changelog path + confirmation the board Statistics reconcile.",
  { label: "closure:507", phase: "Closure" }
);

return { gate: g && g.pass, postAuditHighMed: hm.length, smoke: smoke };
