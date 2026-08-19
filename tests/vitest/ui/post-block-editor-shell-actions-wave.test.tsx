// @vitest-environment happy-dom

import React from "react";
import { test, expect, vi } from "vitest";
import {
  postShellState,
  toastState,
  taxonomyClientState,
  mount,
  flushMicrotasks,
} from "./postBlockEditorShellFixtures";

test("PostBlockEditorShell renders alerts and wires topbar, sidebar, and settings actions", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");

  const view = mount(<PostBlockEditorShell />);

  try {
    expect(view.container.textContent).toContain("Post editor error");
    expect(view.container.textContent).toContain("Autosave paused");
    expect(view.container.textContent).toContain("Post A");
    expect(view.container.textContent).toContain("Runtime preview:open");
    expect(view.container.textContent).toContain("settings:closed");

    const buttons = Array.from(view.container.querySelectorAll("button"));

    await React.act(async () => {
      buttons
        .find((button) => button.getAttribute("aria-label") === "Open runtime preview")
        ?.click();
      buttons.find((button) => button.getAttribute("aria-label") === "Publish post")?.click();
      buttons.find((button) => button.textContent === "open-revisions")?.click();
      buttons.find((button) => button.textContent === "toggle-inserter")?.click();
      buttons.find((button) => button.textContent === "toggle-outline")?.click();
      buttons.find((button) => button.textContent === "toggle-details")?.click();
      buttons.find((button) => button.textContent === "open-settings")?.click();
      buttons.find((button) => button.textContent === "toggle-focus-mode")?.click();
      buttons.find((button) => button.textContent === "close-secondary-shell")?.click();
      buttons.find((button) => button.textContent === "close-details-shell")?.click();
      buttons.find((button) => button.textContent === "reset-preferences")?.click();
      buttons.find((button) => button.textContent === "close-editor")?.click();
      await Promise.resolve();
    });

    expect(postShellState.editor.preview).toHaveBeenCalled();
    expect(postShellState.editor.publish).toHaveBeenCalled();
    expect(postShellState.editor.openRevisions).toHaveBeenCalled();
    expect(postShellState.layout.closeSecondarySidebar).toHaveBeenCalled();
    expect(postShellState.layout.setLeftRailMode).toHaveBeenCalledWith("outline");
    expect(postShellState.layout.openListView).toHaveBeenCalled();
    expect(postShellState.layout.toggleFocusMode).toHaveBeenCalled();
    expect(postShellState.layout.closeSecondarySidebar).toHaveBeenCalled();
    expect(postShellState.layout.closeDetails).toHaveBeenCalled();
    expect(postShellState.focusReturn).toHaveBeenCalled();
    expect(postShellState.preferences.resetPreferences).toHaveBeenCalled();
    expect(postShellState.navigate).toHaveBeenCalledWith("/admin/posts", {
      replace: true,
    });
  } finally {
    view.cleanup();
  }
});

