import { deflateSync } from "node:zlib";

import { describe, expect, test } from "vitest";

import {
  CANONICAL_MEDIA_PROFILES,
  buildMediaDeliveryPath,
  canonicalizeMediaBytes,
  classifyCanonicalMediaPrefix,
  safeMediaDisposition,
} from "../../../core/services/media/mediaFileTrust";

const encoder = new TextEncoder();
const ascii = (value: string) => encoder.encode(value);
const concat = (...parts: Uint8Array[]) => {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
};

const u32le = (value: number) =>
  Uint8Array.of(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
const u16le = (value: number) => Uint8Array.of(value & 0xff, (value >>> 8) & 0xff);
const u16be = (value: number) => Uint8Array.of((value >>> 8) & 0xff, value & 0xff);

const png = () =>
  Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    ),
    (character) => character.charCodeAt(0)
  );

const findBytes = (bytes: Uint8Array, needle: Uint8Array) => {
  for (let index = 0; index <= bytes.length - needle.length; index += 1) {
    if (needle.every((value, needleIndex) => bytes[index + needleIndex] === value)) return index;
  }
  return -1;
};

const removePngChunk = (bytes: Uint8Array, type: string) => {
  const typeOffset = findBytes(bytes, ascii(type));
  if (typeOffset < 4) throw new Error("missing_png_chunk");
  const length =
    bytes[typeOffset - 4]! * 0x1000000 +
    bytes[typeOffset - 3]! * 0x10000 +
    bytes[typeOffset - 2]! * 0x100 +
    bytes[typeOffset - 1]!;
  return concat(bytes.subarray(0, typeOffset - 4), bytes.subarray(typeOffset + 8 + length));
};

const jpegSegment = (marker: number, payload: Uint8Array) =>
  concat(Uint8Array.of(0xff, marker), u16be(payload.length + 2), payload);
const jpeg = (comment?: Uint8Array) =>
  concat(
    Uint8Array.of(0xff, 0xd8),
    jpegSegment(0xc0, concat(Uint8Array.of(8), u16be(1), u16be(1), Uint8Array.of(1, 1, 0x11, 0))),
    ...(comment ? [jpegSegment(0xfe, comment)] : []),
    jpegSegment(0xda, Uint8Array.of(1, 1, 0, 0, 63, 0)),
    Uint8Array.of(1, 2, 3),
    Uint8Array.of(0xff, 0xd9)
  );
const gif = (variant: "87a" | "89a") =>
  concat(
    ascii(`GIF${variant}`),
    u16le(1),
    u16le(1),
    Uint8Array.of(0x80, 0, 0),
    Uint8Array.of(0, 0, 0, 0xff, 0xff, 0xff),
    Uint8Array.of(0x2c),
    u16le(0),
    u16le(0),
    u16le(1),
    u16le(1),
    Uint8Array.of(0, 2, 2, 0x44, 0x01, 0, 0x3b)
  );
const webp = () =>
  concat(ascii("RIFF"), u32le(18), ascii("WEBPVP8L"), u32le(5), Uint8Array.of(0x2f, 0, 0, 0, 0, 0));
const bmp = () =>
  concat(
    ascii("BM"),
    u32le(58),
    new Uint8Array(4),
    u32le(54),
    u32le(40),
    u32le(1),
    u32le(1),
    u16le(1),
    u16le(24),
    u32le(0),
    u32le(4),
    u32le(0),
    u32le(0),
    u32le(0),
    u32le(0),
    new Uint8Array(4)
  );
