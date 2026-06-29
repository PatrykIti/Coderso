// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";

import { ThemeCard } from "../../../core/admin/ui/themes/ThemeCard";
import { ThemeExportDialog } from "../../../core/admin/ui/themes/ThemeExportDialog";
import { ThemeLivePreview } from "../../../core/admin/ui/themes/ThemeLivePreview";
import { ThemePreviewPanel } from "../../../core/admin/ui/themes/ThemePreviewPanel";
import { ThemeProfileCard } from "../../../core/admin/ui/themes/ThemeProfileCard";
import { ThemeTemplateCard } from "../../../core/admin/ui/themes/ThemeTemplateCard";
import { DEFAULT_ADMIN_THEME_TOKENS } from "../../../core/services/adminThemes/tokenTypes";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ defaultChecked }: { defaultChecked?: boolean }) => (
    <input type="checkbox" defaultChecked={defaultChecked} readOnly />
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

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

test("theme leaf cards render state and forward action callbacks", () => {
  const onEditTheme = vi.fn();
  const onDuplicateTheme = vi.fn();
  const onActivateTheme = vi.fn();
  const onEditProfile = vi.fn();
  const onActivateProfile = vi.fn();
  const onEditTemplate = vi.fn();
  const onDuplicateTemplate = vi.fn();

  const view = mount(
    <>
      <ThemeCard
        theme={{
          id: "theme-1",
          name: "Ocean",
          description: "Ocean palette",
          themeName: "ocean",
          palette: ["#0ea5e9", "#38bdf8"],
          icon: <span>icon</span>,
          iconClassName: "bg-sky-100",
        }}
        onEdit={onEditTheme}
        onDuplicate={onDuplicateTheme}
        onActivate={onActivateTheme}
      />
      <ThemeProfileCard
        profile={{
          id: "profile-1",
          name: "Storefront",
          description: "Main store profile",
          templateId: "template-1",
          templateName: "Starter",
          palette: ["#111111", "#ffffff"],
        }}
        onEdit={onEditProfile}
        onActivate={onActivateProfile}
      />
      <ThemeTemplateCard
        template={{
          id: "template-1",
          name: "Starter",
          description: "Starter template",
          palette: ["#111111", "#ffffff"],
          tokenCount: 24,
        }}
        onEdit={onEditTemplate}
        onDuplicate={onDuplicateTemplate}
      />
    </>
  );

  try {
    expect(view.container.textContent).toContain("Ocean");
    expect(view.container.textContent).toContain("Storefront");
    expect(view.container.textContent).toContain("Starter template");
    expect(view.container.textContent).toContain("24 tokens");

    const byLabel = (label: string) =>
      Array.from(view.container.querySelectorAll("button")).find(
        (button) => button.getAttribute("aria-label") === label
      );
    const activateButtons = Array.from(view.container.querySelectorAll("button")).filter((button) =>
      button.textContent?.includes("Activate")
    );

    React.act(() => {
      byLabel("Edit Ocean")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      byLabel("Duplicate Ocean")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      activateButtons[0]?.click();
      activateButtons[1]?.click();
      byLabel("Edit Storefront")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      byLabel("Edit Starter")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      byLabel("Duplicate Starter")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(activateButtons).toHaveLength(2);
    expect(onEditTheme).toHaveBeenCalledOnce();
    expect(onDuplicateTheme).toHaveBeenCalledOnce();
    expect(onActivateTheme).toHaveBeenCalledOnce();
    expect(onEditProfile).toHaveBeenCalledOnce();
    expect(onActivateProfile).toHaveBeenCalledOnce();
    expect(onEditTemplate).toHaveBeenCalledOnce();
    expect(onDuplicateTemplate).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});

test("ThemeProfileCard marks the active profile", () => {
  const activeView = mount(
    <ThemeProfileCard
      profile={{
        id: "profile-active",
        name: "Studio Active",
        description: "Main admin profile",
        templateId: "template-1",
        templateName: "Studio",
        palette: ["#111111", "#ffffff"],
        isActive: true,
      }}
      onEdit={() => undefined}
      onActivate={() => undefined}
    />
  );

  try {
    // Active affordance present; no "Activate" call-to-action when already active.
    expect(activeView.container.textContent).toContain("Active");
    expect(activeView.container.textContent).toContain("Current");
    const activateButton = Array.from(activeView.container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Activate")
    );
    expect(activateButton).toBeUndefined();
  } finally {
    activeView.cleanup();
  }

  const inactiveView = mount(
    <ThemeProfileCard
      profile={{
        id: "profile-inactive",
        name: "Draft",
        description: "Inactive",
        templateId: "template-1",
        templateName: "Studio",
        palette: ["#111111", "#ffffff"],
      }}
      onEdit={() => undefined}
      onActivate={() => undefined}
    />
  );

  try {
    const activateButton = Array.from(inactiveView.container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Activate")
    );
    expect(activateButton).toBeTruthy();
  } finally {
    inactiveView.cleanup();
  }
});

test("ThemeTemplateCard renders one palette swatch per color", () => {
  const palette = ["#7c3aed", "#ede9fe", "#faf5ff"];
  const view = mount(
    <ThemeTemplateCard
      template={{
        id: "template-1",
        name: "Studio",
        description: "Editorial palette",
        palette,
        tokenCount: 24,
      }}
      onEdit={() => undefined}
    />
  );

  try {
    const swatches = view.container.querySelectorAll("span.rounded-full");
    expect(swatches).toHaveLength(palette.length);
  } finally {
    view.cleanup();
  }
});

test("ThemeLivePreview paints --admin-* vars from the supplied tokens", () => {
  const view = mount(<ThemeLivePreview tokens={DEFAULT_ADMIN_THEME_TOKENS} />);

  try {
    const root = view.container.firstElementChild as HTMLElement | null;
    expect(root?.style.getPropertyValue("--admin-base-bg")).toBe(
      DEFAULT_ADMIN_THEME_TOKENS.base.bg
    );
    expect(root?.style.getPropertyValue("--admin-sidebar-bg")).toBe(
      DEFAULT_ADMIN_THEME_TOKENS.sidebar.bg
    );
  } finally {
    view.cleanup();
  }
});

test("ThemePreviewPanel renders typography, actions, and warning copy", () => {
  const html = renderToString(<ThemePreviewPanel />);

  expect(html).toContain("Typography &amp; Headings");
  expect(html).toContain("Primary Action");
  expect(html).toContain("Info Card");
  expect(html).toContain("Heads up!");
});

test("ThemeExportDialog renders export options and forwards close actions", () => {
  const onOpenChange = vi.fn();
  const view = mount(<ThemeExportDialog open onOpenChange={onOpenChange} />);

  try {
    expect(view.container.textContent).toContain("Export Theme Config");
    expect(view.container.textContent).toContain("Design tokens");
    expect(view.container.textContent).toContain("Template presets");
    expect(view.container.textContent).toContain("Typography scale");
    expect(view.container.textContent).toContain("Responsive breakpoints");

    const byLabel = (label: string) =>
      Array.from(view.container.querySelectorAll("button")).find(
        (button) => button.getAttribute("aria-label") === label
      );
    const byText = (text: string) =>
      Array.from(view.container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes(text)
      );

    React.act(() => {
      byLabel("Close export dialog")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      byText("Cancel")?.click();
      byText("Export Config")?.click();
    });

    expect(onOpenChange).toHaveBeenNthCalledWith(1, false);
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false);
    expect(onOpenChange).toHaveBeenNthCalledWith(3, false);
  } finally {
    view.cleanup();
  }

  const closedHtml = renderToString(
    <ThemeExportDialog open={false} onOpenChange={() => undefined} />
  );

  expect(closedHtml).toBe("");
});
