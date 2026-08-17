import { expect, test } from "bun:test";

import {
  deliverLoginAlert,
  type LoginAlertDeliveryDeps,
  type LoginAlertDeliveryInput,
} from "../../../core/services/auth/loginAlertDeliveryService";
import { signWebhookPayload } from "../../../core/services/webhooks/signing";

const baseInput = (overrides: Partial<LoginAlertDeliveryInput> = {}): LoginAlertDeliveryInput => ({
  user: { id: "user-1", email: "owner@example.com", name: "Owner" },
  flags: { newDevice: true, newLocation: false },
  current: { ip: "203.0.113.10", userAgent: "Mozilla/5.0 raw-ua" },
  at: new Date("2026-08-14T10:00:00.000Z"),
  ...overrides,
});

const settingsFixture = {
  enabled: true,
  notifyOnNewDevice: true,
  notifyOnNewLocation: true,
  recipients: ["security@example.com"],
  webhookUrl: "https://hooks.example.com/login",
  webhookSecret: "s3cr3t-webhook-value",
  deliveryError: null,
};

const makeDeps = (overrides: Partial<LoginAlertDeliveryDeps> = {}): LoginAlertDeliveryDeps => ({
  getSettings: async () => ({ loginAlerts: settingsFixture }) as never,
  sendEmail: async () => ({ ok: true, messageId: "msg-1", response: null }),
  fetchImpl: async () => new Response("ok", { status: 200 }),
  recordError: async () => undefined,
  ...overrides,
});

test("emails affected user + configured recipients", async () => {
  const sent: string[] = [];
  const result = await deliverLoginAlert(
    baseInput(),
    makeDeps({
      sendEmail: async (message) => {
        sent.push(message.to);
        return { ok: true, messageId: "msg-1", response: null };
      },
    })
  );

  expect(result.email).toBe("sent");
  expect(sent).toEqual(["owner@example.com", "security@example.com"]);
});

test("dedupes and lowercases recipient list", async () => {
  const sent: string[] = [];
  const result = await deliverLoginAlert(
    baseInput(),
    makeDeps({
      getSettings: async () =>
        ({
          loginAlerts: {
            ...settingsFixture,
            recipients: ["Security@Example.COM", "Owner@Example.com"],
          },
        }) as never,
      sendEmail: async (message) => {
        sent.push(message.to);
        return { ok: true, messageId: "msg-1", response: null };
      },
    })
  );

  expect(result.email).toBe("sent");
  expect(sent).toEqual(["owner@example.com", "security@example.com"]);
});

test("signs webhook with HMAC and X-Coderso-Signature when secret set", async () => {
  let captured: { url: string; headers: Headers; body: string } | null = null;
  const result = await deliverLoginAlert(
    baseInput(),
    makeDeps({
      fetchImpl: async (url: string | URL | Request, init?: RequestInit) => {
        captured = {
          url: String(url),
          headers: new Headers(init?.headers),
          body: String(init?.body ?? ""),
        };
        return new Response("ok", { status: 200 });
      },
    })
  );

  expect(result.webhook).toBe("sent");
  if (!captured) throw new Error("fetch was not called");
  const seen = captured as { url: string; headers: Headers; body: string };
  expect(seen.url).toBe("https://hooks.example.com/login");
  expect(seen.headers.get("Content-Type")).toBe("application/json");
  expect(seen.headers.get("X-Coderso-Event")).toBe("auth.login.alert");
  expect(seen.headers.get("X-Nextless-Event")).toBe("auth.login.alert");

  const timestamp = seen.headers.get("X-Coderso-Timestamp");
  const signature = seen.headers.get("X-Coderso-Signature");
  if (!timestamp || !signature) throw new Error("missing signature headers");
  expect(signature).toBe(signWebhookPayload("s3cr3t-webhook-value", String(seen.body), timestamp));
});

test("skips webhook when no webhookUrl; skips email when no recipients", async () => {
  const calls: string[] = [];
  const result = await deliverLoginAlert(
    baseInput({ user: { id: "user-1", email: "", name: null } }),
    makeDeps({
      getSettings: async () =>
        ({
          loginAlerts: { ...settingsFixture, recipients: [], webhookUrl: null },
        }) as never,
      sendEmail: async () => {
        calls.push("email");
        return { ok: true, messageId: "msg-1", response: null };
      },
      fetchImpl: async () => {
        calls.push("webhook");
        return new Response("ok", { status: 200 });
      },
    })
  );

  expect(result).toEqual({ email: "skipped", webhook: "skipped" });
  expect(calls).toEqual([]);
});

