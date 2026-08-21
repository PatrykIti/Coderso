// TASK-542 implementation workflow (orchestrator-owned).
//
// Thin orchestration only: meta, task constants, the exact land order
// (01 -> 02 -> 03 -> 04), leaf tables, agent dispatch, gates, post-audit,
// full gates, six-flow real smoke, closure, and final drift. Shared
// schemas/prompts/fingerprints/smoke live in ./lib/s3-*.mjs and
// ./lib/post-audit.mjs. `agent`, `phase`, and `parallel` are harness-injected
// globals. Agents never stage or commit.

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
  name: "task-542-implement",
  description:
    "Implement TASK-542 sequentially (strict menu model, responsive neutralizers, public projection + active identity + cache safety, six-flow smoke) with per-leaf gates, post-audit, full gates, real Playwright smoke, and changelog 1319 closure. Agents never stage or commit.",
  phases: [
    { title: "Start gate" },
    { title: "542-01-L01" },
    { title: "542-02-L01" },
    { title: "542-03-L01" },
    { title: "542-03-L02" },
    { title: "542-03-L03" },
    { title: "Post-audit" },
    { title: "Full gates" },
    { title: "542-04-L01 smoke" },
    { title: "542-04-L01 closure" },
    { title: "Final drift" },
    { title: "Final metadata gate" },
  ],
};

const ROOT = "/home/coder/project/Coderso-s3";
const TASKS = `${ROOT}/_docs/_TASKS`;
const WORKFLOW = `${ROOT}/_docs/_workflows/task-542-implement.mjs`;
const TASK_ID = "TASK-542";
const CHANGELOG = 1319;
const SMOKE_SESSION = "wf542smoke";
const MIN_SMOKE_SCENARIOS = 6;
const BASELINE_MARKER = `${ROOT}/_docs/_workflows/.task-542-baseline`;

const COMMON = `
Forbidden paths: every TASK-539* file, TASK-541 color code, changelog 1318,
TASK-548* files, and the S6 collision-guard surface named in TASK-542-03-L01.
Never edit _docs/_TASKS/* or _docs/_CHANGELOG/* (orchestrator-owned). Land order is
fixed: 542-01 -> 542-02 -> 542-03 -> 542-04, after TASK-539 and TASK-541.`;

const ORCHESTRATOR_DIRTY = [
  "_docs/_TASKS/TASK-542_Menu_Determinism_Responsive_Cascade_and_Runtime_Parity.md",
  "_docs/_TASKS/TASK-542-01-Strict-Deterministic-Menu-Documents.md",
  "_docs/_TASKS/TASK-542-01-L01-Require-Unique-Ids-Topology-And-Stable-Legacy-Reads.md",
  "_docs/_TASKS/TASK-542-02-Responsive-Neutralizers-Scrolled-And-Brand-Parity.md",
  "_docs/_TASKS/TASK-542-02-L01-Reset-Every-Device-Value-And-Emit-Icon-Color.md",
  "_docs/_TASKS/TASK-542-03-Public-Projection-Active-Identity-And-Cache-Safety.md",
  "_docs/_TASKS/TASK-542-03-L01-Create-Shared-Public-Navigation-Projection.md",
  "_docs/_TASKS/TASK-542-03-L02-Use-Projection-Active-Identity-And-Responsive-Gates-At-Front.md",
  "_docs/_TASKS/TASK-542-03-L03-Revalidate-Menu-Design-Without-Clobbering-Drafts.md",
  "_docs/_TASKS/TASK-542-04-Tests-Smoke-And-Closure.md",
  "_docs/_TASKS/TASK-542-04-L01-Six-Cross-Device-Publish-Front-Flows-And-Closure.md",
  "_docs/_TASKS/README.md",
  "_docs/_CHANGELOG/README.md",
  "_docs/_workflows/task-542-implement.mjs",
  "_docs/_workflows/lib/s3-gate-contracts.mjs",
  "_docs/_workflows/lib/s3-fingerprint.mjs",
  "_docs/_workflows/lib/s3-prompts.mjs",
  "_docs/_workflows/lib/s3-smoke-schema.mjs",
];

