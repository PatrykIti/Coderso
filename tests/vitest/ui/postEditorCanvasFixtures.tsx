// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, vi } from "vitest";

import type { MediaRecord } from "../../../core/admin/services/mediaClient";

const mediaState = vi.hoisted(() => ({
  records: [
    {
      id: "media-1",
      key: "uploads/media-1.png",
      url: "/media/media-1.png",
      originalName: "hero-image.png",
      type: "image" as const,
      mimeType: "image/png",
      size: 1234,
      width: 1200,
      height: 800,
      alt: "Hero alt",
      title: "Hero title",
      caption: "Hero caption",
      createdAt: "2026-03-12T10:00:00.000Z",
    },
  ] as MediaRecord[],
  error: null as unknown,
  calls: [] as Array<boolean | undefined>,
  reset() {
    this.records = [
      {
        id: "media-1",
        key: "uploads/media-1.png",
        url: "/media/media-1.png",
        originalName: "hero-image.png",
        type: "image" as const,
        mimeType: "image/png",
        size: 1234,
        width: 1200,
        height: 800,
        alt: "Hero alt",
        title: "Hero title",
        caption: "Hero caption",
        createdAt: "2026-03-12T10:00:00.000Z",
      },
    ];
    this.error = null;
    this.calls = [];
  },
}));

const createMediaRecord = (
  id: string,
  type: MediaRecord["type"],
  mimeType: string,
  filename: string
): MediaRecord => ({
  id,
  key: `uploads/${filename}`,
  url: `/media/uploads/${filename}`,
  originalName: filename,
  type,
  mimeType,
  size: 1024,
  createdAt: "2026-07-11T00:00:00.000Z",
});

const createProjectedKindMediaRecords = (): MediaRecord[] => [
  createMediaRecord("passive-png", "image", "image/png", "passive.png"),
  createMediaRecord("active-svg", "file", "image/svg+xml", "active.svg"),
  createMediaRecord("unsupported-avif", "image", "image/avif", "unsupported.avif"),
  createMediaRecord("mismatched-png", "file", "image/png", "mismatched.png"),
  createMediaRecord("video", "file", "video/mp4", "clip.mp4"),
  createMediaRecord("audio", "file", "audio/mpeg", "sound.mp3"),
  createMediaRecord("document", "file", "application/pdf", "report.pdf"),
];

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div
      data-dialog-open={String(Boolean(open))}
      data-has-open-change={String(Boolean(onOpenChange))}
    >
      {open ? (
        <button type="button" onClick={() => onOpenChange?.(false)}>
          dialog-close
        </button>
      ) : null}
      {open ? children : null}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    [key: string]: unknown;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} {...props} />,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    onBlur,
    onFocus,
    placeholder,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onBlur?: () => void;
    onFocus?: () => void;
    placeholder?: string;
    [key: string]: unknown;
  }) => (
    <textarea
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      placeholder={placeholder}
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
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <option value={value}>{children}</option>
    ),
  };
});

vi.mock("@/ui/media/MediaGrid", () => ({
  MediaGrid: ({
    items,
    selectedId,
    selectedIds,
    onSelect,
  }: {
    items: Array<{ id: string; name: string }>;
    selectedId?: string | null;
    selectedIds?: string[];
    onSelect: (id: string) => void;
  }) => (
    <div>
      <span>{`media-grid:${items.length}`}</span>
      <span>{`selected-media:${selectedId ?? "none"}`}</span>
      <span>{`selected-media-list:${selectedIds?.join(",") ?? "none"}`}</span>
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onSelect(item.id)}>
          {`select-media:${item.name}`}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/mediaClient", () => ({
  listMediaCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    mediaState.calls.push(force);
    if (mediaState.error) throw mediaState.error;
    return mediaState.records;
  }),
}));

vi.mock("../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter", () => ({
  PostRichTextAdapter: ({
    value,
    onChange,
    onEditorBlur,
    onPasteDirectives,
    onSlashInsertBlock,
    onFocus,
    onBlockTypeChange,
    onFontFamilyChange,
    onBaseTextScaleChange,
    toolbarProfile,
    fontFamily,
    baseTextScale,
  }: {
    value: string;
    onChange: (next: string) => void;
    onEditorBlur?: (finalHtml: string) => void;
    onPasteDirectives?: (directives: { replaceWordTocWithDynamicToc: boolean }) => void;
    onSlashInsertBlock?: (type: "quote") => void;
    onFocus?: () => void;
    onBlockTypeChange?: (type: "heading", attrs?: Record<string, unknown>) => void;
    onFontFamilyChange?: (value: "serif") => void;
    onBaseTextScaleChange?: (value: "xl") => void;
    toolbarProfile?: string;
    fontFamily?: string;
    baseTextScale?: string;
  }) => (
    <div>
      <span>{`adapter:${value}`}</span>
      <span>{`adapter-profile:${toolbarProfile ?? "none"}`}</span>
      <span>{`adapter-typography:${fontFamily ?? "none"}:${baseTextScale ?? "none"}`}</span>
      <button type="button" onClick={() => onFocus?.()}>
        adapter-focus
      </button>
      <button type="button" onClick={() => onChange("<p>Changed</p>")}>
        adapter-change
      </button>
      <button type="button" onClick={() => onEditorBlur?.("<p>Blurred</p>")}>
        adapter-blur
      </button>
      <button
        type="button"
        onClick={() => onPasteDirectives?.({ replaceWordTocWithDynamicToc: true })}
      >
        adapter-directive
      </button>
      <button type="button" onClick={() => onSlashInsertBlock?.("quote")}>
        adapter-slash
      </button>
      <button type="button" onClick={() => onBlockTypeChange?.("heading", { level: 2 })}>
        adapter-transform
      </button>
      <button type="button" onClick={() => onFontFamilyChange?.("serif")}>
        adapter-font
      </button>
      <button type="button" onClick={() => onBaseTextScaleChange?.("xl")}>
        adapter-scale
      </button>
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

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const focusElement = (element: HTMLElement | null | undefined) => {
  if (!element) return;
  React.act(() => {
    element.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
  });
};

const blurElement = (element: HTMLElement | null | undefined) => {
  if (!element) return;
  React.act(() => {
    element.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    element.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
};

afterEach(() => {
  mediaState.reset();
  vi.restoreAllMocks();
});

export {
  mediaState,
  createMediaRecord,
  createProjectedKindMediaRecords,
  mount,
  clickByText,
  setInputValue,
  setTextareaValue,
  setSelectValue,
  flush,
  focusElement,
  blurElement,
};
