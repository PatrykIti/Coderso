import type { AssistantSiteKitPlanInput } from "../../../services/assistant/actionPlanTypes";
import type {
  AssistantSiteBuilderIntakeSession,
  AssistantSiteBuilderIntakeStepId,
} from "../../../services/assistant/assistantSiteBuilderIntakeTypes";
import type { AssistantSiteBuilderIntakeBrowserState } from "./assistantSiteBuilderIntakeBrowserState";

export type AssistantSiteBuilderIntakeUiIssue = {
  code:
    | "network_error"
    | "server_rejected_answer"
    | "plan_not_ready"
    | "stale_cache_discarded"
    | "state_transition_blocked";
  message: string;
};

export type AssistantSiteBuilderIntakeReadyPlan = {
  planId: string;
  siteKit: AssistantSiteKitPlanInput;
};

export type AssistantSiteBuilderIntakeUiState =
  | { kind: "idle"; issue?: AssistantSiteBuilderIntakeUiIssue | null }
  | {
      kind: "restored";
      snapshot: AssistantSiteBuilderIntakeBrowserState["session"];
      issue?: AssistantSiteBuilderIntakeUiIssue | null;
    }
  | {
      kind: "answering";
      session: AssistantSiteBuilderIntakeSession;
      dirtyStepId?: AssistantSiteBuilderIntakeStepId | null;
      issue?: AssistantSiteBuilderIntakeUiIssue | null;
    }
  | {
      kind: "review";
      session: AssistantSiteBuilderIntakeSession;
      issue?: AssistantSiteBuilderIntakeUiIssue | null;
    }
  | {
      kind: "planning";
      session: AssistantSiteBuilderIntakeSession;
      issue?: AssistantSiteBuilderIntakeUiIssue | null;
    }
  | {
      kind: "readyPlan";
      session: AssistantSiteBuilderIntakeSession;
      plan: AssistantSiteBuilderIntakeReadyPlan;
      dryRunVerified: boolean;
      issue?: AssistantSiteBuilderIntakeUiIssue | null;
    }
  | {
      kind: "dryRun";
      session: AssistantSiteBuilderIntakeSession;
      plan: AssistantSiteBuilderIntakeReadyPlan;
      issue?: AssistantSiteBuilderIntakeUiIssue | null;
    }
  | {
      kind: "executing";
      session: AssistantSiteBuilderIntakeSession;
      plan: AssistantSiteBuilderIntakeReadyPlan;
      issue?: AssistantSiteBuilderIntakeUiIssue | null;
    }
  | {
      kind: "completed";
      session: AssistantSiteBuilderIntakeSession;
      plan: AssistantSiteBuilderIntakeReadyPlan;
      runId: string;
      issue?: AssistantSiteBuilderIntakeUiIssue | null;
    };

export type AssistantSiteBuilderIntakeUiEvent =
  | { type: "start"; session: AssistantSiteBuilderIntakeSession }
  | { type: "resume"; session: AssistantSiteBuilderIntakeSession }
  | {
      type: "answer_step";
      stepId: AssistantSiteBuilderIntakeStepId;
      session?: AssistantSiteBuilderIntakeSession;
    }
  | { type: "server_session_received"; session: AssistantSiteBuilderIntakeSession }
  | { type: "restore_browser_state"; state: AssistantSiteBuilderIntakeBrowserState | null }
  | { type: "stale_cache_detected" }
  | { type: "plan_requested" }
  | { type: "plan_ready"; plan: AssistantSiteBuilderIntakeReadyPlan }
  | { type: "dry_run_requested" }
  | { type: "dry_run_finished"; plan?: AssistantSiteBuilderIntakeReadyPlan }
  | { type: "execute_requested" }
  | { type: "execute_finished"; runId: string }
  | { type: "cancel" }
  | { type: "reset" }
  | { type: "error"; issue: AssistantSiteBuilderIntakeUiIssue };

export const createIdleSiteBuilderIntakeUiState = (): AssistantSiteBuilderIntakeUiState => ({
  kind: "idle",
  issue: null,
});

const sessionReadyForReview = (session: AssistantSiteBuilderIntakeSession) =>
  session.currentStepId === "review" || session.facts?.readyForReview === true;

const sessionReadyForExecution = (session: AssistantSiteBuilderIntakeSession) =>
  session.facts?.readyForExecution === true && session.facts.reviewHashStale !== true;

const hydrateFromServerSession = (
  session: AssistantSiteBuilderIntakeSession
): AssistantSiteBuilderIntakeUiState =>
  sessionReadyForReview(session) || sessionReadyForExecution(session)
    ? { kind: "review", session, issue: null }
    : { kind: "answering", session, dirtyStepId: null, issue: null };

const currentSession = (
  state: AssistantSiteBuilderIntakeUiState
): AssistantSiteBuilderIntakeSession | null => {
  if (
    state.kind === "answering" ||
    state.kind === "review" ||
    state.kind === "planning" ||
    state.kind === "readyPlan" ||
    state.kind === "dryRun" ||
    state.kind === "executing" ||
    state.kind === "completed"
  ) {
    return state.session;
  }
  return null;
};

