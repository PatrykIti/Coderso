import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, lstat, readFile, readlink } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { promisify } from "node:util";

export const meta = {
  name: "task-536-545-author-audit",
  description:
    "Research, author, and contract-audit the ten remediation families TASK-536 through TASK-545. The workflow is documentation-only, pins changelogs 1248-1257, requires every author/audit result, and runs at least five sequential drift-audit rounds with one cross-program reconcile per round.",
  phases: [
    { title: "Research" },
    { title: "Author parents" },
    { title: "Author children" },
    { title: "Round 1" },
    { title: "Round 2" },
    { title: "Round 3" },
    { title: "Round 4" },
    { title: "Round 5" },
    { title: "Round 6" },
    { title: "Round 7" },
    { title: "Final reconcile" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS_DIR = `${ROOT}/_docs/_TASKS`;
const AUDIT_REPORT = `${ROOT}/_TMP-repo-worktree-task-audit-2026-07-09.md`;
const execFileAsync = promisify(execFile);

const PROGRAM = [
  {
    id: "536",
    changelog: 1248,
    parent: "TASK-536_Forms_File_Upload_and_Media_Trust_Boundary.md",
    scope:
      "H-01/H-02/H-03, M-03, and L-03: byte-authoritative media identity, safe delivery, working form file runtime, strict nested schemas, and one public_write charge. Keep the confirmed exploit details redacted.",
    children: [
      [
        "536-01",
        "TASK-536-01-Canonical-Media-Byte-Identity-And-Storage-Keys.md",
        [
          "TASK-536-01-L01-Canonicalize-Upload-Bytes-Mime-And-Key.md",
          "TASK-536-01-L02-Apply-Canonical-Identity-To-Storage-Adapters.md",
          "TASK-536-01-L03-Integrate-Canonical-Media-Service-And-Urls.md",
        ],
      ],
      [
        "536-02",
        "TASK-536-02-Safe-Public-Media-Delivery.md",
        ["TASK-536-02-L01-Persisted-Mime-Nosniff-And-Disposition.md"],
      ],
      [
        "536-03",
        "TASK-536-03-Form-File-Upload-Runtime.md",
        [
          "TASK-536-03-L01-Upload-Control-And-Hidden-Id-Contract.md",
          "TASK-536-03-L02-Upload-Before-Submit-State-Machine.md",
        ],
      ],
      [
        "536-04",
        "TASK-536-04-Strict-Forms-Schemas-And-Single-Rate-Limit.md",
        [
          "TASK-536-04-L01-Nested-Reject-Unknown-And-Public-Write-Ownership.md",
          "TASK-536-04-L02-Strict-Nested-Forms-Schemas.md",
        ],
      ],
      [
        "536-05",
        "TASK-536-05-Tests-Security-Smoke-And-Closure.md",
        ["TASK-536-05-L01-Cross-Lane-Tests-Smoke-And-Closure.md"],
      ],
    ],
  },
  {
    id: "537",
    changelog: 1249,
    parent: "TASK-537_Entry_Mutation_Atomicity_and_Secret_Minimal_Projections.md",
    scope:
      "M-01/M-02: one entry-metadata transaction with validation before the first write, cache invalidation after commit, and explicit projections that never materialize accessPassword. Land before TASK-517 and re-audit TASK-517 afterward.",
    children: [
      [
        "537-01",
        "TASK-537-01-Entry-Metadata-Transaction-Boundary.md",
        [
          "TASK-537-01-L01-Transaction-Aware-Taxonomy-Mutations.md",
          "TASK-537-01-L02-Transaction-Aware-Seo-Mutations.md",
        ],
      ],
      [
        "537-02",
        "TASK-537-02-Secret-Minimal-Entry-Projections.md",
        ["TASK-537-02-L01-Narrow-Update-Publish-And-Delete-Projections.md"],
      ],
      [
        "537-03",
        "TASK-537-03-Rollback-Cache-Tests-And-Closure.md",
        ["TASK-537-03-L01-Db-Rollback-Cache-After-Commit-And-Closure.md"],
      ],
    ],
  },
  {
    id: "538",
    changelog: 1250,
    parent: "TASK-538_Custom_SVG_Layout_Isolation.md",
    scope:
      "H-04 and the current Semgrep sink: remove author-controlled SVG class while retaining safe presentation attributes, prove geometry/click isolation, and update the inaccurate security documentation without publishing an exploit payload or adding a scanner exception.",
    children: [
      [
        "538-01",
        "TASK-538-01-Remove-Author-Controlled-Svg-Class.md",
        [
          "TASK-538-01-L01-Sanitize-Svg-Class-At-Write-And-Render.md",
          "TASK-538-01-L02-Build-Sanitizer-Owned-Safe-Svg-Tree.md",
        ],
      ],
      [
        "538-02",
        "TASK-538-02-Sanitizer-Renderer-And-Browser-Isolation-Regressions.md",
        [
          "TASK-538-02-L01-Integrate-Safe-Svg-Tree-In-Page-Renderer.md",
          "TASK-538-02-L02-Prove-Geometry-And-Click-Through-Isolation.md",
        ],
      ],
      [
        "538-03",
        "TASK-538-03-Security-Scan-Docs-And-Closure.md",
        ["TASK-538-03-L01-Redacted-Security-Docs-Scan-And-Closure.md"],
      ],
    ],
  },
  {
    id: "539",
    changelog: 1251,
    parent: "TASK-539_Page_V2_Post_Audit_Remediation_II.md",
    scope:
      "H-05..H-09, M-06..M-18, L-01/L-02, and the Page half of II-M-01: close the residual Page v2 model, sanitizer, authoring, composition, render, responsive CSS, runtime-init, and narrow-canvas gaps after TASK-535.",
    children: [
      [
        "539-01",
        "TASK-539-01-Page-Model-Schema-And-Normalization.md",
        [
          "TASK-539-01-L01-Deep-Layer-Merge-Strict-Gallery-And-Effect-Normalization.md",
          "TASK-539-01-L02-Prove-Model-Roundtrip-And-Present-Key-Identity.md",
        ],
      ],
      [
        "539-02",
        "TASK-539-02-Grid-And-Background-Sanitizer-Corrections.md",
        [
          "TASK-539-02-L01-Unitful-Grid-And-Split-Background-Layers.md",
          "TASK-539-02-L02-Prove-Grid-And-Background-Sanitizer-Corpus.md",
        ],
      ],
      [
        "539-03",
        "TASK-539-03-Gallery-Controls-Gating-And-Responsive-Canvas.md",
        [
          "TASK-539-03-L01-Define-Gallery-Controls-Gates-And-Z-Clamp.md",
          "TASK-539-03-L02-Build-Gallery-Items-Media-Control.md",
          "TASK-539-03-L03-Wire-Gallery-And-Responsive-Page-Canvas.md",
          "TASK-539-03-L04-Prove-Gallery-Controls-And-Narrow-Canvas.md",
        ],
      ],
      [
        "539-04",
        "TASK-539-04-Independent-Transform-Channels.md",
        [
          "TASK-539-04-L01-Separate-Layer-Reveal-Hover-Tilt-And-Magnetic-Wrappers.md",
          "TASK-539-04-L02-Prove-Independent-Transform-Composition.md",
        ],
      ],
      [
        "539-05",
        "TASK-539-05-Renderer-Behavior-And-Geometry-Corrections.md",
        [
          "TASK-539-05-L01-Stamp-And-Render-All-Page-Effects-Correctly.md",
          "TASK-539-05-L02-Prove-Renderer-Effects-And-Geometry.md",
        ],
      ],
      [
        "539-06",
        "TASK-539-06-Responsive-Css-Parity.md",
        [
          "TASK-539-06-L01-Emit-Typography-Spans-Layers-And-Full-Bleed-Per-Device.md",
          "TASK-539-06-L02-Prove-Responsive-Css-Parity.md",
        ],
      ],
      [
        "539-07",
        "TASK-539-07-Per-Root-Idempotent-Effects-Runtime.md",
        [
          "TASK-539-07-L01-Bind-Each-Page-Root-And-Footer-Exactly-Once.md",
          "TASK-539-07-L02-Prove-Main-And-Footer-Idempotence.md",
        ],
      ],
      [
        "539-08",
        "TASK-539-08-Tests-Docs-Smoke-And-Closure.md",
        ["TASK-539-08-L01-Nine-Flow-Page-Parity-Suite-And-Closure.md"],
      ],
    ],
  },
  {
    id: "540",
    changelog: 1252,
    parent: "TASK-540_Custom_Screens_Functional_and_Data_Integrity_Remediation.md",
    scope:
      "II-H-01..II-H-04, II-M-01, II-M-03..II-M-07, II-M-12, and the Custom Screens accessibility findings. Button authoring remains link-only; legacy publish/custom actions read as safely disabled.",
    children: [
      [
        "540-01",
        "TASK-540-01-Strict-Screen-Data-Urls-Tabs-And-Binding-Gc.md",
        ["TASK-540-01-L01-Reject-Unknown-Sanitize-Urls-Unique-Tabs-And-Prune-Ghosts.md"],
      ],
      [
        "540-02",
        "TASK-540-02-Button-Binding-And-Tabs-Authoring.md",
        ["TASK-540-02-L01-Expose-Link-Binding-And-Complete-Tab-Slot-Editing.md"],
      ],
      [
        "540-03",
        "TASK-540-03-Accessible-Tabs-And-Selection-Semantics.md",
        ["TASK-540-03-L01-Functional-Tabs-And-No-Nested-Interactive-Space-Trap.md"],
      ],
      [
        "540-04",
        "TASK-540-04-Dirty-Navigation-And-Async-Cache-Recovery.md",
        [
          "TASK-540-04-L01-Make-Related-Entry-Promise-Caches-Retryable.md",
          "TASK-540-04-L02-Cancel-And-Retry-Related-Entry-Loads.md",
          "TASK-540-04-L03-Guard-Entry-Drafts-And-Subscribe-Related-Caches.md",
          "TASK-540-04-L04-Guard-Screen-Builder-Drafts.md",
        ],
      ],
      [
        "540-05",
        "TASK-540-05-Responsive-Canvas-Aria-And-User-Preferences.md",
        [
          "TASK-540-05-L01-Keep-Screen-Canvas-Usable-And-Aria-Valid.md",
          "TASK-540-05-L02-Scope-Screen-Preferences-Through-User-Settings.md",
        ],
      ],
      [
        "540-06",
        "TASK-540-06-Tests-Smoke-And-Closure.md",
        ["TASK-540-06-L01-Six-Builder-Save-Entry-Flows-And-Closure.md"],
      ],
    ],
  },
  {
    id: "541",
    changelog: 1253,
    parent: "TASK-541_Canonical_CSS_Color_Contract.md",
    scope:
      "M-04: replace three drifting regex mirrors with one Bun-free parser/normalizer and explicit policy profiles, then roll the shared authoring subset through admin controls, menu writes, and widget rendering with parity/property tests.",
    children: [
      [
        "541-01",
        "TASK-541-01-Shared-Color-Parser-And-Policy-Profiles.md",
        [
          "TASK-541-01-L01-One-Bun-Free-Canonical-Color-Contract.md",
          "TASK-541-01-L02-Prove-Canonical-Color-Corpus.md",
        ],
      ],
      [
        "541-02",
        "TASK-541-02-Admin-Menu-And-Widget-Rollout.md",
        [
          "TASK-541-02-L01-Roll-Out-Color-Contract-To-Admin-Controls.md",
          "TASK-541-02-L02-Roll-Out-Color-Contract-To-Menu-Writes.md",
          "TASK-541-02-L03-Roll-Out-Color-Contract-To-Widget-Rendering.md",
        ],
      ],
      [
        "541-03",
        "TASK-541-03-Parity-Property-Roundtrip-And-Closure.md",
        ["TASK-541-03-L01-Shared-Corpus-Property-Tests-And-Closure.md"],
      ],
    ],
  },
  {
    id: "542",
    changelog: 1254,
    parent: "TASK-542_Menu_Determinism_Responsive_Cascade_and_Runtime_Parity.md",
    scope:
      "M-05, II-H-05/II-H-06, II-M-08..II-M-11, and II-M-13/II-M-14: strict deterministic menu documents, complete responsive neutralizers, scrolled/icon parity, shared public projection, one active item identity, and dirty-safe cache revalidation.",
    children: [
      [
        "542-01",
        "TASK-542-01-Strict-Deterministic-Menu-Documents.md",
        ["TASK-542-01-L01-Require-Unique-Ids-Topology-And-Stable-Legacy-Reads.md"],
      ],
      [
        "542-02",
        "TASK-542-02-Responsive-Neutralizers-Scrolled-And-Brand-Parity.md",
        ["TASK-542-02-L01-Reset-Every-Device-Value-And-Emit-Icon-Color.md"],
      ],
      [
        "542-03",
        "TASK-542-03-Public-Projection-Active-Identity-And-Cache-Safety.md",
        [
          "TASK-542-03-L01-Create-Shared-Public-Navigation-Projection.md",
          "TASK-542-03-L02-Use-Projection-Active-Identity-And-Responsive-Gates-At-Front.md",
          "TASK-542-03-L03-Revalidate-Menu-Design-Without-Clobbering-Drafts.md",
        ],
      ],
      [
        "542-04",
        "TASK-542-04-Tests-Smoke-And-Closure.md",
        ["TASK-542-04-L01-Six-Cross-Device-Publish-Front-Flows-And-Closure.md"],
      ],
    ],
  },
  {
    id: "543",
    changelog: 1255,
    parent: "TASK-543_Posts_Exit_Safety_and_List_Accessibility.md",
    scope:
      "II-M-02 plus PostsTable accessibility: Close awaits autosave flush and stays put on failure; list navigation uses a real link instead of a clickable row and retains author/published context at md..lg.",
    children: [
      [
        "543-01",
        "TASK-543-01-Autosave-Flush-Before-Close.md",
        ["TASK-543-01-L01-Wait-For-Dirty-Draft-And-Remain-On-Failure.md"],
      ],
      [
        "543-02",
        "TASK-543-02-Posts-Table-Keyboard-And-Metadata-Parity.md",
        ["TASK-543-02-L01-Remove-Row-Click-And-Restore-Mid-Viewport-Metadata.md"],
      ],
      [
        "543-03",
        "TASK-543-03-Tests-Smoke-And-Closure.md",
        ["TASK-543-03-L01-Close-Failure-Keyboard-Viewport-Flows-And-Closure.md"],
      ],
    ],
  },
  {
    id: "544",
    changelog: 1256,
    parent: "TASK-544_Media_Folder_Reliability_and_Error_Recovery.md",
    scope:
      "L-04..L-06: map update races to the stable 409 code, clear rejected dedupe promises with an identity guard, and expose retryable folder-operation failures without losing selection or draft state.",
    children: [
      [
        "544-01",
        "TASK-544-01-Folder-Slug-Race-Mapping.md",
        ["TASK-544-01-L01-Map-Create-And-Update-Constraint-Races-To-409.md"],
      ],
      [
        "544-02",
        "TASK-544-02-Retryable-Folder-Cache-Dedupe.md",
        ["TASK-544-02-L01-Clear-Settled-Promises-With-Identity-Guard.md"],
      ],
      [
        "544-03",
        "TASK-544-03-Visible-Retryable-Folder-Ui-Errors.md",
        ["TASK-544-03-L01-Recover-Create-Rename-Reorder-Delete-Without-State-Loss.md"],
      ],
      [
        "544-04",
        "TASK-544-04-Tests-Smoke-And-Closure.md",
        ["TASK-544-04-L01-Service-Route-Client-Ui-Smoke-And-Closure.md"],
      ],
    ],
  },
  {
    id: "545",
    changelog: 1257,
    parent: "TASK-545_Workflow_Smoke_Evidence_and_Task_Graph_Integrity.md",
    scope:
      "P-HIGH/P-MEDIUM/P-LOW and II-P-HIGH process findings: shared all-results guard, compliant audit/post-audit workflows, durable smoke evidence manifests/screenshots, and the enumerated historical board/task/changelog metadata repairs. TASK-538 owns the SVG Semgrep source fix; no scanner exception.",
    children: [
      [
        "545-01",
        "TASK-545-01-All-Results-Guard-And-Static-Workflow-Contract.md",
        [
          "TASK-545-01-L01-Add-Require-All-Results-Helper.md",
          "TASK-545-01-L02-Statically-Enforce-Workflow-Contracts.md",
        ],
      ],
      [
        "545-02",
        "TASK-545-02-Canonical-Audit-And-Post-Audit-Workflow.md",
        [
          "TASK-545-02-L01-Converge-Author-And-Audit-Workflows.md",
          "TASK-545-02-L02-Converge-Implement-Fix-And-Post-Audit-Workflows.md",
        ],
      ],
      [
        "545-03",
        "TASK-545-03-Durable-Smoke-Evidence-Manifest.md",
        [
          "TASK-545-03-L01-Define-And-Validate-Smoke-Evidence-Manifests.md",
          "TASK-545-03-L02-Track-Synthetic-Screenshots-And-Verify-Hashes.md",
        ],
      ],
      [
        "545-04",
        "TASK-545-04-Task-Graph-Changelog-Repair-And-Closure.md",
        [
          "TASK-545-04-L01-Correct-Existing-Task-Metadata.md",
          "TASK-545-04-L02-Reconstruct-Truthful-Historical-Parents.md",
          "TASK-545-04-L03-Reconcile-Board-Changelog-And-Close-Program.md",
          "TASK-545-04-L04-Normalize-Historical-Statuses-And-Changelog-Evidence.md",
        ],
      ],
    ],
  },
];

const RESEARCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["taskId", "head", "dirtyContext", "findings", "sourceFiles", "testFiles"],
  properties: {
    taskId: { type: "string" },
    head: { type: "string" },
    dirtyContext: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "auditId", "status", "evidence", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          auditId: { type: "string" },
          status: { type: "string", enum: ["confirmed", "changed", "invalid"] },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
    sourceFiles: { type: "array", items: { type: "string" } },
    testFiles: { type: "array", items: { type: "string" } },
  },
};

const AUTHOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["taskId", "filesWritten", "summary", "openQuestions"],
  properties: {
    taskId: { type: "string" },
    filesWritten: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
    openQuestions: { type: "array", items: { type: "string" } },
  },
};

const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["file", "summary", "findings"],
  properties: {
    file: { type: "string" },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "area", "finding", "evidence", "recommendation", "blocksExecution"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          area: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
          blocksExecution: { type: "boolean" },
        },
      },
    },
  },
};

