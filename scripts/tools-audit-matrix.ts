import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type ToolAuditControlState = "enabled" | "disabled" | "removed";
export type ToolAuditExpectedEffect =
  | "api-call"
  | "dialog"
  | "download"
  | "payload-change"
  | "progress-state"
  | "route-change"
  | "runtime-effect"
  | "static-unavailable";

export type ToolAuditControl = {
  name: string;
  state: ToolAuditControlState;
  expectedEffect: ToolAuditExpectedEffect;
  evidence: string;
  disabledReason?: string;
};

export type ToolEmptyState = {
  cause: "filtered-out" | "no-data" | "no-match" | "not-run" | "unavailable";
  title: string;
  nextAction: string;
};

export type ToolAsyncState = {
  kind: "not-run" | "queued" | "running" | "completed" | "failed" | "internal-worker" | "no-data";
  evidence: string;
};

export type ToolRuntimeEffect = {
  kind:
    | "cms-artifact"
    | "csv-download"
    | "navigation"
    | "payload-change"
    | "public-html"
    | "public-redirect"
    | "roundtrip";
  evidence: string;
};

export type ToolAuditCase = {
  id: "search" | "seo" | "analytics" | "backups" | "import-export" | "redirects";
  taskId: string;
  route: string;
  heading: string;
  reportPath: string;
  controls: ToolAuditControl[];
  emptyStates: ToolEmptyState[];
  asyncStates: ToolAsyncState[];
  runtimeEffects: ToolRuntimeEffect[];
  fixture: string;
  cleanup: string;
};

export type MatrixValidationIssue = {
  path: string;
  message: string;
};

