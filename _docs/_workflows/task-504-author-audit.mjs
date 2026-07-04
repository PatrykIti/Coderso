export const meta = {
  name: "task-504-author-audit",
  description:
    "Author TASK-504 (Menu styling depth: brand block styling + per-nesting-level styling [levels 0/1/2] + sublist chrome + per-link padding/radius + hover-text/current-page, ALL per-device tablet/mobile) per AGENTS.md from the confirmed recon, then >=5 SEQUENTIAL audit rounds with a cross-subtask reconcile pass, to 0 HIGH/MED. Returns findings. No implementation.",
  phases: [{ title: "Author-parent" }, { title: "Author-subtasks" }, { title: "Audit" }],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ROOT + "/_docs/_TASKS";
const RECON =
  "/tmp/claude-1000/-home-coder-project-Coderso/018e2bcd-50fd-4602-9a5a-52f5df82b204/tasks/a7f76d29048556bc6.output";

const SCOPE = [
  'TASK-504 SCOPE — Menu Design deep styling (owner-approved 2026-07-02, tier "Bogaty + per-device"). The FULL grounded design (types, selectors, normalizer/CSS/editor touch-points, byte-identity + reject-unknown notes) is in the recon report: read it via Bash (the last assistant message in the JSONL transcript ' +
    RECON +
    " — grep/tail it). Verify every anchor against source; keep schema-first/minimal-yet-expandable:",
  '1. BRAND BLOCK STYLING — add brand.props.style (sub-object): text mode = fontSize/fontWeight/color/textTransform (+letterSpacing); image mode = height/maxWidth. New normalizeBrandStyle subset (reject-unknown keys, reuse normalizeMenuColorValue + clamps + the fontWeight/textTransform enums; ADD explicit clamp ranges for fontSize/letterSpacing/height/maxWidth — do NOT reuse fontSize 10..32 blindly). Add "style" to BRAND_PROP_KEYS (fail-closed read trap — needs a round-trip test). CSS: a new collectMenuBrandRules scoped [data-site-menu-doc] [data-menu-block-id="<esc>"] (+ ...img{} for image mode) folded into base; absent style = zero bytes. Panel controls gated by brand.props.mode, reusing ColorSwatch/Slider/Segmented. PER-DEVICE (this tier): brand style also overridable on tablet + mobile.',
  '2. PER-NESTING-LEVEL STYLING (the core owner ask) — NavItemsProps.levelStyles?: { 1?: NavLevelStyle; 2?: NavLevelStyle } (level 0 = the EXISTING nav-items base, no new type — do not duplicate). NavLevelStyle = link {linkColor/linkHoverColor/linkActiveColor/fontSize/fontWeight/gap/paddingX/paddingY} + submenu CONTAINER (levels >=1) {background/borderColor/borderWidth/radius/shadow/minWidth}. Cap at levels 0/1/2+ (2 = "2 and deeper" via descendant selector). Inheritance is pure CSS cascade/source-order (emit 0 then 1 then 2, each only its own overrides — no runtime merge). Normalizer normalizeNavLevelStyles handled OUTSIDE normalizeAppearanceSubset (widen the nav-items block key set with "levelStyles"; reject-unknown level keys ["1","2"] + per-key allowlist; sparse+prune → byte-stable). CSS: navLevelRules with the EXACT depth selectors from the recon (level 0 = .site-nav-list > .site-nav-item > .site-nav-link; level 1 = ...> .site-nav-sublist > li > .site-nav-link + the container .site-nav-sublist; level 2+ = .site-nav-sublist .site-nav-sublist ...), folded into desktopShared (>=640, front+canvas). PER-DEVICE (this tier): level styles overridable on tablet+mobile via the responsive.navProps delta channel (extend collectDeltaRules for the levelStyles sub-record).',
  "3. SUBLIST CHROME (folds out of #2 container fields, but call it out): the dropdown container background/border/shadow/radius/min-width becomes author-controllable per level (today 100% hardcoded in siteShellCss.ts — must be OVERRIDDEN from the doc-scoped sheet only; base sheet byte-identity inviolable).",
  '4. CHEAP WINS bundled: (a) per-link paddingX/paddingY + radius on NavItemsProps (new MENU_RULE_GROUP; today hardcoded padding:8px 12px;border-radius:6px) — per-device via the existing delta machinery; (b) hover TEXT color (linkHoverColor is currently background-only — add a hover text color control/emission) + a current-page rule via :where([aria-current="page"]) — needs the FRONT to stamp aria-current on the active nav link (small siteShell change).',
  '5. EDITOR UX — brand style controls (mode-gated); a "Level" SegmentedControl (Level 0 / Level 1 / Level 2) at the top of the nav-items panel that rebinds the SAME control set to the selected level record (level 0 writes the existing nav base; 1/2 write levelStyles), with a Base/Override/Inherited badge ("inherits level N-1"); per-device device-forked writes for BOTH brand and levels + the Reset-per-breakpoint badge (mirror the 501/502 MenuResponsiveControlShell). CANVAS PREVIEW of the styled level: sublists are display:none until hover — when a level >=1 is selected, buildMenuDocumentPreviewCss emits a doc-scoped FORCE-OPEN rule for that depth (mirror the proven previewMobileOpen sim-open technique) so the author sees what they style.',
  "HARD INVARIANTS: schema-first + reject-unknown (every new key in BRAND_PROP_KEYS / the nav block key set is a fail-closed READ trap — a forgotten key degrades every saved doc carrying it → each addition needs a round-trip test); buildSiteShellCss(null) byte-identical (tests/unit/pages/siteShellCss.test.ts ZERO edits) + no-override docs byte-identical (tests/unit/site/menu-document-render.test.tsx); ALL new CSS doc-scoped via the ONE shared buildMenuRuleSetsForDocument (front @media + canvas flatten never diverge); the tablet cascade = tablet+mobile each inherit DESKTOP (Pages cascade, per 502). NO route/RBAC/endpoint/migration; NO menuDocumentV2 schemaVersion bump. Deferred (state in changelog residuals): levels 3+ independent, custom font-family/line-height, active-item indicator pill, mobile-drawer styling (drawer not rendered yet).",
].join("\n");

const AGENTS_RULES =
  'AGENTS.md task-authoring rules: board file TASK-504_...md (underscores); children TASK-504-NN-...md (hyphens); H1 = task ID; "# FileName:" matches; **Parent Task:** TASK-504; canonical **Status:** ⏳ To Do; execution-ready pseudocode (exact type shapes, normalizer/CSS-rule/selector shapes, clamp ranges, editor control wiring, data flow, error handling, regression-test shape); Security Contract note = "UI/client-state + schema-first document contract extension; no new route/RBAC/endpoint/migration"; Testing Requirements per _docs/TESTING_STRATEGY.md (Vitest Bun-free + the bun menu suites) AND a SMOKE section per the owner mandate: >=5 DISTINCT real-flow scenarios for the menu-design area (brand text+image style visible-effect; style level 0/1/2 independently + verify each on the front at the RIGHT depth via hover + the canvas force-open; per-device brand/level override + reset across desktop/tablet/mobile; sublist chrome; hover-text/current-page + link padding) — assert VISIBLE EFFECT (computed styles/geometry), not control presence. Schema-first, reject-unknown, byte-identity guards named explicitly. Sections/blocks key lists extended consciously (fail-closed read trap).';

const FILES = {
  parent: "TASK-504_Menu_Styling_Depth_Brand_And_Per_Level.md",
  subs: [
    {
      key: "504-01",
      file: "TASK-504-01-Menu-Model-Brand-Style-And-Level-Styles.md",
      scope:
        "MODEL keystone: BrandStyle + normalizeBrandStyle + BRAND_PROP_KEYS; NavLevelStyle + levelStyles on NavItemsProps + normalizeNavLevelStyles (outside normalizeAppearanceSubset) + nav-block key widening; new clamp ranges; PER-DEVICE — extend MenuBlockOverride to carry brand style (tablet+mobile) AND carry a levelStyles delta in responsive.navProps (tablet+mobile); resolve/patch/clear helpers device-generalized; byte-stable + reject-unknown + fail-closed key-list extensions. Owns core/services/menus/menuDocumentV2.ts (+ normalizeMenuAppearance.ts if a new enum/range belongs there).",
    },
    {
      key: "504-02",
      file: "TASK-504-02-Menu-CSS-Brand-Level-And-Cheap-Wins.md",
      scope:
        "CSS: collectMenuBrandRules (+ image img{}); navLevelRules with the exact depth selectors + submenu container chrome; per-link padding/radius rule group; hover-text + current-page (:where([aria-current=page])); per-device (tablet+mobile) emission of brand + level deltas through buildMenuRuleSetsForDocument; canvas force-open-selected-level in buildMenuDocumentPreviewCss. Byte-identity: buildSiteShellCss(null) untouched, no-override docs byte-identical, all doc-scoped. Owns core/site/menuDocumentCss.ts.",
    },
    {
      key: "504-03",
      file: "TASK-504-03-Front-Aria-Current-Stamp.md",
      scope:
        'FRONT: stamp aria-current="page" on the active top-level/nested nav link in SiteHeaderMenuDocumentRender (for the current-page style rule); confirm brand data-menu-block-id stamp already exists (502); NO other markup/class change (buildSiteShellCss stays untouched). Owns core/site/siteShell.tsx (sole writer).',
    },
    {
      key: "504-04",
      file: "TASK-504-04-Design-Editor-Brand-And-Level-Controls.md",
      scope:
        "EDITOR: brand style controls (mode-gated); Level SegmentedControl (0/1/2) rebinding the control set to the selected level record; submenu container controls for levels >=1; per-link padding/radius + hover-text controls; per-device device-forked writes for brand+levels + MenuResponsiveControlShell badge/Reset per breakpoint; thread the selected level into MenuDocumentCanvas -> buildMenuDocumentPreviewCss force-open. Owns core/admin/ui/menus/MenuDesignEditor.tsx (+ MenuAppearancePanel.tsx if mounted).",
    },
    {
      key: "504-05",
      file: "TASK-504-05-Menu-Styling-Tests-Docs-Closure.md",
      scope:
        "Full regression matrix (brand+level round-trips incl. per-device + reject-unknown + fail-closed; CSS depth-selector emission + brand rules + cheap-wins + force-open + byte-identity golden; front aria-current; editor brand/level/device controls) + the MANDATED >=5-scenario smoke definition + docs (CONTENT? menu styling contract) + changelog (next free; verify) + README/board/Statistics closure.",
    },
  ],
};

phase("Author-parent");
await agent(
  [
    "Author the PARENT board task file " +
      TASKS +
      "/" +
      FILES.parent +
      " for TASK-504 (Menu Styling Depth).",
    AGENTS_RULES,
    SCOPE,
    "FIRST read the recon report (" +
      RECON +
      ", the final long assistant message) — it has the full contract shapes + exact CSS selectors + touch-points. Verify the load-bearing anchors against source.",
    'The parent must contain: Overview (the gap: brand unstyleable + no per-level styling + hardcoded sublist chrome; the "Bogaty + per-device" tier), subtask breakdown for: ' +
      FILES.subs.map((s) => s.key + " (" + s.file + ")").join("; ") +
      " with land order (504-01 model -> 504-02 CSS -> 504-03 front -> 504-04 editor -> 504-05 closure; single-writer: menuDocumentV2=01, menuDocumentCss=02, siteShell=03, MenuDesignEditor=04), Acceptance criteria (per feature, measured LIVE incl. styling each level and verifying at the right hover depth on the front + the canvas force-open), the >=5-scenario smoke mandate, Security note. ALSO add TASK-504 parent + 5 child rows to the To Do table in " +
      TASKS +
      "/README.md and bump To Do Statistics by 6 (Read README FRESH first; touch ONLY your rows). Return the file path + subtask list.",
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
            " under TASK-504.",
          AGENTS_RULES,
          SCOPE,
          "YOUR SUBTASK FOCUS: " + s.scope,
          "FIRST read the recon report (" +
            RECON +
            ", final assistant message) for your scope AND the parent " +
            TASKS +
            "/" +
            FILES.parent +
            ". Then READ THE REAL SOURCE files your subtask changes and verify every anchor (Read + grep -an; the big menu files read as binary to rg). Write execution-ready pseudocode + Testing Requirements (+ the smoke scenarios if 504-05). Do NOT edit README or any other task file. Return the file path + a 3-line contract summary.",
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
          "Read-only drift audit (round " +
            round +
            ") of TASK-504 " +
            t.key +
            " — file " +
            TASKS +
            "/" +
            t.file +
            ". Verify against: the REAL source it cites (every anchor; Read + grep -an), the recon evidence (" +
            RECON +
            "), AGENTS.md rules, and the scope below. Flag: stale/invented anchors; fixes contradicting the recon; missing execution-ready detail; the fail-closed key-list traps (BRAND_PROP_KEYS / nav block keys); byte-identity risks (buildSiteShellCss(null); no-override docs); depth SELECTORS wrong or not matching the recursive 502 markup; per-device delta machinery not actually extended for level styles / brand; canvas force-open not wired; inheritance done via runtime-merge instead of CSS cascade; smoke missing the >=5 visible-effect scenarios (esp. styling each level + verifying at the right front hover depth); anything an implementer would get wrong.\n\n" +
            SCOPE +
            "\n\nReturn findings[] + clean (true iff 0 HIGH/MED for this file).",
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
      ") of the WHOLE TASK-504 family: " +
      targets.map((t) => TASKS + "/" + t.file).join(", ") +
      ". Find ONLY cross-file contradictions on shared values: single-writer ownership (menuDocumentV2=01, menuDocumentCss=02, siteShell=03, MenuDesignEditor=04); the BrandStyle + NavLevelStyle shapes + clamp ranges IDENTICAL across 01/02/04; the depth-selector strings identical in 02 vs 04-force-open; the per-device (tablet+mobile) representation identical everywhere; helper names 04 uses = the ones 01 defines; aria-current selector in 02 matches the 03 stamp; test-file names in 05 match 01-04 promises; land order coherent. Return findings[] (naming BOTH files + the value to unify) + clean.",
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
      "Fix these CROSS-SUBTASK contradictions in the TASK-504 family (edit ANY of the six task files, surgically; unify per recommendation; keep AGENTS.md format; do NOT touch other task families or README stats):\n" +
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
        "Fix these HIGH/MEDIUM drift findings in the TASK-504 contract file " +
          TASKS +
          "/" +
          tf.file +
          " (CONTRACT WORDING ONLY, surgical; verify against real source + the recon first; keep AGENTS.md format; do NOT touch other files).\n" +
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
