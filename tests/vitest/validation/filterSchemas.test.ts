import { expect, test } from "vitest";

import { validate } from "../../../core/server/validation/schemaValidator";
import { listingFilterPreviewSchema } from "../../../core/server/validation/filterSchemas";

test("listingFilterPreviewSchema accepts UUID listingQueryId", () => {
  expect(() =>
    validate(listingFilterPreviewSchema, {
      listingQueryId: "8ce0fc8b-b900-4f6f-b1f8-fb8ad9b4d3c8",
      queryString: "lq.8ce0fc8b-b900-4f6f-b1f8-fb8ad9b4d3c8.status.eq=published",
    })
  ).not.toThrow();
});

test("listingFilterPreviewSchema rejects non-UUID listingQueryId", () => {
  expect(() =>
    validate(listingFilterPreviewSchema, {
      listingQueryId: "sample-query-id",
      queryString: "lq.sample-query-id.status.eq=published",
    })
  ).toThrow("Invalid payload");
});