export const toolsAuditMatrix: ToolAuditCase[] = [
  {
    id: "search",
    taskId: "TASK-348",
    route: "/admin/search",
    heading: "Search",
    reportPath: "_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_SEARCH.md",
    controls: [
      {
        name: "Search query input",
        state: "enabled",
        expectedEffect: "api-call",
        evidence: "Query changes call the Search API and update result metadata.",
      },
      {
        name: "Date Range",
        state: "enabled",
        expectedEffect: "payload-change",
        evidence: "Selected date range is serialized to the API/service filter.",
      },
      {
        name: "Try suggestion chips",
        state: "enabled",
        expectedEffect: "api-call",
        evidence: "Suggestion chips populate the query and rerun search.",
      },
    ],
    emptyStates: [
      {
        cause: "no-match",
        title: "No results",
        nextAction: "Use suggestion chips or widen Date Range.",
      },
      {
        cause: "filtered-out",
        title: "No results in this range",
        nextAction: "Widen Date Range.",
      },
    ],
    asyncStates: [],
    runtimeEffects: [
      {
        kind: "navigation",
        evidence: "Search result selection routes to the page/content destination.",
      },
    ],
    fixture: "Temporary published page or existing indexed content.",
    cleanup: "Delete only the scoped page/content fixture created by the pass.",
  },
  {
    id: "seo",
    taskId: "TASK-349",
    route: "/admin/seo",
    heading: "SEO Manager",
    reportPath: "_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_SEO_MANAGER.md",
    controls: [
      {
        name: "Run Full Audit",
        state: "enabled",
        expectedEffect: "api-call",
        evidence: "Audit request sends selected checks and updates score state.",
      },
      {
        name: "Audit checkboxes",
        state: "enabled",
        expectedEffect: "payload-change",
        evidence: "Selected checks alter the audit payload.",
      },
      {
        name: "Filter button",
        state: "removed",
        expectedEffect: "static-unavailable",
        evidence: "Unimplemented keyword filter control is not exposed as clickable UI.",
      },
    ],
    emptyStates: [
      {
        cause: "not-run",
        title: "No audit run yet",
        nextAction: "Run Full Audit.",
      },
      {
        cause: "no-data",
        title: "No SEO documents",
        nextAction: "Create or publish content before auditing.",
      },
    ],
    asyncStates: [
      { kind: "not-run", evidence: "Pre-scan state does not display false 0% progress." },
      { kind: "running", evidence: "Audit action uses an in-flight saving state." },
      { kind: "completed", evidence: "Saved/audited rows expose recalculated scores." },
    ],
    runtimeEffects: [
      {
        kind: "public-html",
        evidence: "Saved SEO title/description render in public page HTML.",
      },
    ],
    fixture: "Temporary published page with SEO document.",
    cleanup: "Remove only the scoped page/SEO fixture.",
  },
  {
    id: "analytics",
    taskId: "TASK-350",
    route: "/admin/analytics",
    heading: "Analytics",
    reportPath: "_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_ANALYTICS.md",
    controls: [
      {
        name: "Date range",
        state: "enabled",
        expectedEffect: "api-call",
        evidence: "Range changes re-scope metric and Top Content data.",
      },
      {
        name: "Drawer Export",
        state: "enabled",
        expectedEffect: "download",
        evidence: "Export produces a CSV payload for the current Top Content range.",
      },
    ],
    emptyStates: [
      {
        cause: "no-data",
        title: "No data yet",
        nextAction: "Publish content or widen the date range.",
      },
    ],
    asyncStates: [{ kind: "no-data", evidence: "Metric cards separate no-data from 0% change." }],
    runtimeEffects: [
      { kind: "csv-download", evidence: "Top Content export downloads CSV." },
      { kind: "payload-change", evidence: "Top Content is scoped by selected range." },
    ],
    fixture: "Temporary published page with activity in range.",
    cleanup: "Delete only the scoped page/activity fixture.",
  },
  {
    id: "backups",
    taskId: "TASK-351",
    route: "/admin/backups",
    heading: "Backups",
    reportPath: "_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_BACKUPS.md",
    controls: [
      {
        name: "Create Backup Now",
        state: "enabled",
        expectedEffect: "payload-change",
        evidence: "Include options are controlled and submitted to create backup.",
      },
      {
        name: "Refresh",
        state: "enabled",
        expectedEffect: "api-call",
        evidence: "Refresh reloads current page/query from the server.",
      },
      {
        name: "Restore queued backup",
        state: "disabled",
        expectedEffect: "static-unavailable",
        disabledReason: "Backup is still being processed.",
        evidence: "Disabled restore action exposes a reason.",
      },
      {
        name: "Download queued backup",
        state: "disabled",
        expectedEffect: "static-unavailable",
        disabledReason: "Backup is still being processed.",
        evidence: "Disabled download action exposes a reason.",
      },
      {
        name: "Delete backup metadata",
        state: "enabled",
        expectedEffect: "api-call",
        evidence: "Delete removes only the selected backup metadata row.",
      },
    ],
    emptyStates: [
      {
        cause: "no-data",
        title: "No backups found",
        nextAction: "Create Backup Now.",
      },
      {
        cause: "no-match",
        title: "No backups match this search",
        nextAction: "Clear or change the search query.",
      },
    ],
    asyncStates: [
      { kind: "queued", evidence: "Queued rows explain CMS processing state." },
      { kind: "internal-worker", evidence: "CMS backup worker health message is visible." },
      { kind: "running", evidence: "Running rows keep destructive actions reason-disabled." },
      { kind: "failed", evidence: "Failed rows show bounded error text." },
      { kind: "completed", evidence: "Completed metadata is listed with artifact readiness." },
    ],
    runtimeEffects: [
      {
        kind: "cms-artifact",
        evidence: "Completed local backups download through the authenticated CMS API.",
      },
    ],
    fixture: "Manual backup request with scoped include options.",
    cleanup: "Delete only backup metadata rows created by the pass.",
  },
  {
    id: "import-export",
    taskId: "TASK-352",
    route: "/admin/tools/import-export",
    heading: "Import / Export",
    reportPath: "_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_IMPORT_EXPORT.md",
    controls: [
      {
        name: "Export target/include options",
        state: "enabled",
        expectedEffect: "payload-change",
        evidence: "Selected target/include values change exported bundle scope.",
      },
      {
        name: "Activity Log",
        state: "disabled",
        expectedEffect: "static-unavailable",
        disabledReason: "Activity Log is unavailable until a dedicated route exists.",
        evidence: "Unavailable action is disabled with an explanation.",
      },
      {
        name: "Upload JSON",
        state: "enabled",
        expectedEffect: "progress-state",
        evidence: "JSON upload creates progress, preview/apply, and failure rows.",
      },
      {
        name: "Upload again",
        state: "enabled",
        expectedEffect: "dialog",
        evidence: "Retry action reopens the file chooser path.",
      },
    ],
    emptyStates: [
      {
        cause: "not-run",
        title: "No recent imports",
        nextAction: "Upload a JSON bundle.",
      },
      {
        cause: "no-match",
        title: "No import rows match",
        nextAction: "Change the activity search query.",
      },
    ],
    asyncStates: [
      { kind: "running", evidence: "Import rows expose progressbar and percent complete." },
      { kind: "completed", evidence: "Completed rows show 100% progress." },
      { kind: "failed", evidence: "Failed rows show reason and Upload again." },
    ],
    runtimeEffects: [
      { kind: "roundtrip", evidence: "Valid JSON bundle can be previewed, applied, and restored." },
      { kind: "payload-change", evidence: "Target/include options alter bundle scope." },
    ],
    fixture: "Scoped configuration bundle with safe IDs and JSON payload.",
    cleanup: "Restore the original exported bundle and remove temporary files.",
  },
  {
    id: "redirects",
    taskId: "TASK-353",
    route: "/admin/redirects",
    heading: "Redirects",
    reportPath: "_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_REDIRECTS.md",
    controls: [
      {
        name: "Create redirect",
        state: "enabled",
        expectedEffect: "api-call",
        evidence: "Drawer create persists a redirect row.",
      },
      {
        name: "Pagination",
        state: "enabled",
        expectedEffect: "api-call",
        evidence: "Pagination changes local page state and is hidden when unavailable.",
      },
      {
        name: "Delete redirect",
        state: "enabled",
        expectedEffect: "api-call",
        evidence: "Delete is confirmed and removes the selected row.",
      },
    ],
    emptyStates: [
      {
        cause: "no-data",
        title: "No redirects found",
        nextAction: "Create your first redirect.",
      },
      {
        cause: "no-match",
        title: "No redirects match your search",
        nextAction: "Change the redirect search query.",
      },
    ],
    asyncStates: [],
    runtimeEffects: [
      {
        kind: "public-redirect",
        evidence: "Enabled admin redirect returns public 301/302/307/308 Location.",
      },
    ],
    fixture: "Temporary redirect source/target paths.",
    cleanup: "Delete only the scoped redirect row created by the pass.",
  },
];

