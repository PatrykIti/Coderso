type ScanMode = "advisory" | "strict";

type ScanDefinition = {
  id: string;
  title: string;
  command: string[];
};

type ScanResult = {
  id: string;
  title: string;
  command: string[];
  exitCode: number;
  durationMs: number;
  executionError?: string;
};

const SOURCE_SKIP_DIRS = ["_docs", "node_modules", "dist", "build", ".next"];
const TRIVY_FS_SKIP_DIRS = [...SOURCE_SKIP_DIRS, ".git"];

const toSkipDirArgs = (dirs: string[]) => dirs.flatMap((dir) => ["--skip-dirs", dir]);

const parseArgs = (argv: string[]) => {
  let mode: ScanMode = "advisory";
  let imageRef: string | null = process.env.SECURITY_SCAN_IMAGE ?? null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--strict") {
      mode = "strict";
      continue;
    }

    if (arg === "--image") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("missing_image_ref");
      }
      imageRef = next;
      index += 1;
      continue;
    }

    throw new Error(`unknown_arg:${arg}`);
  }

  return { mode, imageRef };
};

const createScans = (mode: ScanMode, imageRef: string | null): ScanDefinition[] => {
  const strict = mode === "strict";
  const trivyExitCode = strict ? "1" : "2";
  const gitleaksExitCode = strict ? "1" : "2";

  const scans: ScanDefinition[] = [
    {
      id: "semgrep-sast",
      title: "Semgrep SAST rules",
      command: [
        "semgrep",
        ...(strict ? ["--error"] : []),
        // Give heavy taint/dataflow rules enough budget to FULLY scan large files
        // (core/services/assistant/actionExecutorService.ts) — the default
        // 5s/rule timeout silently SKIPPED rules on them (coverage gap).
        // --timeout-threshold 0 = never abandon a file after N timed-out rules.
        "--timeout",
        "120",
        "--timeout-threshold",
        "0",
        "--config",
        ".semgrep.yml",
        "--config",
        "p/owasp-top-ten",
        "--config",
        "p/security-audit",
        "--config",
        "p/nodejs",
        "--config",
        "p/typescript",
      ],
    },
    {
      id: "bun-audit",
      title: "Bun dependency advisory audit",
      command: ["bun", "audit", "--audit-level", "high"],
    },
    {
      id: "trivy-vuln",
      title: "Trivy lockfile CVE scan",
      command: [
        "trivy",
        "fs",
        "--scanners",
        "vuln",
        "--exit-code",
        trivyExitCode,
        "--severity",
        "HIGH,CRITICAL",
        "--ignore-unfixed",
        "--include-dev-deps",
        ...toSkipDirArgs(TRIVY_FS_SKIP_DIRS),
        ".",
      ],
    },
    {
      id: "trivy-config",
      title: "Trivy Docker and IaC misconfiguration scan",
      command: [
        "trivy",
        "config",
        "--exit-code",
        trivyExitCode,
        "--severity",
        "MEDIUM,HIGH,CRITICAL",
        ...toSkipDirArgs(SOURCE_SKIP_DIRS),
        ".",
      ],
    },
    {
      id: "trivy-secret",
      title: "Trivy filesystem secret scan",
      command: [
        "trivy",
        "fs",
        "--scanners",
        "secret",
        "--exit-code",
        trivyExitCode,
        ...toSkipDirArgs(TRIVY_FS_SKIP_DIRS),
        ".",
      ],
    },
    {
      id: "gitleaks-history",
      title: "Gitleaks Git history secret scan",
      command: [
        "gitleaks",
        "git",
        "--config",
        ".gitleaks.toml",
        "--exit-code",
        gitleaksExitCode,
        "--redact=100",
        ".",
      ],
    },
    {
      id: "gitleaks-worktree",
      title: "Gitleaks current worktree secret scan",
      command: [
        "gitleaks",
        "dir",
        "--config",
        ".gitleaks.toml",
        "--exit-code",
        gitleaksExitCode,
        "--redact=100",
        ".",
      ],
    },
  ];

  if (imageRef) {
    scans.push({
      id: "trivy-image",
      title: "Trivy container image CVE and secret scan",
      command: [
        "trivy",
        "image",
        "--scanners",
        "vuln,secret",
        "--exit-code",
        trivyExitCode,
        "--severity",
        "HIGH,CRITICAL",
        "--ignore-unfixed",
        imageRef,
      ],
    });
  }

  return scans;
};

const formatCommand = (command: string[]) =>
  command.map((part) => (part.includes(" ") ? `"${part}"` : part)).join(" ");

const runScan = async (scan: ScanDefinition): Promise<ScanResult> => {
  const startedAt = performance.now();

  process.stdout.write(`\n[security-scan] ${scan.title}\n`);
  process.stdout.write(`[security-scan] $ ${formatCommand(scan.command)}\n`);

  try {
    const proc = Bun.spawn({
      cmd: scan.command,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
      env: process.env,
    });
    const exitCode = await proc.exited;

    return {
      id: scan.id,
      title: scan.title,
      command: scan.command,
      exitCode,
      durationMs: performance.now() - startedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[security-scan] failed to start ${scan.id}: ${message}\n`);

    return {
      id: scan.id,
      title: scan.title,
      command: scan.command,
      exitCode: 127,
      durationMs: performance.now() - startedAt,
      executionError: message,
    };
  }
};

const main = async () => {
  const { mode, imageRef } = parseArgs(Bun.argv.slice(2));
  const scans = createScans(mode, imageRef);
  const results: ScanResult[] = [];

  process.stdout.write(`[security-scan] mode=${mode}\n`);
  if (!imageRef) {
    process.stdout.write(
      "[security-scan] container image scan skipped; set SECURITY_SCAN_IMAGE or pass --image.\n"
    );
  }

  for (const scan of scans) {
    results.push(await runScan(scan));
  }

  const failed = results.filter((result) => result.exitCode !== 0);
  const executionErrors = failed.filter((result) => result.executionError);

  process.stdout.write("\n[security-scan] summary\n");
  for (const result of results) {
    const seconds = (result.durationMs / 1000).toFixed(1);
    const status = result.exitCode === 0 ? "ok" : `non-zero:${result.exitCode}`;
    process.stdout.write(`- ${result.id}: ${status} (${seconds}s)\n`);
  }

  if (executionErrors.length > 0) {
    process.stderr.write(
      `[security-scan] ${executionErrors.length} scanner(s) could not run: ${executionErrors
        .map((result) => result.id)
        .join(", ")}\n`
    );
    return 1;
  }

  if (failed.length === 0) {
    process.stdout.write("[security-scan] all scanners completed cleanly.\n");
    return 0;
  }

  if (mode === "strict") {
    process.stderr.write(
      `[security-scan] strict mode failed because these scanners reported findings: ${failed
        .map((result) => result.id)
        .join(", ")}\n`
    );
    return 1;
  }

  process.stdout.write(
    `[security-scan] advisory mode completed with findings from: ${failed
      .map((result) => result.id)
      .join(", ")}\n`
  );
  process.stdout.write(
    "[security-scan] rerun with --strict or bun run scan:security:strict to fail on these findings.\n"
  );
  return 0;
};

process.exit(await main());

export {};
