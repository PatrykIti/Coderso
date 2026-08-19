// TASK-539 implementation workflow (orchestrator-owned).
//
// Thin orchestration only: meta, task constants, the exact land order, leaf
// tables, agent dispatch, gates, post-audit, aggregate gates, nine-flow smoke,
// closure, and final drift. Gate commands are extracted at runtime from each
// leaf contract's Validation / Validation and line receipt fenced block so the
// contract stays the single source of truth. Shared schemas/prompts/
// fingerprints/smoke live in ./lib/s3-*.mjs and ./lib/post-audit.mjs.
// `agent`, `phase`, and `parallel` are harness-injected globals.
// Agents never stage or commit.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  AUDIT_SCHEMA_EXPORT,
  FIXER_RESULT_SCHEMA_EXPORT,
  RESULT_SCHEMA_EXPORT,
  requireCleanAudit,
  requirePassingResult,
} from "./lib/s3-gate-contracts.mjs";
import {
  assertFamilyLineLimit,
  assertScopedRepositoryMutation,
  captureRepositoryFingerprint,
  noStagedChanges,
  selfTestFileLineLimit,
} from "./lib/s3-fingerprint.mjs";
import {
  S3_AUDIT_SCHEMA,
  S3_FIXER_RESULT_SCHEMA,
  S3_RESULT_SCHEMA,
  s3ClosurePrompt,
  s3FinalDriftLensPrompt,
  s3FinalMetadataGatePrompt,
  s3FullGatesPrompt,
  s3GateFixPrompt,
  s3GatePrompt,
  s3LeafImplPrompt,
  s3PostAuditFixPrompt,
  s3PostAuditLensPrompt,
  s3ScopeGatePrompt,
  s3SmokeAuditPrompt,
  s3SmokePrompt,
  s3StartGatePrompt,
} from "./lib/s3-prompts.mjs";
import {
  S3SmokeError,
  S3_SMOKE_SCHEMA,
  requireRuntimeSmokeSessionName,
  smokeTaskDirectory,
  validateS3Smoke,
} from "./lib/s3-smoke-schema.mjs";
import { runCanonicalPostAudit } from "./lib/post-audit.mjs";

export const meta = {
  name: "task-539-implement",
  description:
    "Implement TASK-539 sequentially (model, sanitizer, gallery controls, transform channels, renderer, responsive CSS, effects runtime) with exact leaf gates, aggregate gates, five-lens post-audit, nine-flow real smoke, and changelog 1318 closure. Agents never stage or commit.",
  phases: [
    { title: "Start gate" },
    { title: "539-01-L01" },
    { title: "539-01-L02" },
    { title: "539-02-L01" },
    { title: "539-02-L02" },
    { title: "539-03-L05" },
    { title: "539-03-L01" },
    { title: "539-03-L02" },
    { title: "539-03-L03" },
    { title: "539-03-L04" },
    { title: "539-04-L01" },
    { title: "539-04-L02" },
    { title: "539-05-L01" },
    { title: "539-05-L02" },
    { title: "539-06-L01" },
    { title: "539-06-L02" },
    { title: "539-07-L01" },
    { title: "539-07-L02" },
    { title: "Post-audit" },
    { title: "Aggregate gates" },
    { title: "539-08-L01 smoke" },
    { title: "539-08-L01 closure" },
    { title: "Final drift" },
    { title: "Final metadata gate" },
  ],
};

const ROOT = "/home/coder/project/Coderso-s3";
const TASKS = `${ROOT}/_docs/_TASKS`;
const WORKFLOW = `${ROOT}/_docs/_workflows/task-539-implement.mjs`;
const FIX_WORKFLOW = `${ROOT}/_docs/_workflows/task-539-fix.mjs`;
const TASK_ID = "TASK-539";
const CHANGELOG = 1318;
const SMOKE_SESSION = "wf539smoke";
const MIN_SMOKE_SCENARIOS = 9;
const BASELINE_MARKER = `${ROOT}/_docs/_workflows/.task-539-baseline`;

const COMMON = `
TASK-535 stays closed. Forbidden paths: every TASK-542* file, TASK-548* files and
the changelog-1261 index row, _docs/_workflows/task-548-*.mjs,
_docs/SECURITY_SPEC.md and docs/guide/screens/page-editor-preview-settings-and-history.md
until the TASK-539-08-L01 closure leaf owns them, TASK-540's CanvasEditor.tsx /
ScreenAuthoringCanvas.tsx / Custom Screen paths, changelog 1319, and all TASK-481
content-scope surfaces. Never edit _docs/_TASKS/* or _docs/_CHANGELOG/* except via the
closure leaf (orchestrator-owned). Land order is fixed: 01-L01 -> 01-L02 -> 02-L01 ->
02-L02 -> 03-L05 -> 03-L01 -> 03-L02 -> 03-L03 -> 03-L04 -> 04-L01 -> 04-L02 -> 05-L01
-> 05-L02 -> 06-L01 -> 06-L02 -> 07-L01 -> 07-L02 -> 08-L01.`;

