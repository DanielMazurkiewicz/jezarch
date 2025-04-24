import { Component, createSignal, createResource, Show } from 'solid-js';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/Dialog'; // Added DialogBody
import ComponentList from './ComponentList';
import ComponentForm from './ComponentForm';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { Icon } from '@/components/shared/Icon';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'; // Added Title/Desc back
import styles from './ComponentsPage.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils'; // Import cn

const ComponentsPage: Component = () => {
    const [authState] = useAuth();
    const [editingComponent, setEditingComponent] = createSignal<SignatureComponent | null>(null);
    const [isFormOpen, setIsFormOpen] = createSignal(false);

    const isAdmin = () => authState.user?.role === 'admin';

    // Resource to fetch components
    const [componentsResource, { refetch: refetchComponents }] = createResource(
        () => authState.token, // Dependency
        async (token) => {
            if (!token) return [];
            console.log("Fetching signature components...");
            try {
                const fetched = await api.getAllSignatureComponents(token);
                return fetched.sort((a, b) => a.name.localeCompare(b.name));
            } catch (error) {
                console.error("Fetch Components Error:", error);
                // TODO: Toast notification
                throw error;
            }
        },
        { initialValue: [] }
    );

    const handleEdit = (component: SignatureComponent) => {
        if (!isAdmin()) { /* TODO: Toast error */ console.error("Admin required"); return; }
        setEditingComponent(component);
        setIsFormOpen(true);
    };

    const handleCreateNew = () => {
        if (!isAdmin()) return; // Prevent opening dialog if not admin
        setEditingComponent(null);
        setIsFormOpen(true);
    };

    const handleDelete = async (componentId: number) => {
        const token = authState.token;
        if (!isAdmin() || !token) { /* TODO: Toast error */ console.error("Admin required/Not authed"); return; }
        if (!window.confirm("WARNING: Deleting a component also deletes ALL its elements and might affect existing archive items. Are you absolutely sure?")) return;

        try {
            await api.deleteSignatureComponent(componentId, token);
            // TODO: Toast success
            refetchComponents();
        } catch (err: any) {
            console.error("Delete Component Error:", err);
            // TODO: Toast error
        }
    };

     const handleReindex = async (componentId: number) => {
        const token = authState.token;
        if (!isAdmin() || !token) { /* TODO: Toast error */ console.error("Admin required/Not authed"); return; }
        if (!window.confirm(`Re-index elements in component ID ${componentId}? This assigns sequential indices based on current sorting.`)) return;

        try {
            await api.reindexComponentElements(componentId, token);
            // TODO: Toast success
            refetchComponents(); // Refetch to update counts/data potentially
        } catch (err: any) {
            console.error("Reindex Component Error:", err);
            // TODO: Toast error
        }
     };

    const handleSaveSuccess = () => {
        setIsFormOpen(false); // Close dialog
        refetchComponents(); // Refresh list
        // TODO: Toast success
    };

     // Dialog open change handler
     const handleOpenChange = (open: boolean) => {
         setIsFormOpen(open);
         if (!open) { setEditingComponent(null); }
     };

    return (
        <div class={styles.componentsPageContainer}>
            <div class={styles.headerContainer}>
                <div class={styles.headerTextContent}>
                    <h1 class={styles.pageTitle}>Signature Components</h1>
                    <p class={styles.pageDescription}>Define hierarchical components (like folders) for signatures.</p>
                </div>
                 <Dialog open={isFormOpen()} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button onClick={handleCreateNew} disabled={!isAdmin()} class={styles.createButtonContainer} title={!isAdmin() ? "Admin required" : "Create New Component"}>
                            <Icon name="PlusCircle" class={styles.iconMargin}/> New Component
                        </Button>
                    </DialogTrigger>
                    <DialogContent size="sm">
                        <DialogHeader>
                            <DialogTitle>{editingComponent() ? 'Edit Component' : 'Create New Component'}</DialogTitle>
                        </DialogHeader>
                         {/* Wrap form in DialogBody for scrolling */}
                         <DialogBody>
                            <ComponentForm componentToEdit={editingComponent()} onSave={handleSaveSuccess} />
                         </DialogBody>
                    </DialogContent>
                </Dialog>
            </div>

            <Card class={styles.componentsListCard}>
                {/* Can add CardHeader for title if desired */}
                {/* <CardHeader><CardTitle>Component List</CardTitle></CardHeader> */}
                <CardContent>
                    <Show when={componentsResource.error}>
                        <ErrorDisplay message={`Failed to load components: ${componentsResource.error?.message}`} />
                    </Show>
                    <Show when={componentsResource.loading}>
                         <div class={styles.loadingContainer}>
                             <LoadingSpinner size="lg" />
                         </div>
                    </Show>
                     <Show when={!componentsResource.loading && !componentsResource.error && componentsResource()}>
                         {(components) => ( // components() is the accessor
                            <Show when={components().length > 0}
                                fallback={<p class={styles.emptyStateText}>No components created yet. {isAdmin() ? 'Click "New Component".' : ''}</p>}
                            >
                                <ComponentList
                                    components={components()}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onReindex={handleReindex}
                                />
                            </Show>
                         )}
                     </Show>
                 </CardContent>
            </Card>
        </div>
    );
};

export default ComponentsPage;