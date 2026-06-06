import { expect, test } from "vitest";

import {
  canDryRunSiteBuilderIntake,
  canExecuteSiteBuilderIntake,
  canPlanSiteBuilderIntake,
  createIdleSiteBuilderIntakeUiState,
  siteBuilderIntakeUiReducer,
  type AssistantSiteBuilderIntakeReadyPlan,
  type AssistantSiteBuilderIntakeUiState,
} from "../../../core/admin/ui/setup/assistantSiteBuilderIntakeUiState";
import {
  buildAssistantSiteBuilderIntakeBrowserState,
  normalizeAssistantSiteBuilderIntakeBrowserState,
} from "../../../core/admin/ui/setup/assistantSiteBuilderIntakeBrowserState";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderIntakeSession,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";

const NOW_MS = Date.parse("2026-06-06T12:00:00.000Z");

const baseSession = (overrides: Partial<AssistantSiteBuilderIntakeSession> = {}) =>
  ({
    version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
    mode: "basic",
    currentStepId: "business-profile",
    answers: [],
    facts: {
      answeredStepIds: [],
      missingRequiredStepIds: ["business-profile"],
      missingReviewInputStepIds: ["business-profile"],
      readyForReview: false,
      readyForExecution: false,
      redactionApplied: false,
    },
    ...overrides,
  }) satisfies AssistantSiteBuilderIntakeSession;

const reviewedSession = () =>
  baseSession({
    currentStepId: "review",
    reviewState: "confirmed",
    facts: {
      answeredStepIds: [
        "business-profile",
        "site-goals",
        "site-map",
        "menu",
        "hero",
        "homepage-sections",
        "media-policy",
        "review",
      ],
      missingRequiredStepIds: [],
      missingReviewInputStepIds: [],
      readyForReview: true,
      readyForExecution: true,
      redactionApplied: false,
    },
  });

const readyPlan: AssistantSiteBuilderIntakeReadyPlan = {
  planId: "plan-site-kit-services-directory",
  siteKit: {
    businessType: "services_directory",
    goals: ["lead_generation", "catalog_showcase"],
    locale: "en",
    region: null,
    siteName: "Provider Finder",
    preferredKitId: "services-directory",
    selectedKitId: "services-directory",
    enabledStepIds: ["settings", "content-model", "pages", "forms", "navigation", "qa"],
  },
};

const reduce = (
  state: AssistantSiteBuilderIntakeUiState,
  events: Parameters<typeof siteBuilderIntakeUiReducer>[1][]
) => events.reduce(siteBuilderIntakeUiReducer, state);

test("site builder intake UI state follows reviewed plan dry-run execute flow", () => {
  const initial = createIdleSiteBuilderIntakeUiState();
  const answering = siteBuilderIntakeUiReducer(initial, {
    type: "start",
    session: baseSession(),
  });
  expect(answering.kind).toBe("answering");
  expect(canPlanSiteBuilderIntake(answering)).toBe(false);

  const review = siteBuilderIntakeUiReducer(answering, {
    type: "server_session_received",
    session: reviewedSession(),
  });
  expect(review.kind).toBe("review");
  expect(canPlanSiteBuilderIntake(review)).toBe(true);

  const planned = reduce(review, [
    { type: "plan_requested" },
    { type: "plan_ready", plan: readyPlan },
  ]);
  expect(planned.kind).toBe("readyPlan");
  expect(canDryRunSiteBuilderIntake(planned)).toBe(true);
  expect(canExecuteSiteBuilderIntake(planned)).toBe(false);

  const afterDryRun = reduce(planned, [
    { type: "dry_run_requested" },
    { type: "dry_run_finished" },
  ]);
  expect(afterDryRun.kind).toBe("readyPlan");
  expect(canExecuteSiteBuilderIntake(afterDryRun)).toBe(true);

  const completed = reduce(afterDryRun, [
    { type: "execute_requested" },
    { type: "execute_finished", runId: "run-1" },
  ]);
  expect(completed).toMatchObject({
    kind: "completed",
    runId: "run-1",
  });
});