const currentReadyPlan = (
  state: AssistantSiteBuilderIntakeUiState
): AssistantSiteBuilderIntakeReadyPlan | null => {
  if (
    state.kind === "readyPlan" ||
    state.kind === "dryRun" ||
    state.kind === "executing" ||
    state.kind === "completed"
  ) {
    return state.plan;
  }
  return null;
};

const blocked = (
  state: AssistantSiteBuilderIntakeUiState,
  message: string
): AssistantSiteBuilderIntakeUiState => ({
  ...state,
  issue: {
    code: "state_transition_blocked",
    message,
  },
});

export const canPlanSiteBuilderIntake = (state: AssistantSiteBuilderIntakeUiState) =>
  state.kind === "review" && sessionReadyForExecution(state.session);

export const canDryRunSiteBuilderIntake = (state: AssistantSiteBuilderIntakeUiState) =>
  state.kind === "readyPlan";

export const canExecuteSiteBuilderIntake = (state: AssistantSiteBuilderIntakeUiState) =>
  state.kind === "readyPlan" && state.dryRunVerified;

export const siteBuilderIntakeUiReducer = (
  state: AssistantSiteBuilderIntakeUiState,
  event: AssistantSiteBuilderIntakeUiEvent
): AssistantSiteBuilderIntakeUiState => {
  switch (event.type) {
    case "start":
    case "resume":
    case "server_session_received":
      return hydrateFromServerSession(event.session);
    case "restore_browser_state":
      return event.state
        ? { kind: "restored", snapshot: event.state.session, issue: null }
        : {
            kind: "idle",
            issue: {
              code: "stale_cache_discarded",
              message: "Stored site-builder intake state was stale or incompatible.",
            },
          };
    case "stale_cache_detected":
      return {
        kind: "idle",
        issue: {
          code: "stale_cache_discarded",
          message: "Stored site-builder intake state was stale or incompatible.",
        },
      };
    case "answer_step": {
      const session = event.session ?? currentSession(state);
      if (!session) return blocked(state, "Start or resume an intake session before answering.");
      return {
        kind: "answering",
        session,
        dirtyStepId: event.stepId,
        issue: null,
      };
    }
    case "plan_requested": {
      const session = currentSession(state);
      if (!session || !canPlanSiteBuilderIntake({ kind: "review", session, issue: null })) {
        return blocked(state, "Review and confirm the normalized intake before planning.");
      }
      return { kind: "planning", session, issue: null };
    }
    case "plan_ready": {
      const session = currentSession(state);
      if (!session || state.kind !== "planning") {
        return blocked(state, "Plan readiness can only follow a planning state.");
      }
      return { kind: "readyPlan", session, plan: event.plan, dryRunVerified: false, issue: null };
    }
    case "dry_run_requested": {
      const plan = currentReadyPlan(state);
      const session = currentSession(state);
      if (!plan || !session || !canDryRunSiteBuilderIntake(state)) {
        return blocked(state, "Generate a reviewed strict plan before dry-run.");
      }
      return { kind: "dryRun", session, plan, issue: null };
    }
    case "dry_run_finished": {
      const session = currentSession(state);
      const plan = event.plan ?? currentReadyPlan(state);
      if (!session || !plan || state.kind !== "dryRun") {
        return blocked(state, "Dry-run completion can only follow an active dry-run.");
      }
      return { kind: "readyPlan", session, plan, dryRunVerified: true, issue: null };
    }
    case "execute_requested": {
      const plan = currentReadyPlan(state);
      const session = currentSession(state);
      if (!plan || !session || !canExecuteSiteBuilderIntake(state)) {
        return blocked(state, "Generate and dry-run a reviewed strict plan before execution.");
      }
      return { kind: "executing", session, plan, issue: null };
    }
    case "execute_finished": {
      const session = currentSession(state);
      const plan = currentReadyPlan(state);
      if (!session || !plan || state.kind !== "executing") {
        return blocked(state, "Execution completion can only follow an active execute request.");
      }
      return { kind: "completed", session, plan, runId: event.runId, issue: null };
    }
    case "cancel":
    case "reset":
      return createIdleSiteBuilderIntakeUiState();
    case "error": {
      const session = currentSession(state);
      const plan = currentReadyPlan(state);
      if (plan && session) {
        return {
          kind: "readyPlan",
          session,
          plan,
          dryRunVerified: state.kind === "readyPlan" ? state.dryRunVerified : false,
          issue: event.issue,
        };
      }
      if (!session) return { kind: "idle", issue: event.issue };
      if (sessionReadyForReview(session)) {
        return { kind: "review", session, issue: event.issue };
      }
      return { kind: "answering", session, dirtyStepId: null, issue: event.issue };
    }
    default:
      return state;
  }
};