const pdfDocument = (objects: readonly Uint8Array[], trailerEntries = ""): Uint8Array => {
  const header = ascii("%PDF-1.7\n");
  const offsets: number[] = [];
  const bodyParts: Uint8Array[] = [header];
  let bodyLength = header.length;
  for (const [index, object] of objects.entries()) {
    offsets.push(bodyLength);
    const framed = concat(ascii(`${index + 1} 0 obj\n`), object, ascii("\nendobj\n"));
    bodyParts.push(framed);
    bodyLength += framed.length;
  }
  const xrefEntries = [
    "0000000000 65535 f \n",
    ...offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`),
  ].join("");
  return concat(
    ...bodyParts,
    ascii(
      `xref\n0 ${objects.length + 1}\n${xrefEntries}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${trailerEntries} >>\nstartxref\n${bodyLength}\n%%EOF\n`
    )
  );
};

const pdf = (
  options: Readonly<{ catalogEntries?: string; infoEntries?: string }> = {}
): Uint8Array => {
  const objects = [
    ascii(`<< /Type /Catalog${options.catalogEntries ? ` ${options.catalogEntries}` : ""} >>`),
  ];
  if (options.infoEntries) objects.push(ascii(`<< ${options.infoEntries} >>`));
  return pdfDocument(objects, options.infoEntries ? " /Info 2 0 R" : "");
};

const pdfStream = (payload: Uint8Array, dictionaryEntries = "") =>
  concat(
    ascii(
      `<< /Length ${payload.length}${dictionaryEntries ? ` ${dictionaryEntries}` : ""} >>\nstream\n`
    ),
    payload,
    ascii("\nendstream")
  );

const compressedPdfPayload = (value: string) => new Uint8Array(deflateSync(ascii(value)));
const pdfHex = (value: string) =>
  Array.from(ascii(value), (byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join("");

const identity = (bytes: Uint8Array) => canonicalizeMediaBytes(bytes);

describe("canonical media profile", () => {
  test("pins exactly nine canonical MIME/extension/delivery entries", () => {
    expect(CANONICAL_MEDIA_PROFILES).toEqual({
      "image/png": { extension: ".png", delivery: "inline" },
      "image/jpeg": { extension: ".jpg", delivery: "inline" },
      "image/gif": { extension: ".gif", delivery: "inline" },
      "image/webp": { extension: ".webp", delivery: "inline" },
      "image/bmp": { extension: ".bmp", delivery: "inline" },
      "application/pdf": { extension: ".pdf", delivery: "attachment" },
      "text/plain": { extension: ".txt", delivery: "attachment" },
      "image/svg+xml": { extension: ".svg", delivery: "attachment" },
      "application/octet-stream": { extension: ".bin", delivery: "attachment" },
    });
    expect(Object.keys(CANONICAL_MEDIA_PROFILES)).not.toContain("image/jpg");
  });

  test.each([
    [png(), "image/png", ".png", "inline"],
    [jpeg(), "image/jpeg", ".jpg", "inline"],
    [gif("87a"), "image/gif", ".gif", "inline"],
    [gif("89a"), "image/gif", ".gif", "inline"],
    [webp(), "image/webp", ".webp", "inline"],
    [bmp(), "image/bmp", ".bmp", "inline"],
    [pdf(), "application/pdf", ".pdf", "attachment"],
    [ascii("Plain UTF-8 text\nwith 2 < 3."), "text/plain", ".txt", "attachment"],
    [Uint8Array.of(0, 0xff, 0x80, 1), "application/octet-stream", ".bin", "attachment"],
  ])("canonicalizes complete bytes", (bytes, mimeType, extension, delivery) => {
    expect(identity(bytes as Uint8Array)).toEqual({ mimeType, extension, delivery });
  });

  test("does not accept aliases or declarations as identity inputs", () => {
    expect(identity(jpeg())).toEqual({
      mimeType: "image/jpeg",
      extension: ".jpg",
      delivery: "inline",
    });
  });
});

describe("signature fail-closed behavior", () => {
  const signatures = [
    Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    Uint8Array.of(0xff, 0xd8, 0xff),
    ascii("GIF87a"),
    ascii("GIF89a"),
    ascii("BM"),
    ascii("%PDF-"),
  ];

  test("rejects every strict known-signature prefix", () => {
    for (const signature of signatures) {
      for (let length = 1; length < signature.length; length += 1) {
        expect(identity(signature.subarray(0, length))).toBeNull();
      }
    }
    for (let length = 1; length < 4; length += 1) {
      expect(identity(ascii("RIFF").subarray(0, length))).toBeNull();
    }
    expect(identity(ascii("RIFF\0\0\0\0WEB"))).toBeNull();
  });

  test("rejects structurally incomplete and appended polyglots", () => {
    expect(identity(Uint8Array.of(0xff, 0xd8, 0xff, 0xe0))).toBeNull();
    expect(identity(concat(png(), ascii("<script>alert(1)</script>")))).toBeNull();
    expect(identity(concat(gif("89a"), ascii("<html></html>")))).toBeNull();
    expect(identity(concat(webp(), ascii("extra")))).toBeNull();
    expect(identity(concat(pdf(), ascii("<script>")))).toBeNull();
  });

  test("requires ordered PNG image data and valid chunk CRCs", () => {
    expect(identity(removePngChunk(png(), "IDAT"))).toBeNull();
    const corrupted = png();
    const idatOffset = findBytes(corrupted, ascii("IDAT"));
    expect(idatOffset).toBeGreaterThan(0);
    corrupted[idatOffset + 4] = corrupted[idatOffset + 4]! ^ 0x01;
    expect(identity(corrupted)).toBeNull();
    const withoutEnd = removePngChunk(png(), "IEND");
    expect(identity(withoutEnd)).toBeNull();
  });

  test("rejects markup inside otherwise structured raster containers", () => {
    expect(identity(jpeg(ascii('<img onerror="">')))).toBeNull();
    expect(identity(jpeg(ascii('<img/data-kind="fixture">')))).toBeNull();
    const lateMarkup = jpeg(
      concat(new Uint8Array(1100).fill(0x61), ascii('<meta source="fixture">'))
    );
    expect(findBytes(lateMarkup, ascii("<meta"))).toBeGreaterThan(1024);
    expect(identity(lateMarkup)).toBeNull();
    expect(identity(jpeg(new Uint8Array(1200).fill(0x61)))?.mimeType).toBe("image/jpeg");
    expect(
      identity(
        concat(
          jpeg().subarray(0, jpeg().length - 2),
          ascii("<script>x</script>"),
          Uint8Array.of(0xff, 0xd9)
        )
      )
    ).toBeNull();
    expect(
      identity(
        concat(
          gif("89a").subarray(0, gif("89a").length - 1),
          Uint8Array.of(0x21, 0xfe, 8),
          ascii("<script>"),
          Uint8Array.of(0, 0x3b)
        )
      )
    ).toBeNull();
    const malformedJpeg = jpeg();
    malformedJpeg[4] = 0xff;
    malformedJpeg[5] = 0xff;
    expect(identity(malformedJpeg)).toBeNull();
  });

  test("rejects active or markup-bearing PDF bodies before EOF", () => {
    expect(
      identity(pdf({ catalogEntries: "/OpenAction << /S /JavaScript /JS (alert(1)) >>" }))
    ).toBeNull();
    expect(identity(pdf({ infoEntries: "/Title (<script>x</script>)" }))).toBeNull();
    expect(identity(pdf({ infoEntries: '/Title (<meta/source="fixture">)' }))).toBeNull();
    expect(identity(pdf({ infoEntries: '/Title (<<meta/source="fixture">)' }))).toBeNull();
    expect(identity(pdf({ infoEntries: "/Title <FEFG>" }))).toBeNull();
    expect(
      identity(pdf({ catalogEntries: "/Open#41ction << /S /J#61vaScript /J#53 (alert) >>" }))
    ).toBeNull();
  });

  test("accepts well-formed PDF hexadecimal metadata as lexical data", () => {
    const metadata = pdf({
      infoEntries: "/Title <FEFF0054006500730074> /Subject <4F 64 6>",
    });
    expect(identity(metadata)).toEqual({
      mimeType: "application/pdf",
      extension: ".pdf",
      delivery: "attachment",
    });
  });

  test.each([
    "JavaScript",
    "JS",
    "Launch",
    "OpenAction",
    "AA",
    "RichMedia",
    "EmbeddedFile",
    "AcroForm",
    "XFA",
    "Encrypt",
    "ObjStm",
  ])("rejects direct and decoded /%s structural names", (name) => {
    const encodedFirstCharacter = `#${name.charCodeAt(0).toString(16).toUpperCase()}${name.slice(1)}`;
    expect(identity(pdf({ catalogEntries: `/${name} null` }))).toBeNull();
    expect(identity(pdf({ catalogEntries: `/${encodedFirstCharacter} null` }))).toBeNull();
  });

  test("accepts forbidden-name spellings only when they are lexical data", () => {
    const names = "/XFA /Encrypt /ObjStm /Open#41ction /J#53";
    const contextualMetadata = pdf({
      infoEntries:
        `/Title (balanced \\(nested ${names}\\) value) ` +
        `/Subject <${pdfHex(names)}> % ${names}\n/Producer (Coderso)`,
    });
    expect(identity(contextualMetadata)?.mimeType).toBe("application/pdf");

    const compressedNames = compressedPdfPayload(names);
    const contextualStream = pdfDocument([
      ascii("<< /Type /Catalog /Contents 2 0 R >>"),
      pdfStream(compressedNames, "/Filter /FlateDecode"),
    ]);
    expect(identity(contextualStream)?.mimeType).toBe("application/pdf");
  });

  test("accepts a benign compressed page stream", () => {
    const compressedContent = compressedPdfPayload("q 1 0 0 1 0 0 cm 0 0 10 10 re f Q");
    const document = pdfDocument([
      ascii("<< /Type /Catalog /Pages 2 0 R >>"),
      ascii("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
      ascii("<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"),
      pdfStream(compressedContent, "/Filter /FlateDecode"),
    ]);
    expect(identity(document)).toEqual({
      mimeType: "application/pdf",
      extension: ".pdf",
      delivery: "attachment",
    });
  });

  test("rejects compressed XFA, encrypted, and object-stream documents", () => {
    const opaqueForm = compressedPdfPayload("form packet without structural names");
    const xfa = pdfDocument([
      ascii("<< /Type /Catalog /AcroForm << /XFA 2 0 R >> >>"),
      pdfStream(opaqueForm, "/Filter /FlateDecode"),
    ]);
    expect(identity(xfa)).toBeNull();

    const encryptedContent = compressedPdfPayload("opaque encrypted fixture");
    const encrypted = pdfDocument(
      [
        ascii("<< /Type /Catalog /Contents 2 0 R >>"),
        pdfStream(encryptedContent, "/Filter /FlateDecode"),
        ascii("<< /Filter /Standard /V 4 /Length 128 >>"),
      ],
      " /Encrypt 3 0 R"
    );
    expect(identity(encrypted)).toBeNull();

    const packedObjects = compressedPdfPayload("4 0 << /Type /Example >>");
    const objectStream = pdfDocument([
      ascii("<< /Type /Catalog >>"),
      pdfStream(packedObjects, "/Type /ObjStm /N 1 /First 4 /Filter /FlateDecode"),
    ]);
    expect(identity(objectStream)).toBeNull();
  });

  test("fails closed on malformed PDF lexical tokens and streams", () => {
    expect(identity(pdf({ infoEntries: "/Title (unterminated" }))).toBeNull();
    expect(identity(pdf({ infoEntries: "/Title <ABCZ>" }))).toBeNull();
    expect(identity(pdf({ catalogEntries: "/Open#4Gction null" }))).toBeNull();

    const missingEndStream = pdfDocument([
      ascii("<< /Type /Catalog /Contents 2 0 R >>"),
      ascii("<< /Length 7 >>\nstream\npayload"),
    ]);
    expect(identity(missingEndStream)).toBeNull();

    const unboundedEndStream = pdfDocument([
      ascii("<< /Type /Catalog /Contents 2 0 R >>"),
      ascii("<< /Length 7 >>\nstream\npayload\nendstreamSuffix"),
    ]);
    expect(identity(unboundedEndStream)).toBeNull();

    const crossedObjectBoundary = pdfDocument([
      ascii("<< /Type /Catalog /Contents 2 0 R >>"),
      ascii("<< /Length 7 >>\nstream\npayload"),
      ascii("<< /OpenAction null >>"),
      pdfStream(ascii("later valid stream")),
    ]);
    expect(identity(crossedObjectBoundary)).toBeNull();
  });

  test("prefix classification returns passive complete signatures only", () => {
    expect(classifyCanonicalMediaPrefix(png().subarray(0, 8))?.mimeType).toBe("image/png");
    expect(classifyCanonicalMediaPrefix(jpeg().subarray(0, 3))?.mimeType).toBe("image/jpeg");
    expect(classifyCanonicalMediaPrefix(gif("87a").subarray(0, 6))?.mimeType).toBe("image/gif");
    expect(classifyCanonicalMediaPrefix(webp().subarray(0, 12))?.mimeType).toBe("image/webp");
    expect(classifyCanonicalMediaPrefix(bmp().subarray(0, 2))?.mimeType).toBe("image/bmp");
    expect(classifyCanonicalMediaPrefix(png().subarray(0, 7))).toBeNull();
    expect(classifyCanonicalMediaPrefix(ascii("plain text"))).toBeNull();
    expect(classifyCanonicalMediaPrefix(ascii("<svg/>"))).toBeNull();
    expect(classifyCanonicalMediaPrefix(pdf())).toBeNull();
    expect(classifyCanonicalMediaPrefix(Uint8Array.of(0, 0xff))).toBeNull();
  });
});

