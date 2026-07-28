# TASK-547-01-L01: Package Schema, Normalizer and Limits
# FileName: TASK-547-01-L01-Package-Schema-Normalizer-And-Limits.md

**Parent Subtask:** TASK-547-01
**Priority:** Critical
**Category:** Solution Kits / Schema
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** 🚧 In Progress
**Reopened:** 2026-07-23 — implementation remains present; fresh final audit and
validation evidence are pending after drift remediation.

## Overview

Create bounded `FullSitePackageV1` types, strict schema and canonical package-aware
normalizer. Own new `core/services/kits/fullSitePackage/{types,schema,normalize}.ts`.
Do not change native Page/Menu/Form/content schemas.

This leaf owns structural package normalization only. It deliberately does not
decide whether a ref-shaped object appears at an allowed path or resolves to a
unique resource. Every raw/`unknown` package boundary must immediately pass this
leaf's normalized result to TASK-547-01-L02 `buildReferencePlan` before acquiring
any lazy DB-backed dependency. Typed internal boundaries accept
`FullSitePackageV1`, never normalize again and follow the downstream planner/
apply/CLI call-count handoffs. Do not add a wrapper or second validation path.

Every one of the ten resource arrays contains only a strict
`ResourceSeed<TDesired> = { key: string; desired: TDesired }`. Package JSON
contains no database IDs in package-owned seed envelopes. Lifecycle state only
where the native owner supports it, ordered children where supported, and all
other intended domain state are explicit inside
`desired`; canonical snapshot/equality is over the complete normalized
`desired`, never a partial projection.

Freeze the package-owned canonical key grammar to
`^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$`. It applies to the package key,
every non-setting seed key and each verification scenario ID. L02 applies the
same grammar to `PackageRef.key`. A setting seed key bypasses that regex and must equal:
`site.name`, `site.locale`, `site.homepageId`, `site.navigationMenuId`,
`site.footerTemplateId`, `site.contentRoutes`, `design.tokens`. No prefix,
namespace or regex-based setting admission is allowed. Package, non-setting
resource, setting and verification-scenario identities are validated exactly as
supplied and are never trimmed.

`core/services/kits/fullSitePackage/schema.ts` owns and exports
`compareFullSitePackageText(left, right)`, defined only as
`left < right ? -1 : left > right ? 1 : 0` (runtime-independent UTF-16 code-unit
order). No package or graph canonical order may use `localeCompare`, `Intl` or a
host default locale. Apply this owner to resource seed keys, residual IDs and
L02's lexical identity/dependency ties. The same module owns
`compareFullSitePackageObjectKeys`: canonical ECMAScript array-index strings
(`"0"` through `"4294967294"`, no leading zero) sort first by numeric value, then
all other keys use `compareFullSitePackageText`. This matches deterministic
`OrdinaryOwnPropertyKeys`/`JSON.stringify` behavior; it is not locale order.
The fixed resource-collection tuple retains its declared order; desired arrays
retain authored order; verification IDs retain first-occurrence order. Resource
arrays and residuals alone sort by canonical identity.

Every exported package authority consulted by validation is runtime-immutable,
not merely TypeScript-readonly: `PACKAGE_RESOURCE_KINDS`,
`PACKAGE_RESOURCE_COLLECTIONS`, `PACKAGE_RESOURCE_KIND_BY_COLLECTION`,
`PACKAGE_LIMITS` and `FULL_SITE_PACKAGE_SETTING_KEYS` use `Object.freeze`.
No mutable `Set` consulted by validation is exported; root-key and setting-key
membership sets remain module-private behind pure checks. External code cannot
widen, narrow or remap any package validation boundary.

Freeze this exact final package limit map:

```ts
export const PACKAGE_LIMITS = Object.freeze({
  fileBytes: 8 * 1024 * 1024,
  resourcesTotal: 512,
  resourcesPerCollection: 256,
  referenceEdges: 4_096,
  depth: 64,
  diagnostics: 100,
  keyLength: 128,
  metadataNameLength: 200,
  metadataLocaleLength: 35,
  metadataDescriptionLength: 2_000,
  residualIdLength: 128,
  residualTextLength: 2_000,
  verificationScenarios: 100,
  stringLength: 100_000,
} as const);
```

The permanent historic name `fileBytes` measures only the
`JSON.stringify`/UTF-8 bytes of the in-memory value passed to the package
normalizer; overage is `site_package_too_large`. It is not a raw-file promise or
a shared loader cap. TASK-547-05 owns the separate
`FULL_SITE_PACKAGE_RAW_SOURCE_BYTES`; its raw-file failures map to
`site_package_file_invalid`.