const ORCHESTRATOR_DIRTY = [
  "_docs/_TASKS/TASK-539_Page_V2_Post_Audit_Remediation_II.md",
  "_docs/_TASKS/TASK-539-01-Page-Model-Schema-And-Normalization.md",
  "_docs/_TASKS/TASK-539-01-L01-Deep-Layer-Merge-Strict-Gallery-And-Effect-Normalization.md",
  "_docs/_TASKS/TASK-539-01-L02-Prove-Model-Roundtrip-And-Present-Key-Identity.md",
  "_docs/_TASKS/TASK-539-02-Grid-And-Background-Sanitizer-Corrections.md",
  "_docs/_TASKS/TASK-539-02-L01-Unitful-Grid-And-Split-Background-Layers.md",
  "_docs/_TASKS/TASK-539-02-L02-Prove-Grid-And-Background-Sanitizer-Corpus.md",
  "_docs/_TASKS/TASK-539-03-Gallery-Controls-Gating-And-Responsive-Canvas.md",
  "_docs/_TASKS/TASK-539-03-L01-Define-Gallery-Controls-Gates-And-Z-Clamp.md",
  "_docs/_TASKS/TASK-539-03-L02-Build-Gallery-Items-Media-Control.md",
  "_docs/_TASKS/TASK-539-03-L03-Wire-Gallery-And-Responsive-Page-Canvas.md",
  "_docs/_TASKS/TASK-539-03-L04-Prove-Gallery-Controls-And-Narrow-Canvas.md",
  "_docs/_TASKS/TASK-539-03-L05-Own-Shared-Grid-Placement-Contract.md",
  "_docs/_TASKS/TASK-539-04-Independent-Transform-Channels.md",
  "_docs/_TASKS/TASK-539-04-L01-Separate-Layer-Reveal-Hover-Tilt-And-Magnetic-Wrappers.md",
  "_docs/_TASKS/TASK-539-04-L02-Prove-Independent-Transform-Composition.md",
  "_docs/_TASKS/TASK-539-05-Renderer-Behavior-And-Geometry-Corrections.md",
  "_docs/_TASKS/TASK-539-05-L01-Stamp-And-Render-All-Page-Effects-Correctly.md",
  "_docs/_TASKS/TASK-539-05-L02-Prove-Renderer-Effects-And-Geometry.md",
  "_docs/_TASKS/TASK-539-06-Responsive-Css-Parity.md",
  "_docs/_TASKS/TASK-539-06-L01-Emit-Typography-Spans-Layers-And-Full-Bleed-Per-Device.md",
  "_docs/_TASKS/TASK-539-06-L02-Prove-Responsive-Css-Parity.md",
  "_docs/_TASKS/TASK-539-07-Per-Root-Idempotent-Effects-Runtime.md",
  "_docs/_TASKS/TASK-539-07-L01-Bind-Each-Page-Root-And-Footer-Exactly-Once.md",
  "_docs/_TASKS/TASK-539-07-L02-Prove-Main-And-Footer-Idempotence.md",
  "_docs/_TASKS/TASK-539-08-Tests-Docs-Smoke-And-Closure.md",
  "_docs/_TASKS/TASK-539-08-L01-Nine-Flow-Page-Parity-Suite-And-Closure.md",
  "_docs/_TASKS/README.md",
  "_docs/_CHANGELOG/README.md",
  "_docs/_workflows/task-539-implement.mjs",
  "_docs/_workflows/task-539-fix.mjs",
  "_docs/_workflows/lib/s3-gate-contracts.mjs",
  "_docs/_workflows/lib/s3-fingerprint.mjs",
  "_docs/_workflows/lib/s3-prompts.mjs",
  "_docs/_workflows/lib/s3-smoke-schema.mjs",
];

const LINE_GATE = `node ${WORKFLOW} --check-task-family-line-limit`;

// ---- Leaf tables (land order) ----

