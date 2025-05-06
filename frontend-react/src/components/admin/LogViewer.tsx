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
import { cn } from '@/lib/utils'; // Import cn
import { Button } from '@/components/ui/button'; // Added Button
import { Input } from '@/components/ui/input'; // Added Input
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; // Added AlertDialog
import { toast } from "sonner"; // Added toast
import { Trash2, ChevronsDownUp } from 'lucide-react'; // Added Trash2, ChevronsDownUp

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

    // --- NEW: State for Purge ---
    const [purgeDays, setPurgeDays] = useState<number>(7);
    const [isPurging, setIsPurging] = useState(false);
    const [purgeError, setPurgeError] = useState<string | null>(null);
    const [isPurgeConfirmOpen, setIsPurgeConfirmOpen] = useState(false);
    // ----------------------------

    // --- NEW: State for Expanded Row ---
    const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
    // ----------------------------------

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
            };
            const response = await api.searchLogs(searchRequest, token);
            setLogs(response.data);
            setTotalLogs(response.totalSize);
            setTotalPages(response.totalPages);
            setCurrentPage(response.page); // Update current page from response
            setExpandedRowId(null); // Collapse rows on new search/page
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
   };

   const handlePageChange = (newPage: number) => {
       setCurrentPage(newPage);
   };

   // --- NEW: Purge Handler ---
   const handlePurge = async () => {
       if (!token || !purgeDays || purgeDays <= 0) {
           toast.error("Please enter a valid number of days (greater than 0).");
           return;
       }
       setIsPurging(true);
       setPurgeError(null);
       try {
           const result = await api.purgeLogs(purgeDays, token);
           toast.success(result.message || `Successfully purged ${result.deletedCount} logs.`);
           await fetchLogs(1, searchQuery); // Refresh logs on page 1 after purge
           if (currentPage !== 1) setCurrentPage(1); // Go to page 1
       } catch (err: any) {
           const msg = err.message || "Failed to purge logs.";
           setPurgeError(msg);
           toast.error(msg);
       } finally {
           setIsPurging(false);
           setIsPurgeConfirmOpen(false); // Close confirmation dialog
       }
   };
   // -------------------------

   // --- NEW: Expand Row Handler ---
   const toggleExpandRow = (logId: number) => {
       setExpandedRowId(currentId => (currentId === logId ? null : logId));
   };
   // ----------------------------

   // Function to safely parse and format log data (JSON or string)
   const formatLogData = (dataString: string | null | undefined): string => {
       if (!dataString) return 'No additional data.';
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
                 <CardDescription>View system events, errors, and warnings. Click a row to view details.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'> {/* Add spacing inside content */}
                 {/* Log Search Bar */}
                 <SearchBar
                     fields={[ // Define searchable fields
                         { value: 'level', label: 'Level', type: 'select', options: [{value: 'info', label: 'Info'}, {value: 'warn', label: 'Warning'}, {value: 'error', label: 'Error'}]},
                         { value: 'userId', label: 'User ID', type: 'text'},
                         { value: 'category', label: 'Category', type: 'text'},
                         { value: 'message', label: 'Message', type: 'text'},
                         { value: 'createdOn', label: 'Date', type: 'date'},
                     ]}
                     onSearch={handleSearch}
                     isLoading={isLoading || isPurging}
                 />

                 {/* --- NEW: Purge Controls --- */}
                  <div className="flex flex-wrap items-center justify-end gap-2 p-2 border rounded-lg bg-muted">
                     {purgeError && <ErrorDisplay message={purgeError} className="mr-auto"/>}
                     <div className="flex items-center gap-2 ml-auto">
                         <span className="text-sm text-muted-foreground">Purge logs older than:</span>
                         <Input
                             type="number"
                             value={purgeDays}
                             onChange={(e) => setPurgeDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                             min="1"
                             className="w-20 h-8"
                             disabled={isPurging}
                         />
                         <span className="text-sm text-muted-foreground">days</span>
                          <AlertDialog open={isPurgeConfirmOpen} onOpenChange={setIsPurgeConfirmOpen}>
                             <AlertDialogTrigger asChild>
                                 <Button variant="destructive" size="sm" disabled={isPurging || purgeDays <= 0}>
                                     {isPurging ? <LoadingSpinner size='sm' className='mr-2'/> : <Trash2 className='mr-2 h-4 w-4'/>}
                                     Purge Logs
                                 </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                                 <AlertDialogHeader>
                                     <AlertDialogTitle>Confirm Log Purge</AlertDialogTitle>
                                     <AlertDialogDescription>
                                         Are you sure you want to permanently delete all log entries older than {purgeDays} days? This action cannot be undone.
                                     </AlertDialogDescription>
                                 </AlertDialogHeader>
                                 <AlertDialogFooter>
                                     <AlertDialogCancel>Cancel</AlertDialogCancel>
                                     <AlertDialogAction onClick={handlePurge} disabled={isPurging}>
                                         {isPurging ? <LoadingSpinner size='sm' className='mr-2'/> : null}
                                         Yes, Purge Logs
                                     </AlertDialogAction>
                                 </AlertDialogFooter>
                             </AlertDialogContent>
                          </AlertDialog>
                     </div>
                  </div>
                 {/* --- END Purge Controls --- */}

                 {/* Display Fetch Error */}
                 {error && <ErrorDisplay message={error} />}

                 {/* Loading State */}
                 {isLoading && <div className='flex justify-center py-10'><LoadingSpinner /></div>}

                 {/* Log Table */}
                 {!isLoading && !error && logs.length > 0 && (
                    // Wrap table in div for border and overflow handling
                    <div className="border rounded-lg overflow-hidden">
                        <div className='max-h-[60vh] overflow-y-auto relative'> {/* Add relative positioning */}
                             <Table>
                                 <TableHeader className='sticky top-0 bg-white z-10'>
                                    <TableRow>
                                        <TableHead className='w-[180px]'>Timestamp</TableHead>
                                        <TableHead className='w-[100px]'>Level</TableHead>
                                        <TableHead className='w-[120px]'>User</TableHead>
                                        <TableHead className='w-[120px]'>Category</TableHead>
                                        <TableHead>Message</TableHead>
                                        <TableHead className='w-[50px] text-center'>Data</TableHead> {/* Col for expand icon */}
                                    </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                    {logs.map((log) => (
                                        <React.Fragment key={log.id}>
                                            <TableRow
                                                onClick={() => toggleExpandRow(log.id!)}
                                                className={cn('cursor-pointer hover:bg-muted/50', expandedRowId === log.id && 'bg-muted/50')}
                                            >
                                                <TableCell className='text-xs'>{new Date(log.createdOn).toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <Badge variant={getBadgeVariant(log.level)} className='capitalize'>{log.level}</Badge>
                                                </TableCell>
                                                <TableCell className='text-xs'>{log.userId || <i className='text-muted-foreground'>System</i>}</TableCell>
                                                <TableCell className='text-xs'>{log.category || <i className='text-muted-foreground'>General</i>}</TableCell>
                                                <TableCell className='text-sm'>{log.message}</TableCell>
                                                {/* Expand/Collapse Icon Cell */}
                                                <TableCell className='text-center'>
                                                    {log.data && (
                                                         <ChevronsDownUp className={cn('h-4 w-4 text-muted-foreground transition-transform', expandedRowId === log.id && 'rotate-180')}/>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                            {/* --- NEW: Expanded Row for Data --- */}
                                            {expandedRowId === log.id && log.data && (
                                                <TableRow className="bg-muted/20 hover:bg-muted/30">
                                                     {/* Cell spans all columns */}
                                                     <TableCell colSpan={6} className="p-0">
                                                         <pre className='p-3 text-xs bg-transparent rounded overflow-auto'>
                                                             {formatLogData(log.data)}
                                                         </pre>
                                                     </TableCell>
                                                </TableRow>
                                            )}
                                            {/* --------------------------------- */}
                                        </React.Fragment>
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