// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const themesState = vi.hoisted(() => {
  const template = {
    id: "template-1",
    name: "Studio",
    description: "Editorial admin palette",
    tokens: {
      base: { bg: "#101010", surface: "#1b1b1b", border: "#303030", text: "#fafafa" },
      typography: {
        mutedText: "#b0b0b0",
        sans: "Inter",
        display: "Space Grotesk",
        sm: "0.875rem",
        md: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
      },
      buttons: {
        primary: { bg: "#fafafa", text: "#111111", hoverBg: "#e0e0e0", hoverText: "#111111" },
        secondary: { bg: "#262626", text: "#fafafa", hoverBg: "#303030", hoverText: "#ffffff" },
        outline: { border: "#555555", text: "#fafafa", hoverBg: "#202020", hoverText: "#ffffff" },
        ghost: { hoverBg: "#2a2a2a", hoverText: "#ffffff" },
      },
      inputs: {
        bg: "#121212",
        border: "#3a3a3a",
        text: "#fafafa",
        placeholder: "#9a9a9a",
        focusRing: "#7dd3fc",
      },
      sidebar: {
        bg: "#161616",
        text: "#e5e5e5",
        activeBg: "#262626",
        activeText: "#ffffff",
        hoverBg: "#202020",
      },
      topbar: {
        bg: "#181818",
        text: "#f5f5f5",
        border: "#2d2d2d",
      },
      card: {
        bg: "#181818",
        border: "#2f2f2f",
      },
      state: {
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
    },
    createdAt: "2026-03-08T10:00:00.000Z",
    updatedAt: "2026-03-08T10:00:00.000Z",
  };

  const profile = {
    id: "profile-1",
    name: "Studio Active",
    description: "Main admin profile",
    templateId: "template-1",
    isActive: true,
    createdAt: "2026-03-08T10:00:00.000Z",
    updatedAt: "2026-03-08T10:00:00.000Z",
  };

  return {
    templates: [template],
    profiles: [profile],
    cachedTemplates: [template] as typeof template[] | null,
    cachedProfiles: [profile] as typeof profile[] | null,
    templateError: null as unknown,
    profileError: null as unknown,
    saveTemplateError: null as unknown,
    saveProfileError: null as unknown,
    activateError: null as unknown,
    listTemplateCalls: [] as Array<boolean | undefined>,
    listProfileCalls: [] as Array<boolean | undefined>,
    createTemplateCalls: [] as Array<Record<string, unknown>>,
    updateTemplateCalls: [] as Array<{ id: string; input: Record<string, unknown> }>,
    createProfileCalls: [] as Array<Record<string, unknown>>,
    updateProfileCalls: [] as Array<{ id: string; input: Record<string, unknown> }>,
    activateCalls: [] as string[],
    subscribers: new Set<(event: { key: string }) => void>(),
    reset() {
      this.templates = [template];
      this.profiles = [profile];
      this.cachedTemplates = [template];
      this.cachedProfiles = [profile];
      this.templateError = null;
      this.profileError = null;
      this.saveTemplateError = null;
      this.saveProfileError = null;
      this.activateError = null;
      this.listTemplateCalls = [];
      this.listProfileCalls = [];
      this.createTemplateCalls = [];
      this.updateTemplateCalls = [];
      this.createProfileCalls = [];
      this.updateProfileCalls = [];
      this.activateCalls = [];
      this.subscribers.clear();
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    className,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    className?: string;
  }) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
    />
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    adminThemeTemplatesList: "adminThemeTemplates:list",
    adminThemeProfilesList: "adminThemeProfiles:list",
  },
}));

