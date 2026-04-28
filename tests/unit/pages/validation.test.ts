import { expect, test } from "bun:test";
import Ajv from "ajv";

import {
  pageCreateSchema,
  pagePreviewSchema,
  pageUpdateSchema,
} from "../../../core/server/validation/pageSchemas";

const ajv = new Ajv({ allErrors: true, strict: true });
const validateCreate = ajv.compile(pageCreateSchema);
const validateUpdate = ajv.compile(pageUpdateSchema);
const validatePreview = ajv.compile(pagePreviewSchema);

const validBlock = {
  id: "block-1",
  type: "hero",
  variant: "centered",
  data: { headline: "Hello" },
  layout: {
    container: "default",
    padding: { top: "lg", bottom: "lg" },
    margin: { top: "none", bottom: "md" },
    background: { color: "var(--surface)", image: null },
  },
  visibility: { devices: ["desktop", "mobile"], enabled: true },
  editor: { mode: "visual", wizardCompleted: true },
};

const validCreatePayload = {
  title: "Homepage",
  slug: "/",
  data: {
    blocks: [validBlock],
    seo: { title: "Homepage" },
    settings: {
      template: "landing",
      showInNav: true,
      layout: {
        wrapper: {
          container: "default",
          maxWidth: "6xl",
          padding: { top: "md", bottom: "lg" },
          background: { color: "#ffffff", image: null },
        },
        sections: {
          gap: "lg",
          defaults: {
            container: "narrow",
            padding: { top: "xl", bottom: "xl" },
            margin: { top: "none", bottom: "sm" },
          },
        },
        applyDefaultsToNewBlocks: true,
      },
    },
  },
};

test("pageCreateSchema accepts valid payload", () => {
  expect(validateCreate(validCreatePayload)).toBe(true);
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

test("pageUpdateSchema accepts partial update", () => {
  expect(
    validateUpdate({
      title: "Updated",
      data: { blocks: [validBlock] },
    })
  ).toBe(true);
});

test("pageUpdateSchema rejects invalid blocks", () => {
  expect(
    validateUpdate({
      data: { blocks: [{ id: "b1", type: "hero" }] },
    })
  ).toBe(false);
});

test("pageUpdateSchema accepts inheritable block layout tokens", () => {
  expect(
    validateUpdate({
      data: {
        blocks: [
          {
            ...validBlock,
            layout: {
              ...validBlock.layout,
              container: "inherit",
              padding: { top: "inherit", bottom: "inherit" },
            },
          },
        ],
      },
    })
  ).toBe(true);
});

test("pageCreateSchema rejects invalid page layout tokens", () => {
  const payload = {
    ...validCreatePayload,
    data: {
      ...validCreatePayload.data,
      settings: {
        ...validCreatePayload.data.settings,
        layout: {
          ...validCreatePayload.data.settings.layout,
          sections: {
            ...validCreatePayload.data.settings.layout.sections,
            gap: "huge",
          },
        },
      },
    },
  };
  expect(validateCreate(payload)).toBe(false);
});

test("pagePreviewSchema accepts bounded probe option and rejects unknown fields", () => {
  expect(validatePreview({ ttlMinutes: 5, probe: true })).toBe(true);
  expect(validatePreview({ ttlMinutes: 5, probe: true, url: "https://evil.test" })).toBe(false);
});
