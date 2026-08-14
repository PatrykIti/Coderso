import { describe, expect, test } from "vitest";

import {
  recordPopupShown,
  sameUtcDay,
  shouldShowPopup,
  type FrequencyEnv,
  type ShownRecord,
} from "../../../core/services/popups/runtime/frequencyGate";
import type { PopupFrequency } from "../../../core/services/popups/popupTypes";

type FakeOptions = {
  getThrows?: boolean;
  setThrows?: boolean;
  initial?: Map<string, ShownRecord>;
  start?: number;
};

const createFakeEnv = (options: FakeOptions = {}) => {
  let nowMs = options.start ?? 0;
  const records = options.initial ?? new Map<string, ShownRecord>();

  const env: FrequencyEnv = {
    now: () => nowMs,
    sessionId: "session-a",
    getRecord: (popupId: string) => {
      if (options.getThrows) throw new Error("storage blocked");
      return records.get(popupId) ?? null;
    },
    setRecord: (popupId: string, rec: { lastShownMs: number; sessionId: string }) => {
      if (options.setThrows) throw new Error("storage full");
      records.set(popupId, rec);
    },
  };

  return {
    env,
    records,
    advance: (ms: number) => {
      nowMs += ms;
    },
  };
};

const always: PopupFrequency = { strategy: "always", cooldownMinutes: null };

describe("shouldShowPopup", () => {
  test("no record allows under every strategy", () => {
    const { env } = createFakeEnv();
    expect(shouldShowPopup("popup-1", always, env)).toBe(true);
    expect(
      shouldShowPopup("popup-1", { strategy: "session_once", cooldownMinutes: null }, env)
    ).toBe(true);
    expect(shouldShowPopup("popup-1", { strategy: "daily_once", cooldownMinutes: null }, env)).toBe(
      true
    );
  });

  test("always + no cooldown is always true even after shows", () => {
    const { env, records } = createFakeEnv();
    records.set("popup-1", { lastShownMs: 1_000, sessionId: "session-a" });
    expect(shouldShowPopup("popup-1", always, env)).toBe(true);
  });

  test("always + cooldown blocks within the window and allows after it", () => {
    const { env, records, advance } = createFakeEnv();
    const frequency: PopupFrequency = { strategy: "always", cooldownMinutes: 10 };
    records.set("popup-1", { lastShownMs: 0, sessionId: "session-a" });

    advance(9 * 60_000);
    expect(shouldShowPopup("popup-1", frequency, env)).toBe(false);

    advance(1 * 60_000 - 1);
    expect(shouldShowPopup("popup-1", frequency, env)).toBe(false);

    advance(1);
    expect(shouldShowPopup("popup-1", frequency, env)).toBe(true);
  });

  test("session_once blocks only the same session", () => {
    const { env, records } = createFakeEnv();
    const frequency: PopupFrequency = { strategy: "session_once", cooldownMinutes: null };
    records.set("popup-1", { lastShownMs: 0, sessionId: "session-a" });

    expect(shouldShowPopup("popup-1", frequency, env)).toBe(false);

    const { env: freshEnv } = createFakeEnv({
      initial: new Map([["popup-1", { lastShownMs: 0, sessionId: "session-a" }]]),
    });
    freshEnv.sessionId = "session-b";
    expect(shouldShowPopup("popup-1", frequency, freshEnv)).toBe(true);
  });

  test("daily_once blocks the same UTC day and allows the next", () => {
    const dayStart = Date.UTC(2026, 7, 13, 10);
    const { env, records, advance } = createFakeEnv({ start: dayStart });
    const frequency: PopupFrequency = { strategy: "daily_once", cooldownMinutes: null };
    records.set("popup-1", { lastShownMs: dayStart, sessionId: "session-a" });

    advance(12 * 60 * 60 * 1000); // 2026-08-13T22:00:00Z, same UTC day
    expect(shouldShowPopup("popup-1", frequency, env)).toBe(false);

    advance(2 * 60 * 60 * 1000); // past UTC midnight into 2026-08-14
    expect(shouldShowPopup("popup-1", frequency, env)).toBe(true);
  });

  test("daily_once resets at the UTC calendar boundary, not after 24h", () => {
    const frequency: PopupFrequency = { strategy: "daily_once", cooldownMinutes: null };

    // 23h elapsed but still the same calendar day ⇒ blocked
    const sameDayStart = Date.UTC(2026, 7, 13, 0, 30);
    const sameDay = createFakeEnv({ start: sameDayStart });
    sameDay.records.set("popup-1", { lastShownMs: sameDayStart, sessionId: "s" });
    sameDay.advance(23 * 60 * 60 * 1000);
    expect(shouldShowPopup("popup-1", frequency, sameDay.env)).toBe(false);

    // Only 45min elapsed but the calendar day rolled over ⇒ allowed
    const nextDay = createFakeEnv({ start: Date.UTC(2026, 7, 13, 23, 30) });
    nextDay.records.set("popup-1", { lastShownMs: Date.UTC(2026, 7, 13, 23, 30), sessionId: "s" });
    nextDay.advance(45 * 60_000);
    expect(shouldShowPopup("popup-1", frequency, nextDay.env)).toBe(true);
  });

  test("cooldown stacks on top of session_once", () => {
    const { env, records, advance } = createFakeEnv();
    const frequency: PopupFrequency = { strategy: "session_once", cooldownMinutes: 5 };
    records.set("popup-1", { lastShownMs: 0, sessionId: "session-a" });

    advance(10 * 60_000); // cooldown elapsed
    expect(shouldShowPopup("popup-1", frequency, env)).toBe(false); // same session

    const fresh = createFakeEnv({
      initial: new Map([["popup-1", { lastShownMs: 0, sessionId: "session-a" }]]),
    });
    fresh.env.sessionId = "session-b";
    fresh.advance(4 * 60_000); // cooldown not yet elapsed
    expect(shouldShowPopup("popup-1", frequency, fresh.env)).toBe(false);

    fresh.advance(1 * 60_000); // cooldown elapsed
    expect(shouldShowPopup("popup-1", frequency, fresh.env)).toBe(true);
  });

  test("cooldown stacks on top of daily_once", () => {
    const { env, records, advance } = createFakeEnv();
    const frequency: PopupFrequency = { strategy: "daily_once", cooldownMinutes: 30 };
    records.set("popup-1", { lastShownMs: 0, sessionId: "session-a" });

    advance(20 * 60_000); // same day, cooldown pending
    expect(shouldShowPopup("popup-1", frequency, env)).toBe(false);

    advance(10 * 60_000); // cooldown elapsed, still same day
    expect(shouldShowPopup("popup-1", frequency, env)).toBe(false);
  });

  test("records are isolated per popup id", () => {
    const { env, records } = createFakeEnv();
    const frequency: PopupFrequency = { strategy: "session_once", cooldownMinutes: 10 };
    records.set("popup-1", { lastShownMs: 0, sessionId: "session-a" });
    expect(shouldShowPopup("popup-1", frequency, env)).toBe(false);
    expect(shouldShowPopup("popup-2", frequency, env)).toBe(true);
  });

  test("throwing getRecord degrades to allow and never throws (corrupted/blocked storage)", () => {
    const { env } = createFakeEnv({ getThrows: true });
    expect(() =>
      shouldShowPopup("popup-1", { strategy: "daily_once", cooldownMinutes: 5 }, env)
    ).not.toThrow();
    expect(shouldShowPopup("popup-1", always, env)).toBe(true);
  });
});

