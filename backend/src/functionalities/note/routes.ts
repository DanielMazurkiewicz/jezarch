import { createNoteController, getAllNotesByLoginController, getNoteByIdController, updateNoteController, deleteNoteController, searchNotesController } from './controllers';

export const noteRoutes = {
    // Create a new note
    '/api/note': {
      PUT: createNoteController,
    },
    // Get, Update, Delete a specific note by its ID
    '/api/note/id/:noteId': {
      GET: getNoteByIdController,
      PATCH: updateNoteController,
      DELETE: deleteNoteController,
    },
    // Get all notes owned by a specific user (identified by login)
    '/api/notes/by-login/:login': {
      GET: getAllNotesByLoginController,
    },
    // Search notes (fetches notes owned by the current user OR shared notes)
    '/api/notes/search': {
      POST: searchNotesController,
    },
    // Note: Removed getAllNotesByUserIdController route as it's less commonly used directly
    // '/api/notes/by-user-id/:userId': { GET: getAllNotesByUserIdController }
  };