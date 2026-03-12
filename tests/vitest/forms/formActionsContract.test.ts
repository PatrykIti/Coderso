import { expect, test } from "vitest";

import {
  matchesFormActionCondition,
  normalizeFormActionCondition,
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
    matchesFormActionCondition(
      { operator: "equals", field: "intent", value: "quote" },
      payload
    )
  ).toBe(true);

  expect(
    matchesFormActionCondition(
      { operator: "equals", field: "submission.nested.channel", value: "phone" },
      payload
    )
  ).toBe(true);

  expect(matchesFormActionCondition({ operator: "exists", field: "email" }, payload)).toBe(
    true
  );

  expect(
    matchesFormActionCondition({ operator: "not_exists", field: "missing" }, payload)
  ).toBe(true);
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
