import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  advanceAdminCacheInstallationAuthority,
  captureAdminCacheInstallationToken,
  createAdminCacheInstallationAuthority,
  isCurrentAdminCacheInstallationToken,
  registerAdminModuleCacheReset,
  type AdminCacheInstallationToken,
} from "../../../core/admin/utils/adminCacheAuthority";

const MAX = Number.MAX_SAFE_INTEGER;
const INVALID_CODE = "admin_cache_authority_invalid";

const flushMacrotask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const expectZeroArgCalls = (reset: ReturnType<typeof vi.fn>, times: number) => {
  expect(reset).toHaveBeenCalledTimes(times);
  for (let i = 0; i < times; i += 1) {
    expect(reset.mock.calls[i].length).toBe(0);
  }
};

describe("token identity", () => {
  it("returns the same token within one generation", () => {
    const authority = createAdminCacheInstallationAuthority();
    const first = authority.capture();
    const second = authority.capture();

    expect(second).toBe(first);
    expect(Object.is(first, second)).toBe(true);
    expect(authority.isCurrent(first)).toBe(true);
  });

  it("mints a distinct token on every advance", () => {
    const authority = createAdminCacheInstallationAuthority();
    const first = authority.capture();
    authority.advance();
    const second = authority.capture();
    authority.advance();
    const third = authority.capture();

    expect(second).not.toBe(first);
    expect(third).not.toBe(second);
    expect(third).not.toBe(first);
    expect(Object.is(first, third)).toBe(false);
    expect(authority.isCurrent(first)).toBe(false);
    expect(authority.isCurrent(second)).toBe(false);
    expect(authority.isCurrent(third)).toBe(true);
  });

  it("carries zero identity bytes", () => {
    const authority = createAdminCacheInstallationAuthority();
    const token = authority.capture();

    expect(JSON.stringify(token)).toBe("{}");
    expect(Object.keys(token).length).toBe(0);
    expect(Reflect.ownKeys(token).length).toBe(0);
    expect(Object.getPrototypeOf(token)).toBe(null);
    expect(Object.isFrozen(token)).toBe(true);
  });
});

describe("isCurrent", () => {
  it("rejects stale tokens", () => {
    const authority = createAdminCacheInstallationAuthority();
    const stale = authority.capture();
    authority.advance();

    expect(authority.isCurrent(stale)).toBe(false);
  });

  it("rejects foreign objects and tokens from another instance", () => {
    const authority = createAdminCacheInstallationAuthority();
    const other = createAdminCacheInstallationAuthority();

    expect(authority.isCurrent({})).toBe(false);
    expect(authority.isCurrent(Object.freeze(Object.create(null)))).toBe(false);
    expect(authority.isCurrent(other.capture())).toBe(false);
    expect(other.isCurrent(authority.capture())).toBe(false);
  });

  it("rejects non-object inputs without throwing", () => {
    const authority = createAdminCacheInstallationAuthority();
    const inputs: unknown[] = [
      undefined,
      null,
      0,
      1,
      Number.NaN,
      "",
      "token",
      true,
      false,
      Symbol("token"),
      BigInt(1),
      () => undefined,
    ];

    for (const input of inputs) {
      expect(() => authority.isCurrent(input)).not.toThrow();
      expect(authority.isCurrent(input)).toBe(false);
    }
  });
});

describe("advance order", () => {
  it("installs the new token before dispatch", () => {
    const authority = createAdminCacheInstallationAuthority();
    const before = authority.capture();
    let inside: AdminCacheInstallationToken | undefined;
    let insideCurrent: boolean | undefined;
    authority.register(() => {
      inside = authority.capture();
      insideCurrent = authority.isCurrent(inside);
    });

    authority.advance();
    const after = authority.capture();

    expect(inside).not.toBe(before);
    expect(inside).toBe(after);
    expect(insideCurrent).toBe(true);
    expect(authority.isCurrent(before)).toBe(false);
    expect(authority.isCurrent(after)).toBe(true);
  });

  it("dispatches in registration order", () => {
    const authority = createAdminCacheInstallationAuthority();
    const log: string[] = [];
    authority.register(() => {
      log.push("first");
    });
    authority.register(() => {
      log.push("second");
    });
    authority.register(() => {
      log.push("third");
    });

    authority.advance();

    expect(log).toEqual(["first", "second", "third"]);
  });

  it("invokes every reset with zero arguments", () => {
    const authority = createAdminCacheInstallationAuthority();
    const reset = vi.fn();
    authority.register(reset);

    authority.advance();
    authority.advance();

    expectZeroArgCalls(reset, 2);
  });

  it("runs registrations made during dispatch from the next advance", () => {
    const authority = createAdminCacheInstallationAuthority();
    const late = vi.fn();
    let registered = false;
    authority.register(() => {
      if (!registered) {
        registered = true;
        authority.register(late);
      }
    });

    authority.advance();
    expect(late).not.toHaveBeenCalled();

    authority.advance();
    expectZeroArgCalls(late, 1);
  });
});

