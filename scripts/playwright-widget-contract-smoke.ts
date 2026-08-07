import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWidgetContractCliMain } from "./runtime-smoke/adapters/widget-contract/cli";

export * from "./runtime-smoke/adapters/widget-contract/contracts";
export * from "./runtime-smoke/adapters/widget-contract/fixtures";
export * from "./runtime-smoke/adapters/widget-contract/inventory";
export * from "./runtime-smoke/adapters/widget-contract/environment";
export * from "./runtime-smoke/adapters/widget-contract/report";
export {
  runWidgetContractCli,
  runWidgetContractCliMain,
} from "./runtime-smoke/adapters/widget-contract/cli";

const entry = process.argv[1];
if (typeof entry === "string" && resolve(entry) === fileURLToPath(import.meta.url)) {
  void runWidgetContractCliMain().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "widget_contract_smoke_failed"}\n`
    );
    process.exitCode = 1;
  });
}
