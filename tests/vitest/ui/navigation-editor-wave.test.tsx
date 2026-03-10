// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { NavigationData } from "../../../core/widgets/core/navigation";

type TestMenuSummary = {
  id: string;
  name: string;
  location: string | null;
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
      createdAt: "2026-03-08T10:00:00.000Z",
    },
    {
      id: "menu-2",
      name: "Secondary",
      location: "footer",
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
              pageId: null,
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

function createMediaRecords(): TestMediaRecord[] {
  return [
    {
      id: "logo-1",
      key: "logos/nextless-mark.png",
      url: "https://cdn.example.com/logo.png",
      originalName: "nextless-mark.png",
      type: "image",
      mimeType: "image/png",
      size: 2048,
      alt: null,
      title: "Nextless mark",
      createdAt: "2026-03-08T12:00:00.000Z",
    },
  ];
}

function createNavigationValue(
  overrides: Partial<NavigationData> = {}
): NavigationData {
  return {
    logo: {
      type: "text",
      value: "Nextless",
      href: "/",
      source: "external",
      ...overrides.logo,
    },
    items:
      overrides.items ??
      [
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
  cn: (...values: Array<string | boolean | null | undefined>) =>
    values.filter(Boolean).join(" "),
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

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const setInputValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  );
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickElement = (element: Element | undefined) => {
  if (!(element instanceof HTMLElement)) return;
  act(() => {
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

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const findSelectByOptions = (
  container: ParentNode,
  values: string[],
  index = 0
) => findSelectsByOptions(container, values)[index];

const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find(
    (section) => normalizeText(section.querySelector("p")?.textContent) === normalizeText(title)
  );

const findCheckboxes = (container: ParentNode) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) => element instanceof HTMLInputElement && element.type === "checkbox"
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
  navigationClientState.media = createMediaRecords();
  navigationClientState.mediaError = null;
  navigationClientState.mediaPickerValue = "logo-1";
  vi.restoreAllMocks();
});

test("Navigation helper exports map menu metadata and selection patches", async () => {
  const { buildMenuSelectionPatch, mapMenuNodesToNavigationItems } = await import(
    "../../../core/admin/ui/widgets/editors/NavigationEditors"
  );

  const mapped = mapMenuNodesToNavigationItems(createMenuDetails()["menu-1"].items);

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
          href: "#",
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

test("NavigationWizardEditor covers links-source branching, menu sync, logo library resolution, and CTA variant toggles", async () => {
  const { NavigationWizardEditor } = await import(
    "../../../core/admin/ui/widgets/editors/NavigationEditors"
  );

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
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Quick links"));

    const linksSourceSelect = findSelectByOptions(view.container, ["manual", "menu", "pages"]);
    setSelectValue(linksSourceSelect, "pages");

    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Fallback links appear when no pages match.")
    );

    setInputValue(findInputByPlaceholder(view.container, "Item 1 label"), "Overview");
    expect(latestValue.items[0]).toMatchObject({
      label: "Overview",
      href: "/",
    });

    clickElement(findCheckboxes(view.container)[0]);
    expect(latestVariant).toBe("with-cta");

    setInputValue(findInputByPlaceholder(view.container, "Get started"), "Talk to sales");
    setInputValue(findInputByPlaceholder(view.container, "/start"), "/contact");
    expect(latestValue.cta).toEqual({
      label: "Talk to sales",
      href: "/contact",
    });

    setSelectValue(linksSourceSelect, "menu");
    await flush();

    const menuSelect = findSelectByOptions(view.container, ["__none__", "menu-1", "menu-2"]);
    setSelectValue(menuSelect, "menu-1");

    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Syncing links from selected menu...")
    );

    await flush();

    expect(latestValue.menuKey).toBe("menu-1");
    expect(latestValue.items).toEqual([
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
            href: "#",
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
      },
    ]);

    setSelectValue(menuSelect, "__none__");
    expect(latestValue.menuKey).toBeUndefined();

    const logoTypeSelect = findSelectByOptions(view.container, ["text", "image"]);
    setSelectValue(logoTypeSelect, "image");
    setInputValue(findInputByPlaceholder(view.container, "https://..."), "logo.svg");

    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Use a relative path or full URL.")
    );

    const logoSourceSelect = findSelectByOptions(view.container, ["external", "library"]);
    setSelectValue(logoSourceSelect, "library");

    navigationClientState.mediaPickerValue = "missing-asset";
    clickByText(view.container, "pick-media");
    await flush();

    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Selected media could not be resolved.")
    );

    navigationClientState.mediaPickerValue = "logo-1";
    clickByText(view.container, "pick-media");
    await flush();

    expect(latestValue.logo).toMatchObject({
      type: "image",
      source: "library",
      assetId: "logo-1",
      value: "https://cdn.example.com/logo.png",
      alt: "Nextless mark",
    });

    clickByText(view.container, "clear-media");
    expect(latestValue.logo).toMatchObject({
      assetId: undefined,
      value: "",
    });

    setSelectValue(findSelectByOptions(view.container, ["external", "library"]), "external");
    expect(latestValue.logo).toMatchObject({
      source: "external",
      assetId: undefined,
    });

    clickElement(findCheckboxes(view.container)[0]);
    expect(latestVariant).toBe("simple");
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Simple variant hides CTA in runtime output.")
    );
  } finally {
    view.cleanup();
  }
});

