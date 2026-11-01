/**
 * Paginated list body for dashboard widgets.
 *
 * Every dashboard list shows at most `pageSize` rows (6 by default) and pages
 * through the rest, so a widget never grows past the height of its neighbour.
 * Rows keep the widget's own markup — the component only owns the slice and the
 * pager, and it renders nothing but the empty state when the list is empty.
 */
import React from 'react';
import { Pagination } from '@/components/common/Pagination';

interface WidgetListProps<T> {
  items: T[];
  /** Rows per page; dashboards use 6 so every widget fits a laptop viewport. */
  pageSize?: number;
  /** Called with the row and its index across the full list, not just the page. */
  renderItem: (item: T, globalIndex: number) => React.ReactNode;
  empty?: React.ReactNode;
  /** Row stack spacing inside one page. */
  className?: string;
}

export function WidgetList<T>({
  items,
  pageSize = 6,
  renderItem,
  empty = null,
  className = 'space-y-2.5',
}: WidgetListProps<T>) {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (items.length === 0) return <>{empty}</>;

  const start = (safePage - 1) * pageSize;

  return (
    <div>
      <div className={className}>{items.slice(start, start + pageSize).map((item, i) => renderItem(item, start + i))}</div>
      {items.length > pageSize && (
        <Pagination
          currentPage={safePage}
          totalItems={items.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
