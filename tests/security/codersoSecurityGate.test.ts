import { expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";

import { db } from "../../core/db/client";
import { settings } from "../../core/db/schema";
import { redactAuditText } from "../../core/services/audit/auditRedaction";

import {
  evaluateSubmissionAccess,
  submissionAccessDefaults,
} from "../../core/services/forms/submissionAccess";
import {
  evaluateBookingAccess,
  bookingAccessDefaults,
} from "../../core/services/booking/bookingAccess";
import {
  assertFormSubmissionNonce,
  createFormSubmissionNonce,
} from "../../core/services/forms/submissionNonce";
import {
  assertBookingSubmissionNonce,
  createBookingSubmissionNonce,
} from "../../core/services/booking/bookingSubmissionNonce";
import {
  getSecuritySettingsPublic,
  resetSecuritySettingsCache,
  SECURITY_SETTINGS_DEFAULTS,
  setSecuritySettings,
} from "../../core/services/settings/securitySettings";
import { resolveRateLimitBucket } from "../../core/server/httpServer";

const NONCE_SECRET = "coderso_release_gate_nonce_secret_32";
const NONCE_TTL_MINUTES = "10";

const tamperNonce = (nonce: string) => {
  const [timestamp, signature] = nonce.split(".");
  if (!timestamp || !signature) return `${nonce}-tampered`;
  const first = signature[0] === "a" ? "b" : "a";
  return `${timestamp}.${first}${signature.slice(1)}`;
};

const readNonceParts = (nonce: string) => {
  const [timestamp, signature] = nonce.split(".");
  if (!timestamp || !signature) throw new Error("invalid_nonce_test_fixture");
  return { timestamp, signature };
};

const malformedNonceCases = [
  { label: "appended segment", build: (nonce: string) => `${nonce}.appended` },
  {
    label: "leading-zero timestamp",
    build: (nonce: string) => {
      const { timestamp, signature } = readNonceParts(nonce);
      return `0${timestamp}.${signature}`;
    },
  },
  {
    label: "noncanonical timestamp",
    build: (nonce: string) => {
      const { timestamp, signature } = readNonceParts(nonce);
      return `+${timestamp}.${signature}`;
    },
  },
  {
    label: "unsafe timestamp",
    build: (nonce: string) => {
      const { signature } = readNonceParts(nonce);
      return `${Number.MAX_SAFE_INTEGER + 1}.${signature}`;
    },
  },
  {
    label: "wrong-length signature",
    build: (nonce: string) => {
      const { timestamp, signature } = readNonceParts(nonce);
      return `${timestamp}.${signature.slice(0, -1)}`;
    },
  },
  {
    label: "non-hex signature",
    build: (nonce: string) => {
      const { timestamp, signature } = readNonceParts(nonce);
      return `${timestamp}.g${signature.slice(1)}`;
    },
  },
  {
    label: "uppercase signature",
    build: (nonce: string) => {
      const { timestamp, signature } = readNonceParts(nonce);
      return `${timestamp}.A${signature.slice(1)}`;
    },
  },
] as const;

const captureError = (fn: () => void): unknown => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected_nonce_error");
};

const withNonceSecret = (fn: () => void) => {
  const previous = process.env.FORM_SUBMIT_NONCE_SECRET;
  const previousTtl = process.env.FORM_SUBMIT_NONCE_TTL_MINUTES;
  process.env.FORM_SUBMIT_NONCE_SECRET = NONCE_SECRET;
  process.env.FORM_SUBMIT_NONCE_TTL_MINUTES = NONCE_TTL_MINUTES;
  try {
    fn();
  } finally {
    if (previous === undefined) {
      delete process.env.FORM_SUBMIT_NONCE_SECRET;
    } else {
      process.env.FORM_SUBMIT_NONCE_SECRET = previous;
    }

    if (previousTtl === undefined) {
      delete process.env.FORM_SUBMIT_NONCE_TTL_MINUTES;
    } else {
      process.env.FORM_SUBMIT_NONCE_TTL_MINUTES = previousTtl;
    }
  }
};

test("security gate: public submissions require captcha for forms and booking", () => {
  const forms = evaluateSubmissionAccess({
    mode: "public",
    isAuthenticated: false,
  });
  const booking = evaluateBookingAccess({
    mode: "public",
    isAuthenticated: false,
  });

  expect(forms).toMatchObject({
    allow: true,
    mode: "public",
    requireFormNonce: true,
    requireCaptcha: true,
    rateBucket: "public_write",
  });
  expect(booking.allow).toBe(true);
  expect(booking.requireCaptcha).toBe(true);
});

test("security gate: a public cookie session still requires the form nonce", () => {
  const forms = evaluateSubmissionAccess({
    mode: "public",
    isAuthenticated: true,
  });
  expect(forms).toMatchObject({
    allow: true,
    mode: "public",
    principal: "session",
    requireFormNonce: true,
    requireCaptcha: false,
    requireSessionCsrf: false,
    rateBucket: "public_write",
  });
});

test("security gate: internal submissions require session or scoped API key", () => {
  const formWithoutAuth = evaluateSubmissionAccess({
    mode: "internal",
    isAuthenticated: false,
  });
  const bookingWithoutAuth = evaluateBookingAccess({
    mode: "internal",
    isAuthenticated: false,
  });

  expect(formWithoutAuth.allow).toBe(false);
  if (formWithoutAuth.allow) throw new Error("expected internal form rejection");
  expect(formWithoutAuth.reason).toBe("auth_required");
  expect(bookingWithoutAuth.allow).toBe(false);
  expect(bookingWithoutAuth.reason).toBe("auth_required");

  const formWithApiKey = evaluateSubmissionAccess({
    mode: "internal",
    isAuthenticated: false,
    apiKeyScopes: [submissionAccessDefaults.requiredApiKeyScope],
  });
  const bookingWithApiKey = evaluateBookingAccess({
    mode: "internal",
    isAuthenticated: false,
    apiKeyScopes: [bookingAccessDefaults.requiredApiKeyScope],
  });

  expect(formWithApiKey).toMatchObject({
    allow: true,
    mode: "internal",
    principal: "apiKey",
    requireCaptcha: false,
    rateBucket: "admin_write",
  });
  expect(bookingWithApiKey.allow).toBe(true);
  expect(bookingWithApiKey.requireCaptcha).toBe(false);
});

