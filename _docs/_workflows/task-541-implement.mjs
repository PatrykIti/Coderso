import { createHash } from "node:crypto";
import { lstat, readFile, realpath, stat } from "node:fs/promises";

export const meta = {
  name: "task-541-implement",
  description:
    "Implement TASK-541 in strict leaf order: canonical Bun-free color policy, admin/Menu/Form/retained compatibility rollout, five-lens audit, seven supported browser flows, and changelog 1253 closure. Agents never stage or commit.",
  phases: [
    { title: "541-01-L01" },
    { title: "541-01-L02" },
    { title: "541-02-L01" },
    { title: "541-02-L02" },
    { title: "541-02-L03" },
    { title: "541-03 prepare" },
    { title: "Post-audit" },
    { title: "Smoke" },
    { title: "Smoke evidence audit" },
    { title: "541-03 close" },
    { title: "Final drift" },
    { title: "Final gate" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ROOT + "/_docs/_TASKS";
const ENV = "set -a && source .env && set +a && ";

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

const EXPECTED_VALIDATION_COUNTS = Object.freeze({
  vitestFiles: 55,
  vitestTests: 1428,
  bunRouteTests: 40,
  bunRouteExpectations: 392,
  adminModules: 2637,
  adminBoundaryFiles: 776,
});

const VALIDATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "summary",
    "errors",
    "commandOutcomes",
    "vitestPassedFiles",
    "vitestPassedTests",
    "bunRoutePassedTests",
    "bunRouteExpectations",
    "adminModules",
    "adminBoundaryFiles",
    "adminBundleMetrics",
    "releaseGatesPassed",
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
        "rootTsc",
        "vitest",
        "dbPreflight",
        "menuRoutes",
        "formRoutes",
        "adminBuild",
        "adminBoundary",
        "adminBundle",
        "releaseGates",
        "strictScanExecuted",
        "diffCheck",
      ],
      properties: {
        lintTypes: { type: "boolean" },
        lint: { type: "boolean" },
        rootTsc: { type: "boolean" },
        vitest: { type: "boolean" },
        dbPreflight: { type: "boolean" },
        menuRoutes: { type: "boolean" },
        formRoutes: { type: "boolean" },
        adminBuild: { type: "boolean" },
        adminBoundary: { type: "boolean" },
        adminBundle: { type: "boolean" },
        releaseGates: { type: "boolean" },
        strictScanExecuted: { type: "boolean" },
        diffCheck: { type: "boolean" },
      },
    },
    vitestPassedFiles: { const: EXPECTED_VALIDATION_COUNTS.vitestFiles },
    vitestPassedTests: { const: EXPECTED_VALIDATION_COUNTS.vitestTests },
    bunRoutePassedTests: { const: EXPECTED_VALIDATION_COUNTS.bunRouteTests },
    bunRouteExpectations: { const: EXPECTED_VALIDATION_COUNTS.bunRouteExpectations },
    adminModules: { const: EXPECTED_VALIDATION_COUNTS.adminModules },
    adminBoundaryFiles: { const: EXPECTED_VALIDATION_COUNTS.adminBoundaryFiles },
    adminBundleMetrics: {
      type: "object",
      additionalProperties: false,
      required: ["entryGzipKiB", "initialStaticGzipKiB", "largestDynamicGzipKiB"],
      properties: {
        entryGzipKiB: { type: "number", minimum: 0, maximum: 156.25 },
        initialStaticGzipKiB: { type: "number", minimum: 0, maximum: 488.28 },
        largestDynamicGzipKiB: { type: "number", minimum: 0 },
      },
    },
    releaseGatesPassed: { const: 5 },
    strictScan: {
      type: "object",
      additionalProperties: false,
      required: ["exitCode", "task541Findings", "toolingFailure", "externalFindings"],
      properties: {
        exitCode: { type: "integer" },
        task541Findings: { type: "integer", minimum: 0 },
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

const REQUIRED_SMOKE_KINDS = [
  "menu-level2-hex8",
  "menu-leading-dot-rgba",
  "menu-hsl-alias",
  "menu-range-reject",
  "page-token-clear",
  "page-hsl-hex8",
  "form-currentcolor",
];

const EXPECTED_EXTERNAL_STRICT_FINDING = Object.freeze({
  owner: "TASK-545",
  file: "_docs/_workflows/task-522-author.mjs",
  rule: "javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag",
});

const SMOKE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "adminUp",
    "frontUp",
    "scenarios",
    "consoleErrors",
    "consoleWarnings",
    "pageErrors",
    "screenshots",
    "failures",
    "runtimePreview",
    "fixtureIds",
    "menuEvidence",
    "themeRestored",
    "frontRestored",
    "browserClosed",
    "serverStopped",
  ],
  properties: {
    pass: { type: "boolean" },
    adminUp: { type: "boolean" },
    frontUp: { type: "boolean" },
    scenarios: {
      type: "array",
      minItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "kind", "theme", "viewport", "visibleAssertions", "screenshots"],
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
          screenshots: {
            type: "array",
            minItems: 1,
            items: { type: "string", minLength: 1 },
          },
        },
      },
    },
    consoleErrors: { type: "array", items: { type: "string" } },
    consoleWarnings: { type: "array", items: { type: "string" } },
    pageErrors: { type: "array", items: { type: "string" } },
    screenshots: { type: "array", minItems: 7, items: { type: "string" } },
    failures: { type: "array", items: { type: "string" } },
    runtimePreview: {
      type: "object",
      additionalProperties: false,
      required: [
        "dialogTitle",
        "dialogRole",
        "dialogOpen",
        "ariaDescribedBy",
        "descriptionResolved",
        "descriptionText",
        "submitVisible",
        "persistedBackground",
        "persistedTextColor",
        "expectedPersistedTextColor",
        "computedBackground",
        "computedColor",
        "publicComputedBackground",
        "publicComputedColor",
        "expectedRgb",
        "screenshot",
        "publicScreenshot",
      ],
      properties: {
        dialogTitle: { const: "Form Runtime Preview" },
        dialogRole: { const: "dialog" },
        dialogOpen: { type: "boolean" },
        ariaDescribedBy: { type: "string", minLength: 1 },
        descriptionResolved: { type: "boolean" },
        descriptionText: {
          const: "Interactive preview for test submissions and automation verification.",
        },
        submitVisible: { type: "boolean" },
        persistedBackground: { const: "currentColor" },
        persistedTextColor: { type: "string", minLength: 1 },
        expectedPersistedTextColor: { type: "string", minLength: 1 },
        computedBackground: { type: "string", minLength: 1 },
        computedColor: { type: "string", minLength: 1 },
        publicComputedBackground: { type: "string", minLength: 1 },
        publicComputedColor: { type: "string", minLength: 1 },
        expectedRgb: { type: "string", minLength: 1 },
        screenshot: { type: "string", minLength: 1 },
        publicScreenshot: { type: "string", minLength: 1 },
      },
    },
    fixtureIds: {
      type: "object",
      additionalProperties: false,
      required: [
        "menusCreated",
        "menusDeleted",
        "pagesCreated",
        "pagesDeleted",
        "formsCreated",
        "formsDeleted",
      ],
      properties: {
        menusCreated: { type: "array", items: { type: "string", minLength: 1 } },
        menusDeleted: { type: "array", items: { type: "string", minLength: 1 } },
        pagesCreated: {
          type: "array",
          minItems: 1,
          items: { type: "string", minLength: 1 },
        },
        pagesDeleted: {
          type: "array",
          minItems: 1,
          items: { type: "string", minLength: 1 },
        },
        formsCreated: {
          type: "array",
          minItems: 1,
          items: { type: "string", minLength: 1 },
        },
        formsDeleted: {
          type: "array",
          minItems: 1,
          items: { type: "string", minLength: 1 },
        },
      },
    },
    menuEvidence: {
      type: "object",
      additionalProperties: false,
      required: [
        "mode",
        "menuId",
        "baselineDocumentHash",
        "restoredDocumentHash",
        "baselinePublicationState",
        "restoredPublicationState",
        "baselineActiveSelection",
        "restoredActiveSelection",
      ],
      properties: {
        mode: { enum: ["created-deleted", "preexisting-restored"] },
        menuId: { type: "string", minLength: 1 },
        baselineDocumentHash: { type: ["string", "null"], pattern: "^[a-f0-9]{64}$" },
        restoredDocumentHash: { type: ["string", "null"], pattern: "^[a-f0-9]{64}$" },
        baselinePublicationState: { enum: ["draft", "published", null] },
        restoredPublicationState: { enum: ["draft", "published", null] },
        baselineActiveSelection: { type: ["string", "null"] },
        restoredActiveSelection: { type: ["string", "null"] },
      },
    },
    themeRestored: { type: "boolean" },
    frontRestored: { type: "boolean" },
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
  const expectedExternalIdentity =
    external.length === 1 &&
    external[0].owner === EXPECTED_EXTERNAL_STRICT_FINDING.owner &&
    external[0].file === EXPECTED_EXTERNAL_STRICT_FINDING.file &&
    external[0].rule === EXPECTED_EXTERNAL_STRICT_FINDING.rule;
  const strictAccepted =
    result.strictScan.task541Findings === 0 &&
    result.strictScan.toolingFailure === false &&
    ((result.strictScan.exitCode === 0 && external.length === 0) ||
      (result.strictScan.exitCode !== 0 && expectedExternalIdentity));
  if (
    !resultPassed(result) ||
    !commandsPassed ||
    result.vitestPassedFiles !== EXPECTED_VALIDATION_COUNTS.vitestFiles ||
    result.vitestPassedTests !== EXPECTED_VALIDATION_COUNTS.vitestTests ||
    result.bunRoutePassedTests !== EXPECTED_VALIDATION_COUNTS.bunRouteTests ||
    result.bunRouteExpectations !== EXPECTED_VALIDATION_COUNTS.bunRouteExpectations ||
    result.adminModules !== EXPECTED_VALIDATION_COUNTS.adminModules ||
    result.adminBoundaryFiles !== EXPECTED_VALIDATION_COUNTS.adminBoundaryFiles ||
    result.releaseGatesPassed !== 5 ||
    !strictAccepted
  ) {
    throw new Error(label + ": structured full-validation invariant failed");
  }
  return result;
}

