import { describe, expect, test } from "vitest";

import { parseRequestBody } from "../../../core/server/requestBody";
import { ApiError } from "../../../core/server/errorHandler";

type StreamCounters = {
  pulls: number;
  cancels: number;
};

const streamRequest = (
  chunks: readonly Uint8Array[],
  headers: HeadersInit = {},
  cancelResult: () => void | Promise<void> = () => undefined
): { request: Request; counters: StreamCounters } => {
  const counters: StreamCounters = { pulls: 0, cancels: 0 };
  let index = 0;
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        counters.pulls += 1;
        const chunk = chunks[index];
        index += 1;
        if (chunk) {
          controller.enqueue(chunk);
          return;
        }
        controller.close();
      },
      cancel() {
        counters.cancels += 1;
        return cancelResult();
      },
    },
    { highWaterMark: 0 }
  );
  const request = new Request("http://localhost", {
    method: "POST",
    headers,
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  return { request, counters };
};

const expectApiError = async (promise: Promise<unknown>, code: string, status: number) => {
  try {
    await promise;
    throw new Error("expected error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe(code);
    expect((error as ApiError).status).toBe(status);
  }
};

const expectOwnFormValues = (
  body: unknown,
  expected: Readonly<Record<string, string>>,
  objectPrototype: object | null
) => {
  const payload = body as Record<string, unknown>;
  expect(Object.getPrototypeOf(payload)).toBe(objectPrototype);
  for (const [key, value] of Object.entries(expected)) {
    expect(Object.hasOwn(payload, key)).toBe(true);
    expect(payload[key]).toBe(value);
    expect(Object.getOwnPropertyDescriptor(payload, key)).toEqual({
      configurable: true,
      enumerable: true,
      value,
      writable: true,
    });
  }
};

test("parseRequestBody parses JSON bodies", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hello: "world" }),
  });

  const body = await parseRequestBody(req);
  expect(body).toEqual({ hello: "world" });
});

test("parseRequestBody parses multipart form data", async () => {
  const form = new FormData();
  form.set("title", "Hero");
  const file = new File(["content"], "hero.txt", { type: "text/plain" });
  form.set("file", file);

  const req = new Request("http://localhost", {
    method: "POST",
    body: form,
  });

  const body = await parseRequestBody(req);
  const payload = body as Record<string, unknown>;

  expect(payload.title).toBe("Hero");
  expect(payload.file).toBeInstanceOf(File);
});

test("parseRequestBody parses urlencoded bodies", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "name=Jane+Doe&email=jane%40example.com",
  });

  const body = await parseRequestBody(req);
  expect(body).toEqual({ name: "Jane Doe", email: "jane@example.com" });
});

test("multipart magic names remain own data properties with last-value semantics", async () => {
  const objectPrototype = Object.getPrototypeOf({}) as object;
  const form = new FormData();
  for (const key of ["__proto__", "constructor", "toString"] as const) {
    form.append(key, `${key}-first`);
    form.append(key, `${key}-last`);
  }
  form.append("ordinary", "ordinary-value");

  const body = await parseRequestBody(
    new Request("http://localhost", { method: "POST", body: form })
  );

  expectOwnFormValues(
    body,
    {
      ["__proto__"]: "__proto__-last",
      constructor: "constructor-last",
      ordinary: "ordinary-value",
      toString: "toString-last",
    },
    objectPrototype
  );
  expect(Object.getPrototypeOf({})).toBe(objectPrototype);
});

test("urlencoded magic names remain own data properties with last-value semantics", async () => {
  const objectPrototype = Object.getPrototypeOf({}) as object;
  const params = new URLSearchParams();
  for (const key of ["__proto__", "constructor", "toString"] as const) {
    params.append(key, `${key}-first`);
    params.append(key, `${key}-last`);
  }
  params.append("ordinary", "ordinary-value");

  const body = await parseRequestBody(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    })
  );

  expectOwnFormValues(
    body,
    {
      ["__proto__"]: "__proto__-last",
      constructor: "constructor-last",
      ordinary: "ordinary-value",
      toString: "toString-last",
    },
    objectPrototype
  );
  expect(Object.getPrototypeOf({})).toBe(objectPrototype);
});

