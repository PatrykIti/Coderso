// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  logoCloudDefaults,
  logoCloudLogoMax,
  type LogoCloudData,
} from "../../../core/widgets/core/logoCloud";

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
    placeholder,
    type,
    className,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    className?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
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

const defaultLogoCloudMediaItems = [
  {
    id: "media-1",
    key: "media/acme.svg",
    url: "/media/acme.svg",
    originalName: "acme.svg",
    type: "image" as const,
    mimeType: "image/svg+xml",
    size: 1024,
    title: "Acme logo",
    alt: "Acme brand mark",
    caption: null,
    createdAt: "2026-05-19T00:00:00.000Z",
  },
  {
    id: "media-2",
    key: "media/north.png",
    url: "/media/north.png",
    originalName: "north.png",
    type: "image" as const,
    mimeType: "image/png",
    size: 2048,
    title: "North Labs wordmark",
    alt: "North Labs wordmark",
    caption: null,
    createdAt: "2026-05-19T00:00:00.000Z",
  },
  {
    id: "media-3",
    key: "media/brochure.pdf",
    url: "/media/brochure.pdf",
    originalName: "brochure.pdf",
    type: "file" as const,
    mimeType: "application/pdf",
    size: 4096,
    title: "Brochure",
    alt: null,
    caption: null,
    createdAt: "2026-05-19T00:00:00.000Z",
  },
];

const logoCloudMediaState = {
  mediaError: null as Error | null,
  mediaItems: defaultLogoCloudMediaItems,
  listMediaImpl: null as null | (() => Promise<typeof defaultLogoCloudMediaItems>),
};

