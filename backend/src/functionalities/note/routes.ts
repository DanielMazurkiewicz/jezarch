import { createNoteController, getAllNotesByLoginController, getNoteByIdController, updateNoteController, deleteNoteController, searchNotesController } from './controllers';

export const noteRoutes = {
    '/api/note': {
      PUT: createNoteController,
    },
    '/api/note/id/:noteId': {
      GET: getNoteByIdController,
      PATCH: updateNoteController,
      DELETE: deleteNoteController,
    },
    '/api/notes/by-login/:login': {
      GET: getAllNotesByLoginController,
    },
    '/api/notes/search': {
      POST: searchNotesController,
    },
  };