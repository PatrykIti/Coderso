import { expect, test } from "vitest";

import {
  redactAssistantMetadata,
  redactAssistantText,
} from "../../../core/services/assistant/assistantRedaction";

test("redactAssistantText redacts token-like values", () => {
  const output = redactAssistantText(
    "Authorization: Bearer sk-or-v1-1234567890abcdef and jwt eyJabc.def.ghi"
  );

  expect(output.includes("sk-or-v1-1234567890abcdef")).toBe(false);
  expect(output.includes("eyJabc.def.ghi")).toBe(false);
  expect(output.includes("[REDACTED]")).toBe(true);
});

test("redactAssistantMetadata removes sensitive keys and redacts nested strings", () => {
  const output = redactAssistantMetadata({
    provider: "openrouter",
    apiKey: "sk-or-v1-abcdef1234567890",
    nested: {
      authorization: "Bearer sk-abcdef1234567890",
      error: "failed with token sk-xyz987654321",
    },
    items: ["ok", "Bearer sk-token-12345678"],
  });

  expect(output.apiKey).toBe("[REDACTED]");
  expect(output.nested).toEqual({
    authorization: "[REDACTED]",
    error: "failed with token [REDACTED]",
  });
  expect(output.items).toEqual(["ok", "Bearer [REDACTED]"]);
});

test("redactAssistantMetadata handles arrays and signed-looking urls", () => {
  const output = redactAssistantMetadata({
    items: [
      {
        signedUrl: "https://example.test/file?token=secret",
        safe: "visible",
      },
    ],
  });

  expect(output).toEqual({
    items: [
      {
        signedUrl: "[REDACTED]",
        safe: "visible",
      },
    ],
  });
});
