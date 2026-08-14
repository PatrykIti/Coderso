import { describe, expect, test, vi } from "vitest";

import {
  createPopupRuntime,
  type PopupRuntimeDeps,
} from "../../../core/services/popups/runtime/popupRuntime";
import type {
  FrequencyEnv,
  ShownRecord,
} from "../../../core/services/popups/runtime/frequencyGate";
import type { TriggerEnv } from "../../../core/services/popups/runtime/triggerWatchers";
import type { PublicPopup } from "../../../core/services/popups/popupPublicContract";

const makePopup = (overrides: Partial<PublicPopup> = {}): PublicPopup => ({
  id: "popup-1",
  slug: "spring-sale",
  trigger: { type: "time_delay", delaySeconds: 1 },
  frequency: { strategy: "session_once", cooldownMinutes: null },
  content: { title: "Spring Sale", body: null, ctaLabel: null, ctaHref: null },
  settings: { placement: "center", dismissible: true, showOverlay: true },
  ...overrides,
});

type HarnessOptions = {
  popups?: PublicPopup[];
  fetchRejects?: boolean;
  fetchError?: unknown;
  initialRecords?: Map<string, ShownRecord>;
  startNow?: number;
};

/**
 * Fake deps harness: fake trigger/frequency envs plus spies for `fetchPopups`
 * and `render`. Timers are captured in a map so tests can fire individual
 * watchers deterministically; listeners are captured per type for event-driven
 * triggers.
 */
const createHarness = (options: HarnessOptions = {}) => {
  let nowMs = options.startNow ?? 0;
  const records = options.initialRecords ?? new Map<string, ShownRecord>();
  const timers = new Map<number, () => void>();
  let timerSeq = 0;
  const listeners = new Map<string, (e: unknown) => void>();
  const fetchCalls: string[] = [];
  const renderCalls: PublicPopup[] = [];

  const frequencyEnv: FrequencyEnv = {
    now: () => nowMs,
    sessionId: "session-a",
    getRecord: (popupId: string) => records.get(popupId) ?? null,
    setRecord: (popupId: string, rec: { lastShownMs: number; sessionId: string }) => {
      records.set(popupId, rec);
    },
  };

  const triggerEnv: TriggerEnv = {
    now: () => nowMs,
    setTimeout: (fn: () => void) => {
      const id = ++timerSeq;
      timers.set(id, fn);
      return id;
    },
    clearTimeout: (handle: unknown) => {
      timers.delete(handle as number);
    },
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      listeners.set(type, fn);
    },
    removeEventListener: (type: string, fn: (e: unknown) => void) => {
      if (listeners.get(type) === fn) listeners.delete(type);
    },
    scrollMetrics: () => ({ y: 0, viewport: 800, full: 2400 }),
    matches: () => false,
  };

  const fetchPopups = vi.fn(async (path: string) => {
    fetchCalls.push(path);
    if (options.fetchRejects) throw options.fetchError ?? new Error("fetch failed");
    return options.popups ?? [];
  });

  const render = vi.fn((popup: PublicPopup) => {
    renderCalls.push(popup);
  });

  const deps: PopupRuntimeDeps = {
    currentPath: () => "/current",
    fetchPopups,
    triggerEnv,
    frequencyEnv,
    render,
  };

  return {
    deps,
    records,
    timers,
    listeners,
    fetchCalls,
    renderCalls,
    advance: (ms: number) => {
      nowMs += ms;
    },
    fireTimer: (id: number) => {
      timers.get(id)?.();
    },
    setPath: (path: string) => {
      deps.currentPath = () => path;
    },
    setPopups: (popups: PublicPopup[]) => {
      options.popups = popups;
    },
    setFetchRejects: (rejects: boolean) => {
      options.fetchRejects = rejects;
    },
  };
};

