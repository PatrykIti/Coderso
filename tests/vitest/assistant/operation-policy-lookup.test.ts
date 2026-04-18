import { expect, test } from "vitest";

import {
  getFieldPolicy,
  getFilterPolicy,
  getResourcePolicy,
  resolveResourcePolicyFromPrompt,
} from "../../../core/services/assistant/operationPolicy/policyLookup";
import type { AssistantOperationPolicy } from "../../../core/services/assistant/operationPolicy/policyTypes";

const policy: AssistantOperationPolicy = {
  schemaVersion: 1,
  resources: {
    page: {
      kind: "page",
      label: "Pages",
      aliases: ["page", "pages", "strona", "strony"],
      routes: ["/admin/pages"],
      operations: ["inspect", "find"],
      readPermissions: ["content:read"],
      executePermissions: [],
      filters: {
        status: {
          field: "status",
          aliases: ["opublikowane"],
          operators: ["eq"],
          values: { published: ["opublikowane"] },
        },
      },
      fields: {
        title: {
          field: "title",
          aliases: ["tytul", "tytuł"],
          valueType: "string",
        },
      },
      actions: {},
      coverage: {
        state: "live-read-only",
        task: "TASK-184",
        routes: ["/admin/pages"],
      },
    },
  },
  followUp: { pronouns: ["je"], countWords: { dwa: 2 } },
  safetyDefaults: {
    destructive: {
      requireReview: true,
      allowAllWhenFiltered: false,
      allowAllUnfiltered: false,
      requireExpectedCountForPartialMatch: true,
    },
  },
};

test("policy lookup resolves resources filters and fields", () => {
  const page = getResourcePolicy(policy, "page");
  if (!page) throw new Error("missing_page_policy");

  expect(resolveResourcePolicyFromPrompt(policy, "pokaz strony")).toBe(page);
  expect(getFilterPolicy(page, "status")?.values?.published).toEqual(["opublikowane"]);
  expect(getFieldPolicy(page, "tytuł")?.field).toBe("title");
  expect(getFieldPolicy(page, "missing")).toBeNull();
});
