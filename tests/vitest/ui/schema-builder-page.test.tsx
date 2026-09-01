// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import type {
  ContentSchema,
  ContentTypeSummary,
} from "../../../core/admin/services/contentTypesClient";
import { SchemaBuilderPage } from "../../../core/admin/ui/content-types/SchemaBuilderPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const selectHandlers = vi.hoisted(() => new WeakMap<HTMLElement, (value: string) => void>());

const state = vi.hoisted(() => {
  const schema: ContentSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" as const, title: "Title", xFieldType: "text" },
      summary: { type: "string" as const, title: "Summary", xFieldType: "richtext" },
    },
  };
  const makeType = (overrides: Partial<ContentTypeSummary> = {}): ContentTypeSummary => ({
    id: "ct-1",
    name: "Articles",
    slug: "articles",
    schema,
    status: "draft",
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
    ...overrides,
  });
  return {
    list: [makeType()] as ContentTypeSummary[] | null,
    type: makeType() as ContentTypeSummary | null,
    listContentTypesCached: vi.fn(async () => state.list ?? []),
    getContentTypeCached: vi.fn(async () => state.type),
    updateContentType: vi.fn(async () => ({ ok: true })),
    reset() {
      state.list = [makeType()];
      state.type = makeType();
      state.listContentTypesCached.mockClear();
      state.getContentTypeCached.mockClear();
      state.updateContentType.mockClear();
    },
  };
});

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => state.list,
  listContentTypesCached: state.listContentTypesCached,
  getContentTypeCached: state.getContentTypeCached,
  updateContentType: state.updateContentType,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "kind" in error),
}));

vi.mock("@/ui/layouts/SplitShell", () => ({
  SplitShell: ({
    children,
    rightPanel,
    breadcrumbs,
    activeHref,
  }: {
    children: React.ReactNode;
    rightPanel?: React.ReactNode;
    breadcrumbs?: React.ReactNode;
    activeHref?: string;
  }) => (
    <div data-active-href={activeHref}>
      <div>{breadcrumbs}</div>
      {rightPanel ? <aside>{rightPanel}</aside> : null}
      <main>{children}</main>
    </div>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    "aria-label": ariaLabel,
    className,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    "aria-label"?: string;
    className?: string;
  }) => (
    <button
      type="button"
      aria-label={ariaLabel}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
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
    min,
    max,
    step,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <input
      type={type ?? "text"}
      data-slot="input"
      value={value ?? ""}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      onChange={onChange}
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
  }) => <textarea data-slot="textarea" value={value ?? ""} rows={rows} onChange={onChange} />,
}));

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
      data-slot="switch"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <div
      data-slot="select"
      data-value={value}
      ref={(element) => {
        if (element) selectHandlers.set(element, onValueChange ?? (() => undefined));
      }}
    >
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <button
      type="button"
      data-slot="select-item"
      data-value={value}
      onClick={(event) => {
        const root = (event.currentTarget as HTMLElement).closest(
          '[data-slot="select"]'
        ) as HTMLElement | null;
        selectHandlers.get(root!)?.(value);
      }}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/ui/shared/InfoTip", () => ({
  InfoTip: ({ label }: { label: string }) => <span data-slot="info-tip">{label}</span>,
}));

let container: HTMLDivElement | null = null;

beforeEach(() => {
  state.reset();
  window.history.pushState({}, "", "/admin/content-types/ct-1");
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  container?.remove();
  container = null;
});

const mount = () => {
  const root = createRoot(container!);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin/content-types/ct-1">
        <SchemaBuilderPage />
      </AdminRouterProvider>
    );
  });
  return root;
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
};

const text = () => container!.textContent ?? "";

const findButton = (label: string) =>
  Array.from(container!.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label
  );

const findButtonContaining = (label: string) =>
  Array.from(container!.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label)
  );

const clickButton = (label: string) => {
  const button = findButton(label) ?? findButtonContaining(label);
  if (!button) throw new Error(`Missing button: ${label}`);
  React.act(() => {
    button.click();
  });
};

const clickDomButton = (button: HTMLButtonElement | undefined | null, label: string) => {
  if (!button) throw new Error(`Missing button: ${label}`);
  React.act(() => {
    button.click();
  });
};

const fieldNodes = () => Array.from(container!.querySelectorAll<HTMLElement>('[role="button"]'));

const fieldNodeNames = () =>
  fieldNodes().map((node) => (node.querySelector("div.truncate")?.textContent ?? "").trim());

const clickFieldNode = (label: string) => {
  const node = fieldNodes().find((candidate) => candidate.textContent?.includes(label));
  if (!node) throw new Error(`Missing field node: ${label}`);
  React.act(() => {
    node.click();
  });
};

