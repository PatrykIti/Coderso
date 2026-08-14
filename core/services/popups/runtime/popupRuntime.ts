import type { PublicPopup } from "../popupPublicContract";
import { watchTrigger, type TriggerEnv } from "./triggerWatchers";
import { shouldShowPopup, recordPopupShown, type FrequencyEnv } from "./frequencyGate";

/**
 * PopupRuntime orchestrates the client-side popup lifecycle (TASK-486-02-L03).
 *
 * Given a `fetchPopups()` source (the `GET /api/popups` endpoint from
 * TASK-486-01-L03) and the env adapters from TASK-486-02-L01/L02, `start()`
 * resolves the popups for the current location, arms each popup's trigger
 * through the frequency gate, and calls `deps.render(popup)` exactly once per
 * popup, then records the show and disposes that popup's watcher.
 *
 * Targeting/audience is server-authoritative: the `PublicPopup` DTO omits
 * `targeting`, so the client cannot and does not re-filter. On SPA navigation
 * the host calls `stop()` then `start()`, which re-fetches
 * `/api/popups?path=<new path>` for the new location.
 *
 * All browser globals and storage access live behind the injected envs, so this
 * module stays pure and serializable into the runtime IIFE (TASK-486-03-L02).
 */

export type PopupRuntimeDeps = {
  currentPath: () => string;
  fetchPopups: (path: string) => Promise<PublicPopup[]>;
  triggerEnv: TriggerEnv;
  frequencyEnv: FrequencyEnv;
  render: (popup: PublicPopup) => void; // TASK-486-03-L01
};

export function createPopupRuntime(deps: PopupRuntimeDeps) {
  let disposers: Array<() => void> = [];
  let started = false;

  const stop = () => {
    disposers.forEach((d) => d());
    disposers = [];
    // Reset so a subsequent start() re-fetches for the new SPA location. The
    // `started` flag only guards against duplicate concurrent starts while a
    // fetch is in flight; it must not permanently latch the runtime, otherwise
    // the documented stop()/start() re-targeting flow would silently no-op.
    started = false;
  };

  const start = async () => {
    if (started) return;
    started = true;
    let popups: PublicPopup[] = [];
    try {
      popups = await deps.fetchPopups(deps.currentPath());
    } catch {
      // A failed fetch silently no-ops (page never breaks). Reset the latch so
      // the host may retry without being wedged by one transient failure.
      started = false;
      return;
    }

    for (const popup of popups) {
      // server already targeted by path + audience; the DTO carries no
      // `targeting`, so there is nothing to re-filter here. SPA nav re-fetches
      // `/api/popups` (via stop()/start()) to re-target for the new path.
      if (!shouldShowPopup(popup.id, popup.frequency, deps.frequencyEnv)) continue;
      const dispose = watchTrigger(popup.trigger, deps.triggerEnv, () => {
        // re-check at fire time (cooldown may have elapsed/another popup shown)
        if (!shouldShowPopup(popup.id, popup.frequency, deps.frequencyEnv)) return;
        deps.render(popup);
        recordPopupShown(popup.id, deps.frequencyEnv);
        dispose();
      });
      disposers.push(dispose);
    }
  };

  return { start, stop };
}
