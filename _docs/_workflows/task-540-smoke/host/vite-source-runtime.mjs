export async function settleViteReadiness(server, readinessUrls, failureCode) {
  const fail = () => {
    throw new Error(failureCode);
  };
  try {
    if (
      (typeof server !== "object" && typeof server !== "function") ||
      server === null ||
      typeof server.transformRequest !== "function" ||
      typeof server.waitForRequestsIdle !== "function" ||
      !Array.isArray(readinessUrls) ||
      Object.getPrototypeOf(readinessUrls) !== Array.prototype ||
      readinessUrls.length === 0 ||
      new Set(readinessUrls).size !== readinessUrls.length ||
      readinessUrls.some(
        (url) => typeof url !== "string" || url.length < 2 || !url.startsWith("/")
      ) ||
      typeof failureCode !== "string" ||
      failureCode.length === 0
    ) {
      fail();
    }

    const optimizer = server.environments?.client?.depsOptimizer;
    if (!optimizer || typeof optimizer !== "object") fail();

    const inspectMetadata = () => {
      const metadata = optimizer.metadata;
      if (
        !metadata ||
        typeof metadata !== "object" ||
        typeof metadata.browserHash !== "string" ||
        metadata.browserHash.length === 0 ||
        !Array.isArray(metadata.depInfoList) ||
        Object.getPrototypeOf(metadata.depInfoList) !== Array.prototype
      ) {
        fail();
      }
      const ids = new Set();
      const processing = new Set();
      const depIdentity = [];
      for (const dep of metadata.depInfoList) {
        if (
          !dep ||
          typeof dep !== "object" ||
          typeof dep.id !== "string" ||
          dep.id.length === 0 ||
          typeof dep.file !== "string" ||
          dep.file.length === 0 ||
          ids.has(dep.id) ||
          (dep.browserHash !== undefined &&
            (typeof dep.browserHash !== "string" || dep.browserHash.length === 0)) ||
          (dep.fileHash !== undefined &&
            (typeof dep.fileHash !== "string" || dep.fileHash.length === 0))
        ) {
          fail();
        }
        ids.add(dep.id);
        if (dep.processing !== undefined) {
          if (!(dep.processing instanceof Promise)) fail();
          processing.add(dep.processing);
        }
        depIdentity.push([dep.id, dep.file, dep.browserHash ?? null, dep.fileHash ?? null]);
      }
      depIdentity.sort((left, right) => {
        const leftKey = JSON.stringify(left);
        const rightKey = JSON.stringify(right);
        return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
      });
      return {
        identity: metadata,
        browserHash: metadata.browserHash,
        depIdentity: JSON.stringify(depIdentity),
        processing: [...processing],
      };
    };

    let previousStableMetadata = null;
    for (let round = 0; round < 8; round += 1) {
      for (const url of readinessUrls) {
        const transformed = await server.transformRequest(url);
        if (!transformed || typeof transformed.code !== "string" || transformed.code.length === 0) {
          fail();
        }
      }
      await server.waitForRequestsIdle();
      const scanProcessing = optimizer.scanProcessing;
      if (scanProcessing !== undefined) {
        if (!(scanProcessing instanceof Promise)) fail();
        await scanProcessing;
      }

      let current = inspectMetadata();
      await Promise.all(current.processing);
      await new Promise((resolve) => setImmediate(resolve));
      current = inspectMetadata();
      if (optimizer.scanProcessing !== undefined || current.processing.length !== 0) continue;
      if (
        previousStableMetadata !== null &&
        previousStableMetadata.identity === current.identity &&
        previousStableMetadata.browserHash === current.browserHash &&
        previousStableMetadata.depIdentity === current.depIdentity
      ) {
        return;
      }
      previousStableMetadata = current;
    }
    fail();
  } catch {
    throw new Error(
      typeof failureCode === "string" && failureCode.length > 0
        ? failureCode
        : "vite_readiness_failed"
    );
  }
}

export const VITE_READINESS_SOURCE = Function.prototype.toString.call(settleViteReadiness);

export function requireExactViteOptionsClone(owner, candidate, failureCode) {
  const fail = () => {
    throw new Error(
      typeof failureCode === "string" && failureCode.length > 0
        ? failureCode
        : "vite_options_clone_invalid"
    );
  };
  const requireExactDataObject = (value, expectedKeys) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Reflect.ownKeys(value).length !== expectedKeys.length ||
      !expectedKeys.every((key, index) => Reflect.ownKeys(value)[index] === key)
    ) {
      fail();
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        !Object.hasOwn(descriptor, "value") ||
        Object.hasOwn(descriptor, "get") ||
        Object.hasOwn(descriptor, "set") ||
        descriptor.enumerable !== true
      ) {
        fail();
      }
    }
  };
  const rootKeys = [
    "configFile",
    "configLoader",
    "cacheDir",
    "envDir",
    "clearScreen",
    "logLevel",
    "server",
  ];
  const serverKeys = ["host", "port", "strictPort", "open"];
  requireExactDataObject(owner, rootKeys);
  requireExactDataObject(owner.server, serverKeys);
  requireExactDataObject(candidate, rootKeys);
  requireExactDataObject(candidate.server, serverKeys);
  if (
    !Object.isFrozen(owner) ||
    !Object.isFrozen(owner.server) ||
    Object.isFrozen(candidate) ||
    Object.isFrozen(candidate.server) ||
    candidate === owner ||
    candidate.server === owner.server ||
    rootKeys.some((key) => key !== "server" && !Object.is(candidate[key], owner[key])) ||
    serverKeys.some((key) => !Object.is(candidate.server[key], owner.server[key]))
  ) {
    fail();
  }
  return candidate;
}

