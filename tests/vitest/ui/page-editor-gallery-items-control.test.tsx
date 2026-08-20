// @vitest-environment happy-dom

import React, { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  GalleryItemsControl,
} from "../../../core/admin/ui/pages/editorControls/GalleryItemsControl";
import type { PageGalleryItemV2 } from "../../../core/services/pages/pageGalleryV2";

type MockMediaRecord = { id: string; url: string; type: string; mimeType: string };

/**
 * Faithful test mirror of `MediaUrlControl`'s observable contract, so the
 * gallery-level wiring tests exercise the same async/generation/scope/
 * unmount semantics as the real component (which is unit-tested separately in
 * page-editor-media-url-control.test.tsx). Live props per scope are recorded
 * for direct row-callback invocation ("a caller invokes its callback without
 * the picker").
 */
const mediaUrlState = vi.hoisted(() => {
  const requests: Array<{
    resolve: (items: MockMediaRecord[]) => void;
    reject: (error: unknown) => void;
  }> = [];
  const byScope = new Map<
    string,
    { value: string; maxLength?: number; onChange: (value: string | null) => void }
  >();
  return {
    items: [] as MockMediaRecord[],
    requests,
    byScope,
    listMediaCached: vi.fn(
      () =>
        new Promise<MockMediaRecord[]>((resolve, reject) => {
          requests.push({ resolve, reject });
        })
    ),
    reset() {
      requests.length = 0;
      byScope.clear();
      mediaUrlState.listMediaCached.mockClear();
    },
  };
});