test("PostBlockEditorShell retries autosave and emits publish success toast through shared adapter", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");

  const view = mount(<PostBlockEditorShell />);

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));

    await React.act(async () => {
      buttons.find((button) => button.textContent === "Retry now")?.click();
      buttons.find((button) => button.getAttribute("aria-label") === "Publish post")?.click();
      await flushMicrotasks();
    });

    expect(postShellState.editor.saveDraft).toHaveBeenCalledTimes(1);
    expect(postShellState.editor.publish).toHaveBeenCalledTimes(1);
    expect(toastState.success).toHaveBeenCalledWith("Post published");
    expect(toastState.error).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("PostBlockEditorShell closes a failed blank load after a zero-write flush", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");
  const previousEditorState = {
    error: postShellState.editor.error,
    autosaveError: postShellState.editor.autosaveError,
    loading: postShellState.editor.loading,
    canMutatePost: postShellState.editor.canMutatePost,
    title: postShellState.editor.title,
    hasUnsavedChanges: postShellState.editor.hasUnsavedChanges,
    post: postShellState.editor.post,
    state: postShellState.editor.state,
    selectedBlock: postShellState.editor.selectedBlock,
  };
  postShellState.editor.error = "Failed to load post editor.";
  postShellState.editor.autosaveError = null;
  postShellState.editor.loading = false;
  postShellState.editor.canMutatePost = false;
  postShellState.editor.title = "";
  postShellState.editor.hasUnsavedChanges = false;
  postShellState.editor.post = null as never;
  postShellState.editor.state = {
    ...postShellState.editor.state,
    document: {
      ...postShellState.editor.state.document,
      blocks: [],
    },
    selectedBlockId: null as never,
    saving: false,
  };
  postShellState.editor.selectedBlock = null;
  postShellState.editor.flushLatestAutosave.mockResolvedValueOnce(undefined);
  const view = mount(<PostBlockEditorShell />);

  try {
    expect(view.container.querySelector("[role='alert']")?.textContent).toContain(
      "Failed to load post editor."
    );
    expect(view.container.textContent).toContain("Edit Post");

    const close = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent === "close-editor"
    );
    expect(close).toBeDefined();
    expect(close?.disabled).toBe(false);
    for (const label of ["Open runtime preview", "Save draft", "Publish post"]) {
      expect(
        view.container.querySelector<HTMLButtonElement>(`button[aria-label='${label}']`)?.disabled
      ).toBe(true);
    }
    expect(
      Array.from(view.container.querySelectorAll("button")).find(
        (button) => button.textContent === "open-revisions"
      )?.disabled
    ).toBe(true);
    expect(view.container.textContent).toContain("Post editor is unavailable.");
    expect(view.container.textContent).toContain("Runtime preview:open");
    expect(
      view.container
        .querySelector("[data-runtime-can-preview]")
        ?.getAttribute("data-runtime-can-preview")
    ).toBe("false");

    await React.act(async () => {
      close?.click();
      close?.click();
      await flushMicrotasks();
    });

    expect(postShellState.editor.flushLatestAutosave).toHaveBeenCalledTimes(1);
    expect(postShellState.editor.saveDraft).not.toHaveBeenCalled();
    expect(postShellState.navigate).toHaveBeenCalledTimes(1);
    expect(postShellState.navigate).toHaveBeenCalledWith("/admin/posts", {
      replace: true,
    });
  } finally {
    view.cleanup();
    Object.assign(postShellState.editor, previousEditorState);
  }
});

test("PostBlockEditorShell closes a missing-ID route through one zero-write flush", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");
  postShellState.editor.postId = null as never;
  postShellState.editor.editorSessionKey = "[null,9]";
  postShellState.editor.post = null as never;
  postShellState.editor.loading = false;
  postShellState.editor.canMutatePost = false;
  postShellState.editor.error = "Post ID is missing.";
  postShellState.editor.autosaveError = null;
  postShellState.editor.flushLatestAutosave.mockResolvedValueOnce(undefined);
  const view = mount(<PostBlockEditorShell />);

  try {
    const close = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent === "close-editor"
    );
    expect(close?.disabled).toBe(false);
    await React.act(async () => {
      close?.click();
      close?.click();
      await flushMicrotasks();
    });
    expect(postShellState.editor.flushLatestAutosave).toHaveBeenCalledTimes(1);
    expect(postShellState.navigate).toHaveBeenCalledTimes(1);
    expect(postShellState.navigate).toHaveBeenCalledWith("/admin/posts", {
      replace: true,
    });
  } finally {
    view.cleanup();
  }
});

