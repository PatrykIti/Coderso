export type AssistantSiteBuilderIntakeErrorCode =
  | "intake_mode_invalid"
  | "intake_step_invalid"
  | "intake_option_registry_invalid"
  | "intake_option_invalid"
  | "intake_registry_duplicate"
  | "intake_registry_invalid"
  | "intake_session_invalid"
  | "intake_answer_invalid"
  | "intake_answer_required"
  | "intake_answer_unknown_key"
  | "intake_answer_duplicate"
  | "intake_text_invalid";

export class AssistantSiteBuilderIntakeError extends Error {
  readonly code: AssistantSiteBuilderIntakeErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: AssistantSiteBuilderIntakeErrorCode,
    details: Readonly<Record<string, unknown>> = {}
  ) {
    super(code);
    this.name = "AssistantSiteBuilderIntakeError";
    this.code = code;
    this.details = details;
  }
}

export const createAssistantSiteBuilderIntakeError = (
  code: AssistantSiteBuilderIntakeErrorCode,
  details: Readonly<Record<string, unknown>> = {}
) => new AssistantSiteBuilderIntakeError(code, details);

export const throwAssistantSiteBuilderIntakeError = (
  code: AssistantSiteBuilderIntakeErrorCode,
  details: Readonly<Record<string, unknown>> = {}
): never => {
  throw createAssistantSiteBuilderIntakeError(code, details);
};