const keyDownFieldNode = (label: string, key: string) => {
  const node = fieldNodes().find((candidate) => candidate.textContent?.includes(label));
  if (!node) throw new Error(`Missing field node: ${label}`);
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  React.act(() => {
    node.dispatchEvent(event);
  });
  return event;
};

const setInputValue = (input: HTMLInputElement | HTMLTextAreaElement | null, value: string) => {
  if (!input) throw new Error("Missing input");
  const descriptor = Object.getOwnPropertyDescriptor(
    input instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype,
    "value"
  );
  React.act(() => {
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const inputByLabel = (labelText: string) => {
  const label = Array.from(container!.querySelectorAll("label")).find((candidate) =>
    candidate.textContent?.includes(labelText)
  );
  return label?.parentElement?.querySelector<HTMLInputElement>("input") ?? null;
};

const inputByPlaceholder = (placeholder: string) =>
  container!.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`);

const clickSelectItem = (value: string) => {
  const item = container!.querySelector<HTMLButtonElement>(
    `[data-slot="select-item"][data-value="${value}"]`
  );
  if (!item) throw new Error(`Missing select item: ${value}`);
  React.act(() => {
    item.click();
  });
};

const switchByOrder = (index: number) =>
  container!.querySelectorAll<HTMLInputElement>('[data-slot="switch"]')[index] ?? null;

test("renders cached fields and saves the schema through the toolbar", async () => {
  const root = mount();
  try {
    await flush();
    expect(text()).toContain("Schema Builder");
    expect(text()).toContain("Articles");
    expect(text()).toContain("2 fields");
    expect(text()).toContain("Title");
    expect(text()).toContain("Summary");
    expect(text()).toContain("Text");
    expect(text()).toContain("Rich text");

    clickButton("Save");
    await flush();
    expect(state.updateContentType).toHaveBeenCalledWith(
      "ct-1",
      expect.objectContaining({
        schema: expect.objectContaining({ type: "object" }),
      })
    );
  } finally {
    React.act(() => root.unmount());
  }
});

test("loads the schema from the server when the cache is empty", async () => {
  state.list = null;
  const root = mount();
  try {
    await flush();
    expect(state.getContentTypeCached).toHaveBeenCalledWith("ct-1", { force: true });
    expect(state.listContentTypesCached).toHaveBeenCalledWith({ force: true });
    expect(text()).toContain("Title");
    expect(text()).not.toContain("Loading fields...");
  } finally {
    React.act(() => root.unmount());
  }
});

test("keeps the cached schema editor usable when the forced list refresh fails", async () => {
  state.listContentTypesCached.mockRejectedValueOnce(new Error("list offline"));
  const root = mount();
  try {
    await flush();
    expect(state.listContentTypesCached).toHaveBeenCalledWith({ force: true });
    expect(text()).not.toContain("Loading fields...");
    expect(inputByLabel("Field name")?.value).toBe("title");

    setInputValue(inputByLabel("Field name"), "headline");
    expect(inputByLabel("Field name")?.value).toBe("headline");
  } finally {
    React.act(() => root.unmount());
  }
});

test("surfaces an api error alert when the schema fetch fails", async () => {
  state.list = null;
  state.getContentTypeCached.mockRejectedValueOnce({ kind: "http_error", message: "fetch boom" });
  const root = mount();
  try {
    await flush();
    expect(text()).toContain("Unable to load schema");
    expect(text()).toContain("fetch boom");
  } finally {
    React.act(() => root.unmount());
  }
});

test("shows a generic load error for non-api failures", async () => {
  state.list = null;
  state.getContentTypeCached.mockRejectedValueOnce(new Error("offline"));
  const root = mount();
  try {
    await flush();
    expect(text()).toContain("Unable to load schema");
    expect(text()).toContain("Failed to load schema.");
  } finally {
    React.act(() => root.unmount());
  }
});

test("adds every field type from the palette", async () => {
  const root = mount();
  try {
    await flush();
    for (const type of [
      "Text",
      "Rich text",
      "Number",
      "Boolean",
      "Select",
      "Media",
      "Relation",
      "Date",
      "Slug",
    ]) {
      clickButton(type);
    }
    expect(text()).toContain("11 fields");
    expect(fieldNodes()).toHaveLength(11);
    clickFieldNode("Relation");
    expect(text()).toContain("Select a related content type.");
  } finally {
    React.act(() => root.unmount());
  }
});

test("adds a new text field with the dashed add button", async () => {
  const root = mount();
  try {
    await flush();
    clickButton("Add new field");
    expect(text()).toContain("3 fields");
    expect(fieldNodeNames()).toEqual(["Title", "Summary", "Text"]);
  } finally {
    React.act(() => root.unmount());
  }
});

test("moves fields with keyboard arrows and reorders", async () => {
  const root = mount();
  try {
    await flush();
    keyDownFieldNode("Summary", "ArrowUp");
    expect(fieldNodeNames()).toEqual(["Summary", "Title"]);
    keyDownFieldNode("Summary", "ArrowDown");
    expect(fieldNodeNames()).toEqual(["Title", "Summary"]);
  } finally {
    React.act(() => root.unmount());
  }
});

test("selects an unselected field node with Enter and Space", async () => {
  const root = mount();
  try {
    await flush();
    const enter = keyDownFieldNode("Summary", "Enter");
    expect(enter.defaultPrevented).toBe(true);
    expect(inputByLabel("Field name")?.value).toBe("summary");

    const space = keyDownFieldNode("Title", " ");
    expect(space.defaultPrevented).toBe(true);
    expect(inputByLabel("Field name")?.value).toBe("title");
  } finally {
    React.act(() => root.unmount());
  }
});

test("moves fields with the toolbar arrow buttons", async () => {
  const root = mount();
  try {
    await flush();
    const downButton = container!.querySelector<HTMLButtonElement>(
      'button[aria-label="Move field down"]'
    );
    clickDomButton(downButton, "Move field down");
    expect(fieldNodeNames()).toEqual(["Summary", "Title"]);
    const upButton = Array.from(
      container!.querySelectorAll<HTMLButtonElement>('button[aria-label="Move field up"]')
    ).at(-1);
    clickDomButton(upButton, "Move field up");
    expect(fieldNodeNames()).toEqual(["Title", "Summary"]);
  } finally {
    React.act(() => root.unmount());
  }
});

test("boundary moves are no-ops for the first and last field", async () => {
  const root = mount();
  try {
    await flush();
    keyDownFieldNode("Title", "ArrowUp");
    expect(fieldNodeNames()).toEqual(["Title", "Summary"]);
    const disabledUps = Array.from(
      container!.querySelectorAll('button[aria-label="Move field up"][disabled]')
    );
    const disabledDowns = Array.from(
      container!.querySelectorAll('button[aria-label="Move field down"][disabled]')
    );
    expect(disabledUps).toHaveLength(1);
    expect(disabledDowns).toHaveLength(1);
  } finally {
    React.act(() => root.unmount());
  }
});

test("selects a different field and shows its settings", async () => {
  const root = mount();
  try {
    await flush();
    clickFieldNode("Summary");
    expect(inputByLabel("Field name")?.value).toBe("summary");
  } finally {
    React.act(() => root.unmount());
  }
});

test("edits a field name and discards changes", async () => {
  const root = mount();
  try {
    await flush();
    setInputValue(inputByLabel("Field name"), "headline");
    expect(inputByLabel("Field name")?.value).toBe("headline");
    clickButton("Discard");
    expect(fieldNodeNames()).toEqual(["Title", "Summary"]);
    expect(inputByLabel("Field name")?.value).toBe("title");
  } finally {
    React.act(() => root.unmount());
  }
});

test("blocks saving on invalid field names and shows the error", async () => {
  const root = mount();
  try {
    await flush();
    setInputValue(inputByLabel("Field name"), "My Title");
    expect(text()).toContain("Use kebab-case (e.g. hero-title).");
    const save = findButton("Save");
    expect(save?.hasAttribute("disabled")).toBe(true);
  } finally {
    React.act(() => root.unmount());
  }
});

test("shows a default value error for required fields", async () => {
  const root = mount();
  try {
    await flush();
    React.act(() => {
      switchByOrder(0)?.click();
    });
    expect(text()).toContain("Required fields need a default value.");
  } finally {
    React.act(() => root.unmount());
  }
});

test("rejects select options without labels or values on save", async () => {
  const root = mount();
  try {
    await flush();
    clickButton("Select");
    clickButton("Add option");
    setInputValue(inputByPlaceholder("Label"), "");
    clickButton("Save");
    await flush();
    expect(text()).toContain("Select options need labels and values.");
  } finally {
    React.act(() => root.unmount());
  }
});

test("rejects duplicate select option values from a persisted schema without saving", async () => {
  const duplicateSchema: ContentSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      status: {
        type: "string",
        title: "Status",
        xFieldType: "select",
        xFieldConfig: {
          select: {
            options: [
              { id: "status-draft", label: "Draft", value: "same" },
              { id: "status-published", label: "Published", value: "same" },
            ],
          },
        },
      },
    },
  };
  const persistedType: ContentTypeSummary = {
    id: "ct-1",
    name: "Articles",
    slug: "articles",
    schema: duplicateSchema,
    status: "draft",
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
  };
  state.list = [persistedType];
  state.type = persistedType;
  const root = mount();
  try {
    await flush();
    expect(text()).toContain("Status");

    clickButton("Save");
    await flush();

    expect(text()).toContain("Select option values must be unique.");
    expect(state.updateContentType).not.toHaveBeenCalled();
  } finally {
    React.act(() => root.unmount());
  }
});

test("manages select options through the settings panel", async () => {
  const root = mount();
  try {
    await flush();
    clickButton("Select");
    clickButton("Add option");
    setInputValue(inputByPlaceholder("Label"), "Draft");
    clickButton("Add option");
    const labelInputs = Array.from(
      container!.querySelectorAll<HTMLInputElement>('input[placeholder="Label"]')
    );
    setInputValue(labelInputs[labelInputs.length - 1]!, "Published");
    const moveUp = container!.querySelector<HTMLButtonElement>(
      'button[aria-label^="Move Published"]'
    );
    clickDomButton(moveUp, "Move Published option");
    const removeFirst = container!.querySelector<HTMLButtonElement>(
      'button[aria-label^="Move Draft"]'
    );
    clickDomButton(removeFirst, "Move Draft option");
    const multiple = Array.from(
      container!.querySelectorAll<HTMLInputElement>('[data-slot="switch"]')
    )[1];
    React.act(() => {
      multiple.click();
    });
    clickButton("Save");
    await flush();
    expect(state.updateContentType).toHaveBeenCalled();
  } finally {
    React.act(() => root.unmount());
  }
});

test("rejects number config with minimum above maximum", async () => {
  const root = mount();
  try {
    await flush();
    clickButton("Number");
    setInputValue(inputByLabel("Min value"), "10");
    setInputValue(inputByLabel("Max value"), "5");
    clickButton("Save");
    await flush();
    expect(text()).toContain("Number field minimum cannot exceed maximum.");
  } finally {
    React.act(() => root.unmount());
  }
});

test("rejects a non-positive number step on save", async () => {
  const root = mount();
  try {
    await flush();
    clickButton("Number");
    setInputValue(inputByLabel("Step"), "0");
    clickButton("Save");
    await flush();
    expect(text()).toContain("Number field step must be positive.");
  } finally {
    React.act(() => root.unmount());
  }
});

test("rejects decimal defaults on integer number fields", async () => {
  const root = mount();
  try {
    await flush();
    clickButton("Number");
    clickSelectItem("integer");
    setInputValue(inputByLabel("Default value"), "1.5");
    clickButton("Save");
    await flush();
    expect(text()).toContain("Integer number fields cannot use decimal defaults.");
  } finally {
    React.act(() => root.unmount());
  }
});

test("saves successfully after fixing a validation error", async () => {
  const root = mount();
  try {
    await flush();
    setInputValue(inputByLabel("Field name"), "My Title");
    clickButton("Save");
    setInputValue(inputByLabel("Field name"), "headline");
    clickButton("Save");
    await flush();
    expect(state.updateContentType).toHaveBeenCalled();
  } finally {
    React.act(() => root.unmount());
  }
});

test("preview toggles the schema json panel", async () => {
  const root = mount();
  try {
    await flush();
    expect(text()).not.toContain("Schema Preview");
    clickButton("Preview");
    expect(text()).toContain("Schema Preview");
    expect(text()).toContain('"title"');
    clickButton("Hide preview");
    expect(text()).not.toContain("Schema Preview");
  } finally {
    React.act(() => root.unmount());
  }
});

test("surfaces api errors from save", async () => {
  state.updateContentType.mockRejectedValueOnce({
    kind: "http_error",
    message: "save boom",
  });
  const root = mount();
  try {
    await flush();
    clickButton("Save");
    await flush();
    expect(text()).toContain("Unable to load schema");
    expect(text()).toContain("save boom");
  } finally {
    React.act(() => root.unmount());
  }
});

test("shows a generic save error for non-api failures", async () => {
  state.updateContentType.mockRejectedValueOnce(new Error("write failed"));
  const root = mount();
  try {
    await flush();
    clickButton("Save");
    await flush();
    expect(text()).toContain("Unable to load schema");
    expect(text()).toContain("Failed to save schema.");
  } finally {
    React.act(() => root.unmount());
  }
});

test("removes the selected field from the settings panel", async () => {
  const root = mount();
  try {
    await flush();
    clickFieldNode("Summary");
    clickButton("Remove field");
    expect(fieldNodeNames()).toEqual(["Title"]);
    expect(text()).toContain("1 fields");
  } finally {
    React.act(() => root.unmount());
  }
});
