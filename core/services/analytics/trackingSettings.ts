// Analytics tracking settings accessor (TASK-483-03-L02).
//
// Thin read-through over the global `analytics.trackingEnabled` setting owned by
// settingsService (DEFAULT_SETTINGS, reject-unknown ALLOWED_KEYS). The public
// site render path calls `isAnalyticsTrackingEnabled()` to decide whether to
// inject the tracking snippet at all. DNT/GPC and preview exclusion are handled
// separately (client-side + render layer); this gate is the global on/off.

import { getSetting } from "../settings/settingsService";

export async function isAnalyticsTrackingEnabled(): Promise<boolean> {
  return Boolean(await getSetting("analytics.trackingEnabled"));
}
