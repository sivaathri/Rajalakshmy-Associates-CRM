import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable Pagination Component for Rajalakshmy Associates CRM
 * Standardized across all tables & menus.
 *
 * @param {number} currentPage - Currently active page (1-based)
 * @param {number} totalItems - Total count of items in the filtered dataset
 * @param {number} itemsPerPage - Number of items displayed per page (default: 15)
 * @param {function} onPageChange - Callback when user clicks page, Prev, or Next
 * @param {boolean} showSummary - Whether to display "Showing X to Y of Z" text (default: true)
 * @param {string} summaryLabel - Noun for items (e.g. "records", "customers", "leads", "users")
 * @param {string} className - Optional container styling classes
 */
export const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 15,
  onPageChange,
  showSummary = true,
  summaryLabel = 'records',
  className = ''
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  // Calculate visible page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        pages.push(i);
      }
    }
    return pages;
  };

  const visiblePages = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 bg-[#FAF6EF]/70 border-t border-slate-200 text-xs ${className}`}
    >
      {/* Summary Text */}
      {showSummary ? (
        <div className="text-slate-600 font-medium text-center sm:text-left">
          {totalItems === 0 ? (
            <span>No {summaryLabel} found</span>
          ) : (
            <span>
              Showing <span className="font-extrabold text-slate-900">{startIndex}</span> to{' '}
              <span className="font-extrabold text-slate-900">{endIndex}</span> of{' '}
              <span className="font-extrabold text-slate-900">{totalItems}</span> {summaryLabel}
            </span>
          )}
        </div>
      ) : (
        <div />
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Previous Button */}
          <button
            type="button"
            onClick={() => onPageChange && onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition shadow-2xs select-none"
            title="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1 px-1">
            {visiblePages.map((page, idx, arr) => (
              <React.Fragment key={page}>
                {idx > 0 && arr[idx - 1] !== page - 1 && (
                  <span className="px-1 text-slate-400 font-bold select-none">...</span>
                )}
                <button
                  type="button"
                  onClick={() => onPageChange && onPageChange(page)}
                  className={`min-w-[30px] h-[30px] px-2 rounded-xl text-xs font-bold transition select-none ${
                    currentPage === page
                      ? 'bg-burgundy-900 text-gold-300 shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={() => onPageChange && onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition shadow-2xs select-none"
            title="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
