export const meta = {
  name: "task-502-implement",
  description:
    "Implement TASK-502 (Menu Design fixes v2: brand text, tablet cascade un-defer, device-scoped controls, canvas site-token WYSIWYG, vertical separators, CTA visibility ghost + options, recursive nested submenus) STRICTLY SEQUENTIALLY 502-01->02->03->04->05, targeted gates per subtask, post-audit, scope-driven >=5-scenario playwright smoke. NO full-gates phase (combined run after 502+503). Collision-guarded against the parallel TASK-503 (custom-screens territory forbidden; changelog pinned 1211; README = 502 rows only).",
  phases: [
    { title: "502-01" },
    { title: "502-02" },
    { title: "502-03" },
    { title: "502-04" },
    { title: "502-05" },
    { title: "Post-audit" },
    { title: "Smoke" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const T = (n) => ROOT + "/_docs/_TASKS/" + n;
const ENV = "set -a && { [ ! -f .env ] || . ./.env; } && set +a && ";
const PARENT = T("TASK-502_Menu_Design_Fixes_V2_Brand_Tablet_Canvas_Nesting.md");

const COMMON = [
  "You implement a TASK-502 (Menu Design Fixes V2) subtask on branch feature/visual, IN-PLACE (no worktree). Read your subtask contract file IN FULL first (execution-ready pseudocode, verified anchors) + the parent " +
    PARENT +
    " (its Contract sketch is NORMATIVE).",
  "HARD RULES (AGENTS.md + owner-established):",
  "- Tablet cascade mirrors Pages EXACTLY: desktop=base; tablet AND mobile each carry their own sparse responsive record; BOTH inherit from DESKTOP (mobile does NOT inherit tablet). Device-DEFINING controls (mobileMode, dropdownDirection) write to the BASE on every device (no override records) and are device-scope-visible only (mobileMode: mobile-only; dropdownDirection: desktop/tablet-only).",
  "- Schema-first, reject-unknown; the CONSCIOUS fail-closed read trap (extend key lists or a saved override degrades the whole stored doc). Legacy docs + mobile-only-override docs round-trip byte-identically.",
  "- BYTE-IDENTITY INVIOLABLE: core/site/siteShellCss.ts is NOT touched; buildSiteShellCss(null) byte-identical (tests/unit/pages/siteShellCss.test.ts ZERO edits); a menu doc with NO overrides emits byte-identical CSS to pre-502. Nested-sublist + divider + tablet rules live ONLY in the doc-scoped menuDocumentCss builder (front @media + canvas flatten from ONE buildMenuRuleSets).",
  "- Nested submenus: the DATA is already recursive; fix the RENDER only. Front recursion + doc-scoped nested-hover CSS; canvas recursion; mobile = indented inline (no fly-out).",
  "- React hooks rules: device-forked writes in event handlers; no setState-in-effect. The PageEditor hook adoption (502-04) MUST be behavior-identical (extract-and-import, not a rewrite) — Pages editor stays byte-behavior-identical.",
  "- Large files read as binary to rg (MenuDesignEditor.tsx, menuDocumentV2.ts, siteShell.tsx, PageEditor.tsx) — use Read + grep -an, NEVER rg.",
  "- COLLISION GUARD (a parallel TASK-503 Screens stream runs in this tree): do NOT touch core/services/customScreens/**, core/admin/ui/custom-screens/**, or any TASK-503 file. Do NOT edit core/services/pages/pageDocumentV2.ts (read-only reference). Do NOT edit _docs/_TASKS/* or _docs/_CHANGELOG/* (only 502-05 owns docs). 502-05 README rule: Read _docs/_TASKS/README.md FRESH immediately before editing and change ONLY the TASK-502 rows + 502 Statistics deltas.",
  "- Touch ONLY the files your subtask owns (single-writer per the parent File-ownership block). Keep the targeted gate GREEN: re-point/add exactly the tests your change requires (per the 502-05 matrix); never weaken a functional/behavior assertion.",
  "Return a concise summary: files edited, new/changed public contract signatures, tests re-pointed/added, deviations with reasons.",
].join("\n");

const SUBTASKS = [
  {
    key: "502-01",
    phase: "502-01",
    file: "TASK-502-01-Menu-Model-Brand-Text-And-Tablet-Breakpoint.md",
    owns: "core/services/menus/menuDocumentV2.ts (ONLY; verify normalizeMenuAppearance needs no change)",
    brief:
      'MODEL KEYSTONE: (a) brand.props.text — add to BrandProps + BRAND_PROP_KEYS; normalizeBrandProps accepts a trimmed, length-capped, SPARSE text (omit when empty); (b) tablet breakpoint — MENU_RESPONSIVE_BREAKPOINT_KEYS += "tablet"; section responsive (layout/navProps) + block responsive (visibility) accept "tablet" like "mobile"; generalize resolve/patch/clear helpers to a device param (desktop=base; tablet+mobile each merge their own record over the DESKTOP base); (c) device-defining carve-out: mobileMode + dropdownDirection are BASE-only (never stored in a responsive record) — the model must prune/ignore any responsive.{mobile,tablet}.navProps.{mobileMode,dropdownDirection} on read (non-destructive) so the 501 dead-override residual cannot persist. Byte-identical round-trip for legacy + mobile-only docs. Extend the vitest service tests (brand.text accept/reject; tablet round-trip + reject-unknown; carve-out pruning; resolve merge for tablet).',
    gate: {
      vitest: "menu-document menuSchemas normalizeMenuAppearance menu",
      bun: "tests/unit/pages/siteShellCss.test.ts",
    },
  },
  {
    key: "502-02",
    phase: "502-02",
    file: "TASK-502-02-Menu-CSS-Tablet-Branch-Separators-And-Nested-Sublists.md",
    owns: "core/site/menuDocumentCss.ts (ONLY; SEQUENTIAL after 502-01)",
    brief:
      "CSS: (a) bounded tablet @media (pageResponsiveMediaBounds.tablet) on the front + a device-forced TABLET branch in buildMenuDocumentPreviewCss (canvas stops mapping tablet=>desktop); tablet delta rules emitted like mobile from the shared buildMenuRuleSets; (b) vertical divider context rule inside the doc-scoped sheet (a divider block inside .site-header-inner renders width:1px / height ~1.5em / self-center — NOT the ~4px block); (c) nested-sublist fly-out rules for .site-nav-sublist .site-nav-sublist (position/offset/hover) emitted ONLY from the doc-scoped builder — byte-identity of buildSiteShellCss(null) inviolable; mobile branch = nested-inline indent (no fly-out); (d) canvas disclosure preview: in buildMenuDocumentPreviewCss mobile branch, suppress the mobileMode disclosure display:none so the Mobile canvas actually previews the nav list (front @media unchanged). Golden byte-identity test for a no-override doc + tests for tablet/divider/nested emission.",
    gate: {
      vitest: "menu-document menuDocumentCss menu site",
      bun: "tests/unit/site/menu-document-render.test.tsx tests/unit/pages/siteShellCss.test.ts tests/integration/runtime/site-shell-runtime.test.ts",
    },
  },
  {
    key: "502-03",
    phase: "502-03",
    file: "TASK-502-03-Front-Recursive-Nav-And-Brand-Render.md",
    owns: "core/site/siteShell.tsx (SOLE WRITER; SEQUENTIAL after 502-02)",
    brief:
      "FRONT: (a) recursive SiteNavItem — DELETE flattenNavigationDescendants + the [item, ...dropdownItems] parent-duplication; each level renders its own .site-nav-sublist with the parent as its own link/label; keep a recursive <details> legacy/mobile fallback per the contract; nested levels nest properly (About > child > grandchild = one level per hover, no duplicate parent). (b) BrandRender text mode chain: block.props.text?.trim() || siteName (return null if neither). menuLeafToPageBlock stays module-private. NO markup/class change beyond the recursion (so buildSiteShellCss stays untouched). Tests: menu-document-render recursive nesting + brand chain + no-duplicate-parent; site-shell-runtime markup.",
    gate: {
      vitest: "menu-document menu site navigation",
      bun: "tests/unit/site/menu-document-render.test.tsx tests/integration/runtime/site-shell-runtime.test.ts tests/unit/pages/siteShellCss.test.ts",
    },
  },
  {
    key: "502-04",
    phase: "502-04",
    file: "TASK-502-04-Design-Editor-Canvas-WYSIWYG-And-Device-Controls.md",
    owns: "core/admin/ui/menus/MenuDesignEditor.tsx + core/admin/ui/menus/MenuAppearancePanel.tsx (if mounted) + core/ui/theme/tokenCss.ts + core/admin/ui/shared/useCanvasSiteTokens.ts (NEW, extracted from PageEditor) + core/admin/ui/pages/PageEditor.tsx (adopt the shared hook, BEHAVIOR-IDENTICAL). SEQUENTIAL after 502-03.",
    brief:
      'EDITOR: (a) canvas site-token WYSIWYG — extract useCanvasSiteTokens.ts from PageEditor.tsx:380-411 (and have PageEditor import it, behavior-identical), add toMenuCanvasColorCssVariableMap to tokenCss.ts, paint the site token vars inline on the menu canvas frame + pass the site-resolved palette to ColorSwatchControl so preset swatches render their REAL colors (fixes the beige-instead-of-green bug); (b) visibility ghost — gate every canvas block through resolveMenuBlockVisibleForDevice(block, device) and render hidden blocks as a dimmed selectable ghost (opacity + "Hidden" badge) instead of skipping; (c) brand Text-mode Input writing props.text (canvas brand renders the same text||siteName chain, not menuName); (d) cta-button panel surfaces the validated leaf props missing today (size + target at minimum; verify vs the page button allow-list) with a real cta preview; (e) device-scoped controls: mobileMode visible only device===mobile; dropdownDirection only desktop/tablet; BOTH base-writing (remove their MenuResponsiveControlShell wraps); (f) tablet device-forked writes + Base/Override/Inherited badges + Reset per breakpoint (desktop/tablet/mobile); (g) recursive NavItemsPreview (nested sublists on canvas) + vertical divider preview + the disclosure-preview so Mobile canvas shows the nav list. Tests: MenuDesignEditor suites for tokens/ghost/brand/cta/device-scoping/tablet/recursion; page-editor suites stay green (hook adoption behavior-identical).',
    gate: {
      vitest: "menu-design menu-document menu page-editor navigation",
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
      "TASK-502 " +
        ph +
        ": the targeted gate FAILS. Fix CORRECTLY — prefer fixing the SOURCE when it diverged from the contract; re-baseline a TEST only for an intended contract update per the 502-05 matrix (never weaken a behavior assertion, never break buildSiteShellCss(null) byte-identity or the legacy/mobile-only round-trip, keep reject-unknown, no Pages regression). COLLISION GUARD: do NOT touch core/services/customScreens/**, core/admin/ui/custom-screens/**, core/services/pages/pageDocumentV2.ts, _docs/**. " +
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

phase("502-05");
await agent(
  COMMON +
    "\n\nYOUR SUBTASK = 502-05 (Tests, Docs, Closure). Contract: " +
    T("TASK-502-05-Menu-Fixes-Tests-Docs-Closure.md") +
    ' (read its matrix + smoke-scenario definitions IN FULL).\n502-01..04 source landed and coupled tests are green. Finish closure:\n- Ensure the FULL regression matrix is green (model tablet+brand round-trips + carve-out; CSS tablet branch + separators + nested sublists + disclosure preview + golden byte-identity; front recursive nesting + brand chain + no-duplicate-parent; editor tokens/ghost/brand/cta/device-scoping/tablet/recursion; bun: menus routes, site-shell-runtime, menu-document-render, siteShellCss byte-identity ZERO edits, page-editor suites green).\n- Docs: changelog PINNED as _docs/_CHANGELOG/1211-...task-502-...md (do NOT take another number) + update _docs/_CHANGELOG/README.md. Correct the pre-existing 1210 "menus routes 39/39" line to "11/11" (owner-noted). Board: _docs/_TASKS/README.md — Read FRESH immediately before editing (TASK-503 edits other rows concurrently): move ONLY the TASK-502 + 502-01..05 rows to Done, adjust Statistics by exactly the 502 deltas. Update **Status:**/**Completed:** in all six TASK-502* files.\nOnly touch tests + docs + the six TASK-502 files; do NOT re-open source contracts; COLLISION GUARD as above.',
  { label: "impl:502-05", phase: "502-05" }
);
const gate05 = await gateLoop(
  "502-05",
  gateCmd({
    vitest: "menu navigation menuSchemas menu-document menu-design site page-editor",
    bun: "tests/unit/menus tests/integration/routes/menus.test.ts tests/unit/site/menu-document-render.test.tsx tests/unit/pages/siteShellCss.test.ts tests/integration/runtime/site-shell-runtime.test.ts",
  }),
  "Closure: tests + docs only."
);
log("502-05: targeted gate " + (gate05 ? "GREEN" : "RED"));

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
  "BUG-FIX FIDELITY (primary): each of the 7 owner bugs is actually FIXED per the parent Acceptance Criteria — brand text editable + canvas/front agree; tablet is a real 3rd breakpoint (desktop base, tablet+mobile override, both inherit desktop); mobileMode/dropdownDirection device-scoped + base-only (no dead override); color swatches render REAL site-token colors on the canvas; divider is a vertical separator; CTA visibility ghost + size/target options; nested submenus render one-level-per-hover with NO duplicate parent (front AND canvas). Flag anything stubbed/partial/wrong.",
  "BYTE-IDENTITY + NESTED-CSS SAFETY: buildSiteShellCss(null) untouched (test file ZERO diff); no-override doc CSS byte-identical; nested-sublist + divider + tablet rules emitted ONLY from the doc-scoped builder (siteShellCss.ts not modified); the audit must confirm nested levels actually STYLE correctly on default menus without a base-sheet edit.",
  "MODEL / FAIL-CLOSED: key lists extended for tablet everywhere; reject-unknown on breakpoint/group/prop with MenuDocumentError path; carve-out prunes dead mobileMode/dropdownDirection overrides non-destructively; legacy + mobile-only docs byte-identical; tablet cascade = mobile-inherits-DESKTOP (not tablet).",
  "PAGES SAFETY + COLLISION: useCanvasSiteTokens extraction is behavior-identical (PageEditor renders/behaves the same — page-editor suites green, no visual/logic drift); git diff shows NOTHING under core/services/customScreens/**, core/admin/ui/custom-screens/**, and NO edit to core/services/pages/pageDocumentV2.ts; changelog is 1211; README edits touched only TASK-502 rows.",
  "TEST INTEGRITY: new suites assert the fixes with VISIBLE-EFFECT (computed/emitted values, not presence); the smoke section in 502-05 defines >=5 distinct real-flow scenarios; no weakened/deleted behavior assertion; no false-green.",
];
const auditResults = await parallel(
  lenses.map(
    (lens, i) => () =>
      agent(
        "Post-implementation audit of TASK-502 (implemented on disk). Read the six TASK-502 contracts + the real implemented source (core/services/menus/**, core/site/{menuDocumentCss,siteShell}, core/admin/ui/menus/MenuDesignEditor.tsx, core/admin/ui/shared/useCanvasSiteTokens.ts, core/ui/theme/tokenCss.ts, core/admin/ui/pages/PageEditor.tsx) + tests. You may run git diff/status. LENS:\n" +
          lens +
          "\nReturn findings[] (real, evidence-backed; empty if clean).",
        {
          label: "audit:" + ["fidelity", "byteid", "model", "pages", "tests"][i],
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
    "Post-impl audit of TASK-502 found these HIGH/MEDIUM issues. Fix each correctly (source or test per the contracts; never weaken tests, never break byte-identity/legacy round-trip/reject-unknown/Pages behavior; COLLISION GUARD: no customScreens/pageDocumentV2 files, no _docs/_TASKS contract reopening).\n" +
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
      vitest: "menu navigation menu-document menu-design site page-editor",
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
    "FULL runtime SMOKE of the implemented TASK-502 menu design fixes — at least 5 DISTINCT real-flow scenarios (owner mandate), driven by the parent Acceptance Criteria + the 502-05 smoke section (read both). Use playwright-cli, session -s=wf502smoke on EVERY command; save screenshots to " +
      ROOT +
      "/_docs/_workflows/_smoke/. Assert VISIBLE EFFECT (computed styles / DOM structure), not control presence.",
    'SERVER RESTART FIRST (Bun server code does NOT hot-reload): ps aux | grep "bun --eval" | grep -v grep => kill the PID, coderso-dev-core-host >/dev/null 2>&1 &, wait ~15s, verify http://coderso-a.localhost:5173/admin/ AND http://coderso-a.localhost:3000/ = 200 (else pass:false serverUp:false). Log in (set -a && . ./.env; set +a; $ADMIN_EMAIL/$ADMIN_PASSWORD); if the first-run config wizard appears (a full test run reset it), CLICK THROUGH it. Open the menu, its /design tab.',
    "SCENARIO 1 (brand text): click the brand block; set a custom Brand text; assert the CANVAS brand shows THAT text (not the menu name); clear it; assert it falls back to the site name. Save+Publish; on :3000 assert the header brand shows the same.",
    "SCENARIO 2 (color WYSIWYG): select the nav-items block; pick a GREEN (Secondary) Link color swatch; assert getComputedStyle(.site-nav-link).color inside the canvas is an actual green (NOT the beige admin token) — measure the rgb.",
    "SCENARIO 3 (tablet+mobile cascade + reset): switch DeviceSwitcher Desktop->Tablet, override item gap/color; ->Mobile, override orientation=vertical + hide the CTA; assert each shows an Override badge + Reset and the canvas reflects it PER device; Desktop stays base; Reset on the tablet override flips Override->Inherited live. Assert mobileMode control is visible ONLY on Mobile and dropdownDirection ONLY on Desktop/Tablet.",
    'SCENARIO 4 (deep nesting, THE hard one): in the items editor build About -> child "L2" -> grandchild "L3" (indent). Save+Publish + assign as the site nav if needed. On :3000 assert the rendered nav has About with ONE sublist containing L2 (no duplicate About), and L2 has its OWN nested sublist containing L3 (one level per hover) — verify the DOM sublist nesting depth === structure, NOT a flattened single level. Also assert the Design canvas NavItemsPreview shows the same nested structure.',
    'SCENARIO 5 (divider + CTA options + visibility ghost): add a Divider between two nav items; assert it renders as a VERTICAL line (computed width ~1px, height > 1em) in the horizontal bar, not a 4px block. Add/select the CTA button; set size + target options; toggle Visible off on Desktop => assert it becomes a dimmed "Hidden" GHOST on the canvas (still selectable) and is absent on the :3000 desktop header.',
    "SCENARIO 6 (front cross-device parity): on :3000 at 1280px (desktop base), 800px (tablet override), 390px (mobile override) assert each viewport reflects the right breakpoint appearance + visibility; 0 console errors across all admin + front pages.",
    "Close the session. Return {pass (true iff serverUp AND all scenarios held AND consoleErrors===0), serverUp, scenarios[] (one line per scenario with the actual result), consoleErrors, screenshots[], failures[]}. Be truthful — report what actually rendered/happened, especially the nesting depth and the measured swatch color.",
  ].join("\n"),
  { label: "smoke:502", phase: "Smoke", schema: SMOKE_SCHEMA }
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
  note: "Full mandatory gates (bun run test + precommit + gates:coderso + gates:coderso:security + scan:security) intentionally NOT run here — combined final run after BOTH the 502 and 503 streams land.",
};
