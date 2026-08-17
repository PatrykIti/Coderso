export const meta = {
  name: "task-548-author-audit",
  description:
    "TASK-548 visual documentation authoring plus five mandatory sequential drift rounds",
  phases: [
    { title: "Research" },
    { title: "Author" },
    { title: "Round 1" },
    { title: "Round 2" },
    { title: "Round 3" },
    { title: "Round 4" },
    { title: "Round 5" },
    { title: "Final reconcile" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ROOT + "/_docs/_TASKS";
const TREE = "TASK-548";
const CHANGELOG = 1261;

const TASK_FILES = [
  "TASK-548_Hybrid_Visual_Documentation_Platform.md",
  "TASK-548-01-Canonical-Documentation-Contract-And-Compiler.md",
  "TASK-548-01-L01-Strict-Manifest-Schemas-And-Stable-Identity.md",
  "TASK-548-01-L02-Deterministic-Corpus-Compiler-And-Distribution-Bundle.md",
  "TASK-548-01-L03-Assistant-Ingest-V2-And-Compatibility-Migration.md",
  "TASK-548-02-Deterministic-Playwright-Visual-Pipeline.md",
  "TASK-548-02-L01-Visual-Scenario-Manifest-And-Fixture-Contract.md",
  "TASK-548-02-L02-Playwright-CLI-Capture-Promotion-And-Receipts.md",
  "TASK-548-02-L03-Visual-Staleness-Diff-And-CI-Gates.md",
  "TASK-548-03-Embedded-Local-Help-And-Guide.md",
  "TASK-548-03-L01-Admin-Route-Registry-Extraction-And-Help-Navigation.md",
  "TASK-548-03-L02-Local-Help-Search-Reader-And-Visual-Renderer.md",
  "TASK-548-03-L03-Independent-Guide-And-Optional-Agent-Tabs.md",
  "TASK-548-04-Official-Versioned-Documentation-Portal.md",
  "TASK-548-04-L01-Public-Portal-Shell-Search-And-Shared-Renderer.md",
  "TASK-548-04-L02-Versioned-Static-Routes-Deep-Links-And-SEO.md",
  "TASK-548-04-L03-Portal-Accessibility-Security-And-Browser-Gates.md",
  "TASK-548-05-Versioned-Distribution-And-Release-Publishing.md",
  "TASK-548-05-L01-Immutable-Docs-Artifact-Manifest-And-Integrity.md",
  "TASK-548-05-L02-Tag-Pinned-Publication-Latest-Alias-And-Rollback.md",
  "TASK-548-06-Corpus-And-Visual-Migration.md",
  "TASK-548-06-L01-Guide-Corpus-Metadata-Examples-And-Visual-Waves.md",
  "TASK-548-06-L02-Coverage-Link-Route-And-Publication-Reconciliation.md",
  "TASK-548-07-Acceptance-Smoke-Documentation-And-Closure.md",
  "TASK-548-07-L01-Full-Gates-Real-Flows-Docs-And-Closure.md",
  "TASK-548-08-Multi-Agent-Workflow-And-Drift-Evidence.md",
];

const RESEARCH_SCOPES = [
  "Corpus/compiler/DB ingest: docs/guide, docs/develop, assistant docs services/types/schema/tests.",
  "Visual pipeline: existing playwright-cli scripts, workflow evidence, CI and security rules.",
  "Embedded Help/Guide/Agent: Admin routes/navigation/prefetch/cache, Assistant UI/client/routes.",
  "Portal/release/closure: current build/release workflows, static assets, docs and gate ownership.",
];

const LAND_ORDER = ["548-01", "548-02", "548-03", "548-04", "548-05", "548-06", "548-07"];

const LOCKED_CONTRACT = `
One authored end-user and assistant source: docs/guide. The initial v2 compiler excludes
docs/develop; a later explicit public-only feed must never enter assistant retrieval.
Shared names are DocsCorpusManifestV2, DocsDocumentV2, DocsSectionV2,
DocsPermissionRequirementV1, DocsVisualV1, DocsExampleV1 and
DocsDistributionBundleV2. Document access is exactly permissionRequirement:
DocsPermissionRequirementV1|null with allOf/anyOf semantics; capabilityIds is the only
capability field. The corpus discriminator is coderso.docs-corpus@v2 and publication
targets are assistant|embedded-help|public-docs. One deterministic local bundle feeds
embedded Help, the existing DB-only assistant ingest, and the public static portal.
Portal output uses a detached DocsPortalManifestV1; release output retains an immutable
per-version publication capsule and post-deploy health receipt. No per-question remote
fetch, runtime docs API, raw HTML, remote image URL, public write, or Designer/canvas work.
Changelog 1261 is closure-only. Implementation lands ${LAND_ORDER.join(" -> ")};
548-08 is workflow-only throughout.
`;

const COMMON = `
Repository: ${ROOT}. Resolve and report current HEAD plus dirty status before judging.
Read root AGENTS.md, _docs/_TASKS/README.md, the parent/child task state, README.md,
CONTRIBUTING.md, _docs/ARCHITECTURE.md, _docs/CMS_SPEC.md, _docs/CMS_API.md,
_docs/TESTING_STRATEGY.md and each touched domain source/test. Ground every file/symbol
anchor against the live tree. Use grep -an/Read when rg may misdetect a large file.
Never expose secrets, credentials, raw sensitive logs, submissions, or user data.
Treat reports as evidence, not authority.
${LOCKED_CONTRACT}
`;

const RESEARCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "anchors", "risks"],
  properties: {
    summary: { type: "string" },
    anchors: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
  },
};

const AUTHOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["file", "summary", "anchors", "openQuestions"],
  properties: {
    file: { type: "string" },
    summary: { type: "string" },
    anchors: { type: "array", items: { type: "string" } },
    openQuestions: { type: "array", items: { type: "string" } },
  },
};

