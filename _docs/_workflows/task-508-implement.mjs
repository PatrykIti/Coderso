export const meta = {
  name: "task-508-implement",
  description:
    "Implement TASK-508 (menu nesting forms + flyout fix): Req1 dropdown-container correct default hints (minWidth 180 / padding 6) + link ALIGNMENT (left/center/right); Req2 FIX flyoutAnimation to a PERCEPTIBLE visibility+opacity+transform reveal (drop the inert display+allow-discrete/@starting-style) keeping zero-JS reachability; Req3a unified directional submenu placement right/down/up/left across ALL nested depths (incl. 'up', reach level 1) keeping the anchored (0,5,0) level-2 specificity; Req3b ACCORDION inline in-flow mode (position:static, one cohesive downward block) opt-in while flyout stays default. STRICTLY SEQUENTIAL 508-01->02->03->04->05, targeted gates per subtask, post-audit, >=6-scenario playwright smoke. NO full-gates phase (combined run later). Changelog pinned 1217; README = 508 rows only; single-writer.",
  phases: [
    { title: "508-01" },
    { title: "508-02" },
    { title: "508-03" },
    { title: "508-04" },
    { title: "508-05" },
    { title: "Post-audit" },
    { title: "Smoke" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const T = (n) => ROOT + "/_docs/_TASKS/" + n;
const ENV = "set -a && { [ ! -f .env ] || . ./.env; } && set +a && ";
const PARENT = T("TASK-508_Menu_Nesting_Forms_And_Flyout_Fix.md");

const COMMON = [
  "You implement a TASK-508 (menu nesting forms + flyout fix) subtask on branch feature/visual, IN-PLACE (no worktree). Read your subtask contract file IN FULL first (execution-ready pseudocode + verified anchors) + the parent " +
    PARENT +
    ". Same architecture family as the already-merged TASK-504/505/506/507: menuDocumentV2 doc contract + doc-scoped CSS via the ONE shared buildMenuRuleSetsForDocument (front @media + canvas flatten never diverge) + MenuDesignEditor controls.",
  "HARD RULES (AGENTS.md + owner-established + the audited 508 contract):",
  "- REQ2 (flyout BUG fix): the reveal MUST be genuinely PERCEPTIBLE via visibility+opacity+transform — REST on the NON-:hover sublist selector (L1 `.site-nav-list > .site-nav-item > .site-nav-sublist`, L2 `... .site-nav-sublist .site-nav-sublist`): `display:grid;visibility:hidden;opacity:0`[+`transform:translateY(-6px)` slide]; SHOWN on the `:hover`/`:focus-within > .site-nav-sublist` reveal selector: `visibility:visible;opacity:1;transform:none`; transition on opacity/transform (+ visibility 0s on close). DROP the inert `display …ms allow-discrete` + `@starting-style` approach. MUST keep the zero-JS hover/focus-within reachability (the sublist stays fully interactive when open) and NEVER strand the nested level-2 sublist hidden.",
  "- REQ3a (unified direction): submenu DIRECTION right|down|up|left applies consistently across ALL nested depths incl. level 1; add 'up'(top). Reset ALL FOUR offsets per rule (else an undeclared offset inherits @707 left:100% ⇒ double-anchor stretch). KEEP the anchored (0,5,0) LEVEL_CONTAINER_SELECTORS[2] specificity + the first-dropdown top|bottom axis compatibility. 'down' everywhere ⇒ ONE cohesive downward column.",
  "- REQ3b (accordion): submenuMode = flyout (default) | accordion on navChrome. In accordion mode sublists render IN-FLOW (position:static, NOT absolute), indented, revealed via the SAME display:none->grid hover/focus-within toggle, forming one downward block. Flyout stays the default + present-only: a flyout-mode doc emits ZERO accordion bytes. Accordion must stay zero-JS reachable.",
  "- REQ1 (container + centering): resolveMenuControlDefault must report the REAL base-sheet defaults for minWidth (180) + containerPaddingX/Y (6) so the hints read 'Default 180px'/'Default 6px', never 0/undefined; add linkAlign (left|center|right) emitting text-align so dropdown text can be centered. Present-only, per-device.",
  "- PRESENT-ONLY emission for EVERY new field (linkAlign, submenuDirection/up, submenuMode); NO resolution default seeded into the *_DEFAULTS emission maps; a NO-OVERRIDE doc gains ZERO new doc-sheet CSS.",
  "- Schema-first + reject-unknown; the CONSCIOUS fail-closed READ trap: extend EVERY allowlist a new key belongs to (NAV_LEVEL_STYLE_KEYS / NAV_CHROME_KEYS) — a forgotten key silently degrades the whole stored doc on read; every new key needs a round-trip persistence test. Legacy + no-override docs round-trip byte-identically.",
  "- BYTE-IDENTITY INVIOLABLE: core/site/siteShellCss.ts NOT touched; buildSiteShellCss(null) byte-identical (tests/unit/pages/siteShellCss.test.ts ZERO edits) + no-override docs byte-identical (tests/unit/site/menu-document-render.test.tsx). ALL new CSS doc-scoped under [data-site-menu-doc=true] via the ONE shared buildMenuRuleSetsForDocument.",
  "- Per-device cascade mirrors Pages/502: desktop=base; tablet AND mobile each carry their own sparse responsive record; BOTH inherit DESKTOP (mobile NOT tablet). linkAlign is per-device (rides NAV_LEVEL_STYLE_COMPARE_KEYS); submenuDirection/submenuMode are nav-level (base-only per the contract). Level inheritance stays pure CSS cascade — NO runtime merge.",
  "- KEEP ALL 504/505/506/507 behavior intact: the 507 top-bar-only indicator scope; submenuPlacement level-2 anchored specificity; B1-B5; the 507 ControlDefaultHint null-on-undefined guard. React hooks: level/device-forked writes in event handlers, no setState-in-effect. Large menu files read as BINARY to rg — Read + grep -an, NEVER trust an empty rg result.",
  "- SCOPE GUARD: touch ONLY the files your subtask owns (single-writer). Do NOT edit _docs/_TASKS/* or _docs/_CHANGELOG/* (only 508-05 owns docs). 508-05 changelog PINNED 1217 (1216 = TASK-507). 508-05 README rule: Read _docs/_TASKS/README.md FRESH immediately before editing; change ONLY the TASK-508 rows + 508 Statistics deltas. Do NOT revert unrelated uncommitted edits in the shared tree.",
  "Return a concise summary: files edited, new/changed public contract signatures, tests re-pointed/added, deviations with reasons.",
].join("\n");

const SUBTASKS = [
  {
    key: "508-01",
    phase: "508-01",
    file: "TASK-508-01-Menu-Model-Align-Direction-Accordion.md",
    owns: "core/services/menus/menuDocumentV2.ts (sole writer)",
    brief:
      "MODEL: Req1 fix resolveMenuControlDefault minWidth/containerPaddingX/Y to the real base defaults (180/6/6) + add linkAlign (left|center|right) per level+navChrome. Req3a add 'up'/'top' to the submenu direction enum + define the unified submenuDirection (right|down|up|left) home governing all nested depths incl. level 1 (per the contract's chosen home). Req3b add submenuMode (flyout|accordion) on navChrome. New enums; extend normalizers + EVERY reject-unknown allowlist (round-trip test per new key); device-generalize (linkAlign per-device; submenuDirection/submenuMode base-only per contract). Reuse existing readMenuNavChromeBaseValue/patchMenuNavChromeForDevice/resolveMenuNavChrome. NO schemaVersion bump. Extend vitest menu-document-v2 suite (round-trips, corrected provider values, reject-unknown, per-device).",
    gate: {
      vitest: "menu-document menuSchemas normalizeMenuAppearance menu",
      bun: "tests/unit/site/menu-document-render.test.tsx tests/unit/pages/siteShellCss.test.ts",
    },
  },
  {
    key: "508-02",
    phase: "508-02",
    file: "TASK-508-02-Menu-CSS-Flyout-Direction-Accordion.md",
    owns: "core/site/menuDocumentCss.ts (ONLY; SEQUENTIAL after 508-01)",
    brief:
      "CSS: Req2 REWRITE flyoutAnimRule to the perceptible visibility+opacity+transform reveal (rest on non-:hover sub selector, shown on :hover/:focus-within; drop allow-discrete/@starting-style; keep reachability + never strand level-2). Req1 emit linkAlign (text-align) + confirm min-width/padding emission. Req3a unified directional placement right/down/up/left across all nested depths incl. level 1, resetting all four offsets, keeping the anchored (0,5,0) level-2 specificity + first-dropdown axis. Req3b accordion emission — submenuMode=accordion ⇒ sublists position:static in-flow, indented, revealed via the existing display toggle, one downward block; flyout default; present-only zero bytes. Per-device deltas + the linkOnly mobile split. Byte-identity (buildSiteShellCss(null) untouched, no-override byte-identical). Canvas force-open shows each. Golden tests incl. reveal uses visibility/opacity (perceptible) + accordion position:static + direction offsets.",
    gate: {
      vitest: "menu-document menuDocumentCss menu-document-css menu site",
      bun: "tests/unit/site/menu-document-render.test.tsx tests/unit/pages/siteShellCss.test.ts tests/integration/runtime/site-shell-runtime.test.ts",
    },
  },
  {
    key: "508-03",
    phase: "508-03",
    file: "TASK-508-03-Front-And-Preview-Parity.md",
    owns: "core/site/siteShell.tsx (SOLE WRITER; SEQUENTIAL after 508-02) — expected minimal/ZERO markup change",
    brief:
      "FRONT: per the contract, judge whether accordion/direction/animation need ANY front markup/attribute hook (most likely pure-CSS on the existing ul.site-nav-list/li.site-nav-item[data-site-nav-group]/ul.site-nav-sublist). If a MINIMAL hook is genuinely required (e.g. a data attribute for accordion mode), add it without breaking buildSiteShellCss(null) byte-identity + hand the exact hook to 508-04 preview parity. Otherwise FORMALLY assert no front markup change + add/point the front-side regression assertions (byte-identity, no-override render identical). Confirm the R2 reveal + zero-JS reachability hold on the real markup.",
    gate: {
      vitest: "menu-document menu site navigation",
      bun: "tests/unit/site/menu-document-render.test.tsx tests/integration/runtime/site-shell-runtime.test.ts tests/unit/pages/siteShellCss.test.ts",
    },
  },
  {
    key: "508-04",
    phase: "508-04",
    file: "TASK-508-04-Design-Editor-Align-Direction-Accordion-Controls.md",
    owns: "core/admin/ui/menus/MenuDesignEditor.tsx (sole writer) + core/admin/ui/menus/MenuEditorPage.tsx only if the contract requires. SEQUENTIAL after 508-03.",
    brief:
      "EDITOR: Req1 the dropdown-container default hints now read correct (via the corrected provider) + add a link ALIGNMENT segmented control (left/center/right) per level+device. Req3a a unified submenu DIRECTION control (right/down/up/left) clearly governing all nested levels, per the contract's home; Req3b a submenuMode toggle (Flyout | Accordion) at the nav level. Wire canvas force-open + preview so the author SEES the direction, the accordion block, and the now-VISIBLE flyout animation. Reuse existing primitives (Segmented/Slider/ColorSwatch) + level+device badges + the 507 ControlDefaultHint. Tests: alignment, direction incl. up, accordion toggle, corrected container hints, force-open, per-device (per the 508-04 matrix; 508-01 owns the R1(a) hint-region assertions — do not re-author them).",
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
      '\nReturn {pass, summary, errors}. pass=true ONLY if every command exits 0 and both test runs report 0 failed. Known flakes: vitest spurious "Test timed out" under load (re-run the NAMED file once isolated); a bun settings/DB test can transiently fail from smoke-DB pollution (re-run named isolated). List each real failure with file:line in errors[] (cap ~40).',
    { label: label, phase: ph, schema: GATE_SCHEMA }
  );
}
async function gateLoop(ph, cmd, fixContext) {
  let g = await runGate(cmd, "gate:" + ph + ":1", ph);
  let r = 1;
  while (g && !g.pass && r <= 3) {
    log(ph + " gate round " + r + ": " + g.errors.length + " issues -> fixing");
    await agent(
      "TASK-508 " +
        ph +
        ": the targeted gate FAILS. Fix CORRECTLY — prefer fixing the SOURCE when it diverged from the contract; re-baseline a TEST only for an intended contract update per the 508-05 matrix (never weaken a behavior assertion, never break buildSiteShellCss(null) byte-identity or the no-override/legacy round-trip, keep reject-unknown + present-only + flyout perceptibility+reachability + accordion in-flow + the anchored level-2 specificity + all 504-507 behavior). SCOPE GUARD: do NOT edit _docs/**; touch only the owned source file(s). " +
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

phase("508-05");
await agent(
  COMMON +
    "\n\nYOUR SUBTASK = 508-05 (Tests, Docs, Closure). Contract: " +
    T("TASK-508-05-Menu-Nesting-Forms-Tests-Docs-Closure.md") +
    " (read its matrix + smoke-scenario definitions IN FULL).\n508-01..04 source landed and coupled tests are green. Finish closure:\n- Ensure the FULL regression matrix is green together: linkAlign + submenuDirection(+up) + submenuMode round-trips + reject-unknown per new key + corrected default-provider values (minWidth 180 / padding 6) + CSS goldens (flyout reveal uses visibility/opacity — perceptible; direction up/down/left/right offsets; accordion position:static in-flow) + byte-identity guards + front/preview parity + editor controls; page-editor + navigation suites stay green. 508-05 VERIFIES the 508-01/508-04 editor assertions (does not re-author).\n- Docs: update the menu styling contract doc(s) the contract names; changelog as _docs/_CHANGELOG/1217-...task-508-...md (PINNED 1217) + update _docs/_CHANGELOG/README.md. Board: _docs/_TASKS/README.md — Read FRESH immediately before editing; move ONLY TASK-508 + 508-01..05 rows to Done, adjust Statistics by exactly the 508 deltas. Update **Status:**/**Completed:** in all six TASK-508* files.\nOnly touch tests + docs + the six TASK-508 files; do NOT re-open source contracts; SCOPE GUARD as above.",
  { label: "impl:508-05", phase: "508-05" }
);
const gate05 = await gateLoop(
  "508-05",
  gateCmd({
    vitest:
      "menu navigation menuSchemas menu-document menu-document-css menu-design menu-editor site page-editor",
    bun: "tests/unit/menus tests/integration/routes/menus.test.ts tests/unit/site/menu-document-render.test.tsx tests/unit/pages/siteShellCss.test.ts tests/integration/runtime/site-shell-runtime.test.ts",
  }),
  "Closure: tests + docs only."
);
log("508-05: targeted gate " + (gate05 ? "GREEN" : "RED"));

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
  "REQ2 FLYOUT (primary): the reveal is genuinely PERCEPTIBLE — emitted via visibility+opacity+transform (rest on the non-:hover sub selector, shown on :hover/:focus-within), NOT the old inert display+allow-discrete/@starting-style; fade and slide differ; zero-JS hover/focus-within reachability holds (open sublist fully interactive) and the nested level-2 sublist is never stranded hidden. Flag if it is still string-present-but-inert or breaks reachability.",
  "REQ3 FORMS: submenu direction right/down/up/left works at ALL nested depths incl. level 1 ('down' everywhere ⇒ one cohesive downward column; 'up' exists); every rule resets all four offsets (no double-anchor stretch); the anchored (0,5,0) level-2 specificity + first-dropdown axis preserved. Accordion mode = sublists position:static in-flow (not absolute), indented, one downward block, still hover/focus-within reachable; flyout stays the default + emits zero accordion bytes when off. Flag anything not visibly working or that breaks the other mode.",
  "REQ1 CONTAINER: resolveMenuControlDefault reports minWidth 180 / containerPadding 6 (hints read 'Default 180px'/'Default 6px', never 0/undefined); linkAlign (left/center/right) emits text-align so dropdown text centers; per-device. Flag wrong defaults or missing centering.",
  "BYTE-IDENTITY + MODEL/FAIL-CLOSED + PER-DEVICE: buildSiteShellCss(null) untouched (ZERO diff); no-override doc byte-identical (every new field present-only); every new key (linkAlign/submenuDirection/submenuMode) joined its reject-unknown allowlist with a round-trip test; per-device = tablet+mobile inherit desktop (linkAlign) / base-only (direction+mode) per contract; all 504-507 behavior intact (507 top-bar indicator scope, submenuPlacement level-2 specificity, B1-B5, ControlDefaultHint null-on-undefined); helper names 04 uses = those 01 defines.",
  "TEST INTEGRITY: new suites assert VISIBLE-EFFECT (visibility/opacity reveal keyframes on the correct rest-vs-shown selectors, direction offsets, accordion position:static, corrected default values, text-align, per-device) not mere presence; no weakened/deleted assertion; no false-green (esp. the flyout perceptibility must be a real keyframe/state assertion, not a transition-string check); changelog is 1217; README edits touched only TASK-508 rows.",
];
const auditResults = await parallel(
  lenses.map(
    (lens, i) => () =>
      agent(
        "Post-implementation audit of TASK-508 (implemented on disk). Read the six TASK-508 contracts + the real implemented source (core/services/menus/**, core/site/{menuDocumentCss,siteShell}, core/admin/ui/menus/{MenuDesignEditor,MenuEditorPage}.tsx) + tests. You may run git diff/status. LENS:\n" +
          lens +
          "\nReturn findings[] (real, evidence-backed with file:line; empty if clean).",
        {
          label: "audit:" + ["flyout", "forms", "container", "model", "tests"][i],
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
    "Post-impl audit of TASK-508 found these HIGH/MEDIUM issues. Fix each correctly (source or test per the contracts; never weaken tests, never break byte-identity/no-override/present-only/reject-unknown/flyout-perceptibility+reachability/accordion-in-flow/anchored-level-2-specificity/all-504-507-behavior; SCOPE GUARD: touch only owned source, no _docs contract reopening).\n" +
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
      vitest:
        "menu navigation menu-document menu-document-css menu-design menu-editor site page-editor",
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
    "FULL runtime SMOKE of implemented TASK-508 (menu nesting forms + flyout fix) — at least 6 DISTINCT real-flow scenarios (owner mandate), driven by the parent Acceptance Criteria + 508-05 smoke section. Use playwright-cli, session -s=wf508smoke on EVERY command; save screenshots to " +
      ROOT +
      "/_docs/_workflows/_smoke/. Assert VISIBLE EFFECT (computed styles/geometry/DOM), not control presence.",
    'SERVER RESTART FIRST (Bun server no hot-reload): ps aux | grep "bun --eval" | grep -v grep => kill the PID, coderso-dev-core-host >/dev/null 2>&1 &, wait ~15s, verify :5173 + :3000 = 200 (else pass:false serverUp:false). Log in; click through the config wizard if shown. Open a menu with >=3 nesting depths + /design.',
    "S1 FLYOUT PERCEPTIBLE (Req2): set flyoutAnimation=slide (or fade) + a transition duration; on the FRONT open the dropdown and PROVE the motion is real — sample the sublist opacity/transform at/near open (e.g. shortly after hover the computed opacity is between 0 and 1, or transform translateY is interpolating), and the rest state is visibility:hidden;opacity:0 while shown is visibility:visible;opacity:1;transform:none. Fade vs slide differ. Reachability: the open sublist is fully hoverable/clickable (links reachable).",
    "S2 DIRECTION DOWN = COHESIVE COLUMN (Req3a): set submenu direction=down; publish; on the FRONT open L0->L1->L2 and measure that each nested sublist stacks BELOW its parent (top ~= parent bottom, left ~= parent left) forming one downward column — NOT flying right. ",
    "S3 DIRECTION UP + LEFT + RIGHT (Req3a): flip direction to up, then left, then right; measure the nested sublist bounding box for each (up = above parent; left = right:100%; right = left:100%). Four distinct measured placements incl. the NEW 'up'.",
    "S4 ACCORDION (Req3b): switch submenuMode=accordion; on the FRONT the sublists render IN-FLOW (computed position:static, NOT absolute), indented, and opening a group PUSHES following content down (one solid block) rather than overlaying; still reachable via hover/focus. Switch back to flyout — floating overlay returns (accordion emitted zero bytes when off).",
    "S5 CONTAINER DEFAULTS + CENTERING (Req1): in the editor the dropdown-container hints read 'Default 180px' (min width) + 'Default 6px' (padding), NOT 0. Set link alignment=center on the dropdown level; on the FRONT the dropdown link text is centered (computed text-align:center / measured centered). No '(undefined)'.",
    "S6 PER-DEVICE + REGRESSION: set a new-field override (e.g. linkAlign) on Tablet+Mobile, assert Override badge + Reset per breakpoint + front at 800px/390px matches (mobile != tablet, both inherit desktop unset); Desktop base; Reset re-inherits live. 0 console errors across pages; dark-mode design tab no bg-white break; a no-override menu still renders byte-identical. Confirm 506/507 features (indicator top-bar-only, separators, pill) still work.",
    "Close the session. Return {pass (true iff serverUp AND all scenarios held AND consoleErrors===0), serverUp, scenarios[] with actual measured results, consoleErrors, screenshots[], failures[]}. Be truthful — report the measured flyout opacity/transform samples, the direction geometries, the accordion position:static, and the container default hint text.",
  ].join("\n"),
  { label: "smoke:508", phase: "Smoke", schema: SMOKE_SCHEMA }
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
  note: "Full mandatory gates (precommit:check, bun run test, gates:coderso, scan:security) run once combined after the 508 stream lands + owner review.",
};