`VerificationPlan` is exactly `{ scenarioIds: string[] }`. Reject an unknown key,
non-array, non-string, empty/non-canonical ID or 101st input entry; accept exactly
100. Canonicalization preserves first declaration order and collapses each later
duplicate, so repeated normalization is identical and no sort changes scenario
execution order. Embedded native payloads retain their own stricter limits, but
this leaf does not certify native-domain write validity.

Implement the parent’s exact strict `VisualResidual` shape with bounded evidence,
constraint, approximation, difference and remediation strings plus literal-false
functional/accessibility/data/security/test-integrity flags. A residual ID is
never trimmed, uses exactly
`^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$`, is unique inside the package and is
sorted by `compareFullSitePackageText`; duplicates reject rather than dedupe.

Metadata `name`, optional `description` and the five residual prose fields trim
outer ECMAScript whitespace, reject an empty post-trim value and preserve every
interior code unit. `metadata.locale` also trims outer whitespace, then validates
exactly `^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$` and preserves the accepted casing
and subtags. It is package metadata, not the native `site.locale` policy.
Strings nested inside `desired` remain byte-preserved.

L01's raw structural traversal owns the same JSON-depth boundary and static
diagnostic as L02's typed guard: every `desired` root is level 1, every property
value/array element adds one, level 64 accepts and level 65 throws
`site_package_too_complex` with exactly
`{ path: "$.resources", reason: "json_depth_exceeded" }`. Because raw input must
normalize before graph validation, this structural error precedes duplicate or
other graph errors. L02 repeats the same guard first for already-typed callers,
so raw and typed duplicate+depth inputs have identical precedence.

Finite JSON numbers are preserved except negative zero, which canonicalizes to
positive `0` (`Object.is(output, -0) === false`) before artifact serialization.
Recursive object construction uses `compareFullSitePackageObjectKeys`; tests pin
numeric index keys `"2"` before `"10"`, followed by non-index keys such as
`"01"` in code-unit order.

## Security Contract

Pure Bun-free code; no endpoint. Reject unknown keys, forbidden settings/secrets,
oversized serialized values/resources/strings/diagnostics and raw bytes/base64.
Setting keys use only the exact allowlist above, never the package-key regex.

Sensitive desired-field classification is deterministic and never uses
substring matching. First split every non-ASCII-alphanumeric separator and drop
empty segments, then split lower/digit-to-uppercase camel boundaries. For each
complete remaining chunk, lowercase ASCII and attempt the exact compact grammar
before acronym-to-word splitting; when it does not consume the entire chunk,
split the acronym boundary and lowercase its pieces. Apply the compact parser
again only to each complete resulting piece, never to a substring. Thus
`APIKey`, `APIkey`, `apiKEY`, `XAPIKey` and `X-API-Key` all normalize to the
intended authority tokens. The frozen sensitive terminals are exactly
`authorization`, `bearer`, `cookie`, `credential`, `credentials`, `csrf`,
`password`, `secret`, `session`, `token`; pairs are exactly
`access|api|private|provider` + `key`, `client` + `secret`, and `connection` +
`string`; material
suffixes are exactly `hash`, `header`, `id`, `key`, `value`.

Whole lowercase compact chunks use one closed grammar, parsed longest-base-first
from their first through last character. Compact bases are the terminals, the
pairs, and exactly `access token`, `bearer token`, `csrf token`, `provider
secret`, `refresh token`, `reset token`, `secret access key`, `session cookie`,
`session token`, `smtp password`, `webhook secret`, `x api key`; concatenate the
base and then zero or more complete material suffixes. A partial parse is not an
alias. Expand each exact compact token, reject when the resulting full token
sequence ends in a terminal/pair, or peel one or more complete material suffixes
and reject when the remainder ends in a terminal/pair. Thus `apikey`,
`apiKeyValue`, `apikeyvalue`, `sessionId`, `sessionid`, `secretAccessKey`,
`passwordHash`, `xapikey` and `webhooksecret` reject. `tokenizedCopy`,
`tokenCount`, `cookieBanner`, `passwordPolicyLabel`, `secretDescription`,
`apiKeyDescription`, `apikeydescription`, `possessionId`, `providerKeynote` and
`connectionStringFormat` remain valid descriptive keys.

Binary-carrier recognition is a separate closed grammar. Carrier bases are
exactly `base64`, `bytes`, `binary`, `blob`; roles are exactly `content`, `data`,
`payload`, `value`. Accept a base as the final token, or one followed by one or
more complete roles; an all-lower compact token expands only when its entire
spelling is `base + one-or-more roles`. Therefore `base64Data`, `base64data`,
`imageBase64Data`, `binaryPayload`, `bytesValue` and `blobContent` select encoded
value scanning, while `base64Description`, `database64`, `binaryChoice`,
`blobLabel` and `bytesPerSecond` do not.

