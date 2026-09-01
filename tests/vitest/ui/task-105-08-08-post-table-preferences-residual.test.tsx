// @vitest-environment happy-dom

// TASK-105-08-08-L02 residual suite: the posts table date contract and the post
// editor preference persistence seams.
//   1. PostsTable renders a malformed persisted timestamp verbatim (the repaired
//      `formatDate` fallback) while valid timestamps keep their formatting.
//   2. The table's row actions, selection, and empty state stay driven by real
//      controls.
//   3. `usePostEditorPreferences` keeps reading stored/local values and persists
//      every user-driven preference change through the `setUserSetting` client
//      seam, including the rejected-transport path.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { PostsTable } from "../../../core/admin/ui/posts/PostsTable";
import {
  DEFAULT_POST_EDITOR_PREFERENCES,
  normalizePostEditorPreferences,
  toStoredPostEditorPreferences,
  type PostEditorPreferences,
} from "../../../core/admin/ui/posts/editor/settings/postEditorPreferences";
import {
  POST_EDITOR_PREFERENCES_STORAGE_KEY,
  resolveStoredPostEditorPreferences,
  usePostEditorPreferences,
} from "../../../core/admin/ui/posts/editor/hooks/usePostEditorPreferences";

const tableState = vi.hoisted(() => ({ rowCallbacks: {} as Record<string, unknown> }));