const PARSER_TESTS =
  "tests/vitest/services/css-color-contract.test.ts " +
  "tests/vitest/services/css-color-contract-corpus.test.ts";

const ADMIN_TESTS =
  "tests/vitest/ui/color-value.test.ts tests/vitest/ui/color-swatch-alpha.test.tsx " +
  "tests/vitest/ui/shared-color-alpha.test.tsx tests/vitest/ui/shared-color-control.test.tsx " +
  "tests/vitest/ui/clearable-fields.test.tsx tests/vitest/ui/clearable-fields-alpha.test.tsx";

const PAGE_COMPAT_TESTS =
  "tests/vitest/ui/page-editor-control-primitives.test.tsx " +
  "tests/vitest/ui/page-editor-v2-flow.test.tsx " +
  "tests/vitest/pages/page-editor-control-registry.test.ts " +
  "tests/vitest/ui/page-editor-layout-shell.test.tsx";

const MENU_TESTS =
  "tests/vitest/services/normalize-menu-appearance.test.ts " +
  "tests/vitest/services/menu-document-v2.test.ts " +
  "tests/vitest/ui/menu-color-alpha.test.tsx tests/vitest/ui/menu-design-editor.test.tsx";

const COMPAT_TESTS = [
  "tests/vitest/forms/formSettings.test.ts",
  "tests/vitest/forms/formTheme.test.ts",
  "tests/vitest/admin/formDesignPanel.test.tsx",
  "tests/vitest/admin/formCanvas.test.tsx",
  "tests/vitest/admin/formRuntimePreviewDialog.test.tsx",
  "tests/vitest/forms/formRuntimeResolver.test.ts",
  "tests/vitest/widgets/formRuntimeScript.test.ts",
  "tests/vitest/widgets/clearableStyle.test.ts",
  "tests/vitest/widgets/section.test.tsx",
  "tests/vitest/widgets/tabs.test.tsx",
  "tests/vitest/widgets/accordionWidget.test.tsx",
  "tests/vitest/widgets/contact.test.tsx",
  "tests/vitest/widgets/toggleBlock.test.tsx",
  "tests/vitest/widgets/divider.test.tsx",
  "tests/vitest/widgets/navigation.test.tsx",
  "tests/vitest/widgets/gridColumns.test.tsx",
  "tests/vitest/widgets/footer.test.tsx",
  "tests/vitest/widgets/newsletter.test.tsx",
  "tests/vitest/widgets/formEmbed.test.tsx",
  "tests/vitest/widgets/timeline.test.tsx",
  "tests/vitest/widgets/hero.test.tsx",
  "tests/vitest/widgets/heroEditors.test.tsx",
  "tests/vitest/widgets/galleryMosaic.test.tsx",
  "tests/vitest/widgets/ctaBanner.test.tsx",
  "tests/vitest/ui/section-editor-wave.test.tsx",
  "tests/vitest/ui/tabs-editor-wave.test.tsx",
  "tests/vitest/ui/accordion-editor-wave.test.tsx",
  "tests/vitest/ui/contact-editor-wave.test.tsx",
  "tests/vitest/ui/toggle-block-editor-wave.test.tsx",
  "tests/vitest/ui/divider-editor-wave.test.tsx",
  "tests/vitest/ui/navigation-editor-wave.test.tsx",
  "tests/vitest/ui/footer-editor-wave.test.tsx",
  "tests/vitest/ui/hero-editor-wave.test.tsx",
  "tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx",
  "tests/vitest/ui/cta-banner-editor-wave.test.tsx",
  "tests/vitest/ui/grid-columns-editor-wave.test.tsx",
  "tests/vitest/ui/newsletter-editor-wave.test.tsx",
  "tests/vitest/ui/timeline-editor-wave.test.tsx",
].join(" ");