test("parseRequestBody rejects invalid JSON", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });

  try {
    await parseRequestBody(req);
    throw new Error("expected error");
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("invalid_json");
  }
});

test("parseRequestBody ignores unsupported content types", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "plain",
  });

  const body = await parseRequestBody(req);
  expect(body).toBeUndefined();
});

describe("bounded request bodies", () => {
  test.each(["6", "999999999999999999999999999999999999999999"])(
    "declared Content-Length %s rejects before pulling the stream",
    async (contentLength) => {
      const { request, counters } = streamRequest([new TextEncoder().encode("abcdef")], {
        "content-type": "application/x-www-form-urlencoded",
        "content-length": contentLength,
      });

      await expectApiError(
        parseRequestBody(request, { maxBytes: 5, tooLargeCode: "form_payload_too_large" }),
        "form_payload_too_large",
        413
      );
      expect(counters).toEqual({ pulls: 0, cancels: 0 });
    }
  );

  test.each([
    { label: "missing length", contentLength: null },
    { label: "lying length", contentLength: "1" },
  ])("$label overflow stops and cancels at max+1", async ({ contentLength }) => {
    const headers = new Headers({ "content-type": "application/x-www-form-urlencoded" });
    if (contentLength !== null) headers.set("content-length", contentLength);
    const { request, counters } = streamRequest(
      [new TextEncoder().encode("abc"), new TextEncoder().encode("def"), new Uint8Array(1024)],
      headers
    );

    await expectApiError(
      parseRequestBody(request, { maxBytes: 5, tooLargeCode: "form_payload_too_large" }),
      "form_payload_too_large",
      413
    );
    expect(counters.pulls).toBe(2);
    expect(counters.cancels).toBe(1);
  });

  test("an oversized first chunk is truncated to the sentinel and cancelled immediately", async () => {
    const { request, counters } = streamRequest([new Uint8Array(1024 * 1024)]);

    await expectApiError(
      parseRequestBody(request, { maxBytes: 5, tooLargeCode: "media_file_too_large" }),
      "media_file_too_large",
      413
    );
    expect(counters).toEqual({ pulls: 1, cancels: 1 });
  });

  test("a rejected cancellation cannot replace or delay the stable 413", async () => {
    const { request, counters } = streamRequest([new Uint8Array(32)], {}, async () => {
      throw new Error("cancel_failed");
    });
    await expectApiError(
      parseRequestBody(request, { maxBytes: 5, tooLargeCode: "form_payload_too_large" }),
      "form_payload_too_large",
      413
    );
    expect(counters).toEqual({ pulls: 1, cancels: 1 });
  });

  test("a never-settling cancellation cannot hang the stable 413", async () => {
    const { request, counters } = streamRequest(
      [new Uint8Array(32)],
      {},
      () => new Promise<void>(() => undefined)
    );
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const outcome = await Promise.race([
      parseRequestBody(request, {
        maxBytes: 5,
        tooLargeCode: "form_payload_too_large",
      }).then(
        (value) => ({ value }),
        (error: unknown) => ({ error })
      ),
      new Promise<{ timeout: true }>((resolve) => {
        timeout = setTimeout(() => resolve({ timeout: true }), 100);
      }),
    ]);
    if (timeout) clearTimeout(timeout);
    expect(outcome).not.toHaveProperty("timeout");
    expect(outcome).toHaveProperty("error");
    expect((outcome as { error: ApiError }).error).toMatchObject({
      code: "form_payload_too_large",
      status: 413,
    });
    expect(counters).toEqual({ pulls: 1, cancels: 1 });
  });

  test("an exact-size body succeeds through the reconstructed request", async () => {
    const { request, counters } = streamRequest([new TextEncoder().encode("a=123")], {
      "content-type": "application/x-www-form-urlencoded",
      "content-length": "5",
    });

    await expect(parseRequestBody(request, { maxBytes: 5 })).resolves.toEqual({ a: "123" });
    expect(counters.pulls).toBe(2);
    expect(counters.cancels).toBe(0);
  });

  test("bounded JSON is parsed from reconstructed bytes", async () => {
    const body = JSON.stringify({ hello: "bounded" });
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });

    await expect(
      parseRequestBody(req, { maxBytes: new TextEncoder().encode(body).byteLength })
    ).resolves.toEqual({ hello: "bounded" });
  });

  test.each([
    { contentType: "application/json", code: "invalid_json" },
    { contentType: "application/x-www-form-urlencoded", code: "invalid_form" },
  ])("stream read failures map to stable $code", async ({ contentType, code }) => {
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          controller.error(new Error("stream_failed"));
        },
      },
      { highWaterMark: 0 }
    );
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": contentType },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expectApiError(parseRequestBody(req, { maxBytes: 64 }), code, 400);
  });

  test("bounded multipart preserves files", async () => {
    const form = new FormData();
    form.set("fieldName", "attachment");
    form.set("file", new File(["content"], "note.txt", { type: "text/plain" }));
    const req = new Request("http://localhost", { method: "POST", body: form });

    const parsed = (await parseRequestBody(req, {
      maxBytes: 64 * 1024,
      rejectDuplicateKeys: ["fieldName", "file"],
    })) as Record<string, unknown>;
    expect(parsed.fieldName).toBe("attachment");
    expect(parsed.file).toBeInstanceOf(File);
    const parsedFile = parsed.file as File;
    expect(parsedFile.name).toBe("note.txt");
    expect(parsedFile.type).toBe("text/plain");
    expect(parsedFile.size).toBe(7);
    await expect(parsedFile.text()).resolves.toBe("content");
  });

  test("serialized multipart succeeds at its exact byte limit", async () => {
    const form = new FormData();
    form.set("fieldName", "attachment");
    form.set("file", new File(["exact-content"], "exact.txt", { type: "text/plain" }));
    const serialized = new Request("http://localhost", { method: "POST", body: form });
    const contentType = serialized.headers.get("content-type");
    if (!contentType) throw new Error("expected multipart content type");
    const bytes = new Uint8Array(await serialized.arrayBuffer());
    const request = new Request("http://localhost", {
      method: "POST",
      headers: {
        "content-type": contentType,
        "content-length": String(bytes.byteLength),
      },
      body: bytes,
    });

    const parsed = (await parseRequestBody(request, {
      maxBytes: bytes.byteLength,
      rejectDuplicateKeys: ["fieldName", "file"],
    })) as Record<string, unknown>;
    expect(parsed.fieldName).toBe("attachment");
    const file = parsed.file as File;
    expect(file.name).toBe("exact.txt");
    expect(file.size).toBe(13);
    await expect(file.text()).resolves.toBe("exact-content");
  });

  test.each(["fieldName", "file", "formNonce", "captchaToken"])(
    "duplicate watched multipart key %s fails closed",
    async (key) => {
      const form = new FormData();
      form.append(key, key === "file" ? new File(["a"], "a.txt") : "a");
      form.append(key, key === "file" ? new File(["b"], "b.txt") : "b");
      const req = new Request("http://localhost", { method: "POST", body: form });

      await expectApiError(
        parseRequestBody(req, {
          maxBytes: 64 * 1024,
          rejectDuplicateKeys: ["fieldName", "file", "formNonce", "captchaToken"],
        }),
        "invalid_form",
        400
      );
    }
  );

  test("duplicate unwatched multipart keys retain legacy last-value behavior", async () => {
    const form = new FormData();
    form.append("custom", "first");
    form.append("custom", "second");
    const req = new Request("http://localhost", { method: "POST", body: form });

    await expect(
      parseRequestBody(req, { maxBytes: 64 * 1024, rejectDuplicateKeys: ["file"] })
    ).resolves.toEqual({ custom: "second" });
  });
});
