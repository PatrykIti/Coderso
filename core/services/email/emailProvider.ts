export type EmailProviderSettings = {
  host: string;
  port: number;
  secure: boolean;
  user?: string | null;
  password?: string | null;
};

export type EmailMessage = {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
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

async function loadNodemailer() {
  try {
    return await import("nodemailer");
  } catch {
    throw new Error("email_provider_missing");
  }
}

export async function createTransport(
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

