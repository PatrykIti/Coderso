import { expect, test } from "bun:test";
import Ajv from "ajv";

import {
  pageCreateSchema,
  pagePreviewSchema,
  pageUpdateSchema,
} from "../../../core/server/validation/pageSchemas";
import {
  PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
  type PageBlockV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

const ajv = new Ajv({ allErrors: true, strict: true });
const validateCreate = ajv.compile(pageCreateSchema);
const validateUpdate = ajv.compile(pageUpdateSchema);
const validatePreview = ajv.compile(pagePreviewSchema);

const validSection: PageSectionV2 = {
  id: "sec_hero",
  type: "hero",
  name: "Hero",
  variant: "split",
  layout: {
    columns: 2,
    align: "center",
    justify: "between",
    maxWidth: 1080,
  },
  style: {
    background: "#ffffff",
    backgroundType: "color",
    backgroundImage: null,
    accent: "#0d9488",
    radius: 12,
    shadow: "sm",
  },
  spacing: {
    paddingTop: 72,
    paddingBottom: 72,
    paddingLeft: 40,
    paddingRight: 40,
    gap: 32,
  },
  visibility: {
    visible: true,
    authOnly: false,
    anchor: "hero",
    startsAt: null,
    endsAt: null,
  },
  responsive: {
    tablet: { layout: { columns: 1 } },
    mobile: {
      layout: { columns: 1 },
      spacing: { paddingLeft: 20, paddingRight: 20 },
    },
  },
  blocks: [
    {
      id: "blk_heading",
      type: "heading",
      props: {
        text: "Hello",
        level: "h1",
        align: "left",
      },
      visibility: { visible: true },
    },
  ],
};

const validCreatePayload: {
  title: string;
  slug: string;
  data: {
    schemaVersion: 2;
    breakpoints: string[];
    sections: PageSectionV2[];
    seo: Record<string, unknown>;
    settings: Record<string, unknown>;
  };
} = {
  title: "Homepage",
  slug: "/",
  data: {
    schemaVersion: 2,
    breakpoints: ["desktop", "tablet", "mobile"],
    sections: [validSection],
    seo: { title: "Homepage" },
    settings: {
      template: "page-v2",
      showInNav: true,
      revisionRetention: 20,
    },
  },
};

const cloneValue = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const nestedLayoutBlock: PageBlockV2 = {
  id: "blk_container",
  type: "container",
  props: {},
  visibility: { visible: true },
  slots: {
    children: [
      {
        id: "blk_columns",
        type: "columns",
        props: { count: 2, gap: 24, distribution: "equal" },
        visibility: { visible: true },
        slots: {
          "column:1": [
            {
              id: "blk_nested_heading",
              type: "heading",
              props: { text: "Nested", level: "h2", align: "left" },
              visibility: { visible: true },
            },
          ],
          "column:2": [],
        },
      },
    ],
  },
};

test("pageCreateSchema accepts valid payload", () => {
  expect(validateCreate(validCreatePayload)).toBe(true);
});

test("pageCreateSchema accepts persisted collection link metadata", () => {
  expect(
    validateCreate({
      ...validCreatePayload,
      data: {
        ...validCreatePayload.data,
        settings: {
          ...validCreatePayload.data.settings,
          collectionLink: {
            contentTypeId: "type-1",
            pageRole: "canonical-list-page",
            listingQueryId: "query-1",
            listingTemplateId: "template-1",
          },
        },
      },
    })
  ).toBe(true);
});

test("pageCreateSchema rejects missing title", () => {
  const payload = { ...validCreatePayload } as Record<string, unknown>;
  delete payload.title;
  expect(validateCreate(payload)).toBe(false);
});

test("pageCreateSchema rejects unknown root fields", () => {
  const payload = { ...validCreatePayload, extra: "nope" };
  expect(validateCreate(payload)).toBe(false);
});

test("pageCreateSchema rejects malformed collection link metadata", () => {
  expect(
    validateCreate({
      ...validCreatePayload,
      data: {
        ...validCreatePayload.data,
        settings: {
          ...validCreatePayload.data.settings,
          collectionLink: {
            contentTypeId: "",
            pageRole: "maybe-canonical",
          },
        },
      },
    })
  ).toBe(false);
});

test("pageUpdateSchema accepts partial update", () => {
  expect(
    validateUpdate({
      title: "Updated",
      data: {
        schemaVersion: 2,
        sections: [validSection],
      },
    })
  ).toBe(true);
});

test("pageUpdateSchema rejects legacy v1 blocks", () => {
  expect(
    validateUpdate({
      data: { blocks: [{ id: "b1", type: "hero" }] },
    })
  ).toBe(false);
});

test("pageUpdateSchema accepts responsive overrides", () => {
  expect(
    validateUpdate({
      data: {
        schemaVersion: 2,
        sections: [
          {
            ...validSection,
            responsive: {
              tablet: { layout: { columns: 1 } },
              mobile: { visibility: { visible: false } },
            },
          },
        ],
      },
    })
  ).toBe(true);
});

test("page schemas validate bounded recursive layout block slots", () => {
  const payload = cloneValue(validCreatePayload);
  payload.data.sections[0]!.blocks = [nestedLayoutBlock];

  expect(validateCreate(payload)).toBe(true);

  const unknownNestedField = cloneValue(payload);
  unknownNestedField.data.sections[0]!.blocks[0]!.slots!.children![0]!.slots!["column:1"]![0] = {
    ...unknownNestedField.data.sections[0]!.blocks[0]!.slots!.children![0]!.slots!["column:1"]![0],
    debug: true,
  } as PageBlockV2;
  expect(validateCreate(unknownNestedField)).toBe(false);

  const slotsOnAtom = cloneValue(payload);
  slotsOnAtom.data.sections[0]!.blocks[0]!.slots!.children![0]!.slots!["column:1"]![0] = {
    ...slotsOnAtom.data.sections[0]!.blocks[0]!.slots!.children![0]!.slots!["column:1"]![0],
    slots: { children: [] },
  } as PageBlockV2;
  expect(validateCreate(slotsOnAtom)).toBe(false);

  const unknownSlot = cloneValue(payload);
  const unknownSlotMap = unknownSlot.data.sections[0]!.blocks[0]!.slots as Record<
    string,
    PageBlockV2[]
  >;
  unknownSlotMap.header = [];
  expect(validateCreate(unknownSlot)).toBe(false);

  const tooManyChildren = cloneValue(payload);
  tooManyChildren.data.sections[0]!.blocks[0]!.slots!.children = Array.from(
    { length: PAGE_BLOCK_MAX_CHILDREN_PER_SLOT + 1 },
    (_, index) => ({
      id: `blk_many_${index}`,
      type: "heading",
      props: { text: `Nested ${index}`, level: "h2", align: "left" },
      visibility: { visible: true },
    })
  );
  expect(validateCreate(tooManyChildren)).toBe(false);

  const tooDeep = cloneValue(payload);
  tooDeep.data.sections[0]!.blocks = [
    {
      id: "blk_depth_1",
      type: "container",
      props: {},
      visibility: { visible: true },
      slots: {
        children: [
          {
            id: "blk_depth_2",
            type: "container",
            props: {},
            visibility: { visible: true },
            slots: {
              children: [
                {
                  id: "blk_depth_3",
                  type: "container",
                  props: {},
                  visibility: { visible: true },
                  slots: {
                    children: [
                      {
                        id: "blk_depth_4",
                        type: "container",
                        props: {},
                        visibility: { visible: true },
                        slots: {
                          children: [
                            {
                              id: "blk_depth_5",
                              type: "heading",
                              props: { text: "Too deep", level: "h2", align: "left" },
                              visibility: { visible: true },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ];
  expect(validateCreate(tooDeep)).toBe(false);
});

test("pageCreateSchema rejects invalid section layout tokens", () => {
  const payload = {
    ...validCreatePayload,
    data: {
      ...validCreatePayload.data,
      sections: [
        {
          ...validSection,
          layout: {
            ...validSection.layout,
            align: "middle",
          },
        },
      ],
    },
  };
  expect(validateCreate(payload)).toBe(false);
});

test("pagePreviewSchema accepts bounded probe option and rejects unknown fields", () => {
  expect(validatePreview({ ttlMinutes: 5, probe: true })).toBe(true);
  expect(validatePreview({ ttlMinutes: 5, probe: true, url: "https://evil.test" })).toBe(false);
});