test("NavigationWizardEditor surfaces menu list and logo lookup API errors without using live clients", async () => {
  navigationClientState.listMenusError = createApiClientError("Menus unavailable");
  navigationClientState.mediaError = createApiClientError("Logo lookup failed");

  const { NavigationWizardEditor } = await import(
    "../../../core/admin/ui/widgets/editors/NavigationEditors"
  );

  let latestValue = createNavigationValue({
    linksSource: "menu",
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

    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Menus unavailable")
    );

    clickByText(view.container, "pick-media");
    await flush();

    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Logo lookup failed")
    );
    expect(latestValue.logo).toMatchObject({
      source: "library",
      assetId: "logo-1",
    });
  } finally {
    view.cleanup();
  }
});

test("NavigationWizardEditor updates manual links and logo copy safely without a variant handler", async () => {
  const { NavigationWizardEditor } = await import(
    "../../../core/admin/ui/widgets/editors/NavigationEditors"
  );

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
    setSelectValue(findSelectByOptions(view.container, ["simple", "with-cta", "split"]), "split");

    const quickLinkInputs = findInputsByPlaceholder(view.container, "/path");
    setInputValue(findInputByPlaceholder(view.container, "Item 1 label"), "Platform");
    setInputValue(quickLinkInputs[0], "/platform");

    expect(latestValue.items[0]).toMatchObject({
      label: "Platform",
      href: "/platform",
    });

    setInputValue(findInputByPlaceholder(view.container, "Nextless"), "Northwind");
    setInputValue(findInputByPlaceholder(view.container, "Logo link (e.g. /)"), "/home");

    expect(latestValue.logo).toMatchObject({
      type: "text",
      value: "Northwind",
      href: "/home",
    });

    clickElement(findCheckboxes(view.container).at(-1));
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Simple variant hides CTA in runtime output.")
    );

    const logoTypeSelect = findSelectByOptions(view.container, ["text", "image"]);
    setSelectValue(logoTypeSelect, "image");

    setInputValue(findInputByPlaceholder(view.container, "https://..."), "/brand/logo.svg");
    setInputValue(findInputByPlaceholder(view.container, "Logo alt text"), "Northwind mark");

    expect(latestValue.logo).toMatchObject({
      type: "image",
      value: "/brand/logo.svg",
      href: "/home",
      alt: "Northwind mark",
    });
  } finally {
    view.cleanup();
  }
});

