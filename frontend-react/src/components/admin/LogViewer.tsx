import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority'; // Import directly from cva
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import SearchBar from '@/components/shared/SearchBar';
import { Pagination } from '@/components/shared/Pagination';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { LogEntry } from '../../../../backend/src/functionalities/log/models';
import type { SearchRequest, SearchResponse } from '../../../../backend/src/utils/search';
import { cn } from '@/lib/utils'; // Import cn for conditional classes

// Define the type alias for badge variants
type BadgeVariant = VariantProps<typeof Badge>['variant'];

const LogViewer: React.FC = () => {
    const { token } = useAuth();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Search & Pagination State
    const [searchQuery, setSearchQuery] = useState<SearchRequest['query']>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20); // Show more logs per page
    const [totalLogs, setTotalLogs] = useState(0);
    const [totalPages, setTotalPages] = useState(1);


    // Fetch/Search Logs function
    const fetchLogs = useCallback(async (page = currentPage, query = searchQuery) => {
        if (!token) return;
        setIsLoading(true);
        setError(null);
        try {
            const searchRequest: SearchRequest = {
                query: query,
                page: page,
                pageSize: pageSize,
                // Optional: Add default sorting
                // sort: [{ field: 'createdOn', direction: 'DESC' }]
            };
            const response = await api.searchLogs(searchRequest, token);
            setLogs(response.data);
            setTotalLogs(response.totalSize);
            setTotalPages(response.totalPages);
            setCurrentPage(response.page); // Update current page from response
        } catch (err: any) {
            setError(err.message || 'Failed to fetch logs');
            setLogs([]); // Clear logs on error
            setTotalLogs(0);
            setTotalPages(1);
        } finally {
            setIsLoading(false);
        }
    }, [token, pageSize, currentPage, searchQuery]); // Ensure dependencies are correct

    // Fetch logs on mount and when dependencies change
    useEffect(() => {
        fetchLogs(currentPage, searchQuery);
    }, [fetchLogs, currentPage, searchQuery]);


   const handleSearch = (newQuery: SearchRequest['query']) => {
       setSearchQuery(newQuery);
       setCurrentPage(1); // Reset page on new search
       // fetchLogs is triggered by useEffect dependency change
   };

   const handlePageChange = (newPage: number) => {
       setCurrentPage(newPage);
       // fetchLogs is triggered by useEffect dependency change
   };

   // Function to safely parse and format log data (JSON or string)
   const formatLogData = (dataString: string | null | undefined): string => {
       if (!dataString) return 'N/A';
       try {
           const parsed = JSON.parse(dataString);
           // Pretty-print JSON
           return JSON.stringify(parsed, null, 2);
       } catch (e) {
           // Return raw string if not valid JSON
           return dataString;
       }
   };

   // Determine badge variant based on log level
   const getBadgeVariant = (level: string): BadgeVariant => {
        switch (level.toLowerCase()) {
            case 'error': return 'destructive';
            case 'warn': return 'secondary'; // Or choose another color
            case 'info': return 'outline';
            default: return 'secondary';
        }
   };

    // Render the component within a Card - forced white background
    return (
        <Card className="bg-white dark:bg-white text-neutral-900 dark:text-neutral-900">
            <CardHeader>
                 <CardTitle>System Logs</CardTitle>
                 <CardDescription>View system events, errors, and warnings.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'> {/* Add spacing inside content */}
                 {/* Log Search Bar */}
                 <SearchBar
                     fields={[ // Define searchable fields
                         { value: 'level', label: 'Level', type: 'select', options: [{value: 'info', label: 'Info'}, {value: 'warn', label: 'Warning'}, {value: 'error', label: 'Error'}]},
                         { value: 'userId', label: 'User ID', type: 'text'},
                         { value: 'category', label: 'Category', type: 'text'},
                         { value: 'message', label: 'Message', type: 'text'},
                         // Date range requires a more complex component or backend logic adjustment
                         { value: 'createdOn', label: 'Date', type: 'date'},
                     ]}
                     onSearch={handleSearch}
                     isLoading={isLoading}
                 />

                 {/* Display Error */}
                 {error && <ErrorDisplay message={error} />}

                 {/* Loading State */}
                 {isLoading && <div className='flex justify-center py-10'><LoadingSpinner /></div>}

                 {/* Log Table */}
                 {!isLoading && !error && logs.length > 0 && (
                    // Wrap table in div for border and overflow handling
                    <div className="border rounded-lg overflow-hidden">
                        {/* Make table body scrollable */}
                        <div className='max-h-[60vh] overflow-y-auto relative'> {/* Add relative positioning */}
                             <Table>
                                 {/* Sticky header for scrolling */}
                                 <TableHeader className='sticky top-0 bg-white z-10'> {/* Use white sticky header */}
                                    <TableRow>
                                        <TableHead className='w-[180px]'>Timestamp</TableHead>
                                        <TableHead className='w-[100px]'>Level</TableHead>
                                        <TableHead className='w-[120px]'>User</TableHead>
                                        <TableHead className='w-[120px]'>Category</TableHead>
                                        <TableHead>Message</TableHead>
                                        <TableHead className='w-[150px]'>Data</TableHead>
                                    </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id}>
                                            {/* Format date/time */}
                                            <TableCell className='text-xs'>{new Date(log.createdOn).toLocaleString()}</TableCell>
                                            <TableCell>
                                                {/* Log Level Badge */}
                                                <Badge variant={getBadgeVariant(log.level)} className='capitalize'>
                                                     {log.level}
                                                </Badge>
                                             </TableCell>
                                            {/* User ID or System */}
                                            <TableCell className='text-xs'>{log.userId || <i className='text-muted-foreground'>System</i>}</TableCell>
                                            {/* Category or General */}
                                            <TableCell className='text-xs'>{log.category || <i className='text-muted-foreground'>General</i>}</TableCell>
                                            {/* Log Message */}
                                            <TableCell className='text-sm'>{log.message}</TableCell>
                                            <TableCell>
                                                {/* Expandable Log Data */}
                                                {log.data && (
                                                    <details>
                                                        <summary className='cursor-pointer text-xs text-primary hover:underline'>View Data</summary>
                                                        {/* Preformatted, scrollable data block */}
                                                        <pre className='mt-1 p-2 text-xs bg-muted rounded overflow-auto max-w-xs max-h-40'>
                                                            {formatLogData(log.data)}
                                                        </pre>
                                                    </details>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                 </TableBody>
                             </Table>
                        </div>
                     </div>
                 )}

                 {/* Empty State */}
                 {!isLoading && !error && logs.length === 0 && (
                    <p className='text-muted-foreground text-center py-6'>No logs found matching criteria.</p>
                 )}

                 {/* Pagination */}
                 {totalPages > 1 && (
                     <div className="pt-4 flex justify-center"> {/* Add padding top */}
                         <Pagination
                              currentPage={currentPage}
                              totalPages={totalPages}
                              onPageChange={handlePageChange}
                         />
                     </div>
                 )}
            </CardContent>
        </Card>
    );
};

export default LogViewer;