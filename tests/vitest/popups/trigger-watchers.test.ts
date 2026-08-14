import { describe, expect, test } from "vitest";

import {
  scrollDepthPercent,
  watchTrigger,
} from "../../../core/services/popups/runtime/triggerWatchers";
import type { Dispose, TriggerEnv } from "../../../core/services/popups/runtime/triggerWatchers";

type Listener = (e: unknown) => void;

type FakeElement = {
  matches: (selector: string) => boolean;
  parentElement: FakeElement | null;
};

const makeElement = (selector: string, parent: FakeElement | null = null): FakeElement => ({
  matches: (s: string) => s === selector,
  parentElement: parent,
});

const createFakeClock = () => {
  let nowMs = 0;
  let nextId = 1;
  const timers = new Map<number, { fn: () => void; at: number }>();

  const advance = (ms: number) => {
    const target = nowMs + ms;
    let guard = 0;
    while (true) {
      if (++guard > 100_000) throw new Error("fake clock runaway");
      let earliestId: number | null = null;
      let earliestAt = Number.POSITIVE_INFINITY;
      for (const [id, timer] of timers) {
        if (timer.at <= target && timer.at < earliestAt) {
          earliestAt = timer.at;
          earliestId = id;
        }
      }
      if (earliestId === null) break;
      const timer = timers.get(earliestId);
      if (!timer) break;
      timers.delete(earliestId);
      nowMs = Math.max(nowMs, timer.at);
      timer.fn();
    }
    nowMs = target;
  };

  return {
    now: () => nowMs,
    setTimeout: (fn: () => void, ms: number): unknown => {
      const id = nextId;
      nextId += 1;
      timers.set(id, { fn, at: nowMs + ms });
      return id;
    },
    clearTimeout: (handle: unknown) => {
      timers.delete(Number(handle));
    },
    advance,
    timerCount: () => timers.size,
  };
};

type FakeClock = ReturnType<typeof createFakeClock>;

const createEventTargetFake = () => {
  const listeners = new Map<string, Set<Listener>>();
  return {
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      let set = listeners.get(type);
      if (!set) {
        set = new Set();
        listeners.set(type, set);
      }
      set.add(fn);
    },
    removeEventListener: (type: string, fn: (e: unknown) => void) => {
      listeners.get(type)?.delete(fn);
    },
    emit: (type: string, event: unknown) => {
      const snapshot = [...(listeners.get(type) ?? [])];
      for (const fn of snapshot) {
        fn(event);
      }
    },
    listenerCount: (type: string) => listeners.get(type)?.size ?? 0,
  };
};

type FakeEventTarget = ReturnType<typeof createEventTargetFake>;

const createScrollFake = (initial: { y: number; viewport: number; full: number }) => {
  let metrics = { ...initial };
  return {
    set: (next: { y: number; viewport: number; full: number }) => {
      metrics = { ...next };
    },
    scrollMetrics: () => metrics,
  };
};

describe("scrollDepthPercent", () => {
  test("returns 0 at the top of the page", () => {
    expect(scrollDepthPercent({ y: 0, viewport: 800, full: 1800 })).toBe(0);
  });

  test("returns the exact percentage at the boundary", () => {
    expect(scrollDepthPercent({ y: 500, viewport: 800, full: 1800 })).toBe(50);
  });

  test("clamps to 100 past full scroll", () => {
    expect(scrollDepthPercent({ y: 1000, viewport: 800, full: 1800 })).toBe(100);
    expect(scrollDepthPercent({ y: 5000, viewport: 800, full: 1800 })).toBe(100);
  });

  test("guards a zero-scrollable document without dividing by zero", () => {
    expect(scrollDepthPercent({ y: 0, viewport: 800, full: 800 })).toBe(0);
    expect(scrollDepthPercent({ y: 50, viewport: 800, full: 800 })).toBe(100);
    expect(Number.isNaN(scrollDepthPercent({ y: 0, viewport: 800, full: 800 }))).toBe(false);
  });
});

