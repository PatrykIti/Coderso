import { afterEach, beforeEach, expect, test } from "bun:test";

import { contactDefaults, createContactWidget } from "../../../core/widgets/core/contact";
import { createFooterWidget } from "../../../core/widgets/core/footer";
import {
  createFeatureGridWidget,
  featureGridDefaults,
  type FeatureGridData,
} from "../../../core/widgets/core/featureGrid";
import {
  createGalleryMosaicWidget,
  galleryMosaicDefaults,
  type GalleryMosaicData,
} from "../../../core/widgets/core/galleryMosaic";
import {
  createNavigationWidget,
  navigationDefaults,
  type NavigationData,
} from "../../../core/widgets/core/navigation";
import {
  createNewsletterWidget,
  newsletterDefaults,
  type NewsletterData,
} from "../../../core/widgets/core/newsletter";
import {
  createPricingPlansWidget,
  pricingPlansDefaults,
} from "../../../core/widgets/core/pricingPlans";
import {
  createProductTableWidget,
  productTableDefaults,
} from "../../../core/widgets/core/productTable";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { clearWidgetValidators, normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetDefinition, WidgetBlock } from "../../../core/widgets/types";

const Dummy = () => null;

const definition: WidgetDefinition<{ headline: string; tone?: string }> = {
  type: "hero",
  title: "Hero",
  description: "Hero",
  category: "layout",
  complexity: "composite",
  audience: "beginner",
  module: "content",
  variants: [{ id: "centered", label: "Centered" }],
  schema: {
    type: "object",
    required: ["headline"],
    additionalProperties: false,
    properties: {
      headline: { type: "string" },
      tone: { type: "string" },
    },
  },
  defaults: { headline: "Hello", tone: "friendly" },
  editor: { wizard: Dummy, visual: Dummy, advanced: Dummy },
  render: Dummy,
};

const repeatableDefinition: WidgetDefinition<{ headline: string }> = {
  type: "layout-columns",
  title: "Layout Columns",
  description: "Layout",
  category: "layout",
  complexity: "atomic",
  audience: "advanced",
  module: "layout",
  variants: [{ id: "equal", label: "Equal" }],
  slots: [{ id: "column", label: "Column", kind: "repeatable", minItems: 2, maxItems: 3 }],
  schema: {
    type: "object",
    required: ["headline"],
    additionalProperties: false,
    properties: {
      headline: { type: "string" },
    },
  },
  defaults: { headline: "Columns" },
  editor: { wizard: Dummy, visual: Dummy, advanced: Dummy },
  render: Dummy,
};

afterEach(() => {
  clearWidgets();
  clearWidgetValidators();
});

beforeEach(() => {
  clearWidgets();
  clearWidgetValidators();
});

test("normalizeWidgetBlock merges defaults", () => {
  registerWidget(definition);
  const block: WidgetBlock = {
    id: "1",
    type: "hero",
    data: {},
  };
  const normalized = normalizeWidgetBlock(block);
  expect(normalized.data.headline).toBe("Hello");
  expect(normalized.data.tone).toBe("friendly");
  expect(normalized.variant).toBe("centered");
});

test("normalizeWidgetBlock rejects invalid variant", () => {
  registerWidget(definition);
  const block: WidgetBlock = {
    id: "1",
    type: "hero",
    variant: "bad",
    data: {},
  };
  expect(() => normalizeWidgetBlock(block)).toThrow("widget_invalid_variant");
});

test("normalizeWidgetBlock rejects schema mismatch", () => {
  registerWidget(definition);
  const block: WidgetBlock = {
    id: "1",
    type: "hero",
    data: { headline: 42 },
  };
  expect(() => normalizeWidgetBlock(block)).toThrow("widget_schema_invalid");
});

test("normalizeWidgetBlock maps legacy children into default slot", () => {
  registerWidget(definition);
  const block: WidgetBlock = {
    id: "1",
    type: "hero",
    data: { headline: "Parent" },
    children: [
      {
        id: "child-1",
        type: "hero",
        data: { headline: "Child" },
      },
    ],
  };

  const normalized = normalizeWidgetBlock(block);
  expect(normalized.slots?.default).toHaveLength(1);
  expect(normalized.children).toBeUndefined();
});

