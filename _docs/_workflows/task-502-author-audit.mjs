export const meta = {
  name: "task-502-author-audit",
  description:
    "Author TASK-502 (Menu Design fixes v2: 7 owner-reported bugs — brand text, tablet cascade un-defer, device-scoped controls, canvas site tokens, separators, CTA visibility+options, recursive nested submenus) per AGENTS.md from the confirmed recon, then >=5 SEQUENTIAL audit rounds with a cross-subtask reconcile pass each round, to 0 HIGH/MED. Returns findings. No implementation.",
  phases: [{ title: "Author-parent" }, { title: "Author-subtasks" }, { title: "Audit" }],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ROOT + "/_docs/_TASKS";
const RECON =
  "/tmp/claude-1000/-home-coder-project-Coderso/018e2bcd-50fd-4602-9a5a-52f5df82b204/tasks/wdwzo8da2.output";

const SCOPE = [
  "TASK-502 SCOPE — 7 owner-reported Menu Design bugs (2026-07-02), each confirmed by a read-only recon whose FULL findings (rootCause file:line evidence + reproSteps + fixSketch + affectedFiles) are in the JSON file " +
    RECON +
    " (read it with Read + jq via Bash; field .result.findings[]). The recon fix sketches are the STARTING POINT — verify each against source and keep them schema-first/minimal:",
  '1. BRAND TEXT (recon bug 1): brand block renders the MENU NAME on canvas but the SITE NAME on front, uneditable. Fix: optional brand.props.text (validated, trimmed, capped, sparse) + BRAND_PROP_KEYS extension; fallback chain text -> siteName; panel "Brand text" Input (text mode only); canvas renders the same chain as the front (thread the real site name into the editor payload or match the fallback). Text formatting = OUT of minimal scope (note as residual).',
  '2. TABLET CASCADE UN-DEFER (owner decision, was consciously deferred in 501): mirror Pages EXACTLY — desktop = base; tablet AND mobile each carry their own sparse responsive record; BOTH inherit from DESKTOP (Pages cascade — mobile does NOT inherit tablet). Model: MENU_RESPONSIVE_BREAKPOINT_KEYS gains "tablet" (section layout/navProps + block visibility); CSS: bounded tablet @media (pageResponsiveMediaBounds.tablet) on the front + the canvas flatten stops mapping tablet=>desktop (device-forced tablet branch); editor: device-forked writes for tablet like mobile, badges/reset per breakpoint. Legacy docs without responsive still byte-identical; docs with only mobile overrides unchanged in output.',
  '3. DEVICE-SCOPED PANEL CONTROLS (owner decision + kills the 501 dead-override residual): mobileMode ("Mobile menu") control visible ONLY when device===mobile; dropdownDirection visible ONLY on desktop/tablet (dropdowns exist only >=640px; mobile renders sublists inline). Both write to the BASE regardless of device (they are device-DEFINING options, not overridable ones) — remove their MenuResponsiveControlShell wraps so no dead override records are ever stored; migrate/prune any already-stored dead dropdownDirection mobile override on read (non-destructive: just ignore+prune on next write).',
  "4. CANVAS SITE TOKENS (recon bug 4): the color swatches write var(--color-*) tokens that the menu canvas never defines (admin theme leaks in; --color-bg/-surface/-text undefined => invalid-at-computed-value). Fix: port the PageEditor pattern (useCanvasSiteTokens + toPageCanvasColorCssVariableMap painted inline on the canvas frame + site-resolved swatch palette passed to ColorSwatchControl) into MenuDesignEditor so picked swatches render their REAL site-token colors in the canvas; front already correct. Also note the hover/active colors are state-only background pills — panel labels/help text should say so (cheap copy fix), do NOT change emission semantics.",
  "5. NAV SEPARATORS (recon bug 5): the divider leaf renders as a useless ~4px block in the horizontal bar. Fix per recon sketch: make divider render as a VERTICAL separator in the menu-bar context (doc-scoped CSS for the divider frame inside .site-header-inner: width 1px / height ~1.5em / self-center; keep the page-leaf schema untouched — context CSS only, front + canvas from the shared builder). Enumerate the cheap extra layout options the recon listed (per-block spacing already ridable via itemGap/paddings) as residuals, do not gold-plate.",
  '6. CTA VISIBILITY + OPTIONS (recon bug 6): the Desktop/Tablet Visible toggle writes flat block.visibility which the CANVAS never consumes (front is correct: PageBlockFrame null + shouldRenderMenuBlock). Fix: canvas gates every block through resolveMenuBlockVisibleForDevice and renders hidden blocks as a dimmed selectable GHOST (opacity + "Hidden" badge) instead of skipping — covers flat hides, mobile/tablet overrides, and visible-on-neither, matching front resolution. ALSO surface the already-validated cta-button leaf props missing from the panel (per recon: size/target at minimum — variant already exposed; verify against the page button leaf allow-list) as panel controls. No schema change.',
  "7. RECURSIVE NESTED SUBMENUS (recon bug 7): data pipeline is fully recursive; RENDER flattens. Fix per recon sketch: (a) FRONT siteShell — delete flattenNavigationDescendants + the [item, ...dropdownItems] parent-duplication; make SiteNavItem RECURSIVE (each level renders its own .site-nav-sublist; parent renders as its own link/label); nested-hover CSS for .site-nav-sublist .site-nav-sublist (fly-out positioning) in BOTH the base sheet branch that owns sublists and the doc-scoped builder — CAREFUL: buildSiteShellCss(null) byte-identity is inviolable, so any base-sheet change is FORBIDDEN; emit nested-level rules ONLY from the doc-scoped builder OR prove the base sheet already supports nesting via inheritance (the audit must resolve this explicitly); (b) CANVAS NavItemsPreview renders the same recursive structure; (c) items editor: verify indent depth is not artificially capped; (d) mobile: nested levels render indented inline (no fly-out).",
  'CROSS-CUTTING: fold in the 501 LOW residuals that overlap (mobile-canvas disclosure preview gap — canvas should preview the nav list under default mobileMode [suppress the display:none in the PREVIEW builder only or simulate an open disclosure]; changelog 1210 "39/39"->"11/11" correction; both-invisible ghost covered by item 6). NON-goals: menu-drawer, text formatting on brand, new endpoints/RBAC/migrations. Changelog number for closure: next free AFTER 1210 (expected 1211) — verify at closure time.',
].join("\n");

const AGENTS_RULES =
  'AGENTS.md task-authoring rules: board file TASK-502_...md (underscores); children TASK-502-NN-...md (hyphens); H1 = task ID; "# FileName:" matches; **Parent Task:** TASK-502; canonical **Status:** ⏳ To Do; execution-ready pseudocode (helpers/props/CSS rules, data flow, error handling, regression-test shape); Security Contract note = "UI/client-state + schema-first document contract extension; no new route/RBAC/endpoint/migration" (verify); Testing Requirements per _docs/TESTING_STRATEGY.md (Vitest Bun-free + the bun menu suites) AND a SMOKE section per the owner mandate: the implementation smoke MUST define AT LEAST 5 DISTINCT real-flow scenarios for the menu-design area (fresh-create end-to-end; override/reset cycle across desktop/tablet/mobile; DEEP NESTING 3+ levels verified canvas AND front hover; every-panel-control-with-visible-effect assertions [computed style vs picked value]; publish->front parity at real viewports) — assert VISIBLE EFFECT, not control presence. Schema-first, reject-unknown, non-destructive legacy, byte-identity guards named explicitly (buildSiteShellCss(null); no-override docs byte-identical). Sections/blocks key lists extended consciously (the fail-closed read trap from 501).';

const FILES = {
  parent: "TASK-502_Menu_Design_Fixes_V2_Brand_Tablet_Canvas_Nesting.md",
  subs: [
    {
      key: "502-01",
      file: "TASK-502-01-Menu-Model-Brand-Text-And-Tablet-Breakpoint.md",
      scope:
        "Scope items 1 (schema side) + 2 (model side): brand.props.text contract + BRAND_PROP_KEYS; tablet breakpoint in MENU_RESPONSIVE_BREAKPOINT_KEYS + section/block responsive records + resolve/patch/clear helpers device-generalized; conscious key-list extensions; legacy + mobile-only docs byte-identical round-trip. Owns core/services/menus/menuDocumentV2.ts (+ normalizeMenuAppearance.ts if needed).",
    },
    {
      key: "502-02",
      file: "TASK-502-02-Menu-CSS-Tablet-Branch-Separators-And-Nested-Sublists.md",
      scope:
        "Scope items 2 (CSS side) + 5 + 7a-CSS + disclosure-preview residual: bounded tablet @media + canvas tablet flatten; vertical divider context CSS; nested .site-nav-sublist fly-out rules DOC-SCOPED ONLY (byte-identity of buildSiteShellCss(null) inviolable — the audit must explicitly resolve how nested levels style on default menus); mobile nested-inline; preview-builder disclosure suppression so the Mobile canvas previews the nav list. Owns core/site/menuDocumentCss.ts + the CSS-relevant part of core/site/siteShell.tsx render (coordinate with 502-03 ownership — reconcile pass must pin who owns siteShell.tsx).",
    },
    {
      key: "502-03",
      file: "TASK-502-03-Front-Recursive-Nav-And-Brand-Render.md",
      scope:
        "Scope items 7a-markup + 1 (front side): recursive SiteNavItem (no flatten, no parent duplication), brand text fallback chain in BrandRender, shouldRenderMenuBlock unchanged. Owns core/site/siteShell.tsx (sole writer — 502-02 hands its render needs here per the reconcile).",
    },
    {
      key: "502-04",
      file: "TASK-502-04-Design-Editor-Canvas-WYSIWYG-And-Device-Controls.md",
      scope:
        "Scope items 3 + 4 + 6 + 1 (editor side) + 7b: device-scoped control visibility (mobileMode mobile-only, dropdownDirection desktop/tablet-only, both base-writing, shells removed); canvas site tokens (useCanvasSiteTokens port + palette threading); canvas visibility ghosting via resolveMenuBlockVisibleForDevice; cta panel option surfacing (size/target); brand text Input + canvas brand chain; recursive canvas NavItemsPreview; tablet device-forked writes + badges. Owns core/admin/ui/menus/MenuDesignEditor.tsx (+ MenuAppearancePanel if separate).",
    },
    {
      key: "502-05",
      file: "TASK-502-05-Menu-Fixes-Tests-Docs-Closure.md",
      scope:
        'Full regression matrix (model round-trips incl. tablet; CSS tablet branch + separators + nested sublists + golden byte-identity; front recursive render + brand chain; editor device-scoping + ghost + tokens) + the MANDATED >=5-scenario smoke script definition + docs + changelog (next free, expected 1211; also correct the 1210 "39/39"->"11/11" gates line) + README/board/Statistics closure.',
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
      " for TASK-502 (Menu Design Fixes V2).",
    AGENTS_RULES,
    SCOPE,
    "FIRST read the full recon findings JSON: " +
      RECON +
      ' (Bash: jq -r ".result.findings" ' +
      RECON +
      " — five entries with rootCause/reproSteps/fixSketch/affectedFiles). Verify the load-bearing anchors against source before committing them to the contract.",
    "The parent must contain: Overview (the 7 bugs with one-line root causes + the 2 owner decisions), the subtask breakdown for: " +
      FILES.subs.map((s) => s.key + " (" + s.file + ")").join("; ") +
      " with dependency/land order (502-01 model -> 502-02 CSS -> 502-03 front -> 502-04 editor -> 502-05 closure; file ownership single-writer — siteShell.tsx belongs to 502-03), Acceptance criteria (per bug, measured live incl. the deep-nesting hover check on front), the >=5-scenario smoke mandate, and the Security note. ALSO add TASK-502 parent + 5 child rows to the To Do table in " +
      TASKS +
      "/README.md and bump the To Do Statistics count by 6 (Read the README FRESH first; touch ONLY your rows — other streams edit other rows). Return the file path + subtask list.",
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
            " under TASK-502.",
          AGENTS_RULES,
          SCOPE,
          "YOUR SUBTASK FOCUS: " + s.scope,
          "FIRST read the recon findings JSON (" +
            RECON +
            ") for your bugs AND the parent " +
            TASKS +
            "/" +
            FILES.parent +
            ". Then READ THE REAL SOURCE files your subtask changes and verify every anchor (Read + grep -an; rg-binary files). Write execution-ready pseudocode + Testing Requirements (+ the smoke scenarios if 502-05). Do NOT edit README or any other task file. Return the file path + a 3-line contract summary.",
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
            ") of TASK-502 " +
            t.key +
            " — file " +
            TASKS +
            "/" +
            t.file +
            ". Verify against: the REAL source it cites (every anchor; Read + grep -an), the recon evidence (" +
            RECON +
            "), AGENTS.md rules, and the scope below. Flag: stale/invented anchors; fixes that contradict the recon root cause; missing execution-ready detail; byte-identity risks (buildSiteShellCss(null); no-override docs); key-list/fail-closed traps; the nested-sublist base-sheet question left unresolved; tablet cascade not mirroring Pages (mobile must inherit DESKTOP); device-scoped controls still shell-wrapped; smoke section missing the >=5 distinct scenarios with visible-effect assertions; anything an implementer would get wrong.\n\n" +
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
      ") of the WHOLE TASK-502 family: " +
      targets.map((t) => TASKS + "/" + t.file).join(", ") +
      ". Find ONLY cross-file contradictions on shared values: single-writer file ownership (siteShell.tsx = 502-03 ONLY; menuDocumentCss = 502-02; MenuDesignEditor = 502-04; menuDocumentV2 = 502-01 — no two subtasks may edit the same file), tablet breakpoint shape identical everywhere, helper names 502-04 uses = the ones 502-01 defines, nested-sublist CSS ownership + the base-sheet-vs-doc-scope resolution consistent across 02/03, brand text chain identical in 01/03/04, test-file names in 05 match 01-04 promises, land order coherent. Return findings[] (naming BOTH files + the value to unify) + clean.",
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
      "Fix these CROSS-SUBTASK contradictions in the TASK-502 family (edit ANY of the six task files, surgically; unify the shared value per recommendation; keep AGENTS.md format; do NOT touch other task families or README stats):\n" +
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
        "Fix these HIGH/MEDIUM drift findings in the TASK-502 contract file " +
          TASKS +
          "/" +
          tf.file +
          " (CONTRACT WORDING ONLY, surgical; verify against real source + the recon " +
          RECON +
          " first; keep AGENTS.md format; do NOT touch other files).\n" +
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