const LINE_GATE = `node ${WORKFLOW} --check-task-family-line-limit`;

const LEAVES = [
  {
    id: "542-01-L01",
    contract: `${TASKS}/TASK-542-01-L01-Require-Unique-Ids-Topology-And-Stable-Legacy-Reads.md`,
    allowed: [
      "core/services/menus/menuDocumentV2.ts",
      "core/services/menus/menuDocumentV2Schema.ts",
      "core/services/menus/menuDocumentV2Normalize.ts",
      "core/services/menus/menuDocumentV2Devices.ts",
      "core/services/menus/menuDocumentV2Ops.ts",
      "tests/vitest/services/menu-document-v2.test.ts",
      "tests/unit/menus/menuService.test.ts",
      "tests/integration/routes/menus.test.ts",
    ],
    gate: `bun --cwd core lint:types && bun --cwd core lint && bunx vitest run tests/vitest/services/menu-document-v2.test.ts && set -a && source .env && set +a && bun test tests/unit/menus/menuService.test.ts tests/integration/routes/menus.test.ts && ${LINE_GATE} && git diff --check`,
  },
  {
    id: "542-02-L01",
    contract: `${TASKS}/TASK-542-02-L01-Reset-Every-Device-Value-And-Emit-Icon-Color.md`,
    allowed: [
      "core/site/menuDocumentCss.ts",
      "core/site/menuDocumentCssCore.ts",
      "core/site/menuDocumentCssRules.ts",
      "core/site/menuDocumentCssDelta.ts",
      "tests/vitest/site/menu-document-css.test.ts",
      "tests/vitest/services/menu-document-v2.test.ts",
      "tests/unit/site/menu-document-render.test.tsx",
    ],
    gate: `bun --cwd core lint:types && bun --cwd core lint && bunx vitest run tests/vitest/site/menu-document-css.test.ts tests/vitest/services/menu-document-v2.test.ts && bun test tests/unit/site/menu-document-render.test.tsx && ${LINE_GATE} && git diff --check`,
  },
  {
    id: "542-03-L01",
    contract: `${TASKS}/TASK-542-03-L01-Create-Shared-Public-Navigation-Projection.md`,
    allowed: [
      "core/services/navigation/publicNavigationProjection.ts",
      "tests/vitest/services/public-navigation-projection.test.ts",
      "tests/vitest/services/menu-item-settings-variant.test.ts",
      "tests/vitest/site/siteShell.test.tsx",
    ],
    gate: `bun --cwd core lint:types && bun --cwd core lint && bunx vitest run tests/vitest/services/public-navigation-projection.test.ts tests/vitest/services/menu-item-settings-variant.test.ts tests/vitest/site/siteShell.test.tsx && ${LINE_GATE} && git diff --check`,
  },
  {
    id: "542-03-L02",
    contract: `${TASKS}/TASK-542-03-L02-Use-Projection-Active-Identity-And-Responsive-Gates-At-Front.md`,
    allowed: [
      "core/site/siteShell.tsx",
      "tests/vitest/site/siteShell.test.tsx",
      "tests/vitest/site/menu-document-css.test.ts",
      "tests/unit/site/menu-document-render.test.tsx",
      "tests/integration/runtime/site-shell-runtime.test.ts",
    ],
    gate: `bun --cwd core lint:types && bun --cwd core lint && bunx vitest run tests/vitest/site/siteShell.test.tsx tests/vitest/site/menu-document-css.test.ts && bun test tests/unit/site/menu-document-render.test.tsx tests/integration/runtime/site-shell-runtime.test.ts && ${LINE_GATE} && git diff --check`,
  },
  {
    id: "542-03-L03",
    contract: `${TASKS}/TASK-542-03-L03-Revalidate-Menu-Design-Without-Clobbering-Drafts.md`,
    allowed: [
      "core/admin/ui/menus/MenuDesignEditor.tsx",
      "core/admin/ui/menus/MenuDesignEditorCanvas.tsx",
      "core/admin/ui/menus/MenuDesignEditorControls.tsx",
      "core/admin/ui/menus/MenuDesignEditorBarPanel.tsx",
      "core/admin/ui/menus/MenuDesignEditorBrandNavControls.tsx",
      "core/admin/ui/menus/MenuDesignEditorBlockPanel.tsx",
      "tests/vitest/ui/menu-design-editor.test.tsx",
      "tests/vitest/admin/menusClient.test.ts",
      "tests/vitest/site/siteShell.test.tsx",
    ],
    gate: `bun --cwd core lint:types && bun --cwd core lint && bunx vitest run tests/vitest/ui/menu-design-editor.test.tsx tests/vitest/admin/menusClient.test.ts tests/vitest/site/siteShell.test.tsx && bun --cwd core build:admin && bun run check:admin-boundary && bun run check:admin-bundle && ${LINE_GATE} && git diff --check`,
  },
  {
    id: "542-04-L01",
    contract: `${TASKS}/TASK-542-04-L01-Six-Cross-Device-Publish-Front-Flows-And-Closure.md`,
    allowed: [
      "tests/vitest/services/menu-document-v2.test.ts",
      "tests/vitest/services/public-navigation-projection.test.ts",
      "tests/vitest/site/menu-document-css.test.ts",
      "tests/vitest/site/siteShell.test.tsx",
      "tests/vitest/ui/menu-design-editor.test.tsx",
      "tests/vitest/admin/menusClient.test.ts",
      "tests/vitest/validation/menuSchemas.test.ts",
      "tests/unit/menus/menuService.test.ts",
      "tests/unit/site/menu-document-render.test.tsx",
      "tests/integration/runtime/site-shell-runtime.test.ts",
      "tests/integration/routes/menus.test.ts",
      "_docs/ADMIN_CACHE.md",
      "_docs/ADMIN_CACHE_MAP.md",
    ],
    gate: `bun --cwd core lint:types && bun --cwd core lint && bunx tsc -p tsconfig.json --noEmit && bunx vitest run tests/vitest/services/menu-document-v2.test.ts tests/vitest/services/public-navigation-projection.test.ts tests/vitest/site/menu-document-css.test.ts tests/vitest/site/siteShell.test.tsx tests/vitest/ui/menu-design-editor.test.tsx tests/vitest/admin/menusClient.test.ts tests/vitest/validation/menuSchemas.test.ts && set -a && source .env && set +a && bun test tests/unit/menus/menuService.test.ts tests/unit/site/menu-document-render.test.tsx tests/integration/runtime/site-shell-runtime.test.ts tests/integration/routes/menus.test.ts && bun --cwd core build:admin && bun run check:admin-boundary && bun run check:admin-bundle && bun run gates:coderso && git diff --check`,
  },
];

