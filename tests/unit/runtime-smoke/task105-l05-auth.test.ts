import { mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "bun:test";

import { writeAdminSessionStorageState } from "../../../scripts/runtime-smoke/browser/admin-auth";

describe("writeAdminSessionStorageState", () => {
  let workspace = "";

  const write = (
    overrides: Partial<Parameters<typeof writeAdminSessionStorageState>[0]> = {}
  ): Promise<void> =>
    writeAdminSessionStorageState({
      adminUrl: "http://127.0.0.1:5173/task105-fast-r1-admin",
      expectedAdminPath: "/task105-fast-r1-admin",
      workspace,
      storageStatePath: join(workspace, "admin-storage-state.json"),
      sessionValue: "opaque-session-value",
      ...overrides,
    });

  afterAll(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  test("writes one exclusive 0600 storage state with a single session cookie", async () => {
    workspace = await mkdtemp(join(tmpdir(), "task105l05-auth-"));
    const path = join(workspace, "admin-storage-state.json");
    await write();
    const metadata = await stat(path);
    expect(metadata.isFile()).toBe(true);
    expect(metadata.mode & 0o777).toBe(0o600);
    const parsed = JSON.parse(await readFile(path, "utf8")) as {
      cookies: { name: string; value: string; httpOnly: boolean; domain: string }[];
      origins: unknown[];
    };
    expect(parsed.cookies.length).toBe(1);
    expect(parsed.cookies[0]?.name).toBe("session");
    expect(parsed.cookies[0]?.value).toBe("opaque-session-value");
    expect(parsed.cookies[0]?.httpOnly).toBe(true);
    expect(parsed.origins).toEqual([]);
  });

  test("refuses a second exclusive write for the same path", async () => {
    await expect(write()).rejects.toThrow();
  });

  test("refuses a pre-existing symlink without modifying its target", async () => {
    const isolated = await mkdtemp(join(tmpdir(), "task105l05-auth-symlink-"));
    const target = join(isolated, "target.json");
    const storageStatePath = join(isolated, "admin-storage-state.json");
    try {
      await writeFile(target, "target-must-remain-unchanged\n", { mode: 0o600 });
      await symlink(target, storageStatePath);
      await expect(write({ workspace: isolated, storageStatePath })).rejects.toThrow();
      await expect(readFile(target, "utf8")).resolves.toBe("target-must-remain-unchanged\n");
    } finally {
      await rm(isolated, { recursive: true, force: true });
    }
  });

  test("refuses an admin URL that does not match the expected dynamic base", async () => {
    await expect(
      write({
        adminUrl: "http://127.0.0.1:5173/admin",
        storageStatePath: join(workspace, "mismatch.json"),
      })
    ).rejects.toThrow();
  });

  test("refuses non-local or credential-bearing URLs", async () => {
    await expect(
      write({
        adminUrl: "http://example.com/task105-fast-r1-admin",
        storageStatePath: join(workspace, "remote.json"),
      })
    ).rejects.toThrow();
  });

  test("never selects ambient credentials", async () => {
    process.env.CODERSO_PLAYWRIGHT_EMAIL = "ambient@example.com";
    process.env.CODERSO_PLAYWRIGHT_PASSWORD = "ambient-secret";
    try {
      const path = join(workspace, "no-ambient.json");
      await write({ storageStatePath: path });
      const parsed = JSON.parse(await readFile(path, "utf8"));
      const serialized = JSON.stringify(parsed);
      expect(serialized.includes("ambient@example.com")).toBe(false);
      expect(serialized.includes("ambient-secret")).toBe(false);
      expect(parsed.cookies.length).toBe(1);
    } finally {
      delete process.env.CODERSO_PLAYWRIGHT_EMAIL;
      delete process.env.CODERSO_PLAYWRIGHT_PASSWORD;
    }
  });
});
