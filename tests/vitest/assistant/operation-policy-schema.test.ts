import { expect, test } from "vitest";

import {
  assertAssistantOperationPolicy,
  normalizeAssistantOperationPolicy,
} from "../../../core/services/assistant/operationPolicy/policySchema";
import type { AssistantOperationPolicy } from "../../../core/services/assistant/operationPolicy/policyTypes";

const basePolicy: AssistantOperationPolicy = {
  schemaVersion: 1,
  resources: {
    page: {
      kind: "page",
      label: "Pages",
      aliases: ["page", "pages", "strona", "strony"],
      routes: ["/admin/pages"],
      operations: ["inspect", "find", "update", "delete"],
      readPermissions: ["content:read"],
      executePermissions: ["content:write"],
      filters: {
        status: {
          field: "status",
          aliases: ["status", "published", "opublikowane"],
          operators: ["eq"],
          values: {
            published: ["published", "opublikowane"],
            draft: ["draft", "szkic"],
          },
        },
      },
      fields: {
        title: {
          field: "title",
          aliases: ["title", "tytul", "tytuł"],
          valueType: "string",
          action: {
            type: "page.update",
            patchPath: ["title"],
          },
        },
      },
      actions: {
        delete: {
          operation: "delete",
          type: "page.delete",
          target: "multiple",
          mode: "executable",
        },
      },
      destructive: {
        requireReview: true,
        allowAllWhenFiltered: true,
        allowAllUnfiltered: false,
        requireExpectedCountForPartialMatch: true,
      },
      coverage: {
        state: "live-execute",
        task: "TASK-184-02",
        routes: ["/admin/pages"],
      },
    },
  },
  followUp: {
    pronouns: ["je", "te", "tych"],
    countWords: { jeden: 1, dwa: 2 },
  },
  safetyDefaults: {
    destructive: {
      requireReview: true,
      allowAllWhenFiltered: false,
      allowAllUnfiltered: false,
      requireExpectedCountForPartialMatch: true,
    },
  },
};

test("normalizeAssistantOperationPolicy accepts strict policy shape", () => {
  expect(normalizeAssistantOperationPolicy(basePolicy)).toMatchObject({
    schemaVersion: 1,
    resources: {
      page: {
        kind: "page",
        coverage: { state: "live-execute" },
      },
    },
  });
  expect(() => assertAssistantOperationPolicy(basePolicy)).not.toThrow();
});

test("normalizeAssistantOperationPolicy accepts legacy-maintenance coverage", () => {
  expect(
    normalizeAssistantOperationPolicy({
      ...basePolicy,
      resources: {
        page: {
          ...basePolicy.resources.page,
          coverage: {
            ...basePolicy.resources.page.coverage,
            state: "legacy-maintenance",
          },
        },
      },
    }).resources.page.coverage.state
  ).toBe("legacy-maintenance");
});

test("normalizeAssistantOperationPolicy rejects unknown keys and invalid actions", () => {
  expect(() =>
    normalizeAssistantOperationPolicy({
      ...basePolicy,
      unknown: true,
    })
  ).toThrow("assistant_operation_policy_invalid");

  expect(() =>
    normalizeAssistantOperationPolicy({
      ...basePolicy,
      resources: {
        page: {
          ...basePolicy.resources.page,
          actions: {
            delete: {
              operation: "delete",
              type: "database.drop",
              target: "multiple",
              mode: "executable",
            },
          },
        },
      },
    })
  ).toThrow("assistant_operation_policy_invalid");
});

test("normalizeAssistantOperationPolicy keeps destructive denial defaults explicit", () => {
  const normalized = normalizeAssistantOperationPolicy(basePolicy);
  expect(normalized.safetyDefaults.destructive).toEqual({
    requireReview: true,
    allowAllWhenFiltered: false,
    allowAllUnfiltered: false,
    requireExpectedCountForPartialMatch: true,
  });
});
