import type { Popup, PopupFrequency, PopupSettings, PopupTrigger } from "./popupTypes";

/**
 * Public popup DTO and targeting/audience matcher (TASK-486-01-L01).
 *
 * This module is the single PII gate between the popup domain model and the
 * public site. `toPublicPopup` projects only render + client-decision fields;
 * authoring-only fields (name, status, targeting, timestamps) and the internal
 * `content.templateId` are never shipped to the client. The matchers are pure
 * and total: they return a boolean and never throw.
 */

export type PublicPopupContent = {
  title: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

export type PublicPopup = {
  id: string;
  slug: string;
  trigger: PopupTrigger;
  frequency: PopupFrequency;
  content: PublicPopupContent; // templateId stripped
  settings: PopupSettings;
};

// PII gate: drop name/status/targeting/timestamps AND the internal
// `content.templateId` (admin render-template id, useless to the client and
// must not leak). Never spread `p.content` wholesale — the real PopupContent
// carries templateId.
export const toPublicPopup = (p: Popup): PublicPopup => ({
  id: p.id,
  slug: p.slug,
  trigger: p.trigger,
  frequency: p.frequency,
  content: {
    title: p.content.title,
    body: p.content.body,
    ctaLabel: p.content.ctaLabel,
    ctaHref: p.content.ctaHref,
  },
  settings: p.settings,
});

// Path matching: include = "match any" (empty include ⇒ all paths);
// exclude wins. Support trailing "/*" prefix globs + exact match.
const pathMatches = (pattern: string, path: string): boolean => {
  if (pattern.endsWith("/*")) {
    return (
      path === pattern.slice(0, -2) || path.startsWith(pattern.slice(0, -1)) // "/blog/*" ⇒ "/blog" or "/blog/..."
    );
  }
  return pattern === path;
};

export const matchPopupTargeting = (targeting: Popup["targeting"], path: string): boolean => {
  if (targeting.excludePaths.some((p) => pathMatches(p, path))) return false;
  if (targeting.includePaths.length === 0) return true;
  return targeting.includePaths.some((p) => pathMatches(p, path));
};

export const matchPopupAudience = (
  audience: Popup["targeting"]["audience"],
  isLoggedIn: boolean
): boolean =>
  audience === "all" ||
  (audience === "logged_in" && isLoggedIn) ||
  (audience === "logged_out" && !isLoggedIn);

export const matchPopupRequest = (
  popup: Popup,
  req: { path: string; isLoggedIn: boolean }
): boolean =>
  matchPopupTargeting(popup.targeting, req.path) &&
  matchPopupAudience(popup.targeting.audience, req.isLoggedIn);

// The schema is OWNED here (domain/service contract module per AGENTS.md);
// core/server/validation/popupSchemas.ts only re-exports it. Routes import
// via that popupSchemas re-export (see TASK-486-01-L03).
export const popupPublicQuerySchema = {
  type: "object",
  required: ["path"],
  properties: { path: { type: "string", minLength: 1, maxLength: 500 } },
  additionalProperties: false,
} as const;
