import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, ArrowLeft, ChevronRight, SlidersHorizontal, ListRestart } from 'lucide-react';
import ElementList from './ElementList';
import ElementForm from './ElementForm';
import ElementPreviewDialog from './ElementPreviewDialog';
import SearchBar, { type SearchFieldOption } from '@/components/shared/SearchBar';
import Pagination from '@/components/shared/Pagination';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { parseElementPath, elementPathQuery } from '@/lib/elementPath';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import { effectiveComponentType } from '../../../../backend/src/functionalities/signature/component/models';
import type { SignatureElement, SignatureElementSearchResult } from '../../../../backend/src/functionalities/signature/element/models';
import type { SearchRequest, SearchQueryElement } from '../../../../backend/src/utils/search';
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { t } from '@/translations/utils';

const CHILDREN_PAGE_SIZE = 15;

// Format an element for display: "[index] name" or just the name
const formatElementLabel = (element: SignatureElement | null): string => {
    if (!element) return '';
    return `${element.index ? `[${element.index}] ` : ''}${element.name}`;
};

// Page showing all direct children of a given element, with a breadcrumb of the clicked path
const ElementChildrenPage: React.FC = () => {
    const { componentId: componentIdStr, elementId: elementIdStr } = useParams<{ componentId: string; elementId: string }>();
    const [searchParams] = useSearchParams();
    const componentId = parseInt(componentIdStr || '', 10);
    const elementId = parseInt(elementIdStr || '', 10);
    const navigate = useNavigate();
    const { token, user, preferredLanguage } = useAuth(); // Get preferredLanguage
    const canModify = user?.role === 'admin' || user?.role === 'employee'; // Define modification permission

    // Breadcrumb chain of clicked element IDs (last one is the current element)
    const pathParam = searchParams.get('path') ?? '';
    const pathIds = useMemo(() => parseElementPath(pathParam, elementId), [pathParam, elementId]);

    // --- Current Element State (the element whose children are listed) ---
    const [currentElement, setCurrentElement] = useState<SignatureElement | null>(null);
    const [isCurrentLoading, setIsCurrentLoading] = useState(true);
    const [currentError, setCurrentError] = useState<string | null>(null);

    // Breadcrumb elements (aligned with pathIds; null if an id no longer exists)
    const [pathElements, setPathElements] = useState<(SignatureElement | null)[]>([]);
    const [isPathLoading, setIsPathLoading] = useState(true);

    // All components (for the component column and the create-form picker)
    const [componentsById, setComponentsById] = useState<Map<number, SignatureComponent>>(new Map());

    // The current element's own component — may be an internal ELEMENT mirror
    // that is not part of the public component list, so it needs resolving.
    const [currentElementComponent, setCurrentElementComponent] = useState<SignatureComponent | null>(null);
    // The paired ELEMENT component mirroring the current element (TREE/ELEMENT
    // hierarchies): its elements are exactly the children shown on this page.
    const [correspondingComponent, setCorrespondingComponent] = useState<SignatureComponent | null>(null);
    const [isReindexing, setIsReindexing] = useState(false);

    // --- Children State ---
    const [elements, setElements] = useState<SignatureElementSearchResult[]>([]);
    const [isElementsLoading, setIsElementsLoading] = useState(false);
    const [elementsError, setElementsError] = useState<string | null>(null);
    const [editingElement, setEditingElement] = useState<SignatureElement | null>(null);
    const [editingComponent, setEditingComponent] = useState<SignatureComponent | null>(null);
    const [isElementFormOpen, setIsElementFormOpen] = useState(false);
    const [previewingElement, setPreviewingElement] = useState<SignatureElement | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [elementSearchQuery, setElementSearchQuery] = useState<SearchRequest['query']>([]);
    const [currentChildrenPage, setCurrentChildrenPage] = useState(1);
    const [totalChildren, setTotalChildren] = useState(0);
    const [totalChildrenPages, setTotalChildrenPages] = useState(1);

    // Resolve the component that owns the current element — paired ELEMENT
    // components are absent from the public list, so fetch them by id.
    useEffect(() => {
        let cancelled = false;
        const id = currentElement?.signatureComponentId;
        if (id === undefined) {
            setCurrentElementComponent(null);
            return;
        }
        const existing = componentsById.get(id);
        if (existing) {
            setCurrentElementComponent(existing);
            return;
        }
        if (!token) return;
        api.getSignatureComponentById(id, token)
            .then(comp => { if (!cancelled) setCurrentElementComponent(comp); })
            .catch(() => { if (!cancelled) setCurrentElementComponent(null); });
        return () => { cancelled = true; };
    }, [currentElement?.signatureComponentId, componentsById, token]);

    const isTreeChildren = currentElementComponent ? effectiveComponentType(currentElementComponent) !== 'FLAT' : false;

    // The paired ELEMENT component mirroring the current element: its elements
    // are exactly the children shown on this page.
    useEffect(() => {
        let cancelled = false;
        const elId = currentElement?.signatureElementId;
        if (!isTreeChildren || elId === undefined || !token) {
            setCorrespondingComponent(null);
            return;
        }
        api.getSignatureComponentByElementId(elId, token)
            .then(comp => { if (!cancelled) setCorrespondingComponent(comp); })
            .catch(() => { if (!cancelled) setCorrespondingComponent(null); });
        return () => { cancelled = true; };
    }, [isTreeChildren, currentElement?.signatureElementId, token]);

    // Make the paired component available in the map so the component column renders it.
    useEffect(() => {
        if (!correspondingComponent || correspondingComponent.signatureComponentId === undefined) return;
        setComponentsById(prev => {
            if (prev.get(correspondingComponent.signatureComponentId!)) return prev;
            const next = new Map(prev);
            next.set(correspondingComponent.signatureComponentId!, correspondingComponent);
            return next;
        });
    }, [correspondingComponent]);

    // Fetch all components (for the component column + create-form picker)
    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        api.getAllSignatureComponents(token)
            .then(comps => {
                if (cancelled) return;
                const map = new Map<number, SignatureComponent>();
                for (const comp of comps) {
                    if (comp.signatureComponentId !== undefined) map.set(comp.signatureComponentId, comp);
                }
                setComponentsById(map);
            })
            .catch(err => console.error('Failed to load components:', err));
        return () => { cancelled = true; };
    }, [token]);

    // Fetch the current element (the one whose children are listed)
    useEffect(() => {
        if (!token || isNaN(elementId)) {
            setIsCurrentLoading(false);
            setCurrentError(t('invalidElementIdError', preferredLanguage));
            return;
        }
        let cancelled = false;
        setIsCurrentLoading(true);
        setCurrentError(null);
        api.getSignatureElementById(elementId, [], token)
            .then(el => { if (!cancelled) setCurrentElement(el); })
            .catch((err: any) => {
                if (cancelled) return;
                const msg = err.message || t('elementFetchFailedError', preferredLanguage);
                setCurrentError(msg);
                toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
                console.error("Fetch Current Element Error:", err);
                setCurrentElement(null);
            })
            .finally(() => { if (!cancelled) setIsCurrentLoading(false); });
        return () => { cancelled = true; };
    }, [token, elementId, preferredLanguage]);

    // Fetch breadcrumb path elements (by ID, in parallel)
    useEffect(() => {
        if (!token || pathIds.length === 0) {
            setIsPathLoading(false);
            setPathElements([]);
            return;
        }
        let cancelled = false;
        setIsPathLoading(true);
        Promise.all(pathIds.map(id => api.getSignatureElementById(id, [], token).catch(() => null)))
            .then(results => { if (!cancelled) setPathElements(results); })
            .catch(() => { if (!cancelled) setPathElements(pathIds.map(() => null)); })
            .finally(() => { if (!cancelled) setIsPathLoading(false); });
        return () => { cancelled = true; };
    }, [token, pathIds]);

    // Fetch Children Callback (children of the current element, via parent search)
    const fetchSeqRef = useRef(0);
    const fetchChildren = useCallback(async (page = 1, query: SearchRequest['query'] = []) => {
        if (!token || isNaN(elementId)) {
            setIsElementsLoading(false);
            setElementsError(t('elementFetchPrereqError', preferredLanguage));
            return;
        }
        const seq = ++fetchSeqRef.current;
        setIsElementsLoading(true);
        setElementsError(null);
        try {
            const parentFilter: SearchQueryElement = { field: 'parentIds', condition: 'ANY_OF', value: [elementId], not: false };
            const finalQuery = [...query.filter(q => q.field !== 'parentIds'), parentFilter];
            const searchRequest: SearchRequest = { query: finalQuery, page, pageSize: CHILDREN_PAGE_SIZE };
            const response = await api.searchSignatureElements(searchRequest, token);
            if (seq !== fetchSeqRef.current) return; // superseded by a newer request
            setElements(response.data);
            setTotalChildren(response.totalSize);
            setTotalChildrenPages(response.totalPages);
            setCurrentChildrenPage(response.page);
        } catch (err: any) {
             if (seq !== fetchSeqRef.current) return;
             const msg = err.message || t('elementFetchFailedError', preferredLanguage);
             setElementsError(msg);
             toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
             console.error("Fetch Children Error:", err);
             setElements([]); setTotalChildren(0); setTotalChildrenPages(1);
        } finally {
             if (seq === fetchSeqRef.current) setIsElementsLoading(false);
        }
    }, [token, elementId, preferredLanguage]);

    // Fetch Children Effect (only once the current element is resolved)
    useEffect(() => {
        if (!isCurrentLoading && !currentError && !isNaN(elementId)) {
            fetchChildren(currentChildrenPage, elementSearchQuery);
        } else {
            setElements([]); setTotalChildren(0); setTotalChildrenPages(1); setCurrentChildrenPage(1);
        }
    }, [isCurrentLoading, currentError, elementId, currentChildrenPage, elementSearchQuery, fetchChildren]);

    // --- Navigation Callbacks (breadcrumbs / drill-down) ---
    const handleViewChildren = useCallback((element: SignatureElement) => {
        const id = element.signatureElementId!;
        navigate(`/signatures/${componentId}/elements/${id}?${elementPathQuery([...pathIds, id])}`);
    }, [navigate, componentId, pathIds]);

    const handleBreadcrumbNavigate = useCallback((index: number) => {
        const targetPath = pathIds.slice(0, index + 1);
        navigate(`/signatures/${componentId}/elements/${targetPath[targetPath.length - 1]}?${elementPathQuery(targetPath)}`);
    }, [navigate, componentId, pathIds]);

    const handleBack = useCallback(() => {
        if (pathIds.length > 1) {
            handleBreadcrumbNavigate(pathIds.length - 2);
        } else {
            navigate(`/signatures/${componentId}/elements`);
        }
    }, [handleBreadcrumbNavigate, pathIds.length, navigate, componentId]);

    // --- Element CRUD Callbacks ---
    const handleEditElement = useCallback(async (element: SignatureElement) => {
        if (!canModify) { toast.error(t('insufficientPermissionsError', preferredLanguage)); return; }
        let comp = componentsById.get(element.signatureComponentId);
        // Paired ELEMENT components are not part of the standard list — resolve by id.
        if (!comp && element.signatureComponentId !== undefined && token) {
            try {
                comp = await api.getSignatureComponentById(element.signatureComponentId, token);
            } catch (err) {
                console.error('Failed to load element component:', err);
            }
        }
        if (!comp) { toast.error(t('componentContextMissingError', preferredLanguage)); return; }
        setEditingElement(element);
        setEditingComponent(comp);
        setIsElementFormOpen(true);
    }, [canModify, componentsById, token, preferredLanguage]);

    const handlePreviewElement = useCallback((element: SignatureElement) => {
        setPreviewingElement(element);
        setIsPreviewOpen(true);
    }, []);

    const handleCreateElement = useCallback(() => {
        if (!canModify) { toast.error(t('insufficientPermissionsError', preferredLanguage)); return; }
        if (!currentElement) { toast.warning(t('parentComponentNotLoadedWarning', preferredLanguage)); return; }
        if (isTreeChildren && !correspondingComponent) {
            toast.warning(t('componentContextMissingError', preferredLanguage));
            return;
        }
        setEditingElement(null);
        setEditingComponent(isTreeChildren ? correspondingComponent : null);
        setIsElementFormOpen(true);
    }, [canModify, currentElement, isTreeChildren, correspondingComponent, preferredLanguage]);

    const handleReindexChildren = useCallback(async () => {
        if (!correspondingComponent?.signatureComponentId || !token) return;
        if (!window.confirm(t('confirmReindexComponentMessage', preferredLanguage, { componentId: correspondingComponent.signatureComponentId }))) return;
        setIsReindexing(true);
        try {
            await api.reindexComponentElements(correspondingComponent.signatureComponentId, token);
            toast.success(t('componentReindexedSuccess', preferredLanguage));
            await fetchChildren(currentChildrenPage, elementSearchQuery);
        } catch (err: any) {
            const msg = err.message || t('componentReindexFailedError', preferredLanguage);
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
        } finally {
            setIsReindexing(false);
        }
    }, [correspondingComponent, token, preferredLanguage, currentChildrenPage, elementSearchQuery, fetchChildren]);

    const handleDeleteElement = useCallback(async (elementIdToDelete: number) => {
        if (!canModify) { toast.error(t('insufficientPermissionsError', preferredLanguage)); return; }
        if (!token) {
            toast.error(t('elementDeletePrereqError', preferredLanguage)); return;
        }
        if (!window.confirm(t('confirmDeleteElementMessage', preferredLanguage))) return;

        setIsElementsLoading(true); setElementsError(null);
        try {
            await api.deleteSignatureElement(elementIdToDelete, token);
            toast.success(t('elementDeletedSuccess', preferredLanguage));
            const newTotalChildren = totalChildren - 1;
            const newTotalPages = Math.max(1, Math.ceil(newTotalChildren / CHILDREN_PAGE_SIZE));
            const newPage = (currentChildrenPage > newTotalPages) ? newTotalPages : currentChildrenPage;

            // Refetch children for the potentially adjusted page
            await fetchChildren(newPage, elementSearchQuery);
            if (currentChildrenPage !== newPage) {
                setCurrentChildrenPage(newPage);
            }
        } catch(e: any){
            const msg = e.message || "Failed";
            setElementsError(t('elementDeleteFailedError', preferredLanguage));
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: t('elementDeleteFailedError', preferredLanguage) + `: ${msg}` }));
        } finally {
            setIsElementsLoading(false);
        }
    }, [token, totalChildren, currentChildrenPage, elementSearchQuery, fetchChildren, canModify, preferredLanguage]);

    const handleElementSaveSuccess = useCallback(async (savedElement: SignatureElement | null) => {
        const wasEdit = !!editingElement; // Capture before reset
        setIsElementFormOpen(false);
        setEditingElement(null);
        setEditingComponent(null);
        // Show success only if an element was actually created/updated
        if (savedElement) {
             toast.success(wasEdit ? t('elementUpdatedSuccess', preferredLanguage) : t('elementCreatedSuccess', preferredLanguage, { name: savedElement.name }));
        }
        // Refetch children for the current page
        await fetchChildren(currentChildrenPage, elementSearchQuery);
    }, [editingElement, currentChildrenPage, elementSearchQuery, fetchChildren, preferredLanguage]);

    // Element Search & Pagination Handlers
    const handleElementSearch = useCallback((newQuery: SearchRequest['query']) => {
        setElementSearchQuery(newQuery);
        setCurrentChildrenPage(1); // Reset page on new search
    }, []);
    const handleElementPageChange = useCallback((newPage: number) => {
        setCurrentChildrenPage(newPage);
    }, []);

    // Create-form component: in TREE/ELEMENT hierarchies children belong to the
    // paired ELEMENT component (its index format applies); otherwise follow the
    // first sibling's component, falling back to the current element's own one.
    const createComponent = isTreeChildren
        ? correspondingComponent
        : (() => {
            const firstSibling = elements.length > 0 ? elements[0] : undefined;
            const defaultComponentId = firstSibling?.signatureComponentId ?? currentElement?.signatureComponentId;
            return defaultComponentId !== undefined ? (componentsById.get(defaultComponentId) ?? null) : null;
        })();
    // While the initial children fetch is in flight no siblings are known yet —
    // keep the create button disabled so the default component never falls back
    // to the parent's one prematurely.
    const isInitialChildrenLoad = isElementsLoading && elements.length === 0;
    // Name of the root component shown as the first breadcrumb
    const rootComponentName = componentsById.get(componentId)?.name ?? t('componentSingularLabel', preferredLanguage);

    // --- Render ---
    if (isCurrentLoading) {
        return <div className="flex justify-center items-center h-32"><LoadingSpinner /></div>;
    }
    if (currentError) {
        return <ErrorDisplay message={currentError} />;
    }
    if (!currentElement || isNaN(elementId)) {
        return <ErrorDisplay message={t('elementNotFoundError', preferredLanguage, { id: elementIdStr || 'invalid' })} />;
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleBack}
                    title={pathIds.length > 1 ? t('elementBrowserPopoverRemoveLastButton', preferredLanguage) : t('backToComponentsButton', preferredLanguage)}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">
                        {t('childrenOfElementTitle', preferredLanguage, { name: formatElementLabel(currentElement) })}
                    </h1>
                    {/* Breadcrumb of the clicked element path */}
                    <nav aria-label="Breadcrumb" className="mt-2 flex items-center gap-1 text-sm flex-wrap text-muted-foreground">
                        <Link to={`/signatures/${componentId}/elements`} className="hover:text-foreground hover:underline">
                            {rootComponentName}
                        </Link>
                        {isPathLoading && <span className="italic">{t('loadingText', preferredLanguage)}...</span>}
                        {!isPathLoading && pathElements.map((el, i) => (
                            <React.Fragment key={pathIds[i]}>
                                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                {i === pathElements.length - 1 ? (
                                    // Current element — plain text (last crumb)
                                    <span className="text-foreground font-medium">{formatElementLabel(el) || `[ID:${pathIds[i]}]`}</span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleBreadcrumbNavigate(i)}
                                        className="cursor-pointer hover:text-foreground hover:underline"
                                    >
                                        {formatElementLabel(el) || `[ID:${pathIds[i]}]`}
                                    </button>
                                )}
                            </React.Fragment>
                        ))}
                    </nav>
                 </div>
            </div>

            {/* Children Section */}
            <Card>
                 <CardHeader>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                              <CardTitle>{t('elementChildrenListHeader', preferredLanguage)}</CardTitle>
                              <CardDescription>{t('elementChildrenDescription', preferredLanguage)}</CardDescription>
                           </div>
                          <div className='flex items-center gap-2 flex-wrap justify-end'>
                          <Button variant="ghost" size="sm" onClick={() => setShowFilters(v => !v)} title={t(showFilters ? 'hideFiltersButton' : 'showFiltersButton', preferredLanguage)}>
                              <SlidersHorizontal className="mr-2 h-4 w-4" /> {t(showFilters ? 'hideFiltersButton' : 'showFiltersButton', preferredLanguage)}
                          </Button>
                          <Dialog open={isElementFormOpen} onOpenChange={setIsElementFormOpen}>
                             <DialogTrigger asChild>
                                 <Button onClick={handleCreateElement} size="sm" className='shrink-0' disabled={!canModify || isInitialChildrenLoad || (isTreeChildren && !correspondingComponent)} title={!canModify ? t('insufficientPermissionsError', preferredLanguage) : ''}>
                                     <PlusCircle className="mr-2 h-4 w-4" /> {t('newElementButton', preferredLanguage)}
                                 </Button>
                             </DialogTrigger>
                             <DialogContent className="sm:max-w-[600px]">
                                 <DialogHeader><DialogTitle>{editingElement ? t('editElementDialogTitle', preferredLanguage) : t('createElementDialogTitle', preferredLanguage)}</DialogTitle><DialogDescription className="sr-only">{editingElement ? t('editElementDialogTitle', preferredLanguage) : t('createElementDialogTitle', preferredLanguage)}</DialogDescription></DialogHeader>
                                 {/* Edit form: same as the component elements page */}
                                 {isElementFormOpen && editingElement && editingComponent && (
                                      <ElementForm
                                         elementToEdit={editingElement}
                                         currentComponent={editingComponent}
                                         onSave={handleElementSaveSuccess}
                                       />
                                 )}
                                 {/* Create form: in tree mode the paired component is fixed (no picker, no parents);
                                     in flat mode keep the component picker + read-only fixed parent */}
                                 {isElementFormOpen && !editingElement && currentElement && createComponent && (
                                      isTreeChildren ? (
                                          <ElementForm
                                             elementToEdit={null}
                                             currentComponent={createComponent}
                                             onSave={handleElementSaveSuccess}
                                           />
                                      ) : (
                                          <ElementForm
                                             elementToEdit={null}
                                             currentComponent={createComponent}
                                             fixedParent={currentElement}
                                             allowComponentPicker
                                             onSave={handleElementSaveSuccess}
                                           />
                                      )
                                 )}
                             </DialogContent>
                          </Dialog>
                          {isTreeChildren && correspondingComponent?.signatureComponentId !== undefined && (
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleReindexChildren}
                                  disabled={!canModify || isReindexing}
                                  title={t('reindexElementsButtonTooltip', preferredLanguage)}
                              >
                                  <ListRestart className="mr-2 h-4 w-4" /> {t('reindexButton', preferredLanguage)}
                              </Button>
                          )}
                          </div>
                       </div>
                 </CardHeader>
                 <CardContent className='space-y-4'>
                    {elementsError && <ErrorDisplay message={elementsError} />}
                    {/* Search Bar for Children (hidden by default, toggled from the card header row) */}
                     <div className={showFilters ? '' : 'hidden'}>
                        <SearchBar
                            fields={[ // Use translated labels
                                { value: 'name', label: t('elementNameLabel', preferredLanguage), type: 'text' as const },
                                { value: 'description', label: t('elementDescriptionLabel', preferredLanguage), type: 'text' as const},
                                { value: 'index', label: t('elementIndexShortLabel', preferredLanguage), type: 'text' as const},
                                { value: 'hasParents', label: t('elementHasParentsLabel', preferredLanguage), type: 'boolean' as const},
                             ]}
                            onSearch={handleElementSearch}
                            isLoading={isElementsLoading}
                        />
                     </div>
                    {/* Children List */}
                    {isElementsLoading && <div className='flex justify-center py-10'><LoadingSpinner /></div>}
                    {!isElementsLoading && !elementsError && (
                        <>
                            <ElementList
                                elements={elements}
                                onEdit={handleEditElement}
                                onDelete={handleDeleteElement}
                                onPreview={handlePreviewElement}
                                onViewChildren={handleViewChildren}
                                componentsById={componentsById}
                             />
                            {totalChildrenPages > 1 && (
                                <div className="mt-4 flex justify-center">
                                    <Pagination
                                        currentPage={currentChildrenPage}
                                        totalPages={totalChildrenPages}
                                        onPageChange={handleElementPageChange}
                                     />
                                </div>
                             )}
                            {/* Use translated empty states */}
                            {elements.length === 0 && elementSearchQuery.length === 0 && ( <p className="text-center text-muted-foreground py-6">{t('noChildrenFoundInElement', preferredLanguage)} {canModify ? t('clickToCreate', preferredLanguage, { item: t('newElementButton', preferredLanguage) }) : ''}</p> )}
                            {elements.length === 0 && elementSearchQuery.length > 0 && ( <p className="text-center text-muted-foreground py-6">{t('noResultsFound', preferredLanguage)}</p> )}
                        </>
                    )}
                 </CardContent>
            </Card>

            <ElementPreviewDialog
                isOpen={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                element={previewingElement}
                onEdit={handleEditElement}
                onDelete={handleDeleteElement}
            />
        </div>
    );
};

export default ElementChildrenPage;
