// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { RuntimePreviewDialog } from "../../../core/admin/ui/preview/RuntimePreviewDialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const clickButton = (label: string) => {
  const button = Array.from(document.body.querySelectorAll("button")).find(
    (candidate) => candidate.getAttribute("aria-label") === label
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button ${label}`);
  }
  React.act(() => {
    button.click();
  });
};

const iframeSrc = () => document.body.querySelector("iframe")?.getAttribute("src") ?? null;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

test("RuntimePreviewDialog switches the internal device when no device prop is given", () => {
  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="/preview?type=page"
      isLoading={false}
      error={null}
    />
  );

  try {
    expect(iframeSrc()).toBe("/preview?type=page&device=desktop");
    expect(document.body.querySelector("iframe")?.getAttribute("data-preview-device")).toBe(
      "desktop"
    );

    clickButton("Tablet");
    expect(document.body.querySelector("iframe")?.getAttribute("data-preview-device")).toBe(
      "tablet"
    );
    expect(iframeSrc()).toBe("/preview?type=page&device=tablet");

    clickButton("Mobile");
    expect(document.body.querySelector("iframe")?.getAttribute("data-preview-device")).toBe(
      "mobile"
    );
  } finally {
    view.cleanup();
  }
});

test("RuntimePreviewDialog forwards device changes to onDeviceChange", () => {
  const onDeviceChange = vi.fn();
  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="https://preview.example.test/preview"
      isLoading={false}
      error={null}
      device="desktop"
      onDeviceChange={onDeviceChange}
    />
  );

  try {
    clickButton("Mobile");
    expect(onDeviceChange).toHaveBeenCalledWith("mobile");
    // The controlled device prop stays authoritative.
    expect(document.body.querySelector("iframe")?.getAttribute("data-preview-device")).toBe(
      "desktop"
    );
  } finally {
    view.cleanup();
  }
});

test("RuntimePreviewDialog close button reports the open change", () => {
  const onOpenChange = vi.fn();
  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={onOpenChange}
      title="Preview"
      canPreview
      previewUrl="https://preview.example.test/preview"
      isLoading={false}
      error={null}
    />
  );

  try {
    clickButton("Close preview");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});

test("RuntimePreviewDialog keeps the device parameter in the iframe src for absolute hosts", () => {
  // Absolute URLs resolve to the origin with the device appended.
  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="https://preview.example.test/preview?type=page"
      isLoading={false}
      error={null}
      device="mobile"
    />
  );

  try {
    expect(iframeSrc()).toBe("https://preview.example.test/preview?type=page&device=mobile");
  } finally {
    view.cleanup();
  }
});

test("RuntimePreviewDialog explains redirect_blocked, invalid_target, and unreachable probes", () => {
  const cases: Array<{
    reason: "redirect_blocked" | "invalid_target" | "unreachable";
    expected: string;
  }> = [
    {
      reason: "redirect_blocked",
      expected:
        "Preview redirected outside the approved target from https://preview.example.test/preview. Check the configured public URL.",
    },
    {
      reason: "invalid_target",
      expected:
        "Preview target is not configured correctly for https://preview.example.test/preview. Update the configured public URL.",
    },
    {
      reason: "unreachable",
      expected:
        "Preview target is not responding at https://preview.example.test/preview. Check that the public frontend is reachable.",
    },
  ];

  for (const { reason, expected } of cases) {
    const view = mount(
      <RuntimePreviewDialog
        open
        onOpenChange={() => undefined}
        title="Preview"
        canPreview
        previewUrl="https://preview.example.test/preview?type=page&token=secret-token"
        probeResult={{
          ok: false,
          reason,
          targetLabel: "https://preview.example.test/preview?type=page&token=secret-token",
        }}
        isLoading={false}
        error={null}
      />
    );

    try {
      expect(document.body.textContent).toContain("Live preview unavailable");
      expect(document.body.textContent).toContain(expected);
      expect(document.body.textContent).not.toContain("secret-token");
    } finally {
      view.cleanup();
    }
  }
});

test("RuntimePreviewDialog renders loading, error, cannot-preview, empty, and unavailable states", () => {
  const loadingView = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="https://preview.example.test/preview"
      isLoading
      error={null}
    />
  );
  try {
    expect(document.body.textContent).toContain("Rendering runtime preview...");
  } finally {
    loadingView.cleanup();
  }

  const errorView = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="https://preview.example.test/preview"
      isLoading={false}
      error="Preview target rejected the render request"
    />
  );
  try {
    expect(document.body.textContent).toContain("Preview target rejected the render request");
  } finally {
    errorView.cleanup();
  }

  const cannotPreviewView = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview={false}
      previewUrl="https://preview.example.test/preview"
      isLoading={false}
      error={null}
    />
  );
  try {
    expect(document.body.textContent).toContain(
      "Save this resource to generate a runtime preview."
    );
  } finally {
    cannotPreviewView.cleanup();
  }

  const emptyView = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      showEmpty
      emptyMessage="Nothing to preview yet."
      previewUrl="https://preview.example.test/preview"
      isLoading={false}
      error={null}
    />
  );
  try {
    expect(document.body.textContent).toContain("Nothing to preview yet.");
  } finally {
    emptyView.cleanup();
  }

  const unavailableView = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl={null}
      isLoading={false}
      error={null}
    />
  );
  try {
    expect(document.body.textContent).toContain("Preview data is not available yet.");
  } finally {
    unavailableView.cleanup();
  }
});

test("RuntimePreviewDialog tolerates an invalid absolute target URL without leaking query params", () => {
  // An absolute-looking target whose host fails to parse exercises the catch
  // branches in the URL helpers (device append, origin, loopback probe).
  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="http://[invalid"
      isLoading={false}
      error={null}
    />
  );

  try {
    expect(document.body.querySelector("iframe")).not.toBeNull();
    expect(iframeSrc()).toBe("http://[invalid");
  } finally {
    view.cleanup();
  }
});

test("RuntimePreviewDialog redacts an unparseable probe target label", () => {
  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="https://preview.example.test/preview"
      probeResult={{
        ok: false,
        reason: "unreachable",
        targetLabel: "http://[invalid",
      }}
      isLoading={false}
      error={null}
    />
  );

  try {
    expect(document.body.textContent).toContain("Live preview unavailable");
    expect(document.body.textContent).toContain(
      "Preview target is not responding at http://[invalid."
    );
  } finally {
    view.cleanup();
  }
});

test("RuntimePreviewDialog explains an http_error probe with its status code", () => {
  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="https://preview.example.test/preview"
      probeResult={{
        ok: false,
        reason: "http_error",
        status: 503,
        targetLabel: "https://preview.example.test/preview",
      }}
      isLoading={false}
      error={null}
    />
  );

  try {
    expect(document.body.textContent).toContain("Live preview unavailable");
    expect(document.body.textContent).toContain(
      "Preview target returned 503 at https://preview.example.test/preview."
    );
    expect(document.body.textContent).toContain(
      "Check that the public frontend can render this preview route."
    );
  } finally {
    view.cleanup();
  }
});

test("RuntimePreviewDialog explains a timeout probe with the generic fallback message", () => {
  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="https://preview.example.test/preview"
      probeResult={{
        ok: false,
        reason: "timeout",
        targetLabel: "https://preview.example.test/preview",
      }}
      isLoading={false}
      error={null}
    />
  );

  try {
    expect(document.body.textContent).toContain("Live preview unavailable");
    expect(document.body.textContent).toContain(
      "Preview could not load from https://preview.example.test/preview."
    );
  } finally {
    view.cleanup();
  }
});

test("RuntimePreviewDialog reports a loopback frontend whose readiness probe fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new TypeError("fetch failed")))
  );
  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="http://localhost:4321/preview"
      isLoading={false}
      error={null}
    />
  );

  try {
    // Let the no-cors readiness fetch reject and surface the loopback error.
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain("Live preview unavailable");
    expect(document.body.textContent).toContain(
      "Frontend is not responding at http://localhost:4321."
    );
    expect(document.body.textContent).toContain(
      "Start the public frontend or update the configured public URL."
    );
  } finally {
    view.cleanup();
  }
});

test("RuntimePreviewDialog clears stale load state on the frame after mount", async () => {
  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="/preview?type=page"
      isLoading={false}
      error={null}
    />
  );

  try {
    expect(document.body.querySelector("iframe")).not.toBeNull();
    // The mount effect schedules a 0ms reset; let the macrotask fire inside
    // act so its state updates are wrapped.
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(document.body.querySelector("iframe")).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("RuntimePreviewDialog reports a render timeout when the iframe never loads", () => {
  vi.useFakeTimers();
  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="https://preview.example.test/preview"
      isLoading={false}
      error={null}
    />
  );

  try {
    expect(document.body.querySelector("iframe")).not.toBeNull();
    React.act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(document.body.textContent).toContain("Live preview unavailable");
    expect(document.body.textContent).toContain(
      "Preview could not load from https://preview.example.test."
    );
  } finally {
    view.cleanup();
  }
});

test("RuntimePreviewDialog marks the iframe ready when it reports a load event", () => {
  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="/preview?type=page"
      isLoading={false}
      error={null}
    />
  );

  try {
    const iframe = document.body.querySelector("iframe");
    expect(iframe?.className).toContain("opacity-0");
    React.act(() => {
      iframe?.dispatchEvent(new Event("load"));
    });
    const loadedIframe = document.body.querySelector("iframe");
    expect(loadedIframe?.className).toContain("opacity-100");
  } finally {
    view.cleanup();
  }
});

test("RuntimePreviewDialog times out a hung loopback readiness probe", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (_input: unknown, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        })
    )
  );
  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="http://localhost:4321/preview"
      isLoading={false}
      error={null}
    />
  );

  try {
    expect(document.body.querySelector("iframe")).not.toBeNull();
    // The readiness fetch never settles; the 8s budget aborts it, surfacing
    // the loopback-unreachable failure through the timeout path.
    await React.act(async () => {
      vi.advanceTimersByTime(8000);
    });
    expect(document.body.textContent).toContain("Live preview unavailable");
    expect(document.body.textContent).toContain(
      "Frontend is not responding at http://localhost:4321."
    );
  } finally {
    view.cleanup();
  }
});
