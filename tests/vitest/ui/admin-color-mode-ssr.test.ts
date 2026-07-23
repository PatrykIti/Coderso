// @vitest-environment node

import { expect, test } from "vitest";

import { readInitialMode } from "../../../core/admin/ui/shared/AdminColorModeToggle";

test("readInitialMode avoids the Node global Web Storage accessor during SSR", () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  let accessorReads = 0;

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      accessorReads += 1;
      throw new Error("SSR must not read global localStorage");
    },
  });

  try {
    expect(typeof window).toBe("undefined");
    expect(readInitialMode()).toBe("light");
    expect(accessorReads).toBe(0);
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "localStorage", originalDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "localStorage");
    }
  }
});
