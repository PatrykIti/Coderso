// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ContentTypeCreateDrawer } from "../../../core/admin/ui/content-types/ContentTypeCreateDrawer";
import type { ContentTypeSummary } from "../../../core/admin/services/contentTypesClient";
import { flush, setInputValue } from "./contentListWaveTestUtils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  createContentType: vi.fn(),
}));

vi.mock("@/services/contentTypesClient", () => ({
  createContentType: mocks.createContentType,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "kind" in error),
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-slot="alert" data-variant={variant}>
      {children}
    </div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="alert-description">{children}</div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

let sheetOnOpenChange: ((nextOpen: boolean) => void) | null = null;

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (nextOpen: boolean) => void;
  }) => {
    sheetOnOpenChange = onOpenChange;
    return open ? <div data-slot="sheet">{children}</div> : null;
  },
  SheetClose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

let container: HTMLDivElement | null = null;
let mountedRoot: ReturnType<typeof createRoot> | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  mocks.createContentType.mockReset();
  sheetOnOpenChange = null;
});

afterEach(() => {
  const root = mountedRoot;
  if (root) {
    React.act(() => {
      root.unmount();
    });
    mountedRoot = null;
  }
  container?.remove();
  container = null;
});

function mount(props?: { open?: boolean; existingTypes?: Array<{ name: string; slug: string }> }) {
  const onOpenChange = vi.fn();
  const onCreated = vi.fn();
  const onCreateError = vi.fn();
  const root = createRoot(container!);
  mountedRoot = root;
  React.act(() => {
    root.render(
      <ContentTypeCreateDrawer
        open={props?.open ?? true}
        onOpenChange={onOpenChange}
        existingTypes={props?.existingTypes}
        onCreated={onCreated}
        onCreateError={onCreateError}
      />
    );
  });
  return { onOpenChange, onCreated, onCreateError };
}

function createButton() {
  return Array.from(container!.querySelectorAll("button")).find(
    (button) => button.textContent === "Create Collection"
  )!;
}

function nameInput() {
  return container!.querySelector<HTMLInputElement>('input[placeholder="Blog Post"]');
}

function slugInput() {
  return container!.querySelector<HTMLInputElement>('input[placeholder="blog-posts"]');
}

function typeName(value: string) {
  React.act(() => {
    setInputValue(nameInput(), value);
  });
}

function typeSlug(value: string) {
  React.act(() => {
    setInputValue(slugInput(), value);
  });
}

function clickButton(button: HTMLButtonElement) {
  React.act(() => {
    button.click();
  });
}

const makeCreatedContentType = (): ContentTypeSummary => ({
  id: "ct-new",
  name: "Article",
  slug: "article",
  schema: { type: "object", additionalProperties: false, properties: {} },
  status: "draft",
  createdAt: "2025-01-15T10:00:00Z",
  updatedAt: "2025-01-15T10:00:00Z",
});

describe("ContentTypeCreateDrawer", () => {
  test("renders nothing when closed", () => {
    mount({ open: false });
    expect(container!.querySelector('[data-slot="sheet"]')).toBeNull();
  });

  test("renders the form and derives the slug from the name", () => {
    mount({});
    expect(container!.textContent).toContain("Create New Collection");
    expect(container!.textContent).toContain("Define the content type before building fields.");
    typeName("My  Blog  Post!");
    expect(slugInput()!.value).toBe("my-blog-post");
    expect(createButton().disabled).toBe(false);
  });

  test("keeps a manually edited slug after the name changes", () => {
    mount({});
    typeSlug("custom-slug");
    typeName("Blog Post");
    expect(slugInput()!.value).toBe("custom-slug");
  });

  test("disables the submit button until name and slug are present", () => {
    mount({});
    expect(createButton().disabled).toBe(true);
    typeName("   ");
    expect(createButton().disabled).toBe(true);
  });

  test("blocks duplicate names and slugs with inline errors", () => {
    mount({
      existingTypes: [
        { name: "Blog Post", slug: "blog-posts" },
        { name: "Category", slug: "category" },
      ],
    });
    typeName("Blog Post");
    expect(container!.textContent).toContain("This name is already used by another content type.");
    expect(createButton().disabled).toBe(true);
    typeName("Category");
    expect(container!.textContent).toContain("This slug is already used by another content type.");
  });

  test("creates the content type and closes the drawer on success", async () => {
    const created = makeCreatedContentType();
    mocks.createContentType.mockResolvedValue(created);
    const { onOpenChange, onCreated } = mount({});
    typeName("Article");
    clickButton(createButton());
    await flush();
    expect(mocks.createContentType).toHaveBeenCalledWith({
      name: "Article",
      slug: "article",
      schema: expect.any(Object),
      status: "draft",
    });
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("shows the saving label while the request is in flight", async () => {
    let resolveCreate!: (value: ContentTypeSummary) => void;
    mocks.createContentType.mockImplementation(
      () =>
        new Promise<ContentTypeSummary>((resolve) => {
          resolveCreate = resolve;
        })
    );
    mount({});
    typeName("Article");
    clickButton(createButton());
    await flush();
    expect(container!.textContent).toContain("Creating...");
    React.act(() => {
      resolveCreate(makeCreatedContentType());
    });
    await flush();
    expect(container!.textContent).not.toContain("Creating...");
  });

  test("renders an api error message from a failed create", async () => {
    mocks.createContentType.mockRejectedValue({ kind: "api", message: "slug_taken" });
    const { onCreateError } = mount({});
    typeName("Article");
    clickButton(createButton());
    await flush();
    expect(container!.textContent).toContain("slug_taken");
    expect(onCreateError).toHaveBeenCalledWith({ kind: "api", message: "slug_taken" });
  });

  test("renders a generic failure message for a non-api create error", async () => {
    mocks.createContentType.mockRejectedValue(new Error("network down"));
    const { onCreateError } = mount({});
    typeName("Article");
    clickButton(createButton());
    await flush();
    expect(container!.textContent).toContain("Failed to create content type.");
    expect(onCreateError).toHaveBeenCalled();
  });

  test("resets the form when the drawer is closed", () => {
    const { onOpenChange } = mount({});
    typeName("Article");
    typeSlug("article-slug");
    expect(nameInput()!.value).toBe("Article");
    expect(slugInput()!.value).toBe("article-slug");

    const handleOpenChange = sheetOnOpenChange;
    expect(handleOpenChange).toBeTypeOf("function");
    if (!handleOpenChange) throw new Error("Sheet onOpenChange handler was not captured");

    React.act(() => {
      handleOpenChange(false);
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(nameInput()!.value).toBe("");
    expect(slugInput()!.value).toBe("");
  });

  test("closes the drawer through the cancel button", () => {
    const { onOpenChange } = mount({});
    const cancelButton = Array.from(container!.querySelectorAll("button")).find(
      (button) => button.textContent === "Cancel"
    )!;
    clickButton(cancelButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