const DB_PREFLIGHT =
  ENV +
  'bun --eval \'import { canConnect } from "./tests/utils/db"; ' +
  'if (!(await canConnect())) throw new Error("task_541_db_unreachable"); process.exit(0)\'';

const FULL_VITEST =
  PARSER_TESTS +
  " tests/vitest/services/css-color-consumer-parity.test.ts " +
  ADMIN_TESTS +
  " " +
  PAGE_COMPAT_TESTS +
  " " +
  MENU_TESTS +
  " " +
  COMPAT_TESTS;

const FULL_VALIDATION =
  "bun --cwd core lint:types && bun --cwd core lint && " +
  "bun x tsc -p tsconfig.json --noEmit && bun run test:vitest -- " +
  FULL_VITEST +
  " && " +
  DB_PREFLIGHT +
  " && " +
  ENV +
  "bun test tests/integration/routes/menus.test.ts tests/integration/routes/forms.test.ts && " +
  "bun --cwd core build:admin && bun run check:admin-boundary && " +
  "bun run check:admin-bundle && bun run gates:coderso && git diff --check";

async function runFullValidation(label) {
  return await agent(
    "Independent read-only full TASK-541 validation (" +
      label +
      ") at " +
      ROOT +
      ". Run this chain without editing:\n" +
      FULL_VALIDATION +
      "\nThen run independently without suppression: bun run scan:security:strict. " +
      "Every named test must execute; missing results fail. Re-run each named failure alone once. " +
      "Populate all command outcomes/counts. The strict scan may be accepted as external non-green " +
      "only when its sole result is the unchanged TASK-545-owned workflow finding; any TASK-541, " +
      "new, or tooling finding makes pass=false. Do not print env values, credentials, or raw payloads.",
    { label: "full-gate:" + label, phase: "Post-audit", schema: VALIDATION_SCHEMA }
  );
}

