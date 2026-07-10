export const SUBMISSION_ACCESS_MODE_VALUES = ["public", "internal"] as const;
export type SubmissionAccessMode = (typeof SUBMISSION_ACCESS_MODE_VALUES)[number];

const allowedModes = new Set<SubmissionAccessMode>(SUBMISSION_ACCESS_MODE_VALUES);

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

export type SubmissionAccessDecision =
  | Readonly<{
      allow: true;
      mode: "public";
      principal: "anonymous" | "session";
      requireFormNonce: true;
      requireCaptcha: boolean;
      requireSessionCsrf: false;
      rateBucket: "public_write";
    }>
  | Readonly<{
      allow: true;
      mode: "internal";
      principal: "session";
      requireFormNonce: false;
      requireCaptcha: false;
      requireSessionCsrf: true;
      rateBucket: "admin_write";
    }>
  | Readonly<{
      allow: true;
      mode: "internal";
      principal: "apiKey";
      requireFormNonce: false;
      requireCaptcha: false;
      requireSessionCsrf: false;
      rateBucket: "admin_write";
    }>
  | Readonly<{
      allow: false;
      reason: "auth_required" | "forbidden";
    }>;

export function evaluateSubmissionAccess(params: {
  mode: SubmissionAccessMode;
  isAuthenticated: boolean;
  apiKeyScopes?: string[] | null;
  requiredApiKeyScope?: string;
}): SubmissionAccessDecision {
  const requiredScope = params.requiredApiKeyScope ?? submissionAccessDefaults.requiredApiKeyScope;

  if (params.mode === "public") {
    return Object.freeze({
      allow: true,
      mode: "public",
      principal: params.isAuthenticated ? "session" : "anonymous",
      requireFormNonce: true,
      requireCaptcha: !params.isAuthenticated,
      requireSessionCsrf: false,
      rateBucket: "public_write",
    });
  }

  if (params.isAuthenticated) {
    return Object.freeze({
      allow: true,
      mode: "internal",
      principal: "session",
      requireFormNonce: false,
      requireCaptcha: false,
      requireSessionCsrf: true,
      rateBucket: "admin_write",
    });
  }

  if (Array.isArray(params.apiKeyScopes)) {
    if (params.apiKeyScopes.includes(requiredScope)) {
      return Object.freeze({
        allow: true,
        mode: "internal",
        principal: "apiKey",
        requireFormNonce: false,
        requireCaptcha: false,
        requireSessionCsrf: false,
        rateBucket: "admin_write",
      });
    }
    return Object.freeze({ allow: false, reason: "forbidden" });
  }

  return Object.freeze({ allow: false, reason: "auth_required" });
}
