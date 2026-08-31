import { beforeEach, describe, expect, test, vi } from "vitest";

const { apiRequest } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
}));

vi.mock("@/services/apiClient", () => ({
  apiRequest,
  ApiClientError: class ApiClientError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
  getCsrfToken: vi.fn(() => Promise.resolve("csrf-token")),
  isApiClientError: (error: unknown) => error instanceof Error && error.name === "ApiClientError",
}));

import {
  applyStarterContent,
  previewStarterContent,
} from "../../../core/admin/services/starterContentClient";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("starter content client", () => {
  const selection = { kitId: "blog" };

  test("previews starter content with an internal write", async () => {
    const preview = {
      kitId: "blog",
      label: "Blog",
      summary: "A blog",
      items: [{ type: "page", label: "Home" }],
    };
    apiRequest.mockResolvedValueOnce(preview);
    await expect(previewStarterContent(selection)).resolves.toEqual(preview);
    expect(apiRequest).toHaveBeenCalledWith(
      "/setup/starter-content/preview",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selection),
      },
      { withCsrf: true }
    );
  });

  test("applies starter content with an internal write", async () => {
    const result = { kitId: "blog", applied: true, createdCount: 3 };
    apiRequest.mockResolvedValueOnce(result);
    await expect(applyStarterContent(selection)).resolves.toEqual(result);
    expect(apiRequest).toHaveBeenCalledWith(
      "/setup/starter-content/apply",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selection),
      },
      { withCsrf: true }
    );
  });
});
