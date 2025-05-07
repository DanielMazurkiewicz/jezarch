import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import DocumentList from './DocumentList';
import DocumentForm from './DocumentForm';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import SearchBar, { type SearchFieldOption } from '@/components/shared/SearchBar';
import BatchTagDialog from './BatchTagDialog';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import type { ArchiveDocument, ArchiveDocumentSearchResult, ArchiveDocumentType } from '../../../../backend/src/functionalities/archive/document/models';
import type { SearchRequest, SearchResponse, SearchQueryElement } from '../../../../backend/src/utils/search';
import { PlusCircle, ArrowLeft, Folder, FileText, Tags, MinusCircle } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import DocumentPreviewDialog from './DocumentPreviewDialog';
import { cn } from '@/lib/utils';
import { t } from '@/translations/utils'; // Import translation utility

const ARCHIVE_PAGE_SIZE = 10;

const ArchivePage: React.FC = () => {
  const { token, user, preferredLanguage } = useAuth(); // Get preferredLanguage
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
  const [formDialogTitle, setFormDialogTitle] = useState("Create Item"); // Will be translated

  const [previewingDoc, setPreviewingDoc] = useState<ArchiveDocument | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState<SearchRequest['query']>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(ARCHIVE_PAGE_SIZE);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isBatchTagDialogOpen, setIsBatchTagDialogOpen] = useState(false);
  const [batchTagAction, setBatchTagAction] = useState<'add' | 'remove'>('add');
  const [isBatchTagLoading, setIsBatchTagLoading] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';
  const isUserRole = user?.role === 'user';

  const isSearchActive = useMemo(() => searchQuery.length > 0, [searchQuery]);

  // --- Translate Dialog Title ---
  useEffect(() => {
     if (editingDoc) setFormDialogTitle(`${t('editButton', preferredLanguage)} ${t(editingDoc.type === 'unit' ? 'archiveUnitLabel' : 'archiveDocumentLabel', preferredLanguage)}`); // TODO: Add archiveUnitLabel, archiveDocumentLabel
     else if (parentUnitId && parentUnit) setFormDialogTitle(`${t('createButton', preferredLanguage)} ${t('archiveDocumentLabel', preferredLanguage)} in Unit "${parentUnit.title}"`); // TODO: Translate "in Unit"
     else setFormDialogTitle(`${t('createButton', preferredLanguage)} ${t('archiveItemLabel', preferredLanguage)}`); // TODO: Add archiveItemLabel
  }, [editingDoc, parentUnitId, parentUnit, preferredLanguage]);


  useEffect(() => {
    const fetchParentUnit = async () => {
        if (!token || !parentUnitId) { setParentUnit(null); return; }
        setIsLoading(true); setError(null);
        try {
            const unit = await api.getArchiveDocumentById(parentUnitId, token);
            if (unit.type !== 'unit') throw new Error(`Item ID ${parentUnitId} is not a Unit.`); // TODO: Translate error
            setParentUnit(unit);
        } catch (err: any) {
            const msg = `Failed to load parent unit: ${err.message}`; setError(msg); // TODO: Translate error
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
            setParentUnit(null);
        } finally { setIsLoading(false); }
    };
    fetchParentUnit();
  }, [token, parentUnitId, preferredLanguage]); // Add preferredLanguage

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
        } catch (err) { console.error("Failed to fetch tags:", err); }
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
           const msg = err.message || 'Failed to fetch documents'; setError(msg); // TODO: Translate error
           toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
           console.error("Fetch Error:", err);
           setDocuments([]); setTotalDocs(0); setTotalPages(1);
       } finally { setIsLoading(false); }
   }, [token, pageSize, currentPage, searchQuery, parentUnitId, preferredLanguage]); // Add preferredLanguage

   useEffect(() => {
       if (parentUnitId && !parentUnit) {
           setIsLoading(false);
           return;
       }
       fetchDocuments(currentPage, searchQuery);
   }, [fetchDocuments, currentPage, searchQuery, parentUnitId, parentUnit]);


    const handleEdit = (doc: ArchiveDocument) => {
         // TODO: Translate error
        if (!isAdmin && !isEmployee) { toast.error("You do not have permission to edit items."); return; }
        setEditingDoc(doc);
        setFormInitialType(undefined); setFormInitialParentId(undefined); setFormInitialParentTitle(undefined);
        // Title set by useEffect now
        setIsFormOpen(true);
    };

    const handleCreateNew = () => {
         // TODO: Translate error
        if (!isAdmin && !isEmployee) { toast.error("You do not have permission to create items."); return; }
        if (parentUnitId && parentUnit) {
            setEditingDoc(null); setFormInitialType('document'); setFormInitialParentId(parentUnitId);
            setFormInitialParentTitle(parentUnit.title);
            // Title set by useEffect now
        } else {
            setEditingDoc(null); setFormInitialType(undefined); setFormInitialParentId(undefined);
            setFormInitialParentTitle(undefined);
            // Title set by useEffect now
        }
        setIsFormOpen(true);
    };

     // This callback might not be needed anymore if useEffect handles the title
    // const updateDialogTitle = useCallback((type?: ArchiveDocumentType) => {
    //      if (editingDoc) setFormDialogTitle(`Edit ${type === 'unit' ? 'Unit' : 'Document'}`);
    //      else if (parentUnitId && parentUnit) setFormDialogTitle(`Create Document in Unit "${parentUnit.title}"`);
    //      else setFormDialogTitle(`Create New ${type === 'unit' ? 'Unit' : 'Document'}`);
    // }, [editingDoc, parentUnitId, parentUnit]);

    const handleDisable = async (docId: number) => {
         // TODO: Translate error
        if (!isAdmin && !isEmployee) { toast.error("You do not have permission to disable items."); return; }
        if (!token || !docId) return;
        const docToDisable = documents.find(d => d.archiveDocumentId === docId) ?? editingDoc ?? previewingDoc;
        if (!docToDisable) return;
         // TODO: Translate confirmation
        if (!window.confirm(`Are you sure you want to disable this ${docToDisable.type}? It will be hidden but can be recovered by an admin.`)) return;

        setError(null); setIsLoading(true);
        try {
            await api.disableArchiveDocument(docId, token);
             // TODO: Translate success
            toast.success("Item disabled successfully.");
            const newTotalPages = Math.ceil((totalDocs - 1) / pageSize);
            const newCurrentPage = (currentPage > newTotalPages) ? Math.max(1, newTotalPages) : currentPage;
            await fetchDocuments(newCurrentPage, searchQuery);
            if (currentPage !== newCurrentPage) setCurrentPage(newCurrentPage);
            if (previewingDoc?.archiveDocumentId === docId) setIsPreviewOpen(false);
        } catch (err: any) {
             // TODO: Translate error
             const msg = err.message || 'Failed to disable item'; setError(msg);
             toast.error(t('errorMessageTemplate', preferredLanguage, { message: `Disable failed: ${msg}` }));
             console.error("Disable Error:", err);
        } finally { setIsLoading(false); }
    };

    const handleSaveSuccess = async () => {
        setIsFormOpen(false); setEditingDoc(null);
         // TODO: Translate success
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
             // TODO: Translate error
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: `Failed to load document details: ${err.message}` }));
             setPreviewingDoc(null);
             setIsPreviewOpen(false);
        } finally { setIsLoading(false); }
    }, [token, preferredLanguage]); // Add preferredLanguage

    const handleOpenUnit = useCallback((unit: ArchiveDocumentSearchResult) => {
        navigate(`/archive?unitId=${unit.archiveDocumentId}`);
    }, [navigate]);

   const openBatchTagDialog = (action: 'add' | 'remove') => {
       if (!isAdmin && !isEmployee) {
            // TODO: Translate error
           toast.error("You do not have permission to perform batch actions.");
           return;
       }
       setBatchTagAction(action);
       setIsBatchTagDialogOpen(true);
   };

   const handleBatchTagConfirm = async (tagIds: number[]) => {
       if (!token || tagIds.length === 0) {
            // TODO: Translate warning
           toast.warning("No tags selected.");
           setIsBatchTagDialogOpen(false);
           return;
       }
       setIsBatchTagLoading(true);
       try {
           const response = await api.batchTagArchiveDocuments({
               searchQuery: searchQuery,
               tagIds: tagIds,
               action: batchTagAction,
           }, token);
            // TODO: Translate success
           toast.success(response.message || `${batchTagAction === 'add' ? 'Added' : 'Removed'} tags for ${response.count} items.`);
           setIsBatchTagDialogOpen(false);
           await fetchDocuments(currentPage, searchQuery);
       } catch (err: any) {
            // TODO: Translate error
           toast.error(t('errorMessageTemplate', preferredLanguage, { message: `Batch tagging failed: ${err.message}` }));
           console.error("Batch Tag Error:", err);
       } finally {
           setIsBatchTagLoading(false);
       }
   };


   // Define search fields using translations
   const searchFields: SearchFieldOption[] = useMemo(() => {
        // TODO: Translate labels
       const baseFields: SearchFieldOption[] = [
           { value: 'title', label: 'Title', type: 'text' },
           { value: 'creator', label: 'Creator', type: 'text' },
           { value: 'creationDate', label: 'Creation Date', type: 'text' },
           { value: 'contentDescription', label: 'Description', type: 'text'},
           { value: 'topographicSignature', label: 'Topo Sig', type: 'text' },
           { value: 'descriptiveSignature', label: 'Desc Sig', type: 'signaturePath' },
           ...(!parentUnitId ? [{ value: 'type', label: 'Type', type: 'select', options: [{value: 'unit', label: 'Unit'}, {value:'document', label: 'Document'}]}] as SearchFieldOption[] : []),
           { value: 'isDigitized', label: 'Is Digitized', type: 'boolean'},
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
   }, [isAdmin, isEmployee, availableTags, parentUnitId, preferredLanguage]); // Add preferredLanguage


  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div className='flex items-center gap-4'>
               {parentUnitId && (
                   // Use translated title
                  <Button variant="outline" size="icon" onClick={() => navigate('/archive')} title={t('backToArchiveButton', preferredLanguage)}> {/* TODO: Add backToArchiveButton */}
                      <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div>
                     {/* TODO: Translate titles */}
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                       {parentUnit ? <><Folder className='h-5 w-5 text-blue-600'/> Unit: <span className='text-primary'>{parentUnit.title}</span></>
                                   : <><FileText className='h-5 w-5 text-gray-600'/> Archive</>}
                    </h1>
                    <p className='text-muted-foreground'>
                        {/* TODO: Translate descriptions */}
                       {parentUnit ? `Browsing items within "${parentUnit.title}".`
                        : isUserRole ? 'Search documents based on your assigned tags.'
                        : 'Manage archival documents and units.'}
                    </p>
                </div>
           </div>
           <div className='flex items-center gap-2 flex-wrap justify-end'>
                 {(isAdmin || isEmployee) && (
                      <>
                           {/* Use translated button text and title */}
                          <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => openBatchTagDialog('add')}
                              title={isSearchActive ? "Add tags to filtered items" : "Add tags to ALL items in the archive"} // TODO: Translate
                             disabled={isBatchTagLoading}
                          >
                              <Tags className="mr-2 h-4 w-4 text-green-600" /> {t('addButton', preferredLanguage)} {t('tagsLabel', preferredLanguage)} {/* TODO: Add tagsLabel */}
                          </Button>
                          <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => openBatchTagDialog('remove')}
                              title={isSearchActive ? "Remove tags from filtered items" : "Remove tags from ALL items in the archive"} // TODO: Translate
                             disabled={isBatchTagLoading}
                           >
                              <MinusCircle className="mr-2 h-4 w-4 text-red-600" /> {t('removeButton', preferredLanguage)} {t('tagsLabel', preferredLanguage)} {/* TODO: Add tagsLabel */}
                          </Button>
                      </>
                 )}
                 {(isAdmin || isEmployee) && (
                     <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                         <DialogTrigger asChild>
                          {/* Use translated button text */}
                         <Button onClick={handleCreateNew} className='shrink-0'>
                             <PlusCircle className="mr-2 h-4 w-4" />
                             {parentUnitId ? t('archiveCreateDocumentButton', preferredLanguage) : t('createButton', preferredLanguage) + ' ' + t('itemLabel', preferredLanguage)} {/* TODO: Add archiveCreateDocumentButton */}
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
                                 // onTypeChange={updateDialogTitle} // Removed as useEffect handles title now
                                 />
                             )}
                         </DialogContent>
                     </Dialog>
                 )}
            </div>
       </div>

       <SearchBar
           fields={searchFields}
           onSearch={handleSearch}
           isLoading={isLoading || isBatchTagLoading}
       />

        <Card>
             <CardHeader>
                  <CardDescription>
                        {/* TODO: Translate Found message */}
                       {totalDocs > 0 && !isLoading && (
                           <span>Found {totalDocs.toLocaleString()} item{totalDocs !== 1 ? 's' : ''}. </span>
                       )}
                       {(isAdmin || isEmployee) && documents.length > 0 && (
                            <span className="text-xs italic">
                                {/* TODO: Translate batch action info */}
                                {isSearchActive
                                    ? `Batch actions will affect ${totalDocs.toLocaleString()} items matching current filters.`
                                    : `Batch actions will affect all ${totalDocs.toLocaleString()} items in the archive (no filters applied).`
                                }
                            </span>
                       )}
                       {isBatchTagLoading && (
                            // TODO: Translate loading message
                            <span className="text-xs italic text-primary inline-flex items-center gap-1"><LoadingSpinner size='sm'/> Performing batch tag operation...</span>
                       )}
                  </CardDescription>
                 {error && <ErrorDisplay message={error} />}
             </CardHeader>
             <CardContent>
                 {(isLoading || isBatchTagLoading) && <div className='flex justify-center py-10'><LoadingSpinner /></div>}
                 {!isLoading && !isBatchTagLoading && !error && (
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
                       {/* Use translated empty states */}
                      {documents.length === 0 && (
                         <p className="text-center text-muted-foreground pt-6">
                             {searchQuery.length > 0 ? t('noResultsFound', preferredLanguage) :
                              parentUnitId ? t('archiveNoItemsInUnit', preferredLanguage, { unitTitle: parentUnit?.title || 'this unit' }) : // TODO: Add archiveNoItemsInUnit
                              isUserRole ? t('archiveNoItemsForUserTags', preferredLanguage) : // TODO: Add archiveNoItemsForUserTags
                              t('archiveIsEmpty', preferredLanguage)} {/* TODO: Add archiveIsEmpty */}
                              {/* TODO: Translate create hint */}
                              {(isAdmin || isEmployee) && !parentUnitId && documents.length === 0 && searchQuery.length === 0 && ' Click "Create Item" to start.'}
                         </p>
                      )}
                   </>
                 )}
            </CardContent>
        </Card>

         <DocumentPreviewDialog
            isOpen={isPreviewOpen}
            onOpenChange={setIsPreviewOpen}
            document={previewingDoc}
            onEdit={handleEdit}
            onDisable={handleDisable}
            parentUnitTitle={parentUnit?.archiveDocumentId === previewingDoc?.parentUnitArchiveDocumentId ? parentUnit?.title : undefined}
         />

         <BatchTagDialog
             isOpen={isBatchTagDialogOpen}
             onOpenChange={setIsBatchTagDialogOpen}
             action={batchTagAction}
             availableTags={availableTags}
             onConfirm={handleBatchTagConfirm}
             isLoading={isBatchTagLoading}
             itemCount={totalDocs}
         />
    </div>
  );
};

export default ArchivePage;