export const VITE_OPTIONS_CLONE_VALIDATOR_SOURCE = Function.prototype.toString.call(
  requireExactViteOptionsClone
);

export async function startViteWithWarmRestart(
  createServer,
  options,
  readinessUrls,
  expectedCacheDir,
  failureCode
) {
  const fail = () => {
    throw new Error(failureCode);
  };
  let currentServer = null;
  let currentCloseAttempted = false;
  const closeCurrentOnce = async () => {
    if (currentServer === null || currentCloseAttempted) return;
    currentCloseAttempted = true;
    if (typeof currentServer.close !== "function") fail();
    await currentServer.close();
  };
  const requireExactDataObject = (value, expectedKeys) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Reflect.ownKeys(value).length !== expectedKeys.length ||
      !expectedKeys.every((key, index) => Reflect.ownKeys(value)[index] === key)
    ) {
      fail();
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        !Object.hasOwn(descriptor, "value") ||
        Object.hasOwn(descriptor, "get") ||
        Object.hasOwn(descriptor, "set") ||
        descriptor.enumerable !== true
      ) {
        fail();
      }
    }
  };
  const validateOwner = () => {
    requireExactDataObject(options, [
      "configFile",
      "configLoader",
      "cacheDir",
      "envDir",
      "clearScreen",
      "logLevel",
      "server",
    ]);
    requireExactDataObject(options.server, ["host", "port", "strictPort", "open"]);
    if (!Object.isFrozen(options) || !Object.isFrozen(options.server)) fail();
    const commonValid =
      options.configLoader === "native" &&
      options.envDir === false &&
      options.clearScreen === false &&
      options.logLevel === "silent" &&
      options.server.host === "127.0.0.1" &&
      options.server.strictPort === true &&
      options.server.open === false;
    const adminValid =
      options.configFile === "./vite.config.ts" &&
      options.cacheDir === "../node_modules/.vite/wf540-admin" &&
      options.server.port === 5173 &&
      expectedCacheDir === process.cwd() + "/node_modules/.vite/wf540-admin";
    const siteValid =
      options.configFile === "./vite.site.config.ts" &&
      options.cacheDir === "../node_modules/.vite/wf540-site" &&
      options.server.port === 5174 &&
      expectedCacheDir === process.cwd() + "/node_modules/.vite/wf540-site";
    if (!commonValid || (!adminValid && !siteValid)) fail();
  };
  const cloneOptions = () => ({
    configFile: options.configFile,
    configLoader: options.configLoader,
    cacheDir: options.cacheDir,
    envDir: options.envDir,
    clearScreen: options.clearScreen,
    logLevel: options.logLevel,
    server: {
      host: options.server.host,
      port: options.server.port,
      strictPort: options.server.strictPort,
      open: options.server.open,
    },
  });

  try {
    if (
      typeof createServer !== "function" ||
      typeof expectedCacheDir !== "string" ||
      expectedCacheDir.length === 0 ||
      typeof failureCode !== "string" ||
      failureCode.length === 0
    ) {
      fail();
    }
    validateOwner();
    let previousClone = null;
    let previousServer = null;
    for (let start = 0; start < 2; start += 1) {
      validateOwner();
      const inlineConfig = cloneOptions();
      requireExactDataObject(inlineConfig, [
        "configFile",
        "configLoader",
        "cacheDir",
        "envDir",
        "clearScreen",
        "logLevel",
        "server",
      ]);
      requireExactDataObject(inlineConfig.server, ["host", "port", "strictPort", "open"]);
      if (
        Object.isFrozen(inlineConfig) ||
        Object.isFrozen(inlineConfig.server) ||
        inlineConfig === options ||
        inlineConfig.server === options.server ||
        (previousClone !== null &&
          (inlineConfig === previousClone || inlineConfig.server === previousClone.server))
      ) {
        fail();
      }
      requireExactViteOptionsClone(options, inlineConfig, failureCode);
      previousClone = inlineConfig;
      const createdServer = await createServer(inlineConfig);
      if (previousServer !== null && createdServer === previousServer) fail();
      currentServer = createdServer;
      currentCloseAttempted = false;
      if (
        !currentServer ||
        (typeof currentServer !== "object" && typeof currentServer !== "function") ||
        typeof currentServer.listen !== "function" ||
        typeof currentServer.close !== "function" ||
        !currentServer.config ||
        typeof currentServer.config !== "object"
      ) {
        fail();
      }
      const cacheDescriptor = Object.getOwnPropertyDescriptor(currentServer.config, "cacheDir");
      if (
        !cacheDescriptor ||
        !Object.hasOwn(cacheDescriptor, "value") ||
        Object.hasOwn(cacheDescriptor, "get") ||
        Object.hasOwn(cacheDescriptor, "set") ||
        cacheDescriptor.value !== expectedCacheDir
      ) {
        fail();
      }
      await currentServer.listen();
      await settleViteReadiness(currentServer, readinessUrls, failureCode);
      if (start === 0) {
        previousServer = currentServer;
        await closeCurrentOnce();
        currentServer = null;
      }
    }
    return currentServer;
  } catch {
    try {
      await closeCurrentOnce();
    } catch {
      // A failed close remains a single bounded cleanup attempt.
    }
    throw new Error(
      typeof failureCode === "string" && failureCode.length > 0
        ? failureCode
        : "vite_warm_restart_failed"
    );
  }
}

export const VITE_WARM_RESTART_SOURCE = Function.prototype.toString.call(startViteWithWarmRestart);
