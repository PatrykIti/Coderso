// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { ContentTypeSummary } from "../../../core/admin/services/contentTypesClient";
import type {
  ContentTaxonomy,
  ContentTerm,
  TaxonomyOverview,
} from "../../../core/admin/services/taxonomyClient";
import type { CacheEvent } from "../../../core/admin/utils/cacheBus";
import { useEntryRelationTargets } from "../../../core/admin/ui/entries/useEntryRelationTargets";
import { useEntryTaxonomyTermCreate } from "../../../core/admin/ui/entries/useEntryTaxonomyTermCreate";

type TaxonomyOverviewUpdater = (prev: TaxonomyOverview | null) => TaxonomyOverview | null;

const hookState = vi.hoisted(() => {
  const dates = {
    createdAt: "2026-06-18T10:00:00Z",
    updatedAt: "2026-06-27T10:00:00Z",
  };
  const taxonomy = (id: string, kind: "category" | "tag", name: string): ContentTaxonomy => ({
    id,
    typeId: "type-1",
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    kind,
    ...dates,
  });
  const term = (id: string, taxonomyId: string, name: string): ContentTerm => ({
    id,
    taxonomyId,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    ...dates,
  });
  const contentType = (slug: string, name: string): ContentTypeSummary => ({
    id: `type-${slug}`,
    slug,
    name,
    schema: { type: "object", additionalProperties: false, properties: {} },
    status: "published",
    ...dates,
  });
  return {
    contentType,
    taxonomy,
    term,
    terms: {
      categories: [term("cat-1", "tax-cat", "Beta"), term("cat-2", "tax-cat", "Alpha")],
      tags: [term("tag-1", "tax-tag", "News")],
    },
    cachedContentTypes: null as ContentTypeSummary[] | null,
    listResult: [] as ContentTypeSummary[],
    listError: null as unknown,
    createResult: null as ContentTerm | null,
    createError: null as unknown,
    listCalls: [] as Array<{ force?: boolean }>,
    emitCacheEvent: null as ((key: string) => void) | null,
    reset() {
      this.terms = {
        categories: [term("cat-1", "tax-cat", "Beta"), term("cat-2", "tax-cat", "Alpha")],
        tags: [term("tag-1", "tax-tag", "News")],
      };
      this.cachedContentTypes = null;
      this.listResult = [];
      this.listError = null;
      this.createResult = null;
      this.createError = null;
      this.listCalls = [];
      this.emitCacheEvent = null;
    },
  };
});

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => hookState.cachedContentTypes,
  listContentTypesCached: async (options?: { force?: boolean }) => {
    hookState.listCalls.push({ force: options?.force });
    if (hookState.listError) throw hookState.listError;
    return hookState.listResult;
  },
}));

