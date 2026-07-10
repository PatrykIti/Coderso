# TASK-540-05-L02: Scope Screen Preferences Through User Settings

# FileName: TASK-540-05-L02-Scope-Screen-Preferences-Through-User-Settings.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-05
**Priority:** Medium
**Category:** User Settings / Custom Screens / Privacy
**Estimated Effort:** Medium
**Dependencies:** TASK-540-05-L01
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/services/settings/userSettingsService.ts`
- new Bun-free `core/services/settings/screenEntryPreferencesContract.ts`
- `core/admin/services/userSettingsClient.ts`
- `core/admin/ui/custom-screens/hooks/useScreenEntryPreferences.ts`
- compatibility-expectation updates required before this source gate in
  `tests/unit/settings/userSettingsService.test.ts`,
  `tests/vitest/admin/userSettingsClient.test.ts`,
  `tests/vitest/ui/use-screen-entry-preferences.test.ts`, and
  `tests/integration/routes/userSettings.test.ts`

No route source or DB schema edit is needed. Update the named behavior tests before this
leaf's gate; TASK-540-06 owns docs and only aggregate test additions.

## Grounded anchors

- Service key/value map, defaults, allowlist, validator:
  `userSettingsService.ts:33-80,99-260`.
- DB rows are already scoped by `userId`: `:263-320`.
- Client typed map/cache/write: `userSettingsClient.ts:12-24,31-85`.
- Current global localStorage-only hook:
  `useScreenEntryPreferences.ts:3-77`.
- Existing self-scoped routes: `userSettingsRoutes.ts:33-56` and
  strict envelope `settingsSchemas.ts:16-23`.

## Implementation Pseudocode

Use the key `customScreens.entry.preferences`. The new Bun-free contract module owns the
stored/view shapes, defaults, validation, and conversion without importing DB/admin code:

```ts
export type ScreenEntryPreferencesSettingValue = {
  version: 1;
  showFieldMetadata: boolean;
};

export type ScreenEntryPreferences = {
  showFieldMetadata: boolean;
};

export const DEFAULT_SCREEN_ENTRY_PREFERENCES: ScreenEntryPreferences = {
  showFieldMetadata: false,
};

export const DEFAULT_SCREEN_ENTRY_PREFERENCES_SETTING = {
  version: 1,
  showFieldMetadata: false,
} as const;

export function normalizeScreenEntryPreferencesSetting(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("user_settings_value_invalid");
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(
    (key) => key !== "version" && key !== "showFieldMetadata"
  )) {
    throw new Error("user_settings_value_invalid");
  }
  if (record.version !== 1 || typeof record.showFieldMetadata !== "boolean") {
    throw new Error("user_settings_value_invalid");
  }
  return { version: 1, showFieldMetadata: record.showFieldMetadata };
}

export function toScreenEntryPreferencesView(
  value: ScreenEntryPreferencesSettingValue
): ScreenEntryPreferences {
  return { showFieldMetadata: value.showFieldMetadata };
}

export function toScreenEntryPreferencesSetting(
  value: ScreenEntryPreferences
): ScreenEntryPreferencesSettingValue {
  return { version: 1, showFieldMetadata: value.showFieldMetadata };
}

// userSettingsClient.ts: these exact self-scoped transports never inspect, merge,
// invalidate, or populate the process-global aggregate userSettingsReadCache.
export async function getUserSettingIsolated<K extends keyof UserSettings>(
  key: K
): Promise<{ key: K; value: UserSettings[K] }> {
  return apiRequest<{ key: K; value: UserSettings[K] }>(
    `/user-settings/${encodeURIComponent(key)}`,
    { method: "GET" }
  );
}

