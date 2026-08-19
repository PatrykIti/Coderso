// TASK-481 implementation workflow (orchestrator-owned).
//
// Thin orchestration only: meta, task constants, sequential leaf tables,
// agent dispatch, gates, post-audit, smoke, and closure. Shared schemas live
// in ./lib/s3-gate-contracts.mjs, prompts in ./lib/s3-prompts.mjs, repo
// fingerprints + line gate in ./lib/s3-fingerprint.mjs, the smoke schema in
// ./lib/s3-smoke-schema.mjs, and the post-audit driver in ./lib/post-audit.mjs.
// `agent`, `phase`, `log`, and `parallel` are harness-injected globals.
// Agents never stage or commit.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
  name: "task-481-implement",
  description:
    "Implement TASK-481 sequentially (content scope, brand-token canvas emission, preview unification, WYSIWYG tests/docs), with per-leaf gates, post-audit, real Playwright smoke, and changelog 1317 closure. Agents never stage or commit.",
  phases: [
    { title: "Start gate" },
    { title: "481-01-L01" },
    { title: "481-01-L02" },
    { title: "481-01-L03" },
    { title: "481-02-L01" },
    { title: "481-02-L02" },
    { title: "Cross-lane gate" },
    { title: "481-03-L01" },
    { title: "481-03-L02" },
    { title: "Post-audit" },
    { title: "Full gates" },
    { title: "481-04-L01" },
    { title: "481-04-L02 close" },
    { title: "Final drift" },
    { title: "Final metadata gate" },
  ],
};

const ROOT = "/home/coder/project/Coderso-s3";
const TASKS = `${ROOT}/_docs/_TASKS`;
const WORKFLOW = `${ROOT}/_docs/_workflows/task-481-implement.mjs`;
const TASK_ID = "TASK-481";
const CHANGELOG = 1317;
// Verified pre-implementation baseline (the final S3 contract-commit HEAD).
const BASELINE_SHA = "43857c27";
const SMOKE_SESSION = "wf481smoke";
const MIN_SMOKE_SCENARIOS = 5;

const COMMON = `
Forbidden paths: all _docs/_TASKS/TASK-539* files, TASK-539's
tests/vitest/ui/page-editor-v2-*.test.tsx suites, the gallery/responsive SURFACES
TASK-539-03-L03 adds inside the split modules (gallery items/filter controls,
responsive-panel device logic, z-clamp rules), changelog 1318, and every TASK-542 file.
Never edit _docs/_TASKS/* or _docs/_CHANGELOG/* (orchestrator-owned). PageEditor.tsx
facade split (7 modules) is performed by 481-02-L02 with the 15-symbol public surface
(4 values + PageEditorProps + 10 host-contract types) preserved.`;

const ORCHESTRATOR_DIRTY = [
  "_docs/_TASKS/TASK-481_Page_Editor_Canvas_Brand_Token_WYSIWYG.md",
  "_docs/_TASKS/TASK-481-01-Content-Scope-Extraction-And-Chrome-Isolation.md",
  "_docs/_TASKS/TASK-481-01-L01-Content-Scope-Wrapper-In-RenderBlockFrame.md",
  "_docs/_TASKS/TASK-481-01-L02-Admin-Brand-Var-Reassertion-On-Chrome.md",
  "_docs/_TASKS/TASK-481-01-L03-Content-Scope-Characterization-Tests.md",
  "_docs/_TASKS/TASK-481-02-Brand-Token-Canvas-Emission-And-Live-Wiring.md",
  "_docs/_TASKS/TASK-481-02-L01-Brand-Canvas-CSS-Variable-Map.md",
  "_docs/_TASKS/TASK-481-02-L02-Wire-Brand-Map-Onto-Content-Scope.md",
  "_docs/_TASKS/TASK-481-03-Editor-Control-Preview-Unification.md",
  "_docs/_TASKS/TASK-481-03-L01-Live-Palette-Inline-Text-Color-Toolbar.md",
  "_docs/_TASKS/TASK-481-03-L02-Inline-Block-Canvas-Preview-Agreement-Test.md",
  "_docs/_TASKS/TASK-481-04-WYSIWYG-Tests-Docs-And-Closure.md",
  "_docs/_TASKS/TASK-481-04-L01-Brand-WYSIWYG-And-Real-Input-Smoke.md",
  "_docs/_TASKS/TASK-481-04-L02-Docs-And-Cross-Task-Reciprocity.md",
  "_docs/_TASKS/README.md",
  "_docs/_CHANGELOG/README.md",
  "_docs/_workflows/task-481-implement.mjs",
  "_docs/_workflows/lib/s3-gate-contracts.mjs",
  "_docs/_workflows/lib/s3-fingerprint.mjs",
  "_docs/_workflows/lib/s3-prompts.mjs",
  "_docs/_workflows/lib/s3-smoke-schema.mjs",
];