describe("watchTrigger: time_delay", () => {
  test("fires exactly once at the delay boundary", () => {
    const clock = createFakeClock();
    const events = createEventTargetFake();
    const env: TriggerEnv = {
      now: clock.now,
      setTimeout: clock.setTimeout,
      clearTimeout: clock.clearTimeout,
      addEventListener: events.addEventListener,
      removeEventListener: events.removeEventListener,
      scrollMetrics: () => ({ y: 0, viewport: 800, full: 1800 }),
      matches: () => false,
    };
    let fireCount = 0;
    const dispose = watchTrigger({ type: "time_delay", delaySeconds: 2 }, env, () => {
      fireCount += 1;
    });

    clock.advance(1999);
    expect(fireCount).toBe(0);
    clock.advance(1);
    expect(fireCount).toBe(1);
    clock.advance(10_000);
    expect(fireCount).toBe(1);
    dispose();
  });

  test("dispose clears the pending timeout", () => {
    const clock = createFakeClock();
    const events = createEventTargetFake();
    const env: TriggerEnv = {
      now: clock.now,
      setTimeout: clock.setTimeout,
      clearTimeout: clock.clearTimeout,
      addEventListener: events.addEventListener,
      removeEventListener: events.removeEventListener,
      scrollMetrics: () => ({ y: 0, viewport: 800, full: 1800 }),
      matches: () => false,
    };
    let fireCount = 0;
    const dispose = watchTrigger({ type: "time_delay", delaySeconds: 2 }, env, () => {
      fireCount += 1;
    });

    dispose();
    expect(clock.timerCount()).toBe(0);
    clock.advance(10_000);
    expect(fireCount).toBe(0);
  });
});

describe("watchTrigger: scroll_depth", () => {
  test("fires when the computed percent reaches the threshold", () => {
    const clock = createFakeClock();
    const events = createEventTargetFake();
    const scroll = createScrollFake({ y: 0, viewport: 800, full: 1800 });
    const env: TriggerEnv = {
      now: clock.now,
      setTimeout: clock.setTimeout,
      clearTimeout: clock.clearTimeout,
      addEventListener: events.addEventListener,
      removeEventListener: events.removeEventListener,
      scrollMetrics: scroll.scrollMetrics,
      matches: () => false,
    };
    let fireCount = 0;
    watchTrigger({ type: "scroll_depth", percent: 50 }, env, () => {
      fireCount += 1;
    });

    scroll.set({ y: 490, viewport: 800, full: 1800 });
    events.emit("scroll", {});
    expect(fireCount).toBe(0);

    scroll.set({ y: 500, viewport: 800, full: 1800 });
    events.emit("scroll", {});
    expect(fireCount).toBe(1);

    scroll.set({ y: 1800, viewport: 800, full: 1800 });
    events.emit("scroll", {});
    expect(fireCount).toBe(1);
  });

  test("deferred initial evaluation fires asynchronously (TDZ-safe)", () => {
    const clock = createFakeClock();
    const events = createEventTargetFake();
    const scroll = createScrollFake({ y: 2000, viewport: 800, full: 1800 });
    const env: TriggerEnv = {
      now: clock.now,
      setTimeout: clock.setTimeout,
      clearTimeout: clock.clearTimeout,
      addEventListener: events.addEventListener,
      removeEventListener: events.removeEventListener,
      scrollMetrics: scroll.scrollMetrics,
      matches: () => false,
    };
    let fireCount = 0;
    let dispose: Dispose = () => {};
    // Assign `dispose` only after `watchTrigger` returns, mirroring the
    // orchestrator that arms watchers before binding dispose. A synchronous
    // initial fire would throw a TDZ ReferenceError here.
    dispose = watchTrigger({ type: "scroll_depth", percent: 50 }, env, () => {
      fireCount += 1;
    });
    expect(dispose).toBeTypeOf("function");

    expect(fireCount).toBe(0);
    clock.advance(0);
    expect(fireCount).toBe(1);
  });

  test("dispose removes the scroll listener", () => {
    const clock = createFakeClock();
    const events = createEventTargetFake();
    const env: TriggerEnv = {
      now: clock.now,
      setTimeout: clock.setTimeout,
      clearTimeout: clock.clearTimeout,
      addEventListener: events.addEventListener,
      removeEventListener: events.removeEventListener,
      scrollMetrics: () => ({ y: 0, viewport: 800, full: 1800 }),
      matches: () => false,
    };
    let fireCount = 0;
    const dispose = watchTrigger({ type: "scroll_depth", percent: 50 }, env, () => {
      fireCount += 1;
    });

    expect(events.listenerCount("scroll")).toBe(1);
    dispose();
    expect(events.listenerCount("scroll")).toBe(0);
    clock.advance(0);
    events.emit("scroll", {});
    expect(fireCount).toBe(0);
  });
});

