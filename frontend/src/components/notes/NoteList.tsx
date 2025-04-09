import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import type { Note } from '../../../../backend/src/functionalities/note/models';

interface NoteListProps {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (noteId: number) => void;
}

const NoteList: React.FC<NoteListProps> = ({ notes, onEdit, onDelete }) => {
  if (notes.length === 0) {
    return <p className="text-muted-foreground text-center">No notes found.</p>;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Modified</TableHead>
            <TableHead>Shared</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notes.map((note) => (
            <TableRow key={note.noteId}>
              <TableCell className="font-medium">{note.title}</TableCell>
              <TableCell>{new Date(note.modifiedOn).toLocaleDateString()}</TableCell>
               <TableCell>
                   {note.shared ? <Badge variant="outline">Shared</Badge> : <Badge variant="secondary">Private</Badge>}
                </TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="ghost" size="icon" onClick={() => onEdit(note)} title="Edit Note">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(note.noteId!)} title="Delete Note">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default NoteList;