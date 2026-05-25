// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { heroEditorContract, type HeroData } from "../../../core/widgets/core/hero";

const heroState = vi.hoisted(() => {
  const createMediaItems = () => [
    {
      id: "asset-hero",
      url: "/media/hero.jpg",
      type: "image",
      mimeType: "image/jpeg",
      alt: "Hero alt",
      title: "Hero still",
      originalName: "hero.jpg",
    },
    {
      id: "asset-video",
      url: "https://cdn.example.com/demo.mp4",
      type: "file",
      mimeType: "video/mp4",
      alt: null,
      title: "Demo video",
      originalName: "demo.mp4",
    },
    {
      id: "asset-background",
      url: "/media/background.jpg",
      type: "image",
      mimeType: "image/jpeg",
      alt: "Backdrop",
      title: "Backdrop",
      originalName: "background.jpg",
    },
  ];

  return {
    mediaItems: createMediaItems(),
    mediaError: null as unknown,
    presetValue: [] as unknown,
    userSettingError: null as unknown,
    savePresetError: null as unknown,
    lastSavedValue: null as unknown,
    reset() {
      this.mediaItems = createMediaItems();
      this.mediaError = null;
      this.presetValue = [];
      this.userSettingError = null;
      this.savePresetError = null;
      this.lastSavedValue = null;
    },
  };
});

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

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open?: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    type,
    disabled,
    min,
    max,
    step,
    className,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    disabled?: boolean;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    className?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      className={className}
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
    SelectTrigger: () => null,
    SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
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

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    rows,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    rows?: number;
    [key: string]: unknown;
  }) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} {...props} />
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

vi.mock("@/services/mediaClient", () => ({
  listMediaCached: vi.fn(async () => {
    if (heroState.mediaError) throw heroState.mediaError;
    return heroState.mediaItems;
  }),
}));

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: vi.fn(async () => [
    {
      id: "hero-signup-page",
      title: "Signup",
      slug: "signup",
      status: "published",
      updatedAt: "2026-05-25T00:00:00.000Z",
      author: null,
    },
    {
      id: "hero-demo-page",
      title: "Demo",
      slug: "demo",
      status: "published",
      updatedAt: "2026-05-25T00:00:00.000Z",
      author: null,
    },
    {
      id: "hero-join-page",
      title: "Join",
      slug: "join",
      status: "published",
      updatedAt: "2026-05-25T00:00:00.000Z",
      author: null,
    },
    {
      id: "hero-case-study-page",
      title: "Case Study",
      slug: "case-study",
      status: "published",
      updatedAt: "2026-05-25T00:00:00.000Z",
      author: null,
    },
    {
      id: "hero-launch-page",
      title: "Launch",
      slug: "launch",
      status: "published",
      updatedAt: "2026-05-25T00:00:00.000Z",
      author: null,
    },
  ]),
}));

vi.mock("@/services/userSettingsClient", () => ({
  getUserSetting: vi.fn(async () => {
    if (heroState.userSettingError) throw heroState.userSettingError;
    return {
      key: "widgets.hero.presets",
      value: heroState.presetValue,
    };
  }),
  setUserSetting: vi.fn(async (_key: string, value: unknown) => {
    if (heroState.savePresetError) throw heroState.savePresetError;
    heroState.presetValue = value;
    heroState.lastSavedValue = value;
    return {
      key: "widgets.hero.presets",
      value,
    };
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
    <div data-media-picker="true">
      <button type="button" onClick={() => onChange("asset-hero")}>
        pick-asset-hero
      </button>
      <button type="button" onClick={() => onChange("asset-video")}>
        pick-asset-video
      </button>
      <button type="button" onClick={() => onChange("asset-background")}>
        pick-asset-background
      </button>
      <button type="button" onClick={() => onChange("missing-asset")}>
        pick-missing-asset
      </button>
      <button type="button" onClick={() => onChange(null)}>
        clear-media
      </button>
      <span>{value ?? "none"}</span>
    </div>
  ),
}));

vi.mock("@/ui/posts/editor/richtext/PostRichTextAdapter", () => ({
  PostRichTextAdapter: ({
    value,
    onChange,
    placeholder,
    id,
    ariaLabelledBy,
    ariaDescribedBy,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    id?: string;
    ariaLabelledBy?: string;
    ariaDescribedBy?: string;
  }) => (
    <textarea
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      data-rich-text-adapter="true"
    />
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
    await Promise.resolve();
  });
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const clickElement = (element: Element | null | undefined) => {
  if (!element) return;
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const findInputsByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  findInputsByPlaceholder(container, placeholder)[0];

const findTextareaByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  );

const findSelectByOptions = (container: ParentNode, values: string[]) =>
  findSelectsByOptions(container, values)[0];

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const findButtonsByText = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).filter(
    (element) => element.textContent?.trim() === text
  );

const findButtonContainingText = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).find((element) =>
    element.textContent?.includes(text)
  );

const findMediaPickers = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-media-picker='true']"));

const getMediaPickerValue = (picker: Element | undefined) =>
  picker?.querySelector("span")?.textContent?.trim();

const findLinkDestinationSelect = (container: ParentNode, fieldId: string) =>
  container.querySelector(`[data-link-destination-field="${fieldId}"] select`);

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find((section) =>
    Array.from(section.querySelectorAll("h2,h3,p")).some(
      (heading) => normalizeText(heading.textContent) === normalizeText(title)
    )
  );

afterEach(() => {
  vi.restoreAllMocks();
  heroState.reset();
  document.body.innerHTML = "";
});

