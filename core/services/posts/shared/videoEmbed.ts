const isHttpUrl = (url: URL) =>
  url.protocol === "http:" || url.protocol === "https:";

const isHostOrSubdomain = (host: string, rootHost: string) => {
  const normalizedHost = host.toLowerCase();
  const normalizedRoot = rootHost.toLowerCase();

  return (
    normalizedHost === normalizedRoot ||
    normalizedHost.endsWith(`.${normalizedRoot}`)
  );
};

const readPathSegment = (pathname: string, index: number) => {
  const segment = pathname.split("/").filter(Boolean)[index];
  return segment && segment.trim().length > 0 ? segment : null;
};

export const parseYoutubeVideoId = (value: string) => {
  try {
    const parsed = new URL(value);
    if (!isHttpUrl(parsed)) return null;

    const host = parsed.hostname.toLowerCase();

    if (isHostOrSubdomain(host, "youtube.com")) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        return readPathSegment(parsed.pathname, 1);
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return readPathSegment(parsed.pathname, 1);
      }
      return null;
    }

    if (host === "youtu.be") {
      return readPathSegment(parsed.pathname, 0);
    }
  } catch {
    return null;
  }

  return null;
};

export const toYoutubeEmbedUrl = (value: string) => {
  const id = parseYoutubeVideoId(value);
  return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
};
