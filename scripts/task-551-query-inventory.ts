/**
 * TASK-551-01-L01 query-inventory CLI facade.
 *
 * All scanner, contract, digest, and lane logic lives in the private cohesive
 * subtree. This file only re-exports the public tooling surface and owns argv
 * and console handling for the executable form.
 */
export * from "./task551QueryInventory/contracts";
export * from "./task551QueryInventory/canonical";
export * from "./task551QueryInventory/scan";
export * from "./task551QueryInventory/bunLane";
export { parseExactInventoryCliArgs, runInventoryCheck } from "./task551QueryInventory/check";

import { InventoryError } from "./task551QueryInventory/contracts";
import { runInventoryCheck } from "./task551QueryInventory/check";

async function main(): Promise<void> {
  try {
    await runInventoryCheck(process.argv.slice(2));
    console.log("task551-query-inventory: PASS");
  } catch (error) {
    if (error instanceof InventoryError)
      console.error(`task551-query-inventory: FAIL ${error.message}`);
    else console.error("task551-query-inventory: FAIL query_inventory_invalid:unexpected");
    process.exitCode = 1;
  }
}

if (import.meta.main) void main();
