/**
 * Shared outbound HTTP egress policy (TASK-567, SSRF hardening).
 *
 * Single destination/SSRF policy for every privileged outbound surface:
 * Slack/Zapier integration deliveries, login-alert webhooks, custom webhooks,
 * form-action webhooks, assistant LLM providers, and the Sentry DSN. The
 * module is Bun-free AND browser-bundle-safe at import time (the only Node
 * builtin, `node:dns/promises`, is loaded lazily at delivery time), and
 * carries no DB/runtime/server coupling, so the full matrix stays testable
 * under Vitest and no admin bundle ever pulls `node:dns` into the browser.
 *
 * Policy:
 * - HTTPS is required. A documented localhost-HTTP seam exists ONLY when
 *   `NODE_ENV` is not `production` (mirrors the historical
 *   `securitySettings.normalizeLoginWebhookUrl` local-dev exception) so local
 *   development can reach a local HTTP hook without weakening production.
 * - Allowlisted providers (slack, zapier, openai, openrouter) accept only
 *   their official hosts. Sentry DSNs accept only Sentry-owned hosts.
 * - Blocklist providers (custom webhooks `webhook`, login alerts) accept HTTPS
 *   to any host EXCEPT private/loopback/link-local/CGNAT/reserved/multicast
 *   IPv4 and IPv6 ranges, IPv4-mapped IPv6 (`::ffff:`), NAT64 prefixes
 *   (`64:ff9b::/96`, `64:ff9b:1::/48`), 6to4/Teredo encodings of blocked IPv4,
 *   and hostnames that resolve (at delivery time) to any blocked address
 *   (rebinding-aware).
 * - Redirects are never followed: every fetch passes `redirect: "error"`, and
 *   a redirect rejection is rethrown as the machine-readable
 *   `egress_redirect_forbidden` EgressPolicyError. Policy errors carry only
 *   their code — never the URL — so persisted delivery errors stay clean.
 */

export type EgressProvider =
  "slack" | "zapier" | "login-alert" | "webhook" | "openai" | "openrouter" | "sentry";

export type EgressErrorCode =
  | "egress_invalid_url"
  | "egress_invalid_scheme"
  | "egress_host_forbidden"
  | "egress_redirect_forbidden";

export type EgressValidationResult = { ok: true; url: URL } | { ok: false; code: EgressErrorCode };

export type ValidateOutboundUrlOptions = {
  provider: EgressProvider;
  /** Override the environment; defaults to `process.env`. Used by tests. */
  env?: NodeJS.ProcessEnv;
};

/** Machine-readable policy rejection. The message IS the code (no URL/secret). */
export class EgressPolicyError extends Error {
  readonly code: EgressErrorCode;

  constructor(code: EgressErrorCode) {
    super(code);
    this.name = "EgressPolicyError";
    this.code = code;
  }
}

const HOST_ALLOWLISTS: Partial<Record<EgressProvider, readonly string[]>> = {
  slack: ["hooks.slack.com"],
  zapier: ["hooks.zapier.com"],
  openai: ["api.openai.com"],
  openrouter: ["openrouter.ai"],
};

type Ipv4 = [number, number, number, number];

const toHextet = (value: number) => Math.max(0, Math.min(0xffff, value)).toString(16);

const isHostAllowed = (hostname: string, bases: readonly string[]): boolean => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return bases.some((base) => host === base || host.endsWith(`.${base}`));
};

const isSentryOwnedHost = (hostname: string): boolean => isHostAllowed(hostname, ["sentry.io"]);

const isBlockedIpv4 = ([a, b, c]: Ipv4): boolean => {
  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24 IETF
  if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24 TEST-NET-1
  if (a === 192 && b === 88 && c === 99) return true; // 192.88.99.0/24 deprecated 6to4
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24 TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 TEST-NET-3
  if (a >= 224) return true; // 224.0.0.0/4 multicast + reserved + broadcast
  return false;
};

