import { describe, expect, test } from "bun:test";

import {
  WorkerDispatchError,
  WorkerProtocolError,
} from "../../../scripts/runtime-smoke/workers/contracts";
import { projectTask105L05WorkerFailure } from "../../../scripts/runtime-smoke/adapters/task-105-l05/browser-drivers";
import {
  validateTask105L05InstallInput,
  validateTask105L05InstallOutput,
  validateTask105L05SettingsApplyInput,
} from "../../../scripts/runtime-smoke/adapters/task-105-l05/worker-fixture-operations";
import { TASK105_L05_CANONICAL_PERMISSIONS } from "../../../scripts/runtime-smoke/adapters/task-105-l05/fixture";
import { createTask105L05RecoveryAuthority } from "../../../scripts/runtime-smoke/adapters/task-105-l05/recovery-receipt";
import { validateTask105L05RecoveryAuthorityInput } from "../../../scripts/runtime-smoke/adapters/task-105-l05/worker-recovery-operations";
import {
  TASK105_L05_WORKER_DESCRIPTORS,
  TASK105_L05_WORKER_OPERATION_IDS,
  createTask105L05WorkerRegistry,
  projectTask105L05WorkerEnvironment,
} from "../../../scripts/runtime-smoke/adapters/task-105-l05/worker-operations";

const SENTINEL = "TASK105_L05_WORKER_PRIVATE_SENTINEL";
const SESSION = "task105-fast-r1";
const AUTHORITY = createTask105L05RecoveryAuthority({
  profile: "fast",
  session: SESSION,
  runMarker: "123456789abc",
  recoveryKey: "C".repeat(43),
});

const INSTALL_INPUT = Object.freeze({
  authority: AUTHORITY,
  session: SESSION,
  workspacePath: "/tmp/task105-workspace",
  storageStatePath: "/tmp/task105-workspace/admin-storage-state.json",
  adminBase: `/${SESSION}-admin`,
  expectedAdminPath: `/${SESSION}-admin`,
});

const INSTALL_OUTPUT = Object.freeze({
  roleId: "role_1",
  userId: "user_1",
  permissions: [...TASK105_L05_CANONICAL_PERMISSIONS],
  userRoleLink: Object.freeze({ userId: "user_1", roleId: "role_1" }),
  fixturePage: Object.freeze({
    id: "page_1",
    title: `TASK-105 L05 homepage ${SESSION}`,
    slug: `task-105-l05-${SESSION}-home`,
    relativePath: `/task-105-l05-${SESSION}-home`,
  }),
  storageStatePath: "/tmp/task105-workspace/admin-storage-state.json",
});

function privateFailure(): Error {
  const cause = new Error(`${SENTINEL}: cause`);
  cause.stack = `${SENTINEL}: cause stack`;
  const failure = new Error(`${SENTINEL}: message`, { cause });
  failure.stack = `${SENTINEL}: stack`;
  Object.assign(failure, { tokenHash: SENTINEL });
  return failure;
}

describe("TASK-105 L05 worker operation boundary", () => {
  test("registers only the closed descriptor set and its retry classes", () => {
    const registry = createTask105L05WorkerRegistry();

    expect(registry.ids()).toEqual([...TASK105_L05_WORKER_OPERATION_IDS].sort());
    expect(TASK105_L05_WORKER_DESCRIPTORS.install.retryClass).toBe("mutation");
    expect(TASK105_L05_WORKER_DESCRIPTORS.settingsApply.retryClass).toBe("mutation");
    expect(TASK105_L05_WORKER_DESCRIPTORS.settingsRestore.retryClass).toBe("mutation");
    expect(TASK105_L05_WORKER_DESCRIPTORS.recover.retryClass).toBe("mutation");
    expect(TASK105_L05_WORKER_DESCRIPTORS.proveAbsent.retryClass).toBe("idempotent-read");
    expect(() => registry.validateDescriptor(TASK105_L05_WORKER_DESCRIPTORS.recover)).not.toThrow();
  });

  test("projects the fixed worker environment allowlist by key only", () => {
    const environment = projectTask105L05WorkerEnvironment({
      PATH: "/usr/bin",
      DATABASE_URL: "private-database-url",
      AUTH_PASSWORD_PEPPER: "private-pepper",
      PII_HASH_KEY: "private-hash-key",
      PII_ENC_KEY: "private-encryption-key",
      UNRELATED_PRIVATE_VALUE: SENTINEL,
    });

    const keys = Object.keys(environment).sort();
    expect(keys).toEqual([
      "AUTH_PASSWORD_PEPPER",
      "DATABASE_URL",
      "DB_POOL_MAX",
      "PATH",
      "PII_ENC_KEY",
      "PII_HASH_KEY",
    ]);
    expect(JSON.stringify(keys)).not.toContain(SENTINEL);
  });

  test("requires private authority and rejects unknown worker-frame fields", () => {
    expect(validateTask105L05InstallInput(INSTALL_INPUT)).toMatchObject({
      authority: AUTHORITY,
      session: SESSION,
    });
    expect(() => validateTask105L05InstallInput({ ...INSTALL_INPUT, extra: SENTINEL })).toThrow();
    expect(() =>
      validateTask105L05SettingsApplyInput({
        authority: AUTHORITY,
        operation: "apply",
        rows: [],
        extra: SENTINEL,
      })
    ).toThrow();
    expect(validateTask105L05RecoveryAuthorityInput({ authority: AUTHORITY })).toEqual({
      authority: AUTHORITY,
    });
    expect(() =>
      validateTask105L05RecoveryAuthorityInput({ authority: AUTHORITY, tokenHash: SENTINEL })
    ).toThrow();
  });

  test("accepts only sanitized install facts and never emits a token hash", () => {
    const output = validateTask105L05InstallOutput(INSTALL_OUTPUT);

    expect(output).toMatchObject({
      roleId: "role_1",
      userId: "user_1",
      fixturePage: { id: "page_1" },
    });
    expect(JSON.stringify(output)).not.toContain("tokenHash");
    expect(() =>
      validateTask105L05InstallOutput({ ...INSTALL_OUTPUT, tokenHash: SENTINEL })
    ).toThrow();
    expect(() =>
      validateTask105L05InstallOutput({ ...INSTALL_OUTPUT, roleDescription: SENTINEL })
    ).toThrow();
  });

  test("projects every worker phase without leaking message, cause, stack, or token hash", () => {
    const phases = [
      "spawn",
      "protocol",
      "install",
      "settings_apply",
      "settings_restore",
      "close",
    ] as const;

    for (const phase of phases) {
      const privateError = privateFailure();
      const source =
        phase === "protocol"
          ? new WorkerProtocolError(privateError.message, { cause: privateError })
          : phase === "spawn"
            ? new WorkerDispatchError(privateError.message, false, { cause: privateError })
            : privateError;
      const projected = projectTask105L05WorkerFailure(phase, source);
      const publicText = JSON.stringify({
        code: projected.code,
        message: projected.message,
        stack: projected.stack,
        cause: projected.cause,
      });

      expect(publicText).not.toContain(SENTINEL);
      expect(projected.message).toContain(`worker ${phase} failed`);
      if (phase === "close") expect(projected.message).toContain("worker_close_failed");
    }
  });
});
