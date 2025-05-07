import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import ElementList from './ElementList';
import ElementForm from './ElementForm';
import SearchBar, { type SearchFieldOption } from '@/components/shared/SearchBar';
import { Pagination } from '@/components/shared/Pagination';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import type { SignatureElement, SignatureElementSearchResult } from '../../../../backend/src/functionalities/signature/element/models';
import type { SearchRequest, SearchResponse, SearchQueryElement } from '../../../../backend/src/utils/search';
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // Import Badge
import { t } from '@/translations/utils'; // Import translation utility

const ELEMENTS_PAGE_SIZE = 15;

// New component for displaying Elements of a specific Component
const ElementsPage: React.FC = () => {
    const { componentId: componentIdStr } = useParams<{ componentId: string }>();
    const componentId = parseInt(componentIdStr || '', 10);
    const navigate = useNavigate();
    const { token, user, preferredLanguage } = useAuth(); // Get preferredLanguage
    const isAdmin = user?.role === 'admin';
    const canModify = isAdmin || user?.role === 'employee'; // Define modification permission

    // --- Component State (for the parent component) ---
    const [parentComponent, setParentComponent] = useState<SignatureComponent | null>(null);
    const [isParentLoading, setIsParentLoading] = useState(true);
    const [parentError, setParentError] = useState<string | null>(null);

    // --- Element State ---
    const [elements, setElements] = useState<SignatureElementSearchResult[]>([]);
    const [isElementsLoading, setIsElementsLoading] = useState(false);
    const [elementsError, setElementsError] = useState<string | null>(null);
    const [editingElement, setEditingElement] = useState<SignatureElement | null>(null);
    const [isElementFormOpen, setIsElementFormOpen] = useState(false);
    const [elementSearchQuery, setElementSearchQuery] = useState<SearchRequest['query']>([]);
    const [currentElementPage, setCurrentElementPage] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [totalElementPages, setTotalElementPages] = useState(1);

    // Fetch Parent Component Details
    useEffect(() => {
        const fetchParent = async () => {
            if (!token || isNaN(componentId)) { // Added NaN check
                setIsParentLoading(false);
                setParentError(t('invalidComponentIdError', preferredLanguage)); // Use translated error
                return;
            }
            setIsParentLoading(true);
            setParentError(null);
            try {
                const fetchedComponent = await api.getSignatureComponentById(componentId, token);
                setParentComponent(fetchedComponent);
            } catch (err: any) {
                const msg = err.message || t('componentFetchByIdError', preferredLanguage, { id: componentId }); // Use translated error
                setParentError(msg);
                toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
                console.error("Fetch Parent Component Error:", err);
                setParentComponent(null);
            } finally {
                setIsParentLoading(false);
            }
        };
        fetchParent();
    }, [token, componentId, preferredLanguage]); // Add preferredLanguage

    // Fetch Elements Callback
    const fetchElements = useCallback(async (page = 1, query: SearchRequest['query'] = []) => {
        if (!token || isNaN(componentId)) { // Added NaN check
            setIsElementsLoading(false);
            setElementsError(t('elementFetchPrereqError', preferredLanguage)); // Use translated error
            return;
        }
        setIsElementsLoading(true);
        setElementsError(null);
        try {
            const componentFilter: SearchQueryElement = { field: 'signatureComponentId', condition: 'EQ', value: componentId, not: false };
            const finalQuery = [...query.filter(q => q.field !== 'signatureComponentId'), componentFilter];
            const searchRequest: SearchRequest = { query: finalQuery, page, pageSize: ELEMENTS_PAGE_SIZE };
            const response = await api.searchSignatureElements(searchRequest, token);
            setElements(response.data);
            setTotalElements(response.totalSize);
            setTotalElementPages(response.totalPages);
            setCurrentElementPage(response.page);
        } catch (err: any) {
             const msg = err.message || t('elementFetchFailedError', preferredLanguage); // Use translated error
             setElementsError(msg);
             toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
             console.error("Fetch Elements Error:", err);
             setElements([]); setTotalElements(0); setTotalElementPages(1);
        } finally { setIsElementsLoading(false); }
    }, [token, componentId, preferredLanguage]); // Add preferredLanguage dependency

    // Fetch Elements Effect
    useEffect(() => {
        // Fetch only if parent component is loaded and valid
        if (parentComponent) {
            fetchElements(currentElementPage, elementSearchQuery);
        } else {
            // Clear elements if no valid parent
            setElements([]); setTotalElements(0); setTotalElementPages(1); setCurrentElementPage(1);
        }
    }, [parentComponent, currentElementPage, elementSearchQuery, fetchElements]);

    // --- Element CRUD & Other Callbacks ---
    const handleEditElement = useCallback((element: SignatureElement) => {
        if (!canModify) { toast.error(t('insufficientPermissionsError', preferredLanguage)); return; } // Use translated error
        setEditingElement(element);
        setIsElementFormOpen(true);
    }, [canModify, preferredLanguage]); // Add preferredLanguage

    const handleCreateElement = useCallback(() => {
        if (!canModify) { toast.error(t('insufficientPermissionsError', preferredLanguage)); return; }
        if (!parentComponent) { toast.warning(t('parentComponentNotLoadedWarning', preferredLanguage)); return; } // Use translated warning
        setEditingElement(null);
        setIsElementFormOpen(true);
    }, [canModify, parentComponent, preferredLanguage]); // Add preferredLanguage

    const handleDeleteElement = useCallback(async (elementId: number) => {
        if (!canModify) { toast.error(t('insufficientPermissionsError', preferredLanguage)); return; }
        if (!parentComponent || !token) {
            toast.error(t('elementDeletePrereqError', preferredLanguage)); return; // Use translated error
        }
        if (!window.confirm(t('confirmDeleteElementMessage', preferredLanguage))) return;

        setIsElementsLoading(true); setElementsError(null);
        try {
            await api.deleteSignatureElement(elementId, token);
            toast.success(t('elementDeletedSuccess', preferredLanguage));
            const newTotalElements = totalElements - 1;
            const newTotalPages = Math.max(1, Math.ceil(newTotalElements / ELEMENTS_PAGE_SIZE));
            const newPage = (currentElementPage > newTotalPages) ? newTotalPages : currentElementPage;

            // Update parent component's count (if we have it) - local state update only
            if (parentComponent && parentComponent.index_count !== undefined && parentComponent.index_count !== null) {
                setParentComponent(prev => prev ? {...prev, index_count: prev.index_count! - 1} : null);
            }

            // Refetch elements for the potentially adjusted page
            await fetchElements(newPage, elementSearchQuery);
            if (currentElementPage !== newPage) {
                setCurrentElementPage(newPage);
            }
        } catch(e: any){
            const msg = e.message || "Failed";
            setElementsError(t('elementDeleteFailedError', preferredLanguage));
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: t('elementDeleteFailedError', preferredLanguage) + `: ${msg}` }));
        } finally {
            setIsElementsLoading(false);
        }
    }, [token, parentComponent, totalElements, currentElementPage, elementSearchQuery, fetchElements, canModify, preferredLanguage]); // Add canModify, preferredLanguage

    const handleElementSaveSuccess = useCallback(async (savedElement: SignatureElement | null) => { // Added parameter
        setIsElementFormOpen(false);
        setEditingElement(null);
        // Show success only if an element was actually created/updated
        if (savedElement) {
             toast.success(editingElement ? t('elementUpdatedSuccess', preferredLanguage) : t('elementCreatedSuccess', preferredLanguage, { name: savedElement.name }));
        }
        const currentParentId = parentComponent?.signatureComponentId; // Store ID before potential async operations

        // Fixed: Ensure currentParentId is a valid number before proceeding
        if (typeof currentParentId === 'number' && !isNaN(currentParentId)) {
            // Refetch elements for the current page first
            await fetchElements(currentElementPage, elementSearchQuery);

            // Then, fetch parent again to update count only if an element was actually created/updated
             if (savedElement) {
                 try {
                     // Use the stored ID for safety
                     const updatedParent = await api.getSignatureComponentById(currentParentId, token);
                     setParentComponent(updatedParent);
                 } catch (err) {
                     console.error("Failed to refresh parent component after element save", err);
                     toast.warn(t('parentComponentRefreshError', preferredLanguage)); // Use translated warning
                 }
            }
        } else {
            console.warn("Cannot refresh elements or parent: Parent component ID is missing or invalid.");
        }
    }, [parentComponent?.signatureComponentId, currentElementPage, elementSearchQuery, fetchElements, token, editingElement, preferredLanguage]); // Add editingElement, preferredLanguage


    // Element Search & Pagination Handlers
    const handleElementSearch = useCallback((newQuery: SearchRequest['query']) => {
        setElementSearchQuery(newQuery);
        setCurrentElementPage(1); // Reset page on new search
    }, []);
    const handleElementPageChange = useCallback((newPage: number) => {
        setCurrentElementPage(newPage);
    }, []);

    // --- Render ---
    if (isParentLoading) {
        return <div className="flex justify-center items-center h-32"><LoadingSpinner /></div>;
    }
    if (parentError) {
        return <ErrorDisplay message={parentError} />;
    }
    if (!parentComponent || isNaN(componentId)) {
        return <ErrorDisplay message={t('componentNotFoundError', preferredLanguage, { id: componentIdStr || 'invalid' })} />; // Use translated error
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/signatures')} title={t('backToComponentsButton', preferredLanguage)}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">
                         {t('elementsForComponentTitle', preferredLanguage, { componentName: parentComponent.name })}
                    </h1>
                    <p className='text-muted-foreground'>{t('elementsDescription', preferredLanguage)}</p>
                    <Badge variant="secondary" className='mt-1'>{t('componentBadgeIndexType', preferredLanguage, { type: parentComponent.index_type })}</Badge>
                    <Badge variant="outline" className='mt-1 ml-2'>{t('componentBadgeElementsCount', preferredLanguage, { count: parentComponent.index_count ?? t('notAvailableAbbr', preferredLanguage) })}</Badge> {/* TODO: Add notAvailableAbbr */}
                 </div>
            </div>

            {/* Elements Section */}
            <Card>
                 <CardHeader>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                              <CardTitle>{t('elementListElementsHeader', preferredLanguage)}</CardTitle>
                              <CardDescription>{t('elementsDescription', preferredLanguage)}</CardDescription>
                           </div>
                         <Dialog open={isElementFormOpen} onOpenChange={setIsElementFormOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={handleCreateElement} size="sm" className='shrink-0' disabled={!canModify} title={!canModify ? t('insufficientPermissionsError', preferredLanguage) : ''}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> {t('newElementButton', preferredLanguage)}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                                <DialogHeader><DialogTitle>{editingElement ? t('editElementDialogTitle', preferredLanguage) : t('createElementDialogTitle', preferredLanguage)}</DialogTitle></DialogHeader>
                                {/* Ensure element form only renders when dialog is open and parent is loaded */}
                                {isElementFormOpen && parentComponent && (
                                     <ElementForm
                                        elementToEdit={editingElement}
                                        currentComponent={parentComponent}
                                        onSave={handleElementSaveSuccess}
                                      />
                                )}
                            </DialogContent>
                         </Dialog>
                      </div>
                 </CardHeader>
                 <CardContent className='space-y-4'>
                    {elementsError && <ErrorDisplay message={elementsError} />}
                    {/* Search Bar for Elements */}
                     <SearchBar
                        fields={[ // Use translated labels
                            { value: 'name', label: t('elementNameLabel', preferredLanguage), type: 'text' as const },
                            { value: 'description', label: t('elementDescriptionLabel', preferredLanguage), type: 'text' as const},
                            { value: 'index', label: t('elementIndexLabel', preferredLanguage).split(' (')[0], type: 'text' as const},
                            { value: 'hasParents', label: t('elementHasParentsLabel', preferredLanguage), type: 'boolean' as const },
                         ]}
                        onSearch={handleElementSearch}
                        isLoading={isElementsLoading}
                     />
                    {/* Element List */}
                    {isElementsLoading && <div className='flex justify-center py-10'><LoadingSpinner /></div>}
                    {!isElementsLoading && !elementsError && (
                        <>
                            <ElementList
                                elements={elements}
                                onEdit={handleEditElement}
                                onDelete={handleDeleteElement}
                             />
                            {totalElementPages > 1 && (
                                <div className="mt-4 flex justify-center">
                                    <Pagination
                                        currentPage={currentElementPage}
                                        totalPages={totalElementPages}
                                        onPageChange={handleElementPageChange}
                                     />
                                </div>
                             )}
                              {/* Use translated empty states */}
                            {elements.length === 0 && elementSearchQuery.length === 0 && ( <p className="text-center text-muted-foreground py-6">{t('noElementsFoundInComponent', preferredLanguage)} {canModify ? t('clickToCreate', preferredLanguage, { item: t('newElementButton', preferredLanguage) }) : ''}</p> )}
                            {elements.length === 0 && elementSearchQuery.length > 0 && ( <p className="text-center text-muted-foreground py-6">{t('noResultsFound', preferredLanguage)}</p> )}
                        </>
                    )}
                 </CardContent>
            </Card>
        </div>
    );
};

export default ElementsPage;
