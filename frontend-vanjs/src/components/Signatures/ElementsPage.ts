import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { useParams, useNavigate } from "@/lib/router"; // Use VanJS router hooks
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import ElementList from "./ElementList";
import ElementForm from "./ElementForm";
import SearchBar from "@/components/Shared/SearchBar";
import { Pagination } from "@/components/Shared/Pagination";
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import ErrorDisplay from "@/components/Shared/ErrorDisplay";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import type { SignatureComponent } from "../../../../backend/src/functionalities/signature/component/models";
import type { SignatureElement, SignatureElementSearchResult } from "../../../../backend/src/functionalities/signature/element/models";
import type { SearchRequest, SearchQuery } from "../../../../backend/src/utils/search";
// Remove toast

const { div, h1, p, span } = van.tags; // Added span

const ELEMENTS_PAGE_SIZE = 15;

const ElementsPage = () => {
    const params = useParams(); // Get reactive params object
    const componentId = van.derive(() => parseInt(params.val.componentId || '', 10)); // Derive ID reactively
    const navigate = useNavigate();
    const { token, user } = authStore;
    // const isAdmin = van.derive(() => user.val?.role === 'admin'); // Needed? Element creation might be non-admin

    // --- State ---
    const parentComponent = van.state<SignatureComponent | null>(null);
    const isParentLoading = van.state(true);
    const parentError = van.state<string | null>(null);
    const elements = van.state<SignatureElementSearchResult[]>([]);
    const isElementsLoading = van.state(false);
    const elementsError = van.state<string | null>(null);
    const editingElement = van.state<SignatureElement | null>(null);
    const isElementFormOpen = van.state(false);
    const elementSearchQuery = van.state<SearchQuery>([]);
    const currentElementPage = van.state(1);
    const totalElements = van.state(0);
    const totalElementPages = van.state(1);
    const elementFetchTrigger = van.state(0); // Trigger for element fetch

    // --- Fetch Parent Component ---
    van.derive(() => { // Use derive
        const id = componentId.val; // Depend on derived ID
        if (!token.val || isNaN(id)) {
            isParentLoading.val = false;
            parentError.val = "Invalid component ID.";
            parentComponent.val = null; // Clear parent if ID invalid
            return;
        }
        isParentLoading.val = true; parentError.val = null;
        api.getSignatureComponentById(id, token.val)
            .then(comp => parentComponent.val = comp)
            .catch(err => {
                const msg = err.message || `Failed to fetch component (ID: ${id})`;
                parentError.val = msg; parentComponent.val = null;
                console.error("Fetch Parent Component Error:", err);
            })
            .finally(() => isParentLoading.val = false);
    });


    // --- Fetch Elements ---
    const fetchElements = async (page = currentElementPage.val, query = elementSearchQuery.val) => {
        const id = componentId.val;
        if (!token.val || isNaN(id)) {
            isElementsLoading.val = false; elementsError.val = "Component ID or token missing.";
            elements.val = []; totalElements.val = 0; totalElementPages.val = 1;
            return;
        }
        isElementsLoading.val = true; elementsError.val = null;
        try {
            const componentFilter = { field: 'signatureComponentId', condition: 'EQ' as const, value: id, not: false };
            const finalQuery = [...query.filter(q => q.field !== 'signatureComponentId'), componentFilter];
            const searchRequest: SearchRequest = { query: finalQuery, page, pageSize: ELEMENTS_PAGE_SIZE };
            const response = await api.searchSignatureElements(searchRequest, token.val);
            elements.val = response.data;
            totalElements.val = response.totalSize;
            totalElementPages.val = response.totalPages;
            currentElementPage.val = response.page;
        } catch (err: any) {
             const msg = err.message || 'Failed to fetch elements';
             elementsError.val = msg; console.error("Fetch Elements Error:", err);
             elements.val = []; totalElements.val = 0; totalElementPages.val = 1;
        } finally { isElementsLoading.val = false; }
    };

    // Effect/Derive to fetch elements when parent/page/query changes
    van.derive(() => { // Use derive
        parentComponent.val; // Depend on parent component being loaded
        const page = currentElementPage.val;
        const query = elementSearchQuery.val;
        elementFetchTrigger.val; // Depend on trigger

        if (parentComponent.val) { // Only fetch if parent is loaded
            fetchElements(page, query);
        } else {
            // Clear elements if parent is null (e.g., due to error or invalid ID)
            elements.val = []; totalElements.val = 0; totalElementPages.val = 1;
        }
    });


    // --- Event Handlers ---
    const handleEditElement = (element: SignatureElement) => {
        editingElement.val = element;
        isElementFormOpen.val = true;
    };

    const handleCreateElement = () => {
        if (!parentComponent.val) { alert("Parent component not loaded."); return; }
        editingElement.val = null;
        isElementFormOpen.val = true;
    };

    const handleDeleteElement = async (elementId: number) => {
         if (!parentComponent.val || !token.val) { alert("Cannot delete: context missing."); return; }
         if (!window.confirm("Delete this element? This may break references.")) return;
         isElementsLoading.val = true; elementsError.val = null;
         try {
             await api.deleteSignatureElement(elementId, token.val);
             alert("Element deleted.");
             // Refresh count on parent (locally first)
             const currentParent = parentComponent.val;
             if (currentParent && currentParent.index_count != null) {
                 parentComponent.val = {...currentParent, index_count: currentParent.index_count - 1};
             }
             // Recalculate pages and fetch
             const newTotal = totalElements.val - 1;
             const newTotalPages = Math.max(1, Math.ceil(newTotal / ELEMENTS_PAGE_SIZE));
             const newPage = (currentElementPage.val > newTotalPages) ? newTotalPages : currentElementPage.val;

             if (currentElementPage.val !== newPage) {
                 currentElementPage.val = newPage; // Triggers fetch effect via derive
             } else {
                 elementFetchTrigger.val++; // Trigger refetch of the same page
             }
             // Optionally re-fetch parent fully to confirm count later
         } catch(e: any){
             const msg = e.message || "Failed to delete element";
             elementsError.val = msg; alert(`Error: ${msg}`); isElementsLoading.val = false;
         }
         // Loading is reset by fetchElements on success
    };

    const handleElementSaveSuccess = (savedElement: SignatureElement | null) => {
        isElementFormOpen.val = false;
        const wasEditing = !!editingElement.val; // Check if it was an edit operation before clearing
        editingElement.val = null;

        if (savedElement) { // Only show alert/refresh if something actually changed/saved
             alert("Element saved.");
             // Refresh count on parent (locally first) only if creating
             const currentParent = parentComponent.val;
             if (currentParent && currentParent.index_count != null && !wasEditing) {
                  parentComponent.val = {...currentParent, index_count: currentParent.index_count + 1};
             }
             elementFetchTrigger.val++; // Trigger refetch
              // Optionally re-fetch parent fully to confirm count later
        }
    };


    const handleElementSearch = (newQuery: SearchQuery) => {
        elementSearchQuery.val = newQuery;
        if(currentElementPage.val === 1) {
             elementFetchTrigger.val++; // Trigger fetch if already on page 1
        } else {
             currentElementPage.val = 1; // Reset page, triggers fetch effect via derive
        }
    };
    const handleElementPageChange = (newPage: number) => {
        currentElementPage.val = newPage; // Triggers fetch effect via derive
    };

    // --- Render ---
    // Loading parent state
    if (isParentLoading.val) {
        return div({ class: `${styles.flex} ${styles.justifyCenter} ${styles.itemsCenter} ${styles.h32}` }, LoadingSpinner({})); // Added h32, Pass empty props
    }
    // Parent error state
    if (parentError.val) {
        return ErrorDisplay({ message: parentError.val });
    }
    // Parent not found/invalid ID state
     if (!parentComponent.val || isNaN(componentId.val)) {
        return ErrorDisplay({ message: `Component with ID ${componentId.val || 'invalid'} not found.` });
     }

    // Main content render
    return div({ class: styles.spaceY6 },
        // Page Header
        div({ class: `${styles.flex} ${styles.itemsCenter} ${styles.gap4}` },
            Button({ variant: "outline", size: "icon", onclick: () => navigate('/signatures'), title: "Back to Components" },
                icons.ArrowLeftIcon({ class: `${styles.h4} ${styles.w4}` }) // Pass class
            ),
            div( // Container for title/desc/badges
                 h1({ class: styles.text2xl },
                     "Elements for: ", span({ class: styles.textPrimary }, () => parentComponent.val?.name) // Reactive name
                 ),
                 p({ class: styles.textMutedForeground }, "Manage elements within this component."),
                 // Reactive Badges
                 div({ class: `${styles.flex} ${styles.gap2} ${styles.mt1}` }, // Added mt1
                    () => Badge({ variant: "secondary" }, `Index Type: ${parentComponent.val?.index_type}`),
                    () => Badge({ variant: "outline" }, `Elements: ${parentComponent.val?.index_count ?? 'N/A'}`)
                 )
            )
        ),

        // Elements Section
        Card(
            CardHeader(
                div({ class: `${styles.flex} ${styles.flexCol} sm:flex-row sm:justify-between sm:items-center ${styles.gap4}` },
                    div(
                        CardTitle("Element List"),
                        CardDescription(() => `Elements defined within "${parentComponent.val?.name}"`) // Reactive description
                    ),
                    Dialog({ open: isElementFormOpen, onOpenChange: v => isElementFormOpen.val = v },
                        DialogTrigger({ }, // Empty props
                            Button({ onclick: handleCreateElement, size: "sm", class: styles.flexShrink0 },
                                icons.PlusCircleIcon({ class: styles.pr2 }), "New Element" // Pass class
                            )
                        ),
                        // Conditionally render DialogContent inside function
                        () => isElementFormOpen.val ? DialogContent({ class: "sm:max-w-[600px]" }, // Removed maxWidth prop
                            DialogHeader(DialogTitle(() => editingElement.val ? 'Edit Element' : 'Create New Element')),
                            // Ensure form only renders when dialog is open and parent is loaded
                            ElementForm({
                                elementToEdit: editingElement.val,
                                currentComponent: parentComponent.val!, // We know parentComponent is loaded here
                                onSave: handleElementSaveSuccess
                            })
                        ) : null // End Dialog Content conditional
                    ) // End Dialog
                )
            ),
            CardContent({ class: styles.spaceY4 },
                () => elementsError.val ? ErrorDisplay({ message: elementsError.val }) : null,
                // Search Bar
                SearchBar({
                    fields: [ // Define searchable fields for elements
                        { value: 'name', label: 'Name', type: 'text' as const },
                        { value: 'description', label: 'Description', type: 'text' as const},
                        { value: 'index', label: 'Index', type: 'text' as const},
                        { value: 'hasParents', label: 'Has Parents', type: 'boolean' as const },
                    ],
                    onSearch: handleElementSearch,
                    isLoading: isElementsLoading
                }),
                // Element List
                () => isElementsLoading.val ? div({ class: `${styles.flex} ${styles.justifyCenter} ${styles.py10}` }, LoadingSpinner({})) : null, // Added py10, pass empty props
                () => (!isElementsLoading.val && !elementsError.val) ? ElementList({
                    elements: elements.val, // Pass raw array
                    onEdit: handleEditElement,
                    onDelete: handleDeleteElement
                }) : null,
                // Pagination
                () => !isElementsLoading.val && totalElementPages.val > 1 ? div({ class: `${styles.mt4} ${styles.flex} ${styles.justifyCenter}` }, // Added mt4
                    Pagination({
                        currentPage: currentElementPage, // Pass state
                        totalPages: totalElementPages, // Pass state
                        onPageChange: handleElementPageChange
                    })
                ) : null,
                // Empty States
                 () => {
                     if (!isElementsLoading.val && elements.val.length === 0) {
                         if (elementsError.val) return null; // Error handled above
                         if (elementSearchQuery.val.length > 0) {
                             return p({ class: `${styles.textCenter} ${styles.textMutedForeground} ${styles.py6}` }, "No elements found matching search criteria.");
                         } else {
                              return p({ class: `${styles.textCenter} ${styles.textMutedForeground} ${styles.py6}` }, 'No elements found. Click "New Element".');
                         }
                     }
                     return null;
                 }
            ) // End CardContent
        ) // End Card
    ); // End Main Div
};

export default ElementsPage;