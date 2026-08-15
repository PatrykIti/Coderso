import { expect, test } from "bun:test";

import { chooseRuntimeSmokeLeaseHomepageId } from "../../../scripts/runtime-smoke/adapters/routing-settings-lease";
import { SmokeError } from "../../../scripts/runtime-smoke/contracts";

test("homepage override pins the provided page id and never runs the fallback", async () => {
  let fallbackCalls = 0;
  const result = await chooseRuntimeSmokeLeaseHomepageId("page-id-override", async () => {
    fallbackCalls += 1;
    throw new Error("fallback must not run when an override is provided");
  });
  expect(result).toBe("page-id-override");
  expect(fallbackCalls).toBe(0);
});

test("homepage override null keeps the first-published-page fallback", async () => {
  let fallbackCalls = 0;
  const result = await chooseRuntimeSmokeLeaseHomepageId(null, async () => {
    fallbackCalls += 1;
    return "page-id-fallback";
  });
  expect(result).toBe("page-id-fallback");
  expect(fallbackCalls).toBe(1);
});

test("homepage override undefined keeps the first-published-page fallback", async () => {
  let fallbackCalls = 0;
  const result = await chooseRuntimeSmokeLeaseHomepageId(undefined, async () => {
    fallbackCalls += 1;
    return "page-id-fallback";
  });
  expect(result).toBe("page-id-fallback");
  expect(fallbackCalls).toBe(1);
});

test("empty homepage override is rejected as an argument error", async () => {
  await expect(
    chooseRuntimeSmokeLeaseHomepageId("", async () => "page-id-fallback")
  ).rejects.toMatchObject({ code: "smoke_argument_invalid" });
});

test("homepage override failure surfaces as a SmokeError", async () => {
  let error: unknown;
  try {
    await chooseRuntimeSmokeLeaseHomepageId("", async () => "page-id-fallback");
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(SmokeError);
  expect((error as SmokeError).code).toBe("smoke_argument_invalid");
});
