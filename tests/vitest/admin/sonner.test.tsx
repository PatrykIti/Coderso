// @vitest-environment happy-dom

import fs from "node:fs";
import path from "node:path";
import type { CSSProperties, ReactNode } from "react";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

type MockSonnerProps = {
  theme?: string;
  className?: string;
  style?: CSSProperties;
  icons?: Record<string, ReactNode>;
};

const sonnerState = vi.hoisted(() => ({
  props: null as MockSonnerProps | null,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "custom-admin-mode" }),
}));

vi.mock("sonner", () => ({
  Toaster: (props: MockSonnerProps) => {
    sonnerState.props = props;
    return (
      <div
        data-testid="sonner"
        data-theme={props.theme}
        className={props.className}
        style={props.style}
      />
    );
  },
}));

import {
  ADMIN_TOASTER_TOKEN_STYLE,
  Toaster,
} from "../../../core/admin/components/ui/sonner";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(node);
  });
  return {
    host,
    cleanup: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
};

test("Toaster maps rich color state variables to Admin UI Theme tokens", () => {
  const view = mount(
    <Toaster
      className="custom-toaster"
      style={
        {
          "--success-bg": "#00ff00",
          "--custom-layout-offset": "12px",
        } as CSSProperties
      }
    />
  );

  try {
    expect(sonnerState.props?.theme).toBe("custom-admin-mode");
    expect(sonnerState.props?.className).toContain("toaster");
    expect(sonnerState.props?.className).toContain("group");
    expect(sonnerState.props?.className).toContain("custom-toaster");

    const style = sonnerState.props?.style as Record<string, string>;
    expect(style["--custom-layout-offset"]).toBe("12px");
    expect(style["--success-bg"]).toBe("var(--popover)");
    expect(style["--success-border"]).toBe("var(--admin-state-success)");
    expect(style["--error-border"]).toBe("var(--admin-state-danger)");
    expect(style["--warning-border"]).toBe("var(--admin-state-warning)");
    expect(style["--info-bg"]).toBe("var(--popover)");
    expect(style["--info-border"]).toBe("var(--border)");
    expect(style["--normal-bg"]).toBe("var(--popover)");
    expect(style["--admin-toast-description"]).toBe("var(--muted-foreground)");
    expect(style["--admin-toast-close-bg"]).toBe("var(--popover)");
    expect(style["--admin-toast-action-bg"]).toBe("var(--primary)");
    expect(style["--admin-toast-cancel-bg"]).toBe("var(--secondary)");
    expect(style["--admin-toast-focus"]).toBe("var(--ring)");
  } finally {
    view.cleanup();
  }
});

test("Toaster exposes shared state icons and avoids bundled hard-coded palettes", () => {
  const values = Object.values(ADMIN_TOASTER_TOKEN_STYLE).map(String);
  expect(values).toContain("var(--admin-state-success)");
  expect(values).toContain("var(--admin-state-warning)");
  expect(values).toContain("var(--admin-state-danger)");
  expect(values.join(" ")).not.toMatch(/#[0-9a-f]{3,8}|hsl\(/i);

  const view = mount(<Toaster />);
  try {
    expect(Object.keys(sonnerState.props?.icons ?? {}).sort()).toEqual([
      "error",
      "info",
      "loading",
      "success",
      "warning",
    ]);
  } finally {
    view.cleanup();
  }
});

test("global CSS scopes Sonner sub-parts to shared Admin UI toast variables", () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), "core/admin/styles/globals.css"),
    "utf8"
  );

  expect(css).toContain(".toaster [data-sonner-toast][data-type=\"success\"]");
  expect(css).toContain(".toaster [data-sonner-toast][data-type=\"error\"]");
  expect(css).toContain(".toaster [data-sonner-toast][data-type=\"warning\"]");
  expect(css).toContain(".toaster [data-sonner-toast][data-type=\"info\"]");
  expect(css).toContain("[data-description]");
  expect(css).toContain("[data-close-button]");
  expect(css).toContain("[data-action]");
  expect(css).toContain("[data-cancel]");
  expect(css).toContain("[data-loader]");
  expect(css).toContain("var(--admin-toast-hover-bg)");
  expect(css).toContain("var(--admin-toast-focus)");
});