const LEAVES = [
  {
    id: "539-01-L01",
    contract: `${TASKS}/TASK-539-01-L01-Deep-Layer-Merge-Strict-Gallery-And-Effect-Normalization.md`,
    allowed: [
      "core/services/pages/pageDocumentV2.ts",
      "core/services/pages/pageDocumentV2Types.ts",
      "core/services/pages/pageDocumentV2Contract.ts",
      "core/services/pages/pageDocumentV2Schema.ts",
      "core/services/pages/pageDocumentV2Normalizer.ts",
      "core/services/pages/pageDocumentV2Normalization.ts",
      "core/services/pages/pageTextMarksV2.ts",
      "core/services/pages/pageBlockJsonSchemaV2.ts",
      "core/services/pages/pageSectionNormalizerV2.ts",
      "core/services/pages/pageBlockNormalizerV2.ts",
      "tests/vitest/pages/page-document-v2-test-helpers.ts",
      "tests/vitest/pages/page-document-v2-facade.test.ts",
      "tests/vitest/pages/page-document-v2.test.ts",
      "tests/vitest/pages/page-document-v2-tree-and-capabilities.test.ts",
      "tests/vitest/pages/page-document-v2-listing-and-settings.test.ts",
      "tests/vitest/pages/page-document-v2-style-contracts.test.ts",
      "tests/vitest/pages/page-document-v2-block-roundtrip.test.ts",
      "tests/vitest/pages/task-534-interactivity-model.test.ts",
    ],
  },
  {
    id: "539-01-L02",
    contract: `${TASKS}/TASK-539-01-L02-Prove-Model-Roundtrip-And-Present-Key-Identity.md`,
    allowed: ["tests/integration/routes/pages.test.ts"],
  },
  {
    id: "539-02-L01",
    contract: `${TASKS}/TASK-539-02-L01-Unitful-Grid-And-Split-Background-Layers.md`,
    allowed: [
      "core/services/pages/pageAuthoringSanitizers.ts",
      "tests/vitest/pages/page-authoring-sanitizers.test.ts",
    ],
  },
  {
    id: "539-02-L02",
    contract: `${TASKS}/TASK-539-02-L02-Prove-Grid-And-Background-Sanitizer-Corpus.md`,
    allowed: ["tests/vitest/pages/page-authoring-sanitizers-security-corpus.test.ts"],
  },
  {
    id: "539-03-L05",
    contract: `${TASKS}/TASK-539-03-L05-Own-Shared-Grid-Placement-Contract.md`,
    allowed: [
      "core/services/pages/pageBlockGridPlacement.ts",
      "tests/vitest/pages/page-block-grid-placement.test.ts",
    ],
  },
  {
    id: "539-03-L01",
    contract: `${TASKS}/TASK-539-03-L01-Define-Gallery-Controls-Gates-And-Z-Clamp.md`,
    allowed: [
      "core/services/pages/pageEditorControlRegistry.ts",
      "core/services/pages/pageEditorControlDefinition.ts",
      "core/services/pages/pageEditorBlockControlRegistry.ts",
      "core/services/pages/pageEditorBlockStyleControls.ts",
      "core/services/pages/pageEditorSectionControls.ts",
      "core/services/pages/pageEditorControlUiModel.ts",
      "tests/vitest/pages/page-editor-control-registry.test.ts",
      "tests/vitest/pages/page-editor-control-registry-capabilities.test.ts",
      "tests/vitest/pages/page-editor-control-registry-effects.test.ts",
      "tests/vitest/pages/page-editor-control-registry-responsive.test.ts",
      "tests/vitest/pages/page-editor-control-ui-model.test.ts",
    ],
  },
  {
    id: "539-03-L02",
    contract: `${TASKS}/TASK-539-03-L02-Build-Gallery-Items-Media-Control.md`,
    allowed: [
      "core/admin/ui/pages/editorControls/MediaUrlControl.tsx",
      "core/admin/ui/pages/editorControls/GalleryItemsControl.tsx",
      "core/admin/ui/pages/editorControls/GalleryCategoryTokensControl.tsx",
      "core/admin/ui/pages/editorControls/index.ts",
      "tests/vitest/ui/page-editor-media-url-control.test.tsx",
      "tests/vitest/ui/page-editor-gallery-items-control.test.tsx",
      "tests/vitest/ui/page-editor-gallery-category-tokens-control.test.tsx",
    ],
  },
  {
    id: "539-03-L03",
    contract: `${TASKS}/TASK-539-03-L03-Wire-Gallery-And-Responsive-Page-Canvas.md`,
    allowed: [
      "core/admin/ui/pages/editor/PageEditorRoot.tsx",
      "core/admin/ui/pages/editor/usePageEditorController.ts",
      "core/admin/ui/pages/editor/pageEditorDocumentCommands.ts",
      "core/admin/ui/pages/editor/PageEditorToolbar.tsx",
      "core/admin/ui/pages/editor/PageEditorRegistryFields.tsx",
      "core/admin/ui/pages/editor/PageEditorResponsivePanel.tsx",
      "core/admin/ui/pages/editor/PageEditorSettingsPanel.tsx",
      "tests/vitest/ui/page-editor-v2-flow.test.tsx",
      "tests/vitest/ui/page-editor-v2-authoring-flow.test.tsx",
      "tests/vitest/ui/page-editor-v2-controls-flow.test.tsx",
      "tests/vitest/ui/page-editor-v2-inline-edit-flow.test.tsx",
      "tests/vitest/ui/page-editor-v2-responsive-flow.test.tsx",
      "tests/vitest/ui/page-editor-v2-layout-flow.test.tsx",
      "tests/vitest/ui/page-editor-v2-persistence-flow.test.tsx",
      "tests/vitest/ui/page-editor-v2-settings-flow.test.tsx",
      "tests/vitest/ui/pageEditorV2FlowHarness.tsx",
    ],
  },
  {
    id: "539-03-L04",
    contract: `${TASKS}/TASK-539-03-L04-Prove-Gallery-Controls-And-Narrow-Canvas.md`,
    allowed: [
      "tests/vitest/pages/task-539-page-editor-controls.test.ts",
      "tests/vitest/ui/task-539-page-editor-flow.test.tsx",
    ],
  },
  {
    id: "539-04-L01",
    contract: `${TASKS}/TASK-539-04-L01-Separate-Layer-Reveal-Hover-Tilt-And-Magnetic-Wrappers.md`,
    allowed: [
      "core/services/pages/pageCompositionEffects.tsx",
      "tests/vitest/pages/page-composition-effects.test.ts",
      "tests/vitest/pages/task-534-interactivity-css.test.ts",
    ],
  },
  {
    id: "539-04-L02",
    contract: `${TASKS}/TASK-539-04-L02-Prove-Independent-Transform-Composition.md`,
    allowed: ["tests/vitest/pages/task-539-transform-composition.test.ts"],
  },
  {
    id: "539-05-L01",
    contract: `${TASKS}/TASK-539-05-L01-Stamp-And-Render-All-Page-Effects-Correctly.md`,
    allowed: [
      "core/services/pages/pageRendererV2.tsx",
      "core/services/pages/pageRendererV2Contract.ts",
      "core/services/pages/pageSectionRenderStyles.ts",
      "core/services/pages/pageBlockRenderStyles.ts",
      "core/services/pages/pageSectionRendererV2.tsx",
      "core/services/pages/pageStaticBlockRenderers.tsx",
      "core/services/pages/pageDataBlockRenderers.tsx",
      "core/services/pages/pageLayoutBlockRenderer.tsx",
      "core/services/pages/pageDocumentRenderState.ts",
      "core/services/pages/pageRendererReplicaIdentity.ts",
      "core/services/pages/pageRendererTimelineGeometry.ts",
      "tests/vitest/pages/page-renderer-v2-facade.test.tsx",
      "tests/vitest/pages/page-renderer-v2.test.tsx",
      "tests/vitest/pages/page-renderer-v2-section-layout.test.tsx",
      "tests/vitest/pages/page-renderer-v2-blocks.test.tsx",
      "tests/vitest/pages/page-renderer-v2-data-binding.test.tsx",
      "tests/vitest/pages/page-renderer-v2-effects.test.tsx",
      "tests/vitest/pages/page-renderer-v2-svg.test.tsx",
      "tests/vitest/pages/page-renderer-v2-composition.test.tsx",
      "tests/vitest/pages/page-renderer-timeline-geometry.test.ts",
      "tests/vitest/pages/task-534-interactivity-render.test.tsx",
    ],
  },
  {
    id: "539-05-L02",
    contract: `${TASKS}/TASK-539-05-L02-Prove-Renderer-Effects-And-Geometry.md`,
    allowed: ["tests/vitest/pages/task-539-renderer-effects-and-geometry.test.tsx"],
  },
  {
    id: "539-06-L01",
    contract: `${TASKS}/TASK-539-06-L01-Emit-Typography-Spans-Layers-And-Full-Bleed-Per-Device.md`,
    allowed: [
      "core/services/pages/pageResponsiveCss.ts",
      "core/services/pages/pageResponsiveCssContracts.ts",
      "core/services/pages/pageResponsiveCssDeclarations.ts",
      "core/services/pages/pageResponsiveCssSection.ts",
      "core/services/pages/pageResponsiveCssBlock.ts",
      "core/services/pages/pageResponsiveCssOrchestration.ts",
      "tests/vitest/pages/page-responsive-css.test.ts",
      "tests/vitest/pages/page-responsive-css-fixtures.ts",
      "tests/vitest/pages/page-responsive-css-section.test.ts",
      "tests/vitest/pages/page-responsive-css-block.test.ts",
      "tests/vitest/pages/page-responsive-css-security.test.ts",
      "tests/vitest/pages/page-responsive-grid-spans.test.ts",
    ],
  },
  {
    id: "539-06-L02",
    contract: `${TASKS}/TASK-539-06-L02-Prove-Responsive-Css-Parity.md`,
    allowed: ["tests/vitest/pages/task-539-responsive-css-parity.test.ts"],
  },
  {
    id: "539-07-L01",
    contract: `${TASKS}/TASK-539-07-L01-Bind-Each-Page-Root-And-Footer-Exactly-Once.md`,
    allowed: [
      "core/services/pages/pageEffectsRuntime.ts",
      "tests/vitest/pages/pageEffectsRuntime.test.ts",
      "tests/vitest/content/sectionScrollEffect.test.tsx",
      "tests/vitest/content/cursorSpotlight.test.tsx",
      "tests/vitest/content/task-534-interactivity-runtime.test.tsx",
    ],
  },
  {
    id: "539-07-L02",
    contract: `${TASKS}/TASK-539-07-L02-Prove-Main-And-Footer-Idempotence.md`,
    allowed: ["tests/vitest/pages/task-539-page-effects-runtime-rescan.test.tsx"],
  },
  {
    id: "539-08-L01",
    contract: `${TASKS}/TASK-539-08-L01-Nine-Flow-Page-Parity-Suite-And-Closure.md`,
    allowed: [
      "tests/integration/runtime/task-539-page-parity-runtime.test.ts",
      "_docs/PAGE_MODEL.md",
      "_docs/SECURITY_SPEC.md",
      "_docs/CMS_SPEC.md",
      "docs/develop/content-and-widgets.md",
      "docs/guide/screens/page-editor-preview-settings-and-history.md",
    ],
  },
];