const LINE_GATE = `node ${WORKFLOW} --check-task-family-line-limit`;

const LEAF_GATE_BASE = `bun --cwd core lint:types && bun --cwd core lint && bun run test:vitest --`;

const FULL_GATES = Object.freeze([
  {
    id: "lint-types",
    command: `bun --cwd core lint:types`,
  },
  {
    id: "lint",
    command: `bun --cwd core lint`,
  },
  {
    id: "vitest-481-matrix",
    command: `bun run test:vitest -- tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/page-authoring-inline-color-toolbar.test.tsx tests/vitest/ui/page-authoring-link-toolbar.test.tsx tests/vitest/ui/page-authoring-toolbar-dock.test.tsx tests/vitest/ui/themeTokens.test.ts tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/page-editor-facade.test.ts`,
  },
  {
    id: "family-line-limit",
    command: LINE_GATE,
  },
  {
    id: "diff-check",
    command: `git diff --check`,
  },
]);

const SERIES_A = [
  {
    id: "481-01-L01",
    contract: `${TASKS}/TASK-481-01-L01-Content-Scope-Wrapper-In-RenderBlockFrame.md`,
    allowed: [
      "core/admin/ui/pages/editor/PageAuthoringCanvas.tsx",
      "core/admin/ui/pages/editor/PageAuthoringCanvasInline.tsx",
      "tests/vitest/ui/page-authoring-canvas.test.tsx",
    ],
    gate: `${LEAF_GATE_BASE} tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/page-authoring-inline-color-toolbar.test.tsx tests/vitest/ui/page-authoring-link-toolbar.test.tsx tests/vitest/ui/page-authoring-toolbar-dock.test.tsx && ${LINE_GATE} && git diff --check`,
  },
  {
    id: "481-01-L02",
    contract: `${TASKS}/TASK-481-01-L02-Admin-Brand-Var-Reassertion-On-Chrome.md`,
    allowed: [
      "core/ui/theme/tokenCss.ts",
      "core/admin/ui/pages/editor/PageAuthoringCanvas.tsx",
      "core/admin/ui/pages/editor/PageAuthoringCanvasInline.tsx",
      "tests/vitest/ui/page-authoring-canvas.test.tsx",
      "tests/vitest/ui/themeTokens.test.ts",
    ],
    gate: `${LEAF_GATE_BASE} tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/themeTokens.test.ts && ${LINE_GATE} && git diff --check`,
  },
  {
    id: "481-01-L03",
    contract: `${TASKS}/TASK-481-01-L03-Content-Scope-Characterization-Tests.md`,
    allowed: [
      "tests/vitest/ui/page-authoring-canvas.test.tsx",
      "tests/vitest/ui/pageAuthoringCanvasHarness.tsx",
      "tests/vitest/ui/page-authoring-inline-color-toolbar.test.tsx",
      "tests/vitest/ui/page-authoring-link-toolbar.test.tsx",
      "tests/vitest/ui/page-authoring-toolbar-dock.test.tsx",
    ],
    gate: `${LEAF_GATE_BASE} tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/page-authoring-inline-color-toolbar.test.tsx tests/vitest/ui/page-authoring-link-toolbar.test.tsx tests/vitest/ui/page-authoring-toolbar-dock.test.tsx && ${LINE_GATE} && git diff --check`,
  },
  {
    id: "481-02-L01",
    contract: `${TASKS}/TASK-481-02-L01-Brand-Canvas-CSS-Variable-Map.md`,
    allowed: ["core/ui/theme/tokenCss.ts", "tests/vitest/ui/themeTokens.test.ts"],
    gate: `${LEAF_GATE_BASE} tests/vitest/ui/themeTokens.test.ts && ${LINE_GATE} && git diff --check`,
  },
  {
    id: "481-02-L02",
    contract: `${TASKS}/TASK-481-02-L02-Wire-Brand-Map-Onto-Content-Scope.md`,
    allowed: [
      "core/admin/ui/pages/PageEditor.tsx",
      "core/admin/ui/pages/editor/PageEditorRoot.tsx",
      "core/admin/ui/pages/editor/usePageEditorController.ts",
      "core/admin/ui/pages/editor/pageEditorDocumentCommands.ts",
      "core/admin/ui/pages/editor/PageEditorToolbar.tsx",
      "core/admin/ui/pages/editor/PageEditorRegistryFields.tsx",
      "core/admin/ui/pages/editor/PageEditorResponsivePanel.tsx",
      "core/admin/ui/pages/editor/PageEditorSettingsPanel.tsx",
      "core/admin/ui/pages/editor/PageAuthoringCanvas.tsx",
      "core/admin/ui/pages/editor/PageAuthoringCanvasInline.tsx",
      "tests/vitest/ui/page-authoring-canvas.test.tsx",
      "tests/vitest/ui/page-editor-facade.test.ts",
    ],
    gate: `${LEAF_GATE_BASE} tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/page-authoring-inline-color-toolbar.test.tsx tests/vitest/ui/page-authoring-link-toolbar.test.tsx tests/vitest/ui/page-authoring-toolbar-dock.test.tsx tests/vitest/ui/themeTokens.test.ts tests/vitest/ui/page-editor-facade.test.ts && ${LINE_GATE} && git diff --check`,
  },
];

