import { desc, inArray } from "drizzle-orm";

import { db } from "../../db/client";
import { emailDeliveryLogs, settings } from "../../db/schema";
import {
  decryptSecret,
  encryptSecret,
  hasValidSecretMasterKey,
  isEncryptedSecret,
} from "../security/secretStore";
import { redactAuditText } from "../audit/auditRedaction";
import {
  createResendTransport,
  createSmtpTransport,
  type EmailSendResult,
  type EmailTransport,
} from "./emailProvider";
import {
  getIntegration,
  getIntegrationRuntimeConfig,
  type IntegrationSummary,
} from "../integrations/integrationsService";

export const EMAIL_PROVIDER_IDS = ["smtp", "resend"] as const;

export type EmailProviderId = (typeof EMAIL_PROVIDER_IDS)[number];

export type ResendSettingsSummary = {
  integrationId: "resend";
  apiKey: { configured: boolean };
  status: "connected" | "disconnected";
};

export type EmailSettingsPublic = {
  provider: EmailProviderId;
  smtp: {
    host: string | null;
    port: number | null;
    secure: boolean;
    user: string | null;
    password: { configured: boolean };
  };
  resend: ResendSettingsSummary;
  from: {
    name: string | null;
    email: string | null;
  };
  status: {
    provider: EmailProviderId;
    configured: boolean;
  };
};

export type EmailSettingsInternal = {
  provider: EmailProviderId;
  smtp: {
    host: string | null;
    port: number | null;
    secure: boolean;
    user: string | null;
    password: string | null;
  };
  resend: ResendSettingsSummary;
  from: {
    name: string | null;
    email: string | null;
  };
};

export type EmailSettingsUpdate = {
  provider?: EmailProviderId | null;
  smtp?: {
    host?: string | null;
    port?: number | null;
    secure?: boolean;
    user?: string | null;
    password?: string | null;
  };
  from?: {
    name?: string | null;
    email?: string | null;
  };
};

export type EmailDeliveryLog = {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  provider: string;
  messageId: string | null;
  error: string | null;
  createdAt: Date;
};

export type SystemEmailMessage = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  fromName?: string;
  fromEmail?: string;
  idempotencyKey?: string;
};

type ConfiguredEmail = {
  provider: EmailProviderId;
  from: string;
  transport: EmailTransport;
};

const EMAIL_KEYS = {
  provider: "email.provider",
  smtpHost: "email.smtp.host",
  smtpPort: "email.smtp.port",
  smtpSecure: "email.smtp.secure",
  smtpUser: "email.smtp.user",
  smtpPassword: "email.smtp.password",
  fromName: "email.from.name",
  fromEmail: "email.from.email",
} as const;

const ALL_KEYS: string[] = Object.values(EMAIL_KEYS);

let cachedPublic: EmailSettingsPublic | null = null;
let cachedInternal: EmailSettingsInternal | null = null;
let cachedUpdatedAt: number | null = null;
let cachedResendUpdatedAt: number | null = null;

const DEFAULT_PROVIDER: EmailProviderId = "smtp";
const DEFAULT_PORT = 587;

const normalizeString = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("email_settings_invalid");
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
};

const normalizeNumber = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error("email_settings_invalid");
};

const normalizeBoolean = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  throw new Error("email_settings_invalid");
};

const normalizeEmailProvider = (value: unknown): EmailProviderId => {
  const normalized = normalizeString(value);
  if (normalized === undefined || normalized === null) return DEFAULT_PROVIDER;
  if (normalized === "smtp" || normalized === "resend") return normalized;
  throw new Error("email_settings_invalid");
};

const getStringValue = (value: unknown) => (typeof value === "string" ? value : null);

const getNumberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const getBooleanValue = (value: unknown) => (typeof value === "boolean" ? value : null);

const buildUpdatedAt = (rows: Array<{ updatedAt: Date }>) => {
  if (!rows.length) return null;
  return Math.max(...rows.map((row) => row.updatedAt.getTime()));
};

async function loadEmailRecords() {
  try {
    const rows = await db.select().from(settings).where(inArray(settings.key, ALL_KEYS));
    const map = new Map(rows.map((row) => [row.key, row]));
    return { map, updatedAt: buildUpdatedAt(rows) };
  } catch (error) {
    if (process.env.NODE_ENV === "test") {
      return { map: new Map(), updatedAt: null };
    }
    throw error;
  }
}