// ---- Gate extraction from the leaf contract ----

function readLeafContract(leaf) {
  return readFileSync(leaf.contract, "utf8");
}

// Extracts the first fenced ```bash block under the Validation /
// Validation and line receipt / Exact targeted gates header.
function extractLeafGate(leaf) {
  const text = readLeafContract(leaf);
  const lines = text.split("\n");
  let inSection = false;
  let inFence = false;
  const collected = [];
  for (const line of lines) {
    if (
      !inSection &&
      /^## (Validation|Validation and line receipt|Exact targeted gates)/u.test(line)
    ) {
      inSection = true;
      continue;
    }
    if (inSection && !inFence && /^```/u.test(line)) {
      inFence = true;
      continue;
    }
    if (inSection && inFence && /^```/u.test(line)) break;
    if (inSection && inFence) collected.push(line);
  }
  const gate = collected.join("\n").trim();
  if (gate.length === 0) throw new Error(`${leaf.id}: no fenced gate found in contract`);
  return gate;
}

// ---- Baseline marker ----

function resolveBaseline() {
  if (existsSync(BASELINE_MARKER)) {
    const recorded = readFileSync(BASELINE_MARKER, "utf8").trim();
    if (recorded.length === 40) return recorded;
  }
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT }).toString().trim();
}

