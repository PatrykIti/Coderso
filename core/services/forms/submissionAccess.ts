export type SubmissionAccessMode = "public" | "internal";

const allowedModes = new Set<SubmissionAccessMode>(["public", "internal"]);

export const submissionAccessDefaults = {
  mode: "public" as SubmissionAccessMode,
  requiredApiKeyScope: "forms.submit",
};

export function normalizeSubmissionAccess(
  value: unknown,
  fallback: SubmissionAccessMode = submissionAccessDefaults.mode
): SubmissionAccessMode {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" && allowedModes.has(value as SubmissionAccessMode)) {
    return value as SubmissionAccessMode;
  }
  throw new Error("form_invalid");
}

export type SubmissionAccessEvaluation = {
  allow: boolean;
  requireCaptcha: boolean;
  reason?: "auth_required" | "forbidden";
};

export function evaluateSubmissionAccess(params: {
  mode: SubmissionAccessMode;
  isAuthenticated: boolean;
  apiKeyScopes?: string[] | null;
  requiredApiKeyScope?: string;
}): SubmissionAccessEvaluation {
  const requiredScope =
    params.requiredApiKeyScope ?? submissionAccessDefaults.requiredApiKeyScope;

  if (params.mode === "public") {
    if (params.isAuthenticated) {
      return { allow: true, requireCaptcha: false };
    }
    return { allow: true, requireCaptcha: true };
  }

  if (params.isAuthenticated) {
    return { allow: true, requireCaptcha: false };
  }

  if (Array.isArray(params.apiKeyScopes)) {
    if (params.apiKeyScopes.includes(requiredScope)) {
      return { allow: true, requireCaptcha: false };
    }
    return { allow: false, requireCaptcha: false, reason: "forbidden" };
  }

  return { allow: false, requireCaptcha: false, reason: "auth_required" };
}
