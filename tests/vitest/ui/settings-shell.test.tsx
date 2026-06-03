// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import {
  AdminRouterProvider,
  useAdminRouter,
} from "../../../core/admin/ui/contexts/AdminRouterContext";
import { SettingsShell } from "../../../core/admin/ui/layouts/SettingsShell";
import { SettingsSidebar } from "../../../core/admin/ui/settings/SettingsSidebar";
import {
  useRegisterSettingsDirty,
  useSettingsDirtyNavigation,
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

const flushEffects = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

function DirtySettingsHarness() {
  const [siteName, setSiteName] = React.useState("Coderso");
  useRegisterSettingsDirty(siteName !== "Coderso");

  return (
    <SettingsShell
      activeHref="/admin/settings/general"
      showSearch={false}
      sidebar={<SettingsSidebar activeId="general" />}
      breadcrumbs={["Settings", "General"]}
    >
      <label htmlFor="site-name">Site name</label>
      <input
        id="site-name"
        value={siteName}
        onChange={(event) => setSiteName(event.currentTarget.value)}
      />
      <button type="button" onClick={() => setSiteName("Draft name")}>
        Make dirty
      </button>
      <GuardedNavigationAction href="/admin/settings/security" label="Go security" />
      <PathProbe />
    </SettingsShell>
  );
}

function DrawerDirtyHarness() {
  const [drawerDirty, setDrawerDirty] = React.useState(false);
  useRegisterSettingsDirty(drawerDirty);

  return (
    <SettingsShell
      activeHref="/admin/settings/api-keys"
      showSearch={false}
      sidebar={<SettingsSidebar activeId="api-keys" />}
      breadcrumbs={["Settings", "API Keys"]}
    >
      <PathProbe />
      <button type="button" onClick={() => setDrawerDirty(true)}>
        Start drawer draft
      </button>
      <GuardedNavigationAction href="/admin/settings/webhooks" label="Go webhooks" />
    </SettingsShell>
  );
}

function GuardedNavigationAction({ href, label }: { href: string; label: string }) {
  const { navigate } = useAdminRouter();
  const { requestNavigation } = useSettingsDirtyNavigation();

  return (
    <button
      type="button"
      onClick={() => {
        if (requestNavigation(href)) {
          navigate(href);
        }
      }}
    >
      {label}
    </button>
  );
}

function PathProbe() {
  const { path } = useAdminRouter();
  return <span data-testid="admin-path">{path}</span>;
}

test("SettingsShell uses independent scroll containers", () => {
  const html = renderAdminUi(
    <SettingsShell sidebar={<div>Sidebar</div>} preview={<div>Preview</div>}>
      <div>Content</div>
    </SettingsShell>
  );

  const overscrollCount = (html.match(/overscroll-contain/g) ?? []).length;
  expect(overscrollCount).toBeGreaterThanOrEqual(3);
  expect(html).toContain("overflow-hidden");
});

test("SettingsShell exposes settings section navigation on mobile", () => {
  const html = renderAdminUi(
    <SettingsShell sidebar={<SettingsSidebar activeId="email" />}>
      <div>Content</div>
    </SettingsShell>
  );

  expect(html).toContain("lg:hidden");
  expect(html).toContain("General");
  expect(html).toContain("Security");
  expect(html).toContain("Integrations");
});

test("SettingsShell blocks dirty settings navigation until discard is confirmed", async () => {
  window.history.replaceState({}, "", "/admin/settings/general");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/general">
      <DirtySettingsHarness />
    </AdminRouterProvider>
  );

  try {
    const makeDirty = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Make dirty")
    );
    if (!makeDirty) throw new Error("Missing dirty trigger");

    React.act(() => {
      makeDirty.click();
    });
    await flushEffects();

    const goSecurity = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Go security")
    );
    if (!goSecurity) throw new Error("Missing Security settings action");

    await React.act(async () => {
      goSecurity.click();
      await Promise.resolve();
    });
    await flushEffects();

    expect(view.container.querySelector('[data-testid="admin-path"]')?.textContent).toBe(
      "/admin/settings/general"
    );
    expect((view.container.querySelector("#site-name") as HTMLInputElement).value).toBe(
      "Draft name"
    );
    expect(document.body.textContent).toContain("Discard unsaved settings?");

    const keepEditing = Array.from(document.body.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Keep editing")
    );
    if (!keepEditing) throw new Error("Missing Keep editing action");

    await React.act(async () => {
      keepEditing.dispatchEvent(
        new window.MouseEvent("click", { bubbles: true, button: 0, cancelable: true })
      );
      await Promise.resolve();
    });
    await flushEffects();

    expect(view.container.querySelector('[data-testid="admin-path"]')?.textContent).toBe(
      "/admin/settings/general"
    );
    expect((view.container.querySelector("#site-name") as HTMLInputElement).value).toBe(
      "Draft name"
    );

    await React.act(async () => {
      goSecurity.click();
      await Promise.resolve();
    });
    await flushEffects();

    const discard = Array.from(document.body.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Discard changes")
    );
    if (!discard) throw new Error("Missing Discard changes action");

    await React.act(async () => {
      discard.dispatchEvent(
        new window.MouseEvent("click", { bubbles: true, button: 0, cancelable: true })
      );
      await Promise.resolve();
    });
    await flushEffects();

    expect(view.container.querySelector('[data-testid="admin-path"]')?.textContent).toBe(
      "/admin/settings/security"
    );
    expect(window.location.pathname).toBe("/admin/settings/security");
  } finally {
    view.cleanup();
  }
});

test("SettingsShell protects dirty settings drafts on browser refresh", async () => {
  window.history.replaceState({}, "", "/admin/settings/general");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/general">
      <DirtySettingsHarness />
    </AdminRouterProvider>
  );

  try {
    const makeDirty = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Make dirty")
    );
    if (!makeDirty) throw new Error("Missing dirty trigger");

    React.act(() => {
      makeDirty.click();
    });
    await flushEffects();

    const event = new Event("beforeunload", { cancelable: true });
    const allowed = window.dispatchEvent(event);

    expect(allowed).toBe(false);
    expect(event.defaultPrevented).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("SettingsShell includes drawer-local settings drafts in the navigation guard", async () => {
  window.history.replaceState({}, "", "/admin/settings/api-keys");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/api-keys">
      <DrawerDirtyHarness />
    </AdminRouterProvider>
  );

  try {
    const startDrawerDraft = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Start drawer draft")
    );
    if (!startDrawerDraft) throw new Error("Missing drawer dirty trigger");

    React.act(() => {
      startDrawerDraft.click();
    });
    await flushEffects();

    const goWebhooks = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Go webhooks")
    );
    if (!goWebhooks) throw new Error("Missing Webhooks settings action");

    await React.act(async () => {
      goWebhooks.click();
      await Promise.resolve();
    });
    await flushEffects();

    expect(view.container.querySelector('[data-testid="admin-path"]')?.textContent).toBe(
      "/admin/settings/api-keys"
    );
    expect(document.body.textContent).toContain("Discard unsaved settings?");
  } finally {
    view.cleanup();
  }
});
