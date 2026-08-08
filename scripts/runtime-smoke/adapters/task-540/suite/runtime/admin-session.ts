import { SmokeError } from "../../../../contracts";
import type { LifecycleResource } from "../../../../lifecycle";
import type { PlainJsonValue } from "../../../../workers/contracts";
import { runtimeInvariant, runtimeObject, runtimeString, runtimeUuid } from "./native-utils";

const API_BASE = "http://127.0.0.1:3000/admin/api";
const MAXIMUM_RESPONSE_BYTES = 4 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 90_000;
const ROUTE = /^\/[A-Za-z0-9][A-Za-z0-9._~!$&'()*+,;=:@%/-]{0,2047}$/u;
const HEADER = /^[a-z0-9][a-z0-9-]{0,127}$/u;

export interface Task540AdminApiResponse {
  readonly status: number;
  readonly value: PlainJsonValue;
  readonly bytes: Uint8Array;
}

export interface Task540AdminRequestOptions {
  readonly json?: PlainJsonValue;
  readonly multipart?: FormData;
  readonly csrf?: boolean;
  readonly expectedUserId?: string;
  readonly allowNotFound?: boolean;
}

async function readBoundedResponse(response: Response, label: string): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (reader === undefined) {
    throw new SmokeError("smoke_output_invalid", `${label} response body is absent`);
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > MAXIMUM_RESPONSE_BYTES) {
        throw new SmokeError("smoke_output_invalid", `${label} response exceeded its bound`);
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  runtimeInvariant(total > 0, `${label} response is empty`);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function decodeJson(bytes: Uint8Array, label: string): PlainJsonValue {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new SmokeError("smoke_output_invalid", `${label} response is not UTF-8`, {
      cause: error,
    });
  }
  try {
    return JSON.parse(text) as PlainJsonValue;
  } catch (error) {
    throw new SmokeError("smoke_output_invalid", `${label} response is not JSON`, {
      cause: error,
    });
  }
}

function sessionCookie(headers: Headers): string {
  const setCookie = headers.get("set-cookie") ?? "";
  const match = /(?:^|,\s*)session=([^;,\s]+)/u.exec(setCookie);
  runtimeInvariant(match !== null && match[1] !== undefined, "TASK-540 session cookie is absent");
  const token = match[1];
  runtimeInvariant(
    token.length <= 4_096 && !token.includes("\0"),
    "TASK-540 session cookie is invalid"
  );
  return `session=${token}`;
}

export class Task540AdminApiSession {
  readonly #fetch: typeof globalThis.fetch;
  readonly #userAgent: string;
  readonly #csrfHeaderName: string;
  #cookie: string | null = null;
  #csrf: string | null = null;
  #userId: string | null = null;
  #closed = false;

  constructor(
    userAgent: string,
    csrfHeaderName: string,
    fetchImpl: typeof globalThis.fetch = globalThis.fetch
  ) {
    this.#userAgent = runtimeString(userAgent, "TASK-540 API user agent", 256);
    runtimeInvariant(HEADER.test(csrfHeaderName), "TASK-540 CSRF header name is invalid");
    this.#csrfHeaderName = csrfHeaderName;
    this.#fetch = fetchImpl;
  }

  get userId(): string | null {
    return this.#userId;
  }

  async login(email: string, password: string): Promise<string> {
    runtimeInvariant(!this.#closed && this.#cookie === null, "TASK-540 API login was repeated");
    const response = await this.#send("POST", "/auth/login", {
      json: Object.freeze({ email, password }),
      csrf: false,
    });
    runtimeInvariant(
      response.status >= 200 && response.status < 300,
      `TASK-540 API POST /auth/login failed with status ${response.status}`
    );
    this.#cookie = sessionCookie(response.headers);
    const value = runtimeObject(response.value, "TASK-540 API login");
    const user = runtimeObject(value.user, "TASK-540 API login user");
    const id = runtimeUuid(user.id, "TASK-540 API login user ID");
    runtimeInvariant(user.email === email, "TASK-540 API login identity drifted");
    this.#userId = id;
    return id;
  }

  async captureCsrf(): Promise<void> {
    runtimeInvariant(
      this.#cookie !== null && this.#csrf === null,
      "TASK-540 CSRF capture was repeated"
    );
    const response = await this.request("GET", "/auth/csrf", { csrf: false });
    const value = runtimeObject(response.value, "TASK-540 CSRF response");
    this.#csrf = runtimeString(value.token, "TASK-540 CSRF token", 4_096);
  }

  async request(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    route: string,
    options: Task540AdminRequestOptions = {}
  ): Promise<Task540AdminApiResponse> {
    runtimeInvariant(!this.#closed && this.#cookie !== null, "TASK-540 API session is unavailable");
    const response = await this.#send(method, route, options);
    if (response.status === 404 && options.allowNotFound === true) {
      return Object.freeze({
        status: response.status,
        value: response.value,
        bytes: response.bytes,
      });
    }
    runtimeInvariant(
      response.status >= 200 && response.status < 300,
      `TASK-540 API ${method} ${route} failed with status ${response.status}`
    );
    return Object.freeze({ status: response.status, value: response.value, bytes: response.bytes });
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    if (this.#cookie !== null) {
      try {
        if (this.#csrf === null) await this.captureCsrf();
        await this.request("POST", "/auth/logout");
      } finally {
        this.#cookie = null;
        this.#csrf = null;
        this.#userId = null;
        this.#closed = true;
      }
      return;
    }
    this.#closed = true;
  }

  async proveAbsent(): Promise<boolean> {
    return this.#closed && this.#cookie === null && this.#csrf === null && this.#userId === null;
  }

  async #send(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    route: string,
    options: Task540AdminRequestOptions
  ): Promise<Task540AdminApiResponse & { readonly headers: Headers }> {
    runtimeInvariant(ROUTE.test(route), "TASK-540 API route is invalid");
    runtimeInvariant(
      !(options.json !== undefined && options.multipart !== undefined),
      "TASK-540 API body authority is ambiguous"
    );
    const headers = new Headers({ Accept: "application/json", "User-Agent": this.#userAgent });
    if (this.#cookie !== null) headers.set("Cookie", this.#cookie);
    if (options.expectedUserId !== undefined) {
      headers.set(
        "X-Coderso-Expected-User-Id",
        runtimeUuid(options.expectedUserId, "TASK-540 expected API user ID")
      );
    }
    if (options.json !== undefined) headers.set("Content-Type", "application/json");
    if (options.csrf !== false && method !== "GET") {
      runtimeInvariant(this.#csrf !== null, "TASK-540 API CSRF capability is absent");
      headers.set(this.#csrfHeaderName, this.#csrf);
    }
    let response: Response;
    try {
      response = await this.#fetch(`${API_BASE}${route}`, {
        method,
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        ...(options.json === undefined ? {} : { body: JSON.stringify(options.json) }),
        ...(options.multipart === undefined ? {} : { body: options.multipart }),
      });
    } catch (error) {
      throw new SmokeError("smoke_process_failed", "TASK-540 API request failed", {
        cause: error,
      });
    }
    const bytes = await readBoundedResponse(response, `TASK-540 ${method} ${route}`);
    return Object.freeze({
      status: response.status,
      value: decodeJson(bytes, `TASK-540 ${method} ${route}`),
      bytes,
      headers: response.headers,
    });
  }
}

export class Task540AdminApiSessions implements LifecycleResource {
  readonly name = "task540-admin-api-sessions";
  readonly #fetch: typeof globalThis.fetch;
  readonly #sessions = new Map<string, Task540AdminApiSession>();
  #closed = false;

  constructor(fetchImpl: typeof globalThis.fetch = globalThis.fetch) {
    this.#fetch = fetchImpl;
  }

  create(
    key: "bootstrap" | "user-a",
    userAgent: string,
    csrfHeaderName: string
  ): Task540AdminApiSession {
    runtimeInvariant(
      !this.#closed && !this.#sessions.has(key),
      "TASK-540 API session was repeated"
    );
    const session = new Task540AdminApiSession(userAgent, csrfHeaderName, this.#fetch);
    this.#sessions.set(key, session);
    return session;
  }

  require(key: "bootstrap" | "user-a"): Task540AdminApiSession {
    const session = this.#sessions.get(key);
    runtimeInvariant(session !== undefined, "TASK-540 API session is absent");
    return session;
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    const failures: unknown[] = [];
    for (const session of [...this.#sessions.values()].reverse()) {
      try {
        await session.close();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-540 API session cleanup failed", {
        cause: new AggregateError(failures),
      });
    }
  }

  async proveAbsent(): Promise<boolean> {
    return (
      this.#closed &&
      (
        await Promise.all([...this.#sessions.values()].map((session) => session.proveAbsent()))
      ).every(Boolean)
    );
  }
}
