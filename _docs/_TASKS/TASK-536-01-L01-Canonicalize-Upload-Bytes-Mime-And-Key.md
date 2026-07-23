# TASK-536-01-L01: Canonicalize Upload Bytes, MIME, and Key

# FileName: TASK-536-01-L01-Canonicalize-Upload-Bytes-Mime-And-Key.md

**Parent Task:** TASK-536
**Parent Subtask:** TASK-536-01
**Priority:** Critical
**Category:** Media Domain / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-536-01
**Status:** ✅ Done
**Completed:** 2026-07-11
**Changelog:** 1248

---

## Scope

Create the Bun-free byte-identity owner used by later storage/service leaves. This leaf
defines detection, canonical MIME/extension/delivery, bounded filename/disposition
helpers, and media-route path construction without importing runtime/DB/storage code.

## Source ownership

This leaf is the only writer of new `core/services/media/mediaFileTrust.ts` and the
creator/changed-behavior owner of
`tests/vitest/services/media-file-trust.test.ts`. It must create that suite before its
gate. It must not edit mediaService, storage adapters, delivery, Forms routes, other
tests, task files outside this leaf, or changelog files.

The TASK-536 post-audit keeps that ownership in this leaf for one bounded remediation:
replace the selected raster-markup tag list with the shared generic markup-grammar
predicate, then add a non-weaponized regression for a structurally valid raster carrying
an otherwise omitted HTML element/event-attribute shape. No upload policy, renderer,
adapter, route, or scanner configuration changes belong to this fix.

A later final post-audit also reopens this owner for the PDF safe-subset boundary. The
lexical pass must fail closed when an otherwise accepted PDF declares an opaque active
form (`/AcroForm` or `/XFA`), encryption, or compressed object stream that can conceal
action dictionaries. Ordinary compressed page-content streams remain accepted; this is
not a blanket `/Filter` or `stream` ban. Add non-weaponized compressed-XFA, encrypted,
and object-stream regressions plus a benign compressed-content control.

## Grounded anchors

- mediaService.ts:41-48 supplies the default global allowlist.
- mediaService.ts:211-281 owns looksLikeMarkup, sniffBinaryKind, and kindMatchesMime.
- mediaService.ts:295-317 conditionally validates only public uploads.
- mediaService.ts:328-388 handles upload; :456-508 handles replacement without sniffing.
- core/services/forms/mimeMatchesAccept.ts owns the existing Form accept-rule matcher.
- `core/services/media/mediaFileTrust.ts:386-399` currently combines PDF envelope
  validation with raw Latin-1/global name matching; the remediation keeps only the
  header/object/EOF envelope checks there and moves all forbidden-name decisions into
  the token-aware structural helper. `:432-503` owns the lexical whitespace/comment/hex
  machinery used by the additive generic markup check.

## Implementation Pseudocode

~~~ts
export const CANONICAL_MEDIA_PROFILES = {
  "image/png": { extension: ".png", delivery: "inline" },
  "image/jpeg": { extension: ".jpg", delivery: "inline" },
  "image/gif": { extension: ".gif", delivery: "inline" },
  "image/webp": { extension: ".webp", delivery: "inline" },
  "image/bmp": { extension: ".bmp", delivery: "inline" },
  "application/pdf": { extension: ".pdf", delivery: "attachment" },
  "text/plain": { extension: ".txt", delivery: "attachment" },
  "image/svg+xml": { extension: ".svg", delivery: "attachment" },
  "application/octet-stream": { extension: ".bin", delivery: "attachment" },
} as const;

export type CanonicalMediaMime = keyof typeof CANONICAL_MEDIA_PROFILES;
export type CanonicalMediaExtension =
  (typeof CANONICAL_MEDIA_PROFILES)[CanonicalMediaMime]["extension"];
export type CanonicalMediaDelivery =
  (typeof CANONICAL_MEDIA_PROFILES)[CanonicalMediaMime]["delivery"];
export type CanonicalMediaIdentity = {
  [Mime in CanonicalMediaMime]: Readonly<{
    mimeType: Mime;
    extension: (typeof CANONICAL_MEDIA_PROFILES)[Mime]["extension"];
    delivery: (typeof CANONICAL_MEDIA_PROFILES)[Mime]["delivery"];
  }>;
}[CanonicalMediaMime];

function validatePdf(bytes: Uint8Array): boolean {
  validate only the PDF header/version, at least one object/endobj envelope, and bounded
    startxref/%%EOF trailer shape;
  do not decode or match forbidden PDF names here;
}

const FORBIDDEN_PDF_STRUCTURE_NAMES = new Set([
  "JavaScript", "JS", "Launch", "OpenAction", "AA", "RichMedia",
  "EmbeddedFile", "AcroForm", "XFA", "Encrypt", "ObjStm",
]);

