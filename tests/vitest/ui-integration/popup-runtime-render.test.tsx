// @vitest-environment happy-dom

import { beforeEach, describe, expect, test } from "vitest";

import type { PublicPopup } from "../../../core/services/popups/popupPublicContract";
import type {
  FrequencyEnv,
  ShownRecord,
} from "../../../core/services/popups/runtime/frequencyGate";
import { createPopupRuntime } from "../../../core/services/popups/runtime/popupRuntime";
import { renderPopup } from "../../../core/services/popups/runtime/renderPopup";
import type { TriggerEnv } from "../../../core/services/popups/runtime/triggerWatchers";

const publicPopup = (overrides: Partial<PublicPopup> = {}): PublicPopup => ({
  id: "popup-1",
  slug: "welcome",
  trigger: { type: "time_delay", delaySeconds: 1 },
  frequency: { strategy: "session_once", cooldownMinutes: null },
  content: { title: "Welcome", body: "Hello there", ctaLabel: "Go", ctaHref: "/go" },
  settings: { placement: "center", dismissible: true, showOverlay: true },
  ...overrides,
});

/**
 * Fake clock + trigger + frequency envs backed by one shared storage map. The
 * clock owns the setTimeout queue, so `advance(ms)` fires due watchers
 * deterministically in registration order, mirroring how the served runtime
 * would observe real time. Storage is JSON-serialized per popup id, the same
 * shape the served runtime would keep in localStorage.
 */
const makeFakeEnvs = (store: Map<string, string>) => {
  let nowMs = 0;
  let timerSeq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const listeners = new Map<string, (e: unknown) => void>();

  const advance = (ms: number) => {
    nowMs += ms;
    const due = [...timers.entries()]
      .filter(([, t]) => t.at <= nowMs)
      .sort((a, b) => a[1].at - b[1].at);
    for (const [id, t] of due) {
      if (!timers.has(id)) continue; // disposed by an earlier fire
      timers.delete(id);
      t.fn();
    }
  };

  const trigger: TriggerEnv = {
    now: () => nowMs,
    setTimeout: (fn, ms) => {
      const id = ++timerSeq;
      timers.set(id, { at: nowMs + ms, fn });
      return id;
    },
    clearTimeout: (handle) => {
      timers.delete(handle as number);
    },
    addEventListener: (type, fn) => {
      listeners.set(type, fn);
    },
    removeEventListener: (type, fn) => {
      if (listeners.get(type) === fn) listeners.delete(type);
    },
    scrollMetrics: () => ({ y: 0, viewport: 800, full: 2400 }),
    matches: () => false,
  };

  const frequency: FrequencyEnv = {
    now: () => nowMs,
    sessionId: "session-a",
    getRecord: (popupId) => {
      const raw = store.get(popupId);
      return raw ? (JSON.parse(raw) as ShownRecord) : null;
    },
    setRecord: (popupId, rec) => {
      store.set(popupId, JSON.stringify(rec));
    },
  };

  return { clock: { advance }, trigger, frequency, listeners };
};

type FakeEnvs = ReturnType<typeof makeFakeEnvs>;

const makeRuntime = (env: FakeEnvs, popups: PublicPopup[]) =>
  createPopupRuntime({
    currentPath: () => "/",
    fetchPopups: async () => popups,
    triggerEnv: env.trigger,
    frequencyEnv: env.frequency,
    render: (popup) => renderPopup(popup, { document }),
  });

const startAndFire = async (env: FakeEnvs, popups: PublicPopup[], ms = 1000) => {
  const runtime = makeRuntime(env, popups);
  await runtime.start();
  env.clock.advance(ms);
  return runtime;
};

