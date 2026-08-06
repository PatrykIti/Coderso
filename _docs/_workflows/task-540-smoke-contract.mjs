import { buildTask540SmokePlan } from "./task-540-smoke/contract/plan.mjs";
import {
  runTask540SmokeContractSelfTest,
} from "./task-540-smoke/contract/self-test/index.mjs";

export { buildTask540SmokePlan, runTask540SmokeContractSelfTest };

if (
  process.argv[1]?.endsWith("/task-540-smoke-contract.mjs") &&
  process.argv.includes("--self-test")
) {
  process.stdout.write(JSON.stringify(runTask540SmokeContractSelfTest()));
}
