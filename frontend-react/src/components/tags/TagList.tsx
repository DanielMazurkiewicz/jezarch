import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import { useAuth } from '@/hooks/useAuth'; // To check role for actions
import { t } from '@/translations/utils'; // Import translation utility

interface TagListProps {
  tags: Tag[];
  onEdit: (tag: Tag) => void;
  onDelete: (tagId: number) => void;
}

const TagList: React.FC<TagListProps> = ({ tags, onEdit, onDelete }) => {
   const { user, preferredLanguage } = useAuth(); // Get preferredLanguage
   const isAdmin = user?.role === 'admin'; // Assuming only admin can edit/delete tags

  if (tags.length === 0) {
    return null; // Parent component handles empty state message
  }

  return (
    // Remove border/rounded if inside CardContent
    // <div className="border rounded-lg">
    <Table>
        <TableHeader>
            <TableRow>
             {/* Use translated headers */}
            <TableHead>{t('nameLabel', preferredLanguage)}</TableHead>
            <TableHead>{t('descriptionLabel', preferredLanguage)}</TableHead>
            {isAdmin && <TableHead className="text-right w-[100px]">{t('actionsLabel', preferredLanguage)}</TableHead>}
            </TableRow>
        </TableHeader>
        <TableBody>
            {tags.map((tag) => (
            <TableRow key={tag.tagId}>
                <TableCell className="font-medium">{tag.name}</TableCell>
                 {/* Use translated placeholder */}
                 <TableCell className="text-sm text-muted-foreground">{tag.description || <span className="italic">{t('noDescription', preferredLanguage)}</span>}</TableCell> {/* TODO: Add 'noDescription' to translations */}
                {isAdmin && (
                    <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(tag)} title={t('editButton', preferredLanguage)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(tag.tagId!)} title={t('deleteButton', preferredLanguage)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    </TableCell>
                )}
            </TableRow>
            ))}
        </TableBody>
    </Table>
    // </div>
  );
};

export default TagList;