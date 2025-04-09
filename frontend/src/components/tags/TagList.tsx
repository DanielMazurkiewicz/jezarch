import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import { useAuth } from '@/hooks/useAuth'; // To check role for actions

interface TagListProps {
  tags: Tag[];
  onEdit: (tag: Tag) => void;
  onDelete: (tagId: number) => void;
}

const TagList: React.FC<TagListProps> = ({ tags, onEdit, onDelete }) => {
   const { user } = useAuth();
   const isAdmin = user?.role === 'admin'; // Assuming only admin can edit/delete tags

  if (tags.length === 0) {
    return <p className="text-muted-foreground text-center">No tags found.</p>;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            {isAdmin && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tags.map((tag) => (
            <TableRow key={tag.tagId}>
              <TableCell className="font-medium">{tag.name}</TableCell>
              <TableCell>{tag.description || <span className="text-muted-foreground italic">No description</span>}</TableCell>
              {isAdmin && (
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(tag)} title="Edit Tag">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(tag.tagId!)} title="Delete Tag">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TagList;