// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { ThemeEditorPage } from "../../../core/admin/ui/themes/ThemeEditorPage";
import type { ThemeProfile } from "../../../core/admin/services/themeClient";

const themeState = vi.hoisted(() => {
  const pristineProfile = {
    id: "profile-1",
    name: "Storefront",
    description: null,
    themeName: "starter",
    tokens: { colors: { primary: "#111111" } },
    isActive: true,
    routes: [{ id: "route-1", path: "/", pageId: "page-1" }],
    createdAt: "2026-03-06T10:00:00.000Z",
    updatedAt: "2026-03-06T10:00:00.000Z",
  };
  return {
    themeItems: [
      {
        name: "starter",
        version: "1.0.0",
        templates: [],
        tokens: { colors: { accent: "#22c55e" } },
      },
    ],
    pageItems: [
      {
        id: "page-1",
        title: "Home",
        slug: "home",
        status: "published",
        updatedAt: "2026-03-06T10:00:00.000Z",
        author: null,
      },
    ],
    profileResult: { ...pristineProfile },
    getProfileError: null as unknown,
    updateProfileError: null as unknown,
    updateRoutesError: null as unknown,
    getThemeProfile: vi.fn(async () => {
      if (themeState.getProfileError) throw themeState.getProfileError;
      return themeState.profileResult;
    }),
    listThemes: vi.fn(async () => ({ items: themeState.themeItems })),
    updateThemeProfile: vi.fn(async () => {
      if (themeState.updateProfileError) throw themeState.updateProfileError;
      return themeState.profileResult;
    }),
    updateThemeRoutes: vi.fn(async () => {
      if (themeState.updateRoutesError) throw themeState.updateRoutesError;
      return themeState.profileResult;
    }),
    listPagesCached: vi.fn(async () => themeState.pageItems),
    reset() {
      themeState.profileResult = { ...pristineProfile };
      themeState.getProfileError = null;
      themeState.updateProfileError = null;
      themeState.updateRoutesError = null;
      themeState.getThemeProfile.mockClear();
      themeState.listThemes.mockClear();
      themeState.updateThemeProfile.mockClear();
      themeState.updateThemeRoutes.mockClear();
      themeState.listPagesCached.mockClear();
    },
  };
});

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" && error !== null && "kind" in error && error.kind === "api",
}));

vi.mock("@/services/themeClient", () => ({
  getThemeProfile: themeState.getThemeProfile,
  listThemes: themeState.listThemes,
  updateThemeProfile: themeState.updateThemeProfile,
  updateThemeRoutes: themeState.updateThemeRoutes,
}));

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: themeState.listPagesCached,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
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

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
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
    <button
      type="button"
      data-select-value={value ?? "none"}
      onClick={() => onValueChange?.(value === "none" ? "page-2" : "none")}
    >
      {children}
    </button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

// Stateful tabs mock that mirrors Radix activation: only the ACTIVE panel
// renders (context-backed state), so tab switching has a real visible effect
// and the Routes tab can mount the REAL ThemeRoutesEditor.
vi.mock("@/components/ui/tabs", async () => {
  const react = await import("react");
  const TabsContext = react.createContext<{
    value: string;
    onValueChange: (next: string) => void;
  }>({ value: "", onValueChange: () => undefined });
  const Tabs = ({
    defaultValue,
    children,
  }: {
    defaultValue?: string;
    children?: React.ReactNode;
  }) => {
    const [value, setValue] = react.useState(defaultValue ?? "");
    return (
      <TabsContext.Provider value={{ value, onValueChange: setValue }}>
        <div data-tabs-value={value}>{children}</div>
      </TabsContext.Provider>
    );
  };
  const TabsTrigger = ({ value, children }: { value?: string; children?: React.ReactNode }) => {
    const { onValueChange } = react.useContext(TabsContext);
    return (
      <button type="button" data-tab-value={value} onClick={() => onValueChange(value ?? "")}>
        {children}
      </button>
    );
  };
  const TabsContent = ({ value, children }: { value?: string; children?: React.ReactNode }) => {
    const { value: activeValue } = react.useContext(TabsContext);
    if (activeValue !== value) return null;
    return <div data-tab-panel={value}>{children}</div>;
  };
  const TabsList = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return { Tabs, TabsContent, TabsList, TabsTrigger };
});

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  }) => <textarea value={value} onChange={onChange} data-testid="token-draft" />,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    breadcrumbs,
    topbarActions,
  }: {
    children: React.ReactNode;
    breadcrumbs?: React.ReactNode;
    topbarActions?: React.ReactNode;
  }) => (
    <div>
      <div data-testid="breadcrumbs">
        {Array.isArray(breadcrumbs) ? breadcrumbs.join(" / ") : breadcrumbs}
      </div>
      <div>{topbarActions}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/themes/ThemePreviewPanel", () => ({
  ThemePreviewPanel: () => <div>preview-panel</div>,
}));