vi.mock("../../../core/admin/ui/pages/editorControls/MediaUrlControl", async () => {
  const { useEffect, useRef } = await import("react");
  return {
    MediaUrlControl: (props: {
      label: string;
      value: string;
      scopeKey: string;
      maxLength?: number;
      onChange: (value: string | null) => void;
    }) => {
      const mountedRef = useRef(true);
      const generationRef = useRef(0);
      mediaUrlState.byScope.set(props.scopeKey, {
        value: props.value,
        maxLength: props.maxLength,
        onChange: props.onChange,
      });
      useEffect(() => {
        mountedRef.current = true;
        return () => {
          mountedRef.current = false;
          generationRef.current += 1;
        };
      }, []);
      const pick = (id: string) => {
        generationRef.current += 1;
        const generation = generationRef.current;
        const scope = props.scopeKey;
        void mediaUrlState.listMediaCached().then((items) => {
          if (!mountedRef.current) return;
          if (generation !== generationRef.current) return;
          const live = mediaUrlState.byScope.get(scope);
          if (!live) return;
          const match = items.find((item) => item.id === id);
          if (!match) return;
          if (typeof live.maxLength === "number" && match.url.length > live.maxLength) return;
          live.onChange(match.url);
        });
      };
      return (
        <div data-media-url-control={props.scopeKey} data-media-url-value={props.value}>
          {mediaUrlState.items.map((item) => (
            <button
              key={item.id}
              type="button"
              data-media-url-option={item.id}
              onClick={() => pick(item.id)}
            >
              {item.id}
            </button>
          ))}
          <button
            type="button"
            data-media-url-clear="true"
            onClick={() => {
              generationRef.current += 1;
              props.onChange(null);
            }}
          >
            Clear media
          </button>
        </div>
      );
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const GalleryHarness = ({
  initialValue,
  categoryTokens = [],
  parentScopeKey = "parent-1",
  onChange = vi.fn(),
}: {
  initialValue: PageGalleryItemV2[];
  categoryTokens?: readonly string[];
  parentScopeKey?: string;
  onChange?: (value: PageGalleryItemV2[]) => void;
}) => {
  const [value, setValue] = useState(initialValue);
  const handleChange = useCallback(
    (next: PageGalleryItemV2[]) => {
      onChange(next);
      setValue(next);
    },
    [onChange]
  );
  return (
    <GalleryItemsControl
      label="Gallery"
      value={value}
      categoryTokens={categoryTokens}
      parentScopeKey={parentScopeKey}
      onChange={handleChange}
    />
  );
};

const mountHarness = (props: {
  initialValue: PageGalleryItemV2[];
  categoryTokens?: readonly string[];
  parentScopeKey?: string;
  onChange?: (value: PageGalleryItemV2[]) => void;
}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<GalleryHarness {...props} />);
  });
  return {
    container,
    rerender: (next: {
      initialValue: PageGalleryItemV2[];
      categoryTokens?: readonly string[];
      parentScopeKey?: string;
      onChange?: (value: PageGalleryItemV2[]) => void;
    }) => {
      React.act(() => {
        root.render(<GalleryHarness {...next} />);
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

const setInputValue = (field: HTMLInputElement, value: string) => {
  React.act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const inputByLabel = (container: ParentNode, ariaLabel: string) => {
  const field = container.querySelector(`input[aria-label="${ariaLabel}"]`);
  expect(field).toBeTruthy();
  return field as HTMLInputElement;
};

const rowScopes = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-media-url-control]")).map((element) =>
    element.getAttribute("data-media-url-control")
  );

const resolveMedia = async (index: number, items: MockMediaRecord[]) => {
  await React.act(async () => {
    mediaUrlState.requests[index]?.resolve(items);
    await Promise.resolve();
    await Promise.resolve();
  });
};

const lastCommitted = (onChange: ReturnType<typeof vi.fn>): PageGalleryItemV2[] =>
  onChange.mock.calls.at(-1)?.[0] as PageGalleryItemV2[];

const item = (overrides: Partial<PageGalleryItemV2> = {}): PageGalleryItemV2 => ({
  src: "/media/item.jpg",
  alt: "Item",
  caption: "Caption",
  ...overrides,
});

beforeEach(() => {
  mediaUrlState.items = [];
  mediaUrlState.reset();
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("renders stored rows with one-based accessible names and data attributes; mount emits nothing", () => {
  const onChange = vi.fn();
  const view = mountHarness({ initialValue: [item(), item({ src: "/media/two.jpg" })], onChange });
  try {
    const rows = view.container.querySelectorAll("[data-page-editor-gallery-item]");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.getAttribute("data-page-editor-gallery-item")).toBe("1");
    expect(rows[1]?.getAttribute("data-page-editor-gallery-item")).toBe("2");
    expect(rowScopes(view.container)).toHaveLength(2);
    expect(inputByLabel(view.container, "Gallery item 1 alt").value).toBe("Item");
    expect(inputByLabel(view.container, "Gallery item 2 caption").value).toBe("Caption");
    expect(view.container.querySelector("[draggable]")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("add appends exactly the canonical draft row and keeps it until removed", () => {
  const onChange = vi.fn();
  const view = mountHarness({ initialValue: [item()], onChange });
  try {
    click(Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Add item")
    ));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(lastCommitted(onChange)).toEqual([item(), { src: "", alt: "", caption: "" }]);
    expect(view.container.querySelectorAll("[data-page-editor-gallery-item]")).toHaveLength(2);
    expect(inputByLabel(view.container, "Gallery item 2 alt").value).toBe("");
    // The draft row persists in controlled output until the user removes it.
    click(Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Add item")
    ));
    expect(lastCommitted(onChange)).toEqual([
      item(),
      { src: "", alt: "", caption: "" },
      { src: "", alt: "", caption: "" },
    ]);
  } finally {
    view.cleanup();
  }
});

test("add is disabled at 120 rows and never emits row 121", () => {
  const onChange = vi.fn();
  const rows = Array.from({ length: 120 }, () => item());
  const view = mountHarness({ initialValue: rows, onChange });
  try {
    const addButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Add item")
    );
    expect(addButton?.hasAttribute("disabled")).toBe(true);
    click(addButton);
    expect(onChange).not.toHaveBeenCalled();
    expect(view.container.querySelectorAll("[data-page-editor-gallery-item]")).toHaveLength(120);
  } finally {
    view.cleanup();
  }
});

test("remove deletes only the chosen row and surviving row identities are untouched", () => {
  const onChange = vi.fn();
  const view = mountHarness({
    initialValue: [item({ src: "/media/one.jpg" }), item({ src: "/media/two.jpg" })],
    onChange,
  });
  try {
    const scopesBefore = rowScopes(view.container);
    expect(scopesBefore).toHaveLength(2);
    expect(JSON.parse(scopesBefore[0] ?? "null")[0]).toBe("parent-1");
    expect(typeof JSON.parse(scopesBefore[1] ?? "null")[1]).toBe("number");
    expect(scopesBefore[0]).not.toBe(scopesBefore[1]);

    click(view.container.querySelector('button[aria-label="Remove gallery item 1"]'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(lastCommitted(onChange)).toEqual([item({ src: "/media/two.jpg" })]);
    const scopesAfter = rowScopes(view.container);
    expect(scopesAfter).toEqual([scopesBefore[1]]);
    expect(view.container.querySelectorAll("[data-page-editor-gallery-item]")).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});

test("remove first of two rows while second has an unresolved selection still targets the surviving row", async () => {
  mediaUrlState.items = [asset("asset-2", "/media/resolved.jpg")];
  const onChange = vi.fn();
  const view = mountHarness({
    initialValue: [item({ src: "/media/one.jpg" }), item({ src: "/media/two.jpg" })],
    onChange,
  });
  try {
    const secondScope = rowScopes(view.container)[1];
    const secondPicker = view.container.querySelectorAll("[data-media-url-control]")[1];
    click(secondPicker?.querySelector('[data-media-url-option="asset-2"]'));
    click(view.container.querySelector('button[aria-label="Remove gallery item 1"]'));
    expect(view.container.querySelectorAll("[data-page-editor-gallery-item]")).toHaveLength(1);
    await resolveMedia(0, mediaUrlState.items);
    const committed = lastCommitted(onChange);
    expect(committed).toHaveLength(1);
    expect(committed[0]).toEqual(item({ src: "/media/resolved.jpg" }));
    // The surviving row kept its media scope (identity preserved on removal).
    expect(rowScopes(view.container)).toEqual([secondScope]);
  } finally {
    view.cleanup();
  }
});

test("parentScopeKey replacement remounts row controls and invalidates pending requests", async () => {
  mediaUrlState.items = [asset("asset-1", "/media/same.jpg")];
  const onChange = vi.fn();
  const view = mountHarness({
    initialValue: [item({ src: "/media/same.jpg" })],
    onChange,
  });
  try {
    const oldScope = rowScopes(view.container)[0];
    click(view.container.querySelector('[data-media-url-option="asset-1"]'));
    view.rerender({
      initialValue: [item({ src: "/media/same.jpg" })],
      parentScopeKey: "parent-2",
      onChange,
    });
    const newScopes = rowScopes(view.container);
    expect(newScopes).toHaveLength(1);
    expect(newScopes[0]).not.toBe(oldScope);
    expect(newScopes).not.toContain(oldScope);
    await resolveMedia(0, mediaUrlState.items);
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("row source callback: null maps to empty src, 2048 replaces, 2049 is non-mutating", () => {
  const url2048 = "a".repeat(2048);
  const url2049 = "a".repeat(2049);
  const onChange = vi.fn();
  const view = mountHarness({ initialValue: [item({ src: "/media/old.jpg" })], onChange });
  try {
    const scope = rowScopes(view.container)[0];
    const rowCallback = mediaUrlState.byScope.get(scope ?? "")?.onChange;
    expect(rowCallback).toBeTruthy();
    React.act(() => {
      rowCallback?.(null);
    });
    expect(lastCommitted(onChange)).toEqual([item({ src: "" })]);
    React.act(() => {
      rowCallback?.(url2048);
    });
    expect(lastCommitted(onChange)).toEqual([item({ src: url2048 })]);
    const before = onChange.mock.calls.length;
    React.act(() => {
      rowCallback?.(url2049);
    });
    expect(onChange.mock.calls.length).toBe(before);
    expect(lastCommitted(onChange)).toEqual([item({ src: url2048 })]);
  } finally {
    view.cleanup();
  }
});

test("alt 500 commits; a 501-char direct commit emits nothing preserving the prior row", () => {
  const alt500 = "a".repeat(500);
  const alt501 = "a".repeat(501);
  const onChange = vi.fn();
  const view = mountHarness({ initialValue: [item({ alt: "Old" })], onChange });
  try {
    setInputValue(inputByLabel(view.container, "Gallery item 1 alt"), alt500);
    expect(lastCommitted(onChange)).toEqual([item({ alt: alt500 })]);
    const before = onChange.mock.calls.length;
    setInputValue(inputByLabel(view.container, "Gallery item 1 alt"), alt501);
    expect(onChange.mock.calls.length).toBe(before);
    expect(lastCommitted(onChange)).toEqual([item({ alt: alt500 })]);
  } finally {
    view.cleanup();
  }
});

test("caption 2000 commits; a 2001-char direct commit emits nothing preserving the prior row", () => {
  const caption2000 = "a".repeat(2000);
  const caption2001 = "a".repeat(2001);
  const onChange = vi.fn();
  const view = mountHarness({ initialValue: [item({ caption: "Old" })], onChange });
  try {
    setInputValue(inputByLabel(view.container, "Gallery item 1 caption"), caption2000);
    expect(lastCommitted(onChange)).toEqual([item({ caption: caption2000 })]);
    const before = onChange.mock.calls.length;
    setInputValue(inputByLabel(view.container, "Gallery item 1 caption"), caption2001);
    expect(onChange.mock.calls.length).toBe(before);
    expect(lastCommitted(onChange)).toEqual([item({ caption: caption2000 })]);
  } finally {
    view.cleanup();
  }
});

test("incoming over-limit values render byte-for-byte and clear remains available", () => {
  const url2049 = "a".repeat(2049);
  const alt501 = "a".repeat(501);
  const caption2001 = "a".repeat(2001);
  const onChange = vi.fn();
  const view = mountHarness({
    initialValue: [item({ src: url2049, alt: alt501, caption: caption2001 })],
    onChange,
  });
  try {
    const rowValue = view.container
      .querySelector("[data-media-url-value]")
      ?.getAttribute("data-media-url-value");
    expect(rowValue).toBe(url2049);
    expect(inputByLabel(view.container, "Gallery item 1 alt").value).toBe(alt501);
    expect(inputByLabel(view.container, "Gallery item 1 caption").value).toBe(caption2001);
    click(view.container.querySelector("[data-media-url-clear]"));
    expect(lastCommitted(onChange)).toEqual([item({ src: "", alt: alt501, caption: caption2001 })]);
  } finally {
    view.cleanup();
  }
});

test("category assignments absent from the token list stay visible and preserved on unrelated edits", () => {
  const onChange = vi.fn();
  const view = mountHarness({
    initialValue: [item({ category: "ghost" })],
    categoryTokens: ["news", "promo"],
    onChange,
  });
  try {
    expect(inputByLabel(view.container, "Gallery item 1 categories").value).toBe("ghost");
    setInputValue(inputByLabel(view.container, "Gallery item 1 alt"), "Edited");
    const committed = lastCommitted(onChange);
    expect(committed[0]).toEqual(item({ alt: "Edited", category: "ghost" }));
  } finally {
    view.cleanup();
  }
});

test("explicit row-category edits use the ordered unique/pattern/count/combined-string contract", () => {
  const token48 = (letter: string) => letter.repeat(48);
  const category587 = Array.from({ length: 12 }, (_, index) =>
    token48(String.fromCharCode(97 + index))
  ).join(" ");
  const category588 = "a".repeat(588);
  const thirteenTokens = Array.from({ length: 13 }, (_, index) => `t${index}`).join(" ");
  const onChange = vi.fn();
  const view = mountHarness({ initialValue: [item()], onChange });
  try {
    const categoryInput = inputByLabel(view.container, "Gallery item 1 categories");
    setInputValue(categoryInput, "beta alpha beta");
    expect(lastCommitted(onChange)).toEqual([item({ category: "beta alpha" })]);

    setInputValue(categoryInput, "  x  ");
    expect(lastCommitted(onChange)).toEqual([item({ category: "x" })]);

    setInputValue(categoryInput, category587);
    expect(lastCommitted(onChange)).toEqual([item({ category: category587 })]);

    setInputValue(categoryInput, "");
    const empty = lastCommitted(onChange)[0];
    expect(empty).toEqual({ src: "/media/item.jpg", alt: "Item", caption: "Caption" });
    expect(Object.prototype.hasOwnProperty.call(empty, "category")).toBe(false);

    // Rejected commit attempts are non-mutating: over-length tokens, too many
    // tokens, and an over-length combined string all emit nothing and leave
    // the prior row (with its omitted category key) untouched.
    const before = onChange.mock.calls.length;
    setInputValue(categoryInput, "b".repeat(49));
    setInputValue(categoryInput, thirteenTokens);
    setInputValue(categoryInput, category588);
    expect(onChange.mock.calls.length).toBe(before);
    expect(lastCommitted(onChange)).toEqual([
      { src: "/media/item.jpg", alt: "Item", caption: "Caption" },
    ]);
  } finally {
    view.cleanup();
  }
});

test("keyboard focus stays usable after add and remove", () => {
  const onChange = vi.fn();
  const view = mountHarness({
    initialValue: [item({ src: "/media/one.jpg" }), item({ src: "/media/two.jpg" })],
    onChange,
  });
  try {
    click(view.container.querySelector('button[aria-label="Remove gallery item 1"]'));
    expect(document.activeElement).toBe(inputByLabel(view.container, "Gallery item 1 alt"));
    click(Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Add item")
    ));
    expect(document.activeElement).toBe(inputByLabel(view.container, "Gallery item 2 alt"));
  } finally {
    view.cleanup();
  }
});

function asset(id: string, url: string): MockMediaRecord {
  return { id, url, type: "image", mimeType: "image/jpeg" };
}