const FORBIDDEN =
  "Forbidden: Dashboard widget source/registry/persistence; Widget Template insertion; " +
  "module-pack changes; TASK-536/TASK-538 source or closure; TASK-537/TASK-539/TASK-540/" +
  "TASK-542/TASK-543/TASK-544/TASK-545 implementation; endpoints, migrations, dependencies, " +
  "scanner suppressions, broad raw-style cleanup, staging, commits, resets, or checkout.";

const COMMON =
  "Repository " +
  ROOT +
  ", branch feature/tasks-fixes. Fresh-read AGENTS.md, TASK-541 parent, " +
  "the exact leaf, source/tests, HEAD/status/diff before editing. Preserve unrelated owner work. " +
  "Implement exactly one leaf in the declared sequence; code/comments are English. Tests changed " +
  "with their source owner; do not weaken assertions. Configurable widgets remain Dashboard-only; " +
  "core/widgets edits are retained compatibility maintenance. " +
  FORBIDDEN;

const LEAVES = [
  {
    id: "541-01-L01",
    file: "TASK-541-01-L01-One-Bun-Free-Canonical-Color-Contract.md",
    gate:
      "bun --cwd core lint:types && bun --cwd core lint && bun run test:vitest -- " +
      "tests/vitest/services/css-color-contract.test.ts && git diff --check",
  },
  {
    id: "541-01-L02",
    file: "TASK-541-01-L02-Prove-Canonical-Color-Corpus.md",
    gate:
      "bun --cwd core lint:types && bun --cwd core lint && bun run test:vitest -- " +
      PARSER_TESTS +
      " && git diff --check",
  },
  {
    id: "541-02-L01",
    file: "TASK-541-02-L01-Roll-Out-Color-Contract-To-Admin-Controls.md",
    gate:
      "bun --cwd core lint:types && bun --cwd core lint && bun run test:vitest -- " +
      PARSER_TESTS +
      " " +
      ADMIN_TESTS +
      " && bun run test:vitest -- " +
      PAGE_COMPAT_TESTS +
      " && bun --cwd core build:admin && bun run check:admin-boundary && " +
      "bun run check:admin-bundle && git diff --check",
  },
  {
    id: "541-02-L02",
    file: "TASK-541-02-L02-Roll-Out-Color-Contract-To-Menu-Writes.md",
    gate:
      "bun --cwd core lint:types && bun --cwd core lint && bun run test:vitest -- " +
      PARSER_TESTS +
      " " +
      MENU_TESTS +
      " && " +
      DB_PREFLIGHT +
      " && " +
      ENV +
      "bun test tests/integration/routes/menus.test.ts && git diff --check",
  },
  {
    id: "541-02-L03",
    file: "TASK-541-02-L03-Roll-Out-Color-Contract-To-Widget-Rendering.md",
    gate:
      "bun --cwd core lint:types && bun --cwd core lint && bun run test:vitest -- " +
      PARSER_TESTS +
      " " +
      ADMIN_TESTS +
      " " +
      COMPAT_TESTS +
      " && " +
      DB_PREFLIGHT +
      " && " +
      ENV +
      "bun test tests/integration/routes/forms.test.ts && " +
      "bun --cwd core build:admin && bun run check:admin-boundary && " +
      "bun run check:admin-bundle && git diff --check",
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
      "\nEvery command must exit zero. A missing named test is failure. Rerun each named " +
      "failing file once alone before reporting a real failure.",
    { label: "gate:" + leaf.id + ":" + attempt, phase: leaf.id, schema: RESULT_SCHEMA }
  );
}

