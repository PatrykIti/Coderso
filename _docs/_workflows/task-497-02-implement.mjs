export const meta = {
  name: "task-497-02-implement",
  description:
    "Implement the prototype-faithful Post editor re-layout (TASK-497-02 E1–E7): source in non-conflicting lanes → typecheck+fix loop → re-baseline the ~15 test suites → vitest gate → post-impl audit. No _docs/_TASKS edits, no README stats, in-place on feature/visual.",
  phases: [
    { title: "Source" },
    { title: "Typecheck" },
    { title: "Tests" },
    { title: "Gate" },
    { title: "Audit" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const CONTRACT = `${ROOT}/_docs/_TASKS/TASK-497-02-Post-Editor-Restyle.md`;
const PROTO_DIR = `${ROOT}/_docs/_PROTOTYPE/src`;

const COMMON = `
You implement TASK-497-02 (prototype-faithful Post editor re-layout) on branch feature/visual, IN-PLACE (no worktree).
Read the full contract first: ${CONTRACT} (execution-ready pseudocode E1–E7 with exact anchors + test re-baseline list).
Design source of truth is the PROTOTYPE SOURCE, not screenshots:
  ${PROTO_DIR}/pages/content/PostEditorPreview.tsx  and  ${PROTO_DIR}/components/patterns/EditorPreviewFrame.tsx.
HARD RULES:
- Reproduce the prototype layout/structure faithfully; do NOT preserve the old full-viewport app or the "Outline default" (both were rejected). The two invented "hard decisions" D4/B6 are DROPPED.
- PRESERVE every data-post-editor-* hook and every aria-pressed/aria-expanded/aria-controls/aria-keyshortcuts/ref VERBATIM — relocate containers only, never drop. The DOM ids post-editor-block-inserter / post-editor-document-overview / post-editor-details must stay valid targets.
- Do NOT change data-model / autosave / revisions / preview / status / shortcuts / RBAC / endpoints. UI + client-state layout only.
- The shared core/admin/ui/shared/{PageHeader,EditorRail}.tsx already exist — CONSUME them, do not re-create.
- PostEditorCanvas.tsx / PostRichText* are large — use Read + grep -an, NEVER rg (they read as binary).
- Touch ONLY the files assigned to your lane. Do NOT edit PostBlockEditorShell.tsx unless it is your lane (the "core-hub" lane owns it). Do NOT edit any _docs/_TASKS/* file or _docs/_TASKS/README.md. Do NOT edit test files (a later phase does that).
- Keep the prop interfaces EXACTLY as the contract pins them (other lanes wire against them). New PageHeader props on PostEditorLayoutProps MUST be OPTIONAL; footer? prop MUST be retained.
Return a concise summary: which files you edited, the exact new/changed public prop signatures you introduced (so sibling lanes/hub agree), and any place you deviated from the contract with the reason.
`;

// ---------- Phase 1: Source (parallel, one owner per file — no write conflicts) ----------
phase("Source");

const sourceLanes = [
  {
    label: "src:core-hub",
    prompt: `${COMMON}
YOUR LANE = the tightly-coupled STATE + WIRING core (E1 fully + the shell-side wiring of E2/E3/E4):
  FILES YOU OWN: core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts AND core/admin/ui/posts/editor/PostBlockEditorShell.tsx (and only these two).
Do E1 in usePostEditorLayout.ts EXACTLY per the contract §E1:
  - PostEditorLeftRailMode = "blocks" | "outline" | "list-view"; normalizeLeftRailMode defaults "blocks".
  - Redefine showInserter => secondarySidebar !== null && leftRailMode === "blocks".
  - Redefine showListView => secondarySidebar !== null && leftRailMode === "list-view" (lockstep, keep it truthful of the List tab).
  - openInserter() => open_secondary "list-view" sentinel + set_left_rail_mode "blocks". toggleInserter open => setLeftRailMode("blocks"); toggleListView open => setLeftRailMode("list-view").
In PostBlockEditorShell.tsx do the shell-side of E1/E2/E3/E4:
  - E1 storage fallback/parse/serialize: default leftRailMode "blocks"; accept "blocks"|"outline"|"list-view"; map legacy stored secondarySidebar:"inserter" → open + leftRailMode "blocks".
  - outlineVisible => !focusMode && secondarySidebarOpen && leftRailMode === "outline"; mobile secondary-open handler => setLeftRailMode("blocks").
  - E2: collapse the showInserter ? <PostInserterSidebar/> : <PostListViewSidebar/> branch into ONE unified <PostListViewSidebar/> (props per contract §E2 pseudocode: document/selectedBlockId/onSelectBlock/onDeleteBlock/onMoveBlockToIndex/onInsertBlock using source "outline-plus"/leftRailMode/onLeftRailModeChange/showOutlineHints/showKeyboardHints + thread recentlyUsedTypes for the Blocks tab). Re-point handleToggleInserter → open rail + setLeftRailMode("blocks"); handleToggleOutline → open rail + setLeftRailMode("outline").
  - E3: build pageActions = <PostEditorActionCluster status/saving/onPreview/onSaveDraft/onPublish> (reuse existing handlers) and pass pageTitle={editor.title||"Edit Post"} / pageDescription="Write, format, and publish your story." / pageActions into the layout. Pass NO breadcrumbs to the in-page PageHeader (AdminShell owns the single trail).
  - E4: thread pageTitle/pageDescription/pageActions through PostEditorTopBar → PostEditorLayout; keep onSaveDraft/canUndo/canRedo/onUndo/onRedo/viewportMode/onSetViewportMode/toggle refs wired.
This lane is the integration hub — after you edit, the sibling lanes' files (PostListViewSidebar, PostEditorActionCluster, PostEditorHeader/TopBar, PostEditorLayout/Regions) will match the interfaces the contract pins. Wire against those pinned interfaces.`,
  },
  {
    label: "src:layout",
    prompt: `${COMMON}
YOUR LANE = the framed card + regions (E4, Extension #2b + footer region kept):
  FILES YOU OWN: core/admin/ui/posts/editor/layout/PostEditorLayout.tsx AND core/admin/ui/posts/editor/layout/PostEditorRegions.tsx (only these two).
Per §E4:
  - Convert PostEditorLayout from the full-bleed AdminShell (contentClassName="overflow-hidden p-0") to a NORMAL padded, scrolling AdminShell page that renders the shared <PageHeader title={pageTitle} description={pageDescription} actions={pageActions}/> (NO breadcrumbs prop) ABOVE a framed card: className includes "flex min-h-[calc(100vh-13rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card", data-post-editor-frame="true", data-post-editor-density={editorDensity}, AND the density TEXT-SIZE class (editorDensity==="compact" ? "text-[13px]" : "text-[14px]") on the framed card/inner wrapper.
  - Card body = header region (chrome bar) then the three panes (secondary rail / content / details), then the footer region BELOW them. KEEP emitting PostEditorFooterRegion and KEEP footer?: React.ReactNode on props (two suites mount with footer={…} + assert aria-label="Post editor footer").
  - New props pageTitle?/pageDescription?/pageActions? MUST be OPTIONAL on PostEditorLayoutProps (three suites mount directly with the old prop set). Keep mobile Sheets as today. Keep compactSidePanels width overrides threaded: left compact w-56 (base w-60), right/details compact w-64 (base w-72) — compact MUST be narrower than base for BOTH panels.
  - PostEditorRegions.tsx: PostEditorHeaderRegion keep "shrink-0 border-b border-border bg-muted/40" (chrome bar). PostEditorSecondarySidebarRegion → w-60 shrink-0 border-r border-border bg-muted/20 lg:block. PostEditorSidebarRegion → w-72 shrink-0 border-l border-border bg-card lg:block. KEEP lg:block (do NOT adopt the proto xl:block — it must match the JS showDesktopDetails lg matchMedia gate). Keep the footer region (aria-label="Post editor footer").`,
  },
  {
    label: "src:chrome-header",
    prompt: `${COMMON}
YOUR LANE = the card chrome bar (E4, Extension #2b + #3) + TopBar prop threading:
  FILES YOU OWN: core/admin/ui/posts/editor/header/PostEditorHeader.tsx AND core/admin/ui/posts/editor/PostEditorTopBar.tsx (only these two).
Per §E4:
  - PostEditorHeader becomes the single chrome strip carrying data-post-editor-header-row="primary". Preview/Save draft/Publish are GONE from here (they move to PageHeader via the hub's pageActions).
  - LEFT of the strip: (optional) back-arrow button (keep data-post-editor-header-close + aria-label "Back to posts") + a STATIC "Post editor" title span. DROP the proto "Preview only" scaffolding pill.
  - RIGHT of the strip (grouped live-state → left-to-right): the dynamic sync <Badge variant="outline" data-post-editor-sync-state="true">{syncLabel}</Badge> (syncLabel = saving ? "Saving..." : dirty ? "Unsaved changes" : lastSavedAt ? \`Saved at \${formatSavedAt(lastSavedAt)}\` : "Synced"), then RELOCATE the EXISTING undo/redo buttons VERBATIM (carry data-post-editor-undo="true" / data-post-editor-redo="true" + disabled={!canUndo}/{!canRedo} + aria-label "Undo"/"Redo" + title — do NOT rebuild from the hookless prototype), then the device toggle (unchanged), then the six app toggles (Add block / Outline / Details / Focus / Revisions / Settings) as icon-ghost buttons with EVERY aria-pressed/aria-expanded/aria-controls/aria-keyshortcuts/data-post-editor-shortcut/ref preserved VERBATIM.
  - Drop any data-post-editor-header-row="secondary" / secondary-controls (single strip now).
  - PostEditorHeader RETAINS its dirty/saving/lastSavedAt props (computes syncLabel) and canUndo/canRedo/onUndo/onRedo props (renders relocated undo/redo).
  - PostEditorTopBar.tsx: thread the new pageTitle?/pageDescription?/pageActions? through to PostEditorLayout; keep every existing prop wired. The title/breadcrumbs props to TopBar/Header become vestigial (dynamic title now lives in PageHeader) but keep them as accepted props for back-compat mounts.`,
  },
  {
    label: "src:action-cluster",
    prompt: `${COMMON}
YOUR LANE = the primary actions cluster (E3, Extension #2a):
  FILE YOU OWN: core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx (only this one).
Per §E3:
  - The cluster now renders ONLY Preview (outline, Eye, aria-label "Open runtime preview") + Save draft (ghost, keep data-post-editor-save-draft) + Publish (Rocket; label + aria-label flip to "Update"/"Update published post" when status==="published", else "Publish"/"Publish post"). Keep data-post-editor-header-cluster="primary-actions".
  - REMOVE from this cluster: the autosave Badge, undo/redo buttons, and the internal syncLabel (they relocate to the chrome bar in the chrome-header lane).
  - TRIM PostEditorActionClusterProps to EXACTLY { status, saving, onPreview, onSaveDraft, onPublish }. Remove dirty / lastSavedAt (were REQUIRED) and canUndo / canRedo / onUndo / onRedo — leaving them required fails lint:types (TS2741) against the hub's pageActions call; leaving them destructured-but-unused trips no-unused-vars. Only the cluster narrows; PostEditorHeader keeps its own props.`,
  },
  {
    label: "src:rail",
    prompt: `${COMMON}
YOUR LANE = the unified LEFT rail (E2, Extension #1 render side) + the Blocks palette look:
  FILES YOU OWN: core/admin/ui/posts/editor/sidebars/PostListViewSidebar.tsx, core/admin/ui/posts/editor/sidebars/PostInserterSidebar.tsx, core/admin/ui/posts/editor/blocks/BlockInserter.tsx (only these three).
Per §E2:
  - PostListViewSidebar becomes ONE always-open rail with a THREE-tab segmented control (proto label "Blocks"): Tabs value={leftRailMode} onValueChange calls onLeftRailModeChange. TabsList grid grid-cols-3 bg-muted/40 aria-label="Editor left rail" with triggers data-post-editor-left-rail-tab="blocks"|"outline"|"list-view" labeled Blocks / Outline / List.
    * BLOCKS tab (default) forceMount id="post-editor-block-inserter": renders <BlockInserter onInsertBlock={onInsertBlock} showHeader={false} recentlyUsedTypes={recentlyUsedTypes} />.
    * OUTLINE tab forceMount id="post-editor-document-overview": keep <PostDocumentOutline .../>; RE-HOME (do NOT drop) the existing "Insert block from outline" Plus dropdown + data-post-editor-outline-insert="true" (aria-label "Insert block from outline") into this tab's header row.
    * LIST tab forceMount: keep <PostListViewPanel .../> verbatim.
    * KEEP root data-post-editor-sidebar, data-post-editor-left-rail-mode={leftRailMode}, role="region". Replace the old "Document Outline" header copy with a neutral rail title (or drop the header row). Root surface bg transparent so the region bg-muted/20 shows.
    * The component's default leftRailMode param becomes "blocks" (a suite mounts it with no prop and expects Blocks default). Add props onLeftRailModeChange?, onInsertBlock, recentlyUsedTypes as the contract pins.
  - PostInserterSidebar.tsx is KEPT as-is (its own test mounts it) — the unified rail renders BlockInserter directly, not PostInserterSidebar; make only minimal/no changes.
  - BlockInserter.tsx: className-only rail look using the shared EditorRail (wrap sections in EditorRailGroup so [data-editor-rail-group] is present; block rows as EditorRailItem). PRESERVE the listbox a11y VERBATIM: role="listbox" / role="option" / aria-selected / tabIndex / activeItemIndex roving keyboard + item descriptions. Do NOT swap the option <Button>. Support showHeader={false} + recentlyUsedTypes.`,
  },
];

const srcResults = await parallel(
  sourceLanes.map((l) => () => agent(l.prompt, { label: l.label, phase: "Source" }))
);
log(`Source: ${srcResults.filter(Boolean).length}/${sourceLanes.length} lanes completed`);

// ---------- Phase 2: Typecheck + lint, bounded fix loop ----------
phase("Typecheck");

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

async function runCmd(cmd, label, ph) {
  return await agent(
    `Run this from ${ROOT} and report the result — do NOT edit any file:\n  ${cmd}\nReturn {pass, summary, errors}. pass=true ONLY if it exits 0 with no type/lint errors. In errors[], list each distinct error with its file:line and message (cap ~40).`,
    { label, phase: ph, schema: GATE_SCHEMA }
  );
}

let tc = await runCmd(
  "bun --cwd core lint:types && bun --cwd core lint",
  "typecheck:1",
  "Typecheck"
);
let tcRound = 1;
while (tc && !tc.pass && tcRound <= 3) {
  log(`Typecheck round ${tcRound}: ${tc.errors.length} errors → fixing`);
  await agent(
    `TASK-497-02 implementation just landed and \`bun --cwd core lint:types && bun --cwd core lint\` FAILS. Fix the SOURCE (core/admin/ui/posts/** and shared/**) so it passes. Do NOT weaken types with any/@ts-ignore, do NOT edit tests or _docs. Preserve all data-post-editor-*/aria-* hooks. Consult the contract ${CONTRACT} for the intended interfaces. Errors:\n${tc.errors.map((e) => "- " + e).join("\n")}`,
    { label: `typecheck-fix:${tcRound}`, phase: "Typecheck" }
  );
  tcRound += 1;
  tc = await runCmd(
    "bun --cwd core lint:types && bun --cwd core lint",
    `typecheck:${tcRound}`,
    "Typecheck"
  );
}
log(
  `Typecheck: ${tc && tc.pass ? "GREEN" : "still failing after " + (tcRound - 1) + " fix rounds"}`
);

// ---------- Phase 3: Re-baseline the test suites (parallel by cluster — files are independent) ----------
phase("Tests");

const testClusters = [
  {
    label: "tests:state-hook",
    prompt: `Re-baseline the STATE/HOOK contract-lock suites for TASK-497-02 per the contract's Testing Requirements (read ${CONTRACT}). Files: tests/vitest/posts/post-editor-layout-state.test.ts (default leftRailMode "outline"→"blocks"; add a blocks→outline→list-view transition; keep all transition/focus-restore assertions), tests/vitest/ui/post-editor-layout-hook-wave.test.tsx (:66 "outline"→"blocks"; :173 showInserter true→false [FLIPS]; :193 STAYS true — verify, do NOT re-point to false; :174 showListView false→true [FLIPS]; :182 STAYS true — verify; keep the rest), tests/vitest/ui/post-editor-support-wave-2.test.tsx (re-run; re-baseline ONLY if the openInserter two-dispatch form genuinely shifts an assertion). Re-point ONLY the changed expectations to the NEW derivation — never weaken. Verify the actual implemented hook in core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts before editing. Do NOT edit source. Return the exact edits made.`,
  },
  {
    label: "tests:shell",
    prompt: `Re-baseline the SHELL suites for TASK-497-02 (read ${CONTRACT} Testing Requirements). Files: tests/vitest/ui/post-block-editor-shell.test.tsx (:12 "Document Outline" + :18 "List view" → new rail-tab labels / a stable marker; KEEP :13 data-post-editor-outline-insert="true" [re-homed into Outline tab, not dropped]), tests/vitest/ui/post-block-editor-shell-wave.test.tsx (TWO anchors: :1155 malformed fallback "outline"→"blocks"; AND the source:"sidebar" insert — PostInserterSidebar no longer renders in the shell, so re-point :620/:635-638 to the unified rail palette insert source:"outline-plus" OR remove that click+assert; KEEP :804 outline-plus + :632/:850 setLeftRailMode("outline") green; note close-inserter :619 gone → close coverage now from close-secondary-shell :621), tests/vitest/ui-integration/post-editor-smoke-regression.test.tsx (:14/:35 "Document Outline" → a stable rail marker e.g. the retained post-editor-document-overview id or data-post-editor-region="secondary-sidebar"; KEEP the classic-route not.toContain at :25). Verify against the real implemented source. Do NOT edit source. Return exact edits.`,
  },
  {
    label: "tests:layout",
    prompt: `Re-baseline the LAYOUT/RENDER suites for TASK-497-02 (read ${CONTRACT}). Files: tests/vitest/ui-integration/post-editor-layout-shell.test.tsx (assert PageHeader + framed card render; secondary-sidebar region bg-muted/20; Blocks tab default present+selected; :19 data-post-editor-left-rail-mode "outline"→"blocks"; :20 "List view"→"List"; :22 "Document Outline"→a stable rail marker/Outline-tab label; KEEP primary-actions, close, "Loading post editor", "Move to trash", Outline+List tabs present), tests/vitest/ui/post-editor-layout-render-wave.test.tsx (compact details override :202 toContain("w-72")→toContain("w-64"); KEEP :201 w-56; the two direct mounts must stay green given optional PageHeader props + retained footer? — re-run), tests/vitest/ui-integration/post-editor-layout-responsive.test.tsx (should STAY green — footer landmark + optional props; re-run, re-baseline only if a token genuinely moved). Verify against real source. Do NOT edit source. Return exact edits.`,
  },
  {
    label: "tests:rail",
    prompt: `Re-baseline the RAIL/SIDEBAR suites for TASK-497-02 (read ${CONTRACT}). Files: tests/vitest/ui/post-list-view-sidebar-wave.test.tsx (E2: PostListViewSidebar is now a 3-tab rail with a Blocks tab hosting a forceMount BlockInserter, "Document Outline" header dropped, "List view"→"List"; this suite mounts it directly and does NOT mock BlockInserter → mock BlockInserter here or assert the new three-tab shape; re-confirm [data-tabs-value='list-view'] :209 + button-text lookups resolve; thread new recentlyUsedTypes prop), tests/vitest/ui-integration/post-editor-listview-outline.test.tsx (three-tab rail; flip the component default param to "blocks"; :42 data-post-editor-left-rail-mode "outline"→"blocks"; :41/:45 header/"List view" copy → new tab labels/marker; :43/:44 tab-presence markers STAY green; :47 outline-insert hook KEPT re-homed into Outline tab). Verify against real implemented core/admin/ui/posts/editor/sidebars/PostListViewSidebar.tsx. Do NOT edit source. Return exact edits.`,
  },
  {
    label: "tests:topbar-isolation",
    prompt: `Re-baseline the TOPBAR-ISOLATION-mount suites for TASK-497-02 (read ${CONTRACT}). E3/E4 move PostEditorActionCluster (Preview/Save draft/Publish/primary-actions/"Update" flip/saving-disabled) OUT of PostEditorTopBar into the shell's PageHeader pageActions — so those assertions must MOVE onto a full-shell mount, they are NOT demoted-to-icon toggles. Files: tests/vitest/ui-integration/post-editor-header-workflow.test.tsx (:32/:41/:51/:59 primary-actions/Preview/saving-disabled/"Update" → move onto a full PostBlockEditorShell mount [or relocate into post-editor-shell-restyle / posts-editor-chrome-wave]; :43 dynamic title "Header workflow" → move onto the full-shell mount where PageHeader renders editor.title, OR re-point the TopBar-mount assertion to the static "Post editor"; KEEP against the TopBar mount the six icon toggles via aria-label/title incl. "Toggle block inserter" + "Hide document overview", data-post-editor-header-close, Revisions, Editor settings, sync badge "Saving..."; drop any header-row="secondary"/secondary-controls check), tests/vitest/ui-integration/post-editor-writing-canvas-flow.test.tsx (:36/:37 Preview/Publish → move onto a full-shell mount; KEEP the Outline-toggle "Hide document overview" icon assertion against the TopBar mount + the PostListViewPanel test), tests/vitest/ui-integration/post-autosave-flow.test.tsx (should STAY green — sync badge + Revisions kept in the TopBar/chrome bar; just re-run, edit ONLY if red). Verify against real source. Do NOT edit source. Return exact edits.`,
  },
  {
    label: "tests:newlook-regression",
    prompt: `Author/overwrite the NEW-LOOK suites for TASK-497-02 (read ${CONTRACT} + its "Regression-test shape" section verbatim). Files:
1) tests/vitest/ui/posts-editor-chrome-wave.test.tsx — this file ALREADY EXISTS (committed, encodes the REJECTED first-pass with leftRailMode:"outline" mock). OVERWRITE its describe body + the "outline" mock with the exact "Regression-test shape" from the contract (render the REAL PostBlockEditorShell; mock ONLY data/seam hooks usePostEditorState/usePostEditorLayout/usePostEditorPreferences/usePostEditorShortcuts/useFocusReturn + router/taxonomy/sonner/RuntimePreviewDialog; leave layout/topbar/sidebars/inspector/canvas REAL; stub matchMedia matches:true; use the repo idiom — // @vitest-environment happy-dom docblock, createRoot + React.act, container.querySelector — NOT @testing-library). Do NOT append a second describe leaving the old outline-default assertions.
2) tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx — ADD the new look: an in-page PageHeader renders the description "Write, format, and publish your story." + Preview/Publish in PageHeader.actions; the editor is wrapped in the framed card (data-post-editor-frame / rounded-2xl + shadow-card); re-point the old toContain("Publishing") inverse to "Post settings"; KEEP the canvas-card test (rounded-2xl/max-w-2xl/shadow-card) + the reducer-dirty test.
Verify every asserted class/hook against the REAL implemented source. Do NOT edit source. Return exact edits + confirm the old outline-default assertions are gone.`,
  },
];

const testResults = await parallel(
  testClusters.map((c) => () => agent(c.prompt, { label: c.label, phase: "Tests" }))
);
log(`Tests: ${testResults.filter(Boolean).length}/${testClusters.length} clusters re-baselined`);

// ---------- Phase 4: vitest gate, bounded fix loop ----------
phase("Gate");

const VITEST =
  "set -a && { [ ! -f .env ] || . ./.env; } && set +a && NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/posts tests/vitest/ui tests/vitest/ui-integration 2>&1 | tail -140";
let gate = await runCmd(VITEST, "vitest:1", "Gate");
let gRound = 1;
while (gate && !gate.pass && gRound <= 3) {
  log(`Vitest round ${gRound}: failing → fixing`);
  await agent(
    `TASK-497-02: the posts/ui/ui-integration vitest suites FAIL after the re-layout. Read the failures and fix them CORRECTLY: prefer fixing the SOURCE when the implementation diverged from the contract ${CONTRACT}; re-baseline a TEST only when the change is an intended contract update per the contract's Testing Requirements (never weaken a functional assertion, never drop a preserved data-post-editor-*/aria-* hook). Do NOT edit _docs. Failures:\n${gate.errors.map((e) => "- " + e).join("\n")}`,
    { label: `vitest-fix:${gRound}`, phase: "Gate" }
  );
  gRound += 1;
  gate = await runCmd(VITEST, `vitest:${gRound}`, "Gate");
}
// re-confirm typecheck after gate fixes may have edited source
const tcFinal = await runCmd(
  "bun --cwd core lint:types && bun --cwd core lint",
  "typecheck:final",
  "Gate"
);
log(
  `Gate: vitest ${gate && gate.pass ? "GREEN" : "RED after " + (gRound - 1) + " fix rounds"}; types ${tcFinal && tcFinal.pass ? "GREEN" : "RED"}`
);

// ---------- Phase 5: post-impl audit (parallel lenses) ----------
phase("Audit");

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

const auditLenses = [
  `PROTOTYPE-FIDELITY / NO-INVENTED-DEVIATIONS: compare the IMPLEMENTED Post editor source against the prototype source (${PROTO_DIR}/pages/content/PostEditorPreview.tsx + ${PROTO_DIR}/components/patterns/EditorPreviewFrame.tsx). Flag any place the implementation kept the OLD approach (full-viewport, Outline-default, single muted strip with no PageHeader/card) or otherwise deviated from the prototype without a documented Contract Extension. In-page PageHeader present? framed rounded-2xl/shadow-card card? Blocks-default left rail? dotted canvas + Post settings inspector? This is the PRIMARY lens.`,
  `HOOKS/A11Y PRESERVED: verify EVERY data-post-editor-* hook and aria-pressed/aria-expanded/aria-controls/aria-keyshortcuts survived the re-layout (relocated, not dropped). Especially: data-post-editor-undo/redo (relocated undo/redo), data-post-editor-outline-insert (re-homed into Outline tab), the DOM ids post-editor-block-inserter / post-editor-document-overview / post-editor-details still valid aria-controls targets, the six toggles' shortcuts. Grep the source to confirm; flag any silent drop.`,
  `NO DEAD CODE / NO ORPHANS: the owner forbids unused paths that still exist+import. Flag any now-unused component/prop/export left behind by the re-layout (e.g. PostInserterSidebar if truly orphaned, dead PostEditorActionCluster props, the vestigial "inserter" secondarySidebar value, unreferenced imports). Confirm PostInserterSidebar is still legitimately consumed (its own test mounts it) or flag it.`,
  `SECURITY / NO-CONTRACT-CHANGE: confirm the restyle changed NO route/endpoint/RBAC/permission/adminPath/cache and no data-model/autosave/revisions/preview/status flow. The new "blocks" mode + undo/redo + device toggle must be pure client-state. PageHeader/EditorRail import only presentational modules. Flag any accidental behavior/network change.`,
  `TEST INTEGRITY: confirm the re-baselined suites re-pointed ONLY changed strings/expectations and did NOT weaken functional assertions or delete coverage; confirm no suite was left double-booked or asserting the old outline-default as a false green; confirm posts-editor-chrome-wave.test.tsx was OVERWRITTEN (not appended). Flag any weakened/broken/false-green test.`,
];

const auditResults = await parallel(
  auditLenses.map(
    (lens, i) => () =>
      agent(
        `Post-implementation audit of TASK-497-02 (already implemented on disk). Read the contract ${CONTRACT} and the real implemented source under core/admin/ui/posts/editor/** + core/admin/ui/shared/{PageHeader,EditorRail}.tsx + the re-baselined tests under tests/vitest/{posts,ui,ui-integration}/. LENS:\n${lens}\nReturn findings[] (only real, evidence-backed HIGH/MED/LOW). Empty findings if clean.`,
        {
          label: `audit:${["proto", "hooks", "deadcode", "security", "tests"][i]}`,
          phase: "Audit",
          schema: AUDIT_SCHEMA,
        }
      )
  )
);

const allFindings = auditResults.filter(Boolean).flatMap((r) => r.findings || []);
const highMed = allFindings.filter((f) => f.severity === "high" || f.severity === "medium");

// Fix HIGH/MED once (source or test as appropriate), then re-run the gate quickly.
if (highMed.length > 0) {
  log(`Audit: ${highMed.length} HIGH/MED → fixing`);
  await agent(
    `Post-impl audit of TASK-497-02 found these HIGH/MEDIUM issues. Fix each correctly (source or test per the contract ${CONTRACT}; never weaken tests, never drop preserved hooks, no dead code). Do NOT edit _docs.\n${highMed
      .map(
        (f) =>
          `- [${f.severity}] ${f.area}: ${f.finding}\n  evidence: ${f.evidence}\n  fix: ${f.recommendation}`
      )
      .join("\n")}`,
    { label: "audit-fix", phase: "Audit" }
  );
  const gate2 = await runCmd(VITEST, "vitest:post-audit", "Audit");
  const tc2 = await runCmd(
    "bun --cwd core lint:types && bun --cwd core lint",
    "typecheck:post-audit",
    "Audit"
  );
  log(
    `Post-audit gate: vitest ${gate2 && gate2.pass ? "GREEN" : "RED"}; types ${tc2 && tc2.pass ? "GREEN" : "RED"}`
  );
}

return {
  source: srcResults.map((r, i) => ({ lane: sourceLanes[i].label, ok: !!r })),
  typecheck: tc && tc.pass,
  vitest: gate && gate.pass,
  typesFinal: tcFinal && tcFinal.pass,
  auditHighMed: highMed.length,
  auditFindings: allFindings,
};