The desired-value walker carries `explicitBinaryCarrier` recursively. For an
object property it passes `inheritedCarrier || isExplicitBinaryCarrier(key)` to
that complete property value; arrays pass the inherited flag to every item and
objects pass it to every descendant. Every descendant string is therefore
Base64-family-inspected, while `null`, booleans and finite numbers remain
ordinary JSON. Actual binary rejects at any depth. This closes direct, array and
nested-object carrier shapes without declaring a composite value invalid merely
because it is composite.

The carrier-independent value classifier is shared by every `desired` string,
metadata `name`/optional `description`, and the five VisualResidual prose fields.
It applies ECMAScript `trim()` for detection only and rejects actual
`ArrayBuffer`, `ArrayBufferView` and `Blob` values before ordinary string
validation. For a string beginning `//`, parse `https:${trimmed}`; for one
matching `^[A-Za-z][A-Za-z0-9+.-]*:`, parse the string itself. Also parse an
exact whole-string relative candidate beginning `/`, `./`, `../`, `?` or `#`
against the fixed inert base `https://task547.invalid/`; handle `//` first so it
retains network-URL semantics. An unprefixed relative word/path is not a URL
candidate. Parse failure is not a URL finding. A parsed URL rejects for nonempty
`username` or `password`.

Also inspect `URL.searchParams` and a fragment parsed once with
`new URLSearchParams(fragmentBody)`, after removing `#` and at most one leading
`?`. Use only `URLSearchParams` decoding; never call `decodeURIComponent` or
double-decode. A decoded parameter name is marked when the sensitive-field
classifier above matches, its terminal token is exactly `sig` or `signature`,
or its complete token sequence is exactly `aws/access/key/id`,
`google/access/id`, or `key/pair/id`. In this URL-only marker predicate, also
mark only a decoded parameter name whose exact full string ASCII-case-folds to
`code`. Do not add `code` to the global sensitive-key tokens and do not apply
substring, camel, or separator-token matching to this special case. Iterate
duplicates. Reject the URL if any marked decoded value has `length > 0` without
trimming; empty marked occurrences alone are accepted, while an empty occurrence
followed by a nonempty duplicate rejects. Return one URL finding regardless of
marker count/surface. Safe non-markers include `token_type`,
`signatureVersion`, `signedHeaders`, `expires`, `policy`, `algorithm`, `se`,
`sp`, `sv`, `state`, `scope`, `client_id`, `coupon_code`, `promoCode`,
`code_type`, `code_challenge`, `code_challenge_method`, `postal_code`,
`source_code` and `status_code`; `response_type=code` is also safe because only
the decoded parameter name is classified.

Carrier-independent authorization scanning is high-confidence rather than a
two-word substring rule. Basic first matches
`/^basic[\t ]+([A-Za-z0-9+/]+)(=*)$/i`. Split the captured standard-alphabet
body from its terminal padding, ignore the supplied padding for decoding, and
pass the nonempty body to a private bounded pure-TypeScript standard Base64 body
decoder. The decoder rejects body remainder one, synthesizes the zero, one or
two terminal `=` required by the body length, decodes sextets without
`Buffer`, Bun APIs, `atob` or imports, and does not require zero pad bits. Basic
rejects whenever those decoded bytes contain `0x3a` (`:`), regardless of
canonical, missing, wrong or excess supplied terminal padding and regardless of
nonzero pad-bit aliases. A matched but structurally undecodable body is not a
Basic finding. Bearer first matches
`/^bearer[\t ]+([A-Za-z0-9\-._~+/]+={0,})$/i`, then requires a captured token of
at least 16 code units containing at least one digit or `-._~+/=`. Thus real
Basic credentials and JWT/API-style Bearer material reject, while ordinary copy
such as `Basic analytics`, `Basic Plan`, `Bearer token` and
`Bearer architecture` remains valid. Arbitrary alphabetic prose cannot be
distinguished from an opaque alphabetic token and is intentionally not guessed.
The PEM predicate is `/-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/`; the
carrier-independent data URL predicate is `/^data:[^,\r\n]*;base64,/i`.
Base64-family inspection runs only for an explicit carrier. It receives the
detection-only ECMAScript-trimmed string, then strips exactly U+0009 through
U+000D and U+0020 (TAB, LF, VT, FF, CR and SPACE) in one bounded pass; it never
changes the stored string. Empty or ASCII-whitespace-only input is
`not_encoded`. If any remaining code unit is outside
`[A-Za-z0-9+/_=-]`, the result is also `not_encoded`. Otherwise split the body
from the terminal `=` run. Internal padding, an empty/padding-only body, mixed
standard (`+` or `/`) and URL (`-` or `_`) alphabets, a body remainder of one,
or wrong/excess terminal padding is `encoded_like_invalid`. The sole explicit
impossible-length near miss is a one-symbol unpadded body, which is
`not_encoded`; any padding on that body is `encoded_like_invalid`. For body
remainders zero, two and three, required padding is respectively zero, two and
one: no padding or exactly that required count is valid, except remainder zero
allows only zero. Every other padding count is wrong or excess. A valid
standard, URL-safe or alphabet-neutral lexeme is `encoded` whether padded or
unpadded and regardless of canonical pad bits. Both `encoded` and
`encoded_like_invalid` map to `base64_value_forbidden`; only `not_encoded` is
accepted. This detector needs no decoder, entropy heuristic, `Buffer`, Bun API,
`atob` or import. A future decoder must enforce this strict grammar and must
never permissively consume a string that this contract accepted as
`not_encoded`. Thus encoded `blob:"copy"` rejects, while punctuation-bearing
near misses and bare Base64-looking descriptive prose outside an explicit
carrier stay valid.

