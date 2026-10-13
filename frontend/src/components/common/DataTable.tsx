/**
 * DataTable — typed, accessible, responsive table primitive for management
 * surfaces. Reuses the project's `table-stacked` CSS (mobile cards with
 * `data-label`) and glass-panel aesthetic; see `index.css` for the breakpoint.
 *
 * Features:
 *  - Generic rows T with typed column definitions
 *  - Optional sortable columns (click header; caller owns sort state)
 *  - Loading / empty states
 *  - Optional row click (keyboard + pointer)
 *  - Responsive wrapper (overflow-x-auto, never overflows the viewport)
 *  - Mobile-friendly: each cell carries its column label via data-label
 *
 * Conventions: Persian text, RTL, dark-mode aware, no fake/async pagination
 * (pagination is the caller's job when a server API supports it).
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  /** Cell render. Receives the full row for typing + flexibility. */
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
  /** Column width e.g. "w-24" or "min-w-[120px]". */
  className?: string;
  headerClassName?: string;
  /** Visible on mobile as the cell's `data-label`. Falls back to header text. */
  mobileLabel?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  /** Shown in the empty state (non-loading, data length 0). */
  emptyMessage?: React.ReactNode;
  emptyIcon?: React.ReactNode;
  /** Stable row identity for the click handler + React key. */
  rowKey?: string | ((row: T) => string | number);
  /** Click handler — row becomes a button (keyboard accessible). */
  onRowClick?: (row: T) => void;
  /** Currently sorted column key (renders the active header indicator). */
  sortKey?: string;
  /** Current sort direction. */
  sortDir?: 'asc' | 'desc';
  /** Sorts caller's already-sorted data by reflecting direction in headers. */
  onSort?: (key: string, dir: 'asc' | 'desc') => void;
  className?: string;
}

export function DataTable<T,>({
  columns,
  data,
  loading = false,
  emptyMessage,
  emptyIcon,
  rowKey,
  onRowClick,
  sortKey,
  sortDir = 'asc',
  onSort,
  className,
}: DataTableProps<T>) {
  // ---- Loading: skeleton rows ----
  if (loading) {
    return (
      <div className={cn('w-full', className)}>
        <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-white/5 bg-white dark:bg-stone-900">
          <table className="w-full text-right text-xs table-stacked">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="p-3.5 text-right">
                    <Skeleton className="h-3.5 w-24 mx-auto" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={`skel-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key} className="p-3.5">
                      <Skeleton className="h-3.5 w-full max-w-[80%]" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---- Empty state ----
  if (!data.length) {
    return (
      <div className={cn('w-full', className)}>
        <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-white/5 bg-white dark:bg-stone-900">
          <table className="w-full text-right text-xs table-stacked">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="p-3.5 text-xs font-bold text-stone-600 dark:text-gray-400 text-right"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={columns.length} className="py-10">
                  <div className="flex flex-col items-center gap-2 text-center">
                    {emptyIcon}
                    <span className="text-sm font-black text-stone-900 dark:text-white">
                      {emptyMessage || 'داده‌ای یافت نشد'}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full overflow-x-auto rounded-xl border border-stone-200 dark:border-white/5 bg-white dark:bg-stone-900',
        className
      )}
    >
      <table className="w-full text-right text-xs table-stacked">
        <thead className="bg-stone-100 dark:bg-[#1A1A1E] text-stone-700 dark:text-gray-300 font-bold border-b border-stone-200 dark:border-white/10">
          <tr>
            {columns.map((col) => {
              const active = sortKey === col.key;
              const canSort = col.sortable && onSort;
              const nextDir = active && sortDir === 'asc' ? 'desc' : 'asc';
              return (
                <th
                  key={col.key}
                  className={cn(
                    'p-3.5 text-right transition-colors',
                    canSort ? 'cursor-pointer select-none hover:text-brand-ink dark:hover:text-brand' : 'cursor-default',
                    col.headerClassName
                  )}
                  onClick={canSort ? (e) => { e.stopPropagation(); onSort!(col.key, nextDir); } : undefined}
                  aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : canSort ? 'none' : undefined}
                >
                  <div className={cn('flex items-center gap-1 justify-end', active ? 'font-black' : '')}>
                    {col.header}
                    {canSort && (active ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : null)}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200 dark:divide-white/5">
          {data.map((row, idx) => {
            const rid = rowKey
              ? typeof rowKey === 'function'
                ? rowKey(row)
                : String((row as Record<string, unknown>)[rowKey])
              : idx;
            const content = (
              <>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    data-label={col.mobileLabel ?? (typeof col.header === 'string' ? col.header : undefined)}
                    className={cn('p-3.5 align-top', onRowClick ? 'cursor-pointer' : '')}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </>
            );
            return onRowClick ? (
              <tr
                key={rid}
                onClick={() => onRowClick(row)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row); } }}
                tabIndex={0}
                className="hover:bg-stone-50 dark:hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/30 transition-colors"
              >
                {content}
              </tr>
            ) : (
              <tr key={rid} className="hover:bg-stone-50 dark:hover:bg-white/[0.02] transition-colors">
                {content}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