const expectedIds = ["search", "seo", "analytics", "backups", "import-export", "redirects"];
const asyncRequiredIds = new Set(["seo", "backups", "import-export"]);
const runtimeRequiredKinds = new Map([
  ["seo", "public-html"],
  ["backups", "cms-artifact"],
  ["redirects", "public-redirect"],
]);

const hasAny = (content: string, needles: string[]) =>
  needles.some((needle) => content.includes(needle));

export function validateToolsAuditMatrix(
  matrix: ToolAuditCase[] = toolsAuditMatrix
): MatrixValidationIssue[] {
  const issues: MatrixValidationIssue[] = [];
  const ids = matrix.map((entry) => entry.id);

  for (const expectedId of expectedIds) {
    if (!ids.includes(expectedId as ToolAuditCase["id"])) {
      issues.push({ path: "matrix", message: `Missing Tools route: ${expectedId}` });
    }
  }

  for (const entry of matrix) {
    const pathPrefix = `matrix.${entry.id}`;
    if (!entry.route.startsWith("/admin/")) {
      issues.push({ path: pathPrefix, message: "Route must be an admin route." });
    }
    if (!entry.reportPath.endsWith(".md")) {
      issues.push({ path: pathPrefix, message: "Report path must point to markdown." });
    }
    if (entry.controls.length === 0) {
      issues.push({ path: pathPrefix, message: "Each tool must define controls." });
    }
    if (entry.emptyStates.length === 0) {
      issues.push({ path: pathPrefix, message: "Each tool must define empty-state coverage." });
    }
    if (!entry.fixture || !entry.cleanup) {
      issues.push({ path: pathPrefix, message: "Fixture and cleanup plans are required." });
    }

    for (const [index, control] of entry.controls.entries()) {
      const controlPath = `${pathPrefix}.controls.${index}`;
      if (!control.name || !control.evidence) {
        issues.push({ path: controlPath, message: "Controls need a name and evidence." });
      }
      if (control.state === "enabled" && control.expectedEffect === "static-unavailable") {
        issues.push({ path: controlPath, message: "Enabled controls need observable effects." });
      }
      if (control.state === "disabled" && !control.disabledReason) {
        issues.push({ path: controlPath, message: "Disabled controls need a reason." });
      }
      if (control.state === "removed" && control.expectedEffect !== "static-unavailable") {
        issues.push({ path: controlPath, message: "Removed controls must be static-unavailable." });
      }
    }

    for (const [index, emptyState] of entry.emptyStates.entries()) {
      if (!emptyState.title || !emptyState.nextAction) {
        issues.push({
          path: `${pathPrefix}.emptyStates.${index}`,
          message: "Empty states need cause, title, and next action.",
        });
      }
    }

    if (asyncRequiredIds.has(entry.id) && entry.asyncStates.length === 0) {
      issues.push({ path: pathPrefix, message: "Async tool is missing async-state coverage." });
    }

    const requiredRuntimeKind = runtimeRequiredKinds.get(entry.id);
    if (
      requiredRuntimeKind &&
      !entry.runtimeEffects.some((effect) => effect.kind === requiredRuntimeKind)
    ) {
      issues.push({
        path: pathPrefix,
        message: `Missing runtime-effect evidence: ${requiredRuntimeKind}`,
      });
    }
  }

  return issues;
}

