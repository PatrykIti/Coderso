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

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

test("RuntimePreviewDialog renders description and iframe sandbox contract", () => {
  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="/preview?type=page&token=test"
      isLoading={false}
      error={null}
      device="tablet"
    />
  );

  try {
    expect(document.body.innerHTML).toContain("Runtime preview (read-only, site theme).");
    expect(document.body.innerHTML).toContain('sandbox="allow-same-origin allow-scripts"');
    expect(document.body.innerHTML).toContain('data-preview-device="tablet"');
  } finally {
    view.cleanup();
  }
});

test("RuntimePreviewDialog shows actionable loopback failure without leaking tokens", async () => {
  vi.useFakeTimers();
  const onFixPreviewTarget = vi.fn();
  vi.spyOn(window, "fetch").mockRejectedValueOnce(new Error("ECONNREFUSED"));

  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="http://localhost:3000/preview?type=page&token=secret-token"
      isLoading={false}
      error={null}
      onFixPreviewTarget={onFixPreviewTarget}
      fixPreviewTargetLabel="Open page settings"
    />
  );

  try {
    await React.act(async () => {
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain("Live preview unavailable");
    expect(document.body.textContent).toContain(
      "Frontend is not responding at http://localhost:3000."
    );
    expect(document.body.textContent).not.toContain("secret-token");

    React.act(() => {
      Array.from(document.body.querySelectorAll("button"))
        .find((button) => button.textContent === "Open page settings")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onFixPreviewTarget).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("RuntimePreviewDialog renders probe failure placeholder before iframe load", () => {
  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="https://preview.example.test/preview?type=page&token=secret-token"
      probeResult={{
        ok: false,
        status: 503,
        reason: "http_error",
        targetLabel:
          "https://preview.example.test/preview?type=page&token=secret-token&device=mobile",
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
    expect(document.body.textContent).not.toContain("secret-token");
    expect(document.body.querySelector("iframe")).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("RuntimePreviewDialog renders iframe for successful probe and load", () => {
  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="https://preview.example.test/preview?type=page&token=secret-token"
      probeResult={{
        ok: true,
        status: 200,
        targetLabel: "https://preview.example.test/preview",
      }}
      isLoading={false}
      error={null}
      device="mobile"
    />
  );

  try {
    const iframe = document.body.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("data-preview-device")).toBe("mobile");

    React.act(() => {
      iframe?.dispatchEvent(new Event("load", { bubbles: true }));
    });

    expect(document.body.textContent).not.toContain("Live preview unavailable");
    expect(document.body.querySelector("iframe")).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("RuntimePreviewDialog falls back after iframe timeout for non-loopback hosts", async () => {
  vi.useFakeTimers();

  const view = mount(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="https://preview.example.test/preview?type=page&token=secret-token"
      isLoading={false}
      error={null}
    />
  );

  try {
    await React.act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain("Live preview unavailable");
    expect(document.body.textContent).toContain(
      "Preview could not load from https://preview.example.test."
    );
    expect(document.body.textContent).not.toContain("secret-token");
  } finally {
    view.cleanup();
  }
});
