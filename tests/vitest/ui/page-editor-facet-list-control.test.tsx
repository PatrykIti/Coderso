// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { FacetListControl } from "../../../core/admin/ui/pages/editorControls/FacetListControl";
import type { ListingFacetConfig } from "../../../core/services/search/filterContract";

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
    rerender: (next: React.ReactNode) => {
      React.act(() => {
        root.render(next);
      });
    },
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const click = (element: Element | null) => {
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

/** Controlled-input change through the native value setter (React onChange). */
const setFieldValue = (
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string
) => {
  React.act(() => {
    const prototype =
      element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    valueSetter?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const blur = (element: Element | null) => {
  expect(element).toBeTruthy();
  React.act(() => {
    // React's synthetic onBlur listens to the bubbling focusout event.
    element?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
};

const byAriaLabel = (container: ParentNode, label: string) =>
  container.querySelector(`[aria-label="${label}"]`) as
    | (HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement)
    | null;

const storedFacets: ListingFacetConfig[] = [
  {
    id: "rooms",
    kind: "checkbox",
    label: "Rooms",
    field: "data.rooms",
    op: "in",
    options: [{ value: "3", label: "Three" }],
  },
  {
    id: "sort",
    kind: "sort",
    label: "Sort",
    sortOptions: [{ value: "data.price:asc", label: "Cheapest", field: "data.price", dir: "asc" }],
  },
];

afterEach(() => {
  document.body.innerHTML = "";
});

test("facet builder renders stored facets generically and edits field/label/op in place", () => {
  const onChange = vi.fn();
  const view = mount(<FacetListControl label="Facets" value={storedFacets} onChange={onChange} />);
  try {
    expect(view.container.querySelector('[data-page-editor-control="facet-list"]')).toBeTruthy();
    const rows = view.container.querySelectorAll("[data-page-editor-facet-row]");
    expect(rows).toHaveLength(2);

    // Row 1: option-backed checkbox facet exposes kind/label/field/op and the
    // option lines; the sort facet exposes the sort-option lines instead.
    expect(byAriaLabel(view.container, "Facet 1 kind")?.value).toBe("checkbox");
    expect(byAriaLabel(view.container, "Facet 1 label")?.value).toBe("Rooms");
    expect(byAriaLabel(view.container, "Facet 1 field")?.value).toBe("data.rooms");
    expect(byAriaLabel(view.container, "Facet 1 operator")?.value).toBe("in");
    expect(byAriaLabel(view.container, "Facet 1 options")?.value).toBe("3 | Three");
    expect(byAriaLabel(view.container, "Facet 2 kind")?.value).toBe("sort");
    expect(byAriaLabel(view.container, "Facet 2 field")).toBeNull();
    expect(byAriaLabel(view.container, "Facet 2 sort options")?.value).toBe(
      "data.price:asc | Cheapest"
    );

    // Editing the field commits the full next facets array (owner shapes).
    setFieldValue(byAriaLabel(view.container, "Facet 1 field")!, "data.area");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]?.[0]).toMatchObject({
      id: "rooms",
      kind: "checkbox",
      field: "data.area",
    });

    // Operator select commits through the same path.
    setFieldValue(byAriaLabel(view.container, "Facet 1 operator")!, "nin");
    expect(onChange.mock.calls[1]?.[0]?.[0]).toMatchObject({ op: "nin" });
  } finally {
    view.cleanup();
  }
});

test("facet builder option lines commit on blur with the value | label grammar", () => {
  const onChange = vi.fn();
  const view = mount(<FacetListControl label="Facets" value={storedFacets} onChange={onChange} />);
  try {
    const optionsField = byAriaLabel(view.container, "Facet 1 options")!;
    setFieldValue(optionsField, "3 | Three\n4\n | broken-line");
    // Typing alone never commits (no mid-line caret fighting)...
    expect(onChange).not.toHaveBeenCalled();
    // ...the blur commit parses the grammar and drops valueless lines.
    blur(optionsField);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]?.[0]?.options).toEqual([
      { value: "3", label: "Three" },
      { value: "4", label: "4" },
    ]);

    const sortField = byAriaLabel(view.container, "Facet 2 sort options")!;
    setFieldValue(sortField, "data.price:desc | Most expensive\nnot-a-sort-line");
    blur(sortField);
    expect(onChange.mock.calls[1]?.[0]?.[1]?.sortOptions).toEqual([
      { value: "data.price:desc", label: "Most expensive", field: "data.price", dir: "desc" },
    ]);
  } finally {
    view.cleanup();
  }
});

test("facet builder adds, retypes, and removes facets with kind-scoped defaults", () => {
  const onChange = vi.fn();
  const view = mount(<FacetListControl label="Facets" value={storedFacets} onChange={onChange} />);
  try {
    // Add appends a generic checkbox facet skeleton.
    click(
      Array.from(view.container.querySelectorAll("button")).find(
        (button) => button.textContent?.trim() === "Add facet"
      ) ?? null
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    const added = onChange.mock.calls[0]?.[0];
    expect(added).toHaveLength(3);
    expect(added?.[2]).toMatchObject({ kind: "checkbox", op: "in", field: "" });

    // Switching kind resets the operator to the new kind's owner default.
    setFieldValue(byAriaLabel(view.container, "Facet 1 kind")!, "range");
    expect(onChange.mock.calls[1]?.[0]?.[0]).toMatchObject({ kind: "range", op: "between" });

    // Remove drops exactly the addressed row.
    click(byAriaLabel(view.container, "Remove facet 2"));
    const afterRemove = onChange.mock.calls[2]?.[0];
    expect(afterRemove).toHaveLength(1);
    expect(afterRemove?.[0]).toMatchObject({ id: "rooms" });
  } finally {
    view.cleanup();
  }
});