test("HeroWizardEditor stays setup-focused and only seeds layout, headline, and primary CTA", async () => {
  const { HeroWizardEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  let latestValue: HeroData = { headline: "" };

  const Harness = () => {
    const [value, setValue] = useState<HeroData>(latestValue);
    const [variant, setVariant] = useState("centered");
    return (
      <HeroWizardEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => {
          onVariantChangeSpy(next);
          setVariant(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);
  await flush();

  try {
    expect(view.container.textContent).toContain("Daily presentation changes live in Visual.");
    expect(view.container.querySelector('[data-widget-control="hero.subhead"]')).toBeNull();
    expect(
      view.container.querySelector('[data-widget-control="hero.secondaryCta.label"]')
    ).toBeNull();
    expect(view.container.querySelector('[data-widget-control="hero.media.type"]')).toBeNull();

    expect(
      Array.from(view.container.querySelectorAll("[data-widget-editor-section]")).map((section) => [
        section.getAttribute("data-widget-editor-mode"),
        section.getAttribute("data-widget-editor-section-role"),
      ])
    ).toEqual([
      ["wizard", "setup"],
      ["wizard", "setup"],
      ["wizard", "setup"],
    ]);

    expect(
      Array.from(view.container.querySelectorAll('[data-widget-control-ownership="writable"]')).map(
        (control) => control.getAttribute("data-widget-control-path")
      )
    ).toEqual(["variant", "headline", "primaryCta.label", "primaryCta.href"]);

    React.act(() => {
      setSelectValue(findSelectByOptions(view.container, ["lead", "sales", "info"]), "sales");
    });

    expect(
      [...onChangeSpy.mock.calls]
        .reverse()
        .find(([arg]) => arg?.headline === "Convert more visitors")?.[0]
    ).toEqual(
      expect.objectContaining({
        headline: "Convert more visitors",
        primaryCta: { label: "Book a demo", href: "/demo" },
      })
    );
    expect(onChangeSpy.mock.lastCall?.[0]).not.toHaveProperty("subhead");
    expect(onChangeSpy.mock.lastCall?.[0]).not.toHaveProperty("body");
    expect(onChangeSpy.mock.lastCall?.[0]).not.toHaveProperty("secondaryCta");

    React.act(() => {
      setInputValue(
        findInputByPlaceholder(view.container, "Build with confidence"),
        "Pipeline-ready hero"
      );
      setInputValue(findInputByPlaceholder(view.container, "Get started"), "Start onboarding");
      setSelectValue(
        findLinkDestinationSelect(view.container, "hero-wizard-primary-cta-destination"),
        "hero-join-page"
      );
    });

    React.act(() => {
      setSelectValue(
        findSelectByOptions(view.container, ["centered", "split", "media-left"]),
        "media-left"
      );
    });
    expect(onVariantChangeSpy).toHaveBeenCalledWith("media-left");
    expect(latestValue).toMatchObject({
      headline: "Pipeline-ready hero",
      primaryCta: {
        label: "Start onboarding",
        href: "/join",
      },
    });
    expect(latestValue.secondaryCta).toBeUndefined();
    expect(latestValue.media).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("HeroWizardEditor marks goal as an action and keeps all writable paths documented", async () => {
  const { HeroWizardEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  const view = mount(
    <HeroWizardEditor
      value={{ headline: "Hero", primaryCta: { label: "Start", href: "/start" } }}
      onChange={() => undefined}
      variant="split"
      onVariantChange={() => undefined}
    />
  );
  try {
    expect(
      view.container
        .querySelector('[data-widget-control="hero.goal"]')
        ?.getAttribute("data-widget-control-ownership")
    ).toBe("action");
    expect(
      view.container
        .querySelector('[data-widget-control="hero.goal"]')
        ?.hasAttribute("data-widget-control-path")
    ).toBe(false);
    expect(
      Array.from(view.container.querySelectorAll("[data-widget-control]"))
        .filter((control) => control.getAttribute("data-widget-control-ownership") !== "action")
        .map((control) => control.getAttribute("data-widget-control-path"))
    ).toEqual(["variant", "headline", "primaryCta.label", "primaryCta.href"]);
  } finally {
    view.cleanup();
  }
});

test("HeroVisualEditor loads sanitized presets, applies them, validates create flows, and persists update/delete branches", async () => {
  const { HeroVisualEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  heroState.presetValue = [
    null,
    {
      name: "Launch",
      variant: "media-left",
      data: {
        headline: "Preset headline",
        primaryCta: { label: "Open library", href: "/library" },
      },
      updatedAt: "2026-03-09T08:00:00.000Z",
    },
    {
      name: "",
      variant: "split",
      data: {},
      updatedAt: "2026-03-09T08:00:00.000Z",
    },
    {
      name: "Ignored",
      variant: "unknown",
      data: {},
      updatedAt: "2026-03-09T08:00:00.000Z",
    },
    {
      name: 42,
      variant: "split",
      data: {},
      updatedAt: "2026-03-09T08:00:00.000Z",
    },
    {
      name: "Broken data",
      variant: "split",
      data: [],
      updatedAt: "2026-03-09T08:00:00.000Z",
    },
    {
      name: "No timestamp",
      variant: "split",
      data: {
        headline: "Fallback date",
      },
      updatedAt: "",
    },
  ];

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<HeroData>({
      headline: "Current hero",
      primaryCta: { label: "Current CTA", href: "/current" },
      secondaryCta: { label: "Legacy secondary", href: "/legacy" },
      background: { color: "#111827" },
      style: { cardShadow: "strong" },
    });
    const [variant, setVariant] = useState("split");
    return (
      <HeroVisualEditor
        value={value}
        onChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => {
          onVariantChangeSpy(next);
          setVariant(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Launch");
    expect(view.container.textContent).not.toContain("Ignored");
    expect(view.container.textContent).toContain("No timestamp");

    clickElement(findButtonsByText(view.container, "Apply")[0]);
    expect(onVariantChangeSpy).toHaveBeenCalledWith("media-left");
    const appliedPreset = [...onChangeSpy.mock.calls]
      .reverse()
      .find(([arg]) => arg?.headline === "Preset headline")?.[0];
    expect(appliedPreset).toEqual(
      expect.objectContaining({
        headline: "Preset headline",
        primaryCta: { label: "Open library", href: "/library" },
        layout: {
          align: "center",
          maxWidth: "xl",
          contentWidth: "lg",
          height: "auto",
          bleed: "contained",
        },
        background: expect.objectContaining({
          media: expect.objectContaining({
            type: "none",
            source: "external",
          }),
        }),
      })
    );
    expect(appliedPreset?.secondaryCta).toBeUndefined();

    React.act(() => {
      setInputValue(
        findInputByPlaceholder(view.container, "Build with confidence"),
        "Updated hero"
      );
    });

    clickElement(findButtonsByText(view.container, "Add variant preset")[0]);
    clickElement(findButtonsByText(view.container, "Cancel")[0]);
    expect(view.container.textContent).not.toContain("Create Hero preset");

    clickElement(findButtonsByText(view.container, "Add variant preset")[0]);

    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Homepage Hero"), "   ");
    });
    clickElement(findButtonsByText(view.container, "Save preset")[0]);
    expect(view.container.textContent).toContain("Preset name is required.");

    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Homepage Hero"), "Launch");
    });
    clickElement(findButtonsByText(view.container, "Save preset")[0]);
    expect(view.container.textContent).toContain("Preset name must be unique.");

    heroState.savePresetError = new Error("save failed");
    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Homepage Hero"), "Homepage Hero");
    });
    clickElement(findButtonsByText(view.container, "Save preset")[0]);
    await flush();
    expect(view.container.textContent).toContain("Failed to save presets.");

    heroState.savePresetError = null;
    clickElement(findButtonsByText(view.container, "Save preset")[0]);
    await flush();

    expect(view.container.textContent).toContain("Homepage Hero");
    expect(heroState.lastSavedValue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Homepage Hero",
          variant: "media-left",
          data: expect.objectContaining({
            headline: "Updated hero",
          }),
        }),
      ])
    );

    const launchUpdateButton = Array.from(view.container.querySelectorAll("button")).find(
      (node) =>
        node.textContent === "Update" &&
        node.parentElement?.parentElement?.textContent?.includes("Launch")
    );
    clickElement(launchUpdateButton);
    await flush();
    expect(heroState.lastSavedValue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Launch",
          variant: "media-left",
          data: expect.objectContaining({
            headline: "Updated hero",
          }),
        }),
      ])
    );

    const launchDeleteButton = Array.from(view.container.querySelectorAll("button")).find(
      (node) =>
        node.textContent === "Delete" &&
        node.parentElement?.parentElement?.textContent?.includes("Launch")
    );
    clickElement(launchDeleteButton);
    clickElement(findButtonsByText(view.container, "Delete preset")[0]);
    await flush();
    expect(
      Array.from(view.container.querySelectorAll("button")).find(
        (node) =>
          node.textContent === "Update" &&
          node.parentElement?.parentElement?.textContent?.includes("Launch")
      )
    ).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("HeroVisualEditor updates rich copy and social proof fields", async () => {
  const { HeroVisualEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  const onChangeSpy = vi.fn();
  let latestValue: HeroData = {
    headline: "Hero",
    primaryCta: { label: "Get started", href: "/signup" },
  };

  const Harness = () => {
    const [value, setValue] = useState(latestValue);
    return (
      <HeroVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant="centered"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Styled headline");
    expect(view.container.textContent).toContain("Styled body copy");
    expect(view.container.textContent).not.toContain("Rich headline HTML");
    expect(view.container.textContent).not.toContain("Rich body HTML");
    expect(view.container.textContent).not.toContain("Allowed tags");
    expect(view.container.querySelectorAll("[data-rich-text-adapter='true']")).toHaveLength(2);
    expect(
      view.container
        .querySelector('[data-widget-control="hero.richHeadline"] textarea')
        ?.getAttribute("aria-labelledby")
    ).toContain("hero-richheadline-label");

    React.act(() => {
      setTextareaValue(
        view.container.querySelector('[data-widget-control="hero.richHeadline"] textarea'),
        "<strong>Build</strong> faster"
      );
      setTextareaValue(
        view.container.querySelector('[data-widget-control="hero.richBody"] textarea'),
        "<p>Safe <em>rich</em> body copy.</p>"
      );
    });

    clickElement(
      view.container.querySelector(
        '[data-widget-control="hero.socialProof.enabled"] input[type="checkbox"]'
      )
    );

    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "4.9/5"), "4.8/5");
      setInputValue(findInputByPlaceholder(view.container, "2,000+ reviews"), "1,200+ reviews");
      setInputValue(
        findInputByPlaceholder(view.container, "Trusted by product and ops teams."),
        "Trusted by customer-facing teams."
      );
      setInputValue(findInputByPlaceholder(view.container, "Reviewer avatar"), "Reviewer one");
    });
    clickElement(findButtonsByText(findMediaPickers(view.container)[0], "pick-asset-hero")[0]);
    await flush();

    expect(latestValue).toEqual(
      expect.objectContaining({
        richHeadline: "<strong>Build</strong> faster",
        richBody: "<p>Safe <em>rich</em> body copy.</p>",
        socialProof: expect.objectContaining({
          enabled: true,
          rating: "4.8/5",
          reviewCount: "1,200+ reviews",
          label: "Trusted by customer-facing teams.",
          avatars: [
            {
              source: "library",
              assetId: "asset-hero",
              src: "/media/hero.jpg",
              alt: "Reviewer one",
            },
          ],
        }),
      })
    );

    React.act(() => {
      setTextareaValue(
        view.container.querySelector('[data-widget-control="hero.richHeadline"] textarea'),
        "<p><br></p>"
      );
      setTextareaValue(
        view.container.querySelector('[data-widget-control="hero.richBody"] textarea'),
        '<p>Keep this<img src="/inline.jpg" /></p>'
      );
    });

    expect(latestValue.richHeadline).toBe("");
    expect(latestValue.richBody).toBe("<p>Keep this</p>");
    expect(view.container.textContent).toContain("Formatting adjusted");
    expect(view.container.textContent).toContain("Pasted images are removed from styled copy.");
  } finally {
    view.cleanup();
  }
});

