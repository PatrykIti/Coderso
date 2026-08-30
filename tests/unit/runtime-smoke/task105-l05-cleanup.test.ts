import { describe, expect, test } from "bun:test";

import {
  Task105L05FixtureCleanup,
  runTask105L05AggregateCleanup,
  type Task105L05CleanupDeps,
} from "../../../scripts/runtime-smoke/adapters/task-105-l05/cleanup";
import {
  TASK105_L05_CANONICAL_PERMISSIONS,
  task105L05RoleName,
  task105L05UserEmail,
} from "../../../scripts/runtime-smoke/adapters/task-105-l05/fixture";
import {
  Task105L05SettingsLease,
  validateTask105L05AdminBase,
} from "../../../scripts/runtime-smoke/adapters/task-105-l05/settings-lease";
import type { Task105L05SettingRowIdentity } from "../../../scripts/runtime-smoke/adapters/task-105-l05/settings-lease";

const SESSION = "task105-fast-r1";

function row(key: string, valueJson: string, generation = "1"): Task105L05SettingRowIdentity {
  return Object.freeze({
    key,
    valueJson,
    updatedAt: `2026-08-26T00:00:0${generation}.000Z`,
    xmin: generation,
  });
}

function passingDeps(calls: string[]): Task105L05CleanupDeps {
  return {
    restoreLease: async () => void calls.push("restore"),
    proveSessionIdentity: async () => void calls.push("identity"),
    revokeSession: async () => void calls.push("revoke"),
    deleteRevokedSession: async () => void calls.push("session-delete"),
    proveAbsent: async () => void calls.push("absence"),
    deleteUserWithLink: async () => void calls.push("user-delete"),
    deleteRoleIfOwned: async ({ roleId }) => {
      expect(roleId).toBe("role_1");
      calls.push("role-delete");
    },
    invalidateSiteShellCaches: async () => void calls.push("cache-invalidate"),
  };
}

describe("TASK-105 L05 aggregate cleanup", () => {
  test("executes every ordered step on success", async () => {
    const calls: string[] = [];
    const result = await runTask105L05AggregateCleanup({
      deps: passingDeps(calls),
      ownership: {
        session: SESSION,
        sessionId: "session_1",
        roleId: "role_1",
        roleDescription: `TASK-105 L05 synthetic role for ${SESSION}`,
        roleXmin: "1",
        userId: "user_1",
        tokenHash: "a".repeat(64),
        permissions: TASK105_L05_CANONICAL_PERMISSIONS,
        syntheticNames: [task105L05RoleName(SESSION), task105L05UserEmail(SESSION)],
      },
    });
    expect(result.pass).toBe(true);
    expect(result.failures).toEqual([]);
    expect(calls.indexOf("restore")).toBeLessThan(calls.indexOf("revoke"));
    expect(calls.indexOf("session-delete")).toBeLessThan(calls.indexOf("user-delete"));
    expect(calls.indexOf("user-delete")).toBeLessThan(calls.indexOf("role-delete"));
    expect(calls.indexOf("cache-invalidate")).toBeGreaterThan(calls.indexOf("restore"));
    expect(calls[calls.length - 1]).toBe("absence");
  });

  test("fails closed after session identity proof failure", async () => {
    const calls: string[] = [];
    const deps = passingDeps(calls);
    const failing: Task105L05CleanupDeps = {
      ...deps,
      restoreLease: async () => {
        throw new Error("drift");
      },
      proveSessionIdentity: async () => {
        calls.push("identity");
        throw new Error("identity mismatch");
      },
    };
    const result = await runTask105L05AggregateCleanup({
      deps: failing,
      ownership: {
        session: SESSION,
        sessionId: "session_1",
        roleId: "role_1",
        roleDescription: `TASK-105 L05 synthetic role for ${SESSION}`,
        roleXmin: "1",
        userId: "user_1",
        tokenHash: "a".repeat(64),
        permissions: TASK105_L05_CANONICAL_PERMISSIONS,
        syntheticNames: [],
      },
    });
    expect(result.pass).toBe(false);
    expect(result.failures.map(({ step }) => step)).toContain("settings-lease-restore");
    expect(result.failures.map(({ step }) => step)).toContain("session-identity-proof");
    expect(calls).not.toContain("revoke");
    expect(calls).not.toContain("session-delete");
    expect(calls).not.toContain("user-delete");
    expect(calls).not.toContain("role-delete");
    expect(calls).toContain("absence");
  });

  test("lifecycle resource closes and proves absence once", async () => {
    const calls: string[] = [];
    const resource = new Task105L05FixtureCleanup({
      deps: passingDeps(calls),
      ownership: {
        session: SESSION,
        sessionId: "session_1",
        roleId: "role_1",
        roleDescription: `TASK-105 L05 synthetic role for ${SESSION}`,
        roleXmin: "1",
        userId: "user_1",
        tokenHash: "b".repeat(64),
        permissions: TASK105_L05_CANONICAL_PERMISSIONS,
        syntheticNames: [],
      },
    });
    await expect(resource.close()).resolves.toBeUndefined();
    await expect(resource.proveAbsent()).resolves.toBe(true);
    expect(resource.result()?.pass).toBe(true);
  });
});