test("PostBlockEditorShell coalesces Close, waits for flush, and focuses Retry on failure", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");
  postShellState.editor.error = null;
  postShellState.editor.autosaveError = null;
  let rejectFlush: (error: unknown) => void = () => undefined;
  postShellState.editor.flushLatestAutosave.mockImplementationOnce(
    () =>
      new Promise<void>((_resolve, reject) => {
        rejectFlush = (error) => {
          postShellState.editor.autosaveError = "Failed to save latest changes before closing.";
          reject(error);
        };
      })
  );
  const view = mount(<PostBlockEditorShell />);

  try {
    const close = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent === "close-editor"
    );
    await React.act(async () => {
      close?.click();
      close?.click();
      await flushMicrotasks();
    });

    expect(postShellState.editor.flushLatestAutosave).toHaveBeenCalledTimes(1);
    expect(postShellState.navigate).not.toHaveBeenCalled();
    expect(close?.disabled).toBe(true);
    expect(close?.getAttribute("aria-busy")).toBe("true");
    expect(close?.getAttribute("data-post-editor-close-pending")).toBe("true");
    const editTitle = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent === "edit-canvas-title"
    );
    expect(editTitle?.disabled).toBe(false);
    await React.act(async () => {
      editTitle?.click();
      await flushMicrotasks();
    });
    expect(postShellState.editor.setTitle).toHaveBeenCalledWith("Post A edited during Close");

    await React.act(async () => {
      rejectFlush(new Error("save rejected"));
      await flushMicrotasks();
    });

    expect(postShellState.navigate).not.toHaveBeenCalled();
    expect(close?.disabled).toBe(false);
    const alert = view.container.querySelector("[role='alert']");
    const retry = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent === "Retry now"
    );
    expect(alert?.textContent).toContain("Failed to save latest changes before closing.");
    expect(retry).toBeDefined();
    expect(document.activeElement?.textContent).toContain("Retry now");

    await React.act(async () => {
      retry?.click();
      await flushMicrotasks();
    });
    expect(postShellState.editor.saveDraft).toHaveBeenCalledTimes(1);

    postShellState.editor.autosaveError = null;
    view.rerender(<PostBlockEditorShell />);
    const retryClose = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent === "close-editor"
    );
    await React.act(async () => {
      retryClose?.click();
      await flushMicrotasks();
    });
    expect(postShellState.editor.flushLatestAutosave).toHaveBeenCalledTimes(2);
    expect(postShellState.navigate).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("PostBlockEditorShell navigates once after Close flush and ignores late unmount resolution", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");
  let resolveFlush: () => void = () => undefined;
  postShellState.editor.flushLatestAutosave.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        resolveFlush = resolve;
      })
  );
  const completedView = mount(<PostBlockEditorShell />);
  const completedClose = Array.from(completedView.container.querySelectorAll("button")).find(
    (button) => button.textContent === "close-editor"
  );
  try {
    await React.act(async () => {
      completedClose?.click();
      resolveFlush();
      await flushMicrotasks();
    });
    expect(postShellState.navigate).toHaveBeenCalledTimes(1);
  } finally {
    completedView.cleanup();
  }

  postShellState.navigate.mockClear();
  postShellState.editor.flushLatestAutosave.mockReset();
  postShellState.editor.flushLatestAutosave.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        resolveFlush = resolve;
      })
  );
  const unmountedView = mount(<PostBlockEditorShell />);
  const unmountedClose = Array.from(unmountedView.container.querySelectorAll("button")).find(
    (button) => button.textContent === "close-editor"
  );
  await React.act(async () => {
    unmountedClose?.click();
    await flushMicrotasks();
  });
  unmountedView.cleanup();
  await React.act(async () => {
    resolveFlush();
    await flushMicrotasks();
  });
  expect(postShellState.navigate).not.toHaveBeenCalled();
});

