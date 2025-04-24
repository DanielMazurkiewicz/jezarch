import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import ErrorDisplay from "@/components/Shared/ErrorDisplay";
import SearchBar from "@/components/Shared/SearchBar"; // Assuming SearchBar exists
import { Pagination } from "@/components/Shared/Pagination"; // Assuming Pagination exists
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import type { LogEntry } from "../../../../backend/src/functionalities/log/models";
import type { SearchRequest, SearchQuery } from "../../../../backend/src/utils/search";

const { div, p, i, details, summary, pre } = van.tags;

// --- Styles ---
const logViewerCardStyle = style({ /* No forced white bg needed */ });
const spinnerContainerStyle = style([styles.flex, styles.justifyCenter, styles.py6]);
const tableContainerStyle = style([styles.border, styles.roundedLg, styles.overflowHidden]);
const tableScrollWrapperStyle = style([styles.maxH60vh, styles.overflowYAuto, styles.relative]); // Added maxH60vh
const stickyHeaderStyle = style([styles.sticky, styles.top0, styles.bgCard, { zIndex: 1 }]); // Use card background for sticky header
const timestampCellStyle = style([styles.textXs]);
const userIdCellStyle = style([styles.textXs]);
const categoryCellStyle = style([styles.textXs]);
const messageCellStyle = style([styles.textSm]);
const detailsSummaryStyle = style([styles.cursorPointer, styles.textXs, styles.textPrimary, { ':hover': { textDecoration: 'underline' } }]);
const detailsContentStyle = style([styles.mt1, styles.p2, styles.textXs, styles.bgMuted, styles.roundedMd, styles.overflowAuto, { maxHeight: '10rem', maxWidth: '20rem' }]); // Added mt1

// --- Helper Functions ---
const formatLogData = (dataString: string | null | undefined): string => {
    if (!dataString) return 'N/A';
    try {
        return JSON.stringify(JSON.parse(dataString), null, 2);
    } catch (e) { return dataString; } // Return raw if not JSON
};

const getBadgeVariant = (level: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (level.toLowerCase()) {
        case 'error': return 'destructive';
        case 'warn': return 'secondary'; // Yellow/Orange might be better? Needs theme adjustment.
        case 'info': return 'outline';
        default: return 'secondary';
    }
};

const formatDate = (dateInput: Date | string | undefined | null): string => {
    if (!dateInput) return "N/A";
    try {
        const date = new Date(dateInput);
        return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleString();
    } catch (e) { return "Error"; }
};


