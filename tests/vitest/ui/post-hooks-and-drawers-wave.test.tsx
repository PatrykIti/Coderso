// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";

const userSettingsState = vi.hoisted(() => ({
  getUserSettings: vi.fn(async () => ({
    "posts.editor.preferences": {
      focusModeOnOpen: true,
      compactSidePanels: true,
      showOutlineHints: false,
      editorDensity: "compact",
      showKeyboardHints: false,
      defaultInspectorTab: "block",
      restoreLastSidebarsState: false,
    },
  })),
  setUserSetting: vi.fn(async () => undefined),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (open ? <div data-dialog-open="true">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-sheet-open={String(Boolean(open))} data-has-open-change={String(Boolean(onOpenChange))}>
      {children}
    </div>
  ),
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/services/userSettingsClient", () => ({
  getUserSettings: userSettingsState.getUserSettings,
  setUserSetting: userSettingsState.setUserSetting,
}));

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    rerender: (next: React.ReactNode) => {
      act(() => {
        root.render(next);
      });
    },
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

const setLocalStorage = (value?: ReturnType<typeof createLocalStorage>) => {
  if (value) {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      writable: true,
      value,
    });
    return;
  }

  if (originalLocalStorage) {
    Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
    return;
  }

  delete (globalThis as { localStorage?: unknown }).localStorage;
};

afterEach(() => {
  vi.restoreAllMocks();
  setLocalStorage();
  userSettingsState.getUserSettings.mockClear();
  userSettingsState.setUserSetting.mockClear();
});

test("focus return utilities capture, restore, clear, and gate close transitions", async () => {
  const { shouldReturnFocus, useFocusReturn } = await import(
    "../../../core/admin/ui/posts/editor/hooks/useFocusReturn"
  );

  expect(shouldReturnFocus(true, false)).toBe(true);
  expect(shouldReturnFocus(false, false)).toBe(false);
  expect(shouldReturnFocus(true, true)).toBe(false);

  let handle:
    | ReturnType<typeof useFocusReturn>
    | undefined;

  const Harness = () => {
    handle = useFocusReturn();
    return <div>focus-return</div>;
  };

  const button = document.createElement("button");
  document.body.appendChild(button);
  button.focus();

  const view = mount(<Harness />);

  try {
    const focusSpy = vi.spyOn(button, "focus");

    handle?.capture("inserter");
    handle?.returnFocus("inserter");
    expect(focusSpy).toHaveBeenCalledTimes(1);

    handle?.clear("inserter");
    handle?.returnFocus("inserter");
    expect(focusSpy).toHaveBeenCalledTimes(1);

    const another = document.createElement("button");
    document.body.appendChild(another);
    const anotherFocusSpy = vi.spyOn(another, "focus");
    handle?.capture("details", another);
    another.remove();
    handle?.returnFocus("details");
    expect(anotherFocusSpy).not.toHaveBeenCalled();

    handle?.capture("outline", { current: button });
    handle?.clear();
    handle?.returnFocus("outline");
    expect(focusSpy).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
    button.remove();
  }
});

test("usePostAutosave schedules, flushes, and cancels autosave work", async () => {
  vi.useFakeTimers();
  const { usePostAutosave } = await import(
    "../../../core/admin/ui/posts/editor/hooks/usePostAutosave"
  );

  const autosave = vi.fn(async () => undefined);
  let controls:
    | ReturnType<typeof usePostAutosave>
    | undefined;

  const Harness = ({
    enabled,
    dirty,
    signature,
  }: {
    enabled: boolean;
    dirty: boolean;
    signature: string;
  }) => {
    controls = usePostAutosave({
      enabled,
      dirty,
      signature,
      delayMs: 100,
      onAutosave: autosave,
    });
    return <div>autosave</div>;
  };

  const view = mount(<Harness enabled dirty signature="a" />);

  try {
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    expect(autosave).toHaveBeenCalledTimes(1);

    view.rerender(<Harness enabled dirty signature="b" />);
    await act(async () => {
      const flushed = await controls?.flush();
      expect(flushed).toBe(true);
    });
    expect(autosave).toHaveBeenCalledTimes(2);

    view.rerender(<Harness enabled={false} dirty signature="c" />);
    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });
    expect(autosave).toHaveBeenCalledTimes(2);

    view.rerender(<Harness enabled dirty signature="d" />);
    controls?.cancel();
    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });
    expect(autosave).toHaveBeenCalledTimes(2);
  } finally {
    view.cleanup();
    vi.useRealTimers();
  }
});

