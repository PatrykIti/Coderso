// @vitest-environment happy-dom

import { expect, test } from "vitest";

import { buildAssistantAdminRuntimeSnapshot } from "../../../core/admin/ui/assistant/useAssistantAdminContext";

test("buildAssistantAdminRuntimeSnapshot resolves advanced listings surfaces", () => {
  const snapshot = buildAssistantAdminRuntimeSnapshot({
    route: "/admin/advanced/listings",
  });

  expect(snapshot).toMatchObject({
    area: "advanced",
    advancedModule: "listings",
    selectedResource: null,
  });
  expect(snapshot.visibleActions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "listing.create",
        kind: "create",
        requiredPermission: "content:write",
      }),
    ])
  );
});

test("buildAssistantAdminRuntimeSnapshot resolves advanced booking surfaces", () => {
  const snapshot = buildAssistantAdminRuntimeSnapshot({
    route: "/admin/advanced/booking",
  });

  expect(snapshot.advancedModule).toBe("booking");
  expect(snapshot.visibleActions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "booking.configure",
        requiredPermission: "booking:write",
      }),
    ])
  );
});

test("buildAssistantAdminRuntimeSnapshot resolves advanced commerce surfaces", () => {
  const snapshot = buildAssistantAdminRuntimeSnapshot({
    route: "/admin/advanced/commerce",
  });

  expect(snapshot.advancedModule).toBe("commerce");
  expect(snapshot.visibleActions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "commerce.configure",
        requiredPermission: "commerce:write",
      }),
    ])
  );
});

test("buildAssistantAdminRuntimeSnapshot resolves post, menu, seo, and listing resources", () => {
  expect(
    buildAssistantAdminRuntimeSnapshot({ route: "/admin/posts/post-1" }).selectedResource
  ).toEqual({ kind: "post", id: "post-1" });

  expect(
    buildAssistantAdminRuntimeSnapshot({ route: "/admin/menus/primary" }).selectedResource
  ).toEqual({ kind: "menu", id: "primary" });

  expect(
    buildAssistantAdminRuntimeSnapshot({ route: "/admin/seo/doc-1" }).selectedResource
  ).toEqual({ kind: "seo-document", id: "doc-1" });

  expect(
    buildAssistantAdminRuntimeSnapshot({
      route: "/admin/advanced/posts/post-1",
    }).selectedResource
  ).toEqual({ kind: "post", id: "post-1" });

  expect(
    buildAssistantAdminRuntimeSnapshot({
      route: "/admin/advanced/listings/lq-1",
    }).selectedResource
  ).toEqual({ kind: "listing-query", id: "lq-1" });
});

test("buildAssistantAdminRuntimeSnapshot tolerates malformed percent-encoding in ids", () => {
  const snapshot = buildAssistantAdminRuntimeSnapshot({ route: "/admin/pages/%zz" });

  expect(snapshot.selectedResource).toEqual({ kind: "page", id: "%zz" });
});
