// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { RuntimePreviewDialog } from "../../../core/admin/ui/preview/RuntimePreviewDialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
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
    expect(document.body.innerHTML).toContain("sandbox=\"allow-same-origin allow-scripts\"");
    expect(document.body.innerHTML).toContain("data-preview-device=\"tablet\"");
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
    await act(async () => {
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain("Live preview unavailable");
    expect(document.body.textContent).toContain("Frontend is not responding at http://localhost:3000.");
    expect(document.body.textContent).not.toContain("secret-token");

    act(() => {
      Array.from(document.body.querySelectorAll("button"))
        .find((button) => button.textContent === "Open page settings")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onFixPreviewTarget).toHaveBeenCalledTimes(1);
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
    await act(async () => {
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
