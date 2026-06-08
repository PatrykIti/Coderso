import { expect, test } from "vitest";

import {
  mergeContentTypeSchemaFields,
  normalizeContentTypeFieldAddSpec,
} from "../../../core/services/content/contentTypeSchemaFields";
import { inferContentTypeFieldAdditions } from "../../../core/services/assistant/contentTypeFieldInference";
import {
  assertAssistantPromptWithinBudget,
  assertAssistantPromptWithinPackageBudget,
  deriveAssistantPromptCharLimit,
  deriveAssistantPromptCharLimitAfterOverhead,
} from "../../../core/services/assistant/promptLimits";

test("mergeContentTypeSchemaFields adds supported fields without replacing existing schema", () => {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["title"],
    properties: {
      title: { type: "string", title: "Title" },
    },
  };

  const next = mergeContentTypeSchemaFields(schema, [
    { name: "price_amount", type: "number", label: "Price Amount", numberFormat: "decimal" },
    {
      name: "gallery_images",
      type: "media",
      label: "Gallery Images",
      multiple: true,
      mediaAccept: ["image/*"],
    },
  ]);
  const properties = next.properties as Record<string, unknown>;

  expect(properties["title"]).toEqual({ type: "string", title: "Title" });
  expect(properties["price_amount"]).toMatchObject({
    type: "number",
    title: "Price Amount",
    xFieldType: "number",
  });
  expect(properties["gallery_images"]).toMatchObject({
    type: "array",
    items: { type: "string" },
    xFieldType: "media",
    xFieldConfig: { media: { multiple: true, accept: ["image/*"] } },
  });
  expect(next.required).toEqual(["title"]);
});

test("mergeContentTypeSchemaFields rejects duplicate and secret-like fields", () => {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
    },
  };

  expect(() => mergeContentTypeSchemaFields(schema, [{ name: "title", type: "text" }])).toThrow(
    "content_type_field_conflict"
  );
  expect(() => normalizeContentTypeFieldAddSpec({ name: "api_token", type: "text" })).toThrow(
    "content_type_field_name_secret_like"
  );
});

test("inferContentTypeFieldAdditions maps generic field lists and gates object arrays", () => {
  const inferred = inferContentTypeFieldAdditions(`# Project
title
project_code
full_description
usable_area_m2
featured_image
exterior_gallery[]
tags[]
rooms[]
  - room_name
  - room_area_m2
project_pdf`);

  expect(inferred.fields).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "title", type: "text" }),
      expect.objectContaining({ name: "project_code", type: "text" }),
      expect.objectContaining({ name: "full_description", type: "richtext" }),
      expect.objectContaining({ name: "usable_area_m2", type: "number" }),
      expect.objectContaining({ name: "featured_image", type: "media" }),
      expect.objectContaining({ name: "exterior_gallery", type: "media", multiple: true }),
      expect.objectContaining({
        name: "project_pdf",
        type: "media",
        mediaAccept: ["application/pdf"],
      }),
    ])
  );
  expect(inferred.fields.some((field) => field.name === "tags")).toBe(false);
  expect(inferred.gates).toEqual(
    expect.arrayContaining([
      { name: "tags", reason: "array_field_unsupported" },
      { name: "rooms", reason: "array_field_unsupported" },
      { name: "rooms.room_name", reason: "nested_field_unsupported" },
      { name: "rooms.room_area_m2", reason: "nested_field_unsupported" },
    ])
  );
});

test("assertAssistantPromptWithinBudget uses model input token capacity", () => {
  expect(deriveAssistantPromptCharLimit(400_000)).toBe(1_600_000);
  expect(() => assertAssistantPromptWithinBudget("x".repeat(40_000), 8_192)).toThrow(
    "assistant_prompt_too_large"
  );
  expect(() => assertAssistantPromptWithinBudget("x".repeat(40_000), 400_000)).not.toThrow();
});

test("assertAssistantPromptWithinPackageBudget reserves provider package overhead", () => {
  expect(deriveAssistantPromptCharLimitAfterOverhead(10_000, 8_000)).toBe(32_000);
  expect(() => assertAssistantPromptWithinPackageBudget("x".repeat(33_000), 10_000, 8_000)).toThrow(
    "assistant_prompt_too_large"
  );
  expect(() =>
    assertAssistantPromptWithinPackageBudget("x".repeat(32_000), 10_000, 8_000)
  ).not.toThrow();
});
