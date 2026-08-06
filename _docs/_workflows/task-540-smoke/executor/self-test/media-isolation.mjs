import { invariant } from "../foundation.mjs";
import {
  assertTaskOwnedMediaListTransport,
  isolateTaskOwnedMediaList,
} from "../../browser/route-and-action-sources.mjs";

export function runMediaIsolationSelfTest({ assertNegative, plan, sourceCaptures }) {
  const mediaIsolationExpected = {
    id: sourceCaptures.get("media.id"),
    key: sourceCaptures.get("media.storage-key"),
    url: new URL(sourceCaptures.get("media.resolved-url")).pathname,
    title: plan.fixtureBlueprint.media.title,
    originalName: plan.fixtureBlueprint.media.originalName,
    mimeType: plan.fixtureBlueprint.media.mimeType,
    size: plan.fixtureBlueprint.media.uploadFixture.decodedSizeBytes,
  };
  const mediaIsolationRow = {
    id: mediaIsolationExpected.id,
    key: mediaIsolationExpected.key,
    url: mediaIsolationExpected.url,
    originalName: mediaIsolationExpected.originalName,
    type: "image",
    mimeType: mediaIsolationExpected.mimeType,
    size: mediaIsolationExpected.size,
    width: 1,
    height: 1,
    alt: null,
    title: mediaIsolationExpected.title,
    caption: null,
    folderId: null,
    tags: [],
    focalX: null,
    focalY: null,
    description: null,
    credit: null,
    createdAt: "2026-07-18T00:00:00.000Z",
    createdBy: null,
  };
  const ambientMediaRow = {
    ...mediaIsolationRow,
    id: "54000000-0000-4000-8000-999999999999",
    key: "ambient/example.png",
    url: "/media/ambient/example.png",
    title: "Ambient image",
  };
  const isolatedMediaRows = isolateTaskOwnedMediaList(
    [ambientMediaRow, mediaIsolationRow],
    mediaIsolationExpected
  );
  invariant(
    isolatedMediaRows.length === 1 &&
      isolatedMediaRows[0].id === mediaIsolationExpected.id &&
      Object.isFrozen(isolatedMediaRows) &&
      Object.isFrozen(isolatedMediaRows[0]),
    "task-owned media isolation success drift"
  );
  const mediaIsolationFails = (payload, expected = mediaIsolationExpected) => {
    try {
      isolateTaskOwnedMediaList(payload, expected);
      return false;
    } catch {
      return true;
    }
  };
  invariant(
    assertTaskOwnedMediaListTransport(200, "application/json; charset=utf-8") === true,
    "task-owned media transport success drift"
  );
  const mediaTransportFails = (status, contentType) => {
    try {
      assertTaskOwnedMediaListTransport(status, contentType);
      return false;
    } catch {
      return true;
    }
  };
  assertNegative(mediaTransportFails(500, "application/json"), "media isolation status");
  assertNegative(mediaTransportFails(200, ""), "media isolation absent content type");
  assertNegative(mediaTransportFails(200, "text/html"), "media isolation HTML content type");
  assertNegative(
    mediaTransportFails(200, "application/jsonp"),
    "media isolation JSONP content type"
  );
  assertNegative(
    mediaIsolationFails([ambientMediaRow]),
    "task-owned media isolation missing fixture"
  );
  assertNegative(
    mediaIsolationFails([mediaIsolationRow, { ...mediaIsolationRow }]),
    "task-owned media isolation duplicate fixture"
  );
  assertNegative(
    mediaIsolationFails([{ ...mediaIsolationRow, url: "/media/wrong.png" }]),
    "task-owned media isolation wrong fixture URL"
  );
  assertNegative(mediaIsolationFails(null), "task-owned media isolation non-array payload");
  assertNegative(
    mediaIsolationFails([{ ...mediaIsolationRow, unknown: true }]),
    "task-owned media isolation unknown fixture field"
  );
  assertNegative(
    mediaIsolationFails([{ ...mediaIsolationRow, tags: ["ambient"] }]),
    "task-owned media isolation metadata drift"
  );
  assertNegative(
    mediaIsolationFails([{ ...mediaIsolationRow, createdAt: "not-a-date" }]),
    "task-owned media isolation timestamp drift"
  );
  assertNegative(
    mediaIsolationFails([ambientMediaRow, { ...ambientMediaRow }, mediaIsolationRow]),
    "task-owned media isolation duplicate ambient ID"
  );
}
