// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { MediaSettingsDrawer } from "../../../core/admin/ui/media/MediaSettingsDrawer";

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

test("MediaSettingsDrawer propagates an access mode change", async () => {
  const onAccessModeChange = vi.fn();
  mount(<MediaSettingsDrawer {...baseProps} onAccessModeChange={onAccessModeChange} />);
  await flushEffects();
  // Radix Select renders a trigger button; open it and pick Internal.
  const trigger = document.body.querySelector('[role="combobox"]') as HTMLElement;
  React.act(() => {
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flushEffects();
  const internalItem = Array.from(document.body.querySelectorAll('[role="option"]')).find(
    (option) => option.textContent?.includes("Internal")
  );
  React.act(() => {
    internalItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flushEffects();
  expect(onAccessModeChange).toHaveBeenCalledWith("internal");
});

test("MediaSettingsDrawer propagates the quota plan label and clears it on empty input", async () => {
  const onQuotaPlanLabelChange = vi.fn();
  mount(
    <MediaSettingsDrawer
      {...baseProps}
      quotaPlanLabel="Pro"
      onQuotaPlanLabelChange={onQuotaPlanLabelChange}
    />
  );
  await flushEffects();
  const planInput = document.querySelector("#media-quota-plan") as HTMLInputElement;
  expect(planInput).toBeTruthy();
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(planInput, "Enterprise");
    planInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(onQuotaPlanLabelChange).toHaveBeenCalledWith("Enterprise");
  React.act(() => {
    descriptor?.set?.call(planInput, "");
    planInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(onQuotaPlanLabelChange).toHaveBeenCalledWith(null);
});

test("MediaSettingsDrawer maps an invalid or non-positive quota to null", async () => {
  const onQuotaTotalBytesChange = vi.fn();
  mount(
    <MediaSettingsDrawer
      {...baseProps}
      quotaTotalBytes={null}
      onQuotaTotalBytesChange={onQuotaTotalBytesChange}
    />
  );
  await flushEffects();
  const totalInput = document.querySelector("#media-quota-total") as HTMLInputElement;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  // Zero is not a positive quota; it maps to null (unlimited).
  React.act(() => {
    descriptor?.set?.call(totalInput, "0");
    totalInput.dispatchEvent(new Event("input", { bubbles: true }));
    totalInput.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(onQuotaTotalBytesChange).toHaveBeenCalledWith(null);
  React.act(() => {
    descriptor?.set?.call(totalInput, "-3");
    totalInput.dispatchEvent(new Event("input", { bubbles: true }));
    totalInput.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(onQuotaTotalBytesChange.mock.calls).toEqual([[null], [null]]);
});

test("MediaSettingsDrawer cancel button closes the sheet", async () => {
  const onOpenChange = vi.fn();
  mount(<MediaSettingsDrawer {...baseProps} onOpenChange={onOpenChange} />);
  await flushEffects();
  const cancel = Array.from(document.body.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Cancel"
  ) as HTMLButtonElement;
  expect(cancel).toBeTruthy();
  React.act(() => {
    cancel.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("MediaSettingsDrawer shows the loading placeholder while isLoading", async () => {
  mount(<MediaSettingsDrawer {...baseProps} isLoading />);
  await flushEffects();
  expect(document.body.textContent ?? "").toContain("Loading media settings...");
});

test("MediaSettingsDrawer disables the save button and shows saving label while isSaving", async () => {
  mount(<MediaSettingsDrawer {...baseProps} isSaving />);
  await flushEffects();
  const save = Array.from(document.body.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Saving..."
  ) as HTMLButtonElement;
  expect(save).toBeTruthy();
  expect(save.disabled).toBe(true);
});
