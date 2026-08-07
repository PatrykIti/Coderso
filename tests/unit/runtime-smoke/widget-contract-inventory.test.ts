import { expect, test } from "bun:test";
import {
  ensureMediaWidgetFixtures,
  parseArgs,
  resolveLogoCloudMediaProofPublicPath,
  selectCases,
  selectedCasesNeedCommerceFixtures,
  selectedCasesNeedContentFixtures,
  selectedCasesNeedEntryTeaserFixtures,
  selectedCasesNeedMediaFixtures,
  selectedCasesNeedPostsFixtures,
  selectedCasesNeedProductCompareFixture,
  selectedCasesNeedProductGalleryFixture,
  selectedCasesNeedProductTableFixture,
  validateInventory,
} from "../../../scripts/playwright-widget-contract-smoke";
import {
  contentListCase,
  entryTeaserCase,
  galleryMosaicCase,
  logoCloudCase,
  makeInventory,
  postsFeedCase,
  productCompareCase,
  productGalleryCase,
  productTableCase,
  richTextSectionCase,
  teamCase,
} from "./widget-contract-test-support";

test("validates the 38-widget inventory contract shape", () => {
  expect(() => validateInventory(makeInventory())).not.toThrow();
  expect(() =>
    validateInventory(
      makeInventory({
        expectedWidgetCount: 3,
      })
    )
  ).toThrow("inventory_widget_count_mismatch");
  expect(() =>
    validateInventory(
      makeInventory({
        expectedWidgetCount: 1,
        widgets: [
          {
            widgetType: "screen-field-value",
            title: "Screen Field Value",
            adminInsertLabel: "Screen Field Value",
            adminFixtureSlug: "/screen-field-value",
            requiredModes: ["wizard"],
          },
        ],
      })
    )
  ).toThrow("inventory_screen_only_included");
});

test("selects a single widget or limit for targeted smoke debugging", () => {
  const inventory = makeInventory();

  expect(
    selectCases(inventory, parseArgs(["--widget", "spacer"])).map((item) => item.widgetType)
  ).toEqual(["spacer"]);
  expect(
    selectCases(inventory, parseArgs(["--limit", "1"])).map((item) => item.widgetType)
  ).toEqual(["hero"]);
  expect(() => selectCases(inventory, parseArgs(["--widget", "missing"]))).toThrow(
    "widget_not_found:missing"
  );
});

test("detects when selected widget cases require commerce fixture bootstrap", () => {
  expect(selectedCasesNeedCommerceFixtures(makeInventory().widgets)).toBe(false);
  expect(selectedCasesNeedCommerceFixtures([productGalleryCase])).toBe(true);
  expect(selectedCasesNeedCommerceFixtures([productCompareCase])).toBe(true);
  expect(selectedCasesNeedCommerceFixtures([productTableCase])).toBe(true);
  expect(selectedCasesNeedProductGalleryFixture([productGalleryCase])).toBe(true);
  expect(selectedCasesNeedProductCompareFixture([productCompareCase])).toBe(true);
  expect(selectedCasesNeedProductCompareFixture([productGalleryCase])).toBe(false);
  expect(selectedCasesNeedProductTableFixture([productTableCase])).toBe(true);
  expect(selectedCasesNeedProductTableFixture([productCompareCase])).toBe(false);
});

test("detects when selected widget cases require media fixture bootstrap", () => {
  expect(selectedCasesNeedMediaFixtures(makeInventory().widgets)).toBe(false);
  expect(selectedCasesNeedMediaFixtures([productGalleryCase])).toBe(true);
  expect(selectedCasesNeedMediaFixtures([productCompareCase])).toBe(true);
  expect(selectedCasesNeedMediaFixtures([productTableCase])).toBe(true);
  expect(selectedCasesNeedMediaFixtures([logoCloudCase])).toBe(true);
  expect(selectedCasesNeedMediaFixtures([galleryMosaicCase])).toBe(true);
  expect(selectedCasesNeedMediaFixtures([teamCase])).toBe(true);
  expect(selectedCasesNeedMediaFixtures([richTextSectionCase])).toBe(true);
});

