// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { BlockList } from "../../../core/admin/ui/pages/builder/BlockList";
import { ProductGalleryAdvancedEditor } from "../../../core/admin/ui/widgets/editors/ProductGalleryEditors";
import type { ProductGalleryData } from "../../../core/widgets/core/productGallery";
import type { WidgetPreviewState } from "../../../core/widgets/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input value={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    [key: string]: unknown;
  }) => <textarea value={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
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
}));

const previewQueue = vi.hoisted(() => {
  const queue: Array<{
    promise: Promise<unknown>;
    resolve: (value: unknown) => void;
  }> = [];

  return {
    push() {
      let resolve!: (value: unknown) => void;
      const promise = new Promise((resolver) => {
        resolve = resolver;
      });
      queue.push({ promise, resolve });
      return queue[queue.length - 1];
    },
    shift() {
      return queue.shift() ?? null;
    },
    clear() {
      queue.splice(0, queue.length);
    },
  };
});

const previewProductGalleryMock = vi.hoisted(() =>
  vi.fn(async () => {
    const next = previewQueue.shift();
    if (!next) {
      return {
        items: [],
        total: 0,
        resolvedAt: "2026-05-19T12:00:00.000Z",
      };
    }
    return next.promise;
  })
);

vi.mock("@/services/productGalleryPreviewClient", () => ({
  previewProductGallery: previewProductGalleryMock,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("../../../core/widgets/renderers/widgetRenderer", () => ({
  WidgetRenderer: ({
    block,
    renderContext,
  }: {
    block: { id: string; data: { resolved?: { items?: Array<{ title?: string }> } } };
    renderContext?: { previewState?: WidgetPreviewState | null };
  }) => (
    <div data-widget-renderer={block.id}>
      {block.data.resolved?.items?.[0]?.title ?? "empty"}
      {renderContext?.previewState?.status ? `:${renderContext.previewState.status}` : ""}
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/pages/builder/BlockToolbar", () => ({
  BlockToolbar: () => null,
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
    rerender(next: React.ReactNode) {
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

const flushPromises = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
};

const clickButton = (container: ParentNode, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((element) =>
    (element.textContent ?? "").toLowerCase().includes(label.toLowerCase())
  );
  if (!(button instanceof HTMLButtonElement)) return;
  React.act(() => {
    button.click();
  });
};

afterEach(() => {
  vi.restoreAllMocks();
  previewProductGalleryMock.mockClear();
  previewQueue.clear();
});

test("ProductGallery preview hook ignores stale async responses", async () => {
  const first = previewQueue.push();
  const second = previewQueue.push();
  let setSourceLimit: ((limit: number) => void) | null = null;
  let latestPreviewState: WidgetPreviewState | null = null;

  const Harness = () => {
    const [value, setValue] = useState<ProductGalleryData>({
      source: { limit: 4 },
    });
    const [previewState, setPreviewState] = useState<WidgetPreviewState | null>(null);

    setSourceLimit = (limit: number) =>
      setValue((current) => ({
        ...current,
        source: {
          ...(current.source ?? {}),
          limit,
        },
      }));

    return (
      <ProductGalleryAdvancedEditor
        value={value}
        onChange={setValue}
        variant="cards"
        context={{
          surface: "page-builder",
          blockId: "gallery-1",
          editorMode: "advanced",
          previewState,
          setPreviewState: (next) => {
            latestPreviewState = next;
            setPreviewState(next);
          },
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flushPromises();
    React.act(() => {
      setSourceLimit?.(8);
    });
    await flushPromises();
    expect((latestPreviewState as WidgetPreviewState | null)?.status).toBe("idle");
    clickButton(view.container, "Refresh products");
    await flushPromises();

    first.resolve({
      items: [
        {
          id: "product-1",
          title: "Stale preview",
          slug: "stale-preview",
          excerpt: null,
          status: "published",
          pricing: { amount: 19900, currency: "USD", compareAtAmount: null },
          stock: { state: "in_stock", quantity: 1, inStock: true },
          primaryMediaId: null,
          mediaIds: [],
          collectionIds: [],
        },
      ],
      total: 1,
      resolvedAt: "2026-05-19T12:00:00.000Z",
    });
    second.resolve({
      items: [
        {
          id: "product-2",
          title: "Fresh preview",
          slug: "fresh-preview",
          excerpt: null,
          status: "published",
          pricing: { amount: 29900, currency: "USD", compareAtAmount: null },
          stock: { state: "in_stock", quantity: 2, inStock: true },
          primaryMediaId: null,
          mediaIds: [],
          collectionIds: [],
        },
      ],
      total: 1,
      resolvedAt: "2026-05-19T12:01:00.000Z",
    });

    await flushPromises();
    await flushPromises();

    const resolvedPreviewState = latestPreviewState as WidgetPreviewState | null;
    expect(resolvedPreviewState?.status).toBe("ready");
    expect(resolvedPreviewState?.dataPatch?.resolved).toMatchObject({
      items: [{ title: "Fresh preview" }],
    });
  } finally {
    view.cleanup();
  }
});

test("BlockList applies ProductGallery preview dataPatch to the canvas renderer", () => {
  const view = mount(
    <BlockList
      blocks={[
        {
          id: "gallery-1",
          type: "product-gallery",
          variant: "cards",
          data: {},
        },
      ]}
      selectedId="gallery-1"
      onSelect={() => undefined}
      onInsert={() => undefined}
      onMove={() => undefined}
      onDelete={() => undefined}
      onDuplicate={() => undefined}
      previewStatesByBlockId={{
        "gallery-1": {
          status: "ready",
          dataPatch: {
            resolved: {
              items: [{ title: "Preview card" }],
              total: 1,
              resolvedAt: "2026-05-19T12:00:00.000Z",
            },
          },
        },
      }}
    />
  );

  try {
    expect(view.container.textContent).toContain("Preview card");
    expect(view.container.textContent).toContain("ready");
  } finally {
    view.cleanup();
  }
});

test("ProductGallery preview key includes the block id when the source is unchanged", async () => {
  let setBlockId: ((next: string) => void) | null = null;
  let latestPreviewState: WidgetPreviewState | null = null;

  const Harness = () => {
    const [blockId, updateBlockId] = useState("gallery-1");
    const [previewState, setPreviewState] = useState<WidgetPreviewState | null>(null);
    setBlockId = updateBlockId;

    return (
      <ProductGalleryAdvancedEditor
        value={{ source: { limit: 4 } }}
        onChange={() => undefined}
        variant="cards"
        context={{
          surface: "page-builder",
          blockId,
          editorMode: "advanced",
          previewState,
          setPreviewState: (next) => {
            latestPreviewState = next;
            setPreviewState(next);
          },
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flushPromises();
    React.act(() => {
      setBlockId?.("gallery-2");
    });
    await flushPromises();

    expect(previewProductGalleryMock).toHaveBeenCalledTimes(1);
    expect((latestPreviewState as WidgetPreviewState | null)?.status).toBe("idle");
    clickButton(view.container, "Refresh products");
    await flushPromises();

    expect(previewProductGalleryMock).toHaveBeenCalledTimes(2);
    expect((latestPreviewState as WidgetPreviewState | null)?.requestKey).toContain("gallery-2");
  } finally {
    view.cleanup();
  }
});

test("ProductGallery advanced status surfaces preview-time runtime warnings", async () => {
  const queued = previewQueue.push();

  let latestPreviewState: WidgetPreviewState | null = null;

  const Harness = () => {
    const [previewState, setPreviewState] = useState<WidgetPreviewState | null>(null);
    return (
      <ProductGalleryAdvancedEditor
        value={{ source: { limit: 4 } }}
        onChange={() => undefined}
        variant="cards"
        context={{
          surface: "page-builder",
          blockId: "gallery-1",
          editorMode: "advanced",
          previewState,
          setPreviewState: (next) => {
            latestPreviewState = next;
            setPreviewState(next);
          },
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    queued.resolve({
      items: [],
      total: 0,
      resolvedAt: "2026-05-19T12:05:00.000Z",
      error: "commerce_query_invalid_filters",
    });

    await flushPromises();
    await flushPromises();

    const resolvedPreviewState = latestPreviewState as WidgetPreviewState | null;
    expect(resolvedPreviewState?.status).toBe("ready");
    expect(view.container.textContent).toContain("Runtime warning: commerce_query_invalid_filters");
  } finally {
    view.cleanup();
  }
});
