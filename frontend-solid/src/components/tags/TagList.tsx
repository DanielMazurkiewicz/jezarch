import { Component, For, Show } from 'solid-js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table"; // Use Table components
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/shared/Icon';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import { useAuth } from '@/context/AuthContext';
import styles from './TagList.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils'; // Import cn

interface TagListProps {
  tags: Tag[];
  onEdit: (tag: Tag) => void;
  onDelete: (tagId: number) => void;
}

const TagList: Component<TagListProps> = (props) => {
   const [authState] = useAuth();
   const isAdmin = () => authState.user?.role === 'admin'; // Make it a reactive check

  return (
    // Use the Table component
    <Table class={styles.tagListTable}>
        <TableHeader>
            <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                {/* Actions only shown to admin */}
                <TableHead class={styles.actionsCell}>Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            <For each={props.tags}>
                {(tag) => (
                    <TableRow>
                        <TableCell class="font-medium">{tag.name}</TableCell>
                        <TableCell>
                            <span class={!tag.description ? styles.noDescriptionText : undefined}>
                                {tag.description || 'No description'}
                            </span>
                        </TableCell>
                         {/* Actions only shown to admin */}
                         <TableCell class={styles.actionsCell}>
                             <Show when={isAdmin()} fallback={<span class={styles.readOnlyText}>Read-only</span>}>
                                <Button variant="ghost" size="icon" onClick={() => props.onEdit(tag)} title="Edit Tag">
                                    <Icon name="Edit" size="1rem" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => props.onDelete(tag.tagId!)} title="Delete Tag">
                                    <Icon name="Trash2" size="1rem" class={styles.textDestructive} />
                                </Button>
                             </Show>
                         </TableCell>
                    </TableRow>
                )}
            </For>
        </TableBody>
    </Table>
  );
};

export default TagList;