describe("TASK-105 L05 settings lease CAS behavior", () => {
  function leaseWith(
    currentRows: Map<string, Task105L05SettingRowIdentity>,
    writes: Task105L05SettingRowIdentity[]
  ): Task105L05SettingsLease {
    return new Task105L05SettingsLease({
      listRows: async (keys) => {
        const out = new Map<string, Task105L05SettingRowIdentity>();
        for (const key of keys) {
          const rowValue = currentRows.get(key);
          if (rowValue !== undefined) out.set(key, rowValue);
        }
        return out;
      },
      writeRow: async (key, valueJson) => {
        const next = row(key, valueJson, String(writes.length + 2));
        writes.push(next);
        currentRows.set(key, next);
        return next;
      },
      deleteRow: async (key) => void currentRows.delete(key),
    });
  }

  test("restores absent baselines by deleting owned rows and refuses drift", async () => {
    const rows = new Map<string, Task105L05SettingRowIdentity>();
    const writes: Task105L05SettingRowIdentity[] = [];
    const lease = leaseWith(rows, writes);
    await lease.snapshotAndApply({ session: SESSION, homepageId: "page_1" });
    expect(rows.get("assistant.enabled")?.valueJson).toBe("true");
    expect(rows.get("site.adminPath")?.valueJson).toBe(JSON.stringify(`/${SESSION}-admin`));
    rows.set("site.navigationMenuId", row("site.navigationMenuId", JSON.stringify("menu_1"), "9"));
    rows.set("site.footerTemplateId", row("site.footerTemplateId", "null", "9"));
    await lease.claimSiteShellRows({ navigationMenuId: "menu_1" });
    // Simulate a concurrent writer stealing a leased row.
    rows.set("assistant.enabled", row("assistant.enabled", "false", "99"));
    await expect(lease.restore()).rejects.toThrow(/drifted/u);
  });

  test("successful restore deletes keys whose baseline was absent", async () => {
    const rows = new Map<string, Task105L05SettingRowIdentity>();
    const writes: Task105L05SettingRowIdentity[] = [];
    const lease = leaseWith(rows, writes);
    await lease.snapshotAndApply({ session: SESSION, homepageId: "page_1" });
    await lease.restore();
    expect(rows.has("assistant.enabled")).toBe(false);
    expect(rows.has("site.adminPath")).toBe(false);
  });

  test("validates the task-local admin base shape", () => {
    expect(validateTask105L05AdminBase(SESSION, `/${SESSION}-admin`)).toBe(`/${SESSION}-admin`);
    expect(() => validateTask105L05AdminBase(SESSION, "/admin")).toThrow();
    expect(() => validateTask105L05AdminBase(SESSION, "/other-base")).toThrow();
    expect(() => validateTask105L05AdminBase(SESSION, `/${SESSION}.admin`)).toThrow();
  });
});
