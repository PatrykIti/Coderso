import { mkdir } from "node:fs/promises";
import path from "node:path";

type GateId = "functional" | "ux" | "performance" | "security" | "reliability";

type GateCommand = {
  title: string;
  cmd: string[];
  requiresDatabaseUrl?: boolean;
};

type GateDefinition = {
  id: GateId;
  description: string;
  commands: GateCommand[];
};

type CommandResult = {
  title: string;
  cmd: string[];
  exitCode: number;
  durationMs: number;
  skipped?: boolean;
  skipReason?: string;
};

type GateResult = {
  id: GateId;
  ok: boolean;
  durationMs: number;
  commands: CommandResult[];
};

const GATES: GateDefinition[] = [
  {
    id: "functional",
    description: "Core module flows are executable for major Coderso surfaces.",
    commands: [
      {
        title: "Core lint",
        cmd: ["bun", "--cwd", "core", "lint"],
      },
      {
        title: "Core typecheck",
        cmd: ["bun", "--cwd", "core", "lint:types"],
      },
      {
        title: "Functional UI smoke",
        cmd: [
          "bun",
          "run",
          "test:vitest",
          "--",
          "tests/vitest/ui/solution-kits-page.test.tsx",
          "tests/vitest/ui/listings-page.test.tsx",
          "tests/vitest/ui/booking-page.test.tsx",
          "tests/vitest/ui/commerce-page.test.tsx",
          "tests/vitest/ui/form-builder.test.tsx",
        ],
      },
    ],
  },
  {
    id: "ux",
    description: "Beginner-friendly guided/composite UX paths remain stable.",
    commands: [
      {
        title: "UX path coverage",
        cmd: [
          "bun",
          "run",
          "test:vitest",
          "--",
          "tests/vitest/ui/solution-kits-page.test.tsx",
          "tests/vitest/ui/assistant-panel-interaction.test.tsx",
          "tests/vitest/ui/widget-library.test.tsx",
          "tests/vitest/ui/page-editor.test.tsx",
          "tests/vitest/ui/settings-shell.test.tsx",
        ],
      },
    ],
  },
  {
    id: "performance",
    description: "Synthetic p95 budgets for listing/filter and admin route transitions.",
    commands: [
      {
        title: "Performance budgets",
        cmd: ["bun", "test", "tests/perf/codersoPerformanceGate.test.ts"],
      },
    ],
  },
  {
    id: "security",
    description: "Public-write hardening, nonce/captcha contracts, and baseline limits.",
    commands: [
      {
        title: "Security gate baseline",
        cmd: ["bun", "test", "tests/security/codersoSecurityGate.test.ts"],
      },
      {
        title: "Rate-limit contracts",
        cmd: ["bun", "test", "tests/unit/security/rateLimit.test.ts"],
      },
      {
        title: "Form nonce contracts",
        cmd: ["bun", "run", "test:vitest", "--", "tests/vitest/forms/submissionNonce.test.ts"],
      },
      {
        title: "Public booking API DB security smoke",
        cmd: ["bun", "test", "tests/unit/server/publicBookingApi.test.ts"],
        requiresDatabaseUrl: true,
      },
    ],
  },
  {
    id: "reliability",
    description: "Install/upgrade/rollback paths do not crash and stay recoverable.",
    commands: [
      {
        title: "Installer catalog reliability",
        cmd: ["bun", "test", "tests/unit/kits/kitInstaller.test.ts"],
      },
      {
        title: "Solution kit install DB reliability",
        cmd: ["bun", "test", "tests/unit/kits/installService.test.ts"],
        requiresDatabaseUrl: true,
      },
      {
        title: "Store revocation DB reliability",
        cmd: ["bun", "test", "tests/integration/store/revocations.test.ts"],
        requiresDatabaseUrl: true,
      },
    ],
  },
];

const VALID_IDS = new Set<GateId>(GATES.map((gate) => gate.id));

const hasDatabaseUrl = () => (process.env.DATABASE_URL ?? "").trim().length > 0;

