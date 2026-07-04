export const meta = {
  name: "task-501-author-audit",
  description:
    "Author TASK-501 (Menu per-device responsive overrides in the Pages style + orientation + per-device block visibility) per AGENTS.md, then >=5 SEQUENTIAL drift-audit rounds WITH a cross-subtask reconcile pass each round, to 0 HIGH/MED. Returns findings. No implementation.",
  phases: [{ title: "Author-parent" }, { title: "Author-subtasks" }, { title: "Audit" }],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ROOT + "/_docs/_TASKS";

// Verified facts from two read-only recons (2026-07-02) — hand to authors so they do not re-derive wrong.
const FACTS = [
  "VERIFIED CURRENT-STATE FACTS (do not contradict without re-checking against source):",
  '— MENU DESIGN PANEL TODAY (core/admin/ui/menus/MenuDesignEditor.tsx): device state ~:882 + DeviceSwitcher ~:1058; canvas CSS via buildMenuDocumentPreviewCss(doc, device) ~:378. Panel: no selection = MenuBarPanel (~:446-607: surface/border color, alignment segmented, paddingX/Y + border width sliders, shadow, sticky, Add-block rail [nav-items,brand,cta-button,divider,spacer], blocks list). nav-items selected (~:669-750): itemGap, fontSize, fontWeight, textTransform, link/hover/active colors, dropdownDirection, mobileMode ("Collapsed"/"Inline"). brand: mode/link/logo. cta-button: label/link/variant. Writers are FLAT (no device fork): setLayoutField ~:418-432 (section.layout), setNavField ~:622-634 (nav-items props), patchBlock ~:434-443.',
  "— APPEARANCE MODEL (core/services/menus/normalizeMenuAppearance.ts): MenuAppearance fields ~:68-91 all optional; fieldNormalizers ~:176-194 (colors regex ~:129-142; clamped numbers itemGap/paddingX/paddingY 0-64, fontSize 10-32, borderWidth 0-8; enums alignment start|center|end|space-between, fontWeight 400|500|600|700, textTransform, shadow none|sm|md, dropdownDirection bottom|top, mobileMode disclosure|inline; sticky boolean). NO orientation field exists. Write normalizeMenuAppearance throws MenuAppearanceError on unknown keys; read sanitizeMenuAppearance fail-closed drops.",
  '— menuDocumentV2 (core/services/menus/menuDocumentV2.ts): MenuSectionV2 ~:131-137 with MENU_SECTION_KEYS = ["id","type","name","layout","blocks"] (reject-unknown ~:439-448). MenuBlockV2 ~:112-129: native blocks keys ["id","type","props"], leaf blocks (cta-button/divider/spacer) + style,visibility (~:364-402); visibility is FLAT { visible: boolean } via the page pipeline. NAV_ITEMS_PROP_KEYS ~:86-96; MENU_BAR_LAYOUT_KEYS ~:74-83; normalizeAppearanceSubset rejects cross-subset keys BEFORE pick (~:207-229). READ IS FAIL-CLOSED (~:498-506): ANY unknown key anywhere degrades the WHOLE stored doc to empty => legacy look. So forgetting to extend a key list = silent data loss on read.',
  '— PAGES RESPONSIVE-OVERRIDE MECHANISM (the UX to mirror; core/services/pages/pageEditorMutationActions.ts): patchBlockPropsForDevice :93-116, patchBlockControlForDevice :118-157, patchSectionControlForDevice :159-187, set*VisibleForBreakpoint :189-227 — device==="desktop" => write base, else write into responsive[device] (lazily created, SPARSE — only edited keys). Removal is EXPLICIT via clearResponsiveOverride/clearBlockResponsiveOverride (pageDocumentV2.ts :3294-3327: delete leaf, prune empty parents, drop empty breakpoint record + empty responsive member). NO auto-remove-on-equality.',
  "— PAGES RESOLVE/READ: resolvePageSectionForBreakpoint :3220-3247 / resolvePageBlockForBreakpoint :3249-3280 (base merged with responsive[breakpoint]); panel gets BOTH resolved (display values) AND base (override detection via readSectionBreakpointOverride/hasResponsiveOverride, pageEditorState.ts :31-54). CASCADE: mobile inherits DESKTOP (not tablet); overrides only on tablet+mobile (pageResponsiveCss.ts header :11-13).",
  '— PAGES UX AFFORDANCES (PageEditor.tsx): ResponsiveStateBadge :4786-4823 (Base/Override/Inherited pill), ResponsiveControlShell :4825-4874 (wraps every control; Reset RotateCcw button when device!=="desktop" && override; data-page-editor-responsive-reset), ResponsivePanelContent :3603-3762 (per-breakpoint hide toggles + per-field override list), canvas scope strip "Editing: … (overrides)" :2820-2824.',
  '— MENU CSS (core/site/menuDocumentCss.ts): collectMenuAppearance :71-77 reads FLAT section.layout + nav-items props; buildMenuRuleSets :92-143 returns {base,desktop,mobile} (mobile branch :128-140 handles mobileMode disclosure/inline); front buildMenuDocumentCss :150-161 wraps mobile in @media (max-width:639px); canvas buildMenuDocumentPreviewCss :209-213 flattens device-forced (tablet => desktop branch) AND prepends a canvas structural baseline (:~166-197, .site-nav-list{display:flex} at ~:180 — document rules emitted after, so they win). Byte-identity: buildSiteShellCss(null) must NOT change (tests/unit/pages/siteShellCss.test.ts); all new CSS stays inside the [data-site-menu-doc="true"]-scoped document sheet.',
  "— mobileMode x orientation interplay: the mobile disclosure branch already forces flex-direction:column when open (menuDocumentCss :133), so vertical orientation matters on desktop/tablet and mobile-inline; a mobile override of orientation must be emitted after/inside the mobileMode rules to win source order.",
  "— menu-drawer: exists in menuSectionTypes but has ZERO editor/front implementation (siteShell.tsx :244-246 renders sections[0] only; pinned by tests/unit/site/menu-document-render.test.tsx:105). TASK-501 does NOT touch it — the responsive overrides + per-device visibility replace the need.",
  '— Dev-server gotcha for any later smoke: Bun server-side code does NOT hot-reload; kill the old "bun --eval" process (check its start date) + re-run coderso-dev-core-host before trusting admin-API responses.',
].join("\n");

const SCOPE = [
  'TASK-501 SCOPE (owner-approved 2026-07-02) — "Menu per-device design overrides, Pages-style":',
  '1. PAGES-STYLE PER-DEVICE OVERRIDES (the core): when DeviceSwitcher = Mobile (tablet OPTIONAL — if included, buildMenuDocumentCss needs a bounded tablet @media and the canvas must stop mapping tablet=>desktop; if deferred, say so explicitly), edits in the Design panel write SPARSE responsive overrides instead of the base: section-level responsive?: { mobile?: { layout?: MenuBarLayout, navProps?: NavItemsProps } } on MenuSectionV2 (one record covers the whole appearance surface since CSS reads section.layout + nav-items props). Resolve-for-display (base merged with override), Override/Base badge + Reset ("remove the mobile override, inherit desktop") per control — port the Pages ResponsiveControlShell UX. Explicit removal only (no auto-remove-on-equality), prune empty records.',
  '2. ORIENTATION: new nav-items appearance field orientation: "horizontal" | "vertical" (enum-validated in normalizeMenuAppearance + added to NAV_ITEMS_PROP_KEYS), a SegmentedControl in the nav-items panel, CSS flex-direction:column + align stretch emitted from the SHARED buildMenuRuleSets (front + canvas from one place). Default "horizontal" emits NOTHING (no byte-drift). Combined with #1 it is per-device settable (e.g. vertical only on mobile).',
  '3. PER-DEVICE BLOCK VISIBILITY: per-block "hide on mobile" (and show-only-on-mobile) so the owner can compose a structurally different mobile menu without a drawer (e.g. CTA desktop-only). Block-level responsive?: { mobile?: { visibility?: { visible: boolean } } } on MenuBlockV2 (ALL block types incl. menu-native — visibility here is document-level render gating, not the page pipeline), a small per-block toggle in the panel (visible when device=mobile, with badge+reset), CSS or render-time gating emitted for front @media + canvas flatten. Keep the existing flat leaf-block visibility untouched.',
  "4. TESTS/DOCS/CLOSURE: vitest matrix (schema round-trips incl. fail-closed read of docs WITHOUT responsive [legacy] and WITH unknown responsive keys [degrades whole doc — assert this consciously], write reject-unknown for breakpoint/override keys, resolve merge, clear/prune, orientation enum, CSS emission front @media + canvas flatten, visibility gating), MenuDesignEditor UI tests (device-forked writes, badge/reset), byte-identity guard untouched, docs + changelog (next free number, likely 1209) + README/board closure.",
  "NON-GOALS: no menu-drawer implementation, no new endpoint/RBAC/migration (document rides the existing PATCH /menus/:id envelope — verify menuUpdateSchema needs NO change since document is already allowed), no siteShellCss.ts changes.",
].join("\n");

const AGENTS_RULES = [
  'AGENTS.md task-authoring rules you MUST follow: board file TASK-501_...md (underscores); child files TASK-501-NN-...md (hyphens); H1 = task ID; "# FileName:" = actual filename; children carry **Parent Task:** TASK-501; canonical **Status:** ⏳ To Do; execution-ready pseudocode (exact helper/function shapes, data flow, error handling, regression-test shape) so an implementer executes without rediscovering strategy; Security Contract subsection = "UI/client-state + schema-first document contract extension; no new route/endpoint/RBAC/migration — document rides the existing validated PATCH /menus/:id write path" (verify + cite); Testing Requirements per _docs/TESTING_STRATEGY.md (Vitest for Bun-free UI/services; bun for the route/runtime suites already covering menus). Schema-first: own enums/normalize* in the service module, reject-unknown, non-destructive legacy (docs without responsive parse unchanged), deterministic contracts. React hooks rules: no setState-in-effect; device-forked writes happen in event handlers.',
].join("\n");

const FILES = {
  parent: "TASK-501_Menu_Per_Device_Overrides_Orientation_And_Block_Visibility.md",
  subs: [
    {
      key: "501-01",
      file: "TASK-501-01-MenuDocumentV2-Responsive-Contract.md",
      scope:
        "MODEL KEYSTONE (scope 1+2+3 schema side): MenuSectionV2.responsive (mobile{layout,navProps}) + MenuBlockV2.responsive (mobile{visibility}) + orientation field in normalizeMenuAppearance + NAV_ITEMS_PROP_KEYS; normalizers (reject-unknown breakpoint/override keys, reuse the subset normalizers, drop empty records, emit ...(responsive ? {responsive} : {}) so legacy docs round-trip byte-identically); resolveMenuSectionForBreakpoint/resolveMenuBlockForBreakpoint + clearMenuResponsiveOverride helpers (ports of the pages ones); fail-closed read semantics stated explicitly.",
    },
    {
      key: "501-02",
      file: "TASK-501-02-Menu-CSS-Responsive-Emission.md",
      scope:
        "CSS (scope 1+2+3 emission): breakpoint-aware collectMenuAppearance; buildMenuRuleSets emits the mobile-resolved DELTA into the existing mobile branch (after the mobileMode rules — source-order win); orientation rule (vertical => flex-direction:column;align-items:stretch, default emits nothing); per-device block visibility emission (front @media + canvas flatten — pick CSS display:none per block id under the doc scope OR render-time gating in siteShell SiteHeaderMenuDocumentRender; justify the choice); buildMenuDocumentPreviewCss mobile branch uses the mobile-resolved appearance. NO siteShellCss.ts change; byte-identity guard named.",
    },
    {
      key: "501-03",
      file: "TASK-501-03-Design-Editor-Device-Forked-Controls.md",
      scope:
        'ADMIN UI (scope 1+2+3 editor side): device-forked setLayoutField/setNavField/patchBlock (desktop => base, mobile => sparse responsive write via the 501-01 helpers); panels display RESOLVED values while override detection reads the BASE; Override/Base badge + Reset per control (port ResponsiveControlShell idiom; data-menu-responsive-reset hooks); orientation SegmentedControl in nav-items panel; per-block mobile visibility toggle; "Editing: mobile (overrides)" scope cue; undo/redo (the single useReducer atom from 499-03) keeps working across device-forked writes.',
    },
    {
      key: "501-04",
      file: "TASK-501-04-Menu-Responsive-Tests-Docs-Closure.md",
      scope:
        "TESTS/DOCS/CLOSURE per scope 4: full vitest+bun matrix incl. the CONSCIOUS fail-closed assertion (doc with unknown responsive key degrades whole doc), legacy round-trip byte-identity, resolve/clear/prune, CSS emission both builders, editor device-fork + badge/reset tests, siteShellCss byte-identity untouched; docs + changelog (~1209) + README/board closure incl. Statistics.",
    },
  ],
};

// ---- Phase 1: parent ----
phase("Author-parent");
await agent(
  [
    "Author the PARENT board task file " +
      TASKS +
      "/" +
      FILES.parent +
      " for TASK-501 (Menu Per-Device Overrides, Orientation & Block Visibility).",
    AGENTS_RULES,
    FACTS,
    SCOPE,
    "The parent must contain: Overview (the gap: appearance is flat/global, no orientation, no per-device visibility — and the owner-chosen UX = the Pages per-breakpoint override pattern), the subtask breakdown listing exactly: " +
      FILES.subs.map((s) => s.key + " (" + s.file + ")").join("; ") +
      " with one-liners + the dependency/land order (501-01 model keystone -> 501-02 CSS -> 501-03 editor -> 501-04 closure; 02 and 03 both depend on 01, and 03 additionally consumes 02's preview emission), Acceptance criteria (measured live: canvas Mobile shows overridden look; :3000 real mobile viewport matches; desktop unchanged; Reset restores inheritance; legacy menus untouched), and the Security-Contract scope note. ALSO add the TASK-501 parent + 4 child rows to the To Do table in " +
      TASKS +
      "/README.md and bump the To Do count in Statistics by 5 (do NOT touch other rows). Write real, execution-ready content — no placeholders. Return the file path + subtask list.",
  ].join("\n\n"),
  { label: "author:parent", phase: "Author-parent" }
);

// ---- Phase 2: subtasks (parallel — distinct files) ----
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
            " under TASK-501.",
          AGENTS_RULES,
          FACTS,
          SCOPE,
          "YOUR SUBTASK FOCUS: " + s.scope,
          "Read the parent " +
            TASKS +
            "/" +
            FILES.parent +
            " first for consistency, and READ THE REAL SOURCE files your subtask changes (verify every anchor with Read + grep -an — MenuDesignEditor.tsx / menuDocumentV2.ts / menuDocumentCss.ts / normalizeMenuAppearance.ts / the pages reference files). Write execution-ready pseudocode + Testing Requirements + the scope/Security note. Do NOT edit README (parent author owns board rows) or any other task file. Return the file path + a 3-line contract summary.",
        ].join("\n\n"),
        { label: "author:" + s.key, phase: "Author-subtasks" }
      )
  )
);

