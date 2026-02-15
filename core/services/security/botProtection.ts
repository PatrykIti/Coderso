import { ApiError } from "../../server/errorHandler";
import type { BotProtectionSettings } from "../settings/securitySettings";
import { decryptSecret, isEncryptedSecret } from "./secretStore";

export type BotProtectionAction = "login" | "reset" | "public_write";

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

const isLocalhostIp = (ip?: string) =>
  ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0";

const resolveSecretValue = (secret: BotProtectionSettings["secretKey"]) => {
  if (typeof secret === "string") return secret.trim() || null;
  if (isEncryptedSecret(secret)) {
    return decryptSecret(secret);
  }
  return null;
};

const resolveThreshold = (
  action: BotProtectionAction,
  settings: BotProtectionSettings
) => {
  switch (action) {
    case "login":
      return settings.thresholds.login;
    case "reset":
      return settings.thresholds.reset;
    case "public_write":
      return settings.thresholds.publicWrite;
    default:
      return 0.5;
  }
};

export async function enforceBotProtection(params: {
  token?: string | null;
  action: BotProtectionAction;
  ip?: string;
  settings: BotProtectionSettings;
}) {
  const { token, action, ip, settings } = params;
  if (!settings.enabled) return;
  if (isLocalhostIp(ip) && !settings.enforceOnLocalhost) return;

  if (!settings.siteKey) {
    throw new ApiError(
      "bot_protection_missing_keys",
      "Bot protection is missing the site key",
      400
    );
  }

  const secret = resolveSecretValue(settings.secretKey);
  if (!secret) {
    throw new ApiError(
      "bot_protection_missing_keys",
      "Bot protection is missing the secret key",
      400
    );
  }

  if (!token) {
    throw new ApiError(
      "bot_protection_required",
      "Bot protection token is required",
      400
    );
  }

  const payload = new URLSearchParams();
  payload.set("secret", secret);
  payload.set("response", token);
  if (ip) payload.set("remoteip", ip);

  let response: Response;
  try {
    response = await fetch(VERIFY_URL, {
      method: "POST",
      body: payload,
    });
  } catch (error) {
    throw new ApiError(
      "bot_protection_unavailable",
      "Bot protection service unavailable",
      502
    );
  }

  if (!response.ok) {
    throw new ApiError(
      "bot_protection_unavailable",
      "Bot protection service unavailable",
      502
    );
  }

  const data = (await response.json()) as {
    success?: boolean;
    score?: number;
    action?: string;
    "error-codes"?: string[];
  };

  if (!data.success) {
    throw new ApiError(
      "bot_protection_failed",
      "Bot protection verification failed",
      403,
      { reason: data["error-codes"] ?? [] }
    );
  }

  if (data.action && data.action !== action) {
    throw new ApiError(
      "bot_protection_action_mismatch",
      "Bot protection action mismatch",
      403
    );
  }

  const score = typeof data.score === "number" ? data.score : 0;
  const threshold = resolveThreshold(action, settings);
  if (score < threshold) {
    throw new ApiError(
      "bot_protection_score_low",
      "Bot protection score too low",
      403,
      { score, threshold }
    );
  }
}
