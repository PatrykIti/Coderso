// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

/**
 * FieldRenderer's own coverage, split out of `entry-page-support-wave.test.tsx` when that
 * suite passed 1,000 physical lines. The seam is the subject: everything left there renders
 * an entry or page SUPPORT surface -- type sidebar, metadata panel, revision drawer, list
 * tables -- while these two render the field control itself, for every field type the entry
 * editor supports and for each state of its relation picker.
 *
 * Both tests are unchanged in name and body. The harness below is the part of that suite's
 * harness FieldRenderer's own import graph reaches: FieldRenderer -> checkbox, input, select,
 * apiClient, entriesClient, MediaPicker, PostRichTextAdapter, and through SchemaBuilder ->
 * FieldEditor -> button, switch, textarea, InfoTip, cn. The mocks the other suite keeps for
 * sheets, tables, cards and the like are not reachable from here and are not copied.
 */

/**
 * The only value this file makes `listEntriesCached` reject with, and the only
 * thing the mocked `isApiClientError` below is ever handed. Structurally a subset
 * of `Error`, so a real rejection reaching the same guard is assignable to it too.
 */
type RejectedRelationLoad = { name: string; message: string };

const entriesState = vi.hoisted(() => ({
  relationItems: [
    {
      id: "related-1",
      title: "Linked entry",
      slug: "linked-entry",
      status: "published",
      updatedAt: "2026-03-06T12:00:00.000Z",
      author: null,
    },
  ],
  relationError: null as RejectedRelationLoad | null,
  listEntriesCached: vi.fn(async () => {
    if (entriesState.relationError) throw entriesState.relationError;
    return entriesState.relationItems;
  }),
  reset() {
    entriesState.listEntriesCached.mockClear();
    entriesState.relationItems = [
      {
        id: "related-1",
        title: "Linked entry",
        slug: "linked-entry",
        status: "published",
        updatedAt: "2026-03-06T12:00:00.000Z",
        author: null,
      },
    ];
    entriesState.relationError = null;
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    asChild,
    ...props
  }: React.ComponentPropsWithoutRef<"button"> & { asChild?: boolean }) =>
    asChild ? (
      <span>{children}</span>
    ) : (
      <button type="button" onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: Omit<React.ComponentPropsWithoutRef<"input">, "checked" | "onChange"> & {
    checked?: boolean | "indeterminate";
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked === true}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    onKeyDown,
    onBlur,
    ...props
  }: React.ComponentPropsWithoutRef<"input">) => (
    <input
      defaultValue={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
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

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [{ value: child.props.value, label: flattenText(child.props.children) }];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
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
  Textarea: ({ value, onChange, ...props }: React.ComponentPropsWithoutRef<"textarea">) => (
    <textarea defaultValue={value} onChange={onChange} {...props} />
  ),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: RejectedRelationLoad | null) => error?.name === "ApiClientError",
}));

vi.mock("@/services/entriesClient", () => ({
  listEntriesCached: entriesState.listEntriesCached,
}));

vi.mock("@/ui/posts/editor/richtext/PostRichTextAdapter", () => ({
  PostRichTextAdapter: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <button type="button" data-richtext-value={value} onClick={() => onChange("Updated body")}>
      richtext-editor
    </button>
  ),
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({
    value,
    onChange,
    multiple,
    maxItems,
    accept,
  }: {
    value?: string | string[] | null;
    // The three shapes the real picker emits: an id, an id list, and a clear.
    onChange: (value: string | string[] | null) => void;
    multiple?: boolean;
    maxItems?: number;
    accept?: string[];
  }) => (
    <div>
      <button type="button" onClick={() => onChange("media-1")}>
        media-picker
      </button>
      <span>{`media-multiple:${String(Boolean(multiple))}`}</span>
      <span>{`media-max:${maxItems ?? "none"}`}</span>
      <span>{`media-accept:${(accept ?? []).join("|") || "none"}`}</span>
      <span>{`media-value:${Array.isArray(value) ? value.join("|") : String(value)}`}</span>
    </div>
  ),
}));