const hextetsToIpv4 = (g6: string, g7: string): Ipv4 => {
  const hi = parseInt(g6, 16);
  const lo = parseInt(g7, 16);
  return [(hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff];
};

/**
 * Expand an IPv6 literal (brackets stripped, lowercase) into eight 4-hex-digit
 * hextets. An embedded dotted IPv4 tail (`::ffff:127.0.0.1`) is converted to
 * its two hextets first so every spelling canonicalizes to the same groups.
 * Returns null when the literal is not a valid IPv6 address.
 */
const expandIpv6 = (address: string): string[] | null => {
  let addr = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (addr.includes(":::")) return null;

  if (addr.includes(".")) {
    const lastColon = addr.lastIndexOf(":");
    const tail = addr.slice(lastColon + 1);
    const octets = tail.split(".").map(Number);
    if (
      octets.length !== 4 ||
      octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
    ) {
      return null;
    }
    addr =
      addr.slice(0, lastColon + 1) +
      toHextet(octets[0]! * 256 + octets[1]!) +
      ":" +
      toHextet(octets[2]! * 256 + octets[3]!);
  }

  const sides = addr.split("::");
  if (sides.length > 2) return null;
  const left = sides[0] ? sides[0].split(":") : [];
  const right = sides.length === 2 && sides[1] ? sides[1].split(":") : [];
  const groups = [...left, ...right];
  if (groups.length > 8) return null;
  if (groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;

  const filled: string[] = [...left];
  if (sides.length === 1) {
    if (groups.length !== 8) return null;
  } else {
    for (let index = 0; index < 8 - groups.length; index += 1) filled.push("0");
    filled.push(...right);
  }
  return filled.map((group) => group.padStart(4, "0"));
};

const isBlockedIpv6 = (groups: string[]): boolean => {
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;
  const zeroPrefix =
    g0 === "0000" && g1 === "0000" && g2 === "0000" && g3 === "0000" && g4 === "0000";

  // IPv4-mapped `::ffff:0:0/96` and IPv4-compatible (deprecated) `::/96`:
  // classify by the embedded IPv4 so every mapped spelling of a private
  // address (including compressed forms such as `::ffff:7f00:1`) is caught.
  if (zeroPrefix && g5 === "ffff") return isBlockedIpv4(hextetsToIpv4(g6!, g7!));
  if (zeroPrefix && g5 === "0000") return isBlockedIpv4(hextetsToIpv4(g6!, g7!));

  // Unique local fc00::/7.
  if (g0!.startsWith("fc") || g0!.startsWith("fd")) return true;

  const firstHextet = parseInt(g0!, 16);
  // Link-local fe80::/10.
  if (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) return true;
  // Multicast ff00::/8.
  if (firstHextet >= 0xff00) return true;

  // NAT64 well-known prefix 64:ff9b::/96.
  if (
    g0 === "0064" &&
    g1 === "ff9b" &&
    g2 === "0000" &&
    g3 === "0000" &&
    g4 === "0000" &&
    g5 === "0000"
  ) {
    return true;
  }
  // NAT64 local-use prefix 64:ff9b:1::/48.
  if (g0 === "0064" && g1 === "ff9b" && g2 === "0001") return true;

  // 6to4 2002::/16: the embedded IPv4 lives in groups 1-2.
  if (g0 === "2002") return isBlockedIpv4(hextetsToIpv4(g1!, g2!));

  // Teredo 2001:0000::/32: the obfuscated client IPv4 lives in groups 6-7
  // (XOR 0xffff) and must not resolve into a forbidden range.
  if (g0 === "2001" && g1 === "0000") {
    const flip = (hextet: string) => (0xffff ^ parseInt(hextet, 16)).toString(16);
    return isBlockedIpv4(hextetsToIpv4(flip(g6!), flip(g7!)));
  }

  // Documentation prefix 2001:db8::/32 and ORCHID 2001:10::/28 (reserved).
  if (g0 === "2001" && g1 === "0db8") return true;
  if (g0 === "2001") {
    const secondHextet = parseInt(g1!, 16);
    if (secondHextet >= 0x0010 && secondHextet <= 0x001f) return true;
  }

  return false;
};

type IpLiteral = { kind: "ipv4"; value: Ipv4 } | { kind: "ipv6"; groups: string[] };

const parseIpLiteral = (hostname: string): IpLiteral | null => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host.includes(":")) {
    const groups = expandIpv6(host);
    return groups ? { kind: "ipv6", groups } : null;
  }
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (match) {
    const octets = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
    if (octets.some((octet) => octet > 255)) return null;
    return { kind: "ipv4", value: [octets[0]!, octets[1]!, octets[2]!, octets[3]!] };
  }
  return null;
};

const isLoopbackHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost") return true;
  const literal = parseIpLiteral(hostname);
  if (literal?.kind === "ipv4") return literal.value[0] === 127;
  if (literal?.kind === "ipv6") {
    // Only `::1` is loopback; mapped/embedded forms are caught by the blocklist.
    return literal.groups.every((group, index) =>
      index === 7 ? group === "0001" : group === "0000"
    );
  }
  return false;
};

const isDevEscapeActive = (env?: NodeJS.ProcessEnv): boolean =>
  (env?.NODE_ENV ?? process.env.NODE_ENV) !== "production";

/**
 * Synchronous destination validation for a provider. This is the
 * configuration-time gate AND the first delivery-time gate: scheme, host
 * allowlists for allowlisted providers, and the full literal blocklist for
 * blocklist providers. Hostname DNS re-verification happens separately at
 * delivery time in `fetchWithEgressPolicy` (rebinding-aware).
 */