const FIX_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["filesEdited", "fixed", "rejected"],
  properties: {
    filesEdited: { type: "array", items: { type: "string" } },
    fixed: { type: "array", items: { type: "string" } },
    rejected: { type: "array", items: { type: "string" } },
  },
};

function requireAllResults(results, expected, label, identities) {
  if (!Array.isArray(results) || results.length !== expected) {
    throw new Error(`${label}: expected ${expected} results, received ${results?.length ?? 0}`);
  }
  const missing = [];
  for (let index = 0; index < results.length; index += 1) {
    if (results[index] == null) missing.push(index);
  }
  if (missing.length > 0) {
    throw new Error(`${label}: missing results at indices ${missing.join(",")}; round is void`);
  }
  if (identities) {
    const { expected: expectedIdentities, read } = identities;
    if (expectedIdentities.length !== expected) {
      throw new Error(`${label}: identity contract length mismatch`);
    }
    for (let index = 0; index < results.length; index += 1) {
      const actual = read(results[index], index);
      if (actual !== expectedIdentities[index]) {
        throw new Error(
          `${label}: result ${index} identity mismatch; expected ${expectedIdentities[index]}, received ${actual}`
        );
      }
    }
  }
  return results;
}

function normalizeReportedPath(value) {
  if (typeof value !== "string") return "";
  const clean = value.replace(/\\/g, "/").replace(/^\.\//, "");
  const absolute = resolve(isAbsolute(clean) ? clean : `${ROOT}/${clean}`);
  const repoRelative = relative(ROOT, absolute).replace(/\\/g, "/");
  if (
    repoRelative.length === 0 ||
    repoRelative === ".." ||
    repoRelative.startsWith("../") ||
    isAbsolute(repoRelative)
  ) {
    return "";
  }
  return `${ROOT}/${repoRelative}`;
}

function toRepoRelativePath(value) {
  const normalized = normalizeReportedPath(value);
  return normalized.length > 0 ? normalized.slice(ROOT.length + 1) : "";
}

function normalizeTaskId(value) {
  return typeof value === "string" ? value.replace(/^TASK-/, "") : "";
}

function requireWrittenFiles(result, expectedFiles, label) {
  const actual = (result.filesWritten ?? []).map(normalizeReportedPath).sort();
  const expected = expectedFiles.map(normalizeReportedPath).sort();
  if (
    actual.some((file) => file.length === 0) ||
    actual.length !== new Set(actual).size ||
    actual.length !== expected.length ||
    actual.some((file, index) => file !== expected[index])
  ) {
    throw new Error(
      `${label}: filesWritten mismatch; expected ${expected.join(",")}, received ${actual.join(",")}`
    );
  }
}

function requireEditedFiles(result, allowedFiles, label, exactFile) {
  const actual = (result.filesEdited ?? []).map(toRepoRelativePath).sort();
  const allowed = new Set(allowedFiles.map(toRepoRelativePath));
  if (actual.some((file) => file.length === 0) || actual.length !== new Set(actual).size) {
    throw new Error(`${label}: filesEdited contains an invalid or duplicate path`);
  }
  const forbidden = actual.filter((file) => !allowed.has(file));
  if (forbidden.length > 0) {
    throw new Error(`${label}: filesEdited outside ownership: ${forbidden.join(",")}`);
  }
  if (
    exactFile &&
    actual.length > 0 &&
    (actual.length !== 1 || actual[0] !== toRepoRelativePath(exactFile))
  ) {
    throw new Error(`${label}: a per-file fixer may edit only ${toRepoRelativePath(exactFile)}`);
  }
  if ((result.fixed ?? []).length > 0 && actual.length === 0) {
    throw new Error(`${label}: reported fixed findings without a filesEdited path`);
  }
  return actual;
}

async function gitNullSeparated(args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout.split("\0").filter((entry) => entry.length > 0);
}

async function fingerprintPath(repoRelative) {
  const absolute = `${ROOT}/${repoRelative}`;
  try {
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) {
      return `link:${stat.mode}:${await readlink(absolute)}`;
    }
    if (!stat.isFile()) return `other:${stat.mode}:${stat.size}`;
    const hash = createHash("sha256")
      .update(await readFile(absolute))
      .digest("hex");
    return `file:${stat.mode}:${stat.size}:${hash}`;
  } catch (error) {
    if (error?.code === "ENOENT") return "missing";
    throw error;
  }
}