vi.mock("@/services/mediaClient", () => ({
  listMediaCached: vi.fn(async () => {
    if (logoCloudMediaState.listMediaImpl) {
      return logoCloudMediaState.listMediaImpl();
    }
    if (logoCloudMediaState.mediaError) throw logoCloudMediaState.mediaError;
    return logoCloudMediaState.mediaItems;
  }),
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({
    value,
    onChange,
    accept,
    multiple,
  }: {
    value: unknown;
    onChange: (value: unknown) => void;
    accept?: string[];
    multiple?: boolean;
  }) => (
    <div data-media-picker="true">
      <button type="button" onClick={() => onChange("media-1")}>
        pick-logo-media
      </button>
      <button type="button" onClick={() => onChange("media-2")}>
        pick-secondary-media
      </button>
      <button type="button" onClick={() => onChange("media-3")}>
        pick-unsupported-media
      </button>
      <button type="button" onClick={() => onChange("missing-media")}>
        pick-missing-media
      </button>
      <button type="button" onClick={() => onChange({ invalid: true })}>
        pick-invalid-payload
      </button>
      <button type="button" onClick={() => onChange(null)}>
        clear-media
      </button>
      <span>{typeof value === "string" ? value : "none"}</span>
      <span>{(accept ?? []).join(",")}</span>
      <span>{String(Boolean(multiple))}</span>
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

const setInputValue = (element: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setTextareaValue = (element: HTMLTextAreaElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: HTMLSelectElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setCheckboxValue = (element: HTMLInputElement, checked: boolean) => {
  if (element.checked === checked) return;
  React.act(() => {
    element.click();
  });
};

const clickButton = (element: HTMLButtonElement) => {
  React.act(() => {
    element.click();
  });
};

const dispatchDragEvent = (
  element: HTMLElement,
  type: "dragstart" | "dragover" | "drop" | "dragend"
) => {
  React.act(() => {
    element.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
  });
};

const flushPromises = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
};

const createDeferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
};

const getInputByPlaceholder = (container: ParentNode, placeholder: string) => {
  const input = Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input with placeholder "${placeholder}"`);
  }
  return input;
};

const getInputsByPlaceholder = (container: ParentNode, placeholder: string) => {
  const inputs = Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );
  if (inputs.length === 0) {
    throw new Error(`Missing inputs with placeholder "${placeholder}"`);
  }
  return inputs;
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

const getSelects = (container: ParentNode) =>
  Array.from(container.querySelectorAll("select")).filter(
    (element): element is HTMLSelectElement => element instanceof HTMLSelectElement
  );

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const getSectionByTitle = (container: ParentNode, title: string) => {
  const section = Array.from(container.querySelectorAll("section")).find((candidate) =>
    Array.from(candidate.querySelectorAll("p")).some(
      (paragraph) => normalizeText(paragraph.textContent) === normalizeText(title)
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

const getMediaPickers = (container: ParentNode) =>
  Array.from(container.querySelectorAll('[data-media-picker="true"]')).filter(
    (element): element is HTMLDivElement => element instanceof HTMLDivElement
  );

const getCheckboxes = (container: ParentNode) =>
  Array.from(container.querySelectorAll('input[type="checkbox"]')).filter(
    (element): element is HTMLInputElement => element instanceof HTMLInputElement
  );

const getElementsByWidgetControl = (container: ParentNode, control: string) => {
  const elements = Array.from(
    container.querySelectorAll(`[data-widget-control="${control}"]`)
  ).filter((element): element is HTMLElement => element instanceof HTMLElement);
  if (elements.length === 0) {
    throw new Error(`Missing widget control "${control}"`);
  }
  return elements;
};

const getLogoNameInputs = (container: ParentNode) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement &&
      /^Logo \d+$/.test(element.getAttribute("placeholder") ?? "")
  );

const mountLogoCloudHarness = ({
  initialValue,
  initialVariant,
  render,
}: {
  initialValue: LogoCloudData;
  initialVariant: string;
  render: (props: {
    value: LogoCloudData;
    onChange: (next: LogoCloudData) => void;
    variant: string;
    onVariantChange: (next: string) => void;
  }) => React.ReactNode;
}) => {
  let latestValue = initialValue;
  let latestVariant = initialVariant;
  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<LogoCloudData>(initialValue);
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
  logoCloudMediaState.mediaError = null;
  logoCloudMediaState.mediaItems = defaultLogoCloudMediaItems;
  logoCloudMediaState.listMediaImpl = null;
  vi.restoreAllMocks();
});

test("LogoCloud wizard covers variant fallback, logo count changes, and starter asset authoring", async () => {
  const { LogoCloudWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/LogoCloudEditors");

  const initialValue: LogoCloudData = {
    logos: [
      { id: "same", name: "", href: "#" },
      { id: "same", name: "North Labs", href: "#" },
      { id: "logo-3", name: "Orbit", href: "#" },
      { id: "logo-4", name: "Pixel Forge", href: "#" },
    ],
  };

  const { cleanup, container, getLatestValue, getLatestVariant, onChangeSpy, onVariantChangeSpy } =
    mountLogoCloudHarness({
      initialValue,
      initialVariant: "unexpected",
      render: (props) => <LogoCloudWizardEditor {...props} />,
    });

  const variantSelect = getSelectByOptions(container, ["grid", "strip", "dense"]);
  expect(variantSelect.value).toBe("grid");
  expect(getLogoNameInputs(container)).toHaveLength(initialValue.logos.length);

  setSelectValue(variantSelect, "strip");
  expect(getLatestVariant()).toBe("strip");
  expect(onVariantChangeSpy).toHaveBeenLastCalledWith("strip");

  setInputValue(
    getInputByPlaceholder(container, "Trusted by teams worldwide"),
    "Trusted by enterprise teams"
  );

  expect(getLatestValue().header?.title).toBe("Trusted by enterprise teams");
  expect(getLatestValue().header?.description).toBe(logoCloudDefaults.header?.description);

  const countSelect = getSelectByOptions(container, ["1", String(logoCloudLogoMax)]);
  setSelectValue(countSelect, "2");

  expect(getLatestValue().logos).toHaveLength(2);
  expect(getLatestValue().logos[0]?.id).toBe("same");
  expect(getLatestValue().logos[1]?.id).toBe("logo-2");
  expect(getLogoNameInputs(container)).toHaveLength(2);
  expect(getMediaPickers(container)).toHaveLength(2);

  setInputValue(getInputByPlaceholder(container, "Logo 2"), "North Ridge");
  setInputValue(getInputsByPlaceholder(container, "Accessible logo name")[1]!, "North Ridge logo");
  setInputValue(
    getInputsByPlaceholder(container, "https://cdn.example.com/logo.svg")[1]!,
    "/media/north-ridge.svg"
  );
  setInputValue(getInputsByPlaceholder(container, "#")[1]!, "/partners/north-ridge");

  expect(getLatestValue().logos[1]?.name).toBe("North Ridge");
  expect(getLatestValue().logos[1]?.alt).toBe("North Ridge logo");
  expect(getLatestValue().logos[1]?.image).toBe("/media/north-ridge.svg");
  expect(getLatestValue().logos[1]?.href).toBe("/partners/north-ridge");

  clickButton(getButtonsByText(getMediaPickers(container)[1]!, "pick-secondary-media")[0]!);
  await flushPromises();

  expect(getLatestValue().logos[1]?.image).toBe("/media/north.png");
  expect(getLatestValue().logos[1]?.alt).toBe("North Ridge logo");

  clickButton(getButtonsByText(getMediaPickers(container)[1]!, "clear-media")[0]!);
  await flushPromises();

  expect(getLatestValue().logos[1]?.image).toBe("");
  expect(onChangeSpy).toHaveBeenCalled();

  cleanup();
});

test("LogoCloud visual keeps the latest media selection when an older request resolves later", async () => {
  const { LogoCloudVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/LogoCloudEditors");

  const firstRequest = createDeferred<typeof defaultLogoCloudMediaItems>();
  const secondRequest = createDeferred<typeof defaultLogoCloudMediaItems>();
  let requestCount = 0;
  logoCloudMediaState.listMediaImpl = () => {
    requestCount += 1;
    return requestCount === 1 ? firstRequest.promise : secondRequest.promise;
  };

  const { cleanup, container, getLatestValue } = mountLogoCloudHarness({
    initialValue: {
      logos: [{ id: "logo-1", name: "Acme", href: "#" }],
    },
    initialVariant: "grid",
    render: (props) => <LogoCloudVisualEditor {...props} />,
  });

  const logosSection = getSectionByTitle(container, "Logos list and links");
  const picker = getMediaPickers(logosSection)[0]!;

  clickButton(getButtonsByText(picker, "pick-logo-media")[0]!);
  clickButton(getButtonsByText(picker, "pick-secondary-media")[0]!);

  secondRequest.resolve(defaultLogoCloudMediaItems);
  await flushPromises();

  expect(getLatestValue().logos[0]?.image).toBe("/media/north.png");
  expect(getLatestValue().logos[0]?.alt).toBe("North Labs wordmark");

  firstRequest.resolve(defaultLogoCloudMediaItems);
  await flushPromises();

  expect(getLatestValue().logos[0]?.image).toBe("/media/north.png");
  expect(getLatestValue().logos[0]?.alt).toBe("North Labs wordmark");

  cleanup();
});

test("LogoCloud visual preserves a manual image URL when an in-flight media request resolves later", async () => {
  const { LogoCloudVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/LogoCloudEditors");

  const deferredRequest = createDeferred<typeof defaultLogoCloudMediaItems>();
  logoCloudMediaState.listMediaImpl = () => deferredRequest.promise;

  const { cleanup, container, getLatestValue } = mountLogoCloudHarness({
    initialValue: {
      logos: [{ id: "logo-1", name: "Acme", href: "#" }],
    },
    initialVariant: "grid",
    render: (props) => <LogoCloudVisualEditor {...props} />,
  });

  const logosSection = getSectionByTitle(container, "Logos list and links");
  const picker = getMediaPickers(logosSection)[0]!;

  clickButton(getButtonsByText(picker, "pick-logo-media")[0]!);
  setInputValue(
    getInputsByPlaceholder(logosSection, "https://cdn.example.com/logo.svg")[0]!,
    "/media/manual-override.svg"
  );

  expect(getLatestValue().logos[0]?.image).toBe("/media/manual-override.svg");

  deferredRequest.resolve(defaultLogoCloudMediaItems);
  await flushPromises();

  expect(getLatestValue().logos[0]?.image).toBe("/media/manual-override.svg");
  expect(getLatestValue().logos[0]?.alt).toBeUndefined();

  cleanup();
});

test("LogoCloud visual surfaces missing and transport media errors without mutating saved logo data", async () => {
  const { LogoCloudVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/LogoCloudEditors");

  const initialValue: LogoCloudData = {
    logos: [{ id: "logo-1", name: "Acme", image: "/media/existing.svg", href: "#" }],
  };

  const { cleanup, container, getLatestValue } = mountLogoCloudHarness({
    initialValue,
    initialVariant: "grid",
    render: (props) => <LogoCloudVisualEditor {...props} />,
  });

  const logosSection = getSectionByTitle(container, "Logos list and links");
  const picker = getMediaPickers(logosSection)[0]!;

  clickButton(getButtonsByText(picker, "pick-missing-media")[0]!);
  await flushPromises();

  expect(logosSection.textContent).toContain("Logo 1: failed to resolve selected media.");
  expect(getLatestValue().logos[0]?.image).toBe("/media/existing.svg");

  logoCloudMediaState.mediaError = new Error("network down");
  clickButton(getButtonsByText(picker, "pick-logo-media")[0]!);
  await flushPromises();

  expect(logosSection.textContent).toContain("Logo 1: failed to resolve selected media.");
  expect(getLatestValue().logos[0]?.image).toBe("/media/existing.svg");

  cleanup();
});

test("LogoCloud visual invalidates in-flight media requests after structural logo edits", async () => {
  const { LogoCloudVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/LogoCloudEditors");

  const deferredRequest = createDeferred<typeof defaultLogoCloudMediaItems>();
  logoCloudMediaState.listMediaImpl = () => deferredRequest.promise;

  const { cleanup, container, getLatestValue } = mountLogoCloudHarness({
    initialValue: {
      logos: [
        { id: "logo-1", name: "Acme", href: "#" },
        { id: "logo-2", name: "North Labs", href: "#" },
      ],
    },
    initialVariant: "grid",
    render: (props) => <LogoCloudVisualEditor {...props} />,
  });

  const logosSection = getSectionByTitle(container, "Logos list and links");
  const layoutSection = getSectionByTitle(container, "Variant and layout structure");
  const picker = getMediaPickers(logosSection)[0]!;

  clickButton(getButtonsByText(picker, "pick-logo-media")[0]!);
  setSelectValue(getSelectByOptions(layoutSection, ["1", String(logoCloudLogoMax)]), "1");

  expect(getLatestValue().logos).toHaveLength(1);
  expect(getLatestValue().logos[0]?.image).toBeUndefined();

  deferredRequest.resolve(defaultLogoCloudMediaItems);
  await flushPromises();

  expect(getLatestValue().logos).toHaveLength(1);
  expect(getLatestValue().logos[0]?.image).toBeUndefined();

  cleanup();
});

test("LogoCloud visual covers variant cards, count boundaries, logo CRUD, reordering, and style toggles", async () => {
  const { LogoCloudVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/LogoCloudEditors");

  const initialValue: LogoCloudData = {
    header: {
      title: "Trusted by product teams",
      description: "Reference logos for launch credibility.",
    },
    logos: [{ id: "only", name: "Solo", href: "#" }],
    style: {
      logoHeight: "md",
      grayscale: true,
      hoverColor: true,
      gap: "md",
      alignment: "center",
    },
  };

  const { cleanup, container, getLatestValue, getLatestVariant } = mountLogoCloudHarness({
    initialValue,
    initialVariant: "grid",
    render: (props) => <LogoCloudVisualEditor {...props} />,
  });

  const layoutSection = getSectionByTitle(container, "Variant and layout structure");
  const logosSection = getSectionByTitle(container, "Logos list and links");
  const headerSection = getSectionByTitle(container, "Header copy");
  const styleSection = getSectionByTitle(container, "Display style");

  expect(getButtonsByText(logosSection, "Move up")[0]?.disabled).toBe(true);
  expect(getButtonsByText(logosSection, "Move down")[0]?.disabled).toBe(true);
  expect(getButtonsByText(logosSection, "Remove")[0]?.disabled).toBe(true);

  clickButton(getButtonsByText(layoutSection, "Strip")[0]);
  expect(getLatestVariant()).toBe("strip");

  const countSelect = getSelectByOptions(layoutSection, ["1", String(logoCloudLogoMax)]);
  setSelectValue(countSelect, String(logoCloudLogoMax));
  expect(getLatestValue().logos).toHaveLength(logoCloudLogoMax);
  expect(getButtonsByText(logosSection, "Add logo")[0]?.disabled).toBe(true);

  setSelectValue(countSelect, "2");
  expect(getLatestValue().logos).toHaveLength(2);
  expect(getButtonsByText(logosSection, "Add logo")[0]?.disabled).toBe(false);

  clickButton(getButtonsByText(logosSection, "Add logo")[0]);
  expect(getLatestValue().logos).toHaveLength(3);
  expect(getLatestValue().logos[2]?.name).toBe("Logo 3");
  expect(getLatestValue().logos[2]?.href).toBe("#");

  setInputValue(getInputByPlaceholder(logosSection, "Logo 1"), "Solo updated");
  setInputValue(
    getInputsByPlaceholder(logosSection, "https://cdn.example.com/logo.svg")[0],
    "/media/solo.svg"
  );
  setInputValue(
    getInputsByPlaceholder(logosSection, "Accessible logo name")[0]!,
    "Solo partner logo"
  );
  setInputValue(getInputsByPlaceholder(logosSection, "#")[2], "/partners/logo-3");

  expect(getLatestValue().logos[0]?.name).toBe("Solo updated");
  expect(getLatestValue().logos[0]?.image).toBe("/media/solo.svg");
  expect(getLatestValue().logos[0]?.alt).toBe("Solo partner logo");
  expect(getLatestValue().logos[2]?.href).toBe("/partners/logo-3");
  expect(logosSection.textContent).toContain("Image preview");

  setInputValue(
    getInputsByPlaceholder(logosSection, "https://cdn.example.com/logo.svg")[1]!,
    "javascript:alert(1)"
  );
  expect(logosSection.textContent).toContain(
    "Use a relative path or http/https image URL. Invalid values do not render a logo preview."
  );
  expect(logosSection.textContent).toContain("Preview unavailable");

  setInputValue(getInputsByPlaceholder(logosSection, "#")[0], "javascript:alert(1)");
  expect(logosSection.textContent).toContain(
    "Use a relative path, hash, or full URL. Unsafe links are not rendered publicly."
  );

  const mediaPickers = getMediaPickers(logosSection);
  clickButton(getButtonsByText(mediaPickers[0]!, "pick-invalid-payload")[0]!);
  await flushPromises();
  expect(getLatestValue().logos[0]?.image).toBe("/media/solo.svg");

  clickButton(getButtonsByText(mediaPickers[1]!, "pick-unsupported-media")[0]!);
  await flushPromises();
  expect(logosSection.textContent).toContain("Logo 2: selected media must be an image asset.");

  clickButton(getButtonsByText(mediaPickers[2]!, "pick-secondary-media")[0]!);
  await flushPromises();
  expect(getLatestValue().logos[2]?.image).toBe("/media/north.png");

  clickButton(getButtonsByText(logosSection, "Move down")[0]);
  expect(getLatestValue().logos.map((logo) => logo.name)).toEqual([
    "North Labs",
    "Solo updated",
    "Logo 3",
  ]);

  clickButton(getButtonsByText(logosSection, "Move up")[1]);
  expect(getLatestValue().logos.map((logo) => logo.name)).toEqual([
    "Solo updated",
    "North Labs",
    "Logo 3",
  ]);

  clickButton(getButtonsByText(logosSection, "Remove")[1]);
  expect(getLatestValue().logos.map((logo) => logo.name)).toEqual(["Solo updated", "Logo 3"]);
  expect(logosSection.textContent).toContain("Undo is available.");

  setInputValue(getInputByPlaceholder(headerSection, "Our partners"), "Trusted by hundreds");
  setInputValue(
    getInputByPlaceholder(headerSection, "Trusted by teams worldwide"),
    "Trusted by global partners"
  );
  setTextareaValue(
    getTextareaByPlaceholder(headerSection, "Showcase partner and client logos."),
    "Focused on recognizable deployment logos."
  );

  expect(getLatestValue().header?.eyebrow).toBe("Trusted by hundreds");
  expect(getLatestValue().header?.title).toBe("Trusted by global partners");
  expect(getLatestValue().header?.description).toBe("Focused on recognizable deployment logos.");

  const styleSelects = getSelects(styleSection);
  expect(Array.from(styleSelects[0]!.options).map((option) => option.value)).toContain("none");
  expect(Array.from(styleSelects[1]!.options).map((option) => option.value)).toContain("none");
  setSelectValue(styleSelects[0]!, "xl");
  setSelectValue(styleSelects[1]!, "lg");
  setSelectValue(styleSelects[2]!, "end");
  setSelectValue(styleSelects[3]!, "start");
  setSelectValue(styleSelects[4]!, "lg");
  setInputValue(getInputByPlaceholder(styleSection, "var(--color-surface)"), "#f8fafc");
  expect(getLatestValue().style?.sectionBackground).toBe("#f8fafc");
  clickButton(getButtonsByText(styleSection, "Clear")[0]!);
  expect(getLatestValue().style?.sectionBackground).toBeUndefined();

  const switches = getCheckboxes(styleSection);
  expect(switches).toHaveLength(2);
  setCheckboxValue(switches[0]!, false);
  setCheckboxValue(switches[1]!, false);

  expect(getLatestValue().style).toMatchObject({
    logoHeight: "xl",
    gap: "lg",
    alignment: "end",
    headerAlign: "start",
    headerSize: "lg",
    grayscale: false,
    hoverColor: false,
  });

  cleanup();
});

test("LogoCloud visual supports undo removal and drag reorder safeguards", async () => {
  const { LogoCloudVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/LogoCloudEditors");

  const initialValue: LogoCloudData = {
    logos: [
      { id: "logo-a", name: "Alpha", href: "#" },
      { id: "logo-b", name: "Beta", href: "#" },
      { id: "logo-c", name: "Gamma", href: "#" },
    ],
  };

  const { cleanup, container, getLatestValue } = mountLogoCloudHarness({
    initialValue,
    initialVariant: "grid",
    render: (props) => <LogoCloudVisualEditor {...props} />,
  });

  const logosSection = getSectionByTitle(container, "Logos list and links");
  const getNames = () => getLatestValue().logos.map((logo) => logo.name);

  dispatchDragEvent(getElementsByWidgetControl(logosSection, "logo-cloud-logo-card")[2]!, "drop");
  expect(getNames()).toEqual(["Alpha", "Beta", "Gamma"]);

  dispatchDragEvent(
    getElementsByWidgetControl(logosSection, "logo-cloud-drag-handle")[0]!,
    "dragstart"
  );
  setInputValue(getInputByPlaceholder(logosSection, "Logo 1"), "Alpha updated");
  dispatchDragEvent(getElementsByWidgetControl(logosSection, "logo-cloud-logo-card")[2]!, "drop");
  expect(getNames()).toEqual(["Alpha updated", "Beta", "Gamma"]);

  dispatchDragEvent(
    getElementsByWidgetControl(logosSection, "logo-cloud-drag-handle")[0]!,
    "dragstart"
  );
  dispatchDragEvent(
    getElementsByWidgetControl(logosSection, "logo-cloud-logo-card")[2]!,
    "dragover"
  );
  dispatchDragEvent(getElementsByWidgetControl(logosSection, "logo-cloud-logo-card")[2]!, "drop");
  expect(getNames()).toEqual(["Beta", "Gamma", "Alpha updated"]);

  clickButton(getButtonsByText(logosSection, "Remove")[1]!);
  expect(getNames()).toEqual(["Beta", "Alpha updated"]);
  expect(logosSection.textContent).toContain("Gamma removed. Undo is available.");

  clickButton(getButtonsByText(logosSection, "Undo")[0]!);
  expect(getNames()).toEqual(["Beta", "Gamma", "Alpha updated"]);

  clickButton(getButtonsByText(logosSection, "Remove")[1]!);
  expect(getNames()).toEqual(["Beta", "Alpha updated"]);
  setInputValue(getInputByPlaceholder(logosSection, "Logo 1"), "Beta updated");
  expect(logosSection.textContent ?? "").not.toContain("Undo is available.");

  cleanup();
});

test("LogoCloud visual gates strip layout controls by variant and motion mode", async () => {
  const { LogoCloudVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/LogoCloudEditors");

  const { cleanup, container, getLatestValue, getLatestVariant } = mountLogoCloudHarness({
    initialValue: {
      logos: [
        { id: "logo-1", name: "Acme", href: "#" },
        { id: "logo-2", name: "North Labs", href: "#" },
      ],
    },
    initialVariant: "grid",
    render: (props) => <LogoCloudVisualEditor {...props} />,
  });

  const layoutSection = getSectionByTitle(container, "Variant and layout structure");
  const styleSection = getSectionByTitle(container, "Display style");
  const rowModeSelect = getSelectByOptions(styleSection, ["wrap", "single-row"]);
  const motionModeSelect = getSelectByOptions(styleSection, ["static", "marquee"]);

  expect(rowModeSelect.disabled).toBe(true);
  expect(motionModeSelect.disabled).toBe(true);

  clickButton(getButtonsByText(layoutSection, "Strip")[0]);
  expect(getLatestVariant()).toBe("strip");
  expect(rowModeSelect.disabled).toBe(false);
  expect(motionModeSelect.disabled).toBe(false);

  setSelectValue(rowModeSelect, "single-row");
  expect(getLatestValue().style?.rowMode).toBe("single-row");

  setSelectValue(motionModeSelect, "marquee");
  expect(getLatestValue().style?.motionMode).toBe("marquee");
  expect(rowModeSelect.disabled).toBe(true);

  clickButton(getButtonsByText(layoutSection, "Dense")[0]);
  expect(getLatestVariant()).toBe("dense");
  expect(rowModeSelect.disabled).toBe(true);
  expect(motionModeSelect.disabled).toBe(true);

  cleanup();
});

test("LogoCloud advanced covers normalization defaults, technical tokens, and reset safeguards", async () => {
  const { LogoCloudAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/LogoCloudEditors");

  const initialValue: LogoCloudData = {
    logos: [
      { id: "same", name: "", image: "https://cdn.example.com/a.svg" },
      { id: "same", href: "/north-labs" },
    ],
  };

  const { cleanup, container, getLatestValue, onChangeSpy } = mountLogoCloudHarness({
    initialValue,
    initialVariant: "dense",
    render: (props) => <LogoCloudAdvancedEditor {...props} />,
  });

  const technicalSection = getSectionByTitle(container, "Technical layout diagnostics");
  const safeguardsSection = getSectionByTitle(container, "Normalization and safeguards");
  const snapshot = container.querySelector("pre");

  expect(snapshot?.textContent).toContain('"logoHeight": "md"');
  expect(snapshot?.textContent).toContain('"gap": "md"');
  expect(snapshot?.textContent).toContain('"alignment": "center"');
  expect(snapshot?.textContent).toContain('"id": "same"');
  expect(snapshot?.textContent).toContain('"id": "logo-2"');
  expect(snapshot?.textContent).toContain('"name": "Acme"');
  expect(snapshot?.textContent).toContain('"name": "North Labs"');
  expect(technicalSection.textContent).toContain("Logo height");
  expect(technicalSection.textContent).toContain("md");
  expect(getSelects(technicalSection)).toHaveLength(0);

  clickButton(getButtonsByText(safeguardsSection, "Normalize now")[0]);
  expect(getLatestValue().header?.title).toBe(logoCloudDefaults.header?.title);
  expect(getLatestValue().header?.description).toBe(logoCloudDefaults.header?.description);
  expect(getLatestValue().style).toEqual(logoCloudDefaults.style);
  expect(getLatestValue().logos[1]?.id).toBe("logo-2");
  expect(getLatestValue().logos[0]?.name).toBe("Acme");

  clickButton(getButtonsByText(safeguardsSection, "Reset to defaults")[0]);
  expect(getLatestValue()).toEqual(logoCloudDefaults);
  expect(onChangeSpy).toHaveBeenCalled();

  cleanup();
});

test("LogoCloud editors render sparse header and style fallbacks with safe defaults", async () => {
  const { LogoCloudAdvancedEditor, LogoCloudVisualEditor, LogoCloudWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/LogoCloudEditors");

  const baseValue: LogoCloudData = {
    header: {},
    logos: [{} as never],
    style: {},
  };

  const wizardHarness = mountLogoCloudHarness({
    initialValue: baseValue,
    initialVariant: "grid",
    render: (props) => <LogoCloudWizardEditor {...props} />,
  });

  try {
    expect(getInputByPlaceholder(wizardHarness.container, "Trusted by teams worldwide").value).toBe(
      logoCloudDefaults.header?.title
    );
    expect(getLogoNameInputs(wizardHarness.container)[0]?.value).toBe("Acme");
  } finally {
    wizardHarness.cleanup();
  }

  const visualHarness = mountLogoCloudHarness({
    initialValue: baseValue,
    initialVariant: "grid",
    render: (props) => <LogoCloudVisualEditor {...props} />,
  });

  try {
    expect(getInputByPlaceholder(visualHarness.container, "Trusted by teams worldwide").value).toBe(
      logoCloudDefaults.header?.title
    );
    expect(getInputByPlaceholder(visualHarness.container, "Our partners").value).toBe(
      logoCloudDefaults.header?.eyebrow ?? ""
    );
    expect(
      getTextareaByPlaceholder(visualHarness.container, "Showcase partner and client logos.").value
    ).toBe(logoCloudDefaults.header?.description);
    expect(getInputByPlaceholder(visualHarness.container, "Logo 1").value).toBe("Acme");
    expect(
      getInputByPlaceholder(visualHarness.container, "https://cdn.example.com/logo.svg").value
    ).toBe("");
    expect(getInputByPlaceholder(visualHarness.container, "Accessible logo name").value).toBe("");
    expect(getInputByPlaceholder(visualHarness.container, "#").value).toBe("");
    expect(getMediaPickers(visualHarness.container)).toHaveLength(1);

    const styleSection = getSectionByTitle(visualHarness.container, "Display style");
    const selects = getSelects(styleSection);
    expect(selects[0]?.value).toBe("md");
    expect(selects[1]?.value).toBe("md");
    expect(selects[2]?.value).toBe("center");
    expect(selects[3]?.value).toBe("center");
    expect(selects[4]?.value).toBe("md");
    expect(getInputByPlaceholder(visualHarness.container, "var(--color-surface)").value).toBe("");

    const switches = getCheckboxes(styleSection);
    expect(switches[0]?.checked).toBe(true);
    expect(switches[1]?.checked).toBe(true);
  } finally {
    visualHarness.cleanup();
  }

  const advancedHarness = mountLogoCloudHarness({
    initialValue: baseValue,
    initialVariant: "grid",
    render: (props) => <LogoCloudAdvancedEditor {...props} />,
  });

  try {
    const technicalSection = getSectionByTitle(
      advancedHarness.container,
      "Technical layout diagnostics"
    );
    expect(technicalSection.textContent).toContain("Logo height");
    expect(technicalSection.textContent).toContain("md");
    expect(technicalSection.textContent).toContain("center");
    expect(getSelects(technicalSection)).toHaveLength(0);
  } finally {
    advancedHarness.cleanup();
  }
});

test("LogoCloud editors ignore variant changes safely when no handler is provided", async () => {
  const { LogoCloudVisualEditor, LogoCloudWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/LogoCloudEditors");

  const sharedValue: LogoCloudData = {
    logos: [
      { id: "logo-1", name: "North Labs", href: "#" },
      { id: "logo-2", name: "Orbit", href: "#" },
    ],
  };

  const wizardView = mount(
    <LogoCloudWizardEditor value={sharedValue} onChange={() => undefined} variant="grid" />
  );

  try {
    const variantSelect = getSelectByOptions(wizardView.container, ["grid", "strip", "dense"]);
    expect(variantSelect.value).toBe("grid");
    setSelectValue(variantSelect, "strip");
    expect(variantSelect.value).toBe("grid");
  } finally {
    wizardView.cleanup();
  }

  const visualView = mount(
    <LogoCloudVisualEditor value={sharedValue} onChange={() => undefined} variant="grid" />
  );

  try {
    const stripButton = getButtonsByText(visualView.container, "Strip")[0];
    clickButton(stripButton);

    const gridButton = getButtonsByText(visualView.container, "Grid")[0];
    expect(normalizeText(gridButton.textContent)).toContain("selected");
    expect(normalizeText(stripButton.textContent)).toContain("pick");
  } finally {
    visualView.cleanup();
  }
});

test("LogoCloud editors fall back when normalized header and style are omitted", async () => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/logoCloud", async () => {
    const actual = await vi.importActual<typeof import("../../../core/widgets/core/logoCloud")>(
      "../../../core/widgets/core/logoCloud"
    );

    return {
      ...actual,
      normalizeLogoCloudData: (value: LogoCloudData) => ({
        ...actual.normalizeLogoCloudData(value),
        header: undefined,
        style: undefined,
      }),
      normalizeLogoCloudLogos: () =>
        [
          {
            id: "mock-logo-1",
            name: undefined,
            image: undefined,
            href: undefined,
          },
          {
            id: "mock-logo-2",
            name: undefined,
            image: undefined,
            href: undefined,
          },
        ] as LogoCloudData["logos"],
    };
  });

  const { LogoCloudAdvancedEditor, LogoCloudVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/LogoCloudEditors");

  const sparseValue: LogoCloudData = {
    logos: [{} as never],
  };

  const visualView = mount(
    <LogoCloudVisualEditor value={sparseValue} onChange={() => undefined} variant="legacy-cloud" />
  );

  try {
    expect(
      (
        getInputByPlaceholder(
          visualView.container,
          "Trusted by teams worldwide"
        ) as HTMLInputElement
      ).value
    ).toBe(logoCloudDefaults.header?.title);
    expect(
      (
        getTextareaByPlaceholder(
          visualView.container,
          "Showcase partner and client logos."
        ) as HTMLTextAreaElement
      ).value
    ).toBe(logoCloudDefaults.header?.description);

    const styleSection = getSectionByTitle(visualView.container, "Display style");
    const selects = getSelects(styleSection);
    expect(selects[0]?.value).toBe("md");
    expect(selects[1]?.value).toBe("md");
    expect(selects[2]?.value).toBe("center");
    const switches = getCheckboxes(styleSection);
    expect(switches[0]?.checked).toBe(true);
    expect(switches[1]?.checked).toBe(true);
  } finally {
    visualView.cleanup();
  }

  const advancedView = mount(
    <LogoCloudAdvancedEditor
      value={sparseValue}
      onChange={() => undefined}
      variant="legacy-cloud"
    />
  );

  try {
    const technicalSection = getSectionByTitle(
      advancedView.container,
      "Technical layout diagnostics"
    );
    expect(technicalSection.textContent).toContain("Logo height");
    expect(technicalSection.textContent).toContain("md");
    expect(technicalSection.textContent).toContain("center");
    expect(getSelects(technicalSection)).toHaveLength(0);
  } finally {
    advancedView.cleanup();
    vi.doUnmock("../../../core/widgets/core/logoCloud");
    vi.resetModules();
  }
});
