import type { ContentRouteSetting } from "../settings/settingsService";
import { getMediaById } from "../media/mediaService";
import { listPosts, type PostSummary } from "./postsService";
import type { PostsFeedData } from "../../widgets/core/postsFeed";
import { resolvePostsFeedResolvedData } from "./postsFeedRuntime";

type PostsFeedResolverDeps = {
  listPosts: typeof listPosts;
  getMediaById: typeof getMediaById;
};

const defaultDeps: PostsFeedResolverDeps = {
  listPosts,
  getMediaById,
};

export async function resolvePostsFeedPreviewData(
  input: PostsFeedData,
  posts: PostSummary[],
  options: {
    preview: boolean;
    contentRoutes: ContentRouteSetting[];
    runtimeSearchParams?: URLSearchParams;
    blockId?: string;
  }
) {
  return resolvePostsFeedResolvedData(input, options, posts, {
    getMediaById: defaultDeps.getMediaById,
  });
}

export async function resolvePostsFeedRuntimeData(
  input: PostsFeedData,
  options: {
    preview: boolean;
    contentRoutes: ContentRouteSetting[];
    runtimeSearchParams?: URLSearchParams;
    blockId?: string;
  },
  deps: Partial<PostsFeedResolverDeps> = {}
) {
  const runtimeDeps = {
    ...defaultDeps,
    ...deps,
  };

  const allPosts = await runtimeDeps.listPosts();
  return resolvePostsFeedResolvedData(input, options, allPosts, {
    getMediaById: runtimeDeps.getMediaById,
  });
}