export async function setUserSettingIsolated<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
): Promise<{ key: K; value: UserSettings[K] }> {
  return apiRequest<{ key: K; value: UserSettings[K] }>(
    `/user-settings/${encodeURIComponent(key)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    },
    { withCsrf: true }
  );
}

type ScopedPreferenceView = {
  userId: string | null;
  value: ScreenEntryPreferences;
};

export function useScreenEntryPreferences() {
  const { user } = useAdminAuth();
  const userId = user?.id ?? null;
  const [hydrated, setHydrated] = useState<ScopedPreferenceView | null>(null);
  const [optimistic, setOptimistic] = useState<ScopedPreferenceView | null>(null);
  const requestGeneration = useRef(0);
  const preferences = optimistic?.userId === userId
    ? optimistic.value
    : hydrated?.userId === userId
      ? hydrated.value
      : DEFAULT_SCREEN_ENTRY_PREFERENCES; // render derivation hides prior identity

  useEffect(() => {
    const generation = ++requestGeneration.current;
    let active = true;
    if (!userId) return () => { active = false; }; // no synchronous effect setState
    void getUserSettingIsolated("customScreens.entry.preferences")
      .then(({ value }) => {
        if (active && requestGeneration.current === generation) {
          setHydrated({ userId, value: toScreenEntryPreferencesView(value) });
        }
      })
      .catch(() => undefined); // authenticated-service unavailable => in-memory default
    return () => { active = false; };
  }, [userId]);

  const setPreferences = useCallback((next: ScreenEntryPreferences) => {
    const normalized: ScreenEntryPreferences = {
      showFieldMetadata: Boolean(next.showFieldMetadata),
    };
    ++requestGeneration.current; // invalidate any older hydration before local commit
    setOptimistic({ userId, value: normalized });
    if (!userId) return;
    void setUserSettingIsolated(
      "customScreens.entry.preferences",
      toScreenEntryPreferencesSetting(normalized)
    )
      .catch(() => { /* keep usable session state; no unhandled rejection */ });
  }, [userId]);
  return { preferences, setPreferences };
}
```

The PATCH helper uses the same explicit `apiRequest<{ key: K; value:
UserSettings[K] }>` generic as GET. `userSettingsService.ts`, `UserSettings`, and the hook
import these exact types/helpers; the hook re-exports its pre-existing public view type,
default, and normalizer names from the Bun-free owner where needed for source compatibility.
No `JSON_HEADERS`, `DEFAULT_WITHOUT_VERSION_VIEW`, `normalizeView`, `toView`, or `toStored`
placeholder remains.

Remove all reads/writes of
`coderso.screens.entry.preferences.v1`. Do not replace it with another global
browser key. The hook reads `user.id` from the existing `AdminAuthContext`; no caller
prop or route changes. `getUserSettingIsolated` and `setUserSettingIsolated` are the
only client functions this hook uses. Existing aggregate-aware `getUserSetting` /
`setUserSetting` may delegate network transport to the isolated helpers, but only those
aggregate-aware wrappers may touch `userSettingsReadCache`. In particular, a delayed
isolated PATCH from user A cannot merge into an aggregate cache populated after a switch
to user B. The existing hook call site remains source-compatible.

## Security Contract

- Existing internal user-settings route family; authenticated session and
  server-derived `ctx.user.id` scope every read/write.
- PATCH retains CSRF and existing admin rate limiting; schema rejects unknown
  envelope keys and service rejects unknown value keys/version/type.
- No API-key scope change, public mode, nonce/captcha, secret, entry content, or
  migration.

## Error/compatibility flow

- Missing row returns server default. Invalid stored row falls back through the
  existing service behavior.
- Network/auth failure leaves a functional in-memory default/current value and
  never leaks another user's cache or localStorage value.
- A user transition immediately derives the default until that user's forced response
  resolves. A late response from the prior user or an initial hydrate that loses a
  race with a local toggle is ignored by the active+generation guard.
- Successful writes remain optimistic for the active user. The isolated writer has no
  aggregate-cache side effect, so a late prior-user PATCH cannot resurrect or mutate a
  snapshot subsequently populated for another user.

## Gate tests owned here; aggregate additions owned by TASK-540-06

- `tests/unit/settings/userSettingsService.test.ts`: exact value schema,
  unknown/type/version rejection, per-user isolation/default.
- `tests/vitest/admin/userSettingsClient.test.ts`: exact isolated typed read/write exports;
  both bypass aggregate reads/writes; defer user A's PATCH, transition and populate the
  aggregate for user B, resolve A, and prove B's aggregate remains byte-identical.
- `tests/vitest/ui/use-screen-entry-preferences.test.ts`: async hydrate,
  optimistic write, failure/unmount, no localStorage, user A→B isolation with A's
  deferred GET and PATCH responses, a deferred initial GET losing to a local toggle,
  immediate default derivation on identity change, and no synchronous effect-body
  state update.
- `tests/integration/routes/userSettings.test.ts`: authenticated self-scope,
  CSRF/envelope/error mapping through existing route registration.

Replace the stale global-localStorage expectation before this source gate. TASK-540-06
may add two-user end-to-end coverage later but must not re-baseline the exact no-browser-
storage, per-user, or delayed-request assertions above.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/admin/userSettingsClient.test.ts \
  tests/vitest/ui/use-screen-entry-preferences.test.ts
set -a && source .env && set +a
bun test tests/unit/settings/userSettingsService.test.ts \
  tests/integration/routes/userSettings.test.ts
```

Verify DB reachability before DB-backed tests; rerun a named failure once.
