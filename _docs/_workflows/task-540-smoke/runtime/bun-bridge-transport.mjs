import { realpath } from "node:fs/promises";
import path from "node:path";

import { ownString } from "../executor/environment.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  invariant,
} from "../executor/foundation.mjs";
import { assertPlainJsonValue } from "../executor/json-schema.mjs";
import { decodeBoundedUtf8 } from "../executor/output-parser.mjs";
import { deepEqualJson } from "../executor/resource-contracts.mjs";

const BUN_BRIDGE_ENV_PROFILES = deepFreezeExact({
  "schema-only": { requiredInherited: ["PATH"], requiredRepo: [], optionalRepo: [], fixed: {} },
  database: {
    requiredInherited: ["PATH"],
    requiredRepo: ["DATABASE_URL"],
    optionalRepo: [],
    fixed: { DB_POOL_MAX: "1" },
  },
  "bootstrap-preflight": {
    requiredInherited: ["PATH"],
    requiredRepo: ["DATABASE_URL", "PII_HASH_KEY", "PII_ENC_KEY", "ADMIN_EMAIL"],
    optionalRepo: [],
    fixed: { DB_POOL_MAX: "1" },
  },
  "user-identity-proof": {
    requiredInherited: ["PATH"],
    requiredRepo: ["DATABASE_URL", "PII_HASH_KEY", "PII_ENC_KEY"],
    optionalRepo: [],
    fixed: { DB_POOL_MAX: "1" },
  },
  "user-provisioning": {
    requiredInherited: ["PATH"],
    requiredRepo: ["DATABASE_URL", "PII_HASH_KEY", "PII_ENC_KEY", "ADMIN_PASSWORD"],
    optionalRepo: ["AUTH_PASSWORD_PEPPER"],
    fixed: { DB_POOL_MAX: "1" },
  },
});

