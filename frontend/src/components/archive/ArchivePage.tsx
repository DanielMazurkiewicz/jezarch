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
import { PlusCircle, ArrowLeft, Folder, FileText, Tags, MinusCircle, Archive as ArchiveIcon, FileSearch } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import DocumentPreviewDialog from './DocumentPreviewDialog';
import { cn } from '@/lib/utils';
import { t } from '@/translations/utils'; // Import translation utility

const ARCHIVE_PAGE_SIZE = 10;

const ArchivePage: React.FC = () => {
  const { token, user, preferredLanguage } = useAuth();
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

  const [isBatchTagDialogOpen, setIsBatchTagDialogOpen] = useState(false);
  const [batchTagAction, setBatchTagAction] = useState<'add' | 'remove'>('add');
  const [isBatchTagLoading, setIsBatchTagLoading] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';
  const isUserRole = user?.role === 'user';

  const isSearchActive = useMemo(() => searchQuery.length > 0, [searchQuery]);

  const headerIcon = useMemo(() => {
      if (parentUnitId) return Folder;
      return isUserRole ? FileSearch : ArchiveIcon;
  }, [parentUnitId, isUserRole]);

  useEffect(() => {
     if (editingDoc) setFormDialogTitle(t('archiveEditItemDialogTitle', preferredLanguage, { itemType: t(editingDoc.type === 'unit' ? 'archiveUnitLabel' : 'archiveDocumentLabel', preferredLanguage) }));
     else if (parentUnitId && parentUnit) setFormDialogTitle(t('archiveCreateInUnitDialogTitle', preferredLanguage, { unitTitle: parentUnit.title }));
     else setFormDialogTitle(`${t('createButton', preferredLanguage)} ${t('archiveItemLabel', preferredLanguage)}`);
  }, [editingDoc, parentUnitId, parentUnit, preferredLanguage]);


  useEffect(() => {
    const fetchParentUnit = async () => {
        if (!token || !parentUnitId) { setParentUnit(null); return; }
        setIsLoading(true); setError(null);
        try {
            const unit = await api.getArchiveDocumentById(parentUnitId, token);
            if (unit.type !== 'unit') throw new Error(t('archiveInvalidParentTypeError', preferredLanguage, { id: parentUnitId }));
            setParentUnit(unit);
        } catch (err: any) {
            const msg = t('archiveParentUnitLoadError', preferredLanguage, { message: err.message });
            setError(msg);
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
            setParentUnit(null);
        } finally { setIsLoading(false); }
    };
    fetchParentUnit();
  }, [token, parentUnitId, preferredLanguage]);

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
           const msg = err.message || t('archiveFetchError', preferredLanguage);
           setError(msg);
           toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
           console.error("Fetch Error:", err);
           setDocuments([]); setTotalDocs(0); setTotalPages(1);
       } finally { setIsLoading(false); }
   }, [token, pageSize, currentPage, searchQuery, parentUnitId, preferredLanguage]);

   useEffect(() => {
       if (parentUnitId && !parentUnit) {
           setIsLoading(false);
           return;
       }
       fetchDocuments(currentPage, searchQuery);
   }, [fetchDocuments, currentPage, searchQuery, parentUnitId, parentUnit]);


    const handleEdit = (doc: ArchiveDocument) => {
        if (!isAdmin && !isEmployee) { toast.error(t('archivePermissionErrorEdit', preferredLanguage)); return; }
        setEditingDoc(doc);
        setFormInitialType(undefined); setFormInitialParentId(undefined); setFormInitialParentTitle(undefined);
        setIsFormOpen(true);
    };

    const handleCreateNew = () => {
        if (!isAdmin && !isEmployee) { toast.error(t('archivePermissionErrorCreate', preferredLanguage)); return; }
        if (parentUnitId && parentUnit) {
            setEditingDoc(null); setFormInitialType('document'); setFormInitialParentId(parentUnitId);
            setFormInitialParentTitle(parentUnit.title);
        } else {
            setEditingDoc(null); setFormInitialType(undefined); setFormInitialParentId(undefined);
            setFormInitialParentTitle(undefined);
        }
        setIsFormOpen(true);
    };

    const handleDisable = async (docId: number) => {
        if (!isAdmin && !isEmployee) { toast.error(t('archivePermissionErrorDisable', preferredLanguage)); return; }
        if (!token || !docId) return;
        const docToDisable = documents.find(d => d.archiveDocumentId === docId) ?? editingDoc ?? previewingDoc;
        if (!docToDisable) return;
        const itemTypeLabel = t(docToDisable.type === 'unit' ? 'archiveUnitLabel' : 'archiveDocumentLabel', preferredLanguage);
        if (!window.confirm(t('archiveDisableConfirm', preferredLanguage, { itemType: itemTypeLabel }))) return;

        setError(null); setIsLoading(true);
        try {
            await api.disableArchiveDocument(docId, token);
            toast.success(t('archiveDisableSuccess', preferredLanguage));
            const newTotalPages = Math.ceil((totalDocs - 1) / pageSize);
            const newCurrentPage = (currentPage > newTotalPages) ? Math.max(1, newTotalPages) : currentPage;
            await fetchDocuments(newCurrentPage, searchQuery);
            if (currentPage !== newCurrentPage) setCurrentPage(newCurrentPage);
            if (previewingDoc?.archiveDocumentId === docId) setIsPreviewOpen(false);
        } catch (err: any) {
             const msg = err.message || 'Failed';
             setError(t('archiveDisableFailed', preferredLanguage, { message: msg }));
             toast.error(t('errorMessageTemplate', preferredLanguage, { message: t('archiveDisableFailed', preferredLanguage, { message: msg }) }));
             console.error("Disable Error:", err);
        } finally { setIsLoading(false); }
    };

    const handleSaveSuccess = async () => {
        setIsFormOpen(false); setEditingDoc(null);
        const actionText = editingDoc ? t('updated', preferredLanguage) : t('created', preferredLanguage);
        toast.success(t('archiveSaveSuccess', preferredLanguage, { action: actionText }));
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
            const msg = err.message || 'unknown error';
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: t('archiveDetailsLoadFailed', preferredLanguage, { message: msg }) }));
             setPreviewingDoc(null);
             setIsPreviewOpen(false);
        } finally { setIsLoading(false); }
    }, [token, preferredLanguage]);

    const handleOpenUnit = useCallback((unit: ArchiveDocumentSearchResult) => {
        navigate(`/archive?unitId=${unit.archiveDocumentId}`);
    }, [navigate]);

   const openBatchTagDialog = (action: 'add' | 'remove') => {
       if (!isAdmin && !isEmployee) {
           toast.error(t('archivePermissionErrorBatchTag', preferredLanguage));
           return;
       }
       setBatchTagAction(action);
       setIsBatchTagDialogOpen(true);
   };

   const handleBatchTagConfirm = async (tagIds: number[]) => {
       if (!token || tagIds.length === 0) {
           toast.warning(t('archiveBatchTagsNoTagsWarning', preferredLanguage));
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
           const actionText = t(batchTagAction === 'add' ? 'added' : 'removed', preferredLanguage);
           toast.success(response.message || t('archiveBatchTagsSuccess', preferredLanguage, { action: actionText, count: response.count }));
           setIsBatchTagDialogOpen(false);
           await fetchDocuments(currentPage, searchQuery);
       } catch (err: any) {
           const msg = err.message || 'unknown error';
           toast.error(t('errorMessageTemplate', preferredLanguage, { message: t('archiveBatchTagsFailed', preferredLanguage, { message: msg }) }));
           console.error("Batch Tag Error:", err);
       } finally {
           setIsBatchTagLoading(false);
       }
   };


   // Define search fields using translations
   const searchFields: SearchFieldOption[] = useMemo(() => {
       const baseFields: SearchFieldOption[] = [
           { value: 'title', label: t('titleLabel', preferredLanguage), type: 'text' },
           { value: 'creator', label: t('archiveCreatorLabel', preferredLanguage), type: 'text' },
           { value: 'creationDate', label: t('archiveCreationDateLabel', preferredLanguage), type: 'text' },
           { value: 'contentDescription', label: t('descriptionLabel', preferredLanguage), type: 'text'},
           { value: 'topographicSignature', label: t('archiveTopoSigLabel', preferredLanguage), type: 'text' },
           { value: 'descriptiveSignature', label: t('archiveDescSigLabel', preferredLanguage), type: 'signaturePath' },
           ...(!parentUnitId ? [{ value: 'type', label: t('typeLabel', preferredLanguage), type: 'select', options: [{value: 'unit', label: t('archiveUnitLabel', preferredLanguage)}, {value:'document', label: t('archiveDocumentLabel', preferredLanguage)}]}] as SearchFieldOption[] : []),
           { value: 'isDigitized', label: t('archiveFormIsDigitizedLabel', preferredLanguage), type: 'boolean'},
       ];
       if (isAdmin || isEmployee) {
           baseFields.push(
               { value: 'tags', label: t('tagsLabel', preferredLanguage), type: 'tags', options: availableTags.map(t => ({value: t.tagId!, label: t.name})) },
               // --- UPDATED: Changed to createdBy/updatedBy ---
               { value: 'createdBy', label: t('createdBySearchLabel', preferredLanguage), type: 'text' },
               { value: 'updatedBy', label: t('updatedBySearchLabel', preferredLanguage), type: 'text' },
               // { value: 'ownerUserId', label: t('ownerUserIdSearchLabel', preferredLanguage), type: 'number' } // Removed ownerUserId
               // ----------------------------------------------
           );
       }
       if (isAdmin) {
            baseFields.push({ value: 'active', label: t('archiveIsActiveLabel', preferredLanguage), type: 'boolean' });
       }
       return baseFields;
   }, [isAdmin, isEmployee, availableTags, parentUnitId, preferredLanguage]);


  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div className='flex items-center gap-4'>
               {parentUnitId && (
                  <Button variant="outline" size="icon" onClick={() => navigate('/archive')} title={t('backToArchiveButton', preferredLanguage)}>
                      <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                       {parentUnit ? <>{t('archiveUnitLabel', preferredLanguage)}: <span className='text-primary'>{parentUnit.title}</span></>
                                   : <>{t('archiveTitle', preferredLanguage)}</>}
                    </h1>
                    <p className='text-muted-foreground'>
                       {parentUnit ? t('archiveBrowsingUnit', preferredLanguage, { unitTitle: parentUnit.title })
                        : isUserRole ? t('archiveDescriptionUser', preferredLanguage)
                        : t('archiveDescription', preferredLanguage)}
                    </p>
                </div>
           </div>
           <div className='flex items-center gap-2 flex-wrap justify-end'>
                 {(isAdmin || isEmployee) && (
                      <>
                          <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => openBatchTagDialog('add')}
                              title={t(isSearchActive ? 'archiveBatchAddTooltipFiltered' : 'archiveBatchAddTooltipAll', preferredLanguage)}
                             disabled={isBatchTagLoading}
                          >
                              <Tags className="mr-2 h-4 w-4 text-green-600" /> {t('addButton', preferredLanguage)} {t('tagsLabel', preferredLanguage)}
                          </Button>
                          <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => openBatchTagDialog('remove')}
                             title={t(isSearchActive ? 'archiveBatchRemoveTooltipFiltered' : 'archiveBatchRemoveTooltipAll', preferredLanguage)}
                             disabled={isBatchTagLoading}
                           >
                              <MinusCircle className="mr-2 h-4 w-4 text-red-600" /> {t('removeButton', preferredLanguage)} {t('tagsLabel', preferredLanguage)}
                          </Button>
                      </>
                 )}
                 {(isAdmin || isEmployee) && (
                     <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                         <DialogTrigger asChild>
                         <Button onClick={handleCreateNew} className='shrink-0'>
                             <PlusCircle className="mr-2 h-4 w-4" />
                             {parentUnitId ? t('archiveCreateDocumentButton', preferredLanguage) : t('createRootItemButton', preferredLanguage)}
                         </Button>
                         </DialogTrigger>
                         <DialogContent className="w-[90vw] max-w-[1200px] h-[90vh] flex flex-col"> {/* Added flex flex-col */}
                            <DialogHeader> <DialogTitle>{formDialogTitle}</DialogTitle> </DialogHeader>
                            <div className="flex-grow overflow-y-auto pr-2 pl-1"> {/* Adjusted padding */}
                                {isFormOpen && (
                                    <DocumentForm
                                        docToEdit={editingDoc}
                                        onSave={handleSaveSuccess}
                                        forceType={formInitialType}
                                        forcedParentId={formInitialParentId}
                                        forcedParentTitle={formInitialParentTitle}
                                        />
                                )}
                            </div>
                         </DialogContent>
                     </Dialog>
                 )}
            </div>
       </div>

       {/* --- SearchBar uses the updated searchFields --- */}
       <SearchBar
           fields={searchFields}
           onSearch={handleSearch}
           isLoading={isLoading || isBatchTagLoading}
       />
       {/* --------------------------------------------- */}

        <Card>
             <CardHeader>
                  <CardDescription>
                       {totalDocs > 0 && !isLoading && (
                           <span>{t('archiveFoundItems', preferredLanguage, { count: totalDocs.toLocaleString() })} </span>
                       )}
                       {(isAdmin || isEmployee) && documents.length > 0 && (
                            <span className="text-xs italic">
                                {isSearchActive
                                    ? t('archiveBatchActionWarning', preferredLanguage, { count: totalDocs.toLocaleString() })
                                    : t('archiveBatchActionNoFilterWarning', preferredLanguage, { count: totalDocs.toLocaleString() })
                                }
                            </span>
                       )}
                       {isBatchTagLoading && (
                            <span className="text-xs italic text-primary inline-flex items-center gap-1"><LoadingSpinner size='sm'/> {t('archiveBatchActionLoading', preferredLanguage)}</span>
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
                       {documents.length === 0 && (
                         <p className="text-center text-muted-foreground pt-6">
                             {searchQuery.length > 0 ? t('noResultsFound', preferredLanguage) :
                              parentUnitId ? t('archiveNoItemsInUnit', preferredLanguage, { unitTitle: parentUnit?.title || t('thisUnit', preferredLanguage) }) :
                              isUserRole ? t('archiveNoItemsForUserTags', preferredLanguage) :
                              t('archiveIsEmpty', preferredLanguage)}
                              {(isAdmin || isEmployee) && !parentUnitId && documents.length === 0 && searchQuery.length === 0 && ` ${t('archiveClickCreateHint', preferredLanguage)}`}
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