// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { NormalizedCommerceWidgetSource } from "../../../core/widgets/core/commerceWidgetShared";
import {
  CommerceEditorSection,
  CommerceNumberField,
  CommerceSourceFields,
  CommerceTextField,
  CommerceTextareaField,
  CommerceToggleField,
  fromCollectionCsv,
  normalizeSourceForEditor,
  toCollectionCsv,
} from "../../../core/admin/ui/widgets/editors/CommerceWidgetEditorShared";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    type,
    min,
    max,
    placeholder,
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    min?: number;
    max?: number;
    placeholder?: string;
  }) => (
    <input
      value={value}
      onChange={onChange}
      type={type}
      min={min}
      max={max}
      placeholder={placeholder}
    />
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    rows,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    rows?: number;
  }) => <textarea value={value} onChange={onChange} rows={rows} />,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children?: React.ReactNode;
  }) => (
    <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock("@/services/commerceClient", () => ({
  listCommerceCollectionsCached: vi.fn(async () => []),
  listCommerceProductsCached: vi.fn(async () => []),
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
  if (!(element instanceof HTMLInputElement)) {
    throw new Error("Expected HTMLInputElement");
  }

  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error("Expected HTMLTextAreaElement");
  }

  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error("Expected HTMLSelectElement");
  }

  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const toggleCheckbox = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLInputElement)) {
    throw new Error("Expected HTMLInputElement");
  }

  React.act(() => {
    element.click();
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const findLabel = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("label")).find((label) =>
    label.textContent?.toLowerCase().includes(text.toLowerCase())
  );

const findCheckboxByLabel = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll('label input[type="checkbox"]')).find((element) => {
    const label = element.closest("label");
    return label?.textContent?.toLowerCase().includes(text.toLowerCase());
  });

const findInputByLabel = (container: ParentNode, text: string) =>
  findLabel(container, text)?.querySelector("input");

const findTextareaByLabel = (container: ParentNode, text: string) =>
  findLabel(container, text)?.querySelector("textarea");

const findSelectByLabel = (container: ParentNode, text: string) =>
  findLabel(container, text)?.querySelector("select");

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("utility helpers normalize csv and source defaults", () => {
  expect(toCollectionCsv(["summer", "sale"])).toBe("summer, sale");
  expect(fromCollectionCsv(" summer , sale, summer ,, clearance ")).toEqual([
    "summer",
    "sale",
    "clearance",
  ]);

  expect(
    normalizeSourceForEditor(
      {
        limit: 99,
        search: "  camera  ",
        collectionIds: [" featured ", "", "featured", "sale"],
        status: ["draft", "invalid", "published"],
        sortField: "invalid",
        sortDir: "invalid",
      } as unknown as NormalizedCommerceWidgetSource,
      {
        limit: 6,
        sortField: "title",
        sortDir: "asc",
      }
    )
  ).toEqual({
    limit: 48,
    search: "camera",
    collectionIds: ["featured", "sale"],
    status: ["draft", "published"],
    sortField: "title",
    sortDir: "asc",
  });

  expect(
    normalizeSourceForEditor(
      {
        limit: 99,
        search: "  camera  ",
      } as unknown as NormalizedCommerceWidgetSource,
      {
        limit: 6,
        sortField: "title",
        sortDir: "asc",
      },
      {
        limitMax: 12,
      }
    )
  ).toEqual({
    limit: 12,
    search: "camera",
    collectionIds: [],
    status: [],
    sortField: "title",
    sortDir: "asc",
  });
});

test("primitive editor fields render content and emit normalized changes", () => {
  const textChange = vi.fn();
  const numberChange = vi.fn();
  const textareaChange = vi.fn();
  const toggleChange = vi.fn();

  const { container, cleanup } = mount(
    <div>
      <CommerceEditorSection title="Section title" description="Section description">
        <span>Section child</span>
      </CommerceEditorSection>
      <CommerceTextField label="Headline" value="Old title" onChange={textChange} />
      <CommerceNumberField label="Limit" value={4} min={1} max={8} onChange={numberChange} />
      <CommerceTextareaField
        label="Description"
        value="Old description"
        rows={5}
        onChange={textareaChange}
      />
      <CommerceToggleField
        label="Show excerpt"
        description="Additional details"
        checked={false}
        onChange={toggleChange}
      />
    </div>
  );

  expect(container.textContent).toContain("Section title");
  expect(container.textContent).toContain("Section description");
  expect(container.textContent).toContain("Section child");

  setInputValue(findInputByLabel(container, "Headline"), "Fresh headline");
  setInputValue(findInputByLabel(container, "Limit"), "999");
  setInputValue(findInputByLabel(container, "Limit"), "Infinity");
  setInputValue(findInputByLabel(container, "Limit"), "1e309");
  setTextareaValue(findTextareaByLabel(container, "Description"), "Long form copy");
  toggleCheckbox(findCheckboxByLabel(container, "Show excerpt"));

  expect(textChange).toHaveBeenCalledWith("Fresh headline");
  expect(numberChange).toHaveBeenNthCalledWith(1, 8);
  expect(numberChange).toHaveBeenNthCalledWith(2, 4);
  expect(numberChange).toHaveBeenNthCalledWith(3, 4);
  expect(textareaChange).toHaveBeenCalledWith("Long form copy");
  expect(toggleChange).toHaveBeenCalledWith(true);

  cleanup();
});