async function loadResendIntegration() {
  try {
    return await getIntegration("resend");
  } catch (error) {
    if (process.env.NODE_ENV === "test") {
      return null;
    }
    throw error;
  }
}

const resolveSecret = (value: unknown) => {
  if (typeof value === "string") return value;
  if (isEncryptedSecret(value)) return decryptSecret(value);
  return null;
};

const resolvePasswordConfigured = (value: unknown) =>
  typeof value === "string" || isEncryptedSecret(value);

const buildResendSummary = (summary: IntegrationSummary | null): ResendSettingsSummary => {
  const apiKey = summary?.fields.find((field) => field.key === "apiKey");
  return {
    integrationId: "resend",
    apiKey: { configured: Boolean(apiKey?.configured) },
    status: summary?.status ?? "disconnected",
  };
};

const isSmtpConfigured = (input: {
  host: string | null;
  user: string | null;
  passwordValue: unknown;
  fromEmail: string | null;
}) => Boolean(input.host && input.user && input.passwordValue && input.fromEmail);

const isResendConfigured = (summary: ResendSettingsSummary, fromEmail: string | null) =>
  summary.status === "connected" && summary.apiKey.configured && Boolean(fromEmail);

const buildPublicSettings = (
  map: Map<string, { value: unknown }>,
  resendIntegration: IntegrationSummary | null
): EmailSettingsPublic => {
  const provider = normalizeEmailProvider(map.get(EMAIL_KEYS.provider)?.value);
  const smtpHost = getStringValue(map.get(EMAIL_KEYS.smtpHost)?.value);
  const smtpPort = getNumberValue(map.get(EMAIL_KEYS.smtpPort)?.value) ?? DEFAULT_PORT;
  const smtpSecure = getBooleanValue(map.get(EMAIL_KEYS.smtpSecure)?.value) ?? false;
  const smtpUser = getStringValue(map.get(EMAIL_KEYS.smtpUser)?.value);
  const smtpPasswordValue = map.get(EMAIL_KEYS.smtpPassword)?.value;
  const fromName = getStringValue(map.get(EMAIL_KEYS.fromName)?.value);
  const fromEmail = getStringValue(map.get(EMAIL_KEYS.fromEmail)?.value);
  const resend = buildResendSummary(resendIntegration);

  const smtpConfigured = isSmtpConfigured({
    host: smtpHost,
    user: smtpUser,
    passwordValue: smtpPasswordValue,
    fromEmail,
  });
  const configured = provider === "resend" ? isResendConfigured(resend, fromEmail) : smtpConfigured;

  return {
    provider,
    smtp: {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser,
      password: { configured: resolvePasswordConfigured(smtpPasswordValue) },
    },
    resend,
    from: {
      name: fromName,
      email: fromEmail,
    },
    status: {
      provider,
      configured,
    },
  };
};

const buildInternalSettings = (
  map: Map<string, { value: unknown }>,
  resendIntegration: IntegrationSummary | null
): EmailSettingsInternal => {
  const provider = normalizeEmailProvider(map.get(EMAIL_KEYS.provider)?.value);
  const smtpHost = getStringValue(map.get(EMAIL_KEYS.smtpHost)?.value);
  const smtpPort = getNumberValue(map.get(EMAIL_KEYS.smtpPort)?.value) ?? DEFAULT_PORT;
  const smtpSecure = getBooleanValue(map.get(EMAIL_KEYS.smtpSecure)?.value) ?? false;
  const smtpUser = getStringValue(map.get(EMAIL_KEYS.smtpUser)?.value);
  const smtpPassword = resolveSecret(map.get(EMAIL_KEYS.smtpPassword)?.value);
  const fromName = getStringValue(map.get(EMAIL_KEYS.fromName)?.value);
  const fromEmail = getStringValue(map.get(EMAIL_KEYS.fromEmail)?.value);
  const resend = buildResendSummary(resendIntegration);

  return {
    provider,
    smtp: {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser,
      password: smtpPassword,
    },
    resend,
    from: {
      name: fromName,
      email: fromEmail,
    },
  };
};

export function resetEmailSettingsCache() {
  cachedPublic = null;
  cachedInternal = null;
  cachedUpdatedAt = null;
  cachedResendUpdatedAt = null;
}

