import { BunRequest } from 'bun';
import { createNote, getAllNotesByOwnerUserId, getNoteById, updateNote, deleteNote, getNotesForUser } from './db';
import { Note, NoteInput, NoteWithDetails } from './models'; // Added NoteWithDetails
import { getSessionAndUser, isAllowedRole, isOwner } from '../session/controllers';
import { Log } from '../log/db';
import { getUserByLogin } from '../user/db';
// Import buildSearchQueries and executeSearch explicitly
import { SearchOnCustomFieldHandler, SearchOnCustomFieldHandlerResult, SearchQueryElement, SearchRequest, SearchResponse, buildSearchQueries, executeSearch } from "../../utils/search";
import { getTagsForNote, setTagsForNote } from './tag/db'; // Use note-specific tag functions


export const getNoteByIdController = async (req: BunRequest<":noteId">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow admin and employees to read notes based on ownership/shared status. 'user' role cannot access notes.
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const noteId = parseInt(req.params.noteId);
        if (isNaN(noteId)) {
             await Log.warn('Invalid note ID format', sessionAndUser.user.login, 'note', { noteId: req.params.noteId });
             return new Response(JSON.stringify({ message: 'Invalid note ID' }), { status: 400 });
        }

        // getNoteById now includes ownerLogin and tags
        const note = await getNoteById(noteId);
        if (!note) {
             await Log.info(`Note not found: ${noteId}`, sessionAndUser.user.login, 'note');
             return new Response(JSON.stringify({ message: 'Note not found' }), { status: 404 });
        }

        // Authorization: Check if the user can access this specific note
        // Allow access if:
        // 1. The user is the owner.
        // 2. The note is shared.
        // 3. The user is an admin.
        // (Employee role access is covered by the initial role check and the conditions below)
        if (!isOwner(sessionAndUser, note.ownerUserId) && !note.shared && !isAllowedRole(sessionAndUser, 'admin')) {
            await Log.error(`Forbidden attempt to read note`, sessionAndUser.user.login, 'note', { noteId });
            return new Response("Forbidden", { status: 403 });
        }

        return new Response(JSON.stringify(note), { status: 200 });
    } catch (error) {
        await Log.error('Error fetching note by ID', sessionAndUser.user.login, 'note', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ message: 'Failed to get note', error: errorMessage }), { status: 500 });
    }
};

// This remains for fetching ONLY notes owned by a specific user ID
// This is useful if an admin wants to see all notes of a specific user
// It will now include tags and ownerLogin as well.
export const getAllNotesByUserIdController = async (req: BunRequest<":userId">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });

    const targetUserId = parseInt(req.params.userId);
    if (isNaN(targetUserId)) {
        await Log.warn('Invalid user ID format in getAllNotesByUserId', sessionAndUser.user.login, 'note', { targetUserId: req.params.userId });
        return new Response(JSON.stringify({ message: 'Invalid user ID' }), { status: 400 });
    }

    // Authorization: Only allow admin to see other users' notes, or users see their own (employees included here)
    if (!isAllowedRole(sessionAndUser, 'admin') && sessionAndUser.user.userId !== targetUserId) {
         await Log.error(`Forbidden attempt to get notes for user ID ${targetUserId}`, sessionAndUser.user.login, 'note');
         return new Response("Forbidden", { status: 403 });
    }

    try {
        // getAllNotesByOwnerUserId now fetches tags and ownerLogin
        const notes = await getAllNotesByOwnerUserId(targetUserId);
        return new Response(JSON.stringify(notes), { status: 200 });
    } catch (error) {
        await Log.error('Error fetching notes by user ID', sessionAndUser.user.login, 'note', { targetUserId, error });
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ message: 'Failed to get notes', error: errorMessage }), { status: 500 });
    }
};


// This remains for fetching ONLY notes owned by a specific user login
// It will now include tags and ownerLogin as well.
export const getAllNotesByLoginController = async (req: BunRequest<":login">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
     // Allow admin and employees to fetch notes by login (but only their own unless admin)
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const targetLogin = req.params.login;

        // Authorization: Only allow admin to see other users' notes, employees see their own
        if (!isAllowedRole(sessionAndUser, 'admin') && sessionAndUser.user.login !== targetLogin) {
            await Log.error(`Forbidden attempt to get notes for user login ${targetLogin}`, sessionAndUser.user.login, 'note');
            return new Response("Forbidden", { status: 403 });
        }

        const targetUser = await getUserByLogin(targetLogin);
        if (!targetUser) {
            await Log.warn(`Attempted to get notes for non-existing user login`, sessionAndUser.user.login, 'note', { targetLogin });
            return new Response("User not found", { status: 404 });
        }


        // getAllNotesByOwnerUserId now fetches tags and ownerLogin
        const notes = await getAllNotesByOwnerUserId(targetUser.userId);
        return new Response(JSON.stringify(notes), { status: 200 });
    } catch (error) {
        await Log.error('Error fetching notes by login', sessionAndUser.user.login, 'note', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ message: 'Failed to get notes', error: errorMessage }), { status: 500 });
    }
};


