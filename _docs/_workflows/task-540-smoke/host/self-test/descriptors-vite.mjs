import {
  requireExactViteOptionsClone,
  settleViteReadiness,
  startViteWithWarmRestart,
  VITE_OPTIONS_CLONE_VALIDATOR_SOURCE,
  VITE_READINESS_SOURCE,
  VITE_WARM_RESTART_SOURCE,
} from "../vite-source-runtime.mjs";
import { exactOrderedDataObject, invariant } from "../validation.mjs";

export async function runDescriptorsViteSelfTest(configuration, support) {
  exactOrderedDataObject(
    configuration,
    [
      "ADMIN_VITE_SOURCE",
      "BACKEND_SOURCE",
      "CHILD_READY_MARKERS",
      "READY_TIMEOUT_MS",
      "SITE_VITE_SOURCE",
      "childDescriptors",
      "createBoundedDrain",
      "root",
      "validateChildDescriptors",
    ],
    "descriptors/Vite self-test configuration"
  );
  const {
    ADMIN_VITE_SOURCE,
    BACKEND_SOURCE,
    CHILD_READY_MARKERS,
    READY_TIMEOUT_MS,
    SITE_VITE_SOURCE,
    childDescriptors,
    createBoundedDrain,
    root,
    validateChildDescriptors,
  } = configuration;
  const { clonePlain, expectAsyncFailure, expectFailure } = support;

  const descriptors = childDescriptors(root);
  validateChildDescriptors(descriptors, root);
  for (const descriptor of descriptors) {
    invariant(
      !descriptor.args[4].includes("bunx") &&
        !descriptor.args[4].includes("coderso-dev-core-host") &&
        !descriptor.args[4].includes("dotenv") &&
        !descriptor.args[4].includes("fetch(") &&
        !descriptor.args[4].includes("http://") &&
        !descriptor.args[4].includes("https://") &&
        Object.isFrozen(descriptor) &&
        Object.isFrozen(descriptor.args),
      descriptor.kind + " child descriptor drift"
    );
  }
  const descriptorNegatives = [
    (value) => {
      value.extra = true;
    },
    (value) => {
      value[0].args[4] += " ";
    },
    (value) => {
      value[1].args[4] = value[1].args[4].replace("port: 5173", "port: 5172");
    },
    (value) => {
      value[2].args[4] = value[2].args[4].replace("envDir: false", "envDir: true");
    },
    (value) => {
      value[1].args[4] = value[1].args[4].replaceAll("wf540-admin", "wf540-site");
    },
    (value) => {
      value[1].args[4] = value[1].args[4].replace('  "/ui/dashboard/DashboardPage.tsx",\n', "");
    },
    (value) => {
      value[1].args[4] = value[1].args[4].replace('  "/ui/dashboard/DashboardBuilder.tsx",\n', "");
    },
    (value) => {
      value[2].args[4] = value[2].args[4].replaceAll("wf540-site", "wf540-admin");
    },
    (value) => {
      value[0].args.push("extra");
    },
    (value) => {
      value[1].args[1] = "--eval";
    },
    (value) => {
      value[2].extra = true;
    },
    (value) => {
      [value[0], value[1]] = [value[1], value[0]];
    },
  ];
  for (const [index, mutation] of descriptorNegatives.entries()) {
    const candidate = clonePlain(descriptors);
    mutation(candidate);
    expectFailure(
      () => validateChildDescriptors(candidate, root),
      "descriptor byte negative " + index
    );
  }
  invariant(
    BACKEND_SOURCE.includes("server.stop();") && !BACKEND_SOURCE.includes("server.stop(true)"),
    "backend graceful-stop source drift"
  );
  invariant(READY_TIMEOUT_MS === 360_000, "host warm-restart timeout drift");
  invariant(
    VITE_WARM_RESTART_SOURCE.includes("for (let start = 0; start < 2; start += 1)") &&
      (VITE_WARM_RESTART_SOURCE.match(/await createServer\(inlineConfig\)/gu) ?? []).length === 1 &&
      VITE_WARM_RESTART_SOURCE.indexOf(
        "requireExactViteOptionsClone(options, inlineConfig, failureCode);"
      ) < VITE_WARM_RESTART_SOURCE.indexOf("await createServer(inlineConfig)") &&
      VITE_WARM_RESTART_SOURCE.includes("createdServer === previousServer") &&
      !VITE_WARM_RESTART_SOURCE.includes("start < 3"),
    "Vite warm-restart start cardinality drift"
  );
  invariant(
    ADMIN_VITE_SOURCE.includes('configFile: "./vite.config.ts"') &&
      ADMIN_VITE_SOURCE.includes('configLoader: "native"') &&
      ADMIN_VITE_SOURCE.includes('cacheDir: "../node_modules/.vite/wf540-admin"') &&
      ADMIN_VITE_SOURCE.includes("envDir: false") &&
      ADMIN_VITE_SOURCE.includes('host: "127.0.0.1"') &&
      !ADMIN_VITE_SOURCE.includes('host: "localhost"') &&
      ADMIN_VITE_SOURCE.includes("port: 5173") &&
      ADMIN_VITE_SOURCE.includes(VITE_READINESS_SOURCE) &&
      ADMIN_VITE_SOURCE.includes(VITE_OPTIONS_CLONE_VALIDATOR_SOURCE) &&
      ADMIN_VITE_SOURCE.split(VITE_OPTIONS_CLONE_VALIDATOR_SOURCE).length === 2 &&
      ADMIN_VITE_SOURCE.includes(VITE_WARM_RESTART_SOURCE) &&
      ADMIN_VITE_SOURCE.split(VITE_WARM_RESTART_SOURCE).length === 2 &&
      ADMIN_VITE_SOURCE.includes("const options = Object.freeze({") &&
      ADMIN_VITE_SOURCE.includes("server: Object.freeze({") &&
      ADMIN_VITE_SOURCE.split('"/ui/dashboard/DashboardPage.tsx"').length === 2 &&
      ADMIN_VITE_SOURCE.split('"/ui/dashboard/DashboardBuilder.tsx"').length === 2 &&
      ADMIN_VITE_SOURCE.indexOf('"/ui/dashboard/DashboardPage.tsx"') <
        ADMIN_VITE_SOURCE.indexOf('"/ui/dashboard/DashboardBuilder.tsx"') &&
      ADMIN_VITE_SOURCE.includes(
        '], process.cwd() + "/node_modules/.vite/wf540-admin", "admin_vite_readiness_failed");'
      ) &&
      ADMIN_VITE_SOURCE.indexOf(
        "const server = await startViteWithWarmRestart(createServer, options, ["
      ) < ADMIN_VITE_SOURCE.indexOf('process.stdout.write("WF540_ADMIN_READY_V1\\n")'),
    "Admin Vite source drift"
  );
  invariant(
    SITE_VITE_SOURCE.includes('configFile: "./vite.site.config.ts"') &&
      SITE_VITE_SOURCE.includes('configLoader: "native"') &&
      SITE_VITE_SOURCE.includes('cacheDir: "../node_modules/.vite/wf540-site"') &&
      SITE_VITE_SOURCE.includes("envDir: false") &&
      SITE_VITE_SOURCE.includes('host: "127.0.0.1"') &&
      !SITE_VITE_SOURCE.includes('host: "localhost"') &&
      SITE_VITE_SOURCE.includes("port: 5174") &&
      SITE_VITE_SOURCE.includes(VITE_READINESS_SOURCE) &&
      SITE_VITE_SOURCE.includes(VITE_OPTIONS_CLONE_VALIDATOR_SOURCE) &&
      SITE_VITE_SOURCE.split(VITE_OPTIONS_CLONE_VALIDATOR_SOURCE).length === 2 &&
      SITE_VITE_SOURCE.includes(VITE_WARM_RESTART_SOURCE) &&
      SITE_VITE_SOURCE.split(VITE_WARM_RESTART_SOURCE).length === 2 &&
      SITE_VITE_SOURCE.includes("const options = Object.freeze({") &&
      SITE_VITE_SOURCE.includes("server: Object.freeze({") &&
      SITE_VITE_SOURCE.includes(
        '["/main.ts"], process.cwd() + "/node_modules/.vite/wf540-site", "site_vite_readiness_failed");'
      ) &&
      SITE_VITE_SOURCE.indexOf(
        'const server = await startViteWithWarmRestart(createServer, options, ["/main.ts"]'
      ) < SITE_VITE_SOURCE.indexOf('process.stdout.write("WF540_SITE_READY_V1\\n")'),
    "site Vite source drift"
  );

  const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    return { promise, resolve, reject };
  };
  const readinessMetadata = (suffix, processing) => ({
    browserHash: "browser-" + suffix,
    depInfoList: [
      {
        id: "react",
        file: "/deps/react-" + suffix + ".js",
        browserHash: "dep-browser-" + suffix,
        fileHash: "file-" + suffix,
        ...(processing === undefined ? {} : { processing }),
      },
    ],
  });
  const stableReadinessServer = (calls, optimizer) => ({
    environments: { client: { depsOptimizer: optimizer } },
    async transformRequest(url) {
      calls.push("transform:" + url);
      return { code: "export {};" };
    },
    async waitForRequestsIdle() {
      calls.push("idle");
    },
  });
  const rejectedReadinessPromise = (message) => {
    const promise = Promise.reject(new Error(message));
    void promise.catch(() => {});
    return promise;
  };

  const adminUrls = [
    "/main.tsx",
    "/app/AdminApp.tsx",
    "/app/adminRouteComponents.tsx",
    "/ui/custom-screens/CustomScreenListPage.tsx",
  ];
  const adminCalls = [];
  const adminScan = deferred();
  const adminProcessing = deferred();
  const adminOptimizer = {
    metadata: readinessMetadata("pending", adminProcessing.promise),
    scanProcessing: adminScan.promise,
  };
  const adminServer = stableReadinessServer(adminCalls, adminOptimizer);
  let adminReadyContinuations = 0;
  const adminReadiness = (async () => {
    await settleViteReadiness(adminServer, adminUrls, "admin_vite_readiness_failed");
    adminCalls.push("ready");
    adminReadyContinuations += 1;
  })();
  await new Promise((resolve) => setImmediate(resolve));
  invariant(adminReadyContinuations === 0, "Admin readiness escaped before scan completion");
  adminCalls.push("scan");
  adminOptimizer.scanProcessing = undefined;
  adminScan.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  invariant(adminReadyContinuations === 0, "Admin readiness escaped before dependency publication");
  adminCalls.push("publish");
  adminOptimizer.metadata = readinessMetadata("stable");
  adminProcessing.resolve();
  await adminReadiness;
  invariant(
    adminReadyContinuations === 1 &&
      JSON.stringify(adminCalls) ===
        JSON.stringify([
          ...adminUrls.map((url) => "transform:" + url),
          "idle",
          "scan",
          "publish",
          ...adminUrls.map((url) => "transform:" + url),
          "idle",
          "ready",
        ]),
    "Admin readiness publication order drift"
  );

  const siteCalls = [];
  const siteOptimizer = { metadata: readinessMetadata("site") };
  const siteServer = stableReadinessServer(siteCalls, siteOptimizer);
  let siteReadyContinuations = 0;
  await settleViteReadiness(siteServer, ["/main.ts"], "site_vite_readiness_failed");
  siteCalls.push("ready");
  siteReadyContinuations += 1;
  invariant(
    siteReadyContinuations === 1 &&
      JSON.stringify(siteCalls) ===
        JSON.stringify(["transform:/main.ts", "idle", "transform:/main.ts", "idle", "ready"]),
    "site readiness stable-transform order drift"
  );

  const readinessNegatives = [
    {
      label: "missing optimizer",
      server: {
        environments: { client: {} },
        async transformRequest() {
          return { code: "export {};" };
        },
        async waitForRequestsIdle() {},
      },
    },
    {
      label: "malformed metadata",
      server: stableReadinessServer([], {
        metadata: { browserHash: "browser-malformed", depInfoList: {} },
      }),
    },
    {
      label: "non-native processing thenable",
      server: stableReadinessServer([], {
        metadata: readinessMetadata("thenable", { then() {} }),
      }),
    },
    {
      label: "non-native scan thenable",
      server: stableReadinessServer([], {
        metadata: readinessMetadata("scan-thenable"),
        scanProcessing: { then() {} },
      }),
    },
    {
      label: "rejected scan",
      server: stableReadinessServer([], {
        metadata: readinessMetadata("rejected-scan"),
        scanProcessing: rejectedReadinessPromise("private scan failure"),
      }),
    },
    {
      label: "rejected processing",
      server: stableReadinessServer([], {
        metadata: readinessMetadata(
          "rejected-processing",
          rejectedReadinessPromise("private processing failure")
        ),
      }),
    },
    {
      label: "null transform",
      server: {
        ...stableReadinessServer([], { metadata: readinessMetadata("null-transform") }),
        async transformRequest() {
          return null;
        },
      },
    },
    {
      label: "empty transform",
      server: {
        ...stableReadinessServer([], { metadata: readinessMetadata("empty-transform") }),
        async transformRequest() {
          return { code: "" };
        },
      },
    },
  ];
  for (const { label, server } of readinessNegatives) {
    let readyContinuations = 0;
    await expectAsyncFailure(async () => {
      await settleViteReadiness(server, ["/main.ts"], "site_vite_readiness_failed");
      readyContinuations += 1;
    }, "Vite readiness " + label);
    invariant(readyContinuations === 0, label + " emitted a READY continuation");
  }
  let unstableTransforms = 0;
  const unstableOptimizer = { metadata: readinessMetadata("unstable-0") };
  const unstableServer = stableReadinessServer([], unstableOptimizer);
  unstableServer.transformRequest = async () => {
    unstableTransforms += 1;
    unstableOptimizer.metadata = readinessMetadata("unstable-" + unstableTransforms);
    return { code: "export {};" };
  };
  let unstableReadyContinuations = 0;
  await expectAsyncFailure(async () => {
    await settleViteReadiness(unstableServer, ["/main.ts"], "site_vite_readiness_failed");
    unstableReadyContinuations += 1;
  }, "Vite readiness non-convergence");
  invariant(
    unstableTransforms === 8 && unstableReadyContinuations === 0,
    "Vite readiness non-convergence bound drift"
  );

  const makeViteOptionsOwner = (kind) => {
    const admin = kind === "admin";
    return Object.freeze({
      configFile: admin ? "./vite.config.ts" : "./vite.site.config.ts",
      configLoader: "native",
      cacheDir: admin ? "../node_modules/.vite/wf540-admin" : "../node_modules/.vite/wf540-site",
      envDir: false,
      clearScreen: false,
      logLevel: "silent",
      server: Object.freeze({
        host: "127.0.0.1",
        port: admin ? 5173 : 5174,
        strictPort: true,
        open: false,
      }),
    });
  };
  const expectedViteCache = (kind) => process.cwd() + "/node_modules/.vite/wf540-" + kind;
  const warmRestartPositive = async (kind, readinessUrls) => {
    const options = makeViteOptionsOwner(kind);
    const expectedCacheDir = expectedViteCache(kind);
    const failureCode = kind + "_vite_readiness_failed";
    const calls = [];
    const clones = [];
    const optionProjections = [];
    const closes = [0, 0];
    let starts = 0;
    const createServerFake = async (inlineConfig) => {
      const index = starts;
      starts += 1;
      calls.push("create:" + (index + 1));
      clones.push(inlineConfig);
      optionProjections.push(clonePlain(inlineConfig));
      if (index === 0) {
        inlineConfig.cacheDir = "vite-mutated-cache";
        inlineConfig.server.port = 1;
      }
      const configTarget = {};
      Object.defineProperty(configTarget, "cacheDir", {
        value: expectedCacheDir,
        enumerable: true,
        writable: true,
        configurable: true,
      });
      const config = new Proxy(configTarget, {
        getOwnPropertyDescriptor(target, property) {
          if (property === "cacheDir") calls.push("cache:" + (index + 1));
          return Reflect.getOwnPropertyDescriptor(target, property);
        },
      });
      const optimizer = { metadata: readinessMetadata(kind + "-" + index) };
      return {
        config,
        environments: { client: { depsOptimizer: optimizer } },
        async listen() {
          calls.push("listen:" + (index + 1));
        },
        async transformRequest(url) {
          calls.push("transform:" + (index + 1) + ":" + url);
          return { code: "export {};" };
        },
        async waitForRequestsIdle() {
          calls.push("idle:" + (index + 1));
        },
        async close() {
          closes[index] += 1;
          calls.push("close:" + (index + 1));
        },
        instance: index + 1,
      };
    };
    const finalServer = await startViteWithWarmRestart(
      createServerFake,
      options,
      readinessUrls,
      expectedCacheDir,
      failureCode
    );
    calls.push("ready");
    const expectedCalls = [];
    for (let index = 1; index <= 2; index += 1) {
      expectedCalls.push("create:" + index, "cache:" + index, "listen:" + index);
      for (let round = 0; round < 2; round += 1) {
        expectedCalls.push(
          ...readinessUrls.map((url) => "transform:" + index + ":" + url),
          "idle:" + index
        );
      }
      if (index === 1) expectedCalls.push("close:1");
    }
    expectedCalls.push("ready");
    invariant(
      starts === 2 &&
        finalServer.instance === 2 &&
        JSON.stringify(closes) === JSON.stringify([1, 0]) &&
        JSON.stringify(calls) === JSON.stringify(expectedCalls),
      kind + " warm-restart lifecycle order drift"
    );
    invariant(
      clones.length === 2 &&
        clones[0] !== clones[1] &&
        clones[0].server !== clones[1].server &&
        clones.every(
          (clone) =>
            clone !== options &&
            clone.server !== options.server &&
            !Object.isFrozen(clone) &&
            !Object.isFrozen(clone.server)
        ) &&
        JSON.stringify(optionProjections) ===
          JSON.stringify([clonePlain(options), clonePlain(options)]) &&
        options.cacheDir === "../node_modules/.vite/wf540-" + kind &&
        options.server.port === (kind === "admin" ? 5173 : 5174),
      kind + " warm-restart clone isolation drift"
    );
    return { options, expectedCacheDir };
  };
  const adminWarmRestart = await warmRestartPositive("admin", adminUrls);
  const siteWarmRestart = await warmRestartPositive("site", ["/main.ts"]);

  const warmRestartFailure = async (stage) => {
    const options = makeViteOptionsOwner("site");
    const expectedCacheDir = expectedViteCache("site");
    const closes = [0, 0];
    const listens = [0, 0];
    let starts = 0;
    const createServerFake = async () => {
      const index = starts;
      starts += 1;
      if (stage === "create-" + (index + 1)) throw new Error("private create failure");
      const cacheDir =
        stage === "cache-" + (index + 1) ? expectedCacheDir + "-wrong" : expectedCacheDir;
      const optimizer = { metadata: readinessMetadata("failure-" + index) };
      return {
        config: { cacheDir },
        environments: { client: { depsOptimizer: optimizer } },
        async listen() {
          listens[index] += 1;
          if (stage === "listen-" + (index + 1)) {
            throw new Error("private listen failure");
          }
        },
        async transformRequest() {
          if (
            stage === "readiness-" + (index + 1) ||
            (stage === "readiness-2-close-failure" && index === 1)
          ) {
            return null;
          }
          return { code: "export {};" };
        },
        async waitForRequestsIdle() {},
        async close() {
          closes[index] += 1;
          if (
            stage === "close-" + (index + 1) ||
            (stage === "readiness-2-close-failure" && index === 1)
          ) {
            throw new Error("private close failure");
          }
        },
      };
    };
    let observedCode = null;
    try {
      await startViteWithWarmRestart(
        createServerFake,
        options,
        ["/main.ts"],
        expectedCacheDir,
        "site_vite_readiness_failed"
      );
    } catch (error) {
      observedCode = error instanceof Error ? error.message : null;
    }
    invariant(observedCode === "site_vite_readiness_failed", stage + " failure-code drift");
    const expected = {
      "create-1": { starts: 1, closes: [0, 0], listens: [0, 0] },
      "cache-1": { starts: 1, closes: [1, 0], listens: [0, 0] },
      "listen-1": { starts: 1, closes: [1, 0], listens: [1, 0] },
      "readiness-1": { starts: 1, closes: [1, 0], listens: [1, 0] },
      "close-1": { starts: 1, closes: [1, 0], listens: [1, 0] },
      "create-2": { starts: 2, closes: [1, 0], listens: [1, 0] },
      "cache-2": { starts: 2, closes: [1, 1], listens: [1, 0] },
      "listen-2": { starts: 2, closes: [1, 1], listens: [1, 1] },
      "readiness-2": { starts: 2, closes: [1, 1], listens: [1, 1] },
      "readiness-2-close-failure": { starts: 2, closes: [1, 1], listens: [1, 1] },
    }[stage];
    invariant(
      expected &&
        starts === expected.starts &&
        JSON.stringify(closes) === JSON.stringify(expected.closes) &&
        JSON.stringify(listens) === JSON.stringify(expected.listens) &&
        closes.every((count) => count <= 1),
      stage + " warm-restart cleanup drift"
    );
  };
  const warmRestartFailureStages = [
    "create-1",
    "cache-1",
    "listen-1",
    "readiness-1",
    "close-1",
    "create-2",
    "cache-2",
    "listen-2",
    "readiness-2",
    "readiness-2-close-failure",
  ];
  for (const stage of warmRestartFailureStages) await warmRestartFailure(stage);

  const warmRestartOwnerNegatives = [
    () => ({ ...clonePlain(siteWarmRestart.options), extra: true }),
    () => {
      const value = clonePlain(siteWarmRestart.options);
      delete value.cacheDir;
      return value;
    },
    () => clonePlain(siteWarmRestart.options),
    () => {
      const value = clonePlain(siteWarmRestart.options);
      Object.freeze(value);
      return value;
    },
    () => {
      const value = clonePlain(siteWarmRestart.options);
      value.cacheDir = "../node_modules/.vite/wf540-admin";
      return value;
    },
  ];
  for (const [index, buildOwner] of warmRestartOwnerNegatives.entries()) {
    const candidate = buildOwner();
    if (index !== 2 && index !== 3) {
      Object.freeze(candidate.server);
      Object.freeze(candidate);
    }
    let createCalls = 0;
    await expectAsyncFailure(
      () =>
        startViteWithWarmRestart(
          async () => {
            createCalls += 1;
            throw new Error("owner validation escaped");
          },
          candidate,
          ["/main.ts"],
          siteWarmRestart.expectedCacheDir,
          "site_vite_readiness_failed"
        ),
      "warm-restart owner negative " + index
    );
    invariant(createCalls === 0, "invalid warm-restart owner reached Vite");
  }
  const cloneValidatorNegatives = [
    {
      label: "root value drift",
      build() {
        const candidate = clonePlain(siteWarmRestart.options);
        candidate.configLoader = "bundle";
        return candidate;
      },
    },
    {
      label: "nested value drift",
      build() {
        const candidate = clonePlain(siteWarmRestart.options);
        candidate.server.port = 5173;
        return candidate;
      },
    },
    {
      label: "shared root identity",
      build() {
        return siteWarmRestart.options;
      },
    },
    {
      label: "shared nested server identity",
      build() {
        const candidate = clonePlain(siteWarmRestart.options);
        candidate.server = siteWarmRestart.options.server;
        return candidate;
      },
    },
  ];
  for (const { label, build } of cloneValidatorNegatives) {
    const candidate = build();
    let observedCode = null;
    let createCalls = 0;
    let readyContinuations = 0;
    try {
      requireExactViteOptionsClone(
        siteWarmRestart.options,
        candidate,
        "site_vite_readiness_failed"
      );
      createCalls += 1;
      readyContinuations += 1;
    } catch (error) {
      observedCode = error instanceof Error ? error.message : null;
    }
    invariant(
      observedCode === "site_vite_readiness_failed" &&
        createCalls === 0 &&
        readyContinuations === 0,
      "pre-create Vite clone negative: " + label
    );
  }

  let sameServerCreates = 0;
  let sameServerListens = 0;
  let sameServerCloses = 0;
  let sameServerReadyContinuations = 0;
  const sameServerExpectedCache = expectedViteCache("site");
  const sameServer = {
    ...stableReadinessServer([], { metadata: readinessMetadata("same-server") }),
    config: { cacheDir: sameServerExpectedCache },
    async listen() {
      sameServerListens += 1;
    },
    async close() {
      sameServerCloses += 1;
    },
  };
  let sameServerFailureCode = null;
  try {
    await startViteWithWarmRestart(
      async () => {
        sameServerCreates += 1;
        return sameServer;
      },
      makeViteOptionsOwner("site"),
      ["/main.ts"],
      sameServerExpectedCache,
      "site_vite_readiness_failed"
    );
    sameServerReadyContinuations += 1;
  } catch (error) {
    sameServerFailureCode = error instanceof Error ? error.message : null;
  }
  invariant(
    sameServerFailureCode === "site_vite_readiness_failed" &&
      sameServerCreates === 2 &&
      sameServerListens === 1 &&
      sameServerCloses === 1 &&
      sameServerReadyContinuations === 0,
    "same Vite server instance was reused after the warm close"
  );
  invariant(
    Object.isFrozen(adminWarmRestart.options) &&
      Object.isFrozen(adminWarmRestart.options.server) &&
      Object.isFrozen(siteWarmRestart.options) &&
      Object.isFrozen(siteWarmRestart.options.server),
    "warm-restart exact owners are not recursively frozen"
  );

  let drainData = null;
  const drainState = createBoundedDrain(
    {
      on(event, callback) {
        invariant(event === "data" && drainData === null, "self-test drain subscription drift");
        drainData = callback;
      },
    },
    CHILD_READY_MARKERS.admin
  );
  drainData(Buffer.from(CHILD_READY_MARKERS.admin.slice(0, 9)));
  invariant(drainState().readyCount === 0, "split readiness marker matched early");
  drainData(Buffer.from(CHILD_READY_MARKERS.admin.slice(9)));
  invariant(
    drainState().readyCount === 1 && !drainState().exceeded,
    "split readiness marker was not observed exactly once"
  );

  return Object.freeze({
    childDescriptors: descriptors.length,
    descriptorNegativeCases: descriptorNegatives.length,
    viteReadinessPositiveCases: 2,
    viteReadinessNegativeCases: readinessNegatives.length + 1,
    viteWarmRestartPositiveCases: 2,
    viteWarmRestartNegativeCases:
      warmRestartFailureStages.length +
      warmRestartOwnerNegatives.length +
      cloneValidatorNegatives.length +
      1,
  });
}
