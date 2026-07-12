// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  navigationEditorContract,
  type NavigationData,
} from "../../../core/widgets/core/navigation";
import { RETAINED_COLOR_FIELDS } from "../widgets/retainedColorConsumerTable";

type TestMenuSummary = {
  id: string;
  name: string;
  location: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
};

type TestMenuItemNode = {
  id: string;
  label: string;
  href: string | null;
  pageId: string | null;
  parentId: string | null;
  orderIndex: number;
  settings?: Record<string, unknown>;
  children: TestMenuItemNode[];
};

type TestMenuWithItems = {
  menu: TestMenuSummary;
  items: TestMenuItemNode[];
};

type TestPageSummary = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "scheduled" | "archived";
  updatedAt: string;
  author: null;
};

type TestMediaRecord = {
  id: string;
  key: string;
  url: string;
  originalName?: string | null;
  type: "image" | "file";
  mimeType: string;
  size: number;
  alt?: string | null;
  title?: string | null;
  createdAt: string;
};

function createMenus(): TestMenuSummary[] {
  return [
    {
      id: "menu-1",
      name: "Primary",
      location: "header",
      status: "published",
      publishedAt: "2026-03-08T10:00:00.000Z",
      createdAt: "2026-03-08T10:00:00.000Z",
    },
    {
      id: "menu-2",
      name: "Secondary",
      location: "footer",
      status: "published",
      publishedAt: "2026-03-08T11:00:00.000Z",
      createdAt: "2026-03-08T11:00:00.000Z",
    },
  ];
}

function createMenuDetails(): Record<string, TestMenuWithItems> {
  return {
    "menu-1": {
      menu: createMenus()[0],
      items: [
        {
          id: "nav-1",
          label: "Blog",
          href: "/blog",
          pageId: null,
          parentId: null,
          orderIndex: 0,
          settings: {
            visibility: "logged_in",
            badge: { label: "New", tone: "accent" },
            description: "Latest writing",
            icon: "newspaper",
          },
          children: [
            {
              id: "nav-1-1",
              label: "Archive",
              href: null,
              pageId: "page-archive",
              parentId: "nav-1",
              orderIndex: 0,
              settings: {
                visibility: "logged_out",
              },
              children: [],
            },
          ],
        },
        {
          id: "nav-2",
          label: "Contact",
          href: "/contact",
          pageId: null,
          parentId: null,
          orderIndex: 1,
          children: [],
        },
      ],
    },
    "menu-2": {
      menu: createMenus()[1],
      items: [
        {
          id: "nav-3",
          label: "Support",
          href: "/support",
          pageId: null,
          parentId: null,
          orderIndex: 0,
          settings: {
            description: "Help center",
          },
          children: [],
        },
      ],
    },
  };
}

function createPages(): TestPageSummary[] {
  return [
    {
      id: "page-archive",
      title: "Archive",
      slug: "blog/archive/",
      status: "published",
      updatedAt: "2026-03-08T10:00:00.000Z",
      author: null,
    },
    {
      id: "page-contact",
      title: "Contact",
      slug: "contact",
      status: "published",
      updatedAt: "2026-03-08T10:00:00.000Z",
      author: null,
    },
    {
      id: "page-platform",
      title: "Platform",
      slug: "platform",
      status: "published",
      updatedAt: "2026-03-08T10:00:00.000Z",
      author: null,
    },
    {
      id: "page-api",
      title: "API",
      slug: "api",
      status: "published",
      updatedAt: "2026-03-08T10:00:00.000Z",
      author: null,
    },
    {
      id: "page-brand",
      title: "Brand",
      slug: "brand",
      status: "published",
      updatedAt: "2026-03-08T10:00:00.000Z",
      author: null,
    },
    {
      id: "page-root",
      title: "Root",
      slug: "",
      status: "published",
      updatedAt: "2026-03-08T10:00:00.000Z",
      author: null,
    },
    {
      id: "page-home",
      title: "Home",
      slug: "home",
      status: "published",
      updatedAt: "2026-03-08T10:00:00.000Z",
      author: null,
    },
  ];
}

function createMediaRecords(): TestMediaRecord[] {
  return [
    {
      id: "logo-1",
      key: "logos/coderso-mark.png",
      url: "https://cdn.example.com/logo.png",
      originalName: "coderso-mark.png",
      type: "image",
      mimeType: "image/png",
      size: 2048,
      alt: null,
      title: "Coderso mark",
      createdAt: "2026-03-08T12:00:00.000Z",
    },
  ];
}

function createNavigationValue(overrides: Partial<NavigationData> = {}): NavigationData {
  return {
    logo: {
      type: "text",
      value: "Coderso",
      href: "/",
      source: "external",
      ...overrides.logo,
    },
    items: overrides.items ?? [
      { label: "Home", href: "/" },
      { label: "Docs", href: "/docs" },
      { label: "Pricing", href: "/pricing" },
    ],
    cta: {
      label: "Get started",
      href: "/start",
      ...overrides.cta,
    },
    linksSource: overrides.linksSource ?? "manual",
    menuKey: overrides.menuKey,
    behavior: {
      sticky: false,
      transparent: false,
      collapseOnScroll: false,
      mobileMode: "expanded",
      hideCtaOnMobile: false,
      ...overrides.behavior,
    },
    layout: {
      alignment: "right",
      maxWidth: "6xl",
      paddingY: "4",
      itemGap: "4",
      ...overrides.layout,
    },
    style: {
      ...overrides.style,
    },
  };
}