export function validateToolsReportDocs(cwd = process.cwd()): MatrixValidationIssue[] {
  const issues: MatrixValidationIssue[] = [];

  for (const entry of toolsAuditMatrix) {
    const reportFile = path.resolve(cwd, entry.reportPath);
    if (!existsSync(reportFile)) {
      issues.push({ path: entry.reportPath, message: "Report file is missing." });
      continue;
    }

    const content = readFileSync(reportFile, "utf8");
    if (!content.includes("## What Worked")) {
      issues.push({ path: entry.reportPath, message: "Report is missing What Worked." });
    }
    if (
      !hasAny(content, [
        "## What Did Not Work",
        "## Resolved Findings",
        "## Original Findings Closed",
        "## Final Resolution",
        "## TASK-353 Resolution",
      ])
    ) {
      issues.push({
        path: entry.reportPath,
        message: "Report is missing findings/resolution section.",
      });
    }
    if (!hasAny(content, ["Why:", "Resolution:", "Resolved by", "Status: resolved"])) {
      issues.push({
        path: entry.reportPath,
        message: "Report is missing why/resolution evidence.",
      });
    }
    if (!hasAny(content, ["How to fix:", "Resolution:", "Resolved by", "Status: resolved"])) {
      issues.push({ path: entry.reportPath, message: "Report is missing fix/resolution path." });
    }
    if (!content.includes("## Source References")) {
      issues.push({ path: entry.reportPath, message: "Report is missing Source References." });
    }
    if (!content.includes(entry.taskId)) {
      issues.push({ path: entry.reportPath, message: `Report is missing ${entry.taskId}.` });
    }
  }

  const overviewPath = "_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md";
  const overviewFile = path.resolve(cwd, overviewPath);
  const overview = existsSync(overviewFile) ? readFileSync(overviewFile, "utf8") : "";
  if (!overview.includes("Partially works: none")) {
    issues.push({ path: overviewPath, message: "Overview must state no partial tools remain." });
  }
  if (!overview.includes("TASK-354")) {
    issues.push({ path: overviewPath, message: "Overview is missing TASK-354 guard notes." });
  }
  if (overview.includes("Partially works: Redirects")) {
    issues.push({
      path: overviewPath,
      message: "Overview still has stale Redirects partial status.",
    });
  }

  const readmePath = "_docs/PLAYWRIGHT/31-05-2026-tools/README.md";
  const readmeFile = path.resolve(cwd, readmePath);
  const readme = existsSync(readmeFile) ? readFileSync(readmeFile, "utf8") : "";
  if (!readme.includes("bun scripts/tools-audit-matrix.ts --validate")) {
    issues.push({ path: readmePath, message: "README is missing the matrix runbook command." });
  }

  const claudePath = "_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_CLAUDE_UX_REVIEW.md";
  const claudeFile = path.resolve(cwd, claudePath);
  const claude = existsSync(claudeFile) ? readFileSync(claudeFile, "utf8") : "";
  if (!claude.includes("TASK-354 Resolution")) {
    issues.push({ path: claudePath, message: "Claude UX report is missing TASK-354 resolution." });
  }

  return issues;
}

export function validateToolsAudit(cwd = process.cwd()): MatrixValidationIssue[] {
  return [...validateToolsAuditMatrix(), ...validateToolsReportDocs(cwd)];
}

if (import.meta.main) {
  const issues = validateToolsAudit();
  if (process.argv.includes("--json")) {
    console.log(
      JSON.stringify({ ok: issues.length === 0, issues, matrix: toolsAuditMatrix }, null, 2)
    );
  } else if (issues.length === 0) {
    console.log(`Tools audit matrix valid for ${toolsAuditMatrix.length} routes.`);
  } else {
    console.error("Tools audit matrix validation failed:");
    for (const issue of issues) {
      console.error(`- ${issue.path}: ${issue.message}`);
    }
  }

  process.exit(issues.length === 0 ? 0 : 1);
}
