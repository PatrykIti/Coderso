import { spawnSync } from "node:child_process";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

export const TASK_554_FROZEN_INSTALL_INPUTS = Object.freeze([
  "package.json",
  "bun.lock",
  "bunfig.toml",
  "core/package.json",
  "store/package.json",
  "packages/sdk/package.json",
  "patches/minimatch@3.1.5.patch",
  "patches/npm@11.18.0.patch",
]);
const MAX_INPUT_BYTES = 1024 * 1024;
const MAX_DESTINATION_DEPTH = 8;
const MAX_CLEANUP_DEPTH = 64;
const MAX_CLEANUP_ENTRIES = 250_000;
const RUNNER_ENV = Object.freeze({
  CI: "1",
  NO_COLOR: "1",
  PATH: "/usr/local/bin:/usr/bin:/bin",
});
const CANONICAL_REGISTRY = "https://registry.npmjs.org";

function sameNode(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  );
}
function sameOwnedDirectory(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.uid === right.uid
  );
}
function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode;
}
function assertOwnedPrivateDirectory(stats, expected, label) {
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    (typeof process.getuid === "function" && stats.uid !== process.getuid()) ||
    (stats.mode & 0o077) !== 0 ||
    (expected && !sameOwnedDirectory(expected, stats))
  )
    throw new Error(`${label}_invalid`);
}
function assertAbsent(absolutePath, dependencies, label) {
  try {
    dependencies.lstatSync(absolutePath);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return;
    throw error;
  }
  throw new Error(`${label}_replaced`);
}
function frozenInstallFailure(result) {
  if (!result || typeof result !== "object") return "invalid_result";
  const runnerError = result.error;
  const runnerSignal = result.signal;
  const runnerStatus = result.status;
  if (runnerError !== undefined && runnerError !== null) {
    if (
      runnerError instanceof Error ||
      (typeof runnerError === "object" &&
        typeof runnerError.name === "string" &&
        typeof runnerError.message === "string")
    )
      return "spawn_failed";
    return "invalid_result";
  }
  if (runnerSignal !== undefined && runnerSignal !== null) {
    if (typeof runnerSignal === "string" && /^SIG[A-Z0-9]{1,31}$/.test(runnerSignal))
      return "terminated";
    return "invalid_result";
  }
  if (!Number.isInteger(runnerStatus) || runnerStatus < 0 || runnerStatus > 255)
    return "invalid_result";
  return runnerStatus === 0 ? null : `exit_${runnerStatus}`;
}
function assertNofollowAncestors(absolutePath, lstat, label) {
  const parsed = path.parse(absolutePath);
  let current = parsed.root;
  for (const component of absolutePath
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean)
    .slice(0, -1)) {
    current = path.join(current, component);
    const stats = lstat(current);
    if (!stats.isDirectory() || stats.isSymbolicLink())
      throw new Error(`${label}_ancestor_invalid:${current}`);
  }
}
function assertRegularOneLink(stats, label) {
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.nlink !== 1 ||
    stats.size > MAX_INPUT_BYTES
  )
    throw new Error(`${label}_not_regular`);
}
function assertOwnedPrivateFile(stats, label) {
  assertRegularOneLink(stats, label);
  if (
    (typeof process.getuid === "function" && stats.uid !== process.getuid()) ||
    (stats.mode & 0o077) !== 0
  )
    throw new Error(`${label}_invalid`);
}
function assertDirectoryIdentity(stats, expected, label) {
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    (expected && !sameIdentity(expected, stats))
  )
    throw new Error(`${label}_invalid`);
}
function descriptorAnchor(descriptor, dependencies, label) {
  if (
    process.platform !== "linux" ||
    !Number.isInteger(constants.O_DIRECTORY) ||
    !Number.isInteger(constants.O_NOFOLLOW)
  )
    throw new Error("task_554_frozen_install_descriptor_anchor_unsupported");
  const anchor = `/proc/self/fd/${descriptor}`;
  const opened = dependencies.fstatSync(descriptor);
  let anchored;
  try {
    anchored = dependencies.statSync(anchor);
  } catch {
    throw new Error("task_554_frozen_install_descriptor_anchor_unavailable");
  }
  if (!sameIdentity(opened, anchored)) throw new Error(`${label}_identity_changed`);
  return anchor;
}
function validatedRelativeComponents(relativePath) {
  const components = relativePath.split("/");
  if (
    components.length === 0 ||
    components.length > MAX_DESTINATION_DEPTH ||
    components.some(
      (component) =>
        component.length === 0 ||
        component === "." ||
        component === ".." ||
        component.includes("\0") ||
        component.includes("/") ||
        component.includes(path.sep)
    )
  )
    throw new Error(`task_554_frozen_install_destination_invalid:${relativePath}`);
  return components;
}
function openDestinationDirectory(parentDescriptor, component, dependencies) {
  const parentAnchor = descriptorAnchor(
    parentDescriptor,
    dependencies,
    "task_554_frozen_install_destination_parent"
  );
  const destination = path.join(parentAnchor, component);
  try {
    dependencies.mkdirSync(destination, { mode: 0o700 });
  } catch (error) {
    if (!error || typeof error !== "object" || error.code !== "EEXIST") throw error;
  }
  const initial = dependencies.lstatSync(destination);
  assertOwnedPrivateDirectory(initial, undefined, "task_554_frozen_install_destination_directory");
  const descriptor = dependencies.openSync(
    destination,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
  );
  try {
    const opened = dependencies.fstatSync(descriptor);
    const final = dependencies.lstatSync(destination);
    assertOwnedPrivateDirectory(opened, initial, "task_554_frozen_install_destination_directory");
    assertOwnedPrivateDirectory(final, opened, "task_554_frozen_install_destination_directory");
    return descriptor;
  } catch (error) {
    dependencies.closeSync(descriptor);
    throw error;
  }
}
function withDestinationParent(sandboxDescriptor, components, dependencies, action) {
  let current = sandboxDescriptor;
  let ownsCurrent = false;
  try {
    for (const component of components.slice(0, -1)) {
      const next = openDestinationDirectory(current, component, dependencies);
      if (ownsCurrent) dependencies.closeSync(current);
      current = next;
      ownsCurrent = true;
    }
    return action(current, components.at(-1));
  } finally {
    if (ownsCurrent) dependencies.closeSync(current);
  }
}
function openSourceDirectory(parentDescriptor, component, relativePath, dependencies) {
  const parentAnchor = descriptorAnchor(
    parentDescriptor,
    dependencies,
    "task_554_frozen_install_input_parent"
  );
  const directoryPath = path.join(parentAnchor, component);
  const initial = dependencies.lstatSync(directoryPath);
  assertDirectoryIdentity(
    initial,
    undefined,
    `task_554_frozen_install_input_directory:${relativePath}`
  );
  const descriptor = dependencies.openSync(
    directoryPath,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
  );
  try {
    const opened = dependencies.fstatSync(descriptor);
    const final = dependencies.lstatSync(directoryPath);
    assertDirectoryIdentity(
      opened,
      initial,
      `task_554_frozen_install_input_directory:${relativePath}`
    );
    assertDirectoryIdentity(
      final,
      opened,
      `task_554_frozen_install_input_directory:${relativePath}`
    );
    return descriptor;
  } catch (error) {
    dependencies.closeSync(descriptor);
    throw error;
  }
}
function withSourceParent(rootDescriptor, components, relativePath, dependencies, action) {
  let current = rootDescriptor;
  let ownsCurrent = false;
  try {
    for (const component of components.slice(0, -1)) {
      const next = openSourceDirectory(current, component, relativePath, dependencies);
      if (ownsCurrent) dependencies.closeSync(current);
      current = next;
      ownsCurrent = true;
    }
    return action(current, components.at(-1));
  } finally {
    if (ownsCurrent) dependencies.closeSync(current);
  }
}
function writeStableDestination(parentDescriptor, leaf, bytes, relativePath, dependencies) {
  const parentAnchor = descriptorAnchor(
    parentDescriptor,
    dependencies,
    "task_554_frozen_install_destination_parent"
  );
  const destination = path.join(parentAnchor, leaf);
  let writeDescriptor;
  let readDescriptor;
  try {
    writeDescriptor = dependencies.openSync(
      destination,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600
    );
    const created = dependencies.fstatSync(writeDescriptor);
    assertOwnedPrivateFile(created, `task_554_frozen_install_sandbox:${relativePath}`);
    dependencies.writeFileSync(writeDescriptor, bytes);
    const written = dependencies.fstatSync(writeDescriptor);
    const final = dependencies.lstatSync(destination);
    assertOwnedPrivateFile(written, `task_554_frozen_install_sandbox:${relativePath}`);
    assertOwnedPrivateFile(final, `task_554_frozen_install_sandbox:${relativePath}`);
    if (
      !sameIdentity(created, written) ||
      !sameIdentity(written, final) ||
      written.size !== bytes.byteLength
    )
      throw new Error(`task_554_frozen_install_sandbox_copy_invalid:${relativePath}`);
    dependencies.closeSync(writeDescriptor);
    writeDescriptor = undefined;
    readDescriptor = dependencies.openSync(destination, constants.O_RDONLY | constants.O_NOFOLLOW);
    const beforeRead = dependencies.fstatSync(readDescriptor);
    const copiedBytes = Buffer.from(dependencies.readFileSync(readDescriptor));
    const afterRead = dependencies.fstatSync(readDescriptor);
    const afterPath = dependencies.lstatSync(destination);
    if (
      !sameIdentity(final, beforeRead) ||
      !sameNode(beforeRead, afterRead) ||
      !sameNode(afterRead, afterPath) ||
      !copiedBytes.equals(bytes)
    )
      throw new Error(`task_554_frozen_install_sandbox_copy_invalid:${relativePath}`);
  } finally {
    if (readDescriptor !== undefined) dependencies.closeSync(readDescriptor);
    if (writeDescriptor !== undefined) dependencies.closeSync(writeDescriptor);
  }
}
function readStableInput(rootDescriptor, relativePath, dependencies) {
  const components = validatedRelativeComponents(relativePath);
  return withSourceParent(
    rootDescriptor,
    components,
    relativePath,
    dependencies,
    (parentDescriptor, leaf) => {
      const parentAnchor = descriptorAnchor(
        parentDescriptor,
        dependencies,
        "task_554_frozen_install_input_parent"
      );
      const inputPath = path.join(parentAnchor, leaf);
      const initial = dependencies.lstatSync(inputPath);
      assertRegularOneLink(initial, `task_554_frozen_install_input:${relativePath}`);
      let descriptor;
      try {
        descriptor = dependencies.openSync(inputPath, constants.O_RDONLY | constants.O_NOFOLLOW);
        const before = dependencies.fstatSync(descriptor);
        assertRegularOneLink(before, `task_554_frozen_install_input:${relativePath}`);
        const bytes = Buffer.from(dependencies.readFileSync(descriptor));
        const after = dependencies.fstatSync(descriptor);
        const final = dependencies.lstatSync(inputPath);
        if (
          !sameNode(initial, before) ||
          !sameNode(before, after) ||
          !sameNode(after, final) ||
          bytes.byteLength !== after.size
        )
          throw new Error(`task_554_frozen_install_input_changed:${relativePath}`);
        return bytes;
      } finally {
        if (descriptor !== undefined) dependencies.closeSync(descriptor);
      }
    }
  );
}
function assertNoProjectNpmrc(rootDescriptor, dependencies) {
  const rootAnchor = descriptorAnchor(
    rootDescriptor,
    dependencies,
    "task_554_frozen_install_npmrc_parent"
  );
  const npmrcPath = path.join(rootAnchor, ".npmrc");
  try {
    dependencies.lstatSync(npmrcPath);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return;
    throw error;
  }
  throw new Error("task_554_frozen_install_project_npmrc_forbidden");
}
function openPinnedProjectRoot(root, dependencies) {
  let descriptor;
  try {
    assertNofollowAncestors(
      path.join(root, ".task-554-project-root-anchor"),
      dependencies.lstatSync,
      "task_554_frozen_install_project"
    );
    const initial = dependencies.lstatSync(root);
    assertDirectoryIdentity(initial, undefined, "task_554_frozen_install_project_root");
    descriptor = dependencies.openSync(
      root,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
    );
    const opened = dependencies.fstatSync(descriptor);
    const final = dependencies.lstatSync(root);
    assertDirectoryIdentity(opened, initial, "task_554_frozen_install_project_root");
    assertDirectoryIdentity(final, opened, "task_554_frozen_install_project_root");
    descriptorAnchor(descriptor, dependencies, "task_554_frozen_install_project_root");
    return descriptor;
  } catch {
    if (descriptor !== undefined) {
      try {
        dependencies.closeSync(descriptor);
      } catch {}
    }
    throw new Error("task_554_frozen_install_project_root_invalid");
  }
}