async function getSettingsCache() {
  const { map, updatedAt } = await loadEmailRecords();
  const resendIntegration = await loadResendIntegration();
  const resendUpdatedAt = resendIntegration?.updatedAt?.getTime() ?? null;
  if (
    !cachedPublic ||
    !cachedInternal ||
    cachedUpdatedAt !== updatedAt ||
    cachedResendUpdatedAt !== resendUpdatedAt
  ) {
    cachedPublic = buildPublicSettings(map, resendIntegration);
    cachedInternal = buildInternalSettings(map, resendIntegration);
    cachedUpdatedAt = updatedAt;
    cachedResendUpdatedAt = resendUpdatedAt;
  }

  if (!cachedPublic || !cachedInternal) {
    throw new Error("email_settings_unavailable");
  }

  return { public: cachedPublic, internal: cachedInternal };
}

export async function getEmailSettings(): Promise<EmailSettingsPublic> {
  const cache = await getSettingsCache();
  return cache.public;
}

export async function getEmailSettingsInternal(): Promise<EmailSettingsInternal> {
  const cache = await getSettingsCache();
  return cache.internal;
}

export async function updateEmailSettings(input: EmailSettingsUpdate) {
  const updates: Array<{ key: string; value: unknown }> = [];
  const now = new Date();

  if (input.provider !== undefined) {
    updates.push({
      key: EMAIL_KEYS.provider,
      value: normalizeEmailProvider(input.provider),
    });
  }

  if (input.smtp) {
    if (input.smtp.host !== undefined) {
      updates.push({
        key: EMAIL_KEYS.smtpHost,
        value: normalizeString(input.smtp.host),
      });
    }
    if (input.smtp.port !== undefined) {
      updates.push({
        key: EMAIL_KEYS.smtpPort,
        value: normalizeNumber(input.smtp.port),
      });
    }
    if (input.smtp.secure !== undefined) {
      updates.push({
        key: EMAIL_KEYS.smtpSecure,
        value: normalizeBoolean(input.smtp.secure),
      });
    }
    if (input.smtp.user !== undefined) {
      updates.push({
        key: EMAIL_KEYS.smtpUser,
        value: normalizeString(input.smtp.user),
      });
    }
    if (input.smtp.password !== undefined) {
      const normalized = normalizeString(input.smtp.password);
      if (normalized === null) {
        updates.push({ key: EMAIL_KEYS.smtpPassword, value: null });
      } else if (normalized === undefined) {
        // skip
      } else {
        if (!hasValidSecretMasterKey()) {
          throw new Error("secret_master_key_invalid");
        }
        updates.push({
          key: EMAIL_KEYS.smtpPassword,
          value: encryptSecret(normalized),
        });
      }
    }
  }

  if (input.from) {
    if (input.from.name !== undefined) {
      updates.push({
        key: EMAIL_KEYS.fromName,
        value: normalizeString(input.from.name),
      });
    }
    if (input.from.email !== undefined) {
      updates.push({
        key: EMAIL_KEYS.fromEmail,
        value: normalizeString(input.from.email),
      });
    }
  }

  if (updates.length === 0) {
    return getEmailSettings();
  }

  await db.transaction(async (tx) => {
    for (const update of updates) {
      await tx
        .insert(settings)
        .values({ key: update.key, value: update.value, updatedAt: now })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: update.value, updatedAt: now },
        });
    }
  });

  resetEmailSettingsCache();
  return getEmailSettings();
}

async function logDelivery(entry: Omit<EmailDeliveryLog, "id" | "createdAt">) {
  const [row] = await db
    .insert(emailDeliveryLogs)
    .values({
      recipient: entry.recipient,
      subject: entry.subject,
      status: entry.status,
      provider: entry.provider,
      messageId: entry.messageId ?? null,
      error: entry.error ?? null,
    })
    .returning();

  const rows = await db
    .select({ id: emailDeliveryLogs.id })
    .from(emailDeliveryLogs)
    .orderBy(desc(emailDeliveryLogs.createdAt))
    .offset(50);
  if (rows.length > 0) {
    await db.delete(emailDeliveryLogs).where(
      inArray(
        emailDeliveryLogs.id,
        rows.map((row) => row.id)
      )
    );
  }

  return row ?? null;
}