function writeBaselineMarker() {
  const baseline = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT }).toString().trim();
  mkdirSync(path.dirname(BASELINE_MARKER), { recursive: true });
  writeFileSync(BASELINE_MARKER, baseline, "utf8");
  return baseline;
}

// ---- Post-audit lens inputs (same shape as the 481 workflow) ----

function digestFileBytes(relativePath) {
  try {
    return createHash("sha256")
      .update(readFileSync(`${ROOT}/${relativePath}`))
      .digest("hex");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return "";
    throw error;
  }
}

function digestTreeBytes(relativePath) {
  const absolute = path.resolve(ROOT, relativePath);
  let entries;
  try {
    entries = readdirSync(absolute, { withFileTypes: true });
  } catch {
    return "";
  }
  const hash = createHash("sha256");
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const child = `${relativePath}/${entry.name}`;
    const childAbsolute = path.resolve(absolute, entry.name);
    if (entry.isDirectory()) hash.update(digestTreeBytes(child));
    else if (entry.isFile() && !entry.isSymbolicLink()) {
      try {
        hash.update(readFileSync(childAbsolute));
      } catch (error) {
        if (error && typeof error === "object" && error.code === "ENOENT") continue;
        throw error;
      }
    }
  }
  return hash.digest("hex");
}

const POST_LENS_INPUTS = Object.freeze({
  "scope-fidelity": Object.freeze([
    "_docs/_TASKS/TASK-539_Page_V2_Post_Audit_Remediation_II.md",
    "_docs/_TASKS/TASK-539-08-L01-Nine-Flow-Page-Parity-Suite-And-Closure.md",
  ]),
  "schema-strictness": Object.freeze([
    "core/services/pages/pageDocumentV2Schema.ts",
    "core/services/pages/pageDocumentV2Normalizer.ts",
    "core/services/pages/pageDocumentV2Normalization.ts",
  ]),
  "parsed-paint-security": Object.freeze([
    "core/services/pages/pageAuthoringSanitizers.ts",
    "core/services/pages/pageResponsiveCssDeclarations.ts",
  ]),
  "renderer-runtime": Object.freeze([
    "core/services/pages/pageRendererV2.tsx",
    "core/services/pages/pageCompositionEffects.tsx",
    "core/services/pages/pageRendererReplicaIdentity.ts",
    "core/services/pages/pageEffectsRuntime.ts",
  ]),
  "test-integrity": Object.freeze([
    "tests/integration/runtime/task-539-page-parity-runtime.test.ts",
    "tests/integration/routes/pages.test.ts",
    "tests/vitest/pages/page-document-v2-facade.test.ts",
  ]),
});

