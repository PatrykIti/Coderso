// core/server/publicEntryGateUi.tsx
// TASK-517 entry-visibility public-front seams, extracted from
// core/server/publicSite.tsx (repo line-limit gate): password-prompt/unlock
// rendering, visibility-gate helpers, the shared content:read auth seam, and
// the gated-route cache probe. No JSX here; .tsx keeps the naming symmetric
// with the publicSite render host.
import { renderPublicPasswordPromptHtml } from "../site/renderPublicEntry";
import { hashEntryCookieId, verifyEntryUnlockToken } from "../services/content/entryUnlockToken";
import {
  getEntryVisibilityById,
  getEntryVisibilityBySlug,
} from "../services/content/entryReadService";
import { getContentTypeBySlug } from "../services/content/typeService";
import {
  resolveEntryVisibilityGate,
  type EntryGateDecision,
} from "../services/content/entryVisibilityGate";
import type { ContentRouteMatch } from "../site/contentRouteMatcher";
import type { ContentRouteSetting } from "../services/settings/settingsContracts";
import type { DeviceTarget } from "../services/renderContracts/tokens";
import { attachUserFromSession, type AuthContext } from "./middleware/auth";
import { getUserPermissions, hasPermission } from "../services/auth/roleService";
import { resolvePublicStyles } from "./publicSiteAssets";

export type RenderEntryDetailOptions = {
  preview?: boolean;
  previewDevice?: DeviceTarget;
  themeName?: string;
  preferGenericEntry?: boolean;
  routeParam?: "slug" | "id";
  detailPageId?: string | null;
  contentRoutes?: ContentRouteSetting[];
  runtimeSearchParams?: URLSearchParams;
  requestPath?: string | null;
  requestOrigin?: string | null;
  /** Authenticated admin/editor render context (content:read) — bypasses the visibility gate. */
  isAuthenticated?: boolean;
  /** Per-entry HMAC unlock verification (TASK-517-02). */
  unlockContext?: { hasValidUnlockFor: (entryId: string) => boolean };
  /** Pre-rendered analytics head snippet (TASK-491) passed through to the render host. */
  analyticsHeadSnippet?: string | null;
};

// Cookie/header helpers. These are module-local copies mirroring the private
// ones in httpServer.ts / publicFormsApi.ts / publicBookingApi.ts — those are
// NOT exported, so a canonical export cannot be imported without widening the
// non-517 ownership of those files.
export const parseCookies = (header: string | null) => {
  if (!header) return {} as Record<string, string>;
  const cookies: Record<string, string> = {};
  for (const entry of header.split(";")) {
    const chunk = entry.trim();
    if (!chunk) continue;
    const splitIndex = chunk.indexOf("=");
    if (splitIndex <= 0) continue;
    const key = chunk.slice(0, splitIndex).trim();
    const rawValue = chunk.slice(splitIndex + 1).trim();
    try {
      cookies[key] = decodeURIComponent(rawValue);
    } catch {
      cookies[key] = rawValue;
    }
  }
  return cookies;
};

export const buildHeadersRecord = (req: Request) => {
  const headers: Record<string, string | undefined> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
};

// ── SHARED AUTH SEAM (TASK-517-01-L03/L05) ────────────────────────────────────
// Resolves the session→content:read boolean plus the cookie record ONCE, hoisted
// above the routeTarget branches so both the detail call site and the LIST call
// site read the same in-scope values. The bypass is PERMISSION-bounded
// (content:read), NOT bare Boolean(user) — attachUserFromSession applies no role
// check. The cookies are returned for the unlock context (TASK-517-02).
export async function resolveEntryRequestAuth(
  req: Request
): Promise<{ isAuthenticated: boolean; cookies: Record<string, string> }> {
  const cookies = parseCookies(req.headers.get("cookie") ?? "");
  const authCtx: AuthContext = { headers: buildHeadersRecord(req), cookies };
  await attachUserFromSession(authCtx);
  let isAuthenticated = false;
  if (authCtx.user) {
    const perms = await getUserPermissions(authCtx.user.id);
    isAuthenticated = hasPermission(perms, "content:read");
  }
  return { isAuthenticated, cookies };
}

// Small local helper for the generic-branch visibility gate (covers the
// linked-detail-page AND default-generic sub-branches off one resolved entry).
export const gateOrNull = (
  entry: { id: string; visibility?: string | null; hasPassword?: boolean },
  opts?: RenderEntryDetailOptions
): EntryGateDecision =>
  resolveEntryVisibilityGate({
    visibility: entry.visibility,
    hasPassword: Boolean(entry.hasPassword),
    isAuthenticated: Boolean(opts?.preview || opts?.isAuthenticated), // preview == authorized
    hasValidUnlock: Boolean(opts?.unlockContext?.hasValidUnlockFor?.(entry.id)),
  });

export async function renderEntryPasswordPromptResult(
  entry: { id: string; slug: string; title?: string | null },
  options?: RenderEntryDetailOptions,
  requestPath?: string | null
): Promise<{ html: string; cacheable: boolean } | null> {
  const { inlineCss, cssHref, devModuleScripts } = await resolvePublicStyles();
  const actionUrl = `/entries/${encodeURIComponent(entry.id)}/unlock`;
  const html = renderPublicPasswordPromptHtml({
    title: entry.title ?? "Protected content",
    inlineCss,
    cssHref,
    devModuleScripts,
    themeName: options?.themeName,
    actionUrl,
    returnPath: requestPath ?? "/", // same-origin; validated by the unlock endpoint
  });
  // GATED — must never be shared-cached (517-03 also skips the cache READ).
  return { html, cacheable: false };
}

export function buildEntryUnlockContext(cookies: Record<string, string>): {
  hasValidUnlockFor: (entryId: string) => boolean;
} {
  return {
    hasValidUnlockFor(entryId: string): boolean {
      const token = cookies[`entry_unlock_${hashEntryCookieId(entryId)}`];
      return verifyEntryUnlockToken(entryId, token); // boolean; tamper/expiry/cross-entry → false
    },
  };
}

// TASK-517-01-L05 list filter: anonymous list bodies never enumerate
// private/password entries (no existence leak); the content:read session sees
// the full list (bypass parity with the detail gate). Callers filter BEFORE
// pagination so pager counts reflect the visible set.
export const filterVisibleEntries = <T extends { visibility?: string | null }>(
  listed: T[],
  isAuthenticated?: boolean
): T[] => (isAuthenticated ? listed : listed.filter((entry) => entry.visibility === "public"));

// ── TASK-517-03: canonical gated-route probe for the shared HTML cache ────────
// Auth-independent and memoization-FREE (a memoized "public" verdict would go
// stale on a visibility mutation → fail-open). Only `detail` matches pay this
// bounded single-entry read; list/homepage/static matches short-circuit to
// false and keep their caches. The probe uses the TASK-573 narrow reads
// (id/visibility only, no joins, no SEO/taxonomy/author/data/email columns) and
// NEVER reads accessPassword.
export const entryRouteIsGated = async (match: ContentRouteMatch): Promise<boolean> => {
  let visibility: string | null | undefined;
  if (match.params.id) {
    const entry = await getEntryVisibilityById(match.params.id);
    visibility = entry?.visibility;
  } else if (match.params.slug) {
    const contentType = await getContentTypeBySlug(match.type);
    if (!contentType) return false;
    // Entry slugs are unique only per type — keep the (typeId, slug) scope.
    const entry = await getEntryVisibilityBySlug(contentType.id, match.params.slug);
    visibility = entry?.visibility;
  }
  return visibility === "private" || visibility === "password";
};