export async function listDeliveryLogs(limit = 50) {
  const rows = await db
    .select()
    .from(emailDeliveryLogs)
    .orderBy(desc(emailDeliveryLogs.createdAt))
    .limit(limit);
  return rows as EmailDeliveryLog[];
}

const formatSender = (from: { name: string | null; email: string | null }) => {
  if (!from.email) {
    throw new Error("email_not_configured");
  }
  const fromName = from.name ?? "Coderso";
  return `${fromName} <${from.email}>`;
};

const resolveMessageFrom = (
  settings: EmailSettingsInternal,
  message: Pick<SystemEmailMessage, "from" | "fromEmail" | "fromName">
) => {
  const explicitFrom = message.from?.trim();
  if (explicitFrom) return explicitFrom;

  const fromEmail = message.fromEmail?.trim() || settings.from.email;
  if (!fromEmail) {
    throw new Error("email_not_configured");
  }
  const fromName = message.fromName?.trim() || settings.from.name || "Coderso";
  return `${fromName} <${fromEmail}>`;
};

const resolveSmtpConfiguredEmail = async (
  settings: EmailSettingsInternal,
  from: string
): Promise<ConfiguredEmail> => {
  if (
    !settings.smtp.host ||
    !settings.smtp.port ||
    !settings.smtp.user ||
    !settings.smtp.password
  ) {
    throw new Error("email_not_configured");
  }

  return {
    provider: "smtp",
    from,
    transport: await createSmtpTransport({
      host: settings.smtp.host,
      port: settings.smtp.port,
      secure: settings.smtp.secure,
      user: settings.smtp.user,
      password: settings.smtp.password,
    }),
  };
};

const normalizeRuntimeSecret = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const resolveResendConfiguredEmail = async (from: string): Promise<ConfiguredEmail> => {
  const config = await getIntegrationRuntimeConfig("resend");
  const apiKey = normalizeRuntimeSecret(config?.apiKey);
  if (!apiKey) {
    throw new Error("email_not_configured");
  }

  try {
    return {
      provider: "resend",
      from,
      transport: createResendTransport({ apiKey }),
    };
  } catch (error) {
    if (error instanceof Error && error.message === "email_provider_invalid") {
      throw new Error("email_not_configured");
    }
    throw error;
  }
};

const resolveConfiguredEmail = async (
  settings: EmailSettingsInternal,
  message?: Pick<SystemEmailMessage, "from" | "fromEmail" | "fromName">
): Promise<ConfiguredEmail> => {
  const from = message ? resolveMessageFrom(settings, message) : formatSender(settings.from);
  if (settings.provider === "resend") {
    return resolveResendConfiguredEmail(from);
  }
  return resolveSmtpConfiguredEmail(settings, from);
};

export async function assertSystemEmailConfigured() {
  const settings = await getEmailSettingsInternal();
  await resolveConfiguredEmail(settings);
}

const sanitizeDeliveryError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "email_send_failed";
  return redactAuditText(message).slice(0, 240);
};

export async function sendSystemEmail(message: SystemEmailMessage) {
  const trimmed = message.to.trim();
  if (!trimmed || !trimmed.includes("@")) {
    throw new Error("email_recipient_invalid");
  }

  const settings = await getEmailSettingsInternal();
  const configured = await resolveConfiguredEmail(settings, message);

  try {
    const result: EmailSendResult = await configured.transport.sendMail({
      from: configured.from,
      to: trimmed,
      subject: message.subject,
      text: message.text,
      html: message.html,
      idempotencyKey: message.idempotencyKey,
    });
    await logDelivery({
      recipient: trimmed,
      subject: message.subject,
      status: "delivered",
      provider: configured.provider,
      messageId: result.messageId,
      error: null,
    });
    return {
      ok: true,
      messageId: result.messageId,
      response: result.response ?? null,
    };
  } catch (error) {
    const errorMessage = sanitizeDeliveryError(error);
    await logDelivery({
      recipient: trimmed,
      subject: message.subject,
      status: "failed",
      provider: configured.provider,
      messageId: null,
      error: errorMessage,
    });
    throw new Error("email_send_failed");
  }
}

export async function sendTestEmail(to: string) {
  const trimmed = to.trim();
  if (!trimmed || !trimmed.includes("@")) {
    throw new Error("email_recipient_invalid");
  }

  return sendSystemEmail({
    to: trimmed,
    subject: "Coderso email test",
    text: "This is a test email from Coderso.",
  });
}