describe("registration handles", () => {
  it("treats duplicate registration as a no-op", () => {
    const authority = createAdminCacheInstallationAuthority();
    const reset = vi.fn();
    authority.register(reset);
    authority.register(reset);

    authority.advance();

    expectZeroArgCalls(reset, 1);
  });

  it("keeps the original dispatch position on duplicate registration", () => {
    const authority = createAdminCacheInstallationAuthority();
    const log: string[] = [];
    const a = () => {
      log.push("a");
    };
    const b = () => {
      log.push("b");
    };
    authority.register(a);
    authority.register(b);
    authority.register(a);

    authority.advance();

    expect(log).toEqual(["a", "b"]);
  });

  it("unsubscribes idempotently", () => {
    const authority = createAdminCacheInstallationAuthority();
    const reset = vi.fn();
    const keep = vi.fn();
    const unsubscribe = authority.register(reset);
    authority.register(keep);

    unsubscribe();
    unsubscribe();
    authority.advance();

    expect(reset).not.toHaveBeenCalled();
    expectZeroArgCalls(keep, 1);
  });

  it("lets a snapshot entry unsubscribed during dispatch run in the current pass only", () => {
    const authority = createAdminCacheInstallationAuthority();
    const log: string[] = [];
    let unsubscribeB: () => void = () => undefined;
    authority.register(() => {
      log.push("A");
      unsubscribeB();
    });
    unsubscribeB = authority.register(() => {
      log.push("B");
    });

    authority.advance();
    expect(log).toEqual(["A", "B"]);

    authority.advance();
    expect(log).toEqual(["A", "B", "A"]);
  });

  it("keeps a re-registration alive when a stale handle is called again", () => {
    const authority = createAdminCacheInstallationAuthority();
    const reset = vi.fn();
    const h1 = authority.register(reset);
    h1();
    const h2 = authority.register(reset);

    h1();
    authority.advance();
    expectZeroArgCalls(reset, 1);

    h2();
    authority.advance();
    expectZeroArgCalls(reset, 1);
  });

  it("keeps a re-registration alive when an earlier duplicate handle is called", () => {
    const authority = createAdminCacheInstallationAuthority();
    const reset = vi.fn();
    const h1 = authority.register(reset);
    const duplicate = authority.register(reset);

    // Any live handle removes the shared registration for all holders.
    h1();
    authority.advance();
    expect(reset).not.toHaveBeenCalled();

    const h2 = authority.register(reset);
    duplicate();
    authority.advance();
    expectZeroArgCalls(reset, 1);

    h2();
    authority.advance();
    expectZeroArgCalls(reset, 1);
  });
});

describe("subscriber isolation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("isolates a throwing subscriber without console output", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const authority = createAdminCacheInstallationAuthority();
    const before = vi.fn();
    const after = vi.fn();
    authority.register(before);
    authority.register(() => {
      throw new Error("reset failed");
    });
    authority.register(after);

    expect(() => authority.advance()).not.toThrow();
    authority.advance();

    expectZeroArgCalls(before, 2);
    expectZeroArgCalls(after, 2);
    expect(errorSpy).toHaveBeenCalledTimes(0);
    expect(warnSpy).toHaveBeenCalledTimes(0);
    expect(logSpy).toHaveBeenCalledTimes(0);
  });

  it("never lets a returned rejection or throwing then getter go unhandled", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      const authority = createAdminCacheInstallationAuthority();
      const trailing = vi.fn();
      authority.register(() => Promise.reject(new Error("x")));
      authority.register(
        () =>
          ({
            get then(): unknown {
              throw new Error("then getter");
            },
          }) as unknown as void
      );
      authority.register(trailing);

      expect(() => authority.advance()).not.toThrow();
      await flushMacrotask();

      expectZeroArgCalls(trailing, 1);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });

  it("attaches a rejection handler to a returned thenable", () => {
    const authority = createAdminCacheInstallationAuthority();
    const then = vi.fn();
    authority.register(() => ({ then }) as unknown as void);

    authority.advance();

    expect(then).toHaveBeenCalledTimes(1);
    expect(then.mock.calls[0].length).toBe(2);
    expect(typeof then.mock.calls[0][0]).toBe("function");
    expect(typeof then.mock.calls[0][1]).toBe("function");
  });
});

