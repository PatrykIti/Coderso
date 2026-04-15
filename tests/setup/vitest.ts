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
let removeHappyDomNetworkGuard: (() => void) | null = null;
let removeUnexpectedBrowserErrorGuard: (() => void) | null = null;

type HappyDomTestWindow = Window & {
  happyDOM?: {
    settings?: {
      fetch?: {
        interceptor?: {
          beforeAsyncRequest?: (input: {
            request: Request;
            window: Window;
          }) => Response | Promise<Response | undefined> | undefined;
          afterAsyncResponse?: (input: {
            request: Request;
            response: Response;
            window: Window;
          }) => Response | Promise<Response | undefined> | undefined;
        };
      };
    };
    waitUntilComplete?: () => Promise<void>;
  };
};

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

const installHappyDomNetworkGuard = () => {
  if (typeof window === "undefined" || removeHappyDomNetworkGuard) {
    return;
  }

  const testWindow = window as HappyDomTestWindow;
  const fetchSettings = testWindow.happyDOM?.settings?.fetch;
  if (!fetchSettings) return;

  const previousInterceptor = fetchSettings.interceptor;
  fetchSettings.interceptor = {
    ...previousInterceptor,
    beforeAsyncRequest: async (input) => {
      const previous = await previousInterceptor?.beforeAsyncRequest?.(input);
      if (previous instanceof Response) return previous;

      const url = input.request.url;
      if (/^https?:\/\//i.test(url)) {
        return new Response("", {
          status: 204,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return undefined;
    },
  };

  removeHappyDomNetworkGuard = () => {
    fetchSettings.interceptor = previousInterceptor;
    removeHappyDomNetworkGuard = null;
  };
};

const formatErrorPayload = (value: unknown) => {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const installUnexpectedBrowserErrorGuard = () => {
  if (removeUnexpectedBrowserErrorGuard) return;

  const captured: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    captured.push(args.map(formatErrorPayload).join(" "));
  };

  const handleWindowError = (event: ErrorEvent) => {
    captured.push(formatErrorPayload(event.error ?? event.message));
  };
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    captured.push(formatErrorPayload(event.reason));
  };

  if (typeof window !== "undefined") {
    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
  }

  removeUnexpectedBrowserErrorGuard = () => {
    console.error = originalConsoleError;
    if (typeof window !== "undefined") {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    }
    removeUnexpectedBrowserErrorGuard = null;
    if (captured.length > 0) {
      throw new Error(`Unexpected browser/test error output:\n${captured.join("\n")}`);
    }
  };
};

beforeEach(() => {
  // Prevent happy-dom from starting real navigation tasks in component tests.
  installUnexpectedBrowserErrorGuard();
  installHappyDomNavigationGuards();
  installHappyDomNetworkGuard();
});

afterEach(async () => {
  if (typeof window !== "undefined") {
    await (window as HappyDomTestWindow).happyDOM?.waitUntilComplete?.();
  }

  removeHappyDomNetworkGuard?.();
  removeHappyDomNavigationGuards?.();
  removeUnexpectedBrowserErrorGuard?.();

  if (typeof document !== "undefined") {
    document.body.innerHTML = "";
  }

  if (typeof window !== "undefined") {
    window.getSelection?.()?.removeAllRanges();
  }
});