For a desired property, a sensitive key emits one `secret_key_forbidden` and
skips value classification for that property after the separate depth preflight.
Otherwise value-reason precedence is binary → authorization → private-key PEM →
credential URL → Base64 data URL → explicit-carrier Base64 family, with at
most one finding per value. Desired findings always use
`$.resources.<collection>[<index>].desired.[redacted]`. Package prose findings
use only `$.metadata.name`, `$.metadata.description`, or
`$.compatibility.unresolvedVisuals[<input-index>].<trusted-prose-field>` where
the field is one of `prototypeEvidence`, `cmsConstraint`,
`installedApproximation`, `userVisibleDifference`, `postInstallRemediation`.
Reasons are exactly `secret_key_forbidden`, `credential_url_forbidden`,
`authorization_value_forbidden`, `private_key_forbidden`,
`base64_value_forbidden`, `binary_value_forbidden`. No supplied key, residual ID,
URL/parameter name/value, authorization, PEM text or encoded bytes may enter the
path, reason, error name or message.

## Implementation Pseudocode

```ts
export const PACKAGE_RESOURCE_KINDS = Object.freeze([
  "content_type", "form", "page_template", "listing_template", "content_entry",
  "listing_query", "detail_page", "page", "menu", "setting",
] as const);
export const PACKAGE_RESOURCE_COLLECTIONS = Object.freeze([
  "contentTypes", "forms", "pageTemplates", "listingTemplates", "entries",
  "listingQueries", "detailPages", "pages", "menus", "settings",
] as const);
export const PACKAGE_RESOURCE_KIND_BY_COLLECTION = Object.freeze({
  contentTypes: "content_type", forms: "form", pageTemplates: "page_template",
  listingTemplates: "listing_template", entries: "content_entry",
  listingQueries: "listing_query", detailPages: "detail_page", pages: "page",
  menus: "menu", settings: "setting",
} as const);
export const PACKAGE_LIMITS = Object.freeze({
  fileBytes: 8 * 1024 * 1024, resourcesTotal: 512, resourcesPerCollection: 256,
  referenceEdges: 4_096, depth: 64, diagnostics: 100, keyLength: 128,
  metadataNameLength: 200, metadataLocaleLength: 35,
  metadataDescriptionLength: 2_000, residualIdLength: 128,
  residualTextLength: 2_000, verificationScenarios: 100, stringLength: 100_000,
} as const);

export const compareFullSitePackageText = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

const toEcmaArrayIndex = (value: string): number | null => {
  if (!/^(?:0|[1-9][0-9]{0,9})$/.test(value)) return null;
  const index = Number(value);
  return index <= 4_294_967_294 && String(index) === value ? index : null;
};

export const compareFullSitePackageObjectKeys = (left: string, right: string) => {
  const leftIndex = toEcmaArrayIndex(left);
  const rightIndex = toEcmaArrayIndex(right);
  if (leftIndex !== null && rightIndex !== null) return leftIndex - rightIndex;
  if (leftIndex !== null) return -1;
  if (rightIndex !== null) return 1;
  return compareFullSitePackageText(left, right);
};

export const FULL_SITE_PACKAGE_SETTING_KEYS = Object.freeze([
  "site.name",
  "site.locale",
  "site.homepageId",
  "site.navigationMenuId",
  "site.footerTemplateId",
  "site.contentRoutes",
  "design.tokens",
] as const);

const SENSITIVE_TERMINALS = Object.freeze([
  "authorization", "bearer", "cookie", "credential", "credentials", "csrf",
  "password", "secret", "session", "token",
] as const);
const SENSITIVE_PAIRS = freezeTuples([
  ["access", "key"], ["api", "key"], ["private", "key"],
  ["provider", "key"], ["client", "secret"], ["connection", "string"],
] as const);
const MATERIAL_SUFFIXES = Object.freeze(["hash", "header", "id", "key", "value"] as const);
const COMPACT_EXTRA_BASES = freezeTuples([
  ["access", "token"], ["bearer", "token"], ["csrf", "token"],
  ["provider", "secret"], ["refresh", "token"], ["reset", "token"],
  ["secret", "access", "key"], ["session", "cookie"], ["session", "token"],
  ["smtp", "password"], ["webhook", "secret"], ["x", "api", "key"],
] as const);
const BINARY_CARRIER_BASES = Object.freeze(["base64", "bytes", "binary", "blob"] as const);
const BINARY_CARRIER_ROLES = Object.freeze(["content", "data", "payload", "value"] as const);

const tokenizeSensitiveFieldKey = (key: string): readonly string[] =>
  tokenizeWithExactCompactExpansion(key, credentialCompactGrammar);

const isSensitiveFieldKey = (key: string): boolean =>
  matchesSensitiveBaseAfterExactCompactExpansion(
    tokenizeSensitiveFieldKey(key),
    SENSITIVE_TERMINALS,
    SENSITIVE_PAIRS,
    COMPACT_EXTRA_BASES,
    MATERIAL_SUFFIXES,
  );

const isExplicitBinaryCarrier = (key: string): boolean =>
  matchesCarrierAfterExactCompactExpansion(
    tokenizeWithExactCompactExpansion(key, binaryCarrierCompactGrammar),
    BINARY_CARRIER_BASES,
    BINARY_CARRIER_ROLES,
  );

const asciiCaseFold = (value: string): string =>
  value.replace(/[A-Z]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) + 0x20),
  );

const isUrlCredentialParameterName = (decodedName: string): boolean =>
  isCredentialUrlMarker(decodedName) || asciiCaseFold(decodedName) === "code";

const isCredentialBearingUrl = (trimmed: string): boolean => {
  const parsed = parseTask547UrlCandidate(trimmed, "https://task547.invalid/");
  if (!parsed) return false;
  if (parsed.username.length > 0 || parsed.password.length > 0) return true;
  return [...parsed.searchParams, ...fragmentParamsOnce(parsed.hash)].some(
    ([name, value]) => value.length > 0 && isUrlCredentialParameterName(name),
  );
};

type Base64FamilyInspection =
  | "not_encoded"
  | "encoded"
  | "encoded_like_invalid";

const isBase64MimeWhitespace = (character: string): boolean => {
  const codeUnit = character.charCodeAt(0);
  return (codeUnit >= 0x09 && codeUnit <= 0x0d) || codeUnit === 0x20;
};

const inspectBase64FamilyLexeme = (
  detectionTrimmed: string,
): Base64FamilyInspection => {
  let compact = "";
  for (const character of detectionTrimmed) {
    if (isBase64MimeWhitespace(character)) continue;
    if (!/[A-Za-z0-9+/_=-]/.test(character)) return "not_encoded";
    compact += character;
  }
  if (compact.length === 0) return "not_encoded";

  const firstPadding = compact.indexOf("=");
  const body = firstPadding < 0 ? compact : compact.slice(0, firstPadding);
  const padding = firstPadding < 0 ? "" : compact.slice(firstPadding);
  if (padding.length > 0 && !/^=+$/.test(padding)) {
    return "encoded_like_invalid";
  }
  if (body.length === 0) return "encoded_like_invalid";
  const usesStandardAlphabet = body.includes("+") || body.includes("/");
  const usesUrlAlphabet = body.includes("-") || body.includes("_");
  if (usesStandardAlphabet && usesUrlAlphabet) {
    return "encoded_like_invalid";
  }

  const remainder = body.length % 4;
  if (remainder === 1) {
    return body.length === 1 && padding.length === 0
      ? "not_encoded"
      : "encoded_like_invalid";
  }
  const requiredPadding = remainder === 0 ? 0 : 4 - remainder;
  if (padding.length !== 0 && padding.length !== requiredPadding) {
    return "encoded_like_invalid";
  }
  return "encoded";
};

const decodeStandardBase64Sextet = (character: string): number | null => {
  // Pure ASCII char-code mapping for A-Z, a-z, 0-9, + and /.
  return mapStandardBase64AsciiToSextet(character);
};

const decodeBasicStandardBase64Body = (
  body: string,
): Uint8Array | null => {
  if (body.length === 0 || body.length % 4 === 1) return null;
  const synthesized = `${body}${"=".repeat((4 - (body.length % 4)) % 4)}`;
  const output = new Uint8Array(Math.floor((body.length * 6) / 8));
  let outputIndex = 0;
  for (let index = 0; index < synthesized.length; index += 4) {
    const a = decodeStandardBase64Sextet(synthesized[index]);
    const b = decodeStandardBase64Sextet(synthesized[index + 1]);
    const c = synthesized[index + 2] === "="
      ? 0
      : decodeStandardBase64Sextet(synthesized[index + 2]);
    const d = synthesized[index + 3] === "="
      ? 0
      : decodeStandardBase64Sextet(synthesized[index + 3]);
    if (a === null || b === null || c === null || d === null) return null;
    const word = (a << 18) | (b << 12) | (c << 6) | d;
    if (outputIndex < output.length) output[outputIndex++] = word >>> 16;
    if (outputIndex < output.length) output[outputIndex++] = word >>> 8;
    if (outputIndex < output.length) output[outputIndex++] = word;
  }
  return output;
};

const isForbiddenBasicAuthorization = (trimmed: string): boolean => {
  const match = /^basic[\t ]+([A-Za-z0-9+/]+)(=*)$/i.exec(trimmed);
  if (!match) return false;
  const decoded = decodeBasicStandardBase64Body(match[1]);
  return decoded?.includes(0x3a) ?? false;
};

type PackageValueSecretReason =
  | "credential_url_forbidden"
  | "authorization_value_forbidden"
  | "private_key_forbidden"
  | "base64_value_forbidden"
  | "binary_value_forbidden";

const classifyForbiddenValue = (
  value: unknown,
  options: Readonly<{ explicitBinaryCarrier: boolean }>,
): PackageValueSecretReason | null =>
  classifyInFrozenPrecedence(value, options);

const scanDesiredValue = (
  value: unknown,
  context: Readonly<{
    collection: PackageResourceCollection;
    index: number;
    explicitBinaryCarrier: boolean;
    diagnostics: DiagnosticCollector;
  }>,
): void => {
  const reason = classifyForbiddenValue(value, context);
  if (reason) {
    addRedactedDesiredFinding(context, reason);
    return; // Typed binary is classified before any array/record traversal.
  }
  if (Array.isArray(value)) {
    value.forEach((item) => scanDesiredValue(item, context));
    return;
  }
  if (isRecord(value)) {
    for (const key of Object.keys(value)) {
      if (isSensitiveFieldKey(key)) {
        addRedactedDesiredFinding(context, "secret_key_forbidden");
        continue; // Depth was already preflighted; do not classify this branch's value.
      }
      scanDesiredValue(value[key], {
        ...context,
        explicitBinaryCarrier:
          context.explicitBinaryCarrier || isExplicitBinaryCarrier(key),
      });
    }
    return;
  }
};

type PackageProseField =
  | "prototypeEvidence"
  | "cmsConstraint"
  | "installedApproximation"
  | "userVisibleDifference"
  | "postInstallRemediation";
type PackageMetadataProseField = "name" | "description";
const PACKAGE_METADATA_PROSE_PATHS = Object.freeze({
  name: "$.metadata.name",
  description: "$.metadata.description",
} as const satisfies Record<PackageMetadataProseField, string>);

const readSafeMetadataProse = (
  value: unknown,
  field: PackageMetadataProseField,
  maxLength: number,
  diagnostics: DiagnosticCollector,
): string =>
  readTrimmedBoundedProseAndClassify(
    value,
    PACKAGE_METADATA_PROSE_PATHS[field],
    maxLength,
    diagnostics,
  );

const readSafeResidualProse = (
  value: unknown,
  inputIndex: number,
  field: PackageProseField,
  maxLength: number,
  diagnostics: DiagnosticCollector,
): string => {
  assertNonnegativeSafeTraversalIndex(inputIndex);
  return readTrimmedBoundedProseAndClassify(
    value,
    `$.compatibility.unresolvedVisuals[${inputIndex}].${field}`,
    maxLength,
    diagnostics,
  );
};

export function normalizeFullSitePackageForWrite(value: unknown) {
  assertPackageByteSize(value); // existing export; measures serialized JSON bytes
  const root = assertStrictRoot(value);
  assertPackageComplexity(root, PACKAGE_LIMITS);
  const normalized = normalizePackageOwnedShapesAndScanSecrets(root);
  assertExactAllowedSettingKeys(normalized.resources.settings); // Private membership set.
  assertUniqueResidualIds(normalized.compatibility);
  return canonicalize(normalized, {
    identities: compareFullSitePackageText,
    objectKeys: compareFullSitePackageObjectKeys,
  });
}
```

