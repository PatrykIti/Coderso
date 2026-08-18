import { expect, test } from "vitest";

import {
  matchesFormActionCondition,
  normalizeFormActionCondition,
  normalizeFormActionsForWrite,
  normalizeFormActionsInput,
} from "../../../core/services/forms/formActionsContract";

test("normalizeFormActionsInput applies defaults and order", () => {
  const actions = normalizeFormActionsInput([
    {
      type: "webhook",
      config: {
        url: "https://example.com/hook",
      },
    },
  ]);

  expect(actions).toHaveLength(1);
  expect(actions[0]?.label).toBe("Call webhook");
  expect(actions[0]?.enabled).toBe(true);
  expect(actions[0]?.continueOnError).toBe(true);
  expect(actions[0]?.orderIndex).toBe(0);
});

test("normalizeFormActionCondition handles equals operator", () => {
  const condition = normalizeFormActionCondition({
    operator: "equals",
    field: "submission.intent",
    value: "quote",
  });

  expect(condition).toEqual({
    operator: "equals",
    field: "submission.intent",
    value: "quote",
  });
});

test("normalizeFormActionCondition falls back to always for invalid object", () => {
  const condition = normalizeFormActionCondition({});
  expect(condition).toEqual({ operator: "always" });
});

test("matchesFormActionCondition supports equals, exists and not_exists", () => {
  const payload = {
    intent: "quote",
    email: "user@example.com",
    nested: {
      channel: "phone",
    },
  };

  expect(
    matchesFormActionCondition({ operator: "equals", field: "intent", value: "quote" }, payload)
  ).toBe(true);

  expect(
    matchesFormActionCondition(
      { operator: "equals", field: "submission.nested.channel", value: "phone" },
      payload
    )
  ).toBe(true);

  expect(matchesFormActionCondition({ operator: "exists", field: "email" }, payload)).toBe(true);

  expect(matchesFormActionCondition({ operator: "not_exists", field: "missing" }, payload)).toBe(
    true
  );
});

test("normalizeFormActionsInput rejects invalid config", () => {
  expect(() =>
    normalizeFormActionsInput([
      {
        type: "email",
        config: {
          subject: "Missing recipient",
          text: "Body",
        },
      },
    ])
  ).toThrow("form_action_invalid_config");
});

test("normalizeFormActionsForWrite sorts, reindexes, and round-trips canonically", () => {
  const input = [
    {
      id: "action-z",
      type: "success_message" as const,
      orderIndex: 8,
      config: { message: "Last" },
    },
    {
      id: "action-b",
      type: "success_message" as const,
      orderIndex: 2,
      config: { message: "Second tie" },
    },
    {
      id: "action-a",
      type: "success_message" as const,
      orderIndex: 2,
      config: { message: "First tie" },
    },
  ];

  const normalized = normalizeFormActionsForWrite(input);
  expect(normalized.map(({ id, orderIndex }) => ({ id, orderIndex }))).toEqual([
    { id: "action-a", orderIndex: 0 },
    { id: "action-b", orderIndex: 1 },
    { id: "action-z", orderIndex: 2 },
  ]);
  expect(normalizeFormActionsForWrite(normalized)).toEqual(normalized);
});

test("normalizeFormActionsInput rejects non-https webhook URLs at config time", () => {
  expect(() =>
    normalizeFormActionsInput([
      {
        type: "webhook",
        config: { url: "http://example.com/hook" },
      },
    ])
  ).toThrow("form_action_invalid_config");
});

test("normalizeFormActionsInput rejects private/mapped webhook URLs at config time", () => {
  for (const url of [
    "https://10.0.0.5/hook",
    "https://169.254.169.254/hook",
    "https://[::ffff:127.0.0.1]/hook",
    "https://[64:ff9b::7f00:1]/hook",
  ]) {
    expect(() =>
      normalizeFormActionsInput([
        {
          type: "webhook",
          config: { url },
        },
      ])
    ).toThrow("form_action_invalid_config");
  }
});

test("normalizeFormActionsInput accepts templated https webhook URLs", () => {
  const actions = normalizeFormActionsInput([
    {
      type: "webhook",
      config: { url: "https://example.com/hook/{{submission.id}}" },
    },
  ]);
  expect(actions[0]?.type).toBe("webhook");
  expect((actions[0]?.config as { url: string }).url).toBe(
    "https://example.com/hook/{{submission.id}}"
  );
});

test("normalizeFormActionsInput rejects a templated http:// prefix at config time", () => {
  expect(() =>
    normalizeFormActionsInput([
      {
        type: "webhook",
        config: { url: "http://example.com/hook/{{submission.id}}" },
      },
    ])
  ).toThrow("form_action_invalid_config");
});

test("normalizeFormActionsInput rejects a templated URL with a blocked static host", () => {
  expect(() =>
    normalizeFormActionsInput([
      {
        type: "webhook",
        config: { url: "https://169.254.169.254/hook/{{submission.id}}" },
      },
    ])
  ).toThrow("form_action_invalid_config");
});
