import { lstat, realpath, stat } from "node:fs/promises";

export const meta = {
  name: "task-538-implement",
  description:
    "Implement TASK-538 sequentially: immutable SVG policy, closed safe tree, React renderer containment, cross-lane proof, five-lens post-audit, real Playwright smoke, and changelog 1250 closure. Agents never stage or commit.",
  phases: [
    { title: "538-01-L01" },
    { title: "538-01-L02" },
    { title: "538-02-L01" },
    { title: "538-02-L02" },
    { title: "538-03 prepare" },
    { title: "Post-audit" },
    { title: "Smoke" },
    { title: "538-03 close" },
    { title: "Final drift" },
    { title: "Final gate" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ROOT + "/_docs/_TASKS";
const ENV = "set -a && source .env && set +a && ";
const REQUIRED_SMOKE_KINDS = [
  "safe-presentation",
  "class-root-isolation",
  "nested-svg",
  "draw-reduced-motion",
  "clip-outside-click",
];

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "errors"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
  },
};

const FULL_VALIDATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "summary",
    "errors",
    "commandOutcomes",
    "vitestPassedTests",
    "bunRuntimePassedTests",
    "runtimeTestExecuted",
    "runtimeTestSkipped",
    "releaseGatesPassed",
    "targetedSemgrepFindings",
    "strictScan",
  ],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
    commandOutcomes: {
      type: "object",
      additionalProperties: false,
      required: [
        "lintTypes",
        "lint",
        "vitest",
        "dbPreflight",
        "bunRuntime",
        "targetedSemgrep",
        "releaseGates",
        "strictScanExecuted",
        "diffCheck",
      ],
      properties: {
        lintTypes: { type: "boolean" },
        lint: { type: "boolean" },
        vitest: { type: "boolean" },
        dbPreflight: { type: "boolean" },
        bunRuntime: { type: "boolean" },
        targetedSemgrep: { type: "boolean" },
        releaseGates: { type: "boolean" },
        strictScanExecuted: { type: "boolean" },
        diffCheck: { type: "boolean" },
      },
    },
    vitestPassedTests: { type: "integer", minimum: 0 },
    bunRuntimePassedTests: { type: "integer", minimum: 0 },
    runtimeTestExecuted: { type: "boolean" },
    runtimeTestSkipped: { type: "boolean" },
    releaseGatesPassed: { type: "integer", minimum: 0, maximum: 5 },
    targetedSemgrepFindings: { type: "integer", minimum: 0 },
    strictScan: {
      type: "object",
      additionalProperties: false,
      required: ["exitCode", "task538Findings", "toolingFailure", "externalFindings"],
      properties: {
        exitCode: { type: "integer" },
        task538Findings: { type: "integer", minimum: 0 },
        toolingFailure: { type: "boolean" },
        externalFindings: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["owner", "file", "rule"],
            properties: {
              owner: { enum: ["TASK-545"] },
              file: { type: "string", minLength: 1 },
              rule: { type: "string", minLength: 1 },
            },
          },
        },
      },
    },
  },
};

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
          severity: { enum: ["high", "medium", "low"] },
          area: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
};

const SMOKE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "serverUp",
    "scenarios",
    "consoleErrors",
    "screenshots",
    "failures",
    "fixtureDeleted",
    "browserClosed",
    "serverStopped",
  ],
  properties: {
    pass: { type: "boolean" },
    serverUp: { type: "boolean" },
    scenarios: {
      type: "array",
      minItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "kind", "theme", "viewport", "visibleAssertions", "screenshot"],
        properties: {
          id: { type: "string", minLength: 1 },
          kind: { enum: REQUIRED_SMOKE_KINDS },
          theme: { enum: ["light", "dark"] },
          viewport: { enum: ["narrow", "wide"] },
          visibleAssertions: {
            type: "array",
            minItems: 1,
            items: { type: "string", minLength: 1 },
          },
          screenshot: { type: "string", minLength: 1 },
        },
      },
    },
    consoleErrors: { type: "array", items: { type: "string" } },
    screenshots: { type: "array", items: { type: "string" } },
    failures: { type: "array", items: { type: "string" } },
    fixtureDeleted: { type: "boolean" },
    browserClosed: { type: "boolean" },
    serverStopped: { type: "boolean" },
  },
};

