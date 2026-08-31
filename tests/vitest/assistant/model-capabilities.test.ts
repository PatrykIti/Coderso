import { expect, test } from "vitest";

import {
  chooseProviderResponseContract,
  resolveModelCapabilityProfile,
} from "../../../core/services/assistant/modelCapabilities";

test("resolveModelCapabilityProfile detects common model families", () => {
  expect(
    resolveModelCapabilityProfile({ provider: "openrouter", model: "openai/gpt-5.4-nano" })
  ).toMatchObject({
    family: "gpt",
    structuredOutput: {
      preferred: "json_schema_strict",
      supportsStrictSchema: true,
    },
  });
  expect(
    resolveModelCapabilityProfile({ provider: "openrouter", model: "google/gemini-3.1-flash" })
  ).toMatchObject({
    family: "gemini",
    structuredOutput: {
      preferred: "json_schema_strict",
    },
  });
  expect(
    resolveModelCapabilityProfile({ provider: "openrouter", model: "qwen/qwen3-7b" })
  ).toMatchObject({
    family: "qwen",
    structuredOutput: {
      preferred: "json_schema_strict",
    },
  });
  expect(
    resolveModelCapabilityProfile({ provider: "openai", model: "gpt-5.4-nano" })
  ).toMatchObject({
    family: "gpt",
    structuredOutput: {
      preferred: "json_schema_strict",
      supportsStrictSchema: true,
    },
  });
  expect(
    resolveModelCapabilityProfile({ provider: "custom", model: "unknown-model" })
  ).toMatchObject({
    family: "unknown",
    structuredOutput: {
      preferred: "prompt_json_only",
      supportsStrictSchema: false,
    },
  });
});

test("chooseProviderResponseContract returns provider-agnostic strategy", () => {
  const strict = chooseProviderResponseContract(
    resolveModelCapabilityProfile({ provider: "openrouter", model: "qwen/qwen3-7b" }),
    {
      name: "cms_operation_draft",
      schema: { type: "object" },
      strict: true,
    }
  );

  expect(strict).toEqual({
    responseContract: {
      kind: "json_schema",
      name: "cms_operation_draft",
      strict: true,
      schema: { type: "object" },
    },
    requireStructuredOutput: false,
  });

  const fallback = chooseProviderResponseContract(
    resolveModelCapabilityProfile({ provider: "custom", model: "unknown" }),
    {
      name: "cms_operation_draft",
      schema: { type: "object" },
    }
  );

  expect(fallback).toEqual({
    responseContract: { kind: "prompt_json_only" },
    requireStructuredOutput: false,
  });
});

test("chooseProviderResponseContract honors a json_object preferred profile", () => {
  const contract = chooseProviderResponseContract(
    {
      provider: "openrouter",
      family: "unknown",
      structuredOutput: {
        preferred: "json_object",
        supportsStrictSchema: false,
        supportsJsonObject: true,
        supportsToolCalling: false,
        requiresProviderParam: false,
      },
    },
    {
      name: "cms_operation_draft",
      schema: { type: "object" },
    }
  );

  expect(contract).toEqual({
    responseContract: { kind: "json_object" },
    requireStructuredOutput: false,
  });
});
