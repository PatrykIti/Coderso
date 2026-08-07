import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveInsideRoot, SmokeError } from "../../contracts";
import { installLifecycleSignals, RuntimeLifecycle } from "../../lifecycle";
import { ProcessSupervisor } from "../../process-supervisor";
import { RepositoryGuard, resolveCanonicalRepositoryRoot } from "../../repository-guard";
import { TimingRecorder } from "../../timing";
import type { RuntimeSmokeContext } from "../../lifecycle";
import { parseArgs, readInventory } from "./inventory";
import { hasStrictFailure, renderMarkdown } from "./report";
import { runWidgetContractSuite, type WidgetContractSuiteDependencies } from "./suite";

export interface WidgetContractCliDependencies {
  readonly root?: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly suite?: WidgetContractSuiteDependencies;
  readonly writeSummary?: (value: string) => void;
}

async function writeOwnedFile(root: string, path: string, value: string): Promise<void> {
  const target = resolveInsideRoot(root, path, "widget report path");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, value, { encoding: "utf8" });
}

export async function runWidgetContractCli(
  argv: readonly string[],
  dependencies: WidgetContractCliDependencies = {}
): Promise<number> {
  const args = parseArgs([...argv]);
  const root = await resolveCanonicalRepositoryRoot(dependencies.root ?? process.cwd());
  const lifecycle = new RuntimeLifecycle();
  const timing = new TimingRecorder();
  const processes = new ProcessSupervisor(root);
  lifecycle.register(processes);
  const repository = await RepositoryGuard.create(root, processes);
  const context: RuntimeSmokeContext = {
    input: {
      command: "run",
      suite: "widget-contract",
      profile: "fast",
      session: args.session,
    },
    root,
    lifecycle,
    timing,
    processes,
    repository,
  };
  const disposeSignals = installLifecycleSignals(lifecycle);
  let primary: unknown;
  let exitCode = 0;
  try {
    const inventory = await readInventory(
      resolveInsideRoot(root, args.inventoryPath, "widget inventory path")
    );
    const suite = await runWidgetContractSuite({
      context,
      args,
      inventory,
      command: `bun scripts/playwright-widget-contract-smoke.ts ${argv.join(" ")}`,
      dependencies: {
        ...dependencies.suite,
        environment: dependencies.environment ?? process.env,
      },
    });
    await writeOwnedFile(root, args.outputJsonPath, `${JSON.stringify(suite.report, null, 2)}\n`);
    await writeOwnedFile(root, args.outputMarkdownPath, renderMarkdown(suite.report));
    for (const screenshot of suite.screenshots) {
      const target = resolveInsideRoot(root, screenshot.reportPath, "widget screenshot path");
      await mkdir(dirname(target), { recursive: true });
      await copyFile(screenshot.sourcePath, target);
    }
    (dependencies.writeSummary ?? ((value) => process.stdout.write(value)))(
      `${JSON.stringify(
        {
          dryRun: suite.report.dryRun,
          selected: suite.report.inventory.selectedWidgetTypes.length,
          summary: suite.report.summary,
          outputJson: args.outputJsonPath,
          outputMarkdown: args.outputMarkdownPath,
        },
        null,
        2
      )}\n`
    );
    if (args.strict && hasStrictFailure(suite.report)) exitCode = 1;
  } catch (error) {
    primary = error;
    exitCode = 1;
  } finally {
    disposeSignals();
  }
  const cleanup = await lifecycle.closeAllNeverThrow();
  if (!cleanup.pass) exitCode = 1;
  if (primary !== undefined) throw primary;
  return exitCode;
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return typeof entry === "string" && resolve(entry) === fileURLToPath(import.meta.url);
}

export async function runWidgetContractCliMain(argv = process.argv.slice(2)): Promise<void> {
  process.exitCode = await runWidgetContractCli(argv);
}

if (isDirectExecution()) {
  void runWidgetContractCliMain().catch((error: unknown) => {
    const failure = error instanceof SmokeError ? error.message : "widget_contract_smoke_failed";
    process.stderr.write(`${failure}\n`);
    process.exitCode = 1;
  });
}
