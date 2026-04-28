import { expect, test } from "vitest";

import {
  buildPreviewPath,
  buildPreviewUrl,
  createPublicUrlContextFromHeaders,
} from "../../../core/server/utils/previewUrls";

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

test("buildPreviewUrl returns absolute URL when base URL is provided", () => {
  const url = buildPreviewUrl(
    {
      targetType: "page",
      token: "abc",
      path: "/about",
    },
    "https://www.example.com/"
  );

  expect(url).toBe(
    "https://www.example.com/preview?type=page&token=abc&path=%2Fabout"
  );
});

test("buildPreviewUrl falls back to relative path when base URL is missing", () => {
  const url = buildPreviewUrl(
    {
      targetType: "widget-template",
      token: "t1",
    },
    null
  );

  expect(url).toBe("/preview?type=widget-template&token=t1");
});

test("createPublicUrlContextFromHeaders maps forwarded host/proto headers", () => {
  const context = createPublicUrlContextFromHeaders({
    host: "localhost:8787",
    "x-forwarded-host": "cms.example.com",
    "x-forwarded-proto": "https",
  });

  expect(context).toEqual({
    host: "localhost:8787",
    forwardedHost: "cms.example.com",
    forwardedProto: "https",
  });
});
