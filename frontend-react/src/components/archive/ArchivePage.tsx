import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo import
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
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
import type { ArchiveDocument, ArchiveDocumentSearchResult, ArchiveDocumentType } from '../../../../backend/src/functionalities/archive/document/models';
import type { SearchRequest, SearchResponse, SearchQueryElement } from '../../../../backend/src/utils/search';
import { PlusCircle, ArrowLeft, Folder, FileText } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import DocumentPreviewDialog from './DocumentPreviewDialog';
import { cn } from '@/lib/utils';

const ARCHIVE_PAGE_SIZE = 10;

const ArchivePage: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parentUnitId = searchParams.get('unitId') ? Number(searchParams.get('unitId')) : null;

  const [documents, setDocuments] = useState<ArchiveDocumentSearchResult[]>([]);
  const [parentUnit, setParentUnit] = useState<ArchiveDocument | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<ArchiveDocument | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialType, setFormInitialType] = useState<ArchiveDocumentType | undefined>(undefined);
  const [formInitialParentId, setFormInitialParentId] = useState<number | undefined>(undefined);
  const [formInitialParentTitle, setFormInitialParentTitle] = useState<string | undefined>(undefined);
  const [formDialogTitle, setFormDialogTitle] = useState("Create Item");

  const [previewingDoc, setPreviewingDoc] = useState<ArchiveDocument | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState<SearchRequest['query']>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(ARCHIVE_PAGE_SIZE);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';
  const isUserRole = user?.role === 'user';

  useEffect(() => {
    const fetchParentUnit = async () => {
        if (!token || !parentUnitId) { setParentUnit(null); return; }
        setIsLoading(true); setError(null);
        try {
            const unit = await api.getArchiveDocumentById(parentUnitId, token);
            if (unit.type !== 'unit') throw new Error(`Item ID ${parentUnitId} is not a Unit.`);
            setParentUnit(unit);
        } catch (err: any) {
            const msg = `Failed to load parent unit: ${err.message}`; setError(msg); toast.error(msg); setParentUnit(null);
        } finally { setIsLoading(false); }
    };
    fetchParentUnit();
  }, [token, parentUnitId]);

  useEffect(() => {
    const fetchTags = async () => {
        if (!token) return;
        try {
            if (isAdmin || isEmployee) {
                 const tags = await api.getAllTags(token);
                 setAvailableTags(tags.sort((a, b) => a.name.localeCompare(b.name)));
            } else {
                 setAvailableTags([]);
            }
        } catch (err) { console.error("Failed to fetch tags for search options:", err); }
    };
    fetchTags();
  }, [token, isAdmin, isEmployee]);

   const fetchDocuments = useCallback(async (page = currentPage, query = searchQuery) => {
       if (!token) return;
       setIsLoading(true); setError(null);
       try {
           let finalQuery: SearchQueryElement[] = [...query];
           if (parentUnitId) {
               finalQuery = finalQuery.filter(q => q.field !== 'parentUnitArchiveDocumentId');
               finalQuery.push({ field: 'parentUnitArchiveDocumentId', condition: 'EQ', value: parentUnitId, not: false });
           }
           const searchRequest: SearchRequest = { query: finalQuery, page: page, pageSize: pageSize };
           const response = await api.searchArchiveDocuments(searchRequest, token);
           setDocuments(response.data);
           setTotalDocs(response.totalSize);
           setTotalPages(response.totalPages);
           setCurrentPage(response.page);
       } catch (err: any) {
           const msg = err.message || 'Failed to fetch documents'; setError(msg); toast.error(msg); console.error("Fetch Error:", err);
           setDocuments([]); setTotalDocs(0); setTotalPages(1);
       } finally { setIsLoading(false); }
   }, [token, pageSize, currentPage, searchQuery, parentUnitId]);

   useEffect(() => {
       if (!parentUnitId || parentUnit) {
           fetchDocuments(currentPage, searchQuery);
       }
   }, [fetchDocuments, currentPage, searchQuery, parentUnitId, parentUnit]);


    const handleEdit = (doc: ArchiveDocument) => {
        if (!isAdmin && !isEmployee) { toast.error("You do not have permission to edit items."); return; }
        setEditingDoc(doc);
        setFormInitialType(undefined); setFormInitialParentId(undefined); setFormInitialParentTitle(undefined);
        setFormDialogTitle(`Edit ${doc.type === 'unit' ? 'Unit' : 'Document'}`);
        setIsFormOpen(true);
    };

    const handleCreateNew = () => {
        if (!isAdmin && !isEmployee) { toast.error("You do not have permission to create items."); return; }
        if (parentUnitId && parentUnit) {
            setEditingDoc(null); setFormInitialType('document'); setFormInitialParentId(parentUnitId);
            setFormInitialParentTitle(parentUnit.title); setFormDialogTitle(`Create Document in Unit "${parentUnit.title}"`);
        } else {
            setEditingDoc(null); setFormInitialType(undefined); setFormInitialParentId(undefined);
            setFormInitialParentTitle(undefined); setFormDialogTitle("Create New Item");
        }
        setIsFormOpen(true);
    };

    const updateDialogTitle = useCallback((type?: ArchiveDocumentType) => {
         if (editingDoc) setFormDialogTitle(`Edit ${type === 'unit' ? 'Unit' : 'Document'}`);
         else if (parentUnitId && parentUnit) setFormDialogTitle(`Create Document in Unit "${parentUnit.title}"`);
         else setFormDialogTitle(`Create New ${type === 'unit' ? 'Unit' : 'Document'}`);
    }, [editingDoc, parentUnitId, parentUnit]);

    const handleDisable = async (docId: number) => {
        if (!isAdmin && !isEmployee) { toast.error("You do not have permission to disable items."); return; }
        if (!token || !docId) return;
        const docToDisable = documents.find(d => d.archiveDocumentId === docId) ?? editingDoc ?? previewingDoc;
        if (!docToDisable) return;
        if (!window.confirm(`Are you sure you want to disable this ${docToDisable.type}? It will be hidden but can be recovered by an admin.`)) return;

        setError(null); setIsLoading(true);
        try {
            await api.disableArchiveDocument(docId, token);
            toast.success("Item disabled successfully.");
            const newTotalPages = Math.ceil((totalDocs - 1) / pageSize);
            const newCurrentPage = (currentPage > newTotalPages) ? Math.max(1, newTotalPages) : currentPage;
            await fetchDocuments(newCurrentPage, searchQuery);
            if (currentPage !== newCurrentPage) setCurrentPage(newCurrentPage);
            if (previewingDoc?.archiveDocumentId === docId) setIsPreviewOpen(false);
        } catch (err: any) {
             const msg = err.message || 'Failed to disable item'; setError(msg); toast.error(`Disable failed: ${msg}`); console.error("Disable Error:", err);
        } finally { setIsLoading(false); }
    };

    const handleSaveSuccess = async () => {
        setIsFormOpen(false); setEditingDoc(null);
        toast.success(editingDoc ? "Item updated." : "Item created.");
        await fetchDocuments(currentPage, searchQuery);
    };

   const handleSearch = (newQuery: SearchRequest['query']) => { setSearchQuery(newQuery); setCurrentPage(1); };
   const handlePageChange = (newPage: number) => { setCurrentPage(newPage); };

    const handlePreview = useCallback(async (doc: ArchiveDocumentSearchResult) => {
        if (!token) return;
        try {
            setIsLoading(true);
            const fullDoc = await api.getArchiveDocumentById(doc.archiveDocumentId!, token);
            setPreviewingDoc(fullDoc);
            setIsPreviewOpen(true);
        } catch (err: any) {
            toast.error(`Failed to load document details: ${err.message}`);
             setPreviewingDoc(null);
             setIsPreviewOpen(false);
        } finally { setIsLoading(false); }
    }, [token]);

    const handleOpenUnit = useCallback((unit: ArchiveDocumentSearchResult) => {
        navigate(`/archive?unitId=${unit.archiveDocumentId}`);
    }, [navigate]);

   // --- UPDATED: Search fields for topographic signature ---
   const searchFields: SearchFieldOption[] = useMemo(() => {
       const baseFields: SearchFieldOption[] = [
           { value: 'title', label: 'Title', type: 'text' },
           { value: 'creator', label: 'Creator', type: 'text' },
           { value: 'creationDate', label: 'Creation Date', type: 'text' },
           { value: 'contentDescription', label: 'Description', type: 'text'},
           // --- UPDATED: Add topographicSignature search ---
           { value: 'topographicSignature', label: 'Topo Sig', type: 'text' },
           { value: 'descriptiveSignaturePrefix', label: 'Desc Sig Prefix', type: 'text' }, // Keep descriptive prefix search
           ...(!parentUnitId ? [{ value: 'type', label: 'Type', type: 'select', options: [{value: 'unit', label: 'Unit'}, {value:'document', label: 'Document'}]}] as SearchFieldOption[] : []),
           { value: 'isDigitized', label: 'Is Digitized', type: 'boolean'},
           // --- REMOVED: topographicSignaturePrefix ---
           // { value: 'topographicSignaturePrefix', label: 'Topo Sig Prefix', type: 'text' },
       ];
       if (isAdmin || isEmployee) {
           baseFields.push(
               { value: 'tags', label: 'Tags (Any Of)', type: 'tags', options: availableTags.map(t => ({value: t.tagId!, label: t.name})) },
               { value: 'ownerUserId', label: 'Owner User ID', type: 'number' }
           );
       }
       if (isAdmin) {
            baseFields.push({ value: 'active', label: 'Is Active', type: 'boolean' });
       }
       return baseFields;
   }, [isAdmin, isEmployee, availableTags, parentUnitId]);

  return (
    <div className="space-y-6">
       {/* Header Section */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div className='flex items-center gap-4'>
               {parentUnitId && (
                  <Button variant="outline" size="icon" onClick={() => navigate('/archive')} title="Back to Main Archive">
                      <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                       {parentUnit ? <><Folder className='h-5 w-5 text-blue-600'/> Unit: <span className='text-primary'>{parentUnit.title}</span></>
                                   : <><FileText className='h-5 w-5 text-gray-600'/> Archive</>}
                    </h1>
                    <p className='text-muted-foreground'>
                       {parentUnit ? `Browsing items within "${parentUnit.title}".`
                        : isUserRole ? 'Search documents based on your assigned tags.'
                        : 'Manage archival documents and units.'}
                    </p>
                </div>
           </div>
            {(isAdmin || isEmployee) && (
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                    <Button onClick={handleCreateNew} className='shrink-0'>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {parentUnitId ? 'Create Document Here' : 'Create Item'}
                    </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                    <DialogHeader> <DialogTitle>{formDialogTitle}</DialogTitle> </DialogHeader>
                    {isFormOpen && (
                        <DocumentForm
                            docToEdit={editingDoc}
                            onSave={handleSaveSuccess}
                            forceType={formInitialType}
                            forcedParentId={formInitialParentId}
                            forcedParentTitle={formInitialParentTitle}
                            onTypeChange={updateDialogTitle}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            )}
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
                 {error && <ErrorDisplay message={error} />}
             </CardHeader>
             <CardContent>
                 {isLoading && <div className='flex justify-center py-10'><LoadingSpinner /></div>}
                 {!isLoading && !error && (
                   <>
                     <DocumentList
                        documents={documents}
                        onEdit={handleEdit}
                        onDisable={handleDisable}
                        onPreview={handlePreview}
                        onOpenUnit={handleOpenUnit}
                    />
                      {totalPages > 1 && (
                           <div className="mt-6 flex justify-center">
                               <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                           </div>
                      )}
                      {documents.length === 0 && (
                         <p className="text-center text-muted-foreground pt-6">
                             {searchQuery.length > 0 ? 'No items found matching your search criteria.' :
                              parentUnitId ? `No items found in unit "${parentUnit?.title || 'this unit'}".` :
                              isUserRole ? 'No documents found matching your assigned tags.' :
                              'The archive is empty.'}
                              {(isAdmin || isEmployee) && !parentUnitId && documents.length === 0 && searchQuery.length === 0 && ' Click "Create Item" to start.'}
                         </p>
                      )}
                   </>
                 )}
            </CardContent>
        </Card>

         {/* Document Preview Dialog */}
         <DocumentPreviewDialog
            isOpen={isPreviewOpen}
            onOpenChange={setIsPreviewOpen}
            document={previewingDoc}
            onEdit={handleEdit}
            onDisable={handleDisable}
            parentUnitTitle={parentUnit?.archiveDocumentId === previewingDoc?.parentUnitArchiveDocumentId ? parentUnit?.title : undefined}
         />
    </div>
  );
};

export default ArchivePage;