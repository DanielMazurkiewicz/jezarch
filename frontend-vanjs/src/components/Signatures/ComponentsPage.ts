import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { navigate } from "@/lib/router";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import ComponentList from "./ComponentList";
import ComponentForm from "./ComponentForm";
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import ErrorDisplay from "@/components/Shared/ErrorDisplay";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import type { SignatureComponent } from "../../../../backend/src/functionalities/signature/component/models";
// Removed toast

const { div, h1, p } = van.tags;

const ComponentsPage = () => {
    const { token, user } = authStore;
    const isAdmin = van.derive(() => user.val?.role === 'admin');

    // --- State ---
    const components = van.state<SignatureComponent[]>([]);
    const isLoading = van.state(true);
    const error = van.state<string | null>(null);
    const editingComponent = van.state<SignatureComponent | null>(null);
    const isFormOpen = van.state(false);

    // --- Data Fetching ---
    const fetchComponents = async () => {
        if (!token.val) {
            isLoading.val = false; components.val = []; return;
        }
        isLoading.val = true; error.val = null;
        try {
            const fetched = await api.getAllSignatureComponents(token.val);
            components.val = fetched.sort((a, b) => a.name.localeCompare(b.name));
        } catch (err: any) {
            const msg = err.message || 'Failed to fetch components';
            error.val = msg; console.error("Fetch Components Error:", err); components.val = [];
        } finally {
            isLoading.val = false;
        }
    };

    // Fetch on mount and token change (using derive)
    van.derive(() => { token.val; fetchComponents(); });


    // --- Event Handlers ---
    const handleEdit = (component: SignatureComponent) => {
        if (!isAdmin.val) { alert("Admin privileges required."); return; }
        editingComponent.val = component;
        isFormOpen.val = true;
    };

    const handleCreate = () => {
        if (!isAdmin.val) { alert("Admin privileges required."); return; }
        editingComponent.val = null;
        isFormOpen.val = true;
    };

    const handleDelete = async (componentId: number) => {
        if (!isAdmin.val || !token.val) { alert("Admin privileges required."); return; }
        if (!window.confirm("WARNING: Deleting a component also deletes ALL its elements. This cannot be undone. Continue?")) return;
        isLoading.val = true; error.val = null;
        try {
            await api.deleteSignatureComponent(componentId, token.val);
            alert("Component deleted.");
            fetchComponents(); // Refreshes list and sets loading false
        } catch(e: any) {
            const msg = e.message || "Failed to delete component";
            error.val = msg; alert(`Error: ${msg}`); isLoading.val = false;
        }
    };

    const handleReindex = async (componentId: number) => {
        if (!isAdmin.val || !token.val) { alert("Admin privileges required."); return; }
        if (!window.confirm(`Re-index elements in component ${componentId}?`)) return;
        isLoading.val = true; error.val = null;
        try {
            await api.reindexComponentElements(componentId, token.val);
            alert("Component re-indexed.");
            fetchComponents(); // Refreshes list and sets loading false
        } catch(e: any) {
            const msg = e.message || "Failed to re-index component";
            error.val = msg; alert(`Error: ${msg}`); isLoading.val = false;
        }
    };

    const handleSaveSuccess = () => {
        isFormOpen.val = false;
        editingComponent.val = null;
        alert("Component saved.");
        fetchComponents(); // Refresh list
    };

    const handleOpenComponent = (component: SignatureComponent) => {
        navigate(`/signatures/${component.signatureComponentId}/elements`);
    };

    // --- Render ---
    return div({ class: styles.spaceY6 },
        // Header
        div(
            h1({ class: styles.text2xl }, "Signature Components"),
            p({ class: styles.textMutedForeground }, "Define hierarchical components for signatures.")
        ),

        // Components Section
        Card(
            CardHeader(
                 div({ class: `${styles.flex} ${styles.flexCol} sm:flex-row sm:justify-between sm:items-center ${styles.gap4}` },
                     div(
                         CardTitle("Components"),
                         CardDescription("Click a component to view its elements.")
                     ),
                     // Dialog Trigger Button (conditionally enabled)
                     Dialog({ open: isFormOpen, onOpenChange: v => isFormOpen.val = v },
                         DialogTrigger({ }, // Empty props object
                             Button({
                                 onclick: handleCreate,
                                 size: "sm", class: styles.flexShrink0,
                                 disabled: () => !isAdmin.val, // Reactive disabled
                                 title: () => isAdmin.val ? "Create New Component" : "Admin privileges required"
                                },
                                icons.PlusCircleIcon({ class: styles.pr2 }), "New Component" // Pass class
                             )
                         ),
                         // Dialog Content (conditionally rendered inside a function for Dialog)
                         () => isFormOpen.val ? DialogContent({ class: "sm:max-w-[500px]" },
                             DialogHeader(DialogTitle(() => editingComponent.val ? 'Edit Component' : 'Create New Component')),
                             ComponentForm({ componentToEdit: editingComponent.val, onSave: handleSaveSuccess })
                         ) : null
                     ) // End Dialog
                 ) // End Header Flex container
            ), // End CardHeader
            CardContent(
                () => error.val ? ErrorDisplay({ message: error.val }) : null,
                () => isLoading.val ? div({ class: `${styles.flex} ${styles.justifyCenter} ${styles.py6}` }, LoadingSpinner({})) : null, // Pass empty props
                () => (!isLoading.val && !error.val) ? ComponentList({
                    components: components.val, // Pass raw array value
                    onEdit: handleEdit,
                    onDelete: handleDelete,
                    onOpen: handleOpenComponent,
                    onReindex: handleReindex
                }) : null,
                () => (!isLoading.val && !error.val && components.val.length === 0)
                    ? p({ class: `${styles.textCenter} ${styles.textMutedForeground} ${styles.py4}` },
                        "No components created yet.",
                        () => isAdmin.val ? ' Click "New Component".' : '' // Conditionally add prompt
                      )
                    : null
            ) // End CardContent
        ) // End Card
    ); // End Main Div
};

export default ComponentsPage;
