import { redactAuditText } from "../audit/auditRedaction";

export type EmailProviderSettings = {
  host: string;
  port: number;
  secure: boolean;
  user?: string | null;
  password?: string | null;
};

export type ResendProviderSettings = {
  apiKey: string;
  fetchImpl?: typeof fetch;
};

export type EmailMessage = {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  idempotencyKey?: string;
};

export type EmailSendResult = {
  messageId: string | null;
  response?: string | null;
};

export type EmailTransport = {
  sendMail: (message: EmailMessage) => Promise<EmailSendResult>;
};

const mockTransport: EmailTransport = {
  async sendMail() {
    return { messageId: "mock", response: "mock" };
  },
};

const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";
const RESEND_USER_AGENT = "Coderso Email/1.0";
const MAX_IDEMPOTENCY_KEY_LENGTH = 256;
const MAX_PROVIDER_ERROR_LENGTH = 240;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const clampIdempotencyKey = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_IDEMPOTENCY_KEY_LENGTH);
};

const parseJsonSafe = async (response: Response): Promise<Record<string, unknown>> => {
  try {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.toLowerCase().includes("json")) {
      const parsed = await response.json();
      return isRecord(parsed) ? parsed : {};
    }
    const text = await response.text();
    return text ? { message: text } : {};
  } catch {
    return {};
  }
};

const pickErrorText = (body: Record<string, unknown>, status: number) => {
  const error = body.error;
  if (typeof error === "string") return error;
  if (isRecord(error) && typeof error.message === "string") return error.message;
  if (typeof body.message === "string") return body.message;
  return `provider_http_${status}`;
};

const sanitizeProviderError = (body: Record<string, unknown>, status: number) =>
  redactAuditText(pickErrorText(body, status)).slice(0, MAX_PROVIDER_ERROR_LENGTH);

async function loadNodemailer() {
  try {
    return await import("nodemailer");
  } catch {
    throw new Error("email_provider_missing");
  }
}

export async function createSmtpTransport(
  settings: EmailProviderSettings
): Promise<EmailTransport> {
  if (process.env.EMAIL_TRANSPORT === "mock" || process.env.NODE_ENV === "test") {
    return mockTransport;
  }

  const nodemailer = await loadNodemailer();
  const transport = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: settings.user
      ? {
          user: settings.user,
          pass: settings.password ?? "",
        }
      : undefined,
  });

  return {
    async sendMail(message: EmailMessage) {
      const result = await transport.sendMail(message);
      return {
        messageId: result?.messageId ?? null,
        response: typeof result?.response === "string" ? result.response : null,
      };
    },
  };
}

export async function createTransport(settings: EmailProviderSettings): Promise<EmailTransport> {
  return createSmtpTransport(settings);
}

export function createResendTransport(settings: ResendProviderSettings): EmailTransport {
  const apiKey = settings.apiKey.trim();
  if (!apiKey) {
    throw new Error("email_provider_invalid");
  }

  if (
    process.env.EMAIL_TRANSPORT === "mock" ||
    (process.env.NODE_ENV === "test" && !settings.fetchImpl)
  ) {
    return mockTransport;
  }

  const fetchImpl = settings.fetchImpl ?? fetch;
  return {
    async sendMail(message: EmailMessage) {
      const idempotencyKey = message.idempotencyKey
        ? clampIdempotencyKey(message.idempotencyKey)
        : null;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": RESEND_USER_AGENT,
      };
      if (idempotencyKey) {
        headers["Idempotency-Key"] = idempotencyKey;
      }

      let response: Response;
      try {
        response = await fetchImpl(RESEND_EMAILS_ENDPOINT, {
          method: "POST",
          headers,
          body: JSON.stringify({
            from: message.from,
            to: [message.to],
            subject: message.subject,
            ...(message.text !== undefined ? { text: message.text } : {}),
            ...(message.html !== undefined ? { html: message.html } : {}),
          }),
        });
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "provider_network_failed";
        throw new Error(redactAuditText(messageText).slice(0, MAX_PROVIDER_ERROR_LENGTH));
      }
      const body = await parseJsonSafe(response);
      if (!response.ok) {
        throw new Error(sanitizeProviderError(body, response.status));
      }

      return {
        messageId: typeof body.id === "string" ? body.id : null,
        response: `resend:${response.status}`,
      };
    },
  };
}
