import { expect, test } from "bun:test";

import { buildPreviewPath } from "../../../core/server/utils/previewUrls";

test("buildPreviewPath builds page preview query", () => {
  const path = buildPreviewPath({
    targetType: "page",
    token: "abc",
    path: "/about",
  });

  expect(path).toBe("/preview?type=page&token=abc&path=%2Fabout");
});

test("buildPreviewPath builds content preview query", () => {
  const path = buildPreviewPath({
    targetType: "content",
    token: "xyz",
    contentType: "blog",
    slug: "post-1",
  });

  expect(path).toBe(
    "/preview?type=content&token=xyz&contentType=blog&slug=post-1"
  );
});

test("buildPreviewPath builds widget template preview query", () => {
  const path = buildPreviewPath({
    targetType: "widget-template",
    token: "t1",
  });

  expect(path).toBe("/preview?type=widget-template&token=t1");
});
