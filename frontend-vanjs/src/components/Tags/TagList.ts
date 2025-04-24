import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table"; // Assuming Table components
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import type { Tag } from "../../../../backend/src/functionalities/tag/models";

const { span } = van.tags;

// --- Component Props ---
interface TagListProps {
    tags: Tag[]; // Expect plain array, reactivity handled by parent
    onEdit: (tag: Tag) => void;
    onDelete: (tagId: number) => void;
}

// --- Component ---
const TagList = ({ tags, onEdit, onDelete }: TagListProps) => {
    const { user } = authStore;
    const isAdmin = van.derive(() => user.val?.role === 'admin');

    if (tags.length === 0) {
        return null; // Parent handles empty state message
    }

    return Table(
        TableHeader(
            TableRow(
                TableHead("Name"),
                TableHead("Description"),
                () => isAdmin.val ? TableHead({ class: `${styles.textRight} w-[100px]` }, "Actions") : null // Conditionally render Actions header
            )
        ),
        TableBody(
            tags.map((tag) =>
                TableRow({ key: tag.tagId }, // Use key for efficient updates
                    TableCell({ class: styles.fontMedium }, tag.name),
                    TableCell({ class: `${styles.textSm} ${styles.textMutedForeground}` },
                        tag.description || span({ class: styles.italic }, "No description")
                    ),
                    // Actions Cell (Conditionally rendered)
                    () => isAdmin.val ? TableCell({ class: `${styles.textRight} ${styles.spaceX1}` }, // Use spaceX1 for button gap
                        Button({ variant: "ghost", size: "icon", onclick: () => onEdit(tag), title: "Edit Tag" },
                            icons.EditIcon({ class:`${styles.h4} ${styles.w4}` }) // Pass class
                        ),
                        Button({ variant: "ghost", size: "icon", onclick: () => onDelete(tag.tagId!), title: "Delete Tag" },
                            icons.Trash2Icon({ class:`${styles.h4} ${styles.w4} ${styles.textDestructive}` }) // Pass class
                        )
                    ) : null // End conditional Actions cell
                ) // End TableRow
            ) // End map
        ) // End TableBody
    ); // End Table
};

export default TagList;