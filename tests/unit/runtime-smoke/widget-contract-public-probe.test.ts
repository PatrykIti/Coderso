import { expect, test } from "bun:test";
import {
  classifyPublicStatus,
  shouldCountOverflowOwner,
} from "../../../scripts/playwright-widget-contract-smoke";

test("classifies frontend fixture gaps and overflow failures distinctly", () => {
  expect(
    classifyPublicStatus({
      cssChecks: ["empty-fixture"],
      statusCode: 200,
      emptyFixture: true,
      bodyOverflow: false,
      unmarkedOverflowOwnerCount: 0,
    })
  ).toEqual({ status: "fixture-gap", error: "public_fixture_empty" });

  expect(
    classifyPublicStatus({
      cssChecks: ["card-overflow"],
      statusCode: 200,
      emptyFixture: false,
      bodyOverflow: false,
      unmarkedOverflowOwnerCount: 1,
    })
  ).toEqual({ status: "failed", error: "card_overflow_unmarked" });

  expect(
    classifyPublicStatus({
      cssChecks: ["body-overflow"],
      statusCode: 200,
      emptyFixture: false,
      bodyOverflow: true,
      unmarkedOverflowOwnerCount: 1,
    })
  ).toEqual({ status: "failed", error: "body_overflow_unmarked" });
});

test("ignores approved intentional and visually-hidden overflow owners", () => {
  const visibleOverflow = {
    scrollWidth: 420,
    clientWidth: 320,
    width: 320,
    height: 80,
    display: "block",
    visibility: "visible",
  };

  expect(shouldCountOverflowOwner(visibleOverflow)).toBe(true);
  expect(
    shouldCountOverflowOwner({
      ...visibleOverflow,
      hasIntentionalOverflowAncestor: true,
    })
  ).toBe(true);
  expect(
    shouldCountOverflowOwner({
      ...visibleOverflow,
      hasApprovedIntentionalOverflowAncestor: true,
    })
  ).toBe(false);
  expect(shouldCountOverflowOwner({ ...visibleOverflow, className: "sr-only" })).toBe(false);
  expect(shouldCountOverflowOwner({ ...visibleOverflow, ariaHidden: "true" })).toBe(false);
});