function requireAllResults(results, expected, label) {
  if (!Array.isArray(results) || results.length !== expected.length) {
    throw new Error(label + ": expected " + expected.length + " results");
  }
  for (let index = 0; index < expected.length; index += 1) {
    const item = results[index];
    if (!item || item.id !== expected[index] || item.result == null) {
      throw new Error(label + ": missing/reordered result " + expected[index]);
    }
  }
  return results;
}

function resultPassed(result) {
  return result.pass === true && result.errors.length === 0;
}

function requireFullValidation(result, label) {
  const commandsPassed = Object.values(result.commandOutcomes).every((value) => value === true);
  const external = result.strictScan.externalFindings;
  const strictAccepted =
    result.strictScan.task538Findings === 0 &&
    result.strictScan.toolingFailure === false &&
    external.every((finding) => finding.owner === "TASK-545") &&
    ((result.strictScan.exitCode === 0 && external.length === 0) ||
      (result.strictScan.exitCode !== 0 && external.length > 0));
  const accepted =
    resultPassed(result) &&
    commandsPassed &&
    result.vitestPassedTests > 0 &&
    result.bunRuntimePassedTests > 0 &&
    result.runtimeTestExecuted === true &&
    result.runtimeTestSkipped === false &&
    result.releaseGatesPassed === 5 &&
    result.targetedSemgrepFindings === 0 &&
    strictAccepted;
  if (!accepted) throw new Error(label + ": structured full validation invariant failed");
  return result;
}

const FORBIDDEN =
  "Forbidden outside the declared leaf owner: completed TASK-536 source/docs/changelog; " +
  "all TASK-537/TASK-539/TASK-540/TASK-541/TASK-542/TASK-543/TASK-544/TASK-545 files; " +
  "scanner configuration; dependencies; migrations; PageEditor/PageDocument/responsive/runtime " +
  "seams not explicitly listed by the current leaf. Preserve any unrelated user work.";

const COMMON =
  "Repository: " +
  ROOT +
  ", branch feature/tasks-fixes. Fresh-read AGENTS.md, TASK-538 parent, " +
  "the complete physical child/leaf, source/tests, current HEAD/status/diff before editing. " +
  "Implement exactly one leaf in declared order. Code/comments are English. Do not stage, commit, " +
  "reset, checkout, suppress scanners, add a utility-class allowlist, add a dependency, endpoint, " +
  "migration, widget/editor surface, or detailed public exploit. Update the source-owner behavior " +
  "tests before its gate; never weaken/rebaseline unrelated assertions. " +
  FORBIDDEN;

const VITEST =
  "bunx vitest run --config vitest.config.ts " +
  "tests/vitest/pages/svg-sanitizer.test.ts " +
  "tests/vitest/pages/svg-safe-tree.test.ts " +
  "tests/vitest/pages/page-renderer-v2.test.tsx " +
  "tests/vitest/pages/page-document-v2.test.ts " +
  "tests/vitest/pages/page-editor-xss-guards.test.tsx";

const SEMGREP =
  "semgrep --error --timeout 120 --timeout-threshold 0 " +
  "--config .semgrep.yml --config p/owasp-top-ten --config p/security-audit " +
  "--config p/nodejs --config p/typescript " +
  "core/services/pages/svgSanitizerPolicy.ts core/services/pages/svgSanitizer.ts " +
  "core/services/pages/svgSafeTree.ts core/services/pages/pageRendererV2.tsx";

const DB_PREFLIGHT =
  ENV +
  'bun --eval \'import { canConnect } from "./tests/utils/db"; ' +
  'if (!(await canConnect())) throw new Error("task_538_db_unreachable"); process.exit(0)\'';

const FULL_VALIDATION =
  "bun --cwd core lint:types && bun --cwd core lint && " +
  VITEST +
  " && " +
  DB_PREFLIGHT +
  " && " +
  ENV +
  "bun test tests/integration/runtime/pages-runtime.test.ts && " +
  SEMGREP +
  " && bun run gates:coderso && git diff --check";

