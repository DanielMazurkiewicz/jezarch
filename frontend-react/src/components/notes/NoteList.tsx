import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, User, Eye } from 'lucide-react'; // Added Eye icon
import type { NoteWithDetails } from '../../../../backend/src/functionalities/note/models'; // Use NoteWithDetails
import { useAuth } from '@/hooks/useAuth'; // Import useAuth
import { cn } from '@/lib/utils'; // Import cn
import { t } from '@/translations/utils'; // Import translation utility

interface NoteListProps {
  notes: NoteWithDetails[]; // Expect notes with tags and ownerLogin
  onEdit: (note: NoteWithDetails) => void;
  onDelete: (noteId: number) => void;
  onPreview: (note: NoteWithDetails) => void; // Added preview callback
}

const NoteList: React.FC<NoteListProps> = ({ notes, onEdit, onDelete, onPreview }) => {
  const { user, preferredLanguage } = useAuth(); // Get current user and language
  const isAdmin = user?.role === 'admin'; // Check if user is admin

  if (notes.length === 0) {
    return null; // Parent handles the empty state message
  }

  return (
    <Table>
        <TableHeader>
            <TableRow>
                 {/* Use translated headers */}
                <TableHead>{t('titleLabel', preferredLanguage)}</TableHead>
                <TableHead className='w-[150px]'>{t('notesAuthorColumn', preferredLanguage)}</TableHead> {/* TODO: Add notesAuthorColumn */}
                <TableHead className='w-[120px]'>{t('notesModifiedColumn', preferredLanguage)}</TableHead> {/* TODO: Add notesModifiedColumn */}
                <TableHead className='w-[100px]'>{t('notesSharedColumn', preferredLanguage)}</TableHead> {/* TODO: Add notesSharedColumn */}
                <TableHead>{t('tagsLabel', preferredLanguage)}</TableHead> {/* TODO: Add tagsLabel */}
                <TableHead className="text-right w-[130px]">{t('actionsLabel', preferredLanguage)}</TableHead> {/* Increased width */}
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
                            // TODO: Translate title attribute
                           title={`Click to preview "${note.title}"`}
                        >
                           {note.title}
                        </TableCell>
                         {/* Author Column */}
                         <TableCell className='text-sm text-muted-foreground'>
                              {/* TODO: Translate title attribute */}
                             <div className='flex items-center gap-1' title={note.ownerLogin}>
                                {isOwner ? <User className='h-3 w-3 text-primary'/> : <User className='h-3 w-3'/>}
                                <span className={cn(isOwner && 'font-medium text-foreground')}>{note.ownerLogin ?? 'Unknown'}</span>
                             </div>
                         </TableCell>
                        <TableCell className='text-sm'>{new Date(note.modifiedOn).toLocaleDateString()}</TableCell>
                        <TableCell>
                             {/* TODO: Translate badge text */}
                            {note.shared ? <Badge variant="outline">Shared</Badge> : <Badge variant="secondary">Private</Badge>}
                        </TableCell>
                         <TableCell>
                             <div className='flex flex-wrap gap-1 max-w-[200px]'>
                                 {note.tags?.slice(0, 3).map(tag => (
                                     <Badge key={tag.tagId} variant='secondary' className='text-xs font-normal'>{tag.name}</Badge>
                                 ))}
                                 {note.tags && note.tags.length > 3 && (
                                     // TODO: Translate badge text
                                    <Badge variant='outline' className='text-xs font-normal'>+{note.tags.length - 3} more</Badge>
                                 )}
                                  {/* TODO: Translate placeholder */}
                                 {(!note.tags || note.tags.length === 0) && <span className='text-xs italic text-muted-foreground'>No tags</span>}
                             </div>
                         </TableCell>
                        <TableCell className="text-right space-x-1">
                             {/* Use translated titles */}
                             <Button variant="ghost" size="icon" onClick={() => onPreview(note)} title={t('previewButton', preferredLanguage)}>
                                 <Eye className="h-4 w-4" />
                             </Button>
                             {/* Edit button always visible if user can access the note */}
                             <Button variant="ghost" size="icon" onClick={() => onEdit(note)} title={t('editButton', preferredLanguage)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            {/* Delete button visible if owner OR admin */}
                            {canDelete ? (
                                <Button variant="ghost" size="icon" onClick={() => onDelete(note.noteId!)} title={t('deleteButton', preferredLanguage)}>
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