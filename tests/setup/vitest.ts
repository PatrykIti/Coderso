import { afterEach, beforeEach, expect } from "vitest";

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

const isElement = (value: EventTarget | null): value is Element =>
  typeof Element !== "undefined" && value instanceof Element;

let removeHappyDomNavigationGuards: (() => void) | null = null;

const installHappyDomNavigationGuards = () => {
  if (typeof document === "undefined" || removeHappyDomNavigationGuards) {
    return;
  }

  const handleClick = (event: Event) => {
    if (!isElement(event.target)) {
      return;
    }

    const anchor = event.target.closest("a[href]");
    if (anchor) {
      event.preventDefault();
    }
  };

  const handleSubmit = (event: Event) => {
    event.preventDefault();
  };

  document.addEventListener("click", handleClick, true);
  document.addEventListener("submit", handleSubmit, true);

  removeHappyDomNavigationGuards = () => {
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("submit", handleSubmit, true);
    removeHappyDomNavigationGuards = null;
  };
};

beforeEach(() => {
  // Prevent happy-dom from starting real navigation tasks in component tests.
  installHappyDomNavigationGuards();
});

afterEach(() => {
  removeHappyDomNavigationGuards?.();

  if (typeof document !== "undefined") {
    document.body.innerHTML = "";
  }

  if (typeof window !== "undefined") {
    window.getSelection?.()?.removeAllRanges();
  }
});
