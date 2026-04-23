import { expect, test } from "bun:test";

import { containsMediaReference } from "../../../core/services/media/mediaReferenceMatcher";

test("containsMediaReference matches schema-owned media ids and rich text attrs", () => {
  expect(
    containsMediaReference(
      {
        blocks: [
          { type: "hero", props: { assetId: "media-1" } },
          '<img src="/media/a.png" data-media-id="media-2" />',
        ],
      },
      "media-1"
    )
  ).toBe(true);
  expect(
    containsMediaReference(
      '<img src="/media/a.png" data-media-id="media-2" />',
      "media-2"
    )
  ).toBe(true);
});

test("containsMediaReference avoids broad substring matches", () => {
  expect(
    containsMediaReference(
      { title: "uses media-1 in prose", imageId: "media-10" },
      "media-1"
    )
  ).toBe(false);
});
