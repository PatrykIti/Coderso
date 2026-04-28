import { expect, test } from "vitest";

import { ApiError } from "../../../core/server/errorHandler";
import { validate } from "../../../core/server/validation/schemaValidator";
import {
  solutionKitApplyRequestSchema,
  solutionKitPlanRequestSchema,
  solutionKitRollbackRequestSchema,
} from "../../../core/server/validation/solutionKitSchemas";

test("solution kit plan schema accepts valid payload", () => {
  expect(() =>
    validate(solutionKitPlanRequestSchema, {
      businessType: "automotive_workshop",
      goals: ["online_booking", "lead_generation"],
      locale: "pl",
      region: "PL",
      siteName: "AutoFix",
      preferredKitId: "automotive-workshop",
    })
  ).not.toThrow();
});

test("solution kit plan schema rejects invalid goals", () => {
  expect(() =>
    validate(solutionKitPlanRequestSchema, {
      businessType: "automotive_workshop",
      goals: ["unknown-goal"],
      locale: "pl",
    })
  ).toThrow(ApiError);
});

test("solution kit apply schema accepts dryRun and continueOnError", () => {
  expect(() =>
    validate(solutionKitApplyRequestSchema, {
      dryRun: true,
      continueOnError: false,
      plan: {
        enabledStepIds: ["settings", "content-model", "pages", "forms", "navigation", "qa"],
        settingsPatch: {
          "site.locale": "pl",
        },
        notes: ["Custom note"],
      },
    })
  ).not.toThrow();
});

test("solution kit apply schema rejects invalid plan step id", () => {
  expect(() =>
    validate(solutionKitApplyRequestSchema, {
      dryRun: true,
      plan: {
        enabledStepIds: ["unknown-step"],
      },
    })
  ).toThrow(ApiError);
});

test("solution kit apply schema rejects unknown properties", () => {
  expect(() =>
    validate(solutionKitApplyRequestSchema, {
      dryRun: true,
      unexpected: true,
    })
  ).toThrow(ApiError);
});

test("solution kit rollback schema accepts valid payload", () => {
  expect(() =>
    validate(solutionKitRollbackRequestSchema, {
      sourceRunId: "123e4567-e89b-12d3-a456-426614174000",
      continueOnError: true,
    })
  ).not.toThrow();
});

test("solution kit rollback schema rejects invalid run id", () => {
  expect(() =>
    validate(solutionKitRollbackRequestSchema, {
      sourceRunId: "not-a-uuid",
    })
  ).toThrow(ApiError);
});
