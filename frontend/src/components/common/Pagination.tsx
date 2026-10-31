import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { toPersianDigits } from '@/utils/persian';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * Reusable pagination component with Persian digit display.
 * Default page size is 10 items. Shows page info, prev/next/first/last buttons,
 * and an optional page-size selector.
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}) => {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages));
    onPageChange(clamped);
  };

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  if (totalItems === 0) {
    return (
      <div className="flex items-center justify-between pt-4 text-xs text-stone-500 dark:text-gray-400">
        <span>صفر ردیف یافت شد</span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="text-xs rounded-lg glass-input px-2 py-1"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{toPersianDigits(size)}</option>
            ))}
          </select>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between pt-4 gap-3 flex-wrap">
      {/* Page size selector */}
      {onPageSizeChange && (
        <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-gray-400">
          <span>نمایش</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="text-xs rounded-lg glass-input px-2 py-1 font-medium"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{toPersianDigits(size)}</option>
            ))}
          </select>
          <span>ردیف در صفحه</span>
        </div>
      )}

      {/* Page info */}
      <span className="text-xs text-stone-600 dark:text-gray-400">
        {toPersianDigits(startItem)} تا {toPersianDigits(endItem)} از {toPersianDigits(totalItems)}
      </span>

      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => goToPage(1)}
          disabled={!canPrev}
          className="p-1.5 rounded-lg text-stone-600 dark:text-gray-400 hover:text-brand hover:bg-brand/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="اولین صفحه"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={!canPrev}
          className="p-1.5 rounded-lg text-stone-600 dark:text-gray-400 hover:text-brand hover:bg-brand/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="قبلی"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <span className="px-2 text-xs font-medium text-stone-700 dark:text-gray-300 min-w-[60px] text-center">
          صفحه {toPersianDigits(currentPage)} / {toPersianDigits(totalPages)}
        </span>
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={!canNext}
          className="p-1.5 rounded-lg text-stone-600 dark:text-gray-400 hover:text-brand hover:bg-brand/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="بعدی"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => goToPage(totalPages)}
          disabled={!canNext}
          className="p-1.5 rounded-lg text-stone-600 dark:text-gray-400 hover:text-brand hover:bg-brand/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="آخرین صفحه"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
