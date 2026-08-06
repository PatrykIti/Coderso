import { useCallback, useEffect, useRef, useState } from "react";

import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedContentTypes,
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";

export type EntryRelationTarget = { slug: string; name: string };

const mapRelationTargets = (items: ContentTypeSummary[]): EntryRelationTarget[] =>
  items.map((item) => ({ slug: item.slug, name: item.name }));

type EntryRelationTargets = Readonly<{
  relationTargets: EntryRelationTarget[];
  beginAuthoritativeContentTypesRequest: () => number;
  acceptAuthoritativeContentTypes: (request: number, items: ContentTypeSummary[]) => void;
}>;

/**
 * The relation-field target list: seeded synchronously from the content-types cache
 * so the first render already has options, then re-read whenever the content-types list
 * changes in this or another tab. The entry baseline supplies its forced authoritative
 * list through `acceptAuthoritativeContentTypes`, avoiding a duplicate mount request.
 */
export function useEntryRelationTargets(): EntryRelationTargets {
  const [relationTargets, setRelationTargets] = useState<EntryRelationTarget[]>(() =>
    mapRelationTargets(getCachedContentTypes() ?? [])
  );
  const activeRef = useRef(true);
  const latestRequestRef = useRef(0);

  const beginAuthoritativeContentTypesRequest = useCallback(() => {
    latestRequestRef.current += 1;
    return latestRequestRef.current;
  }, []);

  const acceptAuthoritativeContentTypes = useCallback(
    (request: number, types: ContentTypeSummary[]) => {
      if (activeRef.current && request === latestRequestRef.current) {
        setRelationTargets(mapRelationTargets(types));
      }
    },
    []
  );

  useEffect(() => {
    activeRef.current = true;
    const refresh = () => {
      const request = beginAuthoritativeContentTypesRequest();
      void listContentTypesCached({ force: true })
        .then((types) => {
          acceptAuthoritativeContentTypes(request, types);
        })
        .catch(() => undefined);
    };
    const unsubscribe = subscribeCacheEvents((event) => {
      if (event.key === cacheKeys.contentTypesList) refresh();
    });
    return () => {
      activeRef.current = false;
      latestRequestRef.current += 1;
      unsubscribe();
    };
  }, [acceptAuthoritativeContentTypes, beginAuthoritativeContentTypesRequest]);

  return {
    relationTargets,
    beginAuthoritativeContentTypesRequest,
    acceptAuthoritativeContentTypes,
  };
}