test("detects when selected widget cases require content list fixture bootstrap", () => {
  expect(selectedCasesNeedContentFixtures(makeInventory().widgets)).toBe(false);
  expect(selectedCasesNeedContentFixtures([contentListCase])).toBe(true);
});

test("detects when selected widget cases require Posts Feed fixture bootstrap", () => {
  expect(selectedCasesNeedPostsFixtures(makeInventory().widgets)).toBe(false);
  expect(selectedCasesNeedPostsFixtures([postsFeedCase])).toBe(true);
});

test("detects when selected widget cases require Entry Teaser fixture bootstrap", () => {
  expect(selectedCasesNeedEntryTeaserFixtures(makeInventory().widgets)).toBe(false);
  expect(selectedCasesNeedEntryTeaserFixtures([entryTeaserCase])).toBe(true);
});

test("uses the public fixture route for Logo Cloud media proof before admin slug fallback", () => {
  expect(resolveLogoCloudMediaProofPublicPath(logoCloudCase)).toBe("/logo-cloud");
  expect(
    resolveLogoCloudMediaProofPublicPath({
      ...logoCloudCase,
      publicPath: null,
    })
  ).toBe("/ctr-logo-cloud");
});

test("seeds Logo Cloud media fixtures through authenticated admin upload", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
      return Response.json([]);
    }
    if (url === "http://admin.test/admin/api/auth/csrf") {
      return Response.json({ token: "csrf-token" });
    }
    if (url === "http://admin.test/admin/api/media" && init?.method === "POST") {
      expect(init.body).toBeInstanceOf(FormData);
      const formData = init.body as FormData;
      const file = formData.get("file") as File;
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe("widget-fixture-logo-cloud-acme.svg");
      expect(file.type).toBe("image/svg+xml");
      expect(formData.get("alt")).toBe("Widget fixture Acme logo mark");
      expect(formData.get("title")).toBe("Widget fixture Acme logo");
      expect(formData.get("caption")).toBe("Deterministic Logo Cloud MediaPicker image fixture.");
      return Response.json({
        id: "media-1",
        originalName: "widget-fixture-logo-cloud-acme.svg",
        mimeType: "image/svg+xml",
        type: "image",
        title: "Widget fixture Acme logo",
        alt: "Widget fixture Acme logo mark",
        caption: "Deterministic Logo Cloud MediaPicker image fixture.",
      });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    await ensureMediaWidgetFixtures("http://admin.test/admin", "session-token", [logoCloudCase]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  expect(requests.map((request) => request.url)).toEqual([
    "http://admin.test/admin/api/media",
    "http://admin.test/admin/api/auth/csrf",
    "http://admin.test/admin/api/media",
  ]);
  const uploadHeaders = requests[2]?.init?.headers as Headers;
  expect(uploadHeaders.get("cookie")).toBe("session=session-token");
  expect(uploadHeaders.get("X-CSRF-Token")).toBe("csrf-token");
  expect(uploadHeaders.get("Content-Type")).toBeNull();
});

