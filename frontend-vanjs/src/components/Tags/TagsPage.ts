import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog"; // Assuming Dialog components
import TagList from "./TagList";
import TagForm from "./TagForm";
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import ErrorDisplay from "@/components/Shared/ErrorDisplay";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"; // Assuming Card components
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import type { Tag } from "../../../../backend/src/functionalities/tag/models";
// Removed toast import, handle feedback differently if needed

const { div, h1, p } = van.tags;

// --- Component ---
const TagsPage = () => {
    const { token, user } = authStore;
    const isAdmin = van.derive(() => user.val?.role === 'admin');

    // --- State ---
    const tags = van.state<Tag[]>([]);
    const isLoading = van.state(true);
    const error = van.state<string | null>(null);
    const editingTag = van.state<Tag | null>(null);
    const isFormOpen = van.state(false);

    // --- Data Fetching ---
    const fetchTags = async () => {
        if (!token.val) {
            isLoading.val = false;
            tags.val = []; // Clear tags if no token
            return;
        }
        isLoading.val = true;
        error.val = null;
        try {
            const fetchedTags = await api.getAllTags(token.val);
            tags.val = fetchedTags.sort((a, b) => a.name.localeCompare(b.name));
        } catch (err: any) {
            const msg = err.message || 'Failed to fetch tags';
            error.val = msg;
            console.error("Fetch Tags Error:", err);
            tags.val = []; // Clear tags on error
        } finally {
            isLoading.val = false;
        }
    };

    // Fetch on mount and when token changes (using derive)
    van.derive(() => {
        token.val; // Depend on token
        fetchTags();
    });


    // --- Event Handlers ---
    const handleEdit = (tag: Tag) => {
        if (!isAdmin.val) {
            alert("Only administrators can edit tags."); // Simple alert for now
            return;
        }
        editingTag.val = tag;
        isFormOpen.val = true;
    };

    const handleCreateNew = () => {
        editingTag.val = null;
        isFormOpen.val = true;
    };

    const handleDelete = async (tagId: number) => {
        if (!token.val || !tagId || !isAdmin.val) {
            alert("Only administrators can delete tags.");
            return;
        }
        if (!window.confirm("Are you sure you want to delete this tag? This will remove it from all associated items.")) {
            return;
        }
        isLoading.val = true; // Indicate loading during delete
        error.val = null;
        try {
            await api.deleteTag(tagId, token.val);
            // alert("Tag deleted successfully."); // Use alerts or a dedicated notification system
            fetchTags(); // Refresh list (sets loading to false)
        } catch (err: any) {
            const msg = err.message || 'Failed to delete tag';
            error.val = msg;
            alert(`Delete failed: ${msg}`);
            isLoading.val = false; // Stop loading on error
        }
    };

    const handleSaveSuccess = () => {
        isFormOpen.val = false;
        editingTag.val = null;
        // alert(editingTag.val ? "Tag updated." : "Tag created."); // Simple feedback
        fetchTags(); // Refresh list
    };

    // --- Render ---
    return div({ class: styles.spaceY6 },
        // Header Section
        div({ class: `${styles.flex} ${styles.flexCol} ${styles.gap4} sm:flex-row sm:justify-between sm:items-center` }, // Responsive flex layout
            div(
                h1({ class: styles.text2xl }, "Manage Tags"),
                p({ class: styles.textMutedForeground }, "Organize items using tags.")
            ),
            // Create Tag Button & Dialog
            Dialog({ open: isFormOpen, onOpenChange: v => isFormOpen.val = v }, // Bind state
                DialogTrigger({}, // Empty props object
                    Button({ onclick: handleCreateNew, class: styles.flexShrink0 }, // Prevent shrinking on small screens
                        icons.PlusCircleIcon({ class: styles.pr2 }), "Create Tag" // Pass class
                    )
                ),
                // Conditionally render DialogContent inside function
                () => isFormOpen.val ? DialogContent({ class: "sm:max-w-[425px]" },
                    DialogHeader(
                        DialogTitle(() => editingTag.val ? 'Edit Tag' : 'Create New Tag')
                    ),
                    // Conditionally render form based on open state to ensure reset
                    TagForm({ tagToEdit: editingTag.val, onSave: handleSaveSuccess })
                ) : null
            )
        ),

        // Tags List Section
        Card(
            CardHeader(
                // Optional Title/Description here if needed
                // Display error within the card header
                () => error.val ? ErrorDisplay({ message: error.val }) : null
            ),
            CardContent(
                // Loading State
                () => isLoading.val ? div({ class: `${styles.flex} ${styles.justifyCenter} ${styles.py6}` }, LoadingSpinner({})) : null, // Pass empty props

                // Tag List Table (conditionally rendered)
                () => !isLoading.val && !error.val ? TagList({ tags: tags.val, onEdit: handleEdit, onDelete: handleDelete }) : null,

                // Empty State Message (conditionally rendered)
                () => !isLoading.val && !error.val && tags.val.length === 0
                    ? p({ class: `${styles.textCenter} ${styles.textMutedForeground} ${styles.pt6}` },
                        'No tags found. Click "Create Tag" to add one.'
                      )
                    : null
            )
        )
    );
};

export default TagsPage;