test("post editor preferences normalize stored values and sync local/remote state", async () => {
  const {
    DEFAULT_POST_EDITOR_PREFERENCES,
    normalizePostEditorPreferences,
    toStoredPostEditorPreferences,
  } = await import(
    "../../../core/admin/ui/posts/editor/settings/postEditorPreferences"
  );
  const {
    POST_EDITOR_PREFERENCES_STORAGE_KEY,
    POST_EDITOR_PREFERENCES_LEGACY_STORAGE_KEY,
    resolveStoredPostEditorPreferences,
    usePostEditorPreferences,
  } = await import(
    "../../../core/admin/ui/posts/editor/hooks/usePostEditorPreferences"
  );

  expect(normalizePostEditorPreferences(null)).toEqual(
    DEFAULT_POST_EDITOR_PREFERENCES
  );
  expect(
    normalizePostEditorPreferences({
      focusModeOnOpen: true,
      compactSidePanels: true,
      showOutlineHints: false,
      editorDensity: "compact",
      showKeyboardHints: false,
      defaultInspectorTab: "block",
      restoreLastSidebarsState: false,
    })
  ).toEqual({
    focusModeOnOpen: true,
    compactSidePanels: true,
    showOutlineHints: false,
    editorDensity: "compact",
    showKeyboardHints: false,
    defaultInspectorTab: "block",
    restoreLastSidebarsState: false,
  });

  const storage = createLocalStorage();
  storage.setItem(
    POST_EDITOR_PREFERENCES_LEGACY_STORAGE_KEY,
    JSON.stringify({ focusModeOnOpen: true, editorDensity: "compact" })
  );
  expect(resolveStoredPostEditorPreferences(storage)).toEqual({
    preferences: expect.objectContaining({
      focusModeOnOpen: true,
      editorDensity: "compact",
    }),
    hasStoredValue: true,
  });

  setLocalStorage(createLocalStorage());

  let result:
    | ReturnType<typeof usePostEditorPreferences>
    | undefined;

  const Harness = () => {
    result = usePostEditorPreferences();
    return <div>prefs</div>;
  };

  const view = mount(<Harness />);

  try {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result?.preferences).toEqual(
      expect.objectContaining({
        focusModeOnOpen: true,
        editorDensity: "compact",
        defaultInspectorTab: "block",
      })
    );

    await act(async () => {
      result?.setPreferences({
        focusModeOnOpen: false,
        compactSidePanels: true,
        showOutlineHints: true,
        editorDensity: "comfortable",
        showKeyboardHints: true,
        defaultInspectorTab: "post",
        restoreLastSidebarsState: true,
      });
      await Promise.resolve();
    });

    expect(userSettingsState.setUserSetting).toHaveBeenCalledWith(
      "posts.editor.preferences",
      toStoredPostEditorPreferences({
        focusModeOnOpen: false,
        compactSidePanels: true,
        showOutlineHints: true,
        editorDensity: "comfortable",
        showKeyboardHints: true,
        defaultInspectorTab: "post",
        restoreLastSidebarsState: true,
      })
    );

    await act(async () => {
      result?.resetPreferences();
      await Promise.resolve();
    });

    expect(result?.preferences).toEqual(DEFAULT_POST_EDITOR_PREFERENCES);
    expect(
      (globalThis.localStorage as ReturnType<typeof createLocalStorage>).getItem(
        POST_EDITOR_PREFERENCES_STORAGE_KEY
      )
    ).toContain("\"version\":2");
  } finally {
    view.cleanup();
  }
});

