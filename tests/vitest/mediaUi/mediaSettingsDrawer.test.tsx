// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { MediaSettingsDrawer } from "../../../core/admin/ui/media/MediaSettingsDrawer";

const GB = 1024 * 1024 * 1024;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let cleanupFns: Array<() => void> = [];
afterEach(() => {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
});

const flushEffects = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

// MediaSettingsDrawer is a Radix Sheet that portals to document.body under
// happy-dom, so we client-mount and read the portalled body.
const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  cleanupFns.push(() => {
    React.act(() => root.unmount());
    container.remove();
  });
  return container;
};

const baseProps = {
  open: true as const,
  onOpenChange: () => undefined,
  accessMode: "public" as const,
  isLoading: false,
  isSaving: false,
  error: null,
  success: null,
  onAccessModeChange: () => undefined,
  onSave: () => undefined,
};

test("MediaSettingsDrawer renders delivery access controls", async () => {
  mount(<MediaSettingsDrawer {...baseProps} />);
  await flushEffects();
  const text = document.body.textContent ?? "";
  expect(text).toContain("Media settings");
  expect(text).toContain("Delivery access");
  expect(text).toContain("Access mode");
});

test("MediaSettingsDrawer omits the quota section when no quota handlers are provided", async () => {
  mount(<MediaSettingsDrawer {...baseProps} />);
  await flushEffects();
  expect(document.body.textContent ?? "").not.toContain("Storage quota");
});

test("MediaSettingsDrawer renders the quota section and converts GB input to bytes", async () => {
  const onQuotaTotalBytesChange = vi.fn();
  mount(
    <MediaSettingsDrawer
      {...baseProps}
      quotaPlanLabel="Pro plan"
      quotaTotalBytes={10 * GB}
      onQuotaPlanLabelChange={() => undefined}
      onQuotaTotalBytesChange={onQuotaTotalBytesChange}
    />
  );
  await flushEffects();

  expect(document.body.textContent ?? "").toContain("Storage quota");
  const totalInput = document.querySelector("#media-quota-total") as HTMLInputElement;
  expect(totalInput).toBeTruthy();
  // 10 GB pre-fills as "10".
  expect(totalInput.value).toBe("10");

  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(totalInput, "20");
    totalInput.dispatchEvent(new Event("input", { bubbles: true }));
    totalInput.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(onQuotaTotalBytesChange).toHaveBeenCalledWith(20 * GB);
});

test("MediaSettingsDrawer maps an empty quota input to null (unlimited)", async () => {
  const onQuotaTotalBytesChange = vi.fn();
  mount(
    <MediaSettingsDrawer
      {...baseProps}
      quotaPlanLabel={null}
      quotaTotalBytes={5 * GB}
      onQuotaPlanLabelChange={() => undefined}
      onQuotaTotalBytesChange={onQuotaTotalBytesChange}
    />
  );
  await flushEffects();

  const totalInput = document.querySelector("#media-quota-total") as HTMLInputElement;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(totalInput, "");
    totalInput.dispatchEvent(new Event("input", { bubbles: true }));
    totalInput.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(onQuotaTotalBytesChange).toHaveBeenCalledWith(null);
});
