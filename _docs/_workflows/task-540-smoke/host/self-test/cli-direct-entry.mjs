import path from "node:path";
import { pathToFileURL } from "node:url";

import { parseCliArgs } from "../child-descriptors.mjs";
import { deepFreezeExact, exactOrderedDataObject, invariant } from "../validation.mjs";

export async function runCliDirectEntrySelfTest(configuration, support) {
  exactOrderedDataObject(
    configuration,
    ["isDirectModuleExecution", "root", "runHostCli"],
    "CLI/direct-entry self-test configuration"
  );
  const { isDirectModuleExecution, root, runHostCli } = configuration;
  const { expectAsyncFailure, expectFailure } = support;

  invariant(parseCliArgs(["--self-test"]).mode === "self-test", "self-test CLI drift");
  invariant(parseCliArgs(["--serve", root]).root === root, "serve CLI drift");
  let selfTestDispatchCalls = 0;
  let runtimeTrapCalls = 0;
  const runtimeTrap = new Proxy(Object.create(null), {
    get() {
      runtimeTrapCalls += 1;
      throw new Error("self-test touched a runtime capability");
    },
  });
  const selfTestSentinel = deepFreezeExact({ branch: "self-test" });
  const dispatchedSelfTest = await runHostCli(["--self-test"], {
    async runSelfTest() {
      selfTestDispatchCalls += 1;
      return selfTestSentinel;
    },
    createRuntimeDependencies() {
      runtimeTrapCalls += 1;
      return runtimeTrap;
    },
  });
  invariant(
    dispatchedSelfTest === selfTestSentinel &&
      selfTestDispatchCalls === 1 &&
      runtimeTrapCalls === 0,
    "self-test CLI runtime-isolation drift"
  );
  await expectAsyncFailure(
    () =>
      runHostCli(["--self-test"], {
        async runSelfTest() {},
        createRuntimeDependencies() {
          return runtimeTrap;
        },
        extra: true,
      }),
    "self-test CLI adapter unknown key"
  );
  invariant(runtimeTrapCalls === 0, "self-test CLI adapter rejection touched runtime");
  const directEntryPath = path.join(root, "task-540 smoke host.mjs");
  const directEntryUrl = pathToFileURL(directEntryPath).href;
  invariant(
    isDirectModuleExecution(directEntryUrl, directEntryPath, root) &&
      isDirectModuleExecution(directEntryUrl, path.basename(directEntryPath), root) &&
      !isDirectModuleExecution(
        directEntryUrl,
        path.join(root, "task-540-smoke-host-copy.mjs"),
        root
      ) &&
      !isDirectModuleExecution(directEntryUrl, undefined, root),
    "Node 22.14-compatible direct-entry guard drift"
  );
  let serveRuntimeFactoryCalls = 0;
  await expectAsyncFailure(
    () =>
      runHostCli(["--serve", root], {
        async runSelfTest() {
          invariant(false, "serve dispatch entered self-test branch");
        },
        createRuntimeDependencies() {
          serveRuntimeFactoryCalls += 1;
          throw new Error("serve runtime factory trap");
        },
      }),
    "serve CLI runtime factory trap"
  );
  invariant(
    serveRuntimeFactoryCalls === 1,
    "serve CLI did not invoke the injected runtime factory once"
  );
  const invalidCli = [
    [],
    ["--serve"],
    ["--self-test", root],
    ["--self-test", "--serve", root],
    ["--self-test", "--self-test"],
    ["--serve", root, "--serve", root],
    ["--serve", root, "extra"],
    ["--serve", "relative"],
    ["--serve", "/canonical/../task540-root"],
    ["--serve", root + "\0suffix"],
    ["--unknown"],
  ];
  invalidCli.forEach((args, index) =>
    expectFailure(() => parseCliArgs(args), "invalid CLI " + index)
  );

  return Object.freeze({
    cliForms: 2,
    negativeCliCases: invalidCli.length,
    runtimeTrapCalls,
    directEntryCases: 4,
    serveRuntimeFactoryCalls,
  });
}