describe("recordPopupShown", () => {
  test("persists the current time and session id for the popup", () => {
    const { env, records, advance } = createFakeEnv();
    advance(42_000);
    recordPopupShown("popup-1", env);
    expect(records.get("popup-1")).toEqual({ lastShownMs: 42_000, sessionId: "session-a" });
  });

  test("recorded show immediately gates session_once", () => {
    const { env } = createFakeEnv();
    recordPopupShown("popup-1", env);
    expect(
      shouldShowPopup("popup-1", { strategy: "session_once", cooldownMinutes: null }, env)
    ).toBe(false);
  });

  test("throwing setRecord is a no-op and never throws (storage blocked)", () => {
    const { env } = createFakeEnv({ setThrows: true });
    expect(() => recordPopupShown("popup-1", env)).not.toThrow();
    expect(shouldShowPopup("popup-1", always, env)).toBe(true);
  });
});

describe("sameUtcDay", () => {
  test("true within the same UTC calendar day", () => {
    expect(sameUtcDay(Date.UTC(2026, 7, 13, 0, 0, 1), Date.UTC(2026, 7, 13, 23, 59, 59))).toBe(
      true
    );
  });

  test("false across the UTC midnight boundary", () => {
    expect(sameUtcDay(Date.UTC(2026, 7, 13, 23, 59, 59), Date.UTC(2026, 7, 14, 0, 0, 1))).toBe(
      false
    );
  });
});
