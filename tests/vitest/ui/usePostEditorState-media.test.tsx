// @vitest-environment happy-dom

import React from "react";
import { test, expect } from "vitest";
import { hookState, mountHook, waitFor } from "./postEditorStateFixtures";

test("usePostEditorState reports restore and upload failures and handles move-to-trash outcomes", async () => {
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    hookState.nextRestoreError = hookState.apiError("Restore failed.");
    await React.act(async () => {
      await expect(view.current().restoreRevision("rev-404")).rejects.toMatchObject({
        message: "Restore failed.",
      });
    });
    expect(view.current().revisionsError).toBe("Restore failed.");

    hookState.nextUploadError = hookState.apiError("Upload failed.");
    await expect(
      view
        .current()
        .uploadClipboardImage(new File(["image"], "clipboard.png", { type: "image/png" }))
    ).rejects.toThrow("Upload failed.");

    hookState.nextDeleteError = hookState.apiError("Delete failed.");
    await React.act(async () => {
      await expect(view.current().moveToTrash()).resolves.toBe(false);
    });
    expect(view.current().error).toBe("Delete failed.");

    await React.act(async () => {
      await expect(view.current().moveToTrash()).resolves.toBe(true);
    });
    expect(hookState.deleteCalls).toEqual(["post-1", "post-1"]);
  } finally {
    view.cleanup();
  }
});