function hasInspectablePdfStructure(bytes: Uint8Array): boolean {
  body = Latin-1 decode complete bytes;
  scan PDF lexical tokens with one bounded forward cursor;
  skip whitespace and `%` comments;
  skip balanced literal strings, honoring backslash escapes; fail false if unclosed;
  distinguish `<<` dictionary delimiters from `<...>` hexadecimal strings, skip only a
    well-formed hex token, and fail false when such a token is unclosed/malformed;
  when `/` starts a PDF name token:
    read only until the next PDF whitespace/delimiter;
    decode valid `#HH` escapes inside that name token only;
    return false when the decoded exact structural name is in
      FORBIDDEN_PDF_STRUCTURE_NAMES;
  when the bare `stream` keyword is reached:
    require its PDF line ending and a bounded token-delimited `endstream`;
    skip the opaque payload without interpreting compressed page bytes as names;
    return false when the stream is unclosed/ambiguous;
  do not decode names found inside comments, literal strings, hex data, or stream bytes;
  return true;
}

export function canonicalizeMediaBytes(bytes: Uint8Array): CanonicalMediaIdentity | null {
  assert bytes are non-empty and within the caller-enforced cap;
  return null for conflicting/polyglot/truncated signatures;
  match the complete ordered binary-signature corpus;
  for a PDF signature, require validatePdf(bytes), hasInspectablePdfStructure(bytes),
    and the existing token-aware generic markup check before returning PDF identity;
    any false result returns null and L03 later maps it to media_mime_not_allowed;
  else classify a bounded standalone SVG root as image/svg+xml/.svg attachment only
    after rejecting script/event/DOCTYPE/entity/foreign-content and ambiguous extra-root
    markup according to the explicit active-SVG byte policy;
  else fatal-decode UTF-8 and accept text/plain/.txt attachment only when it has no
    NUL/disallowed controls and no HTML/XML/SVG/script markup grammar;
  else return application/octet-stream/.bin attachment as the only unknown identity;
  return the one canonical MIME, extension, and delivery identity, or null when the
    bytes cannot receive a safe canonical identity;
}

export function classifyCanonicalMediaPrefix(
  prefix: Uint8Array
): CanonicalMediaIdentity | null {
  // Delivery-only, non-authoritative classifier for fixed binary signatures.
  // Return an identity only when the complete signature bytes are present.
  // Never classify text, SVG, truncated input, or unknown data from a prefix.
}

export function buildMediaDeliveryPath(key: string): string {
  validate canonical relative key segments; encode each segment;
  return `/media/${encodedSegments.join("/")}`;
}

export function safeMediaDisposition(kind, originalName, extension): string {
  strip controls, bound length, build quoted ASCII fallback safely;
  return fixed inline/attachment token plus safe filename;
}
~~~

`CANONICAL_MEDIA_PROFILES` is the sole MIME→extension→delivery owner. Detection,
storage, delivery, disposition, and tests import this map/types; no consumer recreates a
switch/record. L03 imports the canonical MIME result when it applies effective upload
policy. Aliases such as `image/jpg` are deliberately absent
and normalize only by byte detection to the canonical `image/jpeg` member. Adding a MIME
requires changing this map and its round-trip/security corpus in the same task.

The canonicalizer must be deterministic and side-effect free. It must not use a file
suffix, caller Content-Type, browser API, DB, settings service, or storage adapter.
The full signature checks must be ordered so a shorter prefix cannot shadow a stricter
format. Text/SVG classification is byte-owned: the declared type can neither promote
unknown binary to text nor turn text/markup into a passive image. Markup inspection is
bounded and active content never receives inline delivery.

The recognized PDF profile is a deliberately conservative attachment-safe subset. It
rejects decoded-name variants of active forms (`/AcroForm`, `/XFA`), `/Encrypt`, and
`/ObjStm` before canonical identity is returned. `/ObjStm` is rejected because it can
hide the very action dictionaries the lexical scanner must inspect; encryption is
rejected because those dictionaries are not inspectable. A normal `/FlateDecode`
content stream without those structural carriers remains compatible. Structural names
inside literal strings, hexadecimal metadata, comments, or ordinary stream payloads are
data rather than PDF name tokens and do not trigger this check; malformed/unclosed
tokens or streams fail closed instead of being guessed through.

`hasInspectablePdfStructure` is the exclusive owner of forbidden PDF name matching.
`validatePdf` must not retain the former global `#HH` replacement or forbidden-name
regex, because that would reinterpret data inside strings/comments/streams as
structure and contradict the lexical contract.