const SERIES_B = [
  {
    id: "481-03-L01",
    contract: `${TASKS}/TASK-481-03-L01-Live-Palette-Inline-Text-Color-Toolbar.md`,
    allowed: [
      "core/admin/ui/pages/editor/PageAuthoringCanvas.tsx",
      "core/admin/ui/pages/editor/PageAuthoringCanvasInline.tsx",
      "core/admin/ui/pages/editor/PageEditorRoot.tsx",
      "core/admin/ui/pages/editor/PageEditorRegistryFields.tsx",
      "core/admin/ui/pages/editor/usePageEditorHostWiring.ts",
      "core/services/pages/pageEditorColorPaletteContext.ts",
      "tests/vitest/ui/shared-color-control.test.tsx",
      "tests/vitest/ui/page-authoring-canvas.test.tsx",
    ],
    gate: `${LEAF_GATE_BASE} tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/page-authoring-inline-color-toolbar.test.tsx && ${LINE_GATE} && git diff --check`,
  },
  {
    id: "481-03-L02",
    contract: `${TASKS}/TASK-481-03-L02-Inline-Block-Canvas-Preview-Agreement-Test.md`,
    allowed: ["tests/vitest/ui/shared-color-control.test.tsx"],
    gate: `${LEAF_GATE_BASE} tests/vitest/ui/shared-color-control.test.tsx && ${LINE_GATE} && git diff --check`,
  },
];

const LEAVES = [...SERIES_A, ...SERIES_B];

// Post-audit lens inputs: every lens fingerprints its owned input files.
const POST_LENS_INPUTS = Object.freeze({
  "content-scope": Object.freeze([
    "core/admin/ui/pages/editor/PageAuthoringCanvas.tsx",
    "core/admin/ui/pages/editor/PageAuthoringCanvasInline.tsx",
    "tests/vitest/ui/page-authoring-canvas.test.tsx",
  ]),
  "brand-emission": Object.freeze([
    "core/ui/theme/tokenCss.ts",
    "core/admin/ui/pages/editor/PageEditorRoot.tsx",
    "core/admin/ui/pages/editor/usePageEditorController.ts",
    "tests/vitest/ui/themeTokens.test.ts",
    "tests/vitest/ui/page-authoring-canvas.test.tsx",
  ]),
  "preview-unification": Object.freeze([
    "tests/vitest/ui/shared-color-control.test.tsx",
    "core/admin/ui/pages/editor/PageAuthoringCanvas.tsx",
    "core/admin/ui/pages/editor/PageAuthoringCanvasInline.tsx",
    "core/admin/ui/pages/editor/PageEditorRoot.tsx",
  ]),
  "facade-parity": Object.freeze([
    "core/admin/ui/pages/PageEditor.tsx",
    "core/admin/ui/pages/editor/PageEditorRoot.tsx",
    "tests/vitest/ui/page-editor-facade.test.ts",
  ]),
  "test-integrity": Object.freeze([
    "tests/vitest/ui/page-authoring-canvas.test.tsx",
    "tests/vitest/ui/pageAuthoringCanvasHarness.tsx",
    "tests/vitest/ui/page-authoring-inline-color-toolbar.test.tsx",
    "tests/vitest/ui/page-authoring-link-toolbar.test.tsx",
    "tests/vitest/ui/page-authoring-toolbar-dock.test.tsx",
    "tests/vitest/ui/themeTokens.test.ts",
    "tests/vitest/ui/shared-color-control.test.tsx",
    "tests/vitest/ui/page-editor-facade.test.ts",
  ]),
});

