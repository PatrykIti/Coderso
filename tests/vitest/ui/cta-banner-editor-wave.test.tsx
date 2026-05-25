// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { ctaBannerDefaults, type CtaBannerData } from "../../../core/widgets/core/ctaBanner";

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
    type,
    placeholder,
    className,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    className?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
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
    <button
      type="button"
      data-switch-checked={String(Boolean(checked))}
      onClick={() => onCheckedChange?.(!checked)}
    >
      switch
    </button>
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    rows,
    className,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    rows?: number;
    className?: string;
    [key: string]: unknown;
  }) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={className}
      {...props}
    />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
}));

vi.mock("@/services/mediaClient", () => ({
  listMediaCached: vi.fn(async () => [
    {
      id: "asset-1",
      url: "/media/cta-background.jpg",
      type: "image",
      mimeType: "image/jpeg",
    },
  ]),
}));

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: vi.fn(async () => [
    {
      id: "page-demo",
      title: "Demo",
      slug: "demo",
      status: "published",
      updatedAt: "2026-05-24T00:00:00.000Z",
      author: null,
    },
    {
      id: "page-sales",
      title: "Sales",
      slug: "sales",
      status: "published",
      updatedAt: "2026-05-24T00:00:00.000Z",
      author: null,
    },
    {
      id: "page-later",
      title: "Later",
      slug: "later",
      status: "published",
      updatedAt: "2026-05-24T00:00:00.000Z",
      author: null,
    },
  ]),
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({ value, onChange }: { value: unknown; onChange: (value: unknown) => void }) => (
    <button
      type="button"
      data-media-picker-value={String(value ?? "")}
      onClick={() => onChange("asset-1")}
    >
      media-picker
    </button>
  ),
}));

vi.mock("../../../core/admin/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    description,
    confirmLabel,
    onOpenChange,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void | Promise<void>;
  }) =>
    open ? (
      <div data-cta-confirm-dialog={title}>
        <p>{title}</p>
        <p>{description}</p>
        <button type="button" onClick={() => onOpenChange(false)}>
          Cancel
        </button>
        <button type="button" onClick={() => void onConfirm()}>
          {confirmLabel}
        </button>
      </div>
    ) : null,
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

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
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

const clickButton = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLButtonElement)) return;
  React.act(() => {
    element.click();
  });
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
};

const getInputByPlaceholder = (container: ParentNode, placeholder: string, index = 0) => {
  const inputs = Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );
  const input = inputs[index];
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input with placeholder "${placeholder}" at index ${index}`);
  }
  return input;
};

const findInputsByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const getDestinationSelect = (container: ParentNode, fieldId: string) => {
  const select = (container as ParentNode).querySelector(
    `[data-link-destination-field="${fieldId}"] select`
  );
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Missing destination select "${fieldId}"`);
  }
  return select;
};

const getTextareaByPlaceholder = (container: ParentNode, placeholder: string) => {
  const textarea = Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  );
  if (!(textarea instanceof HTMLTextAreaElement)) {
    throw new Error(`Missing textarea with placeholder "${placeholder}"`);
  }
  return textarea;
};

const getSelectByOptions = (container: ParentNode, values: string[]) => {
  const select = Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Missing select with options ${values.join(", ")}`);
  }
  return select;
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const getSectionByTitle = (container: ParentNode, title: string) => {
  const section = Array.from(container.querySelectorAll("section")).find((candidate) =>
    Array.from(candidate.querySelectorAll("h3, p")).some(
      (node) => normalizeText(node.textContent) === normalizeText(title)
    )
  );
  if (!(section instanceof HTMLElement)) {
    throw new Error(`Missing section "${title}"`);
  }
  return section;
};

const getButtonsByText = (container: ParentNode, text: string) => {
  const buttons = Array.from(container.querySelectorAll("button")).filter(
    (element): element is HTMLButtonElement =>
      element instanceof HTMLButtonElement && element.textContent?.includes(text) === true
  );
  if (buttons.length === 0) {
    throw new Error(`Missing button "${text}"`);
  }
  return buttons;
};

const getSwitchByLabel = (container: ParentNode, labelText: string, index = 0) => {
  const labels = Array.from(container.querySelectorAll("label")).filter((candidate) =>
    normalizeText(candidate.textContent).includes(normalizeText(labelText))
  );
  const label = labels[index];
  const button = label?.querySelector("button[data-switch-checked]");
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing switch for label "${labelText}" at index ${index}`);
  }
  return button;
};