test("source fields update limit, filters, sorting, and status toggles", () => {
  const history: NormalizedCommerceWidgetSource[] = [];

  const Harness = () => {
    const [value, setValue] = useState<NormalizedCommerceWidgetSource>({
      limit: 8,
      search: "",
      collectionIds: ["featured"],
      status: ["draft"],
      sortField: "title",
      sortDir: "asc",
    });

    return (
      <CommerceSourceFields
        source={value}
        onChange={(next) => {
          history.push(next);
          setValue(next);
        }}
        options={{ allowCollectionFallbackInput: true }}
      />
    );
  };

  const { container, cleanup } = mount(<Harness />);

  setInputValue(findInputByLabel(container, "Limit"), "0");
  setInputValue(findInputByLabel(container, "Search"), "camera");
  setInputValue(
    findInputByLabel(container, "Collection IDs fallback"),
    "featured, sale, featured, clearance"
  );
  setSelectValue(findSelectByLabel(container, "Sort field"), "publishedAt");
  setSelectValue(findSelectByLabel(container, "Sort direction"), "desc");
  toggleCheckbox(findCheckboxByLabel(container, "published"));
  toggleCheckbox(findCheckboxByLabel(container, "draft"));

  expect(history).toContainEqual(
    expect.objectContaining({
      limit: 1,
    })
  );
  expect(history).toContainEqual(
    expect.objectContaining({
      search: "camera",
    })
  );
  expect(history).toContainEqual(
    expect.objectContaining({
      collectionIds: ["featured", "sale", "clearance"],
    })
  );
  expect(history).toContainEqual(
    expect.objectContaining({
      sortField: "publishedAt",
    })
  );
  expect(history).toContainEqual(
    expect.objectContaining({
      sortDir: "desc",
    })
  );
  expect(history).toContainEqual(
    expect.objectContaining({
      status: ["draft", "published"],
    })
  );
  expect(history.at(-1)).toEqual(
    expect.objectContaining({
      status: ["published"],
      sortField: "publishedAt",
      sortDir: "desc",
      collectionIds: ["featured", "sale", "clearance"],
    })
  );

  cleanup();
});

test("source fields honor widget-specific limit and copy options without changing defaults", () => {
  const history: NormalizedCommerceWidgetSource[] = [];

  const Harness = () => {
    const [value, setValue] = useState<NormalizedCommerceWidgetSource>({
      limit: 3,
      search: "",
      collectionIds: [],
      status: [],
      sortField: "title",
      sortDir: "asc",
    });

    return (
      <CommerceSourceFields
        source={value}
        onChange={(next) => {
          history.push(next);
          setValue(next);
        }}
        options={{
          limitMax: 12,
          allowCollectionFallbackInput: true,
          copy: {
            searchPlaceholder: "product title or slug",
            searchHelpText: "Search narrows Product Compare candidates.",
            collectionFallbackLabel: "Collection IDs (fallback)",
            collectionHelpText: "Use saved collection IDs when the picker is empty.",
            statusHelpText: "Use Published for public-ready comparisons.",
          },
        }}
      />
    );
  };

  const { container, cleanup } = mount(<Harness />);

  expect((findInputByLabel(container, "Limit") as HTMLInputElement | undefined)?.max).toBe("12");
  expect((findInputByLabel(container, "Search") as HTMLInputElement | undefined)?.placeholder).toBe(
    "product title or slug"
  );
  expect(container.textContent).toContain("Search narrows Product Compare candidates.");
  expect(container.textContent).toContain("Collection IDs (fallback)");
  expect(container.textContent).toContain("Use saved collection IDs when the picker is empty.");
  expect(container.textContent).toContain("Use Published for public-ready comparisons.");

  setInputValue(findInputByLabel(container, "Limit"), "99");

  expect(history.at(-1)).toEqual(
    expect.objectContaining({
      limit: 12,
    })
  );

  cleanup();
});
