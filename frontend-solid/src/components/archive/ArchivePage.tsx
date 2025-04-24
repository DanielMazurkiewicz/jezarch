import { Component, createSignal, createResource, Show, createMemo, Suspense, onMount } from 'solid-js';
import { useSearchParams, useNavigate, A } from '@solidjs/router';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import type { ArchiveDocument, ArchiveDocumentSearchResult, ArchiveDocumentType } from '../../../../backend/src/functionalities/archive/document/models';
import type { SearchRequest, SearchQueryElement } from '../../../../backend/src/utils/search';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/Dialog'; // Added DialogBody
import DocumentList from './DocumentList';
import DocumentForm from './DocumentForm';
import DocumentPreviewDialog from './DocumentPreviewDialog';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import SearchBar, { type SearchFieldOption } from '@/components/shared/SearchBar'; // Import SearchBar
import { Pagination } from '@/components/shared/Pagination'; // Import Pagination
import { Icon } from '@/components/shared/Icon';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import styles from './ArchivePage.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils'; // Import cn if needed

const ARCHIVE_PAGE_SIZE = 10;

const ArchivePage: Component = () => {
    const [authState] = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Reactive signals for state
    const [editingDoc, setEditingDoc] = createSignal<ArchiveDocument | null>(null);
    const [previewingDoc, setPreviewingDoc] = createSignal<ArchiveDocumentSearchResult | null>(null);
    const [isFormOpen, setIsFormOpen] = createSignal(false);
    const [isPreviewOpen, setIsPreviewOpen] = createSignal(false);

    // Form specific state signals (passed to DocumentForm)
    const [formInitialType, setFormInitialType] = createSignal<ArchiveDocumentType | undefined>(undefined);
    const [formInitialParentId, setFormInitialParentId] = createSignal<number | undefined>(undefined);
    const [formInitialParentTitle, setFormInitialParentTitle] = createSignal<string | undefined>(undefined);
    const [formDialogTitle, setFormDialogTitle] = createSignal("Create Item");

    // Search & Pagination state signals
    const [searchQuery, setSearchQuery] = createSignal<SearchRequest['query']>([]);
    const [currentPage, setCurrentPage] = createSignal(1);

    // Derived signal for parentUnitId from searchParams
    const parentUnitId = createMemo(() => {
        const id = searchParams.unitId;
        return id ? parseInt(id, 10) : null;
    });

    // --- Resource for Parent Unit Details ---
    const [parentUnitResource] = createResource(
        () => ({ token: authState.token, id: parentUnitId() }), // Depends on token and reactive parentUnitId
        async ({ token, id }) => {
            if (!token || id === null || isNaN(id)) return null; // No fetch if no valid ID/token
            console.log(`Fetching parent unit: ${id}`);
            try {
                const unit = await api.getArchiveDocumentById(id, token);
                if (unit.type !== 'unit') throw new Error(`Item ID ${id} is not a Unit.`);
                return unit;
            } catch (err: any) {
                console.error("Fetch Parent Unit Error:", err);
                // TODO: Toast error
                throw err; // Let resource handle error state
            }
        }
    );

    // --- Resource for Available Tags (for SearchBar) ---
    const [availableTags] = createResource(
        () => authState.token,
        async (token) => {
            if (!token) return [];
            try { return (await api.getAllTags(token)).sort((a, b) => a.name.localeCompare(b.name)); }
            catch { console.error("Failed to load tags for search"); return []; }
        }, { initialValue: [] }
    );

    // --- Resource for Archive Documents ---
    const [documentsData, { refetch: refetchDocuments }] = createResource(
        // Dependencies: token, parent ID readiness, current page, search query
        () => ({
            token: authState.token,
            parentId: parentUnitId(), // Reactive parent ID
            page: currentPage(),
            query: searchQuery(),
            // Only fetch if parent is resolved (or not needed), and user is authenticated
            isReady: authState.token && (parentUnitId() === null || !parentUnitResource.loading)
        }),
        async ({ token, parentId, page, query, isReady }) => {
            if (!isReady) return { data: [], totalSize: 0, totalPages: 1, page: 1 }; // Don't fetch if not ready

            // Check if parent fetch resulted in error
             if (parentId !== null && parentUnitResource.error) {
                  console.warn("Skipping document fetch due to parent unit error.");
                  return { data: [], totalSize: 0, totalPages: 1, page: 1 };
             }

            console.log(`Fetching archive docs - Parent: ${parentId}, Page: ${page}, Query:`, query);
            let finalQuery: SearchQueryElement[] = [...query];

            // Apply parent filter
            if (parentId !== null && !isNaN(parentId)) {
                 finalQuery = finalQuery.filter(q => q.field !== 'parentUnitArchiveDocumentId'); // Remove existing parent filter if any
                 finalQuery.push({ field: 'parentUnitArchiveDocumentId', condition: 'EQ', value: parentId, not: false });
            } else {
                 // Root level filtering (only non-admin see active/owned by default)
                 const user = authState.user;
                 if (user?.role !== 'admin') {
                     // Apply active filter unless already present
                     if (!finalQuery.some(q => q.field === 'active')) {
                          finalQuery.push({ field: 'active', condition: 'EQ', value: true, not: false });
                     } else { // Ensure non-admins cannot override active=true
                          finalQuery = finalQuery.map(q => q.field === 'active' ? { ...q, value: true } : q) as SearchQueryElement[];
                     }
                     // Apply owner filter unless already present
                     if (!finalQuery.some(q => q.field === 'ownerUserId') && user?.userId) {
                          finalQuery.push({ field: 'ownerUserId', condition: 'EQ', value: user.userId, not: false });
                     }
                 }
            }

            const searchRequest: SearchRequest = { query: finalQuery, page, pageSize: ARCHIVE_PAGE_SIZE };
            try {
                // Ensure token is not null before passing
                if (!token) throw new Error("Authentication token missing.");
                return await api.searchArchiveDocuments(searchRequest, token);
            } catch (error) {
                console.error("Fetch Archive Docs Error:", error);
                // TODO: Toast error
                throw error;
            }
        },
        { initialValue: { data: [], totalSize: 0, totalPages: 1, page: 1 } }
    );

    // --- Event Handlers ---
    const handleEdit = (doc: ArchiveDocument) => {
        const user = authState.user;
        if (!user || (user.role !== 'admin' && user.userId !== doc.ownerUserId)) {
            // TODO: Toast error
            console.error("Permission denied to edit item."); return;
        }
        setEditingDoc(doc);
        setFormInitialType(undefined); // Reset form specific state
        setFormInitialParentId(undefined);
        setFormInitialParentTitle(undefined);
        setFormDialogTitle(`Edit ${doc.type === 'unit' ? 'Unit' : 'Document'}`);
        setIsFormOpen(true);
    };

    const handleCreateNew = () => {
         const parent = parentUnitResource(); // Get current parent data
         if (parentUnitId() !== null && !parent) {
             // TODO: Toast warning - Parent still loading or failed to load
             console.warn("Cannot create item: Parent unit data not available."); return;
         }

        setEditingDoc(null);
        if (parentUnitId() !== null && parent) { // Creating inside a specific unit
            setFormInitialType('document'); // Can only create documents inside units? (Assumption)
            setFormInitialParentId(parentUnitId()!);
            setFormInitialParentTitle(parent.title);
            setFormDialogTitle(`Create Document in Unit "${parent.title}"`);
        } else { // Creating at root level
            setFormInitialType(undefined); // Allow choosing type
            setFormInitialParentId(undefined);
            setFormInitialParentTitle(undefined);
            setFormDialogTitle("Create New Item");
        }
        setIsFormOpen(true);
    };

    const handleDisable = async (docId: number) => {
        const token = authState.token;
        const user = authState.user;
        const docToDisable = documentsData()?.data.find(d => d.archiveDocumentId === docId) ?? editingDoc() ?? previewingDoc(); // Find doc from list/editing/previewing state

        if (!token || !docId || !user || !docToDisable) { /* TODO: Toast error */ return; }
        if (user.role !== 'admin' && user.userId !== docToDisable.ownerUserId) { /* TODO: Toast error */ return; }
        if (!window.confirm(`Disable this ${docToDisable.type}? It can be recovered by an admin.`)) return;

        try {
            await api.disableArchiveDocument(docId, token);
            // TODO: Toast success
            // Adjust page and refetch if needed
            const currentTotal = documentsData()?.totalSize ?? 0;
            const newTotal = currentTotal - 1;
            const newTotalPages = Math.max(1, Math.ceil(newTotal / ARCHIVE_PAGE_SIZE));
            if (currentPage() > newTotalPages && newTotalPages > 0) { // Ensure newTotalPages is positive
                setCurrentPage(newTotalPages); // Triggers refetch
            } else {
                refetchDocuments();
            }
            // Close preview if the disabled item was being previewed
            if (previewingDoc()?.archiveDocumentId === docId) setIsPreviewOpen(false);
        } catch (err: any) {
            console.error("Disable Error:", err);
             // TODO: Toast error
        }
    };

    const handleSaveSuccess = () => {
        setIsFormOpen(false); // Close dialog
        refetchDocuments(); // Refresh the list
        // TODO: Toast success
    };

    const handlePreview = async (doc: ArchiveDocumentSearchResult) => {
        const token = authState.token;
        if (!token) return;
        // Preview might need full details, fetch if necessary, or use search result directly
        setPreviewingDoc(doc); // Use search result for now, enhance if needed
        setIsPreviewOpen(true);
        // If full details needed:
        // try {
        //     const fullDoc = await api.getArchiveDocumentById(doc.archiveDocumentId!, token);
        //     setPreviewingDoc(fullDoc); // Set full doc
        //     setIsPreviewOpen(true);
        // } catch { /* TODO: Toast error */ }
    };

    const handleOpenUnit = (unit: ArchiveDocumentSearchResult) => {
        navigate(`/archive?unitId=${unit.archiveDocumentId}`);
    };

     // Dialog Handlers
     const handleFormOpenChange = (open: boolean) => {
         setIsFormOpen(open);
         if (!open) { setEditingDoc(null); } // Reset on close
     };
     const handlePreviewOpenChange = (open: boolean) => {
         setIsPreviewOpen(open);
         if (!open) { setPreviewingDoc(null); } // Reset on close
     };

    // Search & Pagination Handlers
    const handleSearch = (newQuery: SearchRequest['query']) => {
         if (JSON.stringify(newQuery) !== JSON.stringify(searchQuery())) {
            setSearchQuery(newQuery); setCurrentPage(1);
         }
    };
    const handlePageChange = (newPage: number) => {
         if (newPage !== currentPage()) { setCurrentPage(newPage); }
    };

     // --- Search Fields Definition ---
     const searchFields = createMemo((): SearchFieldOption[] => {
          const fields: SearchFieldOption[] = [
              { value: 'title', label: 'Title', type: 'text' }, { value: 'creator', label: 'Creator', type: 'text' },
              { value: 'creationDate', label: 'Creation Date', type: 'text' }, { value: 'contentDescription', label: 'Description', type: 'text'},
              { value: 'isDigitized', label: 'Is Digitized', type: 'boolean'},
              { value: 'tags', label: 'Tags', type: 'tags', options: availableTags()?.map(t => ({value: t.tagId!, label: t.name})) ?? [] },
              { value: 'topographicSignatureElementIds', label: 'Topo Sig (Any ID)', type: 'text' },
              { value: 'descriptiveSignatureElementIds', label: 'Desc Sig (Any ID)', type: 'text' },
          ];
           // Add type filter only if not inside a unit
           if (parentUnitId() === null) {
                fields.push({ value: 'type', label: 'Type', type: 'select', options: [{value: 'unit', label: 'Unit'}, {value:'document', label: 'Document'}]});
           }
          if (authState.user?.role === 'admin') {
              fields.push({ value: 'active', label: 'Is Active', type: 'boolean' });
              fields.push({ value: 'ownerUserId', label: 'Owner User ID', type: 'number' });
          }
          return fields;
     });

    return (
        <div class={styles.archivePageContainer}>
            {/* Header */}
            <div class={styles.archiveHeaderContainer}>
                 <Show when={parentUnitId() !== null}>
                    <Button variant="outline" size="icon" onClick={() => navigate('/archive')} title="Back to Main Archive" class={styles.backButton}>
                        <Icon name="ArrowLeft" size="1rem" />
                    </Button>
                 </Show>
                 {/* Wrap title/desc */}
                 <div class={styles.headerTextContent}> {/* Added wrapper */}
                      <h1 class={styles.pageTitle}>
                         <span class={styles.archiveTitleContainer}>
                            <Show when={parentUnitResource()} fallback={ parentUnitId() !== null ? <LoadingSpinner size="sm"/> : <Icon name="Archive" class={styles.archiveIcon} /> }>
                                 {(parent) => <Icon name="FolderOpen" class={styles.archiveIcon} color="hsl(var(--primary))" />}
                            </Show>
                            <Show when={parentUnitResource()} fallback={'Archive'}>
                                 {(parent) => <>Unit: <span class={styles.unitTitleHighlight}>{parent().title}</span></>}
                             </Show>
                         </span>
                      </h1>
                     <p class={styles.pageDescription}>
                         {parentUnitResource() ? `Browsing items within "${parentUnitResource()!.title}".` : 'Manage archival documents and units.'}
                     </p>
                 </div>
                 {/* Create Button/Dialog Trigger (Spacer takes up remaining space) */}
                 <div style={{"flex-grow": 1}} />
                 <Dialog open={isFormOpen()} onOpenChange={handleFormOpenChange}>
                    <DialogTrigger asChild>
                        <Button onClick={handleCreateNew} class={styles.createButtonContainer}>
                            <Icon name="PlusCircle" class={styles.iconMargin}/>
                            {parentUnitId() !== null ? 'Create Document Here' : 'Create Item'}
                        </Button>
                    </DialogTrigger>
                    {/* Removed Show wrapper, Dialog handles rendering */}
                    <DialogContent size="xl"> {/* Consider larger size for this form */}
                        <DialogHeader><DialogTitle>{formDialogTitle()}</DialogTitle></DialogHeader>
                         {/* Wrap form in DialogBody for scrolling */}
                         <DialogBody>
                             <DocumentForm
                                 docToEdit={editingDoc()}
                                 onSave={handleSaveSuccess}
                                 forceType={formInitialType()}
                                 forcedParentId={formInitialParentId()}
                                 forcedParentTitle={formInitialParentTitle()}
                             />
                         </DialogBody>
                    </DialogContent>
                 </Dialog>
            </div>

            {/* Search Bar */}
            <div class={styles.searchBarContainer}>
                 <Suspense fallback={<LoadingSpinner />}>
                     <SearchBar fields={searchFields()} onSearch={handleSearch} isLoading={documentsData.loading} />
                 </Suspense>
            </div>


            {/* Document List */}
            <Card class={styles.archiveListCard}>
                <CardHeader>
                    {/* Display parent loading error here if needed */}
                    <Show when={parentUnitResource.error}>
                        <ErrorDisplay message={`Error loading parent unit: ${parentUnitResource.error?.message}`} />
                    </Show>
                     {/* Display document loading error */}
                    <Show when={documentsData.error && !parentUnitResource.error}>
                         <ErrorDisplay message={`Error loading documents: ${documentsData.error?.message}`} />
                    </Show>
                </CardHeader>
                <CardContent>
                     <Show when={documentsData.loading || parentUnitResource.loading}
                          fallback={
                            <Show when={!documentsData.error && !parentUnitResource.error && documentsData()}>
                                {(data) => ( // data() is the accessor
                                    <Show when={data().data.length > 0}
                                        fallback={<p class={styles.emptyStateText}>{searchQuery().length > 0 ? 'No items match search.' : (parentUnitId() !== null ? 'This unit is empty.' : 'Archive is empty.')}</p>}
                                    >
                                        <DocumentList
                                            documents={data().data}
                                            onEdit={handleEdit}
                                            onDisable={handleDisable}
                                            onPreview={handlePreview}
                                            onOpenUnit={handleOpenUnit}
                                        />
                                    </Show>
                                )}
                            </Show>
                          }
                     >
                         <div class={styles.loadingContainer}><LoadingSpinner size="lg" /></div>
                     </Show>

                    {/* Pagination */}
                     <Show when={!documentsData.loading && (documentsData()?.totalPages ?? 0) > 1}>
                         <div class={styles.paginationContainer}>
                             <Pagination currentPage={currentPage()} totalPages={documentsData()?.totalPages ?? 1} onPageChange={handlePageChange} />
                         </div>
                     </Show>
                </CardContent>
            </Card>

             {/* Preview Dialog */}
             <DocumentPreviewDialog
                 isOpen={isPreviewOpen()}
                 onOpenChange={handlePreviewOpenChange}
                 document={previewingDoc()}
                 onEdit={handleEdit}
                 onDisable={handleDisable}
                 parentUnitTitle={parentUnitResource()?.archiveDocumentId === previewingDoc()?.parentUnitArchiveDocumentId ? parentUnitResource()?.title : undefined}
             />
        </div>
    );
};

export default ArchivePage;