const FULL_GATES = Object.freeze([
  { id: "lint-types", command: "bun --cwd core lint:types" },
  { id: "lint", command: "bun --cwd core lint" },
  {
    id: "vitest-542-matrix",
    command: `bunx vitest run tests/vitest/services/menu-document-v2.test.ts tests/vitest/services/public-navigation-projection.test.ts tests/vitest/services/menu-item-settings-variant.test.ts tests/vitest/site/menu-document-css.test.ts tests/vitest/site/siteShell.test.tsx tests/vitest/ui/menu-design-editor.test.tsx tests/vitest/admin/menusClient.test.ts tests/vitest/validation/menuSchemas.test.ts`,
  },
  {
    id: "bun-542-lane",
    command: `set -a && source .env && set +a && bun test tests/unit/menus/menuService.test.ts tests/unit/site/menu-document-render.test.tsx tests/integration/runtime/site-shell-runtime.test.ts tests/integration/routes/menus.test.ts`,
  },
  { id: "build-admin", command: "bun --cwd core build:admin" },
  { id: "admin-boundary", command: "bun run check:admin-boundary" },
  { id: "admin-bundle", command: "bun run check:admin-bundle" },
  { id: "gates-coderso", command: "bun run gates:coderso" },
  { id: "family-line-limit", command: LINE_GATE },
  { id: "diff-check", command: "git diff --check" },
]);

