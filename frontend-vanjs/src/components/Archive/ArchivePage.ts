import van, { State } from "vanjs-core"; // Added State
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { useLocation, useNavigate, useSearchParams, Link } from "@/lib/router";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import DocumentList from "./DocumentList";
import DocumentForm from "./DocumentForm";
import DocumentPreviewDialog from "./DocumentPreviewDialog";
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import ErrorDisplay from "@/components/Shared/ErrorDisplay";
import SearchBar from "@/components/Shared/SearchBar";
import { Pagination } from "@/components/Shared/Pagination";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import type { Tag } from "../../../../backend/src/functionalities/tag/models";
import type { ArchiveDocument, ArchiveDocumentSearchResult, ArchiveDocumentType } from "../../../../backend/src/functionalities/archive/document/models";
import type { SearchRequest, SearchResponse, SearchQuery, SearchQueryElement } from "../../../../backend/src/utils/search";
// Remove toast

const { div, h1, p, span } = van.tags;

const ARCHIVE_PAGE_SIZE = 10;

const ArchivePage = () => {
    const { token, user, isLoading: isAuthLoading } = authStore;
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams(); // Use setter if needed

    // State derived from URL search parameters
    const parentUnitId = van.derive(() => {
        const id = searchParams.val.get('unitId');
        return id ? Number(id) : null;
    });

    // Component State
    const documents = van.state<ArchiveDocumentSearchResult[]>([]);
    const parentUnit = van.state<ArchiveDocument | null>(null); // Details of the parent unit being viewed
    const availableTags = van.state<Tag[]>([]);
    const isLoading = van.state(false); // For document/unit fetching
    const error = van.state<string | null>(null);
    const editingDoc = van.state<ArchiveDocument | null>(null);
    const isFormOpen = van.state(false);
    const formInitialType = van.state<ArchiveDocumentType | undefined>(undefined);
    const formDialogTitle = van.state("Create Item");
    const previewingDoc = van.state<ArchiveDocument | null>(null); // Full doc for preview
    const isPreviewOpen = van.state(false);

    // Search & Pagination State
    const searchQuery = van.state<SearchQuery>([]);
    const currentPage = van.state(1);
    const totalDocs = van.state(0);
    const totalPages = van.state(1);
    const fetchTrigger = van.state(0); // State to trigger fetch

    // --- Fetch Parent Unit Details ---
    van.derive(() => { // Replaced effect with derive
        const id = parentUnitId.val; // Depend on derived state
        if (!token.val || id === null || isNaN(id)) {
            parentUnit.val = null; return;
        }
        // Don't set isLoading here if fetchDocuments handles it
        // isLoading.val = true;
        error.val = null;
        api.getArchiveDocumentById(id, token.val)
            .then(unit => {
                if (unit.type !== 'unit') throw new Error(`Item ID ${id} is not a Unit.`);
                parentUnit.val = unit;
            })
            .catch(err => {
                error.val = `Failed to load parent unit: ${err.message}`;
                parentUnit.val = null;
                // Optionally navigate back if parent load fails? navigate('/archive');
            })
            // Don't set isLoading false here if fetchDocuments handles it
            // .finally(() => isLoading.val = false);
    });

    // --- Fetch Available Tags ---
    van.derive(() => { // Replaced effect with derive
        if (!token.val) {
            availableTags.val = []; // Clear if no token
            return;
        };
        api.getAllTags(token.val)
            .then(tags => availableTags.val = tags.sort((a, b) => a.name.localeCompare(b.name)))
            .catch(err => {
                console.error("ArchivePage: Failed to fetch tags:", err);
                availableTags.val = []; // Clear on error
            });
    });

    // --- Fetch Documents ---
    const fetchDocuments = async (page = currentPage.val, query = searchQuery.val) => {
        const pUnitId = parentUnitId.val; // Read derived state value
        if (!token.val) {
             isLoading.val = false; return; // Guard against no token
        }
        // Avoid fetching if parent ID exists but parent details haven't loaded yet or failed
        // Need to check parentUnit loading state as well
        if (pUnitId !== null && parentUnit.val === null && !error.val) {
             console.log("ArchivePage: Parent unit pending, deferring document fetch.");
             // Optionally set loading true? Depends on desired UX
             isLoading.val = true; // Indicate loading while waiting for parent
             return;
        }

        isLoading.val = true; error.val = null;
        try {
            let finalQuery: SearchQueryElement[] = [...query];
             // Filter by parent unit ID if applicable
            if (pUnitId !== null) {
                finalQuery = finalQuery.filter(q => q.field !== 'parentUnitArchiveDocumentId');
                finalQuery.push({ field: 'parentUnitArchiveDocumentId', condition: 'EQ', value: pUnitId, not: false });
            } else {
                // If at root, apply default filters for non-admins
                 if (user.val?.role !== 'admin') {
                     // Ensure only active are shown unless 'active' filter exists
                     if (!finalQuery.some(q => q.field === 'active')) {
                         finalQuery.push({ field: 'active', condition: 'EQ', value: true, not: false });
                     } else {
                          finalQuery = finalQuery.map(q => q.field === 'active' ? { ...q, value: true } as SearchQueryElement : q);
                     }
                     // Ensure only owned are shown unless 'ownerUserId' filter exists
                     if (!finalQuery.some(q => q.field === 'ownerUserId') && user.val?.userId) {
                         finalQuery.push({ field: 'ownerUserId', condition: 'EQ', value: user.val.userId, not: false });
                     }
                 }
            }

           const searchRequest: SearchRequest = { query: finalQuery, page, pageSize: ARCHIVE_PAGE_SIZE };
           const response = await api.searchArchiveDocuments(searchRequest, token.val);
           documents.val = response.data;
           totalDocs.val = response.totalSize;
           totalPages.val = response.totalPages;
           currentPage.val = response.page;
       } catch (err: any) {
           error.val = err.message || 'Failed to fetch documents'; console.error("Fetch Docs Error:", err);
           documents.val = []; totalDocs.val = 0; totalPages.val = 1;
       } finally { isLoading.val = false; }
   };

   // Effect/Derive to fetch documents when dependencies change
   van.derive(() => { // Replaced effect with derive
       const pUnitId = parentUnitId.val; // Read dependency
       const page = currentPage.val;
       const query = searchQuery.val;
       fetchTrigger.val; // Depend on trigger

       // Fetch if auth is ready, token exists, and (no parent ID OR parent is loaded)
       if (!isAuthLoading.val && token.val && (pUnitId === null || parentUnit.val !== null)) {
           fetchDocuments(page, query);
       } else if (!isAuthLoading.val && !token.val) {
           // Clear if logged out
           documents.val = []; totalDocs.val = 0; totalPages.val = 1; currentPage.val = 1;
       }
   });


    // --- CRUD Handlers ---
    const handleEdit = (doc: ArchiveDocument) => {
        if (user.val?.role !== 'admin' && user.val?.userId !== doc.ownerUserId) {
            alert("You can only edit items you own."); return;
        }
        editingDoc.val = doc;
        formInitialType.val = undefined; // Let form determine type from doc
        formDialogTitle.val = `Edit ${doc.type === 'unit' ? 'Unit' : 'Document'}`;
        isFormOpen.val = true;
    };

    const handleCreateNew = () => {
        const pUnit = parentUnit.val; // Read state
        if (pUnit) { // Creating inside a unit
            editingDoc.val = null;
            formInitialType.val = 'document'; // Can only create docs inside units
            formDialogTitle.val = `Create Document in Unit "${pUnit.title}"`;
        } else { // Creating at root
            editingDoc.val = null;
            formInitialType.val = undefined; // Let user choose type in form
            formDialogTitle.val = "Create New Item";
        }
        isFormOpen.val = true;
    };

    const handleDisable = async (docId: number) => {
        if (!token.val || !docId) return;
        const docToDisable = documents.val.find(d => d.archiveDocumentId === docId) ?? editingDoc.val ?? previewingDoc.val;
        if (!docToDisable) return;

        if (user.val?.role !== 'admin' && user.val?.userId !== docToDisable.ownerUserId) {
            alert("Not authorized to disable this item."); return;
        }
        if (!window.confirm(`Disable this ${docToDisable.type}? It can be recovered by an admin.`)) return;

        isLoading.val = true; // Indicate loading
        error.val = null; // Clear previous errors
        try {
            await api.disableArchiveDocument(docId, token.val);
            alert("Item disabled.");
            if (previewingDoc.val?.archiveDocumentId === docId) isPreviewOpen.val = false; // Close preview if open

            // Recalculate pagination and fetch
            const newTotal = totalDocs.val - 1;
            const newTotalPages = Math.max(1, Math.ceil(newTotal / ARCHIVE_PAGE_SIZE));
            const newCurrentPage = (currentPage.val > newTotalPages) ? newTotalPages : currentPage.val;

            if (currentPage.val !== newCurrentPage) {
                currentPage.val = newCurrentPage; // Triggers fetch effect via derive
            } else {
                fetchTrigger.val++; // Trigger refetch of the same page
            }
        } catch (err: any) {
             error.val = err.message || 'Failed to disable item'; alert(`Disable failed: ${error.val}`);
             isLoading.val = false; // Stop loading on error
        }
        // Loading reset by fetchDocuments on success
    };

    const handleSaveSuccess = () => {
        isFormOpen.val = false;
        // alert(editingDoc.val ? "Item updated." : "Item created.");
        editingDoc.val = null;
        fetchTrigger.val++; // Trigger refetch
    };

    // --- Preview/Open Handlers ---
    const handlePreview = async (doc: ArchiveDocumentSearchResult) => {
        if (!token.val) return;
        isLoading.val = true; // Show loading while fetching full details
        error.val = null;
        try {
            // Fetch the full document details for the preview dialog
            const fullDoc = await api.getArchiveDocumentById(doc.archiveDocumentId!, token.val);
            previewingDoc.val = fullDoc;
            isPreviewOpen.val = true;
        } catch (err: any) {
            error.val = `Failed to load document details: ${err.message}`; alert(error.val);
        } finally {
            isLoading.val = false;
        }
    };

    const handleOpenUnit = (unit: ArchiveDocumentSearchResult) => {
        navigate(`/archive?unitId=${unit.archiveDocumentId}`);
    };

    // --- Search & Pagination Handlers ---
    const handleSearch = (newQuery: SearchQuery) => {
        searchQuery.val = newQuery;
        if (currentPage.val === 1) {
            fetchTrigger.val++; // Trigger refetch if already on page 1
        } else {
            currentPage.val = 1; // Reset page, triggers fetch effect via derive
        }
    };
    const handlePageChange = (newPage: number) => { currentPage.val = newPage; }; // Triggers fetch effect via derive

    // --- Search Fields (Reactive) ---
    const searchFields = van.derive(() => {
        const pUnitId = parentUnitId.val; // Depend on derived state
        const currentUserRole = user.val?.role;

        const fields = [
            { value: 'title', label: 'Title', type: 'text' as const },
            { value: 'creator', label: 'Creator', type: 'text' as const },
            { value: 'creationDate', label: 'Creation Date', type: 'text' as const },
            { value: 'contentDescription', label: 'Description', type: 'text' as const},
             // Only show type filter at root
             ...(pUnitId === null ? [{ value: 'type', label: 'Type', type: 'select' as const, options: [{value: 'unit', label: 'Unit'}, {value:'document', label: 'Document'}]}] : []),
            { value: 'isDigitized', label: 'Is Digitized', type: 'boolean' as const },
            { value: 'tags', label: 'Tags', type: 'tags' as const, options: availableTags.val.map(t => ({value: t.tagId!, label: t.name})) },
             // Add signature search if needed (complex)
            // { value: 'topographicSignatureElementIds', label: 'Topo Sig (Any ID)', type: 'text' as const },
            // { value: 'descriptiveSignatureElementIds', label: 'Desc Sig (Any ID)', type: 'text' as const },
        ];
         // Add admin-only filters when at root
         if (currentUserRole === 'admin' && pUnitId === null) {
             fields.push({ value: 'active', label: 'Is Active', type: 'boolean' as const });
             fields.push({ value: 'ownerUserId', label: 'Owner User ID', type: 'number' as const }); // Use number type correctly
         }
        return fields;
    });

    // --- Render ---
     if (isAuthLoading.val) {
         return div({ class: styles.fullScreenCenter }, LoadingSpinner({ size: 'lg' })); // Pass empty props object
     }

    return div({ class: styles.spaceY6 },
        // Header Section
        div({ class: `${styles.flex} ${styles.flexCol} sm:flex-row sm:justify-between sm:items-center ${styles.gap4}` },
            div({ class: `${styles.flex} ${styles.itemsCenter} ${styles.gap4}` },
                 // Back button if in a unit
                 () => parentUnitId.val !== null ? Button({ variant: "outline", size: "icon", onclick: () => navigate('/archive'), title: "Back to Main Archive" },
                    icons.ArrowLeftIcon({ class: `${styles.h4} ${styles.w4}` }) // Pass class
                 ) : null,
                // Title and Description (Reactive)
                div(
                    h1({ class: `${styles.text2xl} ${styles.fontBold} ${styles.flex} ${styles.itemsCenter} ${styles.gap2}` },
                        van.derive(() => parentUnit.val // Use derive for reactive title
                            ? [icons.FolderIcon({ class: `${styles.h5} ${styles.w5} text-blue-600` }), ` Unit: `, span({ class: styles.textPrimary }, parentUnit.val.title)] // Pass class
                            : [icons.FileTextIcon({ class: `${styles.h5} ${styles.w5} text-gray-600` }), ` Archive`] // Pass class
                        )
                    ),
                    p({ class: styles.textMutedForeground }, () =>
                        parentUnit.val ? `Browsing items within "${parentUnit.val.title}".` : 'Manage archival documents and units.'
                    )
                )
            ),
            // Create Item Button & Dialog
            Dialog({ open: isFormOpen, onOpenChange: v => isFormOpen.val = v },
                DialogTrigger(
                    Button({ onclick: handleCreateNew, class: styles.flexShrink0 },
                        icons.PlusCircleIcon({ class: styles.pr2 }), // Pass class
                        () => parentUnitId.val ? 'Create Document Here' : 'Create Item' // Reactive label
                    )
                ),
                // DialogContent only needs props and children, Dialog handles rendering logic
                DialogContent({ class: "max-w-3xl" }, // Use class for max-width
                    DialogHeader(DialogTitle(formDialogTitle)), // Use state for title
                    // Render form directly if open, ensure necessary props are available
                    () => isFormOpen.val ? DocumentForm({
                        docToEdit: editingDoc.val,
                        onSave: handleSaveSuccess,
                        forceType: formInitialType.val,
                        forcedParentId: parentUnitId.val ?? undefined,
                        forcedParentTitle: parentUnit.val?.title
                    }) : null
                )
            ) // End Dialog
        ), // End Header Section

        // Search Bar (Reactive fields)
         () => SearchBar({ fields: searchFields.val, onSearch: handleSearch, isLoading: isLoading }),

        // Document List Section
        Card(
             CardHeader( // Use header for potential title or error display
                 () => error.val ? ErrorDisplay({ message: error.val }) : null
             ),
             CardContent(
                 () => isLoading.val ? div({ class: `${styles.flex} ${styles.justifyCenter} ${styles.py10}` }, LoadingSpinner({})) : null, // Pass empty props
                 () => (!isLoading.val && !error.val) ? [ // Render list and pagination if not loading/error
                     DocumentList({
                         documents: documents.val, // Pass plain array
                         onEdit: handleEdit,
                         onDisable: handleDisable,
                         onPreview: handlePreview,
                         onOpenUnit: handleOpenUnit
                     }),
                     // Pagination (conditionally rendered)
                     () => totalPages.val > 1 ? div({ class: `${styles.mt6} ${styles.flex} ${styles.justifyCenter}` },
                         Pagination({ currentPage: currentPage, totalPages: totalPages, onPageChange: handlePageChange })
                     ) : null,
                     // Empty State Message (conditionally rendered)
                     () => documents.val.length === 0 ? p({ class: `${styles.textCenter} ${styles.textMutedForeground} ${styles.pt6}` },
                         searchQuery.val.length > 0 ? 'No items found matching your search criteria.' :
                         parentUnitId.val ? `No items found in unit "${parentUnit.val?.title || 'this unit'}".` :
                         'The archive is empty. Click "Create Item" to start.'
                     ) : null
                 ] : null // End conditional rendering of list/pagination/empty state
            ) // End CardContent
        ), // End Card

        // Preview Dialog - Pass isOpen as state value, not state object
         DocumentPreviewDialog({
             isOpen: isPreviewOpen, // Pass the state object directly
             onOpenChange: v => isPreviewOpen.val = v,
             document: previewingDoc.val, // Pass state value (full doc)
             onEdit: handleEdit,
             onDisable: handleDisable,
             parentUnitTitle: parentUnit.val?.archiveDocumentId === previewingDoc.val?.parentUnitArchiveDocumentId ? parentUnit.val?.title : undefined
         })

    ); // End Main Div
};

export default ArchivePage;