async function fingerprintGitIndex() {
  const { stdout } = await execFileAsync("git", ["ls-files", "--stage", "-z"], {
    cwd: ROOT,
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  });
  return createHash("sha256").update(stdout).digest("hex");
}

async function snapshotWorktree() {
  const [tracked, untracked, indexSha256] = await Promise.all([
    gitNullSeparated(["diff", "--name-only", "--no-renames", "-z", "HEAD", "--"]),
    gitNullSeparated(["ls-files", "--others", "--exclude-standard", "-z"]),
    fingerprintGitIndex(),
  ]);
  const files = [...new Set([...tracked, ...untracked])].sort();
  const fingerprints = new Map();
  for (const file of files) fingerprints.set(file, await fingerprintPath(file));
  return { fingerprints, indexSha256 };
}

function changedSnapshotPaths(before, after) {
  const paths = [...new Set([...before.fingerprints.keys(), ...after.fingerprints.keys()])].sort();
  return paths.filter((file) => before.fingerprints.get(file) !== after.fingerprints.get(file));
}

async function requireFixerBatchDiff(before, results, allowedFiles, label, exactFiles = []) {
  const allowed = allowedFiles.map(toRepoRelativePath);
  const reported = [];
  for (let index = 0; index < results.length; index += 1) {
    reported.push(
      ...requireEditedFiles(
        results[index],
        allowedFiles,
        `${label} result ${index}`,
        exactFiles[index]
      )
    );
  }
  if (reported.length !== new Set(reported).size) {
    throw new Error(`${label}: multiple fixers reported the same file`);
  }

  const after = await snapshotWorktree();
  if (before.indexSha256 !== after.indexSha256) {
    throw new Error(`${label}: fixer changed the git index; git add/reset is forbidden`);
  }
  const changed = changedSnapshotPaths(before, after);
  const forbidden = changed.filter((file) => !allowed.includes(file));
  if (forbidden.length > 0) {
    throw new Error(`${label}: working-tree changes outside ownership: ${forbidden.join(",")}`);
  }
  const expected = [...reported].sort();
  if (
    changed.length !== expected.length ||
    changed.some((file, index) => file !== expected[index])
  ) {
    throw new Error(
      `${label}: filesEdited/diff mismatch; reported ${expected.join(",")}, changed ${changed.join(",")}`
    );
  }
  return after;
}