const POST_LENS_INPUTS = Object.freeze({
  "strict-model": Object.freeze([
    "core/services/menus/menuDocumentV2.ts",
    "core/services/menus/menuDocumentV2Schema.ts",
    "core/services/menus/menuDocumentV2Normalize.ts",
    "tests/vitest/services/menu-document-v2.test.ts",
  ]),
  "css-neutralizers": Object.freeze([
    "core/site/menuDocumentCss.ts",
    "core/site/menuDocumentCssCore.ts",
    "tests/vitest/site/menu-document-css.test.ts",
  ]),
  "projection-active": Object.freeze([
    "core/services/navigation/publicNavigationProjection.ts",
    "core/site/siteShell.tsx",
    "tests/vitest/services/public-navigation-projection.test.ts",
    "tests/vitest/site/siteShell.test.tsx",
  ]),
  "cache-safety": Object.freeze([
    "core/admin/ui/menus/MenuDesignEditor.tsx",
    "tests/vitest/ui/menu-design-editor.test.tsx",
  ]),
  "test-integrity": Object.freeze([
    "tests/vitest/ui/menu-design-editor.test.tsx",
    "tests/vitest/site/siteShell.test.tsx",
    "tests/vitest/services/menu-document-v2.test.ts",
  ]),
});

const POST_LENSES = Object.freeze([
  {
    key: "strict-model",
    scope:
      "strict rejects for duplicate IDs/topology, stable legacy reads byte-identical, facade 100% surface preserved, split modules <=1000 lines.",
  },
  {
    key: "css-neutralizers",
    scope:
      "ON->OFF and L1->L2 reset matrix, responsive icon color emission, scrolled neutralizers, split facade byte-stable for no-override documents.",
  },
  {
    key: "projection-active",
    scope:
      "public projection helper pure contract, front consumes owner helper, exactly one aria-current under duplicate hrefs, effective-device gating.",
  },
  {
    key: "cache-safety",
    scope:
      "cache-first revalidation without dirty clobber, Keep editing preserves drafts, narrow canvas/Structure exit geometry, split editor <=1000 lines.",
  },
  {
    key: "test-integrity",
    scope:
      "All required cases in the right Vitest/Bun lanes, no weakened legacy assertion, each split suite independently runnable and <=1000 lines.",
  },
]);

const FINAL_LENSES = Object.freeze([
  {
    key: "graph",
    scope: "All 11 physical TASK-542 files terminal, board rows/statistics synchronized.",
  },
  {
    key: "changelog",
    scope: "Changelog 1319 with parent + 6 leaves coverage and exact validation/smoke evidence.",
  },
  {
    key: "docs",
    scope:
      "Menu model/runtime docs + ADMIN_CACHE.md/ADMIN_CACHE_MAP.md updated; no foreign doc bytes touched.",
  },
  {
    key: "evidence",
    scope:
      "Full gates, coderso gates, >=6 canonical flows, unique PNG hashes and cleanup are truthful.",
  },
  {
    key: "scope",
    scope:
      "Final diff preserves single writers, no source mutation after smoke, no other family change.",
  },
]);

const FINAL_LENS_INPUTS = Object.freeze({
  graph: Object.freeze([
    "_docs/_TASKS/TASK-542_Menu_Determinism_Responsive_Cascade_and_Runtime_Parity.md",
    "_docs/_TASKS/README.md",
    "_docs/_CHANGELOG/README.md",
  ]),
  changelog: Object.freeze(["_docs/_CHANGELOG/README.md"]),
  docs: Object.freeze(["_docs/ADMIN_CACHE.md", "_docs/ADMIN_CACHE_MAP.md"]),
  evidence: Object.freeze(["_docs/_workflows/_smoke/TASK-542"]),
  scope: Object.freeze(["core/services/menus"]),
});

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

if (process.argv.includes("--check-task-family-line-limit")) {
  const counted = assertFamilyLineLimit(ROOT, resolveBaseline());
  process.stdout.write(`${JSON.stringify({ pass: true, baseline: resolveBaseline(), counted })}\n`);
  process.exit(0);
}

