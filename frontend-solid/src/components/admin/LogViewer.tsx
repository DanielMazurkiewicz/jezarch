import { Component, createResource, createSignal, For, Show, Suspense } from 'solid-js'; // Added Suspense
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { LogEntry } from '../../../../backend/src/functionalities/log/models';
import type { SearchRequest, SearchQueryElement } from '../../../../backend/src/utils/search';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from '@/components/ui/Badge';
import type { ComponentProps } from 'solid-js'; // Import ComponentProps
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import SearchBar, { type SearchFieldOption } from '@/components/shared/SearchBar'; // Import SearchBar
import { Pagination } from '@/components/shared/Pagination'; // Import Pagination
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatDate } from '@/lib/utils'; // Use utility function
import styles from './LogViewer.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils'; // Import cn if needed

const LOGS_PAGE_SIZE = 20;

const LogViewer: Component = () => {
    const [authState] = useAuth();
    const [searchQuery, setSearchQuery] = createSignal<SearchRequest['query']>([]);
    const [currentPage, setCurrentPage] = createSignal(1);

    // Resource for fetching logs
    const [logsData, { refetch: refetchLogs }] = createResource(
        () => ({ token: authState.token, page: currentPage(), query: searchQuery() }), // Dependencies
        async ({ token, page, query }) => {
            if (!token) return { data: [], totalSize: 0, totalPages: 1, page: 1 }; // Default empty state
            console.log(`Fetching logs - Page: ${page}, Query:`, query);
            const searchRequest: SearchRequest = { query, page, pageSize: LOGS_PAGE_SIZE };
            try {
                return await api.searchLogs(searchRequest, token);
            } catch (error) {
                 console.error("Fetch Logs Error:", error);
                 // TODO: Toast error
                 throw error; // Propagate error to resource state
            }
        },
        { initialValue: { data: [], totalSize: 0, totalPages: 1, page: 1 } }
    );

    const handleSearch = (newQuery: SearchQueryElement[]) => {
        if (JSON.stringify(newQuery) !== JSON.stringify(searchQuery())) {
            setSearchQuery(newQuery);
            setCurrentPage(1); // Reset page on new search
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage !== currentPage()) {
            setCurrentPage(newPage);
        }
    };

    // Function to format log data (JSON or string)
    const formatLogData = (dataString: string | null | undefined): string => {
        if (!dataString) return 'N/A';
        try {
            const parsed = JSON.parse(dataString);
            return JSON.stringify(parsed, null, 2); // Pretty print
        } catch (e) {
            return dataString; // Return as is if not JSON
        }
    };

    // Determine badge variant based on log level
    const getBadgeVariant = (level: string): ComponentProps<typeof Badge>['variant'] => { // Get variant type from Badge props
        switch (level?.toLowerCase()) {
            case 'error': return 'destructive';
            case 'warn': return 'warning'; // Assuming a warning variant exists
            case 'info': return 'outline';
            default: return 'secondary';
        }
    };

     // --- Search Fields Definition ---
     const searchFields: SearchFieldOption[] = [ // Define searchable fields
         { value: 'level', label: 'Level', type: 'select' as const, options: [{value: 'info', label: 'Info'}, {value: 'warn', label: 'Warning'}, {value: 'error', label: 'Error'}]},
         { value: 'userId', label: 'User ID', type: 'text' as const},
         { value: 'category', label: 'Category', type: 'text' as const},
         { value: 'message', label: 'Message', type: 'text' as const},
         { value: 'createdOn', label: 'Date', type: 'date' as const}, // Needs date picker component in SearchBar
     ];

    return (
        <Card class={styles.logViewerCard}>
            <CardHeader>
                <CardTitle>System Logs</CardTitle>
                <CardDescription>View system events, errors, and warnings.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4"> {/* Use class from utils or plain CSS */}
                {/* Log Search Bar */}
                <div class={styles.searchBarContainer}>
                    <SearchBar fields={searchFields} onSearch={handleSearch} isLoading={logsData.loading} />
                </div>

                {/* Display Error */}
                 <Show when={logsData.error}>
                    <ErrorDisplay message={`Failed to load logs: ${logsData.error?.message}`} />
                 </Show>

                 {/* Loading State or Table */}
                 <Show when={!logsData.loading && !logsData.error && logsData()}
                    fallback={
                         <Show when={logsData.loading}>
                             <div class={styles.loadingContainer}><LoadingSpinner size="lg"/></div>
                         </Show>
                    }
                 >
                     {(data) => ( // data() is the accessor
                         <Show when={data().data.length > 0}
                             fallback={<p class='text-muted-foreground text-center py-6'>No logs found matching criteria.</p>}
                         >
                             <div class={styles.tableContainer}>
                                  <div class={styles.tableScrollWrapper}>
                                      <Table>
                                          {/* Sticky Header */}
                                          <TableHeader class={styles.stickyHeader}>
                                             <TableRow>
                                                 <TableHead class={styles.timestampCell}>Timestamp</TableHead>
                                                 <TableHead class={styles.levelCell}>Level</TableHead>
                                                 <TableHead class={styles.userCell}>User</TableHead>
                                                 <TableHead class={styles.categoryCell}>Category</TableHead>
                                                 <TableHead class={styles.messageCell}>Message</TableHead>
                                                 <TableHead class={styles.dataCell}>Data</TableHead>
                                             </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                              <For each={data().data}>
                                                 {(log) => (
                                                     <TableRow>
                                                         <TableCell class={styles.timestampCell}>{formatDate(log.createdOn)}</TableCell>
                                                         <TableCell class={styles.levelCell}>
                                                             <Badge variant={getBadgeVariant(log.level)}>{log.level}</Badge>
                                                         </TableCell>
                                                         <TableCell class={styles.userCell}>{log.userId || <i class={styles.mutedItalic}>System</i>}</TableCell>
                                                         <TableCell class={styles.categoryCell}>{log.category || <i class={styles.mutedItalic}>General</i>}</TableCell>
                                                         <TableCell class={styles.messageCell}>{log.message}</TableCell>
                                                         <TableCell class={styles.dataCell}>
                                                             <Show when={log.data}>
                                                                  <details class={styles.dataDetails}>
                                                                     <summary class={styles.dataSummary}>View Data</summary>
                                                                     <pre class={styles.dataPre}>
                                                                         {formatLogData(log.data)}
                                                                     </pre>
                                                                 </details>
                                                             </Show>
                                                         </TableCell>
                                                     </TableRow>
                                                 )}
                                             </For>
                                          </TableBody>
                                      </Table>
                                  </div>
                             </div>

                              {/* Pagination */}
                              <Show when={(data()?.totalPages ?? 0) > 1}>
                                  <div class={styles.paginationContainer}>
                                      <Pagination
                                          currentPage={currentPage()}
                                          totalPages={data()?.totalPages ?? 1}
                                          onPageChange={handlePageChange}
                                      />
                                  </div>
                              </Show>
                          </Show>
                     )}
                 </Show>
            </CardContent>
        </Card>
    );
};

export default LogViewer;