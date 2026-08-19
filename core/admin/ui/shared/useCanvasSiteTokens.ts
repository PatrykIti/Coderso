import { useEffect, useMemo, useState } from "react";

import { cacheKeys } from "@/services/cachePolicy";
import { getCachedSettings, getSettingsCached } from "@/services/settingsClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import {
  DEFAULT_TOKENS,
  type DesignTokenOverrides,
  type DesignTokens,
} from "../../../services/theme/tokenTypes";
import { mergeTokens } from "../../../services/theme/tokenUtils";
import { assertTokenOverrides } from "../../../services/theme/tokenValidation";

/**
 * Shared canvas site-token/setting hooks (TASK-502-04, extracted VERBATIM in
 * behavior from `PageEditor.tsx`). The Page V2 editor canvas and the Menu
 * Design editor canvas both need the SAME live site design tokens (so
 * `var(--color-*)`/`var(--text-*)` resolve to the SITE theme, not the admin
 * shell's leaked variables) — and the menu editor additionally needs the site
 * `site.name` for the brand fallback chain, from the SAME settings payload
 * (no second fetch path). PageEditor imports `useCanvasSiteTokens` from here
 * with ZERO behavior change (same cached-first hydrate → one background
 * revalidate → cache-bus subscription → `mergeTokens(DEFAULT_TOKENS, …)`).
 */

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/**
 * Site token overrides stored under `design.tokens` in the admin settings
 * payload (the route returns the server-resolved token set). Anything that is
 * not a valid token-override record fails closed to `null` so the canvas
 * anchors on `DEFAULT_TOKENS` — never on a guessed shape.
 */
const readSiteDesignTokenOverrides = (
  settings: Record<string, unknown> | null
): DesignTokenOverrides | null => {
  const value = settings?.["design.tokens"];
  if (!isPlainRecord(value)) return null;
  try {
    assertTokenOverrides(value);
    return value;
  } catch {
    return null;
  }
};

/**
 * Settings state shared by the token map AND the menu brand chain: cached
 * settings hydrate first, one background fetch revalidates, and settings
 * cache-bus updates keep it in sync. With nothing cached the state is `null`
 * (consumers fall back to `DEFAULT_TOKENS` / the "Site name" placeholder).
 * Errors are swallowed (offline/unauthorized ⇒ the anchor), exactly as the
 * original PageEditor hook did.
 */
export const useCanvasSiteSettings = (): Record<string, unknown> | null => {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(() =>
    getCachedSettings()
  );

  useEffect(() => {
    let active = true;
    void getSettingsCached({ force: true })
      .then((payload) => {
        if (active) setSettings(payload);
      })
      .catch(() => {
        // Offline/unauthorized: the canvas keeps the DEFAULT_TOKENS anchor.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.settingsRedacted) return;
      // The redacted settings cache NEVER carries `design.tokens`, so a
      // settings save must re-read the FULL payload (background revalidation,
      // same as AdminApp.refreshSettings) or the canvas would fall back to
      // DEFAULT_TOKENS instead of repainting with the new site palette.
      void getSettingsCached({ force: true })
        .then((payload) => {
          if (active) setSettings(payload);
        })
        .catch(() => {
          const cached = getCachedSettings();
          if (active && cached) setSettings(cached);
        });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return settings;
};

/**
 * WYSIWYG anchor for the canvas (phase2 smoke anomaly #2): the admin shell
 * paints its OWN `--text-*`/`--font-*` admin-theme variables on `:root`, so a
 * canvas heading using `var(--text-sm, <fallback>)` would resolve the ADMIN
 * typography scale instead of the site's — drifting from the published front.
 * The canvas frame therefore re-paints the site typography token variables
 * (the exact map `toCssVariables` emits on the front `:root`) inline. With
 * nothing cached the frame carries the `DEFAULT_TOKENS` values — the documented
 * `var()` fallbacks.
 */
export const useCanvasSiteTokens = (): DesignTokens => {
  const settings = useCanvasSiteSettings();
  return useMemo(
    () => mergeTokens(DEFAULT_TOKENS, readSiteDesignTokenOverrides(settings)),
    [settings]
  );
};

/**
 * `site.name` from the same settings payload; trimmed, `null` when unset or
 * non-string. The menu brand fallback chain reads it (per-menu override →
 * site name → placeholder) so the canvas matches the published front, which
 * reads the same setting. Read-only display data already visible to any admin.
 */
export const useCanvasSiteName = (): string | null => {
  const settings = useCanvasSiteSettings();
  return useMemo(() => {
    const raw = settings?.["site.name"];
    const text = typeof raw === "string" ? raw.trim() : "";
    return text.length > 0 ? text : null;
  }, [settings]);
};