Both prose readers are module-private. The normalizer calls
`readSafeResidualProse` only from the source residual array's `map` callback,
before canonical sorting, so `inputIndex` is the callback's nonnegative integer
index rather than package data or the residual's later sorted position. The
field argument comes only from the five closed schema-owned literals above; no
public/internal caller accepts an arbitrary diagnostic path.

Data flow: unknown input → serialized-size/shape limits → strict package-owned
records and exact setting allowlist → canonical structural output → L02 graph
validation. Errors use
`site_package_invalid`, `site_package_too_large`, `site_package_too_complex` and
`site_package_setting_forbidden`, with bounded safe paths.

Test ownership is physical and non-overlapping:

- `full-site-package-schema.test.ts` owns envelopes, byte/count/depth limits and
  verification shape;
- `full-site-package-canonicalization.test.ts` owns identity/scalar/prose,
  residual and exact ordering/idempotence cases;
- `full-site-package-security.test.ts` owns immutable-authority mutation,
  forbidden setting/secret/value and non-disclosure cases; and
- `fullSitePackageTestSupport.ts` owns only the shared valid-package/residual
  builders and typed error assertion used by those suites.

Move existing cases/builders to that ownership; do not copy them. Each `.test.ts`
file imports the focused support module and runs independently.

Regression tests: valid canonical package; all ten `{key,desired}` envelopes;
reject package DB IDs and unknown envelope keys; every exact limit edge and
one-over case, including serialized in-memory 8 MiB and 100/101 verification
entries; package/non-setting/scenario canonical-key grammar (L02 owns ref keys); all seven and
only seven setting keys without applying the package-key reader; strict
verification unknown/type/ID checks and stable first-occurrence dedupe; bounded
100-diagnostic truncation; forbidden-setting rejection with exact
`site_package_setting_forbidden` and supplied key/value sentinels absent from the
error/diagnostics; mutation attempts against every exported frozen authority and
the private root/setting membership boundaries. Use table-driven cases for every
sensitive terminal, pair, material suffix, compact extra base, carrier base and
carrier role; pin longest-first `sessiontoken`/`secretaccesskey`, repeated suffix
`apikeyheadervalue`, partial-parse near misses, and `APIKey`, `APIkey`, `apiKEY`,
`XAPIKey`, `X-API-Key` plus URL-parameter equivalents.

