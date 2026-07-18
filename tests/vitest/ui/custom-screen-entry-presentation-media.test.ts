import { expect, test } from "vitest";

import {
  PRESENTATION_MEDIA_OVERFLOW_ERROR,
  allocateMediaAttempt,
  buildBoundedPresentationMediaRequestPlan,
  buildEntryRouteKey,
  buildPresentationMediaRequestKey,
  collectWinningDirectImageAssetIds,
  decodeAndValidatePresentationMediaRequestKey,
  initializeMediaMachineState,
  mediaAttemptReducer,
  projectExactRequestedMediaUrls,
} from "../../../core/admin/ui/custom-screens/customScreenEntryPresentationMedia";

const mediaRecords = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    type: "image",
    url: "/media/original.jpg",
  },
];

test("presentation media key codec is route-scoped, canonical, and rejects malformed snapshots", () => {
  const mediaA = "11111111-1111-4111-8111-111111111111";
  const mediaB = "22222222-2222-4222-8222-222222222222";
  const routeA = buildEntryRouteKey({
    screenId: "screen-a",
    entryId: "entry-1",
    isCreateMode: false,
  });
  const routeB = buildEntryRouteKey({
    screenId: "screen-b",
    entryId: "entry-1",
    isCreateMode: false,
  });
  const keyA = buildPresentationMediaRequestKey(routeA, [mediaB, mediaA, mediaA]);
  const keyB = buildPresentationMediaRequestKey(routeB, [mediaA, mediaB]);

  expect(keyB).not.toBe(keyA);
  expect(decodeAndValidatePresentationMediaRequestKey(keyA)).toEqual({
    routeKey: routeA,
    requestedIds: [mediaA, mediaB],
  });
  expect(() =>
    decodeAndValidatePresentationMediaRequestKey(JSON.stringify([routeA, [mediaB, mediaA]]))
  ).toThrow("custom_screen_presentation_media_invalid");
  expect(() =>
    decodeAndValidatePresentationMediaRequestKey(JSON.stringify([routeA, [mediaA, mediaA]]))
  ).toThrow("custom_screen_presentation_media_invalid");
  expect(() => buildPresentationMediaRequestKey(routeA, ["not-a-uuid"])).toThrow(
    "custom_screen_presentation_media_invalid"
  );

  const overLimitIds = Array.from(
    { length: 201 },
    (_, index) => `00000000-0000-4000-8000-${(index + 1).toString(16).padStart(12, "0")}`
  );
  expect(() => buildPresentationMediaRequestKey(routeA, overLimitIds)).toThrow(
    "custom_screen_presentation_media_invalid"
  );
  expect(() =>
    decodeAndValidatePresentationMediaRequestKey(JSON.stringify([routeA, overLimitIds]))
  ).toThrow("custom_screen_presentation_media_invalid");
  expect(buildBoundedPresentationMediaRequestPlan(routeA, overLimitIds)).toEqual({
    requestKey: buildPresentationMediaRequestKey(routeA, []),
    requestedIds: [],
    error: PRESENTATION_MEDIA_OVERFLOW_ERROR,
    errorKind: "overflow",
  });
  expect(buildBoundedPresentationMediaRequestPlan(routeA, [mediaA, mediaB])).toEqual({
    requestKey: buildPresentationMediaRequestKey(routeA, [mediaA, mediaB]),
    requestedIds: [mediaA, mediaB],
    error: null,
    errorKind: null,
  });
});