const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "findings"],
  properties: {
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "area", "file", "finding", "evidence", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          area: { type: "string" },
          file: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
};

const FIX_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "fixed", "rejected"],
  properties: {
    summary: { type: "string" },
    fixed: { type: "array", items: { type: "string" } },
    rejected: { type: "array", items: { type: "string" } },
  },
};

function requireAllResults(label, expected, results) {
  if (!Array.isArray(results) || results.length !== expected) {
    throw new Error(`${label}: expected ${expected} results, got ${results?.length ?? 0}`);
  }
  const missing = [];
  for (let index = 0; index < results.length; index += 1) {
    if (!results[index]) missing.push(index);
  }
  if (missing.length > 0) {
    throw new Error(`${label}: missing results at indexes ${missing.join(",")}`);
  }
  return results;
}

function highMedium(result) {
  return result.findings.filter(
    (finding) => finding.severity === "HIGH" || finding.severity === "MEDIUM"
  );
}

function taskIdFor(file) {
  const match = file.match(/^TASK-(548(?:-\d{2})?(?:-L\d{2})?)/);
  if (!match) throw new Error("Cannot derive task id for " + file);
  return match[1];
}

function parentFor(file) {
  if (file.startsWith("TASK-548-") && file.includes("-L")) {
    return file.match(/^TASK-(548-\d{2})-/)?.[1] ?? "548";
  }
  return "548";
}

function authorPrompt(file, research) {
  return `You are the fresh-context AUTHOR and sole writer for ${file}.
You may edit only ${TASKS}/${file}; do not touch source, tests, indexes, changelogs,
workflows, TASK-547, or another TASK-548 file.
${COMMON}
Research evidence: ${JSON.stringify(research)}
The H1 task id must be ${taskIdFor(file)} and FileName must exactly equal ${file}.
Use canonical To Do status and parent ${parentFor(file)} where applicable. Every executable
leaf needs implementation pseudocode with helper/function shape, data flow, error handling,
regression-test shape and exact validation commands. Route-related work needs the complete
Security Contract. Name one writer for every planned source/test/doc path, correct Bun/Vitest
lanes, shared-DB isolation, and the <=1000 physical-line gate.`;
}

function auditPrompt(file, round) {
  return `You are a fresh-context READ-ONLY per-file drift auditor for ${TREE}, round ${round}.
Do not edit. Audit ${TASKS}/${file} against current source/docs/tests and all relevant TASK-548
contracts. ${COMMON}
Check real anchors, complete agreed scope, executable pseudocode, security, strict schemas,
test lanes, migrations, source ownership, file-size splits, status/parent/FileName, and that
the file neither duplicates nor silently moves work owned elsewhere. Return every finding;
an empty list must summarize concrete checks.`;
}

function reconcilePrompt(round) {
  return `You are the single fresh-context READ-ONLY cross-file RECONCILE auditor for ${TREE},
round ${round}. Do not edit. Read all files: ${TASK_FILES.join(", ")}.
${COMMON}
Check only cross-file contradictions: single-writer paths; shared type/helper/discriminator/
enum/error/route names; local-vs-DB-vs-public target boundaries; asset/receipt shapes; locale
and SemVer representation; security policies; test files; land order; TASK-547 collision
guards; TASK-549/Designer exclusion; and pinned changelog ${CHANGELOG}. Evidence must name
both contradictory files.`;
}

function perFileFixPrompt(file, round, findings) {
  return `You are the scoped drift FIXER for ${file}, round ${round}. Edit only
${TASKS}/${file}. ${COMMON}
Verify and fix these HIGH/MEDIUM findings: ${JSON.stringify(findings)}.
Do not broaden scope or touch another file. Report each fix or evidence-backed rejection.`;
}

