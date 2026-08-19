// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { useEntryRevisions } from "../../../core/admin/ui/entries/useEntryRevisions";
import { useEntryRuntimePreview } from "../../../core/admin/ui/entries/useEntryRuntimePreview";

type MockRevision = {
  id: string;
  entryId: string;
  version: number;
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
};

const hookState = vi.hoisted(() => {
  const revision: MockRevision = {
    id: "rev-2",
    entryId: "entry-42",
    version: 2,
    createdAt: "2026-06-20T09:30:00Z",
    createdBy: { id: "user-1", name: "Maria Nowak", email: "maria@example.com" },
  };
  return {
    revision,
    cachedRevisions: null as MockRevision[] | null,
    listResult: [] as MockRevision[],
    listError: null as unknown,
    revisionData: null as (MockRevision & { data: Record<string, unknown> }) | null,
    revisionDataError: null as unknown,
    restoreResult: null as { entry?: { id: string } } | null,
    restoreError: null as unknown,
    previewUrl: "https://preview.test/entry",
    previewError: null as unknown,
    listCalls: [] as Array<{ force?: boolean }>,
    reset() {
      this.cachedRevisions = null;
      this.listResult = [];
      this.listError = null;
      this.revisionData = null;
      this.revisionDataError = null;
      this.restoreResult = null;
      this.restoreError = null;
      this.previewUrl = "https://preview.test/entry";
      this.previewError = null;
      this.listCalls = [];
    },
  };
});