describe("SVG and plain-text boundary", () => {
  test("accepts one bounded standalone presentation SVG as attachment", () => {
    expect(
      identity(
        ascii(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><title>Dot</title><circle cx="5" cy="5" r="4" fill="red"/></svg>'
        )
      )
    ).toEqual({ mimeType: "image/svg+xml", extension: ".svg", delivery: "attachment" });
    expect(identity(ascii('<svg viewBox="0 0 1 1"/>'))?.mimeType).toBe("image/svg+xml");
  });

  test.each([
    '<?xml version="1.0"?><svg/>',
    "<!DOCTYPE svg><svg/>",
    "<!--x--><svg/>",
    "<svg><script>alert(1)</script></svg>",
    "<svg><foreignObject><div>x</div></foreignObject></svg>",
    '<svg onload="alert(1)"></svg>',
    '<svg><use href="https://example.test/x.svg#id"/></svg>',
    '<svg xmlns:s="http://www.w3.org/2000/svg"><s:script>alert(1)</s:script></svg>',
    '<svg xml:base="https://evil.example/"><path fill="url(#paint)"/></svg>',
    '<svg><animate attributeName="href" to="https://evil.example/"/></svg>',
    '<svg><set attributeName="onclick" to="alert(1)"/></svg>',
    '<svg><path fill="u\\72l(https://evil.example/x)"/></svg>',
    '<svg><path fill="url(&#x68;ttps://evil.example/x)"/></svg>',
    "<svg></svg><svg></svg>",
    "<svg><g></svg>",
    "<html><body>x</body></html>",
    "<script>alert(1)</script>",
    "<root>generic xml</root>",
  ])("rejects active, ambiguous, or non-SVG markup: %s", (value) => {
    expect(identity(ascii(value))).toBeNull();
  });

  test("keeps ordinary less-than text and rejects controls/invalid UTF-8 safely", () => {
    expect(identity(ascii("The relation 2 < 3 is plain text."))?.mimeType).toBe("text/plain");
    expect(identity(Uint8Array.of(0x61, 0, 0x62))?.mimeType).toBe("application/octet-stream");
    expect(identity(Uint8Array.of(0xc3, 0x28))?.mimeType).toBe("application/octet-stream");
    expect(identity(concat(Uint8Array.of(0), ascii('<img/data-kind="fixture">')))).toBeNull();
    expect(identity(concat(Uint8Array.of(0xff), ascii('<meta source="fixture">')))).toBeNull();
  });

  test("preserves large configured plain text but rejects unbounded SVG", () => {
    const oversized = new Uint8Array(1024 * 1024 + 1).fill(0x61);
    expect(identity(oversized)?.mimeType).toBe("text/plain");
    const oversizedSvg = concat(ascii("<svg>"), oversized, ascii("</svg>"));
    expect(identity(oversizedSvg)).toBeNull();
  });
});

