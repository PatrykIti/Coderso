# TASK-057-06: Post Autosave, Revisions, Preview, and Publish Flow
# FileName: TASK-057-06_Post_Autosave_Revisions_Preview_and_Publish_Flow.md

**Priority:** High  
**Category:** API + Workflow + Reliability  
**Estimated Effort:** Large  
**Dependencies:** TASK-057-05  
**Status:** To Do

---

## Goal
Zrobic niezawodny workflow redakcyjny: autosave, revisions, preview, publish/schedule dla nowego edytora postow.

## Scope
1. Dodac aliasy revisions dla posts API (czytelny kontrakt dla UI):
   - `GET /posts/:id/revisions`
   - `POST /posts/:id/revisions/:revisionId/restore`
2. Dodac endpoint autosave:
   - `POST /posts/:id/autosave`
3. Dodac czytelne statusy w UI:
   - `Unsaved changes`, `Saving...`, `Autosaved at ...`, `Published`.
4. Obsluzyc konflikt edycji i idempotentny restore.

## Security Contract
- **Visibility:** internal (`/admin/api/posts*`)
- **Auth:** admin session + RBAC (`content:read`, `content:write`, `content:publish`)
- **Rate-limit bucket:**
  - read routes -> `admin_read`
  - write routes (`autosave`, `restore`, `publish`) -> `admin_write`
- **CSRF:** required for all write routes
- **Public access:** none

## Files to Create / Change
- `core/server/routes/postsRoutes.ts`
- `core/services/content/postsService.ts`
- `core/server/validation/postSchemas.ts`
- `core/admin/services/postsClient.ts`
- `core/admin/ui/posts/editor/hooks/usePostAutosave.ts` (new)
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx`
- `tests/integration/routes/postsRoutes.test.ts`
- `tests/integration/posts/posts-revisions-flow.test.ts` (new)
- `tests/integration/ui/post-autosave-flow.test.tsx` (new)

## Pseudocode
```ts
POST /posts/:id/autosave:
  validate payload (document + metadata snapshot)
  save draft changes
  create revision with label "Autosave"
  return { revisionId, savedAt }

usePostAutosave:
  if dirty and debounceElapsed:
    call autosave()
    onSuccess -> markSaved(savedAt)
    onError -> showRetryState()
```

## Acceptance Criteria
1. Uzytkownik nie traci zmian przy dluzszej edycji.
2. Revisions sa widoczne i mozliwe do restore z poziomu edytora postow.
3. Preview i publish korzystaja z aktualnego dokumentu blokowego.
4. Integracyjne testy API i UI przechodza.