// Handler for searching by tags - remains the same logic, access controlled by searchNotesController
export const noteTagSearchHandler: SearchOnCustomFieldHandler<Note> = (
    element: SearchQueryElement,
    tableAlias: string
): SearchOnCustomFieldHandlerResult => {
    if (element.field === 'tags' && element.condition === 'ANY_OF' && Array.isArray(element.value)) {
        const tagIds = element.value.filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0);
        if (tagIds.length === 0) return { whereCondition: element.not ? '1=1' : '1=0', params: [] };
        const placeholders = tagIds.map(() => '?').join(', ');
        // Use EXISTS subquery for potentially better performance
        const whereCondition = `
            ${element.not ? 'NOT ' : ''}EXISTS (
                SELECT 1 FROM note_tags nt
                WHERE nt.noteId = ${tableAlias}.noteId AND nt.tagId IN (${placeholders})
            )
        `;
        return { whereCondition, params: tagIds };
    }
    return null;
};


// Controller for searching notes (own or shared)
export const searchNotesController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow admin and employees to search notes
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    const currentUserId = sessionAndUser.user.userId;

    try {
        const searchRequest = await req.json() as SearchRequest;

        // Fields directly on the notes table + ownerLogin (will be added via JOIN)
        const allowedDirectFields: (keyof NoteWithDetails)[] = ['noteId', 'title', 'content', 'shared', 'ownerUserId', 'createdOn', 'modifiedOn', 'ownerLogin'];
        const primaryKey = 'noteId';

        // Define handlers for custom fields or JOINed fields
        const customHandlers: Record<string, SearchOnCustomFieldHandler<NoteWithDetails>> = {
            tags: noteTagSearchHandler, // Use the updated tag handler
            ownerLogin: (element, tableAlias): SearchOnCustomFieldHandlerResult => {
                const userJoin = `LEFT JOIN users ON ${tableAlias}.ownerUserId = users.userId`;
                if (element.condition === 'FRAGMENT' && typeof element.value === 'string') {
                     return { joinClause: userJoin, whereCondition: `users.login LIKE ?`, params: [`%${element.value}%`] };
                 }
                 if (element.condition === 'EQ' && typeof element.value === 'string') {
                      return { joinClause: userJoin, whereCondition: `users.login = ?`, params: [element.value] };
                 }
                 return null;
            }
        };

        // --- Build base search queries ---
        const { dataQuery, countQuery, alias: notesTableAlias } = await buildSearchQueries<NoteWithDetails>(
            'notes', searchRequest, allowedDirectFields, customHandlers, primaryKey
        );

        // --- Modify queries to enforce visibility rules (own OR shared) ---
        // Use the alias returned by buildSearchQueries
        const visibilityCondition = `(${notesTableAlias}.ownerUserId = ? OR ${notesTableAlias}.shared = TRUE)`;
        const visibilityParam = currentUserId;

        // Modify Data Query
        let modifiedDataSql = dataQuery.sql;
        let modifiedDataParams = [...dataQuery.params];
        // Check if ownerLogin handler already added the JOIN
        const needsUserJoin = !modifiedDataSql.includes('LEFT JOIN users ON') && !modifiedDataSql.includes('INNER JOIN users ON');
        if (needsUserJoin) {
             modifiedDataSql = modifiedDataSql.replace(/FROM notes AS \w+/i, `FROM notes AS ${notesTableAlias} LEFT JOIN users ON ${notesTableAlias}.ownerUserId = users.userId`);
        }
        // Ensure ownerLogin is selected
        if (!modifiedDataSql.includes('users.login as ownerLogin')) {
            modifiedDataSql = modifiedDataSql.replace(`SELECT DISTINCT ${notesTableAlias}.*`, `SELECT DISTINCT ${notesTableAlias}.*, users.login as ownerLogin`);
        }
        // Add visibility condition
        const whereIndexData = modifiedDataSql.search(/WHERE/i); // Case-insensitive search
        const orderByIndexData = modifiedDataSql.search(/ORDER BY/i);
        const limitIndexData = modifiedDataSql.search(/LIMIT/i);

        if (whereIndexData !== -1) {
             modifiedDataSql = modifiedDataSql.slice(0, whereIndexData + 5) + ` (${visibilityCondition}) AND ` + modifiedDataSql.slice(whereIndexData + 6);
             modifiedDataParams.splice(0, 0, visibilityParam); // Insert param at the beginning
        } else {
             let insertionPoint = -1;
             if (orderByIndexData !== -1) insertionPoint = orderByIndexData;
             else if (limitIndexData !== -1) insertionPoint = limitIndexData;

             if (insertionPoint !== -1) {
                  modifiedDataSql = modifiedDataSql.slice(0, insertionPoint) + `WHERE ${visibilityCondition} ` + modifiedDataSql.slice(insertionPoint);
                  // Find the position of LIMIT ?, OFFSET ? parameters (usually last two)
                  const limitParamIndex = modifiedDataParams.length - 2;
                  modifiedDataParams.splice(limitParamIndex, 0, visibilityParam);
             } else {
                 modifiedDataSql += ` WHERE ${visibilityCondition}`;
                 modifiedDataParams.push(visibilityParam); // Add to end if no ORDER BY/LIMIT
             }
        }

        // Modify Count Query
        let modifiedCountSql = countQuery.sql;
        let modifiedCountParams = [...countQuery.params];
        // Add JOIN if needed
        if (needsUserJoin) { // Use the same check as for data query
             modifiedCountSql = modifiedCountSql.replace(/FROM notes AS \w+/i, `FROM notes AS ${notesTableAlias} LEFT JOIN users ON ${notesTableAlias}.ownerUserId = users.userId`);
        }
        // Add visibility condition
        const whereIndexCount = modifiedCountSql.search(/WHERE/i);
        if (whereIndexCount !== -1) {
             modifiedCountSql = modifiedCountSql.slice(0, whereIndexCount + 5) + ` (${visibilityCondition}) AND ` + modifiedCountSql.slice(whereIndexCount + 6);
             modifiedCountParams.splice(0, 0, visibilityParam); // Insert param at the beginning
        } else {
             modifiedCountSql += ` WHERE ${visibilityCondition}`;
             modifiedCountParams.push(visibilityParam); // Add to end
        }


        // --- Execute Modified Search ---
        const response = await executeSearch<NoteWithDetails>(
            { sql: modifiedDataSql, params: modifiedDataParams },
            { sql: modifiedCountSql, params: modifiedCountParams }
        );

        // --- Populate Tags for Results ---
        if (response.data.length > 0) {
            const noteIds = response.data.map(note => note.noteId!);
            const tagsMap = new Map<number, Awaited<ReturnType<typeof getTagsForNote>>>();
            // Consider optimizing tag fetching in bulk if performance is an issue
            for (const noteId of noteIds) {
                tagsMap.set(noteId, await getTagsForNote(noteId));
            }
            response.data.forEach(note => {
                 note.tags = tagsMap.get(note.noteId!) || [];
            });
        }

        return new Response(JSON.stringify(response), { status: 200 });
    } catch (error) {
        await Log.error('Note Search failed', sessionAndUser.user.login, 'note', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ message: 'Note search failed', error: errorMessage }), { status: 500 });
    }
};


