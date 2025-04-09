import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import SearchBar from '@/components/shared/SearchBar'; // Assume this exists
import { Pagination } from '@/components/shared/Pagination'; // Assume this exists
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { LogEntry } from '../../../../backend/src/functionalities/log/models';
import type { SearchRequest, SearchResponse } from '../../../../backend/src/utils/search';

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


    // Fetch/Search Logs
    const fetchLogs = useCallback(async (page = currentPage, query = searchQuery) => {
        if (!token) return;
        setIsLoading(true);
        setError(null);
        try {
            const searchRequest: SearchRequest = {
                query: query,
                page: page,
                pageSize: pageSize,
                // TODO: Add sorting options if needed in SearchRequest backend/frontend
            };
            const response = await api.searchLogs(searchRequest, token);
            setLogs(response.data);
            setTotalLogs(response.totalSize);
            setTotalPages(response.totalPages);
            setCurrentPage(response.page);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch logs');
            setLogs([]);
            setTotalLogs(0);
            setTotalPages(1);
        } finally {
            setIsLoading(false);
        }
    }, [token, pageSize, currentPage, searchQuery]);

    useEffect(() => {
        fetchLogs(currentPage, searchQuery);
    }, [fetchLogs, currentPage, searchQuery]);


   const handleSearch = (newQuery: SearchRequest['query']) => {
       setSearchQuery(newQuery);
       setCurrentPage(1); // Reset page on new search
   };

   const handlePageChange = (newPage: number) => {
       setCurrentPage(newPage);
   };

   // Function to safely parse and format log data
   const formatLogData = (dataString: string | null | undefined): string => {
       if (!dataString) return 'N/A';
       try {
           const parsed = JSON.parse(dataString);
           // Basic formatting, could be more sophisticated
           return JSON.stringify(parsed, null, 2);
       } catch (e) {
           return dataString; // Return raw string if not valid JSON
       }
   };


    return (
        <Card>
            <CardHeader>
                 <CardTitle>System Logs</CardTitle>
                 <CardDescription>View system events and errors.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
                 {/* Log Search Bar */}
                 <SearchBar
                     fields={[
                         { value: 'level', label: 'Level', type: 'select', options: [{value: 'info', label: 'Info'}, {value: 'error', label: 'Error'}]},
                         { value: 'userId', label: 'User ID', type: 'text'},
                         { value: 'category', label: 'Category', type: 'text'},
                         { value: 'message', label: 'Message', type: 'text'},
                         { value: 'createdOn', label: 'Date', type: 'date'}, // Need date picker + range logic
                     ]}
                     onSearch={handleSearch}
                     isLoading={isLoading}
                 />

                 {isLoading && <div className='flex justify-center py-10'><LoadingSpinner /></div>}
                 {error && <ErrorDisplay message={error} />}

                 {!isLoading && !error && logs.length > 0 && (
                    <div className="border rounded-lg max-h-[60vh] overflow-auto">
                        <Table>
                            <TableHeader className='sticky top-0 bg-background'>
                                <TableRow>
                                    <TableHead className='w-[150px]'>Timestamp</TableHead>
                                    <TableHead className='w-[80px]'>Level</TableHead>
                                    <TableHead className='w-[100px]'>User</TableHead>
                                    <TableHead className='w-[100px]'>Category</TableHead>
                                    <TableHead>Message</TableHead>
                                    <TableHead>Data</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>{new Date(log.createdOn).toLocaleString()}</TableCell>
                                        <TableCell>
                                             <Badge variant={log.level === 'error' ? 'destructive' : 'secondary'}>
                                                 {log.level}
                                             </Badge>
                                         </TableCell>
                                        <TableCell>{log.userId || 'system'}</TableCell>
                                        <TableCell>{log.category || 'general'}</TableCell>
                                        <TableCell className='text-sm'>{log.message}</TableCell>
                                        <TableCell>
                                            {log.data && (
                                                <details>
                                                    <summary className='cursor-pointer text-xs text-blue-600 hover:underline'>View Data</summary>
                                                    <pre className='mt-1 p-2 text-xs bg-muted rounded overflow-auto max-w-xs'>
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
                 )}
                 {!isLoading && !error && logs.length === 0 && (
                    <p className='text-muted-foreground text-center'>No logs found matching criteria.</p>
                 )}

                 {/* Pagination */}
                 {totalPages > 1 && (
                     <div className="mt-4 flex justify-center">
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