// Browser output normalization and screenshot identity authority for the TASK-540 smoke executor.
//
// Owns the private native snapshot registration authority, the exact native browser output
// descriptor registry and its plan cross-check, the browser command output normalizer, the
// screenshot acquisition/removal identity authority and the browser session teardown proofs.
import { constants as fsConstants } from "node:fs";
import { lstat, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";

import { buildFailureCleanupRoutesSource } from "../browser/route-and-action-sources.mjs";
import { runCode } from "../browser/run-code.mjs";
import { MAX_STREAM_BYTES, SESSION_NAME } from "./config.mjs";
import { deepFreezeExact, exactOwnKeys, hashBytes, invariant } from "./foundation.mjs";
import {
  consumeExactTabRow,
  decodeExactNativeUtf8,
  expectedNativeTabRows,
} from "./output-parser.mjs";
import {
  privateWorkspaceRootDevice,
  projectArtifactIdentity,
  readStableArtifactIdentity,
  registerWorkspaceArtifact,
  requireMissingPath,
  sameArtifactIdentity,
} from "./private-workspace.mjs";
import { deepEqualJson } from "./resource-contracts.mjs";

export function privateNativeSnapshotSizeIsValid(size, allowEmpty) {
  return (
    Number.isSafeInteger(size) &&
    typeof allowEmpty === "boolean" &&
    size >= (allowEmpty ? 0 : 1) &&
    size <= MAX_STREAM_BYTES
  );
}

export async function registerPrivateNativeSnapshot(state, token, label, { allowEmpty = false } = {}) {
  invariant(
    /^\.\.\/output\/page-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{3}Z\.yml$/u.test(
      token
    ) &&
      !token.includes("%") &&
      !token.includes("\\"),
    label + " snapshot token is invalid"
  );
  const absolute = path.resolve(state.browserWorkspace.cwd, token);
  invariant(
    absolute.startsWith(state.browserWorkspace.outputDir + path.sep) &&
      path.dirname(absolute) === state.browserWorkspace.outputDir,
    label + " snapshot escaped the private output directory"
  );
  const identity = await readStableArtifactIdentity(absolute, {
    expectedType: "file",
    expectedDev: privateWorkspaceRootDevice(state.browserWorkspace.ledger),
  });
  invariant(
    privateNativeSnapshotSizeIsValid(identity.size, allowEmpty),
    label + " snapshot size is invalid"
  );
  registerWorkspaceArtifact(state.browserWorkspace.ledger, absolute, identity);
  invariant(!state.nativeSnapshots.has(absolute), label + " snapshot path was reused");
  state.nativeSnapshots.set(absolute, identity);
  return token;
}

export async function acquireScreenshotIdentity(state, action, plan) {
  const relative = plan.registries.screenshotPaths[action.executable.screenshotId];
  const absolute = path.resolve(state.root, relative);
  invariant(
    absolute.startsWith(state.root + path.sep) && path.relative(state.root, absolute) === relative,
    action.id + " screenshot path escaped the repository"
  );
  const handle = await open(absolute, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  let descriptorIdentity;
  let bytes;
  try {
    descriptorIdentity = projectArtifactIdentity(await handle.stat());
    invariant(
      descriptorIdentity.type === "file" &&
        descriptorIdentity.size > 8 &&
        descriptorIdentity.size <= MAX_STREAM_BYTES,
      action.id + " screenshot descriptor identity drift"
    );
    bytes = await handle.readFile();
    const after = projectArtifactIdentity(await handle.stat());
    invariant(
      sameArtifactIdentity(descriptorIdentity, after, { includeSize: true }) &&
        bytes.length === after.size,
      action.id + " screenshot changed during read"
    );
  } finally {
    await handle.close();
  }
  const pathIdentity = await readStableArtifactIdentity(absolute, {
    expectedType: "file",
    expectedDev: descriptorIdentity.dev,
  });
  invariant(
    sameArtifactIdentity(descriptorIdentity, pathIdentity, { includeSize: true }),
    action.id + " screenshot path/descriptor identity drift"
  );
  invariant(
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    action.id + " screenshot is not PNG"
  );
  invariant(!state.screenshots.has(relative), action.id + " screenshot was acquired twice");
  state.screenshots.set(relative, {
    relative,
    absolute,
    dev: descriptorIdentity.dev,
    ino: descriptorIdentity.ino,
    mode: descriptorIdentity.mode,
    size: descriptorIdentity.size,
    sha256: hashBytes(bytes),
  });
}

export async function removeAcquiredScreenshots(state) {
  for (const relative of state.plan.requiredScreenshotPaths) {
    if (state.screenshots.has(relative)) continue;
    const absolute = path.resolve(state.root, relative);
    try {
      await lstat(absolute);
      invariant(false, "unowned screenshot path remains after failed acquisition");
    } catch (error) {
      invariant(error && error.code === "ENOENT", "unowned screenshot identity cannot be removed");
    }
  }
  for (const record of [...state.screenshots.values()].reverse()) {
    const current = await readStableArtifactIdentity(record.absolute, {
      expectedType: "file",
      expectedDev: record.dev,
    });
    invariant(
      current.ino === record.ino && current.mode === record.mode && current.size === record.size,
      "acquired screenshot identity changed before failure removal"
    );
    await unlink(record.absolute);
    await requireMissingPath(record.absolute, "removed acquired screenshot");
  }
  state.screenshots.clear();
}

export function createBrowserOutputAuthority(dependencies) {
  // The process identity reader and the private process runner belong to the process runtime the
  // facade composes, so they arrive as injected dependencies and every declaration below closes
  // over those exact values instead of a rebindable module slot.
  exactOwnKeys(
    dependencies,
    ["readProcIdentity", "runPrivateProcess"],
    "browser output authority dependencies",
    { plain: true }
  );
  invariant(
    Object.values(dependencies).every((dependency) => typeof dependency === "function"),
    "browser output authority dependencies are not callable"
  );
  const { readProcIdentity, runPrivateProcess } = dependencies;

  const NATIVE_OUTPUT_DESCRIPTOR_REGISTRY = deepFreezeExact({
    "open-about-blank": {
      actionIds: ["set-005-open"],
      async parse({ state, action, text }) {
        const prefix = "### Browser `wf540smoke` opened with pid ";
        const middle = ".\n### Page\n- Page URL: about:blank\n### Snapshot\n- [Snapshot](";
        invariant(
          text.startsWith(prefix) && text.endsWith(")\n"),
          action.id + " native open frame drift"
        );
        const middleIndex = text.indexOf(middle, prefix.length);
        invariant(
          middleIndex !== -1 && text.indexOf(middle, middleIndex + 1) === -1,
          action.id + " native open section drift"
        );
        const pidText = text.slice(prefix.length, middleIndex);
        invariant(/^[1-9][0-9]*$/u.test(pidText), action.id + " browser PID token drift");
        const pid = Number(pidText);
        invariant(Number.isSafeInteger(pid) && pid > 1, action.id + " browser PID is invalid");
        const snapshot = text.slice(middleIndex + middle.length, -2);
        await registerPrivateNativeSnapshot(state, snapshot, action.id, { allowEmpty: true });
        const identity = await readProcIdentity(pid);
        const environmentBytes = await readFile(`/proc/${pid}/environ`);
        invariant(
          environmentBytes.includes(
            Buffer.from(`XDG_CACHE_HOME=${path.join(state.browserWorkspace.root, "xdg", "cache")}\0`)
          ),
          action.id + " browser process is outside the private authority root"
        );
        invariant(!state.browserProcessIdentities.has(pid), action.id + " browser PID was reused");
        state.browserProcessIdentities.set(pid, deepFreezeExact(identity));
        return Buffer.from('{"ok":true}\n');
      },
    },
    "fill-secret": {
      actionIds: [
        "set-009-login-email",
        "set-010-login-password",
        "ru-042-a-password",
        "ru-068-b-password",
        "ru-078-a2-password",
        "ru-092-b2-password",
        "ru-104-a3-password",
      ],
      async parse({ action, text }) {
        invariant(text === "\n", action.id + " native secret fill stdout drift");
        return Buffer.from('{"ok":true}\n');
      },
    },
    "tab-new": {
      actionIds: ["rc-019-related-tab-new"],
      async parse({ state, action, text }) {
        let offset = 0;
        for (const expected of expectedNativeTabRows(action, state)) {
          offset = consumeExactTabRow(text, offset, expected, action.id).nextOffset;
        }
        const snapshotPrefix = "- [Snapshot](";
        invariant(
          text.startsWith(snapshotPrefix, offset) && text.endsWith(")\n"),
          action.id + " tab-new snapshot row drift"
        );
        const snapshot = text.slice(offset + snapshotPrefix.length, -2);
        await registerPrivateNativeSnapshot(state, snapshot, action.id);
        return Buffer.from('{"ok":true}\n');
      },
    },
    "tab-select": {
      actionIds: ["rc-022-related-tab-origin", "rc-045-origin-proof"],
      async parse({ state, action, text }) {
        let offset = 0;
        for (const expected of expectedNativeTabRows(action, state)) {
          offset = consumeExactTabRow(text, offset, expected, action.id).nextOffset;
        }
        invariant(offset === text.length, action.id + " tab-select has extra bytes");
        return Buffer.from('{"ok":true}\n');
      },
    },
    "tab-close": {
      actionIds: ["rc-044-close-second-tab"],
      async parse({ state, action, text }) {
        let offset = 0;
        for (const expected of expectedNativeTabRows(action, state)) {
          offset = consumeExactTabRow(text, offset, expected, action.id).nextOffset;
        }
        invariant(offset === text.length, action.id + " tab-close has extra bytes");
        return Buffer.from('{"ok":true}\n');
      },
    },
    "route-list": {
      actionIds: ["end-002-route-list"],
      async parse({ action, text, bytes }) {
        invariant(text === "No active routes\n", action.id + " route-list stdout drift");
        return bytes;
      },
    },
    close: {
      actionIds: ["end-006-close"],
      async parse({ action, text, bytes }) {
        invariant(text === "Browser 'wf540smoke' closed\n\n", action.id + " close stdout drift");
        return bytes;
      },
    },
  });

  function validateNativeDescriptorRegistry(plan) {
    invariant(
      deepEqualJson(
        Object.keys(NATIVE_OUTPUT_DESCRIPTOR_REGISTRY).sort(),
        Object.keys(plan.registries.browserNativeOperations).sort()
      ),
      "native parser registry key-set drift"
    );
    for (const [operationId, descriptor] of Object.entries(NATIVE_OUTPUT_DESCRIPTOR_REGISTRY)) {
      invariant(
        deepEqualJson(
          [...descriptor.actionIds].sort(),
          [...plan.registries.browserNativeOperations[operationId].actionIds].sort()
        ),
        operationId + " native parser action-set drift"
      );
    }
  }

  async function normalizeBrowserCommandOutput(state, action, executable, bytes, invocation) {
    const text = decodeExactNativeUtf8(bytes, action.id + " browser output");
    invariant(
      !text.startsWith("### Error\n") && !text.includes("\n### Error\n"),
      action.id + " browser command reported an error"
    );
    if (executable.type === "browser-run-code") {
      invariant(
        text.endsWith("\n") && text.length > 1 && !text.slice(0, -1).includes("\n"),
        action.id + " run-code output frame drift"
      );
      return bytes;
    }
    if (executable.type === "browser-global-list") {
      invariant(
        action.id === "end-007-session-absence" && text === "  (no browsers)\n",
        action.id + " global list stdout drift"
      );
      invariant(
        state.terminalSessionAbsenceSha256 === null,
        "terminal session absence was assigned twice"
      );
      state.terminalSessionAbsenceSha256 = hashBytes(bytes);
      return bytes;
    }
    if (executable.type === "browser-screenshot") {
      const expectedPath = invocation.args[invocation.args.indexOf("--filename") + 1];
      invariant(
        typeof expectedPath === "string" &&
          !expectedPath.includes("%") &&
          !expectedPath.includes("\\"),
        action.id + " screenshot argv path drift"
      );
      invariant(
        text === "- [Screenshot of full page](" + expectedPath + ")\n" &&
          executable.fullPage === true,
        action.id + " screenshot stdout drift"
      );
      return Buffer.from("true\n");
    }
    invariant(executable.type === "browser-native", action.id + " browser output type drift");
    const descriptor = NATIVE_OUTPUT_DESCRIPTOR_REGISTRY[executable.operationId];
    invariant(
      descriptor !== undefined && descriptor.actionIds.includes(action.id),
      action.id + " native descriptor binding drift"
    );
    return descriptor.parse({ state, action, executable, bytes, text, invocation });
  }

  async function closeBrowserIfPresent(state) {
    if (!state.browserMayExist || state.browserClosed) return;
    try {
      const output = await runPrivateProcess({
        file: "playwright-cli",
        args: ["-s=" + SESSION_NAME, "--raw", "close"],
        cwd: state.browserWorkspace.cwd,
        env: state.browserWorkspace.environment,
        stdin: Buffer.alloc(0),
        timeoutMs: 90_000,
      });
      invariant(
        output.equals(Buffer.from("Browser '" + SESSION_NAME + "' closed\n\n")),
        "browser close stdout drift"
      );
    } finally {
      state.browserClosed = true;
    }
  }

  async function releaseFailureRoutesIfPresent(state) {
    if (!state.browserMayExist || state.browserClosed) return;
    const output = await runPrivateProcess({
      file: "playwright-cli",
      args: runCode(buildFailureCleanupRoutesSource()),
      cwd: state.browserWorkspace.cwd,
      env: state.browserWorkspace.environment,
      stdin: Buffer.alloc(0),
      timeoutMs: 90_000,
    });
    invariant(output.equals(Buffer.from("true\n")), "failure route cleanup stdout drift");
  }

  async function proveBrowserSessionAbsent(state) {
    const output = await runPrivateProcess({
      file: "playwright-cli",
      args: ["--raw", "list"],
      cwd: state.browserWorkspace.cwd,
      env: state.browserWorkspace.environment,
      stdin: Buffer.alloc(0),
      timeoutMs: 90_000,
    });
    invariant(
      output.equals(Buffer.from("  (no browsers)\n")),
      "browser session absence stdout drift"
    );
  }

  return Object.freeze({
    closeBrowserIfPresent,
    normalizeBrowserCommandOutput,
    proveBrowserSessionAbsent,
    releaseFailureRoutesIfPresent,
    validateNativeDescriptorRegistry,
  });
}