describe("createPopupRuntime", () => {
  test("arms one watcher per popup; firing one renders once, records, and disposes only that one", async () => {
    const popups = [
      makePopup({ id: "popup-a" }),
      makePopup({ id: "popup-b", trigger: { type: "time_delay", delaySeconds: 2 } }),
    ];
    const h = createHarness({ popups });
    const runtime = createPopupRuntime(h.deps);

    await runtime.start();
    expect(h.timers.size).toBe(2);
    expect(h.renderCalls).toHaveLength(0);

    h.advance(60_000);
    const [timerA, timerB] = [...h.timers.keys()];
    h.fireTimer(timerA);

    // only popup-a rendered and recorded
    expect(h.renderCalls.map((p) => p.id)).toEqual(["popup-a"]);
    expect(h.records.get("popup-a")).toEqual({ lastShownMs: 60_000, sessionId: "session-a" });
    expect(h.records.has("popup-b")).toBe(false);

    // popup-b's watcher was not disposed and still fires
    h.fireTimer(timerB);
    expect(h.renderCalls.map((p) => p.id)).toEqual(["popup-a", "popup-b"]);
    expect(h.records.get("popup-b")).toEqual({ lastShownMs: 60_000, sessionId: "session-a" });
  });

  test("a popup already within session/cooldown/day is never armed and never renders", async () => {
    const popups = [
      makePopup({
        id: "session-blocked",
        frequency: { strategy: "session_once", cooldownMinutes: null },
      }),
      makePopup({ id: "cooldown-blocked", frequency: { strategy: "always", cooldownMinutes: 10 } }),
      makePopup({
        id: "day-blocked",
        frequency: { strategy: "daily_once", cooldownMinutes: null },
      }),
    ];
    const startNow = Date.UTC(2026, 7, 13, 12);
    const initialRecords = new Map<string, ShownRecord>([
      ["session-blocked", { lastShownMs: 0, sessionId: "session-a" }],
      // anchored to startNow so the 10min cooldown is still pending
      ["cooldown-blocked", { lastShownMs: startNow, sessionId: "session-a" }],
      ["day-blocked", { lastShownMs: startNow, sessionId: "session-a" }],
    ]);
    const h = createHarness({ popups, initialRecords, startNow });
    const runtime = createPopupRuntime(h.deps);

    await runtime.start();
    expect(h.timers.size).toBe(0);
    expect(h.renderCalls).toHaveLength(0);
  });

  test("fetch rejection is swallowed: no throw, no watchers, no render", async () => {
    const h = createHarness({ popups: [makePopup()], fetchRejects: true });
    const runtime = createPopupRuntime(h.deps);

    await expect(runtime.start()).resolves.toBeUndefined();
    expect(h.timers.size).toBe(0);
    expect(h.renderCalls).toHaveLength(0);
    expect(h.fetchCalls).toEqual(["/current"]);
  });

  test("after a fetch rejection a later start() retries instead of staying wedged", async () => {
    const h = createHarness({ popups: [makePopup()], fetchRejects: true });
    const runtime = createPopupRuntime(h.deps);

    await runtime.start();
    expect(h.timers.size).toBe(0);

    h.setFetchRejects(false);
    await runtime.start();
    expect(h.fetchCalls).toEqual(["/current", "/current"]);
    expect(h.timers.size).toBe(1);
  });

  test("stop() disposes all watchers; nothing fires afterwards", async () => {
    const popups = [makePopup({ id: "popup-a" }), makePopup({ id: "popup-b" })];
    const h = createHarness({ popups });
    const runtime = createPopupRuntime(h.deps);

    await runtime.start();
    expect(h.timers.size).toBe(2);

    runtime.stop();
    expect(h.timers.size).toBe(0);
    h.fireTimer(1);
    h.fireTimer(2);
    expect(h.renderCalls).toHaveLength(0);
  });

  test("SPA navigation: stop() then start() re-fetches for the new path and re-arms", async () => {
    const h = createHarness({ popups: [makePopup({ id: "popup-a" })] });
    const runtime = createPopupRuntime(h.deps);

    await runtime.start();
    expect(h.fetchCalls).toEqual(["/current"]);
    expect(h.timers.size).toBe(1);

    h.setPath("/blog");
    h.setPopups([makePopup({ id: "popup-b" })]);
    runtime.stop();
    expect(h.timers.size).toBe(0);

    await runtime.start();
    expect(h.fetchCalls).toEqual(["/current", "/blog"]);
    expect(h.timers.size).toBe(1);

    h.advance(10_000);
    h.fireTimer([...h.timers.keys()][0]);
    expect(h.renderCalls.map((p) => p.id)).toEqual(["popup-b"]);
  });

  test("concurrent duplicate start() calls fetch only once", async () => {
    const h = createHarness({ popups: [makePopup()] });
    const runtime = createPopupRuntime(h.deps);

    await Promise.all([runtime.start(), runtime.start()]);
    expect(h.fetchCalls).toHaveLength(1);
    expect(h.timers.size).toBe(1);
  });

  test("fire-time re-check blocks a popup that became ineligible after arming", async () => {
    const popups = [makePopup({ id: "popup-a" })];
    const h = createHarness({ popups });
    const runtime = createPopupRuntime(h.deps);

    await runtime.start();
    expect(h.timers.size).toBe(1);

    // Between arming and firing, the popup is recorded as shown in this session.
    h.records.set("popup-a", { lastShownMs: 0, sessionId: "session-a" });
    h.advance(1_000);
    h.fireTimer([...h.timers.keys()][0]);

    expect(h.renderCalls).toHaveLength(0);
    expect(h.records.get("popup-a")).toEqual({ lastShownMs: 0, sessionId: "session-a" });
  });

  test("a scroll_depth popup arms an event watcher and fires through the orchestrator once", async () => {
    const popups = [makePopup({ id: "popup-a", trigger: { type: "scroll_depth", percent: 50 } })];
    const h = createHarness({ popups });
    const runtime = createPopupRuntime(h.deps);

    await runtime.start();
    expect(h.listeners.has("scroll")).toBe(true);
    // scroll watchers defer the initial-position evaluation through a 0ms timer
    expect(h.timers.size).toBe(1);

    // initial position (y=0) is below 50%: no fire
    h.fireTimer([...h.timers.keys()][0]);
    expect(h.renderCalls).toHaveLength(0);

    // scrolling deep enough fires once, records, and disposes the watcher
    h.deps.triggerEnv.scrollMetrics = () => ({ y: 2000, viewport: 800, full: 2400 });
    h.listeners.get("scroll")?.({});
    expect(h.renderCalls.map((p) => p.id)).toEqual(["popup-a"]);
    expect(h.records.get("popup-a")).toEqual({ lastShownMs: 0, sessionId: "session-a" });
    expect(h.listeners.has("scroll")).toBe(false);
  });

  test("no popups resolves to no watchers and no render", async () => {
    const h = createHarness({ popups: [] });
    const runtime = createPopupRuntime(h.deps);

    await runtime.start();
    expect(h.fetchCalls).toEqual(["/current"]);
    expect(h.timers.size).toBe(0);
    expect(h.renderCalls).toHaveLength(0);
  });
});