vi.mock("@/services/entriesClient", () => ({
  getCachedEntryRevisions: () => hookState.cachedRevisions,
  listEntryRevisionsCached: async (
    typeSlug: string,
    entryId: string,
    options?: { force?: boolean }
  ) => {
    hookState.listCalls.push({ force: options?.force });
    if (hookState.listError) throw hookState.listError;
    return hookState.listResult;
  },
  getEntryRevisionData: async () => {
    if (hookState.revisionDataError) throw hookState.revisionDataError;
    return hookState.revisionData;
  },
  restoreEntryRevision: async () => {
    if (hookState.restoreError) throw hookState.restoreError;
    return hookState.restoreResult;
  },
  previewEntry: async () => {
    if (hookState.previewError) throw hookState.previewError;
    return { previewUrl: hookState.previewUrl };
  },
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "ApiClientError",
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(node: React.ReactNode) {
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
}

const RevisionsHarness = ({
  typeSlug,
  entryId,
  onRestored,
}: {
  typeSlug: string | null;
  entryId: string | null;
  onRestored?: (entry: { id: string }) => void;
}) => {
  const revisions = useEntryRevisions({
    typeSlug,
    entryId,
    onRestored: onRestored ?? (() => undefined),
  });
  return (
    <div>
      <span data-open={String(revisions.revisionsOpen)} />
      <span data-loading={String(revisions.revisionsLoading)} />
      <span data-error={revisions.revisionsError ?? ""} />
      <span data-restoring={revisions.restoringId ?? ""} />
      <span data-preview-revision={revisions.revisionPreview.revisionId ?? ""} />
      <span data-preview-data={revisions.revisionPreview.data ? "has-data" : "no-data"} />
      <span data-preview-loading={String(revisions.revisionPreview.loading)} />
      <span data-preview-error={revisions.revisionPreview.error ?? ""} />
      <ul>
        {revisions.revisions.map((item) => (
          <li key={item.id}>{item.id}</li>
        ))}
      </ul>
      <button type="button" onClick={() => void revisions.handleOpenRevisions()}>
        open revisions
      </button>
      <button type="button" onClick={() => void revisions.handlePreviewRevision("rev-2")}>
        preview rev-2
      </button>
      <button type="button" onClick={() => void revisions.handleRestoreRevision("rev-2")}>
        restore rev-2
      </button>
    </div>
  );
};

const RuntimePreviewHarness = ({ type, id }: { type: string | null; id: string | null }) => {
  const preview = useEntryRuntimePreview(type, id);
  return (
    <div>
      <span data-preview-open={String(preview.previewOpen)} />
      <span data-preview-url={preview.previewUrl ?? ""} />
      <span data-preview-loading={String(preview.previewLoading)} />
      <span data-preview-error={preview.previewError ?? ""} />
      <button type="button" onClick={() => void preview.openPreview()}>
        open preview
      </button>
    </div>
  );
};

const read = (container: HTMLElement, key: string) =>
  container.querySelector(`[data-${key}]`)?.getAttribute(`data-${key}`) ?? "";

const click = (container: HTMLElement, label: string) => {
  React.act(() => {
    const button = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === label
    );
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

afterEach(() => {
  vi.restoreAllMocks();
  hookState.reset();
  document.body.innerHTML = "";
});

test("previewing and restoring without a type or entry id are no-ops", async () => {
  const view = mount(<RevisionsHarness typeSlug={null} entryId={null} />);
  try {
    await React.act(async () => {
      click(view.container, "preview rev-2");
      click(view.container, "restore rev-2");
      await Promise.resolve();
    });
    expect(read(view.container, "preview-revision")).toBe("");
    expect(read(view.container, "restoring")).toBe("");
    expect(read(view.container, "open")).toBe("false");
  } finally {
    view.cleanup();
  }
});

test("opening revisions without a type or entry id is a no-op", async () => {
  const view = mount(<RevisionsHarness typeSlug={null} entryId={null} />);
  try {
    await React.act(async () => {
      click(view.container, "open revisions");
      await Promise.resolve();
    });
    expect(read(view.container, "open")).toBe("false");
    expect(hookState.listCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("opening revisions without cache lists and clears the loading flag", async () => {
  hookState.listResult = [{ ...hookState.revision }];
  const view = mount(<RevisionsHarness typeSlug="articles" entryId="entry-42" />);
  try {
    await React.act(async () => {
      click(view.container, "open revisions");
      await Promise.resolve();
    });
    expect(read(view.container, "open")).toBe("true");
    expect(read(view.container, "loading")).toBe("false");
    expect(read(view.container, "error")).toBe("");
    expect(view.container.textContent).toContain("rev-2");
    expect(hookState.listCalls).toEqual([{ force: false }]);
  } finally {
    view.cleanup();
  }
});

test("opening revisions with a cache hydrates immediately and force-refreshes", async () => {
  hookState.cachedRevisions = [{ ...hookState.revision }];
  hookState.listResult = [{ ...hookState.revision, version: 3 }];
  const view = mount(<RevisionsHarness typeSlug="articles" entryId="entry-42" />);
  try {
    await React.act(async () => {
      click(view.container, "open revisions");
      await Promise.resolve();
    });
    expect(hookState.listCalls).toEqual([{ force: true }]);
    expect(view.container.textContent).toContain("rev-2");
  } finally {
    view.cleanup();
  }
});

test("a failed list fetch surfaces the message or a generic fallback", async () => {
  hookState.listError = new Error("revisions offline");
  const view = mount(<RevisionsHarness typeSlug="articles" entryId="entry-42" />);
  try {
    await React.act(async () => {
      click(view.container, "open revisions");
      await Promise.resolve();
    });
    expect(read(view.container, "error")).toBe("revisions offline");
    expect(read(view.container, "loading")).toBe("false");

    hookState.listError = "opaque failure";
    await React.act(async () => {
      click(view.container, "open revisions");
      await Promise.resolve();
    });
    expect(read(view.container, "error")).toBe("Failed to load revisions.");
  } finally {
    view.cleanup();
  }
});

test("previewing a revision renders its snapshot detail or the not-found message", async () => {
  hookState.listResult = [{ ...hookState.revision }];
  hookState.revisionData = { ...hookState.revision, data: { headline: "Hello" } };
  const view = mount(<RevisionsHarness typeSlug="articles" entryId="entry-42" />);
  try {
    await React.act(async () => {
      click(view.container, "preview rev-2");
      await Promise.resolve();
    });
    expect(read(view.container, "preview-revision")).toBe("rev-2");
    expect(read(view.container, "preview-data")).toBe("has-data");
    expect(read(view.container, "preview-loading")).toBe("false");
    expect(read(view.container, "preview-error")).toBe("");

    hookState.revisionData = null;
    await React.act(async () => {
      click(view.container, "preview rev-2");
      await Promise.resolve();
    });
    expect(read(view.container, "preview-error")).toBe("Revision not found.");
  } finally {
    view.cleanup();
  }
});

test("a failed preview fetch surfaces the message or a generic fallback", async () => {
  hookState.listResult = [{ ...hookState.revision }];
  hookState.revisionDataError = new Error("preview denied");
  const view = mount(<RevisionsHarness typeSlug="articles" entryId="entry-42" />);
  try {
    await React.act(async () => {
      click(view.container, "preview rev-2");
      await Promise.resolve();
    });
    expect(read(view.container, "preview-error")).toBe("preview denied");

    hookState.revisionDataError = "opaque preview failure";
    await React.act(async () => {
      click(view.container, "preview rev-2");
      await Promise.resolve();
    });
    expect(read(view.container, "preview-error")).toBe("Failed to load revision preview.");
  } finally {
    view.cleanup();
  }
});

test("restoring calls onRestored, refreshes, and closes the drawer", async () => {
  hookState.restoreResult = { entry: { id: "entry-42" } };
  hookState.listResult = [{ ...hookState.revision }];
  const onRestored = vi.fn();
  const view = mount(
    <RevisionsHarness typeSlug="articles" entryId="entry-42" onRestored={onRestored} />
  );
  try {
    await React.act(async () => {
      click(view.container, "restore rev-2");
      await Promise.resolve();
    });
    expect(onRestored).toHaveBeenCalledWith({ id: "entry-42" });
    expect(read(view.container, "open")).toBe("false");
    expect(read(view.container, "restoring")).toBe("");
    expect(hookState.listCalls).toContainEqual({ force: true });
  } finally {
    view.cleanup();
  }
});

test("a failed restore keeps the drawer open and surfaces the error", async () => {
  hookState.restoreError = new Error("restore locked");
  const view = mount(<RevisionsHarness typeSlug="articles" entryId="entry-42" />);
  try {
    await React.act(async () => {
      click(view.container, "restore rev-2");
      await Promise.resolve();
    });
    expect(read(view.container, "error")).toBe("restore locked");
    expect(read(view.container, "restoring")).toBe("");

    hookState.restoreError = "opaque restore failure";
    await React.act(async () => {
      click(view.container, "restore rev-2");
      await Promise.resolve();
    });
    expect(read(view.container, "error")).toBe("Failed to restore revision.");
  } finally {
    view.cleanup();
  }
});

test("runtime preview without a type or id clears its state without fetching", async () => {
  const view = mount(<RuntimePreviewHarness type={null} id={null} />);
  try {
    await React.act(async () => {
      click(view.container, "open preview");
      await Promise.resolve();
    });
    expect(read(view.container, "preview-open")).toBe("true");
    expect(read(view.container, "preview-url")).toBe("");
    expect(read(view.container, "preview-loading")).toBe("false");
    expect(read(view.container, "preview-error")).toBe("");
  } finally {
    view.cleanup();
  }
});

test("runtime preview resolves the preview url on success", async () => {
  const view = mount(<RuntimePreviewHarness type="articles" id="entry-42" />);
  try {
    await React.act(async () => {
      click(view.container, "open preview");
      await Promise.resolve();
    });
    expect(read(view.container, "preview-open")).toBe("true");
    expect(read(view.container, "preview-url")).toBe("https://preview.test/entry");
    expect(read(view.container, "preview-loading")).toBe("false");
    expect(read(view.container, "preview-error")).toBe("");
  } finally {
    view.cleanup();
  }
});

test("runtime preview surfaces api client errors and generic failures", async () => {
  hookState.previewError = { name: "ApiClientError", message: "preview unavailable" };
  const view = mount(<RuntimePreviewHarness type="articles" id="entry-42" />);
  try {
    await React.act(async () => {
      click(view.container, "open preview");
      await Promise.resolve();
    });
    expect(read(view.container, "preview-error")).toBe("preview unavailable");
    expect(read(view.container, "preview-url")).toBe("");

    hookState.previewError = new Error("boom");
    await React.act(async () => {
      click(view.container, "open preview");
      await Promise.resolve();
    });
    expect(read(view.container, "preview-error")).toBe("Failed to generate preview.");
  } finally {
    view.cleanup();
  }
});
