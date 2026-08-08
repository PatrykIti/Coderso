import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdminAuthStorageState } from "../../../scripts/runtime-smoke/browser/admin-auth";
import {
  extractCliJson,
  parseArgs,
  resolvePlaywrightCliSessionName,
} from "../../../scripts/playwright-widget-contract-smoke";

test("parses debug and target flags without exposing credentials", () => {
  const args = parseArgs([
    "--session",
    "widget-contract-smoke-local",
    "--admin=http://localhost:5173/admin",
    "--front",
    "http://localhost:3000",
    "--widget",
    "hero",
    "--limit=1",
    "--dry-run",
    "--strict",
  ]);

  expect(args).toMatchObject({
    session: "widget-contract-smoke-local",
    adminUrl: "http://localhost:5173/admin",
    frontUrl: "http://localhost:3000",
    widgetType: "hero",
    limit: 1,
    dryRun: true,
    strict: true,
  });
});

test("normalizes long playwright-cli session names for stable browser reuse", () => {
  const longSession =
    "widget-contract-smoke-task-336-19-compare-timeline-advanced-readonly-2026-05-25";
  const resolved = resolvePlaywrightCliSessionName(longSession);
  const specialChars = resolvePlaywrightCliSessionName("widget smoke/task 336");

  expect(resolved.length).toBeLessThanOrEqual(48);
  expect(resolved).toMatch(/^widget-contract-smoke-task-336-19-com-/);
  expect(resolved).toMatch(/-[a-f0-9]{10}$/);
  expect(resolvePlaywrightCliSessionName("ct-adv-ro")).toBe("ct-adv-ro");
  expect(specialChars).toBe("widget-smoke-task-336");
});

test("extracts JSON from the current playwright-cli markdown envelope", () => {
  const parsed = extractCliJson<{ ok: boolean }>(
    [
      "### Result",
      '"{\\"ok\\":true}"',
      "### Ran Playwright code",
      "```js",
      "await fn(page);",
      "```",
    ].join("\n")
  );

  expect(parsed).toEqual({ ok: true });
});

test("shared Admin auth writes one bounded private storage-state file", async () => {
  const root = await mkdtemp(join(tmpdir(), "coderso-widget-auth-"));
  const storageStatePath = join(root, "state.json");
  try {
    const result = await createAdminAuthStorageState({
      adminUrl: "http://localhost:5173/admin",
      workspace: root,
      storageStatePath,
      environment: {
        CODERSO_PLAYWRIGHT_EMAIL: "admin@example.test",
        CODERSO_PLAYWRIGHT_PASSWORD: "private-password",
      },
      fetch: async () =>
        new Response(null, {
          status: 200,
          headers: { "set-cookie": "session=owned-session; Max-Age=3600; HttpOnly" },
        }),
    });

    expect(result).toMatchObject({ attempted: true, authenticated: true });
    expect((await stat(storageStatePath)).mode & 0o777).toBe(0o600);
    const state = JSON.parse(await readFile(storageStatePath, "utf8")) as {
      cookies: Array<{ name: string; value: string }>;
    };
    expect(state.cookies).toMatchObject([{ name: "session", value: "owned-session" }]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("shared Admin auth rejects escaped and symlinked storage-state parents", async () => {
  const root = await mkdtemp(join(tmpdir(), "coderso-widget-auth-root-"));
  const outside = await mkdtemp(join(tmpdir(), "coderso-widget-auth-outside-"));
  const response = () =>
    new Response(null, {
      status: 200,
      headers: { "set-cookie": "session=owned-session; Max-Age=3600; HttpOnly" },
    });
  const base = {
    adminUrl: "http://localhost:5173/admin",
    workspace: root,
    environment: {
      CODERSO_PLAYWRIGHT_EMAIL: "admin@example.test",
      CODERSO_PLAYWRIGHT_PASSWORD: "private-password",
    },
    fetch: async () => response(),
  } as const;
  try {
    await symlink(outside, join(root, "linked-parent"), "dir");
    await expect(
      createAdminAuthStorageState({
        ...base,
        storageStatePath: join(outside, "escaped.json"),
      })
    ).rejects.toMatchObject({ code: "smoke_argument_invalid" });
    await expect(
      createAdminAuthStorageState({
        ...base,
        storageStatePath: join(root, "linked-parent", "state.json"),
      })
    ).rejects.toMatchObject({ code: "smoke_argument_invalid" });
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
