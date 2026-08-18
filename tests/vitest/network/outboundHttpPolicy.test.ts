// TASK-567: shared outbound HTTP egress policy matrix (Bun-free Vitest lane).
// Covers scheme/localhost seam, per-provider host allowlists, the full custom
// webhook blocklist (literal private/mapped/NAT64/6to4/Teredo IPv4+IPv6),
// delivery-time DNS re-verification (rebinding), redirect rejection, and the
// Sentry DSN gate.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  EgressPolicyError,
  fetchWithEgressPolicy,
  setOutboundDnsResolver,
  validateOutboundUrl,
  validateSentryDsn,
} from "../../../core/services/network/outboundHttpPolicy";

const DEV_ENV = { NODE_ENV: "test" } as NodeJS.ProcessEnv;
const PROD_ENV = { NODE_ENV: "production" } as NodeJS.ProcessEnv;

const expectOk = (result: ReturnType<typeof validateOutboundUrl>, url: string) => {
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.url.toString()).toBe(url);
};

const expectRejected = (result: ReturnType<typeof validateOutboundUrl>, code: string) => {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe(code);
};

describe("scheme policy", () => {
  test("requires https for every provider", () => {
    for (const provider of [
      "slack",
      "zapier",
      "login-alert",
      "webhook",
      "openai",
      "openrouter",
      "sentry",
    ] as const) {
      expectRejected(
        validateOutboundUrl("http://example.com/hook", { provider, env: DEV_ENV }),
        "egress_invalid_scheme"
      );
      expectRejected(
        validateOutboundUrl("ftp://example.com/hook", { provider, env: DEV_ENV }),
        "egress_invalid_scheme"
      );
    }
  });

  test("rejects unparseable URLs", () => {
    expectRejected(validateOutboundUrl("not-a-url", { provider: "webhook" }), "egress_invalid_url");
    expectRejected(validateOutboundUrl("", { provider: "webhook" }), "egress_invalid_url");
  });

  test("allows localhost http only outside production (dev seam)", () => {
    expectOk(
      validateOutboundUrl("http://localhost:3000/hook", { provider: "webhook", env: DEV_ENV }),
      "http://localhost:3000/hook"
    );
    expectOk(
      validateOutboundUrl("http://127.0.0.1:3000/hook", { provider: "login-alert", env: DEV_ENV }),
      "http://127.0.0.1:3000/hook"
    );
    // Production stays HTTPS-only, even for loopback.
    expectRejected(
      validateOutboundUrl("http://localhost:3000/hook", { provider: "webhook", env: PROD_ENV }),
      "egress_invalid_scheme"
    );
    expectRejected(
      validateOutboundUrl("http://127.0.0.1:3000/hook", { provider: "login-alert", env: PROD_ENV }),
      "egress_invalid_scheme"
    );
    // A non-loopback http target never gets the seam.
    expectRejected(
      validateOutboundUrl("http://example.com/hook", { provider: "webhook", env: DEV_ENV }),
      "egress_invalid_scheme"
    );
  });

  test("https loopback is blocked for blocklist providers even outside production", () => {
    expectRejected(
      validateOutboundUrl("https://localhost/hook", { provider: "webhook", env: DEV_ENV }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://127.0.0.1/hook", { provider: "login-alert", env: DEV_ENV }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://[::1]/hook", { provider: "webhook", env: DEV_ENV }),
      "egress_host_forbidden"
    );
  });
});

describe("per-provider host allowlists", () => {
  test("slack accepts only hooks.slack.com", () => {
    expectOk(
      validateOutboundUrl("https://hooks.slack.com/services/T000/B000/XXXX", { provider: "slack" }),
      "https://hooks.slack.com/services/T000/B000/XXXX"
    );
    expectRejected(
      validateOutboundUrl("https://evil.example.com/hook", { provider: "slack" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://hooks.slack.com.evil.example.com/hook", { provider: "slack" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://slack.com/hook", { provider: "slack" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("http://localhost:3000/hook", { provider: "slack", env: DEV_ENV }),
      "egress_host_forbidden"
    );
  });

  test("zapier accepts only hooks.zapier.com", () => {
    expectOk(
      validateOutboundUrl("https://hooks.zapier.com/hooks/catch/1/2/", { provider: "zapier" }),
      "https://hooks.zapier.com/hooks/catch/1/2/"
    );
    expectRejected(
      validateOutboundUrl("https://zapier.com/hook", { provider: "zapier" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://hooks.zapier.attacker.test/hook", { provider: "zapier" }),
      "egress_host_forbidden"
    );
  });

  test("openai accepts only api.openai.com", () => {
    expectOk(
      validateOutboundUrl("https://api.openai.com/v1/chat/completions", { provider: "openai" }),
      "https://api.openai.com/v1/chat/completions"
    );
    expectRejected(
      validateOutboundUrl("https://openai.com/v1/x", { provider: "openai" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://evil.openai.com/v1/x", { provider: "openai" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://custom-endpoint.example.com/v1", { provider: "openai" }),
      "egress_host_forbidden"
    );
  });

  test("openrouter accepts only openrouter.ai", () => {
    expectOk(
      validateOutboundUrl("https://openrouter.ai/api/v1/chat/completions", {
        provider: "openrouter",
      }),
      "https://openrouter.ai/api/v1/chat/completions"
    );
    expectRejected(
      validateOutboundUrl("https://openrouter.ai.evil.test/api", { provider: "openrouter" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://example.com/api", { provider: "openrouter" }),
      "egress_host_forbidden"
    );
  });
});

describe("custom webhook blocklist (provider webhook)", () => {
  const blockedIpv4 = [
    "https://0.0.0.0/hook",
    "https://10.0.0.5/hook",
    "https://100.64.0.1/hook",
    "https://100.127.255.254/hook",
    "https://127.0.0.1/hook",
    "https://169.254.169.254/hook",
    "https://172.16.0.1/hook",
    "https://172.31.255.254/hook",
    "https://192.168.1.10/hook",
    "https://192.0.0.1/hook",
    "https://192.0.2.1/hook",
    "https://192.88.99.1/hook",
    "https://198.18.0.1/hook",
    "https://198.19.255.254/hook",
    "https://198.51.100.1/hook",
    "https://203.0.113.1/hook",
    "https://224.0.0.1/hook",
    "https://239.255.255.254/hook",
    "https://255.255.255.255/hook",
  ];
  for (const url of blockedIpv4) {
    test(`blocks literal private/reserved IPv4 ${url}`, () => {
      expectRejected(validateOutboundUrl(url, { provider: "webhook" }), "egress_host_forbidden");
    });
  }

  test("accepts public IPv4 literals", () => {
    expectOk(
      validateOutboundUrl("https://8.8.8.8/hook", { provider: "webhook" }),
      "https://8.8.8.8/hook"
    );
    expectOk(
      validateOutboundUrl("https://93.184.216.34/hook", { provider: "webhook" }),
      "https://93.184.216.34/hook"
    );
  });

  const blockedIpv6 = [
    "https://[::1]/hook",
    "https://[::]/hook",
    "https://[fd00::1]/hook",
    "https://[fc00::1]/hook",
    "https://[fe80::1]/hook",
    "https://[febf::1]/hook",
    "https://[ff02::1]/hook",
    "https://[2001:db8::1]/hook",
    "https://[2001:10::1]/hook",
  ];
  for (const url of blockedIpv6) {
    test(`blocks literal private/reserved IPv6 ${url}`, () => {
      expectRejected(validateOutboundUrl(url, { provider: "webhook" }), "egress_host_forbidden");
    });
  }

  test("accepts public IPv6 literals", () => {
    expectOk(
      validateOutboundUrl("https://[2606:4700:4700::1111]/hook", { provider: "webhook" }),
      "https://[2606:4700:4700::1111]/hook"
    );
    expectOk(
      validateOutboundUrl("https://[2001:4860:4860::8888]/hook", { provider: "webhook" }),
      "https://[2001:4860:4860::8888]/hook"
    );
  });

  test("blocks IPv4-mapped IPv6 spellings of private addresses", () => {
    // Literal dotted and compressed hex spellings must both be caught.
    expectRejected(
      validateOutboundUrl("https://[::ffff:127.0.0.1]/hook", { provider: "webhook" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://[::ffff:7f00:1]/hook", { provider: "webhook" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://[::ffff:7f00:0001]/hook", { provider: "webhook" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://[::ffff:10.0.0.5]/hook", { provider: "webhook" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://[::ffff:0a00:0005]/hook", { provider: "webhook" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://[::ffff:169.254.169.254]/hook", { provider: "webhook" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://[::ffff:192.168.1.10]/hook", { provider: "webhook" }),
      "egress_host_forbidden"
    );
  });

  test("allows IPv4-mapped IPv6 spellings of public addresses", () => {
    expectOk(
      validateOutboundUrl("https://[::ffff:5db8:d822]/hook", { provider: "webhook" }),
      "https://[::ffff:5db8:d822]/hook"
    );
    // URL canonicalization rewrites the dotted tail to hex (::ffff:808:808).
    expectOk(
      validateOutboundUrl("https://[::ffff:8.8.8.8]/hook", { provider: "webhook" }),
      "https://[::ffff:808:808]/hook"
    );
  });

  test("blocks NAT64 prefixes", () => {
    expectRejected(
      validateOutboundUrl("https://[64:ff9b::7f00:1]/hook", { provider: "webhook" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://[64:ff9b::a00:5]/hook", { provider: "webhook" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://[64:ff9b::127.0.0.1]/hook", { provider: "webhook" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://[64:ff9b:1::1]/hook", { provider: "webhook" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://[64:ff9b:1::c0a8:010a]/hook", { provider: "webhook" }),
      "egress_host_forbidden"
    );
  });

  test("blocks 6to4 and Teredo encodings of blocked IPv4", () => {
    expectRejected(
      validateOutboundUrl("https://[2002:7f00:1::]/hook", { provider: "webhook" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://[2002:0a00:0005::]/hook", { provider: "webhook" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://[2001:0:ffff:ffff:ffff:ffff:ffff:ffff]/hook", {
        provider: "webhook",
      }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://[2001:0:ffff:ffff:ffff:ffff:ffff:fffe]/hook", {
        provider: "webhook",
      }),
      "egress_host_forbidden"
    );
  });

  test("login-alert provider enforces the same blocklist", () => {
    expectRejected(
      validateOutboundUrl("https://[::ffff:7f00:1]/hook", { provider: "login-alert" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://[64:ff9b::7f00:1]/hook", { provider: "login-alert" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://10.0.0.5/hook", { provider: "login-alert" }),
      "egress_host_forbidden"
    );
    expectRejected(
      validateOutboundUrl("https://169.254.169.254/hook", { provider: "login-alert" }),
      "egress_host_forbidden"
    );
    expectOk(
      validateOutboundUrl("https://hooks.example.com/login", { provider: "login-alert" }),
      "https://hooks.example.com/login"
    );
  });

  test("rejects credentials embedded in the URL", () => {
    // Username/password are blocked by host classification consumers (e.g.
    // securitySettings) and never reach the transport; the policy itself
    // leaves the URL intact so callers keep their stricter credential gate.
    expectOk(
      validateOutboundUrl("https://user:pass@example.com/hook", { provider: "webhook" }),
      "https://user:pass@example.com/hook"
    );
  });
});

describe("delivery-time DNS re-verification (rebinding)", () => {
  beforeEach(() => {
    setOutboundDnsResolver(async () => []);
  });
  afterEach(() => {
    setOutboundDnsResolver(null);
  });

  test("rejects a hostname that resolves to a private address", async () => {
    setOutboundDnsResolver(async (hostname) => {
      if (hostname === "rebind.test") return ["10.0.0.5", "93.184.216.34"];
      return [];
    });
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => new Response("ok", { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchWithEgressPolicy("https://rebind.test/hook", {}, { provider: "webhook" })
    ).rejects.toEqual(new EgressPolicyError("egress_host_forbidden"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("rejects a hostname that resolves to an IPv4-mapped private address", async () => {
    setOutboundDnsResolver(async () => ["::ffff:7f00:1"]);
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => new Response("ok", { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchWithEgressPolicy("https://rebind.test/hook", {}, { provider: "webhook" })
    ).rejects.toEqual(new EgressPolicyError("egress_host_forbidden"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("proceeds when the hostname resolves publicly", async () => {
    setOutboundDnsResolver(async () => ["93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"]);
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => new Response("ok", { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithEgressPolicy(
      "https://public.test/hook",
      { method: "POST" },
      { provider: "webhook" }
    );
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST", redirect: "error" });
  });

  test("does not resolve allowlisted provider hosts", async () => {
    const resolver = vi.fn(async () => ["10.0.0.5"]);
    setOutboundDnsResolver(resolver);
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => new Response("ok", { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchWithEgressPolicy(
      "https://hooks.slack.com/services/T/B/X",
      {},
      { provider: "slack" }
    );
    expect(resolver).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("a resolver failure fails closed instead of silently skipping the re-check", async () => {
    // TASK-567 LOW 3: the default resolver retries once and throws on
    // persistent failure, so the re-check is never silently skipped. At the
    // policy boundary this surfaces as the resolver's error before any fetch.
    setOutboundDnsResolver(async () => {
      throw new Error("dns unavailable");
    });
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => new Response("ok", { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchWithEgressPolicy("https://rebind.test/hook", {}, { provider: "webhook" })
    ).rejects.toThrow("dns unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("redirect policy", () => {
  beforeEach(() => {
    setOutboundDnsResolver(async () => []);
  });
  afterEach(() => {
    setOutboundDnsResolver(null);
  });

  test("maps a redirect rejection to the machine-readable error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError('redirect mode is "error"');
      })
    );

    await expect(
      fetchWithEgressPolicy("https://public.test/hook", {}, { provider: "webhook" })
    ).rejects.toEqual(new EgressPolicyError("egress_redirect_forbidden"));
  });

  test("maps a Node-style wrapped redirect rejection to the machine-readable error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const cause = new TypeError('redirect mode is "error"');
        throw new TypeError("fetch failed", { cause });
      })
    );

    await expect(
      fetchWithEgressPolicy("https://public.test/hook", {}, { provider: "webhook" })
    ).rejects.toEqual(new EgressPolicyError("egress_redirect_forbidden"));
  });

  test("forces redirect: error even when the caller asks for follow", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => new Response("ok", { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchWithEgressPolicy(
      "https://public.test/hook",
      { redirect: "follow" },
      { provider: "webhook" }
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: "error" });
  });

  test("rethrows non-redirect network errors unchanged", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network unreachable");
      })
    );

    await expect(
      fetchWithEgressPolicy("https://public.test/hook", {}, { provider: "webhook" })
    ).rejects.toThrow("network unreachable");
  });
});

describe("sentry DSN gate", () => {
  test("accepts Sentry-owned DSNs", () => {
    expect(validateSentryDsn("https://public@o0.ingest.sentry.io/0")).toEqual({ ok: true });
    expect(validateSentryDsn("https://public@sentry.io/12345")).toEqual({ ok: true });
    expect(validateSentryDsn("https://public@subdomain.ingest.sentry.io/0")).toEqual({ ok: true });
  });

  test("rejects non-Sentry hosts fail-closed", () => {
    expect(validateSentryDsn("https://public@example.com/0")).toEqual({
      ok: false,
      code: "sentry_dsn_invalid",
    });
    expect(validateSentryDsn("http://public@example.com/0")).toEqual({
      ok: false,
      code: "sentry_dsn_invalid",
    });
  });

  test("requires https (TASK-567 LOW 4: http DSNs rejected even on Sentry-owned hosts)", () => {
    expect(validateSentryDsn("http://public@o0.ingest.sentry.io/0")).toEqual({
      ok: false,
      code: "sentry_dsn_invalid",
    });
    expect(validateSentryDsn("http://public@sentry.io/12345")).toEqual({
      ok: false,
      code: "sentry_dsn_invalid",
    });
  });

  test("rejects malformed DSNs", () => {
    expect(validateSentryDsn("not-a-url")).toEqual({ ok: false, code: "sentry_dsn_invalid" });
    expect(validateSentryDsn("")).toEqual({ ok: false, code: "sentry_dsn_invalid" });
    expect(validateSentryDsn("   ")).toEqual({ ok: false, code: "sentry_dsn_invalid" });
    // No public key segment.
    expect(validateSentryDsn("https://o0.ingest.sentry.io/0")).toEqual({
      ok: false,
      code: "sentry_dsn_invalid",
    });
    // No project path.
    expect(validateSentryDsn("https://public@o0.ingest.sentry.io/")).toEqual({
      ok: false,
      code: "sentry_dsn_invalid",
    });
  });

  test("validateOutboundUrl sentry provider enforces the Sentry host allowlist", () => {
    expectOk(
      validateOutboundUrl("https://o0.ingest.sentry.io/0", { provider: "sentry" }),
      "https://o0.ingest.sentry.io/0"
    );
    expectRejected(
      validateOutboundUrl("https://public@example.com/0", { provider: "sentry" }),
      "egress_host_forbidden"
    );
  });
});
