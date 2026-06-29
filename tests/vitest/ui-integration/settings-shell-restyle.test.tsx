// @vitest-environment happy-dom
//
// TASK-479-28-L07: settings shell + sub-nav restyle (L01). Proves the Security
// branch reveals its sub-pages when a security id is active, collapses for
// non-security ids, routes canonically through AdminLink (resolved
// /admin/settings/... hrefs present in the markup), and keeps the
// dirty-navigation guard.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { renderAdminUi } from "../../utils/adminRouterRender";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { SettingsSidebar } from "../../../core/admin/ui/settings/SettingsSidebar";
import {
  SettingsDirtyNavigationProvider,
  useRegisterSettingsDirty,
} from "../../../core/admin/ui/settings/SettingsDirtyNavigation";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

afterEach(() => {
  document.body.innerHTML = "";
});

test("reveals Security children when a security id is active", () => {
  const html = renderAdminUi(<SettingsSidebar activeId="sessions" />);

  expect(html).toContain("/admin/settings/security");
  expect(html).toContain("/admin/settings/security/ip-allowlist");
  expect(html).toContain("/admin/settings/security/sessions");
  expect(html).toContain("/admin/settings/security/login-alerts");
});

test("collapses Security children for non-security ids", () => {
  const html = renderAdminUi(<SettingsSidebar activeId="general" />);

  expect(html).toContain("/admin/settings/security");
  expect(html).not.toContain("/admin/settings/security/ip-allowlist");
  expect(html).not.toContain("/admin/settings/security/login-alerts");
});

test("active item carries aria-current and the soft sidebar-accent chrome", () => {
  const html = renderAdminUi(<SettingsSidebar activeId="security" />);

  expect(html).toContain('aria-current="page"');
  expect(html).toContain("bg-sidebar-accent");
});

function DirtyHarness() {
  useRegisterSettingsDirty(true);
  return <SettingsSidebar activeId="general" />;
}

test("blocks navigation when the form is dirty", () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/general">
      <SettingsDirtyNavigationProvider>
        <DirtyHarness />
      </SettingsDirtyNavigationProvider>
    </AdminRouterProvider>
  );

  try {
    const link = view.container.querySelector(
      'a[href="/admin/settings/site"]'
    ) as HTMLAnchorElement | null;
    if (!link) throw new Error("missing site nav link");

    const event = new window.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    React.act(() => {
      link.dispatchEvent(event);
    });

    // dirty form → requestNavigation() returns false → the guard prevents the
    // click (AdminLink sees defaultPrevented and skips navigation). The full
    // discard dialog wiring is covered by settings-shell.test under SettingsShell.
    expect(event.defaultPrevented).toBe(true);
  } finally {
    view.cleanup();
  }
});