async function requireManifestFiles(files) {
  if (files.length !== new Set(files).size) {
    throw new Error("manifest files: duplicate declared path");
  }
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        await access(`${TASKS_DIR}/${file}`);
        return file;
      } catch {
        return null;
      }
    })
  );
  requireAllResults(results, files.length, "manifest files", {
    expected: files,
    read: (result) => result,
  });
}

async function runAgent(prompt, options) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = await agent(prompt, options);
    if (result != null) return result;
  }
  return null;
}

const COMMON = `
Repository: ${ROOT}. At the start of every prompt record the current git HEAD and
git status; never trust the seed HEAD or line numbers. Read AGENTS.md, README.md,
CONTRIBUTING.md, _docs/ARCHITECTURE.md, _docs/CMS_SPEC.md, the relevant sections
of _docs/CMS_API.md, _docs/TESTING_STRATEGY.md, the owning domain docs, task and
changelog indexes, ${AUDIT_REPORT}, related source/tests, and the current diff.
No production code may be edited in this workflow. Do not expose secrets,
credentials, private logs, user data, or the redacted exploit payloads. Some
large TS/TSX files are misdetected by rg; use grep -an/Read when an empty result
would be suspicious.

Contract rules: canonical filename/H1/# FileName/parent/status; every technical
child has its physical execution leaf; every leaf has grounded implementation
pseudocode (helper shape, data flow, error handling, regression-test shape),
exact single-writer ownership, dependency-shaped commands, and a full Security
Contract when routes are touched. Schema changes are reject-unknown with explicit
normalizers and round-trip tests. Optional style/config stays present-only and
legacy/no-override output byte-identical. No endpoint, DB migration, dependency,
or broad feature may be invented beyond the confirmed remediation. Parent files
carry an audit-finding -> child/leaf/test matrix. Program implementation land order is
fixed by dependencies, not numeric ID:
538 -> 536 -> 541 -> 537 -> 544 -> 543 -> 540 -> 539 -> 542 -> 545. TASK-539 and
TASK-542 never run in parallel because both touch siteShell; TASK-539/TASK-540
carry explicit collision guards for open TASK-478/TASK-481. Completed TASK-495
through TASK-535 statuses are not reopened. Changelog pins are fixed, never
computed dynamically: 536=1248, 537=1249, 538=1250, 539=1251, 540=1252,
541=1253, 542=1254, 543=1255, 544=1256, 545=1257. Reserve those numbers in the
index but do not create changelog entry files until implementation closure.
`;

