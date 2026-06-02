import { describe, expect, test } from "bun:test";

import {
  buildCommerceFixtureProductPatch,
  classifyPublicStatus,
  createAdminFixtureGapMode,
  createFailedAdminMode,
  ensureMediaWidgetFixtures,
  extractCliJson,
  finalizeAdminResult,
  findDuplicateWritablePaths,
  hasStrictFailure,
  isAdminFixtureUnopenableError,
  parseArgs,
  renderMarkdown,
  resolveCommerceFixtureCollectionIds,
  resolveLogoCloudMediaProofPublicPath,
  resolvePlaywrightCliSessionName,
  selectedCasesNeedCommerceFixtures,
  selectedCasesNeedMediaFixtures,
  selectCases,
  shouldCountOverflowOwner,
  summarize,
  validateInventory,
  type AdminModeResult,
  type SmokeInventory,
  type SmokeReport,
} from "../../scripts/playwright-widget-contract-smoke";

function makeInventory(overrides: Partial<SmokeInventory> = {}): SmokeInventory {
  return {
    version: 1,
    expectedWidgetCount: 2,
    excludedScreenOnlyWidgets: [
      "screen-record-header",
      "screen-field-value",
      "screen-field-group",
      "screen-two-column",
    ],
    widgets: [
      {
        widgetType: "hero",
        title: "Hero",
        adminInsertLabel: "Hero",
        adminFixtureSlug: "/ctr-hero",
        publicPath: "/hero",
        publicFixtureStatus: "published",
        requiredModes: ["wizard", "visual", "advanced"],
        cssChecks: ["body-overflow"],
      },
      {
        widgetType: "spacer",
        title: "Spacer",
        adminInsertLabel: "Spacer",
        adminFixtureSlug: "/ctr-spacer",
        publicPath: "/spacer",
        publicFixtureStatus: "published",
        requiredModes: ["wizard", "visual", "advanced"],
      },
    ],
    ...overrides,
  };
}

function makeReport(overrides: Partial<SmokeReport> = {}): SmokeReport {
  return {
    generatedAt: "2026-05-23T00:00:00.000Z",
    command: "bun scripts/playwright-widget-contract-smoke.ts --dry-run",
    dryRun: false,
    inventory: {
      expectedWidgetCount: 2,
      actualWidgetCount: 2,
      excludedScreenOnlyWidgets: [],
      selectedWidgetTypes: ["hero", "spacer"],
    },
    environment: {
      adminUrl: "http://localhost:5173/admin",
      frontUrl: "http://localhost:3000",
      resolvedPlaywrightSession: "widget-contract-smoke",
      adminReachable: true,
      frontReachable: true,
      playwrightCliAvailable: true,
    },
    admin: {
      skipped: false,
      loginAttempted: true,
      authenticated: true,
      results: [],
    },
    public: {
      skipped: false,
      results: [],
    },
    summary: {
      adminFailures: 0,
      publicFailures: 0,
      fixtureGaps: 0,
      metadataGaps: 0,
    },
    ...overrides,
  };
}

function makeMode(overrides: Partial<AdminModeResult> = {}): AdminModeResult {
  return {
    mode: "wizard",
    status: "passed",
    rootCount: 1,
    sectionCount: 1,
    visibleSectionCount: 1,
    writablePaths: [],
    controlsWithoutPath: 0,
    ...overrides,
  };
}

const logoCloudCase: SmokeInventory["widgets"][number] = {
  widgetType: "logo-cloud",
  title: "Logo Cloud",
  adminInsertLabel: "Logo Cloud",
  adminFixtureSlug: "/ctr-logo-cloud",
  publicPath: "/logo-cloud",
  publicFixtureStatus: "published",
  requiredModes: ["wizard", "visual", "advanced"],
};

const galleryMosaicCase: SmokeInventory["widgets"][number] = {
  widgetType: "gallery-mosaic",
  title: "Gallery Mosaic",
  adminInsertLabel: "Gallery Mosaic",
  adminFixtureSlug: "/ctr-gallery-mosaic",
  publicPath: "/gallery-mosaic",
  publicFixtureStatus: "published",
  requiredModes: ["visual", "advanced"],
};

const teamCase: SmokeInventory["widgets"][number] = {
  widgetType: "team",
  title: "Team",
  adminInsertLabel: "Team",
  adminFixtureSlug: "/ctr-team",
  publicPath: "/team",
  publicFixtureStatus: "published",
  requiredModes: ["visual", "advanced"],
};

