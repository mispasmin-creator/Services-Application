import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZES = [10, 25, 50, 100];

const Pagination = ({ pagination }) => {
  const { page, pageSize, totalItems, totalPages, start, pageItems, setPage, setPageSize } = pagination;
  if (totalItems === 0) return null;

  return (
    <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-gray-500 bg-gray-50/30">
      <div className="flex items-center gap-2">
        <span>Show</span>
        <select
          aria-label="Entries per page"
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="px-2 py-1 bg-white border border-gray-200 rounded-md"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <span>
          {start + 1}-{start + pageItems.length} of {totalItems}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span>Page {page} of {totalPages}</span>
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className="p-1.5 border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          className="p-1.5 border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
