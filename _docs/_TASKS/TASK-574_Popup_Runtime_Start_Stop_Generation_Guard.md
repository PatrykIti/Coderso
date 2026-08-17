# TASK-574: Popup Runtime Start/Stop Generation Guard

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Changelog:** 1296 (pinned)
**Priority:** Medium
**Size:** Medium

# FileName: TASK-574_Popup_Runtime_Start_Stop_Generation_Guard.md

**Parent Task:** none
**Source Findings:** M-486-01 (audit `_TMP-audit-task-486-popups.md`, verified at HEAD `4e3dab15`)

## Purpose

`popupRuntime.start()` sets `started = true` and then awaits
`deps.fetchPopups()`. `stop()` clears only currently-existing disposers and
resets the flag. On SPA navigation the host runs the declared `stop(); start()`
sequence; a stale in-flight fetch from the previous path can resolve after the
new start and arm watchers for the old path. A popup targeted at the previous
page can appear on the new page, and duplicate listeners are possible. The
current navigation test waits for the first start to finish, so it never
exercises the race with a deferred promise.

## Evidence

- `core/services/popups/runtime/popupRuntime.ts:35-74` — `start()` sets flag
  then awaits fetch (`:45-56`); `stop()` clears disposers only (`:35-43`);
  watcher arming at `:58-70`; host contract `:14-17`.
- Existing navigation test does not cover the deferred-promise race.

## Scope

- Add a monotonic generation (or AbortController) incremented on every
  `start()` and `stop()`; after `await fetchPopups`, verify the token is still
  current and the runtime is still started before creating disposers.
- Add a test: (1) hold the first fetch on a controlled deferred promise, (2) run
  `stop(); start()` for another path, (3) resolve the first promise, (4) assert
  its `watchTrigger` was NOT created and only the new path has an active watcher.

## Fix Strategy

Keep the existing early `started` guard, the `shouldShowPopup` frequency-gate
filter, and the fire-time recheck callback; add ONLY the generation token and
the stale check around the existing arming loop:

```ts
private generation = 0;
async start() {
  if (this.started) return; // keep existing concurrent-start guard
  const gen = ++this.generation;
  this.started = true;
  try {
    const popups = await this.deps.fetchPopups();
    if (gen !== this.generation || !this.started) return; // stale
    this.disposers = popups
      .filter((p) => shouldShowPopup(p, this.env)) // keep frequency gate
      .map((p) => this.watchTrigger(p.trigger, this.env, (shown) => {
        // fire-time recheck callback (existing behavior)
      }));
  } catch {
    // keep swallow-and-retry behavior; only reset when THIS generation is stale
    if (gen === this.generation) this.started = false;
  }
}
stop() {
  this.generation++;
  this.started = false;
  this.disposeAll();
}
```

- `watchTrigger(p)` in the original pseudocode is an abstraction of the real
  `watchTrigger(popup.trigger, env, cb)` signature — implement against the real
  one.
- The stale fetch-rejection path must NOT clear a newer start's latch: only
  reset `started` when `gen === this.generation` (keep the existing 'fetch
  rejection' tests' behavior).

## Security Contract

- No endpoint change; runtime-only. Targeting remains server-authoritative; no
  new public write surface.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Vitest `popup-runtime.test.ts` extended with the deferred-promise race case.

## Notes

- M-486-01 is a real SPA-lifecycle regression for the declared contract.