// --- Component ---
const LogViewer = () => {
    const { token } = authStore;

    // --- State ---
    const logs = van.state<LogEntry[]>([]);
    const isLoading = van.state(false);
    const error = van.state<string | null>(null);
    const searchQuery = van.state<SearchQuery>([]);
    const currentPage = van.state(1);
    const pageSize = 20; // Static page size for simplicity
    const totalLogs = van.state(0);
    const totalPages = van.state(1);
    const fetchTrigger = van.state(0); // State to trigger fetch effect

    // --- Data Fetching ---
    const fetchLogs = async (page = currentPage.val, query = searchQuery.val) => {
        if (!token.val) return;
        isLoading.val = true;
        error.val = null;
        try {
            const searchRequest: SearchRequest = { query, page, pageSize };
            const response = await api.searchLogs(searchRequest, token.val);
            logs.val = response.data;
            totalLogs.val = response.totalSize;
            totalPages.val = response.totalPages;
            currentPage.val = response.page; // Sync page from response
        } catch (err: any) {
            const msg = err.message || 'Failed to fetch logs';
            error.val = msg;
            logs.val = []; totalLogs.val = 0; totalPages.val = 1;
        } finally {
            isLoading.val = false;
        }
    };

    // Effect to fetch logs when dependencies change
    // Replacing van.effect with reactivity based on state changes
    van.derive(() => {
        // Read states to establish dependency
        const currentToken = token.val;
        const page = currentPage.val;
        const query = searchQuery.val;
        fetchTrigger.val; // Depend on trigger

        if (currentToken) {
            fetchLogs(page, query);
        } else {
            // Clear logs if token becomes invalid/null
            logs.val = []; totalLogs.val = 0; totalPages.val = 1;
        }
    });


    // --- Event Handlers ---
    const handleSearch = (newQuery: SearchQuery) => {
        searchQuery.val = newQuery;
        if (currentPage.val === 1) {
            fetchTrigger.val++; // Trigger refetch if already on page 1
        } else {
            currentPage.val = 1; // Reset page, triggers effect
        }
    };

    const handlePageChange = (newPage: number) => {
        currentPage.val = newPage; // Triggers effect
    };

    // --- Search Bar Fields ---
    const searchFields = [
        { value: 'level', label: 'Level', type: 'select' as const, options: [{value: 'info', label: 'Info'}, {value: 'warn', label: 'Warning'}, {value: 'error', label: 'Error'}]},
        { value: 'userId', label: 'User ID', type: 'text' as const },
        { value: 'category', label: 'Category', type: 'text' as const },
        { value: 'message', label: 'Message', type: 'text' as const },
        { value: 'createdOn', label: 'Date', type: 'date' as const },
    ];

    // --- Render ---
    return Card({ class: logViewerCardStyle },
        CardHeader(
            CardTitle("System Logs"),
            CardDescription("View system events, errors, and warnings.")
        ),
        CardContent({ class: styles.spaceY4 },
            // Search Bar
            SearchBar({ fields: searchFields, onSearch: handleSearch, isLoading: isLoading }),

            // Display Error
            () => error.val ? ErrorDisplay({ message: error.val }) : null,

            // Loading State
            () => isLoading.val ? div({ class: spinnerContainerStyle }, LoadingSpinner({})) : null, // Pass empty props object

            // Log Table (conditionally rendered)
            () => (!isLoading.val && !error.val && logs.val.length > 0) ? div({ class: tableContainerStyle },
                div({ class: tableScrollWrapperStyle },
                    Table(
                        TableHeader({ class: stickyHeaderStyle },
                            TableRow(
                                TableHead({ class: 'w-[180px]' }, "Timestamp"),
                                TableHead({ class: 'w-[100px]' }, "Level"),
                                TableHead({ class: 'w-[120px]' }, "User"),
                                TableHead({ class: 'w-[120px]' }, "Category"),
                                TableHead("Message"),
                                TableHead({ class: 'w-[150px]' }, "Data")
                            )
                        ),
                        TableBody(
                            // Reactively render rows
                            van.derive(() => logs.val.map((log) => // Wrap map in derive for reactivity
                                TableRow({ key: log.id },
                                    TableCell({ class: timestampCellStyle }, formatDate(log.createdOn)),
                                    TableCell(Badge({ variant: getBadgeVariant(log.level), class: 'capitalize' }, log.level)),
                                    TableCell({ class: userIdCellStyle }, log.userId || i({ class: styles.textMutedForeground }, "System")),
                                    TableCell({ class: categoryCellStyle }, log.category || i({ class: styles.textMutedForeground }, "General")),
                                    TableCell({ class: messageCellStyle }, log.message),
                                    TableCell(
                                        log.data ? details(
                                            summary({ class: detailsSummaryStyle }, "View Data"),
                                            pre({ class: detailsContentStyle }, formatLogData(log.data))
                                        ) : null
                                    )
                                )
                            )) // End map + derive
                        ) // End TableBody
                    ) // End Table
                ) // End Scroll Wrapper
            ) : null, // End Table Container conditional

            // Empty State
            () => (!isLoading.val && !error.val && logs.val.length === 0)
                ? p({ class: `${styles.textMutedForeground} ${styles.textCenter} ${styles.py6}` }, "No logs found matching criteria.")
                : null,

            // Pagination
             () => !isLoading.val && totalPages.val > 1 ? div({ class: `${styles.pt4} ${styles.flex} ${styles.justifyCenter}` },
                 Pagination({ currentPage: currentPage, totalPages: totalPages, onPageChange: handlePageChange })
             ) : null
        ) // End CardContent
    ); // End Card
};

export default LogViewer;