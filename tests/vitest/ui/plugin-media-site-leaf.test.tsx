// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { MediaToolbar } from "../../../core/admin/ui/media/MediaToolbar";
import { PluginDetail } from "../../../core/admin/ui/plugins/PluginDetail";
import { PluginList } from "../../../core/admin/ui/plugins/PluginList";
import { SiteRouteEditor } from "../../../core/admin/ui/site/SiteRouteEditor";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    asChild,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    asChild?: boolean;
    [key: string]: unknown;
  }) =>
    asChild ? (
      <span data-as-child="true">{children}</span>
    ) : (
      <button type="button" onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input defaultValue={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => (
    <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    disabled,
    onCheckedChange,
  }: {
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <td className={className}>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <thead className={className}>{children}</thead>,
  TableRow: ({
    children,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <tr className={className} onClick={onClick}>
      {children}
    </tr>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) =>
    values.filter(Boolean).join(" "),
}));

vi.mock("@/utils/adminPaths", () => ({
  resolveAdminBasePath: () => "/panel",
  withAdminBasePath: (base: string, path: string) => `${base}${path}`,
}));

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

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

test("PluginDetail renders empty state without a selected plugin", () => {
  const view = mount(
    <PluginDetail
      onToggleEnabled={() => undefined}
      onPolicyChange={() => undefined}
      onUpdate={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain(
      "Select an installed plugin to manage updates and policy."
    );
  } finally {
    view.cleanup();
  }
});

test("PluginDetail forwards switch, policy, and update actions", () => {
  const onToggleEnabled = vi.fn();
  const onPolicyChange = vi.fn();
  const onUpdate = vi.fn();
  const view = mount(
    <PluginDetail
      plugin={{
        name: "SEO Optimizer",
        version: "1.2.0",
        status: "error",
        enabled: true,
        policy: "manual",
        updateAvailable: "1.3.0",
        lastUpdated: "2026-03-06",
        permissions: ["content.read", "seo.write"],
        lastError: "Signature mismatch",
      }}
      onToggleEnabled={onToggleEnabled}
      onPolicyChange={onPolicyChange}
      onUpdate={onUpdate}
    />
  );

  try {
    expect(view.container.textContent).toContain("SEO Optimizer");
    expect(view.container.textContent).toContain("Update available");
    expect(view.container.textContent).toContain("Plugin error");

    const toggle = view.container.querySelector("input[type='checkbox']");
    const select = view.container.querySelector("select");
    const button = Array.from(view.container.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Run update check")
    );

    act(() => {
      (toggle as HTMLInputElement | null)?.click();
      setSelectValue(select ?? undefined, "auto-security");
      button?.click();
    });

    expect(onToggleEnabled).toHaveBeenCalledWith(false);
    expect(onPolicyChange).toHaveBeenCalledWith("auto-security");
    expect(onUpdate).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});

test("PluginList renders rows, links, and selection callbacks", () => {
  const onSelect = vi.fn();
  const view = mount(
    <PluginList
      items={[
        {
          name: "SEO Optimizer",
          version: "1.2.0",
          status: "enabled",
          policy: "manual",
          lastUpdated: "2026-03-06",
          enabled: true,
          permissions: [],
        },
      ]}
      selectedName="SEO Optimizer"
      onSelect={onSelect}
    />
  );

  try {
    expect(view.container.textContent).toContain("SEO Optimizer");
    expect(view.container.textContent).toContain("manual");
    expect(view.container.innerHTML).toContain("/panel/store/plugins/SEO%20Optimizer");

    const row = view.container.querySelector("tbody tr");
    act(() => {
      row?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledWith("SEO Optimizer");
  } finally {
    view.cleanup();
  }
});

test("MediaToolbar forwards search, filters, upload preference, and view actions", () => {
  const onSearchChange = vi.fn();
  const onFilterChange = vi.fn();
  const onViewChange = vi.fn();
  const onOpenAfterUploadChange = vi.fn();
  const view = mount(
    <MediaToolbar
      search="hero"
      filter="image"
      view="grid"
      openAfterUpload
      onOpenAfterUploadChange={onOpenAfterUploadChange}
      onSearchChange={onSearchChange}
      onFilterChange={onFilterChange}
      onViewChange={onViewChange}
    />
  );

  try {
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const buttons = Array.from(view.container.querySelectorAll("button"));

    act(() => {
      setInputValue(inputs[0], "gallery");
      (inputs[1] as HTMLInputElement | null | undefined)?.click();
      buttons.find((button) => button.textContent?.includes("All Files"))?.click();
      buttons.find((button) => button.textContent?.includes("Documents"))?.click();
      buttons.find((button) => button.textContent?.includes("Audio"))?.click();
      buttons[4]?.click();
      buttons[5]?.click();
    });

    expect(onSearchChange).toHaveBeenCalledWith("gallery");
    expect(onOpenAfterUploadChange).toHaveBeenCalledWith(false);
    expect(onFilterChange).toHaveBeenCalledWith("all");
    expect(onFilterChange).toHaveBeenCalledWith("document");
    expect(onFilterChange).toHaveBeenCalledWith("audio");
    expect(onViewChange).toHaveBeenCalledWith("grid");
    expect(onViewChange).toHaveBeenCalledWith("list");
  } finally {
    view.cleanup();
  }
});

test("SiteRouteEditor renders missing state and forwards route updates", () => {
  const onChange = vi.fn();
  const onUseSuggested = vi.fn();
  const view = mount(
    <SiteRouteEditor
      name="Articles"
      slug="articles"
      route={{
        type: "articles",
        enabled: true,
        listPath: "/articles",
        detailPath: "/articles/:slug",
      }}
      suggested={{
        listPath: "/blog",
        detailPath: "/blog/:slug",
      }}
      errors={{
        listPath: "List path is required",
        detailPath: "Detail path must include :slug",
      }}
      missing
      onChange={onChange}
      onUseSuggested={onUseSuggested}
    />
  );

  try {
    expect(view.container.textContent).toContain("Missing type");
    expect(view.container.textContent).toContain("List path is required");
    expect(view.container.textContent).toContain("Detail path must include :slug");

    const toggle = view.container.querySelector("input[type='checkbox']");
    const inputs = Array.from(view.container.querySelectorAll("input")).slice(1);
    const button = Array.from(view.container.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Use suggested")
    );

    act(() => {
      (toggle as HTMLInputElement | null)?.click();
      setInputValue(inputs[0], "/news");
      setInputValue(inputs[1], "/news/:slug");
      button?.click();
    });

    expect(onChange).toHaveBeenCalledWith({
      enabled: false,
      listPath: "/articles",
      detailPath: "/articles/:slug",
    });
    expect(onChange).toHaveBeenCalledWith({
      enabled: true,
      listPath: "/news",
      detailPath: "/articles/:slug",
    });
    expect(onChange).toHaveBeenCalledWith({
      enabled: true,
      listPath: "/articles",
      detailPath: "/news/:slug",
    });
    expect(onUseSuggested).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});