test("HeroVisualEditor keeps saved external social proof avatars replace-or-clear only", async () => {
  const { HeroVisualEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  let latestValue: HeroData = {
    headline: "Hero",
    socialProof: {
      enabled: true,
      avatars: [{ src: "https://legacy.example.com/avatar.jpg", alt: "Legacy reviewer" }],
    },
  };

  const Harness = () => {
    const [value, setValue] = useState(latestValue);
    return (
      <HeroVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="centered"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Saved external avatar image is configured.");
    expect(view.container.textContent).toContain(
      "Avatar images use the Media Library; saved external avatars stay replace-or-clear compatible."
    );
    expect(view.container.textContent).not.toContain("Avatar 1 URL");
    expect(view.container.textContent).not.toContain("Use a relative path or full URL.");
    expect(
      findInputByPlaceholder(view.container, "https://cdn.example.com/avatar-1.jpg")
    ).toBeUndefined();
    expect(findMediaPickers(view.container)).toHaveLength(5);
    expect(getMediaPickerValue(findMediaPickers(view.container)[0])).toBe("none");

    clickElement(findButtonsByText(view.container, "Clear saved external avatar")[0]);
    await flush();
    expect(latestValue.socialProof?.avatars).toEqual([]);

    clickElement(findButtonsByText(findMediaPickers(view.container)[0], "pick-asset-video")[0]);
    await flush();
    expect(view.container.textContent).toContain("Select an image from the Media Library.");
    expect(latestValue.socialProof?.avatars).toEqual([]);

    clickElement(findButtonsByText(findMediaPickers(view.container)[0], "pick-asset-hero")[0]);
    await flush();
    expect(latestValue.socialProof?.avatars?.[0]).toEqual(
      expect.objectContaining({
        source: "library",
        assetId: "asset-hero",
        src: "/media/hero.jpg",
        alt: "Hero alt",
      })
    );
  } finally {
    view.cleanup();
  }
});

test("HeroVisualEditor keeps library social proof avatar state selected", async () => {
  const { HeroVisualEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  const view = mount(
    <HeroVisualEditor
      value={{
        headline: "Hero",
        socialProof: {
          enabled: true,
          avatars: [
            {
              source: "library",
              assetId: "asset-hero",
              src: "/media/hero.jpg",
              alt: "Reviewer",
            },
          ],
        },
      }}
      onChange={() => undefined}
      variant="centered"
      onVariantChange={() => undefined}
    />
  );

  try {
    await flush();

    expect(getMediaPickerValue(findMediaPickers(view.container)[0])).toBe("asset-hero");
    expect(view.container.textContent).not.toContain("Saved external avatar image is configured.");
  } finally {
    view.cleanup();
  }
});

test("HeroVisualEditor exposes contract metadata for visible Visual controls", async () => {
  const { HeroVisualEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");
  const visualContractPaths = new Set(
    heroEditorContract.sections
      .filter((section) => section.mode === "visual")
      .flatMap((section) => section.writablePaths)
  );

  const view = mount(
    <HeroVisualEditor
      value={{
        headline: "Hero",
        badge: { enabled: true, label: "New" },
        primaryCta: { label: "Start", href: "/start" },
        secondaryCta: { label: "Learn", href: "/learn" },
        media: {
          type: "video",
          source: "external",
          src: "https://cdn.example.com/demo.mp4",
        },
        background: {
          media: {
            type: "video",
            source: "external",
            src: "https://cdn.example.com/bg.mp4",
          },
        },
        socialProof: {
          enabled: true,
          avatars: [{ src: "/avatar.jpg", alt: "Reviewer" }],
        },
      }}
      onChange={() => undefined}
      variant="split"
      onVariantChange={() => undefined}
    />
  );

  try {
    await flush();

    const controls = Array.from(
      view.container.querySelectorAll('[data-widget-control-ownership="writable"]')
    );
    const visiblePaths = controls
      .map((control) => control.getAttribute("data-widget-control-path"))
      .filter((path): path is string => Boolean(path));

    expect(controls.every((control) => control.hasAttribute("data-widget-control-path"))).toBe(
      true
    );
    expect(new Set(visiblePaths).size).toBe(visiblePaths.length);
    for (const path of visiblePaths) {
      expect(visualContractPaths.has(path)).toBe(true);
    }
    expect(visiblePaths).toEqual(
      expect.arrayContaining([
        "variant",
        "headline",
        "primaryCta.label",
        "secondaryCta.label",
        "media.type",
        "media.title",
        "background.media.type",
        "background.media.title",
        "socialProof.avatars.0.assetId",
        "socialProof.avatars.0.alt",
        "layout.align",
        "spacing.paddingTop",
        "responsive.hideMediaOnMobile",
      ])
    );
  } finally {
    view.cleanup();
  }
});

test("HeroVisualEditor keeps centered media editable and clears incompatible media sources on type changes", async () => {
  const { HeroVisualEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  let latestVisualValue: HeroData = {
    headline: "Hero",
    media: {
      type: "image",
      source: "library",
      assetId: "asset-hero",
      src: "/media/hero.jpg",
      alt: "Hero background",
      overlay: "rgba(0,0,0,0.2)",
    },
  };

  const VisualHarness = () => {
    const [value, setValue] = useState(latestVisualValue);
    return (
      <HeroVisualEditor
        value={value}
        onChange={(next) => {
          latestVisualValue = next;
          setValue(next);
        }}
        variant="centered"
        onVariantChange={() => undefined}
      />
    );
  };

  const visualView = mount(<VisualHarness />);

  try {
    await flush();

    expect(findSectionByTitle(visualView.container, "Media")).toBeTruthy();
    expect(visualView.container.textContent).toContain(
      "Centered layout renders the selected image as hero background."
    );

    React.act(() => {
      setSelectValue(
        findSelectByOptions(visualView.container, ["none", "image", "video"]),
        "video"
      );
    });

    expect(visualView.container.textContent).toContain(
      "Centered layout does not render inline video."
    );
    expect(latestVisualValue.media).toEqual(
      expect.objectContaining({
        type: "video",
        source: "library",
        assetId: undefined,
        src: undefined,
        alt: undefined,
      })
    );
  } finally {
    visualView.cleanup();
  }
});

test("HeroVisualEditor applies palettes without erasing content and keeps gradient contrast guidance unknown", async () => {
  const { HeroVisualEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  let latestValue: HeroData = {
    headline: "Hero headline",
    primaryCta: { label: "Get started", href: "/signup" },
    background: {
      gradient: "linear-gradient(135deg, #020617, #0f172a)",
    },
    style: {
      textColor: "#ffffff",
      bodyColor: "#e2e8f0",
      secondaryButtonText: "#ffffff",
    },
  };

  const Harness = () => {
    const [value, setValue] = useState(latestValue);
    return (
      <HeroVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="centered"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    expect(view.container.textContent).toContain(
      "Contrast depends on inherited theme or transparent colors."
    );

    const colorsSection = findSectionByTitle(view.container, "Colors and Borders");
    clickElement(findButtonContainingText(colorsSection ?? view.container, "Dark"));

    expect(latestValue).toEqual(
      expect.objectContaining({
        headline: "Hero headline",
        primaryCta: { label: "Get started", href: "/signup" },
        background: expect.objectContaining({
          color: "#0f172a",
          gradient: "linear-gradient(135deg, #020617, #0f172a)",
        }),
        style: expect.objectContaining({
          textColor: "#f8fafc",
          subheadColor: "#e2e8f0",
          bodyColor: "#cbd5e1",
          primaryButtonBg: "#38bdf8",
          secondaryButtonBorder: "#334155",
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("HeroVisualEditor filters, sorts, and exports presets", async () => {
  const { HeroVisualEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  heroState.presetValue = [
    {
      name: "Zeta",
      variant: "split",
      data: {
        headline: "Zeta preset",
      },
      updatedAt: "2026-03-09T08:00:00.000Z",
    },
    {
      name: "Alpha",
      variant: "media-left",
      data: {
        headline: "Alpha preset",
      },
      updatedAt: "2026-03-08T08:00:00.000Z",
    },
  ];

  const view = mount(
    <HeroVisualEditor
      value={{ headline: "Current hero" }}
      onChange={() => undefined}
      variant="split"
      onVariantChange={() => undefined}
    />
  );

  try {
    await flush();

    const initialText = view.container.textContent ?? "";
    expect(initialText.indexOf("Zeta")).toBeGreaterThan(-1);
    expect(initialText.indexOf("Alpha")).toBeGreaterThan(initialText.indexOf("Zeta"));

    React.act(() => {
      setSelectValue(findSelectByOptions(view.container, ["updated-desc", "name-asc"]), "name-asc");
    });
    const sortedText = view.container.textContent ?? "";
    expect(sortedText.indexOf("Alpha")).toBeGreaterThan(-1);
    expect(sortedText.indexOf("Zeta")).toBeGreaterThan(sortedText.indexOf("Alpha"));

    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Search presets"), "alp");
    });
    expect(view.container.textContent).toContain("Alpha");
    expect(view.container.textContent).not.toContain("Zeta");

    clickElement(findButtonsByText(view.container, "Export presets")[0]);
    await flush();
    const exportTextarea = view.container.querySelector(
      "textarea[readonly]"
    ) as HTMLTextAreaElement | null;
    const exportValue = exportTextarea?.textContent;
    expect(exportTextarea?.value).toContain('"presets"');
    expect(exportTextarea?.value).toContain('"Alpha"');
    expect(exportTextarea?.value).toContain('"Zeta"');
    expect(exportValue ?? exportTextarea?.value ?? "").toContain("Alpha");
  } finally {
    view.cleanup();
  }
});

test("HeroVisualEditor rejects duplicate preset imports and normalizes media-center imports", async () => {
  const { HeroVisualEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  heroState.presetValue = [
    {
      name: "Launch",
      variant: "split",
      data: {
        headline: "Launch hero",
      },
      updatedAt: "2026-03-09T08:00:00.000Z",
    },
  ];
  heroState.lastSavedValue = null;

  const view = mount(
    <HeroVisualEditor
      value={{ headline: "Hero", primaryCta: { label: "Get started", href: "/signup" } }}
      onChange={() => undefined}
      variant="centered"
      onVariantChange={() => undefined}
    />
  );

  try {
    await flush();

    clickElement(findButtonsByText(view.container, "Import presets")[0]);
    React.act(() => {
      setTextareaValue(
        findTextareaByPlaceholder(view.container, "Paste preset JSON"),
        JSON.stringify({
          presets: [
            {
              name: "Launch",
              variant: "media-center",
              data: { headline: "Duplicate" },
            },
          ],
        })
      );
    });
    clickElement(findButtonsByText(view.container, "Import presets")[1]);
    expect(view.container.textContent).toContain('Preset name "Launch" already exists.');
    expect(heroState.lastSavedValue).toBeNull();

    React.act(() => {
      setTextareaValue(
        findTextareaByPlaceholder(view.container, "Paste preset JSON"),
        JSON.stringify({
          presets: [
            {
              name: "Imported media center",
              variant: "media-center",
              data: {
                headline: "Imported hero",
                layout: { height: "screen" },
                style: {
                  cardShadow: "invalid-token",
                  headlineSize: "giant",
                  bodyWeight: "bold",
                },
                extra: "drop-me",
              },
            },
          ],
        })
      );
    });
    clickElement(findButtonsByText(view.container, "Import presets")[1]);
    await flush();

    expect(view.container.textContent).toContain(
      'Preset "Imported media center" normalized fields:'
    );

    const savedPresets = heroState.lastSavedValue as Array<{
      variant: string;
      data: Record<string, unknown>;
    }>;
    const importedPreset = savedPresets.find((entry) => entry.variant === "media-center");

    expect(importedPreset).toBeDefined();
    expect(importedPreset?.data).toEqual(
      expect.objectContaining({
        headline: "Imported hero",
        layout: expect.objectContaining({
          align: "center",
          maxWidth: "xl",
          contentWidth: "lg",
          height: "screen",
          bleed: "contained",
        }),
        style: expect.objectContaining({
          cardShadow: "none",
          headlineSize: "3xl",
          bodyWeight: "bold",
        }),
      })
    );
    expect(importedPreset?.data.extra).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("HeroVisualEditor uses the runtime body weight default in Typography controls", async () => {
  const { HeroVisualEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  const view = mount(
    <HeroVisualEditor
      value={{ headline: "Hero" }}
      onChange={() => undefined}
      variant="centered"
      onVariantChange={() => undefined}
    />
  );

  try {
    await flush();

    const bodyWeightSelect = view.container.querySelector(
      '[data-widget-control="hero.style.bodyWeight"] select'
    );

    expect(bodyWeightSelect).toBeInstanceOf(HTMLSelectElement);
    expect((bodyWeightSelect as HTMLSelectElement).value).toBe("normal");
  } finally {
    view.cleanup();
  }
});

test("HeroVisualEditor covers content, CTA, media, typography, color, border, gradient, and background branches", async () => {
  const { HeroVisualEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  const onChangeSpy = vi.fn();
  let latestValue: HeroData = {
    headline: "",
    primaryCta: { label: "", href: "" },
  };

  const Harness = () => {
    const [value, setValue] = useState<HeroData>(latestValue);
    const [variant, setVariant] = useState("split");
    return (
      <HeroVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant={variant}
        onVariantChange={setVariant}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    const ctaSection = findSectionByTitle(view.container, "CTA");
    const layoutSection = findSectionByTitle(view.container, "Layout and spacing");
    const typographySection = findSectionByTitle(view.container, "Typography");
    const colorsSection = findSectionByTitle(view.container, "Colors and Borders");
    const backgroundSection = findSectionByTitle(view.container, "Background");

    expect(view.container.textContent).toContain(
      "No presets yet. Save your current setup as a starting point."
    );
    expect(view.container.textContent).toContain(
      "Background media uses the Media Library. Saved external media remains replace-or-clear compatible."
    );
    expect(ctaSection).toBeTruthy();
    expect(layoutSection).toBeTruthy();
    expect(typographySection).toBeTruthy();
    expect(colorsSection).toBeTruthy();
    expect(backgroundSection).toBeTruthy();

    React.act(() => {
      setInputValue(
        findInputByPlaceholder(view.container, "Build with confidence"),
        "Ship hero updates faster"
      );
      setTextareaValue(
        findTextareaByPlaceholder(view.container, "Short supporting message"),
        "A tighter supporting sentence."
      );
      setTextareaValue(
        findTextareaByPlaceholder(view.container, "Explain the key benefit."),
        "Explain the offer with a little more precision."
      );
      setInputValue(findInputByPlaceholder(view.container, "Get started"), "Start trial");
    });

    React.act(() => {
      setSelectValue(findSelectByOptions(view.container, ["single", "dual"]), "dual");
    });
    React.act(() => {
      setSelectValue(
        findLinkDestinationSelect(view.container, "hero-primary-cta-destination"),
        "hero-signup-page"
      );
      setInputValue(findInputByPlaceholder(view.container, "Learn more"), "Read case study");
      setSelectValue(
        findLinkDestinationSelect(view.container, "hero-secondary-cta-destination"),
        "hero-case-study-page"
      );
    });
    expect(view.container.textContent).not.toContain("Use a relative path or full URL.");

    React.act(() => {
      const ctaSizeSelects = findSelectsByOptions(ctaSection ?? view.container, ["sm", "md", "lg"]);
      expect(
        Array.from((ctaSizeSelects[0] as HTMLSelectElement).options).map((option) => option.value)
      ).toContain("none");
      expect(
        Array.from((ctaSizeSelects[1] as HTMLSelectElement).options).map((option) => option.value)
      ).toContain("none");
      setSelectValue(ctaSizeSelects[0], "lg");
      setSelectValue(ctaSizeSelects[1], "sm");
      setSelectValue(findSelectByOptions(view.container, ["single", "dual"]), "single");
    });
    expect(view.container.textContent).not.toContain("Secondary CTA Label");

    React.act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["none", "image", "video"])[0], "video");
    });
    expect(findInputByPlaceholder(view.container, "https://")).toBeUndefined();
    expect(findSelectsByOptions(view.container, ["library", "external"])).toHaveLength(0);
    expect(view.container.textContent).not.toContain("Use a relative path or full URL.");
    clickElement(findButtonsByText(findMediaPickers(view.container)[0], "pick-asset-video")[0]);
    await flush();

    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Product demo video"), "Intro clip");
      setTextareaValue(
        findTextareaByPlaceholder(view.container, "Optional context for screen readers"),
        "Launch walkthrough"
      );
      setInputValue(findInputByPlaceholder(view.container, "rgba(0,0,0,0.2)"), "rgba(0,0,0,0.4)");
      setSelectValue(findSelectByOptions(view.container, ["16:9", "4:3", "1:1", "3:4"]), "1:1");
    });
    clickElement(findButtonsByText(findMediaPickers(view.container)[0], "pick-asset-video")[0]);
    await flush();

    React.act(() => {
      const alignmentSelect = findSelectByOptions(layoutSection ?? view.container, [
        "left",
        "center",
        "right",
      ]);
      const headlineSizeSelect = findSelectByOptions(typographySection ?? view.container, [
        "2xl",
        "3xl",
        "4xl",
        "5xl",
      ]);
      const subheadSizeSelect = findSelectByOptions(typographySection ?? view.container, [
        "base",
        "lg",
        "xl",
        "2xl",
      ]);
      const bodySizeSelect = findSelectByOptions(typographySection ?? view.container, [
        "sm",
        "base",
        "lg",
        "xl",
      ]);
      for (const select of [headlineSizeSelect, subheadSizeSelect, bodySizeSelect]) {
        expect(
          Array.from((select as HTMLSelectElement).options).map((option) => option.value)
        ).toContain("none");
      }
      setSelectValue(alignmentSelect, "left");
      setSelectValue(headlineSizeSelect, "5xl");
      setSelectValue(subheadSizeSelect, "2xl");
      setSelectValue(bodySizeSelect, "lg");
    });

    React.act(() => {
      const colorsRoot = colorsSection ?? view.container;
      const textColorInputs = findInputsByPlaceholder(colorsRoot, "var(--color-text)");
      const borderColorInputs = findInputsByPlaceholder(colorsRoot, "var(--color-border)");
      const transparentInputs = findInputsByPlaceholder(colorsRoot, "transparent");

      setInputValue(textColorInputs[0], "#111111");
      setInputValue(
        findInputByPlaceholder(colorsRoot, "rgba(17, 24, 39, 0.8)"),
        "rgba(17,17,17,0.8)"
      );
      setInputValue(
        findInputByPlaceholder(colorsRoot, "rgba(17, 24, 39, 0.7)"),
        "rgba(17,17,17,0.7)"
      );
      setInputValue(borderColorInputs[0], "#222222");
      setInputValue(findInputByPlaceholder(colorsRoot, "var(--color-primary)"), "#333333");
      setInputValue(findInputByPlaceholder(colorsRoot, "var(--color-bg)"), "#f8fafc");
      setInputValue(transparentInputs[0], "#444444");
      setInputValue(transparentInputs[1], "#555555");
      setInputValue(textColorInputs[1], "#666666");
      setInputValue(borderColorInputs[1], "#777777");
      setInputValue(borderColorInputs[2], "#888888");

      const widthSelects = findSelectsByOptions(colorsRoot, ["0", "1", "2", "3"]);
      const radiusSelects = findSelectsByOptions(colorsRoot, ["lg", "xl", "2xl", "3xl"]);
      expect(
        Array.from((radiusSelects[0] as HTMLSelectElement).options).map((option) => option.value)
      ).toContain("none");
      expect(
        Array.from((radiusSelects[1] as HTMLSelectElement).options).map((option) => option.value)
      ).toContain("none");
      setSelectValue(widthSelects[0], "2");
      setSelectValue(widthSelects[1], "3");
      setSelectValue(radiusSelects[0], "xl");
      setSelectValue(radiusSelects[1], "3xl");
    });

    React.act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["none", "image", "video"])[1], "image");
    });
    clickElement(
      findButtonsByText(findMediaPickers(view.container)[2], "pick-asset-background")[0]
    );
    await flush();

    React.act(() => {
      const backgroundRoot = backgroundSection ?? view.container;
      const backgroundColorInputs = backgroundRoot.querySelectorAll(
        'input[type="color"]'
      ) as NodeListOf<HTMLInputElement>;
      const gradientAngle = backgroundRoot.querySelector(
        'input[type="range"]'
      ) as HTMLInputElement | null;

      setInputValue(findInputByPlaceholder(backgroundRoot, "transparent"), "#999999");
      setInputValue(backgroundColorInputs[1], "#123456");
      setInputValue(backgroundColorInputs[2], "#654321");
      setInputValue(gradientAngle ?? undefined, "45");
    });

    React.act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["none", "image", "video"])[1], "none");
    });

    expect(
      [...onChangeSpy.mock.calls].reverse().find(([arg]) => arg?.media?.title === "Intro clip")?.[0]
    ).toEqual(
      expect.objectContaining({
        headline: "Ship hero updates faster",
        subhead: "A tighter supporting sentence.",
        body: "Explain the offer with a little more precision.",
        primaryCta: expect.objectContaining({
          label: "Start trial",
          href: "/signup",
        }),
        media: expect.objectContaining({
          type: "video",
          source: "library",
          assetId: "asset-video",
          src: "https://cdn.example.com/demo.mp4",
          title: "Intro clip",
          description: "Launch walkthrough",
          ratio: "1:1",
          overlay: "rgba(0,0,0,0.4)",
        }),
        layout: expect.objectContaining({
          align: "left",
        }),
        style: expect.objectContaining({
          primaryButtonSize: "lg",
          headlineSize: "5xl",
          subheadSize: "2xl",
          bodySize: "lg",
          textColor: "#111111",
          subheadColor: "rgba(17,17,17,0.8)",
          bodyColor: "rgba(17,17,17,0.7)",
          borderColor: "#222222",
          primaryButtonBg: "#333333",
          primaryButtonText: "#f8fafc",
          primaryButtonBorder: "#444444",
          secondaryButtonBg: "#555555",
          secondaryButtonText: "#666666",
          secondaryButtonBorder: "#777777",
          mediaBorderColor: "#888888",
          borderWidth: "2",
          borderRadius: "xl",
          mediaBorderWidth: "3",
          mediaRadius: "3xl",
        }),
        background: expect.objectContaining({
          color: "#999999",
          gradient: "linear-gradient(45deg, #123456, #654321)",
          image: undefined,
          media: expect.objectContaining({
            type: "none",
          }),
        }),
      })
    );
    expect(latestValue.secondaryCta).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("HeroVisualEditor keeps saved external hero media replace-or-clear only", async () => {
  const { HeroVisualEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  let latestValue: HeroData = {
    headline: "Legacy media",
    media: {
      type: "video",
      source: "external",
      assetId: "asset-video",
      src: "https://legacy.example.com/hero.mp4",
      posterAssetId: "asset-hero",
      posterSrc: "https://legacy.example.com/poster.jpg",
      title: "Legacy video",
      description: "Legacy description",
    },
    background: {
      media: {
        type: "video",
        source: "external",
        assetId: "asset-background",
        src: "https://legacy.example.com/background.mp4",
        posterSource: "external",
        posterAssetId: "asset-hero",
        posterSrc: "https://legacy.example.com/background-poster.jpg",
      },
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<HeroData>(latestValue);
    return (
      <HeroVisualEditor
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

    expect(view.container.textContent).toContain("Saved external media is configured.");
    expect(view.container.textContent).toContain("Saved external poster image is configured.");
    expect(view.container.textContent).not.toContain("Clear saved external poster");
    expect(view.container.textContent).not.toContain("Media URL");
    expect(view.container.textContent).not.toContain("Poster image URL");
    expect(view.container.textContent).not.toContain("External URL");
    expect(findInputByPlaceholder(view.container, "https://")).toBeUndefined();
    expect(findSelectsByOptions(view.container, ["library", "external"])).toHaveLength(0);

    const initialPickers = findMediaPickers(view.container);
    expect(initialPickers).toHaveLength(4);
    expect(initialPickers.map(getMediaPickerValue)).toEqual(["none", "none", "none", "none"]);

    clickElement(findButtonsByText(view.container, "Clear saved external media")[0]);
    await flush();
    expect(latestValue.media).toEqual(
      expect.objectContaining({
        source: "library",
        assetId: undefined,
        src: undefined,
      })
    );

    clickElement(findButtonsByText(findMediaPickers(view.container)[0], "pick-asset-video")[0]);
    await flush();
    expect(latestValue.media).toEqual(
      expect.objectContaining({
        source: "library",
        assetId: "asset-video",
        src: "https://cdn.example.com/demo.mp4",
      })
    );

    clickElement(findButtonsByText(findMediaPickers(view.container)[1], "clear-media")[0]);
    await flush();
    expect(latestValue.media).toEqual(
      expect.objectContaining({
        posterSource: "library",
        posterAssetId: undefined,
        posterSrc: undefined,
      })
    );

    clickElement(findButtonsByText(findMediaPickers(view.container)[1], "pick-asset-hero")[0]);
    await flush();
    expect(latestValue.media).toEqual(
      expect.objectContaining({
        posterSource: "library",
        posterAssetId: "asset-hero",
        posterSrc: "/media/hero.jpg",
      })
    );

    clickElement(findButtonsByText(view.container, "Clear saved external media")[0]);
    await flush();
    expect(latestValue.background?.media).toEqual(
      expect.objectContaining({
        source: "library",
        assetId: undefined,
        src: undefined,
      })
    );

    clickElement(
      findButtonsByText(findMediaPickers(view.container)[2], "pick-asset-background")[0]
    );
    await flush();
    expect(latestValue.background?.media).toEqual(
      expect.objectContaining({
        source: "library",
        assetId: "asset-background",
        src: "/media/background.jpg",
      })
    );

    clickElement(findButtonsByText(findMediaPickers(view.container)[3], "clear-media")[0]);
    await flush();
    expect(latestValue.background?.media).toEqual(
      expect.objectContaining({
        posterSource: "library",
        posterAssetId: undefined,
        posterSrc: undefined,
      })
    );

    clickElement(findButtonsByText(findMediaPickers(view.container)[3], "pick-asset-hero")[0]);
    await flush();
    expect(latestValue.background?.media).toEqual(
      expect.objectContaining({
        posterSource: "library",
        posterAssetId: "asset-hero",
        posterSrc: "/media/hero.jpg",
      })
    );
  } finally {
    view.cleanup();
  }
});

test("HeroVisualEditor handles preset fallback, variant button changes, load failure, and preset limit validation", async () => {
  const { HeroVisualEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  heroState.presetValue = { invalid: true } as unknown;

  const FirstHarness = () => {
    const [value, setValue] = useState<HeroData>({ headline: "" });
    const [variant, setVariant] = useState("legacy");
    return (
      <HeroVisualEditor
        value={value}
        onChange={setValue}
        variant={variant}
        onVariantChange={setVariant}
      />
    );
  };

  const firstView = mount(<FirstHarness />);

  try {
    await flush();

    expect(firstView.container.textContent).toContain(
      "No presets yet. Save your current setup as a starting point."
    );

    clickElement(findButtonsByText(firstView.container, "Add variant preset")[0]);
    expect(
      (
        findInputByPlaceholder(firstView.container, "Homepage Hero") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("centered preset");

    clickElement(findButtonsByText(firstView.container, "Cancel")[0]);
    expect(firstView.container.textContent).not.toContain("Create Hero preset");

    clickElement(findButtonContainingText(firstView.container, "Media Left"));
    clickElement(findButtonsByText(firstView.container, "Add variant preset")[0]);
    expect(
      (
        findInputByPlaceholder(firstView.container, "Homepage Hero") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("media-left preset");
  } finally {
    firstView.cleanup();
  }

  heroState.userSettingError = new Error("load failed");

  const loadFailureView = mount(
    <HeroVisualEditor
      value={{ headline: "" }}
      onChange={() => undefined}
      variant="centered"
      onVariantChange={() => undefined}
    />
  );

  try {
    await flush();
    expect(loadFailureView.container.textContent).toContain("Failed to load presets.");
  } finally {
    loadFailureView.cleanup();
  }

  heroState.userSettingError = null;
  heroState.presetValue = Array.from({ length: 24 }, (_, index) => ({
    name: `Preset ${index + 1}`,
    variant: "centered",
    data: { headline: `Preset headline ${index + 1}` },
    updatedAt: "2026-03-09T08:00:00.000Z",
  }));

  const limitView = mount(
    <HeroVisualEditor
      value={{ headline: "Current hero" }}
      onChange={() => undefined}
      variant="centered"
      onVariantChange={() => undefined}
    />
  );

  try {
    await flush();
    clickElement(findButtonsByText(limitView.container, "Add variant preset")[0]);
    clickElement(findButtonsByText(limitView.container, "Save preset")[0]);
    expect(limitView.container.textContent).toContain("Only 24 presets are allowed.");
  } finally {
    limitView.cleanup();
  }
});

test("HeroVisualEditor hides inline media frame controls for centered variants", async () => {
  const { HeroVisualEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  const view = mount(
    <HeroVisualEditor
      value={{ headline: "Hero" }}
      onChange={() => undefined}
      variant="centered"
      onVariantChange={() => undefined}
    />
  );

  try {
    await flush();
    expect(view.container.textContent).not.toContain("Media frame border color");
    expect(view.container.textContent).not.toContain("Media border width");
    expect(view.container.textContent).not.toContain("Media radius");
  } finally {
    view.cleanup();
  }
});

test("HeroVisualEditor toggles badge fields and validates unsafe badge hrefs", async () => {
  const { HeroVisualEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");
  const onChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<HeroData>({ headline: "Hero headline" });
    return (
      <HeroVisualEditor
        value={value}
        onChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
        variant="centered"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();
    const badgeSection = findSectionByTitle(view.container, "Badge and headline");
    expect(badgeSection?.getAttribute("data-widget-editor-section")).toBe("hero.badge-headline");
    const badgeToggle = badgeSection?.querySelector("input[type='checkbox']");
    clickElement(badgeToggle ?? undefined);
    await flush();

    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Now shipping"), "Launch week");
      setInputValue(findInputByPlaceholder(view.container, "New"), "New");
      setSelectValue(
        findLinkDestinationSelect(view.container, "hero-badge-destination"),
        "hero-launch-page"
      );
    });

    expect(view.container.textContent).not.toContain("Use a relative path, hash, or full URL.");
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        badge: expect.objectContaining({
          enabled: true,
          label: "Launch week",
          prefix: "New",
          href: "/launch",
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("HeroAdvancedEditor exposes read-only diagnostics and normalized runtime payload", async () => {
  const { HeroAdvancedEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  const onChangeSpy = vi.fn();

  const view = mount(
    <HeroAdvancedEditor
      value={{
        headline: "",
        primaryCta: { label: "Start", href: "javascript:alert(1)" },
        media: {
          type: "video",
          src: "https://cdn.example.com/demo.mp4",
          title: "Demo",
        },
        background: {
          image: "/legacy-hero.jpg",
          media: {
            type: "video",
            src: "https://cdn.example.com/bg.mp4",
            overlay: "rgba(0,0,0,0.25)",
          },
        },
        responsive: { hideMediaOnMobile: true },
      }}
      variant="centered"
      onChange={onChangeSpy}
    />
  );

  try {
    expect(view.container.textContent).toContain(
      "Advanced mode is read-only. Use Visual for public-facing Hero copy"
    );
    expect(view.container.textContent).toContain("Layout summary");
    expect(view.container.textContent).toContain("Style token summary");
    expect(view.container.textContent).toContain("Media diagnostics");
    expect(view.container.textContent).toContain("Accessibility diagnostics");
    expect(view.container.textContent).toContain("Runtime payload");
    expect(view.container.textContent).toContain("Contract summary");
    expect(view.container.textContent).toContain("Rejected unsafe URL");
    expect(view.container.textContent).toContain("Video title or description missing");
    expect(view.container.textContent).toContain("Background video title or description missing");
    expect(view.container.textContent).toContain('"src": "https://cdn.example.com/bg.mp4"');
    expect(
      Array.from(view.container.querySelectorAll("[data-widget-editor-section]")).map((section) =>
        section.getAttribute("data-widget-editor-mode")
      )
    ).toEqual(["advanced", "advanced", "advanced", "advanced", "advanced", "advanced"]);
    expect(view.container.querySelector("input,select,textarea,button")).toBeNull();
    expect(
      view.container.querySelectorAll('[data-widget-control-ownership="writable"]')
    ).toHaveLength(0);
    expect(
      view.container.querySelectorAll('[data-widget-control-readonly="true"]')
    ).not.toHaveLength(0);
    expect(onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