const LEAVES = [
  {
    id: "538-01-L01",
    file: "TASK-538-01-L01-Sanitize-Svg-Class-At-Write-And-Render.md",
    gate:
      "bun --cwd core lint:types && bun --cwd core lint && " +
      "bunx vitest run --config vitest.config.ts tests/vitest/pages/svg-sanitizer.test.ts",
  },
  {
    id: "538-01-L02",
    file: "TASK-538-01-L02-Build-Sanitizer-Owned-Safe-Svg-Tree.md",
    gate:
      "bun --cwd core lint:types && bun --cwd core lint && " +
      "bunx vitest run --config vitest.config.ts tests/vitest/pages/svg-sanitizer.test.ts " +
      "tests/vitest/pages/svg-safe-tree.test.ts tests/vitest/pages/page-document-v2.test.ts " +
      "tests/vitest/pages/page-renderer-v2.test.tsx",
  },
  {
    id: "538-02-L01",
    file: "TASK-538-02-L01-Integrate-Safe-Svg-Tree-In-Page-Renderer.md",
    gate: "bun --cwd core lint:types && bun --cwd core lint && " + VITEST,
  },
  {
    id: "538-02-L02",
    file: "TASK-538-02-L02-Prove-Geometry-And-Click-Through-Isolation.md",
    gate:
      "bun --cwd core lint:types && bun --cwd core lint && " +
      VITEST +
      " && " +
      DB_PREFLIGHT +
      " && " +
      ENV +
      "bun test tests/integration/runtime/pages-runtime.test.ts && " +
      SEMGREP,
  },
];

async function runGate(leaf, attempt) {
  return await agent(
    "Read-only gate for " +
      leaf.id +
      ", attempt " +
      attempt +
      ". Run exactly from " +
      ROOT +
      ":\n" +
      leaf.gate +
      "\nReturn pass only if every command exits zero. For 538-02-L02, confirm the " +
      "named TASK-538 public/preview test executed and was not skipped. Re-run each named " +
      "failure alone once.",
    { label: "gate:" + leaf.id + ":" + attempt, phase: leaf.id, schema: RESULT_SCHEMA }
  );
}

async function runFullValidation(label) {
  return await agent(
    "Independent read-only full TASK-538 validation (" +
      label +
      ") at " +
      ROOT +
      ". Run the command chain below without editing:\n" +
      FULL_VALIDATION +
      "\nThen run independently: bun run scan:security:strict\n" +
      "\nThe DB preflight and named TASK-538 public/preview runtime test must execute; a skip " +
      "is failure. Lint/types, all Vitest, Bun runtime, targeted Semgrep and all five " +
      "release gates must be green. Run the strict scan without suppression. If strict " +
      "scan exits nonzero, pass may remain true only after verifying every finding is the " +
      "unchanged TASK-545-owned workflow finding; list it in summary. Any TASK-538 or other " +
      "finding makes pass=false. Re-run each named test failure alone once. Populate every " +
      "structured command outcome/count, runtime executed/skipped flag, exact 5-gate count, " +
      "targeted finding count, and strict result. External strict entries contain only " +
      "owner/file/rule identifiers and stay in strictScan.externalFindings plus summary, never " +
      "errors. A passing result has an empty errors array. Never return raw logs, environment " +
      "values, credentials, or payloads.",
    {
      label: "full-gate:" + label,
      phase: "Post-audit",
      schema: FULL_VALIDATION_SCHEMA,
    }
  );
}

for (const leaf of LEAVES) {
  phase(leaf.id);
  await agent(
    COMMON +
      "\n\nImplement " +
      leaf.id +
      ". Read in full: " +
      TASKS +
      "/" +
      leaf.file +
      ". Honor exact types/helper names, data flow, errors, ownership, compatibility and tests.",
    { label: "impl:" + leaf.id, phase: leaf.id }
  );
  let gate = await runGate(leaf, 1);
  for (let fix = 1; !resultPassed(gate) && fix <= 3; fix += 1) {
    await agent(
      COMMON +
        "\n\nFix only verified " +
        leaf.id +
        " gate failures:\n- " +
        gate.errors.join("\n- "),
      { label: "fix:" + leaf.id + ":" + fix, phase: leaf.id }
    );
    gate = await runGate(leaf, fix + 1);
  }
  if (!resultPassed(gate)) throw new Error(leaf.id + ": targeted gate remained red");
}

phase("538-03 prepare");
await agent(
  COMMON +
    "\n\nRead TASK-538-03 and 538-03-L01 in full. Update only _docs/SECURITY_SPEC.md, " +
    "_docs/PAGE_MODEL.md, and the existing Page-block maintenance paragraph in _docs/WIDGETS.md. " +
    "Keep defensive wording redacted and Page-owned. Do not run source fixers, create " +
    "changelog 1250, or close statuses before audit/smoke.",
  { label: "prepare:538-03", phase: "538-03 prepare" }
);
const prepareGate = await runFullValidation("prepare");
requireFullValidation(prepareGate, "TASK-538 prepare validation");

