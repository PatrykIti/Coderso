// Media delivery real provider adapters: local, S3, and Azure composition with
// public GET/HEAD through the handler and through a real Bun.serve transport.
import { expect, test } from "bun:test";

import { handleMediaDeliveryRequest } from "../../../core/server/mediaDelivery";
import type { MediaDeliveryRecord } from "../../../core/services/media/mediaService";
import {
  createMediaDeliveryHarness,
  createRealDeliveryAdapterFixture,
  passiveFixtures,
  request,
} from "./mediaDeliveryTestSupport";

const { state, installHarness } = createMediaDeliveryHarness();

test.each(["local", "s3", "azure"] as const)(
  "real %s adapter composes with public GET and HEAD without provider redirects",
  async (provider) => {
    const bytes = passiveFixtures[0].bytes;
    const fixture = await createRealDeliveryAdapterFixture(provider, bytes);
    let publicUrlCalls = 0;
    fixture.adapter.getPublicUrl = () => {
      publicUrlCalls += 1;
      throw new Error("provider_url_forbidden");
    };

    try {
      const record: MediaDeliveryRecord = {
        key: fixture.key,
        mimeType: "image/png",
        originalName: "provider-image.old.exe",
        size: bytes.byteLength,
      };
      installHarness({
        async findRecord(requestedKey) {
          state.calls.records.push(requestedKey);
          return requestedKey === fixture.key ? record : null;
        },
        async resolveAdapter() {
          state.calls.resolves += 1;
          return fixture.adapter;
        },
      });

      const expectedPolicyHeaders = {
        "content-type": "image/png",
        "content-disposition":
          "inline; filename=\"provider-image.png\"; filename*=UTF-8''provider-image.png",
        "x-content-type-options": "nosniff",
      } as const;

      const get = await handleMediaDeliveryRequest(request(`/media/${fixture.key}`));
      expect(get.status).toBe(200);
      for (const [name, value] of Object.entries(expectedPolicyHeaders)) {
        expect(get.headers.get(name)).toBe(value);
      }
      expect(get.headers.get("content-length")).toBeNull();
      expect(get.headers.get("location")).toBeNull();
      expect(Buffer.from(await get.arrayBuffer())).toEqual(bytes);

      const head = await handleMediaDeliveryRequest(
        request(`/media/${fixture.key}`, { method: "HEAD" })
      );
      expect(head.status).toBe(200);
      for (const [name, value] of Object.entries(expectedPolicyHeaders)) {
        expect(head.headers.get(name)).toBe(value);
      }
      expect(head.headers.get("content-length")).toBe(String(bytes.byteLength));
      expect(head.headers.get("location")).toBeNull();
      expect((await head.arrayBuffer()).byteLength).toBe(0);

      expect(fixture.readCount()).toBe(2);
      expect(publicUrlCalls).toBe(0);
      expect(state.calls.records).toEqual([fixture.key, fixture.key]);
      expect(state.calls.resolves).toBe(2);
      expect(state.calls.rate).toHaveLength(2);
    } finally {
      await fixture.cleanup();
    }
  }
);

test.each(["local", "s3", "azure"] as const)(
  "real Bun.serve transport keeps %s GET framing honest and HEAD length exact",
  async (provider) => {
    const bytes = passiveFixtures[0].bytes;
    const fixture = await createRealDeliveryAdapterFixture(provider, bytes);
    let publicUrlCalls = 0;
    fixture.adapter.getPublicUrl = () => {
      publicUrlCalls += 1;
      throw new Error("provider_url_forbidden");
    };
    const server = Bun.serve({
      port: 0,
      fetch: handleMediaDeliveryRequest,
    });

    try {
      const record: MediaDeliveryRecord = {
        key: fixture.key,
        mimeType: "image/png",
        originalName: "provider-image.old.exe",
        size: bytes.byteLength,
      };
      installHarness({
        async findRecord(requestedKey) {
          state.calls.records.push(requestedKey);
          return requestedKey === fixture.key ? record : null;
        },
        async resolveAdapter() {
          state.calls.resolves += 1;
          return fixture.adapter;
        },
      });

      const url = new URL(`/media/${fixture.key}`, `http://127.0.0.1:${server.port}`);
      const get = await fetch(url);
      expect(get.status).toBe(200);
      expect(get.headers.get("content-type")).toBe("image/png");
      expect(get.headers.get("content-disposition")).toBe(
        "inline; filename=\"provider-image.png\"; filename*=UTF-8''provider-image.png"
      );
      expect(get.headers.get("x-content-type-options")).toBe("nosniff");
      expect(get.headers.get("location")).toBeNull();
      const getLength = get.headers.get("content-length");
      expect(getLength === null || getLength === String(bytes.byteLength)).toBe(true);
      expect(Buffer.from(await get.arrayBuffer())).toEqual(bytes);

      const head = await fetch(url, { method: "HEAD" });
      expect(head.status).toBe(200);
      expect(head.headers.get("content-type")).toBe("image/png");
      expect(head.headers.get("content-disposition")).toBe(
        "inline; filename=\"provider-image.png\"; filename*=UTF-8''provider-image.png"
      );
      expect(head.headers.get("x-content-type-options")).toBe("nosniff");
      expect(head.headers.get("content-length")).toBe(String(bytes.byteLength));
      expect(head.headers.get("location")).toBeNull();
      expect((await head.arrayBuffer()).byteLength).toBe(0);

      expect(fixture.readCount()).toBe(2);
      expect(publicUrlCalls).toBe(0);
      expect(state.calls.records).toEqual([fixture.key, fixture.key]);
      expect(state.calls.resolves).toBe(2);
      expect(state.calls.rate).toHaveLength(2);
    } finally {
      await server.stop(true);
      await fixture.cleanup();
    }
  }
);
