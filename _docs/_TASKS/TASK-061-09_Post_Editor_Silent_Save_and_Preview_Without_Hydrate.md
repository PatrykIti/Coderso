# TASK-061-09: Post Editor Silent Save and Preview Without Hydrate Reload
# FileName: TASK-061-09_Post_Editor_Silent_Save_and_Preview_Without_Hydrate.md

**Priority:** High  
**Category:** Admin/UI + Editor State  
**Estimated Effort:** Medium  
**Dependencies:** TASK-061-06, TASK-061-07  
**Status:** Done (2026-02-23)

---

## Overview
Usunac irytujacy "reload" canvasu podczas autosave i runtime preview w edytorze postow.  
Po zapisie stan edytora ma zostac na miejscu (caret, selection, layout), a synchronizacja z serwerem ma byc "silent".

## Problem Statement
Aktualnie `preview()` i `autosave` korzystaja ze sciezki, ktora konczy sie `applyLoadedPost()` i `hydrate` reducera.  
To powoduje wizualny reset/odswiezenie sekcji nawet przy drobnych zmianach (np. usuniecie calego tekstu).

## Goals
1. Runtime preview nie moze resetowac lokalnego canvasu.
2. Autosave nie moze przepinac lokalnego document state przez `hydrate`.
3. Zapis nadal aktualizuje baseline i status (`dirty=false`, `lastSavedAt`, `post.updatedAt`).
4. Zachowac bezpieczny fallback dla realnych konfliktow zdalnych (`remoteUpdatePending`).

## Sub-Tasks
1. Zdefiniowac i zaimplementowac `silent sync` helper po zapisie (bez `hydrate`).
2. Przebudowac `runAutosave()` na `silent sync`.
3. Przebudowac `preview()` tak, by save przed preview byl `silent`.
4. Dodac testy jednostkowe i integracyjne pod brak reloadu canvasu.
5. Domknac dokumentacje i wpis changelog po wdrozeniu.

## Scope
1. Rozdzielic strategie zapisu:
   - `silent sync` (bez hydrate) dla autosave i preview-save,
   - `full hydrate` tylko dla explicit refresh/remote update/revision restore.
2. Dodac helper synchronizacji po zapisie, ktory:
   - aktualizuje baseline refs (`baseDataRef`, metadata signature),
   - ustawia `post/title/slug/status/featuredImage` bez resetu document reducera,
   - markuje `savedAt` i czysci `remoteUpdatePending`.
3. Przebudowac `saveDraft` i `preview` tak, by preview zapisywal draft bez reloadu UI.
4. Utrzymac obecne kontrakty API (bez nowych endpointow).

## Out of Scope
1. Zmiana kontraktu revisions.
2. Zmiana backendowego modelu `posts`.
3. Przebudowa runtime preview dialog.

## Security Contract
- **Visibility:** internal (`/admin/api/posts*`, `/admin/api/posts/:id/preview`).
- **Auth path:** admin session (RBAC) / internal API key zgodnie z aktualnym kontraktem admin API.
- **Rate-limit bucket:** admin write/read buckets (bez zmian).
- **Nonce/HMAC:** n/a (internal admin API).
- **reCAPTCHA:** n/a.
- **Internal mode:** bez zmian.

## Files to Create / Change
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `tests/unit/ui/post-editor-save-sync.test.ts` (new)
- `tests/integration/ui/post-editor-preview-no-hydrate.test.tsx` (new)
- `tests/integration/ui/post-editor-smoke-regression.test.tsx` (extend)

## Pseudocode
```ts
function syncSavedPostSilently(nextPost: PostDetail) {
  setPost(nextPost)
  setTitle(nextPost.title)
  setSlug(nextPost.slug)
  setStatus(nextPost.status)
  setFeaturedImage(readFeaturedImage(nextPost))
  setMetadataDraft(createMetadataDraftState(nextPost))
  baseDataRef.current = getPostDataRecord(nextPost)
  baseMetadataSignatureRef.current = serializeMetadataDraft(createMetadataDraftState(nextPost))
  dispatch({ type: "mark_saved", at: nextPost.updatedAt })
  setLastSavedAt(nextPost.updatedAt)
  setRemoteUpdatePending(false)
  // no dispatch({ type: "hydrate", ... }) here
}

async function saveDraft(options = { syncMode: "silent" | "hydrate" }) {
  const updated = await updatePost(...)
  const synchronized = metadataDirty ? await updatePostMetadata(...) : updated
  if (options.syncMode === "silent") syncSavedPostSilently(synchronized)
  else applyLoadedPost(synchronized)
}

async function preview() {
  if (hasUnsavedChanges) await saveDraft({ syncMode: "silent" })
  const result = await previewPost(postId, 30)
  setPreviewUrl(result.previewUrl)
}

async function runAutosave() {
  const result = await autosavePost(postId, payload)
  syncSavedPostSilently(result.post)
}
```

## Acceptance Criteria
1. Preview po zmianie tresci nie resetuje canvasu ani selekcji.
2. Autosave nie powoduje wizualnego "reloadu" sekcji.
3. `Unsaved/Saving/Autosaved` dzialaja poprawnie.
4. Conflict flow (`remoteUpdatePending`) nadal dziala.

## Testing Requirements
- Unit:
  - `syncSavedPostSilently` aktualizuje baseline bez `hydrate`.
  - save strategy selection (`silent` vs `hydrate`) zgodna z wywolaniem.
- Integration UI:
  - edycja -> preview -> brak resetu content state,
  - autosave tick -> brak resetu list/canvas panels.
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/integration/ui/post-editor-smoke-regression.test.tsx tests/integration/ui/post-editor-preview-no-hydrate.test.tsx tests/unit/ui/post-editor-save-sync.test.ts`

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (editor save strategy note)
- `_docs/CMS_API.md` (no API change; add behavior note for preview-save)
- `_docs/_TASKS/TASK-061_Post_Editor_Writing_Canvas_and_Smart_Paste.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<next>.md`

## Rollout / Risk Notes
1. Najwieksze ryzyko: rozjazd lokalnego state vs canonical server payload.
2. Mitigacja:
   - explicit refresh pozostaje full hydrate,
   - remote cache event nadal ustawia `remoteUpdatePending` gdy local dirty.
3. Manual QA:
   - szybkie usuwanie/wklejanie + preview spam,
   - slow network throttling,
   - rownolegle otwarta druga karta z edycja tego samego posta.

## Validation Executed
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/ui/post-editor-save-sync.test.ts tests/unit/ui/post-editor-state-normalization.test.ts tests/integration/ui/post-editor-smoke-regression.test.tsx tests/integration/ui/post-editor-writing-canvas-flow.test.tsx tests/integration/ui/post-autosave-flow.test.tsx`
  - Result: `13 pass`, `0 fail`

## Closure Notes
- Autosave i save-before-preview przeszly na `silent sync` (bez `hydrate` reducera), co usuwa reset canvasu podczas pracy.
- Dodano jawny kontrakt sync mode (`silent | hydrate`) dla zapisu draftu; domyslnie editor uzywa `silent`.
- Dodano helper snapshotu save-sync i testy jednostkowe dla normalizacji/wyliczania baseline po zapisie.