const LENSES = [
  [
    "policy",
    "One immutable tag/attr/namespace/local-ref policy; no class/style; canonical tag behavior and prior mXSS corpus intact.",
  ],
  [
    "tree",
    "Exact producer grammar, entity/control/ref checks, full consumption, total React mapping, sparse immutable tree, exact node/depth/text caps.",
  ],
  [
    "renderer",
    "No author-data raw-markup sink; trusted pre-strip ratio derivation; 1/8..8 and 1024px caps; clip/contain/pointer semantics; draw-in and a11y parity.",
  ],
  [
    "runtime-tests",
    "Write/render defence-in-depth, public/preview Bun parity, no assertion weakening, correct lanes, scoped DB fixture and targeted scanner clean.",
  ],
  [
    "scope-docs",
    "No endpoint/dependency/migration/widget expansion; redacted public docs; Page-owned WIDGETS maintenance only; TASK-539 handoff and program map intact.",
  ],
];

phase("Post-audit");
for (let round = 1; round <= 2; round += 1) {
  const results = await Promise.all(
    LENSES.map(async ([id, lens]) => ({
      id,
      result: await agent(
        "Fresh read-only TASK-538 post-audit round " +
          round +
          " at " +
          ROOT +
          ". Read final source/tests/docs/tasks/status/diff. Lens: " +
          lens +
          " Return every HIGH/MEDIUM/LOW finding with file:line; do not edit.",
        { label: "post:" + id + ":" + round, phase: "Post-audit", schema: AUDIT_SCHEMA }
      ),
    }))
  );
  requireAllResults(
    results,
    LENSES.map(([id]) => id),
    "TASK-538 post-audit " + round
  );
  const findings = results.flatMap(({ result }) => result.findings);
  if (findings.length === 0) break;
  if (round === 2) throw new Error("TASK-538 post-audit remained non-clean");
  const fixResult = await agent(
    COMMON +
      "\n\nFix every verified HIGH/MEDIUM/LOW post-audit finding through its " +
      "original owner seam, update owned tests, and rerun affected gates:\n- " +
      findings.map((finding) => finding.evidence + ": " + finding.finding).join("\n- "),
    { label: "post-fix:1", phase: "Post-audit", schema: RESULT_SCHEMA }
  );
  if (!resultPassed(fixResult)) throw new Error("TASK-538 post-audit fixer failed");
  const fixGate = await runFullValidation("post-fix-" + round);
  requireFullValidation(fixGate, "TASK-538 post-fix validation");
}

const postAuditGate = await runFullValidation("final-post-audit");
requireFullValidation(postAuditGate, "TASK-538 final post-audit gate");

