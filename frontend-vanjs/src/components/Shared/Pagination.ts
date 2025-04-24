import van, { State } from "vanjs-core"; // Import State
import { Button } from "@/components/ui/Button";
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import { themeVars } from "@/styles/theme.css"; // Import themeVars
import { style } from "@vanilla-extract/css";

const { nav, ul, li, span } = van.tags;

// --- Styles ---
const paginationContainerStyle = style([styles.flex, styles.justifyCenter]);
const paginationContentStyle = style([styles.flex, styles.itemsCenter, styles.gap1]);
const ellipsisStyle = style([styles.flex, styles.itemsCenter, styles.justifyCenter, styles.h9, styles.w9]); // Added h9, w9
const pageLinkStyle = style({}); // Base style can be empty if Button handles it
const activePageLinkStyle = style({ // Style for the active page button
    // Example: Different border or background, Button variant="outline" might handle this
    borderColor: themeVars.color.primary,
    backgroundColor: themeVars.color.accent, // Or primary if preferred
    color: themeVars.color.accentForeground, // Adjust text color for active state
    fontWeight: styles.fontSemibold.fontWeight, // Make active bolder
});

// --- Component Props ---
interface PaginationProps {
    currentPage: State<number> | number;
    totalPages: State<number> | number;
    onPageChange: (page: number) => void;
    maxVisiblePages?: number; // Max page numbers to show directly
    class?: string; // Allow adding custom classes
}

// --- Component ---
export const Pagination = ({
    currentPage: currentPageProp,
    totalPages: totalPagesProp,
    onPageChange,
    maxVisiblePages = 5,
    class: className = ''
}: PaginationProps) => {

    // Ensure states are VanJS states OR create them if needed
    const currentPage = typeof currentPageProp === 'object' && 'val' in currentPageProp ? currentPageProp : van.state(currentPageProp);
    const totalPages = typeof totalPagesProp === 'object' && 'val' in totalPagesProp ? totalPagesProp : van.state(totalPagesProp);

    const handlePrevious = () => {
        if (currentPage.val > 1) {
            onPageChange(currentPage.val - 1);
        }
    };

    const handleNext = () => {
        if (currentPage.val < totalPages.val) {
            onPageChange(currentPage.val + 1);
        }
    };

    const handlePageClick = (page: number) => {
        if (page !== currentPage.val) {
            onPageChange(page);
        }
    };

    // Derive page numbers reactively
    const pageNumbers = van.derive((): (number | 'ellipsis')[] => {
        const total = totalPages.val;
        if (total <= 1) return []; // No numbers if only one page or less

        const current = currentPage.val;
        const pages: (number | 'ellipsis')[] = [];

        // Ensure maxVisiblePages is at least 5 for the logic below
        const effectiveMaxVisible = Math.max(5, maxVisiblePages);

        if (total <= effectiveMaxVisible) {
            for (let i = 1; i <= total; i++) pages.push(i);
        } else {
            const sidePages = Math.floor((effectiveMaxVisible - 3) / 2); // Pages around current (excluding first, last, current)
            const pagesToShowAroundCurrent = sidePages * 2 + 1; // Total around current including current

            pages.push(1); // Always show first page

            // Calculate start and end for the middle section
            let startPage = Math.max(2, current - sidePages);
            let endPage = Math.min(total - 1, current + sidePages);

            // Adjust if near the beginning
            if (current - sidePages <= 2) {
                 endPage = Math.min(total - 1, 1 + pagesToShowAroundCurrent);
            }
            // Adjust if near the end
             else if (current + sidePages >= total - 1) {
                 startPage = Math.max(2, total - pagesToShowAroundCurrent);
             }

            // Ellipsis after first page?
            if (startPage > 2) pages.push('ellipsis');

            // Middle page numbers
            for (let i = startPage; i <= endPage; i++) pages.push(i);

            // Ellipsis before last page?
            if (endPage < total - 1) pages.push('ellipsis');

            pages.push(total); // Always show last page
        }
        return pages;
    });


    // Don't render if only one page
    if (totalPages.val <= 1) {
        return null;
    }

    return nav({ role: "navigation", 'aria-label': "pagination", class: `${paginationContainerStyle} ${className}`.trim() },
        ul({ class: paginationContentStyle },
            // Previous Button
            li(Button({
                variant: "outline", // Use outline for prev/next
                size: "default",
                class: styles.gap1, // Ensure gap for icon/text
                onclick: handlePrevious,
                disabled: () => currentPage.val === 1, // Reactive disabled
                'aria-label': "Go to previous page"
                },
                icons.ChevronLeftIcon({}), // Pass empty props
                span({class: `${styles.hidden} sm:inline-block`}, "Previous") // Fixed hidden style, added sm:inline-block
            )),

            // Page Number Buttons/Ellipsis (Reactive)
            van.derive(() => pageNumbers.val.map((page, index) => // Wrap map in derive
                li({ key: `${page}-${index}` }, // Unique key
                    page === 'ellipsis'
                        ? span({ 'aria-hidden': true, class: ellipsisStyle }, icons.MoreHorizontalIcon({ class: `${styles.h4} ${styles.w4}` })) // Added h4, w4
                        : Button({
                            variant: () => currentPage.val === page ? "default" : "ghost", // Active uses default, others ghost
                            size: "icon",
                            class: () => `${pageLinkStyle} ${currentPage.val === page ? activePageLinkStyle : ''}`, // Apply active style
                            onclick: () => handlePageClick(page),
                            'aria-current': () => currentPage.val === page ? 'page' : undefined,
                            'aria-label': `Go to page ${page}`
                            },
                            String(page) // Button text is the page number
                        )
                )
            )),

            // Next Button
            li(Button({
                variant: "outline",
                size: "default",
                class: styles.gap1,
                onclick: handleNext,
                disabled: () => currentPage.val === totalPages.val, // Reactive disabled
                'aria-label': "Go to next page"
                },
                span({class: `${styles.hidden} sm:inline-block`}, "Next"), // Fixed hidden style, added sm:inline-block
                icons.ChevronRightIcon({}) // Pass empty props
            ))
        )
    );
};