const preferencesClientState = vi.hoisted(() => {
  const state = {
    storedSettings: {} as Record<string, unknown>,
    nextGetError: null as unknown,
    nextSetError: null as unknown,
    getUserSettingsCalls: [] as Array<{ force?: boolean }>,
    setUserSettingCalls: [] as Array<{ key: string; value: unknown }>,
    getUserSettingsHandler: null as
      ((options: { force?: boolean }) => Promise<Record<string, unknown>>) | null,
    reset() {
      state.storedSettings = {};
      state.nextGetError = null;
      state.nextSetError = null;
      state.getUserSettingsCalls = [];
      state.setUserSettingCalls = [];
      state.getUserSettingsHandler = null;
    },
  };
  return state;
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({
    children,
    colSpan,
    className,
  }: {
    children?: React.ReactNode;
    colSpan?: number;
    className?: string;
  }) => (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  ),
  TableHead: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children, ...props }: React.ComponentProps<"tr">) => <tr {...props}>{children}</tr>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    "aria-label": ariaLabel,
    checked,
    onCheckedChange,
  }: {
    "aria-label"?: string;
    checked?: boolean | "indeterminate";
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked === true}
      data-indeterminate={String(checked === "indeterminate")}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/ui/shared/AdminLink", () => ({
  AdminLink: ({
    children,
    href,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    href: string;
    prefetch?: boolean;
    "aria-label"?: string;
  }) => (
    <a href={href} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

vi.mock("../../../core/admin/ui/pages/PageRowActions", () => ({
  PageRowActions: ({
    actionLabel,
    onEdit,
    onPreview,
    onPublish,
    onUnpublish,
    onDuplicate,
    onDelete,
  }: {
    actionLabel?: string;
    onEdit: () => void;
    onPreview: () => void;
    onPublish: () => void;
    onUnpublish: () => void;
    onDuplicate: () => void;
    onDelete?: () => void;
  }) => (
    <div data-action-label={actionLabel}>
      <button type="button" onClick={onEdit}>
        edit-post
      </button>
      <button type="button" onClick={onPreview}>
        preview-post
      </button>
      <button type="button" onClick={onPublish}>
        publish-post
      </button>
      <button type="button" onClick={onUnpublish}>
        unpublish-post
      </button>
      <button type="button" onClick={onDuplicate}>
        duplicate-post
      </button>
      {onDelete ? (
        <button type="button" onClick={onDelete}>
          delete-post
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("@/services/userSettingsClient", () => ({
  getUserSettings: vi.fn(async (options: { force?: boolean } = {}) => {
    preferencesClientState.getUserSettingsCalls.push(options);
    if (preferencesClientState.getUserSettingsHandler) {
      return preferencesClientState.getUserSettingsHandler(options);
    }
    if (preferencesClientState.nextGetError) {
      const error = preferencesClientState.nextGetError;
      preferencesClientState.nextGetError = null;
      throw error;
    }
    return preferencesClientState.storedSettings;
  }),
  setUserSetting: vi.fn(async (key: string, value: unknown) => {
    preferencesClientState.setUserSettingCalls.push({ key, value });
    if (preferencesClientState.nextSetError) {
      const error = preferencesClientState.nextSetError;
      preferencesClientState.nextSetError = null;
      throw error;
    }
    preferencesClientState.storedSettings[key] = value;
    return { ok: true };
  }),
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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === text
  );
  if (!button) throw new Error(`Missing button: ${text}`);
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setStoredPreferences = (value: PostEditorPreferences) => {
  window.localStorage.setItem(
    POST_EDITOR_PREFERENCES_STORAGE_KEY,
    JSON.stringify(toStoredPostEditorPreferences(value))
  );
};

const postRow = (overrides: Record<string, unknown> = {}) => ({
  id: "post-1",
  typeId: "post",
  title: "Table post",
  slug: "table-post",
  status: "draft" as const,
  data: {},
  createdAt: "2026-03-12T09:00:00.000Z",
  updatedAt: "2026-03-12T09:05:00.000Z",
  publishedAt: "2026-03-12T10:00:00.000Z",
  scheduledAt: null,
  author: { id: "author-1", name: "Ada Lovelace", email: "ada@example.com" },
  ...overrides,
});

const requiredTableCallbacks = {
  onEdit: vi.fn(),
  onPreview: vi.fn(),
  onPublish: vi.fn(),
  onUnpublish: vi.fn(),
  onDuplicate: vi.fn(),
};

afterEach(() => {
  vi.clearAllMocks();
  preferencesClientState.reset();
  window.localStorage.clear();
});

test("PostsTable renders a malformed persisted timestamp verbatim instead of Invalid Date", () => {
  const view = mount(
    <PostsTable
      items={[
        postRow({
          id: "post-bad",
          title: "Broken date",
          slug: "broken-date",
          publishedAt: "not-a-date",
        }),
        postRow({ id: "post-good", title: "Good date", slug: "good-date" }),
        postRow({ id: "post-none", title: "No date", slug: "no-date", publishedAt: null }),
      ]}
      {...requiredTableCallbacks}
    />
  );

  try {
    // The malformed value is shown exactly as persisted: display-only fallback,
    // never an "Invalid Date" placeholder and never written back.
    expect(view.container.textContent).not.toContain("Invalid Date");
    const brokenCell = Array.from(view.container.querySelectorAll("td")).find((cell) =>
      cell.querySelector('a[href="/posts/post-bad"]')
    );
    expect(brokenCell?.textContent).toContain("not-a-date");
    const brokenTime = brokenCell?.querySelector("time");
    expect(brokenTime?.getAttribute("datetime")).toBe("not-a-date");
    expect(brokenTime?.textContent).toBe("not-a-date");

    // Valid timestamps keep the existing locale formatting.
    const goodCell = Array.from(view.container.querySelectorAll("td")).find((cell) =>
      cell.querySelector('a[href="/posts/post-good"]')
    );
    expect(goodCell?.querySelector("time")?.getAttribute("datetime")).toBe(
      "2026-03-12T10:00:00.000Z"
    );
    expect(goodCell?.textContent).toContain("Mar 12, 2026");

    // Missing timestamps keep the em-dash placeholder.
    const noneCell = Array.from(view.container.querySelectorAll("td")).find((cell) =>
      cell.querySelector('a[href="/posts/post-none"]')
    );
    expect(noneCell?.querySelector("time")?.textContent).toBe("—");
  } finally {
    view.cleanup();
  }
});

test("PostsTable keeps every row action, selection, and delete affordance reachable", () => {
  const onDelete = vi.fn();
  const onTogglePost = vi.fn();
  const onToggleAll = vi.fn();
  const view = mount(
    <PostsTable
      items={[postRow(), postRow({ id: "post-2", title: "Second post", slug: "second-post" })]}
      selectedIds={["post-2"]}
      onDelete={onDelete}
      onTogglePost={onTogglePost}
      onToggleAll={onToggleAll}
      {...requiredTableCallbacks}
    />
  );

  try {
    const firstRow = Array.from(view.container.querySelectorAll("tbody tr")).find((row) =>
      row.querySelector('a[href="/posts/post-1"]')
    );
    expect(firstRow?.getAttribute("class")).not.toContain("bg-primary-soft");
    const secondRow = Array.from(view.container.querySelectorAll("tbody tr")).find((row) =>
      row.querySelector('a[href="/posts/post-2"]')
    );
    expect(secondRow?.getAttribute("class")).toContain("bg-primary-soft");

    clickByText(view.container, "edit-post");
    clickByText(view.container, "preview-post");
    clickByText(view.container, "publish-post");
    clickByText(view.container, "unpublish-post");
    clickByText(view.container, "duplicate-post");
    clickByText(view.container, "delete-post");

    for (const callback of Object.values(requiredTableCallbacks)) {
      expect(callback).toHaveBeenCalledWith("post-1");
    }
    expect(onDelete).toHaveBeenCalledWith("post-1");

    const rowCheckbox = view.container.querySelector<HTMLInputElement>(
      'input[aria-label="Select Table post"]'
    );
    expect(rowCheckbox?.checked).toBe(false);
    React.act(() => {
      rowCheckbox?.click();
    });
    expect(onTogglePost).toHaveBeenCalledWith("post-1");

    const allCheckbox = view.container.querySelector<HTMLInputElement>(
      'input[aria-label="Select all posts"]'
    );
    React.act(() => {
      allCheckbox?.click();
    });
    expect(onToggleAll).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("PostsTable renders the empty state message", () => {
  const view = mount(
    <PostsTable items={[]} emptyMessage="No posts in this view." {...requiredTableCallbacks} />
  );

  try {
    expect(view.container.textContent).toContain("No posts in this view.");
    expect(view.container.querySelector<HTMLTableCellElement>("tbody td")?.colSpan).toBe(6);
    expect(view.container.querySelectorAll("tbody tr")).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});

const PreferenceProbe = () => {
  const { preferences, initialPreferences, hasStoredValue, setPreferences, resetPreferences } =
    usePostEditorPreferences();
  return (
    <div>
      <span>{`density:${preferences.editorDensity}`}</span>
      <span>{`focus:${String(preferences.focusModeOnOpen)}`}</span>
      <span>{`hints:${String(preferences.showKeyboardHints)}`}</span>
      <span>{`stored:${String(hasStoredValue)}`}</span>
      <span>{`initial-density:${initialPreferences.editorDensity}`}</span>
      <button
        type="button"
        onClick={() =>
          setPreferences({ ...preferences, editorDensity: "compact", focusModeOnOpen: true })
        }
      >
        set-compact
      </button>
      <button type="button" onClick={() => resetPreferences()}>
        reset-preferences
      </button>
    </div>
  );
};

const mountPreferenceProbe = () => mount(<PreferenceProbe />);

test("stored preferences short-circuit the user-settings sync and feed the editor", () => {
  setStoredPreferences({ ...DEFAULT_POST_EDITOR_PREFERENCES, editorDensity: "compact" });

  const view = mountPreferenceProbe();
  try {
    expect(view.container.textContent).toContain("density:compact");
    expect(view.container.textContent).toContain("stored:true");
    // A stored value is authoritative: no settings transport is used.
    expect(preferencesClientState.getUserSettingsCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("user settings normalize into defaults and the next change persists through the client seam", async () => {
  preferencesClientState.storedSettings = {
    "posts.editor.preferences": {
      version: 2,
      editorDensity: "compact",
      focusModeOnOpen: "yes",
      defaultInspectorTab: "block",
      showOutlineHints: false,
    },
  };

  const view = mountPreferenceProbe();
  try {
    await flush();
    expect(view.container.textContent).toContain("density:compact");
    expect(view.container.textContent).toContain("focus:false");
    expect(view.container.textContent).toContain("stored:false");

    React.act(() => {
      clickByText(view.container, "set-compact");
    });
    await flush();

    expect(preferencesClientState.setUserSettingCalls).toHaveLength(1);
    expect(preferencesClientState.setUserSettingCalls[0]?.key).toBe("posts.editor.preferences");
    expect(preferencesClientState.setUserSettingCalls[0]?.value).toMatchObject({
      version: 2,
      editorDensity: "compact",
      focusModeOnOpen: true,
      defaultInspectorTab: "block",
      showOutlineHints: false,
    });

    const storedRaw = window.localStorage.getItem(POST_EDITOR_PREFERENCES_STORAGE_KEY);
    expect(storedRaw).not.toBeNull();
    expect(JSON.parse(storedRaw ?? "{}")).toMatchObject({
      version: 2,
      editorDensity: "compact",
      focusModeOnOpen: true,
    });
  } finally {
    view.cleanup();
  }
});

test("a rejected preference write is swallowed and the local mirror still updates", async () => {
  const view = mountPreferenceProbe();
  try {
    await flush();
    expect(view.container.textContent).toContain("density:comfortable");
    // The change right after the settings sync is mirrored locally only: the
    // sync already announced this state to the server.
    React.act(() => {
      clickByText(view.container, "set-compact");
    });
    await flush();
    expect(preferencesClientState.setUserSettingCalls).toHaveLength(0);
    expect(view.container.textContent).toContain("density:compact");
    expect(
      JSON.parse(window.localStorage.getItem(POST_EDITOR_PREFERENCES_STORAGE_KEY) ?? "{}")
    ).toMatchObject({ editorDensity: "compact" });

    // The next change is a real transport write, and a rejected write is
    // swallowed instead of surfacing as an editor error.
    preferencesClientState.nextSetError = new Error("Preference write rejected.");
    React.act(() => {
      clickByText(view.container, "reset-preferences");
    });
    await flush();

    expect(preferencesClientState.setUserSettingCalls).toHaveLength(1);
    expect(view.container.textContent).toContain("density:comfortable");
    expect(
      JSON.parse(window.localStorage.getItem(POST_EDITOR_PREFERENCES_STORAGE_KEY) ?? "{}")
    ).toMatchObject({ editorDensity: "comfortable", focusModeOnOpen: false });

    // A later healthy write still goes through the same client seam.
    React.act(() => {
      clickByText(view.container, "set-compact");
    });
    await flush();
    expect(preferencesClientState.setUserSettingCalls).toHaveLength(2);
    expect(view.container.textContent).toContain("density:compact");
    expect(view.container.textContent).toContain("focus:true");
  } finally {
    view.cleanup();
  }
});

test("a late settings response never overrides preferences the user already changed", async () => {
  const deferred: { resolve: (value: Record<string, unknown>) => void } = {
    resolve: () => undefined,
  };
  const pending = new Promise<Record<string, unknown>>((resolve) => {
    deferred.resolve = resolve;
  });
  preferencesClientState.getUserSettingsHandler = () => pending;

  const view = mountPreferenceProbe();
  try {
    React.act(() => {
      clickByText(view.container, "set-compact");
    });
    expect(view.container.textContent).toContain("density:compact");

    deferred.resolve({
      "posts.editor.preferences": { version: 2, editorDensity: "comfortable" },
    });
    await flush();

    // The late server value loses to the local edit; the change itself was
    // already written out while the sync was still in flight.
    expect(view.container.textContent).toContain("density:compact");
    expect(preferencesClientState.setUserSettingCalls).toHaveLength(1);

    // The next user change is persisted again now that the sync settled.
    React.act(() => {
      clickByText(view.container, "reset-preferences");
    });
    await flush();
    expect(preferencesClientState.setUserSettingCalls).toHaveLength(2);
    expect(view.container.textContent).toContain("density:comfortable");
  } finally {
    view.cleanup();
  }
});

test("settings sync failures keep the local defaults usable", async () => {
  preferencesClientState.nextGetError = new Error("Settings unavailable.");
  const view = mountPreferenceProbe();

  try {
    await flush();
    expect(view.container.textContent).toContain("density:comfortable");
    expect(view.container.textContent).toContain("focus:false");
    expect(view.container.textContent).toContain("stored:false");
    expect(
      JSON.parse(window.localStorage.getItem(POST_EDITOR_PREFERENCES_STORAGE_KEY) ?? "{}")
    ).toMatchObject({ version: 2, editorDensity: "comfortable" });
  } finally {
    view.cleanup();
  }
});

test("legacy stored preferences migrate onto the current storage key", () => {
  window.localStorage.setItem(
    "nextless.posts.editor.preferences.v1",
    JSON.stringify({ ...DEFAULT_POST_EDITOR_PREFERENCES, editorDensity: "compact" })
  );

  const resolved = resolveStoredPostEditorPreferences(window.localStorage);
  expect(resolved.hasStoredValue).toBe(true);
  expect(resolved.preferences.editorDensity).toBe("compact");
  expect(
    JSON.parse(window.localStorage.getItem(POST_EDITOR_PREFERENCES_STORAGE_KEY) ?? "{}")
  ).toMatchObject({ version: 2, editorDensity: "compact" });
});

test("unreadable or corrupt stored preferences fall back to defaults", () => {
  // A corrupt payload is ignored rather than trusted.
  window.localStorage.setItem(POST_EDITOR_PREFERENCES_STORAGE_KEY, "{not-json");

  const corrupt = resolveStoredPostEditorPreferences(window.localStorage);
  expect(corrupt.hasStoredValue).toBe(false);
  expect(corrupt.preferences).toEqual(DEFAULT_POST_EDITOR_PREFERENCES);

  // A previous-generation payload still migrates forward.
  window.localStorage.setItem(
    "nextless.posts.editor.preferences.v2",
    JSON.stringify({ ...DEFAULT_POST_EDITOR_PREFERENCES, showKeyboardHints: false })
  );
  const migrated = resolveStoredPostEditorPreferences(window.localStorage);
  expect(migrated.hasStoredValue).toBe(true);
  expect(migrated.preferences.showKeyboardHints).toBe(false);
  expect(
    JSON.parse(window.localStorage.getItem(POST_EDITOR_PREFERENCES_STORAGE_KEY) ?? "{}")
  ).toMatchObject({ version: 2, showKeyboardHints: false });
});

test("the preference normalizer rejects malformed shapes instead of trusting them", () => {
  expect(normalizePostEditorPreferences("nope")).toEqual(DEFAULT_POST_EDITOR_PREFERENCES);
  expect(normalizePostEditorPreferences(null)).toEqual(DEFAULT_POST_EDITOR_PREFERENCES);
  expect(
    normalizePostEditorPreferences({
      editorDensity: "spacious",
      defaultInspectorTab: "sidebar",
      focusModeOnOpen: "yes",
      compactSidePanels: 0,
      showOutlineHints: undefined,
      showKeyboardHints: true,
      restoreLastSidebarsState: false,
    })
  ).toEqual({
    ...DEFAULT_POST_EDITOR_PREFERENCES,
    focusModeOnOpen: false,
    compactSidePanels: false,
    showOutlineHints: true,
    showKeyboardHints: true,
    restoreLastSidebarsState: false,
  });
  expect(tableState.rowCallbacks).toEqual({});
});
