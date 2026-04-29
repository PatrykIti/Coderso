# TASK-237-03: Video Embed Host Validation
# FileName: TASK-237-03_Video_Embed_Host_Validation.md

**Priority:** High
**Category:** Security + Posts Runtime
**Estimated Effort:** Medium
**Dependencies:** TASK-237
**Status:** To Do

---

## Overview

Fix CodeQL `js/incomplete-url-substring-sanitization` alerts 17 and 18 by
replacing duplicated substring host checks in YouTube embed parsing.

The current `host.includes("youtube.com")` and `host.includes("youtu.be")`
checks can trust attacker-controlled domains that merely contain those strings.
Runtime rendering and admin preview must use the same exact parser.

## File Inventory

| File | Lines | Current Issue | Required Change |
|------|-------|---------------|-----------------|
| `core/services/posts/runtime/postBlockRuntimeMapper.ts` | 103-116 | Runtime parser trusts substring host matches. | Replace with shared pure helper using exact host/subdomain checks. |
| `core/admin/ui/posts/editor/PostEditorCanvas.tsx` | 152-165 | Editor preview duplicates the same unsafe parser. | Import the shared helper instead of duplicating parser logic. |
| `tests/vitest/posts/post-block-runtime-renderer.test.tsx` | 160-185 | Existing positive YouTube coverage only. | Add malicious host negatives and keep positive watch/shorts/embed cases. |
| `tests/vitest/ui-integration/post-editor-canvas-shared.test.tsx` | 184-235 | Existing editor preview coverage only checks valid YouTube. | Add malicious host negatives for admin preview. |

## Sub-Tasks

- [ ] Create or extend a Bun-free posts helper module for video embed URL
  parsing, for example `core/services/posts/shared/videoEmbed.ts`.
- [ ] Implement `isHostOrSubdomain(host, rootHost)` with exact lowercased host
  comparison and a dot-boundary suffix check.
- [ ] Accept only:
  - `youtube.com` and subdomains such as `www.youtube.com`,
  - exact `youtu.be`,
  - the existing supported path forms: `/watch?v=...`, `/shorts/:id`,
    `/embed/:id`, and `youtu.be/:id`.
- [ ] Reject lookalikes such as `youtube.com.evil.test`,
  `notyoutube.com`, `evil-youtu.be.test`, and arbitrary hosts containing the
  trusted string.
- [ ] Replace both existing `parseYoutubeId` implementations with the shared
  helper.

## Implementation Pseudocode

Shared helper module shape:

```ts
const isHostOrSubdomain = (host: string, rootHost: string) => {
  const normalizedHost = host.toLowerCase();
  const normalizedRoot = rootHost.toLowerCase();

  return (
    normalizedHost === normalizedRoot ||
    normalizedHost.endsWith(`.${normalizedRoot}`)
  );
};

const readFirstPathSegment = (pathname: string) =>
  pathname.split("/").filter(Boolean)[0] ?? "";

export const parseYoutubeVideoId = (value: string): string | null => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();

  if (isHostOrSubdomain(host, "youtube.com")) {
    if (url.pathname === "/watch") return url.searchParams.get("v");
    if (url.pathname.startsWith("/shorts/")) return readFirstPathSegment(url.pathname.slice(8));
    if (url.pathname.startsWith("/embed/")) return readFirstPathSegment(url.pathname.slice(7));
    return null;
  }

  if (host === "youtu.be") {
    return readFirstPathSegment(url.pathname);
  }

  return null;
};

export const toYoutubeEmbedUrl = (value: string): string | null => {
  const id = parseYoutubeVideoId(value);
  return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
};
```

Runtime/editor replacement shape:

```ts
// postBlockRuntimeMapper.ts
import { toYoutubeEmbedUrl } from "../shared/videoEmbed";

const resolveVideoEmbedUrl = (attrs) => {
  if (attrs.provider !== "youtube") return null;
  return toYoutubeEmbedUrl(String(attrs.url ?? ""));
};

// PostEditorCanvas.tsx
import { toYoutubeEmbedUrl } from "../../../../services/posts/shared/videoEmbed";

const previewUrl = provider === "youtube" ? toYoutubeEmbedUrl(safeUrl) : null;
```

Regression-test shape:

```ts
test("youtube embed parser rejects substring lookalike hosts", () => {
  expect(toYoutubeEmbedUrl("https://youtube.com.evil.test/watch?v=abc")).toBeNull();
  expect(toYoutubeEmbedUrl("https://notyoutube.com/watch?v=abc")).toBeNull();
  expect(toYoutubeEmbedUrl("https://evil-youtu.be.test/abc")).toBeNull();
});

test("youtube embed parser keeps supported trusted hosts", () => {
  expect(toYoutubeEmbedUrl("https://youtube.com/watch?v=abc"))
    .toBe("https://www.youtube.com/embed/abc");
  expect(toYoutubeEmbedUrl("https://www.youtube.com/shorts/short-id"))
    .toBe("https://www.youtube.com/embed/short-id");
  expect(toYoutubeEmbedUrl("https://youtu.be/short-id"))
    .toBe("https://www.youtube.com/embed/short-id");
});
```

## Security Contract

- Visibility: public post runtime rendering plus internal admin preview.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: unsupported video hosts resolve to the existing
  fallback/null embed behavior, not to trusted embed URLs.
- Anti-abuse: trusted-provider checks must be exact host/subdomain checks, not
  substring checks.
- Secret handling: no secrets involved.

## Testing Requirements

```bash
bun run test:vitest -- tests/vitest/posts/post-block-runtime-renderer.test.tsx
bun run test:vitest -- tests/vitest/ui-integration/post-editor-canvas-shared.test.tsx
bun run test:vitest -- tests/vitest/ui/post-editor-canvas-wave.test.tsx
git diff --check
```

Run the wave suite if the shared helper changes editor preview output, fallback
copy, or provider-specific URL handling.

## Documentation Updates Required

- `_docs/_TASKS/TASK-237_GitHub_CodeQL_Security_Findings_Remediation.md`
- Changelog entry on TASK-237 closure.

## Acceptance Criteria

1. CodeQL alerts 17 and 18 are addressed.
2. Runtime and editor preview use one shared URL parsing contract.
3. Trusted YouTube URLs still render expected embed URLs.
4. Lookalike or substring-only hosts do not render as trusted embeds.