vi.mock("@/services/taxonomyClient", () => ({
  createTaxonomyTerm: async (
    taxonomyId: string,
    input: { name: string; slug?: string | null }
  ): Promise<ContentTerm> => {
    if (hookState.createError) throw hookState.createError;
    return hookState.createResult ?? hookState.term("new-1", taxonomyId, input.name);
  },
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/utils/cacheBus", () => {
  const handlers: Array<(event: CacheEvent) => void> = [];
  return {
    subscribeCacheEvents: (handler: (event: CacheEvent) => void) => {
      handlers.push(handler);
      hookState.emitCacheEvent = (key: string) => {
        const event: CacheEvent = { key, action: "invalidate", sourceId: "test", ts: 1 };
        handlers.forEach((handler) => handler(event));
      };
      return () => {
        const index = handlers.indexOf(handler);
        if (index >= 0) handlers.splice(index, 1);
      };
    },
  };
});

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
    root,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

const RelationTargetsHarness = () => {
  const targets = useEntryRelationTargets();
  return (
    <div data-testid="targets">
      {targets.relationTargets.map((target) => (
        <span key={target.slug}>{`${target.slug}:${target.name}`}</span>
      ))}
    </div>
  );
};

const TaxonomyCreateHarness = ({
  setTaxonomyOverview,
  setError,
}: {
  setTaxonomyOverview: (updater: TaxonomyOverviewUpdater) => void;
  setError: (message: string) => void;
}) => {
  const overview: TaxonomyOverview = {
    taxonomies: {
      category: hookState.taxonomy("tax-cat", "category", "Category"),
      tag: hookState.taxonomy("tax-tag", "tag", "Tag"),
    },
    terms: {
      categories: hookState.terms.categories,
      tags: hookState.terms.tags,
    },
  };
  const create = useEntryTaxonomyTermCreate({
    taxonomyOverview: overview,
    setTaxonomyOverview,
    setError,
  });
  return (
    <div data-testid="create">
      <button
        data-testid="create-category"
        onClick={() => {
          void create("category", "Gamma");
        }}
      >
        create category
      </button>
      <button
        data-testid="create-tag"
        onClick={() => {
          void create("tag", "Video");
        }}
      >
        create tag
      </button>
    </div>
  );
};

const renderAndGrab = (harness: React.ReactNode) => {
  const view = mount(harness);
  return view;
};

afterEach(() => {
  hookState.reset();
});

test("useEntryRelationTargets seeds from cache and refreshes on cache bus events", async () => {
  hookState.cachedContentTypes = [hookState.contentType("post", "Post")];
  hookState.listResult = [
    hookState.contentType("post", "Post"),
    hookState.contentType("page", "Page"),
  ];
  const view = renderAndGrab(<RelationTargetsHarness />);
  expect(view.container.textContent).toContain("post:Post");

  expect(hookState.emitCacheEvent).not.toBeNull();
  hookState.emitCacheEvent?.("contentTypes:list");
  await React.act(async () => {
    await Promise.resolve();
  });
  expect(hookState.listCalls.length).toBeGreaterThanOrEqual(1);
  expect(view.container.textContent).toContain("post:Post");
  expect(view.container.textContent).toContain("page:Page");
  view.cleanup();
});

test("useEntryRelationTargets ignores a failed authoritative refresh", async () => {
  hookState.cachedContentTypes = [hookState.contentType("post", "Post")];
  hookState.listError = new Error("network down");
  const view = renderAndGrab(<RelationTargetsHarness />);
  expect(view.container.textContent).toContain("post:Post");

  hookState.emitCacheEvent?.("contentTypes:list");
  await React.act(async () => {
    await Promise.resolve();
  });
  expect(hookState.listCalls.length).toBeGreaterThanOrEqual(1);
  expect(view.container.textContent).toContain("post:Post");
  view.cleanup();
});

test("useEntryRelationTargets accepts an authoritative content type list", async () => {
  hookState.cachedContentTypes = [hookState.contentType("post", "Post")];
  hookState.listResult = [];
  const view = renderAndGrab(<RelationTargetsHarness />);
  expect(view.container.textContent).toContain("post:Post");

  hookState.emitCacheEvent?.("contentTypes:list");
  await React.act(async () => {
    await Promise.resolve();
  });
  expect(hookState.listCalls.length).toBeGreaterThanOrEqual(1);
  expect(view.container.textContent).not.toContain("post:Post");
  view.cleanup();
});

test("useEntryTaxonomyTermCreate folds a created category into the overview", async () => {
  const seen: string[] = [];
  hookState.createResult = hookState.term("cat-new", "tax-cat", "Gamma");
  const capturedUpdaters: TaxonomyOverviewUpdater[] = [];
  const view = renderAndGrab(
    <TaxonomyCreateHarness
      setTaxonomyOverview={(updater) => {
        capturedUpdaters.push(updater);
        seen.push("update");
      }}
      setError={(message) => {
        seen.push(`error:${message}`);
      }}
    />
  );

  await React.act(async () => {
    view.container
      .querySelector('[data-testid="create-category"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await React.act(async () => {
    await Promise.resolve();
  });
  expect(seen).toContain("update");
  expect(seen).not.toContainEqual(expect.stringContaining("error:"));

  const [capturedUpdater] = capturedUpdaters;
  if (!capturedUpdater) throw new Error("Expected the taxonomy overview updater");
  const prev: TaxonomyOverview = {
    taxonomies: {
      category: hookState.taxonomy("tax-cat", "category", "Category"),
      tag: hookState.taxonomy("tax-tag", "tag", "Tag"),
    },
    terms: {
      categories: hookState.terms.categories,
      tags: hookState.terms.tags,
    },
  };
  const next = capturedUpdater(prev);
  expect(next?.terms.categories.map((term) => term.name)).toEqual(["Alpha", "Beta", "Gamma"]);
  view.cleanup();
});

const CallbackHarness = ({
  overview,
  setTaxonomyOverview,
  setError,
  onResult,
}: {
  overview: TaxonomyOverview | null;
  setTaxonomyOverview: (updater: TaxonomyOverviewUpdater) => void;
  setError: (message: string) => void;
  onResult: (result: ContentTerm | null) => void;
}) => {
  const create = useEntryTaxonomyTermCreate({
    taxonomyOverview: overview,
    setTaxonomyOverview,
    setError,
  });
  return (
    <div data-testid="callback">
      <button
        data-testid="run"
        onClick={() => {
          void create("category", "Gamma").then(onResult);
        }}
      >
        run
      </button>
    </div>
  );
};

test("useEntryTaxonomyTermCreate returns null without a taxonomy overview", async () => {
  const seen: string[] = [];
  const results: Array<ContentTerm | null> = [];
  const view = renderAndGrab(
    <CallbackHarness
      overview={null}
      setTaxonomyOverview={() => {
        seen.push("update");
      }}
      setError={(message) => {
        seen.push(`error:${message}`);
      }}
      onResult={(result) => {
        results.push(result);
      }}
    />
  );

  await React.act(async () => {
    view.container
      .querySelector('[data-testid="run"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await React.act(async () => {
    await Promise.resolve();
  });
  expect(results).toEqual([null]);
  expect(seen).toEqual([]);
  view.cleanup();
});

test("useEntryTaxonomyTermCreate surfaces the api error message on failure", async () => {
  hookState.createError = { name: "ApiClientError", message: "duplicate term" };
  const seen: string[] = [];
  const view = renderAndGrab(
    <TaxonomyCreateHarness
      setTaxonomyOverview={() => undefined}
      setError={(message) => {
        seen.push(message);
      }}
    />
  );

  await React.act(async () => {
    view.container
      .querySelector('[data-testid="create-tag"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await React.act(async () => {
    await Promise.resolve();
  });
  expect(seen).toEqual(["duplicate term"]);
  view.cleanup();
});

test("useEntryTaxonomyTermCreate falls back to a generic message on unknown failure", async () => {
  hookState.createError = new Error("boom");
  const seen: string[] = [];
  const view = renderAndGrab(
    <TaxonomyCreateHarness
      setTaxonomyOverview={() => undefined}
      setError={(message) => {
        seen.push(message);
      }}
    />
  );

  await React.act(async () => {
    view.container
      .querySelector('[data-testid="create-tag"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await React.act(async () => {
    await Promise.resolve();
  });
  expect(seen).toEqual(["Failed to create term."]);
  view.cleanup();
});

test("useEntryTaxonomyTermCreate does not update a missing overview after creation", async () => {
  const seen: string[] = [];
  const results: Array<ContentTerm | null> = [];
  const view = renderAndGrab(
    <CallbackHarness
      overview={null}
      setTaxonomyOverview={() => {
        seen.push("update");
      }}
      setError={() => undefined}
      onResult={(result) => {
        results.push(result);
      }}
    />
  );

  await React.act(async () => {
    view.container
      .querySelector('[data-testid="run"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await React.act(async () => {
    await Promise.resolve();
  });
  expect(results).toEqual([null]);
  expect(seen).toEqual([]);
  view.cleanup();
});

test("useEntryTaxonomyTermCreate ignores stale overview state in the updater", async () => {
  const seen: string[] = [];
  const capturedUpdaters: TaxonomyOverviewUpdater[] = [];
  const view = renderAndGrab(
    <TaxonomyCreateHarness
      setTaxonomyOverview={(updater) => {
        capturedUpdaters.push(updater);
        seen.push("update");
      }}
      setError={() => undefined}
    />
  );

  await React.act(async () => {
    view.container
      .querySelector('[data-testid="create-category"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await React.act(async () => {
    await Promise.resolve();
  });
  const [capturedUpdater] = capturedUpdaters;
  if (!capturedUpdater) throw new Error("Expected the taxonomy overview updater");
  expect(capturedUpdater(null)).toBeNull();
  const prev: TaxonomyOverview = {
    taxonomies: {},
    terms: { categories: hookState.terms.categories, tags: hookState.terms.tags },
  };
  const next = capturedUpdater(prev);
  expect(next).not.toBeNull();
  view.cleanup();
});