test("security gate: admin dashboard endpoints use admin rate-limit buckets", () => {
  expect(resolveRateLimitBucket("GET", "/dashboard/layout")).toBe("admin_read");
  expect(resolveRateLimitBucket("GET", "/dashboard/widget-data")).toBe("admin_read");
  expect(resolveRateLimitBucket("PUT", "/dashboard/layout")).toBe("admin_write");
  expect(resolveRateLimitBucket("POST", "/dashboard/layout/reset")).toBe("admin_write");
  expect(resolveRateLimitBucket("POST", "/dashboard/widget-data")).toBe("admin_write");
});

test("security gate: form and booking nonce contracts reject missing, tampered, and malformed tokens", () => {
  withNonceSecret(() => {
    const now = Date.now();

    expect(() => assertFormSubmissionNonce("contact-form", null, now)).toThrow(
      "Form submission nonce is required"
    );

    const validFormNonce = createFormSubmissionNonce("contact-form", now);
    expect(() =>
      assertFormSubmissionNonce("contact-form", validFormNonce, now + 1_000)
    ).not.toThrow();

    const tamperedFormNonce = tamperNonce(validFormNonce);
    expect(() => assertFormSubmissionNonce("contact-form", tamperedFormNonce, now + 1_000)).toThrow(
      "Form submission nonce is invalid"
    );

    expect(() => assertBookingSubmissionNonce(undefined, now)).toThrow(
      "Form submission nonce is required"
    );

    const validBookingNonce = createBookingSubmissionNonce(now);
    expect(() => assertBookingSubmissionNonce(validBookingNonce, now + 1_000)).not.toThrow();

    const tamperedBookingNonce = tamperNonce(validBookingNonce);
    expect(() => assertBookingSubmissionNonce(tamperedBookingNonce, now + 1_000)).toThrow(
      "Form submission nonce is invalid"
    );

    for (const { build } of malformedNonceCases) {
      const formError = captureError(() =>
        assertFormSubmissionNonce("contact-form", build(validFormNonce), now + 1_000)
      );
      const bookingError = captureError(() =>
        assertBookingSubmissionNonce(build(validBookingNonce), now + 1_000)
      );
      for (const error of [formError, bookingError]) {
        expect(error).toMatchObject({
          code: "form_nonce_invalid",
          status: 400,
        });
      }
    }
  });
});

test("security gate: default rate-limit and bot-protection baselines are hardened", () => {
  const rate = SECURITY_SETTINGS_DEFAULTS.rateLimit.buckets;

  expect(rate.public_write.maxRequests).toBeLessThan(rate.public_read.maxRequests);
  expect(rate.admin_write.maxRequests).toBeLessThan(rate.admin_read.maxRequests);

  const bot = SECURITY_SETTINGS_DEFAULTS.botProtection;
  expect(bot.provider).toBe("recaptcha_v3");
  expect(bot.thresholds.publicWrite).toBeGreaterThan(0);
  expect(bot.thresholds.publicWrite).toBeLessThanOrEqual(1);
});

// --- TASK-492 login alert secret/PII leak guard -----------------------------
// The public projection round-trip is db-backed (setSecuritySettings /
// getSecuritySettingsPublic), so self-gate it with the repo testIfDb pattern
// mirroring tests/unit/security/securitySettings.test.ts. The canonical
// encrypted-at-rest round-trip is owned by TASK-492-01-L01 in that same file;
// this gate keeps a focused cleartext leak guard instead of duplicating it.

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const SETTINGS_KEY = "security.settings";

const cleanupSecuritySettingsRow = async () => {
  if (!hasDb) return;
  await db.delete(settings).where(eq(settings.key, SETTINGS_KEY));
  resetSecuritySettingsCache();
};

testIfDb("login alert webhookSecret is {configured} only in the public projection", async () => {
  try {
    await setSecuritySettings({
      loginAlerts: {
        webhookUrl: "https://example.com/hook",
        webhookSecret: "s3cr3t-value",
      },
    });

    const pub = await getSecuritySettingsPublic();
    expect(pub.loginAlerts.webhookSecret).toEqual({ configured: true });
  } finally {
    await cleanupSecuritySettingsRow();
  }
});

testIfDb(
  "login alert webhookSecret cleartext is absent from the public projection JSON",
  async () => {
    try {
      await setSecuritySettings({
        loginAlerts: {
          webhookUrl: "https://example.com/hook",
          webhookSecret: "s3cr3t-value",
        },
      });

      const pub = await getSecuritySettingsPublic();
      expect(JSON.stringify(pub)).not.toContain("s3cr3t-value");
    } finally {
      await cleanupSecuritySettingsRow();
    }
  }
);

test("login alert deliveryError defaults null and stays sanitized of secret-shaped substrings", () => {
  expect(SECURITY_SETTINGS_DEFAULTS.loginAlerts.deliveryError).toBeNull();

  // Mirrors the delivery service's sanitization path (redactAuditText + clamp):
  // a secret-shaped token inside a delivery failure must never survive redaction.
  const sanitized = redactAuditText("webhook http 502 body: token=whsec_abc123 failed");
  expect(sanitized).not.toContain("whsec_abc123");
});
