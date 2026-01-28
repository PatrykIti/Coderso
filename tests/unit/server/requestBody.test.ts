import { expect, test } from "bun:test";

import { parseRequestBody } from "../../../core/server/requestBody";
import { ApiError } from "../../../core/server/errorHandler";

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
