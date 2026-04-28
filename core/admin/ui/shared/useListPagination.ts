import { useCallback, useMemo, useState } from "react";

export const DEFAULT_ADMIN_LIST_PAGE_SIZE = 10;
export const ADMIN_LIST_PAGE_SIZE_OPTIONS = [
  10,
  20,
  30,
  50,
  100,
  150,
  200,
  500,
] as const;

export type AdminListPageSize = (typeof ADMIN_LIST_PAGE_SIZE_OPTIONS)[number];

export type UseListPaginationOptions = {
  defaultPageSize?: AdminListPageSize;
  pageSizeOptions?: readonly AdminListPageSize[];
  resetKey?: string;
};

export type ListPaginationState<T> = {
  pageIndex: number;
  pageSize: AdminListPageSize;
  totalItems: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  visibleRows: T[];
  canPreviousPage: boolean;
  canNextPage: boolean;
  setPageSize: (next: number | string) => void;
  previousPage: () => void;
  nextPage: () => void;
  resetPage: () => void;
};

export function normalizeAdminListPageSize(
  value: number | string,
  pageSizeOptions: readonly AdminListPageSize[] = ADMIN_LIST_PAGE_SIZE_OPTIONS,
  defaultPageSize: AdminListPageSize = DEFAULT_ADMIN_LIST_PAGE_SIZE
): AdminListPageSize {
  const numericValue =
    typeof value === "number" ? value : Number.parseInt(value, 10);
  return pageSizeOptions.includes(numericValue as AdminListPageSize)
    ? (numericValue as AdminListPageSize)
    : defaultPageSize;
}

export function useListPagination<T>(
  rows: readonly T[],
  options: UseListPaginationOptions = {}
): ListPaginationState<T> {
  const { resetKey } = options;
  const pageSizeOptions =
    options.pageSizeOptions ?? ADMIN_LIST_PAGE_SIZE_OPTIONS;
  const defaultPageSize = normalizeAdminListPageSize(
    options.defaultPageSize ?? DEFAULT_ADMIN_LIST_PAGE_SIZE,
    pageSizeOptions,
    DEFAULT_ADMIN_LIST_PAGE_SIZE
  );
  const [paginationState, setPaginationState] = useState<{
    pageIndex: number;
    pageSize: AdminListPageSize;
    resetKey?: string;
  }>(() => ({
    pageIndex: 0,
    pageSize: defaultPageSize,
    resetKey,
  }));

  const normalizedPageSize = normalizeAdminListPageSize(
    paginationState.pageSize,
    pageSizeOptions,
    defaultPageSize
  );
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / normalizedPageSize));
  const requestedPageIndex =
    paginationState.resetKey === resetKey ? paginationState.pageIndex : 0;
  const safePageIndex = Math.min(requestedPageIndex, totalPages - 1);
  const startIndex = safePageIndex * normalizedPageSize;
  const endIndex = startIndex + normalizedPageSize;

  const visibleRows = useMemo(
    () => rows.slice(startIndex, endIndex),
    [endIndex, rows, startIndex]
  );

  const setPageSize = useCallback(
    (next: number | string) => {
      setPaginationState({
        pageIndex: 0,
        pageSize: normalizeAdminListPageSize(
          next,
          pageSizeOptions,
          defaultPageSize
        ),
        resetKey,
      });
    },
    [defaultPageSize, pageSizeOptions, resetKey]
  );

  const previousPage = useCallback(() => {
    setPaginationState({
      pageIndex: Math.max(0, safePageIndex - 1),
      pageSize: normalizedPageSize,
      resetKey,
    });
  }, [normalizedPageSize, resetKey, safePageIndex]);

  const nextPage = useCallback(() => {
    setPaginationState({
      pageIndex: Math.min(totalPages - 1, safePageIndex + 1),
      pageSize: normalizedPageSize,
      resetKey,
    });
  }, [normalizedPageSize, resetKey, safePageIndex, totalPages]);

  const resetPage = useCallback(() => {
    setPaginationState({
      pageIndex: 0,
      pageSize: normalizedPageSize,
      resetKey,
    });
  }, [normalizedPageSize, resetKey]);

  return {
    pageIndex: safePageIndex,
    pageSize: normalizedPageSize,
    totalItems,
    totalPages,
    rangeStart: totalItems === 0 ? 0 : startIndex + 1,
    rangeEnd: Math.min(endIndex, totalItems),
    visibleRows,
    canPreviousPage: safePageIndex > 0,
    canNextPage: safePageIndex < totalPages - 1,
    setPageSize,
    previousPage,
    nextPage,
    resetPage,
  };
}