vi.mock("../../../core/admin/ui/themes/ThemeExportDialog", () => ({
  ThemeExportDialog: ({ open }: { open: boolean }) => (
    <div>{open ? "export:open" : "export:closed"}</div>
  ),
}));

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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error("Missing textarea");
  }
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickButtonByText = (container: HTMLElement, text: string) => {
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

const findPreviewVar = (container: HTMLElement, cssVar: string) => {
  for (const element of Array.from(container.querySelectorAll<HTMLElement>("*"))) {
    const value = element.style.getPropertyValue(cssVar);
    if (value) return value;
  }
  return "";
};

const saveButton = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Save Changes")
  ) as HTMLButtonElement | undefined;

afterEach(() => {
  themeState.reset();
  vi.restoreAllMocks();
});

test("ThemeEditorPage live preview follows real token-editor drafts and blocks invalid JSON", async () => {
  themeState.reset();
  const view = mount(
    <ThemeEditorPage profileId="profile-1" initialProfile={themeState.profileResult} />
  );

  try {
    // The REAL token editor renders (not a stub): draft textarea + Active Token
    // Properties resolved from DEFAULT_TOKENS + theme + profile overrides.
    expect(view.container.textContent).toContain("theme.config.json");
    expect(view.container.textContent).toContain("Valid JSON");
    expect(view.container.textContent).toContain("Primary");
    expect(view.container.textContent).toContain("#111111");
    expect(findPreviewVar(view.container, "--color-primary")).toBe("#111111");

    // Invalid draft: badge flips, save is disabled, preview is unchanged.
    setTextareaValue(view.container.querySelector("[data-testid='token-draft']"), "{");
    expect(view.container.textContent).toContain("Invalid JSON");
    expect(saveButton(view.container)?.hasAttribute("disabled")).toBe(true);
    expect(findPreviewVar(view.container, "--color-primary")).toBe("#111111");

    // Valid draft with a new primary: badge flips back, save re-enables, and
    // the live preview wrapper repaints --color-primary to the new value.
    setTextareaValue(
      view.container.querySelector("[data-testid='token-draft']"),
      JSON.stringify({ colors: { primary: "#ff0000" } }, null, 2)
    );
    expect(view.container.textContent).toContain("Valid JSON");
    expect(saveButton(view.container)?.hasAttribute("disabled")).toBe(false);
    expect(findPreviewVar(view.container, "--color-primary")).toBe("#ff0000");
    expect(view.container.textContent).toContain("#ff0000");
  } finally {
    view.cleanup();
  }
});

test("ThemeEditorPage surfaces non-API load errors and the empty profile state", async () => {
  themeState.reset();
  themeState.getProfileError = new Error("boom");
  window.history.replaceState({}, "", "/admin/themes/profile-1");

  const errorView = mount(<ThemeEditorPage />);
  try {
    await flush();
    expect(errorView.container.textContent).toContain("Failed to load theme profile.");
    expect(errorView.container.textContent).not.toContain("Loading theme profile...");
  } finally {
    errorView.cleanup();
  }

  themeState.reset();
  themeState.profileResult = null as unknown as typeof themeState.profileResult;
  window.history.replaceState({}, "", "/admin/themes/profile-1");
  const emptyView = mount(<ThemeEditorPage />);
  try {
    await flush();
    expect(emptyView.container.textContent).toContain("Theme profile not found.");
    // Without a loaded profile the chrome degrades gracefully: no live badge.
    expect(emptyView.container.textContent).toContain("Draft");
    expect(emptyView.container.textContent).toContain("Not saved yet");
  } finally {
    emptyView.cleanup();
  }
});

