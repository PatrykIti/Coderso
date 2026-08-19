// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const themesState = vi.hoisted(() => {
  const template = {
    id: "template-1",
    name: "Studio",
    description: "Editorial admin palette",
    tokens: {
      base: { bg: "#101010", surface: "#1b1b1b", border: "#303030", text: "#fafafa" },
      buttons: {
        primary: { bg: "#fafafa", text: "#111111", hoverBg: "#e0e0e0", hoverText: "#111111" },
      },
    },
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
    templates: [template] as (typeof template)[] | null,
    profiles: [profile] as (typeof profile)[] | null,
    cachedTemplates: [template] as (typeof template)[] | null,
    cachedProfiles: [profile] as (typeof profile)[] | null,
    templateError: null as unknown,
    saveTemplateError: null as unknown,
    saveProfileError: null as unknown,
    activateError: null as unknown,
    listTemplateCalls: [] as Array<boolean | undefined>,
    listProfileCalls: [] as Array<boolean | undefined>,
    activateCalls: [] as string[],
    subscribers: new Set<(event: { key: string }) => void>(),
    reset() {
      this.templates = [template];
      this.profiles = [profile];
      this.cachedTemplates = [template];
      this.cachedProfiles = [profile];
      this.templateError = null;
      this.saveTemplateError = null;
      this.saveProfileError = null;
      this.activateError = null;
      this.listTemplateCalls = [];
      this.listProfileCalls = [];
      this.activateCalls = [];
      this.subscribers.clear();
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
    return themesState.profiles;
  }),
  createAdminThemeTemplate: vi.fn(async () => {
    if (themesState.saveTemplateError) throw themesState.saveTemplateError;
    return { ok: true };
  }),
  updateAdminThemeTemplate: vi.fn(async () => {
    if (themesState.saveTemplateError) throw themesState.saveTemplateError;
    return { ok: true };
  }),
  createAdminThemeProfile: vi.fn(async () => {
    if (themesState.saveProfileError) throw themesState.saveProfileError;
    return { ok: true };
  }),
  updateAdminThemeProfile: vi.fn(async () => {
    if (themesState.saveProfileError) throw themesState.saveProfileError;
    return { ok: true };
  }),
  activateAdminThemeProfile: vi.fn(async (id: string) => {
    themesState.activateCalls.push(id);
    if (themesState.activateError) throw themesState.activateError;
    return { ok: true };
  }),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

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

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} />,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
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

