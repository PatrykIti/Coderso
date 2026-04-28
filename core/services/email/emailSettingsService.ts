import { desc, inArray } from "drizzle-orm";

import { db } from "../../db/client";
import { emailDeliveryLogs, settings } from "../../db/schema";
import {
  decryptSecret,
  encryptSecret,
  hasValidSecretMasterKey,
  isEncryptedSecret,
} from "../security/secretStore";
import { createTransport } from "./emailProvider";

export type EmailSettingsPublic = {
  provider: "smtp";
  smtp: {
    host: string | null;
    port: number | null;
    secure: boolean;
    user: string | null;
    password: { configured: boolean };
  };
  from: {
    name: string | null;
    email: string | null;
  };
  status: {
    configured: boolean;
  };
};

export type EmailSettingsInternal = {
  provider: "smtp";
  smtp: {
    host: string | null;
    port: number | null;
    secure: boolean;
    user: string | null;
    password: string | null;
  };
  from: {
    name: string | null;
    email: string | null;
  };
};

export type EmailSettingsUpdate = {
  provider?: "smtp";
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

const DEFAULT_PROVIDER = "smtp";
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

const getStringValue = (value: unknown) =>
  typeof value === "string" ? value : null;

const getNumberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const getBooleanValue = (value: unknown) =>
  typeof value === "boolean" ? value : null;

const buildUpdatedAt = (rows: Array<{ updatedAt: Date }>) => {
  if (!rows.length) return null;
  return Math.max(...rows.map((row) => row.updatedAt.getTime()));
};

async function loadEmailRecords() {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(inArray(settings.key, ALL_KEYS));
    const map = new Map(rows.map((row) => [row.key, row]));
    return { map, updatedAt: buildUpdatedAt(rows) };
  } catch (error) {
    if (process.env.NODE_ENV === "test") {
      return { map: new Map(), updatedAt: null };
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

const buildPublicSettings = (
  map: Map<string, { value: unknown }>
): EmailSettingsPublic => {
  const provider =
    (getStringValue(map.get(EMAIL_KEYS.provider)?.value) as "smtp") ??
    DEFAULT_PROVIDER;
  const smtpHost = getStringValue(map.get(EMAIL_KEYS.smtpHost)?.value);
  const smtpPort = getNumberValue(map.get(EMAIL_KEYS.smtpPort)?.value) ?? DEFAULT_PORT;
  const smtpSecure =
    getBooleanValue(map.get(EMAIL_KEYS.smtpSecure)?.value) ?? false;
  const smtpUser = getStringValue(map.get(EMAIL_KEYS.smtpUser)?.value);
  const smtpPasswordValue = map.get(EMAIL_KEYS.smtpPassword)?.value;
  const fromName = getStringValue(map.get(EMAIL_KEYS.fromName)?.value);
  const fromEmail = getStringValue(map.get(EMAIL_KEYS.fromEmail)?.value);

  const configured = Boolean(smtpHost && smtpUser && smtpPasswordValue && fromEmail);

  return {
    provider,
    smtp: {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser,
      password: { configured: resolvePasswordConfigured(smtpPasswordValue) },
    },
    from: {
      name: fromName,
      email: fromEmail,
    },
    status: {
      configured,
    },
  };
};

const buildInternalSettings = (
  map: Map<string, { value: unknown }>
): EmailSettingsInternal => {
  const provider =
    (getStringValue(map.get(EMAIL_KEYS.provider)?.value) as "smtp") ??
    DEFAULT_PROVIDER;
  const smtpHost = getStringValue(map.get(EMAIL_KEYS.smtpHost)?.value);
  const smtpPort = getNumberValue(map.get(EMAIL_KEYS.smtpPort)?.value) ?? DEFAULT_PORT;
  const smtpSecure =
    getBooleanValue(map.get(EMAIL_KEYS.smtpSecure)?.value) ?? false;
  const smtpUser = getStringValue(map.get(EMAIL_KEYS.smtpUser)?.value);
  const smtpPassword = resolveSecret(map.get(EMAIL_KEYS.smtpPassword)?.value);
  const fromName = getStringValue(map.get(EMAIL_KEYS.fromName)?.value);
  const fromEmail = getStringValue(map.get(EMAIL_KEYS.fromEmail)?.value);

  return {
    provider,
    smtp: {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser,
      password: smtpPassword,
    },
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
}

async function getSettingsCache() {
  const { map, updatedAt } = await loadEmailRecords();
  if (!cachedPublic || !cachedInternal || cachedUpdatedAt !== updatedAt) {
    cachedPublic = buildPublicSettings(map);
    cachedInternal = buildInternalSettings(map);
    cachedUpdatedAt = updatedAt;
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
    if (input.provider !== "smtp") {
      throw new Error("email_settings_invalid");
    }
    updates.push({ key: EMAIL_KEYS.provider, value: input.provider });
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
    await db.delete(emailDeliveryLogs).where(inArray(emailDeliveryLogs.id, rows.map((row) => row.id)));
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

export async function sendTestEmail(to: string) {
  const trimmed = to.trim();
  if (!trimmed || !trimmed.includes("@")) {
    throw new Error("email_recipient_invalid");
  }

  const settings = await getEmailSettingsInternal();
  if (!settings.smtp.host || !settings.smtp.port || !settings.smtp.user || !settings.smtp.password) {
    throw new Error("email_not_configured");
  }

  const fromName = settings.from.name ?? "Coderso";
  const fromEmail = settings.from.email ?? settings.smtp.user;
  if (!fromEmail) throw new Error("email_not_configured");

  const transport = await createTransport({
    host: settings.smtp.host,
    port: settings.smtp.port,
    secure: settings.smtp.secure,
    user: settings.smtp.user,
    password: settings.smtp.password,
  });

  const subject = "Coderso SMTP test";
  const payload = {
    from: `${fromName} <${fromEmail}>`,
    to: trimmed,
    subject,
    text: "This is a test email from Coderso.",
  };

  try {
    const result = await transport.sendMail(payload);
    await logDelivery({
      recipient: trimmed,
      subject,
      status: "delivered",
      provider: settings.provider,
      messageId: result.messageId,
      error: null,
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "email_send_failed";
    await logDelivery({
      recipient: trimmed,
      subject,
      status: "failed",
      provider: settings.provider,
      messageId: null,
      error: message,
    });
    throw new Error("email_send_failed");
  }
}