test("ThemeEditorPage surfaces duplicate and empty route path errors in the real routes editor", async () => {
  themeState.reset();
  const duplicateProfile: ThemeProfile = {
    ...themeState.profileResult,
    isActive: false,
    routes: [
      { id: "route-1", path: "/", pageId: "page-1" },
      { id: "route-2", path: "/", pageId: null },
    ],
  };
  const duplicateView = mount(
    <ThemeEditorPage profileId="profile-1" initialProfile={duplicateProfile} />
  );

  try {
    // Switch to the Routes tab: the REAL ThemeRoutesEditor mounts.
    clickButtonByText(duplicateView.container, "Routes");
    expect(duplicateView.container.textContent).toContain("Route mapping");
    expect(duplicateView.container.textContent).toContain("Route 1");
    expect(duplicateView.container.textContent).toContain("Route 2");
    expect(duplicateView.container.textContent).toContain("Duplicate route paths are not allowed.");
    expect(saveButton(duplicateView.container)?.hasAttribute("disabled")).toBe(true);
    // Inactive profile renders the Draft badge.
    expect(duplicateView.container.textContent).toContain("Draft");
  } finally {
    duplicateView.cleanup();
  }

  themeState.reset();
  const emptyPathProfile: ThemeProfile = {
    ...themeState.profileResult,
    routes: [{ id: "route-1", path: "   ", pageId: null }],
  };
  const emptyView = mount(
    <ThemeEditorPage profileId="profile-1" initialProfile={emptyPathProfile} />
  );

  try {
    clickButtonByText(emptyView.container, "Routes");
    expect(emptyView.container.textContent).toContain("Each route needs a valid path.");
    expect(saveButton(emptyView.container)?.hasAttribute("disabled")).toBe(true);
  } finally {
    emptyView.cleanup();
  }
});

