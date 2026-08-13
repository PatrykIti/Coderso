import type { PopupFrequency } from "../popupTypes";

/**
 * FrequencyGate decides whether a popup may fire given its last-shown record and
 * a `PopupFrequency` strategy, and records the show. All storage access is
 * injected through `env`, so this module stays pure, DOM/storage-agnostic, and
 * serializable into the runtime IIFE (TASK-486-03-L02). A missing or throwing
 * storage degrades to "allow" (private mode) but never throws into the runtime.
 */

export type ShownRecord = { lastShownMs: number; sessionId: string } | null;

export type FrequencyEnv = {
  now: () => number;
  sessionId: string; // per-tab/session id (stable within session)
  getRecord: (popupId: string) => ShownRecord;
  setRecord: (popupId: string, rec: { lastShownMs: number; sessionId: string }) => void;
};

export const sameUtcDay = (a: number, b: number) =>
  new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);

export function shouldShowPopup(
  popupId: string,
  frequency: PopupFrequency,
  env: FrequencyEnv
): boolean {
  let rec: ShownRecord = null;
  try {
    rec = env.getRecord(popupId);
  } catch {
    rec = null; // private mode safe
  }

  const now = env.now();
  if (rec) {
    // cooldown gap applies under every strategy
    if (frequency.cooldownMinutes != null) {
      if (now - rec.lastShownMs < frequency.cooldownMinutes * 60_000) return false;
    }
    if (frequency.strategy === "session_once" && rec.sessionId === env.sessionId) return false;
    if (frequency.strategy === "daily_once" && sameUtcDay(rec.lastShownMs, now)) return false;
  }
  return true;
}

export function recordPopupShown(popupId: string, env: FrequencyEnv): void {
  try {
    env.setRecord(popupId, { lastShownMs: env.now(), sessionId: env.sessionId });
  } catch {
    // storage blocked ⇒ no-op (popup may re-show; acceptable)
  }
}