// Richer than themes.test.tsx: the card mocks surface the resolved
// description/templateName/tokenCount/palette fields ThemesPage computes, so
// the fallback branches are observable as visible effects.
vi.mock("../../../core/admin/ui/themes/ThemeTemplateCard", () => ({
  ThemeTemplateCard: ({
    template,
    onEdit,
  }: {
    template: {
      name: string;
      description: string;
      palette: string[];
      tokenCount: number;
    };
    onEdit: () => void;
  }) => (
    <div data-testid="template-card">
      <span>{template.name}</span>
      <span>{template.description}</span>
      <span>{`tokens:${template.tokenCount}`}</span>
      <span>{`palette:${template.palette.join(",")}`}</span>
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
    profile: { name: string; description: string; templateName: string; isActive: boolean };
    onEdit: () => void;
    onActivate: () => void;
  }) => (
    <div data-testid="profile-card">
      <span>{profile.name}</span>
      <span>{profile.description}</span>
      <span>{`template:${profile.templateName}`}</span>
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
    isSaving,
    onOpenChange,
    onSave,
  }: {
    open: boolean;
    isSaving?: boolean;
    onOpenChange: (open: boolean) => void;
    onSave?: (input: {
      name: string;
      description: string;
      tokens: Record<string, unknown>;
    }) => Promise<void> | void;
  }) => (
    <div>
      <span>{`template-drawer:${open ? "open" : "closed"}`}</span>
      <span>{`template-drawer-saving:${String(Boolean(isSaving))}`}</span>
      <button type="button" onClick={() => onOpenChange(false)}>
        close-template-drawer
      </button>
      <button
        type="button"
        onClick={() =>
          void onSave?.({ name: "Admin Pro", description: "Palette", tokens: { base: {} } })
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
    templates,
    onOpenChange,
    onSave,
  }: {
    open: boolean;
    templates: Array<{ id: string }>;
    onOpenChange: (open: boolean) => void;
    onSave: (input: {
      name: string;
      description: string;
      templateId: string;
    }) => Promise<void> | void;
  }) => (
    <div>
      <span>{`profile-drawer:${open ? "open" : "closed"}`}</span>
      <span>{`profile-templates:${templates.length}`}</span>
      <button type="button" onClick={() => onOpenChange(false)}>
        close-profile-drawer
      </button>
      <button
        type="button"
        onClick={() =>
          void onSave({
            name: "Fresh Profile",
            description: "A profile",
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
  ThemeExportDialog: ({ open }: { open: boolean }) => (
    <div>{`theme-export:${open ? "open" : "closed"}`}</div>
  ),
}));

import { ThemesPage } from "../../../core/admin/ui/themes/ThemesPage";

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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

afterEach(() => {
  themesState.reset();
});

test("ThemesPage fills missing template and profile descriptions with fallbacks", async () => {
  themesState.reset();
  const sparseTemplate = {
    id: "template-2",
    name: "Bare",
    description: null,
    tokens: null,
  };
  const orphanProfile = {
    id: "profile-2",
    name: "Orphan",
    description: null,
    templateId: "missing-template",
    isActive: false,
    createdAt: "2026-03-08T10:00:00.000Z",
    updatedAt: "2026-03-08T10:00:00.000Z",
  };
  themesState.templates = [...(themesState.templates ?? []), sparseTemplate as never];
  themesState.profiles = [...(themesState.profiles ?? []), orphanProfile as never];

  const view = mount(<ThemesPage />);
  try {
    await flush();

    // Null description falls back for the preset card.
    expect(view.container.textContent).toContain("Bare");
    expect(view.container.textContent).toContain("No description provided.");
    // Null tokens => countTokens(null) => 0 tokens.
    expect(view.container.textContent).toContain("tokens:0");
    // The palette for a null-token template resolves to the merged defaults.
    expect(view.container.textContent).toContain("palette:#fafafa");

    // A profile pointing at a missing template resolves to "Unknown" and the
    // description fallback.
    expect(view.container.textContent).toContain("Orphan");
    expect(view.container.textContent).toContain("template:Unknown");
    expect(view.container.textContent).toContain("inactive-profile");
  } finally {
    view.cleanup();
  }
});

test("ThemesPage counts scalar token values and disables New Profile without templates", async () => {
  themesState.reset();
  const numericTemplate = {
    id: "template-3",
    name: "Measured",
    description: "Scalar-heavy palette",
    tokens: {
      base: { bg: "#101010", surface: "#1b1b1b", border: "#303030", text: "#fafafa" },
      spacing: { base: 4 },
      radius: { base: 8 },
    },
  };
  themesState.templates = [numericTemplate as never];

  const view = mount(<ThemesPage />);
  try {
    await flush();

    // String leaves count 1 (base => 4); the numeric spacing/radius leaves
    // fall to the non-object arm and count 0.
    expect(view.container.textContent).toContain("Measured");
    expect(view.container.textContent).toContain("tokens:4");

    // With templates present the New Profile action stays enabled.
    const newProfile = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("New Profile")
    );
    expect(newProfile?.hasAttribute("disabled")).toBe(false);
  } finally {
    view.cleanup();
  }

  themesState.reset();
  themesState.templates = [];
  themesState.cachedTemplates = [];
  themesState.profiles = [];
  themesState.cachedProfiles = [];

  const emptyView = mount(<ThemesPage />);
  try {
    await flush();

    const disabledNewProfile = Array.from(emptyView.container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("New Profile")
    );
    expect(disabledNewProfile?.hasAttribute("disabled")).toBe(true);
    expect(emptyView.container.textContent).toContain(
      "No theme templates yet. Create your first template to unlock profiles."
    );
  } finally {
    emptyView.cleanup();
  }
});

test("ThemesPage keeps the preset grid empty while loading and reports non-API load errors", async () => {
  themesState.reset();
  themesState.templates = [];
  themesState.cachedTemplates = null;
  themesState.cachedProfiles = null;

  const view = mount(<ThemesPage />);
  try {
    // Before the fetch settles: no grid, no empty state (still loading).
    expect(view.container.querySelector("[data-testid='template-card']")).toBeNull();
    expect(view.container.textContent).not.toContain("No theme templates yet.");
  } finally {
    view.cleanup();
  }

  themesState.reset();
  themesState.templateError = new Error("boom");
  const errorView = mount(<ThemesPage />);
  try {
    await flush();
    expect(errorView.container.textContent).toContain("Failed to load admin themes.");
  } finally {
    errorView.cleanup();
  }
});

test("ThemesPage reports activate failures and keeps the page interactive", async () => {
  themesState.reset();
  themesState.activateError = new Error("activate exploded");

  const view = mount(<ThemesPage />);
  try {
    await flush();

    clickByText(view.container, "activate-profile-card");
    await flush();

    expect(themesState.activateCalls).toContain("profile-1");
    expect(view.container.textContent).toContain("Failed to activate profile.");
    // The cards remain rendered (no full-page failure).
    expect(view.container.querySelector("[data-testid='profile-card']")).not.toBeNull();
  } finally {
    view.cleanup();
  }

  themesState.reset();
  themesState.activateError = { name: "ApiClientError", message: "Activate denied" };
  const apiView = mount(<ThemesPage />);
  try {
    await flush();

    clickByText(apiView.container, "activate-profile-card");
    await flush();

    expect(apiView.container.textContent).toContain("Activate denied");
  } finally {
    apiView.cleanup();
  }
});

test("ThemesPage hides the active-profile line when no profile is active", async () => {
  themesState.reset();
  themesState.profiles = [];
  themesState.cachedProfiles = [];

  const view = mount(<ThemesPage />);
  try {
    await flush();

    expect(view.container.textContent).toContain(
      "Create a profile to activate a template for your admin UI."
    );
    expect(view.container.textContent).not.toContain("Active profile:");
  } finally {
    view.cleanup();
  }
});

test("ThemesPage reports template and profile save failures from the drawers", async () => {
  themesState.reset();
  themesState.saveTemplateError = new Error("template exploded");
  const templateView = mount(<ThemesPage />);
  try {
    await flush();

    clickByText(templateView.container, "New Template");
    clickByText(templateView.container, "save-template-drawer");
    await flush();

    expect(templateView.container.textContent).toContain("Failed to save theme template.");
  } finally {
    templateView.cleanup();
  }

  themesState.reset();
  themesState.saveProfileError = { name: "ApiClientError", message: "Profile denied" };
  const profileView = mount(<ThemesPage />);
  try {
    await flush();

    clickByText(profileView.container, "New Profile");
    clickByText(profileView.container, "save-profile-drawer");
    await flush();

    expect(profileView.container.textContent).toContain("Profile denied");
  } finally {
    profileView.cleanup();
  }
});

test("ThemesPage refresh failures surface from cache-bus events and foreign keys are ignored", async () => {
  themesState.reset();
  const view = mount(<ThemesPage />);
  try {
    await flush();
    const baselineTemplateCalls = themesState.listTemplateCalls.length;

    // A foreign cache event does not trigger a refresh.
    await React.act(async () => {
      for (const subscriber of themesState.subscribers) {
        subscriber({ key: "unrelated:key" });
      }
      await Promise.resolve();
    });
    expect(themesState.listTemplateCalls.length).toBe(baselineTemplateCalls);

    // A matching event with a non-API failure surfaces the generic message.
    themesState.templateError = new Error("refresh exploded");
    await React.act(async () => {
      for (const subscriber of themesState.subscribers) {
        subscriber({ key: "adminThemeTemplates:list" });
      }
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Failed to load admin themes.");
    expect(themesState.listTemplateCalls.length).toBeGreaterThan(baselineTemplateCalls);

    // A matching event with an API failure surfaces the server message.
    themesState.templateError = { name: "ApiClientError", message: "Refresh denied" };
    await React.act(async () => {
      for (const subscriber of themesState.subscribers) {
        subscriber({ key: "adminThemeProfiles:list" });
      }
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Refresh denied");
  } finally {
    view.cleanup();
  }
});
