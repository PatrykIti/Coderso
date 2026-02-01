import { expect, test } from "bun:test";

import { getContentTypeLabels } from "../../../core/admin/ui/entries/contentTypeLabels";

test("getContentTypeLabels pluralizes common patterns", () => {
  expect(getContentTypeLabels("Case Study")).toEqual({
    singular: "Case Study",
    plural: "Case Study",
  });
  expect(getContentTypeLabels("testowy")).toEqual({
    singular: "testowy",
    plural: "testowy",
  });
  expect(getContentTypeLabels("gallery-item")).toEqual({
    singular: "gallery item",
    plural: "gallery item",
  });
});
