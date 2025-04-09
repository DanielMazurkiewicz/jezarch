import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'; // Removed DialogClose
import { PlusCircle } from 'lucide-react';
import ComponentList from './ComponentList';
import ComponentForm from './ComponentForm';
import ElementList from './ElementList';
import ElementForm from './ElementForm';
import SearchBar from '@/components/shared/SearchBar';
import { Pagination } from '@/components/shared/Pagination';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { SignatureComponent, SignatureComponentIndexType } from '../../../../backend/src/functionalities/signature/component/models';
import type { SignatureElement, SignatureElementSearchResult } from '../../../../backend/src/functionalities/signature/element/models';
import type { SearchRequest, SearchResponse, SearchQueryElement } from '../../../../backend/src/utils/search';
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

const ELEMENTS_PAGE_SIZE = 15;

const SignaturesPage: React.FC = () => {
    const { token, user } = useAuth();
    const isAdmin = user?.role === 'admin';

    // Components State
    const [components, setComponents] = useState<SignatureComponent[]>([]);
    const [isComponentsLoading, setIsComponentsLoading] = useState(false);
    const [componentsError, setComponentsError] = useState<string | null>(null);
    const [editingComponent, setEditingComponent] = useState<SignatureComponent | null>(null);
    const [isComponentFormOpen, setIsComponentFormOpen] = useState(false);

    // Elements State
    const [selectedComponent, setSelectedComponent] = useState<SignatureComponent | null>(null);
    const [elements, setElements] = useState<SignatureElementSearchResult[]>([]); // Use search result type
    const [isElementsLoading, setIsElementsLoading] = useState(false);
    const [elementsError, setElementsError] = useState<string | null>(null);
    const [editingElement, setEditingElement] = useState<SignatureElement | null>(null);
    const [isElementFormOpen, setIsElementFormOpen] = useState(false);

    // Element Search & Pagination State
    const [elementSearchQuery, setElementSearchQuery] = useState<SearchRequest['query']>([]);
    const [currentElementPage, setCurrentElementPage] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [totalElementPages, setTotalElementPages] = useState(1); // Corrected typo

    // --- Component Logic ---
    const fetchComponents = useCallback(async () => {
        if (!token) return;
        setIsComponentsLoading(true);
        setComponentsError(null);
        try {
            const fetchedComponents = await api.getAllSignatureComponents(token);
            setComponents(fetchedComponents);
            // If a component was selected, update its data (e.g., element count after re-index)
            if (selectedComponent) {
                const updatedSelected = fetchedComponents.find(c => c.signatureComponentId === selectedComponent.signatureComponentId);
                if (updatedSelected) {
                    setSelectedComponent(updatedSelected);
                } else {
                    // Selected component was deleted? Clear selection.
                    setSelectedComponent(null);
                }
            }
        } catch (err: any) {
            const msg = err.message || 'Failed to fetch components';
            setComponentsError(msg);
            toast.error(msg);
            console.error("Fetch Components Error:", err);
        } finally {
            setIsComponentsLoading(false);
        }
    }, [token, selectedComponent]); // Add selectedComponent dependency

    useEffect(() => {
        fetchComponents();
    }, [fetchComponents]); // fetchComponents has token dependency baked in

    const handleEditComponent = (component: SignatureComponent) => {
        if (!isAdmin) {
            toast.error("Only administrators can edit components.");
            return;
        }
        setEditingComponent(component);
        setIsComponentFormOpen(true);
    };

    const handleCreateComponent = () => {
        if (!isAdmin) {
            toast.error("Only administrators can create components.");
            return;
        }
        setEditingComponent(null);
        setIsComponentFormOpen(true);
    };

    const handleDeleteComponent = async (componentId: number) => {
        if (!token || !isAdmin) {
             toast.error("Only administrators can delete components.");
             return;
        }
        if (!window.confirm("WARNING: Deleting a component will also delete ALL its elements and potentially break references in Archive Documents. This cannot be undone. Are you sure?")) return;
        setComponentsError(null);
        setIsComponentsLoading(true); // Show loading during delete
        try {
            await api.deleteSignatureComponent(componentId, token);
            toast.success("Component and its elements deleted.");
            await fetchComponents(); // Refresh list
            if (selectedComponent?.signatureComponentId === componentId) {
                setSelectedComponent(null); // Clear selection if deleted
                setElements([]); // Clear elements
                setTotalElements(0);
                setTotalElementPages(1);
                setCurrentElementPage(1);
                setElementSearchQuery([]);
            }
        } catch (err: any) {
            const msg = err.message || 'Failed to delete component';
            setComponentsError(msg);
            toast.error(`Delete failed: ${msg}`);
            console.error("Delete Component Error:", err);
        } finally {
            setIsComponentsLoading(false);
        }
    };

     const handleReindexComponent = async (componentId: number) => {
        if (!token || !isAdmin) {
             toast.error("Only administrators can re-index components.");
             return;
        }
        if (!window.confirm(`Re-indexing will recalculate indices for all elements in component ID ${componentId} based on their name. This might change existing indices. Continue?`)) return;
        setComponentsError(null); // Clear general error
        setIsComponentsLoading(true); // Use component loading state for now
        try {
            const result = await api.reindexComponentElements(componentId, token);
            toast.success(`Successfully re-indexed ${result.finalCount} elements.`);
            // Refetch elements if the current component was re-indexed
            if (selectedComponent?.signatureComponentId === componentId) {
                await fetchElements(componentId, 1, []); // Fetch first page, clear search
            }
             await fetchComponents(); // Refetch components to update count
        } catch (err: any) {
             const msg = err.message || 'Failed to re-index component';
             setComponentsError(msg);
             toast.error(`Re-indexing failed: ${msg}`);
             console.error("Reindex Error:", err);
        } finally {
            setIsComponentsLoading(false);
        }
     };

    const handleComponentSaveSuccess = async () => {
        setIsComponentFormOpen(false);
        setEditingComponent(null);
        toast.success(editingComponent ? "Component updated." : "Component created.");
        await fetchComponents(); // Refresh list
    };

    // --- Element Logic ---
    const fetchElements = useCallback(async (componentId: number, page = 1, query: SearchRequest['query'] = []) => {
        if (!token) return;
        setIsElementsLoading(true);
        setElementsError(null);
        try {
            // Filter by the selected component ID is mandatory
            const componentFilter: SearchQueryElement = { field: 'signatureComponentId', condition: 'EQ', value: componentId, not: false };
            const finalQuery = [...query.filter(q => q.field !== 'signatureComponentId'), componentFilter];

            const searchRequest: SearchRequest = {
                query: finalQuery,
                page: page,
                pageSize: ELEMENTS_PAGE_SIZE,
            };

            const response = await api.searchSignatureElements(searchRequest, token);
            setElements(response.data);
            setTotalElements(response.totalSize);
            setTotalElementPages(response.totalPages);
            setCurrentElementPage(response.page);
        } catch (err: any) {
             const msg = err.message || 'Failed to fetch elements';
             setElementsError(msg);
             toast.error(msg);
             console.error("Fetch Elements Error:", err);
             setElements([]);
             setTotalElements(0);
             setTotalElementPages(1);
             // Don't reset current page here, let the caller handle it if needed
        } finally {
            setIsElementsLoading(false);
        }
    }, [token]); // Removed page/query from dependencies, pass them as args

    // Fetch elements when selected component changes
    useEffect(() => {
        if (selectedComponent?.signatureComponentId) {
             setCurrentElementPage(1); // Reset page
             setElementSearchQuery([]); // Reset search
             fetchElements(selectedComponent.signatureComponentId, 1, []);
        } else {
             setElements([]); // Clear elements if no component selected
             setTotalElements(0);
             setTotalElementPages(1);
             setCurrentElementPage(1);
             setElementSearchQuery([]);
        }
    }, [selectedComponent, fetchElements]);

    // Fetch elements when search or page changes *for the selected component*
     useEffect(() => {
         if (selectedComponent?.signatureComponentId) {
             fetchElements(selectedComponent.signatureComponentId, currentElementPage, elementSearchQuery);
         }
     }, [currentElementPage, elementSearchQuery, fetchElements, selectedComponent?.signatureComponentId]); // Trigger on page/search change


    const handleSelectComponent = (component: SignatureComponent | null) => {
        setSelectedComponent(component);
        // State resets (page, search) and fetchElements are handled by the useEffect above
    };

    const handleEditElement = (element: SignatureElement) => {
        // Allow regular users to edit?
        // if (!isAdmin) {
        //     toast.error("Only administrators can edit elements.");
        //     return;
        // }
        setEditingElement(element);
        setIsElementFormOpen(true);
    };

    const handleCreateElement = () => {
        if (!selectedComponent) {
            toast.warning("Please select a component first.");
            return;
        }
        // if (!isAdmin) return; // Check permissions
        setEditingElement(null);
        setIsElementFormOpen(true);
    };

    const handleDeleteElement = async (elementId: number) => {
        if (!token || !selectedComponent) return; // Need component context
        // if (!isAdmin) return; // Check permissions
        if (!window.confirm("Are you sure you want to delete this element? This may break references in Archive Documents.")) return;
        setElementsError(null);
        setIsElementsLoading(true); // Show loading
        try {
            await api.deleteSignatureElement(elementId, token);
            toast.success("Element deleted successfully.");

            // Re-fetch elements, adjusting page if needed
             const newTotalPages = Math.ceil((totalElements - 1) / ELEMENTS_PAGE_SIZE);
             const newCurrentPage = (currentElementPage > newTotalPages) ? Math.max(1, newTotalPages) : currentElementPage;

             await fetchElements(selectedComponent.signatureComponentId!, newCurrentPage, elementSearchQuery);
             if (currentElementPage !== newCurrentPage) {
                  setCurrentElementPage(newCurrentPage);
             }
            await fetchComponents(); // Fetch components to update count
        } catch (err: any) {
            const msg = err.message || 'Failed to delete element';
            setElementsError(msg);
            toast.error(`Delete failed: ${msg}`);
            console.error("Delete Element Error:", err);
        } finally {
            setIsElementsLoading(false);
        }
    };

    const handleElementSaveSuccess = async () => {
        setIsElementFormOpen(false);
        setEditingElement(null);
         toast.success(editingElement ? "Element updated." : "Element created.");
        if (selectedComponent?.signatureComponentId) {
            // Refresh current page of elements and component list
            await fetchElements(selectedComponent.signatureComponentId, currentElementPage, elementSearchQuery);
            await fetchComponents();
        }
    };

     const handleElementSearch = (newQuery: SearchRequest['query']) => {
         setElementSearchQuery(newQuery);
         setCurrentElementPage(1); // Reset page on new search
         // Fetch is triggered by useEffect dependency change
     };

     const handleElementPageChange = (newPage: number) => {
         setCurrentElementPage(newPage);
         // Fetch is triggered by useEffect dependency change
     };


    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <h1 className="text-2xl font-bold">Signature Management</h1>

            {/* Components Section */}
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Components</CardTitle>
                        <CardDescription>Manage signature components (groups of elements).</CardDescription>
                    </div>
                    {isAdmin && (
                        <Dialog open={isComponentFormOpen} onOpenChange={setIsComponentFormOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={handleCreateComponent} size="sm" className='shrink-0'>
                                    <PlusCircle className="mr-2 h-4 w-4" /> New Component
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>{editingComponent ? 'Edit Component' : 'Create New Component'}</DialogTitle>
                                </DialogHeader>
                                {isComponentFormOpen && <ComponentForm componentToEdit={editingComponent} onSave={handleComponentSaveSuccess} />}
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                    {isComponentsLoading && <div className='flex justify-center py-4'><LoadingSpinner /></div>}
                    {componentsError && <ErrorDisplay message={componentsError} />}
                    {!isComponentsLoading && !componentsError && (
                        <ComponentList
                            components={components}
                            onEdit={handleEditComponent}
                            onDelete={handleDeleteComponent}
                            onSelect={handleSelectComponent}
                            onReindex={handleReindexComponent}
                            selectedComponentId={selectedComponent?.signatureComponentId ?? null}
                        />
                    )}
                    {!isComponentsLoading && !componentsError && components.length === 0 && (
                       <p className="text-center text-muted-foreground py-4">No components created yet.</p>
                    )}
                </CardContent>
            </Card>

            {/* Elements Section */}
            <Card>
                 <CardHeader className="flex flex-row justify-between items-center">
                     <div>
                         <CardTitle>Elements</CardTitle>
                         <CardDescription>
                             {selectedComponent ? <>Elements for: <span className='font-semibold'>{selectedComponent.name}</span></> : 'Select a component above to view/manage its elements.'}
                         </CardDescription>
                     </div>
                    <Dialog open={isElementFormOpen} onOpenChange={setIsElementFormOpen}>
                        <DialogTrigger asChild>
                            {/* Enable button only if a component is selected */}
                            <Button onClick={handleCreateElement} size="sm" disabled={!selectedComponent} className='shrink-0'>
                                <PlusCircle className="mr-2 h-4 w-4" /> New Element
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>{editingElement ? 'Edit Element' : 'Create New Element'}</DialogTitle>
                            </DialogHeader>
                            {isElementFormOpen && selectedComponent && (
                                <ElementForm
                                    elementToEdit={editingElement}
                                    currentComponent={selectedComponent}
                                    onSave={handleElementSaveSuccess}
                                />
                            )}
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                 <CardContent className='space-y-4'>
                    {/* Element Search Bar - Show only if component selected */}
                    {selectedComponent && (
                        <SearchBar
                             fields={[
                                 { value: 'name', label: 'Name', type: 'text' as const },
                                 { value: 'description', label: 'Description', type: 'text' as const},
                                 { value: 'index', label: 'Index', type: 'text' as const},
                                 { value: 'parentIds', label: 'Parent IDs (Any Of)', type: 'select' as const }, // Requires custom search input, type 'select' is placeholder
                                 { value: 'hasParents', label: 'Has Parents', type: 'boolean' as const }, // Requires backend handler
                                 // { value: 'componentName', label: 'Component Name', type: 'text' }, // Example custom search field
                             ]}
                             onSearch={handleElementSearch}
                             isLoading={isElementsLoading}
                         />
                     )}

                    {isElementsLoading && <div className='flex justify-center py-10'><LoadingSpinner /></div>}
                    {elementsError && <ErrorDisplay message={elementsError} />}
                    {!isElementsLoading && !elementsError && selectedComponent && (
                        <>
                            <ElementList
                                elements={elements}
                                onEdit={handleEditElement}
                                onDelete={handleDeleteElement}
                            />
                             {totalElementPages > 1 && ( // Corrected variable name
                                <div className="mt-4 flex justify-center">
                                    <Pagination
                                        currentPage={currentElementPage}
                                        totalPages={totalElementPages} // Corrected variable name
                                        onPageChange={handleElementPageChange}
                                    />
                                </div>
                             )}
                             {elements.length === 0 && totalElements === 0 && (
                                 <p className="text-center text-muted-foreground py-4">No elements found for this component.</p>
                             )}
                             {elements.length === 0 && totalElements > 0 && (
                                  <p className="text-center text-muted-foreground py-4">No elements found matching your search criteria.</p>
                              )}
                        </>
                    )}
                    {/* Show placeholder if no component is selected */}
                    {!selectedComponent && (
                        <p className="text-center text-muted-foreground py-4">Select a component above to view its elements.</p>
                    )}
                 </CardContent>
            </Card>
        </div>
    );
};

export default SignaturesPage;