vi.mock("@/ui/shared/InfoTip", () => ({
  InfoTip: ({ label }: { label: string }) => <span>{label}</span>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
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

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
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

afterEach(() => {
  vi.restoreAllMocks();
  entriesState.reset();
});

test("FieldRenderer covers primitive, media, relation fallback, and unknown field branches", async () => {
  const { FieldRenderer } = await import("../../../core/admin/ui/entries/FieldRenderer");

  const onChange = vi.fn();
  const compactTextField = {
    id: "field-text",
    name: "headline",
    type: "text",
    label: "Headline",
    help: "Custom text help",
  } as const;

  const textView = mount(
    <FieldRenderer field={compactTextField} value="Hello" onChange={onChange} display="compact" />
  );

  try {
    expect(textView.container.innerHTML).toContain("Custom text help");
    expect(textView.container.innerHTML).toContain("h-9 text-sm");

    const textInput = textView.container.querySelector("input");
    React.act(() => {
      setInputValue(textInput ?? undefined, "Updated headline");
    });
    expect(onChange).toHaveBeenLastCalledWith("Updated headline");

    textView.rerender(
      <FieldRenderer
        field={{
          id: "field-richtext",
          name: "body",
          type: "richtext",
          label: "Body",
        }}
        value="Body copy"
        onChange={onChange}
      />
    );
    expect(textView.container.textContent).toContain("Long-form content with formatting.");

    React.act(() => {
      textView.container
        .querySelector("button[data-richtext-value]")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onChange).toHaveBeenLastCalledWith("Updated body");

    textView.rerender(
      <FieldRenderer
        field={{
          id: "field-number",
          name: "order",
          type: "number",
          label: "Order",
        }}
        value={12}
        onChange={onChange}
      />
    );
    const numberInput = textView.container.querySelector("input");
    React.act(() => {
      setInputValue(numberInput ?? undefined, "");
    });
    expect(onChange).toHaveBeenLastCalledWith(null);
    React.act(() => {
      setInputValue(numberInput ?? undefined, "42");
    });
    expect(onChange).toHaveBeenLastCalledWith(42);
    React.act(() => {
      setInputValue(numberInput ?? undefined, "1e309");
    });
    expect(onChange).toHaveBeenLastCalledWith(null);

    textView.rerender(
      <FieldRenderer
        field={{
          id: "field-boolean",
          name: "featured",
          type: "boolean",
          label: "Featured",
        }}
        value={false}
        onChange={onChange}
      />
    );
    const checkbox = textView.container.querySelector("input[type='checkbox']");
    React.act(() => {
      (checkbox as HTMLInputElement | null)?.click();
    });
    expect(onChange).toHaveBeenLastCalledWith(true);

    textView.rerender(
      <FieldRenderer
        field={{
          id: "field-select",
          name: "tone",
          type: "select",
          label: "Tone",
          options: [
            { id: "tone-warm", label: "Warm", value: "warm" },
            { id: "tone-cool", label: "Cool", value: "cool" },
          ],
        }}
        value="warm"
        onChange={onChange}
      />
    );
    const select = textView.container.querySelector("select");
    React.act(() => {
      setSelectValue(select ?? undefined, "cool");
    });
    expect(onChange).toHaveBeenLastCalledWith("cool");

    textView.rerender(
      <FieldRenderer
        field={{
          id: "field-select-multiple",
          name: "channels",
          type: "select",
          label: "Channels",
          multiple: true,
          options: [
            { id: "option-web", label: "Website", value: "web" },
            { id: "option-email", label: "Email", value: "email" },
          ],
        }}
        value={["web"]}
        onChange={onChange}
      />
    );
    const multiCheckboxes = textView.container.querySelectorAll("input[type='checkbox']");
    React.act(() => {
      (multiCheckboxes[1] as HTMLInputElement | undefined)?.click();
    });
    expect(onChange).toHaveBeenLastCalledWith(["web", "email"]);

    textView.rerender(
      <FieldRenderer
        field={{
          id: "field-media",
          name: "gallery",
          type: "media",
          label: "Gallery",
          media: {
            multiple: true,
            maxItems: 3,
            accept: ["image/png", "image/jpeg"],
          },
        }}
        value={[]}
        onChange={onChange}
      />
    );
    expect(textView.container.textContent).toContain("Select up to 3 assets from the library.");
    expect(textView.container.textContent).toContain("media-multiple:true");
    expect(textView.container.textContent).toContain("media-max:3");
    expect(textView.container.textContent).toContain("media-accept:image/png|image/jpeg");
    React.act(() => {
      Array.from(textView.container.querySelectorAll("button"))
        .find((button) => button.textContent === "media-picker")
        ?.click();
    });
    expect(onChange).toHaveBeenLastCalledWith("media-1");

    textView.rerender(
      <FieldRenderer
        field={{
          id: "field-media-invalid",
          name: "cover",
          type: "media",
          label: "Cover",
        }}
        value={42}
        onChange={onChange}
      />
    );
    expect(textView.container.textContent).toContain("media-value:null");

    textView.rerender(
      <FieldRenderer
        field={{
          id: "field-relation-empty",
          name: "related",
          type: "relation",
          label: "Related",
          relation: { target: "" },
        }}
        value=""
        onChange={onChange}
        display="compact"
      />
    );
    expect(textView.container.textContent).toContain(
      "Choose a related content type in the Content Type editor to enable picker."
    );
    expect(textView.container.innerHTML).toContain(
      "Add a relation target in the content type first"
    );

    textView.rerender(
      <FieldRenderer
        field={
          {
            id: "field-unsupported",
            name: "unknown",
            type: "unsupported",
            label: "Unsupported",
          } as never
        }
        value={null}
        onChange={onChange}
      />
    );
    expect(textView.container.textContent).toBe("");
  } finally {
    textView.cleanup();
  }
});

test("FieldRenderer relation picker covers single, multiple, search, empty, and error states", async () => {
  const { FieldRenderer } = await import("../../../core/admin/ui/entries/FieldRenderer");

  const onChange = vi.fn();
  entriesState.relationItems = [
    {
      id: "related-1",
      title: "Linked entry",
      slug: "linked-entry",
      status: "published",
      updatedAt: "2026-03-06T12:00:00.000Z",
      author: null,
    },
    {
      id: "related-2",
      title: "Second reference",
      slug: "second-reference",
      status: "draft",
      updatedAt: "2026-03-06T12:00:00.000Z",
      author: null,
    },
  ];

  const view = mount(
    <FieldRenderer
      field={{
        id: "field-relation",
        name: "linked-post",
        type: "relation",
        label: "Linked post",
        relation: { target: "articles" },
      }}
      value=""
      onChange={onChange}
      relationTargets={[{ slug: "articles", name: "Articles" }]}
    />
  );

  try {
    await React.act(async () => {
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Link this entry to related content.");
    expect(view.container.textContent).toContain("Linked entry");

    const buttons = Array.from(view.container.querySelectorAll("button"));
    React.act(() => {
      buttons.find((button) => button.textContent?.includes("Linked entry"))?.click();
    });
    expect(onChange).toHaveBeenLastCalledWith("related-1");

    const searchInput = view.container.querySelector("input");
    React.act(() => {
      setInputValue(searchInput ?? undefined, "missing");
    });
    expect(view.container.textContent).toContain("No matches for");

    view.rerender(
      <FieldRenderer
        field={{
          id: "field-relation-multi",
          name: "linked-posts",
          type: "relation",
          label: "Linked posts",
          help: "Use relation help",
          relation: { target: "articles-multi", multiple: true },
        }}
        value={["related-1"]}
        onChange={onChange}
        relationTargets={[{ slug: "articles-multi", name: "Articles" }]}
        display="compact"
      />
    );
    await React.act(async () => {
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Use relation help");
    expect(view.container.innerHTML).toContain("h-9 text-sm");
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Second reference"))
        ?.click();
    });
    expect(onChange).toHaveBeenLastCalledWith(["related-1", "related-2"]);

    entriesState.relationItems = [];
    view.rerender(
      <FieldRenderer
        field={{
          id: "field-relation-empty",
          name: "linked-empty",
          type: "relation",
          label: "Linked empty",
          relation: { target: "articles-empty" },
        }}
        value=""
        onChange={onChange}
        relationTargets={[{ slug: "articles-empty", name: "Articles" }]}
      />
    );
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("No items found yet.");

    entriesState.relationError = {
      name: "ApiClientError",
      message: "Relation lookup failed",
    };
    view.rerender(
      <FieldRenderer
        field={{
          id: "field-relation-error",
          name: "linked-error",
          type: "relation",
          label: "Linked error",
          relation: { target: "articles-error" },
        }}
        value=""
        onChange={onChange}
        relationTargets={[{ slug: "articles-error", name: "Articles" }]}
      />
    );
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Relation lookup failed");
  } finally {
    view.cleanup();
  }
});
