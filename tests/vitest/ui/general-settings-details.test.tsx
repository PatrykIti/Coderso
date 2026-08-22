// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { GeneralSettingsPage } from "../../../core/admin/ui/settings/GeneralSettingsPage";
import { ApiClientError } from "../../../core/admin/services/apiClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const flush = () => React.act(() => new Promise((resolve) => setTimeout(resolve, 0)));

function mount(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  mountedRoots.push({ root, container });
  return { container, cleanup: () => cleanupRoot(root, container) };
}

function cleanupRoot(root: ReturnType<typeof createRoot>, container: HTMLDivElement) {
  React.act(() => {
    root.unmount();
  });
  container.remove();
  mountedRoots = mountedRoots.filter((item) => item.root !== root);
}

const pageText = () => document.body.textContent ?? "";

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function clickButton(text: string) {
  const button = Array.from(document.body.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing button ${text}`);
  await React.act(async () => {
    button.click();
    await Promise.resolve();
  });
}

afterEach(() => {
  for (const { root, container } of [...mountedRoots]) {
    cleanupRoot(root, container);
  }
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

const renderPage = (props: { onSave?: (values: unknown) => Promise<void> }) =>
  mount(
    <AdminRouterProvider initialPath="/admin/settings">
      <GeneralSettingsPage onSave={props.onSave} />
    </AdminRouterProvider>
  );

test("GeneralSettingsPage surfaces API save failures", async () => {
  const onSave = vi.fn().mockRejectedValue(new ApiClientError("bad", "general_down", 400));
  const view = renderPage({ onSave });
  try {
    await clickButton("Save changes");
    await flush();
    expect(pageText()).toContain("general_down");
  } finally {
    view.cleanup();
  }
});

test("GeneralSettingsPage falls back to a generic save failure", async () => {
  const onSave = vi.fn().mockRejectedValue(new Error("boom"));
  const view = renderPage({ onSave });
  try {
    await clickButton("Save changes");
    await flush();
    expect(pageText()).toContain("Failed to save general settings.");
  } finally {
    view.cleanup();
  }
});

test("GeneralSettingsPage confirms a successful save", async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const view = renderPage({ onSave });
  try {
    await clickButton("Save changes");
    await flush();
    expect(pageText()).toContain("General settings updated.");
  } finally {
    view.cleanup();
  }
});

test("GeneralSettingsPage toggles the autosave checkbox", async () => {
  const view = renderPage({ onSave: vi.fn() });
  try {
    const checkbox = document.body.querySelector<HTMLElement>('[data-slot="checkbox"]');
    if (!checkbox) throw new Error("missing autosave checkbox");
    await React.act(async () => {
      checkbox.click();
      await Promise.resolve();
    });
    expect(checkbox.getAttribute("data-state")).toBe("checked");
  } finally {
    view.cleanup();
  }
});

test("GeneralSettingsPage updates the site name through the branding card", async () => {
  const onSave = vi.fn();
  const view = renderPage({ onSave });
  try {
    const input = document.body.querySelector<HTMLInputElement>(
      'input[placeholder="e.g. My Awesome Site"]'
    );
    if (!input) throw new Error("missing site name input");
    await React.act(async () => {
      setInputValue(input, "My Renamed Site");
      await Promise.resolve();
    });
    expect(input.value).toBe("My Renamed Site");
    await clickButton("Save changes");
    await flush();
    expect(onSave).toHaveBeenCalled();
    const payload = onSave.mock.calls[0][0] as { siteName: string };
    expect(payload.siteName).toBe("My Renamed Site");
  } finally {
    view.cleanup();
  }
});
