// @vitest-environment happy-dom

/**
 * The quick-create drawer's own lane.
 *
 * `EntryCreateDrawer` is the ONLY way to bring a content entry into existence: the full
 * editor route resolves an entry by id, so it can edit but never create. That makes the
 * drawer's payload contract identical to the server's: whatever it sends must satisfy the
 * selected content type's schema, because `createEntry` validates against that schema
 * before it inserts.
 *
 * The drawer used to send `data: {}` unconditionally, so any content type whose schema
 * declared a required field -- including the DEFAULT schema, which declares a required
 * `title` -- rejected every quick-create with `entry_validation_failed`. The two relocated
 * tests below ("normalizes the create payload ..." and "reports rejected create
 * mutations ...") lived in `entry-page-support-wave.test.tsx` and the first of them ASSERTED
 * `data: {}`, i.e. it pinned the defect as the contract. What it should have been asserting
 * is what it asserts here: that the payload satisfies the schema of the type being created.
 *
 * The assertions therefore end at the real validator (`core/services/content/validation.ts`),
 * not at a hand-written expectation of it -- a payload that the server would reject cannot
 * pass this file.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { ContentSchema } from "@/services/contentTypesClient";

import { validateEntryData } from "../../../core/services/content/validation";

const entriesState = vi.hoisted(() => ({
  createEntry: vi.fn(async (typeSlug: string, input: Record<string, unknown>) => ({
    id: "entry-1",
    title: input.title,
    slug: input.slug,
    typeSlug,
    data: input.data,
  })),
  listEntriesCached: vi.fn(async () => []),
  reset() {
    entriesState.createEntry.mockReset();
    entriesState.createEntry.mockImplementation(
      async (typeSlug: string, input: Record<string, unknown>) => ({
        id: "entry-1",
        title: input.title,
        slug: input.slug,
        typeSlug,
        data: input.data,
      })
    );
    entriesState.listEntriesCached.mockClear();
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    asChild,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    asChild?: boolean;
    [key: string]: unknown;
  }) =>
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
  }: {
    checked?: boolean | "indeterminate";
    onCheckedChange?: (checked: boolean) => void;
    [key: string]: unknown;
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
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input defaultValue={value} onChange={onChange} {...props} />,
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

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/entriesClient", () => ({
  createEntry: entriesState.createEntry,
  listEntriesCached: entriesState.listEntriesCached,
}));

vi.mock("@/ui/posts/editor/richtext/PostRichTextAdapter", () => ({
  PostRichTextAdapter: ({ onChange }: { onChange: (value: string) => void }) => (
    <button type="button" onClick={() => onChange("Body from the drawer")}>
      richtext-editor
    </button>
  ),
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({ onChange }: { onChange: (value: unknown) => void }) => (
    <button type="button" onClick={() => onChange("media-1")}>
      media-picker
    </button>
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

const titleInputOf = (container: HTMLElement) =>
  container.querySelector('input[placeholder="e.g. Launch announcement"]');
const slugInputOf = (container: HTMLElement) =>
  container.querySelector('input[placeholder="launch-announcement"]');
const createButtonOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === "Create Draft"
  );

/** The default content type the schema builder proposes: a REQUIRED title plus a body. */
const defaultSchema: ContentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title"],
  properties: {
    title: { type: "string", xFieldType: "text", title: "Title" },
    body: { type: "string", xFieldType: "richtext", title: "Body" },
  },
};

/** A schema that requires a field the drawer has no column for. */
const guideSchema: ContentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary"],
  properties: {
    title: { type: "string", xFieldType: "text", title: "Title" },
    summary: { type: "string", xFieldType: "text", title: "Summary" },
    body: { type: "string", xFieldType: "richtext", title: "Body" },
  },
};

/** A schema whose required field is not a string, so a stringly-typed payload is invalid. */
const releaseSchema: ContentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["build"],
  properties: {
    build: { type: "integer", xFieldType: "number", title: "Build" },
  },
};

const createdPayload = () => {
  const call = entriesState.createEntry.mock.calls.at(-1);
  if (!call) throw new Error("createEntry was never called");
  const [, payload] = call;
  const data = payload.data;
  if (typeof data !== "object" || data === null) throw new Error("payload carried no data object");
  return { typeSlug: call[0], payload, data };
};

afterEach(() => {
  vi.restoreAllMocks();
  entriesState.reset();
});