// ---- Phase 3: >=5 sequential audit rounds, EACH with per-file audits + cross-subtask reconcile ----
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
const allResidualFindings = [];
let lastClean = false;

for (let round = 1; round <= 8; round++) {
  // (a) per-file drift audits (parallel)
  const audits = await parallel(
    targets.map(
      (t) => () =>
        agent(
          "Read-only drift audit (round " +
            round +
            ") of TASK-501 " +
            t.key +
            " — file " +
            TASKS +
            "/" +
            t.file +
            ". Verify the contract against: the REAL current source it cites (every anchor must exist — Read + grep -an, never rg on the big files), AGENTS.md task rules, the verified facts + owner scope below. Flag: stale/invented anchors; missing execution-ready detail; schema changes not schema-first / missing reject-unknown on breakpoint+override keys / a forgotten MENU_SECTION_KEYS or NAV_ITEMS_PROP_KEYS extension (the fail-closed read trap); legacy docs not round-tripping byte-identically; CSS not emitted from the SHARED builder (front/canvas divergence); byte-identity of buildSiteShellCss(null) at risk; the Pages-port fidelity (sparse writes, resolved-display vs base-detection, explicit Reset, mobile-inherits-desktop); setState-in-effect risks; anything an implementer would get wrong.\n\n" +
            FACTS +
            "\n\n" +
            SCOPE +
            "\n\nReturn findings[] + clean (true iff 0 HIGH/MED for this file).",
          { label: "audit:r" + round + ":" + t.key, phase: "Audit", schema: DRIFT_SCHEMA }
        )
    )
  );
  const done = audits.filter(Boolean);
  const perFileFindings = done.flatMap((a, i) =>
    (a.findings || []).map((f) => ({ ...f, target: targets[i].key }))
  );

  // (b) cross-subtask RECONCILE pass (the TASK-500 lesson: per-file fixers oscillate on shared contract values)
  const recon = await agent(
    "Cross-subtask RECONCILE audit (round " +
      round +
      ") of the WHOLE TASK-501 family. Read ALL six files together: " +
      targets.map((t) => TASKS + "/" + t.file).join(", ") +
      ". Find ONLY cross-file contradictions on shared contract values: the responsive record shape + breakpoint set (mobile-only vs tablet) must be IDENTICAL across parent/01/02/03/04; key lists (MENU_SECTION_KEYS/NAV_ITEMS_PROP_KEYS extensions) consistent; helper names/signatures used by 03 must be the ones 01 defines; the CSS emission choice (display:none vs render-gating) referenced consistently by 02/03/04; test-file names in 04 match what 01-03 promise; land order coherent. Do NOT re-audit single-file details. Return findings[] (each naming BOTH files + the value to unify) + clean.\n\n" +
      SCOPE,
    { label: "reconcile:r" + round, phase: "Audit", schema: DRIFT_SCHEMA }
  );
  const reconFindings = (recon && recon.findings ? recon.findings : []).map((f) => ({
    ...f,
    target: "cross",
  }));

  const findings = [...perFileFindings, ...reconFindings];
  const highMed = findings.filter((f) => f.severity === "high" || f.severity === "medium");
  const roundOk = done.length === targets.length && !!recon;
  const roundClean = highMed.length === 0 && roundOk;
  history.push({
    round,
    audits: done.length,
    highMed: highMed.length,
    reconcileFindings: reconFindings.length,
  });
  log(
    "Audit round " +
      round +
      ": " +
      highMed.length +
      " HIGH/MED (" +
      reconFindings.length +
      " from reconcile; " +
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
  allResidualFindings.length = 0;
  allResidualFindings.push(...highMed);

  // (c) fix: cross findings FIRST by a single reconciler (sees all files), then per-file fixes in parallel
  const crossHM = highMed.filter((f) => f.target === "cross");
  if (crossHM.length > 0) {
    await agent(
      "Fix these CROSS-SUBTASK contradictions in the TASK-501 contract family (you may edit ANY of the six task files, surgically — unify the shared value everywhere per the recommendation; keep AGENTS.md format; do not touch other task families or README stats):\n" +
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
        "Fix these HIGH/MEDIUM drift findings in the TASK-501 contract file " +
          TASKS +
          "/" +
          tf.file +
          " (CONTRACT WORDING ONLY, surgical edits, keep AGENTS.md format, do NOT touch other task files or README). Verify each against real source before editing.\n" +
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

return {
  rounds: history.length,
  lastClean,
  history,
  residualHighMed: lastClean ? [] : allResidualFindings,
};
