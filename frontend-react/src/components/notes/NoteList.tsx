import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, User } from 'lucide-react'; // Added User icon
import type { NoteWithDetails } from '../../../../backend/src/functionalities/note/models'; // Use NoteWithDetails
import { useAuth } from '@/hooks/useAuth'; // Import useAuth
import { cn } from '@/lib/utils'; // Import cn

interface NoteListProps {
  notes: NoteWithDetails[]; // Expect notes with tags and ownerLogin
  onEdit: (note: NoteWithDetails) => void;
  onDelete: (noteId: number) => void;
  onPreview: (note: NoteWithDetails) => void; // Added preview callback
}

const NoteList: React.FC<NoteListProps> = ({ notes, onEdit, onDelete, onPreview }) => {
  const { user } = useAuth(); // Get current user
  const isAdmin = user?.role === 'admin'; // Check if user is admin

  if (notes.length === 0) {
    return null; // Parent handles the empty state message
  }

  return (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className='w-[150px]'>Author</TableHead>
                <TableHead className='w-[120px]'>Modified</TableHead>
                <TableHead className='w-[100px]'>Shared</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {notes.map((note) => {
                const isOwner = note.ownerUserId === user?.userId;
                const canDelete = isOwner || isAdmin; // User can delete if they are owner OR admin

                return (
                    <TableRow key={note.noteId}>
                        {/* Make Title cell clickable */}
                        <TableCell
                           className="font-medium cursor-pointer hover:text-primary hover:underline"
                           onClick={() => onPreview(note)}
                           title={`Click to preview "${note.title}"`}
                        >
                           {note.title}
                        </TableCell>
                         {/* Author Column */}
                         <TableCell className='text-sm text-muted-foreground'>
                             <div className='flex items-center gap-1' title={note.ownerLogin}>
                                {isOwner ? <User className='h-3 w-3 text-primary'/> : <User className='h-3 w-3'/>}
                                <span className={cn(isOwner && 'font-medium text-foreground')}>{note.ownerLogin ?? 'Unknown'}</span>
                             </div>
                         </TableCell>
                        <TableCell className='text-sm'>{new Date(note.modifiedOn).toLocaleDateString()}</TableCell>
                        <TableCell>
                            {note.shared ? <Badge variant="outline">Shared</Badge> : <Badge variant="secondary">Private</Badge>}
                        </TableCell>
                         <TableCell>
                             <div className='flex flex-wrap gap-1 max-w-[200px]'>
                                 {note.tags?.slice(0, 3).map(tag => (
                                     <Badge key={tag.tagId} variant='secondary' className='text-xs font-normal'>{tag.name}</Badge>
                                 ))}
                                 {note.tags && note.tags.length > 3 && (
                                    <Badge variant='outline' className='text-xs font-normal'>+{note.tags.length - 3} more</Badge>
                                 )}
                                 {(!note.tags || note.tags.length === 0) && <span className='text-xs italic text-muted-foreground'>No tags</span>}
                             </div>
                         </TableCell>
                        <TableCell className="text-right space-x-1">
                             {/* Edit button always visible if user can access the note */}
                             <Button variant="ghost" size="icon" onClick={() => onEdit(note)} title="Edit Note">
                                <Edit className="h-4 w-4" />
                            </Button>
                            {/* Delete button visible if owner OR admin */}
                            {canDelete ? (
                                <Button variant="ghost" size="icon" onClick={() => onDelete(note.noteId!)} title="Delete Note">
                                <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            ) : (
                                // Optional: Add placeholder or leave empty if not deletable
                                <span className="inline-block w-9 h-9"></span> // Placeholder to maintain alignment
                            )}
                        </TableCell>
                    </TableRow>
                );
            })}
        </TableBody>
    </Table>
  );
};

export default NoteList;