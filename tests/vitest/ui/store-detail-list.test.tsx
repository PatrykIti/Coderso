// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children?: React.ReactNode;
  }) => (
    <select
      aria-label="Version select"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value={value}>{value}</option>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <>{placeholder}</>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

import { StoreDetail } from "../../../core/admin/ui/store/StoreDetail";
import { StoreList } from "../../../core/admin/ui/store/StoreList";
import type { StoreCatalogItem } from "../../../core/admin/ui/store/types";

const item = (overrides: Partial<StoreCatalogItem> = {}): StoreCatalogItem => ({
  id: "seo-kit",
  name: "SEO Kit",
  description: "Search optimization helpers",
  status: "verified",
  tags: ["seo", "marketing"],
  securityScore: 92,
  lastUpdated: "2026-03-01",
  downloads: "1.2k",
  latestVersion: "2.0.0",
  permissions: ["read:posts"],
  versions: [
    { version: "2.0.0", releaseType: "security", compatible: true },
    { version: "1.9.0", releaseType: "normal", compatible: true },
  ],
  ...overrides,
});

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    unmount: () =>
      React.act(() => {
        root.unmount();
      }),
  };
};

describe("StoreDetail", () => {
  it("shows the empty state when no plugin is selected", () => {
    const view = mount(
      <StoreDetail
        onSelectVersion={() => undefined}
        onInstall={() => undefined}
        onUpdate={() => undefined}
      />
    );
    expect(view.container.textContent).toContain(
      "Select a plugin to see details and install options."
    );
    view.unmount();
  });

  it("defaults the version select to the first listed release", () => {
    const view = mount(
      <StoreDetail
        plugin={item()}
        onSelectVersion={() => undefined}
        onInstall={() => undefined}
        onUpdate={() => undefined}
      />
    );
    const select = view.container.querySelector<HTMLSelectElement>(
      "select[aria-label='Version select']"
    )!;
    expect(select.value).toBe("2.0.0");
    // security release badge is rendered with its label
    expect(view.container.textContent).toContain("security");
    view.unmount();
  });

  it("honours an explicit selectedVersion and reports version changes", () => {
    const onSelectVersion = vi.fn();
    const view = mount(
      <StoreDetail
        plugin={item()}
        selectedVersion="1.9.0"
        onSelectVersion={onSelectVersion}
        onInstall={() => undefined}
        onUpdate={() => undefined}
      />
    );
    const select = view.container.querySelector<HTMLSelectElement>(
      "select[aria-label='Version select']"
    )!;
    expect(select.value).toBe("1.9.0");

    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    if (!setter) throw new Error("value setter unavailable");
    setter.call(select, "2.0.0");
    React.act(() => {
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onSelectVersion).toHaveBeenCalledWith("2.0.0");
    view.unmount();
  });
});

describe("StoreList", () => {
  it("filters by query across name/description/tags and toggles Manage vs View", () => {
    const items = [
      item(),
      item({
        id: "backup-pro",
        name: "Backup Pro",
        description: "Nightly backups",
        tags: ["backup"],
        installedVersion: "1.0.0",
      }),
    ];
    const onQueryChange = vi.fn();
    const onSelect = vi.fn();
    const view = mount(
      <StoreList items={items} query="" onQueryChange={onQueryChange} onSelect={onSelect} />
    );

    expect(view.container.textContent).toContain("View");
    expect(view.container.textContent).toContain("Manage");

    clickCard(view.container, "Backup Pro");
    expect(onSelect).toHaveBeenCalledWith("backup-pro");

    // installed card renders the outline Manage action
    const manageButton = Array.from(view.container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === "Manage"
    ) as HTMLButtonElement;
    expect(manageButton.className).toContain("outline");
    view.unmount();
  });

  it("CTA button drives onSelect with the item id for both View and Manage", () => {
    const items = [
      item(),
      item({
        id: "backup-pro",
        name: "Backup Pro",
        description: "Nightly backups",
        tags: ["backup"],
        installedVersion: "1.0.0",
      }),
    ];
    const onSelect = vi.fn();
    const view = mount(
      <StoreList items={items} query="" onQueryChange={() => undefined} onSelect={onSelect} />
    );

    // The bottom CTA (View/Manage) is a sibling of the selectable card body, so it
    // must drive onSelect independently of clicking the card region itself.
    const cta = Array.from(view.container.querySelectorAll("button")).filter(
      (candidate) => candidate.textContent === "View" || candidate.textContent === "Manage"
    );
    expect(cta.map((button) => button.textContent)).toEqual(["View", "Manage"]);

    React.act(() => {
      cta[0].click();
    });
    expect(onSelect).toHaveBeenCalledWith("seo-kit");

    React.act(() => {
      cta[1].click();
    });
    expect(onSelect).toHaveBeenCalledWith("backup-pro");
    view.unmount();
  });

  it("query changes flow through onQueryChange", () => {
    const onQueryChange = vi.fn();
    const view = mount(
      <StoreList
        items={[item()]}
        query="s"
        onQueryChange={onQueryChange}
        onSelect={() => undefined}
      />
    );
    const input = view.container.querySelector<HTMLInputElement>("input")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("value setter unavailable");
    setter.call(input, "seo");
    React.act(() => {
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onQueryChange).toHaveBeenLastCalledWith("seo");
    view.unmount();
  });
});

function clickCard(container: HTMLElement, label: string) {
  // click the card whose name text is inside it (the whole card body is a button)
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing card ${label}`);
  React.act(() => {
    button.click();
  });
}
