import { describe, expect, test } from "vitest";

import {
  matchPopupAudience,
  matchPopupRequest,
  matchPopupTargeting,
  toPublicPopup,
} from "../../../core/services/popups/popupPublicContract";
import { popupPublicQuerySchema } from "../../../core/server/validation/popupSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";
import type { Popup } from "../../../core/services/popups/popupTypes";

const makePopup = (overrides: Partial<Popup> = {}): Popup => ({
  id: "popup-1",
  name: "Internal Name",
  slug: "spring-sale",
  status: "published",
  trigger: { type: "time_delay", delaySeconds: 5 },
  targeting: {
    includePaths: ["/blog/*"],
    excludePaths: ["/blog/private"],
    audience: "all",
  },
  frequency: { strategy: "session_once", cooldownMinutes: 30 },
  content: {
    title: "Spring Sale",
    body: "20% off everything",
    templateId: "template-9",
    ctaLabel: "Shop now",
    ctaHref: "/shop",
  },
  settings: { placement: "center", dismissible: true, showOverlay: true },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  publishedAt: "2026-01-02T00:00:00.000Z",
  ...overrides,
});

describe("matchPopupTargeting", () => {
  test("empty includePaths matches all paths", () => {
    const targeting: Popup["targeting"] = {
      includePaths: [],
      excludePaths: [],
      audience: "all",
    };
    expect(matchPopupTargeting(targeting, "/any/path")).toBe(true);
    expect(matchPopupTargeting(targeting, "/")).toBe(true);
  });

  test("exclude wins over include", () => {
    const targeting: Popup["targeting"] = {
      includePaths: ["/blog/*"],
      excludePaths: ["/blog/private"],
      audience: "all",
    };
    expect(matchPopupTargeting(targeting, "/blog/private")).toBe(false);
    expect(matchPopupTargeting(targeting, "/blog/public")).toBe(true);
  });

  test("trailing /* prefix glob matches the base path and descendants", () => {
    const targeting: Popup["targeting"] = {
      includePaths: ["/blog/*"],
      excludePaths: [],
      audience: "all",
    };
    expect(matchPopupTargeting(targeting, "/blog")).toBe(true);
    expect(matchPopupTargeting(targeting, "/blog/post-1")).toBe(true);
    expect(matchPopupTargeting(targeting, "/blog/nested/post")).toBe(true);
    expect(matchPopupTargeting(targeting, "/blogish")).toBe(false);
  });

  test("exact pattern matches only the exact path", () => {
    const targeting: Popup["targeting"] = {
      includePaths: ["/blog"],
      excludePaths: [],
      audience: "all",
    };
    expect(matchPopupTargeting(targeting, "/blog")).toBe(true);
    expect(matchPopupTargeting(targeting, "/blog/post-1")).toBe(false);
    expect(matchPopupTargeting(targeting, "/blog/")).toBe(false);
  });

  test("non-matching path returns false", () => {
    const targeting: Popup["targeting"] = {
      includePaths: ["/shop/*", "/about"],
      excludePaths: [],
      audience: "all",
    };
    expect(matchPopupTargeting(targeting, "/contact")).toBe(false);
    expect(matchPopupTargeting(targeting, "/")).toBe(false);
  });
});

describe("matchPopupAudience", () => {
  test("covers the 3x2 audience truth table", () => {
    expect(matchPopupAudience("all", true)).toBe(true);
    expect(matchPopupAudience("all", false)).toBe(true);
    expect(matchPopupAudience("logged_in", true)).toBe(true);
    expect(matchPopupAudience("logged_in", false)).toBe(false);
    expect(matchPopupAudience("logged_out", true)).toBe(false);
    expect(matchPopupAudience("logged_out", false)).toBe(true);
  });
});

describe("matchPopupRequest", () => {
  test("matches when both targeting and audience apply", () => {
    const popup = makePopup({
      targeting: { includePaths: ["/blog/*"], excludePaths: [], audience: "logged_in" },
    });
    expect(
      matchPopupRequest(popup, { path: "/blog/post-1", isLoggedIn: true }),
    ).toBe(true);
  });

  test("fails when the path does not match", () => {
    const popup = makePopup({
      targeting: { includePaths: ["/blog/*"], excludePaths: [], audience: "all" },
    });
    expect(
      matchPopupRequest(popup, { path: "/contact", isLoggedIn: true }),
    ).toBe(false);
  });

  test("fails when the audience does not match", () => {
    const popup = makePopup({
      targeting: { includePaths: ["/blog/*"], excludePaths: [], audience: "logged_in" },
    });
    expect(
      matchPopupRequest(popup, { path: "/blog/post-1", isLoggedIn: false }),
    ).toBe(false);
  });

  test("fails when an exclude path wins", () => {
    const popup = makePopup();
    expect(
      matchPopupRequest(popup, { path: "/blog/private", isLoggedIn: true }),
    ).toBe(false);
  });
});

describe("toPublicPopup", () => {
  test("projects exactly the 6 public keys and strips the PII gate fields", () => {
    const result = toPublicPopup(makePopup());
    expect(Object.keys(result).sort()).toEqual([
      "content",
      "frequency",
      "id",
      "settings",
      "slug",
      "trigger",
    ]);
    const forbidden = [
      "name",
      "status",
      "targeting",
      "createdAt",
      "updatedAt",
      "publishedAt",
    ];
    for (const key of forbidden) {
      expect(result).not.toHaveProperty(key);
    }
  });

  test("strips content.templateId and keeps only render fields", () => {
    const result = toPublicPopup(makePopup());
    expect(Object.keys(result.content).sort()).toEqual([
      "body",
      "ctaHref",
      "ctaLabel",
      "title",
    ]);
    expect(result.content).not.toHaveProperty("templateId");
  });

  test("preserves public field values", () => {
    const popup = makePopup();
    const result = toPublicPopup(popup);
    expect(result.id).toBe(popup.id);
    expect(result.slug).toBe(popup.slug);
    expect(result.trigger).toEqual(popup.trigger);
    expect(result.frequency).toEqual(popup.frequency);
    expect(result.settings).toEqual(popup.settings);
    expect(result.content).toEqual({
      title: "Spring Sale",
      body: "20% off everything",
      ctaLabel: "Shop now",
      ctaHref: "/shop",
    });
  });

  test("keeps nullable content fields as null", () => {
    const result = toPublicPopup(
      makePopup({
        content: {
          title: null,
          body: null,
          templateId: "template-9",
          ctaLabel: null,
          ctaHref: null,
        },
      }),
    );
    expect(result.content).toEqual({
      title: null,
      body: null,
      ctaLabel: null,
      ctaHref: null,
    });
  });
});

describe("popupPublicQuerySchema", () => {
  test("accepts a valid path", () => {
    expect(() => validate(popupPublicQuerySchema, { path: "/blog" })).not.toThrow();
  });

  test("rejects an unknown query key", () => {
    expect(() =>
      validate(popupPublicQuerySchema, { path: "/blog", audience: "logged_in" }),
    ).toThrow("Invalid payload");
  });

  test("rejects a missing path", () => {
    expect(() => validate(popupPublicQuerySchema, {})).toThrow("Invalid payload");
  });

  test("rejects an empty path", () => {
    expect(() => validate(popupPublicQuerySchema, { path: "" })).toThrow(
      "Invalid payload",
    );
  });
});
