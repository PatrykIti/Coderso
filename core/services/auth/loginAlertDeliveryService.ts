import { redactAuditText } from "../audit/auditRedaction";
import { sendSystemEmail } from "../email/emailSettingsService";
import {
  getSecuritySettings,
  resolveLoginWebhookSecret,
  setSecuritySettings,
} from "../settings/securitySettings";
import { createWebhookSignature } from "../webhooks/signing";
import { fetchWithEgressPolicy, validateOutboundUrl } from "../network/outboundHttpPolicy";

const WEBHOOK_TIMEOUT_MS = 8000;
const DELIVERY_ERROR_MAX_LENGTH = 240;

export type LoginAlertDeliveryInput = {
  user: { id: string; email: string; name?: string | null };
  flags: { newDevice: boolean; newLocation: boolean };
  current: { ip: string | null; userAgent: string | null };
  at: Date;
};

export type LoginAlertChannelStatus = "sent" | "skipped" | "failed";

export type LoginAlertDeliveryResult = {
  email: LoginAlertChannelStatus;
  webhook: LoginAlertChannelStatus;
};

export type LoginAlertDeliveryDeps = {
  getSettings?: typeof getSecuritySettings;
  sendEmail?: typeof sendSystemEmail;
  fetchImpl?: typeof fetch;
  recordError?: (message: string | null) => Promise<void>;
};

const setDeliveryHeader = (headers: Headers, name: string, value: string) => {
  headers.set(`X-Coderso-${name}`, value);
  headers.set(`X-Nextless-${name}`, value);
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const maskEmail = (email: string) => {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return "[REDACTED]";
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  if (local.length <= 2) return `${"*".repeat(local.length)}${domain}`;
  const visible = Math.min(8, Math.max(1, local.length - 2));
  return `${local[0]}${"*".repeat(local.length - visible - 1)}${local.slice(-1)}${domain}`;
};

const normalizeRecipientList = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)));

const buildLoginAlertEmail = (input: LoginAlertDeliveryInput) => {
  const safeName = input.user.name?.trim() || "there";
  const subject = "Security alert: new sign-in to your account";
  const text = [
    `Hello ${safeName},`,
    "",
    "We detected a new sign-in to your account.",
    `New device: ${input.flags.newDevice ? "yes" : "no"}`,
    `New location: ${input.flags.newLocation ? "yes" : "no"}`,
    `Time: ${input.at.toISOString()}`,
    "",
    "If this wasn't you, secure your account immediately.",
  ].join("\n");
  const html = [
    `<p>Hello ${escapeHtml(safeName)},</p>`,
    "<p>We detected a new sign-in to your account.</p>",
    `<p>New device: ${input.flags.newDevice ? "yes" : "no"}<br />`,
    `New location: ${input.flags.newLocation ? "yes" : "no"}<br />`,
    `Time: ${escapeHtml(input.at.toISOString())}</p>`,
    "<p>If this wasn't you, secure your account immediately.</p>",
  ].join("");
  return { subject, text, html };
};

const sanitizeDeliveryError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "login_alert_delivery_failed";
  return redactAuditText(message).slice(0, DELIVERY_ERROR_MAX_LENGTH);
};

const defaultRecordError = async (message: string | null) => {
  await setSecuritySettings({ loginAlerts: { deliveryError: message } });
};

export async function deliverLoginAlert(
  input: LoginAlertDeliveryInput,
  deps: LoginAlertDeliveryDeps = {}
): Promise<LoginAlertDeliveryResult> {
  const getSettings = deps.getSettings ?? getSecuritySettings;
  const sendEmail = deps.sendEmail ?? sendSystemEmail;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const recordError = deps.recordError ?? defaultRecordError;

  let settings;
  try {
    settings = (await getSettings()).loginAlerts;
  } catch {
    // Settings are unavailable; nothing can be delivered and no status can be
    // recorded. The caller must never see a throw from this service.
    return { email: "skipped", webhook: "skipped" };
  }

  let lastError: string | null = null;

  let emailStatus: LoginAlertChannelStatus = "skipped";
  const recipients = normalizeRecipientList([input.user.email, ...settings.recipients]);
  if (recipients.length > 0) {
    try {
      const { subject, text, html } = buildLoginAlertEmail(input);
      await Promise.all(recipients.map((to) => sendEmail({ to, subject, text, html })));
      emailStatus = "sent";
    } catch (error) {
      emailStatus = "failed";
      lastError = sanitizeDeliveryError(error);
    }
  }

  let webhookStatus: LoginAlertChannelStatus = "skipped";
  if (settings.webhookUrl) {
    try {
      const payload = JSON.stringify({
        event: "auth.login.alert",
        userId: input.user.id,
        email: maskEmail(input.user.email),
        newDevice: input.flags.newDevice,
        newLocation: input.flags.newLocation,
        at: input.at.toISOString(),
      });

      const headers = new Headers({ "Content-Type": "application/json" });
      setDeliveryHeader(headers, "Event", "auth.login.alert");

      // Fail closed: an unsigned webhook is never sent. The settings contract
      // already requires a secret when a URL is set; a failed decryption here
      // is an operational anomaly and must not degrade to an unsigned POST.
      const secret = resolveLoginWebhookSecret(settings.webhookSecret);
      if (!secret) {
        throw new Error("login_alert_webhook_secret_unavailable");
      }
      const signature = createWebhookSignature(secret, payload);
      setDeliveryHeader(headers, "Signature", signature.signature);
      setDeliveryHeader(headers, "Timestamp", signature.timestamp);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
      try {
        // TASK-567: re-validate at delivery time (config-time already rejected
        // literal private/mapped/NAT64 targets) and never follow redirects.
        // fetchWithEgressPolicy ALSO re-resolves the hostname right before the
        // fetch (DNS-rebinding aware), preserving the injected fetchImpl seam.
        const validated = validateOutboundUrl(settings.webhookUrl, {
          provider: "login-alert",
        });
        if (!validated.ok) {
          throw new Error("login_alert_webhook_url_invalid");
        }
        const response = await fetchWithEgressPolicy(
          settings.webhookUrl,
          {
            method: "POST",
            headers,
            body: payload,
            signal: controller.signal,
          },
          { provider: "login-alert", fetchFn: fetchImpl }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        webhookStatus = "sent";
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      webhookStatus = "failed";
      lastError = sanitizeDeliveryError(error);
    }
  }

  try {
    await recordError(lastError);
  } catch {
    // Best-effort status write; it must never break the login flow.
  }

  return { email: emailStatus, webhook: webhookStatus };
}
