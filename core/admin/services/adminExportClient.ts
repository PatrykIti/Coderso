import { ApiClientError, getCsrfToken } from "./apiClient";
import { resolveAdminBasePath } from "@/utils/adminPaths";

type AdminExportFileResponse = {
  type: "file";
  filename?: string;
  mimeType?: string;
  content: string;
};

type AdminExportJobResponse = {
  type: "job";
  jobId: string;
  statusUrl?: string;
};

type AdminExportResponse = AdminExportFileResponse | AdminExportJobResponse;

export type AdminExportResult =
  | { status: "downloaded"; filename: string; mimeType: string }
  | { status: "queued"; jobId: string; statusUrl?: string };

export const resolveAdminExportApiUrl = (apiPath: `/${string}`) =>
  `${resolveAdminBasePath()}/api${apiPath}`;

const parseExportError = async (response: Response) => {
  try {
    const payload = (await response.json()) as {
      error?: { code?: string; message?: string; details?: unknown };
    };
    if (payload.error?.code && payload.error.message) {
      return new ApiClientError(
        payload.error.code,
        payload.error.message,
        response.status,
        payload.error.details
      );
    }
  } catch {
    // Fall through to the generic response error.
  }
  return new ApiClientError(
    "export_request_failed",
    response.statusText || "Export request failed",
    response.status
  );
};

const sanitizeFilename = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const resolveFilename = (filenamePrefix: string, responseFilename?: string) => {
  const candidate = responseFilename?.trim() || `${filenamePrefix}.json`;
  const sanitized = sanitizeFilename(candidate);
  return sanitized.length > 0 ? sanitized : "export.json";
};

const triggerBrowserDownload = (content: string, filename: string, mimeType: string) => {
  if (typeof document === "undefined" || typeof URL === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export function resolveExportDownload(
  response: AdminExportResponse,
  filenamePrefix: string
): AdminExportResult {
  if (response.type === "job") {
    const result: AdminExportResult = {
      status: "queued",
      jobId: response.jobId,
    };
    if (response.statusUrl) result.statusUrl = response.statusUrl;
    return result;
  }
  const mimeType = response.mimeType ?? "application/json";
  const filename = resolveFilename(filenamePrefix, response.filename);
  triggerBrowserDownload(response.content, filename, mimeType);
  return { status: "downloaded", filename, mimeType };
}

export async function downloadAdminExport(
  apiPath: `/${string}`,
  payload: unknown,
  options: { filenamePrefix: string; withCsrf: true }
): Promise<AdminExportResult> {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (options.withCsrf) {
    const csrf = await getCsrfToken();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }
  const response = await fetch(resolveAdminExportApiUrl(apiPath), {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await parseExportError(response);
  }
  const exportResponse = (await response.json()) as AdminExportResponse;
  return resolveExportDownload(exportResponse, options.filenamePrefix);
}
