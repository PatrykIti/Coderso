// @vitest-environment happy-dom

import { beforeEach, expect, test, vi } from "vitest";

import type {
  executeRecaptcha as ExecuteRecaptchaFn,
  preloadRecaptcha as PreloadRecaptchaFn,
} from "../../../core/admin/ui/auth/recaptcha";

declare global {
  interface Window {
    grecaptcha?: {
      ready?: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

type RecaptchaModule = {
  executeRecaptcha: typeof ExecuteRecaptchaFn;
  preloadRecaptcha: typeof PreloadRecaptchaFn;
};

let headAppendChild: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  delete window.grecaptcha;
  headAppendChild?.mockRestore();
  headAppendChild = vi
    .spyOn(document.head, "appendChild")
    .mockImplementation((node) => node as unknown as Node);
});

// The module keeps `scriptPromise`/`scriptSiteKey` at module scope, so every
// test imports a fresh module instance to reset that state.
const freshModule = async (): Promise<RecaptchaModule> => {
  vi.resetModules();
  return import("../../../core/admin/ui/auth/recaptcha");
};

const triggerScriptLoad = (script: HTMLElement, failed = false) => {
  const element = script as unknown as HTMLScriptElement & {
    onload?: () => void;
    onerror?: () => void;
  };
  if (failed) {
    element.onerror?.();
  } else {
    element.onload?.();
  }
};

test("preloadRecaptcha throws on a missing site key", async () => {
  const { preloadRecaptcha } = await freshModule();
  await expect(preloadRecaptcha("  ")).rejects.toThrow("recaptcha_site_key_missing");
  expect(headAppendChild).not.toHaveBeenCalled();
});

test("preloadRecaptcha skips the script when grecaptcha already exposes execute", async () => {
  window.grecaptcha = {
    execute: vi.fn(async () => "token"),
  };
  const { preloadRecaptcha } = await freshModule();
  await preloadRecaptcha("site-key-1");
  expect(headAppendChild).not.toHaveBeenCalled();
});

test("preloadRecaptcha loads the script and resolves when ready is absent", async () => {
  const { preloadRecaptcha } = await freshModule();
  const promise = preloadRecaptcha("site-key-1");

  expect(headAppendChild).toHaveBeenCalledTimes(1);
  const script = headAppendChild.mock.calls[0]![0] as unknown as HTMLScriptElement;
  expect(script.src).toContain("recaptcha/api.js?render=site-key-1");
  expect(script.async).toBe(true);
  expect(script.defer).toBe(true);

  // grecaptcha gets set after the script loads; `ready` is absent so the
  // wait resolves immediately once execute exists.
  window.grecaptcha = { execute: vi.fn(async () => "token") };
  triggerScriptLoad(script as unknown as HTMLElement);
  await promise;
});

test("preloadRecaptcha reuses the in-flight script promise for the same site key", async () => {
  const { preloadRecaptcha } = await freshModule();
  const first = preloadRecaptcha("site-key-1");
  const second = preloadRecaptcha("site-key-1");
  expect(headAppendChild).toHaveBeenCalledTimes(1);

  window.grecaptcha = { execute: vi.fn(async () => "token") };
  const script = headAppendChild.mock.calls[0]![0] as unknown as HTMLElement;
  triggerScriptLoad(script);
  await Promise.all([first, second]);
});

test("preloadRecaptcha reloads the script after a load failure", async () => {
  const { preloadRecaptcha } = await freshModule();
  const first = preloadRecaptcha("site-key-1").catch((error: unknown) => error);

  const firstScript = headAppendChild.mock.calls[0]![0] as unknown as HTMLElement;
  triggerScriptLoad(firstScript, true);
  await expect(first).resolves.toBeInstanceOf(Error);

  const second = preloadRecaptcha("site-key-1").catch((error: unknown) => error);
  expect(headAppendChild).toHaveBeenCalledTimes(2);
  const secondScript = headAppendChild.mock.calls[1]![0] as unknown as HTMLElement;
  window.grecaptcha = { execute: vi.fn(async () => "token") };
  triggerScriptLoad(secondScript);
  await expect(second).resolves.toBeUndefined();
});

test("preloadRecaptcha waits for grecaptcha.ready before resolving", async () => {
  const { preloadRecaptcha } = await freshModule();
  // The callback is assigned inside `grecaptcha.ready`, which TS flow analysis
  // does not track; assert the declared union so `readyCallback?.()` below is
  // not narrowed to `never`.
  let readyCallback: (() => void) | null = null as (() => void) | null;
  const promise = preloadRecaptcha("site-key-1");

  const script = headAppendChild.mock.calls[0]![0] as unknown as HTMLElement;
  window.grecaptcha = {
    execute: vi.fn(async () => "token"),
    ready: (callback: () => void) => {
      readyCallback = callback;
    },
  };
  triggerScriptLoad(script);

  let settled = false;
  promise.then(() => {
    settled = true;
  });
  await Promise.resolve();
  expect(settled).toBe(false);

  readyCallback?.();
  await promise;
  expect(settled).toBe(true);
});

test("preloadRecaptcha rejects when grecaptcha never becomes available", async () => {
  const { preloadRecaptcha } = await freshModule();
  const promise = preloadRecaptcha("site-key-1").catch((error: unknown) => error);
  const script = headAppendChild.mock.calls[0]![0] as unknown as HTMLElement;
  triggerScriptLoad(script);
  await expect(promise).resolves.toBeInstanceOf(Error);
  await expect(promise).resolves.toMatchObject({ message: "recaptcha_unavailable" });
});

test("executeRecaptcha returns the grecaptcha token for the action", async () => {
  const { executeRecaptcha } = await freshModule();
  const execute = vi.fn(async () => "signed-token");
  window.grecaptcha = { execute };

  const token = await executeRecaptcha("  site-key-1  ", "login");

  expect(token).toBe("signed-token");
  expect(execute).toHaveBeenCalledWith("site-key-1", { action: "login" });
});

test("executeRecaptcha trims and rejects an empty site key", async () => {
  const { executeRecaptcha } = await freshModule();
  await expect(executeRecaptcha("   ", "login")).rejects.toThrow("recaptcha_site_key_missing");
});
