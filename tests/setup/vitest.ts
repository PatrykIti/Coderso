import { afterEach, expect } from "vitest";

expect.extend({
  toBeTrue(received: unknown) {
    const pass = received === true;
    return {
      pass,
      message: () =>
        `expected ${String(received)} ${pass ? "not " : ""}to be true`,
    };
  },
  toBeFalse(received: unknown) {
    const pass = received === false;
    return {
      pass,
      message: () =>
        `expected ${String(received)} ${pass ? "not " : ""}to be false`,
    };
  },
  toBeObject(received: unknown) {
    const pass = typeof received === "object" && received !== null;
    return {
      pass,
      message: () =>
        `expected ${String(received)} ${pass ? "not " : ""}to be an object`,
    };
  },
});

afterEach(() => {
  if (typeof document !== "undefined") {
    document.body.innerHTML = "";
  }

  if (typeof window !== "undefined") {
    window.getSelection?.()?.removeAllRanges();
  }
});