phase("Smoke");
const smoke = await agent(
  "Final real-browser TASK-538 smoke at " +
    ROOT +
    ". Fresh-read parent and 538-02-L02. " +
    "Load .env without printing secrets. Restart using the literal command coderso-dev-core-host; " +
    "health-check http://coderso-a.localhost:5173/admin/ and http://coderso-a.localhost:3000/. " +
    "Use the full prefix playwright-cli -s=wf538smoke for every browser operation and credentials " +
    "only from .env. Through the real Page builder create a uniquely scoped Page, save, publish, " +
    "verify front, then delete only that fixture. Run at least five distinct visible-effect flows: " +
    "safe fill/stroke; harmless class/root-layout stripping with wide+tall ratio clamps; nested " +
    "defs/gradient/use/text; draw-in pathLength and reduced-motion; two separate " +
    "clip-outside-click records (narrow and wide), each proving clipped paint plus " +
    "elementFromPoint/real click immediately outside the complete block frame. Cover light/dark, " +
    "computed geometry/styles/DOM, no horizontal expansion, and zero console errors. Save only " +
    "absolute paths under " +
    ROOT +
    "/_docs/_workflows/_smoke/task-538-*.png. Close with " +
    "playwright-cli -s=wf538smoke close and stop task-scoped server processes after cleanup. " +
    "Return each scenario as {id,kind,theme,viewport,visibleAssertions,screenshot} with a stable " +
    "unique ID. Cover every required kind exactly from the workflow enum, plus light/dark and " +
    "narrow/wide, with assertions tied to that kind and its absolute screenshot path. Return " +
    "fixtureDeleted/browserClosed/serverStopped booleans from actual cleanup. Do not edit " +
    "source/tests/docs/status.",
  { label: "smoke:538", phase: "Smoke", schema: SMOKE_SCHEMA }
);
const smokePrefix = ROOT + "/_docs/_workflows/_smoke/task-538-";
const scenarioIds = smoke.scenarios.map((scenario) => scenario.id.trim());
const scenarioKinds = new Set(smoke.scenarios.map((scenario) => scenario.kind));
const clipOutsideViewports = new Set(
  smoke.scenarios
    .filter((scenario) => scenario.kind === "clip-outside-click")
    .map((scenario) => scenario.viewport)
);
const scenarioScreenshots = smoke.scenarios.map((scenario) => scenario.screenshot);
const uniqueScreenshotPaths = new Set(smoke.screenshots);
const scenarioScreenshotSet = new Set(scenarioScreenshots);
const smokeInvariant =
  smoke.pass &&
  smoke.serverUp &&
  smoke.scenarios.length >= 5 &&
  new Set(scenarioIds).size === smoke.scenarios.length &&
  scenarioIds.every(Boolean) &&
  scenarioKinds.size === REQUIRED_SMOKE_KINDS.length &&
  REQUIRED_SMOKE_KINDS.every((kind) => scenarioKinds.has(kind)) &&
  clipOutsideViewports.size === 2 &&
  clipOutsideViewports.has("narrow") &&
  clipOutsideViewports.has("wide") &&
  smoke.scenarios.every(
    (scenario) =>
      scenario.visibleAssertions.length > 0 &&
      scenario.visibleAssertions.every((assertion) => assertion.trim().length > 0)
  ) &&
  new Set(smoke.scenarios.map((scenario) => scenario.theme)).size === 2 &&
  new Set(smoke.scenarios.map((scenario) => scenario.viewport)).size === 2 &&
  smoke.consoleErrors.length === 0 &&
  smoke.failures.length === 0 &&
  smoke.screenshots.length >= 5 &&
  uniqueScreenshotPaths.size === smoke.screenshots.length &&
  scenarioScreenshotSet.size === smoke.scenarios.length &&
  scenarioScreenshots.every((path) => uniqueScreenshotPaths.has(path)) &&
  smoke.screenshots.every((path) => path.startsWith(smokePrefix) && path.endsWith(".png")) &&
  smoke.fixtureDeleted &&
  smoke.browserClosed &&
  smoke.serverStopped;
if (!smokeInvariant) {
  throw new Error("TASK-538 smoke invariant failed: " + smoke.failures.join("; "));
}
const canonicalScreenshots = [];
const screenshotInodes = [];
const canonicalScreenshotByRawPath = new Map();
for (const screenshot of smoke.screenshots) {
  const direct = await lstat(screenshot);
  if (direct.isSymbolicLink()) {
    throw new Error("TASK-538 smoke screenshot must not be a symlink: " + screenshot);
  }
  const canonicalPath = await realpath(screenshot);
  const file = await stat(canonicalPath);
  const basename = canonicalPath.slice(smokePrefix.length);
  if (
    !canonicalPath.startsWith(smokePrefix) ||
    basename.length <= 4 ||
    basename.includes("/") ||
    !file.isFile() ||
    file.size === 0
  ) {
    throw new Error("TASK-538 invalid smoke screenshot: " + screenshot);
  }
  canonicalScreenshots.push(canonicalPath);
  canonicalScreenshotByRawPath.set(screenshot, canonicalPath);
  screenshotInodes.push(String(file.dev) + ":" + String(file.ino));
}
if (
  new Set(canonicalScreenshots).size !== canonicalScreenshots.length ||
  new Set(screenshotInodes).size !== screenshotInodes.length
) {
  throw new Error("TASK-538 smoke screenshots are not distinct evidence files");
}

const closureEvidence = {
  validation: {
    commandOutcomes: postAuditGate.commandOutcomes,
    vitestPassedTests: postAuditGate.vitestPassedTests,
    bunRuntimePassedTests: postAuditGate.bunRuntimePassedTests,
    runtimeTestExecuted: postAuditGate.runtimeTestExecuted,
    runtimeTestSkipped: postAuditGate.runtimeTestSkipped,
    releaseGatesPassed: postAuditGate.releaseGatesPassed,
    targetedSemgrepFindings: postAuditGate.targetedSemgrepFindings,
    strictScan: postAuditGate.strictScan,
  },
  scenarios: smoke.scenarios.map((scenario) => ({
    id: scenario.id,
    kind: scenario.kind,
    theme: scenario.theme,
    viewport: scenario.viewport,
    visibleAssertions: scenario.visibleAssertions,
    screenshot: canonicalScreenshotByRawPath.get(scenario.screenshot),
  })),
  screenshots: canonicalScreenshots,
  consoleErrors: smoke.consoleErrors,
  cleanup: {
    fixtureDeleted: smoke.fixtureDeleted,
    browserClosed: smoke.browserClosed,
    serverStopped: smoke.serverStopped,
  },
};