vi.mock("@/services/adminThemeClient", () => ({
  getCachedAdminThemeTemplates: () => themesState.cachedTemplates,
  getCachedAdminThemeProfiles: () => themesState.cachedProfiles,
  listAdminThemeTemplatesCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    themesState.listTemplateCalls.push(force);
    if (themesState.templateError) throw themesState.templateError;
    return themesState.templates;
  }),
  listAdminThemeProfilesCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    themesState.listProfileCalls.push(force);
    if (themesState.profileError) throw themesState.profileError;
    return themesState.profiles;
  }),
  createAdminThemeTemplate: vi.fn(async (input: Record<string, unknown>) => {
    themesState.createTemplateCalls.push(input);
    if (themesState.saveTemplateError) throw themesState.saveTemplateError;
    const created = {
      id: "template-2",
      description: null,
      createdAt: "2026-03-08T10:30:00.000Z",
      updatedAt: "2026-03-08T10:30:00.000Z",
      ...input,
    };
    themesState.templates = [...themesState.templates, created as never];
    return created;
  }),
  updateAdminThemeTemplate: vi.fn(async (id: string, input: Record<string, unknown>) => {
    themesState.updateTemplateCalls.push({ id, input });
    if (themesState.saveTemplateError) throw themesState.saveTemplateError;
    themesState.templates = themesState.templates.map((item) =>
      item.id === id ? ({ ...item, ...input } as never) : item
    );
    return { ok: true };
  }),
  createAdminThemeProfile: vi.fn(async (input: Record<string, unknown>) => {
    themesState.createProfileCalls.push(input);
    if (themesState.saveProfileError) throw themesState.saveProfileError;
    const created = {
      id: "profile-2",
      createdAt: "2026-03-08T10:30:00.000Z",
      updatedAt: "2026-03-08T10:30:00.000Z",
      ...input,
    };
    themesState.profiles = [...themesState.profiles, created as never];
    return created;
  }),
  updateAdminThemeProfile: vi.fn(async (id: string, input: Record<string, unknown>) => {
    themesState.updateProfileCalls.push({ id, input });
    if (themesState.saveProfileError) throw themesState.saveProfileError;
    themesState.profiles = themesState.profiles.map((item) =>
      item.id === id ? ({ ...item, ...input } as never) : item
    );
    return { ok: true };
  }),
  activateAdminThemeProfile: vi.fn(async (id: string) => {
    themesState.activateCalls.push(id);
    if (themesState.activateError) throw themesState.activateError;
    themesState.profiles = themesState.profiles.map((item) => ({
      ...item,
      isActive: item.id === id,
    })) as never;
    return { ok: true };
  }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    breadcrumbs,
    activeHref,
  }: {
    children: React.ReactNode;
    breadcrumbs?: React.ReactNode;
    activeHref?: string;
  }) => (
    <div data-active-href={activeHref}>
      <div>{breadcrumbs}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </div>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (handler: (event: { key: string }) => void) => {
    themesState.subscribers.add(handler);
    return () => themesState.subscribers.delete(handler);
  },
}));