test("Navigation editors surface generic menu and logo resolver failures without relying on API error wrappers", async () => {
  const { NavigationVisualEditor, NavigationWizardEditor } = await import(
    "../../../core/admin/ui/widgets/editors/NavigationEditors"
  );

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
    expect(normalizeText(menuLoadView.container.textContent)).toContain(
      normalizeText("Failed to load menus.")
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

  let latestLogoValue = createNavigationValue({
    logo: {
      type: "image",
      value: "",
      href: "/",
      source: "library",
    },
  });

  const LogoHarness = () => {
    const [value, setValue] = useState<NavigationData>(latestLogoValue);

    return (
      <NavigationWizardEditor
        value={value}
        onChange={(next) => {
          latestLogoValue = next;
          setValue(next);
        }}
        variant="with-cta"
      />
    );
  };

  const logoView = mount(<LogoHarness />);

  try {
    clickByText(logoView.container, "pick-media");
    await flush();

    expect(normalizeText(logoView.container.textContent)).toContain(
      normalizeText("Failed to resolve selected logo.")
    );
    expect(latestLogoValue.logo).toMatchObject({
      source: "library",
      assetId: "logo-1",
    });
  } finally {
    logoView.cleanup();
  }
});

test("NavigationVisualEditor covers API menu resolver fallback and color picker updates", async () => {
  const { NavigationVisualEditor } = await import(
    "../../../core/admin/ui/widgets/editors/NavigationEditors"
  );

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
    const structureSection = findSectionByTitle(view.container, "Variant and Structure");
    if (!(structureSection instanceof HTMLElement)) {
      throw new Error("Missing structure section");
    }

    setSelectValue(
      findSelectByOptions(structureSection, ["manual", "menu", "pages"]),
      "menu"
    );
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

test("NavigationVisualEditor covers manual editing, menu error recovery, CTA validation, and style or behavior controls", async () => {
  const { NavigationVisualEditor } = await import(
    "../../../core/admin/ui/widgets/editors/NavigationEditors"
  );

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
    const colorsSection = findSectionByTitle(
      view.container,
      "Colors, Borders, Typography"
    );
    const surfaceSection = findSectionByTitle(
      view.container,
      "Surface and Runtime Behavior"
    );

    expect(structureSection).toBeTruthy();
    expect(brandSection).toBeTruthy();
    expect(linksSection).toBeTruthy();
    expect(ctaSection).toBeTruthy();
    expect(mobileSection).toBeTruthy();
    expect(colorsSection).toBeTruthy();
    expect(surfaceSection).toBeTruthy();

    clickByText(structureSection ?? view.container, "Split");
    expect(latestVariant).toBe("split");

    setInputValue(findInputByPlaceholder(linksSection ?? view.container, "Item 1 label"), "Docs");
    setInputValue(findInputsByPlaceholder(linksSection ?? view.container, "/path")[0], "ftp://invalid");

    expect(normalizeText(linksSection?.textContent)).toContain(
      normalizeText("Use a relative path or full URL.")
    );
    expect(latestValue.items[0]).toMatchObject({
      label: "Docs",
      href: "ftp://invalid",
    });

    clickByText(linksSection ?? view.container, "Add sub-link", 0);
    setInputValue(findInputByPlaceholder(linksSection ?? view.container, "Sub-link label"), "API");
    setInputValue(
      findInputsByPlaceholder(linksSection ?? view.container, "/path")[1],
      "/api"
    );

    expect(latestValue.items[0].children).toEqual([
      {
        label: "API",
        href: "/api",
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

    setSelectValue(findSelectByOptions(brandSection ?? view.container, ["text", "image"]), "image");
    setInputValue(findInputByPlaceholder(brandSection ?? view.container, "https://..."), "/brand/logo.svg");
    setInputValue(findInputByPlaceholder(brandSection ?? view.container, "Logo link (e.g. /)"), "/brand");
    setInputValue(findInputByPlaceholder(brandSection ?? view.container, "Logo alt text"), "Brand mark");
    setSelectValue(findSelectByOptions(brandSection ?? view.container, ["text", "image"]), "text");
    setInputValue(findInputByPlaceholder(brandSection ?? view.container, "Nextless"), "Northwind OS");

    expect(latestValue.logo).toMatchObject({
      type: "text",
      value: "Northwind OS",
      href: "/brand",
      alt: "Brand mark",
    });

    setInputValue(findInputByPlaceholder(ctaSection ?? view.container, "CTA label"), "Contact");
    setInputValue(findInputByPlaceholder(ctaSection ?? view.container, "/start"), "mailto:test@example.com");

    expect(normalizeText(ctaSection?.textContent)).toContain(
      normalizeText("Use a relative path or full URL.")
    );
    expect(latestValue.cta).toEqual({
      label: "Contact",
      href: "mailto:test@example.com",
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

    setInputValue(findInputByPlaceholder(colorsSection ?? view.container, "#ffffff"), "#f8fafc");
    setInputValue(findInputByPlaceholder(colorsSection ?? view.container, "#e2e8f0"), "#cbd5e1");
    setInputValue(findInputsByPlaceholder(colorsSection ?? view.container, "#0f172a")[0], "#0f172b");
    setInputValue(findInputsByPlaceholder(colorsSection ?? view.container, "#0f172a")[1], "#1f2937");
    setInputValue(findInputByPlaceholder(colorsSection ?? view.container, "#334155"), "#475569");
    setInputValue(findInputsByPlaceholder(colorsSection ?? view.container, "#1d4ed8")[0], "#2563eb");
    setInputValue(findInputsByPlaceholder(colorsSection ?? view.container, "#ffffff")[1], "#eff6ff");
    setInputValue(findInputsByPlaceholder(colorsSection ?? view.container, "#1d4ed8")[1], "#1e40af");
    setSelectValue(findSelectByOptions(colorsSection ?? view.container, ["0", "1", "2", "3"]), "2");
    setSelectValue(findSelectByOptions(colorsSection ?? view.container, ["xs", "sm", "base", "lg"]), "lg");
    setSelectValue(
      findSelectByOptions(colorsSection ?? view.container, ["normal", "medium", "semibold", "bold"]),
      "bold"
    );
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

test("NavigationAdvancedEditor updates layout tokens and runtime toggles", async () => {
  const { NavigationAdvancedEditor } = await import(
    "../../../core/admin/ui/widgets/editors/NavigationEditors"
  );

  let latestValue = createNavigationValue({
    layout: {},
    behavior: {},
  });

  const Harness = () => {
    const [value, setValue] = useState<NavigationData>(latestValue);

    const handleChange = (next: NavigationData) => {
      latestValue = next;
      setValue(next);
    };

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
      normalizeText("Runtime Behavior")
    );

    setSelectValue(findSelectByOptions(view.container, ["left", "center", "right"]), "center");
    setSelectValue(findSelectByOptions(view.container, ["5xl", "6xl", "7xl"]), "7xl");
    setSelectValue(findSelectByOptions(view.container, ["2", "3", "4", "5"]), "5");
    setSelectValue(findSelectByOptions(view.container, ["2", "3", "4", "6"]), "6");

    const checkboxes = findCheckboxes(view.container);
    clickElement(checkboxes[0]);
    clickElement(checkboxes[1]);

    expect(latestValue.layout).toEqual({
      alignment: "center",
      maxWidth: "7xl",
      paddingY: "5",
      itemGap: "6",
    });
    expect(latestValue.behavior).toMatchObject({
      sticky: true,
      collapseOnScroll: true,
    });
  } finally {
    view.cleanup();
  }
});