if (process.argv.includes("--self-test-file-line-limit")) {
  try {
    const result = selfTestFileLineLimit("s3_line_gate_selftest_542");
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exit(result.pass ? 0 : 1);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ pass: false, error: String(error) })}\n`);
    process.exit(1);
  }
}

async function runWorkflow() {
  phase("Start gate");
  noStagedChanges(ROOT);
  const startGate = await agent(
    s3StartGatePrompt({ root: ROOT, taskId: TASK_ID, changelog: CHANGELOG }),
    {
      label: "start-gate:542",
      phase: "Start gate",
      schema: RESULT_SCHEMA_EXPORT,
    }
  );
  requirePassingResult(startGate, "TASK-542 start gate");
  const baseline = writeBaselineMarker();

  for (const leaf of LEAVES) {
    if (leaf.id === "542-04-L01") break;
    await implementLeaf(leaf);
  }

  phase("Post-audit");
  const postAudit = await runPostAudit(POST_LENSES, "Post-audit", POST_LENS_INPUTS);
  if (!postAudit.pass) throw new Error("TASK-542 post-audit remained non-clean");

  phase("Full gates");
  const fullGates = await agent(
    s3FullGatesPrompt({ root: ROOT, taskId: TASK_ID, fullGates: FULL_GATES }),
    {
      label: "full-gates:542",
      phase: "Full gates",
      schema: RESULT_SCHEMA_EXPORT,
    }
  );
  requirePassingResult(fullGates, "TASK-542 full gates");

  phase("542-04-L01 smoke");
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
    { label: "smoke:542", phase: "542-04-L01 smoke", schema: S3_SMOKE_SCHEMA }
  );
  try {
    validateS3Smoke(smoke);
  } catch (error) {
    if (error instanceof S3SmokeError)
      throw new Error(`TASK-542 smoke evidence invalid: ${error.message}`);
    throw error;
  }
  const smokeAudit = await agent(
    s3SmokeAuditPrompt({ root: ROOT, taskId: TASK_ID }, SMOKE_SESSION),
    {
      label: "smoke-audit:542",
      phase: "542-04-L01 smoke",
      schema: AUDIT_SCHEMA_EXPORT,
    }
  );
  requireCleanAudit(smokeAudit, "smoke-audit:542");

  phase("542-04-L01 closure");
  const beforeL41 = captureRepositoryFingerprint(ROOT);
  await agent(
    s3LeafImplPrompt(
      { root: ROOT, taskId: TASK_ID, changelog: CHANGELOG, extra: COMMON },
      LEAVES.find((leaf) => leaf.id === "542-04-L01")
    ),
    { label: "impl:542-04-L01", phase: "542-04-L01 closure" }
  );
  assertScopedRepositoryMutation(
    "impl:542-04-L01",
    beforeL41,
    captureRepositoryFingerprint(ROOT),
    LEAVES.find((leaf) => leaf.id === "542-04-L01").allowed,
    ROOT
  );
  const gateL41 = await runGate(
    LEAVES.find((leaf) => leaf.id === "542-04-L01"),
    1
  );
  requirePassingResult(gateL41, "gate:542-04-L01:1");
  const closure = await agent(
    s3ClosurePrompt(
      { root: ROOT, taskId: TASK_ID, changelog: CHANGELOG },
      { fullGates: fullGates.summary, smoke: smoke.summary }
    ),
    { label: "close:542", phase: "542-04-L01 closure" }
  );

  phase("Final drift");
  const finalDrift = await runPostAudit(FINAL_LENSES, "Final drift", FINAL_LENS_INPUTS);
  if (!finalDrift.pass) throw new Error("TASK-542 final drift is not clean");

  phase("Final metadata gate");
  const finalGate = await agent(
    s3FinalMetadataGatePrompt({ root: ROOT, taskId: TASK_ID, changelog: CHANGELOG }, WORKFLOW),
    {
      label: "final-gate:542",
      phase: "Final metadata gate",
      schema: RESULT_SCHEMA_EXPORT,
    }
  );
  requirePassingResult(finalGate, "TASK-542 final metadata gate");

  return Object.freeze({ pass: true, task: TASK_ID, baseline, closure });
}

export const result = await runWorkflow();
process.stdout.write(`${JSON.stringify(result)}\n`);
