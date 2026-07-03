export const meta = {
  name: "task-506-implement",
  description:
    "Implement TASK-506 (Menu modern styling: F1 base-record reset-to-default + F2 visible resolved-default/inherited hint on EVERY control; 5 bundles B1 item separators, B2 hover/active underline indicator, B3 caret toggle + flyout animation, B4 pill nav + dropdown padding, B5 nested submenu placement right/bottom/left; all per-level 0/1/2 + per-device) STRICTLY SEQUENTIALLY 506-01->02->03->04->05, targeted gates per subtask, post-audit, scope-driven >=6-scenario playwright smoke. NO full-gates phase (combined run later). Changelog pinned 1215; README = 506 rows only; single-writer per subtask.",
  phases: [
    { title: "506-01" },
    { title: "506-02" },
    { title: "506-03" },
    { title: "506-04" },
    { title: "506-05" },
    { title: "Post-audit" },
    { title: "Smoke" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const T = (n) => ROOT + "/_docs/_TASKS/" + n;
const ENV = "set -a && { [ ! -f .env ] || . ./.env; } && set +a && ";
const PARENT = T("TASK-506_Menu_Modern_Styling_Reset_Defaults_And_Bundles.md");

const COMMON = [
  "You implement a TASK-506 (Menu modern styling depth) subtask on branch feature/visual, IN-PLACE (no worktree). Read your subtask contract file IN FULL first (execution-ready pseudocode + verified anchors) + the parent " +
    PARENT +
    ". This is the SAME architecture family as TASK-504/505 (already merged): menuDocumentV2 doc contract + doc-scoped CSS via the ONE shared buildMenuRuleSetsForDocument + MenuDesignEditor controls.",
  "HARD RULES (AGENTS.md + owner-established + the audited 506 contract):",
  "- F1 BASE RESET: add base-clear helpers that DELETE a field from the DESKTOP-base record (nav base / navChrome / levelStyles / brand style) and PRUNE empty objects so the doc returns to the EXACT byte-identical no-override shape — mirror of the existing responsive clear helpers but on the desktop branch. A base reset of the last authored field must round-trip byte-identical to a never-authored doc.",
  "- F2 DEFAULT HINT: implement the single model provider resolveMenuControlDefault(section, device, level, key) -> {value, sourceLabel}. Case 1 (LEVEL field unset on tablet/mobile) MUST recurse via resolveMenuControlDefault(section,'desktop',level,key).value (NEVER a literal resolveMenuNavLevelStyle(...,'desktop',N)[key], which does not fall back to shallower levels) so it can never surface 'Inherited from desktop (undefined)'. Level 1/2 unset ⇒ inherits level 0; level 0 unset ⇒ theme/base default; the editor reads this provider — never hardcodes a default, and an unset slider shows the RESOLVED value not range.min.",
  "- PRESENT-ONLY emission for EVERY new field (separators/indicator/caret/flyout/pill/padding/placement): NO resolution default seeded into MENU_APPEARANCE_DEFAULTS/SHELL_APPEARANCE_DEFAULTS; the rule/base() returns null unless authored. A NO-OVERRIDE doc gains ZERO new doc-sheet CSS. NAV_CHROME_DEFAULTS carries flyoutAnimation/submenuPlacement ONLY as terminal F2 hint VALUES, never as emission seeds.",
  "- flyoutAnimation (B3) is a NavLevelStyle CONTAINER field on levels 1/2 ONLY (level allowlist + normalizer + compare-keys), NOT a navChrome/level-0 key; its control shows only on Level 1 / Level 2+ panels. submenuPlacement (B5) is level-2-only (the nested .site-nav-sublist .site-nav-sublist) and MUST keep the anchored (0,5,0) level-2 selector specificity from 504.",
  "- B1 separators are ORIENTATION-AWARE: vertical rule between top-bar (level-0) items (border-inline-end/::after on :not(:last-child)); horizontal rule between dropdown (levels>=1) items (border-block-end). B3 flyout animation MUST use visibility+opacity+transform (display cannot transition) and MUST PRESERVE the zero-JS :hover/:focus-within open + full reachability. Canvas force-open of the selected level must OPEN and NEUTRALIZE exactly the animated sublist so the author SEES the effect (Hard Invariant 6).",
  "- Schema-first + reject-unknown; the CONSCIOUS fail-closed READ trap: extend EVERY allowlist a new key belongs to (NAV_LEVEL_STYLE_KEYS / NAV_CHROME_KEYS / NAV_ITEMS_PROP_KEYS / BRAND_PROP_KEYS) — a forgotten key silently degrades the whole stored doc on read; every new key needs a round-trip persistence test. Legacy + no-override docs round-trip byte-identically.",
  "- BYTE-IDENTITY INVIOLABLE: core/site/siteShellCss.ts NOT touched; buildSiteShellCss(null) byte-identical (tests/unit/pages/siteShellCss.test.ts ZERO edits) + no-override docs byte-identical (tests/unit/site/menu-document-render.test.tsx). ALL new CSS doc-scoped under [data-site-menu-doc=true] via the ONE shared buildMenuRuleSetsForDocument (front @media + canvas flatten never diverge).",
  "- Per-device cascade mirrors Pages/502 EXACTLY: desktop=base; tablet AND mobile each carry their own sparse responsive record; BOTH inherit DESKTOP (mobile NOT tablet). Every new field is per-device via the existing responsive.navProps delta machinery. Level inheritance stays pure CSS cascade/source-order — NO runtime merge.",
  "- React hooks (ESLint 9 + hooks compiler): device/level-forked writes in event handlers; no setState-in-effect; F2 hint + F1 reset are render-time-derived/handler-driven. Large menu files read as BINARY to rg — Read + grep -an, NEVER trust an empty rg result.",
  "- SCOPE GUARD: touch ONLY the files your subtask owns (single-writer per the parent File-ownership block). Do NOT edit _docs/_TASKS/* or _docs/_CHANGELOG/* (only 506-05 owns docs). 506-05 changelog is PINNED 1215 (1214 = TASK-505, already used). 506-05 README rule: Read _docs/_TASKS/README.md FRESH immediately before editing and change ONLY the TASK-506 rows + 506 Statistics deltas. Do NOT revert any unrelated uncommitted edit in the shared tree (the owner may run their own agents).",
  "Return a concise summary: files edited, new/changed public contract signatures, tests re-pointed/added, deviations with reasons.",
].join("\n");

const SUBTASKS = [
  {
    key: "506-01",
    phase: "506-01",
    file: "TASK-506-01-Menu-Model-Reset-Defaults-And-Modern-Fields.md",
    owns: "core/services/menus/menuDocumentV2.ts (sole writer; + normalizeMenuAppearance.ts only if a new enum/range provably belongs there per the contract)",
    brief:
      "MODEL keystone: (F1) base-clear helpers (clearMenuNavLevelStyleBase / clearMenuNavChromeBase / clearMenuBrandStyleBase / nav-base equivalent — names per contract) deleting+pruning the desktop-base field to byte-stable legacy shape; base-value read predicates the editor uses. (F2) resolveMenuControlDefault(section,device,level,key)->{value,sourceLabel} with the case-1 desktop RECURSION. (Fields) NavLevelStyle + navChrome (level-0 home) new fields: B1 itemDivider{show,color,width 1..8,style solid|dashed|dotted}; B2 indicator none|underline|overline + indicatorColor + indicatorThickness 1..6 + indicatorGrow + hoverUnderline + transitionMs 0..400 + hoverLift 0..8; B3 showCaret + caretRotateOnOpen (0/1/2) + flyoutAnimation none|fade|slide (LEVELS 1/2 ONLY, NOT navChrome key); B4 navPill{background,radius,paddingX,paddingY} (level-0/navChrome) + containerPaddingX/Y (levels>=1); B5 submenuPlacement right|bottom|left (level-2). New clamp ranges + enums; extend normalizers with reject-unknown; extend EVERY fail-closed allowlist (round-trip test per new key); device-generalize patch/resolve. NO schemaVersion bump. Extend the vitest menu model suites incl. the base-clear byte-identity + F2 compound device×level case.",
    gate: {
      vitest: "menu-document menuSchemas normalizeMenuAppearance menu",
      bun: "tests/unit/site/menu-document-render.test.tsx tests/unit/pages/siteShellCss.test.ts",
    },
  },
  {
    key: "506-02",
    phase: "506-02",
    file: "TASK-506-02-Menu-CSS-Separators-Indicator-Placement-Pill.md",
    owns: "core/site/menuDocumentCss.ts (ONLY; SEQUENTIAL after 506-01). Owns the navChrome per-device compare list here.",
    brief:
      "CSS emission via buildMenuRuleSetsForDocument (front @media + canvas flatten): B1 orientation-aware item separators (vertical border-inline-end/::after on top-bar :not(:last-child); horizontal border-block-end in dropdowns); B2 ::after underline/overline indicator bar on :hover + [aria-current=page] + indicatorGrow transform + hoverUnderline + transitionMs + hoverLift translateY; B3 showCaret toggle (hide the existing ::after caret when off) + caretRotateOnOpen (rotate on hover/focus-within) + flyoutAnimation (visibility+opacity+transform reveal on levels 1/2 that PRESERVES zero-JS hover/focus-within reachability; navChrome has NO flyout); B4 .site-nav-list pill (bg/radius/padding) + .site-nav-sublist inner container padding (levels>=1); B5 nested placement right|bottom|left rewriting the anchored (0,5,0) .site-nav-sublist .site-nav-sublist positioning WITHOUT losing specificity. Per-device deltas (navChrome + level) via the existing tablet/mobile channels + the linkOnly mobile split. ALL PRESENT-ONLY (base()/delta returns nothing unless authored). Canvas force-open of the selected level OPENS+NEUTRALIZES the animated/placed sublist. Byte-identity: buildSiteShellCss(null) untouched, no-override docs byte-identical, all doc-scoped. Golden + present-only zero-byte tests.",
    gate: {
      vitest: "menu-document menuDocumentCss menu site",
      bun: "tests/unit/site/menu-document-render.test.tsx tests/unit/pages/siteShellCss.test.ts tests/integration/runtime/site-shell-runtime.test.ts",
    },
  },
  {
    key: "506-03",
    phase: "506-03",
    file: "TASK-506-03-Front-And-Preview-Parity.md",
    owns: "core/site/siteShell.tsx (SOLE WRITER; SEQUENTIAL after 506-02) — expected ZERO markup change",
    brief:
      "FRONT: per the contract, every hook the bundles need already exists (li.site-nav-item / [data-site-nav-group] / .site-nav-link / .site-nav-sublist / [aria-current=page] from 504-03 / .site-nav-list). Confirm this against source; if a MINIMAL hook is genuinely required, add it without breaking buildSiteShellCss(null) byte-identity. Otherwise FORMALLY assert no front markup/class/aria change + add/point the front-side regression assertions (aria-current present, no-override doc render byte-identical, buildSiteShellCss(null) ZERO diff). Enumerate the canvas-preview parity requirement handed to 506-04 (renderPreviewNavItem mirrors any structural hook; today none).",
    gate: {
      vitest: "menu-document menu site navigation",
      bun: "tests/unit/site/menu-document-render.test.tsx tests/integration/runtime/site-shell-runtime.test.ts tests/unit/pages/siteShellCss.test.ts",
    },
  },
  {
    key: "506-04",
    phase: "506-04",
    file: "TASK-506-04-Design-Editor-Reset-Defaults-And-Modern-Controls.md",
    owns: "core/admin/ui/menus/MenuDesignEditor.tsx (sole writer) + core/admin/ui/menus/MenuEditorPage.tsx only if the contract requires. SEQUENTIAL after 506-03.",
    brief:
      "EDITOR: (F1) extend MenuResponsiveControlShell so the Reset affordance shows whenever the control's OWN record carries an explicit value — on the BASE record too (wire the 506-01 base-clear helpers via onResetBase + base-value predicates), labelled 'Reset to default' on base vs 'Reset override' on device. (F2) a reusable <ControlDefaultHint> under EVERY numeric/enum/color control reading resolveMenuControlDefault (generalize the B2 'Inherited from theme (16px)' pattern; the unset slider shows the resolved default, not range.min). (Controls) per selected Level + per device: B1 separators (show/color/width/style); B2 indicator(seg)+color+thickness+grow+hoverUnderline+transition+lift; B3 showCaret+caretRotateOnOpen (0/1/2) + flyoutAnimation(seg) LEVELS 1/2 ONLY (never the level-0/navChrome pill surface); B4 pill(bg/radius/paddingX/paddingY) level-0 only + dropdown inner padding levels>=1; B5 submenuPlacement segmented(right/bottom/left) level-2. Reuse existing primitives (Slider/Segmented/ColorSwatch) + the level+device badges. Update the canvas preview mirror + keep the force-open-selected-level sim so authors see separators/indicator/placement/animation. Tests: MenuDesignEditor F1 base-reset, F2 hint display, B1-B5 controls per level+device, force-open.",
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
      '\nReturn {pass, summary, errors}. pass=true ONLY if every command exits 0 and both test runs report 0 failed. Known flakes: under load vitest can throw spurious "Test timed out" — re-run the NAMED failing file once in isolation before reporting a real failure; a bun settings/DB test can transiently fail from smoke-DB pollution — re-run the named file once isolated. List each distinct real error/failure with file:line in errors[] (cap ~40).',
    { label: label, phase: ph, schema: GATE_SCHEMA }
  );
}
async function gateLoop(ph, cmd, fixContext) {
  let g = await runGate(cmd, "gate:" + ph + ":1", ph);
  let r = 1;
  while (g && !g.pass && r <= 3) {
    log(ph + " gate round " + r + ": " + g.errors.length + " issues -> fixing");
    await agent(
      "TASK-506 " +
        ph +
        ": the targeted gate FAILS. Fix CORRECTLY — prefer fixing the SOURCE when it diverged from the contract; re-baseline a TEST only for an intended contract update per the 506-05 matrix (never weaken a behavior assertion, never break buildSiteShellCss(null) byte-identity or the no-override/legacy round-trip, keep reject-unknown + present-only + F1 base-reset byte-identity + F2 no-undefined + flyout reachability + no Pages regression). SCOPE GUARD: do NOT edit _docs/**; touch only the owned source file(s). " +
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
      "\n\nThis runs SEQUENTIALLY after the prior subtask landed — read the CURRENT on-disk state of menuDocumentV2.ts / menuDocumentCss.ts / siteShell.tsx / MenuDesignEditor.tsx before editing so you build on, not clobber, prior work.",
    { label: "impl:" + st.key, phase: st.phase }
  );
  const ok = await gateLoop(
    st.phase,
    gateCmd(st.gate),
    "Subtask " + st.key + " owns: " + st.owns + "."
  );
  log(st.key + ": targeted gate " + (ok ? "GREEN" : "still failing after fix rounds"));
}

phase("506-05");
await agent(
  COMMON +
    "\n\nYOUR SUBTASK = 506-05 (Tests, Docs, Closure). Contract: " +
    T("TASK-506-05-Menu-Modern-Styling-Tests-Docs-Closure.md") +
    " (read its matrix + smoke-scenario definitions IN FULL).\n506-01..04 source landed and coupled tests are green. Finish closure:\n- Ensure the FULL regression matrix is green together: base-clear round-trips (base reset ⇒ byte-identical no-override shape) + resolveMenuControlDefault provider table incl. the compound device×level no-undefined case + reject-unknown/fail-closed round-trips for EVERY new key + CSS emission goldens per bundle (separators orientation-aware, indicator ::after, caret toggle/rotate, flyout reachability, pill+padding, submenu placement right/bottom/left) + byte-identity guards + front/preview parity + editor F1 base-reset + F2 default-hint display; page-editor + navigation suites stay green.\n- Docs: update the menu styling contract doc(s) the contract names (e.g. PAGE_MODEL/CONTENT or a menu doc); changelog as _docs/_CHANGELOG/1215-...task-506-...md (PINNED 1215) + update _docs/_CHANGELOG/README.md. Board: _docs/_TASKS/README.md — Read FRESH immediately before editing; move ONLY TASK-506 + 506-01..05 rows to Done, adjust Statistics by exactly the 506 deltas. Update **Status:**/**Completed:** in all six TASK-506* files.\nOnly touch tests + docs + the six TASK-506 files; do NOT re-open source contracts; SCOPE GUARD as above.",
  { label: "impl:506-05", phase: "506-05" }
);
const gate05 = await gateLoop(
  "506-05",
  gateCmd({
    vitest: "menu navigation menuSchemas menu-document menu-design menu-editor site page-editor",
    bun: "tests/unit/menus tests/integration/routes/menus.test.ts tests/unit/site/menu-document-render.test.tsx tests/unit/pages/siteShellCss.test.ts tests/integration/runtime/site-shell-runtime.test.ts",
  }),
  "Closure: tests + docs only."
);
log("506-05: targeted gate " + (gate05 ? "GREEN" : "RED"));

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
  "FOUNDATION FIDELITY (primary): F1 — EVERY control shows a Reset when its OWN record (base OR device) carries an explicit value; base reset actually DELETES+prunes back to the byte-identical no-override shape (not an override-equal-to-default). F2 — every numeric/enum/color control shows the resolved default/inherited hint from resolveMenuControlDefault; an unset slider shows the RESOLVED value not range.min; the compound tablet+level-2 (desktop level-2 also unset) case NEVER renders '(undefined)'. Flag anything stubbed/partial/hardcoded-default.",
  "MODERN BUNDLES FIDELITY: B1 separators render orientation-aware (vertical top-bar, horizontal dropdown) at the RIGHT level; B2 underline/overline indicator + hoverUnderline + transition + hoverLift compute on hover + aria-current; B3 showCaret toggles the caret, caretRotateOnOpen rotates, flyoutAnimation animates WITHOUT breaking zero-JS hover/focus-within reachability, and is levels-1/2-only (no dead level-0 control); B4 pill on .site-nav-list + dropdown inner padding; B5 submenuPlacement flips the nested sublist right/bottom/left keeping (0,5,0) specificity. All per-device. Canvas force-open shows each effect. Flag anything not visibly working.",
  "BYTE-IDENTITY + PRESENT-ONLY: buildSiteShellCss(null) untouched (ZERO diff); a NO-OVERRIDE menu doc emits byte-identical CSS (every new field added NO doc-sheet rule when unauthored — present-only verified); NAV_CHROME_DEFAULTS holds flyoutAnimation/submenuPlacement only as F2 hint values, not emission seeds; all new rules doc-scoped; siteShellCss.ts not modified.",
  "MODEL / FAIL-CLOSED / PER-DEVICE: every new key joined its reject-unknown allowlist (NAV_LEVEL_STYLE_KEYS/NAV_CHROME_KEYS/NAV_ITEMS_PROP_KEYS/BRAND_PROP_KEYS) with a round-trip test (no fail-closed degrade); flyoutAnimation is NOT an allowlisted navChrome KEY (would reject-unknown-throw a level value); per-device = tablet+mobile each inherit DESKTOP; level inheritance is CSS cascade not runtime merge; base-clear helper names 04 uses = those 01 defines.",
  "TEST INTEGRITY: new suites assert VISIBLE-EFFECT (emitted CSS values, computed geometry, base-reset byte-identity, F2 provider values incl. no-undefined, depth/placement selectors, force-open, hint display) not mere presence; no weakened/deleted assertion; no false-green; the 506-05 smoke section defines >=5 distinct real-flow scenarios; changelog is 1215; README edits touched only TASK-506 rows.",
];
const auditResults = await parallel(
  lenses.map(
    (lens, i) => () =>
      agent(
        "Post-implementation audit of TASK-506 (implemented on disk). Read the six TASK-506 contracts + the real implemented source (core/services/menus/**, core/site/{menuDocumentCss,siteShell}, core/admin/ui/menus/{MenuDesignEditor,MenuEditorPage}.tsx) + tests. You may run git diff/status. LENS:\n" +
          lens +
          "\nReturn findings[] (real, evidence-backed with file:line; empty if clean).",
        {
          label: "audit:" + ["foundation", "bundles", "byteid", "model", "tests"][i],
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
    "Post-impl audit of TASK-506 found these HIGH/MEDIUM issues. Fix each correctly (source or test per the contracts; never weaken tests, never break byte-identity/no-override/present-only/reject-unknown/F1-base-reset-byte-identity/F2-no-undefined/flyout-reachability/Pages; SCOPE GUARD: touch only the owned source, no _docs contract reopening).\n" +
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
    "FULL runtime SMOKE of implemented TASK-506 menu modern styling — at least 6 DISTINCT real-flow scenarios (owner mandate), driven by the parent Acceptance Criteria + 506-05 smoke section. Use playwright-cli, session -s=wf506smoke on EVERY command; save screenshots to " +
      ROOT +
      "/_docs/_workflows/_smoke/. Assert VISIBLE EFFECT (computed styles/geometry/DOM), not control presence.",
    'SERVER RESTART FIRST (Bun server no hot-reload): ps aux | grep "bun --eval" | grep -v grep => kill the PID, coderso-dev-core-host >/dev/null 2>&1 &, wait ~15s, verify :5173 + :3000 = 200 (else pass:false serverUp:false). Log in; CLICK THROUGH the config wizard if shown. Open a menu with >=2 nesting depths + its /design tab.',
    "S1 SEPARATORS (B1): author an item separator on Level 0 (color+width+style) and on Level 1; publish; on the front measure the VERTICAL divider between top-bar items (border-inline/::after width+color) AND the HORIZONTAL divider between dropdown items — assert orientation-correct + authored color/width.",
    "S2 INDICATOR (B2): set indicator=underline + indicatorColor + thickness + hoverLift + transitionMs on Level 0; on the front hover a link and assert the ::after underline bar computes (color/height) + the link translateY lifts, and the aria-current page link shows the indicator; distinct from the hover-background pill.",
    "S3 FOUNDATION (F1+F2): on Level 0 set link paddingX to a custom value — assert the Reset ('Reset to default') affordance appears on the BASE control; read the default HINT text (shows the resolved default number, not 0); click Reset and assert the value returns to the default AND the doc emits byte-identical no-override CSS (spot-check the header looks default again). Confirm an unset slider shows the resolved default in its hint, never '(undefined)'.",
    "S4 SUBMENU PLACEMENT (B5): with a level-2 nesting, flip submenuPlacement right->bottom->left; the canvas force-open + the front (hover to open) must show the nested sublist positioned to the RIGHT, then BELOW, then LEFT respectively — measure the nested sublist bounding box relative to its parent for each.",
    "S5 CARET+FLYOUT+PILL (B3+B4): toggle showCaret off (the ▾ disappears) then on with caretRotateOnOpen (rotates on open); set flyoutAnimation=fade/slide (the dropdown reveals with opacity/transform AND is still reachable via hover/focus-within — reachability not broken); set navPill background+radius+padding on Level 0 and a dropdown inner padding on Level 1 — measure computed on .site-nav-list and .site-nav-sublist.",
    "S6 PER-DEVICE: on Tablet + Mobile set a NEW-field override (e.g. indicator color or separator width), assert Override badge + Reset per breakpoint and the canvas reflects it per device; Desktop stays base; Reset re-inherits live; front at 800px/390px matches (mobile != tablet, both inherit desktop when unset). 0 console errors across all pages; dark-mode design tab no bg-white break.",
    "Close the session. Return {pass (true iff serverUp AND all scenarios held AND consoleErrors===0), serverUp, scenarios[] (one line per scenario with actual measured results), consoleErrors, screenshots[], failures[]}. Be truthful — report the measured divider/indicator/placement/pill values + the per-device values + the F1 reset byte-identity check.",
  ].join("\n"),
  { label: "smoke:506", phase: "Smoke", schema: SMOKE_SCHEMA }
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
  note: "Full mandatory gates (precommit:check, bun run test, gates:coderso, scan:security) run once combined after the 506 stream lands + owner review.",
};