export const createNoteController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow admin and employees to create notes
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const body = await req.json() as NoteInput;
        const { title, content, shared, tagIds } = body;
        const ownerUserId = sessionAndUser.user.userId;

        // Create note core data
        const noteId = await createNote(title, content ?? '', ownerUserId, shared); // Pass empty string for null content

        // Set tags if provided
        if (tagIds) {
            await setTagsForNote(noteId, tagIds);
        }

        await Log.info(`Note created: ID ${noteId}`, sessionAndUser.user.login, 'note');

        // Fetch the newly created note with tags and ownerLogin to return
        const newNote = await getNoteById(noteId);

        return new Response(JSON.stringify(newNote), { status: 201 });
    } catch (error) {
        await Log.error('Failed to create note', sessionAndUser.user.login, 'note', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ message: 'Failed to create note', error: errorMessage }), { status: 500 });
    }
};


export const updateNoteController = async (req: BunRequest<":noteId">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow admin and employees to update notes (with ownership/admin checks below)
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const noteId = parseInt(req.params.noteId);
        if (isNaN(noteId)) {
             await Log.warn('Invalid note ID format for update', sessionAndUser.user.login, 'note', { noteId: req.params.noteId });
             return new Response(JSON.stringify({ message: 'Invalid note ID' }), { status: 400 });
        }

        const existingNote = await getNoteById(noteId); // Fetches with details
        if (!existingNote) {
             await Log.warn(`Attempted update on non-existent note: ${noteId}`, sessionAndUser.user.login, 'note');
             return new Response(JSON.stringify({ message: 'Note not found' }), { status: 404 });
        }

        // Authorization: Must be owner or admin to update ANY field
        if (!isOwner(sessionAndUser, existingNote.ownerUserId) && !isAllowedRole(sessionAndUser, 'admin')) {
            await Log.error(`Forbidden update attempt on note ${noteId}`, sessionAndUser.user.login, 'note');
            return new Response("Forbidden", { status: 403 });
        }

        const body = await req.json() as NoteInput;

        // Determine which fields have actually changed
        const updatePayload: Partial<NoteInput> = {};
        let tagsChanged = false;

        if (body.title !== undefined && body.title !== existingNote.title) {
            updatePayload.title = body.title;
        }
        const currentContent = existingNote.content ?? '';
        const newContent = body.content ?? '';
        if (body.content !== undefined && newContent !== currentContent) {
            updatePayload.content = newContent; // Pass null or string
        }
        if (body.shared !== undefined && body.shared !== existingNote.shared) {
            // Specific Authorization for 'shared' field: Only owner or admin can change it
             if (!isOwner(sessionAndUser, existingNote.ownerUserId) && !isAllowedRole(sessionAndUser, 'admin')) {
                 await Log.error(`Forbidden attempt to change 'shared' status on note ${noteId}`, sessionAndUser.user.login, 'note');
                 return new Response("Forbidden: Only the owner or an admin can change the shared status.", { status: 403 });
             }
            updatePayload.shared = body.shared;
        }

        // Check if tags changed
        const existingTagIds = existingNote.tags?.map(t => t.tagId!).sort() || [];
        const newTagIds = body.tagIds?.sort() || [];
        if (body.tagIds !== undefined && JSON.stringify(existingTagIds) !== JSON.stringify(newTagIds)) {
            tagsChanged = true;
        }

        // --- Perform Updates ---
        let coreUpdatePerformed = false;
        // Update core note fields only if changed
        if (Object.keys(updatePayload).length > 0) {
            // Pass content which can be null/undefined/string here
            await updateNote(noteId, updatePayload.title, updatePayload.content, updatePayload.shared);
            coreUpdatePerformed = true;
        }

        // Update tags only if they changed
        if (tagsChanged) {
            await setTagsForNote(noteId, body.tagIds!); // Pass the new tag IDs
        }

        // Log only if something actually changed
        if (coreUpdatePerformed || tagsChanged) {
            await Log.info(`Note updated: ID ${noteId}`, sessionAndUser.user.login, 'note', { coreChanges: Object.keys(updatePayload), tagsChanged });
        } else {
             await Log.info(`Note update request for ID ${noteId}, but no changes detected.`, sessionAndUser.user.login, 'note');
        }

        // Fetch again to return the potentially updated note details
        const updatedNote = await getNoteById(noteId);

        return new Response(JSON.stringify(updatedNote), { status: 200 });
    } catch (error) {
        await Log.error('Failed to update note', sessionAndUser.user.login, 'note', { error, noteId: req.params.noteId });
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ message: 'Failed to update note', error: errorMessage }), { status: 500 });
    }
};

