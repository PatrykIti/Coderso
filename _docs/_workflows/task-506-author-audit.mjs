export const meta = {
  name: "task-506-author-audit",
  description:
    "Author TASK-506 (Menu Design modern styling: base-record reset-to-default + visible default/inherited value on EVERY control + 5 owner-approved bundles: item separators, hover/active underline indicator, caret toggle + flyout animation, pill-nav + dropdown padding, configurable nested submenu placement right/bottom/left) per AGENTS.md. Fresh-context RESEARCH phase grounds the anchors, authors write parent+5 children, then >=5 SEQUENTIAL drift-audit rounds with cross-subtask reconcile to 0 HIGH/MED. Returns findings. No implementation.",
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

// ---------------------------------------------------------------------------
// SEED ANCHORS (owner+orchestrator recon 2026-07-03 — treat as HINTS to VERIFY
// FRESH against source; do NOT trust blindly, re-grep every line reference).
// ---------------------------------------------------------------------------
const SEED = [
  "SEED ANCHORS to verify fresh (grep -an / Read; the big menu files read as BINARY to rg):",
  "- Model " +
    V2 +
    ": NavLevelStyle @~163; NavItemsProps=Pick<MenuAppearance,...>&{...} @~140; NavLevelStyleLevel=1|2 @~186; NAV_LEVEL_NUMBER_RANGES @~594 (paddingX 0..40, paddingY 0..32, fontSize, gap, borderWidth, radius, minWidth); BRAND_STYLE_NUMBER_RANGES @~587; MENU_NAV_DEVICE_DEFINING_KEYS includes dropdownDirection @~205; NAV_LEVEL_STYLE_KEYS @~565; patchMenuNavLevelStyleForDevice @~1631 (desktop branch writes props.levelStyles, tablet/mobile write responsive[bp].navProps.levelStyles); clearMenuNavLevelStyleOverride @~1670, clearMenuBrandStyleOverride @~1538, clearMenuSectionOverride @~1343 — ALL THREE are RESPONSIVE-ONLY (breakpoint tablet/mobile); NONE clear the DESKTOP BASE value (this is the gap for the base-reset foundation).",
  "- CSS " +
    CSS +
    ": buildMenuRuleSetsForDocument @~740; navLevelRules @~571 split into levelLinkDecls @~509 (all-width) + levelContainerDecls @~535 (>=640-only); desktopShared folds dropdownRule + navNestingRules + navLevelRules @~764; navNestingRules @~698 — nested flyout is HARDCODED `.site-nav-sublist .site-nav-sublist{left:100%; top/bottom via dropdownDirection}` @~707 (this is the flyout-placement gap: always RIGHT); caret is ALREADY emitted (CSS ::after `content:\\25BE`) on li[data-site-nav-group=true]>.site-nav-link @~712 (so caret bundle = make it TOGGLEABLE/rotate, not add-from-scratch); collectMenuDividerRules @~ exists but is for the standalone `divider` BLOCK (header rule between brand/nav), NOT per-nav-item separators (item separators are NEW); dropdownDirection top|bottom already exists for the FIRST dropdown; menuDocScope=[data-site-menu-doc=true]; buildMenuDocumentCss (front @media) + buildMenuDocumentPreviewCss (canvas flatten) BOTH consume the ONE shared builder.",
  "- Base sheet " +
    SHELLCSS +
    ": .site-nav-sublist base (min-width:180px, padding:6px) @~151; nested position @~157 (left:0; top/bottom:100%). buildSiteShellCss(null) MUST stay byte-identical (tests/unit/pages/siteShellCss.test.ts ZERO edits) — all new visuals OVERRIDE from the doc-scoped sheet only.",
  "- Editor " +
    EDITOR +
    ": MenuResponsiveControlShell @~450 shows the Reset button ONLY when state===\"override\" (i.e. tablet/mobile with a real override) — on the BASE/desktop record there is NO reset affordance (foundation gap #1); NavLevelControls @~1285 (levelControl/swatch/slider helpers; resetLevel @~1312 is responsive-only); SliderControl value uses `?? NAV_LEVEL_NUMBER_RANGES[key].min` so an UNSET slider shows .min (misleading 0) with NO resolved-default hint (foundation gap #2); the ONLY existing default hint is B2 nav fontSize 'Inherited from theme (16px)' @~1646 (NAV_FONT_SIZE_INHERITED) — this is the pattern to GENERALIZE to every numeric/enum/color control; per-level control list @~1351-1408 (linkColor/linkHoverColor/linkHoverTextColor/linkActiveColor/fontSize/fontWeight/gap/paddingX/paddingY + Dropdown container background/borderColor/borderWidth/radius/shadow/minWidth).",
  "- Front " +
    SHELL +
    ": renderPreviewNavItem lives in the EDITOR file (canvas preview mirror), NOT here; siteShell renders the real front nav (li.site-nav-item[data-site-nav-group] + a.site-nav-link / span.site-nav-group-label + ul.site-nav-sublist) and stamps aria-current (504-03) + brand data-menu-block-id. Determine during research whether ANY front markup/class/aria change is required (most bundles are pure CSS ::after / border / positioning) — if none, 506-03 asserts no-change + buildSiteShellCss byte-identity.",
].join("\n");

// ---------------------------------------------------------------------------
// CONFIRMED SCOPE (owner-approved 2026-07-03). Foundation is ALWAYS in; the 5
// bundles were all selected by the owner (multi-select) plus the 5th (nested
// submenu placement) added verbatim. Every bundle is PER-LEVEL and PER-DEVICE.
// ---------------------------------------------------------------------------
const SCOPE = [
  "TASK-506 SCOPE — Menu Design modern styling depth (owner-approved 2026-07-03). Same architecture family as TASK-504/505 (menuDocumentV2 doc contract + doc-scoped CSS via the ONE shared buildMenuRuleSetsForDocument + MenuDesignEditor controls). Schema-first, reject-unknown, byte-identity, present-only emission, per-device Pages cascade (tablet+mobile each inherit DESKTOP, never each other). NO schemaVersion bump, NO route/RBAC/endpoint/migration. Keep minimal-yet-expandable.",
  "",
  "FOUNDATION (ALWAYS IN — the two confirmed UX gaps the owner reported):",
  "F1 BASE-RECORD RESET-TO-DEFAULT — today every clear helper (clearMenuNavLevelStyleOverride/clearMenuBrandStyleOverride/clearMenuSectionOverride) is RESPONSIVE-ONLY and MenuResponsiveControlShell only shows Reset when state==='override'; so a value authored on the DESKTOP BASE (e.g. link paddingX) can NEVER be cleared back to the CSS/theme default (owner wants the 'auto'/centered default back). ADD base-clear helpers (e.g. clearMenuNavLevelStyleBase / clearMenuBrandStyleBase / clearMenuNavPropBase — or a single generic base-prune) that DELETE the field from props (prune empty objects → byte-stable legacy shape), and extend the editor so EVERY control shows a Reset/'Reset to default' affordance whenever its OWN record (base OR device) carries an explicit value. Base reset must land the doc back to the exact no-override byte-identical shape.",
  "F2 VISIBLE DEFAULT / INHERITED VALUE — today an unset numeric slider shows range.min (misleading 0) and there is no indication of the effective default (only nav fontSize has 'Inherited from theme (16px)'). GENERALIZE that hint to EVERY numeric/enum/color control: when a field is UNSET, surface the RESOLVED effective value + its SOURCE ('Default 8px', 'Inherits level 0 (14px)', 'Inherited from theme (16px)', 'Inherited from desktop'). Provide a single resolved-default provider in the model (returns {value, sourceLabel}) so the editor never hardcodes defaults. Level 1/2 unset ⇒ 'inherits level 0'; level 0 unset ⇒ theme/base-sheet default; tablet/mobile unset ⇒ 'inherits desktop'.",
  "",
  "5 MODERN BUNDLES (all owner-selected; PER-LEVEL 0/1/2 + PER-DEVICE tablet/mobile via the existing responsive.navProps delta machinery):",
  "B1 ITEM SEPARATORS / DIVIDERS (NEW; NOT the standalone divider block) — a visual rule BETWEEN nav items: top-level (level 0) horizontal-bar row ⇒ VERTICAL divider between items (border-inline-end / ::after on li:not(:last-child)); dropdown (levels >=1, vertical stack) ⇒ HORIZONTAL divider between items (border-block-end). Fields on NavLevelStyle + nav base: itemDivider show(bool) / color(token-backed, reuse menu color normalizer) / width(clamp 1..8) / style(enum solid|dashed|dotted). Absent ⇒ zero bytes. Orientation-aware emission (vertical for the horizontal top bar, horizontal for vertical dropdowns) — respect the existing orientation/dropdownDirection.",
  "B2 HOVER/ACTIVE UNDERLINE INDICATOR (NEW) — a modern animated indicator bar distinct from the existing hover-background 'pill': indicator(enum none|underline|overline) / indicatorColor / indicatorThickness(1..6) / indicatorGrow(bool, animate width on hover via transform scaleX or width transition) rendered as a ::after bar on the link, shown on :hover and on [aria-current=page]; PLUS hoverUnderline(bool text-decoration on hover); PLUS a smooth transitionMs(0..400, applied to color/background/transform) and an optional hoverLift(0..8, translateY up on hover). Per level + per device.",
  "B3 CARET TOGGLE + FLYOUT ANIMATION — caret ::after already exists on group parents; make it CONTROLLABLE: showCaret(bool, per level parents) + caretRotateOnOpen(bool, rotate 180deg on hover/focus-within). PLUS flyoutAnimation(enum none|fade|slide) — animate the sublist open (opacity/transform transition on the display:none->grid reveal; note pure display cannot transition, so use visibility+opacity+transform pattern that keeps the zero-JS hover/focus-within open intact and NEVER breaks reachability). Per level + per device.",
  "B4 PILL NAV + DROPDOWN PADDING — nav-base (level 0) wrapper 'pill': navPillBackground / navPillRadius / navPillPaddingX / navPillPaddingY applied to .site-nav-list (floating segmented-nav look); PLUS dropdown INNER padding for levels >=1: containerPaddingX / containerPaddingY on the .site-nav-sublist container (distinct from per-LINK paddingX/Y). Absent ⇒ zero bytes.",
  "B5 NESTED SUBMENU PLACEMENT (NEW; owner: 'level 2 currently always flies out to the RIGHT, I may want it BELOW') — make the nested flyout direction author-controllable per level >=1: submenuPlacement(enum right|bottom|left) mapping to the nested `.site-nav-sublist .site-nav-sublist` positioning (right=left:100%;top:0 [current default]; bottom=left:0;top:100% [under the parent]; left=right:100%;top:0). Keep the EXISTING first-dropdown dropdownDirection(top|bottom) working; this adds the horizontal/vertical placement axis for NESTED levels. Must not break the anchored (0,5,0) level-2 selector specificity from 504.",
  "",
  "HARD INVARIANTS: every new key added to a reject-unknown allowlist (BRAND_PROP_KEYS / NAV_ITEMS_PROP_KEYS / NAV_LEVEL_STYLE_KEYS / MENU_SECTION_KEYS / block key sets) is a FAIL-CLOSED READ TRAP — a forgotten key silently degrades EVERY stored doc carrying it to empty on read ⇒ each addition needs a round-trip persistence test. buildSiteShellCss(null) byte-identical (tests/unit/pages/siteShellCss.test.ts ZERO edits); no-override docs byte-identical (tests/unit/site/menu-document-render.test.tsx). ALL new CSS doc-scoped under [data-site-menu-doc=true] via the ONE shared buildMenuRuleSetsForDocument so front @media + canvas flatten NEVER diverge. Present-only emission: a new field carries NO resolution default ⇒ emits nothing unless authored. Per-device = tablet+mobile each inherit DESKTOP. Canvas preview must FORCE-OPEN the selected level (existing sim-open) so authors SEE separators/indicator/placement/animation while styling. NO menuDocumentV2 schemaVersion bump. Deferred (state in changelog residuals): levels 3+ independent styling; custom font-family/line-height; icon/badge per item; mobile-drawer styling (drawer not rendered yet); JS-driven flyout collision/edge-flip.",
].join("\n");

const AGENTS_RULES =
  "AGENTS.md task-authoring rules: board file TASK-506_...md (underscores); children TASK-506-NN-...md (hyphens); H1 = task ID; '# FileName:' matches the actual filename; **Parent Task:** TASK-506 (children) / parent has the subtask table; canonical **Status:** one of ⏳ To Do / 🚧 In Progress / ✅ Done / ⏭️ Superseded / ❌ Cancelled (use ⏳ To Do); execution-ready pseudocode (exact type shapes, clamp ranges, normalizer + reject-unknown key-list edits, CSS rule + EXACT depth/placement selector strings, editor control wiring + reset/default-hint data flow, error handling, regression-test shape) so an implementer executes WITHOUT rediscovering the strategy; Security Contract note = 'UI/client-state + schema-first document-contract extension; no new route/RBAC/endpoint/migration'; Testing Requirements per _docs/TESTING_STRATEGY.md (Vitest Bun-free for pure model/CSS/UI + the bun menu suites where runtime) AND (in 506-05) a SMOKE section per the owner mandate: >=5 DISTINCT real-flow scenarios asserting VISIBLE EFFECT (computed styles/geometry), not control presence. Name byte-identity + reject-unknown guards explicitly. Implement-order/single-writer must be explicit.";

const FILES = {
  parent: "TASK-506_Menu_Modern_Styling_Reset_Defaults_And_Bundles.md",
  subs: [
    {
      key: "506-01",
      file: "TASK-506-01-Menu-Model-Reset-Defaults-And-Modern-Fields.md",
      scope:
        "MODEL keystone (owns core/services/menus/menuDocumentV2.ts). (a) FOUNDATION: base-clear helpers that DELETE a field from the DESKTOP-base record (brand style / nav base props / levelStyles) with empty-object prune to byte-stable legacy shape — mirror of the responsive clear helpers; a resolved-default PROVIDER returning {value, sourceLabel} for any control key at any level/device (level 1/2 unset⇒inherits level 0; level 0 unset⇒theme/base default; tablet/mobile unset⇒inherits desktop). (b) NEW FIELDS on NavLevelStyle + nav base: B1 itemDivider{show,color,width 1..8,style solid|dashed|dotted}; B2 indicator none|underline|overline + indicatorColor + indicatorThickness 1..6 + indicatorGrow + hoverUnderline + transitionMs 0..400 + hoverLift 0..8; B3 showCaret + caretRotateOnOpen + flyoutAnimation none|fade|slide; B4 navPill{background,radius,paddingX,paddingY}(base only) + containerPaddingX/Y(levels>=1); B5 submenuPlacement right|bottom|left(levels>=1). New clamp ranges + enums; extend normalizers (normalizeNavLevelStyles + nav base subset) with reject-unknown; extend EVERY fail-closed allowlist (NAV_LEVEL_STYLE_KEYS / NAV_ITEMS_PROP_KEYS / BRAND_PROP_KEYS as needed) — each new key needs a round-trip test. Device-generalize patch/resolve. NO schemaVersion bump.",
    },
    {
      key: "506-02",
      file: "TASK-506-02-Menu-CSS-Separators-Indicator-Placement-Pill.md",
      scope:
        "CSS (owns core/site/menuDocumentCss.ts). Emit doc-scoped rules for every new field through buildMenuRuleSetsForDocument (front @media + canvas flatten): B1 item separators (orientation-aware: vertical border/::after between top-bar items, horizontal between dropdown items, :not(:last-child)); B2 underline/overline ::after indicator bar on :hover + [aria-current=page] + indicatorGrow transform + hoverUnderline + transitionMs + hoverLift translateY; B3 showCaret toggle (hide the existing ::after when off) + caretRotateOnOpen (rotate on hover/focus-within) + flyoutAnimation (visibility+opacity+transform reveal that PRESERVES zero-JS hover/focus-within open + reachability); B4 pill on .site-nav-list + container inner padding on .site-nav-sublist (levels>=1); B5 nested placement right|bottom|left rewriting the .site-nav-sublist .site-nav-sublist positioning WITHOUT losing the anchored (0,5,0) level-2 specificity. Per-device deltas via the existing tablet/mobile channels. Byte-identity: buildSiteShellCss(null) untouched, no-override docs byte-identical, present-only zero-bytes. Canvas force-open the selected level so authors see the effect.",
    },
    {
      key: "506-03",
      file: "TASK-506-03-Front-And-Preview-Parity.md",
      scope:
        "FRONT (owns core/site/siteShell.tsx). Determine (from research) whether ANY front markup/class/aria change is needed for the bundles — most are pure CSS (::after caret/indicator, border separators, positioning, visibility animation). If a hook is needed (e.g. a class or data attribute for the pill wrapper or caret target), add it MINIMALLY and keep buildSiteShellCss(null) byte-identical. If NOTHING is needed, this subtask formally ASSERTS no front markup change + documents that the front already carries the required structure (li[data-site-nav-group], aria-current from 504-03) and adds the front-side regression assertions. Also enumerate the canvas-preview parity requirement handed to 506-04 (renderPreviewNavItem must mirror any new structural hook).",
    },
    {
      key: "506-04",
      file: "TASK-506-04-Design-Editor-Reset-Defaults-And-Modern-Controls.md",
      scope:
        "EDITOR (owns core/admin/ui/menus/MenuDesignEditor.tsx + MenuEditorPage.tsx if needed). FOUNDATION: extend MenuResponsiveControlShell (or its wrappers) so the Reset affordance shows whenever the control's OWN record carries an explicit value — on BASE too (wire the new base-clear helpers), label 'Reset to default' on base vs 'Reset override' on device; add a default/inherited VALUE hint under EVERY numeric/enum/color control from the model resolved-default provider (generalize the B2 'Inherited from theme (16px)' pattern; unset slider must show the resolved default not range.min). NEW CONTROLS for all 5 bundles bound per selected Level + per device: B1 separators (show/color/width/style), B2 indicator(seg)+color+thickness+grow+hoverUnderline+transition+lift, B3 showCaret+rotate+flyoutAnimation(seg), B4 pill(bg/radius/padding, level-0 only)+dropdown inner padding(levels>=1), B5 submenuPlacement segmented(right/bottom/left, levels>=1). Preview mirror (renderPreviewNavItem) updated for any new structural hook; keep the force-open-selected-level canvas sim. All controls reuse existing primitives (Slider/Segmented/ColorSwatch) + the level+device badges.",
    },
    {
      key: "506-05",
      file: "TASK-506-05-Menu-Modern-Styling-Tests-Docs-Closure.md",
      scope:
        "CLOSURE. Full regression matrix: base-clear round-trips (base reset lands byte-identical no-override shape) + resolved-default provider unit table + reject-unknown/fail-closed round-trips for EVERY new key + CSS emission goldens for each bundle (separators orientation-aware, indicator ::after, caret toggle/rotate, flyout animation reachability, pill+padding, submenu placement right/bottom/left) + byte-identity guards named + front/preview parity + editor reset-on-base + default-hint display. The MANDATED >=5-scenario SMOKE (visible-effect): (1) author separators on level 0 + level 1 and measure the divider on front top-bar (vertical) AND in the dropdown (horizontal); (2) underline indicator + hover-lift + transition measured on hover and aria-current; (3) base RESET restores the default (padding back to base value) + default-value hint shows the effective inherited number before/after; (4) submenu placement flip right->bottom->left measured by nested sublist geometry on front; (5) caret toggle off + flyoutAnimation + pill nav measured; (6) per-device override + reset of a new field across desktop/tablet/mobile. Docs (menu styling contract doc if one exists) + changelog (VERIFY next free number fresh) + README To Do->Done move + Statistics sync. Owns no source; edits _docs + README.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Phase 0 — RESEARCH (fresh context grounds the anchors the authors consume).
// ---------------------------------------------------------------------------
phase("Research");
const RESEARCH_TARGETS = [
  {
    key: "model",
    file: V2,
    ask: "Map the MODEL contract for TASK-506. Report with EXACT line numbers: NavLevelStyle + NavItemsProps + NavLevelStyleLevel shapes; every reject-unknown allowlist a new field must join (NAV_LEVEL_STYLE_KEYS, NAV_ITEMS_PROP_KEYS, BRAND_PROP_KEYS, MENU_SECTION_KEYS); the clamp-range tables + how ranges are declared; the normalizer chain (normalizeNavLevelStyles + the nav base subset + brand) and where reject-unknown happens; the patch/resolve/clear helper family — CONFIRM which clear helpers are responsive-only and the desktop-base write path (so we know exactly what a base-clear helper must delete + prune). Note any present-only emission pattern to mirror.",
  },
  {
    key: "css",
    file: CSS,
    ask: "Map the CSS contract for TASK-506. Report with EXACT line numbers: buildMenuRuleSetsForDocument + the base/desktopShared/tablet/mobile assembly; navLevelRules + levelLinkDecls + levelContainerDecls (which width bucket each lands in); navNestingRules incl. the HARDCODED nested flyout positioning (the left:100% line) + the existing caret ::after + dropdownDirection top/bottom; the EXACT per-level depth selector strings incl. the anchored (0,5,0) level-2 form; how the standalone divider BLOCK rules differ from what item-separators need; the menuDocScope constant; how buildMenuDocumentCss vs buildMenuDocumentPreviewCss both consume the shared builder + the canvas force-open sim. Confirm the base-sheet byte-identity boundary (siteShellCss.ts).",
  },
  {
    key: "editor",
    file: EDITOR,
    ask: "Map the EDITOR contract for TASK-506. Report with EXACT line numbers: MenuResponsiveControlShell (WHEN the Reset button renders — confirm override-only, no base reset); NavLevelControls + its levelControl/swatch/slider helpers + resetLevel (responsive-only?); how an unset slider currently displays (the ?? range.min) and the ONE existing default hint (NAV_FONT_SIZE_INHERITED 'Inherited from theme'); the full current per-level control list; the brand + nav-base control blocks; the Level SegmentedControl + device fork wiring; renderPreviewNavItem (preview mirror) + the force-open sim. Identify the minimal seams to add (a) a base-reset affordance and (b) a resolved-default hint under EVERY control.",
  },
  {
    key: "front",
    file: SHELL,
    ask: "Map the FRONT contract for TASK-506. Report with EXACT line numbers: the real nav markup SiteHeaderMenuDocumentRender emits (li.site-nav-item[data-site-nav-group], a.site-nav-link vs span.site-nav-group-label, ul.site-nav-sublist), the aria-current stamp (504-03), the brand data-menu-block-id stamp. Judge whether ANY new front markup/class/aria hook is required for: item separators, underline indicator, caret toggle, flyout animation, pill wrapper, nested placement — or whether ALL are achievable pure-CSS on existing structure. State the byte-identity boundary for buildSiteShellCss.",
  },
];
const research = await parallel(
  RESEARCH_TARGETS.map(
    (t) => () =>
      agent(
        "Read-only RESEARCH for authoring TASK-506 (menu modern styling). Read the REAL source " +
          t.file +
          " (use Read + grep -an; these menu files read as BINARY to rg so NEVER trust an empty rg result). " +
          t.ask +
          "\n\nContext of what TASK-506 will add:\n" +
          SCOPE +
          "\n\nSeed hints to CONFIRM or CORRECT (do not trust blindly):\n" +
          SEED +
          "\n\nReturn a dense, line-referenced grounding note (plain text) an author can build from. Correct any wrong seed anchor explicitly.",
        { label: "research:" + t.key, phase: "Research" }
      )
  )
);
const GROUNDING =
  "FRESH RESEARCH GROUNDING (verified against source this run — prefer this over seed hints where they differ):\n\n" +
  RESEARCH_TARGETS.map(
    (t, i) =>
      "=== " + t.key.toUpperCase() + " (" + t.file + ") ===\n" + (research[i] || "(no output)")
  ).join("\n\n");

// ---------------------------------------------------------------------------
// Phase 1 — AUTHOR PARENT.
// ---------------------------------------------------------------------------
phase("Author-parent");
await agent(
  [
    "Author the PARENT board task file " +
      TASKS +
      "/" +
      FILES.parent +
      " for TASK-506 (Menu Design modern styling).",
    AGENTS_RULES,
    SCOPE,
    GROUNDING,
    "The parent must contain: Overview (the two owner-reported UX gaps [no base reset-to-default; no visible default/inherited value] + the 5 owner-approved modern bundles incl. configurable nested submenu placement); the subtask breakdown for " +
      FILES.subs.map((s) => s.key + " (" + s.file + ")").join("; ") +
      " with LAND ORDER + single-writer ownership (menuDocumentV2=01, menuDocumentCss=02, siteShell=03, MenuDesignEditor=04, docs/closure=05); Acceptance criteria per feature measured LIVE (style each level, verify at the right hover depth on the front + canvas force-open; base reset restores default; default hint shows the effective number); the >=5-scenario smoke mandate; the HARD INVARIANTS; Security note (no route/RBAC/migration). ALSO add the TASK-506 parent + 5 child rows to the To Do table in " +
      TASKS +
      "/README.md and bump To Do Statistics by 6 (Read README FRESH first; touch ONLY your own rows/counts). Return the parent path + the subtask list.",
  ].join("\n\n"),
  { label: "author:parent", phase: "Author-parent" }
);

// ---------------------------------------------------------------------------
// Phase 2 — AUTHOR SUBTASKS (parallel).
// ---------------------------------------------------------------------------
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
            " under TASK-506.",
          AGENTS_RULES,
          SCOPE,
          "YOUR SUBTASK FOCUS: " + s.scope,
          GROUNDING,
          "FIRST read the parent " +
            TASKS +
            "/" +
            FILES.parent +
            " for consistency, then READ THE REAL SOURCE files your subtask changes and verify every anchor (Read + grep -an; menu files read as BINARY to rg). Write execution-ready pseudocode (exact shapes, clamp ranges, selector strings, control wiring) + Testing Requirements (+ the >=5 smoke scenarios if you are 506-05). Do NOT edit README or any other task file (parent author owns README rows). Return the file path + a 3-line contract summary.",
        ].join("\n\n"),
        { label: "author:" + s.key, phase: "Author-subtasks" }
      )
  )
);