const navigationClientState = vi.hoisted(() => ({
  menus: createMenus(),
  menuDetails: createMenuDetails(),
  listMenusError: null as unknown,
  menuDetailError: null as unknown,
  pages: createPages(),
  media: createMediaRecords(),
  mediaError: null as unknown,
  mediaPickerValue: "logo-1" as unknown,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    disabled,
    placeholder,
    type,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    placeholder?: string;
    type?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      type={type}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) return flattenText(child.props.children);
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (
    value: React.ReactNode
  ): Array<{ value: string; label: string; disabled: boolean }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [
          {
            value: child.props.value,
            label: flattenText(child.props.children),
            disabled: Boolean(child.props.disabled),
          },
        ];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
      disabled,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
      disabled?: boolean;
    }) => (
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
    SelectValue: ({
      children,
      placeholder,
    }: {
      children?: React.ReactNode;
      placeholder?: string;
    }) => <>{children ?? placeholder ?? null}</>,
  };
});

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
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

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/menusClient", () => ({
  listMenus: vi.fn(async () => {
    await Promise.resolve();
    if (navigationClientState.listMenusError) {
      throw navigationClientState.listMenusError;
    }
    return navigationClientState.menus;
  }),
  getMenuWithItems: vi.fn(async (menuId: string) => {
    await Promise.resolve();
    if (navigationClientState.menuDetailError) {
      throw navigationClientState.menuDetailError;
    }
    const match = navigationClientState.menuDetails[menuId];
    if (!match) {
      throw new Error(`missing_menu:${menuId}`);
    }
    return match;
  }),
}));

vi.mock("@/services/mediaClient", () => ({
  listMediaCached: vi.fn(async () => {
    await Promise.resolve();
    if (navigationClientState.mediaError) {
      throw navigationClientState.mediaError;
    }
    return navigationClientState.media;
  }),
}));

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: vi.fn(async () => {
    await Promise.resolve();
    return navigationClientState.pages;
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
  },
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({
    value,
    onChange,
  }: {
    value: string | null;
    onChange: (value: unknown) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onChange(navigationClientState.mediaPickerValue)}>
        pick-media
      </button>
      <button type="button" onClick={() => onChange(null)}>
        clear-media
      </button>
      <span>{value ?? "no-media"}</span>
    </div>
  ),
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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickElement = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLElement)) return;
  React.act(() => {
    element.click();
  });
};

const findButtonsByText = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).filter((candidate) =>
    candidate.textContent?.includes(text)
  );

const clickByText = (container: ParentNode, text: string, index = 0) => {
  const button = findButtonsByText(container, text)[index];
  if (!button) {
    throw new Error(`Missing button: ${text}#${index}`);
  }
  clickElement(button);
};

const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findInputsByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findInputByAriaLabel = (container: ParentNode, ariaLabel: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("aria-label") === ariaLabel
  );