describe("watchTrigger: exit_intent", () => {
  const makeEnvWith = (clock: FakeClock, events: FakeEventTarget): TriggerEnv => ({
    now: clock.now,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    addEventListener: events.addEventListener,
    removeEventListener: events.removeEventListener,
    scrollMetrics: () => ({ y: 0, viewport: 800, full: 1800 }),
    matches: () => false,
  });

  test("fires when the pointer leaves at the top with no relatedTarget", () => {
    const clock = createFakeClock();
    const events = createEventTargetFake();
    let fireCount = 0;
    watchTrigger({ type: "exit_intent" }, makeEnvWith(clock, events), () => {
      fireCount += 1;
    });

    events.emit("mouseout", { clientY: 0 });
    expect(fireCount).toBe(1);

    events.emit("mouseout", { clientY: -4, relatedTarget: null });
    expect(fireCount).toBe(1);
  });

  test("does not fire on inner moves or when leaving to an element", () => {
    const clock = createFakeClock();
    const events = createEventTargetFake();
    let fireCount = 0;
    watchTrigger({ type: "exit_intent" }, makeEnvWith(clock, events), () => {
      fireCount += 1;
    });

    events.emit("mouseout", { clientY: 10 });
    events.emit("mouseout", { clientY: 5, relatedTarget: null });
    events.emit("mouseout", { clientY: 0, relatedTarget: {} });
    expect(fireCount).toBe(0);
  });

  test("dispose removes the mouseout listener", () => {
    const clock = createFakeClock();
    const events = createEventTargetFake();
    const dispose = watchTrigger({ type: "exit_intent" }, makeEnvWith(clock, events), () => {
      throw new Error("should not fire after dispose");
    });

    expect(events.listenerCount("mouseout")).toBe(1);
    dispose();
    expect(events.listenerCount("mouseout")).toBe(0);
    events.emit("mouseout", { clientY: 0 });
  });
});

