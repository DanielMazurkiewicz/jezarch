import React from 'react';
import {
  Pagination as ShadPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"; // Use Shadcn Pagination

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxVisiblePages?: number; // Max page numbers to show directly
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 5 // Sensible default (e.g., 1 ... 4 5 6 ... 10)
}) => {
  if (totalPages <= 1) {
    return null; // Don't render pagination if there's only one page or less
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    if (page !== currentPage) {
      onPageChange(page);
    }
  };

  // Logic to determine which page numbers to display
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than or equal to maxVisible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Complex case: Show first, last, current, and neighbors + ellipsis
      // Adjust logic to ensure maxVisiblePages is respected around current page
      const pagesToShow = maxVisiblePages - 2; // Minus first and last page slots
      const sidePages = Math.floor(pagesToShow / 2);
      const extraPage = pagesToShow % 2; // If maxVisible is odd, one side gets an extra page

      let startPage = Math.max(2, currentPage - sidePages);
      let endPage = Math.min(totalPages - 1, currentPage + sidePages + extraPage);

      // Adjust if near the start
      if (currentPage - sidePages <= 2) {
        endPage = Math.min(totalPages - 1, 1 + pagesToShow);
        startPage = 2; // Ensure start is 2 if possible
      }
      // Adjust if near the end
      else if (currentPage + sidePages + extraPage >= totalPages - 1) {
        startPage = Math.max(2, totalPages - pagesToShow);
        endPage = totalPages - 1; // Ensure end is totalPages - 1
      }


      pages.push(1); // Always show first page

      if (startPage > 2) {
        pages.push('ellipsis'); // Ellipsis before middle section
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages - 1) {
        pages.push('ellipsis'); // Ellipsis after middle section
      }

      pages.push(totalPages); // Always show last page
    }
    return pages;
  };


  const pageNumbers = getPageNumbers();

  return (
    <ShadPagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#" // Prevent navigation, use onClick
            onClick={(e) => { e.preventDefault(); handlePrevious(); }}
            aria-disabled={currentPage === 1}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
            size="default" // Add default size
          />
        </PaginationItem>

        {pageNumbers.map((page, index) => (
          <PaginationItem key={index}>
            {page === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#" // Prevent navigation, use onClick
                onClick={(e) => { e.preventDefault(); handlePageClick(page); }}
                isActive={currentPage === page}
                size="icon" // Use icon size for numbers
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            href="#" // Prevent navigation, use onClick
            onClick={(e) => { e.preventDefault(); handleNext(); }}
            aria-disabled={currentPage === totalPages}
            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
            size="default" // Add default size
          />
        </PaginationItem>
      </PaginationContent>
    </ShadPagination>
  );
};