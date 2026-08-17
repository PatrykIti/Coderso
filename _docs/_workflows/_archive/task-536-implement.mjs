export const meta = {
  name: "task-536-implement",
  description:
    "Implement TASK-536 sequentially from canonical media bytes through storage, delivery, Forms runtime, shared public/admin write security, strict schemas, gates, five-lens post-audit, real Playwright smoke, and metadata closure. Changelog 1248 is pinned; agents never commit.",
  phases: [
    { title: "536-01-L01" },
    { title: "536-01-L02" },
    { title: "536-01-L03" },
    { title: "536-02-L01" },
    { title: "536-03-L01" },
    { title: "536-03-L02" },
    { title: "536-04-L01" },
    { title: "536-04-L02" },
    { title: "536-05 prepare" },
    { title: "Post-audit" },
    { title: "Smoke" },
    { title: "536-05 close" },
    { title: "Final drift" },
    { title: "Final metadata gate" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASK_ROOT = `${ROOT}/_docs/_TASKS`;
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

const SMOKE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "serverUp", "scenarios", "consoleErrors", "screenshots", "failures"],
  properties: {
    pass: { type: "boolean" },
    serverUp: { type: "boolean" },
    scenarios: { type: "array", items: { type: "string" } },
    consoleErrors: { type: "array", items: { type: "string" } },
    screenshots: { type: "array", items: { type: "string" } },
    failures: { type: "array", items: { type: "string" } },
  },
};

function requireAllResults(results, expectedIds, label) {
  if (!Array.isArray(results) || results.length !== expectedIds.length) {
    throw new Error(
      `${label}: expected ${expectedIds.length} results, received ${results?.length ?? 0}`
    );
  }
  for (let index = 0; index < expectedIds.length; index += 1) {
    const item = results[index];
    if (!item || item.id !== expectedIds[index] || item.result == null) {
      throw new Error(`${label}: missing, reordered, or wrong result at ${expectedIds[index]}`);
    }
  }
  return results;
}

const COMMON = `
Repository: ${ROOT}; branch feature/tasks-fixes. Read AGENTS.md, the TASK-536 parent,
your complete physical child/leaf contract, current source/tests, git status and diff
before editing. Build on current on-disk state and preserve unrelated work. Code,
comments, and style are English. Do not commit, stage, reset, or checkout. In an
implementation-leaf phase, edit only that leaf's declared files. In a fixer or closure
phase, edit only the files expressly authorized by that phase and preserve every
original source/test ownership seam; never treat the broader phase as wildcard scope.
Update every changed-behavior test owned by your leaf before its gate.
Follow Bun/Vitest dependency lanes, reject unknown input, keep route modules
orchestration-only, preserve machine-readable errors and UI fidelity to _docs/_PROTOTYPE.
Re-run a named failing test alone before classifying it. Return files changed, contract
shape, tests, and any deviation; do not claim a command you did not run.`;

const LEAVES = [
  {
    id: "536-01-L01",
    file: "TASK-536-01-L01-Canonicalize-Upload-Bytes-Mime-And-Key.md",
    gate: "bun --cwd core lint:types && bun --cwd core lint && bun run test:vitest -- tests/vitest/services/mediaSchemas.test.ts tests/vitest/services/media-file-trust.test.ts",
  },
  {
    id: "536-01-L02",
    file: "TASK-536-01-L02-Apply-Canonical-Identity-To-Storage-Adapters.md",
    gate: `${ENV}bun --cwd core lint:types && bun --cwd core lint && ./node_modules/.bin/tsc -p tsconfig.json --noEmit && bun test --timeout=15000 tests/unit/media/localAdapter.test.ts tests/unit/media/s3Adapter.test.ts tests/unit/media/azureAdapter.test.ts tests/unit/backups/backupRemoteStorage.test.ts tests/unit/backups/backupService.test.ts`,
  },
  {
    id: "536-01-L03",
    file: "TASK-536-01-L03-Integrate-Canonical-Media-Service-And-Urls.md",
    gate: `${ENV}bun --cwd core lint:types && bun --cwd core lint && ./node_modules/.bin/tsc -p tsconfig.json --noEmit && bun run test:vitest -- tests/vitest/services/mediaUrlProjection.test.ts tests/vitest/admin/mediaUtils.test.ts tests/vitest/ui/media-picker.test.tsx tests/vitest/ui/media-card.test.tsx tests/vitest/ui/media-details.test.tsx tests/vitest/ui/post-editor-canvas-wave.test.tsx && bun test --parallel=1 --timeout=15000 tests/unit/media/mediaService.test.ts tests/unit/media/mediaMeta.test.ts tests/unit/server/publicFormsUploadApi.test.ts tests/integration/routes/media.test.ts tests/unit/dashboard/dashboardService.test.ts tests/unit/backups/backupRemoteStorage.test.ts tests/unit/backups/backupService.test.ts`,
  },
  {
    id: "536-02-L01",
    file: "TASK-536-02-L01-Persisted-Mime-Nosniff-And-Disposition.md",
    gate: `${ENV}bun --cwd core lint:types && bun --cwd core lint && ./node_modules/.bin/tsc -p tsconfig.json --noEmit && env -u DATABASE_URL bun --no-env-file test --timeout=15000 tests/integration/server/mediaDeliveryAccess.test.ts && bun run gates:coderso && git diff --check`,
  },
  {
    id: "536-03-L01",
    file: "TASK-536-03-L01-Upload-Control-And-Hidden-Id-Contract.md",
    gate: "bun --cwd core lint:types && bun --cwd core lint && ./node_modules/.bin/tsc -p tsconfig.json --noEmit && ./node_modules/.bin/eslint --max-warnings=0 core/widgets/core/formEmbed.tsx core/widgets/core/contact.tsx core/widgets/core/newsletter.tsx && bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/contact.test.tsx tests/vitest/widgets/newsletter.test.tsx",
  },
  {
    id: "536-03-L02",
    file: "TASK-536-03-L02-Upload-Before-Submit-State-Machine.md",
    gate: "bun --cwd core lint:types && bun --cwd core lint && ./node_modules/.bin/tsc -p tsconfig.json --noEmit && ./node_modules/.bin/eslint --max-warnings=0 core/widgets/core/formRuntimeScript.ts core/widgets/core/formEmbed.tsx && bun run test:vitest -- tests/vitest/widgets/formRuntimeScript.test.ts tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/contact.test.tsx tests/vitest/widgets/newsletter.test.tsx",
  },
  {
    id: "536-04-L01",
    file: "TASK-536-04-L01-Nested-Reject-Unknown-And-Public-Write-Ownership.md",
    gate: `${ENV}bun --cwd core lint:types && bun --cwd core lint && bun run test:vitest -- tests/vitest/forms/submissionAccess.test.ts tests/vitest/forms/submissionNonce.test.ts tests/vitest/server/requestBody.test.ts && bun test --parallel=1 --timeout=15000 tests/unit/server/publicFormsApi.test.ts tests/unit/server/publicFormsUploadApi.test.ts tests/integration/server/formsWriteMounts.test.ts tests/security/codersoSecurityGate.test.ts && bun run gates:coderso`,
  },
  {
    id: "536-04-L02",
    file: "TASK-536-04-L02-Strict-Nested-Forms-Schemas.md",
    gate: `${ENV}bun --cwd core lint:types && bun --cwd core lint && bun run test:vitest -- tests/vitest/forms/validation.test.ts tests/vitest/forms/validation-field-schema.test.ts tests/vitest/forms/validation-patterns.test.ts tests/vitest/forms/validation-submission.test.ts tests/vitest/forms/formSettings.test.ts tests/vitest/forms/fileField.test.ts tests/vitest/forms/formRuntimeResolver.test.ts && bun test --parallel=1 --timeout=15000 tests/integration/routes/forms.test.ts tests/unit/forms/fileSubmission.test.ts`,
  },
];

async function runGate(leaf, attempt) {
  return await agent(
    `Run this gate from ${ROOT}, read-only; do not edit. Command:\n${leaf.gate}\n` +
      "Return pass=true only when every command exits zero. Re-run a named failing file once alone before reporting a real failure.",
    { label: `gate:${leaf.id}:${attempt}`, phase: leaf.id, schema: RESULT_SCHEMA }
  );
}

for (const leaf of LEAVES) {
  phase(leaf.id);
  await agent(
    `${COMMON}\n\nImplement ${leaf.id}. Read in full: ${TASK_ROOT}/${leaf.file}. ` +
      "Honor its exact source/test ownership, errors, pseudocode, compatibility, and acceptance criteria.",
    { label: `impl:${leaf.id}`, phase: leaf.id }
  );
  let result = await runGate(leaf, 1);
  for (let attempt = 1; !result.pass && attempt <= 3; attempt += 1) {
    await agent(
      `${COMMON}\n\nFix the verified ${leaf.id} gate failures without weakening behavior tests or widening ownership:\n` +
        result.errors.map((entry) => `- ${entry}`).join("\n"),
      { label: `fix:${leaf.id}:${attempt}`, phase: leaf.id }
    );
    result = await runGate(leaf, attempt + 1);
  }
  if (!result.pass) throw new Error(`${leaf.id}: targeted gate remained red`);
}

phase("536-05 prepare");
const prepareResult = await agent(
  `${COMMON}\n\nRead ${TASK_ROOT}/TASK-536-05-L01-Cross-Lane-Tests-Smoke-And-Closure.md in full. ` +
    "Add only its cross-leaf tests and source-of-truth docs, run the full targeted matrix, task-scoped Semgrep, gates, and full strict scan. Record the already-owned TASK-538 Page and TASK-545-02-L01 workflow findings separately if they remain; never suppress them. Do NOT create changelog 1248 or mark tasks Done yet: smoke and post-audit must pass first. Never edit production source. " +
    "Historical core/widgets paths are the existing public Form block/section runtime only; do not add or document a non-dashboard widget/editor/registry/preset. Return pass=true only when every required TASK-536 gate and task-scoped scan passed; list external strict-scan blockers in summary/errors.",
  { label: "impl:536-05-prepare", phase: "536-05 prepare", schema: RESULT_SCHEMA }
);
if (!prepareResult.pass) {
  throw new Error(`TASK-536 prepare gate failed: ${prepareResult.errors.join("; ")}`);
}

const LENSES = [
  [
    "trust-boundary",
    "Byte-authoritative MIME/key/disposition; create=replace; passive-only inline; provider/local parity; legacy fail-safe; no filename/type trust.",
  ],
  [
    "runtime-state",
    "Exact file marker registry, required/multiple, ordered upload-before-submit, generation cancellation/retry, progress exclusion, visible accessible errors, non-file byte identity.",
  ],
  [
    "route-security",
    "Both mounts use one prepared executor; public cookie nonce; internal session CSRF/RBAC; API-key scope; exactly one mode bucket; bounded pre-parse transport; no fallback path.",
  ],
  [
    "schema-integrity",
    "All exact nested keys/types/bounds, all 14 outer discriminants, safe pattern policy, dynamic value budget, reject-before-write, valid legacy/read behavior.",
  ],
  [
    "test-integrity",
    "Every source owner added behavior tests before gate; Bun/Vitest lanes correct; no assertion weakening; DB fixtures scoped; task-scoped scan clean and external TASK-538/TASK-545 findings honest.",
  ],
];

phase("Post-audit");
for (let round = 1; round <= 2; round += 1) {
  const results = await Promise.all(
    LENSES.map(async ([id, lens]) => ({
      id,
      result: await agent(
        `Fresh read-only TASK-536 post-audit round ${round}. Repository ${ROOT}; inspect final working tree, parent/all descendants, source, tests, docs and git diff/status. Lens: ${lens} Return only evidence-backed findings with file:line; do not edit.`,
        { label: `post-audit:${id}:${round}`, phase: "Post-audit", schema: AUDIT_SCHEMA }
      ),
    }))
  );
  requireAllResults(
    results,
    LENSES.map(([id]) => id),
    `TASK-536 post-audit round ${round}`
  );
  const findings = results.flatMap(({ result }) => result.findings);
  if (findings.length === 0) break;
  if (round === 2) throw new Error("TASK-536 post-audit remained blocked");
  await agent(
    `${COMMON}\n\nFix these verified TASK-536 post-audit HIGH/MEDIUM/LOW findings only through each finding's original declared leaf-owner seam; do not edit task/changelog metadata in this phase. Update only the owning behavior tests/docs and rerun affected targeted gates:\n` +
      findings
        .map((finding) => `- [${finding.severity}] ${finding.evidence}: ${finding.finding}`)
        .join("\n"),
    { label: "post-audit-fix:1", phase: "Post-audit" }
  );
}

phase("Smoke");
const smoke = await agent(
  `Final TASK-536 real-browser smoke at ${ROOT}. Read the parent and 536-05-L01 runtime scenarios. Load .env without printing secrets. Restart the server with the full helper command \`coderso-dev-core-host\`; verify \`curl --fail http://coderso-a.localhost:5173/admin/\` and \`curl --fail http://coderso-a.localhost:3000/\`. Use the full CLI prefix on every browser command: \`playwright-cli -s=wf536smoke <command>\` (never an abbreviated alias). Log in from .env if needed. Execute at least: required single image, asserting for helper-bearing and helper-free file fields that the same status node is neutral role=status plus computed absolute/sr-only with unchanged wrapper gap/height, becomes normal-flow visible during progress, becomes visible role=alert on error, and returns to neutral sr-only geometry after clear/reset; ordered multiple; failed upload and retry; cookie-bearing public nonce plus internal noninteractive boundary; publish/front passive image and PDF/SVG/text/allowed-unknown attachment delivery. Cover narrow/wide and light/dark admin. Assert visible progress/error/disabled state, submitted IDs/order, computed/DOM state and final response headers; capture console errors and require zero. Save screenshots only as ${ROOT}/_docs/_workflows/_smoke/task-536-*.png. Close with the full command \`playwright-cli -s=wf536smoke close\`. Do not edit production source or closure metadata. Return the structured actual result.`,
  { label: "smoke:536", phase: "Smoke", schema: SMOKE_SCHEMA }
);
if (!smoke.pass) throw new Error(`TASK-536 smoke failed: ${smoke.failures.join("; ")}`);

phase("536-05 close");
await agent(
  `${COMMON}\n\nTASK-536 implementation, targeted gates, five-lens post-audit and Playwright smoke are green. ` +
    `Read both indexes fresh. Record smoke scenarios/screenshots and exact validation (including the external TASK-538 and TASK-545-02-L01 strict-scan findings when they remain) in closeout. Describe the existing public Form block/section runtime, not a new non-dashboard widget surface. Create pinned changelog 1248, update its index, mark every physical TASK-536 descendant Done before the parent, and change only TASK-536 rows/statistics in the task board. Never edit production source, another task family, or commit.`,
  { label: "close:536", phase: "536-05 close" }
);

const CLOSURE_LENSES = [
  [
    "task-graph",
    "Every physical TASK-536 descendant is terminal before the parent; H1/FileName/parent/status/completed fields and board rows/statistics match physical files.",
  ],
  [
    "changelog-evidence",
    "Pinned changelog 1248 and index metadata agree; closeout truthfully records exact gates, external TASK-538/TASK-545 scan blockers, Playwright scenarios, zero-console result, and existing screenshot paths.",
  ],
  [
    "final-diff",
    "Final HEAD/dirty context and diff contain only intended TASK-536/program-order work; smoke evidence was not invalidated by later source/test/config edits; no other task status or changelog changed.",
  ],
];

phase("Final drift");
for (let round = 1; round <= 2; round += 1) {
  const results = await Promise.all(
    CLOSURE_LENSES.map(async ([id, lens]) => ({
      id,
      result: await agent(
        `Fresh read-only TASK-536 post-closure drift audit round ${round}. Repository ${ROOT}; read all TASK-536 files, task/changelog indexes, changelog 1248, closeout/smoke evidence, git status and full diff. Lens: ${lens} Report every high/medium/low drift with file:line. Do not edit.`,
        { label: `final-drift:${id}:${round}`, phase: "Final drift", schema: AUDIT_SCHEMA }
      ),
    }))
  );
  requireAllResults(
    results,
    CLOSURE_LENSES.map(([id]) => id),
    `TASK-536 final drift round ${round}`
  );
  const findings = results.flatMap(({ result }) => result.findings);
  if (findings.length === 0) break;
  if (round === 2) throw new Error("TASK-536 final closure drift remained unresolved");
  await agent(
    `${COMMON}\n\nFix only these verified post-closure metadata/evidence findings within TASK-536 closure ownership; never edit production source or another task family. If a finding requires source/test/config mutation after smoke, report it without editing so the workflow fails and returns to the owning phase:\n` +
      findings
        .map((finding) => `- [${finding.severity}] ${finding.evidence}: ${finding.finding}`)
        .join("\n"),
    { label: "final-drift-fix:1", phase: "Final drift" }
  );
}

phase("Final metadata gate");
const finalMetadataGate = await agent(
  `Final read-only TASK-536 metadata gate at ${ROOT}. Run exactly: node --check _docs/_workflows/task-536-implement.mjs && git diff --check. Return pass=true only when both commands exit zero; do not edit, stage, or commit.`,
  { label: "final-metadata-gate:536", phase: "Final metadata gate", schema: RESULT_SCHEMA }
);
if (!finalMetadataGate.pass) {
  throw new Error(`TASK-536 final metadata gate failed: ${finalMetadataGate.errors.join("; ")}`);
}