function crossFixPrompt(round, findings) {
  return `You are the cross-file contract FIXER for ${TREE}, round ${round}. Edit only the
TASK-548 task files named in each finding; never edit source/tests/workflows/indexes/changelogs
or TASK-547. ${COMMON}
The definition in the owning land-order task is authoritative; align consumers without
stealing ownership. Findings: ${JSON.stringify(findings)}.`;
}

phase("Research");
const research = requireAllResults(
  "research",
  RESEARCH_SCOPES.length,
  await parallel(
    RESEARCH_SCOPES.map(
      (scope, index) => () =>
        agent(`Fresh-context read-only research ${index + 1}. ${scope}\n${COMMON}`, {
          label: `research:${index + 1}`,
          phase: "Research",
          schema: RESEARCH_SCHEMA,
        })
    )
  )
);

phase("Author");
const authored = requireAllResults(
  "author",
  TASK_FILES.length,
  await parallel(
    TASK_FILES.map(
      (file) => () =>
        agent(authorPrompt(file, research), {
          label: "author:" + taskIdFor(file),
          phase: "Author",
          schema: AUTHOR_SCHEMA,
        })
    )
  )
);

const openQuestions = authored.flatMap((result) => result.openQuestions);
if (openQuestions.length > 0) {
  throw new Error("Authoring left unresolved questions: " + JSON.stringify(openQuestions));
}

const roundEvidence = [];

for (let round = 1; round <= 5; round += 1) {
  const phaseName = "Round " + round;
  phase(phaseName);
  const perFile = requireAllResults(
    `round-${round}-per-file`,
    TASK_FILES.length,
    await parallel(
      TASK_FILES.map(
        (file) => () =>
          agent(auditPrompt(file, round), {
            label: `audit:${taskIdFor(file)}:${round}`,
            phase: phaseName,
            schema: AUDIT_SCHEMA,
          })
      )
    )
  );
  const reconcile = requireAllResults(
    `round-${round}-reconcile`,
    1,
    await parallel([
      () =>
        agent(reconcilePrompt(round), {
          label: `audit:reconcile:${round}`,
          phase: phaseName,
          schema: AUDIT_SCHEMA,
        }),
    ])
  )[0];
  const perFileFindings = perFile.map((result) => highMedium(result));
  const crossFindings = highMedium(reconcile);
  const perFileFixJobs = [];

  for (let index = 0; index < TASK_FILES.length; index += 1) {
    if (perFileFindings[index].length === 0) continue;
    const file = TASK_FILES[index];
    const findings = perFileFindings[index];
    perFileFixJobs.push(() =>
      agent(perFileFixPrompt(file, round, findings), {
        label: `fix:${taskIdFor(file)}:${round}`,
        phase: phaseName,
        schema: FIX_SCHEMA,
      })
    );
  }

  const perFileFixed =
    perFileFixJobs.length === 0
      ? []
      : requireAllResults(
          `per-file-fix-round-${round}`,
          perFileFixJobs.length,
          await parallel(perFileFixJobs)
        );
  const crossFixed =
    crossFindings.length === 0
      ? []
      : requireAllResults(
          `cross-fix-round-${round}`,
          1,
          await parallel([
            () =>
              agent(crossFixPrompt(round, crossFindings), {
                label: `fix:reconcile:${round}`,
                phase: phaseName,
                schema: FIX_SCHEMA,
              }),
          ])
        );
  roundEvidence.push({
    round,
    perFileHighMedium: perFileFindings.reduce((sum, findings) => sum + findings.length, 0),
    crossHighMedium: crossFindings.length,
    fixerResults: perFileFixed.length + crossFixed.length,
  });
}

phase("Final reconcile");
const finalResult = requireAllResults(
  "final-reconcile",
  1,
  await parallel([
    () =>
      agent(
        `${reconcilePrompt("final")}
This is a fresh final pass after all mutations. Also verify every expected file exists,
there are exactly ${TASK_FILES.length} TASK-548 physical files, and five completed round
records exist. No HIGH, MEDIUM, or unresolved LOW may be omitted.`,
        {
          label: "audit:final-reconcile",
          phase: "Final reconcile",
          schema: AUDIT_SCHEMA,
        }
      ),
  ])
)[0];

if (finalResult.findings.length > 0) {
  throw new Error("TASK-548 final reconcile has findings: " + JSON.stringify(finalResult.findings));
}

log(
  JSON.stringify({
    pass: true,
    tree: TREE,
    expectedFiles: TASK_FILES.length,
    changelog: CHANGELOG,
    landOrder: LAND_ORDER,
    rounds: roundEvidence,
    finalSummary: finalResult.summary,
  })
);
