export const meta = {
  name: "task-501-implement",
  description:
    "Implement TASK-501 (Menu per-device mobile overrides Pages-style + orientation + per-block visibility) STRICTLY SEQUENTIALLY 501-01->02->03->04, targeted gates per subtask, post-audit, scope-driven playwright smoke (canvas Mobile + :3000 real viewport). NO full-gates phase here — the combined full gate set runs once after BOTH parallel streams (500+501) finish. Collision-guarded against TASK-500 (custom-screens/pages territory forbidden; changelog pinned 1210; README edits = 501 rows only).",
  phases: [
    { title: "501-01" },
    { title: "501-02" },
    { title: "501-03" },
    { title: "501-04" },
    { title: "Post-audit" },
    { title: "Smoke" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const T = (n) => ROOT + "/_docs/_TASKS/" + n;
const ENV = "set -a && { [ ! -f .env ] || . ./.env; } && set +a && ";

const COMMON = [
  "You implement a TASK-501 (Menu Per-Device Overrides, Orientation & Block Visibility) subtask on branch feature/visual, IN-PLACE (no worktree). Read your subtask contract file IN FULL first (execution-ready pseudocode with verified anchors) + the parent " +
    T("TASK-501_Menu_Per_Device_Overrides_Orientation_And_Block_Visibility.md") +
    " (its Contract sketch is NORMATIVE).",
  "HARD RULES (AGENTS.md + owner-established):",
  "- Pages-idiom fidelity: SPARSE responsive.mobile records (only edited keys, lazily created); resolve-for-display = base merged with override; override DETECTION reads the BASE; explicit Reset only (no auto-remove-on-equality); prune empty records; mobile inherits DESKTOP. Tablet is DEFERRED (mobile-only v1) — do not add tablet branches.",
  "- Schema-first: own enums/normalize* in the service module; reject-unknown for breakpoint/group/prop keys (MenuDocumentError + path); the CONSCIOUS fail-closed read rule — extend MENU_SECTION_KEYS/block key lists or the FIRST saved override degrades every stored doc to empty (silent legacy fallback). Legacy docs WITHOUT responsive must round-trip byte-identically.",
  '- Byte-identity: buildSiteShellCss(null) unchanged (tests/unit/pages/siteShellCss.test.ts ZERO edits); orientation default "horizontal" emits NOTHING; a doc with NO overrides emits byte-identical CSS to pre-501. All new CSS stays in the [data-site-menu-doc]-scoped sheet via the ONE shared buildMenuRuleSets (front @media + canvas flatten from one place).',
  "- mobileMode interplay: mobile override rules emit AFTER the mobileMode disclosure/inline rules (source-order win).",
  "- React hooks rules: device-forked writes in event handlers only; no setState-in-effect.",
  "- Large files read as binary to rg (MenuDesignEditor.tsx, menuDocumentV2.ts, PageEditor.tsx as reference) — use Read + grep -an, NEVER rg.",
  "- COLLISION GUARD (a parallel TASK-500 stream runs in this tree): do NOT touch core/services/customScreens/**, core/admin/ui/custom-screens/**, core/admin/ui/pages/**, core/admin/ui/shared/CanvasEditor.tsx, or any TASK-500 file. Pages files (pageEditorMutationActions/pageDocumentV2/PageEditor) are READ-ONLY reference for the port. Do NOT edit _docs/_TASKS/* or _docs/_CHANGELOG/* (only 501-04 owns docs). 501-04 README rule: Read _docs/_TASKS/README.md FRESH immediately before editing and change ONLY the TASK-501 rows + the 501 Statistics deltas (TASK-500 edits other rows concurrently).",
  "- Touch ONLY the files your subtask owns. Keep the targeted gate GREEN: re-point/add exactly the tests your change requires (per the 501-04 matrix); never weaken a functional/behavior assertion.",
  "Return a concise summary: files edited, new/changed public contract signatures, tests re-pointed/added, deviations with reasons.",
].join("\n");

const SUBTASKS = [
  {
    key: "501-01",
    phase: "501-01",
    file: "TASK-501-01-MenuDocumentV2-Responsive-Contract.md",
    owns: "core/services/menus/menuDocumentV2.ts + core/services/menus/normalizeMenuAppearance.ts (ONLY these two)",
    brief: [
      "MODEL KEYSTONE:",
      '- normalizeMenuAppearance.ts: orientation enum field ("horizontal" | "vertical") with normalizeEnum validation; add to the MenuAppearance type + fieldNormalizers.',
      '- menuDocumentV2.ts: add "orientation" to NAV_ITEMS_PROP_KEYS; sparse responsive?: { mobile?: { layout?: MenuBarLayout; navProps?: NavItemsProps } } on MenuSectionV2 + responsive?: { mobile?: { visibility?: { visible: boolean } } } on MenuBlockV2 (ALL block types incl. menu-native — document-level render gating, not the page pipeline); extend MENU_SECTION_KEYS + the block key lists (assertBlockKeys) — the fail-closed read trap; normalizers reject-unknown breakpoint keys (["mobile"]) + group keys + per-group props via the SAME subset normalizers (normalizeAppearanceSubset), drop empty records, emit ...(responsive ? {responsive} : {}) so legacy docs round-trip byte-identically; pure helpers per the contract: resolveMenuSectionForBreakpoint / resolveMenuBlockForBreakpoint (base merged with override), patch helpers (device-forked sparse write), clearMenuResponsiveOverride (delete leaf, prune empty group/breakpoint/member), hasMenuResponsiveOverride-style detection.',
      "Tests (targeted): extend tests/vitest/services/menu-document-v2.test.ts — responsive round-trips; write reject-unknown (breakpoint/group/prop) with MenuDocumentError path; legacy docs WITHOUT responsive unchanged; docs WITH unknown responsive keys degrade whole-doc (assert CONSCIOUSLY); resolve merge; clear/prune; orientation enum accept/reject.",
    ].join("\n"),
    gate: {
      vitest: "menu-document menuSchemas normalizeMenuAppearance menu",
      bun: "tests/unit/pages/siteShellCss.test.ts",
    },
  },
  {
    key: "501-02",
    phase: "501-02",
    file: "TASK-501-02-Menu-CSS-Responsive-Emission.md",
    owns: "core/site/menuDocumentCss.ts + core/site/siteShell.tsx (ONLY these two; SEQUENTIAL after 501-01 — consume its shipped helpers)",
    brief: [
      "CSS EMISSION:",
      "- menuDocumentCss.ts: breakpoint-aware appearance collection (base + mobile-resolved via the 501-01 resolvers); buildMenuRuleSets emits the mobile DELTA rules AFTER the existing mobileMode rules in the mobile branch; orientation rule (vertical => flex-direction:column;align-items:stretch on .site-nav-list under the doc scope; default emits NOTHING); per-block visibility gating via the doc-scoped dual data-menu-block-id/data-block-id hide rules (mobile branch = hide-on-mobile, desktop branch = show-only-on-mobile) — BOTH the front @media builder AND the device-forced canvas flatten get it from the ONE buildMenuRuleSets; the canvas structural baseline stays prepended (doc rules win).",
      "- siteShell.tsx: SiteHeaderMenuDocumentRender stamps inert data-menu-block-id on menu-native wrappers (leaf frames keep PageBlockFrame data-block-id); markup otherwise unchanged for docs without overrides.",
      "Tests (targeted): tests/unit/site/menu-document-render.test.tsx (data-menu-block-id stamped; visibility-gated block hidden in the mobile branch; golden: doc with NO overrides emits byte-identical CSS to pre-501) + tests/unit/pages/siteShellCss.test.ts stays byte-identical (ZERO edits) + vitest CSS-builder assertions per the 501-04 matrix.",
    ].join("\n"),
    gate: {
      vitest: "menu-document menuDocumentCss menu site",
      bun: "tests/unit/site/menu-document-render.test.tsx tests/unit/pages/siteShellCss.test.ts tests/integration/runtime/site-shell-runtime.test.ts",
    },
  },
  {
    key: "501-03",
    phase: "501-03",
    file: "TASK-501-03-Design-Editor-Device-Forked-Controls.md",
    owns: "core/admin/ui/menus/MenuDesignEditor.tsx (ONLY this one; SEQUENTIAL after 501-02)",
    brief: [
      "EDITOR (the Pages-style UX):",
      "- Device-forked APPEARANCE writers (event handlers): setLayoutField => desktop writes base section.layout, Mobile writes sparse responsive.mobile.layout; setNavField => navProps likewise (use the 501-01 patch helpers). patchBlock CONTENT writes (brand/cta/utility label/href/etc.) stay FLAT and UNwrapped on every device.",
      '- MenuResponsiveControlShell (port of the Pages ResponsiveControlShell idiom): wraps every appearance control; Base/Override/Inherited badge; Reset button when device==="mobile" && override (data-menu-responsive-reset), calling clearMenuResponsiveOverride. Panels DISPLAY resolved values (resolveMenuSectionForBreakpoint) while badges compare against the BASE.',
      '- Orientation SegmentedControl in the nav-items panel (Horizontal/Vertical). Per-block mobile visibility toggle (visible when device==="mobile", with badge+reset). Canvas scope hint "(mobile overrides)" when device==="mobile". Undo/redo (the single useReducer atom from 499-03) keeps working across device-forked writes — overrides are part of the same doc state.',
      '- buildMenuDocumentPreviewCss(doc, "mobile") already flattens — the canvas Mobile preview shows the overridden look via 501-02\'s emission; verify the DeviceSwitcher wiring.',
      "Tests (targeted): NEW/extended MenuDesignEditor vitest suites per the 501-04 matrix — device-forked write lands in responsive.mobile (not base); desktop write untouched by mobile override; badge states; Reset prunes + re-inherits; orientation control writes the enum; block visibility toggle writes block responsive; content writes stay flat on Mobile.",
    ].join("\n"),
    gate: {
      vitest: "menu-design menu-document menu",
      bun: "tests/unit/pages/siteShellCss.test.ts",
    },
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
const gateCmd = (g) =>
  "cd " +
  ROOT +
  " && bun --cwd core lint:types && bun --cwd core lint && " +
  ENV +
  "NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts " +
  g.vitest +
  " 2>&1 | tail -50 && " +
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
      "TASK-501 " +
        ph +
        ": the targeted gate FAILS. Fix CORRECTLY — prefer fixing the SOURCE when it diverged from the contract; re-baseline a TEST only for an intended contract update per the 501-04 matrix (never weaken a behavior assertion, never break buildSiteShellCss(null) byte-identity or the legacy round-trip, keep reject-unknown). COLLISION GUARD: do NOT touch core/services/customScreens/**, core/admin/ui/custom-screens/**, core/admin/ui/pages/**, core/admin/ui/shared/CanvasEditor.tsx, _docs/**. " +
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

// ---- Phases 1-3: sequential source subtasks ----
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
      "\n\nThis runs SEQUENTIALLY after the prior subtask landed — read the current state of menuDocumentV2.ts / menuDocumentCss.ts / MenuDesignEditor.tsx before editing so you build on, not clobber, prior work.",
    { label: "impl:" + st.key, phase: st.phase }
  );
  const ok = await gateLoop(
    st.phase,
    gateCmd(st.gate),
    "Subtask " + st.key + " owns: " + st.owns + "."
  );
  log(st.key + ": targeted gate " + (ok ? "GREEN" : "still failing after fix rounds"));
}

// ---- Phase 4: 501-04 tests / docs / closure ----
phase("501-04");
await agent(
  COMMON +
    "\n\nYOUR SUBTASK = 501-04 (Tests, Docs, Closure). Contract: " +
    T("TASK-501-04-Menu-Responsive-Tests-Docs-Closure.md") +
    ' (read its matrix IN FULL).\n501-01/02/03 source landed and their coupled tests are green. Finish closure:\n- Ensure the FULL matrix is green: menu-document-v2 responsive round-trips + reject-unknown + CONSCIOUS whole-doc degrade on unknown responsive keys + legacy byte-identical round-trip; CSS builders (mobile delta after mobileMode; orientation vertical rule + default-emits-nothing; visibility dual-attr rules front+canvas; NO-overrides doc byte-identical to pre-501); MenuDesignEditor device-fork + badge/reset + orientation + block-visibility suites; bun: menu-document-render (data-menu-block-id + visibility gating) + siteShellCss byte-identity (ZERO edits) + site-shell-runtime + routes/menus PATCH round-trip with a responsive document.\n- Docs: changelog entry PINNED as _docs/_CHANGELOG/1210-...task-501-...md (1209 belongs to the parallel TASK-500 — if the parent contract says "expected 1209", correct that line to 1210) + update _docs/_CHANGELOG/README.md (surgical row add).\n- Board: _docs/_TASKS/README.md — Read FRESH immediately before editing (TASK-500 edits other rows concurrently): move ONLY the TASK-501 + 501-01..04 rows to Done with one-line closure summaries, adjust Statistics by exactly the 501 deltas (To Do -5, Done +5). Update **Status:**/**Completed:** in all five TASK-501* task files to ✅ Done + today.\nOnly touch tests + docs + the five TASK-501 files; do NOT re-open source contracts; COLLISION GUARD as above.',
  { label: "impl:501-04", phase: "501-04" }
);
const gate04 = await gateLoop(
  "501-04",
  gateCmd({
    vitest: "menu navigation menuSchemas menu-document menu-design site",
    bun: "tests/unit/menus tests/integration/routes/menus.test.ts tests/unit/site/menu-document-render.test.tsx tests/unit/pages/siteShellCss.test.ts tests/integration/runtime/site-shell-runtime.test.ts",
  }),
  "Closure: tests + docs only."
);
log("501-04: targeted gate " + (gate04 ? "GREEN" : "RED"));

// ---- Phase 5: post-implementation drift audit ----
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
  "SCOPE-FIDELITY (primary): each parent Acceptance Criterion implemented — canvas Mobile shows overrides (itemGap/color/orientation + hidden CTA) and Desktop shows unchanged base; Reset prunes + re-inherits live; legacy menus + no-document default untouched; orientation default emits zero CSS. Flag anything stubbed/partial/downgraded.",
  "PAGES-IDIOM FIDELITY: sparse lazy override records; resolved display vs BASE detection; explicit Reset only; prune empty group/breakpoint/member; mobile inherits desktop; content writes stay FLAT on every device; no setState-in-effect.",
  "SCHEMA/FAIL-CLOSED: key lists extended everywhere needed (MENU_SECTION_KEYS + block keys) — a saved override must NOT degrade reads; reject-unknown on breakpoint/group/prop keys with MenuDocumentError path; legacy docs round-trip byte-identically; NO tablet branches (deferred).",
  "BYTE-IDENTITY + COLLISION: buildSiteShellCss(null) untouched (test file ZERO diff); no-overrides doc CSS byte-identical pre/post; git diff shows NOTHING under core/services/customScreens/**, core/admin/ui/custom-screens/**, core/admin/ui/pages/**, core/admin/ui/shared/CanvasEditor.tsx; changelog is 1210; README edits touched only TASK-501 rows + correct Statistics deltas.",
  "TEST INTEGRITY: new suites assert the locked shapes (conscious whole-doc degrade, byte-identical golden, device-fork writes, badge/reset, dual-attr visibility rules); no weakened/deleted behavior assertion; no false-green.",
];
const auditResults = await parallel(
  lenses.map(
    (lens, i) => () =>
      agent(
        "Post-implementation audit of TASK-501 (implemented on disk). Read the five TASK-501 contracts + the real implemented source (core/services/menus/**, core/site/{menuDocumentCss,siteShell}.tsx?/.ts, core/admin/ui/menus/MenuDesignEditor.tsx) + the tests. You may run git diff/status. LENS:\n" +
          lens +
          "\nReturn findings[] (real, evidence-backed; empty if clean).",
        {
          label: "audit:" + ["scope", "idiom", "schema", "byteid", "tests"][i],
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
    "Post-impl audit of TASK-501 found these HIGH/MEDIUM issues. Fix each correctly (source or test per the contracts; never weaken tests, never break byte-identity/legacy round-trip/reject-unknown; COLLISION GUARD: no customScreens/pages/CanvasEditor files, no _docs/_TASKS contract reopening).\n" +
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
      vitest: "menu navigation menuSchemas menu-document menu-design site",
      bun: "tests/unit/menus tests/unit/site/menu-document-render.test.tsx tests/unit/pages/siteShellCss.test.ts",
    }),
    "gate:post-audit",
    "Post-audit"
  );
  log("Post-audit re-gate: " + (g2 && g2.pass ? "GREEN" : "RED"));
}

// ---- Phase 6: scope-driven runtime smoke (canvas Mobile + :3000 real viewport) ----
phase("Smoke");
const SMOKE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "serverUp", "observations", "consoleErrors", "screenshots", "failures"],
  properties: {
    pass: { type: "boolean" },
    serverUp: { type: "boolean" },
    observations: { type: "array", items: { type: "string" } },
    consoleErrors: { type: "number" },
    screenshots: { type: "array", items: { type: "string" } },
    failures: { type: "array", items: { type: "string" } },
  },
};
const smoke = await agent(
  [
    "Runtime SMOKE of the implemented TASK-501, driven by the TASK ACCEPTANCE CRITERIA (read the parent " +
      T("TASK-501_Menu_Per_Device_Overrides_Orientation_And_Block_Visibility.md") +
      " §Acceptance Criteria — verify THOSE). Use playwright-cli with a NAMED session: prefix EVERY command with `playwright-cli -s=wf501smoke`. Save screenshots to " +
      ROOT +
      "/_docs/_workflows/_smoke/.",
    'SERVER RESTART FIRST (Bun server code does NOT hot-reload — 501-01/02 are server-side): `ps aux | grep "bun --eval" | grep -v grep` => kill the PID, run `coderso-dev-core-host >/dev/null 2>&1 &`, wait ~15s, verify http://coderso-a.localhost:5173/admin/ AND http://coderso-a.localhost:3000/ return 200. Not 200 => pass:false serverUp:false.',
    "Login (creds via `set -a && . ./.env; set +a`), open /admin/menus, open the existing menu (id from links) and its /design tab. Resize 1440x900.",
    "VERIFY (criteria 1-4; real clicks/keys; this is a TEST DB — you MAY Save/Publish):",
    "1. CANVAS MOBILE OVERRIDE: on Desktop note the base look. Switch DeviceSwitcher to Mobile => edit an appearance control (e.g. surface color or item gap) => assert the control shows an Override badge + a Reset affordance (data-menu-responsive-reset) and the mobile canvas reflects the change; switch back to Desktop => base UNCHANGED. Set orientation=Vertical on Mobile via the nav-items panel => canvas mobile shows a vertical list. Toggle a block (e.g. cta-button) hidden on Mobile => it disappears from the mobile canvas but stays on Desktop.",
    "2. FRONT REAL VIEWPORT: Save + Publish the design. Goto http://coderso-a.localhost:3000/ at viewport 1280x800 => desktop look unchanged (nav horizontal, CTA visible). Resize to 390x844 (<=639) => the mobile overrides apply (vertical/hidden CTA/overridden value; note the mobileMode disclosure may need opening — open it if present and assert inside). Screenshot both.",
    "3. RESET RESTORES: back in the Design tab on Mobile, click the Reset on the overridden control => badge flips to Inherited, canvas re-inherits the desktop value live.",
    "4. LEGACY/DEFAULT UNTOUCHED: assert 0 console errors throughout; spot-check that the items editor (/admin/menus/<id>) still renders (no regression).",
    "Close the session. Return {pass (true iff serverUp AND criteria held AND consoleErrors===0), serverUp, observations[] (one line per criterion with the actual result), consoleErrors, screenshots[], failures[]}. Be truthful.",
  ].join("\n"),
  { label: "smoke:501", phase: "Smoke", schema: SMOKE_SCHEMA }
);
log(
  "Smoke: " +
    (smoke && smoke.pass ? "PASS" : "needs review") +
    " (consoleErrors=" +
    (smoke && smoke.consoleErrors) +
    ")"
);

return {
  targetedGate04: gate04,
  auditHighMed: hm.length,
  auditFindings: findings,
  smoke: smoke,
  note: "Full mandatory gates (bun run test + precommit + gates:coderso + gates:coderso:security + scan:security) intentionally NOT run here — they run ONCE combined after BOTH the 500 and 501 streams land, to avoid cross-stream false reds.",
};
