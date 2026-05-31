export const pageCollectionRoles = ["canonical-list-page", "supporting-page"] as const;

export type PageCollectionRole = (typeof pageCollectionRoles)[number];

export type PageCollectionLink = {
  contentTypeId: string;
  pageRole: PageCollectionRole;
  compositionKey?: string | null;
  listingQueryId?: string | null;
  listingTemplateId?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readRequiredText = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readOptionalText = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return readRequiredText(value);
};

export const normalizePageCollectionLink = (value: unknown): PageCollectionLink | undefined => {
  if (!isRecord(value)) return undefined;

  const contentTypeId = readRequiredText(value.contentTypeId);
  const pageRole =
    typeof value.pageRole === "string" &&
    pageCollectionRoles.includes(value.pageRole as PageCollectionRole)
      ? (value.pageRole as PageCollectionRole)
      : null;

  if (!contentTypeId || !pageRole) return undefined;

  const compositionKey = readOptionalText(value.compositionKey);
  const listingQueryId = readOptionalText(value.listingQueryId);
  const listingTemplateId = readOptionalText(value.listingTemplateId);

  return {
    contentTypeId,
    pageRole,
    ...(compositionKey !== undefined ? { compositionKey } : {}),
    ...(listingQueryId !== undefined ? { listingQueryId } : {}),
    ...(listingTemplateId !== undefined ? { listingTemplateId } : {}),
  };
};

export const normalizePageDataCollectionLink = (data: Record<string, unknown>) => {
  const settings = isRecord(data.settings) ? data.settings : {};
  const collectionLink = normalizePageCollectionLink(settings.collectionLink);

  if (!collectionLink) {
    if (!Object.prototype.hasOwnProperty.call(settings, "collectionLink")) {
      return data;
    }

    const { collectionLink: _collectionLink, ...restSettings } = settings;
    return {
      ...data,
      settings: restSettings,
    };
  }

  return {
    ...data,
    settings: {
      ...settings,
      collectionLink,
    },
  };
};