Carrier tests cover every base alone, every role, compact/multi-role forms,
direct strings, inherited arrays and nested objects. Under `base64Data`,
`base64data`, `imageBase64Data`, `binaryPayload`, `bytesValue` and `blobContent`,
reject both `encoded` and `encoded_like_invalid` descendants for unpadded
standard, padded URL-safe and alphabet-neutral forms. Pin MIME whitespace
U+0009 TAB, U+000A LF, U+000B VT, U+000C FF, U+000D CR and U+0020 SPACE,
including CRLF; mixed alphabets; internal, wrong and excess padding; body
remainders one beyond the single-symbol exception; and nonzero pad-bit aliases.
Accept empty/ASCII-whitespace-only values, punctuation-bearing near misses and
the one-symbol unpadded impossible-length near miss, but reject that one symbol
with any padding. Accept the five carrier-key near misses above and ordinary
`not_encoded` direct/array/nested descendant copy. Pin all three inspection
results, the last-place Base64 reason precedence, trusted redacted paths and
complete non-disclosure.

Pin canonical decoded-colon Basic `YTo=`, nonzero-pad-bit alias `YTq=`, missing
padding `YTo`, wrong padding `YTo==` and excess padding `YTo===` in desired and
package prose; every variant must reject without disclosing its token. Keep
`Basic analytics`, `Basic Plan`, structurally undecodable colon-free Basic copy,
`Bearer token` and `Bearer architecture` valid, and reject a
credential-shaped Bearer token. Also pin PEM, typed-binary and Base64 data URL
with complete non-disclosure.

