import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle } from 'lucide-react';
import ComponentList from './ComponentList';
import ComponentForm from './ComponentForm';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

// Renamed from SignaturesPage to ComponentsPage
const ComponentsPage: React.FC = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate(); // Hook for navigation
    const isAdmin = user?.role === 'admin';

    // --- Component State ---
    const [components, setComponents] = useState<SignatureComponent[]>([]);
    const [isComponentsLoading, setIsComponentsLoading] = useState(true);
    const [componentsError, setComponentsError] = useState<string | null>(null);
    const [editingComponent, setEditingComponent] = useState<SignatureComponent | null>(null);
    const [isComponentFormOpen, setIsComponentFormOpen] = useState(false);

    // --- Component Logic ---

    // Fetch components (stable callback)
    const fetchComponents = useCallback(async () => {
        if (!token) {
            setIsComponentsLoading(false);
            setComponents([]);
            return;
        }
        setIsComponentsLoading(true);
        setComponentsError(null);
        try {
            const fetchedComponents = (await api.getAllSignatureComponents(token))
                                        .sort((a, b) => a.name.localeCompare(b.name));
            setComponents(fetchedComponents);
        } catch (err: any) {
            const msg = err.message || 'Failed to fetch components';
            setComponentsError(msg);
            toast.error(msg);
            console.error("Fetch Components Error:", err);
            setComponents([]);
        } finally {
            setIsComponentsLoading(false);
        }
    }, [token]);

    // Effect: Fetch components when token changes
    useEffect(() => {
        fetchComponents();
    }, [fetchComponents]);

    // Component Callbacks
    const handleEditComponent = useCallback((component: SignatureComponent) => {
        if (!isAdmin) { toast.error("Admin privileges required."); return; }
        setEditingComponent(component);
        setIsComponentFormOpen(true);
    }, [isAdmin]);

    const handleCreateComponent = useCallback(() => {
        setEditingComponent(null);
        setIsComponentFormOpen(true);
    }, []);

    const handleDeleteComponent = useCallback(async (componentId: number) => {
        if (!isAdmin) { toast.error("Admin privileges required."); return; }
        if (!token) { toast.error("Authentication token missing."); return; }
        if (!window.confirm("WARNING: Deleting a component will also delete ALL its elements and potentially break references. This cannot be undone. Are you sure?")) return;

        setIsComponentsLoading(true); setComponentsError(null);
        try {
            await api.deleteSignatureComponent(componentId, token);
            toast.success("Component deleted successfully.");
            // Refetch after successful delete
            await fetchComponents();
        } catch(e: any) {
            const msg = e.message || "Failed to delete component";
            setComponentsError(msg); toast.error(msg);
            setIsComponentsLoading(false); // Stop loading on error
        }
        // Loading state will be reset by fetchComponents on success
    }, [isAdmin, token, fetchComponents]);

    const handleReindexComponent = useCallback(async (componentId: number) => {
        if (!isAdmin) { toast.error("Admin privileges required."); return; }
        if (!token) { toast.error("Authentication token missing."); return; }
        if (!window.confirm(`Re-indexing will recalculate indices for all elements in component ID ${componentId}. Continue?`)) return;

        setIsComponentsLoading(true); setComponentsError(null);
        try {
            await api.reindexComponentElements(componentId, token);
            toast.success("Component re-indexed successfully.");
            // Refetch to update counts etc.
            await fetchComponents();
        } catch(e: any) {
            const msg = e.message || "Failed to re-index component";
            setComponentsError(msg); toast.error(msg);
            setIsComponentsLoading(false); // Stop loading on error
        }
        // Loading state will be reset by fetchComponents on success
    }, [isAdmin, token, fetchComponents]);

    const handleComponentSaveSuccess = useCallback(() => {
        setIsComponentFormOpen(false);
        setEditingComponent(null);
        toast.success("Component saved successfully.");
        fetchComponents(); // Refetch list after saving
    }, [fetchComponents]);

    // Navigate to Elements Page when a component is clicked
    const handleOpenComponent = useCallback((component: SignatureComponent) => {
        navigate(`/signatures/${component.signatureComponentId}/elements`);
    }, [navigate]);


    // --- Render ---
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold">Signature Components</h1>
                <p className='text-muted-foreground'>Define hierarchical components (like folders) for signatures.</p>
            </div>

            {/* Components Section */}
            <Card>
                <CardHeader>
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                         <div>
                             <CardTitle>Components</CardTitle>
                             <CardDescription>Click a component to view its elements.</CardDescription>
                         </div>
                         {isAdmin ? (
                             <Dialog open={isComponentFormOpen} onOpenChange={setIsComponentFormOpen}>
                                 <DialogTrigger asChild>
                                     <Button onClick={handleCreateComponent} size="sm" className='shrink-0'>
                                         <PlusCircle className="mr-2 h-4 w-4" /> New Component
                                     </Button>
                                 </DialogTrigger>
                                 <DialogContent className="sm:max-w-[500px]">
                                     <DialogHeader><DialogTitle>{editingComponent ? 'Edit Component' : 'Create New Component'}</DialogTitle></DialogHeader>
                                     <ComponentForm componentToEdit={editingComponent} onSave={handleComponentSaveSuccess} />
                                 </DialogContent>
                             </Dialog>
                         ) : (
                             <Button size="sm" className='shrink-0' disabled title="Admin privileges required">
                                <PlusCircle className="mr-2 h-4 w-4" /> New Component
                             </Button>
                         )}
                     </div>
                </CardHeader>
                <CardContent>
                    {componentsError && <ErrorDisplay message={componentsError} />}
                    {isComponentsLoading && <div className='flex justify-center py-6'><LoadingSpinner /></div>}
                    {!isComponentsLoading && !componentsError && (
                        // Pass handleOpenComponent instead of onSelect
                        <ComponentList
                            components={components}
                            onEdit={handleEditComponent}
                            onDelete={handleDeleteComponent}
                            onOpen={handleOpenComponent} // Changed prop name
                            onReindex={handleReindexComponent}
                         />
                    )}
                    {!isComponentsLoading && !componentsError && components.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No components created yet. {isAdmin ? 'Click "New Component".' : ''}</p>
                    )}
                </CardContent>
            </Card>

            {/* Element section is removed from this page */}

        </div>
    );
};

export default ComponentsPage; // Renamed export