test("site builder intake UI state blocks dry-run and execute before strict plan readiness", () => {
  const review = siteBuilderIntakeUiReducer(createIdleSiteBuilderIntakeUiState(), {
    type: "server_session_received",
    session: reviewedSession(),
  });

  const dryRunBlocked = siteBuilderIntakeUiReducer(review, { type: "dry_run_requested" });
  expect(dryRunBlocked.kind).toBe("review");
  expect(dryRunBlocked.issue).toMatchObject({
    code: "state_transition_blocked",
  });

  const executeBlocked = siteBuilderIntakeUiReducer(review, { type: "execute_requested" });
  expect(executeBlocked.kind).toBe("review");
  expect(executeBlocked.issue).toMatchObject({
    code: "state_transition_blocked",
  });
});

test("site builder intake UI state ignores stale top-level review confirmation", () => {
  const staleReview = siteBuilderIntakeUiReducer(createIdleSiteBuilderIntakeUiState(), {
    type: "server_session_received",
    session: baseSession({
      currentStepId: "review",
      reviewState: "confirmed",
      facts: {
        answeredStepIds: ["review"],
        missingRequiredStepIds: ["review"],
        missingReviewInputStepIds: [],
        readyForReview: true,
        readyForExecution: false,
        reviewHashStale: true,
        redactionApplied: false,
      },
    }),
  });

  expect(staleReview.kind).toBe("review");
  expect(canPlanSiteBuilderIntake(staleReview)).toBe(false);
  expect(siteBuilderIntakeUiReducer(staleReview, { type: "plan_requested" })).toMatchObject({
    kind: "review",
    issue: {
      code: "state_transition_blocked",
    },
  });
});

test("site builder intake UI state treats server-normalized sessions as authoritative", () => {
  const dirty = siteBuilderIntakeUiReducer(createIdleSiteBuilderIntakeUiState(), {
    type: "answer_step",
    stepId: "business-profile",
    session: baseSession(),
  });

  expect(dirty).toMatchObject({
    kind: "answering",
    dirtyStepId: "business-profile",
  });

  const server = siteBuilderIntakeUiReducer(dirty, {
    type: "server_session_received",
    session: baseSession({
      currentStepId: "site-goals",
      answers: [{ stepId: "business-profile", values: { topic: "Directory", locale: "en" } }],
      facts: {
        answeredStepIds: ["business-profile"],
        missingRequiredStepIds: ["site-goals"],
        missingReviewInputStepIds: ["site-goals"],
        readyForReview: false,
        readyForExecution: false,
        redactionApplied: false,
      },
    }),
  });

  expect(server).toMatchObject({
    kind: "answering",
    dirtyStepId: null,
    session: {
      currentStepId: "site-goals",
    },
  });
});

test("site builder intake UI state restores only bounded browser snapshots and discards stale cache", () => {
  const browserState = buildAssistantSiteBuilderIntakeBrowserState(reviewedSession(), {
    nowMs: NOW_MS,
  });
  const restored = siteBuilderIntakeUiReducer(createIdleSiteBuilderIntakeUiState(), {
    type: "restore_browser_state",
    state: browserState,
  });

  expect(restored).toMatchObject({
    kind: "restored",
    snapshot: {
      currentStepId: "review",
      redactionApplied: false,
    },
  });
  expect(JSON.stringify(restored)).not.toContain("answers");

  const stale = normalizeAssistantSiteBuilderIntakeBrowserState(browserState, {
    nowMs: NOW_MS + 31 * 60 * 1000,
  });
  const discarded = siteBuilderIntakeUiReducer(restored, {
    type: "restore_browser_state",
    state: stale,
  });

  expect(discarded).toMatchObject({
    kind: "idle",
    issue: {
      code: "stale_cache_discarded",
    },
  });
});