const POST_LENSES = Object.freeze([
  {
    key: "scope-fidelity",
    scope:
      "scope/finding fidelity, start gate, exact land order, TASK-535 remains closed, collision boundaries (TASK-481/478/540/542/548) respected.",
  },
  {
    key: "schema-strictness",
    scope:
      "schema/error strictness, legacy reads, present-only + byte identity, gallery strict shape, base-only responsive styles, deep layer merge.",
  },
  {
    key: "parsed-paint-security",
    scope:
      "parsed-paint/raw-style security, selector escaping, unitless grid grammar, placement parity, background-image/color split.",
  },
  {
    key: "renderer-runtime",
    scope:
      "transform/marquee/timeline channels, main/footer controller rescans, reduced motion, replica identity/inert isolation.",
  },
  {
    key: "test-integrity",
    scope:
      "test integrity, line receipts <=1000, docs/task/changelog graph, real-HTTP route proof, skipped-case count.",
  },
]);

const FINAL_LENSES = Object.freeze([
  {
    key: "graph",
    scope:
      "All 27 physical TASK-539 files terminal, board rows/statistics synchronized, TASK-535 stays closed.",
  },
  {
    key: "changelog",
    scope:
      "Changelog 1318 enumerates parent + 8 children + 18 leaves with exact validation/smoke evidence and index ordering.",
  },
  {
    key: "docs",
    scope:
      "Five owned docs updated; TASK-548 shared-writer paths landed before its writers start; hashes recorded.",
  },
  {
    key: "evidence",
    scope:
      "Aggregate gates, strict scan, nine canonical flows, unique PNG hashes and cleanup are truthful.",
  },
  {
    key: "scope",
    scope:
      "Final diff preserves single writers, no source mutation after smoke, no other family/route/migration/status change.",
  },
]);

const FINAL_LENS_INPUTS = Object.freeze({
  graph: Object.freeze([
    "_docs/_TASKS/TASK-539_Page_V2_Post_Audit_Remediation_II.md",
    "_docs/_TASKS/README.md",
    "_docs/_CHANGELOG/README.md",
  ]),
  changelog: Object.freeze(["_docs/_CHANGELOG/README.md"]),
  docs: Object.freeze([
    "_docs/PAGE_MODEL.md",
    "_docs/SECURITY_SPEC.md",
    "_docs/CMS_SPEC.md",
    "docs/develop/content-and-widgets.md",
    "docs/guide/screens/page-editor-preview-settings-and-history.md",
  ]),
  evidence: Object.freeze(["_docs/_workflows/_smoke/TASK-539"]),
  scope: Object.freeze(["core/services/pages"]),
});

function treeDigest() {
  const hash = createHash("sha256");
  hash.update(execFileSync("git", ["diff", "--binary", "HEAD"], { cwd: ROOT }));
  hash.update(readFileSync(WORKFLOW));
  hash.update(readFileSync(FIX_WORKFLOW));
  hash.update(
    execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: ROOT })
  );
  return hash.digest("hex");
}

function lensInputFingerprint(lens, inputsByKey) {
  const hash = createHash("sha256");
  for (const file of [...(inputsByKey[lens.key] ?? [])].sort()) {
    const stat = statSync(path.resolve(ROOT, file), { throwIfNoEntry: false });
    if (stat && stat.isDirectory()) hash.update(digestTreeBytes(file));
    else hash.update(digestFileBytes(file));
  }
  hash.update(lens.scope);
  return hash.digest("hex");
}

function everyLensInputFingerprints(lenses, inputsByKey) {
  return Object.fromEntries(
    lenses.map((lens) => [lens.key, lensInputFingerprint(lens, inputsByKey)])
  );
}

// ---- Agent helpers ----

async function runGate(leaf, attempt) {
  const result = await agent(
    s3GatePrompt(
      { root: ROOT, taskId: TASK_ID, changelog: CHANGELOG },
      { ...leaf, gate: extractLeafGate(leaf) },
      attempt
    ),
    { label: `gate:${leaf.id}:${attempt}`, phase: leaf.id, schema: RESULT_SCHEMA_EXPORT }
  );
  return requirePassingResult(result, `gate:${leaf.id}:${attempt}`);
}

async function runScopeGate(allowed, label) {
  const expected = [...new Set([...ORCHESTRATOR_DIRTY, ...allowed])];
  const result = await agent(s3ScopeGatePrompt({ root: ROOT, taskId: TASK_ID }, expected, label), {
    label: `scope:${label}`,
    phase: label,
    schema: RESULT_SCHEMA_EXPORT,
  });
  requirePassingResult(result, `${label}: scope gate`);
}

