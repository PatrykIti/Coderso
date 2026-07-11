import { ApiError } from "./errorHandler";

const isJsonRequest = (contentType: string) => contentType.includes("application/json");

const isMultipartRequest = (contentType: string) => contentType.includes("multipart/form-data");

const isUrlEncodedRequest = (contentType: string) =>
  contentType.includes("application/x-www-form-urlencoded");

export type ParseRequestBodyOptions = Readonly<{
  maxBytes?: number;
  rejectDuplicateKeys?: readonly string[];
  tooLargeCode?: string;
}>;

const DEFAULT_TOO_LARGE_CODE = "payload_too_large";

const tooLargeError = (code: string) => new ApiError(code, "Request body exceeds size limit", 413);

const declaredLengthExceedsLimit = (value: string | null, maxBytes: number): boolean => {
  if (value === null || !/^\d+$/.test(value)) return false;
  try {
    return BigInt(value) > BigInt(maxBytes);
  } catch {
    return false;
  }
};

async function readBoundedBody(req: Request, maxBytes: number, tooLargeCode: string) {
  if (declaredLengthExceedsLimit(req.headers.get("content-length"), maxBytes)) {
    throw tooLargeError(tooLargeCode);
  }

  if (!req.body) return new Uint8Array();

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let retainedBytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      const chunk = next.value;
      if (chunk.byteLength === 0) continue;

      const remainingThroughSentinel = maxBytes + 1 - retainedBytes;
      if (remainingThroughSentinel > 0) {
        const retained = chunk.slice(0, remainingThroughSentinel);
        chunks.push(retained);
        retainedBytes += retained.byteLength;
      }

      if (retainedBytes > maxBytes || chunk.byteLength > remainingThroughSentinel) {
        void reader.cancel().catch(() => {
          // The bounded rejection remains authoritative even when cancellation fails.
        });
        throw tooLargeError(tooLargeCode);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(retainedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

const reconstructRequest = (req: Request, body: Uint8Array) =>
  new Request(req.url, {
    method: req.method,
    headers: new Headers(req.headers),
    body: body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer,
  });

async function parseJson(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new ApiError("invalid_json", "Invalid JSON body", 400);
  }
}

const setOwnEnumerableDataProperty = (
  target: Record<string, unknown>,
  key: string,
  value: unknown
): void => {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
};

async function parseForm(req: Request, rejectDuplicateKeys: readonly string[] = []) {
  try {
    const form = await req.formData();
    const payload: Record<string, unknown> = {};
    const watched = new Set(rejectDuplicateKeys);
    const seen = new Set<string>();
    for (const [key, value] of form.entries()) {
      if (watched.has(key)) {
        if (seen.has(key)) {
          throw new ApiError("invalid_form", "Invalid form data", 400);
        }
        seen.add(key);
      }
      setOwnEnumerableDataProperty(payload, key, value);
    }
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("invalid_form", "Invalid form data", 400);
  }
}

async function parseUrlEncoded(req: Request) {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const payload: Record<string, unknown> = {};
    for (const [key, value] of params.entries()) {
      setOwnEnumerableDataProperty(payload, key, value);
    }
    return payload;
  } catch {
    throw new ApiError("invalid_form", "Invalid form data", 400);
  }
}

export async function parseRequestBody(req: Request, options: ParseRequestBodyOptions = {}) {
  if (req.method === "GET" || req.method === "DELETE") return undefined;

  const contentType = req.headers.get("content-type") ?? "";
  let requestToParse = req;
  if (options.maxBytes !== undefined) {
    if (
      !Number.isSafeInteger(options.maxBytes) ||
      options.maxBytes < 0 ||
      options.maxBytes >= Number.MAX_SAFE_INTEGER
    ) {
      throw new Error("request_body_limit_invalid");
    }
    let body: Uint8Array;
    try {
      body = await readBoundedBody(
        req,
        options.maxBytes,
        options.tooLargeCode ?? DEFAULT_TOO_LARGE_CODE
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (isJsonRequest(contentType)) {
        throw new ApiError("invalid_json", "Invalid JSON body", 400);
      }
      if (isMultipartRequest(contentType) || isUrlEncodedRequest(contentType)) {
        throw new ApiError("invalid_form", "Invalid form data", 400);
      }
      throw error;
    }
    requestToParse = reconstructRequest(req, body);
  }
  if (isJsonRequest(contentType)) {
    return parseJson(requestToParse);
  }
  if (isMultipartRequest(contentType)) {
    return parseForm(requestToParse, options.rejectDuplicateKeys);
  }
  if (isUrlEncodedRequest(contentType)) {
    return parseUrlEncoded(requestToParse);
  }
  return undefined;
}