test("media attempt reducer preserves identity for semantic no-ops and allocates frozen monotonic attempts", () => {
  const mediaA = "11111111-1111-4111-8111-111111111111";
  const routeA = buildEntryRouteKey({
    screenId: "screen-a",
    entryId: "entry-1",
    isCreateMode: false,
  });
  const routeB = buildEntryRouteKey({
    screenId: "screen-b",
    entryId: "entry-1",
    isCreateMode: false,
  });
  const keyA = buildPresentationMediaRequestKey(routeA, [mediaA]);
  const keyB = buildPresentationMediaRequestKey(routeB, [mediaA]);
  const sourceIds = [mediaA];
  const initial = initializeMediaMachineState({ requestKey: keyA, requestedIds: sourceIds });
  sourceIds.length = 0;

  expect(initial.attempt?.token).toBe(1);
  expect(initial.attempt?.force).toBe(false);
  expect(initial.attempt?.requestedIds).toEqual([mediaA]);
  expect(Object.isFrozen(initial.attempt?.requestedIds)).toBe(true);
  expect(
    mediaAttemptReducer(initial, {
      type: "sync-request",
      requestKey: keyA,
      requestedIds: [mediaA],
    })
  ).toBe(initial);

  const forced = mediaAttemptReducer(initial, {
    type: "retry",
    requestKey: keyA,
    cause: "manual-retry",
  });
  expect(forced.attempt).not.toBe(initial.attempt);
  expect(forced.attempt).toMatchObject({ token: 2, force: true, cause: "manual-retry" });
  const inherited = mediaAttemptReducer(forced, {
    type: "sync-request",
    requestKey: keyB,
    requestedIds: [mediaA],
  });
  expect(inherited.attempt).toMatchObject({ token: 3, force: true, cause: "manual-retry" });

  const staleSettlement = mediaAttemptReducer(inherited, {
    type: "settled",
    requestKey: keyA,
    token: 2,
  });
  expect(staleSettlement).toBe(inherited);
  const settled = mediaAttemptReducer(inherited, {
    type: "settled",
    requestKey: keyB,
    token: 3,
  });
  expect(settled.attempt).toBe(inherited.attempt);
  expect(mediaAttemptReducer(settled, { type: "settled", requestKey: keyB, token: 3 })).toBe(
    settled
  );

  const manuallyAllocated = allocateMediaAttempt(
    settled,
    { requestKey: keyB, requestedIds: [mediaA] },
    "cache-event",
    true
  );
  expect(manuallyAllocated.attempt?.token).toBe(4);
});

test("direct-image media planning chooses override then binding, deduplicates, and ignores media fields", () => {
  const overrideId = "11111111-1111-4111-8111-111111111111";
  const boundId = "22222222-2222-4222-8222-222222222222";
  const document = {
    schemaVersion: 1 as const,
    sections: [
      {
        id: "section-1",
        type: "section" as const,
        data: {},
        blocks: [
          { id: "image-a", type: "image" as const, data: {} },
          { id: "image-b", type: "image" as const, data: {} },
          { id: "media-field", type: "field" as const, data: { field: "hero" } },
        ],
      },
    ],
  };
  const bindings = [
    {
      id: "image-a-src",
      blockId: "image-a",
      propPath: "src",
      source: "entry" as const,
      field: "cover",
      mode: "read" as const,
    },
    {
      id: "image-b-src",
      blockId: "image-b",
      propPath: "src",
      source: "entry" as const,
      field: "gallery",
      mode: "read" as const,
    },
    {
      id: "media-field-value",
      blockId: "media-field",
      propPath: "value",
      source: "entry" as const,
      field: "hero",
      mode: "readwrite" as const,
    },
  ];

  expect(
    collectWinningDirectImageAssetIds({
      document,
      bindings,
      values: { cover: boundId, gallery: [boundId], hero: overrideId },
      overrides: [{ blockId: "image-a", propPath: "mediaAssetId", value: overrideId }],
    })
  ).toEqual([overrideId, boundId].sort());

  expect(
    collectWinningDirectImageAssetIds({
      document,
      bindings,
      values: { cover: boundId, gallery: null, hero: overrideId },
      overrides: [
        { blockId: "image-a", propPath: "image", value: boundId },
        { blockId: "image-a", propPath: "mediaAssetId", value: overrideId },
      ],
    })
  ).toEqual([overrideId]);
});

test("presentation media projection preserves requested UUID casing while matching canonical records", () => {
  const canonicalId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  const requestedId = canonicalId.toUpperCase();
  const record = {
    ...mediaRecords[0]!,
    id: canonicalId,
    url: "/media/canonical.jpg",
  };

  expect(projectExactRequestedMediaUrls([record], [requestedId])).toEqual({
    [requestedId]: "/media/canonical.jpg",
  });
  expect(projectExactRequestedMediaUrls([record], [requestedId, canonicalId])).toEqual({
    [requestedId]: "/media/canonical.jpg",
    [canonicalId]: "/media/canonical.jpg",
  });
});