`classifyCanonicalMediaPrefix` shares the same ordered binary-signature table; it is not
a second grammar and cannot admit an upload. TASK-536-02 may use it only to confirm that
a proxied object is the passive raster identity claimed by its DB row and canonical key.
Attachment-only delivery does not become inline when this helper returns `null`.

## Data flow and errors

Bytes flow into the pure detector and one immutable identity result. L02 transports that
identity to storage; L03 owns buffering, allowlists, persistence, and URL projection.
The declared MIME/name are never inputs to this helper's identity decision.

- Malformed, ambiguous, or forbidden active content returns `null`; this pure module
  neither reads upload policy nor creates a domain error. L03 alone maps that rejected
  identity and effective-policy rejection to `media_mime_not_allowed`.
- Unknown binary returns the canonical octet-stream identity without deciding whether a
  caller may upload it, but only after the complete byte sequence is proven free of the
  shared ambiguous-markup grammar. Invalid UTF-8 and control-bearing binary data do not
  bypass that check.
- Invalid delivery keys/names fail closed without embedding untrusted text in errors.

## Compatibility

No schema version, route, DB, runtime, or adapter change. Declared image aliases map to
one canonical identity. Synthetic/incomplete buffers are not a compatibility contract.
L02/L03 consume these exact exported names and shapes without mirrors.

## Regression-test shape

This leaf owns the shared pure corpus in
`tests/vitest/services/media-file-trust.test.ts` before its source gate, proving:

- every supported signature and strict UTF-8 text fixture maps to the exact canonical
  MIME/extension/disposition;
- the profile map has exactly the nine pinned keys/pairs above, aliases are absent, and
  every returned identity is a valid discriminated map member;
- byte-safe standalone SVG maps to attachment-only image/svg+xml, while
  HTML/XML/script-bearing or ambiguous markup fails closed; the shared grammar treats a
  solidus immediately after a tag name as a tag separator and applies to valid raster,
  PDF, invalid-UTF-8, control-bearing, and unknown-binary branches before any identity
  return; PDF-specific active-action checks remain additive rather than replacing the
  generic complete-byte grammar. The PDF pass is lexical-token-aware: dictionary openers
  and well-formed PDF hexadecimal strings (including UTF-16BE metadata beginning with a
  BOM) are not reclassified as markup, while generic tag grammar outside those tokens
  still fails closed;
- unknown binary maps to octet-stream/.bin attachment without consulting upload policy;
- declared type/name cannot change the result;
- mismatched, truncated, forbidden markup, and polyglot bytes return `null` without
  importing an adapter, service, route, DB, settings, or policy/error mapper; a benign
  structured raster fixture places its markup-shaped metadata beyond the former
  1024-byte inspection window so complete-byte inspection cannot regress to a prefix;
- a valid PDF fixture with a well-formed UTF-16BE hexadecimal metadata string remains the
  canonical PDF attachment, while the same structured PDF with generic markup outside a
  PDF lexical token is rejected;
- a benign compressed page-content stream remains canonical PDF, while compressed XFA,
  encrypted documents, and object streams fail closed even when their opaque bytes do
  not expose the forbidden marker lexically;
- positive controls place `/XFA`, `/Encrypt`, `/ObjStm`, and `#HH`-shaped spellings
  inside a balanced literal string, hexadecimal metadata, a comment, and a benign
  compressed stream and remain canonical PDF; the same decoded spellings as real PDF
  name tokens are rejected;
- buildMediaDeliveryPath rejects traversal/ambiguous keys and encodes canonical segments;
- delivery prefix classification confirms complete passive signatures, rejects truncated
  prefixes, and never promotes text/SVG/unknown data to inline;
- disposition helper cannot inject headers and produces deterministic bytes;

Adapter/storage-call assertions belong to TASK-536-01-L02. Upload/replace, effective
global/field allowlists, no-row/no-old-deletion, and unconditional service invocation
belong to TASK-536-01-L03. Anonymous/session/API-key/captcha reachability belongs to
TASK-536-04-L01. TASK-536-05-L01 may combine those already-gated seams additively but
cannot move them back into this Bun-free direct suite.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/services/mediaSchemas.test.ts \
  tests/vitest/services/media-file-trust.test.ts
~~~

Create the new suite before invoking it. TASK-536-05-L01 may add cross-layer corpus
cases and rerun it, but may not weaken or re-baseline this leaf's byte-identity proof.
Run a named failing file again in isolation before classifying it.

## Acceptance criteria

- Every supported byte profile has one canonical MIME/extension/delivery result.
- mediaFileTrust.ts imports no Bun, DB, settings, or runtime module.
- The pure canonicalizer performs no allowlist authorization and emits no domain error.
- No declaration/name fallback exists when byte detection fails.