test("ThemeEditorPage saves route edits through the real routes editor with normalized paths", async () => {
  themeState.reset();
  const routeProfile: ThemeProfile = {
    ...themeState.profileResult,
    routes: [{ id: "route-1", path: "promo", pageId: "page-1" }],
  };
  const view = mount(<ThemeEditorPage profileId="profile-1" initialProfile={routeProfile} />);

  try {
    clickButtonByText(view.container, "Routes");

    const pathInput = Array.from(view.container.querySelectorAll("input")).find(
      (input) => input.getAttribute("placeholder") === "/"
    );
    if (!(pathInput instanceof HTMLInputElement)) {
      throw new Error("Missing route path input");
    }
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    React.act(() => {
      descriptor?.set?.call(pathInput, " /promo/ ");
      pathInput.dispatchEvent(new Event("input", { bubbles: true }));
      pathInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    clickButtonByText(view.container, "Save Changes");
    await flush();

    // Only the route payload changes; the normalized leading slash is persisted
    // and the trailing slash is stripped.
    expect(themeState.updateThemeRoutes).toHaveBeenCalledWith("profile-1", [
      { path: "/promo", pageId: "page-1" },
    ]);
    expect(themeState.updateThemeProfile).not.toHaveBeenCalled();
    expect(themeState.getThemeProfile).toHaveBeenCalledWith("profile-1");
  } finally {
    view.cleanup();
  }
});

test("ThemeEditorPage reports save failures and keeps the editor interactive", async () => {
  themeState.reset();
  themeState.updateProfileError = { kind: "api", message: "Save denied" };
  const apiView = mount(
    <ThemeEditorPage profileId="profile-1" initialProfile={themeState.profileResult} />
  );

  try {
    setTextareaValue(
      apiView.container.querySelector("[data-testid='token-draft']"),
      JSON.stringify({ colors: { primary: "#00ff00" } }, null, 2)
    );
    clickButtonByText(apiView.container, "Save Changes");
    await flush();

    expect(apiView.container.textContent).toContain("Save denied");
    // The save button is interactive again after the failure (not stuck saving).
    expect(saveButton(apiView.container)?.textContent).toContain("Save Changes");
    expect(saveButton(apiView.container)?.hasAttribute("disabled")).toBe(false);
  } finally {
    apiView.cleanup();
  }

  themeState.reset();
  themeState.updateRoutesError = new Error("routes exploded");
  const genericView = mount(
    <ThemeEditorPage profileId="profile-1" initialProfile={themeState.profileResult} />
  );

  try {
    clickButtonByText(genericView.container, "Routes");
    const pathInput = Array.from(genericView.container.querySelectorAll("input")).find(
      (input) => input.getAttribute("placeholder") === "/"
    );
    if (!(pathInput instanceof HTMLInputElement)) {
      throw new Error("Missing route path input");
    }
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    React.act(() => {
      descriptor?.set?.call(pathInput, "/shop");
      pathInput.dispatchEvent(new Event("input", { bubbles: true }));
      pathInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    clickButtonByText(genericView.container, "Save Changes");
    await flush();

    expect(genericView.container.textContent).toContain("Failed to save theme profile.");
  } finally {
    genericView.cleanup();
  }
});

test("ThemeEditorPage loads from the route path and paints the live preview", async () => {
  themeState.reset();
  window.history.replaceState({}, "", "/admin/themes/profile-1");

  const view = mount(<ThemeEditorPage />);
  try {
    await flush();

    // The load effect (no initialProfile) resolves real data into the editor.
    expect(themeState.getThemeProfile).toHaveBeenCalledWith("profile-1");
    expect(view.container.textContent).toContain("Live");
    expect(view.container.textContent).toContain("Last saved");
    expect(view.container.textContent).toContain("Primary");
    expect(view.container.textContent).toContain("#111111");
    expect(findPreviewVar(view.container, "--color-primary")).toBe("#111111");
    expect(saveButton(view.container)?.hasAttribute("disabled")).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("ThemeEditorPage reports non-API failures when reloading after a successful save", async () => {
  themeState.reset();
  window.history.replaceState({}, "", "/admin/themes/profile-1");
  themeState.getProfileError = new Error("reload failed");

  const view = mount(
    <ThemeEditorPage profileId="profile-1" initialProfile={themeState.profileResult} />
  );
  try {
    setTextareaValue(
      view.container.querySelector("[data-testid='token-draft']"),
      JSON.stringify({ colors: { primary: "#00ff00" } }, null, 2)
    );
    clickButtonByText(view.container, "Save Changes");
    await flush();

    // The mutation committed, but the post-save reload threw a non-API error.
    expect(themeState.updateThemeProfile).toHaveBeenCalledWith("profile-1", {
      tokens: { colors: { primary: "#00ff00" } },
    });
    expect(view.container.textContent).toContain("Failed to load theme profile.");
  } finally {
    view.cleanup();
  }
});

test("ThemeEditorPage stays on the loading state when the route has no theme id", async () => {
  themeState.reset();
  window.history.replaceState({}, "", "/admin/settings");

  const view = mount(<ThemeEditorPage />);
  try {
    await flush();

    // resolveProfileId finds no "themes" segment, so no load is attempted and
    // the page keeps its initial loading state instead of rendering an editor.
    expect(themeState.getThemeProfile).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Loading theme profile...");
    expect(view.container.textContent).not.toContain("Theme profile not found.");
  } finally {
    view.cleanup();
  }

  themeState.reset();
  window.history.replaceState({}, "", "/admin/themes");
  const bareView = mount(<ThemeEditorPage />);
  try {
    await flush();
    // A "themes" segment with no id after it also resolves to no profile id.
    expect(themeState.getThemeProfile).not.toHaveBeenCalled();
    expect(bareView.container.textContent).toContain("Loading theme profile...");
  } finally {
    bareView.cleanup();
  }
});

test("ThemeEditorPage ignores loads that resolve after unmount", async () => {
  themeState.reset();
  window.history.replaceState({}, "", "/admin/themes/profile-1");
  themeState.getProfileError = { kind: "api", message: "Late failure" };

  const view = mount(<ThemeEditorPage />);
  // Unmount while the fetch is still in flight; the guard must swallow the
  // late rejection without an act()/state-update warning.
  view.cleanup();

  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(themeState.getThemeProfile).toHaveBeenCalledWith("profile-1");
});

test("ThemeEditorPage reloads after save with missing token groups and reports API reload errors", async () => {
  themeState.reset();
  themeState.profileResult = {
    ...themeState.profileResult,
    tokens: null,
    routes: null,
  } as unknown as typeof themeState.profileResult;
  const view = mount(
    <ThemeEditorPage profileId="profile-1" initialProfile={themeState.profileResult} />
  );
  try {
    // With tokens: null the draft is the empty object; editing it keeps the
    // null-coalescing paths (?? {}) exercised during the post-save reload.
    setTextareaValue(
      view.container.querySelector("[data-testid='token-draft']"),
      JSON.stringify({ colors: { primary: "#00ff00" } }, null, 2)
    );
    clickButtonByText(view.container, "Save Changes");
    await flush();

    expect(themeState.updateThemeProfile).toHaveBeenCalledWith("profile-1", {
      tokens: { colors: { primary: "#00ff00" } },
    });
    expect(view.container.textContent).toContain("Valid JSON");
  } finally {
    view.cleanup();
  }

  themeState.reset();
  themeState.getProfileError = { kind: "api", message: "Reload denied" };
  const apiView = mount(
    <ThemeEditorPage profileId="profile-1" initialProfile={themeState.profileResult} />
  );
  try {
    setTextareaValue(
      apiView.container.querySelector("[data-testid='token-draft']"),
      JSON.stringify({ colors: { primary: "#00ff00" } }, null, 2)
    );
    clickButtonByText(apiView.container, "Save Changes");
    await flush();

    // The mutation committed but the post-save reload surfaced an API error.
    expect(themeState.updateThemeProfile).toHaveBeenCalledWith("profile-1", {
      tokens: { colors: { primary: "#00ff00" } },
    });
    expect(apiView.container.textContent).toContain("Reload denied");
  } finally {
    apiView.cleanup();
  }
});

test("ThemeEditorPage ignores successful loads that resolve after unmount", async () => {
  themeState.reset();
  window.history.replaceState({}, "", "/admin/themes/profile-1");

  const view = mount(<ThemeEditorPage />);
  view.cleanup();

  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(themeState.getThemeProfile).toHaveBeenCalledWith("profile-1");
});

test("ThemeEditorPage derives the profile id from the initial profile alone", () => {
  themeState.reset();
  const view = mount(<ThemeEditorPage initialProfile={themeState.profileResult} />);
  try {
    // No explicit profileId and no route segment: the id comes from the
    // initialProfile, so the page renders immediately without a fetch.
    expect(themeState.getThemeProfile).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Live");
    expect(view.container.textContent).toContain("Primary");
    expect(view.container.textContent).toContain("#111111");
  } finally {
    view.cleanup();
  }
});

test("ThemeEditorPage effect load tolerates profiles without token groups", async () => {
  themeState.reset();
  window.history.replaceState({}, "", "/admin/themes/profile-1");
  themeState.profileResult = {
    ...themeState.profileResult,
    tokens: null,
    routes: null,
  } as unknown as typeof themeState.profileResult;

  const view = mount(<ThemeEditorPage />);
  try {
    await flush();
    // The effect path (no initialProfile) coalesces missing groups to {}.
    expect(view.container.textContent).toContain("Valid JSON");
    expect(view.container.textContent).not.toContain("Theme profile not found.");
  } finally {
    view.cleanup();
  }
});