describe("nested advance", () => {
  it("runs a full nested pass before the outer pass continues", () => {
    const authority = createAdminCacheInstallationAuthority();
    const log: string[] = [];
    let nested = false;
    let insideBeforeNested: AdminCacheInstallationToken | undefined;
    authority.register(() => {
      log.push("A");
      if (!nested) {
        nested = true;
        insideBeforeNested = authority.capture();
        authority.advance();
      }
    });
    authority.register(() => {
      log.push("B");
    });
    const before = authority.capture();

    authority.advance();
    const after = authority.capture();

    expect(log).toEqual(["A", "A", "B", "B"]);
    expect(insideBeforeNested).not.toBe(before);
    expect(after).not.toBe(before);
    expect(after).not.toBe(insideBeforeNested);
    expect(authority.isCurrent(before)).toBe(false);
    expect(authority.isCurrent(insideBeforeNested)).toBe(false);
    expect(authority.isCurrent(after)).toBe(true);
  });

  it("disables permanently when a nested advance reaches the overflow step", () => {
    const authority = createAdminCacheInstallationAuthority({ initialGeneration: MAX - 1 });
    const log: string[] = [];
    let nested = false;
    let insideBeforeNested: AdminCacheInstallationToken | undefined;
    let insideBeforeNestedCurrent: boolean | undefined;
    const insideAfterNestedCurrent: boolean[] = [];
    authority.register(() => {
      log.push("A");
      if (!nested) {
        nested = true;
        insideBeforeNested = authority.capture();
        insideBeforeNestedCurrent = authority.isCurrent(insideBeforeNested);
        authority.advance();
        insideAfterNestedCurrent.push(authority.isCurrent(authority.capture()));
      }
    });
    authority.register(() => {
      log.push("B");
      insideAfterNestedCurrent.push(authority.isCurrent(authority.capture()));
    });

    authority.advance();

    expect(log).toEqual(["A", "A", "B", "B"]);
    expect(insideBeforeNestedCurrent).toBe(true);
    expect(authority.isCurrent(insideBeforeNested)).toBe(false);
    expect(insideAfterNestedCurrent).toEqual([false, false, false]);
    expect(authority.isCurrent(authority.capture())).toBe(false);
    expect(authority.isCurrent(authority.capture())).toBe(false);
  });
});

describe("overflow", () => {
  it("runs resets once and disables installation at the safe-integer ceiling", () => {
    const authority = createAdminCacheInstallationAuthority({ initialGeneration: MAX });
    const first = vi.fn();
    const second = vi.fn();
    authority.register(first);
    authority.register(second);
    const before = authority.capture();
    expect(authority.isCurrent(before)).toBe(true);

    authority.advance();

    expectZeroArgCalls(first, 1);
    expectZeroArgCalls(second, 1);
    const after = authority.capture();
    const later = authority.capture();
    expect(authority.isCurrent(before)).toBe(false);
    expect(authority.isCurrent(after)).toBe(false);
    expect(authority.isCurrent(later)).toBe(false);
    expect(later).not.toBe(after);
    expect(after).not.toBe(before);
  });

  it("runs resets again on a second advance without wrapping or re-enabling", () => {
    const authority = createAdminCacheInstallationAuthority({ initialGeneration: MAX });
    const reset = vi.fn();
    authority.register(reset);
    const before = authority.capture();

    authority.advance();
    const afterFirst = authority.capture();
    authority.advance();

    expectZeroArgCalls(reset, 2);
    const afterSecond = authority.capture();
    expect(authority.isCurrent(before)).toBe(false);
    expect(authority.isCurrent(afterFirst)).toBe(false);
    expect(authority.isCurrent(afterSecond)).toBe(false);
    expect(authority.isCurrent(authority.capture())).toBe(false);
    expect(afterSecond).not.toBe(before);
    expect(afterSecond).not.toBe(afterFirst);
  });

  it("serializes post-disable sentinels without identity bytes", () => {
    const authority = createAdminCacheInstallationAuthority({ initialGeneration: MAX });
    authority.advance();
    const sentinel = authority.capture();

    expect(JSON.stringify(sentinel)).toBe("{}");
    expect(Object.keys(sentinel).length).toBe(0);
  });
});