describe("watchTrigger: cta_click", () => {
  const makeEnvWith = (
    clock: FakeClock,
    events: FakeEventTarget,
    matches: TriggerEnv["matches"]
  ): TriggerEnv => ({
    now: clock.now,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    addEventListener: events.addEventListener,
    removeEventListener: events.removeEventListener,
    scrollMetrics: () => ({ y: 0, viewport: 800, full: 1800 }),
    matches,
  });

  test("fires once on a matching target", () => {
    const clock = createFakeClock();
    const events = createEventTargetFake();
    const env = makeEnvWith(clock, events, (el: unknown, selector: string) => {
      const node = el as FakeElement | null;
      return node?.matches(selector) ?? false;
    });
    let fireCount = 0;
    watchTrigger({ type: "cta_click", selector: ".cta" }, env, () => {
      fireCount += 1;
    });

    events.emit("click", { target: makeElement(".cta") });
    expect(fireCount).toBe(1);

    events.emit("click", { target: makeElement(".cta") });
    expect(fireCount).toBe(1);
  });

  test("fires on a matching ancestor via the delegated walk", () => {
    const clock = createFakeClock();
    const events = createEventTargetFake();
    const env = makeEnvWith(clock, events, (el: unknown, selector: string) => {
      const node = el as FakeElement | null;
      return node?.matches(selector) ?? false;
    });
    let fireCount = 0;
    watchTrigger({ type: "cta_click", selector: "#banner" }, env, () => {
      fireCount += 1;
    });

    const banner = makeElement("#banner");
    const button = makeElement("button", banner);
    const icon = makeElement("span", button);
    events.emit("click", { target: icon });
    expect(fireCount).toBe(1);
  });

  test("invalid selector never throws and never fires", () => {
    const clock = createFakeClock();
    const events = createEventTargetFake();
    const env = makeEnvWith(clock, events, (_el: unknown, _selector: string) => {
      throw new Error("invalid selector");
    });
    let fireCount = 0;
    watchTrigger({ type: "cta_click", selector: "[invalid" }, env, () => {
      fireCount += 1;
    });

    expect(() => events.emit("click", { target: makeElement(".cta") })).not.toThrow();
    expect(fireCount).toBe(0);
  });

  test("non-matching target and ancestors never fire", () => {
    const clock = createFakeClock();
    const events = createEventTargetFake();
    const env = makeEnvWith(clock, events, (el: unknown, selector: string) => {
      const node = el as FakeElement | null;
      return node?.matches(selector) ?? false;
    });
    let fireCount = 0;
    watchTrigger({ type: "cta_click", selector: ".cta" }, env, () => {
      fireCount += 1;
    });

    const unrelated = makeElement("div");
    const link = makeElement("a", unrelated);
    events.emit("click", { target: link });
    expect(fireCount).toBe(0);
  });

  test("dispose removes the click listener", () => {
    const clock = createFakeClock();
    const events = createEventTargetFake();
    const env = makeEnvWith(clock, events, () => true);
    const dispose = watchTrigger({ type: "cta_click", selector: ".cta" }, env, () => {
      throw new Error("should not fire after dispose");
    });

    expect(events.listenerCount("click")).toBe(1);
    dispose();
    expect(events.listenerCount("click")).toBe(0);
    events.emit("click", { target: makeElement(".cta") });
  });
});

describe("watchTrigger: single-fire latch across variants", () => {
  test("scroll_depth fires once even with repeated threshold crossings", () => {
    const clock = createFakeClock();
    const events = createEventTargetFake();
    const scroll = createScrollFake({ y: 0, viewport: 800, full: 1800 });
    const env: TriggerEnv = {
      now: clock.now,
      setTimeout: clock.setTimeout,
      clearTimeout: clock.clearTimeout,
      addEventListener: events.addEventListener,
      removeEventListener: events.removeEventListener,
      scrollMetrics: scroll.scrollMetrics,
      matches: () => false,
    };
    let fireCount = 0;
    const dispose = watchTrigger({ type: "scroll_depth", percent: 50 }, env, () => {
      fireCount += 1;
    });

    scroll.set({ y: 600, viewport: 800, full: 1800 });
    events.emit("scroll", {});
    expect(fireCount).toBe(1);

    scroll.set({ y: 0, viewport: 800, full: 1800 });
    events.emit("scroll", {});
    scroll.set({ y: 1200, viewport: 800, full: 1800 });
    events.emit("scroll", {});
    expect(fireCount).toBe(1);
    dispose();
  });

  test("time_delay uses the delaySeconds unit conversion", () => {
    const clock = createFakeClock();
    const events = createEventTargetFake();
    const env: TriggerEnv = {
      now: clock.now,
      setTimeout: clock.setTimeout,
      clearTimeout: clock.clearTimeout,
      addEventListener: events.addEventListener,
      removeEventListener: events.removeEventListener,
      scrollMetrics: () => ({ y: 0, viewport: 800, full: 1800 }),
      matches: () => false,
    };
    let fireCount = 0;
    const dispose = watchTrigger({ type: "time_delay", delaySeconds: 1 }, env, () => {
      fireCount += 1;
    });

    clock.advance(1000);
    expect(fireCount).toBe(1);
    dispose();
  });
});
