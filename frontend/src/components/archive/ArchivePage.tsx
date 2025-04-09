import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import DocumentList from './DocumentList';
import DocumentForm from './DocumentForm';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import SearchBar, { type SearchFieldOption } from '@/components/shared/SearchBar'; // Import SearchFieldOption type
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import type { ArchiveDocument, ArchiveDocumentType } from '../../../../backend/src/functionalities/archive/document/models';
import type { SearchRequest, SearchQueryElement } from '../../../../backend/src/utils/search';
import { PlusCircle } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination'; // Use the shared pagination
import { toast } from "sonner";

const ARCHIVE_PAGE_SIZE = 10;

const ArchivePage: React.FC = () => {
  const { token, user } = useAuth(); // Get user for role checks
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]); // For search bar
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<ArchiveDocument | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

   // Search & Pagination State
   const [searchQuery, setSearchQuery] = useState<SearchRequest['query']>([]);
   const [currentPage, setCurrentPage] = useState(1);
   const [pageSize, setPageSize] = useState(ARCHIVE_PAGE_SIZE);
   const [totalDocs, setTotalDocs] = useState(0);
   const [totalPages, setTotalPages] = useState(1);

  // Fetch available tags once for the search bar
  useEffect(() => {
    const fetchTags = async () => {
        if (!token) return;
        try {
            const tags = await api.getAllTags(token);
            setAvailableTags(tags);
        } catch (err) {
            console.error("Failed to fetch tags for search options:", err);
        }
    };
    fetchTags();
  }, [token]);


  // Combined fetch/search function
   const fetchDocuments = useCallback(async (page = currentPage, query = searchQuery) => {
       if (!token) return;
       setIsLoading(true);
       setError(null);
       try {
           // Add active=true filter by default unless admin overrides
           let finalQuery: SearchQueryElement[] = [...query];
           const activeFilterExists = query.some(q => q.field === 'active');
           // Only admins can search for inactive documents
           if (!activeFilterExists && user?.role !== 'admin') {
               finalQuery.push({ field: 'active', condition: 'EQ', value: true, not: false });
           } else if (activeFilterExists && user?.role !== 'admin') {
               // If non-admin tries to filter by active, force it to true
               finalQuery = finalQuery.filter(q => q.field !== 'active');
               finalQuery.push({ field: 'active', condition: 'EQ', value: true, not: false });
               console.warn("Non-admin attempted to search by 'active' field. Forcing active=true.");
           }


           // Filter by owner unless admin? Depends on requirements.
           // Currently, backend search doesn't implicitly filter by owner.
           // Let's allow admins to see all, but regular users see only their own.
           const ownerFilterExists = query.some(q => q.field === 'ownerUserId');
           if (!ownerFilterExists && user?.role !== 'admin' && user?.userId) {
               finalQuery.push({ field: 'ownerUserId', condition: 'EQ', value: user.userId, not: false });
           }


           const searchRequest: SearchRequest = {
               query: finalQuery,
               page: page,
               pageSize: pageSize,
           };
           const response = await api.searchArchiveDocuments(searchRequest, token);
           setDocuments(response.data);
           setTotalDocs(response.totalSize);
           setTotalPages(response.totalPages);
           setCurrentPage(response.page);
       } catch (err: any) {
           const msg = err.message || 'Failed to fetch documents';
           setError(msg);
           toast.error(msg);
           console.error("Fetch Documents Error:", err);
           setDocuments([]);
           setTotalDocs(0);
           setTotalPages(1);
       } finally {
           setIsLoading(false);
       }
   }, [token, pageSize, currentPage, searchQuery, user?.role, user?.userId]); // Add userId dependency

   // Initial fetch and fetch on search/page change
   useEffect(() => {
       fetchDocuments(currentPage, searchQuery);
   }, [fetchDocuments, currentPage, searchQuery]);


  const handleEdit = (doc: ArchiveDocument) => {
    // Check if user can edit (owner or admin)
    if (user?.role !== 'admin' && user?.userId !== doc.ownerUserId) {
      toast.error("You can only edit your own items.");
      return;
    }
    setEditingDoc(doc);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    setEditingDoc(null);
    setIsFormOpen(true);
  };

  const handleDisable = async (docId: number) => {
      if (!token || !docId) return;

      const docToDisable = documents.find(d => d.archiveDocumentId === docId);
      if (!docToDisable) return; // Should not happen if list is up-to-date

      // Authorization check
      if (user?.role !== 'admin' && user?.userId !== docToDisable.ownerUserId) {
          toast.error("You are not authorized to disable this item.");
          return;
      }

      if (!window.confirm("Are you sure you want to disable this item? It will be hidden but can be recovered by an admin.")) return;
      setError(null);
      setIsLoading(true);
      try {
          await api.disableArchiveDocument(docId, token);
          toast.success("Item disabled successfully.");

          // Refresh list, adjusting page if necessary
          const newTotalPages = Math.ceil((totalDocs - 1) / pageSize);
          const newCurrentPage = (currentPage > newTotalPages) ? Math.max(1, newTotalPages) : currentPage;

          await fetchDocuments(newCurrentPage, searchQuery);
          if(currentPage !== newCurrentPage) {
              setCurrentPage(newCurrentPage);
          }

      } catch (err: any) {
           const msg = err.message || 'Failed to disable item';
           setError(msg);
           toast.error(`Disable failed: ${msg}`);
           console.error("Disable Error:", err);
      } finally {
          setIsLoading(false);
      }
  };

  const handleSaveSuccess = async () => {
    setIsFormOpen(false);
    setEditingDoc(null);
    toast.success(editingDoc ? "Document/Unit updated." : "Document/Unit created.");
    await fetchDocuments(currentPage, searchQuery); // Refresh the list
  };

   const handleSearch = (newQuery: SearchRequest['query']) => {
       setSearchQuery(newQuery);
       setCurrentPage(1); // Reset to first page on new search
   };

   const handlePageChange = (newPage: number) => {
       setCurrentPage(newPage);
   };

   // Define fields available for searching - Explicitly typed
   const searchFields: SearchFieldOption[] = [
       { value: 'title', label: 'Title', type: 'text' },
       { value: 'creator', label: 'Creator', type: 'text' },
       { value: 'creationDate', label: 'Creation Date', type: 'text' }, // Can improve with date picker
       { value: 'contentDescription', label: 'Description', type: 'text'},
       { value: 'type', label: 'Type', type: 'select', options: [{value: 'unit', label: 'Unit'}, {value:'document', label: 'Document'}]},
       { value: 'isDigitized', label: 'Is Digitized', type: 'boolean'},
       { value: 'tags', label: 'Tags (Any Of)', type: 'select', options: availableTags.map(t => ({value: t.tagId!, label: t.name}))}, // Requires ANY_OF condition + backend support
       // Add custom signature search fields if handlers are robust
       { value: 'topographicSignaturePrefix', label: 'Topo Sig Prefix', type: 'text' }, // Placeholder - needs ANY_OF/custom handler
       { value: 'descriptiveSignaturePrefix', label: 'Desc Sig Prefix', type: 'text' }, // Placeholder - needs ANY_OF/custom handler
   ];
    // Add 'active' field only for admins
    if (user?.role === 'admin') {
        searchFields.push({ value: 'active', label: 'Is Active', type: 'boolean' });
    }
     // Add 'ownerUserId' field only for admins
    if (user?.role === 'admin') {
        // In a real app, you'd fetch users or allow typing ID
        searchFields.push({ value: 'ownerUserId', label: 'Owner User ID', type: 'number' }); // Corrected type to 'number'
    }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold">Archive</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateNew} className='shrink-0'>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Item
            </Button>
          </DialogTrigger>
          {/* Increase max-width for the archive form */}
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editingDoc ? 'Edit Document/Unit' : 'Create New Document/Unit'}</DialogTitle>
            </DialogHeader>
            {/* Render form conditionally to ensure state resets */}
            {isFormOpen && <DocumentForm docToEdit={editingDoc} onSave={handleSaveSuccess} />}
          </DialogContent>
        </Dialog>
      </div>

       {/* Search Bar */}
       <SearchBar
           fields={searchFields}
           onSearch={handleSearch}
           isLoading={isLoading}
       />

      {isLoading && <div className='flex justify-center py-10'><LoadingSpinner /></div>}
      {error && <ErrorDisplay message={error} />}

      {!isLoading && !error && (
        <>
          <DocumentList documents={documents} onEdit={handleEdit} onDisable={handleDisable} />
           {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>
           )}
            {documents.length === 0 && searchQuery.length > 0 && (
               <p className="text-center text-muted-foreground mt-4">No items found matching your search criteria.</p>
           )}
           {documents.length === 0 && searchQuery.length === 0 && (
              <p className="text-center text-muted-foreground mt-4">The archive is empty or you have no items. Click "Create Item" to start.</p>
           )}
        </>
      )}
    </div>
  );
};

export default ArchivePage;