// ---------------------------------------------------------------------------
// Phase 3 — AUDIT (>=5 sequential rounds; per-file + cross-subtask reconcile).
// ---------------------------------------------------------------------------
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
            ") of TASK-506 " +
            t.key +
            " — file " +
            TASKS +
            "/" +
            t.file +
            ". Verify against the REAL source it cites (every anchor; Read + grep -an), the fresh research grounding below, AGENTS.md rules, and the scope. Flag: stale/invented anchors; fixes contradicting the grounding; missing execution-ready detail; the fail-closed reject-unknown key-list traps (each new field MUST join its allowlist + get a round-trip test); byte-identity risks (buildSiteShellCss(null); no-override docs); WRONG depth/placement selectors (esp. B5 nested placement must keep the anchored (0,5,0) level-2 specificity; B1 separators must be orientation-aware); flyoutAnimation breaking zero-JS hover/focus-within reachability (display cannot transition); base-clear helper not actually pruning to byte-stable shape; resolved-default provider missing a level/device source case; default hint hardcoding defaults instead of reading the provider; per-device delta machinery not extended for the new fields; canvas force-open not wired; smoke (506-05) missing >=5 VISIBLE-EFFECT scenarios; anything an implementer would get wrong.\n\n" +
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
      ") of the WHOLE TASK-506 family: " +
      targets.map((t) => TASKS + "/" + t.file).join(", ") +
      ". Find ONLY cross-file contradictions on shared values: single-writer ownership (menuDocumentV2=01, menuDocumentCss=02, siteShell=03, MenuDesignEditor=04, closure=05); the new field shapes + clamp ranges + enum values IDENTICAL across 01/02/04; the depth + nested-placement selector strings identical in 02 vs the 04 preview/force-open; base-clear + resolved-default helper NAMES that 04 uses = exactly the ones 01 defines; the front hook (if any) 03 adds = what 02 selects + 04 mirrors in preview; test-file names in 05 match 01-04 promises; land order + changelog number coherent; the per-device representation identical everywhere. Return findings[] (naming BOTH files + the value to unify) + clean.",
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
      "Fix these CROSS-SUBTASK contradictions in the TASK-506 family (edit ANY of the task files, surgically; unify per recommendation; keep AGENTS.md format; do NOT touch other task families or README stats):\n" +
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
        "Fix these HIGH/MEDIUM drift findings in the TASK-506 contract file " +
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
