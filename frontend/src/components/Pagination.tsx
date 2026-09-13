import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = '',
}) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  if (totalItems === 0 || totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers array (showing current page and neighbors)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-brand-sage/20 text-xs ${className}`}>
      
      {/* Items count */}
      <div className="flex items-center gap-3 text-gray-600 dark:text-[#E8E1CE]">
        <span>
          {isAr ? (
            <>عرض <strong className="font-bold text-gray-900 dark:text-[#F5EFE0]">{startItem} - {endItem}</strong> من أصل <strong className="font-bold text-emerald-700 dark:text-emerald-400">{totalItems}</strong> عنصر</>
          ) : (
            <>Showing <strong className="font-bold text-gray-900 dark:text-[#F5EFE0]">{startItem} - {endItem}</strong> of <strong className="font-bold text-emerald-700 dark:text-emerald-400">{totalItems}</strong> items</>
          )}
        </span>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* Previous Page Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-sage/30 bg-white dark:bg-[#1A281E] text-gray-700 dark:text-[#E8E1CE] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-40 disabled:pointer-events-none transition-all font-medium"
          title={isAr ? "الصفحة السابقة" : "Previous Page"}
        >
          <ChevronRight size={14} className="rtl:rotate-0 rotate-180" />
          <span className="hidden sm:inline">{isAr ? 'السابق' : 'Previous'}</span>
        </button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) =>
            typeof page === 'number' ? (
              <button
                key={idx}
                onClick={() => onPageChange(page)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  currentPage === page
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-[#1A281E] border border-brand-sage/30 text-gray-700 dark:text-[#E8E1CE] hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                {page}
              </button>
            ) : (
              <span key={idx} className="px-1 text-gray-400 font-bold">
                {page}
              </span>
            )
          )}
        </div>

        {/* Next Page Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-sage/30 bg-white dark:bg-[#1A281E] text-gray-700 dark:text-[#E8E1CE] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-40 disabled:pointer-events-none transition-all font-medium"
          title={isAr ? "الصفحة التالية" : "Next Page"}
        >
          <span className="hidden sm:inline">{isAr ? 'التالي' : 'Next'}</span>
          <ChevronLeft size={14} className="rtl:rotate-0 rotate-180" />
        </button>
      </div>
    </div>
  );
};