const getActionCard = (container: ParentNode, kind: "primary" | "secondary" | "tertiary") => {
  const card = container.querySelector(`[data-cta-action-editor="${kind}"]`);
  if (!(card instanceof HTMLElement)) {
    throw new Error(`Missing action card "${kind}"`);
  }
  return card;
};

const getColorInputs = (container: ParentNode) =>
  Array.from(container.querySelectorAll("input[type='color']")).filter(
    (element): element is HTMLInputElement => element instanceof HTMLInputElement
  );

const mountCtaBannerHarness = ({
  initialValue,
  initialVariant,
  render,
}: {
  initialValue: CtaBannerData;
  initialVariant: string;
  render: (props: {
    value: CtaBannerData;
    onChange: (next: CtaBannerData) => void;
    variant: string;
    onVariantChange: (next: string) => void;
  }) => React.ReactNode;
}) => {
  let latestValue = initialValue;
  let latestVariant = initialVariant;
  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<CtaBannerData>(initialValue);
    const [variant, setVariant] = useState(initialVariant);

    return render({
      value,
      onChange: (next) => {
        latestValue = next;
        onChangeSpy(next);
        setValue(next);
      },
      variant,
      onVariantChange: (next) => {
        latestVariant = next;
        onVariantChangeSpy(next);
        setVariant(next);
      },
    });
  };

  return {
    ...mount(<Harness />),
    getLatestValue: () => latestValue,
    getLatestVariant: () => latestVariant,
    onChangeSpy,
    onVariantChangeSpy,
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("CtaBanner wizard covers variant cards, destinations, and secondary toggle preservation", async () => {
  const { CtaBannerWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/CtaBannerEditors");

  const initialValue: CtaBannerData = {
    content: {},
    actions: {
      primaryCta: { label: "Start", href: "/upgrade", enabled: true },
      secondaryCta: {
        label: "Talk to sales",
        href: "/contact",
        enabled: true,
      },
    },
  };

  const { cleanup, container, getLatestValue, getLatestVariant, onVariantChangeSpy } =
    mountCtaBannerHarness({
      initialValue,
      initialVariant: "legacy-layout",
      render: (props) => <CtaBannerWizardEditor {...props} />,
    });

  try {
    await flush();
    expect(getButtonsByText(container, "Selected")).toHaveLength(1);
    clickButton(getButtonsByText(container, "Split")[0]);
    expect(getLatestVariant()).toBe("split");
    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("split");

    setInputValue(
      getInputByPlaceholder(container, "Ready to launch your next campaign?"),
      "Ship campaigns faster"
    );
    setInputValue(getInputByPlaceholder(container, "Get started"), "Start free trial");
    setSelectValue(
      getDestinationSelect(container, "cta-banner-wizard-primary-destination"),
      "page-demo"
    );

    const secondarySwitch = getSwitchByLabel(container, "Enable secondary CTA");
    clickButton(secondarySwitch);
    expect(getLatestValue().actions?.secondaryCta).toMatchObject({
      label: "Talk to sales",
      href: "/contact",
      enabled: false,
    });

    clickButton(getSwitchByLabel(container, "Enable secondary CTA"));
    setInputValue(getInputByPlaceholder(container, "Contact sales"), "Talk with team");
    await flush();
    setSelectValue(
      getDestinationSelect(container, "cta-banner-wizard-secondary-destination"),
      "page-sales"
    );

    expect(getLatestValue().content).toMatchObject({
      title: "Ship campaigns faster",
    });
    expect(getLatestValue().actions).toMatchObject({
      primaryCta: {
        label: "Start free trial",
        href: "/demo",
      },
      secondaryCta: {
        label: "Talk with team",
        href: "/sales",
        enabled: true,
      },
    });
  } finally {
    cleanup();
  }
});

test("CtaBanner visual covers action labels, invalid URL feedback, toggles, clear wiring, and background controls", async () => {
  const { CtaBannerVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/CtaBannerEditors");

  const initialValue: CtaBannerData = {
    content: {
      badge: "",
      title: "",
      description: "Support line",
      showDescription: true,
    },
    actions: {
      primaryCta: { label: "Join now", href: "javascript:alert(1)", enabled: true },
      secondaryCta: { label: "Talk", href: "/contact", enabled: true },
      tertiaryCta: { label: "", href: "", enabled: false },
    },
    style: {
      background: "surface-token",
      text: "#123456",
      border: "outline-token",
      borderWidth: "9" as never,
      radius: "pill" as never,
      padding: "jumbo" as never,
    },
    background: {
      color: "surface-token",
      media: {
        type: "none",
        source: "external",
        fit: "cover",
        position: "center",
      },
    },
    motion: {
      preset: "none",
    },
  };

  const { cleanup, container, getLatestValue, getLatestVariant } = mountCtaBannerHarness({
    initialValue,
    initialVariant: "unsupported",
    render: (props) => <CtaBannerVisualEditor {...props} />,
  });

  try {
    await flush();
    const layoutSection = getSectionByTitle(container, "Variant and layout structure");
    const actionsSection = getSectionByTitle(container, "Actions");
    const colorsSection = getSectionByTitle(container, "Colors and button styles");
    const backgroundSection = getSectionByTitle(container, "Background and motion");

    expect(getButtonsByText(layoutSection, "Selected")).toHaveLength(1);
    expect(colorsSection.textContent).toContain("Saved custom color");
    expect(backgroundSection.textContent).toContain("Saved custom color");
    expect(findInputsByPlaceholder(colorsSection, "var(--color-text)")).toHaveLength(0);
    expect(findInputsByPlaceholder(colorsSection, "var(--color-primary)")).toHaveLength(0);
    expect(findInputsByPlaceholder(colorsSection, "var(--color-bg)")).toHaveLength(0);
    expect(findInputsByPlaceholder(colorsSection, "var(--color-border)")).toHaveLength(0);
    expect(findInputsByPlaceholder(backgroundSection, "var(--color-surface)")).toHaveLength(0);
    clickButton(getButtonsByText(layoutSection, "With Badge")[0]);
    expect(getLatestVariant()).toBe("with-badge");

    const primaryCard = getActionCard(actionsSection, "primary");
    expect(primaryCard.textContent).toContain("Saved custom destination");
    expect(getLatestValue().actions?.primaryCta?.href).toBe("javascript:alert(1)");

    setSelectValue(
      getDestinationSelect(primaryCard, "cta-banner-primary-destination"),
      "page-demo"
    );
    expect(getLatestValue().actions?.primaryCta?.href).toBe("/demo");

    const secondaryCard = getActionCard(actionsSection, "secondary");
    clickButton(getSwitchByLabel(secondaryCard, "Enabled"));
    expect(getLatestValue().actions?.secondaryCta).toMatchObject({
      label: "Talk",
      href: "/contact",
      enabled: false,
    });

    clickButton(getSwitchByLabel(secondaryCard, "Enabled"));
    setInputValue(getInputByPlaceholder(secondaryCard, "Contact sales"), "Talk with team");
    await flush();
    setSelectValue(
      getDestinationSelect(secondaryCard, "cta-banner-secondary-destination"),
      "page-sales"
    );
    const secondaryCardAfterHref = getActionCard(actionsSection, "secondary");
    clickButton(getSwitchByLabel(secondaryCardAfterHref, "Open in new tab"));

    const tertiaryCard = getActionCard(actionsSection, "tertiary");
    clickButton(getSwitchByLabel(tertiaryCard, "Enabled"));
    setInputValue(getInputByPlaceholder(tertiaryCard, "No thanks"), "Maybe later");
    await flush();
    setSelectValue(
      getDestinationSelect(tertiaryCard, "cta-banner-tertiary-destination"),
      "page-later"
    );
    const tertiaryCardAfterHref = getActionCard(actionsSection, "tertiary");
    const tertiaryIconSelect = getSelectByOptions(tertiaryCardAfterHref, [
      "none",
      "arrow-right",
      "chevron-right",
      "external-link",
    ]);
    setSelectValue(tertiaryIconSelect, "external-link");

    const textColorClear = getButtonsByText(colorsSection, "Clear")[0];
    clickButton(textColorClear);
    expect(getLatestValue().style?.text).toBeUndefined();

    const colorInputs = getColorInputs(backgroundSection);
    setInputValue(colorInputs[0], "#101820");
    const mediaTypeSelect = getSelectByOptions(backgroundSection, ["none", "image"]);
    setSelectValue(mediaTypeSelect, "image");
    clickButton(getButtonsByText(backgroundSection, "media-picker")[0]);
    await flush();
    const fitSelect = getSelectByOptions(backgroundSection, ["cover", "contain"]);
    setSelectValue(fitSelect, "contain");
    const positionSelect = getSelectByOptions(backgroundSection, ["center", "top", "bottom"]);
    setSelectValue(positionSelect, "top");
    const motionSelect = getSelectByOptions(backgroundSection, ["none", "fade-in", "slide-up"]);
    setSelectValue(motionSelect, "slide-up");

    const descriptionSwitch = getSwitchByLabel(container, "Show description");
    clickButton(descriptionSwitch);

    expect(getLatestValue()).toMatchObject({
      content: {
        showDescription: false,
      },
      actions: {
        primaryCta: {
          href: "/demo",
        },
        secondaryCta: {
          label: "Talk with team",
          href: "/sales",
          enabled: true,
          openInNewTab: true,
        },
        tertiaryCta: {
          label: "Maybe later",
          href: "/later",
          enabled: true,
          icon: "external-link",
        },
      },
      style: {
        text: undefined,
      },
      background: {
        color: "#101820",
        media: {
          type: "image",
          source: "library",
          assetId: "asset-1",
          src: "/media/cta-background.jpg",
          fit: "contain",
          position: "top",
        },
      },
      motion: {
        preset: "slide-up",
      },
    });
  } finally {
    cleanup();
  }
});

test("CtaBanner advanced keeps style diagnostics read-only and confirms support actions", async () => {
  const { CtaBannerAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/CtaBannerEditors");

  const initialValue: CtaBannerData = {
    content: {
      description: "Existing support line.",
      showDescription: false,
    },
    actions: {
      primaryCta: { label: "Launch" },
      secondaryCta: { enabled: false },
      tertiaryCta: { enabled: true, label: "Later", href: "/later" },
    },
    style: {
      background: "",
      text: "#111111",
      border: "var(--cta-border)",
      borderWidth: "8" as never,
      radius: "circle" as never,
      padding: "loose" as never,
      primaryButtonBorder: "var(--cta-primary-border)",
      secondaryButtonBorder: "var(--cta-secondary-border)",
    },
  };

  const { cleanup, container, getLatestValue } = mountCtaBannerHarness({
    initialValue,
    initialVariant: "centered",
    render: (props) => <CtaBannerAdvancedEditor {...props} />,
  });

  try {
    const diagnosticsSection = getSectionByTitle(container, "Style diagnostics");
    expect(diagnosticsSection.textContent).toContain("Visual owns color editing");
    expect(diagnosticsSection.textContent).toContain("#111111");
    expect(diagnosticsSection.textContent).toContain("var(--cta-border)");
    expect(findInputsByPlaceholder(container, "background token")).toHaveLength(0);
    expect(findInputsByPlaceholder(container, "text token")).toHaveLength(0);
    expect(findInputsByPlaceholder(container, "border token")).toHaveLength(0);
    expect(findInputsByPlaceholder(container, "primary button border token")).toHaveLength(0);
    expect(findInputsByPlaceholder(container, "secondary button border token")).toHaveLength(0);

    clickButton(getButtonsByText(container, "Normalize now")[0]);
    expect(container.textContent).toContain("Normalize CTA banner data?");
    clickButton(getButtonsByText(container, "Normalize now").at(-1));

    expect(getLatestValue()).toMatchObject({
      content: {
        badge: ctaBannerDefaults.content?.badge,
        title: ctaBannerDefaults.content?.title,
        description: "Existing support line.",
        showDescription: false,
      },
      actions: {
        primaryCta: {
          label: "Launch",
          href: "#",
        },
        secondaryCta: {
          label: ctaBannerDefaults.actions?.secondaryCta?.label,
          href: "#",
          enabled: false,
        },
        tertiaryCta: {
          label: "Later",
          href: "/later",
          enabled: true,
        },
      },
      style: {
        text: "#111111",
        border: "var(--cta-border)",
        borderWidth: "1",
        radius: "xl",
        padding: "md",
        primaryButtonBorder: "var(--cta-primary-border)",
        secondaryButtonBorder: "var(--cta-secondary-border)",
      },
    });

    const snapshotAfterNormalize = container.querySelector("pre")?.textContent ?? "";
    expect(snapshotAfterNormalize).toContain('"showDescription": false');
    expect(snapshotAfterNormalize).toContain('"borderWidth": "1"');
    expect(snapshotAfterNormalize).toContain(
      '"secondaryButtonBorder": "var(--cta-secondary-border)"'
    );

    clickButton(getButtonsByText(container, "Reset to defaults")[0]);
    expect(container.textContent).toContain("Reset CTA banner to defaults?");
    clickButton(getButtonsByText(container, "Reset to defaults").at(-1));

    expect(getLatestValue()).toEqual(ctaBannerDefaults);
    const snapshotAfterReset = container.querySelector("pre")?.textContent ?? "";
    expect(snapshotAfterReset).toContain('"label": "Contact sales"');
    expect(snapshotAfterReset).toContain('"color": "var(--color-surface)"');
  } finally {
    cleanup();
  }
});
