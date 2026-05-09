// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { useCustomScreenPreviewRecordState } from "../../../core/admin/ui/custom-screens/customScreenPreviewData";

const cachedEntriesBySlug = new Map<string, Array<Record<string, unknown>> | null>();
const remoteEntriesBySlug = new Map<string, Array<Record<string, unknown>>>();
const listEntriesCached = vi.fn(async (typeSlug: string, _options?: { force?: boolean }) => {
  if (typeSlug === "articles") {
    throw new Error("read_failed");
  }
  return remoteEntriesBySlug.get(typeSlug) ?? [];
});
let cacheListener: ((event: { key: string }) => void) | null = null;

vi.mock("@/services/entriesClient", () => ({
  getCachedEntries: vi.fn((typeSlug: string) => cachedEntriesBySlug.get(typeSlug) ?? null),
  listEntriesCached: (typeSlug: string, options?: { force?: boolean }) =>
    listEntriesCached(typeSlug, options),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: vi.fn((handler: (event: { key: string }) => void) => {
    cacheListener = handler;
    return () => {
      cacheListener = null;
    };
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const projectsType = {
  id: "type-projects",
  name: "Projects",
  slug: "projects",
  status: "published" as const,
  schema: {
    type: "object" as const,
    additionalProperties: false as const,
    properties: {
      projectTitle: {
        type: "string" as const,
        title: "Project title",
        xFieldType: "text",
      },
    },
  },
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

const articlesType = {
  ...projectsType,
  id: "type-articles",
  name: "Articles",
  slug: "articles",
};

function Owner({ contentType }: { contentType: typeof projectsType | null }) {
  const { isLoading, previewRecordState } = useCustomScreenPreviewRecordState(contentType);

  return (
    <div>
      <span>{`loading:${String(isLoading)}`}</span>
      <span>{`source:${previewRecordState.source}`}</span>
      <span>{`entry:${previewRecordState.entryId ?? "none"}`}</span>
      <span>{`title:${String(previewRecordState.data.title ?? "")}`}</span>
      <span>{previewRecordState.note ?? "no-note"}</span>
    </div>
  );
}

function Harness() {
  const [contentType, setContentType] = useState<typeof projectsType | null>(projectsType);

  return (
    <div>
      <button type="button" onClick={() => setContentType(projectsType)}>
        Projects
      </button>
      <button type="button" onClick={() => setContentType(articlesType)}>
        Articles
      </button>
      <button type="button" onClick={() => setContentType(null)}>
        Clear
      </button>
      <Owner key={contentType?.slug ?? "no-content-type"} contentType={contentType} />
    </div>
  );
}

const mount = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(<Harness />);
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

const flush = async () => {
  await React.act(async () => {
    for (let index = 0; index < 4; index += 1) {
      await Promise.resolve();
    }
  });
};

beforeEach(() => {
  cachedEntriesBySlug.clear();
  remoteEntriesBySlug.clear();
  listEntriesCached.mockClear();
  cacheListener = null;
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("preview owner uses cached records first and revalidates on cache events", async () => {
  cachedEntriesBySlug.set("projects", [
    {
      id: "entry-1",
      typeId: "type-projects",
      title: "Cached project",
      slug: "cached-project",
      status: "draft",
      data: { projectTitle: "Cached project" },
      createdAt: "2026-05-02T10:00:00.000Z",
      updatedAt: "2026-05-02T11:00:00.000Z",
      publishedAt: null,
    },
  ]);
  remoteEntriesBySlug.set("projects", [
    {
      id: "entry-1",
      typeId: "type-projects",
      title: "Fresh project",
      slug: "fresh-project",
      status: "draft",
      data: { projectTitle: "Fresh project" },
      createdAt: "2026-05-02T10:00:00.000Z",
      updatedAt: "2026-05-02T12:00:00.000Z",
      publishedAt: null,
    },
  ]);

  const view = mount();

  try {
    expect(view.container.textContent).toContain("loading:false");
    expect(view.container.textContent).toContain("source:entry");
    expect(view.container.textContent).toContain("title:Cached project");
    expect(listEntriesCached).not.toHaveBeenCalled();

    React.act(() => {
      cacheListener?.({ key: cacheKeys.entriesList("projects") });
    });
    await flush();

    expect(listEntriesCached).toHaveBeenCalledWith("projects", { force: true });
    expect(view.container.textContent).toContain("title:Fresh project");
  } finally {
    view.cleanup();
  }
});

test("preview owner resets stale state on content-type changes and reports read failures explicitly", async () => {
  remoteEntriesBySlug.set("projects", [
    {
      id: "entry-1",
      typeId: "type-projects",
      title: "Fresh project",
      slug: "fresh-project",
      status: "draft",
      data: { projectTitle: "Fresh project" },
      createdAt: "2026-05-02T10:00:00.000Z",
      updatedAt: "2026-05-02T12:00:00.000Z",
      publishedAt: null,
    },
  ]);

  const view = mount();

  try {
    expect(view.container.textContent).toContain("loading:true");
    await flush();
    expect(view.container.textContent).toContain("title:Fresh project");

    const clearButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Clear")
    );
    React.act(() => {
      clearButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("entry:none");
    expect(view.container.textContent).toContain("Select a content type to preview this screen.");

    const articlesButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Articles")
    );
    React.act(() => {
      articlesButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("loading:true");

    await flush();
    expect(listEntriesCached).toHaveBeenCalledWith("articles", { force: false });
    expect(view.container.textContent).toContain("loading:false");
    expect(view.container.textContent).toContain(
      "Preview data could not be loaded. Showing schema fallback values until records can be read."
    );
  } finally {
    view.cleanup();
  }
});
