import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import type { Note } from '../../../../backend/src/functionalities/note/models';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth
import { cn } from '@/lib/utils'; // Import cn

interface NoteListProps {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (noteId: number) => void;
}

const NoteList: React.FC<NoteListProps> = ({ notes, onEdit, onDelete }) => {
  const { user } = useAuth(); // Get current user
  const isAdmin = user?.role === 'admin'; // Check if user is admin

  if (notes.length === 0) {
    // Don't show this message if the parent component already handles it (like in NotesPage)
    // return <p className="text-muted-foreground text-center py-4">No notes found.</p>;
    return null; // Parent handles the empty state message
  }

  return (
    // Remove border and rounded if inside a CardContent already
    // <div className="border rounded-lg">
    <Table>
        <TableHeader>
            <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Modified</TableHead>
            <TableHead>Shared</TableHead>
             {/* Display Tags - Simplified for now */}
             <TableHead>Tags</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {notes.map((note) => (
            <TableRow key={note.noteId}>
                <TableCell className="font-medium">{note.title}</TableCell>
                <TableCell className='text-sm'>{new Date(note.modifiedOn).toLocaleDateString()}</TableCell>
                <TableCell>
                    {note.shared ? <Badge variant="outline">Shared</Badge> : <Badge variant="secondary">Private</Badge>}
                </TableCell>
                 <TableCell>
                     {/* Display first few tags */}
                     <div className='flex flex-wrap gap-1 max-w-[200px]'>
                         {note.tags?.slice(0, 3).map(tag => (
                             <Badge key={tag.tagId} variant='secondary' className='text-xs font-normal'>{tag.name}</Badge>
                         ))}
                         {note.tags && note.tags.length > 3 && (
                            <Badge variant='outline' className='text-xs font-normal'>+{note.tags.length - 3} more</Badge>
                         )}
                         {!note.tags || note.tags.length === 0 && <span className='text-xs italic text-muted-foreground'>No tags</span>}
                     </div>
                 </TableCell>
                <TableCell className="text-right space-x-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(note)} title="Edit Note">
                    <Edit className="h-4 w-4" />
                </Button>
                {/* Only show delete button if admin */}
                {isAdmin && (
                    <Button variant="ghost" size="icon" onClick={() => onDelete(note.noteId!)} title="Delete Note">
                    <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                )}
                </TableCell>
            </TableRow>
            ))}
        </TableBody>
    </Table>
    // </div>
  );
};

export default NoteList;