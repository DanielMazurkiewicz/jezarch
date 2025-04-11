import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import DocumentList from './DocumentList';
import DocumentForm from './DocumentForm';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import SearchBar, { type SearchFieldOption } from '@/components/shared/SearchBar';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import type { ArchiveDocument, ArchiveDocumentSearchResult } from '../../../../backend/src/functionalities/archive/document/models';
import type { SearchRequest, SearchResponse, SearchQueryElement } from '../../../../backend/src/utils/search';
import { PlusCircle } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';
import { toast } from "sonner";
// Import Card components for layout
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils'; // Import cn

const ARCHIVE_PAGE_SIZE = 10;

const ArchivePage: React.FC = () => {
  const { token, user } = useAuth();
  const [documents, setDocuments] = useState<ArchiveDocumentSearchResult[]>([]); // Use SearchResult for list display
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<ArchiveDocument | null>(null); // Use base type for editing
  const [isFormOpen, setIsFormOpen] = useState(false);

   // Search & Pagination State
   const [searchQuery, setSearchQuery] = useState<SearchRequest['query']>([]);
   const [currentPage, setCurrentPage] = useState(1);
   const [pageSize, setPageSize] = useState(ARCHIVE_PAGE_SIZE);
   const [totalDocs, setTotalDocs] = useState(0);
   const [totalPages, setTotalPages] = useState(1);

  // Fetch available tags for search options
  useEffect(() => {
    const fetchTags = async () => {
        if (!token) return;
        try {
            const tags = await api.getAllTags(token);
            setAvailableTags(tags.sort((a, b) => a.name.localeCompare(b.name))); // Sort tags
        } catch (err) { console.error("Failed to fetch tags for search options:", err); }
    };
    fetchTags();
  }, [token]);


  // Combined fetch/search function with automatic filtering based on role
   const fetchDocuments = useCallback(async (page = currentPage, query = searchQuery) => {
       if (!token) return;
       setIsLoading(true); setError(null);
       try {
           let finalQuery: SearchQueryElement[] = [...query];

           // --- Default Filters based on Role ---
           const activeFilterExists = finalQuery.some(q => q.field === 'active');
           if (!activeFilterExists && user?.role !== 'admin') {
               // Regular users only see active documents by default
               finalQuery.push({ field: 'active', condition: 'EQ', value: true, not: false });
           } else if (activeFilterExists && user?.role !== 'admin') {
               // Prevent non-admins overriding the active filter
               // Add type assertion here
               finalQuery = finalQuery.map(q =>
                    q.field === 'active' ? { ...q, value: true } : q
               ) as SearchQueryElement[]; // Assert the result type
           }

           const ownerFilterExists = finalQuery.some(q => q.field === 'ownerUserId');
           if (!ownerFilterExists && user?.role !== 'admin' && user?.userId) {
               // Regular users only see their own documents by default
               finalQuery.push({ field: 'ownerUserId', condition: 'EQ', value: user.userId, not: false });
           }
           // --- End Default Filters ---

           const searchRequest: SearchRequest = {
               query: finalQuery, page: page, pageSize: pageSize,
               // sort: [{ field: 'modifiedOn', direction: 'DESC' }] // TS2353: Comment out if 'sort' is not in SearchRequest type
           };
           const response = await api.searchArchiveDocuments(searchRequest, token);
           setDocuments(response.data);
           setTotalDocs(response.totalSize);
           setTotalPages(response.totalPages);
           setCurrentPage(response.page);
       } catch (err: any) {
           const msg = err.message || 'Failed to fetch documents'; setError(msg); toast.error(msg); console.error("Fetch Error:", err);
           setDocuments([]); setTotalDocs(0); setTotalPages(1);
       } finally { setIsLoading(false); }
   }, [token, pageSize, currentPage, searchQuery, user?.role, user?.userId]); // Dependencies for fetch function

   // Trigger fetch on mount and changes
   useEffect(() => {
       fetchDocuments(currentPage, searchQuery);
   }, [fetchDocuments, currentPage, searchQuery]);


   // --- CRUD Handlers ---
   const handleEdit = (doc: ArchiveDocument) => {
      // Authorization check (owner or admin)
      if (user?.role !== 'admin' && user?.userId !== doc.ownerUserId) {
        toast.error("You can only edit items you own."); return;
      }
      setEditingDoc(doc); setIsFormOpen(true);
    };
    const handleCreateNew = () => { setEditingDoc(null); setIsFormOpen(true); };
    const handleDisable = async (docId: number) => { // Changed from 'delete' to 'disable'
        if (!token || !docId) return;
        const docToDisable = documents.find(d => d.archiveDocumentId === docId);
        if (!docToDisable) return;
        // Authorization check
        if (user?.role !== 'admin' && user?.userId !== docToDisable.ownerUserId) {
            toast.error("You are not authorized to disable this item."); return;
        }
        if (!window.confirm(`Are you sure you want to disable this ${docToDisable.type}? It will be hidden but can be recovered by an admin.`)) return;

        setError(null); setIsLoading(true);
        try {
            await api.disableArchiveDocument(docId, token);
            toast.success("Item disabled successfully.");
            // Refresh list, adjust page if needed
            const newTotalPages = Math.ceil((totalDocs - 1) / pageSize);
            const newCurrentPage = (currentPage > newTotalPages) ? Math.max(1, newTotalPages) : currentPage;
            await fetchDocuments(newCurrentPage, searchQuery);
            if (currentPage !== newCurrentPage) setCurrentPage(newCurrentPage);
        } catch (err: any) {
             const msg = err.message || 'Failed to disable item'; setError(msg); toast.error(`Disable failed: ${msg}`); console.error("Disable Error:", err);
        } finally { setIsLoading(false); }
    };
    const handleSaveSuccess = async () => {
        setIsFormOpen(false); setEditingDoc(null);
        toast.success(editingDoc ? "Document/Unit updated." : "Document/Unit created.");
        await fetchDocuments(currentPage, searchQuery); // Refresh list
    };

   // --- Search & Pagination Handlers ---
   const handleSearch = (newQuery: SearchRequest['query']) => { setSearchQuery(newQuery); setCurrentPage(1); /* Fetch triggered by useEffect */ };
   const handlePageChange = (newPage: number) => { setCurrentPage(newPage); /* Fetch triggered by useEffect */ };

   // Define fields available for searching - Use SearchFieldOption[] type
   const searchFields: SearchFieldOption[] = [
       { value: 'title', label: 'Title', type: 'text' },
       { value: 'creator', label: 'Creator', type: 'text' },
       { value: 'creationDate', label: 'Creation Date', type: 'text' }, // TODO: Improve with date picker component
       { value: 'contentDescription', label: 'Description', type: 'text'},
       { value: 'type', label: 'Type', type: 'select', options: [{value: 'unit', label: 'Unit'}, {value:'document', label: 'Document'}]},
       { value: 'isDigitized', label: 'Is Digitized', type: 'boolean'},
       // Change type to 'tags' and provide options
       {
          value: 'tags', // Backend field name for tag IDs
          label: 'Tags', // User label
          type: 'tags', // Use the new 'tags' type
          options: availableTags.map(t => ({value: t.tagId!, label: t.name})) // Map tags to options
       },
       // Use text input for signature IDs - needs ANY_OF condition and number values
       { value: 'topographicSignatureElementIds', label: 'Topo Sig (Any ID)', type: 'text' }, // Simplification: user enters comma-separated IDs
       { value: 'descriptiveSignatureElementIds', label: 'Desc Sig (Any ID)', type: 'text' }, // Simplification: user enters comma-separated IDs
   ];
    // Add 'active' and 'ownerUserId' fields only for admins
    if (user?.role === 'admin') {
        searchFields.push({ value: 'active', label: 'Is Active', type: 'boolean' });
        searchFields.push({ value: 'ownerUserId', label: 'Owner User ID', type: 'number' }); // Use number type
    }

  return (
    <div className="space-y-6"> {/* Overall page spacing */}
       {/* Header Section */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
                <h1 className="text-2xl font-bold">Archive</h1>
                <p className='text-muted-foreground'>Manage archival documents and units.</p>
           </div>
           {/* Create Item Button & Dialog */}
           <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
             <DialogTrigger asChild>
               <Button onClick={handleCreateNew} className='shrink-0'>
                   <PlusCircle className="mr-2 h-4 w-4" /> Create Item
               </Button>
             </DialogTrigger>
             {/* Reduced max width, DialogContent itself handles max-h and scroll */}
             <DialogContent className="max-w-3xl"> {/* Changed max-w-4xl to max-w-3xl */}
               <DialogHeader>
                 <DialogTitle>{editingDoc ? 'Edit Document/Unit' : 'Create New Document/Unit'}</DialogTitle>
               </DialogHeader>
               {/* Render form conditionally to ensure state resets */}
               {isFormOpen && <DocumentForm docToEdit={editingDoc} onSave={handleSaveSuccess} />}
             </DialogContent>
           </Dialog>
       </div>

       {/* Search Bar Section */}
       <SearchBar
           fields={searchFields}
           onSearch={handleSearch}
           isLoading={isLoading}
       />

        {/* Document List Section */}
        <Card>
             <CardHeader>
                 {/* Optional Title: <CardTitle>Archive Items</CardTitle> */}
                 {/* Error Display */}
                 {error && <ErrorDisplay message={error} />}
             </CardHeader>
             <CardContent> {/* Content area for list & pagination */}
                 {/* Loading State */}
                 {isLoading && <div className='flex justify-center py-10'><LoadingSpinner /></div>}

                 {/* List and Pagination */}
                 {!isLoading && !error && (
                   <>
                     {/* Document List Table */}
                     <DocumentList documents={documents} onEdit={handleEdit} onDisable={handleDisable} />

                      {/* Pagination */}
                      {totalPages > 1 && (
                           <div className="mt-6 flex justify-center">
                               <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                           </div>
                      )}

                      {/* Empty State Messages */}
                       {documents.length === 0 && searchQuery.length > 0 && (
                          <p className="text-center text-muted-foreground pt-6">No items found matching your search criteria.</p>
                      )}
                      {documents.length === 0 && searchQuery.length === 0 && (
                         <p className="text-center text-muted-foreground pt-6">The archive is empty or you have no items. Click "Create Item" to start.</p>
                      )}
                   </>
                 )}
            </CardContent>
        </Card>
    </div>
  );
};

export default ArchivePage;