async function implementLeaf(leaf) {
  phase(leaf.id);
  const before = captureRepositoryFingerprint(ROOT);
  await agent(
    s3LeafImplPrompt({ root: ROOT, taskId: TASK_ID, changelog: CHANGELOG, extra: COMMON }, leaf),
    {
      label: `impl:${leaf.id}`,
      phase: leaf.id,
    }
  );
  assertScopedRepositoryMutation(
    `impl:${leaf.id}`,
    before,
    captureRepositoryFingerprint(ROOT),
    leaf.allowed,
    ROOT
  );
  await runScopeGate(
    LEAVES.slice(0, LEAVES.indexOf(leaf) + 1).flatMap(({ allowed }) => allowed),
    `${leaf.id}:implementation`
  );
  let gate = await runGate(leaf, 1);
  for (let attempt = 1; !gate.pass && attempt <= 3; attempt += 1) {
    const fixBefore = captureRepositoryFingerprint(ROOT);
    await agent(
      s3GateFixPrompt(
        { root: ROOT, taskId: TASK_ID, changelog: CHANGELOG },
        { ...leaf, gate: extractLeafGate(leaf) },
        attempt,
        gate.errors
      ),
      { label: `fix:${leaf.id}:${attempt}`, phase: leaf.id }
    );
    assertScopedRepositoryMutation(
      `fix:${leaf.id}:${attempt}`,
      fixBefore,
      captureRepositoryFingerprint(ROOT),
      leaf.allowed,
      ROOT
    );
    await runScopeGate(
      LEAVES.slice(0, LEAVES.indexOf(leaf) + 1).flatMap(({ allowed }) => allowed),
      `${leaf.id}:fix:${attempt}`
    );
    gate = await runGate(leaf, attempt + 1);
  }
  if (!gate.pass) throw new Error(`${leaf.id}: targeted gate remained red`);
}

async function runPostAudit(lenses, label, inputsByKey) {
  return runCanonicalPostAudit({
    lenses,
    runLens: (lens, pass) =>
      agent(s3PostAuditLensPrompt({ root: ROOT, taskId: TASK_ID }, lens), {
        label: `${label}:${lens.key}:${pass}`,
        phase: label,
        schema: AUDIT_SCHEMA_EXPORT,
      }),
    fix: async (blocking) => {
      const fixResult = await agent(
        s3PostAuditFixPrompt({ root: ROOT, taskId: TASK_ID, changelog: CHANGELOG }, blocking),
        {
          label: `${label}-fix:${TASK_ID}`,
          phase: label,
          schema: FIXER_RESULT_SCHEMA_EXPORT,
        }
      );
      return {
        affectedLensKeys: Array.isArray(fixResult.affectedLensKeys)
          ? fixResult.affectedLensKeys
          : [],
      };
    },
    validate: async () => {},
    fingerprint: treeDigest,
    fingerprintUniverse: treeDigest,
    fingerprintEveryLensInput: (lensList) => everyLensInputFingerprints(lensList, inputsByKey),
    maximumFixPasses: 1,
    label,
  });
}

// ---- CLI modes ----

if (process.argv.includes("--check-task-family-line-limit")) {
  const counted = assertFamilyLineLimit(ROOT, resolveBaseline());
  process.stdout.write(`${JSON.stringify({ pass: true, baseline: resolveBaseline(), counted })}\n`);
  process.exit(0);
}

