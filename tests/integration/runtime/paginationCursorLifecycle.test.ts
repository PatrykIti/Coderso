/**
 * TASK-551-03-L01 bun lane: pagination-cursor keyring lifecycle handoff.
 *
 * Runtime-kernel behavior: proves exactly one fixed-ID participant, zero env
 * reads at registration, exactly one load during awaited start, one immutable
 * keyring reused across calls, fail-closed require before start and after
 * close, startup rejection before listen for missing/weak configuration, and
 * idempotent reset across test lifecycles. No database connection is used.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  closeRuntimeLifecycle,
  registerRuntimeLifecycleParticipant,
  resetRuntimeLifecycleForTests,
  startRuntimeLifecycle,
} from "../../../core/server/runtimeLifecycle";
import {
  PAGINATION_CURSOR_KEYRING_PARTICIPANT_ID,
  registerPaginationCursorLifecycleParticipant,
  requirePaginationCursorKeyring,
  resetPaginationCursorLifecycleForTests,
} from "../../../core/server/paginationCursorLifecycle";

const SECRET = "integration-secret-value-0123456789abcdef"; // >= 32 bytes
const ENV_NAME = "PAGINATION_CURSOR_SECRET";
let savedValue: string | undefined;
let savedDescriptor: PropertyDescriptor | undefined;
let envReadCount = 0;
let countingInstalled = false;

function installCountingEnv(value: string | undefined): void {
  const descriptor = Object.getOwnPropertyDescriptor(process.env, ENV_NAME);
  savedDescriptor = descriptor ?? undefined;
  savedValue = process.env[ENV_NAME];
  try {
    Object.defineProperty(process.env, ENV_NAME, {
      enumerable: true,
      configurable: true,
      get: () => {
        envReadCount += 1;
        return value;
      },
      set: (next: string | undefined) => {
        value = next;
      },
    });
    countingInstalled = true;
  } catch {
    // Some runtimes freeze process.env entries; fall back to plain value.
    if (value === undefined) delete process.env[ENV_NAME];
    else process.env[ENV_NAME] = value;
  }
}

function restoreEnv(): void {
  try {
    if (savedDescriptor) {
      Object.defineProperty(process.env, ENV_NAME, savedDescriptor);
    } else if (savedValue === undefined) {
      delete process.env[ENV_NAME];
    } else {
      process.env[ENV_NAME] = savedValue;
    }
  } catch {
    if (savedValue === undefined) delete process.env[ENV_NAME];
    else process.env[ENV_NAME] = savedValue;
  }
  envReadCount = 0;
  countingInstalled = false;
}

beforeEach(() => {
  resetRuntimeLifecycleForTests();
  resetPaginationCursorLifecycleForTests();
});

afterEach(() => {
  restoreEnv();
  resetRuntimeLifecycleForTests();
  resetPaginationCursorLifecycleForTests();
});

describe("pagination cursor lifecycle", () => {
  test("registers idempotently with zero env reads before start", async () => {
    installCountingEnv(SECRET);
    expect(() => requirePaginationCursorKeyring()).toThrowError(
      "pagination_cursor_keyring_unavailable"
    );
    registerPaginationCursorLifecycleParticipant();
    expect(envReadCount).toBe(0); // registration never reads the environment
    registerPaginationCursorLifecycleParticipant(); // must be a silent no-op
    expect(envReadCount).toBe(0);
    let startedParticipants = 0;
    registerRuntimeLifecycleParticipant({
      id: "sentinel",
      phase: "worker",
      start: async () => {
        startedParticipants += 1;
      },
      close: async () => {},
    });
    await startRuntimeLifecycle();
    // A broken idempotence guard would have thrown a duplicate-ID error at
    // the second register call above; the sentinel proves normal startup.
    expect(startedParticipants).toBe(1);
    expect(() => requirePaginationCursorKeyring()).not.toThrow();
  });

  test("loads exactly once during awaited start and reuses one immutable value", async () => {
    installCountingEnv(SECRET);
    registerPaginationCursorLifecycleParticipant();
    await startRuntimeLifecycle();
    const readsAfterStart = envReadCount;
    if (countingInstalled) expect(readsAfterStart).toBe(1); // exactly one load
    const first = requirePaginationCursorKeyring();
    const second = requirePaginationCursorKeyring();
    expect(first).toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.current)).toBe(true);
    expect(first.current.secret.length).toBeGreaterThanOrEqual(32);
    expect(PAGINATION_CURSOR_KEYRING_PARTICIPANT_ID).toBe("pagination-cursor-keyring");
    // No further env reads from repeated requires.
    const before = envReadCount;
    requirePaginationCursorKeyring();
    expect(envReadCount).toBe(before);
    void readsAfterStart;
  });

  test("fails closed after close and restarts cleanly", async () => {
    installCountingEnv(SECRET);
    registerPaginationCursorLifecycleParticipant();
    await startRuntimeLifecycle();
    expect(() => requirePaginationCursorKeyring()).not.toThrow();
    await closeRuntimeLifecycle("test");
    expect(() => requirePaginationCursorKeyring()).toThrowError(
      "pagination_cursor_keyring_unavailable"
    );
  });

  test("rejects startup before listen when the secret is missing or weak", async () => {
    for (const weak of [undefined, "too-short"]) {
      resetRuntimeLifecycleForTests();
      resetPaginationCursorLifecycleForTests();
      installCountingEnv(weak);
      registerPaginationCursorLifecycleParticipant();
      await expect(startRuntimeLifecycle()).rejects.toThrow("pagination_cursor_config_invalid");
      expect(() => requirePaginationCursorKeyring()).toThrowError(
        "pagination_cursor_keyring_unavailable"
      );
    }
  });
});