Credential URL cases include canonical `scheme://` userinfo, protocol-relative
userinfo, `http:user:pass@example.com`, AWS/GCS/CloudFront/Azure signature and
credential markers, percent-encoded `access_token`, OAuth fragment tokens,
mixed-case/separator variants and duplicate marked entries where an earlier
empty value cannot hide a later nonempty one. Accept all-empty marked entries,
the safe URL markers listed above, `access%255Ftoken` to pin exactly-once
decoding, absolute-scheme near misses with empty parsed userinfo, and ordinary
URLs. In both query and fragment, reject nonempty exact-name `code`, `CODE` and
`%63ode`, but accept `%2563ode`, every listed longer code-shaped name and
`response_type=code`. Pin exact-name duplicates as all-empty accepted and
empty-then-nonempty rejected. Explicitly cover `/download?token=secret`,
`./`/`../` relative forms, `?api_key=secret`, `#access_token=secret`,
`#?access%5Ftoken=secret`, `#access%255Ftoken=public`, fragment empty-then-
nonempty/all-empty duplicates, and the exact `AWSAccessKeyId`, `GoogleAccessId`
and `Key-Pair-Id` sequences. Put unique sentinels in userinfo, decoded marker
names and values—including the exact-name `code` cases—and prove none occur in
error name/message/code/diagnostics.

