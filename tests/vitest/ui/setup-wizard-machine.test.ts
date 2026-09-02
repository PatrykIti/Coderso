import { describe, expect, it } from "vitest";

import {
  canAdvance,
  goToStep,
  initWizardState,
  markDirty,
  nextStep,
  prevStep,
  reduce,
  resolveResumeStep,
  currentStep,
  toggleAdvanced,
  visibleSteps,
} from "../../../core/admin/ui/setup/wizardMachine";
import { WIZARD_STEPS } from "../../../core/admin/ui/setup/wizardSteps";
import {
  canExecuteSiteBuilderIntake,
  createIdleSiteBuilderIntakeUiState,
  siteBuilderIntakeUiReducer,
  type AssistantSiteBuilderIntakeReadyPlan,
  type AssistantSiteBuilderIntakeUiState,
} from "../../../core/admin/ui/setup/assistantSiteBuilderIntakeUiState";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderIntakeSession,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";

describe("wizardMachine", () => {
  it("initWizardState merges defaults and starts on the first step", () => {
    const state = initWizardState({ siteName: "My Site" });
    expect(state.values.siteName).toBe("My Site");
    expect(state.values.siteTimezone).toBe("UTC");
    expect(state.currentStepId).toBe(WIZARD_STEPS[0].id);
    expect(state.advancedEnabled).toBe(false);
    expect(state.dirtyStepIds.size).toBe(0);
  });

  it("visibleSteps filters the advanced track until enabled", () => {
    const basicOnly = visibleSteps(initWizardState());
    expect(basicOnly.map((step) => step.id)).toEqual([
      "identity",
      "branding",
      "locale",
      "timezone",
      "urls",
      "starter-content",
    ]);
    const withAdvanced = visibleSteps(toggleAdvanced(initWizardState(), true));
    expect(withAdvanced.map((step) => step.id)).toContain("email");
    expect(withAdvanced).toHaveLength(WIZARD_STEPS.length);
  });

  it("nextStep is gated on the current step validator", () => {
    // Defaults seed a valid site name ("Coderso"), so the first step advances.
    expect(canAdvance(initWizardState())).toBe(true);

    const blocked = initWizardState({ siteName: "   " });
    expect(canAdvance(blocked)).toBe(false);
    expect(nextStep(blocked).currentStepId).toBe("identity");

    const ready = goToStep(initWizardState(), "urls");
    expect(canAdvance(ready)).toBe(true);
    expect(nextStep(ready).currentStepId).toBe("starter-content");
    expect(nextStep(goToStep(initWizardState(), "urls")).currentStepId.length).toBeGreaterThan(0);
  });

  it("a failing urls step blocks advancing from urls", () => {
    const badUrls = goToStep(initWizardState({ publicBaseUrl: "::bad" }), "urls");
    expect(canAdvance(badUrls)).toBe(false);
  });

  it("prevStep never moves before the first visible step", () => {
    expect(prevStep(initWizardState()).currentStepId).toBe("identity");
    const second = nextStep(initWizardState({ siteName: "Named" }));
    expect(prevStep(second).currentStepId).toBe("identity");
  });

  it("goto ignores invisible steps", () => {
    const state = initWizardState();
    expect(goToStep(state, "email").currentStepId).toBe("identity");
    expect(goToStep(state, "urls").currentStepId).toBe("urls");
  });

  it("toggleAdvanced clamps an advanced cursor back into the basic set", () => {
    const advanced = toggleAdvanced(initWizardState(), true);
    const onAssistant = goToStep(advanced, "assistant");
    expect(onAssistant.currentStepId).toBe("assistant");
    const clamped = toggleAdvanced(onAssistant, false);
    expect(clamped.currentStepId).toBe("starter-content");
  });

  it("patch marks the current step dirty", () => {
    const state = initWizardState({ siteName: "Named" });
    const patched = reduce(state, { type: "patch", patch: { siteName: "Renamed" } });
    expect(patched.values.siteName).toBe("Renamed");
    expect(patched.dirtyStepIds.has("identity")).toBe(true);
    expect(markDirty(state, "branding").dirtyStepIds.has("branding")).toBe(true);
  });

  it("complete accumulates completed ids", () => {
    const state = reduce(initWizardState(), { type: "complete", id: "identity" });
    expect(state.completedStepIds.has("identity")).toBe(true);
  });

  it("resolveResumeStep lands on the first incomplete visible step", () => {
    // Defaults satisfy every basic validator, so resume lands on the last step.
    expect(resolveResumeStep(initWizardState())).toBe("starter-content");
    expect(resolveResumeStep(initWizardState({ siteLocale: " " }))).toBe("locale");
    expect(resolveResumeStep(initWizardState({ siteTimezone: "" }))).toBe("timezone");
    expect(resolveResumeStep(initWizardState({ publicBaseUrl: "::bad" }))).toBe("urls");
  });

  it("currentStep resolves the registry entry", () => {
    expect(currentStep(initWizardState())?.title).toBe("Site identity");
  });
});