for (const leaf of LEAVES) {
  phase(leaf.id);
  await agent(
    COMMON +
      "\n\nImplement " +
      leaf.id +
      " from " +
      TASKS +
      "/" +
      leaf.file +
      ". Honor exact public names, profiles, raw-before-trim flow, errors, source ownership, " +
      "compatibility and test shape.",
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

phase("541-03 prepare");
await agent(
  COMMON +
    "\n\nImplement only the additive parity test and documentation preparation from " +
    TASKS +
    "/TASK-541-03-L01-Shared-Corpus-Property-Tests-And-Closure.md. " +
    "Do not create changelog 1253 or close task statuses before post-audit and smoke. " +
    "Do not edit production source or source-owned existing tests.",
  { label: "prepare:541-03", phase: "541-03 prepare" }
);

const LENSES = [
  ["policy", "Exact grammar, raw cap, canonicalization, metadata, profiles and context narrowing."],
  [
    "consumers",
    "Admin/Menu/Form/retained canonical parity; no pre-trim, clamp, raw fallback or mirror.",
  ],
  [
    "compatibility",
    "Present-only/default bytes, Form inherited exception, nested inherit rejection and Hero UX.",
  ],
  [
    "security-tests",
    "Schemas/routes/render defense, correct lanes, scoped DB fixtures and no weakened assertions.",
  ],
  [
    "scope-docs",
    "Finite M-04 scope, Dashboard-only widgets, docs/tasks/changelog reservation and TASK-539 handoff.",
  ],
];

phase("Post-audit");
for (let round = 1; round <= 2; round += 1) {
  const results = await Promise.all(
    LENSES.map(async ([id, lens]) => ({
      id,
      result: await agent(
        "Fresh read-only TASK-541 post-audit round " +
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
    "TASK-541 post-audit " + round
  );
  const findings = results.flatMap(({ result }) => result.findings);
  if (findings.length === 0) break;
  if (round === 2) throw new Error("TASK-541 post-audit remained non-clean");
  const fix = await agent(
    COMMON +
      "\n\nFix every verified post-audit finding through its original owner seam, " +
      "update source-owned tests, and rerun affected gates:\n- " +
      findings.map((item) => item.evidence + ": " + item.finding).join("\n- "),
    { label: "post-fix:541", phase: "Post-audit", schema: RESULT_SCHEMA }
  );
  if (!resultPassed(fix)) throw new Error("TASK-541 post-audit fixer failed");
}

const postAuditValidation = await runFullValidation("post-audit");
requireFullValidation(postAuditValidation, "TASK-541 post-audit validation");

phase("Smoke");
const smoke = await agent(
  "Final real-browser TASK-541 smoke at " +
    ROOT +
    ". Fresh-read parent and closure leaf. " +
    "Load .env without printing secrets. Restart with literal command " +
    "coderso-dev-core-host /home/coder/project/Coderso; " +
    "health-check http://coderso-a.localhost:5173/admin/ and http://coderso-a.localhost:3000. " +
    "Use full prefix playwright-cli -s=wf541smoke for EVERY browser operation and credentials " +
    "only from .env. Run seven distinct real supported flows: mandatory level-2 Menu hex8/alpha; " +
    "Menu leading-dot RGBA canonical persistence; Menu HSL/HSLA alias/deg canonical parity; Menu " +
    "range rejection with unchanged persistence; Page seven-token to transparent to clear at narrow; " +
    "Page HSL to hex8 at wide/light and narrow/dark; Form Design submit.background=currentColor " +
    "plus distinctive submit.textColor, save/reopen, then open the actual Form Runtime Preview " +
    "dialog (the ordinary Design canvas is not preview evidence). Assert the dialog is visibly open, " +
    "has role=dialog/name Form Runtime Preview, and has a non-empty aria-describedby whose referenced " +
    "element resolves to the exact visible explanatory copy. Assert its runtime submit background " +
    "equals its computed text color and the distinctive RGB; save " +
    "a dialog screenshot. Bind that same Form through a supported Page form block, publish/open that " +
    "Page, and assert the same computed equality. Use visible computed style/DOM/geometry assertions, light/dark, " +
    "wide/narrow and zero console errors, console warnings, or page errors. Never insert/save a historical widget or template. " +
    "Save distinct screenshots only under " +
    ROOT +
    "/_docs/_workflows/_smoke/task-541-*.png. " +
    "Delete every task-created Menu, Page, and Form fixture and return the exact created/deleted ID " +
    "arrays. Return structured Menu evidence: either a created Menu ID present in both exact arrays, " +
    "or a pre-existing Menu ID with equal before/after SHA-256 document hashes, publication state, " +
    "and active-selection identity. Restore the pre-smoke admin theme exactly and verify the public front returned " +
    "to its recorded baseline. Close with full " +
    "command playwright-cli -s=wf541smoke close, interrupt the task dev host normally, and verify " +
    "its processes stopped. Do not edit source/tests/docs/status. Return structured evidence.",
  { label: "smoke:541", phase: "Smoke", schema: SMOKE_SCHEMA }
);

const smokePrefix = ROOT + "/_docs/_workflows/_smoke/task-541-";
const kinds = new Set(smoke.scenarios.map((scenario) => scenario.kind));
const paths = new Set(smoke.screenshots);
const scenarioScreenshotList = smoke.scenarios.flatMap((scenario) => scenario.screenshots);
const scenarioPaths = new Set(scenarioScreenshotList);
const formScenario = smoke.scenarios.find((scenario) => scenario.kind === "form-currentcolor");
const sameUniqueStringSet = (left, right) =>
  left.length === new Set(left).size &&
  right.length === new Set(right).size &&
  left.length === right.length &&
  left.every((value) => new Set(right).has(value));
const createdMenuClosed =
  smoke.menuEvidence.mode === "created-deleted" &&
  smoke.fixtureIds.menusCreated.length > 0 &&
  sameUniqueStringSet(smoke.fixtureIds.menusCreated, smoke.fixtureIds.menusDeleted) &&
  smoke.fixtureIds.menusCreated.includes(smoke.menuEvidence.menuId);
const preexistingMenuRestored =
  smoke.menuEvidence.mode === "preexisting-restored" &&
  smoke.fixtureIds.menusCreated.length === 0 &&
  smoke.fixtureIds.menusDeleted.length === 0 &&
  typeof smoke.menuEvidence.baselineDocumentHash === "string" &&
  smoke.menuEvidence.baselineDocumentHash.length > 0 &&
  smoke.menuEvidence.baselineDocumentHash === smoke.menuEvidence.restoredDocumentHash &&
  smoke.menuEvidence.baselinePublicationState === smoke.menuEvidence.restoredPublicationState &&
  smoke.menuEvidence.baselineActiveSelection === smoke.menuEvidence.restoredActiveSelection;
const smokeInvariant =
  smoke.pass &&
  smoke.adminUp &&
  smoke.frontUp &&
  smoke.scenarios.length >= 7 &&
  REQUIRED_SMOKE_KINDS.every((kind) => kinds.has(kind)) &&
  new Set(smoke.scenarios.map((scenario) => scenario.id)).size === smoke.scenarios.length &&
  new Set(smoke.scenarios.map((scenario) => scenario.theme)).size === 2 &&
  new Set(smoke.scenarios.map((scenario) => scenario.viewport)).size === 2 &&
  smoke.scenarios.every((scenario) => scenario.visibleAssertions.length > 0) &&
  smoke.consoleErrors.length === 0 &&
  smoke.consoleWarnings.length === 0 &&
  smoke.pageErrors.length === 0 &&
  smoke.failures.length === 0 &&
  paths.size === smoke.screenshots.length &&
  smoke.screenshots.length >= 7 &&
  scenarioPaths.size === scenarioScreenshotList.length &&
  scenarioPaths.size === paths.size &&
  [...scenarioPaths].every((path) => paths.has(path)) &&
  smoke.screenshots.every((path) => path.startsWith(smokePrefix) && path.endsWith(".png")) &&
  smoke.runtimePreview.dialogOpen &&
  smoke.runtimePreview.descriptionResolved &&
  smoke.runtimePreview.submitVisible &&
  smoke.runtimePreview.persistedTextColor === smoke.runtimePreview.expectedPersistedTextColor &&
  smoke.runtimePreview.computedBackground === smoke.runtimePreview.computedColor &&
  smoke.runtimePreview.computedColor === smoke.runtimePreview.expectedRgb &&
  smoke.runtimePreview.publicComputedBackground === smoke.runtimePreview.publicComputedColor &&
  smoke.runtimePreview.publicComputedColor === smoke.runtimePreview.expectedRgb &&
  paths.has(smoke.runtimePreview.screenshot) &&
  paths.has(smoke.runtimePreview.publicScreenshot) &&
  smoke.runtimePreview.screenshot !== smoke.runtimePreview.publicScreenshot &&
  formScenario?.screenshots.length >= 2 &&
  formScenario?.screenshots.includes(smoke.runtimePreview.screenshot) === true &&
  formScenario?.screenshots.includes(smoke.runtimePreview.publicScreenshot) === true &&
  (createdMenuClosed || preexistingMenuRestored) &&
  sameUniqueStringSet(smoke.fixtureIds.pagesCreated, smoke.fixtureIds.pagesDeleted) &&
  sameUniqueStringSet(smoke.fixtureIds.formsCreated, smoke.fixtureIds.formsDeleted) &&
  smoke.themeRestored &&
  smoke.frontRestored &&
  smoke.browserClosed &&
  smoke.serverStopped;
if (!smokeInvariant) throw new Error("TASK-541 smoke invariant failed");

const canonicalScreenshots = [];
const inodes = [];
const screenshotHashes = [];
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
for (const screenshot of smoke.screenshots) {
  const direct = await lstat(screenshot);
  if (direct.isSymbolicLink()) throw new Error("TASK-541 screenshot symlink: " + screenshot);
  const canonical = await realpath(screenshot);
  const file = await stat(canonical);
  if (!canonical.startsWith(smokePrefix) || !file.isFile() || file.size === 0) {
    throw new Error("TASK-541 invalid screenshot: " + screenshot);
  }
  const bytes = await readFile(canonical);
  if (
    bytes.length < pngSignature.length ||
    !bytes.subarray(0, pngSignature.length).equals(pngSignature)
  ) {
    throw new Error("TASK-541 screenshot is not PNG: " + screenshot);
  }
  canonicalScreenshots.push(canonical);
  inodes.push(String(file.dev) + ":" + String(file.ino));
  screenshotHashes.push(createHash("sha256").update(bytes).digest("hex"));
}
if (
  new Set(canonicalScreenshots).size !== canonicalScreenshots.length ||
  new Set(inodes).size !== inodes.length ||
  new Set(screenshotHashes).size !== screenshotHashes.length
) {
  throw new Error("TASK-541 screenshots are not distinct evidence files");
}

phase("Smoke evidence audit");
const smokeEvidenceAudit = await agent(
  "Fresh read-only TASK-541 smoke evidence audit at " +
    ROOT +
    ". Inspect every screenshot, " +
    "especially the actual role=dialog named Form Runtime Preview and its published Page/front " +
    "companion. Compare visible UI, computed/persisted structured evidence, scenario identity, " +
    "cleanup/restoration, zero console errors/warnings and page errors, and PNG/hash/path integrity. The ordinary Form " +
    "Design canvas is not Runtime Preview evidence. Return every H/M/L with file:line or screenshot " +
    "path; do not edit. Evidence:\n" +
    JSON.stringify({ smoke, canonicalScreenshots, screenshotHashes }),
  { label: "smoke-evidence:541", phase: "Smoke evidence audit", schema: AUDIT_SCHEMA }
);
if (smokeEvidenceAudit.findings.length > 0) {
  throw new Error("TASK-541 smoke evidence audit is non-clean");
}

phase("541-03 close");
await agent(
  COMMON +
    "\n\nAll source leaves, gates, post-audit and real smoke are complete. Read indexes " +
    "fresh. Create pinned changelog 1253, record exact commands/results and the seven scenario " +
    "IDs/screenshots/zero-console cleanup. Run strict scan without suppression: any TASK-541/new " +
    "finding or tooling error blocks closure; the sole unchanged TASK-545 workflow finding may be " +
    "recorded as external non-green and must never be called a green scan. Close all TASK-541 leaves, " +
    "children, then parent; move only its board row and statistics. Do not edit production source/tests " +
    "or another task. Do not create TASK-545 manifest. Do not stage/commit. Validated evidence:\n" +
    JSON.stringify({
      validation: postAuditValidation,
      smoke: { ...smoke, screenshots: canonicalScreenshots },
    }),
  { label: "close:541", phase: "541-03 close" }
);

phase("Final drift");
const finalResults = await Promise.all(
  [
    [
      "graph",
      "All 10 physical TASK-541 files terminal; descendants before parent; board/statistics exact.",
    ],
    [
      "evidence",
      "Changelog 1253 and validation/smoke claims match files, screenshots and cleanup.",
    ],
    [
      "security",
      "Canonical owner used at declared seams; no raw fallback, suppression or widget expansion.",
    ],
  ].map(async ([id, lens]) => ({
    id,
    result: await agent(
      "Fresh read-only TASK-541 final closure audit at " +
        ROOT +
        ". " +
        lens +
        " Inspect final status/diff and return every H/M/L with file:line.",
      { label: "final:" + id, phase: "Final drift", schema: AUDIT_SCHEMA }
    ),
  }))
);
requireAllResults(finalResults, ["graph", "evidence", "security"], "TASK-541 final drift");
if (finalResults.some(({ result }) => result.findings.length > 0)) {
  throw new Error("TASK-541 final closure drift is non-clean");
}

phase("Final gate");
const finalGate = await agent(
  "Read-only final TASK-541 mechanical gate at " +
    ROOT +
    ". Run: node --check " +
    "_docs/_workflows/task-541-implement.mjs && git diff --check. Return pass only if both exit zero.",
  { label: "final-gate:541", phase: "Final gate", schema: RESULT_SCHEMA }
);
if (!resultPassed(finalGate)) throw new Error("TASK-541 final gate failed");