export function validateOutboundUrl(
  url: string,
  opts: ValidateOutboundUrlOptions
): EgressValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, code: "egress_invalid_url" };
  }

  const hostname = parsed.hostname.toLowerCase();
  const devEscape = isDevEscapeActive(opts.env);
  const localhostHttpEscape = parsed.protocol === "http:" && devEscape && isLoopbackHost(hostname);

  // Scheme: HTTPS only. The localhost-HTTP seam is allowed solely outside
  // production so local development can reach a local HTTP hook.
  if (parsed.protocol !== "https:" && !localhostHttpEscape) {
    return { ok: false, code: "egress_invalid_scheme" };
  }

  const allowlist = HOST_ALLOWLISTS[opts.provider];
  if (allowlist) {
    return isHostAllowed(hostname, allowlist)
      ? { ok: true, url: parsed }
      : { ok: false, code: "egress_host_forbidden" };
  }

  if (opts.provider === "sentry") {
    return isSentryOwnedHost(hostname)
      ? { ok: true, url: parsed }
      : { ok: false, code: "egress_host_forbidden" };
  }

  // Blocklist providers: custom webhooks (`webhook`) and login alerts.
  if (localhostHttpEscape) {
    return { ok: true, url: parsed };
  }

  const literal = parseIpLiteral(hostname);
  if (literal) {
    const blocked =
      literal.kind === "ipv4" ? isBlockedIpv4(literal.value) : isBlockedIpv6(literal.groups);
    return blocked ? { ok: false, code: "egress_host_forbidden" } : { ok: true, url: parsed };
  }

  if (isLoopbackHost(hostname)) {
    return { ok: false, code: "egress_host_forbidden" };
  }

  // Literal checks pass; the hostname itself is re-verified at delivery time.
  return { ok: true, url: parsed };
}

export type OutboundDnsResolver = (hostname: string) => Promise<string[]>;

const defaultDnsResolver: OutboundDnsResolver = async (hostname) => {
  // Lazy Node builtin (TASK-567): the module must stay import-safe for the
  // admin Vite bundle (which reaches this policy via formActionsContract).
  // Vite stubs `node:dns/promises` as a browser-external with NO `lookup`
  // export, so a top-level static import crashes every admin route. The DNS
  // re-check only runs inside the server-side delivery transport.
  try {
    const { lookup } = await import("node:dns/promises");
    const result = await lookup(hostname, { all: true, verbatim: true });
    return result.map((entry) => entry.address);
  } catch {
    return [];
  }
};

let dnsResolver: OutboundDnsResolver = defaultDnsResolver;

/** Test seam: replace the delivery-time DNS resolver (e.g. to simulate rebinding). */
export function setOutboundDnsResolver(resolver: OutboundDnsResolver | null): void {
  dnsResolver = resolver ?? defaultDnsResolver;
}

const isRedirectError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  if (/redirect/i.test(error.message)) return true;
  if (error.cause instanceof Error) return isRedirectError(error.cause);
  return false;
};

/**
 * Delivery-time transport. Re-validates the destination synchronously, then
 * re-resolves blocklist-provider hostnames right before the fetch so a DNS
 * rebinding that moved a validated host to a private address is rejected,
 * and finally performs the fetch with `redirect: "error"`. A redirect
 * rejection is rethrown as `EgressPolicyError("egress_redirect_forbidden")`;
 * every other rejection rethrows the policy code or the underlying error.
 */
export async function fetchWithEgressPolicy(
  input: string | URL,
  init: RequestInit,
  opts: { provider: EgressProvider }
): Promise<Response> {
  const target = typeof input === "string" ? input : input.toString();
  const validated = validateOutboundUrl(target, { provider: opts.provider });
  if (!validated.ok) {
    throw new EgressPolicyError(validated.code);
  }

  const hostname = validated.url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const localhostHttpEscape =
    validated.url.protocol === "http:" && isDevEscapeActive() && isLoopbackHost(hostname);
  const needsDnsRecheck = !HOST_ALLOWLISTS[opts.provider] && opts.provider !== "sentry";

  if (needsDnsRecheck && !localhostHttpEscape) {
    const literal = parseIpLiteral(hostname);
    if (!literal) {
      const addresses = await dnsResolver(hostname);
      for (const address of addresses) {
        const ip = parseIpLiteral(address);
        if (ip && (ip.kind === "ipv4" ? isBlockedIpv4(ip.value) : isBlockedIpv6(ip.groups))) {
          throw new EgressPolicyError("egress_host_forbidden");
        }
      }
    }
  }

  try {
    return await fetch(target, { ...init, redirect: "error" });
  } catch (error) {
    if (isRedirectError(error)) {
      throw new EgressPolicyError("egress_redirect_forbidden");
    }
    throw error;
  }
}

export type SentryDsnValidationResult = { ok: true } | { ok: false; code: "sentry_dsn_invalid" };

/**
 * Sentry DSN gate: shape check (protocol, public key, project path) PLUS a
 * Sentry-owned host allowlist so a non-Sentry host can never receive error
 * events. Used at SDK init (fail-closed) and available to any other consumer.
 */
export function validateSentryDsn(dsn: string): SentryDsnValidationResult {
  if (typeof dsn !== "string" || !dsn.trim()) {
    return { ok: false, code: "sentry_dsn_invalid" };
  }
  try {
    const url = new URL(dsn.trim());
    const validShape =
      url.protocol.startsWith("http") && Boolean(url.username) && url.pathname.length > 1;
    if (!validShape || !isSentryOwnedHost(url.hostname)) {
      return { ok: false, code: "sentry_dsn_invalid" };
    }
    return { ok: true };
  } catch {
    return { ok: false, code: "sentry_dsn_invalid" };
  }
}
