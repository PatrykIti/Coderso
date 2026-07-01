export const meta = {
  name: "task-499-implement",
  description:
    "Implement TASK-499 (Menu items restyle + Design tab, menuDocumentV2 Option B) STRICTLY SEQUENTIALLY in land order A(01)->B(02)->D(04)->C(03)->E(05) (keystone + shared file spine), each subtask gated green, then post-impl drift audit + full gate. In-place on feature/visual.",
  phases: [
    { title: "499-01" },
    { title: "499-02" },
    { title: "499-04" },
    { title: "499-03" },
    { title: "499-05" },
    { title: "Post-audit" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const T = (n) => ROOT + "/_docs/_TASKS/" + n;
const PROTO = ROOT + "/_docs/_PROTOTYPE/src/pages/content/MenuEditorPreview.tsx";

const COMMON = [
  "You implement a TASK-499 (Menu items restyle + Design tab, menuDocumentV2 Option B) subtask on branch feature/visual, IN-PLACE (no worktree). Read your subtask contract file IN FULL first + the parent " +
    T("TASK-499_Menu_Items_Restyle_And_Design_Tab_MenuDocumentV2.md") +
    ".",
  "Design source of truth for PART 1 (items editor) = the PROTOTYPE SOURCE " +
    PROTO +
    " (three-pane items editor). PART 2 (Design tab) reuses the Pages editor shell core/admin/ui/shared/CanvasEditor.tsx exactly like Pages.",
  "HARD RULES (AGENTS.md + owner-established):",
  '- Prototype-faithful, do NOT keep the OLD approach: the compact MenuItemRow drops the letter-avatar + the "Sub-item of X" text (bare size-4 GripVertical + CornerDownRight + pl-8, url-only subline); keep DnD/keyboard/drop-line BEHAVIOR + a11y markers byte-stable (only pure-visual assertions change). EditorFrame IMPORTS the shared core/admin/ui/shared/EditorRail.tsx (does NOT redefine EditorRailGroup/EditorRailItem).',
  "- Schema-first: own schemas/enums/defaults/normalize* in the service/validation module; reject-unknown (incl. cross-subset props BEFORE any pick()); menuDocumentV2 is a NEW contract with its own MENU_DOCUMENT_SCHEMA_VERSION; non-destructive legacy adapter + fail-closed read. Route modules stay orchestration-only; map domain errors via mapMenuError (add an isMenuDocumentError branch emitting a path-keyed shape).",
  "- Byte-identity invariant: buildSiteShellCss(null) via tests/unit/pages/siteShellCss.test.ts must NOT change (ZERO lines). Menu-native variant button styling must use inline style/data-attr, NOT edits to buildSiteShellCss. Document CSS is scoped under [data-site-menu-doc]; base-only head emission when a document is active.",
  '- Retiring PageEditor mode==="menu": AUDIT FIRST with grep -an (PageEditor.tsx reads as binary to rg) then delete ALL useLegacyChrome/panelTone/useBuilderChrome CONDITIONALS (~17 sites), collapsing useBuilderChrome to always-true; narrow pageEditorHostContract mode union to ["page","page-template"]. Leave mode-independent classes (e.g. the :3181 drag-dot) untouched.',
  "- Use shared canonical admin helpers (adminPaths/AdminLink/prefetch). No route/RBAC/endpoint change beyond the menuRoutes mapMenuError branch. Large files read as binary to rg — use Read + grep -an, NEVER rg.",
  "- Touch ONLY the files your subtask owns (listed below). Do NOT edit _docs/_TASKS/* (except 499-05 which owns README/changelog). Keep the menu gate GREEN after your change: re-point/add exactly the tests your change requires (per 499-05 test plan); never weaken a functional/behavior assertion.",
  "Return a concise summary: files edited, new/changed public contract signatures, which tests you re-pointed/added, and any deviation from the contract with the reason.",
].join("\n");

// land order A(01) -> B(02) -> D(04) -> C(03) -> E(05); E handled as its own phase after the source subtasks
const SUBTASKS = [
  {
    key: "499-01",
    phase: "499-01",
    file: "TASK-499-01-Menu-Items-Editor-Restyle.md",
    owns: "core/admin/ui/shared/EditorFrame.tsx (NEW), core/admin/ui/shared/EditorRail.tsx (extend), core/admin/ui/menus/{MenuEditorPage,MenuItemRow,MenuItemForm,MenuItemDrawer,MenuTree}.tsx, core/services/menus/menuItemSettings.ts, core/services/navigation/navigationMenuMapping.ts, core/widgets/core/navigation.tsx, core/server/validation/menuSchemas.ts (OWNS — B appends document later), core/site/siteShell.tsx (OWNS — D appends later)",
    brief:
      'PART 1: three-pane EditorFrame chrome (chrome bar + typed Add-items rail + dotted canvas + always-on Item-settings inspector) faithful to the prototype; compact MenuItemRow (bare size-4 grip, NO avatar, NO "Sub-item of X" text, CornerDownRight + pl-8, mono url subline) keeping DnD/keyboard/a11y; add openInNewTab + variant fail-soft fields end-to-end (menuItemSettings + menuSchemas menuItemsSchema settings allowlist += openInNewTab/variant, still reject-unknown; navigationMenuMapping openInNewTab->target=_blank rel; navigation.tsx variant button class; siteShell SiteNavItem button class via inline style/data-attr, NOT buildSiteShellCss). CRITICAL crux: EditorRail.tsx div-branch drops {...rest} + has no disabled: variants — route disabled/title items to the <button> branch (render <button> when disabled OR title present), forward disabled+aria-disabled+title, add disabled:pointer-events-none disabled:opacity-50; add the EditorFrame render test asserting a handler-less disabled+title item is a dimmed control surfacing the title.',
  },
  {
    key: "499-02",
    phase: "499-02",
    file: "TASK-499-02-MenuDocumentV2-Contract-And-Persistence.md",
    owns: "core/services/menus/menuDocumentV2.ts (NEW), core/services/menus/normalizeMenuAppearance.ts, core/services/menus/menuService.ts, core/server/routes/menuRoutes.ts (+ appends menuUpdateSchema document to the A-owned menuSchemas.ts)",
    brief:
      "KEYSTONE: NEW menuDocumentV2 (own enums + MENU_DOCUMENT_SCHEMA_VERSION + strict write / fail-closed read / non-destructive legacy adapter / resolvers). Enforce reject-unknown incl. cross-subset props: after normalizeMenuAppearance, assert the raw input has NO keys outside the intended per-block subset (throw MenuDocumentError with a path of form block-path.offendingKey) BEFORE pick(). Per-key envelope merge/publish in menuService; type-only MenuSettings.document. Route: add isMenuDocumentError branch to menuRoutes.ts mapMenuError emitting a path-keyed 4xx (menu_document_invalid), and widen the PATCH body cast to include document?: unknown for type-clarity. Use Record<string,unknown> for button props (no fictional PageButtonProps). Tests: NEW tests/vitest/services/menu-document-v2.test.ts (write-strict/read-failclosed/leaf-reuse/version/legacy-adapter), tests/vitest/validation/menuSchemas.test.ts (accepts document, still reject-unknown), and the bun suites tests/unit/menus/menuService.test.ts (per-key merge; document-ONLY PATCH guard) + tests/integration/routes/menus.test.ts (PATCH document round-trip + NEW 400 menu_document_invalid path case).",
  },
  {
    key: "499-04",
    phase: "499-04",
    file: "TASK-499-04-Menu-Front-Renderer-And-Default-Fallback.md",
    owns: "core/site/menuDocumentCss.ts (NEW), core/site/pageRuntimeV2.tsx, core/site/renderPublicPage.tsx, core/server/publicSite.tsx (+ appends SiteHeaderMenuDocumentRender + SiteShellRenderProps.navigationDocument to the A-owned siteShell.tsx)",
    brief:
      'FRONT: SiteHeaderMenuDocumentRender + navigationDocument shell field; scoped menuDocumentCss with BOTH a viewport buildMenuDocumentCss AND a device-forced buildMenuDocumentPreviewCss (the latter is a hard prerequisite of lane C 499-03 in-canvas preview). DefaultRuntimePageShellV2 document-vs-default branch; renderPublicPage hasSiteShell/base-only head-CSS gate. PRESERVE byte-identity of buildSiteShellCss(null). openInNewTab links render target=_blank rel="noopener noreferrer". menu-drawer section is intentionally NOT front-rendered yet (mobile handled by menu-bar CSS @media disclosure) — note it. Tests: NEW tests/unit/site/menu-document-render.test.tsx (golden + nesting + openInNewTab + scoped CSS override actually overrides the base sheet), tests/vitest/site/page-runtime-shell-branch.test.tsx (doc-vs-default + head-CSS gate), tests/integration/runtime/site-shell-runtime.test.ts (default/legacy markup + variant:button render), and tests/unit/pages/siteShellCss.test.ts stays byte-identical (ZERO edits).',
  },
  {
    key: "499-03",
    phase: "499-03",
    file: "TASK-499-03-Menu-Design-Tab-Shared-Shell-Editor.md",
    owns: "core/admin/ui/menus/{MenuDesignEditor,MenuDesignEditorPage}.tsx, core/admin/services/menusClient.ts, core/admin/ui/pages/PageEditor.tsx, core/admin/ui/pages/editor/pageEditorHostContract.ts",
    brief:
      'DESIGN TAB: thin MenuDesignEditor over CanvasEditor + editorControls/* (NOT the legacy dark panel); undo/redo as a SINGLE useReducer atom (not nested setState reading a stale doc closure); DeviceSwitcher + Hide/Show panel. Drop the PageEditor menu host: AUDIT FIRST (grep -an) then remove ALL ~17 useLegacyChrome/panelTone/useBuilderChrome CONDITIONALS + both EditorControlToneContext dark-tone providers, collapse useBuilderChrome to always-true; leave mode-independent classes (the :3181 dot) untouched. Narrow pageEditorHostContract mode union to ["page","page-template"]. menusClient.updateMenu forwards document. RETIRE/REWRITE the pre-existing tests/vitest/ui/menu-design-editor-flow.test.tsx into the NEW tests/vitest/ui/menu-design-editor.test.tsx; update tests/vitest/pages/page-editor-host-contract.test.ts (mode union) + tests/vitest/admin/menusClient.test.ts (forwards document).',
  },
];

// ---- gate helpers ----
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
const ENV = "set -a && { [ ! -f .env ] || . ./.env; } && set +a && ";
const MENU_VITEST =
  ENV +
  "NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts menu navigation page-editor-host page-runtime-shell 2>&1 | tail -70";
const MENU_GATE =
  "cd " + ROOT + " && bun --cwd core lint:types && bun --cwd core lint && " + MENU_VITEST;
const MENU_BUN =
  ENV +
  "bun test tests/unit/menus tests/integration/routes/menus.test.ts tests/integration/runtime/site-shell-runtime.test.ts tests/unit/site/menu-document-render.test.tsx tests/unit/pages/siteShellCss.test.ts 2>&1 | tail -60";
const ROOT_TSC =
  "cd " + ROOT + " && ./node_modules/.bin/tsc -p tsconfig.json --noEmit 2>&1 | tail -30";

async function runGate(cmd, label, ph) {
  return await agent(
    "Run from " +
      ROOT +
      " and report — do NOT edit anything:\n" +
      cmd +
      "\nReturn {pass, summary, errors}. pass=true ONLY if every command exits 0 / the vitest|bun run reports 0 failed. List each distinct error/failure with file:line in errors[] (cap ~40).",
    { label: label, phase: ph, schema: GATE_SCHEMA }
  );
}
async function gateLoop(ph, cmd, fixContext) {
  let g = await runGate(cmd, "gate:" + ph + ":1", ph);
  let r = 1;
  while (g && !g.pass && r <= 3) {
    log(ph + " gate round " + r + ": " + g.errors.length + " issues -> fixing");
    await agent(
      "TASK-499 " +
        ph +
        ": the gate FAILS after implementation. Fix CORRECTLY — prefer fixing the SOURCE when it diverged from the contract; re-baseline a TEST only for an intended contract update per the 499-05 plan (never weaken a behavior/a11y assertion, never break the buildSiteShellCss(null) byte-identity, keep reject-unknown). " +
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

// ---- Phases 1-4: sequential source subtasks in land order ----
for (const st of SUBTASKS) {
  phase(st.phase);
  await agent(
    COMMON +
      "\nYOUR SUBTASK = " +
      st.key +
      ". Contract file: " +
      T(st.file) +
      ". Files you own: " +
      st.owns +
      ".\n" +
      st.brief +
      "\n\nThis runs SEQUENTIALLY after the prior subtask already landed on disk — read the current state of the shared files (EditorRail.tsx, menuSchemas.ts, siteShell.tsx, menuDocumentV2.ts, menuDocumentCss.ts) before editing so you build on, not clobber, prior work.",
    { label: "impl:" + st.key, phase: st.phase }
  );
  const ok = await gateLoop(st.phase, MENU_GATE, "Subtask " + st.key + " owns: " + st.owns + ".");
  log(st.key + ": menu gate " + (ok ? "GREEN" : "still failing after fix rounds"));
}

// ---- Phase 5: 499-05 tests / docs / closure + FULL gate (vitest + bun + root tsc) ----
phase("499-05");
await agent(
  COMMON +
    "\nYOUR SUBTASK = 499-05 (Tests, Docs, Closure). Contract: " +
    T("TASK-499-05-Menu-Tests-Docs-Closure.md") +
    '.\n499-01/02/04/03 source has landed and their coupled tests are green. Finish closure:\n- Ensure the FULL regression matrix is green: menu-editor, menu-editor-shell-wave (re-point Add-Item at typed rail item, drop "Menu Structure" heading assert, keep operations toEqual), menu-item-row (behavior/a11y ZERO edits; REMOVE the grip-box/avatar/"Sub-item of Home" pure-visual asserts), menu-tree (DnD+keyboard, do not weaken), menu-item-form (NO switch in MenuItemForm stays green), the NEW menu-design-editor.test.tsx (menu-design-editor-flow.test.tsx retired by 499-03), menu-document-v2, validation/menuSchemas, page-editor-host-contract (mode union), menusClient, navigation + navigation-editor-wave (exact meta toEqual stays green via default variant omission), menu-list-page-actions, plus the bun suites (menuService per-key merge + document-ONLY PATCH guard; menus route PATCH document round-trip + NEW 400 menu_document_invalid; site-shell-runtime default/legacy + variant button; siteShellCss byte-identity ZERO lines).\n- Docs: add a _docs/_CHANGELOG/ entry (next free number) linking TASK-499 + 499-01..05 (three-pane items editor + compact row, menuDocumentV2 Option B contract + persistence, Design tab on the shared CanvasEditor shell + PageEditor menu-host retirement, front renderer + non-destructive default fallback, openInNewTab + variant fields) and update _docs/_CHANGELOG/README.md. Update _docs/_TASKS/README.md board rows for TASK-499 + 499-01..05 to closure status AND the Statistics block (OWNS the stats change). Reconcile parent Priority vs README board.\nOnly touch tests + docs; do NOT re-open source contracts.',
  { label: "impl:499-05", phase: "499-05" }
);
const gate05 = await gateLoop("499-05", MENU_GATE, "Final closure: tests + docs only.");
const bunG = await runGate(MENU_BUN, "gate:499-05:bun", "499-05");
const tcRoot = await runGate(ROOT_TSC, "gate:499-05:root-tsc", "499-05");
log(
  "499-05: menu vitest " +
    (gate05 ? "GREEN" : "RED") +
    "; bun " +
    (bunG && bunG.pass ? "GREEN" : "RED") +
    "; root tsc " +
    (tcRoot && tcRoot.pass ? "GREEN" : "RED")
);

// ---- Phase 6: post-implementation drift audit ----
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
  "PROTOTYPE-FIDELITY / NO-INVENTED-DEVIATIONS (primary): compare the IMPLEMENTED menu items editor vs the prototype " +
    PROTO +
    '. Three-pane EditorFrame? compact MenuItemRow (bare size-4 grip, NO avatar, NO "Sub-item of X", CornerDownRight+pl-8)? Design tab on the shared CanvasEditor shell (NOT the bg-slate-950 legacy dark panel)? Flag any kept-old-approach or undocumented deviation.',
  "MODEL / SCHEMA-FIRST: menuDocumentV2 owns its enums + version, reject-unknown incl. cross-subset props BEFORE pick, fail-closed read, non-destructive legacy adapter; menuRoutes mapMenuError has the isMenuDocumentError path branch (no generic 500). Flag any contract-logic duplication or reject-unknown hole.",
  "BYTE-IDENTITY / NON-DESTRUCTIVE: buildSiteShellCss(null) unchanged (tests/unit/pages/siteShellCss.test.ts ZERO lines); document CSS scoped under [data-site-menu-doc]; empty/cleared Design => default header byte-identical; legacy menus still render. Flag any regression of the default front header.",
  "PAGEEDITOR MENU-HOST RETIREMENT: ALL useLegacyChrome/panelTone/useBuilderChrome conditionals removed (no stray refs), useBuilderChrome collapsed to always-true, mode union narrowed to [page,page-template], and Pages/Page-Template editors still render correctly (no accidental Pages regression). Flag any leftover legacy branch or Pages breakage.",
  "BEHAVIOR / A11Y / TEST-INTEGRITY: DnD (nest/before/after) + keyboard indent/outdent/move + drop-line markers preserved; openInNewTab reachable in both >=xl inline pane AND <xl Sheet; re-baselined tests re-pointed only pure-visual assertions (behavior/a11y byte-stable, no weakening, no false-green); the retired menu-design-editor-flow suite is replaced not orphaned.",
];
const auditResults = await parallel(
  lenses.map(
    (lens, i) => () =>
      agent(
        "Post-implementation audit of TASK-499 (implemented on disk). Read the five TASK-499 subtask contracts + the parent + the real implemented source under core/admin/ui/menus/**, core/services/menus/**, core/server/{routes,validation}/menu*, core/site/**, core/admin/ui/pages/PageEditor.tsx + the re-baselined tests. LENS:\n" +
          lens +
          "\nReturn findings[] (real, evidence-backed; empty if clean).",
        {
          label: "audit:" + ["proto", "model", "byteid", "pageeditor", "behavior"][i],
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
    "Post-impl audit of TASK-499 found these HIGH/MEDIUM issues. Fix each correctly (source or test per the contracts; never weaken behavior/a11y tests, never break buildSiteShellCss(null) byte-identity, keep reject-unknown; no dead code / no orphaned suite). Do NOT touch _docs/_TASKS contracts.\n" +
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
  const g2 = await runGate(MENU_GATE, "gate:post-audit:vitest", "Post-audit");
  const b2 = await runGate(MENU_BUN, "gate:post-audit:bun", "Post-audit");
  const t2 = await runGate(ROOT_TSC, "gate:post-audit:root-tsc", "Post-audit");
  log(
    "Post-audit gate: vitest " +
      (g2 && g2.pass ? "GREEN" : "RED") +
      "; bun " +
      (b2 && b2.pass ? "GREEN" : "RED") +
      "; root tsc " +
      (t2 && t2.pass ? "GREEN" : "RED")
  );
}

return {
  menuVitest: gate05,
  menuBun: bunG && bunG.pass,
  rootTsc: tcRoot && tcRoot.pass,
  auditHighMed: hm.length,
  auditFindings: findings,
};
