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
import { Trash2, Info } from 'lucide-react'; // Removed ChevronsDownUp, kept others
// --- Import ScrollArea ---
import { ScrollArea } from "@/components/ui/scroll-area";
// -------------------------
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle as DataDialogTitle, DialogFooter } from '@/components/ui/dialog'; // Added DialogFooter
import { t } from '@/translations/utils'; // Import translation utility

// Define the type alias for badge variants
type BadgeVariant = VariantProps<typeof Badge>['variant'];

const LogViewer: React.FC = () => {
    const { token, preferredLanguage } = useAuth(); // Get preferredLanguage
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

    // --- NEW: State for Data Dialog ---
    const [viewingData, setViewingData] = useState<string | null>(null);
    const [isDataDialogOpen, setIsDataDialogOpen] = useState(false);
    // -------------------------------

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
           toast.error(t('logPurgeInvalidDaysError', preferredLanguage));
           return;
       }
       setIsPurging(true);
       setPurgeError(null);
       try {
           const result = await api.purgeLogs(purgeDays, token);
           toast.success(t('logPurgeSuccessMessage', preferredLanguage, { count: result.deletedCount, days: purgeDays }));
           await fetchLogs(1, searchQuery); // Refresh logs on page 1 after purge
           if (currentPage !== 1) setCurrentPage(1); // Go to page 1
       } catch (err: any) {
           const msg = err.message || "Failed to purge logs.";
           setPurgeError(msg);
           toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
       } finally {
           setIsPurging(false);
           setIsPurgeConfirmOpen(false); // Close confirmation dialog
       }
   };
   // -------------------------

   // --- NEW: Show Data Handler ---
   const handleShowData = (dataString: string | null | undefined) => {
       if (dataString) {
            setViewingData(formatLogData(dataString)); // Format for display
            setIsDataDialogOpen(true);
       }
   };
   // ---------------------------

   // Function to safely parse and format log data (JSON or string)
   const formatLogData = (dataString: string | null | undefined): string => {
       if (!dataString) return t('noAdditionalData', preferredLanguage); // Use translation
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
            case 'warn': return 'secondary'; // Use secondary (light gray) for warn on white bg
            case 'info': return 'outline'; // Use outline (white bg, gray border/text) for info on white bg
            default: return 'secondary';
        }
   };

   // Get translated log level text
   const getLogLevelText = (level: string): string => {
        switch (level.toLowerCase()) {
            case 'error': return t('logLevelError', preferredLanguage);
            case 'warn': return t('logLevelWarn', preferredLanguage);
            case 'info': return t('logLevelInfo', preferredLanguage);
            default: return level;
        }
    }

    // Render the component within a Card - forced white background
    return (
        // Card is forced white
        <Card>
            <CardHeader>
                 <CardTitle>{t('logViewerTitle', preferredLanguage)}</CardTitle>
                 <CardDescription>{t('logViewerDescription', preferredLanguage)}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'> {/* Add spacing inside content */}
                 {/* Log Search Bar - forced white */}
                 <SearchBar
                     fields={[ // Define searchable fields with translated labels
                         { value: 'level', label: t('logsLevelColumn', preferredLanguage), type: 'select', options: [{value: 'info', label: t('logLevelInfo', preferredLanguage)}, {value: 'warn', label: t('logLevelWarn', preferredLanguage)}, {value: 'error', label: t('logLevelError', preferredLanguage)}]},
                         { value: 'userId', label: t('logsUserColumn', preferredLanguage), type: 'text'},
                         { value: 'category', label: t('logsCategoryColumn', preferredLanguage), type: 'text'},
                         { value: 'message', label: t('logsMessageColumn', preferredLanguage), type: 'text'},
                         { value: 'createdOn', label: t('logsTimestampColumn', preferredLanguage), type: 'date'},
                     ]}
                     onSearch={handleSearch}
                     isLoading={isLoading || isPurging}
                 />

                 {/* --- Purge Controls - Use light gray bg --- */}
                  <div className="flex flex-wrap items-center justify-end gap-2 p-2 border rounded-lg bg-neutral-50"> {/* Changed bg-muted to bg-neutral-50 */}
                     {purgeError && <ErrorDisplay message={purgeError} className="mr-auto"/>}
                     <div className="flex items-center gap-2 ml-auto">
                         <span className="text-sm text-neutral-600">{t('purgeLogsOlderThanLabel', preferredLanguage)}</span> {/* Adjusted text color */}
                         <Input
                             type="number"
                             value={purgeDays}
                             onChange={(e) => setPurgeDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                             min="1"
                             className="w-20 h-8"
                             disabled={isPurging}
                             aria-label={t('daysLabel', preferredLanguage)} // Add aria-label
                         />
                         <span className="text-sm text-neutral-600">{t('daysLabel', preferredLanguage)}</span> {/* Adjusted text color */}
                          <AlertDialog open={isPurgeConfirmOpen} onOpenChange={setIsPurgeConfirmOpen}>
                             <AlertDialogTrigger asChild>
                                 <Button variant="destructive" size="sm" disabled={isPurging || purgeDays <= 0}>
                                     {isPurging ? <LoadingSpinner size='sm' className='mr-2'/> : <Trash2 className='mr-2 h-4 w-4'/>}
                                     {t('purgeButton', preferredLanguage)}
                                 </Button>
                             </AlertDialogTrigger>
                             {/* AlertDialogContent is forced white */}
                             <AlertDialogContent>
                                 <AlertDialogHeader>
                                     <AlertDialogTitle>{t('confirmLogPurgeTitle', preferredLanguage)}</AlertDialogTitle>
                                     <AlertDialogDescription>
                                        {t('confirmLogPurgeMessage', preferredLanguage, { days: purgeDays })}
                                     </AlertDialogDescription>
                                 </AlertDialogHeader>
                                 <AlertDialogFooter>
                                      <AlertDialogCancel>{t('cancelButton', preferredLanguage)}</AlertDialogCancel>
                                     <AlertDialogAction onClick={handlePurge} disabled={isPurging}>
                                         {isPurging ? <LoadingSpinner size='sm' className='mr-2'/> : null}
                                         {t('yesButton', preferredLanguage)}, {t('purgeButton', preferredLanguage)}
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
                        {/* REMOVED max-h and overflow-y-auto */}
                        <div className='relative'>
                             <Table>
                                 {/* TableHeader forced white, sticky removed as parent scrolls */}
                                 <TableHeader className='bg-white dark:bg-white z-10'>
                                    <TableRow>
                                        <TableHead className='w-[180px]'>{t('logsTimestampColumn', preferredLanguage)}</TableHead>
                                        <TableHead className='w-[100px]'>{t('logsLevelColumn', preferredLanguage)}</TableHead>
                                        <TableHead className='w-[120px]'>{t('logsUserColumn', preferredLanguage)}</TableHead>
                                        <TableHead className='w-[120px]'>{t('logsCategoryColumn', preferredLanguage)}</TableHead>
                                        <TableHead>{t('logsMessageColumn', preferredLanguage)}</TableHead>
                                        <TableHead className='w-[50px] text-center'>{t('logsDataColumn', preferredLanguage)}</TableHead> {/* Col for data icon */}
                                    </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                    {logs.map((log) => (
                                        <React.Fragment key={log.id}>
                                            {/* TableRow uses light gray hover */}
                                            <TableRow>
                                                <TableCell className='text-xs'>{new Date(log.createdOn).toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <Badge variant={getBadgeVariant(log.level)} className='capitalize'>{getLogLevelText(log.level)}</Badge>
                                                </TableCell>
                                                 <TableCell className='text-xs'>{log.userId || <i className='text-neutral-500 not-italic'>{t('logUserSystem', preferredLanguage)}</i>}</TableCell> {/* Adjusted muted color */}
                                                 <TableCell className='text-xs'>{log.category || <i className='text-neutral-500 not-italic'>{t('logCategoryGeneral', preferredLanguage)}</i>}</TableCell> {/* Adjusted muted color */}
                                                <TableCell className='text-sm'>{log.message}</TableCell>
                                                {/* Data Icon Cell */}
                                                <TableCell className='text-center'>
                                                    {log.data && (
                                                         // Use adjusted ghost button style
                                                        <Button variant="ghost" size="icon" onClick={() => handleShowData(log.data)} className="h-6 w-6" title={t('viewButton', preferredLanguage) + ' ' + t('detailsLabel', preferredLanguage).toLowerCase()}>
                                                            <Info className="h-4 w-4 text-neutral-500" /> {/* Adjusted muted color */}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    ))}
                                 </TableBody>
                             </Table>
                        </div>
                     </div>
                 )}

                 {/* Empty State */}
                 {!isLoading && !error && logs.length === 0 && (
                    // Moved comment outside the JSX element
                    <p className='text-neutral-500 text-center py-6'>{t('noLogsFound', preferredLanguage)}</p> /* Adjusted muted color */
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

            {/* Data Dialog is forced white */}
            <Dialog open={isDataDialogOpen} onOpenChange={setIsDataDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DataDialogTitle>{t('logDataDialogTitle', preferredLanguage)}</DataDialogTitle>
                    </DialogHeader>
                    {/* Use ScrollArea here - Use light gray bg */}
                    <ScrollArea className="max-h-[60vh] my-4 border rounded p-3 bg-neutral-50">
                        <pre className='text-xs overflow-auto text-neutral-800'> {/* Ensure text contrast */}
                           {viewingData || <i className="text-neutral-500">{t('noAdditionalData', preferredLanguage)}</i>} {/* Adjusted muted color */}
                        </pre>
                    </ScrollArea>
                    <DialogFooter>
                         <Button variant="outline" onClick={() => setIsDataDialogOpen(false)}>{t('closeButton', preferredLanguage)}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default LogViewer;