const POST_LENSES = Object.freeze([
  {
    key: "content-scope",
    scope:
      "data-page-editor-content wrapper unique per block/section, chrome outside it, layout stays on the frame, data-page-editor-* hooks + selection unchanged.",
  },
  {
    key: "brand-emission",
    scope:
      "canvasBrandTokenVariables derivation off useCanvasSiteTokens, toPageCanvasBrandColorCssVariableMap contract, cache-bus live repaint, DEFAULT_TOKENS fallback, frame neutrals byte-stable.",
  },
  {
    key: "preview-unification",
    scope:
      "inline swatches render previewValue, brand-id filter preserved, committed var(--color-*) token, no toolbar-wide preventDefault, focusability.",
  },
  {
    key: "facade-parity",
    scope:
      "PageEditor.tsx facade keeps the 15-symbol public surface (4 values + PageEditorProps + 10 host-contract types), no export-star, consumers keep stable imports.",
  },
  {
    key: "test-integrity",
    scope:
      "All required cases present in the right Vitest lane; no weakened legacy assertion; each split suite independently runnable and <=1000 lines.",
  },
]);

const FINAL_LENSES = Object.freeze([
  {
    key: "graph",
    scope:
      "All 14 physical TASK-481 files, parent/child rows, board bucket/statistics and terminal statuses.",
  },
  {
    key: "changelog",
    scope:
      "Changelog 1317 with all 14 IDs, exact validation/smoke evidence, reservations and index ordering.",
  },
  {
    key: "docs",
    scope:
      "DESIGN_TOKENS.md brand-vs-neutral canvas model + TASK-479 reciprocity note; globals.css untouched.",
  },
  {
    key: "evidence",
    scope:
      "Full gates, strict scan qualification, >=5 canonical flows, unique PNG hashes and complete cleanup are truthful.",
  },
  {
    key: "scope",
    scope:
      "Final diff preserves single writers, no source mutation after smoke, no other task/widget/route/migration/status change.",
  },
]);