test("revision drawers render states and gate restore/discard with confirmation", async () => {
  const { PostRevisionDrawer } = await import(
    "../../../core/admin/ui/posts/editor/PostRevisionDrawer"
  );
  const { PageRevisionDrawer } = await import(
    "../../../core/admin/ui/pages/PageRevisionDrawer"
  );

  const onRestorePost = vi.fn();
  const onRestorePage = vi.fn();
  const onDiscardPage = vi.fn();
  const onOpenChange = vi.fn();

  const emptyHtml = renderToString(
    <>
      <PostRevisionDrawer
        open
        onOpenChange={onOpenChange}
        revisions={[]}
        isLoading
        error={null}
        restoringId={null}
        onRestore={onRestorePost}
      />
      <PageRevisionDrawer
        open
        onOpenChange={onOpenChange}
        revisions={[]}
        isLoading={false}
        error="Failed"
        onRestore={onRestorePage}
        onDiscard={onDiscardPage}
      />
    </>
  );

  expect(emptyHtml).toContain("Loading revisions...");
  expect(emptyHtml).toContain("Failed");
  expect(emptyHtml).toContain("Restore an earlier snapshot of this post.");

  const view = mount(
    <>
      <PostRevisionDrawer
        open
        onOpenChange={onOpenChange}
        revisions={[
          {
            id: "post-rev-1",
            version: 3,
            createdAt: "2026-03-06T12:00:00.000Z",
            createdBy: { name: "Admin", email: "admin@example.com" },
            data: {
              document: {
                blocks: [
                  { id: "a", content: "<p>First preview block</p>" },
                  { id: "b", content: "<p>Second preview block</p>" },
                ],
              },
            },
          } as never,
        ]}
        isLoading={false}
        error={null}
        restoringId={null}
        onRestore={onRestorePost}
      />
      <PageRevisionDrawer
        open
        onOpenChange={onOpenChange}
        revisions={[
          {
            id: "page-rev-1",
            version: 4,
            kind: "published",
            createdAt: "2026-03-06T12:00:00.000Z",
            createdBy: { name: "", email: "system@example.com" },
            title: "Landing",
            slug: "/landing",
          },
          {
            id: "page-rev-2",
            version: 5,
            kind: "autosave",
            createdAt: "2026-03-06T13:00:00.000Z",
            createdBy: { name: "Editor", email: "editor@example.com" },
            title: "Draft",
            slug: "/draft",
          },
        ] as never}
        isLoading={false}
        error={null}
        restoringId={null}
        discardingId={null}
        onRestore={onRestorePage}
        onDiscard={onDiscardPage}
      />
    </>
  );

  try {
    expect(view.container.textContent).toContain("Version 3");
    expect(view.container.textContent).toContain("2 blocks");
    expect(view.container.textContent).toContain("Preview");
    expect(view.container.textContent).toContain("Not saved");
    expect(view.container.textContent).toContain("Title: Landing");

    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Preview")
        ?.click();
    });

    expect(view.container.textContent).toContain("First preview block");

    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Restore")
        ?.click();
    });
    expect(view.container.textContent).toContain("Restore revision?");
    act(() => {
      const restoreButtons = Array.from(view.container.querySelectorAll("button"))
        .filter((button) => button.textContent === "Restore");
      restoreButtons[restoreButtons.length - 1]?.click();
    });

    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Discard")
        ?.click();
    });
    expect(view.container.textContent).toContain("Discard autosave?");
    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Discard autosave")
        ?.click();
    });

    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .filter((button) => button.textContent === "Restore")[1]
        ?.click();
    });
    expect(view.container.textContent).toContain("Restore autosave?");
    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Cancel")
        ?.click();
    });

    expect(onRestorePost).toHaveBeenCalledWith("post-rev-1");
    expect(onDiscardPage).toHaveBeenCalledWith("page-rev-2");
    expect(onRestorePage).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("PostRevisionDrawer renders useful fallback metadata for empty previews", async () => {
  const { PostRevisionDrawer } = await import(
    "../../../core/admin/ui/posts/editor/PostRevisionDrawer"
  );

  const view = mount(
    <PostRevisionDrawer
      open
      onOpenChange={() => undefined}
      revisions={[
        {
          id: "post-rev-empty",
          version: 7,
          createdAt: "2026-03-06T14:00:00.000Z",
          createdBy: { name: "", email: "editor@example.com" },
          data: {
            document: {
              blocks: [{ id: "media-block", type: "image", attrs: { mediaId: "media-1" } }],
            },
          },
        } as never,
      ]}
      isLoading={false}
      error={null}
      restoringId={null}
      onRestore={() => undefined}
    />
  );

  try {
    const previewButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent === "Preview"
    );
    if (!(previewButton instanceof HTMLButtonElement)) {
      throw new Error("missing preview button");
    }

    act(() => {
      previewButton.click();
    });

    expect(view.container.textContent).not.toContain(
      "No preview available for this revision."
    );
    expect(view.container.textContent).toContain("Version 7 by editor@example.com");
    expect(view.container.textContent).toContain(
      "Snapshot contains 1 block without extractable text."
    );
  } finally {
    view.cleanup();
  }
});
