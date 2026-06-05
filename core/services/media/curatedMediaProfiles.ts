export type CuratedMediaProfileId = "architecture-studio";

export type CuratedMediaKind = "image" | "video";

export type CuratedMediaRole = "home" | "about" | "process" | "proof" | "service" | "portfolio";

export type CuratedMediaAsset = {
  id: string;
  profileId: CuratedMediaProfileId;
  kind: CuratedMediaKind;
  role: CuratedMediaRole;
  industryTags: string[];
  themeTags: string[];
  src: string;
  alt: string;
  sourceName: string;
  sourceUrl: string;
  licenseName: string;
  licenseUrl: string;
};

export type CuratedMediaProfile = {
  id: CuratedMediaProfileId;
  label: string;
  industryKeywords: string[];
  themeKeywords: string[];
  supportedKinds: CuratedMediaKind[];
};

const unsplashParams = "?auto=format&fit=crop&w=1400&q=80";
const unsplashLicenseUrl = "https://unsplash.com/license" as const;

const createUnsplashImage = (
  id: string,
  profileId: CuratedMediaProfileId,
  role: CuratedMediaRole,
  photoId: string,
  alt: string,
  tags: {
    industry: string[];
    theme: string[];
  }
): CuratedMediaAsset => ({
  id,
  profileId,
  kind: "image",
  role,
  industryTags: tags.industry,
  themeTags: tags.theme,
  src: `https://images.unsplash.com/${photoId}${unsplashParams}`,
  alt,
  sourceName: "Unsplash",
  sourceUrl: `https://images.unsplash.com/${photoId}`,
  licenseName: "Unsplash License",
  licenseUrl: unsplashLicenseUrl,
});

export const curatedMediaProfiles: CuratedMediaProfile[] = [
  {
    id: "architecture-studio",
    label: "Architecture and interior design studio",
    industryKeywords: [
      "architect",
      "architecture",
      "architectural",
      "interior",
      "interiors",
      "studio architektoniczne",
      "pracownia architektury",
      "architekt",
      "architektura",
      "wnetrza",
      "wnętrza",
    ],
    themeKeywords: [
      "premium",
      "portfolio",
      "design",
      "minimal",
      "materials",
      "residential",
      "studio",
      "pracownia",
    ],
    supportedKinds: ["image"],
  },
];

export const curatedMediaAssets = [
  createUnsplashImage(
    "home-studio",
    "architecture-studio",
    "home",
    "photo-1497366754035-f200968a6e72",
    "Bright architecture studio workspace with desks and large windows",
    {
      industry: ["architecture", "interiors"],
      theme: ["studio", "workspace", "premium"],
    }
  ),
  createUnsplashImage(
    "about-studio-team",
    "architecture-studio",
    "about",
    "photo-1518005020951-eccb494ad742",
    "Modern architectural facade with clean geometric lines",
    {
      industry: ["architecture"],
      theme: ["facade", "geometry", "premium"],
    }
  ),
  createUnsplashImage(
    "process-materials",
    "architecture-studio",
    "process",
    "photo-1600607687939-ce8a6c25118c",
    "Interior design material palette with warm neutral finishes",
    {
      industry: ["interiors", "architecture"],
      theme: ["materials", "process", "residential"],
    }
  ),
  createUnsplashImage(
    "proof-interior",
    "architecture-studio",
    "proof",
    "photo-1600210492486-724fe5c67fb0",
    "Finished living room interior with tailored furniture and daylight",
    {
      industry: ["interiors"],
      theme: ["finished project", "residential", "proof"],
    }
  ),
  createUnsplashImage(
    "service-concept",
    "architecture-studio",
    "service",
    "photo-1600566753190-17f0baa2a6c3",
    "Open-plan residential interior prepared for concept design",
    {
      industry: ["interiors", "architecture"],
      theme: ["concept", "residential", "service"],
    }
  ),
  createUnsplashImage(
    "service-technical",
    "architecture-studio",
    "service",
    "photo-1600585154340-be6161a56a0c",
    "Contemporary house exterior used as a design documentation reference",
    {
      industry: ["architecture"],
      theme: ["documentation", "house", "service"],
    }
  ),
  createUnsplashImage(
    "service-supervision",
    "architecture-studio",
    "service",
    "photo-1600607688969-a5bfcd646154",
    "Detailed residential interior showing coordinated finishes",
    {
      industry: ["interiors"],
      theme: ["supervision", "finishes", "service"],
    }
  ),
  createUnsplashImage(
    "portfolio-apartment",
    "architecture-studio",
    "portfolio",
    "photo-1604014237800-1c9102c219da",
    "Elegant apartment living space with built-in storage and soft daylight",
    {
      industry: ["interiors"],
      theme: ["apartment", "portfolio", "residential"],
    }
  ),
  createUnsplashImage(
    "portfolio-forest-house",
    "architecture-studio",
    "portfolio",
    "photo-1600585154526-990dced4db0d",
    "Modern house with a simple facade and landscape setting",
    {
      industry: ["architecture"],
      theme: ["house", "portfolio", "landscape"],
    }
  ),
  createUnsplashImage(
    "portfolio-studio-office",
    "architecture-studio",
    "portfolio",
    "photo-1497366811353-6870744d04b2",
    "Creative office interior with work tables and studio lighting",
    {
      industry: ["interiors", "architecture"],
      theme: ["office", "portfolio", "workspace"],
    }
  ),
] as const;