test("EntryCreateDrawer collects the fields its schema requires before it will create", async () => {
  const { EntryCreateDrawer } = await import("../../../core/admin/ui/entries/EntryCreateDrawer");

  const view = mount(
    <EntryCreateDrawer
      open
      onOpenChange={vi.fn()}
      types={[{ id: "type-1", slug: "guides", name: "Guides", schema: guideSchema }]}
      defaultTypeSlug="guides"
    />
  );

  try {
    // The required non-column field is asked for; the required `title` is NOT asked twice --
    // the Title input above already owns that value (see entryLinkedFields).
    expect(view.container.textContent).toContain("Summary *");
    expect(view.container.textContent).not.toContain("Title *");
    expect(view.container.querySelector('input[placeholder="Enter title..."]')).toBeNull();

    await React.act(async () => {
      setInputValue(titleInputOf(view.container), "Field Guide");
      setInputValue(slugInputOf(view.container), "field-guide");
      await Promise.resolve();
    });

    // A title and a slug alone cannot satisfy this schema, so the drawer says so instead of
    // offering a button whose only outcome is entry_validation_failed.
    expect(createButtonOf(view.container)?.disabled).toBe(true);
    expect(view.container.textContent).toContain("Fill required fields: Summary.");

    await React.act(async () => {
      setInputValue(
        view.container.querySelector('input[placeholder="Enter summary..."]'),
        "What this guide covers"
      );
      await Promise.resolve();
    });

    expect(createButtonOf(view.container)?.disabled).toBe(false);
    expect(view.container.textContent).not.toContain("Fill required fields");

    await React.act(async () => {
      createButtonOf(view.container)?.click();
      await Promise.resolve();
    });

    const { typeSlug, payload, data } = createdPayload();
    expect(typeSlug).toBe("guides");
    expect(payload.title).toBe("Field Guide");
    expect(payload.slug).toBe("field-guide");
    expect(data).toEqual({ title: "Field Guide", summary: "What this guide covers" });

    // The contract the old assertion should have been checking: the payload satisfies the
    // schema of the type being created. `data: {}` -- what the drawer used to send and what
    // the old test pinned -- is exactly what the server rejects.
    expect(() => validateEntryData("guides-accepted", guideSchema, data)).not.toThrow();
    expect(() => validateEntryData("guides-rejected", guideSchema, {})).toThrow(
      "entry_validation_failed"
    );
  } finally {
    view.cleanup();
  }
});

test("EntryCreateDrawer normalizes create payloads and open-after-create flow", async () => {
  const { EntryCreateDrawer } = await import("../../../core/admin/ui/entries/EntryCreateDrawer");

  const onOpenChange = vi.fn();
  const onCreated = vi.fn();

  const view = mount(
    <EntryCreateDrawer
      open
      onOpenChange={onOpenChange}
      types={[
        { id: "type-1", slug: "articles", name: "Articles", schema: defaultSchema },
        { id: "type-2", slug: "products", name: "Products", schema: defaultSchema },
      ]}
      defaultTypeSlug="articles"
      onCreated={onCreated}
    />
  );

  try {
    expect(view.container.textContent).toContain("Create New Article");

    await React.act(async () => {
      setSelectValue(view.container.querySelector("select"), "products");
      setInputValue(titleInputOf(view.container), "New Product");
      setInputValue(slugInputOf(view.container), "new-product");
      const openAfterCreate = view.container.querySelector("input[type='checkbox']");
      if (openAfterCreate instanceof HTMLInputElement) openAfterCreate.click();
      await Promise.resolve();
    });

    // The default schema asks for nothing beyond the title it shares with the column, so
    // quick-create stays a two-field form -- and now sends that title in `data` as well,
    // which is the only reason the request is accepted.
    expect(view.container.textContent).not.toContain("Fill required fields");

    await React.act(async () => {
      createButtonOf(view.container)?.click();
      await Promise.resolve();
    });

    const { typeSlug, data } = createdPayload();
    expect(typeSlug).toBe("products");
    expect(data).toEqual({ title: "New Product" });
    expect(() => validateEntryData("products-accepted", defaultSchema, data)).not.toThrow();
    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ id: "entry-1", slug: "new-product" }),
      "products",
      false
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});

test("EntryCreateDrawer sends a required number with the type its schema declares", async () => {
  const { EntryCreateDrawer } = await import("../../../core/admin/ui/entries/EntryCreateDrawer");

  const view = mount(
    <EntryCreateDrawer
      open
      onOpenChange={vi.fn()}
      types={[{ id: "type-1", slug: "releases", name: "Releases", schema: releaseSchema }]}
      defaultTypeSlug="releases"
    />
  );

  try {
    await React.act(async () => {
      setInputValue(titleInputOf(view.container), "Release 42");
      setInputValue(slugInputOf(view.container), "release-42");
      await Promise.resolve();
    });

    expect(createButtonOf(view.container)?.disabled).toBe(true);

    await React.act(async () => {
      setInputValue(view.container.querySelector('input[type="number"]'), "42");
      await Promise.resolve();
    });

    await React.act(async () => {
      createButtonOf(view.container)?.click();
      await Promise.resolve();
    });

    const { data } = createdPayload();
    // A collected value has to reach `data` in the schema's own type: "42" would fail the
    // very validation this fix exists to satisfy.
    expect(data).toEqual({ build: 42 });
    expect(() => validateEntryData("releases-accepted", releaseSchema, data)).not.toThrow();
    expect(() => validateEntryData("releases-string", releaseSchema, { build: "42" })).toThrow(
      "entry_validation_failed"
    );
  } finally {
    view.cleanup();
  }
});

