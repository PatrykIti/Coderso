export const meta = {
  name: "task-504-implement",
  description:
    "Implement TASK-504 (Menu styling depth: brand style + brand-image-render fix, per-level 0/1/2 styling + sublist chrome, per-link padding/radius + hover-text/current-page, ALL per-device; + font-slider + items-badge bug fixes) STRICTLY SEQUENTIALLY 504-01->02->03->04->05, targeted gates per subtask, post-audit, scope-driven >=5-scenario playwright smoke. NO full-gates phase (combined run later). Collision-guarded against the parallel TASK-505 (custom-screens forbidden; changelog pinned 1213; README = 504 rows only).",
  phases: [
    { title: "504-01" },
    { title: "504-02" },
    { title: "504-03" },
    { title: "504-04" },
    { title: "504-05" },
    { title: "Post-audit" },
    { title: "Smoke" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const T = (n) => ROOT + "/_docs/_TASKS/" + n;
const ENV = "set -a && { [ ! -f .env ] || . ./.env; } && set +a && ";
const PARENT = T("TASK-504_Menu_Styling_Depth_Brand_And_Per_Level.md");

const COMMON = [
  "You implement a TASK-504 (Menu styling depth) subtask on branch feature/visual, IN-PLACE (no worktree). Read your subtask contract file IN FULL first (execution-ready pseudocode, verified anchors) + the parent " +
    PARENT +
    ".",
  "HARD RULES (AGENTS.md + owner-established):",
  "- Per-device cascade mirrors Pages/502 EXACTLY: desktop=base; tablet AND mobile each carry their own sparse responsive record; BOTH inherit DESKTOP (mobile NOT tablet). Brand style + per-level styles are BOTH per-device this tier.",
  "- PRESENT-ONLY emission for the new cheap-win keys (linkPaddingX/linkPaddingY/linkRadius/linkHoverTextColor): NO resolution default (do NOT add to MENU_APPEARANCE_DEFAULTS/SHELL_APPEARANCE_DEFAULTS); their rule-group base() returns null unless authored (mirror the orientation null-at-default). A no-override doc gains ZERO new doc-sheet CSS.",
  "- Schema-first + reject-unknown; the CONSCIOUS fail-closed read trap (extend BRAND_PROP_KEYS / the nav-items block key set consciously — a forgotten key degrades the whole stored doc). Legacy + no-override docs round-trip byte-identically.",
  "- BYTE-IDENTITY INVIOLABLE: core/site/siteShellCss.ts NOT touched; buildSiteShellCss(null) byte-identical (tests/unit/pages/siteShellCss.test.ts ZERO edits) + no-override docs byte-identical (tests/unit/site/menu-document-render.test.tsx). ALL new CSS doc-scoped via the ONE shared buildMenuRuleSetsForDocument (front @media + canvas flatten never diverge).",
  "- Per-level inheritance is pure CSS cascade/source-order (emit level 0 then 1 then 2, each only its own overrides) — NO runtime merge. Level 0 = the EXISTING nav base (no new type). Depth selectors must match the recursive 502 markup exactly.",
  "- Brand IMAGE fix (B1): define+EXPORT resolveBrandImageSrc from menuDocumentV2.ts (single home); 504-03 front + 504-04 canvas IMPORT it and emit a resolved-src-guarded <img> sized by BrandStyle.height/maxWidth. Do NOT re-implement the leaf src resolver twice.",
  "- React hooks: device-forked writes in event handlers; no setState-in-effect. B2 (font slider) is DISPLAY-only (do NOT change CSS emission or write on mount). Large menu files read as binary to rg — Read + grep -an, NEVER rg.",
  "- COLLISION GUARD (a parallel TASK-505 Screens stream runs in this tree): do NOT touch core/services/customScreens/**, core/admin/ui/custom-screens/**, core/services/pages/pageDocumentV2.ts, or any TASK-505 file. Do NOT edit _docs/_TASKS/* or _docs/_CHANGELOG/* (only 504-05 owns docs). 504-05 README rule: Read _docs/_TASKS/README.md FRESH immediately before editing and change ONLY the TASK-504 rows + 504 Statistics deltas.",
  "- Touch ONLY the files your subtask owns (single-writer per the parent File-ownership block). Keep the targeted gate GREEN: re-point/add exactly the tests your change requires (per the 504-05 matrix); never weaken a functional/behavior assertion.",
  "Return a concise summary: files edited, new/changed public contract signatures, tests re-pointed/added, deviations with reasons.",
].join("\n");

const SUBTASKS = [
  {
    key: "504-01",
    phase: "504-01",
    file: "TASK-504-01-Menu-Model-Brand-Style-And-Level-Styles.md",
    owns: "core/services/menus/menuDocumentV2.ts (+ normalizeMenuAppearance.ts for the 4 new scalar keys/ranges/enums if they belong there)",
    brief:
      'MODEL keystone: BrandStyle + normalizeBrandStyle + "style" in BRAND_PROP_KEYS; the brand IMAGE fix — normalize brand.props.image into the leaf {asset/src}-resolvable shape + DEFINE+EXPORT resolveBrandImageSrc(image)->src|null (B1 model half); NavLevelStyle + levelStyles on NavItemsProps + normalizeNavLevelStyles (OUTSIDE normalizeAppearanceSubset; widen the nav block key set); the 4 cheap-win scalar keys (linkPaddingX/Y/linkRadius/linkHoverTextColor) with NO defaults (present-only) + new clamp ranges; PER-DEVICE — extend MenuBlockOverride to carry brand style (tablet+mobile) + carry a levelStyles delta in responsive.navProps; resolve/patch/clear device-generalized; byte-stable + reject-unknown + fail-closed key-list extensions (round-trip tests for every new key). Extend the vitest service tests.',
    gate: {
      vitest: "menu-document menuSchemas normalizeMenuAppearance menu",
      bun: "tests/unit/pages/siteShellCss.test.ts",
    },
  },
  {
    key: "504-02",
    phase: "504-02",
    file: "TASK-504-02-Menu-CSS-Brand-Level-And-Cheap-Wins.md",
    owns: "core/site/menuDocumentCss.ts (ONLY; SEQUENTIAL after 504-01)",
    brief:
      "CSS: collectMenuBrandRules (scoped [data-site-menu-doc] [data-menu-block-id] + img{} for image mode); navLevelRules with the EXACT depth selectors (level 0 = .site-nav-list>.site-nav-item>.site-nav-link; level 1 = ...>.site-nav-sublist>li>.site-nav-link + container .site-nav-sublist; level 2+ = .site-nav-sublist .site-nav-sublist ...) + submenu container chrome (bg/border/radius/shadow/minWidth) for levels>=1; a per-link padding/radius rule group + hover-TEXT color + current-page :where([aria-current=page]) — ALL PRESENT-ONLY (base() returns null unless authored; local SHELL_DEFAULT_LINK_* are shorthand-completion fallbacks, NOT defaults seeds); per-device (tablet+mobile) delta emission for brand + levels via collectDeltaRules; canvas force-open-selected-level in buildMenuDocumentPreviewCss (mirror previewMobileOpen). Byte-identity: buildSiteShellCss(null) untouched, no-override docs byte-identical, all doc-scoped. Golden tests + present-only zero-bytes assertions.",
    gate: {
      vitest: "menu-document menuDocumentCss menu site",
      bun: "tests/unit/site/menu-document-render.test.tsx tests/unit/pages/siteShellCss.test.ts tests/integration/runtime/site-shell-runtime.test.ts",
    },
  },
  {
    key: "504-03",
    phase: "504-03",
    file: "TASK-504-03-Front-Aria-Current-Stamp.md",
    owns: "core/site/siteShell.tsx (SOLE WRITER; SEQUENTIAL after 504-02; additive forwards in publicSite/pageRuntimeV2/renderPublicPage if the contract requires, per its file table)",
    brief:
      'FRONT: stamp aria-current="page" on the active nav link (top-level + nested) in SiteHeaderMenuDocumentRender for the current-page CSS rule; brand IMAGE render fix (B1 front) — IMPORT resolveBrandImageSrc from menuDocumentV2 and emit a resolved-src-guarded <img class="site-header-brand ..."> sized by BrandStyle.height/maxWidth (no balloon; text-mode fallback when no src). NO other markup/class change (buildSiteShellCss stays untouched; the data-menu-block-id stamp on the brand <a> already exists per 502). Tests: aria-current stamping, brand logo renders resolved <img> without ballooning, byte-stable markup for no-override docs.',
    gate: {
      vitest: "menu-document menu site navigation",
      bun: "tests/unit/site/menu-document-render.test.tsx tests/integration/runtime/site-shell-runtime.test.ts tests/unit/pages/siteShellCss.test.ts",
    },
  },
  {
    key: "504-04",
    phase: "504-04",
    file: "TASK-504-04-Design-Editor-Brand-And-Level-Controls.md",
    owns: "core/admin/ui/menus/MenuDesignEditor.tsx + core/admin/ui/menus/MenuEditorPage.tsx (+ MenuAppearancePanel.tsx if mounted). SEQUENTIAL after 504-03.",
    brief:
      'EDITOR: brand style controls (mode-gated) + brand IMAGE canvas preview using resolveBrandImageSrc (B1 canvas — replace the literal "Logo" text + stamp data-menu-block-id on the SelectableBlock div :303, brand <a> :578); a Level SegmentedControl (0/1/2) rebinding the control set to the selected level record (0 = existing nav base; 1/2 = levelStyles) + submenu container controls for levels>=1 + a Base/Override/Inherited badge ("inherits level N-1"); per-link padding/radius + hover-text controls; per-device device-forked writes for brand+levels + MenuResponsiveControlShell badge/Reset per breakpoint (desktop/tablet/mobile); thread the selected level into MenuDocumentCanvas -> buildMenuDocumentPreviewCss force-open. B2: the nav Font-size slider DISPLAY shows the true inherited value (16/"inherited") at unset, NOT 15 (display-only). B3: MenuEditorPage.tsx items badge counts TOTAL items + pluralize count===1?"item":"items". Tests: MenuDesignEditor brand/level/device/force-open/font-display suites; menu-editor.test.tsx badge count.',
    gate: {
      vitest: "menu-design menu-editor menu-document menu page-editor navigation",
      bun: "tests/unit/pages/siteShellCss.test.ts",
    },
  },
];

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
const gateCmd = (g) =>
  "cd " +
  ROOT +
  " && bun --cwd core lint:types && bun --cwd core lint && " +
  ENV +
  "NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts " +
  g.vitest +
  " 2>&1 | tail -55 && " +
  ENV +
  "bun test " +
  g.bun +
  " 2>&1 | tail -25";

async function runGate(cmd, label, ph) {
  return await agent(
    "Run from " +
      ROOT +
      " and report — do NOT edit anything:\n" +
      cmd +
      '\nReturn {pass, summary, errors}. pass=true ONLY if every command exits 0 and both test runs report 0 failed. Known flake: under load vitest can throw spurious "Test timed out in 10000ms" — re-run the NAMED failing file once in isolation before reporting a real failure. List each distinct real error/failure with file:line in errors[] (cap ~40).',
    { label: label, phase: ph, schema: GATE_SCHEMA }
  );
}
async function gateLoop(ph, cmd, fixContext) {
  let g = await runGate(cmd, "gate:" + ph + ":1", ph);
  let r = 1;
  while (g && !g.pass && r <= 3) {
    log(ph + " gate round " + r + ": " + g.errors.length + " issues -> fixing");
    await agent(
      "TASK-504 " +
        ph +
        ": the targeted gate FAILS. Fix CORRECTLY — prefer fixing the SOURCE when it diverged from the contract; re-baseline a TEST only for an intended contract update per the 504-05 matrix (never weaken a behavior assertion, never break buildSiteShellCss(null) byte-identity or the no-override/legacy round-trip, keep reject-unknown + present-only cheap wins + no Pages regression). COLLISION GUARD: do NOT touch core/services/customScreens/**, core/admin/ui/custom-screens/**, core/services/pages/pageDocumentV2.ts, _docs/**. " +
        fixContext +
        "\nFailures:\n" +
        g.errors.map((e) => "- " + e).join("\n"),
      { label: "fix:" + ph + ":" + r, phase: ph }
    );
    r += 1;
    g = await runGate(cmd, "gate:" + ph + ":" + r, ph);
  }
  return g && g.pass;
}

for (const st of SUBTASKS) {
  phase(st.phase);
  await agent(
    COMMON +
      "\n\nYOUR SUBTASK = " +
      st.key +
      ". Contract file: " +
      T(st.file) +
      ". Files you own: " +
      st.owns +
      ".\n" +
      st.brief +
      "\n\nThis runs SEQUENTIALLY after the prior subtask landed — read the current state of menuDocumentV2.ts / menuDocumentCss.ts / siteShell.tsx / MenuDesignEditor.tsx before editing so you build on, not clobber, prior work.",
    { label: "impl:" + st.key, phase: st.phase }
  );
  const ok = await gateLoop(
    st.phase,
    gateCmd(st.gate),
    "Subtask " + st.key + " owns: " + st.owns + "."
  );
  log(st.key + ": targeted gate " + (ok ? "GREEN" : "still failing after fix rounds"));
}

phase("504-05");
await agent(
  COMMON +
    "\n\nYOUR SUBTASK = 504-05 (Tests, Docs, Closure). Contract: " +
    T("TASK-504-05-Menu-Styling-Tests-Docs-Closure.md") +
    " (read its matrix + smoke-scenario definitions IN FULL).\n504-01..04 source landed and coupled tests are green. Finish closure:\n- Ensure the FULL regression matrix is green (brand+level round-trips incl. per-device + reject-unknown + fail-closed; CSS depth-selector emission + brand rules + cheap-wins present-only zero-bytes + force-open + byte-identity golden; front aria-current + brand-image no-balloon render; editor brand/level/device controls + font-slider display + items badge; page-editor suites stay green).\n- Docs: menu styling contract in the appropriate doc; changelog PINNED as _docs/_CHANGELOG/1213-...task-504-...md (do NOT take another number; 1214 belongs to the parallel TASK-505) + update _docs/_CHANGELOG/README.md. Board: _docs/_TASKS/README.md — Read FRESH immediately before editing (TASK-505 edits other rows concurrently): move ONLY TASK-504 + 504-01..05 rows to Done, adjust Statistics by exactly the 504 deltas. Update **Status:**/**Completed:** in all six TASK-504* files.\nOnly touch tests + docs + the six TASK-504 files; do NOT re-open source contracts; COLLISION GUARD as above.",
  { label: "impl:504-05", phase: "504-05" }
);
const gate05 = await gateLoop(
  "504-05",
  gateCmd({
    vitest: "menu navigation menuSchemas menu-document menu-design menu-editor site page-editor",
    bun: "tests/unit/menus tests/integration/routes/menus.test.ts tests/unit/site/menu-document-render.test.tsx tests/unit/pages/siteShellCss.test.ts tests/integration/runtime/site-shell-runtime.test.ts",
  }),
  "Closure: tests + docs only."
);
log("504-05: targeted gate " + (gate05 ? "GREEN" : "RED"));

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
const lenses = [
  "STYLING FIDELITY (primary): brand style (text + image) works incl. the IMAGE-mode logo now RENDERING (resolved <img>, no 64->217 balloon); per-level 0/1/2 styling independently changes links + sublist chrome at the RIGHT depth; per-link padding/radius + hover-text + current-page work; ALL per-device (tablet+mobile override + reset); the canvas force-open shows the styled sublist. Flag anything stubbed/partial/wrong.",
  "BYTE-IDENTITY + PRESENT-ONLY: buildSiteShellCss(null) untouched (ZERO diff); a NO-OVERRIDE menu doc emits byte-identical CSS (the 4 cheap-win keys added NO doc-sheet rule when unauthored — present-only verified); nested/level/brand rules doc-scoped only; siteShellCss.ts not modified.",
  "MODEL / FAIL-CLOSED / PER-DEVICE: BRAND_PROP_KEYS + nav block key set extended for every new key (no fail-closed degrade); reject-unknown with path; per-device = tablet+mobile each inherit DESKTOP; level inheritance is CSS cascade not runtime merge; resolveBrandImageSrc has ONE home (menuDocumentV2) imported by 03+04.",
  "PAGES/ITEMS SAFETY + COLLISION: page-editor suites green (504 does not touch PageEditor); the MenuEditorPage badge change is isolated; git diff shows NOTHING under core/services/customScreens/**, core/admin/ui/custom-screens/**, and NO edit to core/services/pages/pageDocumentV2.ts; changelog is 1213; README edits touched only TASK-504 rows.",
  "TEST INTEGRITY: new suites assert VISIBLE-EFFECT (emitted CSS values, resolved brand <img>, level depth selectors, force-open, font-display, badge count) not presence; the brand-image test proves no-balloon; no weakened/deleted assertion; no false-green; the 504-05 smoke section defines >=5 distinct real-flow scenarios.",
];
const auditResults = await parallel(
  lenses.map(
    (lens, i) => () =>
      agent(
        "Post-implementation audit of TASK-504 (implemented on disk). Read the six TASK-504 contracts + the real implemented source (core/services/menus/**, core/site/{menuDocumentCss,siteShell}, core/admin/ui/menus/{MenuDesignEditor,MenuEditorPage}.tsx) + tests. You may run git diff/status. LENS:\n" +
          lens +
          "\nReturn findings[] (real, evidence-backed; empty if clean).",
        {
          label: "audit:" + ["fidelity", "byteid", "model", "safety", "tests"][i],
          phase: "Post-audit",
          schema: AUDIT_SCHEMA,
        }
      )
  )
);
const findings = auditResults.filter(Boolean).flatMap((r) => r.findings || []);
const hm = findings.filter((f) => f.severity === "high" || f.severity === "medium");
if (hm.length > 0) {
  log("Post-audit: " + hm.length + " HIGH/MED -> fixing");
  await agent(
    "Post-impl audit of TASK-504 found these HIGH/MEDIUM issues. Fix each correctly (source or test per the contracts; never weaken tests, never break byte-identity/no-override/present-only/reject-unknown/Pages; COLLISION GUARD: no customScreens/pageDocumentV2 files, no _docs/_TASKS contract reopening).\n" +
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
    { label: "audit-fix", phase: "Post-audit" }
  );
  const g2 = await runGate(
    gateCmd({
      vitest: "menu navigation menu-document menu-design menu-editor site page-editor",
      bun: "tests/unit/menus tests/unit/site/menu-document-render.test.tsx tests/unit/pages/siteShellCss.test.ts",
    }),
    "gate:post-audit",
    "Post-audit"
  );
  log("Post-audit re-gate: " + (g2 && g2.pass ? "GREEN" : "RED"));
}

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
    "FULL runtime SMOKE of implemented TASK-504 menu styling depth — at least 6 DISTINCT real-flow scenarios (owner mandate), driven by the parent Acceptance Criteria + 504-05 smoke section. Use playwright-cli, session -s=wf504smoke on EVERY command; save screenshots to " +
      ROOT +
      "/_docs/_workflows/_smoke/. Assert VISIBLE EFFECT (computed styles/geometry/DOM), not control presence.",
    'SERVER RESTART FIRST (Bun server no hot-reload): ps aux | grep "bun --eval" | grep -v grep => kill the PID, coderso-dev-core-host >/dev/null 2>&1 &, wait ~15s, verify :5173 + :3000 = 200 (else pass:false serverUp:false). Log in; CLICK THROUGH the config wizard if shown. Open a menu + its /design tab.',
    'S1 BRAND: text mode — set brand font size/weight/color, assert computed on the canvas brand + (after publish) the front. Image mode — pick a LOGO, assert the canvas + front render a real <img> (NOT the "Logo"/placeholder) and the header does NOT balloon (height stays ~normal, measure it).',
    "S2 PER-LEVEL: style level 0 (top links) a color; style level 1 (first dropdown) a DIFFERENT link color + a sublist background/border; style level 2 another. Use the Level segmented control; the canvas force-open shows the sublist. Publish; on the front hover About->L2->L3 and assert EACH depth has its own computed color/background (level 1 != level 0 != level 2).",
    "S3 SUBLIST CHROME: the level-1 submenu container shows the authored background/border/radius/shadow/min-width on the front (measure computed), replacing the hardcoded default.",
    "S4 PER-DEVICE: on Tablet + Mobile set a brand/level override, assert Override badge + Reset per breakpoint and the canvas reflects it per device; Desktop stays base; Reset re-inherits live; front at 800px/390px matches.",
    "S5 CHEAP WINS: set per-link paddingX/paddingY/radius (computed on .site-nav-link), hover TEXT color (hover a link, assert text color change), and current-page (the active page link has the current-page style via aria-current). A no-override menu still emits byte-identical (spot check: the default menu header looks unchanged).",
    'S6 BUG FIXES: (B2) the nav Font-size slider at UNSET shows 16/"inherited" not 15; (B3) the items editor "N items" badge on a nested menu (1 root, 4 total) shows the correct total + "item"/"items" grammar. 0 console errors across all pages; dark mode design tab no bg-white break.',
    "Close the session. Return {pass (true iff serverUp AND all scenarios held AND consoleErrors===0), serverUp, scenarios[] (one line per scenario with actual measured results), consoleErrors, screenshots[], failures[]}. Be truthful — report the measured brand image height + the per-level colors + the per-device values.",
  ].join("\n"),
  { label: "smoke:504", phase: "Smoke", schema: SMOKE_SCHEMA }
);
log(
  "Smoke: " +
    (smoke && smoke.pass ? "PASS" : "needs review") +
    " (consoleErrors=" +
    (smoke && smoke.consoleErrors) +
    ", failures=" +
    (smoke && smoke.failures ? smoke.failures.length : "n/a") +
    ")"
);

return {
  targetedGate05: gate05,
  auditHighMed: hm.length,
  auditFindings: findings,
  smoke: smoke,
  note: "Full mandatory gates run once combined after BOTH the 504 and 505 streams land.",
};