const parseArgs = (argv: string[]) => {
  const selected = new Set<GateId>();
  let listOnly = false;
  let reportPath: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--list") {
      listOnly = true;
      continue;
    }
    if (arg === "--gate") {
      const next = argv[index + 1];
      if (!next || !VALID_IDS.has(next as GateId)) {
        throw new Error("invalid_gate");
      }
      selected.add(next as GateId);
      index += 1;
      continue;
    }
    if (arg === "--report") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("invalid_report_path");
      }
      reportPath = next;
      index += 1;
      continue;
    }
    throw new Error(`unknown_arg:${arg}`);
  }

  return {
    selectedIds: selected.size > 0 ? [...selected] : GATES.map((gate) => gate.id),
    listOnly,
    reportPath,
  };
};

const runCommand = async (command: GateCommand): Promise<CommandResult> => {
  const startedAt = performance.now();

  if (command.requiresDatabaseUrl && !hasDatabaseUrl()) {
    process.stdout.write("Skipped: DATABASE_URL is not configured for this DB-backed check.\n");
    return {
      title: command.title,
      cmd: command.cmd,
      exitCode: 0,
      durationMs: performance.now() - startedAt,
      skipped: true,
      skipReason: "database_url_missing",
    };
  }

  const proc = Bun.spawn({
    cmd: command.cmd,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  const exitCode = await proc.exited;
  const durationMs = performance.now() - startedAt;

  if (stdout.trim().length > 0) {
    process.stdout.write(stdout.endsWith("\n") ? stdout : `${stdout}\n`);
  }
  if (stderr.trim().length > 0) {
    process.stderr.write(stderr.endsWith("\n") ? stderr : `${stderr}\n`);
  }

  return {
    title: command.title,
    cmd: command.cmd,
    exitCode,
    durationMs,
  };
};

const runGate = async (gate: GateDefinition): Promise<GateResult> => {
  const startedAt = performance.now();
  const commandResults: CommandResult[] = [];

  for (const command of gate.commands) {
    process.stdout.write(`\n[gate:${gate.id}] ${command.title}\n`);
    const result = await runCommand(command);
    commandResults.push(result);

    if (result.exitCode !== 0) {
      return {
        id: gate.id,
        ok: false,
        durationMs: performance.now() - startedAt,
        commands: commandResults,
      };
    }
  }

  return {
    id: gate.id,
    ok: true,
    durationMs: performance.now() - startedAt,
    commands: commandResults,
  };
};

const writeReport = async (reportPath: string, payload: unknown) => {
  const absolute = path.resolve(reportPath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await Bun.write(absolute, `${JSON.stringify(payload, null, 2)}\n`);
  process.stdout.write(`\nReport written to ${absolute}\n`);
};

async function main() {
  let args: ReturnType<typeof parseArgs>;
  try {
    args = parseArgs(Bun.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_args";
    process.stderr.write(`Invalid arguments: ${message}\n`);
    process.stderr.write(
      "Usage: bun scripts/coderso-release-gates.ts [--list] [--gate <id>] [--report <path>]\n"
    );
    process.stderr.write("Gate IDs: functional, ux, performance, security, reliability\n");
    process.exit(1);
    return;
  }

  if (args.listOnly) {
    for (const gate of GATES) {
      process.stdout.write(`${gate.id}: ${gate.description}\n`);
    }
    return;
  }

  const selected = GATES.filter((gate) => args.selectedIds.includes(gate.id));
  const runStartedAt = performance.now();
  const gateResults: GateResult[] = [];

  for (const gate of selected) {
    process.stdout.write(`\n=== Running gate: ${gate.id} ===\n`);
    const result = await runGate(gate);
    gateResults.push(result);
    if (!result.ok) {
      process.stderr.write(`\nGate failed: ${gate.id}\n`);
      break;
    }
  }

  const summary = {
    ok: gateResults.length === selected.length && gateResults.every((gate) => gate.ok),
    durationMs: performance.now() - runStartedAt,
    gates: gateResults,
  };

  process.stdout.write("\n=== Gate Summary ===\n");
  for (const gate of gateResults) {
    process.stdout.write(
      `${gate.id}: ${gate.ok ? "PASS" : "FAIL"} (${Math.round(gate.durationMs)}ms)\n`
    );
  }

  if (args.reportPath) {
    await writeReport(args.reportPath, summary);
  }

  if (!summary.ok) {
    process.exit(1);
  }
}

await main();