// Delete controller - Authorization updated to allow owners
export const deleteNoteController = async (req: BunRequest<":noteId">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow admin and employees to attempt delete (ownership check below)
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const noteId = parseInt(req.params.noteId);
         if (isNaN(noteId)) {
             await Log.warn('Invalid note ID format for delete', sessionAndUser.user.login, 'note', { noteId: req.params.noteId });
             return new Response(JSON.stringify({ message: 'Invalid note ID' }), { status: 400 });
        }

        const note = await getNoteById(noteId); // Fetch with details to check owner
        if (!note) {
            // Note already gone, return success (idempotent) or 404
            return new Response(JSON.stringify({ message: 'Note not found' }), { status: 404 });
        }

        // --- Authorization check: Must be owner OR admin ---
        if (!isOwner(sessionAndUser, note.ownerUserId) && !isAllowedRole(sessionAndUser, 'admin')) {
             await Log.error(`Forbidden note delete attempt: ${noteId}`, sessionAndUser.user.login, 'note');
             return new Response("Forbidden", { status: 403 });
        }

        await deleteNote(noteId);
        await Log.info(`Note deleted: ID ${noteId}`, sessionAndUser.user.login, 'note');
        return new Response(JSON.stringify({ message: 'Note deleted successfully' }), { status: 200 }); // 200 OK with message is fine
    } catch (error) {
        await Log.error('Failed to delete note', sessionAndUser.user.login, 'note', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ message: 'Failed to delete note', error: errorMessage }), { status: 500 });
    }
};