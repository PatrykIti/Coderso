// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { HeroData } from "../../../core/widgets/core/hero";

const heroState = vi.hoisted(() => {
  const createMediaItems = () => [
    {
      id: "asset-hero",
      url: "/media/hero.jpg",
      alt: "Hero alt",
      title: "Hero still",
      originalName: "hero.jpg",
    },
    {
      id: "asset-video",
      url: "https://cdn.example.com/demo.mp4",
      alt: null,
      title: "Demo video",
      originalName: "demo.mp4",
    },
    {
      id: "asset-background",
      url: "/media/background.jpg",
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
  Dialog: ({
    open,
    children,
  }: {
    open?: boolean;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
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
  }) => <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} {...props} />,
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

vi.mock("@/services/mediaClient", () => ({
  listMediaCached: vi.fn(async () => {
    if (heroState.mediaError) throw heroState.mediaError;
    return heroState.mediaItems;
  }),
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

const setSelectValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const clickElement = (element: Element | undefined) => {
  if (!element) return;
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
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

afterEach(() => {
  vi.restoreAllMocks();
  heroState.reset();
  document.body.innerHTML = "";
});

test("HeroWizardEditor applies presets, toggles CTA branches, resolves library media, and emits centered guidance", async () => {
  const { HeroWizardEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<HeroData>({ headline: "" });
    const [variant, setVariant] = useState("centered");
    return (
      <HeroWizardEditor
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
    act(() => {
      setSelectValue(findSelectByOptions(view.container, ["lead", "sales", "info"]), "sales");
    });

    expect(
      [...onChangeSpy.mock.calls]
        .reverse()
        .find(([arg]) => arg?.headline === "Convert more visitors")?.[0]
    ).toEqual(
      expect.objectContaining({
        headline: "Convert more visitors",
        subhead: "Lead with the outcome and reduce friction.",
        primaryCta: { label: "Book a demo", href: "/demo" },
        secondaryCta: { label: "Pricing", href: "/pricing" },
      })
    );

    act(() => {
      setSelectValue(findSelectByOptions(view.container, ["single", "dual"]), "single");
    });
    expect(view.container.textContent).not.toContain("Secondary CTA Label");

    act(() => {
      setSelectValue(findSelectByOptions(view.container, ["single", "dual"]), "dual");
    });
    expect(view.container.textContent).toContain("Secondary CTA Label");

    act(() => {
      setSelectValue(findSelectByOptions(view.container, ["none", "image", "video"]), "image");
    });
    expect(view.container.textContent).toContain(
      "Centered layout renders the selected image as hero background."
    );

    act(() => {
      setSelectValue(findSelectByOptions(view.container, ["library", "external"]), "library");
    });
    clickElement(findButtonsByText(findMediaPickers(view.container)[0], "pick-asset-hero")[0]);
    await flush();

    expect(
      [...onChangeSpy.mock.calls]
        .reverse()
        .find(([arg]) => arg?.media?.assetId === "asset-hero")?.[0]
    ).toEqual(
      expect.objectContaining({
        media: expect.objectContaining({
          type: "image",
          source: "library",
          assetId: "asset-hero",
          src: "/media/hero.jpg",
          alt: "Hero alt",
        }),
      })
    );

    act(() => {
      setSelectValue(findSelectByOptions(view.container, ["none", "image", "video"]), "video");
    });
    expect(view.container.textContent).toContain(
      "Centered layout does not show inline video. Use Media Right or Media Left to display video content."
    );

    act(() => {
      setSelectValue(
        findSelectByOptions(view.container, ["centered", "split", "media-left"]),
        "media-left"
      );
    });
    expect(onVariantChangeSpy).toHaveBeenCalledWith("media-left");
  } finally {
    view.cleanup();
  }
});

test("HeroWizardEditor validates media URLs and reports unresolved and API lookup failures", async () => {
  const { HeroWizardEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  const Harness = () => {
    const [value, setValue] = useState<HeroData>({ headline: "" });
    return (
      <HeroWizardEditor
        value={value}
        onChange={setValue}
        variant="split"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    act(() => {
      setSelectValue(findSelectByOptions(view.container, ["none", "image", "video"]), "image");
    });

    act(() => {
      setInputValue(findInputByPlaceholder(view.container, "https://"), "ftp://asset.invalid");
    });
    expect(view.container.textContent).toContain("Use a relative path or full URL.");

    act(() => {
      setSelectValue(findSelectByOptions(view.container, ["library", "external"]), "library");
    });
    clickElement(findButtonsByText(findMediaPickers(view.container)[0], "pick-missing-asset")[0]);
    await flush();
    expect(view.container.textContent).toContain("Selected media could not be resolved.");

    heroState.mediaError = {
      name: "ApiClientError",
      message: "Media lookup failed",
    };

    clickElement(findButtonsByText(findMediaPickers(view.container)[0], "pick-asset-video")[0]);
    await flush();
    expect(view.container.textContent).toContain("Media lookup failed");
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
  ];

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<HeroData>({
      headline: "",
      primaryCta: { label: "", href: "" },
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

    clickElement(findButtonsByText(view.container, "Apply")[0]);
    expect(onVariantChangeSpy).toHaveBeenCalledWith("media-left");
    expect(
      [...onChangeSpy.mock.calls]
        .reverse()
        .find(([arg]) => arg?.headline === "Preset headline")?.[0]
    ).toEqual(
      expect.objectContaining({
        headline: "Preset headline",
        primaryCta: { label: "Open library", href: "/library" },
      })
    );

    act(() => {
      setInputValue(
        findInputByPlaceholder(view.container, "Build with confidence"),
        "Updated hero"
      );
    });

    clickElement(findButtonsByText(view.container, "Add variant preset")[0]);

    act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Homepage Hero"), "   ");
    });
    clickElement(findButtonsByText(view.container, "Save preset")[0]);
    expect(view.container.textContent).toContain("Preset name is required.");

    act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Homepage Hero"), "Launch");
    });
    clickElement(findButtonsByText(view.container, "Save preset")[0]);
    expect(view.container.textContent).toContain("Preset name must be unique.");

    heroState.savePresetError = new Error("save failed");
    act(() => {
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

    clickElement(findButtonsByText(view.container, "Update")[0]);
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

    clickElement(findButtonsByText(view.container, "Delete")[0]);
    await flush();
    expect(view.container.textContent).not.toContain("Launch");
  } finally {
    view.cleanup();
  }
});

test("HeroVisualEditor covers inline media, CTA validation, empty preset state, and background library media", async () => {
  const { HeroVisualEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  const onChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<HeroData>({
      headline: "",
      primaryCta: { label: "", href: "" },
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
        onVariantChange={setVariant}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    expect(view.container.textContent).toContain(
      "No presets yet. Save your current setup as a starting point."
    );
    expect(view.container.textContent).toContain(
      "Background media supports both Media Library and external URL."
    );

    act(() => {
      setSelectValue(findSelectByOptions(view.container, ["single", "dual"]), "dual");
    });
    act(() => {
      setInputValue(findInputByPlaceholder(view.container, "/start"), "javascript:alert(1)");
      setInputValue(findInputByPlaceholder(view.container, "/learn"), "ftp://secondary.invalid");
    });
    expect(
      view.container.textContent?.match(/Use a relative path or full URL\./g)?.length
    ).toBeGreaterThanOrEqual(2);

    act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["none", "image", "video"])[0], "video");
    });
    act(() => {
      setInputValue(findInputByPlaceholder(view.container, "https://"), "ftp://media.invalid");
    });
    expect(view.container.textContent).toContain("Use a relative path or full URL.");

    act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["library", "external"])[0], "library");
    });
    clickElement(findButtonsByText(findMediaPickers(view.container)[0], "pick-asset-video")[0]);
    await flush();

    act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Describe the media"), "Intro clip");
      setInputValue(
        findInputByPlaceholder(view.container, "rgba(0,0,0,0.2)"),
        "rgba(0,0,0,0.4)"
      );
      setSelectValue(findSelectByOptions(view.container, ["16:9", "4:3", "1:1", "3:4"]), "1:1");
    });

    act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["none", "image", "video"])[1], "image");
    });
    act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["library", "external"])[1], "library");
    });
    clickElement(
      findButtonsByText(findMediaPickers(view.container)[1], "pick-asset-background")[0]
    );
    await flush();

    expect(
      [...onChangeSpy.mock.calls]
        .reverse()
        .find(([arg]) => arg?.background?.media?.assetId === "asset-background")?.[0]
    ).toEqual(
      expect.objectContaining({
        media: expect.objectContaining({
          type: "video",
          source: "library",
          assetId: "asset-video",
          src: "https://cdn.example.com/demo.mp4",
          alt: "Intro clip",
          ratio: "1:1",
          overlay: "rgba(0,0,0,0.4)",
        }),
        background: expect.objectContaining({
          image: "/media/background.jpg",
          media: expect.objectContaining({
            type: "image",
            source: "library",
            assetId: "asset-background",
            src: "/media/background.jpg",
          }),
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("HeroAdvancedEditor covers legacy background media, layout and spacing controls, hide-on-mobile, and media reset", async () => {
  const { HeroAdvancedEditor } = await import("../../../core/admin/ui/widgets/editors/HeroEditors");

  const onChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<HeroData>({
      headline: "",
      background: {
        image: "/legacy-hero.jpg",
      },
    });
    return (
      <HeroAdvancedEditor
        value={value}
        onChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain(
      "Advanced mode exposes technical layout controls only."
    );
    expect(
      (findSelectByOptions(view.container, ["none", "image", "video"]) as HTMLSelectElement).value
    ).toBe("image");

    act(() => {
      setSelectValue(findSelectByOptions(view.container, ["left", "center", "right"]), "right");
      setSelectValue(findSelectByOptions(view.container, ["sm", "md", "lg", "xl", "2xl"]), "2xl");
      setSelectValue(findSelectsByOptions(view.container, ["sm", "md", "lg", "xl"])[1], "sm");
      const spacingSelects = findSelectsByOptions(view.container, [
        "none",
        "xs",
        "sm",
        "md",
        "lg",
        "xl",
        "2xl",
      ]);
      setSelectValue(spacingSelects[0], "sm");
      setSelectValue(spacingSelects[1], "2xl");
      setInputValue(findInputByPlaceholder(view.container, "transparent"), "#ffffff");
    });

    act(() => {
      setSelectValue(findSelectByOptions(view.container, ["library", "external"]), "library");
    });
    clickElement(
      findButtonsByText(findMediaPickers(view.container)[0], "pick-asset-background")[0]
    );
    await flush();

    clickElement(view.container.querySelector("input[type='checkbox']") ?? undefined);

    act(() => {
      setSelectValue(findSelectByOptions(view.container, ["none", "image", "video"]), "none");
    });

    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        layout: expect.objectContaining({
          align: "right",
          maxWidth: "2xl",
          contentWidth: "sm",
        }),
        spacing: expect.objectContaining({
          paddingTop: "sm",
          paddingBottom: "2xl",
        }),
        background: expect.objectContaining({
          color: "#ffffff",
          media: expect.objectContaining({
            type: "none",
          }),
        }),
        responsive: expect.objectContaining({
          hideMediaOnMobile: true,
        }),
      })
    );
    expect(onChangeSpy.mock.lastCall?.[0]?.background?.image).toBeUndefined();
  } finally {
    view.cleanup();
  }
});
