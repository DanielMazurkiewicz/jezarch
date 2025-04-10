import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import type { SignatureElement, SignatureElementSearchResult } from '../../../../backend/src/functionalities/signature/element/models';
import type { SearchRequest, SearchResponse, SearchQueryElement } from '../../../../backend/src/utils/search';
import { toast } from "sonner";
// Import Card components for layout
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

const ELEMENTS_PAGE_SIZE = 15; // Number of elements per page

const SignaturesPage: React.FC = () => {
    const { token, user } = useAuth();
    const isAdmin = user?.role === 'admin';

    // --- Component State ---
    const [components, setComponents] = useState<SignatureComponent[]>([]);
    const [isComponentsLoading, setIsComponentsLoading] = useState(true); // Start loading
    const [componentsError, setComponentsError] = useState<string | null>(null);
    const [editingComponent, setEditingComponent] = useState<SignatureComponent | null>(null);
    const [isComponentFormOpen, setIsComponentFormOpen] = useState(false);
    const [selectedComponent, setSelectedComponent] = useState<SignatureComponent | null>(null);

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

    // --- Component Logic ---
    const fetchComponents = useCallback(async () => {
        if (!token) {
            setIsComponentsLoading(false); return;
        }
        setIsComponentsLoading(true); setComponentsError(null);
        try {
            const fetchedComponents = (await api.getAllSignatureComponents(token))
                                        .sort((a, b) => a.name.localeCompare(b.name));
            setComponents(fetchedComponents);
            if (selectedComponent) {
                const updatedSelected = fetchedComponents.find(c => c.signatureComponentId === selectedComponent.signatureComponentId);
                setSelectedComponent(updatedSelected || null);
            }
        } catch (err: any) {
            const msg = err.message || 'Failed to fetch components';
            setComponentsError(msg); toast.error(msg); console.error("Fetch Components Error:", err);
        } finally { setIsComponentsLoading(false); }
    }, [token, selectedComponent]);

    useEffect(() => { fetchComponents(); }, [fetchComponents]);

    // --- Component CRUD Handlers ---
    const handleEditComponent = (component: SignatureComponent) => { if (!isAdmin) { toast.error("Admin only."); return; } setEditingComponent(component); setIsComponentFormOpen(true); };
    const handleCreateComponent = () => { if (!isAdmin) { toast.error("Admin only."); return; } setEditingComponent(null); setIsComponentFormOpen(true); };
    const handleDeleteComponent = async (componentId: number) => {
        if (!isAdmin) { toast.error("Admin only."); return; }
        // Add explicit token check before API call
        if (!token) { toast.error("Authentication token missing."); return; }
        if (!window.confirm("WARNING: Deleting a component will also delete ALL its elements and potentially break references. This cannot be undone. Are you sure?")) return;

        setIsComponentsLoading(true); setComponentsError(null);
        try {
            await api.deleteSignatureComponent(componentId, token); // Now token is guaranteed to be string
            toast.success("Deleted");
            await fetchComponents();
            if (selectedComponent?.signatureComponentId === componentId) setSelectedComponent(null);
        } catch(e: any) { // Add type annotation for catch
            const msg = e.message || "Delete failed";
            setComponentsError(msg); toast.error(msg); // Display error in UI and toast
        } finally {
            setIsComponentsLoading(false);
        }
    };
    const handleReindexComponent = async (componentId: number) => {
        if (!isAdmin) { toast.error("Admin only."); return; }
        // Add explicit token check before API call
        if (!token) { toast.error("Authentication token missing."); return; }
        if (!window.confirm(`Re-indexing will recalculate indices for all elements in component ID ${componentId}. Continue?`)) return;

        setIsComponentsLoading(true); setComponentsError(null);
        try {
            await api.reindexComponentElements(componentId, token); // Now token is guaranteed to be string
            toast.success("Reindexed");
            if (selectedComponent?.signatureComponentId === componentId) {
                // Fetch elements again for the re-indexed component
                await fetchElements(componentId, 1, []);
            }
            await fetchComponents(); // Update component count display
        } catch(e: any) { // Add type annotation for catch
            const msg = e.message || "Reindex failed";
            setComponentsError(msg); toast.error(msg); // Display error in UI and toast
        } finally {
            setIsComponentsLoading(false);
        }
    };
    const handleComponentSaveSuccess = async () => { setIsComponentFormOpen(false); setEditingComponent(null); toast.success("Component saved."); await fetchComponents(); };

    // --- Element Logic ---
    const fetchElements = useCallback(async (componentId: number, page = 1, query: SearchRequest['query'] = []) => {
        // Add token check at the beginning of the function
        if (!token) {
            setIsElementsLoading(false); // Ensure loading stops if no token
            setElementsError("Authentication token missing.");
            return;
        }
        setIsElementsLoading(true); setElementsError(null);
        try {
            const componentFilter: SearchQueryElement = { field: 'signatureComponentId', condition: 'EQ', value: componentId, not: false };
            const finalQuery = [...query.filter(q => q.field !== 'signatureComponentId'), componentFilter];
            const searchRequest: SearchRequest = {
                query: finalQuery, page: page, pageSize: ELEMENTS_PAGE_SIZE,
                // sort: [{ field: 'index', direction: 'ASC' }, { field: 'name', direction: 'ASC' }] // TS2353: Comment out if 'sort' not in type
            };
            const response = await api.searchSignatureElements(searchRequest, token); // Token is string here
            setElements(response.data); setTotalElements(response.totalSize); setTotalElementPages(response.totalPages); setCurrentElementPage(response.page);
        } catch (err: any) {
             const msg = err.message || 'Failed to fetch elements'; setElementsError(msg); toast.error(msg); console.error("Fetch Elements Error:", err);
             setElements([]); setTotalElements(0); setTotalElementPages(1);
        } finally { setIsElementsLoading(false); }
    }, [token]); // Keep token dependency

    useEffect(() => {
        if (selectedComponent?.signatureComponentId) {
            fetchElements(selectedComponent.signatureComponentId, currentElementPage, elementSearchQuery);
        } else {
            setElements([]); setTotalElements(0); setTotalElementPages(1); setCurrentElementPage(1); setElementSearchQuery([]);
        }
    }, [selectedComponent, currentElementPage, elementSearchQuery, fetchElements]);

    const handleSelectComponent = (component: SignatureComponent | null) => {
        if (component?.signatureComponentId !== selectedComponent?.signatureComponentId) {
            setSelectedComponent(component); setCurrentElementPage(1); setElementSearchQuery([]);
        } else { setSelectedComponent(null); }
    };

    // --- Element CRUD Handlers ---
    const handleEditElement = (element: SignatureElement) => { setEditingElement(element); setIsElementFormOpen(true); };
    const handleCreateElement = () => { if (!selectedComponent) { toast.warning("Select component first."); return; } setEditingElement(null); setIsElementFormOpen(true); };
    const handleDeleteElement = async (elementId: number) => {
        if (!selectedComponent) return; // Component context needed
        // Add explicit token check before API call
        if (!token) { toast.error("Authentication token missing."); return; }
        // Permission check if needed: if (!isAdmin) { toast.error("Permission denied."); return; }
        if (!window.confirm("Are you sure you want to delete this element? This may break references.")) return;

        setIsElementsLoading(true); setElementsError(null);
        try {
            await api.deleteSignatureElement(elementId, token); // Token is string here
            toast.success("Deleted");
            const newPages = Math.ceil((totalElements - 1) / ELEMENTS_PAGE_SIZE);
            const newPage = (currentElementPage > newPages) ? Math.max(1, newPages) : currentElementPage;
            await fetchElements(selectedComponent.signatureComponentId!, newPage, elementSearchQuery);
            if (currentElementPage !== newPage) setCurrentElementPage(newPage);
            await fetchComponents(); // Update component count
        } catch(e: any){ // Add type annotation for catch
            const msg = e.message || "Delete failed";
            setElementsError(msg); toast.error(msg); // Display error in UI and toast
        } finally {
            setIsElementsLoading(false);
        }
    };
    const handleElementSaveSuccess = async () => { setIsElementFormOpen(false); setEditingElement(null); toast.success("Element saved."); if (selectedComponent?.signatureComponentId) { await fetchElements(selectedComponent.signatureComponentId, currentElementPage, elementSearchQuery); await fetchComponents(); }};

     // Element Search & Pagination Handlers
     const handleElementSearch = (newQuery: SearchRequest['query']) => { setElementSearchQuery(newQuery); setCurrentElementPage(1); };
     const handleElementPageChange = (newPage: number) => { setCurrentElementPage(newPage); };


    // --- Render ---
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div> <h1 className="text-2xl font-bold">Signature Management</h1> <p className='text-muted-foreground'>Define hierarchical components and their elements.</p> </div>

            {/* Components Section */}
            <Card>
                <CardHeader className="flex flex-row justify-between items-center gap-4">
                    <div> <CardTitle>Components</CardTitle> <CardDescription>Select a component to view its elements.</CardDescription> </div>
                    {isAdmin && ( <Dialog open={isComponentFormOpen} onOpenChange={setIsComponentFormOpen}> <DialogTrigger asChild> <Button onClick={handleCreateComponent} size="sm" className='shrink-0'> <PlusCircle className="mr-2 h-4 w-4" /> New Component </Button> </DialogTrigger> <DialogContent className="sm:max-w-[500px]"> <DialogHeader><DialogTitle>{editingComponent ? 'Edit Component' : 'Create New Component'}</DialogTitle></DialogHeader> {isComponentFormOpen && <ComponentForm componentToEdit={editingComponent} onSave={handleComponentSaveSuccess} />} </DialogContent> </Dialog> )}
                </CardHeader>
                <CardContent>
                    {componentsError && <ErrorDisplay message={componentsError} />} {isComponentsLoading && <div className='flex justify-center py-6'><LoadingSpinner /></div>}
                    {!isComponentsLoading && !componentsError && ( <ComponentList components={components} selectedComponentId={selectedComponent?.signatureComponentId ?? null} onEdit={handleEditComponent} onDelete={handleDeleteComponent} onSelect={handleSelectComponent} onReindex={handleReindexComponent} /> )}
                    {!isComponentsLoading && !componentsError && components.length === 0 && ( <p className="text-center text-muted-foreground py-4">No components created yet. {isAdmin ? 'Click "New Component".' : ''}</p> )}
                </CardContent>
            </Card>

            {/* Elements Section */}
            <Card>
                 <CardHeader className="flex flex-row justify-between items-center gap-4">
                     <div> <CardTitle>Elements</CardTitle> <CardDescription> {selectedComponent ? <>Elements for: <span className='font-semibold'>{selectedComponent.name}</span></> : 'Select a component above.'} </CardDescription> </div>
                    <Dialog open={isElementFormOpen} onOpenChange={setIsElementFormOpen}> <DialogTrigger asChild> <Button onClick={handleCreateElement} size="sm" disabled={!selectedComponent} className='shrink-0'> <PlusCircle className="mr-2 h-4 w-4" /> New Element </Button> </DialogTrigger> <DialogContent className="sm:max-w-[600px]"> <DialogHeader><DialogTitle>{editingElement ? 'Edit Element' : 'Create New Element'}</DialogTitle></DialogHeader> {isElementFormOpen && selectedComponent && ( <ElementForm elementToEdit={editingElement} currentComponent={selectedComponent} onSave={handleElementSaveSuccess} /> )} </DialogContent> </Dialog>
                </CardHeader>
                 <CardContent className='space-y-4'>
                    {elementsError && <ErrorDisplay message={elementsError} />}
                    {selectedComponent && ( <SearchBar fields={[ { value: 'name', label: 'Name', type: 'text' as const }, { value: 'description', label: 'Description', type: 'text' as const}, { value: 'index', label: 'Index', type: 'text' as const}, { value: 'hasParents', label: 'Has Parents', type: 'boolean' as const }, ]} onSearch={handleElementSearch} isLoading={isElementsLoading} /> )}
                    {isElementsLoading && <div className='flex justify-center py-10'><LoadingSpinner /></div>}
                    {!isElementsLoading && !elementsError && selectedComponent && (
                        <>
                            <ElementList elements={elements} onEdit={handleEditElement} onDelete={handleDeleteElement} />
                            {totalElementPages > 1 && ( <div className="mt-4 flex justify-center"> <Pagination currentPage={currentElementPage} totalPages={totalElementPages} onPageChange={handleElementPageChange} /> </div> )}
                            {elements.length === 0 && elementSearchQuery.length === 0 && ( <p className="text-center text-muted-foreground py-6">No elements found for this component.</p> )}
                            {elements.length === 0 && elementSearchQuery.length > 0 && ( <p className="text-center text-muted-foreground py-6">No elements found matching search.</p> )}
                        </>
                    )}
                    {!selectedComponent && !isComponentsLoading && ( <p className="text-center text-muted-foreground py-6">Select a component to view elements.</p> )}
                 </CardContent>
            </Card>
        </div>
    );
};

export default SignaturesPage;