test("captures sanitized deliveryError and never throws on channel failure", async () => {
  let recorded: string | null | undefined;
  const result = await deliverLoginAlert(
    baseInput(),
    makeDeps({
      sendEmail: async () => {
        throw new Error("SMTP auth failed with secret key sk-test-abcdef123456");
      },
      fetchImpl: async () => new Response("ok", { status: 200 }),
      recordError: async (message) => {
        recorded = message;
      },
    })
  );

  expect(result).toEqual({ email: "failed", webhook: "sent" });
  expect(recorded).toBe("SMTP auth failed with secret key [REDACTED]");
});

test("records HTTP status as deliveryError for non-ok webhook responses", async () => {
  let recorded: string | null | undefined;
  const result = await deliverLoginAlert(
    baseInput(),
    makeDeps({
      fetchImpl: async () => new Response("boom", { status: 500 }),
      recordError: async (message) => {
        recorded = message;
      },
    })
  );

  expect(result.email).toBe("sent");
  expect(result.webhook).toBe("failed");
  expect(recorded).toBe("HTTP 500");
});

test("webhook payload contains masked email, no secret, no raw UA", async () => {
  let capturedBody = "";
  await deliverLoginAlert(
    baseInput(),
    makeDeps({
      fetchImpl: async (_url, init) => {
        capturedBody = String(init?.body ?? "");
        return new Response("ok", { status: 200 });
      },
    })
  );

  const payload = JSON.parse(capturedBody) as Record<string, unknown>;
  expect(payload.event).toBe("auth.login.alert");
  expect(payload.userId).toBe("user-1");
  expect(payload.email).toContain("@example.com");
  expect(payload.email).not.toBe("owner@example.com");
  expect(String(payload.email)).not.toContain("owner");
  expect(payload.newDevice).toBe(true);
  expect(payload.newLocation).toBe(false);
  expect(capturedBody).not.toContain("s3cr3t-webhook-value");
  expect(capturedBody).not.toContain("Mozilla");
  expect(capturedBody).not.toContain("203.0.113.10");
});

test("webhook delivery passes redirect: error so redirects are never followed (TASK-567)", async () => {
  let capturedInit: RequestInit | undefined;
  const result = await deliverLoginAlert(
    baseInput(),
    makeDeps({
      fetchImpl: async (_url, init) => {
        capturedInit = init;
        return new Response("ok", { status: 200 });
      },
    })
  );

  expect(result.webhook).toBe("sent");
  expect(capturedInit?.redirect).toBe("error");
});

test("webhook delivery fails closed on a blocked URL without fetching (TASK-567)", async () => {
  let recorded: string | null | undefined;
  const fetchImpl = async () => new Response("ok", { status: 200 });
  const result = await deliverLoginAlert(
    baseInput(),
    makeDeps({
      getSettings: async () =>
        ({
          loginAlerts: {
            ...settingsFixture,
            webhookUrl: "https://169.254.169.254/hook",
          },
        }) as never,
      fetchImpl,
      recordError: async (message) => {
        recorded = message;
      },
    })
  );

  expect(result.webhook).toBe("failed");
  expect(recorded).toBe("login_alert_webhook_url_invalid");
  expect(recorded).not.toContain("169.254.169.254");
});

test("webhook delivery fails closed on mapped/NAT64 URLs (TASK-567)", async () => {
  let recorded: string | null | undefined;
  const result = await deliverLoginAlert(
    baseInput(),
    makeDeps({
      getSettings: async () =>
        ({
          loginAlerts: {
            ...settingsFixture,
            webhookUrl: "https://[::ffff:7f00:1]/hook",
          },
        }) as never,
      fetchImpl: async () => new Response("ok", { status: 200 }),
      recordError: async (message) => {
        recorded = message;
      },
    })
  );

  expect(result.webhook).toBe("failed");
  expect(recorded).toBe("login_alert_webhook_url_invalid");
});

test("recordError failure is swallowed and never throws", async () => {
  const result = await deliverLoginAlert(
    baseInput(),
    makeDeps({
      sendEmail: async () => {
        throw new Error("smtp boom");
      },
      recordError: async () => {
        throw new Error("status write failed");
      },
    })
  );

  expect(result.email).toBe("failed");
});

test("never throws when settings read fails", async () => {
  const result = await deliverLoginAlert(
    baseInput(),
    makeDeps({
      getSettings: async () => {
        throw new Error("db down");
      },
    })
  );

  expect(result).toEqual({ email: "skipped", webhook: "skipped" });
});
