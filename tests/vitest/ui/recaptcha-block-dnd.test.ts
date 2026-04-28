// @vitest-environment happy-dom

import { afterEach, expect, test, vi } from "vitest";

const originalFetch = globalThis.fetch;
let appendedScript: HTMLScriptElement | null = null;

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  document.head.innerHTML = "";
  delete (window as Window & { grecaptcha?: unknown }).grecaptcha;
  globalThis.fetch = originalFetch;
  appendedScript = null;
});

test("executeRecaptcha uses the existing grecaptcha client without loading a script", async () => {
  const execute = vi.fn(async () => "token-1");
  (window as Window & {
    grecaptcha?: { execute: (siteKey: string, options: { action: string }) => Promise<string> };
  }).grecaptcha = { execute };

  const { executeRecaptcha } = await import(
    "../../../core/admin/ui/auth/recaptcha"
  );

  await expect(executeRecaptcha("site-key", "login")).resolves.toBe("token-1");
  expect(document.head.querySelector("script")).toBeNull();
  expect(execute).toHaveBeenCalledWith("site-key", { action: "login" });
});

test("executeRecaptcha loads the script before executing", async () => {
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    appendedScript = node as HTMLScriptElement;
    return node;
  });
  const { executeRecaptcha } = await import(
    "../../../core/admin/ui/auth/recaptcha"
  );
  const execute = vi.fn(async () => "token-2");

  const promise = executeRecaptcha("site-key", "signup");

  expect(appendedScript?.getAttribute("src")).toContain(
    "https://www.google.com/recaptcha/api.js?render=site-key"
  );

  (window as Window & {
    grecaptcha?: { execute: (siteKey: string, options: { action: string }) => Promise<string> };
  }).grecaptcha = { execute };

  (appendedScript as unknown as EventTarget | null)?.dispatchEvent(new Event("load"));

  await expect(promise).resolves.toBe("token-2");
  expect(execute).toHaveBeenCalledWith("site-key", { action: "signup" });
});

test("executeRecaptcha rejects when the script load fails or grecaptcha is unavailable", async () => {
  {
    vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
      appendedScript = node as HTMLScriptElement;
      return node;
    });
    const { executeRecaptcha } = await import(
      "../../../core/admin/ui/auth/recaptcha"
    );

    const promise = executeRecaptcha("site-key", "login");
    (appendedScript as unknown as EventTarget | null)?.dispatchEvent(new Event("error"));

    await expect(promise).rejects.toThrow("recaptcha_load_failed");
  }

  vi.resetModules();
  document.head.innerHTML = "";
  delete (window as Window & { grecaptcha?: unknown }).grecaptcha;
  appendedScript = null;
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    appendedScript = node as HTMLScriptElement;
    return node;
  });

  const { executeRecaptcha } = await import(
    "../../../core/admin/ui/auth/recaptcha"
  );

  const secondPromise = executeRecaptcha("site-key", "login");
  (appendedScript as unknown as EventTarget | null)?.dispatchEvent(new Event("load"));

  await expect(secondPromise).rejects.toThrow("recaptcha_unavailable");
});

test("block drag helpers clamp indexes, resolve pointer drops, and reorder items", async () => {
  const {
    clampDropIndex,
    reorderItemsById,
    resolveDropIndexFromPointer,
  } = await import("../../../core/admin/ui/posts/editor/blocks/blockDnD");

  expect(clampDropIndex(Number.NaN, 3)).toBe(0);
  expect(clampDropIndex(-1, 3)).toBe(0);
  expect(clampDropIndex(99, 3)).toBe(3);
  expect(clampDropIndex(1.7, 3)).toBe(2);
  expect(clampDropIndex(1, 0)).toBe(0);

  expect(
    resolveDropIndexFromPointer(2, Number.NaN, { top: 0, height: 50 })
  ).toBe(2);
  expect(
    resolveDropIndexFromPointer(2, 10, { top: 0, height: 50 })
  ).toBe(2);
  expect(
    resolveDropIndexFromPointer(2, 40, { top: 0, height: 50 })
  ).toBe(3);

  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  expect(reorderItemsById(items, "missing", 1)).toBe(items);
  expect(reorderItemsById(items, "a", 1)).toBe(items);
  expect(reorderItemsById(items, "a", 3)).toEqual([
    { id: "b" },
    { id: "c" },
    { id: "a" },
  ]);
  expect(reorderItemsById(items, "c", 0)).toEqual([
    { id: "c" },
    { id: "a" },
    { id: "b" },
  ]);
});