test("EntryCreateDrawer keeps each content type's answers to its own questions", async () => {
  const { EntryCreateDrawer } = await import("../../../core/admin/ui/entries/EntryCreateDrawer");

  const view = mount(
    <EntryCreateDrawer
      open
      onOpenChange={vi.fn()}
      types={[
        { id: "type-1", slug: "guides", name: "Guides", schema: guideSchema },
        { id: "type-2", slug: "releases", name: "Releases", schema: releaseSchema },
      ]}
      defaultTypeSlug="guides"
    />
  );

  try {
    await React.act(async () => {
      setInputValue(titleInputOf(view.container), "Field Guide");
      setInputValue(slugInputOf(view.container), "field-guide");
      setInputValue(
        view.container.querySelector('input[placeholder="Enter summary..."]'),
        "What this guide covers"
      );
      await Promise.resolve();
    });
    expect(createButtonOf(view.container)?.disabled).toBe(false);

    // A different type asks a different question, and the answer to the previous one is not an
    // answer to it: the button has to go back to disabled rather than inherit "satisfied".
    await React.act(async () => {
      setSelectValue(view.container.querySelector("select"), "releases");
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Build *");
    expect(view.container.textContent).not.toContain("Summary *");
    expect(createButtonOf(view.container)?.disabled).toBe(true);

    // Coming back finds the guide's own answer still there -- switching type is not a reset.
    await React.act(async () => {
      setSelectValue(view.container.querySelector("select"), "guides");
      await Promise.resolve();
    });
    expect(createButtonOf(view.container)?.disabled).toBe(false);

    await React.act(async () => {
      createButtonOf(view.container)?.click();
      await Promise.resolve();
    });

    const { typeSlug, data } = createdPayload();
    expect(typeSlug).toBe("guides");
    // Only the selected type's own required keys, never the other type's `build`.
    expect(data).toEqual({ title: "Field Guide", summary: "What this guide covers" });
    expect(() => validateEntryData("guides-round-trip", guideSchema, data)).not.toThrow();
  } finally {
    view.cleanup();
  }
});

test("EntryCreateDrawer reports rejected create mutations through optional list callback", async () => {
  const { EntryCreateDrawer } = await import("../../../core/admin/ui/entries/EntryCreateDrawer");

  const apiError = {
    name: "ApiClientError",
    message: "Entry create denied.",
    code: "request_failed",
    status: 409,
  };
  entriesState.createEntry.mockRejectedValueOnce(apiError);
  const onCreateError = vi.fn();

  const view = mount(
    <EntryCreateDrawer
      open
      onOpenChange={vi.fn()}
      types={[{ id: "type-1", slug: "articles", name: "Articles", schema: defaultSchema }]}
      defaultTypeSlug="articles"
      onCreateError={onCreateError}
    />
  );

  try {
    await React.act(async () => {
      setInputValue(titleInputOf(view.container), "Blocked Entry");
      setInputValue(slugInputOf(view.container), "blocked-entry");
      await Promise.resolve();
    });
    await React.act(async () => {
      createButtonOf(view.container)?.click();
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Entry create denied.");
    expect(onCreateError).toHaveBeenCalledWith(apiError);
  } finally {
    view.cleanup();
  }

  entriesState.createEntry.mockRejectedValueOnce(new Error("plain failure"));
  const directView = mount(
    <EntryCreateDrawer
      open
      onOpenChange={vi.fn()}
      types={[{ id: "type-1", slug: "articles", name: "Articles", schema: defaultSchema }]}
      defaultTypeSlug="articles"
    />
  );

  try {
    await React.act(async () => {
      setInputValue(titleInputOf(directView.container), "Local Only");
      setInputValue(slugInputOf(directView.container), "local-only");
      await Promise.resolve();
    });
    await React.act(async () => {
      createButtonOf(directView.container)?.click();
      await Promise.resolve();
    });

    expect(directView.container.textContent).toContain("Failed to create entry.");
    expect(onCreateError).toHaveBeenCalledTimes(1);
  } finally {
    directView.cleanup();
  }
});