describe("media delivery paths", () => {
  test("encodes validated relative key segments independently", () => {
    expect(buildMediaDeliveryPath("2026/07/photo one.png")).toBe("/media/2026/07/photo%20one.png");
    expect(buildMediaDeliveryPath("2026/żółć.png")).toBe(
      "/media/2026/%C5%BC%C3%B3%C5%82%C4%87.png"
    );
  });

  test.each([
    "",
    "/a.png",
    "a.png/",
    "a//b.png",
    "a/../b.png",
    "a/./b.png",
    "a\\b.png",
    "a?x.png",
    "a#x.png",
    "a%2fb.png",
    "a/%2e%2e/b.png",
    "a/%252e%252e/b.png",
    "a/%5cb.png",
    "a\u0000b.png",
    `a/${String.fromCharCode(0xd800)}.png`,
  ])("rejects ambiguous/traversal key %j", (key) => {
    expect(() => buildMediaDeliveryPath(key)).toThrow("media_key_invalid");
  });
});

describe("safe content disposition", () => {
  test("replaces deceptive suffixes with one canonical extension", () => {
    const value = safeMediaDisposition("inline", "avatar.php.jpg.exe", ".png");
    expect(value).toContain('inline; filename="avatar.png"');
    expect(value).toContain("filename*=UTF-8''avatar.png");
    expect(value).not.toContain("php");
    expect(value).not.toContain("exe");
  });

  test("strips paths, controls, header punctuation, and bidi controls", () => {
    const value = safeMediaDisposition(
      "attachment",
      'C:\\tmp\\quo"te;\r\nInjected:\u202Egnp.exe',
      ".pdf"
    );
    expect(value).toMatch(/^attachment; filename="[A-Za-z0-9 _()-]+\.pdf";/u);
    expect(value).not.toMatch(/[\r\n\u202e]/u);
    expect(value).not.toContain("Injected:");
    expect(value).not.toContain("exe");
  });

  test("uses a bounded deterministic ASCII fallback and RFC 5987 Unicode value", () => {
    const value = safeMediaDisposition("attachment", `${"ż".repeat(300)}.txt`, ".txt");
    expect(value).toContain('filename="');
    expect(value).toContain("filename*=UTF-8''");
    expect(value.length).toBeLessThan(750);
    expect(safeMediaDisposition("attachment", "", ".bin")).toContain('filename="download.bin"');
  });

  test("sanitizes unpaired surrogates without throwing", () => {
    const value = safeMediaDisposition(
      "attachment",
      `bad-${String.fromCharCode(0xd800)}-name.txt`,
      ".txt"
    );
    expect(value).toContain('filename="bad--name.txt"');
  });

  test.each(
    Object.entries(CANONICAL_MEDIA_PROFILES).map(
      ([mimeType, profile]) => [mimeType, profile.delivery, profile.extension] as const
    )
  )("emits exact deterministic bytes for %s", (_mimeType, delivery, extension) => {
    const expected = `${delivery}; filename="report${extension}"; filename*=UTF-8''report${extension}`;
    expect(safeMediaDisposition(delivery, "report.old.exe", extension)).toBe(expected);
    expect(safeMediaDisposition(delivery, "report.old.exe", extension)).toBe(expected);
    expect(expected.length).toBeLessThan(180);
  });

  test("rejects a mismatched delivery/extension pair", () => {
    expect(() => safeMediaDisposition("inline", "file", ".pdf")).toThrow("media_identity_invalid");
  });
});
