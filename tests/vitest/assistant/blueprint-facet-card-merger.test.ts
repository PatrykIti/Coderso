import { expect, test } from "vitest";

import {
  collectListingFacetQueryFields,
  mergeListingFacets,
  validateListingFacetsAgainstSchema,
} from "../../../core/services/assistant/blueprints/blueprintFacetMerger";
import {
  collectListingCardQueryFields,
  mergeListingCardConfig,
  validateListingCardConfigAgainstSchema,
} from "../../../core/services/assistant/blueprints/blueprintCardConfigMerger";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    areaM2: { type: "number", xFieldType: "number" },
    rooms: { type: "number", xFieldType: "number" },
    projectStatus: {
      type: "string",
      xFieldType: "select",
      enum: ["available", "reserved", "sold"],
    },
    deliveryTimeDays: { type: "number", xFieldType: "number" },
  },
} as const;

test("mergeListingFacets merges checkbox and range facets and dedupes options", () => {
  const merged = mergeListingFacets(
    [
      {
        id: "rooms",
        kind: "checkbox",
        label: "Rooms",
        field: "data.rooms",
        op: "in",
        options: [{ value: "3", label: "3 rooms" }],
      },
      {
        id: "area",
        kind: "range",
        label: "Area",
        field: "data.areaM2",
        op: "between",
      },
    ],
    [
      {
        id: "rooms",
        kind: "checkbox",
        label: "Rooms",
        field: "data.rooms",
        op: "in",
        options: [
          { value: "3", label: "3 rooms" },
          { value: "4", label: "4 rooms" },
        ],
      },
    ]
  );

  expect(merged).toEqual([
    {
      id: "rooms",
      kind: "checkbox",
      label: "Rooms",
      field: "data.rooms",
      op: "in",
      options: [
        { value: "3", label: "3 rooms" },
        { value: "4", label: "4 rooms" },
      ],
    },
    {
      id: "area",
      kind: "range",
      label: "Area",
      field: "data.areaM2",
      op: "between",
    },
  ]);
});

test("mergeListingFacets merges sort facet options", () => {
  const merged = mergeListingFacets(
    [
      {
        id: "sort",
        kind: "sort",
        label: "Sort",
        sortOptions: [{ value: "title-asc", label: "Title", field: "title", dir: "asc" }],
      },
    ],
    [
      {
        id: "sort",
        kind: "sort",
        label: "Sort",
        sortOptions: [
          { value: "title-asc", label: "Title", field: "title", dir: "asc" },
          { value: "updated-desc", label: "Updated", field: "updatedAt", dir: "desc" },
        ],
      },
    ]
  );

  expect(merged[0]).toMatchObject({
    id: "sort",
    sortOptions: [
      { value: "title-asc", label: "Title", field: "title", dir: "asc" },
      { value: "updated-desc", label: "Updated", field: "updatedAt", dir: "desc" },
    ],
  });
});

test("mergeListingFacets rejects incompatible duplicate option labels", () => {
  expect(() =>
    mergeListingFacets(
      [
        {
          id: "status",
          kind: "checkbox",
          label: "Status",
          field: "data.projectStatus",
          op: "in",
          options: [{ value: "available", label: "Available" }],
        },
      ],
      [
        {
          id: "status",
          kind: "checkbox",
          label: "Status",
          field: "data.projectStatus",
          op: "in",
          options: [{ value: "available", label: "Ready now" }],
        },
      ]
    )
  ).toThrowError('Facet option "available" has incompatible labels across composed fragments.');
});

test("validateListingFacetsAgainstSchema rejects facets pointing at missing fields", () => {
  expect(() =>
    validateListingFacetsAgainstSchema(schema, [
      {
        id: "unknown",
        kind: "checkbox",
        label: "Unknown",
        field: "data.unknownField",
        op: "in",
      },
    ])
  ).toThrowError('Listing facet "Unknown" references missing field "data.unknownField".');
});

test("mergeListingCardConfig keeps field order and dedupes bindings", () => {
  const merged = mergeListingCardConfig(
    {
      fields: [
        {
          key: "summary",
          source: "data.summary",
          label: "Summary",
          fallback: null,
          format: "text",
          conditions: [],
        },
      ],
      itemActions: [
        { id: "view-entry", label: "View", kind: "view", href: null, opensInNewTab: false },
      ],
      emptyState: { title: "No items", description: null, ctaLabel: null, ctaHref: null },
      style: { columns: 3, gap: "md", cardVariant: "default" },
    },
    {
      fields: [
        {
          key: "summary",
          source: "data.summary",
          label: "Summary",
          fallback: null,
          format: "text",
          conditions: [],
        },
        {
          key: "delivery-time",
          source: "data.deliveryTimeDays",
          label: "Delivery time",
          fallback: null,
          format: "text",
          conditions: [{ id: "status", field: "data.projectStatus", op: "eq", value: "available" }],
        },
      ],
      itemActions: [
        { id: "view-entry", label: "View", kind: "view", href: null, opensInNewTab: false },
      ],
      emptyState: { title: "No items", description: null, ctaLabel: null, ctaHref: null },
      style: { columns: 2, gap: "sm", cardVariant: "minimal" },
    }
  );

  expect(merged).toMatchObject({
    fields: [
      { key: "summary", source: "data.summary" },
      {
        key: "delivery-time",
        source: "data.deliveryTimeDays",
        conditions: [{ field: "data.projectStatus", op: "eq", value: "available" }],
      },
    ],
    style: { columns: 3, gap: "md", cardVariant: "default" },
  });
});

