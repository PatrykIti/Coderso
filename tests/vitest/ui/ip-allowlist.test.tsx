// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import type { IpAllowlistEntry } from "../../../core/admin/services/ipAllowlistClient";
import { IpAllowlistTable } from "../../../core/admin/ui/settings/IpAllowlistTable";
import { IpAllowlistPage } from "../../../core/admin/ui/settings/IpAllowlistPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(node);
  });

  return {
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
      document.body.innerHTML = "";
    },
  };
};

const allowlistEntry = (overrides: Partial<IpAllowlistEntry> = {}): IpAllowlistEntry => ({
  id: "allow-1",
  cidr: "198.51.100.0/24",
  label: "Office",
  description: "Office network",
  createdAt: "2026-06-01T10:00:00.000Z",
  ...overrides,
});

const findButton = (label: string) => {
  const normalize = (value: string | null | undefined) => value?.replace(/\s+/g, " ").trim();
  const button = Array.from(document.body.querySelectorAll("button")).find((item) => {
    const accessibleLabel = item.getAttribute("aria-label");
    return normalize(item.textContent) === label || accessibleLabel === label;
  });
  if (!button) throw new Error(`Missing button ${label}`);
  return button as HTMLButtonElement;
};

const clickButton = async (label: string) => {
  const button = findButton(label);
  await React.act(async () => {
    button.click();
    await Promise.resolve();
    await Promise.resolve();
  });
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("IpAllowlistPage renders table and drawer", () => {
  const html = renderAdminUi(<IpAllowlistPage />);

  expect(html).toContain("IP Allowlist");
  expect(html).toContain("Active Restrictions");
  expect(html).toContain("Add New IP Range");
  expect(html).toContain("Loading allowlist");
});

test("IpAllowlistTable confirms remove with target CIDR and keeps cancel side-effect free", async () => {
  const onRemove = vi.fn(async () => undefined);
  const view = mount(<IpAllowlistTable entries={[allowlistEntry()]} onRemove={onRemove} />);

  try {
    expect(document.body.textContent).toContain(
      "Removing an allowlisted range can lock admins out"
    );

    await clickButton("Remove 198.51.100.0/24");
    expect(document.body.textContent).toContain("Remove IP allowlist entry");
    expect(document.body.textContent).toContain("198.51.100.0/24");
    expect(document.body.textContent).toContain("current IP address");

    await clickButton("Cancel");
    expect(onRemove).not.toHaveBeenCalled();

    await clickButton("Remove 198.51.100.0/24");
    await clickButton("Remove range");
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledWith("allow-1");
  } finally {
    view.cleanup();
  }
});
