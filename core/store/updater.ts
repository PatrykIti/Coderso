export type UpdatePolicy = "manual" | "auto-security" | "auto-all";

export type ReleaseInfo = {
  type?: "normal" | "security" | string;
  channel?: string;
};

export type UpdateDecision = {
  allowed: boolean;
  reason?: string;
};

export function resolveUpdatePolicy(value?: string): UpdatePolicy {
  if (value === "manual" || value === "auto-security" || value === "auto-all") {
    return value;
  }
  return "auto-security";
}

export function shouldAutoUpdate(policy: UpdatePolicy, release?: ReleaseInfo): UpdateDecision {
  if (policy === "manual") {
    return { allowed: false, reason: "policy_manual" };
  }

  if (policy === "auto-all") {
    return { allowed: true };
  }

  const releaseType = release?.type ?? "normal";
  if (releaseType !== "security") {
    return { allowed: false, reason: "policy_security_only" };
  }

  return { allowed: true };
}