const workflowResult = await (async () => {
  phase("Research");
  const researchRaw = await parallel(
    PROGRAM.map(
      (task) => () =>
        runAgent(
          `Fresh-context READ-ONLY research for TASK-${task.id}. ${COMMON}\nScope seed to VERIFY: ${task.scope}\nReturn every mapped audit finding, current file:symbol/line evidence, confirmed/changed/invalid status, source ownership, test lanes, and any missing scope.`,
          { label: `research:${task.id}`, phase: "Research", schema: RESEARCH_SCHEMA }
        )
    )
  );
  const research = requireAllResults(researchRaw, PROGRAM.length, "research", {
    expected: PROGRAM.map((task) => task.id),
    read: (result) => normalizeTaskId(result.taskId),
  });

  phase("Author parents");
  const parentResults = [];
  for (let index = 0; index < PROGRAM.length; index += 1) {
    const task = PROGRAM[index];
    const result = await runAgent(
      `Fresh-context parent AUTHOR for TASK-${task.id}. ${COMMON}\nScope: ${task.scope}\nResearch evidence: ${JSON.stringify(research[index])}\nWrite ONLY ${TASKS_DIR}/${task.parent} and the TASK-${task.id} rows/statistics plus changelog-${task.changelog} reservation in the two README indexes. Read both indexes fresh immediately before editing. Include every child/leaf filename exactly as declared by this workflow and a complete finding matrix.`,
      { label: `author-parent:${task.id}`, phase: "Author parents", schema: AUTHOR_SCHEMA }
    );
    requireAllResults([result], 1, `parent author ${task.id}`, {
      expected: [task.id],
      read: (entry) => normalizeTaskId(entry.taskId),
    });
    requireWrittenFiles(
      result,
      [
        `${TASKS_DIR}/${task.parent}`,
        `${TASKS_DIR}/README.md`,
        `${ROOT}/_docs/_CHANGELOG/README.md`,
      ],
      `parent author ${task.id}`
    );
    parentResults.push(result);
  }
  requireAllResults(parentResults, PROGRAM.length, "parent authors");

  phase("Author children");
  const childJobs = [];
  for (const task of PROGRAM) {
    for (const [childId, childFile, leafFiles] of task.children) {
      childJobs.push({ task, childId, childFile, leafFiles });
    }
  }
  const childResultsRaw = await parallel(
    childJobs.map(
      (job) => () =>
        runAgent(
          `Fresh-context child/leaf AUTHOR for TASK-${job.task.id}. ${COMMON}\nScope: ${job.task.scope}\nRead the authored parent ${job.task.parent}. Write ONLY ${TASKS_DIR}/${job.childFile} and these declared leaves: ${job.leafFiles.map((file) => `${TASKS_DIR}/${file}`).join(", ")}. The child must delegate each concrete single-writer seam to exactly one physical leaf; every leaf must be implementation-ready and list exact commands. Return taskId=\"TASK-${job.childId}\". Do not edit either README, any other task, source, tests, or changelog file.`,
          { label: `author:${job.childId}`, phase: "Author children", schema: AUTHOR_SCHEMA }
        )
    )
  );
  requireAllResults(childResultsRaw, childJobs.length, "child authors", {
    expected: childJobs.map((job) => job.childId),
    read: (result) => normalizeTaskId(result.taskId),
  });
  for (let index = 0; index < childJobs.length; index += 1) {
    const job = childJobs[index];
    requireWrittenFiles(
      childResultsRaw[index],
      [`${TASKS_DIR}/${job.childFile}`, ...job.leafFiles.map((file) => `${TASKS_DIR}/${file}`)],
      `child author ${job.childId}`
    );
  }

  const FILES = [];
  for (const task of PROGRAM) {
    FILES.push(task.parent);
    for (const [, childFile, leafFiles] of task.children) {
      FILES.push(childFile, ...leafFiles);
    }
  }
  await requireManifestFiles(FILES);

  const CROSS_FIX_ALLOWED_FILES = [
    ...FILES.map((file) => `${TASKS_DIR}/${file}`),
    `${TASKS_DIR}/README.md`,
    `${ROOT}/_docs/_CHANGELOG/README.md`,
  ];

  const isFixRequired = (finding) =>
    finding.severity === "HIGH" ||
    finding.severity === "MEDIUM" ||
    finding.blocksExecution === true;

  const auditPrompt = (
    file,
    round
  ) => `Fresh-context READ-ONLY per-file drift auditor, round ${round}. ${COMMON}
Audit ${TASKS_DIR}/${file} against current source/tests/docs and the parent/child state. Verify every anchor, scope mapping, pseudocode, writer ownership, error mapping, route Security Contract, test lane/commands, smoke visible assertions, status/filename/parent, and fixed changelog pin. Return LOW too; mark blocksExecution=true when a LOW makes the contract ambiguous or non-executable. Do not edit.`;

  const reconcilePrompt = (
    round
  ) => `Fresh-context READ-ONLY cross-program RECONCILE, round ${round}. ${COMMON}
Read every TASK-536..545 file. Check ONLY cross-file contradictions: single-writer ownership; identical shared type/enum/error/clamp/CSS-selector/helper names; per-device representation; test filenames; parent/child/file IDs; fixed land order and collision guards; pinned changelogs 1248..1257; board statistics/rows. Return one structured result with file="PROGRAM". Do not perform per-file grounding and do not edit.`;

  const rounds = [];
  let cleanAfterMinimum = false;
  for (let round = 1; round <= 7; round += 1) {
    phase(`Round ${round}`);
    const resultRaw = await parallel([
      ...FILES.map(
        (file) => () =>
          runAgent(auditPrompt(file, round), {
            label: `audit:${file.replace(/\.md$/, "").slice(-24)}`,
            phase: `Round ${round}`,
            schema: AUDIT_SCHEMA,
          })
      ),
      () =>
        runAgent(reconcilePrompt(round), {
          label: "audit:reconcile",
          phase: `Round ${round}`,
          schema: AUDIT_SCHEMA,
        }),
    ]);
    const results = requireAllResults(resultRaw, FILES.length + 1, `round ${round}`, {
      expected: [...FILES, "PROGRAM"],
      read: (result) => result.file,
    });
    const fileAudits = results.slice(0, FILES.length);
    const reconcileAudit = results[FILES.length];
    const fileFixes = [];
    for (let index = 0; index < FILES.length; index += 1) {
      const findings = fileAudits[index].findings.filter(isFixRequired);
      if (findings.length > 0) fileFixes.push({ file: FILES[index], findings });
    }
    const crossFindings = reconcileAudit.findings.filter(isFixRequired);
    const blockingCount =
      fileFixes.reduce((sum, entry) => sum + entry.findings.length, 0) + crossFindings.length;
    rounds.push({ round, expected: FILES.length + 1, returned: results.length, blockingCount });
    log(`round ${round}: ${results.length}/${FILES.length + 1} results; ${blockingCount} fixes`);

    if (fileFixes.length > 0) {
      const fixerResults = [];
      for (const entry of fileFixes) {
        const label = `round ${round} file fixer ${entry.file}`;
        const target = `${TASKS_DIR}/${entry.file}`;
        const beforeFileFixer = await snapshotWorktree();
        const fixer = await runAgent(
          `Per-file contract FIXER, round ${round}. ${COMMON}\nEdit ONLY ${target}. Verify each finding against current source, then fix every real item. Findings: ${JSON.stringify(entry.findings)}`,
          { label: `fix:${entry.file.slice(-24)}`, phase: `Round ${round}`, schema: FIX_SCHEMA }
        );
        const complete = requireAllResults([fixer], 1, label);
        await requireFixerBatchDiff(beforeFileFixer, complete, [target], label, [target]);
        fixerResults.push(fixer);
      }
      requireAllResults(fixerResults, fileFixes.length, `round ${round} file fixers`);
    }
    if (crossFindings.length > 0) {
      const beforeCrossFixer = await snapshotWorktree();
      const crossFix = await runAgent(
        `Cross-file contract FIXER, round ${round}. ${COMMON}\nEdit only TASK-536..545 contract files and their two indexes. Owning definition wins; align consumers without changing scope. Findings: ${JSON.stringify(crossFindings)}`,
        { label: "fix:cross", phase: `Round ${round}`, schema: FIX_SCHEMA }
      );
      const crossFixResults = requireAllResults([crossFix], 1, `round ${round} cross fixer`);
      await requireFixerBatchDiff(
        beforeCrossFixer,
        crossFixResults,
        CROSS_FIX_ALLOWED_FILES,
        `round ${round} cross fixer`
      );
    }

    if (round >= 5 && blockingCount === 0) {
      cleanAfterMinimum = true;
      break;
    }
  }

  phase("Final reconcile");
  let finalResult = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const finalRaw = await runAgent(
      `FINAL fresh-context READ-ONLY whole-program reconcile, attempt ${attempt}. ${COMMON}\nRead all TASK-536..545 files plus both indexes and current git diff/status. Confirm zero HIGH/MEDIUM and zero execution-blocking LOW across scope coverage, grounded anchors, writer seams, shared names/shapes, Security Contracts, validation commands, five-round evidence, land order, collision guards, task graph, and changelog reservations. Return file="PROGRAM-FINAL". Do not edit.`,
      { label: `final-reconcile:${attempt}`, phase: "Final reconcile", schema: AUDIT_SCHEMA }
    );
    requireAllResults([finalRaw], 1, `final reconcile ${attempt}`, {
      expected: ["PROGRAM-FINAL"],
      read: (result) => result.file,
    });
    finalResult = finalRaw;
    const finalBlocking = finalResult.findings.filter(isFixRequired);
    if (finalBlocking.length === 0) break;
    if (attempt === 3) break;
    const beforeFinalFixer = await snapshotWorktree();
    const finalFix = await runAgent(
      `FINAL cross-file contract FIXER, attempt ${attempt}. ${COMMON}\nEdit only TASK-536..545 files and their two indexes. Fix these verified residuals, then leave the next attempt read-only: ${JSON.stringify(finalBlocking)}`,
      { label: `final-fix:${attempt}`, phase: "Final reconcile", schema: FIX_SCHEMA }
    );
    const finalFixResults = requireAllResults([finalFix], 1, `final fixer ${attempt}`);
    await requireFixerBatchDiff(
      beforeFinalFixer,
      finalFixResults,
      CROSS_FIX_ALLOWED_FILES,
      `final fixer ${attempt}`
    );
  }

  const finalBlocking = finalResult ? finalResult.findings.filter(isFixRequired) : [];
  const minimumRoundsComplete =
    rounds.length >= 5 && rounds.every((round) => round.returned === round.expected);
  const finalReconcileClean = finalResult !== null && finalBlocking.length === 0;
  return {
    program: "TASK-536..545",
    pass: minimumRoundsComplete && finalReconcileClean,
    filesExpected: FILES.length,
    researchResults: research.length,
    parentAuthors: parentResults.length,
    childAuthors: childJobs.length,
    rounds,
    cleanAfterMinimum,
    finalReconcileClean,
    finalBlocking,
  };
})();

export default workflowResult;
