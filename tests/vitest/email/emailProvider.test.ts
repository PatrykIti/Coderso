import { describe, expect, test, vi } from "vitest";

import { createResendTransport } from "../../../core/services/email/emailProvider";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("createResendTransport", () => {
  test("uses mock transport in test mode unless fetch is injected", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("live fetch"));
    process.env.NODE_ENV = "test";

    try {
      const transport = createResendTransport({ apiKey: "re_testsecret123456" });
      await expect(
        transport.sendMail({
          from: "Coderso <hello@example.com>",
          to: "dev@example.com",
          subject: "Hello",
        })
      ).resolves.toEqual({ messageId: "mock", response: "mock" });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
      fetchSpy.mockRestore();
    }
  });

  test("sends mail to the fixed Resend endpoint with bounded headers and body", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return jsonResponse({ id: "email-1" });
    });

    const transport = createResendTransport({
      apiKey: " re_testsecret123456 ",
      fetchImpl,
    });
    const result = await transport.sendMail({
      from: "Coderso <hello@example.com>",
      to: "dev@example.com",
      subject: "Hello",
      text: "Plain",
      html: "<p>HTML</p>",
      idempotencyKey: `key-${"x".repeat(400)}`,
    });

    expect(result).toEqual({ messageId: "email-1", response: "resend:200" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("https://api.resend.com/emails");
    expect(calls[0]?.init?.method).toBe("POST");

    const headers = new Headers(calls[0]?.init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer re_testsecret123456");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("User-Agent")).toBe("Coderso Email/1.0");
    expect(headers.get("Idempotency-Key")?.length).toBe(256);
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      from: "Coderso <hello@example.com>",
      to: ["dev@example.com"],
      subject: "Hello",
      text: "Plain",
      html: "<p>HTML</p>",
    });
  });

  test("sanitizes Resend error bodies and network errors", async () => {
    const failingFetch = vi.fn(async () =>
      jsonResponse(
        {
          error: {
            message: "Authorization Bearer re_secretvalue123456 failed",
          },
        },
        403
      )
    );
    const transport = createResendTransport({
      apiKey: "re_secretvalue123456",
      fetchImpl: failingFetch,
    });

    await expect(
      transport.sendMail({
        from: "Coderso <hello@example.com>",
        to: "dev@example.com",
        subject: "Hello",
      })
    ).rejects.toThrow("Authorization Bearer [REDACTED] failed");

    const networkTransport = createResendTransport({
      apiKey: "re_secretvalue123456",
      fetchImpl: vi.fn(async () => {
        throw new Error("Network leaked re_secretvalue123456");
      }),
    });

    await expect(
      networkTransport.sendMail({
        from: "Coderso <hello@example.com>",
        to: "dev@example.com",
        subject: "Hello",
      })
    ).rejects.toThrow("Network leaked [REDACTED]");
  });

  test("rejects blank API keys", () => {
    expect(() => createResendTransport({ apiKey: "   " })).toThrow("email_provider_invalid");
  });
});