function createBunBridgeTransport({
  assertNoSymlinkAncestors,
  readStableArtifactIdentity,
  sameArtifactIdentity,
  validateBunBridgeInput,
  validateBunBridgeOperationDescriptor,
  runRetainedProcessGroup,
}) {
  const PRIVATE_BUN_EXECUTABLE_AUTHORITY = new WeakMap();

  function validatedBunPathEntries(pathValue) {
    invariant(
      typeof pathValue === "string" && !pathValue.includes("\0"),
      "Bun executable PATH authority is invalid"
    );
    const pathEntries = pathValue.split(path.delimiter);
    invariant(
      pathEntries.length > 0 &&
        pathEntries.length <= 128 &&
        pathEntries.every(
          (entry) => entry.length > 0 && path.isAbsolute(entry) && path.resolve(entry) === entry
        ),
      "Bun PATH search authority is not an exact bounded absolute projection"
    );
    return [...new Set(pathEntries)];
  }

  async function resolveBunPathSelection(pathValue) {
    for (const directory of validatedBunPathEntries(pathValue)) {
      const aliasPath = path.join(directory, "bun");
      try {
        const executablePath = await realpath(aliasPath);
        return deepFreezeExact({ aliasPath, executablePath });
      } catch (error) {
        if (!error || !["ENOENT", "ENOTDIR", "EACCES"].includes(error.code)) throw error;
      }
    }
    invariant(false, "canonical Bun executable is absent from PATH");
  }

  async function resolveValidatedBunExecutable(pathValue, root) {
    invariant(
      path.isAbsolute(root) && path.resolve(root) === root,
      "Bun executable root authority is invalid"
    );
    const selection = await resolveBunPathSelection(pathValue);
    const executablePath = selection.executablePath;
    invariant(
      path.isAbsolute(executablePath) && path.basename(executablePath) === "bun",
      "canonical Bun executable is absent"
    );
    await assertNoSymlinkAncestors(executablePath);
    const executableIdentity = await readStableArtifactIdentity(executablePath, {
      expectedType: "file",
    });
    invariant((executableIdentity.mode & 0o111) !== 0, "canonical Bun executable is not executable");
    await assertNoSymlinkAncestors(root);
    const rootIdentity = await readStableArtifactIdentity(root, { expectedType: "directory" });
    const corePath = path.join(root, "core");
    invariant((await realpath(corePath)) === corePath, "canonical Bun core cwd drift");
    await assertNoSymlinkAncestors(corePath);
    const coreIdentity = await readStableArtifactIdentity(corePath, { expectedType: "directory" });
    return deepFreezeExact({
      coreIdentity,
      corePath,
      executableIdentity,
      executablePath,
      pathValue,
      rootIdentity,
      rootPath: root,
      selectedAliasPath: selection.aliasPath,
    });
  }

  function validateBunArtifactIdentityProjection(identity, expectedType, label) {
    exactOwnKeys(identity, ["dev", "ino", "mode", "size", "type"], label, { plain: true });
    invariant(
      typeof identity.dev === "string" &&
        identity.dev.length > 0 &&
        typeof identity.ino === "string" &&
        identity.ino.length > 0 &&
        identity.type === expectedType &&
        Number.isSafeInteger(identity.mode) &&
        identity.mode >= 0 &&
        identity.mode <= 0o777 &&
        Number.isSafeInteger(identity.size) &&
        identity.size >= 0,
      label + " projection drift"
    );
    return identity;
  }

  function validateBunExecutableAuthorityObservation(authority, observation) {
    exactOwnKeys(
      authority,
      [
        "coreIdentity",
        "corePath",
        "executableIdentity",
        "executablePath",
        "pathValue",
        "rootIdentity",
        "rootPath",
        "selectedAliasPath",
      ],
      "Bun executable authority",
      { plain: true }
    );
    exactOwnKeys(
      observation,
      [
        "coreIdentity",
        "coreRealPath",
        "currentPath",
        "executableIdentity",
        "executableRealPath",
        "rootIdentity",
        "rootRealPath",
        "selectedAliasPath",
        "selectedExecutableRealPath",
      ],
      "Bun executable authority observation",
      { plain: true }
    );
    validateBunArtifactIdentityProjection(
      authority.executableIdentity,
      "file",
      "Bun executable authority identity"
    );
    validateBunArtifactIdentityProjection(
      observation.executableIdentity,
      "file",
      "Bun executable observed identity"
    );
    validateBunArtifactIdentityProjection(
      authority.rootIdentity,
      "directory",
      "Bun root authority identity"
    );
    validateBunArtifactIdentityProjection(
      observation.rootIdentity,
      "directory",
      "Bun root observed identity"
    );
    validateBunArtifactIdentityProjection(
      authority.coreIdentity,
      "directory",
      "Bun core authority identity"
    );
    validateBunArtifactIdentityProjection(
      observation.coreIdentity,
      "directory",
      "Bun core observed identity"
    );
    invariant(
      observation.currentPath === authority.pathValue &&
        observation.selectedAliasPath === authority.selectedAliasPath &&
        observation.selectedExecutableRealPath === authority.executablePath &&
        observation.executableRealPath === authority.executablePath &&
        observation.rootRealPath === authority.rootPath &&
        observation.coreRealPath === authority.corePath &&
        sameArtifactIdentity(observation.executableIdentity, authority.executableIdentity, {
          includeSize: true,
        }) &&
        sameArtifactIdentity(observation.rootIdentity, authority.rootIdentity) &&
        sameArtifactIdentity(observation.coreIdentity, authority.coreIdentity) &&
        (observation.executableIdentity.mode & 0o111) !== 0,
      "Bun executable, PATH, or cwd authority drift"
    );
    return authority;
  }

  async function revalidateBunExecutableAuthority(state) {
    const authority = PRIVATE_BUN_EXECUTABLE_AUTHORITY.get(state);
    invariant(authority, "Bun executable authority is absent");
    const selection = await resolveBunPathSelection(process.env.PATH);
    await assertNoSymlinkAncestors(authority.executablePath);
    const executableIdentity = await readStableArtifactIdentity(authority.executablePath, {
      expectedType: "file",
    });
    await assertNoSymlinkAncestors(authority.rootPath);
    const rootIdentity = await readStableArtifactIdentity(authority.rootPath, {
      expectedType: "directory",
    });
    await assertNoSymlinkAncestors(authority.corePath);
    const coreIdentity = await readStableArtifactIdentity(authority.corePath, {
      expectedType: "directory",
    });
    return validateBunExecutableAuthorityObservation(authority, {
      coreIdentity,
      coreRealPath: await realpath(authority.corePath),
      currentPath: process.env.PATH,
      executableIdentity,
      executableRealPath: await realpath(authority.executablePath),
      rootIdentity,
      rootRealPath: await realpath(authority.rootPath),
      selectedAliasPath: selection.aliasPath,
      selectedExecutableRealPath: selection.executablePath,
    });
  }

  function buildBridgeEnvironment(state, profile) {
    const environment = Object.create(null);
    const selected = BUN_BRIDGE_ENV_PROFILES[profile];
    invariant(selected !== undefined, "bridge environment profile is unknown");
    const bunAuthority = PRIVATE_BUN_EXECUTABLE_AUTHORITY.get(state);
    invariant(bunAuthority, "Bun executable authority is absent from bridge environment projection");
    for (const key of selected.requiredInherited) {
      const value = ownString(process.env, key, { required: true });
      if (key === "PATH")
        invariant(value === bunAuthority.pathValue, "Bun bridge inherited PATH drift");
      environment[key] = value;
    }
    for (const key of selected.requiredRepo)
      environment[key] = ownString(state.repoEnvironment, key, { required: true });
    for (const key of selected.optionalRepo) {
      const value = ownString(state.repoEnvironment, key);
      if (value !== null && value.length > 0) environment[key] = value;
    }
    for (const [key, value] of Object.entries(selected.fixed)) environment[key] = value;
    invariant(
      deepEqualJson(
        Object.keys(environment).sort(),
        [
          ...selected.requiredInherited,
          ...selected.requiredRepo,
          ...selected.optionalRepo.filter((key) => Object.hasOwn(environment, key)),
          ...Object.keys(selected.fixed),
        ].sort()
      ),
      "bridge environment exact projection drift"
    );
    return Object.freeze(environment);
  }

  function encodeBoundedBunBridgeCanonicalFrame(input, maximumBytes) {
    invariant(
      Number.isSafeInteger(maximumBytes) && maximumBytes > 0,
      "Bun bridge stdin bound is invalid"
    );
    const frame = Buffer.from(canonicalJson(input) + "\n");
    invariant(frame.length <= maximumBytes, "Bun bridge stdin exceeds its descriptor bound");
    return frame;
  }

  function encodeBunBridgeInputFrame(state, descriptor, input) {
    validateBunBridgeOperationDescriptor(descriptor);
    validateBunBridgeInput(state, descriptor, input);
    return encodeBoundedBunBridgeCanonicalFrame(input, descriptor.maxStdinBytes);
  }

  function bunBridgeDispatchProjection(descriptor, frame) {
    return {
      envProfileId: descriptor.envProfileId,
      file: descriptor.file,
      frameBytes: frame.length,
      inputSchemaId: descriptor.inputSchemaId,
      operationId: descriptor.operationId,
      outputSchemaId: descriptor.outputSchemaId,
      sourceSha256: descriptor.sourceSha256,
    };
  }

  function prepareBunBridgeDispatch(state, descriptor, input) {
    const frame = encodeBunBridgeInputFrame(state, descriptor, input);
    return Object.freeze({
      descriptor,
      frame,
      projection: deepFreezeExact(bunBridgeDispatchProjection(descriptor, frame)),
    });
  }

  function assertPreparedBunBridgeFrameExact(state, descriptor, input, prepared) {
    const expectedFrame = encodeBunBridgeInputFrame(state, descriptor, input);
    invariant(
      prepared.descriptor === descriptor &&
        Buffer.isBuffer(prepared.frame) &&
        prepared.frame.equals(expectedFrame) &&
        prepared.projection.frameBytes === expectedFrame.length,
      "Bun bridge prepared frame drift"
    );
    return prepared;
  }

  function dryDispatchBunBridgeDescriptor(state, descriptor, input, externalExecutionTrap) {
    invariant(typeof externalExecutionTrap === "function", "Bun bridge dry-dispatch trap is absent");
    const prepared = prepareBunBridgeDispatch(state, descriptor, input);
    externalExecutionTrap(prepared.projection);
    invariant(false, "Bun bridge dry-dispatch trap returned instead of stopping external execution");
  }

  async function runBunBridge(state, descriptor, input, executionBoundaryObserver = null) {
    invariant(
      executionBoundaryObserver === null || typeof executionBoundaryObserver === "function",
      "Bun bridge execution-boundary observer drift"
    );
    const prepared = prepareBunBridgeDispatch(state, descriptor, input);
    assertPreparedBunBridgeFrameExact(state, descriptor, input, prepared);
    const frame = prepared.frame;
    const executable = await revalidateBunExecutableAuthority(state);
    invariant(
      state.root === executable.rootPath &&
        executable.corePath === path.join(executable.rootPath, "core") &&
        path.isAbsolute(executable.executablePath),
      "Bun bridge canonical executable/cwd binding drift"
    );
    const args = ["--no-env-file", "--cwd", executable.corePath, "--eval", descriptor.source];
    const execution = await runRetainedProcessGroup({
      file: executable.executablePath,
      args,
      cwd: executable.rootPath,
      env: buildBridgeEnvironment(state, descriptor.envProfileId),
      stdinBytes: frame,
      beforeStdinDispatch: executionBoundaryObserver,
      timeoutMs: descriptor.timeoutMs,
      maxStdoutBytes: descriptor.maxStdoutBytes,
      maxStderrBytes: descriptor.maxStderrBytes,
    });
    invariant(
      !execution.timedOut &&
        !execution.spawnError &&
        execution.completion.code === 0 &&
        !execution.stdout.exceeded &&
        !execution.stderr.exceeded &&
        execution.stderr.bytes.length === 0 &&
        execution.termination.absent === true,
      "descriptor-bound Bun bridge child failed"
    );
    const text = decodeBoundedUtf8(
      execution.stdout.bytes,
      "Bun bridge output",
      descriptor.maxStdoutBytes
    );
    invariant(
      text.endsWith("\n") && !text.slice(0, -1).includes("\n"),
      "Bun bridge output frame drift"
    );
    const value = JSON.parse(text.slice(0, -1));
    assertPlainJsonValue(value, "Bun bridge output");
    invariant(canonicalJson(value) + "\n" === text, "Bun bridge output is not canonical");
    return value;
  }

  return {
    PRIVATE_BUN_EXECUTABLE_AUTHORITY,
    assertPreparedBunBridgeFrameExact,
    dryDispatchBunBridgeDescriptor,
    encodeBoundedBunBridgeCanonicalFrame,
    prepareBunBridgeDispatch,
    resolveValidatedBunExecutable,
    runBunBridge,
    validateBunExecutableAuthorityObservation,
  };
}

export { BUN_BRIDGE_ENV_PROFILES, createBunBridgeTransport };