describe("initialGeneration validation", () => {
  const invalidCases: Array<[string, number]> = [
    ["negative", -1],
    ["non-integer", 1.5],
    ["greater than MAX_SAFE_INTEGER", MAX + 1],
    ["positive infinity", Number.POSITIVE_INFINITY],
    ["NaN", Number.NaN],
    ["null", null as unknown as number],
    ["string", "1" as unknown as number],
  ];

  for (const [label, initialGeneration] of invalidCases) {
    it(`rejects ${label}`, () => {
      expect(() => createAdminCacheInstallationAuthority({ initialGeneration })).toThrowError(
        TypeError
      );
      let caught: unknown;
      try {
        createAdminCacheInstallationAuthority({ initialGeneration });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(TypeError);
      expect((caught as TypeError).message).toBe(INVALID_CODE);
    });
  }

  it("accepts omitted, undefined, -0, 0 and MAX_SAFE_INTEGER", () => {
    const accepted = [
      createAdminCacheInstallationAuthority(),
      createAdminCacheInstallationAuthority({}),
      createAdminCacheInstallationAuthority({ initialGeneration: undefined }),
      createAdminCacheInstallationAuthority({ initialGeneration: -0 }),
      createAdminCacheInstallationAuthority({ initialGeneration: 0 }),
      createAdminCacheInstallationAuthority({ initialGeneration: MAX }),
    ];

    for (const authority of accepted) {
      expect(authority.isCurrent(authority.capture())).toBe(true);
    }
  });
});

describe("default instance", () => {
  const defaultRegistrations: Array<() => void> = [];

  afterEach(() => {
    for (const unsubscribe of defaultRegistrations.splice(0)) {
      unsubscribe();
    }
  });

  it("delegates the four named functions to one default authority", () => {
    const reset = vi.fn();
    defaultRegistrations.push(registerAdminModuleCacheReset(reset));
    const before = captureAdminCacheInstallationToken();
    expect(isCurrentAdminCacheInstallationToken(before)).toBe(true);

    advanceAdminCacheInstallationAuthority();

    expectZeroArgCalls(reset, 1);
    const after = captureAdminCacheInstallationToken();
    expect(after).not.toBe(before);
    expect(isCurrentAdminCacheInstallationToken(before)).toBe(false);
    expect(isCurrentAdminCacheInstallationToken(after)).toBe(true);
  });

  it("unsubscribes a default-instance registration", () => {
    const reset = vi.fn();
    defaultRegistrations.push(registerAdminModuleCacheReset(reset));
    defaultRegistrations.splice(0).forEach((unsubscribe) => unsubscribe());

    advanceAdminCacheInstallationAuthority();

    expect(reset).not.toHaveBeenCalled();
  });
});

describe("source guard", () => {
  const modulePath = path.join(process.cwd(), "core/admin/utils/adminCacheAuthority.ts");
  const src = readFileSync(modulePath, "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("reads the real module", () => {
    expect(code).toMatch(/createAdminCacheInstallationAuthority/);
  });

  it("spells no host, browser, network or hashing identifier", () => {
    expect(code).not.toMatch(
      /\b(window|document|localStorage|sessionStorage|BroadcastChannel|fetch|crypto)\b/
    );
  });

  it("has no value import, re-export, dynamic import or require", () => {
    expect(code).not.toMatch(/^\s*import\s+(?!type\s)/m);
    expect(code).not.toMatch(/^\s*export\s[^;]*\sfrom\s*["']/m);
    expect(code).not.toMatch(/\bimport\s*\(/);
    expect(code).not.toMatch(/\brequire\s*\(/);
  });

  it("exports exactly the five runtime names", async () => {
    const moduleExports = await import("../../../core/admin/utils/adminCacheAuthority");

    expect(Object.keys(moduleExports).sort()).toEqual([
      "advanceAdminCacheInstallationAuthority",
      "captureAdminCacheInstallationToken",
      "createAdminCacheInstallationAuthority",
      "isCurrentAdminCacheInstallationToken",
      "registerAdminModuleCacheReset",
    ]);
  });
});