test("seeds Gallery Mosaic image and video media fixtures through authenticated admin upload", async () => {
  const originalFetch = globalThis.fetch;
  const uploadedFiles: Array<{ name: string; type: string; title: FormDataEntryValue | null }> = [];
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
      return Response.json([]);
    }
    if (url === "http://admin.test/admin/api/auth/csrf") {
      return Response.json({ token: "csrf-token" });
    }
    if (url === "http://admin.test/admin/api/media" && init?.method === "POST") {
      expect(init.body).toBeInstanceOf(FormData);
      const formData = init.body as FormData;
      const file = formData.get("file") as File;
      uploadedFiles.push({
        name: file.name,
        type: file.type,
        title: formData.get("title"),
      });
      return Response.json({
        id: `media-${uploadedFiles.length}`,
        originalName: file.name,
        mimeType: file.type,
        type: file.type.startsWith("image/") ? "image" : "file",
        title: formData.get("title"),
        alt: formData.get("alt"),
        caption: formData.get("caption"),
      });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    await ensureMediaWidgetFixtures("http://admin.test/admin", "session-token", [
      galleryMosaicCase,
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  expect(uploadedFiles).toEqual([
    {
      name: "widget-fixture-gallery-mosaic-image.svg",
      type: "image/svg+xml",
      title: "Widget fixture Gallery Mosaic image",
    },
    {
      name: "widget-fixture-gallery-mosaic-video.mp4",
      type: "video/mp4",
      title: "Widget fixture Gallery Mosaic video",
    },
  ]);
  expect(requests.map((request) => `${request.init?.method ?? "GET"} ${request.url}`)).toEqual([
    "GET http://admin.test/admin/api/media",
    "GET http://admin.test/admin/api/auth/csrf",
    "POST http://admin.test/admin/api/media",
    "POST http://admin.test/admin/api/media",
  ]);
});

test("continues Gallery Mosaic media bootstrap when optional video upload is rejected by storage policy", async () => {
  const originalFetch = globalThis.fetch;
  const uploadedNames: string[] = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
      return Response.json([]);
    }
    if (url === "http://admin.test/admin/api/auth/csrf") {
      return Response.json({ token: "csrf-token" });
    }
    if (url === "http://admin.test/admin/api/media" && init?.method === "POST") {
      const formData = init.body as FormData;
      const file = formData.get("file") as File;
      uploadedNames.push(file.name);
      if (file.type === "video/mp4") {
        return new Response("mime rejected", { status: 400 });
      }
      return Response.json({
        id: "gallery-image",
        originalName: file.name,
        mimeType: file.type,
        type: "image",
        title: formData.get("title"),
        alt: formData.get("alt"),
        caption: formData.get("caption"),
      });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    await ensureMediaWidgetFixtures("http://admin.test/admin", "session-token", [
      galleryMosaicCase,
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  expect(uploadedNames).toEqual([
    "widget-fixture-gallery-mosaic-image.svg",
    "widget-fixture-gallery-mosaic-video.mp4",
  ]);
});

test("seeds Team photo media fixture through authenticated admin upload", async () => {
  const originalFetch = globalThis.fetch;
  const uploadedFiles: Array<{ name: string; type: string; title: FormDataEntryValue | null }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
      return Response.json([]);
    }
    if (url === "http://admin.test/admin/api/auth/csrf") {
      return Response.json({ token: "csrf-token" });
    }
    if (url === "http://admin.test/admin/api/media" && init?.method === "POST") {
      expect(init.body).toBeInstanceOf(FormData);
      const formData = init.body as FormData;
      const file = formData.get("file") as File;
      uploadedFiles.push({
        name: file.name,
        type: file.type,
        title: formData.get("title"),
      });
      return Response.json({
        id: "team-photo",
        originalName: file.name,
        mimeType: file.type,
        type: "image",
        title: formData.get("title"),
        alt: formData.get("alt"),
        caption: formData.get("caption"),
      });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    await ensureMediaWidgetFixtures("http://admin.test/admin", "session-token", [teamCase]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  expect(uploadedFiles).toEqual([
    {
      name: "widget-fixture-team-photo.svg",
      type: "image/svg+xml",
      title: "Widget fixture Team photo",
    },
  ]);
});

test("seeds Rich Text Section image and document media fixtures through authenticated admin upload", async () => {
  const originalFetch = globalThis.fetch;
  const uploadedFiles: Array<{ name: string; type: string; title: FormDataEntryValue | null }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
      return Response.json([]);
    }
    if (url === "http://admin.test/admin/api/auth/csrf") {
      return Response.json({ token: "csrf-token" });
    }
    if (url === "http://admin.test/admin/api/media" && init?.method === "POST") {
      expect(init.body).toBeInstanceOf(FormData);
      const formData = init.body as FormData;
      const file = formData.get("file") as File;
      uploadedFiles.push({
        name: file.name,
        type: file.type,
        title: formData.get("title"),
      });
      return Response.json({
        id: `rich-text-media-${uploadedFiles.length}`,
        originalName: file.name,
        mimeType: file.type,
        type: file.type.startsWith("image/") ? "image" : "file",
        title: formData.get("title"),
        alt: formData.get("alt"),
        caption: formData.get("caption"),
      });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    await ensureMediaWidgetFixtures("http://admin.test/admin", "session-token", [
      richTextSectionCase,
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  expect(uploadedFiles).toEqual([
    {
      name: "widget-fixture-rich-text-section-image.svg",
      type: "image/svg+xml",
      title: "Widget fixture Rich Text Section image",
    },
    {
      name: "widget-fixture-rich-text-section-document.pdf",
      type: "application/pdf",
      title: "Widget fixture Rich Text Section document",
    },
  ]);
});

test("patches existing Logo Cloud fixture metadata through admin JSON with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
      return Response.json([
        {
          id: "media-1",
          originalName: "widget-fixture-logo-cloud-acme.svg",
          mimeType: "image/svg+xml",
          type: "image",
          title: "Old title",
          alt: null,
          caption: null,
        },
      ]);
    }
    if (url === "http://admin.test/admin/api/auth/csrf") {
      return Response.json({ token: "csrf-token" });
    }
    if (url === "http://admin.test/admin/api/media/media-1" && init?.method === "PATCH") {
      expect(init.body).toBe(
        JSON.stringify({
          alt: "Widget fixture Acme logo mark",
          title: "Widget fixture Acme logo",
          caption: "Deterministic Logo Cloud MediaPicker image fixture.",
        })
      );
      return Response.json({
        id: "media-1",
        originalName: "widget-fixture-logo-cloud-acme.svg",
        mimeType: "image/svg+xml",
        type: "image",
        title: "Widget fixture Acme logo",
        alt: "Widget fixture Acme logo mark",
        caption: "Deterministic Logo Cloud MediaPicker image fixture.",
      });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    await ensureMediaWidgetFixtures("http://admin.test/admin", "session-token", [logoCloudCase]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  expect(requests.map((request) => request.url)).toEqual([
    "http://admin.test/admin/api/media",
    "http://admin.test/admin/api/auth/csrf",
    "http://admin.test/admin/api/media/media-1",
  ]);
  const patchHeaders = requests[2]?.init?.headers as Headers;
  expect(patchHeaders.get("cookie")).toBe("session=session-token");
  expect(patchHeaders.get("X-CSRF-Token")).toBe("csrf-token");
  expect(patchHeaders.get("Content-Type")).toBe("application/json");
});

test("does not reuse same-name media fixtures with unsupported type or MIME", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url === "http://admin.test/admin/api/media" && (init?.method ?? "GET") === "GET") {
      return Response.json([
        {
          id: "media-file",
          originalName: "widget-fixture-logo-cloud-acme.svg",
          mimeType: "application/pdf",
          type: "file",
          title: "Widget fixture Acme logo",
          alt: "Widget fixture Acme logo mark",
          caption: "Deterministic Logo Cloud MediaPicker image fixture.",
        },
      ]);
    }
    if (url === "http://admin.test/admin/api/auth/csrf") {
      return Response.json({ token: "csrf-token" });
    }
    if (url === "http://admin.test/admin/api/media" && init?.method === "POST") {
      return Response.json({
        id: "media-image",
        originalName: "widget-fixture-logo-cloud-acme.svg",
        mimeType: "image/svg+xml",
        type: "image",
        title: "Widget fixture Acme logo",
        alt: "Widget fixture Acme logo mark",
        caption: "Deterministic Logo Cloud MediaPicker image fixture.",
      });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    await ensureMediaWidgetFixtures("http://admin.test/admin", "session-token", [logoCloudCase]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  expect(requests.map((request) => `${request.init?.method ?? "GET"} ${request.url}`)).toEqual([
    "GET http://admin.test/admin/api/media",
    "GET http://admin.test/admin/api/auth/csrf",
    "POST http://admin.test/admin/api/media",
  ]);
});
