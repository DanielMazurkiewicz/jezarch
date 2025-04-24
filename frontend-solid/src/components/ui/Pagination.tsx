import { Component, JSX, createMemo, For, splitProps } from 'solid-js';
import { Icon } from '@/components/shared/Icon';
import { cn } from '@/lib/utils';
import styles from './Pagination.module.css'; // Import CSS Module
import { Button } from './Button'; // Import Button for consistency

// --- Reusable PaginationLink ---
interface PaginationLinkProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
    isActive?: boolean;
    size?: 'default' | 'icon' | 'sm' | 'lg'; // Match button sizes
    variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'link' | 'destructive'; // Match button variants
}
const PaginationLink: Component<PaginationLinkProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'variant', 'size', 'isActive', 'children', 'disabled']);
    return (
        <Button
            variant={local.isActive ? 'outline' : local.variant ?? 'ghost'}
            size={local.size ?? 'icon'}
            aria-current={local.isActive ? "page" : undefined}
            disabled={local.disabled} // Button component handles disabled state
            // No need to apply recipe class here, Button does it
            class={local.class}
            {...rest} // Spread onClick etc.
        >
            {local.children}
        </Button>
    );
}

// --- Pagination Component ---
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    maxVisiblePages?: number; // Max page numbers to show directly
    class?: string; // Class for the outer nav element
}

export const Pagination: Component<PaginationProps> = (props) => {
    const [local, rest] = splitProps(props, ['currentPage', 'totalPages', 'onPageChange', 'maxVisiblePages', 'class']);
    const maxVisible = () => local.maxVisiblePages ?? 5; // Default visible pages

    const handlePrevious = (e: MouseEvent) => {
        e.preventDefault();
        if (local.currentPage > 1) {
            local.onPageChange(local.currentPage - 1);
        }
    };

    const handleNext = (e: MouseEvent) => {
        e.preventDefault();
        if (local.currentPage < local.totalPages) {
            local.onPageChange(local.currentPage + 1);
        }
    };

    const handlePageClick = (e: MouseEvent, page: number) => {
        e.preventDefault();
        if (page !== local.currentPage) {
            local.onPageChange(page);
        }
    };

    // Logic to determine which page numbers to display (memoized)
    const pageNumbers = createMemo((): (number | 'ellipsis')[] => {
        const total = local.totalPages;
        const current = local.currentPage;
        const maxVisibleNum = maxVisible();
        const pages: (number | 'ellipsis')[] = [];

        if (total <= 1) return []; // No pagination needed

        if (total <= maxVisibleNum) {
            for (let i = 1; i <= total; i++) pages.push(i);
        } else {
            const firstPage = 1;
            const lastPage = total;
            // Calculate how many pages to show around the current page
            // Subtract 1 for current page, 2 for first/last potentially, 2 for ellipses potentially
            const maxSidePages = Math.max(1, maxVisibleNum - 3); // At least 1 page besides first/last/current
            const pagesBeforeCurrent = Math.ceil(maxSidePages / 2);
            const pagesAfterCurrent = Math.floor(maxSidePages / 2);

            let startPage = Math.max(firstPage + 1, current - pagesBeforeCurrent);
            let endPage = Math.min(lastPage - 1, current + pagesAfterCurrent);

            // Adjust if range is too small
            const currentRange = endPage - startPage + 1;
            if (currentRange < maxSidePages) {
                 if (current < total / 2) { // Closer to start
                     endPage = Math.min(lastPage - 1, endPage + (maxSidePages - currentRange));
                 } else { // Closer to end
                     startPage = Math.max(firstPage + 1, startPage - (maxSidePages - currentRange));
                 }
            }


            pages.push(firstPage); // Always show first page

            if (startPage > firstPage + 1) {
                pages.push('ellipsis'); // Ellipsis after first page
            }

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }

            if (endPage < lastPage - 1) {
                pages.push('ellipsis'); // Ellipsis before last page
            }

            pages.push(lastPage); // Always show last page
        }
        return pages;
    });


    return (
        <nav class={cn(styles.paginationNav, local.class)} aria-label="Pagination" {...rest}>
            <ul class={styles.paginationContent}>
                {/* Previous Button */}
                <li class={styles.paginationItem}>
                    <PaginationLink
                        onClick={handlePrevious}
                        disabled={local.currentPage === 1}
                        size="default"
                        variant="default" // Use default variant for prev/next
                        aria-label="Go to previous page"
                    >
                        <Icon name="ChevronLeft" class={styles.prevNextIcon}/>
                        <span class={styles.prevNextText}>Previous</span>
                    </PaginationLink>
                </li>

                {/* Page Numbers & Ellipsis */}
                <For each={pageNumbers()}>
                     {(page) => (
                         <li class={styles.paginationItem}>
                             {typeof page === 'number' ? (
                                 <PaginationLink
                                     onClick={(e) => handlePageClick(e, page)}
                                     isActive={local.currentPage === page}
                                     size="icon" // Use icon size for numbers
                                     aria-label={`Go to page ${page}`}
                                 >
                                     {page}
                                 </PaginationLink>
                             ) : (
                                 <span class={styles.paginationEllipsis} aria-hidden="true">
                                     <Icon name="MoreHorizontal" class={styles.ellipsisIcon}/>
                                 </span>
                             )}
                         </li>
                     )}
                 </For>

                 {/* Next Button */}
                <li class={styles.paginationItem}>
                     <PaginationLink
                         onClick={handleNext}
                         disabled={local.currentPage === local.totalPages}
                         size="default"
                         variant="default"
                         aria-label="Go to next page"
                     >
                         <span class={styles.prevNextText}>Next</span>
                         <Icon name="ChevronRight" class={styles.prevNextIcon}/>
                     </PaginationLink>
                 </li>
            </ul>
        </nav>
    );
};