test("validateListingCardConfigAgainstSchema rejects missing card binding fields", () => {
  expect(() =>
    validateListingCardConfigAgainstSchema(schema, {
      fields: [
        {
          key: "unknown",
          source: "data.unknownField",
          label: "Unknown",
          fallback: null,
          format: "text",
          conditions: [],
        },
      ],
      itemActions: [],
      emptyState: { title: "No items", description: null, ctaLabel: null, ctaHref: null },
      style: { columns: 3, gap: "md", cardVariant: "default" },
    })
  ).toThrowError('Listing card field "unknown" references missing source "data.unknownField".');
});

test("collect listing query helper fields include facet and card condition sources", () => {
  const facets = validateListingFacetsAgainstSchema(schema, [
    {
      id: "rooms",
      kind: "checkbox",
      label: "Rooms",
      field: "data.rooms",
      op: "in",
    },
    {
      id: "sort",
      kind: "sort",
      label: "Sort",
      sortOptions: [{ value: "title-asc", label: "Title", field: "title", dir: "asc" }],
    },
  ]);
  const card = validateListingCardConfigAgainstSchema(schema, {
    fields: [
      {
        key: "delivery-time",
        source: "data.deliveryTimeDays",
        label: "Delivery time",
        fallback: null,
        format: "text",
        conditions: [{ id: "status", field: "data.projectStatus", op: "eq", value: "available" }],
      },
    ],
    itemActions: [],
    emptyState: { title: "No items", description: null, ctaLabel: null, ctaHref: null },
    style: { columns: 3, gap: "md", cardVariant: "default" },
  });

  expect(collectListingFacetQueryFields(facets)).toEqual(["data.rooms"]);
  expect(collectListingCardQueryFields(card)).toEqual([
    "data.deliveryTimeDays",
    "data.projectStatus",
  ]);
});

test("mergeListingFacets and card config cover Mabudo-like house-project filter and card fragments", () => {
  const mabudoSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      projectCode: { type: "string", xFieldType: "text" },
      priceFrom: { type: "number", xFieldType: "number" },
      pricePackageStart: { type: "number", xFieldType: "number" },
      roofType: {
        type: "string",
        xFieldType: "select",
        enum: ["gable", "flat"],
      },
      houseStyle: {
        type: "string",
        xFieldType: "select",
        enum: ["modern", "classic"],
      },
      garageType: {
        type: "string",
        xFieldType: "select",
        enum: ["none", "single"],
      },
    },
  } as const;

  const facets = validateListingFacetsAgainstSchema(
    mabudoSchema,
    mergeListingFacets(
      [
        {
          id: "roof-type",
          kind: "checkbox",
          label: "Roof type",
          field: "data.roofType",
          op: "in",
          options: [{ value: "gable", label: "Gable" }],
        },
      ],
      [
        {
          id: "house-style",
          kind: "checkbox",
          label: "House style",
          field: "data.houseStyle",
          op: "in",
          options: [{ value: "modern", label: "Modern" }],
        },
        {
          id: "garage-type",
          kind: "checkbox",
          label: "Garage",
          field: "data.garageType",
          op: "in",
          options: [{ value: "single", label: "Single garage" }],
        },
      ]
    )
  );

  const card = validateListingCardConfigAgainstSchema(mabudoSchema, {
    fields: [
      {
        key: "project-code",
        source: "data.projectCode",
        label: "Project code",
        fallback: null,
        format: "text",
        conditions: [],
      },
      {
        key: "package-start",
        source: "data.pricePackageStart",
        label: "Start package",
        fallback: null,
        format: "text",
        conditions: [{ id: "roof", field: "data.roofType", op: "eq", value: "gable" }],
      },
    ],
    itemActions: [],
    emptyState: { title: "No items", description: null, ctaLabel: null, ctaHref: null },
    style: { columns: 3, gap: "md", cardVariant: "default" },
  });

  expect(facets.map((facet) => facet.id)).toEqual(["roof-type", "house-style", "garage-type"]);
  expect(collectListingFacetQueryFields(facets)).toEqual([
    "data.roofType",
    "data.houseStyle",
    "data.garageType",
  ]);
  expect(collectListingCardQueryFields(card)).toEqual([
    "data.projectCode",
    "data.pricePackageStart",
    "data.roofType",
  ]);
});