export type CuratedMediaAssetId = (typeof curatedMediaAssets)[number]["id"];

const mediaAssetsById = new Map(curatedMediaAssets.map((asset) => [asset.id, asset] as const));
const mediaAssetsByUrl = new Map(curatedMediaAssets.map((asset) => [asset.src, asset] as const));

const mediaProfilesById = new Map(
  curatedMediaProfiles.map((profile) => [profile.id, profile] as const)
);

const normalizeSearchText = (value: string) => value.trim().toLowerCase();

const scoreKeywords = (text: string, keywords: string[]) =>
  keywords.reduce(
    (score, keyword) => (text.includes(keyword.toLowerCase()) ? score + 1 : score),
    0
  );

export const getCuratedMediaProfile = (profileId: CuratedMediaProfileId): CuratedMediaProfile => {
  const profile = mediaProfilesById.get(profileId);
  if (!profile) throw new Error("assistant_curated_media_profile_missing");
  return profile;
};

export const selectCuratedMediaProfile = (input?: {
  prompt?: string;
  intentFamily?: string;
  preferredProfileId?: CuratedMediaProfileId;
}): CuratedMediaProfile | null => {
  if (input?.preferredProfileId) return getCuratedMediaProfile(input.preferredProfileId);

  const searchText = normalizeSearchText(
    [input?.prompt, input?.intentFamily].filter(Boolean).join(" ")
  );
  if (!searchText) return null;

  const [bestProfile] = [...curatedMediaProfiles]
    .map((profile) => ({
      profile,
      score: scoreKeywords(searchText, [...profile.industryKeywords, ...profile.themeKeywords]),
    }))
    .sort((a, b) => b.score - a.score);

  return bestProfile && bestProfile.score > 0 ? bestProfile.profile : null;
};

export const getCuratedMediaAsset = (id: CuratedMediaAssetId): CuratedMediaAsset => {
  const asset = mediaAssetsById.get(id);
  if (!asset) throw new Error("assistant_curated_media_missing");
  return asset;
};

export const getCuratedMediaAssetByUrl = (url: string): CuratedMediaAsset | null =>
  mediaAssetsByUrl.get(url.trim()) ?? null;

export const getCuratedMediaAssetsForProfile = (
  profileId: CuratedMediaProfileId,
  options?: {
    kind?: CuratedMediaKind;
    role?: CuratedMediaRole;
  }
) =>
  curatedMediaAssets.filter(
    (asset) =>
      asset.profileId === profileId &&
      (!options?.kind || asset.kind === options.kind) &&
      (!options?.role || asset.role === options.role)
  );

export const isCuratedMediaUrl = (value: unknown): value is string =>
  typeof value === "string" && curatedMediaAssets.some((asset) => asset.src === value.trim());

export const getCuratedMediaEvidence = (profileId?: CuratedMediaProfileId) => {
  const profile = profileId ? getCuratedMediaProfile(profileId) : null;
  const assets = profile ? getCuratedMediaAssetsForProfile(profile.id) : [...curatedMediaAssets];
  const kinds = Array.from(new Set(assets.map((asset) => asset.kind))).sort();
  const licenseUrls = Array.from(new Set(assets.map((asset) => asset.licenseUrl))).sort();
  return [
    "curated media profile adapter",
    ...(profile ? [`profile:${profile.id}`, `profile-label:${profile.label}`] : []),
    ...kinds.map((kind) => `kind:${kind}`),
    ...licenseUrls.map((url) => `license:${url}`),
  ];
};
