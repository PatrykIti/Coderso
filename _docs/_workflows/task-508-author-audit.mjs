export const meta = {
  name: "task-508-author-audit",
  description:
    "Author TASK-508 (Menu nesting forms & flyout fix) per AGENTS.md: Req1 dropdown-container correct width/padding default hints + a link ALIGNMENT control (left/center/right) to center text ('auto padding'); Req2 FIX flyoutAnimation so it is ACTUALLY visible (replace the cosmetically-inert display+allow-discrete/@starting-style with a robust visibility+opacity+transform reveal that keeps zero-JS hover/focus-within reachability); Req3 unified directional submenu placement (right/DOWN/UP/left) applied consistently across ALL nested depths 1->2->3+ (adds 'up', merges the split level-1-vertical-only + level-2-only model) PLUS an ACCORDION inline mode (sublists expand in-flow as one cohesive block, no floating). Fresh RESEARCH grounds anchors, authors write parent+5 children, then >=5 SEQUENTIAL drift-audit rounds with cross-subtask reconcile. Returns findings. No implementation.",
  phases: [
    { title: "Research" },
    { title: "Author-parent" },
    { title: "Author-subtasks" },
    { title: "Audit" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ROOT + "/_docs/_TASKS";
const V2 = ROOT + "/core/services/menus/menuDocumentV2.ts";
const CSS = ROOT + "/core/site/menuDocumentCss.ts";
const EDITOR = ROOT + "/core/admin/ui/menus/MenuDesignEditor.tsx";
const SHELL = ROOT + "/core/site/siteShell.tsx";
const SHELLCSS = ROOT + "/core/site/siteShellCss.ts";

const SEED = [
  "SEED ANCHORS to verify fresh (grep -an / Read; big menu files read as BINARY to rg — never trust an empty rg result). These are the CURRENT (post-506/507) shipped state:",
  "- CSS " +
    CSS +
    ": flyoutAnimRule @~641 emits a display+`transition-behavior:allow-discrete`+`@starting-style` reveal (lines ~654-666) — this is COSMETICALLY INERT in the owner's browser (Req2 bug: the 506 smoke only checked the transition STRING was present, not real motion). The link-block transition folds @~568. submenuPlacementRule @~689 supports ONLY right|bottom|left and emits SOLELY on LEVEL_CONTAINER_SELECTORS[2] @~509 (= `.site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist`, a DESCENDANT selector that already reaches level 2 AND deeper) — NO 'up'/'top' option, and the FIRST dropdown (level 1) placement is a SEPARATE axis: dropdownRule @~327 = dropdownDirection top|bottom only (always left:0). navNestingRules @~698 hardcodes the nested default `.site-nav-sublist .site-nav-sublist{left:100%...}` @~707 (always RIGHT). levelContainerDecls @~742 emits min-width @~742 + containerPadding @~747; the sublist base (siteShellCss.ts) min-width:180px + padding:6px. Links are display:block (left-aligned) — NO text-align control (Req1 centering).",
  "- Model " +
    V2 +
    ": NavLevelStyle @~163; navChrome (level-0 home); NAV_LEVEL_STYLE_KEYS + NAV_CHROME_KEYS allowlists; NAV_LEVEL_NUMBER_RANGES incl. minWidth {80..480} @~693, containerPaddingX {0..40}/containerPaddingY {0..32} @~699; submenuPlacement enum right|bottom|left; resolveMenuControlDefault (506 F2 provider) — its default VALUES for minWidth/containerPaddingX/Y are WRONG/misleading (Req1: should surface the real base-sheet defaults 180px / 6px, or 'auto/centered' semantics), and there is NO linkAlign field.",
  "- Base sheet " +
    SHELLCSS +
    ": .site-nav-sublist base min-width:180px, padding:6px @~151; nested position @~157. buildSiteShellCss(null) MUST stay byte-identical (tests/unit/pages/siteShellCss.test.ts ZERO edits).",
  "- Editor " +
    EDITOR +
    ": NavLevelControls container controls (minWidth/containerPaddingX/Y sliders) + ControlDefaultHint (507-aligned: returns null when value===undefined). The Level segmented control + per-device forks. renderPreviewNavItem canvas mirror + force-open sim. Determine where a link-align control, a unified submenu-direction control, and a submenu-mode (flyout|accordion) toggle attach.",
  "- Front " +
    SHELL +
    ": SiteHeaderMenuDocumentRender emits ul.site-nav-list > li.site-nav-item[data-site-nav-group] > (a.site-nav-link | span.site-nav-group-label) + nested ul.site-nav-sublist. Judge whether ACCORDION mode (inline in-flow reveal) needs ANY markup/attribute hook or is pure-CSS on this structure (position:static + display toggle already exist; accordion = don't absolutely-position + indent).",
].join("\n");

const SCOPE = [
  "TASK-508 SCOPE — Menu nesting FORMS + flyout fix (owner-approved 2026-07-03). Same architecture family as 504/505/506/507: menuDocumentV2 doc contract + doc-scoped CSS via the ONE shared buildMenuRuleSetsForDocument (front @media + canvas flatten never diverge) + MenuDesignEditor controls. Schema-first, reject-unknown, byte-identity (buildSiteShellCss(null) untouched; no-override docs byte-identical), present-only emission, per-device Pages cascade (tablet+mobile each inherit DESKTOP). NO schemaVersion bump, NO route/RBAC/endpoint/migration.",
  "",
  "REQ1 DROPDOWN CONTAINER width/padding defaults + CENTERING (confirmed fix). (a) The right-panel dropdown-container controls (minWidth, containerPaddingX/Y) show WRONG/misleading resolved-default hints — surface the REAL effective defaults (base sheet min-width:180px, padding:6px) via resolveMenuControlDefault so the hint reads e.g. 'Default 180px' / 'Default 6px', never 0/undefined. (b) Add a link ALIGNMENT control (left|center|right) per level (the owner's 'auto padding to center the text in the container') — emit text-align on the link/container so dropdown link text can be centered; present-only, per-device.",
  "",
  "REQ2 FLYOUT ANIMATION VISIBLE (confirmed BUG fix). The current flyoutAnimRule (display transition + `allow-discrete` + `@starting-style`) is cosmetically inert in the owner's browser — 'no visible difference for any menu position'. REPLACE it with a ROBUST cross-browser reveal that ACTUALLY animates: keep the display:none->grid zero-JS hover/focus-within toggle for reachability, but drive the visible motion with visibility+opacity+transform (e.g. rest: visibility:hidden;opacity:0;transform:translateY(-6px) [slide] / opacity:0 [fade]; open: visibility:visible;opacity:1;transform:none; transition:opacity Xms, transform Xms, visibility 0s linear on close) so fade/slide are perceptible. Preserve zero-JS reachability (hover + focus-within still open + fully interactive) and byte-identity for no-override docs. The 508-05 smoke MUST assert PERCEPTIBLE motion (sample opacity/transform mid-transition or assert the visibility/opacity keyframe states), not just the presence of a transition string.",
  "",
  "REQ3 NESTING FORMS (owner chose BOTH): ",
  "R3a UNIFIED DIRECTIONAL PLACEMENT — one clear submenu DIRECTION control right|down|up|left that applies CONSISTENTLY across ALL nested depths (level 1 first-dropdown AND level 2/3+ nested), so choosing 'down' everywhere yields ONE cohesive downward column. Today the model is split+incomplete: level-1 = dropdownDirection top|bottom only; level-2+ = submenuPlacement right|bottom|left (no 'up'). MERGE into a coherent directional model: add 'up'(top); make the direction reach level 1 horizontally too (or a nav-level submenuDirection that governs all nested flyouts) while KEEPING the anchored (0,5,0) level-2 specificity + the first-dropdown top|bottom compatibility; reset ALL FOUR offsets per rule to avoid double-anchor stretch. Decide the cleanest home (a nav-base/navChrome global submenuDirection vs per-level submenuPlacement extended to level 1 + 'up') during research — but the UX must let the owner make 'everything opens down' trivially.",
  "R3b ACCORDION (inline) MODE — a menu-level submenuMode = flyout | accordion (navChrome/nav-base). In ACCORDION mode sublists are NOT floating overlays: they render IN-FLOW (position:static), indented, expanding in place and pushing siblings/content DOWN as ONE cohesive solid block (menu 0 -> down, 1 -> 2 -> down, all in one column). Must stay zero-JS reachable (hover/focus-within reveal via display) and NOT break the floating mode (flyout stays the default; accordion is opt-in). Consider whether accordion needs the top bar to become a vertical stack (orientation) or works as an inline expansion under each top item — pick the coherent one in research. Present-only: a flyout-mode (default) doc emits ZERO accordion bytes.",
  "",
  "HARD INVARIANTS: every new key (linkAlign, submenuDirection/extended submenuPlacement, submenuMode) joins its reject-unknown allowlist (NAV_LEVEL_STYLE_KEYS / NAV_CHROME_KEYS) with a round-trip test (fail-closed READ trap). buildSiteShellCss(null) byte-identical; no-override docs byte-identical. ALL CSS doc-scoped via the ONE shared builder (front @media + canvas flatten). Present-only emission. Per-device = tablet+mobile inherit DESKTOP. Canvas force-open must show the direction/accordion/animation while authoring. Keep ALL 504/505/506/507 behavior intact (indicator top-bar scope from 507, submenuPlacement level-2 anchored specificity, B1-B5). NO schemaVersion bump. Deferred (changelog residuals): JS-driven flyout edge-collision/flip; click-to-open; mega-menu multi-column; mobile drawer.",
].join("\n");

const AGENTS_RULES =
  "AGENTS.md task-authoring rules: board file TASK-508_...md (underscores); children TASK-508-NN-...md (hyphens); H1 = task ID; '# FileName:' matches; **Parent Task:** TASK-508; canonical **Status:** ⏳ To Do; execution-ready pseudocode (exact type shapes, clamp ranges/enums, normalizer + reject-unknown key-list edits, EXACT CSS selector + reveal/placement/accordion rule strings, editor control wiring + default-hint data flow, error handling, regression-test shape); Security Contract note = 'UI/client-state + schema-first document-contract extension; no new route/RBAC/endpoint/migration'; Testing Requirements per _docs/TESTING_STRATEGY.md (Vitest Bun-free + the bun menu suites) AND (in 508-05) a SMOKE section per the owner mandate: >=5 DISTINCT real-flow scenarios asserting VISIBLE EFFECT incl. PERCEPTIBLE flyout motion + the accordion cohesive block + direction up/down/left/right + centered text + correct container default hints. Name byte-identity + reject-unknown guards explicitly. Single-writer + land order explicit. Changelog pinned to the next free number (verify fresh; expected 1217).";

const FILES = {
  parent: "TASK-508_Menu_Nesting_Forms_And_Flyout_Fix.md",
  subs: [
    {
      key: "508-01",
      file: "TASK-508-01-Menu-Model-Align-Direction-Accordion.md",
      scope:
        "MODEL (owns core/services/menus/menuDocumentV2.ts). Req1: fix resolveMenuControlDefault so minWidth/containerPaddingX/Y report the REAL base-sheet defaults (180/6/6) not 0/undefined; add linkAlign (left|center|right) field per level + navChrome. Req3a: extend/merge the directional model — add 'up'/'top' to the submenu placement enum and define the unified submenuDirection (right|down|up|left) home (nav-base/navChrome global vs per-level) that governs all nested depths incl. level 1; keep first-dropdown top|bottom compatibility. Req3b: add submenuMode (flyout|accordion) on navChrome. New enums/ranges; extend normalizers + EVERY reject-unknown allowlist (round-trip test per new key); device-generalize. NO schemaVersion bump. Extend vitest model suites (round-trips, default-provider values, reject-unknown).",
    },
    {
      key: "508-02",
      file: "TASK-508-02-Menu-CSS-Flyout-Direction-Accordion.md",
      scope:
        "CSS (owns core/site/menuDocumentCss.ts). Req2: REWRITE flyoutAnimRule to the robust visibility+opacity+transform reveal (perceptible fade/slide; keep display toggle for reachability; drop the inert allow-discrete/@starting-style reliance or keep only as progressive-enhancement). Req1: emit linkAlign (text-align on link) + confirm container min-width/padding emission. Req3a: unified directional placement across ALL nested depths (right/down/up/left) incl. level 1, resetting all four offsets, keeping the anchored (0,5,0) level-2 specificity + first-dropdown axis. Req3b: accordion mode emission — when submenuMode=accordion, sublists render in-flow (position:static; not absolute), indented, revealed via the existing hover/focus-within display toggle, forming one downward block; flyout stays default. Per-device deltas; present-only zero-byte; byte-identity (buildSiteShellCss(null) untouched); canvas force-open shows each. Golden tests incl. an assertion the reveal uses visibility/opacity (perceptible) not display-only.",
    },
    {
      key: "508-03",
      file: "TASK-508-03-Front-And-Preview-Parity.md",
      scope:
        "FRONT (owns core/site/siteShell.tsx). Determine whether ACCORDION mode or the directional/animation changes need ANY markup/attribute hook (most likely pure-CSS on the existing ul.site-nav-list/li.site-nav-item/ul.site-nav-sublist). If a minimal hook is needed (e.g. a data attribute for accordion mode), add it without breaking buildSiteShellCss(null) byte-identity; else formally assert no front markup change + add front-side regression assertions. Enumerate the canvas-preview parity handed to 508-04 (renderPreviewNavItem mirrors any hook + the force-open sim must visualize accordion + direction).",
    },
    {
      key: "508-04",
      file: "TASK-508-04-Design-Editor-Align-Direction-Accordion-Controls.md",
      scope:
        "EDITOR (owns core/admin/ui/menus/MenuDesignEditor.tsx + MenuEditorPage.tsx if needed). Req1: fix the dropdown-container default hints (via the corrected provider) + add a link ALIGNMENT segmented control (left/center/right) per level+device. Req3a: a unified submenu DIRECTION control (right/down/up/left) that clearly governs all nested levels (replace/augment the confusing split), per-device. Req3b: a submenuMode toggle (Flyout | Accordion) at the menu/nav level. Wire canvas force-open + preview so the author SEES the direction, accordion block, and the (now visible) flyout animation. Reuse existing primitives (Segmented/Slider/ColorSwatch) + level+device badges + ControlDefaultHint. Tests: alignment, direction incl. up, accordion toggle, corrected container hints, per-device.",
    },
    {
      key: "508-05",
      file: "TASK-508-05-Menu-Nesting-Forms-Tests-Docs-Closure.md",
      scope:
        "CLOSURE. Full regression matrix: linkAlign + submenuDirection(+up) + submenuMode round-trips + reject-unknown per new key + corrected default-provider values (minWidth 180 / padding 6) + CSS goldens (visible-reveal reveal uses visibility/opacity; direction up/down/left/right offsets; accordion in-flow static) + byte-identity guards + front/preview parity + editor controls. The MANDATED >=5-scenario SMOKE asserting VISIBLE EFFECT: (1) flyout fade/slide is PERCEPTIBLE (sample opacity/transform mid-open, not just CSS string); (2) direction down at all levels = one cohesive downward column (measure nested boxes stack below parents); (3) direction up + left + right each measured; (4) ACCORDION mode = inline in-flow block pushing content down (nested sublist position:static, occupies flow, no absolute overlay); (5) centered dropdown text (text-align center) + correct container width/padding default hints; (6) per-device override + reset of a new field. Docs (menu styling contract) + changelog (VERIFY next free, expected 1217) + README To Do->Done + Statistics. Owns _docs + README only.",
    },
  ],
};

phase("Research");
const RT = [
  {
    key: "flyout",
    file: CSS,
    ask: "Map Req2: read flyoutAnimRule + the display:none->grid hover/focus-within toggle + the link-block transition. Explain EXACTLY why the display+allow-discrete+@starting-style reveal is cosmetically inert cross-browser, and specify the robust visibility+opacity+transform rewrite that keeps zero-JS reachability. Line-reference everything.",
  },
  {
    key: "placement",
    file: CSS,
    ask: "Map Req3a: read submenuPlacementRule + LEVEL_CONTAINER_SELECTORS + dropdownRule(dropdownDirection) + navNestingRules(@707 nested default). Confirm which depths each currently governs, why 'up' is missing, and how to unify into one directional model (right/down/up/left) reaching level 1 AND 2/3+ without breaking the anchored (0,5,0) specificity or the first-dropdown axis. Also map Req3b feasibility: what it takes to make sublists render in-flow (accordion) vs absolute (flyout) purely via CSS on the existing markup.",
  },
  {
    key: "container",
    file: V2,
    ask: "Map Req1: the minWidth/containerPaddingX/Y ranges + how resolveMenuControlDefault computes their hint values (why they read wrong), the real base-sheet defaults (180/6), and where a linkAlign (left|center|right) field + text-align emission should live. Plus the reject-unknown allowlists every new field (linkAlign, submenuDirection/up, submenuMode) must join.",
  },
  {
    key: "editor",
    file: EDITOR,
    ask: "Map Req1/Req3 editor seams: the dropdown-container controls + ControlDefaultHint (507 state), the Level + per-device fork wiring, renderPreviewNavItem + force-open sim. Identify where to add a link-alignment control, a unified submenu-direction control (incl. up), and a submenuMode (flyout|accordion) toggle, and how the canvas preview must visualize direction + accordion + the fixed flyout animation.",
  },
];
const research = await parallel(
  RT.map(
    (t) => () =>
      agent(
        "Read-only RESEARCH for authoring TASK-508 (menu nesting forms + flyout fix). Read the REAL source " +
          t.file +
          " (Read + grep -an; menu files read as BINARY to rg — never trust an empty rg result). " +
          t.ask +
          "\n\nWhat TASK-508 adds:\n" +
          SCOPE +
          "\n\nSeed hints to CONFIRM/CORRECT:\n" +
          SEED +
          "\n\nReturn a dense, line-referenced grounding note an author can build from. Correct any wrong seed anchor explicitly.",
        { label: "research:" + t.key, phase: "Research" }
      )
  )
);
const GROUNDING =
  "FRESH RESEARCH GROUNDING (verified this run — prefer over seed where they differ):\n\n" +
  RT.map(
    (t, i) =>
      "=== " + t.key.toUpperCase() + " (" + t.file + ") ===\n" + (research[i] || "(no output)")
  ).join("\n\n");

phase("Author-parent");
await agent(
  [
    "Author the PARENT board task file " +
      TASKS +
      "/" +
      FILES.parent +
      " for TASK-508 (Menu nesting forms + flyout fix).",
    AGENTS_RULES,
    SCOPE,
    GROUNDING,
    "The parent must contain: Overview (Req1 container defaults+centering; Req2 the flyout-animation BUG [inert display/allow-discrete] + fix; Req3 owner chose BOTH unified directional placement incl. 'up' across all depths AND an accordion inline mode); subtask breakdown for " +
      FILES.subs.map((s) => s.key + " (" + s.file + ")").join("; ") +
      " with LAND ORDER + single-writer (menuDocumentV2=01, menuDocumentCss=02, siteShell=03, MenuDesignEditor=04, closure=05); Acceptance criteria measured LIVE (flyout PERCEPTIBLY animates; 'down everywhere' = one cohesive column; accordion inline block; centered text; correct container default hints); the >=5-scenario smoke mandate; HARD INVARIANTS; Security note. ALSO add TASK-508 parent + 5 child rows to the To Do table in " +
      TASKS +
      "/README.md and bump To Do Statistics by 6 (Read README FRESH first; touch ONLY your rows). Return the parent path + subtask list.",
  ].join("\n\n"),
  { label: "author:parent", phase: "Author-parent" }
);

phase("Author-subtasks");
await parallel(
  FILES.subs.map(
    (s) => () =>
      agent(
        [
          "Author the child task file " +
            TASKS +
            "/" +
            s.file +
            " for " +
            s.key +
            " under TASK-508.",
          AGENTS_RULES,
          SCOPE,
          "YOUR SUBTASK FOCUS: " + s.scope,
          GROUNDING,
          "FIRST read the parent " +
            TASKS +
            "/" +
            FILES.parent +
            " for consistency, then READ THE REAL SOURCE your subtask changes and verify every anchor (Read + grep -an). Write execution-ready pseudocode + Testing Requirements (+ the >=5 smoke scenarios if 508-05). Do NOT edit README or any other task file. Return the file path + a 3-line contract summary.",
        ].join("\n\n"),
        { label: "author:" + s.key, phase: "Author-subtasks" }
      )
  )
);

phase("Audit");
const DRIFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings", "clean"],
  properties: {
    clean: { type: "boolean" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "area", "finding", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["high", "medium", "low"] },
          area: { type: "string" },
          finding: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
};
const targets = [{ key: "parent", file: FILES.parent }, ...FILES.subs];
const MIN_ROUNDS = 5;
const history = [];
const residual = [];
let lastClean = false;

for (let round = 1; round <= 8; round++) {
  const audits = await parallel(
    targets.map(
      (t) => () =>
        agent(
          "Read-only DRIFT AUDIT (round " +
            round +
            ") of TASK-508 " +
            t.key +
            " — file " +
            TASKS +
            "/" +
            t.file +
            ". Verify against the REAL source it cites (every anchor; Read + grep -an), the research grounding below, AGENTS.md, and the scope. Flag: stale/invented anchors; fixes contradicting the grounding; missing execution-ready detail; reject-unknown fail-closed traps (each new key joins its allowlist + round-trip test); byte-identity risks (buildSiteShellCss(null); no-override docs); Req2 — the new reveal MUST be genuinely perceptible (visibility/opacity/transform), not another display-only/allow-discrete inert rule, and MUST keep zero-JS hover/focus-within reachability; Req3a — unified direction must reach level 1 AND level 2/3+ without breaking the anchored (0,5,0) specificity or double-anchoring, and MUST add 'up'; Req3b — accordion must be in-flow (position:static) and NOT break the default flyout mode or reachability; Req1 — default hints must read the REAL base defaults (180/6) and linkAlign must actually center; smoke (508-05) must assert PERCEPTIBLE motion + accordion block, not string presence; anything an implementer would get wrong.\n\n" +
            SCOPE +
            "\n\n" +
            GROUNDING +
            "\n\nReturn findings[] + clean (true iff 0 HIGH/MED for THIS file).",
          { label: "audit:r" + round + ":" + t.key, phase: "Audit", schema: DRIFT_SCHEMA }
        )
    )
  );
  const done = audits.filter(Boolean);
  const perFile = done.flatMap((a, i) =>
    (a.findings || []).map((f) => ({ ...f, target: targets[i].key }))
  );
  const recon = await agent(
    "Cross-subtask RECONCILE audit (round " +
      round +
      ") of the WHOLE TASK-508 family: " +
      targets.map((t) => TASKS + "/" + t.file).join(", ") +
      ". Find ONLY cross-file contradictions on shared values: single-writer ownership (menuDocumentV2=01, menuDocumentCss=02, siteShell=03, MenuDesignEditor=04, closure=05); new field shapes + enum values (linkAlign, submenuDirection/up, submenuMode) IDENTICAL across 01/02/04; the directional selector strings + accordion mechanism identical in 02 vs the 04 preview/force-open; the reveal technique (visibility/opacity) identical in 02 and any 05 golden assertion; helper/field NAMES 04 uses = those 01 defines; the front hook (if any) 03 adds = what 02 selects + 04 mirrors; test-file names in 05 match 01-04; land order + changelog number coherent; per-device representation identical. Return findings[] (naming BOTH files + the value to unify) + clean.",
    { label: "reconcile:r" + round, phase: "Audit", schema: DRIFT_SCHEMA }
  );
  const cross = (recon && recon.findings ? recon.findings : []).map((f) => ({
    ...f,
    target: "cross",
  }));
  const findings = [...perFile, ...cross];
  const highMed = findings.filter((f) => f.severity === "high" || f.severity === "medium");
  const roundOk = done.length === targets.length && !!recon;
  const roundClean = highMed.length === 0 && roundOk;
  history.push({
    round,
    audits: done.length,
    highMed: highMed.length,
    reconcileFindings: cross.length,
  });
  log(
    "Audit round " +
      round +
      ": " +
      highMed.length +
      " HIGH/MED (" +
      cross.length +
      " reconcile; " +
      done.length +
      "/" +
      targets.length +
      " audits)"
  );
  if (roundClean && round >= MIN_ROUNDS) {
    lastClean = true;
    break;
  }
  if (roundClean) {
    lastClean = true;
    continue;
  }
  lastClean = false;
  residual.length = 0;
  residual.push(...highMed);
  const crossHM = highMed.filter((f) => f.target === "cross");
  if (crossHM.length > 0) {
    await agent(
      "Fix these CROSS-SUBTASK contradictions in the TASK-508 family (edit ANY of the task files, surgically; unify per recommendation; keep AGENTS.md format; do NOT touch other task families or README stats):\n" +
        crossHM
          .map(
            (f) =>
              "- [" + f.severity + "] " + f.area + ": " + f.finding + "\n  fix: " + f.recommendation
          )
          .join("\n"),
      { label: "fix-cross:r" + round, phase: "Audit" }
    );
  }
  const byFile = {};
  for (const f of highMed.filter((x) => x.target !== "cross")) {
    (byFile[f.target] ||= []).push(f);
  }
  await parallel(
    Object.entries(byFile).map(([key, fs]) => () => {
      const tf = targets.find((t) => t.key === key);
      return agent(
        "Fix these HIGH/MEDIUM drift findings in the TASK-508 contract file " +
          TASKS +
          "/" +
          tf.file +
          " (CONTRACT WORDING ONLY, surgical; verify against real source + the research grounding first; keep AGENTS.md format; do NOT touch other files).\n" +
          fs
            .map(
              (f) =>
                "- [" +
                f.severity +
                "] " +
                f.area +
                ": " +
                f.finding +
                "\n  fix: " +
                f.recommendation
            )
            .join("\n"),
        { label: "fix:r" + round + ":" + key, phase: "Audit" }
      );
    })
  );
}

return { rounds: history.length, lastClean, history, residualHighMed: lastClean ? [] : residual };
