import { afterEach, expect, test } from "bun:test";
import { inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "../../../core/db/client";
import { redirects } from "../../../core/db/schema";
import { createRedirect } from "../../../core/services/redirects/redirectService";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const createdIds: string[] = [];

afterEach(async () => {
  resetRateLimitBuckets();
  if (!hasDb || createdIds.length === 0) return;
  await db.delete(redirects).where(inArray(redirects.id, [...createdIds]));
  createdIds.length = 0;
});

const createTrackedRedirect = async (input: Parameters<typeof createRedirect>[0]) => {
  const row = await createRedirect(input);
  if (!row) throw new Error("redirect_not_created");
  createdIds.push(row.id);
  return row;
};

const requestPublicPath = (path: string) =>
  handlePublicRequest(
    new Request(`http://public.coderso.test${path}`, {
      headers: {
        "user-agent": "redirects-runtime-test",
        "x-forwarded-for": `127.0.1.${Math.floor(Math.random() * 200) + 1}`,
      },
    })
  );

testIfDb("public runtime executes enabled redirects for supported status codes", async () => {
  const suffix = randomUUID().slice(0, 8);
  const statusCodes = [301, 302, 307, 308] as const;

  for (const statusCode of statusCodes) {
    await createTrackedRedirect({
      fromPath: `/runtime-redirect-${statusCode}-${suffix}`,
      toPath: `/runtime-target-${statusCode}-${suffix}`,
      statusCode,
      enabled: true,
    });

    const response = await requestPublicPath(`/runtime-redirect-${statusCode}-${suffix}`);
    expect(response.status).toBe(statusCode);
    expect(response.headers.get("location")).toBe(
      `http://public.coderso.test/runtime-target-${statusCode}-${suffix}`
    );
  }
});

testIfDb("public runtime ignores disabled and no-match redirects", async () => {
  const suffix = randomUUID().slice(0, 8);
  await createTrackedRedirect({
    fromPath: `/runtime-disabled-${suffix}`,
    toPath: `/runtime-disabled-target-${suffix}`,
    statusCode: 301,
    enabled: false,
  });

  const disabledResponse = await requestPublicPath(`/runtime-disabled-${suffix}`);
  expect(disabledResponse.status).toBe(404);

  const missingResponse = await requestPublicPath(`/runtime-missing-${suffix}`);
  expect(missingResponse.status).toBe(404);
});

testIfDb("public runtime fails redirect loops closed", async () => {
  const suffix = randomUUID().slice(0, 8);
  await createTrackedRedirect({
    fromPath: `/runtime-loop-a-${suffix}`,
    toPath: `/runtime-loop-b-${suffix}`,
    statusCode: 301,
    enabled: true,
  });
  await createTrackedRedirect({
    fromPath: `/runtime-loop-b-${suffix}`,
    toPath: `/runtime-loop-a-${suffix}`,
    statusCode: 302,
    enabled: true,
  });

  const response = await requestPublicPath(`/runtime-loop-a-${suffix}`);
  expect(response.status).toBe(508);
});

testIfDb("public runtime does not shadow public API, preview, or site assets", async () => {
  await createTrackedRedirect({
    fromPath: "/api/search",
    toPath: "/shadowed-search",
    statusCode: 301,
    enabled: true,
  });
  await createTrackedRedirect({
    fromPath: "/preview",
    toPath: "/shadowed-preview",
    statusCode: 301,
    enabled: true,
  });
  await createTrackedRedirect({
    fromPath: "/site/assets/app.css",
    toPath: "/shadowed-asset",
    statusCode: 301,
    enabled: true,
  });

  const searchResponse = await requestPublicPath("/api/search?q=test");
  expect(searchResponse.status).not.toBe(301);

  const previewResponse = await requestPublicPath("/preview");
  expect(previewResponse.status).toBe(404);

  const assetResponse = await requestPublicPath("/site/assets/app.css");
  expect(assetResponse.status).not.toBe(301);
});
