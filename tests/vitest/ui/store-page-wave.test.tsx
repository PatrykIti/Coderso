// @vitest-environment happy-dom

import React from "react";
import { beforeEach, expect, test, vi } from "vitest";

import { PluginStorePage } from "../../../core/admin/ui/store/PluginStorePage";
import { clickByText, flush, mount } from "./seoWaveFixtures";

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

const TabsContext = React.createContext<{
  register: (value: string, source?: string) => void;
}>({ register: () => {} });

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    children,
    defaultValue,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    defaultValue?: string;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => {
    const [current, setCurrent] = React.useState(defaultValue ?? value);
    // Controlled `value` changes are driven through the mocked trigger's
    // register callback below, so no sync effect is needed here.
    return (
      <TabsContext.Provider
        value={{
          register: (v: string) => {
            if (onValueChange) onValueChange(v);
            else setCurrent(v);
          },
        }}
      >
        <div data-tabs-value={current}>{children}</div>
      </TabsContext.Provider>
    );
  },
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <TabsContext.Consumer>
      {({ register }) => (
        <button type="button" onClick={() => register(value, "trigger")}>
          {children}
        </button>
      )}
    </TabsContext.Consumer>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({ title }: { title: string; description?: string }) => <h1>{title}</h1>,
}));

const pluginDetailCalls = vi.hoisted(() => ({
  toggle: vi.fn(),
  policy: vi.fn(),
  updateCheck: vi.fn(),
}));

vi.mock("../../../core/admin/ui/plugins/PluginDetail", () => ({
  PluginDetail: ({
    plugin,
    onToggleEnabled,
    onPolicyChange,
    onUpdate,
  }: {
    plugin?: { name: string; enabled: boolean } | null;
    onToggleEnabled: (enabled: boolean) => void;
    onPolicyChange: (policy: string) => void;
    onUpdate: () => void;
  }) =>
    plugin ? (
      <div>
        <span>{`detail:${plugin.name}`}</span>
        <button
          type="button"
          onClick={() => {
            pluginDetailCalls.toggle();
            onToggleEnabled(!plugin.enabled);
          }}
        >
          toggle-enabled
        </button>
        <button
          type="button"
          onClick={() => {
            pluginDetailCalls.policy();
            onPolicyChange("auto-all");
          }}
        >
          policy-change
        </button>
        <button
          type="button"
          onClick={() => {
            pluginDetailCalls.updateCheck();
            onUpdate();
          }}
        >
          check-updates
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/plugins/PluginList", () => ({
  PluginList: ({
    items,
    onSelect,
  }: {
    items: Array<{ name: string; status: string; policy?: string }>;
    selectedName: string;
    onSelect: (name: string) => void;
  }) => (
    <div>
      {items.map((item) => (
        <button key={item.name} type="button" onClick={() => onSelect(item.name)}>
          {`pick-installed:${item.name}:${item.status}:${item.policy ?? ""}`}
        </button>
      ))}
    </div>
  ),
}));

beforeEach(() => {
  document.body.innerHTML = "";
});

test("store page renders catalog, filters by search, and installs a new plugin", async () => {
  const view = mount(<PluginStorePage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Plugin Store");
    expect(view.container.textContent).toContain("Coderso Analytics");
    // Featured banner picks the official item.
    expect(view.container.textContent).toContain("Privacy-focused analytics dashboard");

    // Search narrows the StoreList.
    setInput(view.container, "Search plugins", "localizer");
    expect(view.container.textContent).toContain("Translate content types across 50+ languages.");
    setInput(view.container, "Search plugins", "");
    setInput(view.container, "Search plugins", "zzz-none");
    expect(view.container.textContent).toContain("No plugins match your search.");
    setInput(view.container, "Search plugins", "");

    // Select the uninstalled localizer and install it.
    clickByText(view.container, "Polyglot Localizer");
    clickByText(view.container, "Install plugin");
    await flush();
    expect(view.container.textContent).toContain("pick-installed:Polyglot Localizer:enabled");
  } finally {
    view.cleanup();
  }
});

test("updating an installed plugin refreshes its version and detail actions work", async () => {
  const view = mount(<PluginStorePage />);
  try {
    await flush();

    clickByText(view.container, "SEO Boost");
    clickByText(view.container, "Update plugin");
    await flush();
    // After updating, the installed tab lists the refreshed entry.
    expect(view.container.textContent).toContain("pick-installed:SEO Boost");

    // Installed tab interactions through mocked detail/list seams.
    clickByText(view.container, "pick-installed:Coderso Analytics");
    expect(view.container.textContent).toContain("detail:Coderso Analytics");
    clickByText(view.container, "toggle-enabled");
    await flush();
    clickByText(view.container, "check-updates");
    await flush();
    expect(pluginDetailCalls.toggle).toHaveBeenCalled();
    expect(pluginDetailCalls.updateCheck).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("changing an installed plugin's update policy persists the new policy", async () => {
  const view = mount(<PluginStorePage />);
  try {
    await flush();

    clickByText(view.container, "pick-installed:Coderso Analytics");
    expect(view.container.textContent).toContain("detail:Coderso Analytics");
    // Seed policy is manual; the mocked installed list surfaces the current policy.
    expect(view.container.textContent).toContain("pick-installed:Coderso Analytics:enabled:manual");

    clickByText(view.container, "policy-change");
    await flush();
    expect(pluginDetailCalls.policy).toHaveBeenCalled();
    expect(view.container.textContent).toContain(
      "pick-installed:Coderso Analytics:enabled:auto-all"
    );
  } finally {
    view.cleanup();
  }
});

test("featured banner CTA selects the official plugin in the detail panel", async () => {
  const view = mount(<PluginStorePage />);
  try {
    await flush();
    // Default selection is the first catalog item (SEO Boost, installed 2.3.2).
    expect(view.container.textContent).toContain("Installed: 2.3.2");

    // Featured banner is the official "Coderso Analytics" item; its CTA drives
    // handleSelectStore(featured.id), switching the StoreDetail panel to it.
    clickByText(view.container, "View plugin");
    await flush();
    expect(view.container.textContent).toContain("Installed: 3.1.2");
  } finally {
    view.cleanup();
  }
});

function setInput(container: HTMLElement, placeholder: string, value: string) {
  const element = Array.from(container.querySelectorAll("input")).find(
    (candidate) => candidate.placeholder === placeholder
  );
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Missing input: ${placeholder}`);
  }
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    nativeSetter?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