phase("538-03 close");
await agent(
  COMMON +
    "\n\nTASK-538 implementation, gates, five-lens audit and smoke are green. Read both " +
    "indexes fresh. Create pinned changelog 1250; record exact tests/scans/gates, any unrelated " +
    "TASK-545 strict-scan blocker, all real scenario IDs/screenshots and zero-console result. " +
    "Mark leaves, children, then parent Done with completion date; synchronize only TASK-538 board " +
    "row/statistics and changelog index. Do not edit production source/tests or another task status. " +
    "Screenshots are globally ignored until TASK-545; do not stage, but report exact files for the owner. " +
    "Use this already validated, redacted evidence verbatim; do not infer credentials or reconstruct " +
    "payloads, and do not create a TASK-545 manifest:\n" +
    JSON.stringify(closureEvidence),
  { label: "close:538", phase: "538-03 close" }
);

phase("Final drift");
const FINAL_LENSES = [
  [
    "graph",
    "All 9 physical files terminal, parent last; board/statistics and dependency map exact.",
  ],
  [
    "evidence",
    "Changelog 1250, tests/scans/gates and smoke scenarios/screenshots are truthful and current.",
  ],
  [
    "security",
    "No class/style or author-data raw-markup seam, suppression, public exploit detail, or widget expansion.",
  ],
];
let finalClean = false;
for (let round = 1; round <= 2; round += 1) {
  const finalResults = await Promise.all(
    FINAL_LENSES.map(async ([id, lens]) => ({
      id,
      result: await agent(
        "Fresh read-only TASK-538 final closure audit round " +
          round +
          " at " +
          ROOT +
          ". " +
          lens +
          " Inspect final HEAD/status/diff with file:line evidence; report HIGH/MEDIUM/LOW. " +
          "Compare closure claims with this validated redacted reference:\n" +
          JSON.stringify(closureEvidence),
        { label: "final:" + id + ":" + round, phase: "Final drift", schema: AUDIT_SCHEMA }
      ),
    }))
  );
  requireAllResults(
    finalResults,
    FINAL_LENSES.map(([id]) => id),
    "TASK-538 final drift " + round
  );
  const finalFindings = finalResults.flatMap(({ result }) => result.findings);
  if (finalFindings.length === 0) {
    finalClean = true;
    break;
  }
  if (round === 2) throw new Error("TASK-538 final closure drift remained unresolved");
  const closureFix = await agent(
    "Fix only verified TASK-538 closure metadata/evidence findings below, then return " +
      "pass=true. Never edit source/tests/config in this phase. If any finding requires " +
      "such a mutation, first undo only the premature closure state (remove changelog 1250 " +
      "and its index row, restore affected TASK-538 leaf/ancestors plus board/statistics to " +
      "In Progress), return pass=false, and leave source untouched so the workflow cannot " +
      "remain falsely closed. Findings:\n- " +
      finalFindings.map((finding) => finding.evidence + ": " + finding.finding).join("\n- ") +
      "\nUse this validated redacted reference for any metadata/evidence correction; do not " +
      "create a TASK-545 manifest:\n" +
      JSON.stringify(closureEvidence),
    { label: "final-fix:1", phase: "Final drift", schema: RESULT_SCHEMA }
  );
  if (!resultPassed(closureFix)) {
    throw new Error("TASK-538 returned to an implementation owner after final drift");
  }
}
if (!finalClean) throw new Error("TASK-538 final closure audit did not complete");

phase("Final gate");
const finalGate = await agent(
  "Read-only final TASK-538 gate at " +
    ROOT +
    ". Run: node --check " +
    "_docs/_workflows/task-538-implement.mjs && git diff --check. Return pass only when both exit zero.",
  { label: "final-gate:538", phase: "Final gate", schema: RESULT_SCHEMA }
);
if (!resultPassed(finalGate)) {
  throw new Error("TASK-538 final gate failed: " + finalGate.errors.join("; "));
}
