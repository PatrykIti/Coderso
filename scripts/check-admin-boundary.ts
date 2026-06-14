import { analyzeAdminBoundary, formatAdminBoundaryViolation } from "./adminBoundaryReport";

const report = analyzeAdminBoundary();

if (report.violations.length > 0) {
  process.stderr.write("Admin boundary check failed.\n");
  process.stderr.write(report.violations.map(formatAdminBoundaryViolation).join("\n\n"));
  process.stderr.write("\n");
  process.exit(1);
}

process.stdout.write(
  `Admin boundary check passed: ${report.visitedFiles.length} browser-reachable files scanned.\n`
);
