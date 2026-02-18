# TASK-054-07-06: Coderso Runtime Widget Integration for Listings
# FileName: TASK-054-07-06_Coderso_Runtime_Widget_Integration_for_Listings.md

**Priority:** High  
**Category:** Runtime + Widgets  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-07-02, TASK-054-07-03, TASK-054-07-05  
**Status:** To Do

---

## Goal
Integrate listing engine with `contentList` and `entryTeaser` widgets while keeping backward compatibility.

## Files to Change
- `core/widgets/core/contentList.tsx`
- `core/widgets/core/entryTeaser.tsx`
- `core/services/content/contentListResolver.ts`
- `core/services/content/entryTeaserResolver.ts`
- `tests/unit/widgets/contentList.test.tsx`
- `tests/unit/widgets/entryTeaser.test.tsx`

## Runtime Contract
- New source mode in widgets: `legacy | listing`.
- `listing` mode references saved query + template.
- Legacy fields remain supported and auto-migrated.

## Pseudocode
```ts
if (source.mode === "listing") {
  const payload = await resolveListingRuntimePayload({
    queryId: source.listingQueryId,
    templateId: source.listingTemplateId,
    preview,
  });
  return payload;
}
return resolveLegacyContentListRuntimeData(input, opts);
```

## Acceptance Criteria
1. Existing pages/widgets do not break.
2. Listing mode renders resolved payload in preview and runtime.
3. Widget editor exposes listing query/template selectors.
