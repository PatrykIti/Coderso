/**
 * Public `<head>` analytics tag helpers (TASK-491-01-L02).
 *
 * Owns the GA4 head-tag contract for the public site render path: the
 * fail-closed resolution of the live GA snippet (never throws; returns null
 * when the integration is absent or resolution fails, so the renderer emits no
 * tag) and the shared live-analytics script builder used by every public
 * render. Preview/token render paths never resolve the head snippet, so
 * preview traffic stays tag-free.
 */
import { resolvePublicAnalyticsHead } from "../services/integrations/analyticsRuntime";
import { buildLiveAnalyticsScriptHtml } from "./publicSitePageRuntime";

export { buildLiveAnalyticsScriptHtml };

/**
 * Resolve the GA4 head snippet once per PUBLIC request. Preview/token render
 * paths must not call this, keeping preview traffic tag-free.
 */
export const resolvePublicAnalyticsHeadSnippet = async (): Promise<string | null> => {
  try {
    return await resolvePublicAnalyticsHead();
  } catch {
    // Log only the allowlisted code, never the error object: it can carry
    // decrypted config, URLs, or error internals. Fail closed, no tag.
    console.warn("analytics_head_resolution_failed");
    return null;
  }
};
