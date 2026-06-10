import { describe, expect, test, vi } from "vitest";

import {
  mapPageCollectionBlockToContentListData,
  preparePageRuntimeDocument,
  sanitizePageEmbedHtml,
  type PageRuntimeDataBindingDeps,
} from "../../../core/services/pages/pageRuntimeDataBinding";
import type { PageDocumentV2 } from "../../../core/services/pages/pageDocumentV2";
import type { ContentListResolvedRuntimeData } from "../../../core/services/content/contentListResolver";
import { getDefaultFormSettings } from "../../../core/services/forms/formSettings";

const resolvedCollection = (): ContentListResolvedRuntimeData => ({
  items: [
    {
      id: "entry-public",
      title: "Published entry",
      slug: "published-entry",
      href: "/entries/published-entry",
      excerpt: "Published excerpt",
      status: "published",
    },
  ],
  total: 1,
  sourceTypeId: "type-public",
  sourceTypeSlug: "public",
  resolvedAt: "2026-06-10T00:00:00.000Z",
});

const pageDocument = (
  visibility: PageDocumentV2["sections"][number]["visibility"]
): PageDocumentV2 => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: {
    template: "page-v2",
    showInNav: true,
  },
  sections: [
    {
      id: "sec_data",
      type: "content",
      name: "Data",
      variant: "default",
      layout: {
        columns: 1,
        align: "start",
        justify: "start",
        maxWidth: 1080,
      },
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
      },
      spacing: {
        paddingTop: 32,
        paddingBottom: 32,
        paddingLeft: 24,
        paddingRight: 24,
        gap: 24,
      },
      visibility,
      responsive: {},
      blocks: [
        {
          id: "blk_collection",
          type: "collection",
          props: {
            contentTypeId: "type-public",
            queryId: "",
            templateId: "",
            limit: 42,
          },
          visibility: { visible: true },
        },
        {
          id: "blk_form",
          type: "form",
          props: {
            formId: "form-public",
            title: "Contact",
          },
          visibility: { visible: true },
        },
        {
          id: "blk_embed",
          type: "embed",
          props: {
            html: '<p><a href="/safe">Safe</a><script>bad()</script></p>',
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          },
          visibility: { visible: true },
        },
      ],
    },
  ],
});

const bindingDeps = (): Required<
  Pick<PageRuntimeDataBindingDeps, "resolveContentListRuntimeData" | "resolveFormRuntimeData">
> => ({
  resolveContentListRuntimeData: vi.fn(async () => resolvedCollection()),
  resolveFormRuntimeData: vi.fn(async () => ({
    formId: "form-public",
    formName: "Contact",
    description: "Contact form",
    status: "published",
    successMessage: "Thanks",
    successRedirectUrl: null,
    submissionAccess: "public" as const,
    submissionNonce: "nonce",
    settings: getDefaultFormSettings(),
    fields: [],
  })),
});

describe("page runtime data binding", () => {
  test("maps collection props to a published-only content list contract", () => {
    const data = mapPageCollectionBlockToContentListData({
      id: "collection",
      type: "collection",
      props: {
        contentTypeId: "type-public",
        queryId: "query-public",
        templateId: "template-public",
        limit: 42,
      },
      visibility: { visible: true },
    });

    expect(data.source).toMatchObject({
      mode: "listing",
      contentTypeId: "type-public",
      listingQueryId: "query-public",
      listingTemplateId: "template-public",
      statusScope: "published",
      limit: 24,
    });
    expect(data.pagination).toMatchObject({
      mode: "none",
      pageSize: 24,
    });
  });

  test("prunes gated public sections before resolving collection or form data", async () => {
    const deps = bindingDeps();
    const prepared = await preparePageRuntimeDocument(
      pageDocument({
        visible: true,
        authOnly: true,
        anchor: null,
        startsAt: null,
        endsAt: null,
      }),
      {
        preview: false,
        breakpoint: "desktop",
        contentRoutes: [],
      },
      deps
    );

    expect(prepared.document.sections).toHaveLength(0);
    expect(prepared.runtimeDataByBlockId).toEqual({});
    expect(prepared.cacheable).toBe(false);
    expect(deps.resolveContentListRuntimeData).not.toHaveBeenCalled();
    expect(deps.resolveFormRuntimeData).not.toHaveBeenCalled();
  });

  test("keeps gated sections in preview and resolves scoped runtime data", async () => {
    const deps = bindingDeps();
    const prepared = await preparePageRuntimeDocument(
      pageDocument({
        visible: true,
        authOnly: true,
        anchor: null,
        startsAt: null,
        endsAt: null,
      }),
      {
        preview: true,
        breakpoint: "desktop",
        contentRoutes: [],
        runtimeSearchParams: new URLSearchParams("cl.blk_collection.page=2"),
      },
      deps
    );

    expect(prepared.document.sections).toHaveLength(1);
    expect(prepared.runtimeDataByBlockId.blk_collection?.kind).toBe("collection");
    expect(prepared.runtimeDataByBlockId.blk_form?.kind).toBe("form");
    expect(prepared.runtimeDataByBlockId.blk_embed).toMatchObject({
      kind: "embed",
      iframeSrc: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
    expect(prepared.cacheable).toBe(false);
    expect(deps.resolveContentListRuntimeData).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        preview: true,
        runtimeSearchParams: expect.any(URLSearchParams),
        blockId: "blk_collection",
      })
    );
  });

  test("strips unsafe inline embed markup and keeps safe links", () => {
    const html = sanitizePageEmbedHtml(
      '<p onclick="bad()">Hello <a href="javascript:bad()">bad</a><a href="/ok">ok</a></p><iframe src="https://example.test"></iframe><script>alert(1)</script>'
    );

    expect(html).toContain("<p>Hello");
    expect(html).toContain('<a href="/ok" rel="nofollow noreferrer" target="_blank">ok</a>');
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(1)");
  });
});