describe("playwright widget contract smoke helpers", () => {
  test("parses debug and target flags without exposing credentials", () => {
    const args = parseArgs([
      "--session",
      "widget-contract-smoke-local",
      "--admin=http://localhost:5173/admin",
      "--front",
      "http://localhost:3000",
      "--widget",
      "hero",
      "--limit=1",
      "--dry-run",
      "--strict",
    ]);

    expect(args).toMatchObject({
      session: "widget-contract-smoke-local",
      adminUrl: "http://localhost:5173/admin",
      frontUrl: "http://localhost:3000",
      widgetType: "hero",
      limit: 1,
      dryRun: true,
      strict: true,
    });
  });

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
    expect(
      selectedCasesNeedCommerceFixtures([
        {
          widgetType: "product-gallery",
          title: "Product Gallery",
          adminInsertLabel: "Product Gallery",
          adminFixtureSlug: "/ctr-product-gallery",
          publicPath: "/product-gallery",
          publicFixtureStatus: "published",
          requiredModes: ["visual", "advanced"],
        },
      ])
    ).toBe(true);
  });

  test("detects when selected widget cases require media fixture bootstrap", () => {
    expect(selectedCasesNeedMediaFixtures(makeInventory().widgets)).toBe(false);
    expect(selectedCasesNeedMediaFixtures([logoCloudCase])).toBe(true);
    expect(selectedCasesNeedMediaFixtures([galleryMosaicCase])).toBe(true);
    expect(selectedCasesNeedMediaFixtures([teamCase])).toBe(true);
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
    const uploadedFiles: Array<{ name: string; type: string; title: FormDataEntryValue | null }> =
      [];
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
    const uploadedFiles: Array<{ name: string; type: string; title: FormDataEntryValue | null }> =
      [];
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

  test("builds a commerce fixture patch only for fields that drifted", () => {
    expect(
      buildCommerceFixtureProductPatch(
        {
          id: "product-1",
          slug: "fixture-starter-home",
          title: "Fixture Starter Home",
          status: "published",
          excerpt: "Compact starter plan.",
          description: "Fixture description.",
          pricing: { amount: 19900, currency: "USD", compareAtAmount: 24900 },
          stock: { state: "in_stock", quantity: 3 },
          collectionIds: ["collection-1"],
        },
        {
          slug: "fixture-starter-home",
          title: "Fixture Starter Home",
          status: "published",
          excerpt: "Compact starter plan.",
          description: "Fixture description.",
          pricing: { amount: 19900, currency: "USD", compareAtAmount: 24900 },
          stock: { state: "in_stock", quantity: 3 },
          collectionSlugs: ["fixture-homes"],
        }
      )
    ).toBeNull();

    expect(
      buildCommerceFixtureProductPatch(
        {
          id: "product-1",
          slug: "fixture-starter-home",
          title: "Old title",
          status: "draft",
          excerpt: null,
          description: null,
          pricing: { amount: 0, currency: "USD", compareAtAmount: null },
          stock: { state: "backorder", quantity: 1 },
          collectionIds: [],
        },
        {
          slug: "fixture-starter-home",
          title: "Fixture Starter Home",
          status: "published",
          excerpt: "Compact starter plan.",
          description: "Fixture description.",
          pricing: { amount: 19900, currency: "USD", compareAtAmount: 24900 },
          stock: { state: "in_stock", quantity: 3 },
          collectionSlugs: ["fixture-homes"],
        }
      )
    ).toEqual({
      title: "Fixture Starter Home",
      status: "published",
      excerpt: "Compact starter plan.",
      description: "Fixture description.",
      pricing: { amount: 19900, currency: "USD", compareAtAmount: 24900 },
      stock: { state: "in_stock", quantity: 3 },
    });
  });

  test("maps fixture collection slugs to deterministic ids", () => {
    const collectionBySlug = new Map([
      ["fixture-homes", { id: "collection-1", slug: "fixture-homes", name: "Fixture Homes" }],
      ["fixture-lofts", { id: "collection-2", slug: "fixture-lofts", name: "Fixture Lofts" }],
    ]);

    expect(
      resolveCommerceFixtureCollectionIds(collectionBySlug, {
        slug: "fixture-garden-suite",
        title: "Fixture Garden Suite",
        excerpt: "Fixture",
        description: "Fixture description.",
        status: "published",
        pricing: { amount: 15900, currency: "USD", compareAtAmount: 17900 },
        stock: { state: "in_stock", quantity: 1 },
        collectionSlugs: ["fixture-homes", "missing", "fixture-lofts"],
      })
    ).toEqual(["collection-1", "collection-2"]);
  });

  test("normalizes long playwright-cli session names for stable browser reuse", () => {
    const longSession =
      "widget-contract-smoke-task-336-19-compare-timeline-advanced-readonly-2026-05-25";
    const resolved = resolvePlaywrightCliSessionName(longSession);
    const specialChars = resolvePlaywrightCliSessionName("widget smoke/task 336");

    expect(resolved.length).toBeLessThanOrEqual(64);
    expect(resolved).toMatch(/^widget-contract-smoke-task-336-19-compare-timeline-/);
    expect(resolved).toMatch(/-[a-f0-9]{8}$/);
    expect(resolvePlaywrightCliSessionName("ct-adv-ro")).toBe("ct-adv-ro");
    expect(specialChars).toBe("widget-smoke-task-336");
  });

  test("extracts JSON from the current playwright-cli markdown envelope", () => {
    const parsed = extractCliJson<{ ok: boolean }>(
      [
        "### Result",
        '"{\\"ok\\":true}"',
        "### Ran Playwright code",
        "```js",
        "await fn(page);",
        "```",
      ].join("\n")
    );

    expect(parsed).toEqual({ ok: true });
  });

  test("summarizes environment failures, fixture gaps, and metadata gaps distinctly", () => {
    const summary = summarize(
      makeReport({
        admin: {
          skipped: false,
          loginAttempted: false,
          authenticated: null,
          error: "admin_unreachable",
          results: [
            {
              widgetType: "hero",
              status: "metadata-gap",
              adminPath: "http://localhost:5173/admin/pages/1",
              pageId: "1",
              duplicateWritablePaths: [],
              modes: [
                {
                  mode: "wizard",
                  status: "passed",
                  rootCount: 1,
                  sectionCount: 1,
                  visibleSectionCount: 1,
                  writablePaths: [],
                  controlsWithoutPath: 2,
                },
                createAdminFixtureGapMode("advanced", "block_select_missing"),
              ],
            },
          ],
        },
        public: {
          skipped: false,
          error: "front_unreachable",
          results: [
            {
              widgetType: "spacer",
              status: "fixture-gap",
              publicPath: null,
              error: "public_fixture_missing",
            },
          ],
        },
      })
    );

    expect(summary).toEqual({
      adminFailures: 1,
      publicFailures: 1,
      fixtureGaps: 2,
      metadataGaps: 1,
    });
  });

  test("finalizes missing section and duplicate writable path contract failures", () => {
    const [item] = makeInventory().widgets;
    const missingSection = finalizeAdminResult(item, {
      widgetType: "hero",
      modes: [
        makeMode({
          status: "failed",
          sectionCount: 0,
          visibleSectionCount: 0,
          error: "mode_root_or_visible_section_missing",
        }),
      ],
    });

    expect(missingSection.status).toBe("failed");
    expect(missingSection.modes[0]?.error).toBe("mode_root_or_visible_section_missing");

    const duplicateModes = [
      makeMode({ mode: "wizard", writablePaths: ["content.title"] }),
      makeMode({ mode: "visual", writablePaths: ["content.title"] }),
    ];
    expect(findDuplicateWritablePaths(duplicateModes)).toEqual(["content.title"]);
    expect(
      findDuplicateWritablePaths([
        makeMode({ mode: "visual", writablePaths: ["content.item", "content.item"] }),
      ])
    ).toEqual([]);
    expect(
      findDuplicateWritablePaths(duplicateModes, [
        {
          path: "content.title",
          reason: "temporary migration overlap",
          expiresWithTask: "TASK-336-17",
        },
      ])
    ).toEqual([]);
  });

  test("records per-mode probe errors without losing required mode coverage", () => {
    const failed = createFailedAdminMode("advanced", "widget_block_type_missing");

    expect(failed).toMatchObject({
      mode: "advanced",
      status: "failed",
      rootCount: 0,
      visibleSectionCount: 0,
      error: "widget_block_type_missing",
    });
  });

  test("classifies unopenable admin fixtures separately from editor contract failures", () => {
    const [item] = makeInventory().widgets;
    const fixtureGap = createAdminFixtureGapMode("advanced", "block_select_missing");
    const finalized = finalizeAdminResult(item, {
      widgetType: item.widgetType,
      modes: [makeMode({ mode: "wizard" }), makeMode({ mode: "visual" }), fixtureGap],
    });

    expect(isAdminFixtureUnopenableError("block_select_missing")).toBe(true);
    expect(isAdminFixtureUnopenableError("mode_root_or_visible_section_missing")).toBe(false);
    expect(fixtureGap).toMatchObject({
      status: "fixture-gap",
      error: "admin_fixture_unopenable:block_select_missing",
    });
    expect(finalized.status).toBe("fixture-gap");
  });

  test("classifies frontend fixture gaps and overflow failures distinctly", () => {
    expect(
      classifyPublicStatus({
        cssChecks: ["empty-fixture"],
        statusCode: 200,
        emptyFixture: true,
        bodyOverflow: false,
        unmarkedOverflowOwnerCount: 0,
      })
    ).toEqual({ status: "fixture-gap", error: "public_fixture_empty" });

    expect(
      classifyPublicStatus({
        cssChecks: ["card-overflow"],
        statusCode: 200,
        emptyFixture: false,
        bodyOverflow: false,
        unmarkedOverflowOwnerCount: 1,
      })
    ).toEqual({ status: "failed", error: "card_overflow_unmarked" });

    expect(
      classifyPublicStatus({
        cssChecks: ["body-overflow"],
        statusCode: 200,
        emptyFixture: false,
        bodyOverflow: true,
        unmarkedOverflowOwnerCount: 1,
      })
    ).toEqual({ status: "failed", error: "body_overflow_unmarked" });
  });

  test("ignores approved intentional and visually-hidden overflow owners", () => {
    const visibleOverflow = {
      scrollWidth: 420,
      clientWidth: 320,
      width: 320,
      height: 80,
      display: "block",
      visibility: "visible",
    };

    expect(shouldCountOverflowOwner(visibleOverflow)).toBe(true);
    expect(
      shouldCountOverflowOwner({
        ...visibleOverflow,
        hasIntentionalOverflowAncestor: true,
      })
    ).toBe(true);
    expect(
      shouldCountOverflowOwner({
        ...visibleOverflow,
        hasApprovedIntentionalOverflowAncestor: true,
      })
    ).toBe(false);
    expect(shouldCountOverflowOwner({ ...visibleOverflow, className: "sr-only" })).toBe(false);
    expect(shouldCountOverflowOwner({ ...visibleOverflow, ariaHidden: "true" })).toBe(false);
  });

  test("strict mode treats fixture and metadata gaps as failures", () => {
    const report = makeReport({
      summary: {
        adminFailures: 0,
        publicFailures: 0,
        fixtureGaps: 1,
        metadataGaps: 1,
      },
    });

    expect(hasStrictFailure(report)).toBe(true);
  });

  test("renders visible section and local screenshot evidence in markdown", () => {
    const markdown = renderMarkdown(
      makeReport({
        admin: {
          skipped: false,
          loginAttempted: true,
          authenticated: true,
          results: [
            {
              widgetType: "hero",
              status: "failed",
              duplicateWritablePaths: [],
              modes: [
                {
                  mode: "wizard",
                  status: "failed",
                  rootCount: 1,
                  sectionCount: 1,
                  visibleSectionCount: 0,
                  writablePaths: [],
                  controlsWithoutPath: 0,
                  error: "mode_root_or_visible_section_missing",
                },
              ],
            },
          ],
        },
        public: {
          skipped: false,
          results: [
            {
              widgetType: "hero",
              status: "passed",
              publicPath: "/hero",
              statusCode: 200,
              bodyOverflow: false,
              viewportWidth: 1365,
              documentWidth: 1365,
              emptyFixture: false,
              screenshotPath: ".tmp/playwright-widget-contract-smoke/screenshots/public-hero.png",
              unmarkedOverflowOwners: [],
            },
          ],
        },
      })
    );

    expect(markdown).toContain("- Admin auth: authenticated");
    expect(markdown).toContain("- **Playwright session:** widget-contract-smoke");
    expect(markdown).toContain("wizard:failed r1/s1/v0");
    expect(markdown).toContain(
      "screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-hero.png"
    );
  });
});