test("normalizeWidgetBlock accepts Contact runtime hydration data but rejects unknown resolved keys", () => {
  registerWidget(
    createContactWidget({
      wizard: Dummy,
      visual: Dummy,
      advanced: Dummy,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "contact-runtime",
      type: "contact",
      variant: "form-left",
      data: {
        ...contactDefaults,
        resolved: {
          formId: "form-public",
          formName: "Support",
          status: "published",
          submissionAccess: "public",
          submissionNonce: "signed-nonce",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Full name",
              name: "full_name",
              required: true,
              orderIndex: 0,
              settings: {},
            },
          ],
        },
      },
    })
  ).not.toThrow();

  expect(() =>
    normalizeWidgetBlock({
      id: "contact-runtime-bad",
      type: "contact",
      variant: "form-left",
      data: {
        ...contactDefaults,
        resolved: {
          formId: "form-public",
          extra: "nope",
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");

  expect(() =>
    normalizeWidgetBlock({
      id: "contact-runtime-field-bad",
      type: "contact",
      variant: "form-left",
      data: {
        ...contactDefaults,
        resolved: {
          formId: "form-public",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Full name",
              name: "full_name",
              required: true,
              orderIndex: 0,
              settings: {},
              extra: "nope",
            },
          ],
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");
});

test("normalizeWidgetBlock accepts Product Table compact variant and bounded style/public controls but rejects unknown keys", () => {
  registerWidget(
    createProductTableWidget({
      wizard: Dummy,
      visual: Dummy,
      advanced: Dummy,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "product-table-runtime",
      type: "product-table",
      variant: "compact",
      data: {
        ...productTableDefaults,
        style: {
          density: "compact",
          rowTreatment: "striped",
          hoverRows: true,
          stickyHeader: true,
          maxWidth: "content",
          align: "center",
          typography: "prominent",
        },
        controls: {
          showSearchInput: true,
          showCollectionFilter: true,
          showStatusFilter: true,
          sorting: "interactive",
          pagination: "paged",
          pageSize: 8,
        },
        format: {
          moneyLocale: "pl-PL",
          currencyDisplay: "code",
        },
        export: {
          enabled: true,
          label: "Download rows",
        },
        resolved: {
          items: [],
          total: 0,
          resolvedAt: "2026-05-22T12:00:00.000Z",
          runtime: {
            searchQuery: "starter",
            status: ["published"],
            collectionIds: ["collection-1"],
            availableStatuses: ["published"],
            availableCollections: [{ id: "collection-1", label: "Summer", slug: "summer" }],
            sortField: "title",
            sortDir: "asc",
            page: 2,
            pageSize: 8,
            totalPages: 3,
            previousPageHref: "?foo=bar",
            nextPageHref: "?foo=bar&pt.product-table-1.page=3",
            clearHref: "?foo=bar",
            retainedParams: [{ name: "foo", value: "bar" }],
            rejectedTokens: ["status"],
          },
        },
      },
    })
  ).not.toThrow();

  expect(() =>
    normalizeWidgetBlock({
      id: "product-table-runtime-bad",
      type: "product-table",
      variant: "default",
      data: {
        ...productTableDefaults,
        resolved: {
          items: [],
          total: 0,
          resolvedAt: "2026-05-22T12:00:00.000Z",
          runtime: {
            searchQuery: "starter",
            extra: "nope",
          },
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");

  expect(() =>
    normalizeWidgetBlock({
      id: "product-table-style-bad",
      type: "product-table",
      variant: "compact",
      data: {
        ...productTableDefaults,
        style: {
          density: "compact",
          extra: "nope",
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");

  expect(() =>
    normalizeWidgetBlock({
      id: "product-table-export-bad",
      type: "product-table",
      variant: "default",
      data: {
        ...productTableDefaults,
        export: {
          enabled: true,
          label: "Download rows",
          extra: "nope",
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");
});

test("normalizeWidgetBlock enforces repeatable minimum slots", () => {
  registerWidget(repeatableDefinition);
  const block: WidgetBlock = {
    id: "1",
    type: "layout-columns",
    data: {},
  };

  const normalized = normalizeWidgetBlock(block);
  expect(normalized.slots?.["column:1"]).toEqual([]);
  expect(normalized.slots?.["column:2"]).toEqual([]);
});

test("normalizeWidgetBlock migrates legacy repeatable key and enforces max slots", () => {
  registerWidget(repeatableDefinition);
  const block: WidgetBlock = {
    id: "1",
    type: "layout-columns",
    data: {},
    slots: {
      column: [{ id: "legacy", type: "hero", data: { headline: "Legacy" } }],
      "column:2": [{ id: "child-2", type: "hero", data: { headline: "Child 2" } }],
      "column:3": [],
      "column:4": [],
      "column:5": [],
    },
  };

  const normalized = normalizeWidgetBlock(block);
  expect(normalized.slots?.column).toBeUndefined();
  expect(normalized.slots?.["column:2"]).toHaveLength(2);
  expect(normalized.slots?.["column:5"]).toBeUndefined();
  expect(
    Object.keys(normalized.slots ?? {}).filter((key) => key.startsWith("column:"))
  ).toHaveLength(3);
});

test("normalizeWidgetBlock accepts feature grid imageAlt authoring", () => {
  registerWidget(
    createFeatureGridWidget({
      wizard: Dummy as never,
      visual: Dummy as never,
      advanced: Dummy as never,
    })
  );

  const block: WidgetBlock = {
    id: "feature-grid-1",
    type: "feature-grid",
    variant: "cards-3",
    data: {
      ...featureGridDefaults,
      items: [
        {
          id: "feature-1",
          title: "Media ready",
          image: "/media/feature.jpg",
          imageAlt: "Readable feature screenshot",
          description: "<p><strong>Rich</strong> copy</p>",
          descriptionMode: "rich",
          ctaEnabled: true,
          ctaLabel: "Open",
          ctaHref: "https://example.com",
          ctaTarget: "new-tab",
        },
      ],
      style: {
        textAlign: "center",
        cardPadding: "spacious",
        mediaSize: "lg",
        cardLayout: "horizontal",
        maxWidth: "7xl",
        headerSize: "lg",
        cardTitleSize: "lg",
        hoverEffect: "lift",
      },
    } satisfies FeatureGridData,
  };

  const normalized = normalizeWidgetBlock(block);
  expect((normalized.data as FeatureGridData).items[0]?.imageAlt).toBe(
    "Readable feature screenshot"
  );
  expect((normalized.data as FeatureGridData).style?.cardLayout).toBe("horizontal");
  expect((normalized.data as FeatureGridData).style?.hoverEffect).toBe("lift");
  expect((normalized.data as FeatureGridData).items[0]?.descriptionMode).toBe("rich");
  expect((normalized.data as FeatureGridData).items[0]?.ctaTarget).toBe("new-tab");
});

test("normalizeWidgetBlock accepts pricing plans structured pricing and rejects unknown feature metadata", () => {
  registerWidget(
    createPricingPlansWidget({
      wizard: Dummy as never,
      visual: Dummy as never,
      advanced: Dummy as never,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "pricing-runtime",
      type: "pricing-plans",
      variant: "two-plans",
      data: {
        ...pricingPlansDefaults,
        comparison: {
          stickyHeader: true,
          showHeaderBadges: true,
          showHeaderCta: true,
        },
        layout: {
          maxWidth: "wide",
          typography: "prominent",
          footerNote: "All prices exclude VAT.",
        },
        plans: [
          {
            id: "starter",
            name: "Starter",
            description: "For small teams",
            badge: "Popular",
            badgeTone: "accent",
            price: "$19",
            period: "/month",
            priceDisplay: {
              mode: "structured",
              amount: 19,
              annualAmount: 190,
              currency: "USD",
              annualSavingsLabel: "2 months free",
            },
            features: [
              "Email support",
              { text: "Priority onboarding", status: "premium", icon: "sparkle" },
            ],
            ctaLabel: "Start",
            ctaHref: "/start",
            ctaStyle: "outline",
            highlighted: false,
          },
          {
            id: "growth",
            name: "Growth",
            price: "$49",
            period: "/month",
            features: [{ text: "Advanced analytics", status: "coming-soon", icon: "clock" }],
            ctaLabel: "Upgrade",
            ctaHref: "/upgrade",
            highlighted: true,
          },
        ],
      },
    })
  ).not.toThrow();

  expect(() =>
    normalizeWidgetBlock({
      id: "pricing-runtime-invalid",
      type: "pricing-plans",
      variant: "two-plans",
      data: {
        ...pricingPlansDefaults,
        plans: [
          {
            id: "starter",
            name: "Starter",
            price: "$19",
            features: [{ text: "Email support", extra: "nope" }],
          },
          {
            id: "growth",
            name: "Growth",
            price: "$49",
          },
        ],
      } as never,
    })
  ).toThrow("widget_schema_invalid");
});

test("normalizeWidgetBlock accepts footer brand, visibility, and target extensions", () => {
  registerWidget(
    createFooterWidget({
      wizard: Dummy,
      visual: Dummy,
      advanced: Dummy,
    })
  );

  const normalized = normalizeWidgetBlock({
    id: "footer-1",
    type: "footer",
    variant: "columns-2",
    data: {
      columns: [{ title: "Company", links: [{ label: "Docs", href: "/docs", target: "_blank" }] }],
      brand: {
        logoText: "Coderso",
        tagline: "Build confidently",
      },
      legal: {
        enabled: false,
        privacy: "/privacy",
        privacyLabel: "Privacy policy",
        privacyTarget: "_blank",
      },
      socialEnabled: true,
      social: [{ type: "custom", href: "https://community.example", label: "Community" }],
      layout: {
        paddingX: "8",
        columnBreakpoint: "lg",
      },
      style: {
        linkUnderline: "always",
        linkFontWeight: "semibold",
        linkLetterSpacing: "wide",
      },
    },
  });

  expect(normalized.data.brand).toBeDefined();
  expect(normalized.data.layout).toMatchObject({
    paddingX: "8",
    columnBreakpoint: "lg",
  });
});

test("normalizeWidgetBlock rejects unknown footer keys", () => {
  registerWidget(
    createFooterWidget({
      wizard: Dummy,
      visual: Dummy,
      advanced: Dummy,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "footer-2",
      type: "footer",
      variant: "columns-2",
      data: {
        columns: [{ title: "Company", links: [] }],
        style: {
          mysteryColor: "#ffffff",
        },
      },
    })
  ).toThrow("widget_schema_invalid");
});

test("normalizeWidgetBlock accepts gallery mosaic per-item media presentation fields", () => {
  registerWidget(
    createGalleryMosaicWidget({
      wizard: Dummy as never,
      visual: Dummy as never,
      advanced: Dummy as never,
    })
  );

  const block: WidgetBlock = {
    id: "gallery-1",
    type: "gallery-mosaic",
    variant: "mosaic",
    data: {
      ...galleryMosaicDefaults,
      interaction: {
        mode: "lightbox",
        zoom: "fill",
      },
      style: {
        ...galleryMosaicDefaults.style,
        layoutDensity: "dense",
        motionPreset: "slide-up",
      },
      items: [
        {
          id: "gallery-a",
          image: "https://cdn.example.com/one.jpg",
          alt: "Accessible alt",
          poster: "https://cdn.example.com/poster.jpg",
          objectPosition: "right",
          ratio: "1:1",
        },
      ],
    } satisfies GalleryMosaicData,
  };

  const normalized = normalizeWidgetBlock(block);
  expect(normalized.data).toEqual(
    expect.objectContaining({
      items: [
        expect.objectContaining({
          alt: "Accessible alt",
          poster: "https://cdn.example.com/poster.jpg",
          objectPosition: "right",
          ratio: "1:1",
        }),
      ],
    })
  );
});

test("normalizeWidgetBlock rejects invalid gallery mosaic media presentation enums", () => {
  registerWidget(
    createGalleryMosaicWidget({
      wizard: Dummy as never,
      visual: Dummy as never,
      advanced: Dummy as never,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "gallery-2",
      type: "gallery-mosaic",
      variant: "mosaic",
      data: {
        ...galleryMosaicDefaults,
        items: [
          {
            id: "gallery-a",
            image: "https://cdn.example.com/one.jpg",
            objectPosition: "diagonal",
          },
        ],
      },
    })
  ).toThrow("widget_schema_invalid");
});

test("normalizeWidgetBlock rejects invalid gallery mosaic interaction enums", () => {
  registerWidget(
    createGalleryMosaicWidget({
      wizard: Dummy as never,
      visual: Dummy as never,
      advanced: Dummy as never,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "gallery-3",
      type: "gallery-mosaic",
      variant: "mosaic",
      data: {
        ...galleryMosaicDefaults,
        interaction: {
          mode: "modal",
          zoom: "explode",
        },
      } as unknown as GalleryMosaicData,
    })
  ).toThrow("widget_schema_invalid");
});

test("normalizeWidgetBlock rejects invalid gallery mosaic density and motion enums", () => {
  registerWidget(
    createGalleryMosaicWidget({
      wizard: Dummy as never,
      visual: Dummy as never,
      advanced: Dummy as never,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "gallery-4",
      type: "gallery-mosaic",
      variant: "mosaic",
      data: {
        ...galleryMosaicDefaults,
        style: {
          ...galleryMosaicDefaults.style,
          layoutDensity: "fluid",
          motionPreset: "bounce",
        },
      } as unknown as GalleryMosaicData,
    })
  ).toThrow("widget_schema_invalid");
});

test("normalizeWidgetBlock accepts navigation active-link mode and manual link targets", () => {
  registerWidget(
    createNavigationWidget({
      wizard: Dummy as never,
      visual: Dummy as never,
      advanced: Dummy as never,
    })
  );

  const normalized = normalizeWidgetBlock({
    id: "navigation-1",
    type: "navigation",
    variant: "with-cta",
    data: {
      ...navigationDefaults,
      items: [
        {
          label: "Docs",
          href: "/docs",
          target: "blank",
          children: [{ label: "API", href: "/docs/api", target: "blank" }],
        },
      ],
      behavior: {
        ...navigationDefaults.behavior,
        activeLinkMode: "exact",
      },
    } satisfies NavigationData,
  });

  const data = normalized.data as NavigationData;
  expect(data.behavior?.activeLinkMode).toBe("exact");
  expect(data.items[0]?.target).toBe("blank");
  expect(data.items[0]?.children?.[0]?.target).toBe("blank");
});

test("normalizeWidgetBlock rejects invalid navigation active-link mode and target enums", () => {
  registerWidget(
    createNavigationWidget({
      wizard: Dummy as never,
      visual: Dummy as never,
      advanced: Dummy as never,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "navigation-invalid",
      type: "navigation",
      variant: "with-cta",
      data: {
        ...navigationDefaults,
        items: [{ label: "Docs", href: "/docs", target: "new-tab" }],
        behavior: {
          ...navigationDefaults.behavior,
          activeLinkMode: "prefix",
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");
});

test("normalizeWidgetBlock accepts newsletter first-name and double opt-in metadata", () => {
  registerWidget(
    createNewsletterWidget({
      wizard: Dummy as never,
      visual: Dummy as never,
      advanced: Dummy as never,
    })
  );

  const normalized = normalizeWidgetBlock({
    id: "newsletter-1",
    type: "newsletter",
    variant: "stacked",
    data: {
      ...newsletterDefaults,
      form: {
        ...newsletterDefaults.form,
        firstName: {
          ...newsletterDefaults.form?.firstName,
          enabled: true,
          label: "First name",
          placeholder: "Jamie",
          fieldName: "customer_first_name",
          required: true,
        },
      },
      optIn: {
        ...newsletterDefaults.optIn,
        mode: "double",
        confirmationCopy: "Check your inbox to confirm.",
      },
    } satisfies NewsletterData,
  });

  const data = normalized.data as NewsletterData;
  expect(data.form?.firstName).toEqual(
    expect.objectContaining({
      enabled: true,
      fieldName: "customer_first_name",
    })
  );
  expect(data.optIn?.mode).toBe("double");
  expect(data.optIn?.enforcement).toBe("provider-owned");
});

test("normalizeWidgetBlock rejects invalid newsletter field and opt-in config", () => {
  registerWidget(
    createNewsletterWidget({
      wizard: Dummy as never,
      visual: Dummy as never,
      advanced: Dummy as never,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "newsletter-invalid",
      type: "newsletter",
      variant: "inline",
      data: {
        ...newsletterDefaults,
        form: {
          ...newsletterDefaults.form,
          firstName: {
            ...newsletterDefaults.form?.firstName,
            enabled: true,
            helperText: "extra",
          },
        },
        optIn: {
          ...newsletterDefaults.optIn,
          enforcement: "coderso-owned",
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");
});