if (process.argv.includes("--self-test-file-line-limit")) {
  try {
    const result = selfTestFileLineLimit("s3_line_gate_selftest_539");
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exit(result.pass ? 0 : 1);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ pass: false, error: String(error) })}\n`);
    process.exit(1);
  }
}

// ---- Main workflow ----

async function runWorkflow() {
  phase("Start gate");
  noStagedChanges(ROOT);
  const startGate = await agent(
    s3StartGatePrompt({ root: ROOT, taskId: TASK_ID, changelog: CHANGELOG }),
    {
      label: "start-gate:539",
      phase: "Start gate",
      schema: RESULT_SCHEMA_EXPORT,
    }
  );
  requirePassingResult(startGate, "TASK-539 start gate");
  const baseline = writeBaselineMarker();

  for (const leaf of LEAVES) {
    if (leaf.id === "539-08-L01") continue; // closure leaf lands before aggregate gates
    await implementLeaf(leaf);
  }

  phase("539-08-L01");
  const beforeL81 = captureRepositoryFingerprint(ROOT);
  await agent(
    s3LeafImplPrompt(
      { root: ROOT, taskId: TASK_ID, changelog: CHANGELOG, extra: COMMON },
      LEAVES.find((leaf) => leaf.id === "539-08-L01")
    ),
    { label: "impl:539-08-L01", phase: "539-08-L01" }
  );
  assertScopedRepositoryMutation(
    "impl:539-08-L01",
    beforeL81,
    captureRepositoryFingerprint(ROOT),
    LEAVES.find((leaf) => leaf.id === "539-08-L01").allowed,
    ROOT
  );
  const gateL81 = await runGate(
    LEAVES.find((leaf) => leaf.id === "539-08-L01"),
    1
  );
  requirePassingResult(gateL81, "gate:539-08-L01:1");

  phase("Aggregate gates");
  const aggregate = await agent(
    s3FullGatesPrompt({
      root: ROOT,
      taskId: TASK_ID,
      fullGates: [{ id: "task-539-aggregate", command: AGGREGATE_GATES }],
    }),
    { label: "aggregate-gates:539", phase: "Aggregate gates", schema: RESULT_SCHEMA_EXPORT }
  );
  requirePassingResult(aggregate, "TASK-539 aggregate gates");

  phase("Post-audit");
  const postAudit = await runPostAudit(POST_LENSES, "Post-audit", POST_LENS_INPUTS);
  if (!postAudit.pass) throw new Error("TASK-539 post-audit remained non-clean");

  phase("539-08-L01 smoke");
  requireRuntimeSmokeSessionName(SMOKE_SESSION);
  const smoke = await agent(
    s3SmokePrompt(
      {
        root: ROOT,
        taskId: TASK_ID,
        smokeRoot: smokeTaskDirectory(ROOT, TASK_ID),
        minScenarios: MIN_SMOKE_SCENARIOS,
      },
      SMOKE_SESSION
    ),
    { label: "smoke:539", phase: "539-08-L01 smoke", schema: S3_SMOKE_SCHEMA }
  );
  try {
    validateS3Smoke(smoke);
  } catch (error) {
    if (error instanceof S3SmokeError)
      throw new Error(`TASK-539 smoke evidence invalid: ${error.message}`);
    throw error;
  }
  const smokeAudit = await agent(
    s3SmokeAuditPrompt({ root: ROOT, taskId: TASK_ID }, SMOKE_SESSION),
    {
      label: "smoke-audit:539",
      phase: "539-08-L01 smoke",
      schema: AUDIT_SCHEMA_EXPORT,
    }
  );
  requireCleanAudit(smokeAudit, "smoke-audit:539");

  phase("539-08-L01 closure");
  const closure = await agent(
    s3ClosurePrompt(
      { root: ROOT, taskId: TASK_ID, changelog: CHANGELOG },
      { aggregate: aggregate.summary, smoke: smoke.summary }
    ),
    { label: "close:539", phase: "539-08-L01 closure" }
  );

  phase("Final drift");
  const finalDrift = await runPostAudit(FINAL_LENSES, "Final drift", FINAL_LENS_INPUTS);
  if (!finalDrift.pass) throw new Error("TASK-539 final drift is not clean");

  phase("Final metadata gate");
  const finalGate = await agent(
    s3FinalMetadataGatePrompt({ root: ROOT, taskId: TASK_ID, changelog: CHANGELOG }, WORKFLOW),
    {
      label: "final-gate:539",
      phase: "Final metadata gate",
      schema: RESULT_SCHEMA_EXPORT,
    }
  );
  requirePassingResult(finalGate, "TASK-539 final metadata gate");

  return Object.freeze({ pass: true, task: TASK_ID, baseline, closure });
}

const AGGREGATE_GATES = `node --check ${FIX_WORKFLOW}
node --check ${WORKFLOW}
node ${WORKFLOW} --self-test-file-line-limit
node ${WORKFLOW} --check-task-family-line-limit
bun --cwd core lint:types
bun --cwd core lint
bun --cwd core build:admin
bun --cwd core build:site
bun run check:admin-boundary
bun run check:admin-bundle
set -a && source .env && set +a
bun --eval 'import { canConnect, hasTable } from "./tests/utils/db"; const configured = Boolean(process.env.DATABASE_URL?.trim()); const reachable = configured && await canConnect(); const names = ["menus","menu_items","page_templates","pages","page_revisions","preview_tokens","seo_documents","content_types","content_entries","redirects","theme_profiles","theme_routes","audit_logs","access_logs","sessions","users","roles","user_roles","settings","ip_allowlist","forms","form_fields","listing_queries"]; const requiredTables = Object.fromEntries(await Promise.all(names.map(async (name) => [name, reachable && await hasTable(name)]))); process.stdout.write(JSON.stringify({ configured, reachable, requiredTables })); if (!reachable || Object.values(requiredTables).some((present) => !present)) process.exit(1); process.exit(0)'
bun test --timeout=15000 tests/integration/routes/pages.test.ts
bun test --timeout=30000 tests/integration/runtime/task-539-page-parity-runtime.test.ts
bun test --timeout=15000 tests/integration/runtime/pages-runtime.test.ts
bun test --timeout=15000 tests/integration/runtime/site-shell-runtime.test.ts
bun run test
bun run test:coverage
bun run precommit:check
bun run gates:coderso
bun run scan:security:strict
git diff --check`;

export const result = await runWorkflow();
process.stdout.write(`${JSON.stringify(result)}\n`);