describe("popup runtime + render integration", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("fetch ⇒ time_delay fire ⇒ rendered once and recorded; re-start is frequency-suppressed", async () => {
    const store = new Map<string, string>();
    const env = makeFakeEnvs(store);
    const runtime = makeRuntime(env, [publicPopup()]);

    await runtime.start();
    expect(document.querySelectorAll("[data-coderso-popup]")).toHaveLength(0);
    expect(store.size).toBe(0);

    env.clock.advance(1000);
    expect(document.querySelectorAll("[data-coderso-popup]")).toHaveLength(1);

    const recorded = store.get("popup-1");
    expect(recorded).toBeDefined();
    expect(JSON.parse(recorded as string)).toEqual({ lastShownMs: 1000, sessionId: "session-a" });

    // SPA-style re-start: stop() resets the latch, start() re-fetches, but the
    // session_once record blocks re-arming, so nothing re-renders or re-records.
    runtime.stop();
    await runtime.start();
    env.clock.advance(1000);
    expect(document.querySelectorAll("[data-coderso-popup]")).toHaveLength(1);
    expect(store.size).toBe(1);
  });

  test("authored title/body/CTA flow from fetch through render into the DOM", async () => {
    const env = makeFakeEnvs(new Map());
    await startAndFire(env, [
      publicPopup({
        content: {
          title: "Spring Sale",
          body: "20% off everything",
          ctaLabel: "Shop",
          ctaHref: "/sale",
        },
      }),
    ]);

    const root = document.querySelector("[data-coderso-popup]");
    expect(root?.querySelector("h2")?.textContent).toBe("Spring Sale");
    expect(root?.querySelector("p")?.textContent).toBe("20% off everything");
    const cta = root?.querySelector("a");
    expect(cta?.textContent).toBe("Shop");
    expect(cta?.getAttribute("href")).toBe("/sale");
    expect(cta?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  test("javascript: CTA href is dropped by the pipeline (no href, no rel)", async () => {
    const env = makeFakeEnvs(new Map());
    await startAndFire(env, [
      publicPopup({
        content: { title: null, body: null, ctaLabel: "Go", ctaHref: "javascript:alert(1)" },
      }),
    ]);

    const cta = document.querySelector("[data-coderso-popup] a");
    expect(cta).not.toBeNull();
    expect(cta?.textContent).toBe("Go");
    expect(cta?.getAttribute("href")).toBeNull();
    expect(cta?.getAttribute("rel")).toBeNull();
  });

  test("html-looking title/body are escaped (no injected elements)", async () => {
    const env = makeFakeEnvs(new Map());
    await startAndFire(env, [
      publicPopup({
        content: {
          title: '<img src=x onerror="alert(1)">',
          body: "<script>window.pwned = 1</script>",
          ctaLabel: null,
          ctaHref: null,
        },
      }),
    ]);

    const h2 = document.querySelector("[data-coderso-popup] h2");
    const p = document.querySelector("[data-coderso-popup] p");
    expect(h2?.textContent).toBe('<img src=x onerror="alert(1)">');
    expect(p?.textContent).toBe("<script>window.pwned = 1</script>");
    expect(document.querySelector("[data-coderso-popup] img")).toBeNull();
    expect(document.querySelector("[data-coderso-popup] script")).toBeNull();
  });

  test("fetch rejection renders nothing without throwing; a retry succeeds", async () => {
    const env = makeFakeEnvs(new Map());
    let shouldReject = true;
    const runtime = createPopupRuntime({
      currentPath: () => "/",
      fetchPopups: async () => {
        if (shouldReject) throw new Error("network down");
        return [publicPopup()];
      },
      triggerEnv: env.trigger,
      frequencyEnv: env.frequency,
      render: (popup) => renderPopup(popup, { document }),
    });

    await expect(runtime.start()).resolves.toBeUndefined();
    expect(document.querySelectorAll("[data-coderso-popup]")).toHaveLength(0);

    shouldReject = false;
    await runtime.start();
    env.clock.advance(1000);
    expect(document.querySelectorAll("[data-coderso-popup]")).toHaveLength(1);
  });

  test("blocked storage never throws: popup still renders and may re-show", async () => {
    const env = makeFakeEnvs(new Map());
    env.frequency.getRecord = () => {
      throw new Error("storage denied");
    };
    env.frequency.setRecord = () => {
      throw new Error("storage denied");
    };

    await startAndFire(env, [publicPopup()]);
    expect(document.querySelectorAll("[data-coderso-popup]")).toHaveLength(1);

    // nothing was persisted ⇒ a re-start re-arms and re-renders without throwing
    await startAndFire(env, [publicPopup()]);
    expect(document.querySelectorAll("[data-coderso-popup]")).toHaveLength(2);
  });

  test("two popups fire on their own schedules and both land in the DOM", async () => {
    const env = makeFakeEnvs(new Map());
    const runtime = makeRuntime(env, [
      publicPopup({ id: "popup-a", trigger: { type: "time_delay", delaySeconds: 2 } }),
      publicPopup({ id: "popup-b", trigger: { type: "time_delay", delaySeconds: 5 } }),
    ]);

    await runtime.start();
    expect(document.querySelectorAll("[data-coderso-popup]")).toHaveLength(0);

    env.clock.advance(2000);
    expect(document.querySelectorAll("[data-coderso-popup]")).toHaveLength(1);
    expect(document.querySelector('[data-coderso-popup="popup-a"]')).not.toBeNull();
    expect(document.querySelector('[data-coderso-popup="popup-b"]')).toBeNull();

    env.clock.advance(3000);
    expect(document.querySelectorAll("[data-coderso-popup]")).toHaveLength(2);
    expect(document.querySelector('[data-coderso-popup="popup-b"]')).not.toBeNull();
  });
});
