// @vitest-environment happy-dom

import React, { lazy, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { WidgetEditorOutlet } from "../../../core/admin/ui/widgets/WidgetEditorOutlet";
import type {
  WidgetDefinition,
  WidgetEditorComponent,
  WidgetEditorProps,
} from "../../../core/widgets/types";

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h4>{children}</h4>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
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

const mockReload = vi.fn();

vi.mock("../../../core/admin/ui/widgets/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../core/admin/ui/widgets/registry")>();
  return {
    ...actual,
    reloadWidgetEditorLoader: (editor: unknown) => mockReload(editor),
  };
});

type EditorData = Record<string, unknown>;

const EagerEditor: ComponentType<WidgetEditorProps<EditorData>> = ({ value, onChange }) => (
  <div>
    <div>Eager visual editor: {String(value.title ?? "")}</div>
    <button type="button" onClick={() => onChange({ title: "from eager" })}>
      eager-change
    </button>
  </div>
);

const DeferredEditor: ComponentType<WidgetEditorProps<EditorData>> = () => (
  <div>Deferred visual editor</div>
);

const baseDefinition = (overrides: Partial<WidgetDefinition> = {}): WidgetDefinition => ({
  type: "outlet-test",
  title: "Outlet Test",
  category: "content",
  variants: [{ id: "alpha", label: "Alpha" }],
  schema: { type: "object" },
  defaults: {},
  editor: {
    wizard: EagerEditor,
    visual: EagerEditor,
    advanced: EagerEditor,
  },
  render: () => null,
  ...overrides,
});

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

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// React logs boundary-caught render errors to console.error in dev mode. The
// harness treats stray console.error as a test failure, so boundary tests that
// intentionally trigger a lazy import rejection suppress the expected log.
const suppressExpectedReactBoundaryError = () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
};

afterEach(() => {
  vi.restoreAllMocks();
});

test("widget editor outlet keeps non-lazy editors synchronous", () => {
  const view = mount(
    <WidgetEditorOutlet
      definition={baseDefinition()}
      mode="visual"
      value={{ title: "hello" }}
      onChange={() => {}}
      variant="alpha"
    />
  );

  try {
    expect(view.container.textContent).toContain("Eager visual editor: hello");
    expect(view.container.textContent).not.toContain("Loading");
  } finally {
    view.cleanup();
  }
});

test("widget editor outlet renders a local loading fallback before lazy editor mounts", async () => {
  let resolveLoader!: (module: { default: ComponentType<WidgetEditorProps<EditorData>> }) => void;
  const pending = new Promise<{ default: ComponentType<WidgetEditorProps<EditorData>> }>(
    (resolve) => {
      resolveLoader = resolve;
    }
  );
  const lazyEditor = lazy(() => pending) as WidgetEditorComponent<EditorData>;

  const view = mount(
    <WidgetEditorOutlet
      definition={baseDefinition({
        editor: { wizard: lazyEditor, visual: lazyEditor, advanced: lazyEditor },
      })}
      mode="visual"
      value={{}}
      onChange={() => {}}
      variant="alpha"
    />
  );

  try {
    expect(view.container.innerHTML).toContain('data-widget-editor-loading="visual"');
    expect(view.container.textContent).toMatch(/Loading Outlet Test visual editor/);

    await React.act(async () => {
      resolveLoader({ default: DeferredEditor });
    });

    expect(view.container.textContent).toContain("Deferred visual editor");
    expect(view.container.innerHTML).not.toContain("data-widget-editor-loading");
  } finally {
    view.cleanup();
  }
});

test("widget editor outlet isolates lazy loader failures and retries with a fresh loader", async () => {
  let firstResolve!: (module: { default: ComponentType<WidgetEditorProps<EditorData>> }) => void;
  let firstReject!: (error: unknown) => void;
  const failing = new Promise<{ default: ComponentType<WidgetEditorProps<EditorData>> }>(
    (resolve, reject) => {
      firstResolve = resolve;
      firstReject = reject;
    }
  );
  const failingEditor = lazy(() => failing) as WidgetEditorComponent<EditorData>;

  let retryResolve!: (module: { default: ComponentType<WidgetEditorProps<EditorData>> }) => void;
  const retryPromise = new Promise<{ default: ComponentType<WidgetEditorProps<EditorData>> }>(
    (resolve) => {
      retryResolve = resolve;
    }
  );
  const retryEditor = lazy(() => retryPromise) as WidgetEditorComponent<EditorData>;

  suppressExpectedReactBoundaryError();
  const onChange = vi.fn();
  const view = mount(
    <WidgetEditorOutlet
      definition={baseDefinition({
        editor: { wizard: failingEditor, visual: failingEditor, advanced: failingEditor },
      })}
      mode="visual"
      value={{ title: "kept" }}
      onChange={onChange}
      variant="alpha"
    />
  );

  try {
    await React.act(async () => {
      firstReject(new Error("chunk fetch failed"));
    });

    expect(view.container.innerHTML).toContain('data-widget-editor-error="visual"');
    expect(view.container.textContent).toContain("Editor failed to load");
    expect(view.container.textContent).toContain("block data is untouched");
    expect(onChange).not.toHaveBeenCalled();

    mockReload.mockReturnValue(retryEditor);

    const retryButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("data-widget-editor-retry") === "visual"
    );
    expect(retryButton).toBeTruthy();

    React.act(() => {
      retryButton?.click();
    });
    expect(mockReload).toHaveBeenCalledWith(failingEditor);

    await React.act(async () => {
      retryResolve({ default: DeferredEditor });
    });

    expect(view.container.textContent).toContain("Deferred visual editor");
    expect(view.container.innerHTML).not.toContain("data-widget-editor-error");
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("widget editor outlet resets stale errors and stale lazy state on selection change", async () => {
  let rejectLoader!: (error: unknown) => void;
  const failing = new Promise<{ default: ComponentType<WidgetEditorProps<EditorData>> }>(
    (_resolve, reject) => {
      rejectLoader = reject;
    }
  );
  const failingEditor = lazy(() => failing) as WidgetEditorComponent<EditorData>;
  suppressExpectedReactBoundaryError();
  const failingWidget = baseDefinition({
    type: "failing-type",
    editor: { wizard: failingEditor, visual: failingEditor, advanced: failingEditor },
  });

  const first = mount(
    <WidgetEditorOutlet
      definition={failingWidget}
      mode="visual"
      value={{}}
      onChange={() => {}}
      variant="alpha"
    />
  );

  try {
    await React.act(async () => {
      rejectLoader(new Error("chunk fetch failed"));
    });
    expect(first.container.innerHTML).toContain('data-widget-editor-error="visual"');
  } finally {
    first.cleanup();
  }

  // Switching to a different widget type must not show the stale crash for
  // the previous type and must render the eager editor synchronously.
  const second = mount(
    <WidgetEditorOutlet
      definition={baseDefinition({ type: "replacement-type" })}
      mode="visual"
      value={{ title: "fresh" }}
      onChange={() => {}}
      variant="alpha"
    />
  );

  try {
    expect(second.container.innerHTML).not.toContain("data-widget-editor-error");
    expect(second.container.textContent).toContain("Eager visual editor: fresh");
  } finally {
    second.cleanup();
  }
});