function assertPinnedProjectRoot(root, descriptor, dependencies) {
  try {
    const retained = dependencies.fstatSync(descriptor);
    const current = dependencies.lstatSync(root);
    assertDirectoryIdentity(current, retained, "task_554_frozen_install_project_root");
    descriptorAnchor(descriptor, dependencies, "task_554_frozen_install_project_root");
  } catch {
    throw new Error("task_554_frozen_install_project_root_identity_changed");
  }
}

function openPinnedTempRoot(projectRootDescriptor, dependencies) {
  const rawTempRoot = dependencies.tmpdir();
  if (
    typeof rawTempRoot !== "string" ||
    rawTempRoot.includes("\0") ||
    !path.isAbsolute(rawTempRoot) ||
    path.normalize(rawTempRoot) !== rawTempRoot
  )
    throw new Error("task_554_frozen_install_temp_root_invalid");
  let descriptor;
  try {
    assertNofollowAncestors(
      path.join(rawTempRoot, ".task-554-temp-root-anchor"),
      dependencies.lstatSync,
      "task_554_frozen_install_temp_root"
    );
    const initial = dependencies.lstatSync(rawTempRoot);
    assertDirectoryIdentity(initial, undefined, "task_554_frozen_install_temp_root");
    descriptor = dependencies.openSync(
      rawTempRoot,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
    );
    const opened = dependencies.fstatSync(descriptor);
    const final = dependencies.lstatSync(rawTempRoot);
    assertDirectoryIdentity(opened, initial, "task_554_frozen_install_temp_root");
    assertDirectoryIdentity(final, opened, "task_554_frozen_install_temp_root");
    const tempReal = dependencies.realpathSync(
      descriptorAnchor(descriptor, dependencies, "task_554_frozen_install_temp_root")
    );
    const projectReal = dependencies.realpathSync(
      descriptorAnchor(projectRootDescriptor, dependencies, "task_554_frozen_install_project_root")
    );
    const relative = path.relative(projectReal, tempReal);
    if (
      relative === "" ||
      (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
    )
      throw new Error("task_554_frozen_install_temp_root_inside_project");
    return Object.freeze({ descriptor, node: opened, rawPath: rawTempRoot });
  } catch {
    if (descriptor !== undefined) {
      try {
        dependencies.closeSync(descriptor);
      } catch {}
    }
    throw new Error("task_554_frozen_install_temp_root_invalid");
  }
}

function assertPinnedTempRoot(tempRoot, dependencies) {
  try {
    const retained = dependencies.fstatSync(tempRoot.descriptor);
    const current = dependencies.lstatSync(tempRoot.rawPath);
    assertDirectoryIdentity(current, tempRoot.node, "task_554_frozen_install_temp_root");
    assertDirectoryIdentity(retained, current, "task_554_frozen_install_temp_root");
    descriptorAnchor(tempRoot.descriptor, dependencies, "task_554_frozen_install_temp_root");
  } catch {
    throw new Error("task_554_frozen_install_temp_root_identity_changed");
  }
}

function copySandboxInputs(rootDescriptor, sandboxDescriptor, dependencies) {
  const copied = new Map();
  for (const relativePath of TASK_554_FROZEN_INSTALL_INPUTS) {
    const bytes = readStableInput(rootDescriptor, relativePath, dependencies);
    copied.set(relativePath, bytes);
    const components = validatedRelativeComponents(relativePath);
    withDestinationParent(sandboxDescriptor, components, dependencies, (parent, leaf) =>
      writeStableDestination(parent, leaf, bytes, relativePath, dependencies)
    );
  }
  return copied;
}

function withSourceDirectory(rootDescriptor, relativePath, dependencies, action) {
  const components = relativePath ? validatedRelativeComponents(relativePath) : [];
  let current = rootDescriptor;
  let ownsCurrent = false;
  try {
    for (const component of components) {
      const next = openSourceDirectory(current, component, relativePath, dependencies);
      if (ownsCurrent) dependencies.closeSync(current);
      current = next;
      ownsCurrent = true;
    }
    return action(current);
  } finally {
    if (ownsCurrent) dependencies.closeSync(current);
  }
}

function assertNoSandboxNpmrc(sandboxDescriptor, dependencies) {
  const anchor = descriptorAnchor(
    sandboxDescriptor,
    dependencies,
    "task_554_frozen_install_sandbox_npmrc_parent"
  );
  assertAbsent(path.join(anchor, ".npmrc"), dependencies, "task_554_frozen_install_sandbox_npmrc");
}

function assertSandboxInputs(sandboxDescriptor, copied, dependencies, exactTopology) {
  assertNoSandboxNpmrc(sandboxDescriptor, dependencies);
  for (const [relativePath, expected] of copied) {
    const actual = readStableInput(sandboxDescriptor, relativePath, dependencies);
    if (!actual.equals(expected))
      throw new Error(`task_554_frozen_install_sandbox_input_changed:${relativePath}`);
  }
  if (!exactTopology) return;
  const topology = [
    [
      "",
      [
        ".bun-cache",
        "bun.lock",
        "bunfig.toml",
        "core",
        "package.json",
        "packages",
        "patches",
        "store",
      ],
    ],
    [".bun-cache", []],
    ["core", ["package.json"]],
    ["store", ["package.json"]],
    ["packages", ["sdk"]],
    ["packages/sdk", ["package.json"]],
    ["patches", ["minimatch@3.1.5.patch", "npm@11.18.0.patch"]],
  ];
  for (const [relativePath, expected] of topology)
    withSourceDirectory(sandboxDescriptor, relativePath, dependencies, (descriptor) => {
      const entries = dependencies
        .readdirSync(
          descriptorAnchor(descriptor, dependencies, "task_554_frozen_install_sandbox_topology"),
          { encoding: "utf8" }
        )
        .sort();
      if (
        entries.length !== expected.length ||
        entries.some((entry, index) => entry !== expected[index])
      )
        throw new Error("task_554_frozen_install_sandbox_topology_invalid");
    });
}

function defaultRunner(command, args, options) {
  const inherited = [...options.inheritedDirectoryDescriptors];
  const highestDescriptor = Math.max(...inherited);
  const stdio = Array.from({ length: highestDescriptor + 1 }, (_value, descriptor) =>
    descriptor <= 2 ? "inherit" : "ignore"
  );
  for (const descriptor of inherited) stdio[descriptor] = descriptor;
  return spawnSync(command, args, { cwd: options.cwd, env: options.env, stdio });
}

function resolvedDependencies(overrides = {}) {
  const values = {
    closeSync,
    fstatSync,
    lstatSync,
    mkdirSync,
    mkdtempSync,
    openSync,
    readFileSync,
    readdirSync,
    realpathSync,
    renameSync,
    rmdirSync,
    runner: defaultRunner,
    statSync,
    tmpdir: os.tmpdir,
    unlinkSync,
    writeFileSync,
    ...overrides,
  };
  for (const name of Object.keys(values))
    if (typeof values[name] !== "function")
      throw new Error(`task_554_frozen_install_dependency_invalid:${name}`);
  return values;
}

function assertCleanupEntryName(name) {
  if (
    typeof name !== "string" ||
    name.length === 0 ||
    name === "." ||
    name === ".." ||
    name.includes("\0") ||
    name.includes("/") ||
    name.includes(path.sep)
  )
    throw new Error("task_554_frozen_install_cleanup_entry_invalid");
}

function deleteDirectoryContents(descriptor, dependencies, budget, depth = 0) {
  if (depth > MAX_CLEANUP_DEPTH) throw new Error("task_554_frozen_install_cleanup_depth_exceeded");
  const anchor = descriptorAnchor(
    descriptor,
    dependencies,
    "task_554_frozen_install_cleanup_directory"
  );
  const before = dependencies.fstatSync(descriptor);
  const names = dependencies.readdirSync(anchor, { encoding: "utf8" });
  const after = dependencies.fstatSync(descriptor);
  if (!Array.isArray(names) || !sameIdentity(before, after))
    throw new Error("task_554_frozen_install_cleanup_directory_changed");
  for (const name of names.sort()) {
    assertCleanupEntryName(name);
    budget.entries += 1;
    if (budget.entries > MAX_CLEANUP_ENTRIES)
      throw new Error("task_554_frozen_install_cleanup_entries_exceeded");
    const entryPath = path.join(anchor, name);
    const initial = dependencies.lstatSync(entryPath);
    if (initial.isDirectory() && !initial.isSymbolicLink()) {
      const childDescriptor = dependencies.openSync(
        entryPath,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
      );
      try {
        const opened = dependencies.fstatSync(childDescriptor);
        const anchored = dependencies.lstatSync(entryPath);
        if (!sameIdentity(initial, opened) || !sameIdentity(opened, anchored))
          throw new Error("task_554_frozen_install_cleanup_entry_changed");
        deleteDirectoryContents(childDescriptor, dependencies, budget, depth + 1);
        const emptied = dependencies.fstatSync(childDescriptor);
        const current = dependencies.lstatSync(entryPath);
        if (!sameIdentity(opened, emptied) || !sameIdentity(emptied, current))
          throw new Error("task_554_frozen_install_cleanup_entry_changed");
        dependencies.rmdirSync(entryPath);
      } finally {
        dependencies.closeSync(childDescriptor);
      }
    } else {
      dependencies.unlinkSync(entryPath);
    }
  }
  const final = dependencies.fstatSync(descriptor);
  if (!sameIdentity(before, final))
    throw new Error("task_554_frozen_install_cleanup_directory_changed");
}

function cleanupOwnedSandbox(
  ownedSandbox,
  ownedSandboxNode,
  sandboxDescriptor,
  tempRoot,
  dependencies
) {
  let cleanupRoot;
  let cleanupRootNode;
  let cleanupRootDescriptor;
  let quarantinePath;
  let sandboxDescriptorOpen = true;
  try {
    const opened = dependencies.fstatSync(sandboxDescriptor);
    assertOwnedPrivateDirectory(
      opened,
      ownedSandboxNode,
      "task_554_frozen_install_sandbox_identity_changed"
    );
    descriptorAnchor(sandboxDescriptor, dependencies, "task_554_frozen_install_sandbox_descriptor");
    assertDirectoryIdentity(
      dependencies.fstatSync(tempRoot.descriptor),
      tempRoot.node,
      "task_554_frozen_install_temp_root"
    );
    const cleanupPrefix = path.join(
      descriptorAnchor(tempRoot.descriptor, dependencies, "task_554_frozen_install_temp_root"),
      "task-554-frozen-install-cleanup-"
    );
    cleanupRoot = dependencies.mkdtempSync(cleanupPrefix);
    if (typeof cleanupRoot !== "string" || !cleanupRoot.startsWith(cleanupPrefix))
      throw new Error("task_554_frozen_install_cleanup_root_invalid");
    assertDirectoryIdentity(
      dependencies.fstatSync(tempRoot.descriptor),
      tempRoot.node,
      "task_554_frozen_install_temp_root"
    );
    cleanupRootNode = dependencies.lstatSync(cleanupRoot);
    assertOwnedPrivateDirectory(cleanupRootNode, undefined, "task_554_frozen_install_cleanup_root");
    cleanupRootDescriptor = dependencies.openSync(
      cleanupRoot,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
    );
    const openedCleanupRoot = dependencies.fstatSync(cleanupRootDescriptor);
    const currentCleanupRoot = dependencies.lstatSync(cleanupRoot);
    assertOwnedPrivateDirectory(
      openedCleanupRoot,
      cleanupRootNode,
      "task_554_frozen_install_cleanup_root"
    );
    assertOwnedPrivateDirectory(
      currentCleanupRoot,
      openedCleanupRoot,
      "task_554_frozen_install_cleanup_root"
    );
    cleanupRootNode = openedCleanupRoot;
    const cleanupRootAnchor = descriptorAnchor(
      cleanupRootDescriptor,
      dependencies,
      "task_554_frozen_install_cleanup_root_descriptor"
    );
    const current = dependencies.lstatSync(ownedSandbox);
    assertOwnedPrivateDirectory(
      current,
      opened,
      "task_554_frozen_install_sandbox_identity_changed"
    );
    quarantinePath = path.join(cleanupRootAnchor, `sandbox-${path.basename(ownedSandbox)}`);
    dependencies.renameSync(ownedSandbox, quarantinePath);
    const retained = dependencies.fstatSync(sandboxDescriptor);
    assertOwnedPrivateDirectory(
      retained,
      opened,
      "task_554_frozen_install_quarantine_identity_changed"
    );
    const quarantined = dependencies.lstatSync(quarantinePath);
    assertOwnedPrivateDirectory(
      quarantined,
      retained,
      "task_554_frozen_install_quarantine_identity_changed"
    );
    assertAbsent(ownedSandbox, dependencies, "task_554_frozen_install_sandbox_source");
    const retainedCleanupRoot = dependencies.fstatSync(cleanupRootDescriptor);
    assertOwnedPrivateDirectory(
      retainedCleanupRoot,
      cleanupRootNode,
      "task_554_frozen_install_cleanup_root_identity_changed"
    );
    descriptorAnchor(
      cleanupRootDescriptor,
      dependencies,
      "task_554_frozen_install_cleanup_root_identity_changed"
    );
    deleteDirectoryContents(sandboxDescriptor, dependencies, { entries: 0 });
    const emptied = dependencies.fstatSync(sandboxDescriptor);
    const emptyQuarantine = dependencies.lstatSync(quarantinePath);
    assertOwnedPrivateDirectory(
      emptied,
      retained,
      "task_554_frozen_install_quarantine_identity_changed"
    );
    assertOwnedPrivateDirectory(
      emptyQuarantine,
      emptied,
      "task_554_frozen_install_quarantine_identity_changed"
    );
    dependencies.rmdirSync(quarantinePath);
    assertAbsent(quarantinePath, dependencies, "task_554_frozen_install_quarantine");
    dependencies.closeSync(sandboxDescriptor);
    sandboxDescriptorOpen = false;
    const retainedEmptyCleanupRoot = dependencies.fstatSync(cleanupRootDescriptor);
    const emptyCleanupRoot = dependencies.lstatSync(cleanupRoot);
    assertOwnedPrivateDirectory(
      retainedEmptyCleanupRoot,
      cleanupRootNode,
      "task_554_frozen_install_cleanup_root_identity_changed"
    );
    assertOwnedPrivateDirectory(
      emptyCleanupRoot,
      retainedEmptyCleanupRoot,
      "task_554_frozen_install_cleanup_root_identity_changed"
    );
    dependencies.rmdirSync(cleanupRoot);
    assertAbsent(cleanupRoot, dependencies, "task_554_frozen_install_cleanup_root");
    dependencies.closeSync(cleanupRootDescriptor);
    cleanupRootDescriptor = undefined;
  } catch (error) {
    if (sandboxDescriptorOpen) {
      try {
        dependencies.closeSync(sandboxDescriptor);
      } catch {}
      sandboxDescriptorOpen = false;
    }
    try {
      if (cleanupRoot && cleanupRootNode && cleanupRootDescriptor !== undefined) {
        const retainedCleanupRoot = dependencies.fstatSync(cleanupRootDescriptor);
        const currentCleanupRoot = dependencies.lstatSync(cleanupRoot);
        if (
          sameOwnedDirectory(cleanupRootNode, retainedCleanupRoot) &&
          sameOwnedDirectory(retainedCleanupRoot, currentCleanupRoot)
        )
          dependencies.rmdirSync(cleanupRoot);
      }
    } catch {}
    if (cleanupRootDescriptor !== undefined) {
      try {
        dependencies.closeSync(cleanupRootDescriptor);
      } catch {}
      cleanupRootDescriptor = undefined;
    }
    throw error;
  }
}

function mergeFailure(primary, next, message) {
  return primary ? new AggregateError([primary, next], message) : next;
}

export function runTask554IsolatedFrozenInstall(projectRoot, overrides) {
  const dependencies = resolvedDependencies(overrides);
  const root = path.resolve(projectRoot);
  let projectRootDescriptor;
  let tempRoot;
  let sandbox;
  let ownedSandbox;
  let ownedSandboxNode;
  let sandboxDescriptor;
  let cacheDescriptor;
  let primary;
  try {
    projectRootDescriptor = openPinnedProjectRoot(root, dependencies);
    assertNoProjectNpmrc(projectRootDescriptor, dependencies);
    tempRoot = openPinnedTempRoot(projectRootDescriptor, dependencies);
    assertPinnedTempRoot(tempRoot, dependencies);
    const sandboxPrefix = path.join(
      descriptorAnchor(tempRoot.descriptor, dependencies, "task_554_frozen_install_temp_root"),
      "task-554-frozen-install-"
    );
    sandbox = dependencies.mkdtempSync(sandboxPrefix);
    if (typeof sandbox !== "string" || !sandbox.startsWith(sandboxPrefix))
      throw new Error("task_554_frozen_install_sandbox_invalid");
    const sandboxStats = dependencies.lstatSync(sandbox);
    if (
      !sandboxStats.isDirectory() ||
      sandboxStats.isSymbolicLink() ||
      (typeof process.getuid === "function" && sandboxStats.uid !== process.getuid()) ||
      (sandboxStats.mode & 0o077) !== 0
    )
      throw new Error("task_554_frozen_install_sandbox_invalid");
    assertPinnedTempRoot(tempRoot, dependencies);
    sandboxDescriptor = dependencies.openSync(
      sandbox,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
    );
    const openedSandbox = dependencies.fstatSync(sandboxDescriptor);
    const currentSandbox = dependencies.lstatSync(sandbox);
    assertOwnedPrivateDirectory(openedSandbox, sandboxStats, "task_554_frozen_install_sandbox");
    assertOwnedPrivateDirectory(currentSandbox, openedSandbox, "task_554_frozen_install_sandbox");
    descriptorAnchor(sandboxDescriptor, dependencies, "task_554_frozen_install_sandbox");
    ownedSandbox = sandbox;
    ownedSandboxNode = openedSandbox;
    assertPinnedProjectRoot(root, projectRootDescriptor, dependencies);
    const copiedInputs = copySandboxInputs(projectRootDescriptor, sandboxDescriptor, dependencies);
    cacheDescriptor = openDestinationDirectory(sandboxDescriptor, ".bun-cache", dependencies);
    const beforeRunner = dependencies.lstatSync(sandbox);
    assertOwnedPrivateDirectory(
      beforeRunner,
      openedSandbox,
      "task_554_frozen_install_sandbox_identity_changed"
    );
    assertPinnedProjectRoot(root, projectRootDescriptor, dependencies);
    assertPinnedTempRoot(tempRoot, dependencies);
    assertSandboxInputs(sandboxDescriptor, copiedInputs, dependencies, true);
    const runnerCwd = descriptorAnchor(
      sandboxDescriptor,
      dependencies,
      "task_554_frozen_install_runner_cwd"
    );
    const runnerCache = descriptorAnchor(
      cacheDescriptor,
      dependencies,
      "task_554_frozen_install_runner_cache"
    );
    let failure;
    try {
      const result = dependencies.runner(
        "bun",
        [
          "install",
          "--frozen-lockfile",
          "--ignore-scripts",
          "--registry",
          CANONICAL_REGISTRY,
          "--cache-dir",
          runnerCache,
          "--no-progress",
        ],
        {
          cwd: runnerCwd,
          env: RUNNER_ENV,
          inheritedDirectoryDescriptors: Object.freeze([sandboxDescriptor, cacheDescriptor]),
          stdio: "inherit",
        }
      );
      failure = frozenInstallFailure(result);
    } catch {
      throw new Error("task_554_frozen_install_failed:spawn_failed");
    }
    assertPinnedProjectRoot(root, projectRootDescriptor, dependencies);
    assertPinnedTempRoot(tempRoot, dependencies);
    assertSandboxInputs(sandboxDescriptor, copiedInputs, dependencies, false);
    if (failure) throw new Error(`task_554_frozen_install_failed:${failure}`);
  } catch (error) {
    primary = error;
  } finally {
    if (cacheDescriptor !== undefined) {
      try {
        dependencies.closeSync(cacheDescriptor);
      } catch {
        const closeFailure = new Error("task_554_frozen_install_cache_descriptor_close_failed");
        primary = mergeFailure(
          primary,
          closeFailure,
          "task_554_frozen_install_cache_descriptor_close_failed"
        );
      }
      cacheDescriptor = undefined;
    }
    if (ownedSandbox !== undefined && sandboxDescriptor !== undefined) {
      const cleanupDescriptor = sandboxDescriptor;
      sandboxDescriptor = undefined;
      try {
        cleanupOwnedSandbox(
          ownedSandbox,
          ownedSandboxNode,
          cleanupDescriptor,
          tempRoot,
          dependencies
        );
      } catch (cleanupError) {
        primary = mergeFailure(primary, cleanupError, "task_554_frozen_install_cleanup_failed");
      }
    } else if (sandboxDescriptor !== undefined) {
      try {
        dependencies.closeSync(sandboxDescriptor);
      } catch {
        primary = mergeFailure(
          primary,
          new Error("task_554_frozen_install_sandbox_descriptor_close_failed"),
          "task_554_frozen_install_sandbox_descriptor_close_failed"
        );
      }
      sandboxDescriptor = undefined;
    }
    if (tempRoot !== undefined) {
      try {
        assertPinnedTempRoot(tempRoot, dependencies);
      } catch {
        primary = mergeFailure(
          primary,
          new Error("task_554_frozen_install_temp_root_final_validation_failed"),
          "task_554_frozen_install_temp_root_final_validation_failed"
        );
      }
      try {
        dependencies.closeSync(tempRoot.descriptor);
      } catch {
        primary = mergeFailure(
          primary,
          new Error("task_554_frozen_install_temp_root_descriptor_close_failed"),
          "task_554_frozen_install_temp_root_descriptor_close_failed"
        );
      }
      tempRoot = undefined;
    }
    if (projectRootDescriptor !== undefined) {
      try {
        assertPinnedProjectRoot(root, projectRootDescriptor, dependencies);
      } catch {
        primary = mergeFailure(
          primary,
          new Error("task_554_frozen_install_project_root_final_validation_failed"),
          "task_554_frozen_install_project_root_final_validation_failed"
        );
      }
      try {
        dependencies.closeSync(projectRootDescriptor);
      } catch {
        primary = mergeFailure(
          primary,
          new Error("task_554_frozen_install_project_root_descriptor_close_failed"),
          "task_554_frozen_install_project_root_descriptor_close_failed"
        );
      }
      projectRootDescriptor = undefined;
    }
  }
  if (primary) throw primary;
  return Object.freeze({ pass: true, inputs: TASK_554_FROZEN_INSTALL_INPUTS });
}
