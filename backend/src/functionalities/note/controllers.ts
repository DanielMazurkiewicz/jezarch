import { BunRequest } from 'bun';
import { createNote, getAllNotesByOwnerUserId, getNoteById, updateNote, deleteNote } from './db';
import { Note } from './models';
import { getSessionAndUser, isAllowedRole, isOwner } from '../session/controllers';
import { Log } from '../log/db';
import { getUserByLogin } from '../user/db';
import { SearchRequest, SearchResponse, buildSearchQueries, executeSearch } from "../../utils/search";

export const createNoteController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const body = await req.json() as Note;
        const { title, content, shared } = body;
        const ownerUserId = sessionAndUser.user.userId; // Use session user's ID
        // @ts-ignore
        await createNote(title, content, ownerUserId, shared);
        return new Response(JSON.stringify({ message: 'Note created successfully' }), { status: 201 });
    } catch (error) {
        await Log.error('Failed to create note', sessionAndUser.user.login, 'note', error);
        return new Response(JSON.stringify({ message: 'Failed to create note', error: error }), { status: 500 });
    }
};

export const getNoteByIdController = async (req: BunRequest<":noteId">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const noteId = parseInt(req.params.noteId);
        const note = await getNoteById(noteId);
        if (!note) return new Response(JSON.stringify({ message: 'Note not found' }), { status: 404 });

        if (!isOwner(sessionAndUser, note.ownerUserId)) {
            await Log.error(`Forbidden to read note`, sessionAndUser.user.login, 'note', { noteId });
            return new Response("Forbidden", { status: 403 });
        }
        return new Response(JSON.stringify(note), { status: 200 });
    } catch (error) {
        await Log.error('Error fetching note', sessionAndUser.user.login, 'note', error);
        return new Response(JSON.stringify({ message: 'Failed to get note', error: error }), { status: 500 });
    }
};

export const getAllNotesByUserIdController = async (req: BunRequest<":userId">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const ownerUserId = parseInt(req.params.userId);
        const notes = await getAllNotesByOwnerUserId(ownerUserId);
        return new Response(JSON.stringify(notes), { status: 200 });
    } catch (error) {
        await Log.error('Error fetching note', sessionAndUser.user.login, 'note', error);
        return new Response(JSON.stringify({ message: 'Failed to get notes', error: error }), { status: 500 });
    }
};



export const getAllNotesByLoginController = async (req: BunRequest<":login">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const login = req.params.login;

        const user = await getUserByLogin(login)
        if (!user) {
            await Log.error(`Non existing user`, sessionAndUser.user.login, 'note', { login });
            return new Response("Internal server issue", { status: 500 });
        }
        const ownerUserId = user?.userId || 0;
        const notes = await getAllNotesByOwnerUserId(ownerUserId);
        return new Response(JSON.stringify(notes), { status: 200 });
    } catch (error) {
        await Log.error('Error fetching note', sessionAndUser.user.login, 'note', error);
        return new Response(JSON.stringify({ message: 'Failed to get notes', error: error }), { status: 500 });
    }
};

export const searchNotesController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const searchRequest = await req.json() as SearchRequest;
        const allowedFields: (keyof Note)[] = ['title', 'content', 'shared', 'ownerUserId'];
        const { dataQuery, countQuery } = buildSearchQueries<Note>('notes', searchRequest, allowedFields);

        const response = await executeSearch<Note>(dataQuery, countQuery);
        return new Response(JSON.stringify(response), { status: 200 });
    } catch (error) {
        await Log.error('Search failed', sessionAndUser.user.login, 'note', error);
        return new Response(JSON.stringify({ message: 'Search failed' }), { status: 500 });
    }
};

export const updateNoteController = async (req: BunRequest<":noteId">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const noteId = parseInt(req.params.noteId);
        const note = await getNoteById(noteId);
        if (!note) return new Response(JSON.stringify({ message: 'Note not found' }), { status: 404 });

        if (!isOwner(sessionAndUser, note.ownerUserId)) {
            await Log.error(`Unauthorized note update: ${noteId}`, sessionAndUser.user.login, 'note');
            return new Response("Forbidden", { status: 403 });
        }

        const body = await req.json() as Note;
        const { title, content, shared } = body;

        await updateNote(noteId, title, content, shared);
        return new Response(JSON.stringify({ message: 'Note updated successfully' }), { status: 200 });
    } catch (error) {
        await Log.error('Failed to update note', sessionAndUser.user.login, 'note', error);
        return new Response(JSON.stringify({ message: 'Failed to update note', error: error }), { status: 500 });
    }
};

export const deleteNoteController = async (req: BunRequest<":noteId">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const noteId = parseInt(req.params.noteId);
        await deleteNote(noteId);
        return new Response(JSON.stringify({ message: 'Note deleted successfully' }), { status: 200 });
    } catch (error) {
        await Log.error('Failed to delete note', sessionAndUser.user.login, 'note', error);
        return new Response(JSON.stringify({ message: 'Failed to delete note', error: error }), { status: 500 });
    }
};