const getDestinationSelect = (container: ParentNode, fieldId: string) => {
  const select = container.querySelector(`[data-link-destination-field="${fieldId}"] select`);
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Missing destination select "${fieldId}"`);
  }
  return select;
};

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const findSelectByOptions = (container: ParentNode, values: string[], index = 0) =>
  findSelectsByOptions(container, values)[index];

const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find(
    (section) => normalizeText(section.querySelector("h3, p")?.textContent) === normalizeText(title)
  );

const findCheckboxes = (container: ParentNode) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) => element instanceof HTMLInputElement && element.type === "checkbox"
  );

const collectWritableControlPaths = (container: ParentNode) =>
  new Set(
    Array.from(
      container.querySelectorAll(
        '[data-widget-control-path]:not([data-widget-control-readonly="true"])'
      )
    )
      .map((element) => element.getAttribute("data-widget-control-path"))
      .filter((path): path is string => Boolean(path))
  );

const createApiClientError = (message: string) => {
  const error = new Error(message);
  error.name = "ApiClientError";
  return error;
};

afterEach(() => {
  navigationClientState.menus = createMenus();
  navigationClientState.menuDetails = createMenuDetails();
  navigationClientState.listMenusError = null;
  navigationClientState.menuDetailError = null;
  navigationClientState.pages = createPages();
  navigationClientState.media = createMediaRecords();
  navigationClientState.mediaError = null;
  navigationClientState.mediaPickerValue = "logo-1";
  vi.restoreAllMocks();
});

test("Navigation helper exports map menu metadata and selection patches", async () => {
  const { buildMenuSelectionPatch, mapMenuNodesToNavigationItems } =
    await import("../../../core/admin/ui/widgets/editors/NavigationEditors");

  const mapped = mapMenuNodesToNavigationItems(
    createMenuDetails()["menu-1"].items,
    new Map(createPages().map((page) => [page.id, page.slug] as const))
  );

  expect(mapped).toEqual([
    {
      label: "Blog",
      href: "/blog",
      meta: {
        visibility: "logged_in",
        badge: { label: "New", tone: "accent" },
        description: "Latest writing",
        icon: "newspaper",
      },
      children: [
        {
          label: "Archive",
          href: "/blog/archive",
          meta: {
            visibility: "logged_out",
            badge: null,
            description: null,
            icon: null,
          },
        },
      ],
    },
    {
      label: "Contact",
      href: "/contact",
      meta: {
        visibility: "all",
        badge: null,
        description: null,
        icon: null,
      },
      children: undefined,
    },
  ]);

  expect(buildMenuSelectionPatch("menu-1", mapped)).toEqual({
    menuKey: "menu-1",
    items: mapped,
  });
  expect(buildMenuSelectionPatch(undefined)).toEqual({
    menuKey: undefined,
  });
});

test("NavigationWizardEditor is now a read-only starter summary", async () => {
  const { NavigationWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/NavigationEditors");

  let latestValue = createNavigationValue();
  let latestVariant = "simple";

  const Harness = () => {
    const [value, setValue] = useState<NavigationData>(latestValue);
    const [variant, setVariant] = useState(latestVariant);

    const handleChange = (next: NavigationData) => {
      latestValue = next;
      setValue(next);
    };

    const handleVariantChange = (next: string) => {
      latestVariant = next;
      setVariant(next);
    };

    return (
      <NavigationWizardEditor
        value={value}
        onChange={handleChange}
        variant={variant}
        onVariantChange={handleVariantChange}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Quick links"));
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Current layout"));
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Simple"));
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Current links source")
    );
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Manual links"));
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Logo type"));
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Text logo"));
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Logo text"));
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Coderso"));
    expect(view.container.querySelectorAll("select")).toHaveLength(0);
    expect(findSelectsByOptions(view.container, ["manual", "menu", "pages"])).toHaveLength(0);
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText(
        "Visual owns source switching, link labels, destinations, and dropdown structure."
      )
    );
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Simple variant hides CTA in runtime output.")
    );
    expect(findInputByPlaceholder(view.container, "Get started")).toBeUndefined();
    expect(
      view.container.querySelector(
        '[data-link-destination-field="navigation-wizard-cta-destination"]'
      )
    ).toBeNull();
    expect(findInputByPlaceholder(view.container, "Coderso")).toBeUndefined();
    expect(findInputByPlaceholder(view.container, "Logo alt text")).toBeUndefined();
    expect(() => clickByText(view.container, "pick-media")).toThrow();
    expect(latestVariant).toBe("simple");
    expect(latestValue.logo?.value).toBe("Coderso");
  } finally {
    view.cleanup();
  }
});

test("NavigationWizardEditor shows read-only menu state without surfacing live menu client failures", async () => {
  navigationClientState.listMenusError = createApiClientError("Menus unavailable");

  const { NavigationWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/NavigationEditors");

  let latestValue = createNavigationValue({
    linksSource: "menu",
    menuKey: "menu-1",
    logo: {
      type: "image",
      value: "",
      href: "/",
      source: "library",
    },
  });

  const Harness = () => {
    const [value, setValue] = useState<NavigationData>(latestValue);

    const handleChange = (next: NavigationData) => {
      latestValue = next;
      setValue(next);
    };

    return (
      <NavigationWizardEditor
        value={value}
        onChange={handleChange}
        variant="with-cta"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    expect(normalizeText(view.container.textContent)).not.toContain(
      normalizeText("Menus unavailable")
    );
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Selected menu"));
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("menu-1"));
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Switch source or sync a different menu in Visual.")
    );
  } finally {
    view.cleanup();
  }
});

test("NavigationWizardEditor no longer mutates manual links or logo copy without a variant handler", async () => {
  const { NavigationWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/NavigationEditors");

  let latestValue = createNavigationValue({
    linksSource: "manual",
    logo: {
      type: "text",
      value: "Starter brand",
      href: "/",
      source: "external",
    },
  });

  const Harness = () => {
    const [value, setValue] = useState<NavigationData>(latestValue);

    const handleChange = (next: NavigationData) => {
      latestValue = next;
      setValue(next);
    };

    return <NavigationWizardEditor value={value} onChange={handleChange} variant="simple" />;
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(findInputByPlaceholder(view.container, "Item 1 label")).toBeUndefined();
    expect(
      view.container.querySelector(
        '[data-link-destination-field="navigation-wizard-link-1-destination"]'
      )
    ).toBeNull();
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText(
        "Visual owns source switching, link labels, destinations, and dropdown structure."
      )
    );
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Simple variant hides CTA in runtime output.")
    );
    expect(latestValue.logo).toMatchObject({
      type: "text",
      value: "Starter brand",
      href: "/",
    });
  } finally {
    view.cleanup();
  }
});

test("Navigation editors surface generic menu and logo resolver failures without relying on API error wrappers", async () => {
  const { NavigationVisualEditor, NavigationWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/NavigationEditors");

  navigationClientState.listMenusError = new Error("menus_failed");

  const menuLoadView = mount(
    <NavigationWizardEditor
      value={createNavigationValue({ linksSource: "menu" })}
      onChange={() => undefined}
      variant="simple"
    />
  );

  try {
    await flush();
    expect(normalizeText(menuLoadView.container.textContent)).not.toContain(
      normalizeText("Failed to load menus.")
    );
    expect(normalizeText(menuLoadView.container.textContent)).toContain(
      normalizeText("Current links source")
    );
    expect(normalizeText(menuLoadView.container.textContent)).toContain(
      normalizeText("Existing menu")
    );
  } finally {
    menuLoadView.cleanup();
  }

  navigationClientState.listMenusError = null;
  navigationClientState.menuDetailError = new Error("sync_failed");

  let latestValue = createNavigationValue({ linksSource: "menu" });

  const VisualHarness = () => {
    const [value, setValue] = useState<NavigationData>(latestValue);

    return (
      <NavigationVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="with-cta"
      />
    );
  };

  const menuResolveView = mount(<VisualHarness />);

  try {
    await flush();
    setSelectValue(
      findSelectByOptions(menuResolveView.container, ["__none__", "menu-1", "menu-2"]),
      "menu-1"
    );
    await flush();

    expect(normalizeText(menuResolveView.container.textContent)).toContain(
      normalizeText("Failed to load selected menu items.")
    );
  } finally {
    menuResolveView.cleanup();
  }

  navigationClientState.menuDetailError = null;
  navigationClientState.mediaError = new Error("resolve_failed");
});

test("NavigationVisualEditor covers API menu resolver fallback and color picker updates", async () => {
  const { NavigationVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/NavigationEditors");

  let latestValue = createNavigationValue();

  const Harness = () => {
    const [value, setValue] = useState<NavigationData>(latestValue);

    return (
      <NavigationVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="with-cta"
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();
    const structureSection = findSectionByTitle(view.container, "Variant and Structure");
    if (!(structureSection instanceof HTMLElement)) {
      throw new Error("Missing structure section");
    }

    setSelectValue(findSelectByOptions(structureSection, ["manual", "menu", "pages"]), "menu");
    await flush();

    navigationClientState.menuDetailError = createApiClientError("Menu sync unavailable");
    setSelectValue(
      findSelectByOptions(structureSection, ["__none__", "menu-1", "menu-2"]),
      "menu-1"
    );
    await flush();

    expect(normalizeText(structureSection.textContent)).toContain(
      normalizeText("Menu sync unavailable")
    );

    const colorsSection = findSectionByTitle(view.container, "Colors, Borders, Typography");
    if (!(colorsSection instanceof HTMLElement)) {
      throw new Error("Missing colors section");
    }

    const colorPickers = Array.from(
      colorsSection.querySelectorAll<HTMLInputElement>('input[type="color"]')
    );

    setInputValue(colorPickers[0], "#102938");

    expect(latestValue.style).toMatchObject({
      surfaceColor: "#102938",
    });
  } finally {
    view.cleanup();
    navigationClientState.menuDetailError = null;
  }
});

test("Navigation mounted color inventory preserves inheritance, replacement, and clear", async () => {
  const { NavigationVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/NavigationEditors");
  const seededStyle = Object.fromEntries(
    RETAINED_COLOR_FIELDS.navigation.map((entry, index) => [
      entry.path.slice("style.".length),
      index % 2 === 0 ? "currentColor" : "inherit",
    ])
  ) as NonNullable<NavigationData["style"]>;
  let latestValue = createNavigationValue({ style: seededStyle });
  const onChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState(latestValue);
    return (
      <NavigationVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant="with-cta"
      />
    );
  };

  const view = mount(<Harness />);
  try {
    await flush();
    for (const entry of RETAINED_COLOR_FIELDS.navigation) {
      const control = view.container.querySelector(`[data-widget-control="${entry.control}"]`);
      expect(control?.getAttribute("data-widget-control-path"), entry.path).toBe(entry.path);
      expect(control?.getAttribute("data-shared-color-state"), entry.path).toBe("inherited");
    }
    expect(view.container.textContent).toContain("Inherited color");
    expect(onChangeSpy).not.toHaveBeenCalled();

    const surfaceControl = view.container.querySelector(
      '[data-widget-control="navigation.visual.style.surfaceColor"]'
    );
    setInputValue(surfaceControl?.querySelector('input[type="color"]'), "#102030");
    expect(latestValue.style?.surfaceColor).toBe("#102030");
    expect(onChangeSpy).toHaveBeenCalledTimes(1);

    const borderControl = view.container.querySelector(
      '[data-widget-control="navigation.visual.style.borderColor"]'
    );
    clickByText(borderControl ?? view.container, "Clear");
    expect(latestValue.style?.borderColor).toBeUndefined();
    expect(onChangeSpy).toHaveBeenCalledTimes(2);
  } finally {
    view.cleanup();
  }
});

test("NavigationVisualEditor covers manual editing, menu error recovery, CTA validation, and style or behavior controls", async () => {
  const { NavigationVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/NavigationEditors");

  let latestValue = createNavigationValue();
  let latestVariant = "simple";

  const Harness = () => {
    const [value, setValue] = useState<NavigationData>(latestValue);
    const [variant, setVariant] = useState(latestVariant);

    const handleChange = (next: NavigationData) => {
      latestValue = next;
      setValue(next);
    };

    const handleVariantChange = (next: string) => {
      latestVariant = next;
      setVariant(next);
    };

    return (
      <NavigationVisualEditor
        value={value}
        onChange={handleChange}
        variant={variant}
        onVariantChange={handleVariantChange}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const structureSection = findSectionByTitle(view.container, "Variant and Structure");
    const brandSection = findSectionByTitle(view.container, "Brand and Logo");
    const linksSection = findSectionByTitle(view.container, "Navigation Links");
    const ctaSection = findSectionByTitle(view.container, "CTA and Right Actions");
    const mobileSection = findSectionByTitle(view.container, "Mobile Behavior");
    const colorsSection = findSectionByTitle(view.container, "Colors, Borders, Typography");
    const surfaceSection = findSectionByTitle(view.container, "Surface and Runtime Behavior");

    expect(structureSection).toBeTruthy();
    expect(brandSection).toBeTruthy();
    expect(linksSection).toBeTruthy();
    expect(ctaSection).toBeTruthy();
    expect(mobileSection).toBeTruthy();
    expect(colorsSection).toBeTruthy();
    expect(surfaceSection).toBeTruthy();
    expect(
      Array.from(view.container.querySelectorAll("[data-widget-editor-section]")).map((section) =>
        section.getAttribute("data-widget-editor-section")
      )
    ).toEqual([
      "navigation.visual.variant-structure",
      "navigation.visual.brand-logo",
      "navigation.visual.navigation-links",
      "navigation.visual.cta-right-actions",
      "navigation.visual.mobile-behavior",
      "navigation.visual.colors-borders-typography",
      "navigation.visual.surface-runtime-behavior",
    ]);
    expect(
      findInputByAriaLabel(colorsSection ?? view.container, "Surface color value")
    ).toBeFalsy();
    expect(findInputByAriaLabel(colorsSection ?? view.container, "Border color value")).toBeFalsy();

    clickByText(structureSection ?? view.container, "Split");
    expect(latestVariant).toBe("split");
    await flush();

    setInputValue(findInputByPlaceholder(linksSection ?? view.container, "Item 1 label"), "Docs");
    setSelectValue(
      getDestinationSelect(linksSection ?? view.container, "navigation-visual-link-1-destination"),
      "page-platform"
    );

    expect(latestValue.items[0]).toMatchObject({
      label: "Docs",
      href: "/platform",
    });
    expect(findInputsByPlaceholder(linksSection ?? view.container, "/path")).toHaveLength(0);

    setSelectValue(
      findSelectByOptions(linksSection ?? view.container, ["none", "pathname", "exact"]),
      "exact"
    );
    expect(latestValue.behavior?.activeLinkMode).toBe("exact");

    setInputValue(findInputByPlaceholder(linksSection ?? view.container, "sparkles"), "spark");
    setInputValue(
      findInputByPlaceholder(linksSection ?? view.container, "Helpful context under the label"),
      "Latest writing"
    );
    setInputValue(findInputByPlaceholder(linksSection ?? view.container, "New"), "Beta");
    setSelectValue(findSelectByOptions(linksSection ?? view.container, ["self", "blank"]), "blank");
    expect(latestValue.items[0]).toMatchObject({
      target: "blank",
      meta: {
        icon: "spark",
        description: "Latest writing",
        badge: {
          label: "Beta",
          tone: "default",
        },
      },
    });

    clickByText(linksSection ?? view.container, "Add sub-link", 0);
    setInputValue(findInputByPlaceholder(linksSection ?? view.container, "Sub-link label"), "API");
    await flush();
    setSelectValue(
      getDestinationSelect(
        linksSection ?? view.container,
        "navigation-visual-link-1-child-1-destination"
      ),
      "page-api"
    );

    expect(latestValue.items[0].children).toEqual([
      {
        label: "API",
        href: "/api",
        target: "self",
      },
    ]);

    clickElement(findButtonsByText(linksSection ?? view.container, "Remove")[1]);
    expect(latestValue.items[0].children).toEqual([]);

    clickByText(linksSection ?? view.container, "Add link item");
    expect(latestValue.items).toHaveLength(4);

    clickElement(findButtonsByText(linksSection ?? view.container, "Remove").at(-1));
    expect(latestValue.items).toHaveLength(3);

    clickElement(findButtonsByText(linksSection ?? view.container, "Remove")[0]);
    expect(latestValue.items).toHaveLength(2);
    expect(
      findButtonsByText(linksSection ?? view.container, "Remove").every(
        (button) => (button as HTMLButtonElement).disabled
      )
    ).toBe(true);

    setSelectValue(
      findSelectByOptions(structureSection ?? view.container, ["manual", "menu", "pages"]),
      "pages"
    );
    expect(normalizeText(linksSection?.textContent)).toContain(
      normalizeText("Manual links below act as fallback when no pages match.")
    );

    setSelectValue(
      findSelectByOptions(structureSection ?? view.container, ["manual", "menu", "pages"]),
      "menu"
    );
    await flush();

    navigationClientState.menuDetailError = new Error("sync_failed");
    setSelectValue(
      findSelectByOptions(structureSection ?? view.container, ["__none__", "menu-1", "menu-2"]),
      "menu-1"
    );
    await flush();

    expect(normalizeText(structureSection?.textContent)).toContain(
      normalizeText("Failed to load selected menu items.")
    );

    navigationClientState.menuDetailError = null;
    setSelectValue(
      findSelectByOptions(structureSection ?? view.container, ["__none__", "menu-1", "menu-2"]),
      "menu-2"
    );
    await flush();

    expect(latestValue.menuKey).toBe("menu-2");
    expect(latestValue.items).toEqual([
      {
        label: "Support",
        href: "/support",
        meta: {
          visibility: "all",
          badge: null,
          description: "Help center",
          icon: null,
        },
      },
    ]);
    expect(normalizeText(linksSection?.textContent)).toContain(
      normalizeText("Current synced menu")
    );
    expect(normalizeText(linksSection?.textContent)).toContain(normalizeText("Support"));
    expect(normalizeText(linksSection?.textContent)).toContain(normalizeText("/support"));

    setSelectValue(findSelectByOptions(brandSection ?? view.container, ["text", "image"]), "image");
    clickByText(brandSection ?? view.container, "pick-media");
    await flush();
    setSelectValue(
      getDestinationSelect(brandSection ?? view.container, "navigation-visual-logo-destination"),
      "page-brand"
    );
    setInputValue(
      findInputByPlaceholder(brandSection ?? view.container, "Logo alt text"),
      "Brand mark"
    );
    setSelectValue(findSelectByOptions(brandSection ?? view.container, ["text", "image"]), "text");
    setInputValue(
      findInputByPlaceholder(brandSection ?? view.container, "Coderso"),
      "Northwind OS"
    );

    expect(latestValue.logo).toMatchObject({
      type: "text",
      value: "Northwind OS",
      href: "/brand",
      alt: "Brand mark",
      source: "library",
      assetId: "logo-1",
    });

    setInputValue(findInputByPlaceholder(ctaSection ?? view.container, "CTA label"), "Contact");
    setSelectValue(
      getDestinationSelect(ctaSection ?? view.container, "navigation-visual-cta-destination"),
      "page-contact"
    );

    expect(latestValue.cta).toEqual({
      label: "Contact",
      href: "/contact",
    });

    setSelectValue(
      findSelectByOptions(mobileSection ?? view.container, ["expanded", "drawer", "minimal"]),
      "drawer"
    );
    clickElement(findCheckboxes(mobileSection ?? view.container)[0]);

    expect(latestValue.behavior).toMatchObject({
      mobileMode: "drawer",
      hideCtaOnMobile: true,
    });

    setInputValue(
      findInputByAriaLabel(colorsSection ?? view.container, "Surface color swatch"),
      "#f8fafc"
    );
    setInputValue(
      findInputByAriaLabel(colorsSection ?? view.container, "Border color swatch"),
      "#cbd5e1"
    );
    setInputValue(
      findInputByAriaLabel(colorsSection ?? view.container, "Text color swatch"),
      "#0f172b"
    );
    setInputValue(
      findInputByAriaLabel(colorsSection ?? view.container, "Logo color swatch"),
      "#1f2937"
    );
    setInputValue(
      findInputByAriaLabel(colorsSection ?? view.container, "Link color swatch"),
      "#475569"
    );
    setInputValue(
      findInputByAriaLabel(colorsSection ?? view.container, "CTA background swatch"),
      "#2563eb"
    );
    setInputValue(
      findInputByAriaLabel(colorsSection ?? view.container, "CTA text color swatch"),
      "#eff6ff"
    );
    setInputValue(
      findInputByAriaLabel(colorsSection ?? view.container, "CTA border color swatch"),
      "#1e40af"
    );
    setSelectValue(findSelectByOptions(colorsSection ?? view.container, ["0", "1", "2", "3"]), "2");
    const fontSizeSelect = findSelectByOptions(colorsSection ?? view.container, [
      "xs",
      "sm",
      "base",
      "lg",
    ]);
    const fontWeightSelect = findSelectByOptions(colorsSection ?? view.container, [
      "normal",
      "medium",
      "semibold",
      "bold",
    ]);
    expect(
      Array.from((fontSizeSelect as HTMLSelectElement).options).map((option) => option.value)
    ).toContain("none");
    expect(
      Array.from((fontWeightSelect as HTMLSelectElement).options).map((option) => option.value)
    ).toContain("none");
    setSelectValue(fontSizeSelect, "lg");
    setSelectValue(fontWeightSelect, "bold");
    setSelectValue(
      findSelectByOptions(colorsSection ?? view.container, ["none", "uppercase", "capitalize"]),
      "uppercase"
    );

    expect(latestValue.style).toMatchObject({
      surfaceColor: "#f8fafc",
      borderColor: "#cbd5e1",
      textColor: "#0f172b",
      logoColor: "#1f2937",
      linkColor: "#475569",
      ctaBackgroundColor: "#2563eb",
      ctaTextColor: "#eff6ff",
      ctaBorderColor: "#1e40af",
      borderWidth: "2",
      fontSize: "lg",
      fontWeight: "bold",
      textTransform: "uppercase",
    });

    clickElement(findCheckboxes(surfaceSection ?? view.container)[0]);
    expect(latestValue.behavior).toMatchObject({
      transparent: true,
    });
  } finally {
    view.cleanup();
  }
});

test("NavigationVisualEditor renders path metadata for every declared Visual writable path", async () => {
  const { NavigationVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/NavigationEditors");
  const declaredPaths = new Set(
    navigationEditorContract.sections
      .filter((section) => section.mode === "visual")
      .flatMap((section) => section.writablePaths ?? [])
  );
  const collectedPaths = new Set<string>();

  const renderAndCollect = async (value: NavigationData) => {
    const view = mount(
      <NavigationVisualEditor
        value={value}
        onChange={() => undefined}
        variant="with-cta"
        onVariantChange={() => undefined}
      />
    );
    try {
      await flush();
      for (const path of collectWritableControlPaths(view.container)) {
        collectedPaths.add(path);
      }
    } finally {
      view.cleanup();
    }
  };

  await renderAndCollect(
    createNavigationValue({
      logo: {
        type: "image",
        value: "https://cdn.example.com/logo.png",
        href: "/",
        alt: "Coderso mark",
        source: "library",
        assetId: "logo-1",
      },
      linksSource: "manual",
    })
  );
  await renderAndCollect(
    createNavigationValue({
      logo: {
        type: "image",
        value: "https://cdn.example.com/logo.png",
        href: "/",
        alt: "Coderso mark",
        source: "library",
        assetId: "logo-1",
      },
      linksSource: "menu",
      menuKey: "menu-1",
    })
  );

  expect([...declaredPaths].filter((path) => !collectedPaths.has(path))).toEqual([]);
});

test("NavigationVisualEditor surfaces runtime boundaries, cleared-link feedback, and full color reset policy", async () => {
  const { NavigationVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/NavigationEditors");

  let latestValue = createNavigationValue({
    style: {
      surfaceColor: "var(--color-bg)",
      borderColor: "#cbd5e1",
      textColor: "#0f172a",
      logoColor: "#1f2937",
      linkColor: "#475569",
      linkHoverColor: "#0f172a",
      linkActiveColor: "#1d4ed8",
      ctaBackgroundColor: "var(--color-primary)",
      ctaTextColor: "var(--color-bg)",
      ctaBorderColor: "transparent",
    },
  });

  const Harness = () => {
    const [value, setValue] = useState<NavigationData>(latestValue);

    return (
      <NavigationVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="with-cta"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    const linksSection = findSectionByTitle(view.container, "Navigation Links");
    const colorsSection = findSectionByTitle(view.container, "Colors, Borders, Typography");

    expect(normalizeText(linksSection?.textContent)).toContain(
      normalizeText(
        "Admin preview and published pages share the navigation runtime for drawer, submenu, collapse-on-scroll, and active-link updates."
      )
    );

    expect(normalizeText(colorsSection?.textContent)).toContain(normalizeText("Theme default"));
    expect(normalizeText(colorsSection?.textContent)).toContain(
      normalizeText(
        "The admin swatch is a fallback preview; public pages resolve `var(--color-bg)` from the active theme."
      )
    );
    expect(normalizeText(colorsSection?.textContent)).not.toContain(
      normalizeText("Saved custom color")
    );

    clickByText(linksSection ?? view.container, "Clear destination", 0);
    await flush();

    expect(latestValue.items[0].href).toBe("");
    expect(normalizeText(linksSection?.textContent)).toContain(
      normalizeText(
        "This link is saved in the editor but hidden from runtime until a public-safe destination is selected."
      )
    );

    const clearButtons = Array.from(
      (colorsSection ?? view.container).querySelectorAll("button")
    ).filter((button) => normalizeText(button.textContent) === "clear");

    expect(clearButtons).toHaveLength(10);
    clickElement(clearButtons[1]);
    await flush();

    expect(latestValue.style?.borderColor).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("NavigationVisualEditor clear image leaves image mode without a broken fallback source", async () => {
  const { NavigationVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/NavigationEditors");

  let latestValue = createNavigationValue({
    logo: {
      type: "image",
      value: "https://cdn.example.com/logo.png",
      href: "/",
      alt: "Northwind",
      source: "external",
    },
  });

  const Harness = () => {
    const [value, setValue] = useState<NavigationData>(latestValue);

    return (
      <NavigationVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="split"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    const brandSection = findSectionByTitle(view.container, "Brand and Logo");
    clickByText(brandSection ?? view.container, "Clear image");
    await flush();

    expect(latestValue.logo).toMatchObject({
      type: "image",
      value: "",
      source: "external",
    });
    expect(normalizeText(brandSection?.textContent)).toContain(
      normalizeText(
        "No image is saved. Runtime uses the logo alt text as a safe text fallback until a Media Library image is selected."
      )
    );
  } finally {
    view.cleanup();
  }
});

test("NavigationVisualEditor reorders top-level links with move controls", async () => {
  const { NavigationVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/NavigationEditors");

  let latestValue = createNavigationValue({
    linksSource: "manual",
  });

  const Harness = () => {
    const [value, setValue] = useState<NavigationData>(latestValue);

    const handleChange = (next: NavigationData) => {
      latestValue = next;
      setValue(next);
    };

    return (
      <NavigationVisualEditor
        value={value}
        onChange={handleChange}
        variant="split"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const linksSection = findSectionByTitle(view.container, "Navigation Links");
    const firstLinkCard = Array.from(
      (linksSection ?? view.container).querySelectorAll(".rounded-md")
    ).find((candidate) => normalizeText(candidate.textContent).includes(normalizeText("Link 1")));

    clickByText(firstLinkCard ?? linksSection ?? view.container, "Move down");
    await flush();

    expect(latestValue.items.map((item) => item.label)).toEqual(["Docs", "Home", "Pricing"]);
  } finally {
    view.cleanup();
  }
});

test("NavigationAdvancedEditor keeps layout and runtime behavior diagnostics read-only", async () => {
  const { NavigationAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/NavigationEditors");

  let latestValue = createNavigationValue({
    layout: {},
    behavior: {},
  });
  const handleChange = vi.fn((next: NavigationData) => {
    latestValue = next;
  });

  const Harness = () => {
    const [value] = useState<NavigationData>(latestValue);

    return (
      <NavigationAdvancedEditor
        value={value}
        onChange={handleChange}
        variant="simple"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Layout token summary")
    );
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Runtime behavior summary")
    );
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Transparent surface")
    );
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Mobile mode"));
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Hide CTA on mobile")
    );
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Active link mode"));
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Admin preview runtime")
    );
    expect(findSelectByOptions(view.container, ["left", "center", "right"])).toBeUndefined();
    expect(findSelectByOptions(view.container, ["5xl", "6xl", "7xl"])).toBeUndefined();
    expect(findCheckboxes(view.container)).toHaveLength(0);
    expect(handleChange).not.toHaveBeenCalled();
    expect(latestValue.layout).toEqual({
      alignment: "right",
      maxWidth: "6xl",
      paddingY: "4",
      itemGap: "4",
    });
    expect(latestValue.behavior).toMatchObject({
      sticky: false,
      collapseOnScroll: false,
    });
  } finally {
    view.cleanup();
  }
});

test("Navigation editors fall back to default source, items, behavior, and layout values for sparse payloads", async () => {
  const { NavigationAdvancedEditor, NavigationVisualEditor, NavigationWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/NavigationEditors");

  const sparseValue = {
    logo: {
      type: "text",
      value: "",
      href: "",
    },
    items: [],
    layout: {},
    behavior: {},
    style: {},
  } as NavigationData;

  const wizardView = mount(
    <NavigationWizardEditor value={sparseValue} onChange={() => undefined} variant="simple" />
  );

  try {
    await flush();
    expect(findSelectsByOptions(wizardView.container, ["manual", "menu", "pages"])).toHaveLength(0);
    expect(wizardView.container.querySelectorAll("select")).toHaveLength(0);
    expect(normalizeText(wizardView.container.textContent)).toContain(
      normalizeText("Current links source")
    );
    expect(normalizeText(wizardView.container.textContent)).toContain(
      normalizeText("Manual links")
    );
    expect(normalizeText(wizardView.container.textContent)).toContain(
      normalizeText("Current layout")
    );
    expect(normalizeText(wizardView.container.textContent)).toContain(normalizeText("Text logo"));
    expect(normalizeText(wizardView.container.textContent)).toContain(
      normalizeText("Starter links preview")
    );
    expect(findInputByPlaceholder(wizardView.container, "Coderso")).toBeUndefined();
  } finally {
    wizardView.cleanup();
  }

  const visualView = mount(
    <NavigationVisualEditor value={sparseValue} onChange={() => undefined} variant="simple" />
  );

  try {
    const mobileSection = findSectionByTitle(visualView.container, "Mobile Behavior");
    const colorsSection = findSectionByTitle(visualView.container, "Colors, Borders, Typography");
    const surfaceSection = findSectionByTitle(visualView.container, "Surface and Runtime Behavior");

    expect(normalizeText(visualView.container.textContent)).toContain(
      normalizeText("CTA is disabled for the Simple variant.")
    );
    expect(
      (
        findInputByPlaceholder(visualView.container, "Item 1 label") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("Home");
    expect(
      (
        findSelectByOptions(mobileSection as ParentNode, ["expanded", "drawer", "minimal"]) as
          | HTMLSelectElement
          | null
          | undefined
      )?.value
    ).toBe("expanded");
    expect(
      (findCheckboxes(mobileSection as ParentNode)[0] as HTMLInputElement | null | undefined)
        ?.checked
    ).toBe(false);
    expect(
      findInputByAriaLabel(colorsSection as ParentNode, "Surface color value")
    ).toBeUndefined();
    expect(
      (
        findInputByAriaLabel(colorsSection as ParentNode, "Surface color swatch") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("#ffffff");
    expect(
      (
        findSelectByOptions(colorsSection as ParentNode, ["0", "1", "2", "3"]) as
          | HTMLSelectElement
          | undefined
      )?.value
    ).toBe("1");
    const fontSizeSelect = findSelectByOptions(colorsSection as ParentNode, [
      "xs",
      "sm",
      "base",
      "lg",
    ]);
    expect(
      Array.from((fontSizeSelect as HTMLSelectElement).options).map((option) => option.value)
    ).toContain("none");
    expect((fontSizeSelect as HTMLSelectElement | undefined)?.value).toBe("sm");
    expect(
      (
        findSelectByOptions(colorsSection as ParentNode, [
          "normal",
          "medium",
          "semibold",
          "bold",
        ]) as HTMLSelectElement | null | undefined
      )?.value
    ).toBe("medium");
    expect(
      (findCheckboxes(surfaceSection as ParentNode)[0] as HTMLInputElement | null | undefined)
        ?.checked
    ).toBe(false);
  } finally {
    visualView.cleanup();
  }

  const advancedView = mount(
    <NavigationAdvancedEditor value={sparseValue} onChange={() => undefined} variant="simple" />
  );

  try {
    expect(
      findSelectByOptions(advancedView.container, ["left", "center", "right"])
    ).toBeUndefined();
    expect(findSelectByOptions(advancedView.container, ["5xl", "6xl", "7xl"])).toBeUndefined();
    expect(findCheckboxes(advancedView.container)).toHaveLength(0);
    expect(advancedView.container.textContent).toContain("Layout token summary");
    expect(advancedView.container.textContent).toContain("right");
    expect(advancedView.container.textContent).toContain("6xl");
    expect(advancedView.container.textContent).toContain("Runtime behavior summary");
    expect(advancedView.container.textContent).toContain("Disabled");
  } finally {
    advancedView.cleanup();
  }
});
