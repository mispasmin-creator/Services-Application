import { useState } from 'react';

// Client-side pagination for a list. Goes back to page 1 whenever resetKey changes
// (tab, search or filter), and stays in range when rows leave the list.
export function usePagination(items, resetKey = '', initialPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [prevKey, setPrevKey] = useState(resetKey);

  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setPage(1);
  }

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
    start,
    pageItems: items.slice(start, start + pageSize),
    setPage,
    setPageSize: (size) => {
      setPageSizeState(size);
      setPage(1);
    },
  };
}
