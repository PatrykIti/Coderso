// @vitest-environment happy-dom

import React, { act, useState } from "react";
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
  cn: (...values: Array<string | boolean | null | undefined>) =>
    values.filter(Boolean).join(" "),
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

const setInputValue = (element: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setTextareaValue = (element: HTMLTextAreaElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: HTMLSelectElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setCheckboxValue = (element: HTMLInputElement, checked: boolean) => {
  if (element.checked === checked) return;
  act(() => {
    element.click();
  });
};

const clickButton = (element: HTMLButtonElement) => {
  act(() => {
    element.click();
  });
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
      element instanceof HTMLTextAreaElement &&
      element.getAttribute("placeholder") === placeholder
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

const getCheckboxes = (container: ParentNode) =>
  Array.from(container.querySelectorAll('input[type="checkbox"]')).filter(
    (element): element is HTMLInputElement => element instanceof HTMLInputElement
  );

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
  vi.restoreAllMocks();
});

test("LogoCloud wizard covers variant fallback, logo count changes, and starter name updates", async () => {
  const { LogoCloudWizardEditor } = await import(
    "../../../core/admin/ui/widgets/editors/LogoCloudEditors"
  );

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
  expect(getLogoNameInputs(container)).toHaveLength(3);

  setSelectValue(variantSelect, "strip");
  expect(getLatestVariant()).toBe("strip");
  expect(onVariantChangeSpy).toHaveBeenLastCalledWith("strip");

  setInputValue(
    getInputByPlaceholder(container, "Trusted by teams worldwide"),
    "Trusted by enterprise teams"
  );

  expect(getLatestValue().header?.title).toBe("Trusted by enterprise teams");
  expect(getLatestValue().header?.description).toBe(
    logoCloudDefaults.header?.description
  );

  const countSelect = getSelectByOptions(container, ["1", String(logoCloudLogoMax)]);
  setSelectValue(countSelect, "2");

  expect(getLatestValue().logos).toHaveLength(2);
  expect(getLatestValue().logos[0]?.id).toBe("same");
  expect(getLatestValue().logos[1]?.id).toBe("logo-2");
  expect(getLogoNameInputs(container)).toHaveLength(2);

  setInputValue(getInputByPlaceholder(container, "Logo 2"), "North Ridge");

  expect(getLatestValue().logos[1]?.name).toBe("North Ridge");
  expect(onChangeSpy).toHaveBeenCalled();

  cleanup();
});

test("LogoCloud visual covers variant cards, count boundaries, logo CRUD, reordering, and style toggles", async () => {
  const { LogoCloudVisualEditor } = await import(
    "../../../core/admin/ui/widgets/editors/LogoCloudEditors"
  );

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
    "https://cdn.example.com/solo.svg"
  );
  setInputValue(getInputsByPlaceholder(logosSection, "#")[2], "/partners/logo-3");

  expect(getLatestValue().logos[0]?.name).toBe("Solo updated");
  expect(getLatestValue().logos[0]?.image).toBe("https://cdn.example.com/solo.svg");
  expect(getLatestValue().logos[2]?.href).toBe("/partners/logo-3");

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

  setInputValue(
    getInputByPlaceholder(headerSection, "Trusted by teams worldwide"),
    "Trusted by global partners"
  );
  setTextareaValue(
    getTextareaByPlaceholder(headerSection, "Showcase partner and client logos."),
    "Focused on recognizable deployment logos."
  );

  expect(getLatestValue().header?.title).toBe("Trusted by global partners");
  expect(getLatestValue().header?.description).toBe(
    "Focused on recognizable deployment logos."
  );

  const styleSelects = getSelects(styleSection);
  setSelectValue(styleSelects[0]!, "xl");
  setSelectValue(styleSelects[1]!, "lg");
  setSelectValue(styleSelects[2]!, "end");

  const switches = getCheckboxes(styleSection);
  expect(switches).toHaveLength(2);
  setCheckboxValue(switches[0]!, false);
  setCheckboxValue(switches[1]!, false);

  expect(getLatestValue().style).toMatchObject({
    logoHeight: "xl",
    gap: "lg",
    alignment: "end",
    grayscale: false,
    hoverColor: false,
  });

  cleanup();
});

test("LogoCloud advanced covers normalization defaults, technical tokens, and reset safeguards", async () => {
  const { LogoCloudAdvancedEditor } = await import(
    "../../../core/admin/ui/widgets/editors/LogoCloudEditors"
  );

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

  const technicalSection = getSectionByTitle(container, "Technical layout tokens");
  const safeguardsSection = getSectionByTitle(container, "Normalization and safeguards");
  const snapshot = container.querySelector("pre");

  expect(snapshot?.textContent).toContain('"logoHeight": "md"');
  expect(snapshot?.textContent).toContain('"gap": "md"');
  expect(snapshot?.textContent).toContain('"alignment": "center"');
  expect(snapshot?.textContent).toContain('"id": "same"');
  expect(snapshot?.textContent).toContain('"id": "logo-2"');
  expect(snapshot?.textContent).toContain('"name": "Acme"');
  expect(snapshot?.textContent).toContain('"name": "North Labs"');

  clickButton(getButtonsByText(safeguardsSection, "Normalize now")[0]);
  expect(getLatestValue().header?.title).toBe(logoCloudDefaults.header?.title);
  expect(getLatestValue().header?.description).toBe(
    logoCloudDefaults.header?.description
  );
  expect(getLatestValue().style).toEqual(logoCloudDefaults.style);
  expect(getLatestValue().logos[1]?.id).toBe("logo-2");
  expect(getLatestValue().logos[0]?.name).toBe("Acme");

  const technicalSelects = getSelects(technicalSection);
  setSelectValue(technicalSelects[0]!, "xl");
  setSelectValue(technicalSelects[1]!, "lg");
  setSelectValue(technicalSelects[2]!, "end");

  expect(getLatestValue().style).toMatchObject({
    logoHeight: "xl",
    gap: "lg",
    alignment: "end",
  });

  clickButton(getButtonsByText(safeguardsSection, "Reset to defaults")[0]);
  expect(getLatestValue()).toEqual(logoCloudDefaults);
  expect(onChangeSpy).toHaveBeenCalled();

  cleanup();
});
