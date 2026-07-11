import { expect, test } from "vitest";

import {
  assertFormSubmissionNonce,
  createFormSubmissionNonce,
} from "../../../core/services/forms/submissionNonce";
import {
  assertBookingSubmissionNonce,
  createBookingSubmissionNonce,
} from "../../../core/services/booking/bookingSubmissionNonce";

const FORM_ID = "form-123";
const MINUTE_MS = 60 * 1000;

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
  {
    label: "an appended segment",
    build: (nonce: string) => `${nonce}.appended`,
  },
  {
    label: "a leading-zero timestamp",
    build: (nonce: string) => {
      const { timestamp, signature } = readNonceParts(nonce);
      return `0${timestamp}.${signature}`;
    },
  },
  {
    label: "a noncanonical signed timestamp",
    build: (nonce: string) => {
      const { timestamp, signature } = readNonceParts(nonce);
      return `+${timestamp}.${signature}`;
    },
  },
  {
    label: "an unsafe timestamp",
    build: (nonce: string) => {
      const { signature } = readNonceParts(nonce);
      return `${Number.MAX_SAFE_INTEGER + 1}.${signature}`;
    },
  },
  {
    label: "a wrong-length signature",
    build: (nonce: string) => {
      const { timestamp, signature } = readNonceParts(nonce);
      return `${timestamp}.${signature.slice(0, -1)}`;
    },
  },
  {
    label: "a non-hex signature",
    build: (nonce: string) => {
      const { timestamp, signature } = readNonceParts(nonce);
      return `${timestamp}.g${signature.slice(1)}`;
    },
  },
  {
    label: "an uppercase signature",
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

const withEnv = (values: Record<string, string | undefined>, fn: () => void) => {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    const next = values[key];
    if (next === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = next;
    }
  }

  try {
    fn();
  } finally {
    for (const key of Object.keys(values)) {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

test("createFormSubmissionNonce requires secret", () => {
  withEnv({ FORM_SUBMIT_NONCE_SECRET: undefined }, () => {
    expect(() => createFormSubmissionNonce(FORM_ID)).toThrow(
      "Form submission nonce secret is missing"
    );
  });
});

test("Forms and Booking verifiers accept their valid canonical nonces", () => {
  withEnv({ FORM_SUBMIT_NONCE_SECRET: "test-secret" }, () => {
    const now = 1_700_000_000_000;
    const formNonce = createFormSubmissionNonce(FORM_ID, now);
    const bookingNonce = createBookingSubmissionNonce(now);
    expect(() => assertFormSubmissionNonce(FORM_ID, formNonce, now + 1_000)).not.toThrow();
    expect(() => assertBookingSubmissionNonce(bookingNonce, now + 1_000)).not.toThrow();
  });
});

test.each(malformedNonceCases)(
  "Forms and Booking verifiers reject $label as form_nonce_invalid/400",
  ({ build }) => {
    withEnv({ FORM_SUBMIT_NONCE_SECRET: "test-secret" }, () => {
      const now = 1_700_000_000_000;
      const formError = captureError(() =>
        assertFormSubmissionNonce(FORM_ID, build(createFormSubmissionNonce(FORM_ID, now)), now)
      );
      const bookingError = captureError(() =>
        assertBookingSubmissionNonce(build(createBookingSubmissionNonce(now)), now)
      );

      for (const error of [formError, bookingError]) {
        expect(error).toMatchObject({
          code: "form_nonce_invalid",
          message: "Form submission nonce is invalid",
          status: 400,
        });
      }
    });
  }
);

test("assertFormSubmissionNonce rejects expired nonce", () => {
  withEnv({ FORM_SUBMIT_NONCE_SECRET: "test-secret", FORM_SUBMIT_NONCE_TTL_MINUTES: "1" }, () => {
    const now = 1_700_000_000_000;
    const nonce = createFormSubmissionNonce(FORM_ID, now);
    expect(
      captureError(() => assertFormSubmissionNonce(FORM_ID, nonce, now + 2 * 60 * 1000))
    ).toMatchObject({
      code: "form_nonce_expired",
      message: "Form submission nonce expired",
      status: 403,
    });
  });
});

test("Forms and Booking submission nonces accept the maximum arithmetic-safe TTL", () => {
  const maxTtlMinutes = String(Number.MAX_SAFE_INTEGER / MINUTE_MS);
  withEnv(
    {
      FORM_SUBMIT_NONCE_SECRET: "test-secret",
      FORM_SUBMIT_NONCE_TTL_MINUTES: maxTtlMinutes,
    },
    () => {
      const formNonce = createFormSubmissionNonce(FORM_ID, 0);
      const bookingNonce = createBookingSubmissionNonce(0);

      expect(() =>
        assertFormSubmissionNonce(FORM_ID, formNonce, Number.MAX_SAFE_INTEGER)
      ).not.toThrow();
      expect(() =>
        assertBookingSubmissionNonce(bookingNonce, Number.MAX_SAFE_INTEGER)
      ).not.toThrow();
    }
  );
});

test.each([
  {
    label: "finite millisecond value above the safe ceiling",
    ttlMinutes: String((Number.MAX_SAFE_INTEGER + 1) / MINUTE_MS),
    conversionIsFinite: true,
  },
  {
    label: "non-finite millisecond conversion",
    ttlMinutes: "1e308",
    conversionIsFinite: false,
  },
])(
  "Forms and Booking submission nonces fall back for $label",
  ({ ttlMinutes, conversionIsFinite }) => {
    const convertedTtlMs = Number(ttlMinutes) * MINUTE_MS;
    expect(Number.isFinite(convertedTtlMs)).toBe(conversionIsFinite);
    if (conversionIsFinite) expect(convertedTtlMs).toBeGreaterThan(Number.MAX_SAFE_INTEGER);

    withEnv(
      {
        FORM_SUBMIT_NONCE_SECRET: "test-secret",
        FORM_SUBMIT_NONCE_TTL_MINUTES: ttlMinutes,
      },
      () => {
        const now = 1_700_000_000_000;
        const formNonce = createFormSubmissionNonce(FORM_ID, now);
        const bookingNonce = createBookingSubmissionNonce(now);
        const afterDefaultTtl = now + 10 * MINUTE_MS + 1;

        for (const error of [
          captureError(() => assertFormSubmissionNonce(FORM_ID, formNonce, afterDefaultTtl)),
          captureError(() => assertBookingSubmissionNonce(bookingNonce, afterDefaultTtl)),
        ]) {
          expect(error).toMatchObject({
            code: "form_nonce_expired",
            message: "Form submission nonce expired",
            status: 403,
          });
        }
      }
    );
  }
);

test("assertFormSubmissionNonce rejects future nonce", () => {
  withEnv({ FORM_SUBMIT_NONCE_SECRET: "test-secret" }, () => {
    const now = 1_700_000_000_000;
    const nonce = createFormSubmissionNonce(FORM_ID, now + 10 * 60 * 1000);
    expect(captureError(() => assertFormSubmissionNonce(FORM_ID, nonce, now))).toMatchObject({
      code: "form_nonce_invalid",
      message: "Form submission nonce is invalid",
      status: 400,
    });
  });
});

test("assertFormSubmissionNonce rejects invalid signature", () => {
  withEnv({ FORM_SUBMIT_NONCE_SECRET: "test-secret" }, () => {
    const now = 1_700_000_000_000;
    const nonce = createFormSubmissionNonce(FORM_ID, now);
    const tampered = tamperNonce(nonce);
    expect(captureError(() => assertFormSubmissionNonce(FORM_ID, tampered, now))).toMatchObject({
      code: "form_nonce_invalid",
      message: "Form submission nonce is invalid",
      status: 403,
    });
  });
});

test("assertFormSubmissionNonce preserves form binding and invalid-signature status", () => {
  withEnv({ FORM_SUBMIT_NONCE_SECRET: "test-secret" }, () => {
    const now = 1_700_000_000_000;
    const nonce = createFormSubmissionNonce(FORM_ID, now);
    expect(captureError(() => assertFormSubmissionNonce("other-form", nonce, now))).toMatchObject({
      code: "form_nonce_invalid",
      status: 403,
    });
  });
});
