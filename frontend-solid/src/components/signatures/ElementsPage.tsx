import { Component, createSignal, createResource, Show, createMemo, Suspense, Accessor } from 'solid-js'; // Added Accessor
import { useParams, useNavigate } from '@solidjs/router';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import type { SignatureElement, SignatureElementSearchResult } from '../../../../backend/src/functionalities/signature/element/models';
import type { SearchRequest, SearchQueryElement } from '../../../../backend/src/utils/search';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/Dialog'; // Added DialogBody
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import ElementList from './ElementList';
import ElementForm from './ElementForm';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import SearchBar, { type SearchFieldOption } from '@/components/shared/SearchBar'; // Import SearchBar
import { Pagination } from '@/components/shared/Pagination'; // Import Pagination
import { Icon } from '@/components/shared/Icon';
import styles from './ElementsPage.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils'; // Import cn

const ELEMENTS_PAGE_SIZE = 15;

const ElementsPage: Component = () => {
    const params = useParams<{ componentId: string }>();
    const componentId = () => parseInt(params.componentId || '', 10); // Make componentId reactive
    const navigate = useNavigate();
    const [authState] = useAuth();
    const isAdmin = () => authState.user?.role === 'admin'; // Only admin can edit/delete elements? Assume yes for now.

    // State for forms and dialogs
    const [editingElement, setEditingElement] = createSignal<SignatureElement | null>(null);
    const [isFormOpen, setIsFormOpen] = createSignal(false);

    // State for search/pagination
    const [searchQuery, setSearchQuery] = createSignal<SearchRequest['query']>([]);
    const [currentPage, setCurrentPage] = createSignal(1);

    // --- Resource for Parent Component ---
    const [parentComponentResource, { refetch: refetchParent }] = createResource( // Added refetch
        // Depends on token and componentId() signal
        () => ({ token: authState.token, id: componentId() }),
        async ({ token, id }) => {
            if (!token || isNaN(id)) {
                throw new Error("Invalid component ID or not authenticated.");
            }
            console.log(`Fetching parent component: ${id}`);
            try {
                return await api.getSignatureComponentById(id, token);
            } catch (error) {
                 console.error("Fetch Parent Component Error:", error);
                 // TODO: Toast/Notification
                 throw error; // Let resource handle error state
            }
        }
    );

     // --- Resource for Elements ---
     const [elementsData, { refetch: refetchElements }] = createResource(
         // Depends on token, componentId(), current page, and search query
         () => ({
             token: authState.token,
             id: componentId(),
             page: currentPage(),
             query: searchQuery(),
             // Ensure parent resource has successfully loaded *and* contains data
             parentIsReady: !parentComponentResource.loading && !parentComponentResource.error && !!parentComponentResource()
         }),
         async ({ token, id, page, query, parentIsReady }) => {
             // Guard: Only fetch if dependencies are valid and parent is ready
             if (!token || isNaN(id) || !parentIsReady) {
                 return { data: [], totalSize: 0, totalPages: 1, page: 1 };
             }
             console.log(`Fetching elements for component ${id} - Page: ${page}, Query:`, query);
             const componentFilter: SearchQueryElement = { field: 'signatureComponentId', condition: 'EQ', value: id, not: false };
             const finalQuery = [...query.filter(q => q.field !== 'signatureComponentId'), componentFilter];
             const searchRequest: SearchRequest = { query: finalQuery, page, pageSize: ELEMENTS_PAGE_SIZE };
             try {
                 return await api.searchSignatureElements(searchRequest, token);
             } catch (error) {
                 console.error("Fetch Elements Error:", error);
                 // TODO: Toast/Notification
                 throw error;
             }
         },
         { initialValue: { data: [], totalSize: 0, totalPages: 1, page: 1 } }
     );


    // --- CRUD Handlers ---
    const handleEdit = async (element: SignatureElementSearchResult) => { // Receive SearchResult
        if (!isAdmin() || !authState.token) return; // Guard
        try {
             // Fetch full details before opening editor
             setIsFormOpen(true); // Open dialog immediately to show loading state inside
             setEditingElement(null); // Clear previous editing state
             const fullElement = await api.getSignatureElementById(element.signatureElementId!, ['parents'], authState.token);
             setEditingElement(fullElement); // Set full details
        } catch (err) {
            console.error("Error fetching element details for edit:", err);
            setIsFormOpen(false); // Close dialog on error
            // TODO: Toast error
        }
    };

    const handleCreateNew = () => {
        if (!parentComponentResource() || !isAdmin()) return; // Guard
        setEditingElement(null);
        setIsFormOpen(true);
    };

    const handleDelete = async (elementId: number) => {
        const token = authState.token;
        if (!isAdmin() || !token || !elementId || !parentComponentResource()) return; // Guard
        if (!window.confirm("Are you sure you want to delete this element? This might affect existing archive items.")) return;

        try {
            await api.deleteSignatureElement(elementId, token);
             // TODO: Toast success
             // Refresh list, adjusting page if necessary
             const currentTotal = elementsData()?.totalSize ?? 0;
             const newTotal = currentTotal - 1;
             const newTotalPages = Math.max(1, Math.ceil(newTotal / ELEMENTS_PAGE_SIZE));
             if (currentPage() > newTotalPages && newTotalPages > 0) {
                 setCurrentPage(newTotalPages); // Triggers refetch
             } else {
                 refetchElements();
             }
             // Optionally refetch parent component to update count
             refetchParent(); // Use refetch function
        } catch (err: any) {
            console.error("Delete Element Error:", err);
            // TODO: Toast error
        }
    };

    const handleSaveSuccess = (savedElement: SignatureElement | null) => {
        setIsFormOpen(false);
        if (savedElement) { // Only show toast if save actually happened
            // TODO: Toast success
        }
        refetchElements(); // Refresh the list
        // Optionally refetch parent component to update count
        refetchParent(); // Use refetch function
    };

    // --- Dialog Handler ---
     const handleOpenChange = (open: boolean) => {
         setIsFormOpen(open);
         if (!open) { setEditingElement(null); }
     };

     // --- Search & Pagination Handlers ---
     const handleSearch = (newQuery: SearchRequest['query']) => {
         if (JSON.stringify(newQuery) !== JSON.stringify(searchQuery())) {
            setSearchQuery(newQuery);
            setCurrentPage(1);
         }
     };
     const handlePageChange = (newPage: number) => {
          if (newPage !== currentPage()) {
             setCurrentPage(newPage);
          }
     };

    // --- Search Fields ---
    const elementSearchFields = createMemo((): SearchFieldOption[] => [
        { value: 'name', label: 'Name', type: 'text' as const },
        { value: 'description', label: 'Description', type: 'text' as const},
        { value: 'index', label: 'Index', type: 'text' as const},
        { value: 'hasParents', label: 'Has Parents', type: 'boolean' as const },
        { value: 'parentNames', label: 'Parent Name (Any)', type: 'text' as const }, // Assuming backend supports this
    ]);

    // Map index types to readable labels
    const indexTypeLabels: Record<string, string> = {
        dec: 'Decimal (1, 2)',
        roman: 'Roman (I, II)',
        small_char: 'Letters (a, b)',
        capital_char: 'Capitals (A, B)'
    };

    // Memoize parent component data to avoid re-rendering issues
    const parent = createMemo(() => parentComponentResource());

    return (
        <div class={styles.elementsPageContainer}>
            {/* Header Section */}
             <Show when={parent()}
                  fallback={
                      <div class={styles.elementsHeaderContainer}>
                           <Button variant="outline" size="icon" onClick={() => navigate('/signatures')} title="Back to Components">
                               <Icon name="ArrowLeft" size="1rem"/>
                           </Button>
                           <div class={styles.elementsHeaderContent}>
                               <Show when={parentComponentResource.loading} fallback={<Show when={parentComponentResource.error} fallback={<h1 class={styles.pageTitle}>Component Not Found</h1>}><ErrorDisplay message={`Error loading component: ${parentComponentResource.error?.message}`} /></Show>}>
                                   <div class="flex items-center gap-sm"><LoadingSpinner size="sm"/><span class="text-muted-foreground">Loading Component...</span></div>
                               </Show>
                           </div>
                      </div>
                  }
             >
                  {/* Don't need explicit typing here, Show passes the accessor */}
                  {(resolvedParent) => (
                     <div class={styles.elementsHeaderContainer}>
                          <Button variant="outline" size="icon" onClick={() => navigate('/signatures')} title="Back to Components">
                              <Icon name="ArrowLeft" size="1rem"/>
                          </Button>
                          <div class={styles.elementsHeaderContent}>
                              <h1 class={styles.pageTitle}>
                                  Elements: <span class="text-primary">{resolvedParent().name}</span>
                              </h1>
                              <p class={styles.pageDescription}>{resolvedParent().description || 'Manage elements within this component.'}</p>
                              <div class={styles.componentInfoBadges}>
                                 <Badge variant="secondary">Index: {indexTypeLabels[resolvedParent().index_type] || resolvedParent().index_type}</Badge>
                                 <Badge variant="outline">Count: {resolvedParent().index_count ?? 'N/A'}</Badge>
                              </div>
                          </div>
                      </div>
                  )}
             </Show>

            {/* Elements Section - Render only if parent loaded successfully */}
            {/* Use memoized parent. The Show component passes the unwrapped value to its children. */}
             <Show when={parent() && !parentComponentResource.error}>
                 <Card class={styles.elementsListCard}>
                    <CardHeader class={styles.elementsCardHeader}>
                         <div class="flex-grow">
                             <SearchBar fields={elementSearchFields()} onSearch={handleSearch} isLoading={elementsData.loading} />
                         </div>
                         <Dialog open={isFormOpen()} onOpenChange={handleOpenChange}>
                            <DialogTrigger asChild>
                                <Button onClick={handleCreateNew} size="sm" class={styles.createButtonContainer} disabled={!isAdmin()} title={!isAdmin() ? "Admin required" : "Create New Element"}>
                                    <Icon name="PlusCircle" class={styles.iconMargin}/> New Element
                                </Button>
                            </DialogTrigger>
                            <DialogContent size="md">
                                <DialogHeader><DialogTitle>{editingElement() ? 'Edit Element' : 'Create New Element'}</DialogTitle></DialogHeader>
                                 <DialogBody>
                                     {/* Pass the unwrapped component object from parent() */}
                                    <ElementForm
                                        elementToEdit={editingElement()}
                                        currentComponent={parent()!} // Use non-null assertion as it's guaranteed by Show
                                        onSave={handleSaveSuccess}
                                     />
                                 </DialogBody>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                         <Show when={elementsData.error}>
                             <ErrorDisplay message={`Failed to load elements: ${elementsData.error?.message}`} />
                         </Show>
                         <Show when={elementsData.loading && !elementsData()?.data?.length}>
                             <div class={styles.loadingContainer}>
                                 <LoadingSpinner />
                             </div>
                         </Show>
                         <Show when={!elementsData.loading && !elementsData.error && elementsData()}>
                             {(data) => (
                                <Show when={data().data.length > 0}
                                    fallback={<p class={styles.emptyStateText}>{searchQuery().length > 0 ? 'No elements match search.' : 'No elements yet. Create one!'}</p>}
                                >
                                    <ElementList
                                        elements={data().data}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                </Show>
                             )}
                         </Show>
                         <Show when={!elementsData.loading && (elementsData()?.totalPages ?? 0) > 1}>
                             <div class={styles.paginationContainer}>
                                 <Pagination
                                     currentPage={currentPage()}
                                     totalPages={elementsData()?.totalPages ?? 1}
                                     onPageChange={handlePageChange}
                                 />
                             </div>
                         </Show>
                    </CardContent>
                </Card>
            </Show>
        </div>
    );
};

export default ElementsPage;