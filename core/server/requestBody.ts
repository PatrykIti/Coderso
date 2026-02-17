import { ApiError } from "./errorHandler";

const isJsonRequest = (contentType: string) =>
  contentType.includes("application/json");

const isMultipartRequest = (contentType: string) =>
  contentType.includes("multipart/form-data");

const isUrlEncodedRequest = (contentType: string) =>
  contentType.includes("application/x-www-form-urlencoded");

async function parseJson(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new ApiError("invalid_json", "Invalid JSON body", 400);
  }
}

async function parseForm(req: Request) {
  try {
    const form = await req.formData();
    const payload: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      payload[key] = value;
    }
    return payload;
  } catch {
    throw new ApiError("invalid_form", "Invalid form data", 400);
  }
}

async function parseUrlEncoded(req: Request) {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const payload: Record<string, unknown> = {};
    for (const [key, value] of params.entries()) {
      payload[key] = value;
    }
    return payload;
  } catch {
    throw new ApiError("invalid_form", "Invalid form data", 400);
  }
}

export async function parseRequestBody(req: Request) {
  if (req.method === "GET" || req.method === "DELETE") return undefined;

  const contentType = req.headers.get("content-type") ?? "";
  if (isJsonRequest(contentType)) {
    return parseJson(req);
  }
  if (isMultipartRequest(contentType)) {
    return parseForm(req);
  }
  if (isUrlEncodedRequest(contentType)) {
    return parseUrlEncoded(req);
  }
  return undefined;
}