// Final-drift lens inputs: changelog-1317 file, task graph bytes, docs bytes,
// smoke evidence directory, and the full tracked tree.
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
    if (entry.isDirectory()) {
      hash.update(digestTreeBytes(child));
    } else if (entry.isFile() && !entry.isSymbolicLink()) {
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

const FINAL_LENS_INPUTS = Object.freeze({
  graph: Object.freeze([
    "_docs/_TASKS/TASK-481_Page_Editor_Canvas_Brand_Token_WYSIWYG.md",
    "_docs/_TASKS/TASK-481-01-Content-Scope-Extraction-And-Chrome-Isolation.md",
    "_docs/_TASKS/TASK-481-01-L01-Content-Scope-Wrapper-In-RenderBlockFrame.md",
    "_docs/_TASKS/TASK-481-01-L02-Admin-Brand-Var-Reassertion-On-Chrome.md",
    "_docs/_TASKS/TASK-481-01-L03-Content-Scope-Characterization-Tests.md",
    "_docs/_TASKS/TASK-481-02-Brand-Token-Canvas-Emission-And-Live-Wiring.md",
    "_docs/_TASKS/TASK-481-02-L01-Brand-Canvas-CSS-Variable-Map.md",
    "_docs/_TASKS/TASK-481-02-L02-Wire-Brand-Map-Onto-Content-Scope.md",
    "_docs/_TASKS/TASK-481-03-Editor-Control-Preview-Unification.md",
    "_docs/_TASKS/TASK-481-03-L01-Live-Palette-Inline-Text-Color-Toolbar.md",
    "_docs/_TASKS/TASK-481-03-L02-Inline-Block-Canvas-Preview-Agreement-Test.md",
    "_docs/_TASKS/TASK-481-04-WYSIWYG-Tests-Docs-And-Closure.md",
    "_docs/_TASKS/TASK-481-04-L01-Brand-WYSIWYG-And-Real-Input-Smoke.md",
    "_docs/_TASKS/TASK-481-04-L02-Docs-And-Cross-Task-Reciprocity.md",
    "_docs/_TASKS/README.md",
  ]),
  changelog: Object.freeze(["_docs/_CHANGELOG/README.md"]),
  docs: Object.freeze([
    "_docs/DESIGN_TOKENS.md",
    "core/admin/styles/globals.css",
    "_docs/_TASKS/TASK-479-05-L03-Globals-Css-Mapping-And-Dark-Mode.md",
    "_docs/_TASKS/TASK-479-08-L02-Page-Editor-Floating-Canvas.md",
  ]),
  evidence: Object.freeze(["_docs/_workflows/_smoke/TASK-481"]),
  scope: Object.freeze(["core/admin/ui/pages"]),
});

function finalLensInputFingerprint(lens) {
  const hash = createHash("sha256");
  for (const file of FINAL_LENS_INPUTS[lens.key] ?? []) {
    const stat = statSync(path.resolve(ROOT, file), { throwIfNoEntry: false });
    if (stat && stat.isDirectory()) hash.update(digestTreeBytes(file));
    else hash.update(digestFileBytes(file));
  }
  hash.update(lens.scope);
  return hash.digest("hex");
}

function everyFinalLensInputFingerprints(lenses) {
  return Object.fromEntries(lenses.map((lens) => [lens.key, finalLensInputFingerprint(lens)]));
}

// ---- Helpers ----

function treeDigest() {
  const hash = createHash("sha256");
  hash.update(execFileSync("git", ["diff", "--binary", "HEAD"], { cwd: ROOT }));
  hash.update(readFileSync(WORKFLOW));
  hash.update(
    execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: ROOT })
  );
  return hash.digest("hex");
}

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

function lensInputFingerprint(lens, inputsByKey) {
  const hash = createHash("sha256");
  for (const file of [...(inputsByKey[lens.key] ?? [])].sort()) hash.update(digestFileBytes(file));
  hash.update(lens.scope);
  return hash.digest("hex");
}

function everyLensInputFingerprints(lenses, inputsByKey) {
  return Object.fromEntries(
    lenses.map((lens) => [lens.key, lensInputFingerprint(lens, inputsByKey)])
  );
}

async function runGate(leaf, attempt) {
  const result = await agent(
    s3GatePrompt({ root: ROOT, taskId: TASK_ID, changelog: CHANGELOG }, leaf, attempt),
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
        leaf,
        attempt,
        gate.errors
      ),
      {
        label: `fix:${leaf.id}:${attempt}`,
        phase: leaf.id,
      }
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

async function runPostAudit(lenses, label, fingerprintEveryLensInput) {
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
    fingerprintEveryLensInput,
    maximumFixPasses: 1,
    label,
  });
}

// ---- CLI modes ----

const isDirectInvocation = () => {
  try {
    return (
      typeof process.argv[1] === "string" &&
      execFileSync("realpath", [process.argv[1]]).toString().trim() ===
        execFileSync("realpath", [fileURLToPath(import.meta.url)])
          .toString()
          .trim()
    );
  } catch {
    return false;
  }
};

if (process.argv.includes("--check-task-family-line-limit")) {
  const counted = assertFamilyLineLimit(ROOT, BASELINE_SHA);
  process.stdout.write(`${JSON.stringify({ pass: true, baseline: BASELINE_SHA, counted })}\n`);
  process.exit(0);
}