Exercise one credential-shaped Bearer sentinel across all seven exact
package-prose surfaces,
asserting each trusted path and absence of residual ID/value. On one
representative prose field pin all five value reasons (authorization, private
key, credential URL, Base64 data URL, typed binary) plus ordinary prose, a public
URL, an incomplete Bearer phrase and bare Base64-looking descriptive text.
Pin overlapping precedence too: a PEM-bearing marked URL chooses
`private_key_forbidden`; a credential-marked Base64 data URL chooses
`credential_url_forbidden`; and a sensitive key holding another forbidden value
emits only `secret_key_forbidden`. An actual typed-binary value under an explicit
carrier chooses `binary_value_forbidden`, and authorization, PEM, credential URL
and Base64 data URL findings continue to precede the explicit-carrier Base64
lexeme result.
Use an unsorted multi-residual fixture whose canonical identity order differs
from its input order; trigger a finding in the later input element and prove its
path retains that original pre-sort input index, never its sorted position or
residual ID/value.
Pin metadata/prose trimming, locale
grammar/case preservation, no-trim identities, residual grammar/uniqueness and
punctuation order `a-a,a.a,a_a,aa`, integer-index order `2,10,01` and `-0` →
`0` in exact canonical JSON. Pin the raw normalizer's exact depth 64/65 boundary
and static redacted `json_depth_exceeded` singleton; L02 diagnostics alone owns
raw normalize→graph and forged-typed duplicate+depth precedence. Cover complete
residual object accept; bare-code/unknown-key/non-false-impact rejection;
complete desired-snapshot equality; and idempotent normalize. A schema-only limit test may
accept a ref-shaped object solely to count reference edges; it must state that
this is not full-package validity and leave path/ref-key rejection to L02 and the
consumer pre-DB regression. Native desired-document acceptance/rejection tests
belong to TASK-547-02 after reference substitution. Pin `fileBytes` only as the
exact serialized-object boundary. Handoff only: TASK-547-05 owns the raw reader
and the sole proof that it never consumes `PACKAGE_LIMITS.fileBytes`; this leaf's
suite neither imports nor source-inspects that later-owned reader.

## Sub-Tasks

- [x] Implement types/schema/limits/normalizer.
- [x] Add `tests/vitest/kits/full-site-package-schema.test.ts`.
- [ ] Reject noncanonical package/non-setting keys without trimming; correct
  serialized-size semantics, exact verification/setting contracts and their
  immutable boundaries; freeze scalar/canonical ordering, residual identity and
  secret/encoded-value policies, including all seven package-prose surfaces,
  compact credential aliases, colon-decoded noncanonical Basic variants,
  compound-carrier Base64-family grammar and exact-name `code` query/fragment
  URLs;
  remove undocumented residual/diagnostic limit coupling; split moved cases into independently runnable
  `full-site-package-canonicalization.test.ts` and
  `full-site-package-security.test.ts`, backed by the focused
  `fullSitePackageTestSupport.ts`, without copying assertions/builders; then run
  fresh gates.

## Testing Requirements

Run independently:

- `bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-package-schema.test.ts`
- `bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-package-canonicalization.test.ts`
- `bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-package-security.test.ts`

Then run:

- `bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-package-schema.test.ts tests/vitest/kits/full-site-package-canonicalization.test.ts tests/vitest/kits/full-site-package-security.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `node _docs/_workflows/lib/task-547-final-validation-contract.mjs --line-gate`

The last command is the baseline-to-final touched production/test/support
line-count authority and must pass with every human-authored file at or below
1,000 physical lines.

## Documentation Updates Required

Send verified schema/limit notes to TASK-547-06.