test("PostBlockEditorShell commits B session before late A Close settles", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");
  let rejectCloseA: (error: unknown) => void = () => undefined;
  let resolveCloseB: () => void = () => undefined;
  const closeA = new Promise<void>((_resolve, reject) => {
    rejectCloseA = reject;
  });
  const closeB = new Promise<void>((resolve) => {
    resolveCloseB = resolve;
  });
  postShellState.editor.error = null;
  postShellState.editor.autosaveError = null;
  postShellState.editor.flushLatestAutosave
    .mockImplementationOnce(() => closeA)
    .mockImplementationOnce(() => closeB);
  const view = mount(<PostBlockEditorShell />);
  const findButton = (label: string) =>
    Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent === label
    );

  try {
    React.act(() => findButton("close-editor")?.click());
    postShellState.editor.editorSessionKey = '["post-2",1]';
    postShellState.editor.postId = "post-2";
    view.rerender(<PostBlockEditorShell />);
    postShellState.editor.autosaveError = "late A failure";
    await React.act(async () => {
      rejectCloseA(new Error("late A failure"));
      await flushMicrotasks();
    });
    view.rerender(<PostBlockEditorShell />);
    expect(postShellState.navigate).not.toHaveBeenCalled();
    expect(findButton("close-editor")?.disabled).toBe(false);
    expect(document.activeElement).not.toBe(findButton("Retry now"));

    postShellState.editor.autosaveError = null;
    view.rerender(<PostBlockEditorShell />);
    React.act(() => findButton("close-editor")?.click());
    expect(findButton("close-editor")?.disabled).toBe(true);
    await React.act(async () => {
      resolveCloseB();
      await flushMicrotasks();
    });
    expect(postShellState.navigate).toHaveBeenCalledTimes(1);
    expect(findButton("close-editor")?.disabled).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("PostBlockEditorShell scopes pending Close work to the exact A-to-B-to-A session", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");
  const createPendingClose = () => {
    let resolve: () => void = () => undefined;
    let reject: (error: unknown) => void = () => undefined;
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    return { promise, resolve, reject };
  };
  const closeA0 = createPendingClose();
  const closeB = createPendingClose();
  const closeA1 = createPendingClose();
  postShellState.editor.error = null;
  postShellState.editor.autosaveError = null;
  postShellState.editor.flushLatestAutosave
    .mockImplementationOnce(() => closeA0.promise)
    .mockImplementationOnce(() => closeB.promise)
    .mockImplementationOnce(() => closeA1.promise);
  const view = mount(<PostBlockEditorShell />);
  const findClose = () =>
    Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent === "close-editor"
    );

  try {
    await React.act(async () => {
      findClose()?.click();
      await flushMicrotasks();
    });
    expect(findClose()?.disabled).toBe(true);

    postShellState.editor.editorSessionKey = '["post-2",1]';
    postShellState.editor.postId = "post-2";
    view.rerender(<PostBlockEditorShell />);
    expect(findClose()?.disabled).toBe(false);
    await React.act(async () => {
      findClose()?.click();
      await flushMicrotasks();
    });
    expect(findClose()?.disabled).toBe(true);

    postShellState.editor.editorSessionKey = '["post-1",2]';
    postShellState.editor.postId = "post-1";
    view.rerender(<PostBlockEditorShell />);
    expect(findClose()?.disabled).toBe(false);
    await React.act(async () => {
      findClose()?.click();
      await flushMicrotasks();
    });
    expect(postShellState.editor.flushLatestAutosave).toHaveBeenCalledTimes(3);
    expect(findClose()?.disabled).toBe(true);

    postShellState.editor.autosaveError = "stale A0 failure";
    await React.act(async () => {
      closeA0.reject(new Error("stale A0 failure"));
      await flushMicrotasks();
    });
    view.rerender(<PostBlockEditorShell />);
    expect(postShellState.navigate).not.toHaveBeenCalled();
    expect(findClose()?.disabled).toBe(true);
    expect(document.activeElement).not.toBe(
      Array.from(view.container.querySelectorAll("button")).find(
        (button) => button.textContent === "Retry now"
      )
    );

    await React.act(async () => {
      closeB.resolve();
      await flushMicrotasks();
    });
    expect(postShellState.navigate).not.toHaveBeenCalled();
    expect(findClose()?.disabled).toBe(true);

    postShellState.editor.autosaveError = null;
    view.rerender(<PostBlockEditorShell />);
    await React.act(async () => {
      closeA1.resolve();
      await flushMicrotasks();
    });
    expect(postShellState.navigate).toHaveBeenCalledTimes(1);
    expect(findClose()?.disabled).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("PostBlockEditorShell unmounts revision confirmation across loading and ABA sessions", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");
  postShellState.editor.error = null;
  postShellState.editor.autosaveError = null;
  const view = mount(<PostBlockEditorShell />);
  const findButton = (label: string) =>
    Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent === label
    );

  try {
    React.act(() => findButton("begin-restore-confirm")?.click());
    expect(findButton("confirm-restore-revision")).toBeDefined();

    postShellState.editor.editorSessionKey = '["post-2",1]';
    postShellState.editor.postId = "post-2";
    postShellState.editor.loading = true;
    postShellState.editor.canMutatePost = false;
    view.rerender(<PostBlockEditorShell />);
    expect(findButton("confirm-restore-revision")).toBeUndefined();
    expect(findButton("begin-restore-confirm")).toBeUndefined();

    postShellState.editor.loading = false;
    postShellState.editor.canMutatePost = true;
    view.rerender(<PostBlockEditorShell />);
    expect(findButton("confirm-restore-revision")).toBeUndefined();
    React.act(() => findButton("begin-restore-confirm")?.click());
    expect(findButton("confirm-restore-revision")).toBeDefined();

    postShellState.editor.editorSessionKey = '["post-1",2]';
    postShellState.editor.postId = "post-1";
    view.rerender(<PostBlockEditorShell />);
    expect(findButton("confirm-restore-revision")).toBeUndefined();
    expect(postShellState.editor.restoreRevision).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("PostBlockEditorShell emits update success and bounded failure toasts", async () => {
  const { ApiClientError } = await import("../../../core/admin/services/apiClient");
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");

  postShellState.editor.status = "published";
  const updateView = mount(<PostBlockEditorShell />);

  try {
    const buttons = Array.from(updateView.container.querySelectorAll("button"));

    await React.act(async () => {
      buttons
        .find((button) => button.getAttribute("aria-label") === "Update published post")
        ?.click();
      await flushMicrotasks();
    });

    expect(toastState.success).toHaveBeenCalledWith("Changes saved");
  } finally {
    updateView.cleanup();
  }

  postShellState.reset();
  postShellState.editor.publish.mockRejectedValueOnce(
    new ApiClientError("post_publish_denied", "Publishing is unavailable.", 403)
  );
  const failureView = mount(<PostBlockEditorShell />);

  try {
    const buttons = Array.from(failureView.container.querySelectorAll("button"));

    await React.act(async () => {
      buttons.find((button) => button.getAttribute("aria-label") === "Publish post")?.click();
      await flushMicrotasks();
    });

    expect(toastState.error).toHaveBeenCalledWith("Publishing is unavailable.");
    expect(toastState.success).not.toHaveBeenCalled();
  } finally {
    failureView.cleanup();
  }
});

test("PostBlockEditorShell suppresses stale and identity-changed publish toasts", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");
  let resolveOldSuccess: () => void = () => undefined;
  let rejectOldFailure: (error: unknown) => void = () => undefined;
  const oldSuccess = new Promise<void>((resolve) => {
    resolveOldSuccess = resolve;
  });
  const oldFailure = new Promise<void>((_resolve, reject) => {
    rejectOldFailure = reject;
  });
  postShellState.editor.error = null;
  postShellState.editor.autosaveError = null;
  postShellState.editor.publish
    .mockImplementationOnce(() => oldSuccess)
    .mockImplementationOnce(() => oldFailure)
    .mockRejectedValueOnce(
      Object.assign(new Error("stale editor"), {
        code: "editor_identity_changed",
      })
    );
  const view = mount(<PostBlockEditorShell />);
  const publishButton = () =>
    view.container.querySelector<HTMLButtonElement>("button[aria-label='Publish post']");

  try {
    React.act(() => publishButton()?.click());
    postShellState.editor.editorSessionKey = '["post-2",1]';
    postShellState.editor.postId = "post-2";
    view.rerender(<PostBlockEditorShell />);
    await React.act(async () => {
      resolveOldSuccess();
      await flushMicrotasks();
    });
    expect(toastState.success).not.toHaveBeenCalled();
    expect(toastState.error).not.toHaveBeenCalled();

    React.act(() => publishButton()?.click());
    postShellState.editor.editorSessionKey = '["post-1",2]';
    postShellState.editor.postId = "post-1";
    view.rerender(<PostBlockEditorShell />);
    await React.act(async () => {
      rejectOldFailure(new Error("old B publish failed"));
      await flushMicrotasks();
    });
    expect(toastState.success).not.toHaveBeenCalled();
    expect(toastState.error).not.toHaveBeenCalled();

    await React.act(async () => {
      publishButton()?.click();
      await flushMicrotasks();
    });
    expect(toastState.success).not.toHaveBeenCalled();
    expect(toastState.error).not.toHaveBeenCalled();
    expect(postShellState.editor.publish).toHaveBeenCalledTimes(3);
  } finally {
    view.cleanup();
  }
});

test("PostBlockEditorShell hides raw taxonomy errors and retries overview loading", async () => {
  const { ApiClientError } = await import("../../../core/admin/services/apiClient");
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");

  postShellState.editor.post = {
    ...postShellState.editor.post,
    typeId: "post",
  } as never;
  taxonomyClientState.getTaxonomyOverview
    .mockRejectedValueOnce(
      new ApiClientError(
        "taxonomy_unexpected_error",
        'Failed query: select "content_terms"."id" from "content_terms"',
        500
      )
    )
    .mockResolvedValueOnce(taxonomyClientState.overview);

  const view = mount(<PostBlockEditorShell />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Could not load categories.");
    expect(view.container.textContent).not.toContain("Failed query");
    expect(view.container.textContent).not.toContain("content_terms");

    const retryButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent === "retry-taxonomy"
    );
    expect(retryButton).toBeInstanceOf(HTMLButtonElement);

    await React.act(async () => {
      (retryButton as HTMLButtonElement).click();
      await flushMicrotasks();
    });

    expect(taxonomyClientState.getTaxonomyOverview).toHaveBeenCalledTimes(2);
    expect(view.container.textContent).not.toContain("Failed query");
  } finally {
    view.cleanup();
    postShellState.editor.post = {
      updatedAt: "2026-03-08T10:00:00.000Z",
    } as never;
  }
});

test("PostBlockEditorShell handles move-to-trash confirm flow and list-view interactions", async () => {
  const { PostBlockEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostBlockEditorShell");

  postShellState.layout.showInserter = false;
  postShellState.layout.showListView = true;
  postShellState.layout.secondarySidebarOpen = true;
  postShellState.layout.state.secondarySidebar = "list-view";
  postShellState.editor.error = null;
  postShellState.editor.autosaveError = null;
  postShellState.editor.moveToTrash.mockResolvedValue(true);

  Object.defineProperty(window, "confirm", {
    configurable: true,
    writable: true,
    value: vi.fn(() => true),
  });

  const view = mount(<PostBlockEditorShell />);

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));

    React.act(() => {
      buttons.find((button) => button.textContent === "select-list-block")?.click();
      buttons.find((button) => button.textContent === "delete-list-block")?.click();
      buttons.find((button) => button.textContent === "move-list-block")?.click();
      buttons.find((button) => button.textContent === "insert-heading")?.click();
      buttons.find((button) => button.textContent === "set-left-rail-list")?.click();
      buttons.find((button) => button.textContent === "select-canvas-block")?.click();
      buttons.find((button) => button.textContent === "open-canvas-details")?.click();
    });

    expect(postShellState.editor.selectBlock).toHaveBeenCalledWith("block-3");
    expect(postShellState.editor.deleteBlock).toHaveBeenCalledWith("block-3");
    expect(postShellState.editor.moveBlockToIndex).toHaveBeenCalledWith("block-3", 4);
    expect(postShellState.editor.insertBlock).toHaveBeenCalledWith("heading", {
      source: "outline-plus",
      target: { mode: "after-selected" },
    });
    expect(postShellState.layout.setLeftRailMode).toHaveBeenCalledWith("list-view");
    expect(postShellState.editor.selectBlock).toHaveBeenCalledWith("block-2");
    expect(postShellState.layout.openDetails).toHaveBeenCalledWith("block");
  } finally {
    view.cleanup();
    Reflect.deleteProperty(window, "confirm");
  }
});
