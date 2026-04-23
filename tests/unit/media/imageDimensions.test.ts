import { expect, test } from "bun:test";

import { readImageDimensions } from "../../../core/services/media/imageDimensions";

const pngOneByOne = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);

test("readImageDimensions reads PNG dimensions without decoding pixels", () => {
  expect(readImageDimensions(pngOneByOne)).toEqual({ width: 1, height: 1 });
});

test("readImageDimensions returns null for unsupported input", () => {
  expect(readImageDimensions(Buffer.from("not an image"))).toBeNull();
});