vi.mock("../../../core/admin/ui/themes/ThemeTemplateCard", () => ({
  ThemeTemplateCard: ({
    template,
    onEdit,
  }: {
    template: { name: string; description: string };
    onEdit: () => void;
  }) => (
    <div>
      <span>{template.name}</span>
      <span>{template.description}</span>
      <button type="button" onClick={onEdit}>
        edit-template-card
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/themes/ThemeProfileCard", () => ({
  ThemeProfileCard: ({
    profile,
    onEdit,
    onActivate,
  }: {
    profile: { name: string; isActive: boolean };
    onEdit: () => void;
    onActivate: () => void;
  }) => (
    <div>
      <span>{profile.name}</span>
      <span>{profile.isActive ? "active-profile" : "inactive-profile"}</span>
      <button type="button" onClick={onEdit}>
        edit-profile-card
      </button>
      <button type="button" onClick={onActivate}>
        activate-profile-card
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/themes/ThemeTemplateDrawer", () => ({
  ThemeTemplateDrawer: ({
    open,
    template,
    isSaving,
    onOpenChange,
    onSave,
  }: {
    open: boolean;
    template?: { id: string; name: string } | null;
    isSaving?: boolean;
    onOpenChange: (open: boolean) => void;
    onSave?: (input: { name: string; description: string; tokens: Record<string, unknown> }) => Promise<void> | void;
  }) => (
    <div>
      <span>{`template-drawer:${open ? "open" : "closed"}`}</span>
      <span>{`template-drawer-saving:${String(Boolean(isSaving))}`}</span>
      <span>{template?.name ?? "new-template"}</span>
      <button type="button" onClick={() => onOpenChange(false)}>
        close-template-drawer
      </button>
      <button
        type="button"
        onClick={() =>
          void onSave?.({
            name: template?.id ? "Studio Updated" : "Admin Pro",
            description: template?.id ? "Updated palette" : "Primary admin theme",
            tokens: { base: { bg: "#111111" } },
          })
        }
      >
        save-template-drawer
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/themes/ThemeProfileDrawer", () => ({
  ThemeProfileDrawer: ({
    open,
    profile,
    templates,
    isSaving,
    onOpenChange,
    onSave,
  }: {
    open: boolean;
    profile?: { id: string; name: string } | null;
    templates: Array<{ id: string }>;
    isSaving?: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (input: { name: string; description: string; templateId: string }) => Promise<void> | void;
  }) => (
    <div>
      <span>{`profile-drawer:${open ? "open" : "closed"}`}</span>
      <span>{`profile-drawer-saving:${String(Boolean(isSaving))}`}</span>
      <span>{profile?.name ?? "new-profile"}</span>
      <span>{`profile-templates:${templates.length}`}</span>
      <button type="button" onClick={() => onOpenChange(false)}>
        close-profile-drawer
      </button>
      <button
        type="button"
        onClick={() =>
          void onSave({
            name: profile?.id ? "Studio Profile Updated" : "Studio Profile",
            description: profile?.id ? "Updated profile" : "Fresh profile",
            templateId: templates[0]?.id ?? "",
          })
        }
      >
        save-profile-drawer
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/themes/ThemeExportDialog", () => ({
  ThemeExportDialog: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div>
      <span>{`theme-export:${open ? "open" : "closed"}`}</span>
      <button type="button" onClick={() => onOpenChange(false)}>
        close-export-dialog
      </button>
    </div>
  ),
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

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const setInputValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

afterEach(() => {
  themesState.reset();
});

test("ThemesPage searches templates, opens dialogs, saves template/profile flows, activates profiles, refreshes from cache bus, and exports", async () => {
  const dispatchSpy = vi.spyOn(window, "dispatchEvent");
  const { ThemesPage } = await import("../../../core/admin/ui/themes/ThemesPage");
  const view = mount(<ThemesPage />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Admin UI Theme");
    expect(view.container.textContent).toContain("Studio");
    expect(view.container.textContent).toContain("Studio Active");
    expect(view.container.textContent).toContain("Active profile: Studio Active");
    expect(themesState.listTemplateCalls).toContain(true);
    expect(themesState.listProfileCalls).toContain(true);

    const searchInput = view.container.querySelector("input") as HTMLInputElement;
    act(() => {
      setInputValue(searchInput, "missing");
    });
    expect(view.container.textContent).toContain("No templates match your search.");

    act(() => {
      setInputValue(searchInput, "");
    });

    clickByText(view.container, "Export JSON");
    expect(view.container.textContent).toContain("theme-export:open");
    clickByText(view.container, "close-export-dialog");
    expect(view.container.textContent).toContain("theme-export:closed");

    clickByText(view.container, "New Template");
    expect(view.container.textContent).toContain("template-drawer:open");
    expect(view.container.textContent).toContain("new-template");
    clickByText(view.container, "save-template-drawer");
    await flush();

    expect(themesState.createTemplateCalls[0]).toEqual({
      name: "Admin Pro",
      description: "Primary admin theme",
      tokens: { base: { bg: "#111111" } },
    });
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "theme:updated" })
    );

    clickByText(view.container, "edit-template-card");
    expect(view.container.textContent).toContain("Studio");
    clickByText(view.container, "save-template-drawer");
    await flush();

    expect(themesState.updateTemplateCalls[0]).toEqual({
      id: "template-1",
      input: {
        name: "Studio Updated",
        description: "Updated palette",
        tokens: { base: { bg: "#111111" } },
      },
    });

    clickByText(view.container, "New Profile");
    expect(view.container.textContent).toContain("profile-drawer:open");
    clickByText(view.container, "save-profile-drawer");
    await flush();

    expect(themesState.createProfileCalls[0]).toEqual({
      name: "Studio Profile",
      description: "Fresh profile",
      templateId: "template-1",
      isActive: false,
    });

    clickByText(view.container, "edit-profile-card");
    clickByText(view.container, "save-profile-drawer");
    await flush();

    expect(themesState.updateProfileCalls[0]).toEqual({
      id: "profile-1",
      input: {
        name: "Studio Profile Updated",
        description: "Updated profile",
        templateId: "template-1",
      },
    });

    clickByText(view.container, "activate-profile-card");
    await flush();

    expect(themesState.activateCalls).toContain("profile-1");

    await act(async () => {
      for (const subscriber of themesState.subscribers) {
        subscriber({ key: "adminThemeTemplates:list" });
        subscriber({ key: "adminThemeProfiles:list" });
      }
      await Promise.resolve();
    });

    expect(themesState.listTemplateCalls.length).toBeGreaterThan(2);
    expect(themesState.listProfileCalls.length).toBeGreaterThan(2);
  } finally {
    dispatchSpy.mockRestore();
    view.cleanup();
  }
});

test("ThemesPage renders empty and error states", async () => {
  const { ThemesPage } = await import("../../../core/admin/ui/themes/ThemesPage");

  themesState.cachedTemplates = null;
  themesState.cachedProfiles = null;
  themesState.templates = [];
  themesState.profiles = [];

  const emptyView = mount(<ThemesPage />);

  try {
    await flush();
    expect(emptyView.container.textContent).toContain(
      "No theme templates yet. Create your first template to unlock profiles."
    );
    expect(emptyView.container.textContent).toContain(
      "Create a profile to activate a template for your admin UI."
    );
  } finally {
    emptyView.cleanup();
  }

  themesState.reset();
  themesState.templateError = { name: "ApiClientError", message: "Theme load failed" };
  const errorView = mount(<ThemesPage />);

  try {
    await flush();
    expect(errorView.container.textContent).toContain("Theme load failed");
  } finally {
    errorView.cleanup();
  }
});

test("ThemesPage auto-activates the first profile and reports template/profile save failures", async () => {
  const { ThemesPage } = await import("../../../core/admin/ui/themes/ThemesPage");

  themesState.profiles = [];
  themesState.cachedProfiles = [];

  const activateView = mount(<ThemesPage />);

  try {
    await flush();

    clickByText(activateView.container, "New Profile");
    clickByText(activateView.container, "save-profile-drawer");
    await flush();

    expect(themesState.createProfileCalls.at(-1)).toEqual({
      name: "Studio Profile",
      description: "Fresh profile",
      templateId: "template-1",
      isActive: true,
    });
  } finally {
    activateView.cleanup();
  }

  themesState.reset();
  themesState.saveTemplateError = { name: "ApiClientError", message: "Template save denied" };

  const templateErrorView = mount(<ThemesPage />);

  try {
    await flush();

    clickByText(templateErrorView.container, "New Template");
    clickByText(templateErrorView.container, "save-template-drawer");
    await flush();

    expect(templateErrorView.container.textContent).toContain("Template save denied");
  } finally {
    templateErrorView.cleanup();
  }

  themesState.reset();
  themesState.saveProfileError = new Error("Profile exploded");

  const profileErrorView = mount(<ThemesPage />);

  try {
    await flush();

    clickByText(profileErrorView.container, "New Profile");
    clickByText(profileErrorView.container, "save-profile-drawer");
    await flush();

    expect(profileErrorView.container.textContent).toContain(
      "Failed to save theme profile."
    );
  } finally {
    profileErrorView.cleanup();
  }
});
