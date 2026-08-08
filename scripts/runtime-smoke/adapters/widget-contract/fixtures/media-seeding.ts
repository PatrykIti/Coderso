import type { WidgetSmokeCase } from "../contracts";
import type {
  MediaFixtureListItem,
  MediaFixtureListPayload,
  MediaFixtureSeed,
} from "../fixture-data";
import { fetchAdminCsrfToken, requestAdminJson } from "../auth";
import {
  resolveMediaFixtureSeedsForCases,
  selectedCasesNeedMediaFixtures,
} from "../fixture-selection";

function mediaFixtureMetaDrifted(existing: MediaFixtureListItem, seed: MediaFixtureSeed): boolean {
  return (
    existing.title !== seed.title || existing.alt !== seed.alt || existing.caption !== seed.caption
  );
}

function mediaFixtureMatchesSeed(existing: MediaFixtureListItem, seed: MediaFixtureSeed): boolean {
  return (
    existing.originalName === seed.originalName &&
    existing.type === seed.mediaType &&
    existing.mimeType === seed.mimeType
  );
}

function isOptionalMediaFixtureUploadRejection(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /media_fixture_request_failed:POST:\/api\/media:(400|413|415)$/.test(error.message);
}

async function requestAdminForm<T>({
  adminUrl,
  sessionValue,
  path,
  method = "POST",
  formData,
  csrfToken,
}: {
  adminUrl: string;
  sessionValue: string;
  path: string;
  method?: "POST" | "PATCH" | "PUT";
  formData: FormData;
  csrfToken?: string;
}): Promise<T> {
  const adminBase = adminUrl.replace(/\/$/, "");
  const headers = new Headers({
    cookie: `session=${encodeURIComponent(sessionValue)}`,
  });
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  const response = await fetch(`${adminBase}${path}`, {
    method,
    headers,
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`media_fixture_request_failed:${method}:${path}:${response.status}`);
  }
  return (await response.json()) as T;
}

function buildMediaFixtureFormData(seed: MediaFixtureSeed): FormData {
  const formData = new FormData();
  const file = new File([seed.content], seed.originalName, { type: seed.mimeType });
  formData.set("file", file, seed.originalName);
  formData.set("alt", seed.alt);
  formData.set("title", seed.title);
  formData.set("caption", seed.caption);
  return formData;
}

export async function ensureMediaWidgetFixtures(
  adminUrl: string,
  sessionValue: string,
  selectedCases: WidgetSmokeCase[]
): Promise<void> {
  if (!selectedCasesNeedMediaFixtures(selectedCases)) {
    return;
  }

  const mediaPayload = await requestAdminJson<MediaFixtureListItem[] | MediaFixtureListPayload>({
    adminUrl,
    sessionValue,
    path: "/api/media",
  });
  const existingItems = Array.isArray(mediaPayload) ? mediaPayload : (mediaPayload.items ?? []);

  let csrfToken: string | null = null;
  const ensureCsrf = async () => {
    if (csrfToken) return csrfToken;
    csrfToken = await fetchAdminCsrfToken(adminUrl, sessionValue);
    return csrfToken;
  };

  for (const seed of resolveMediaFixtureSeedsForCases(selectedCases)) {
    const existing = existingItems.find((item) => mediaFixtureMatchesSeed(item, seed));
    if (existing) {
      if (mediaFixtureMetaDrifted(existing, seed)) {
        await requestAdminJson<MediaFixtureListItem>({
          adminUrl,
          sessionValue,
          path: `/api/media/${existing.id}`,
          method: "PATCH",
          body: {
            alt: seed.alt,
            title: seed.title,
            caption: seed.caption,
          },
          csrfToken: await ensureCsrf(),
        });
      }
      continue;
    }

    try {
      await requestAdminForm<MediaFixtureListItem>({
        adminUrl,
        sessionValue,
        path: "/api/media",
        formData: buildMediaFixtureFormData(seed),
        csrfToken: await ensureCsrf(),
      });
    } catch (error) {
      if (seed.optionalUpload && isOptionalMediaFixtureUploadRejection(error)) {
        continue;
      }
      throw error;
    }
  }
}