// TASK-105-08-09 (L09, setup-core cluster): the site-builder intake UI reducer is
// owned by this leaf (core/admin/ui/setup/assistantSiteBuilderIntakeUiState.ts),
// so the residual transition branches it lacks coverage for are asserted here
// with direct table-driven reducer calls, mirroring the assistant intake suites.
const intakeBaseSession = (overrides: Partial<AssistantSiteBuilderIntakeSession> = {}) =>
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

const intakeReviewedSession = (): AssistantSiteBuilderIntakeSession =>
  intakeBaseSession({
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

const intakeReadyPlan: AssistantSiteBuilderIntakeReadyPlan = {
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

const intakeReduce = (
  state: AssistantSiteBuilderIntakeUiState,
  events: Parameters<typeof siteBuilderIntakeUiReducer>[1][]
) => events.reduce(siteBuilderIntakeUiReducer, state);

describe("assistantSiteBuilderIntakeUiState reducer residual transitions", () => {
  it("background revalidation without an active dirty answer falls back to fresh hydration", () => {
    const review = siteBuilderIntakeUiReducer(createIdleSiteBuilderIntakeUiState(), {
      type: "server_session_received",
      session: intakeReviewedSession(),
    });
    const backgroundOnReview = siteBuilderIntakeUiReducer(review, {
      type: "server_session_received",
      source: "background_revalidation",
      session: intakeBaseSession({ currentStepId: "site-goals" }),
    });
    expect(backgroundOnReview).toMatchObject({ kind: "answering", dirtyStepId: null });

    const answering = siteBuilderIntakeUiReducer(createIdleSiteBuilderIntakeUiState(), {
      type: "start",
      session: intakeBaseSession(),
    });
    const backgroundOnClean = siteBuilderIntakeUiReducer(answering, {
      type: "server_session_received",
      source: "background_revalidation",
      session: intakeBaseSession({ currentStepId: "site-map" }),
    });
    expect(backgroundOnClean).toMatchObject({ kind: "answering", dirtyStepId: null });
  });

  it("answer_step with no session blocks with a start prompt", () => {
    const blocked = siteBuilderIntakeUiReducer(createIdleSiteBuilderIntakeUiState(), {
      type: "answer_step",
      stepId: "business-profile",
    });
    expect(blocked).toMatchObject({
      kind: "idle",
      issue: {
        code: "state_transition_blocked",
        message: "Start or resume an intake session before answering.",
      },
    });
  });

  it("stale_cache_detected discards an in-flight session to idle", () => {
    const answering = siteBuilderIntakeUiReducer(createIdleSiteBuilderIntakeUiState(), {
      type: "start",
      session: intakeBaseSession(),
    });
    const discarded = siteBuilderIntakeUiReducer(answering, { type: "stale_cache_detected" });
    expect(discarded).toMatchObject({
      kind: "idle",
      issue: { code: "stale_cache_discarded" },
    });
  });

  it("plan_ready only follows a planning state", () => {
    const review = siteBuilderIntakeUiReducer(createIdleSiteBuilderIntakeUiState(), {
      type: "server_session_received",
      session: intakeReviewedSession(),
    });
    const blocked = siteBuilderIntakeUiReducer(review, {
      type: "plan_ready",
      plan: intakeReadyPlan,
    });
    expect(blocked.kind).toBe("review");
    expect(blocked.issue).toMatchObject({
      code: "state_transition_blocked",
      message: "Plan readiness can only follow a planning state.",
    });
  });

  it("dry_run_finished only follows an active dry-run", () => {
    const readyPlan = intakeReduce(createIdleSiteBuilderIntakeUiState(), [
      { type: "server_session_received", session: intakeReviewedSession() },
      { type: "plan_requested" },
      { type: "plan_ready", plan: intakeReadyPlan },
    ]);
    expect(readyPlan.kind).toBe("readyPlan");
    const blocked = siteBuilderIntakeUiReducer(readyPlan, { type: "dry_run_finished" });
    expect(blocked.kind).toBe("readyPlan");
    expect(blocked.issue).toMatchObject({
      code: "state_transition_blocked",
      message: "Dry-run completion can only follow an active dry-run.",
    });
  });

  it("dry_run_finished adopts the event-provided plan over the current ready plan", () => {
    const dryRun = intakeReduce(createIdleSiteBuilderIntakeUiState(), [
      { type: "server_session_received", session: intakeReviewedSession() },
      { type: "plan_requested" },
      { type: "plan_ready", plan: intakeReadyPlan },
      { type: "dry_run_requested" },
    ]);
    expect(dryRun.kind).toBe("dryRun");
    const eventPlan: AssistantSiteBuilderIntakeReadyPlan = {
      ...intakeReadyPlan,
      planId: "plan-site-kit-services-directory-v2",
      siteKit: { ...intakeReadyPlan.siteKit, siteName: "Provider Finder v2" },
    };
    const finished = siteBuilderIntakeUiReducer(dryRun, {
      type: "dry_run_finished",
      plan: eventPlan,
    });
    if (finished.kind !== "readyPlan") {
      throw new Error(`expected readyPlan, got ${finished.kind}`);
    }
    expect(finished.dryRunVerified).toBe(true);
    expect(finished.plan).toBe(eventPlan);
  });

  it("execute_finished only follows an active execute request", () => {
    const readyPlan = intakeReduce(createIdleSiteBuilderIntakeUiState(), [
      { type: "server_session_received", session: intakeReviewedSession() },
      { type: "plan_requested" },
      { type: "plan_ready", plan: intakeReadyPlan },
      { type: "dry_run_requested" },
      { type: "dry_run_finished" },
    ]);
    expect(canExecuteSiteBuilderIntake(readyPlan)).toBe(true);
    const blocked = siteBuilderIntakeUiReducer(readyPlan, {
      type: "execute_finished",
      runId: "run-1",
    });
    expect(blocked.kind).toBe("readyPlan");
    expect(blocked.issue).toMatchObject({
      code: "state_transition_blocked",
      message: "Execution completion can only follow an active execute request.",
    });
  });

  it("cancel and reset return to idle from a completed flow", () => {
    const completed = intakeReduce(createIdleSiteBuilderIntakeUiState(), [
      { type: "server_session_received", session: intakeReviewedSession() },
      { type: "plan_requested" },
      { type: "plan_ready", plan: intakeReadyPlan },
      { type: "dry_run_requested" },
      { type: "dry_run_finished" },
      { type: "execute_requested" },
      { type: "execute_finished", runId: "run-1" },
    ]);
    expect(completed.kind).toBe("completed");
    expect(siteBuilderIntakeUiReducer(completed, { type: "cancel" })).toEqual(
      createIdleSiteBuilderIntakeUiState()
    );
    expect(siteBuilderIntakeUiReducer(completed, { type: "reset" })).toEqual(
      createIdleSiteBuilderIntakeUiState()
    );
  });

  it("error keeps a dry-run-verified ready plan when present", () => {
    const readyPlan = intakeReduce(createIdleSiteBuilderIntakeUiState(), [
      { type: "server_session_received", session: intakeReviewedSession() },
      { type: "plan_requested" },
      { type: "plan_ready", plan: intakeReadyPlan },
      { type: "dry_run_requested" },
      { type: "dry_run_finished" },
    ]);
    const errored = siteBuilderIntakeUiReducer(readyPlan, {
      type: "error",
      issue: { code: "network_error", message: "boom" },
    });
    expect(errored).toMatchObject({ kind: "readyPlan", dryRunVerified: true });
    expect(errored.issue).toEqual({ code: "network_error", message: "boom" });
  });

  it("error demotes an executing plan back to an unverified ready plan", () => {
    const executing = intakeReduce(createIdleSiteBuilderIntakeUiState(), [
      { type: "server_session_received", session: intakeReviewedSession() },
      { type: "plan_requested" },
      { type: "plan_ready", plan: intakeReadyPlan },
      { type: "dry_run_requested" },
      { type: "dry_run_finished" },
      { type: "execute_requested" },
    ]);
    expect(executing.kind).toBe("executing");
    const errored = siteBuilderIntakeUiReducer(executing, {
      type: "error",
      issue: { code: "server_rejected_answer", message: "no" },
    });
    expect(errored).toMatchObject({ kind: "readyPlan", dryRunVerified: false });
    expect(errored.issue).toEqual({ code: "server_rejected_answer", message: "no" });
  });

  it("error without a session lands on idle with the issue", () => {
    const errored = siteBuilderIntakeUiReducer(createIdleSiteBuilderIntakeUiState(), {
      type: "error",
      issue: { code: "network_error", message: "offline" },
    });
    expect(errored).toMatchObject({ kind: "idle" });
    expect(errored.issue).toEqual({ code: "network_error", message: "offline" });
  });

  it("error routes a review-ready session back to review and other sessions to answering", () => {
    const review = siteBuilderIntakeUiReducer(createIdleSiteBuilderIntakeUiState(), {
      type: "server_session_received",
      session: intakeReviewedSession(),
    });
    const reviewError = siteBuilderIntakeUiReducer(review, {
      type: "error",
      issue: { code: "plan_not_ready", message: "pending" },
    });
    expect(reviewError).toMatchObject({ kind: "review" });
    expect(reviewError.issue).toEqual({ code: "plan_not_ready", message: "pending" });

    const answering = siteBuilderIntakeUiReducer(createIdleSiteBuilderIntakeUiState(), {
      type: "start",
      session: intakeBaseSession(),
    });
    const answerError = siteBuilderIntakeUiReducer(answering, {
      type: "error",
      issue: { code: "server_rejected_answer", message: "redo" },
    });
    expect(answerError).toMatchObject({ kind: "answering", dirtyStepId: null });
    expect(answerError.issue).toEqual({ code: "server_rejected_answer", message: "redo" });
  });
});
