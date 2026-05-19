import { expect, test } from "bun:test";

import {
  readMediaCandidate,
  resolveContentItemImage,
} from "../../../core/services/content/contentMediaResolver";

test("readMediaCandidate resolves urls, media ids, nested objects, and arrays", () => {
  expect(readMediaCandidate("https://cdn.example.com/hero.jpg")).toEqual({
    url: "https://cdn.example.com/hero.jpg",
  });
  expect(readMediaCandidate("media-1")).toEqual({
    mediaId: "media-1",
  });
  expect(
    readMediaCandidate({
      src: "https://cdn.example.com/card.jpg",
      alt: "Card art",
    })
  ).toEqual({
    url: "https://cdn.example.com/card.jpg",
    alt: "Card art",
  });
  expect(
    readMediaCandidate([
      null,
      {
        assetId: "media-2",
        title: "Alt from title",
      },
    ])
  ).toEqual({
    mediaId: "media-2",
    alt: "Alt from title",
  });
  expect(readMediaCandidate("   ")).toBeNull();
});

test("resolveContentItemImage returns direct urls without media lookups", async () => {
  const cache = new Map();
  const resolved = await resolveContentItemImage(
    {
      url: "/media/card.jpg",
      alt: "Card art",
    },
    cache
  );

  expect(resolved).toEqual({
    src: "/media/card.jpg",
    alt: "Card art",
  });
  expect(cache.size).toBe(0);
});

test("resolveContentItemImage resolves media ids, prefers explicit alt, and reuses cache", async () => {
  const cache = new Map();
  let calls = 0;
  const getMediaById = async (id: string) => {
    calls += 1;
    return {
      id,
      url: `/media/${id}.jpg`,
      alt: "Media alt",
      title: "Media title",
    };
  };

  const first = await resolveContentItemImage(
    {
      mediaId: "media-3",
      alt: "Explicit alt",
    },
    cache,
    { getMediaById }
  );
  const second = await resolveContentItemImage(
    {
      mediaId: "media-3",
    },
    cache,
    { getMediaById }
  );

  expect(first).toEqual({
    src: "/media/media-3.jpg",
    alt: "Explicit alt",
  });
  expect(second).toEqual({
    src: "/media/media-3.jpg",
    alt: "Media alt",
  });
  expect(calls).toBe(1);
});

test("resolveContentItemImage handles missing or failing media lookups safely", async () => {
  const cache = new Map();
  const missing = await resolveContentItemImage(
    {
      mediaId: "missing-media",
      alt: "Fallback alt",
    },
    cache,
    {
      getMediaById: async () => ({
        id: "missing-media",
        url: "",
        alt: null,
        title: null,
      }),
    }
  );

  const failed = await resolveContentItemImage(
    {
      mediaId: "broken-media",
      alt: "Broken alt",
    },
    cache,
    {
      getMediaById: async () => {
        throw new Error("boom");
      },
    }
  );

  expect(missing).toEqual({
    src: undefined,
    alt: "Fallback alt",
  });
  expect(failed).toEqual({
    src: undefined,
    alt: "Broken alt",
  });
});