if (isDirectInvocation() && process.argv.includes("--self-test-file-line-limit")) {
  try {
    const result = selfTestFileLineLimit("s3_line_gate_selftest_481");
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
      label: "start-gate:481",
      phase: "Start gate",
      schema: RESULT_SCHEMA_EXPORT,
    }
  );
  requirePassingResult(startGate, "TASK-481 start gate");

  for (const leaf of SERIES_A) await implementLeaf(leaf);

  phase("Cross-lane gate");
  const crossLane = await agent(
    `Read-only TASK-481 cross-lane gate at ${ROOT}. Run bun --cwd core lint:types, bun --cwd core lint, and the full 481 Vitest matrix from the parent Validation Commands, then git diff --check. Do not edit. Return pass=true only when every command exits zero.`,
    { label: "gate:481-cross-lane", phase: "Cross-lane gate", schema: RESULT_SCHEMA_EXPORT }
  );
  requirePassingResult(crossLane, "TASK-481 cross-lane gate");

  for (const leaf of SERIES_B) await implementLeaf(leaf);

  phase("Post-audit");
  const postAudit = await runPostAudit(POST_LENSES, "Post-audit", (lensList) =>
    everyLensInputFingerprints(lensList, POST_LENS_INPUTS)
  );
  if (!postAudit.pass) throw new Error("TASK-481 post-audit remained non-clean");

  phase("Full gates");
  const fullGates = await agent(
    s3FullGatesPrompt({ root: ROOT, taskId: TASK_ID, fullGates: FULL_GATES }),
    {
      label: "full-gates:481",
      phase: "Full gates",
      schema: RESULT_SCHEMA_EXPORT,
    }
  );
  requirePassingResult(fullGates, "TASK-481 full gates");

  phase("481-04-L01");
  const beforeL41 = captureRepositoryFingerprint(ROOT);
  await agent(
    s3LeafImplPrompt(
      { root: ROOT, taskId: TASK_ID, changelog: CHANGELOG, extra: COMMON },
      {
        id: "481-04-L01",
        contract: `${TASKS}/TASK-481-04-L01-Brand-WYSIWYG-And-Real-Input-Smoke.md`,
        allowed: ["tests/vitest/ui/page-authoring-canvas.test.tsx"],
      }
    ),
    { label: "impl:481-04-L01", phase: "481-04-L01" }
  );
  assertScopedRepositoryMutation(
    "impl:481-04-L01",
    beforeL41,
    captureRepositoryFingerprint(ROOT),
    ["tests/vitest/ui/page-authoring-canvas.test.tsx"],
    ROOT
  );
  const gateL41 = await runGate(
    {
      id: "481-04-L01",
      gate: `${LEAF_GATE_BASE} tests/vitest/ui/page-authoring-canvas.test.tsx && ${LINE_GATE} && git diff --check`,
    },
    1
  );
  requirePassingResult(gateL41, "gate:481-04-L01:1");
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
    { label: "smoke:481", phase: "481-04-L01", schema: S3_SMOKE_SCHEMA }
  );
  try {
    validateS3Smoke(smoke);
  } catch (error) {
    if (error instanceof S3SmokeError)
      throw new Error(`TASK-481 smoke evidence invalid: ${error.message}`);
    throw error;
  }
  const smokeAudit = await agent(
    s3SmokeAuditPrompt({ root: ROOT, taskId: TASK_ID }, SMOKE_SESSION),
    {
      label: "smoke-audit:481",
      phase: "481-04-L01",
      schema: AUDIT_SCHEMA_EXPORT,
    }
  );
  requireCleanAudit(smokeAudit, "smoke-audit:481");

  phase("481-04-L02 close");
  const closure = await agent(
    s3ClosurePrompt(
      { root: ROOT, taskId: TASK_ID, changelog: CHANGELOG },
      { fullGates: fullGates.summary, smoke: smoke.summary }
    ),
    { label: "close:481", phase: "481-04-L02 close" }
  );

  phase("Final drift");
  const finalDrift = await runPostAudit(
    FINAL_LENSES,
    "Final drift",
    everyFinalLensInputFingerprints
  );
  if (!finalDrift.pass) throw new Error("TASK-481 final drift is not clean");

  phase("Final metadata gate");
  const finalGate = await agent(
    s3FinalMetadataGatePrompt({ root: ROOT, taskId: TASK_ID, changelog: CHANGELOG }, WORKFLOW),
    {
      label: "final-gate:481",
      phase: "Final metadata gate",
      schema: RESULT_SCHEMA_EXPORT,
    }
  );
  requirePassingResult(finalGate, "TASK-481 final metadata gate");

  return Object.freeze({ pass: true, task: TASK_ID, baseline: BASELINE_SHA, closure });
}

export const result = await runWorkflow();
process.stdout.write(`${JSON.stringify(result)}\n`);
