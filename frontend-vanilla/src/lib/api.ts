// Import necessary types from backend models
// Assuming backend exports types correctly
import type { User, UserCredentials, UserRole } from '../../../backend/src/functionalities/user/models';
import type { CreateUserInput, UpdateUserRoleInput } from '../../../backend/src/functionalities/user/validation';
import type { Tag, CreateTagInput, UpdateTagInput } from '../../../backend/src/functionalities/tag/models';
import type { Note, NoteWithDetails, CreateNoteInput, UpdateNoteInput } from '../../../backend/src/functionalities/note/models';
import type { SearchRequest, PaginatedSearchResult } from '../../../backend/src/utils/search'; // Assuming PaginatedSearchResult exists
import type { SignatureComponent, CreateSignatureComponentInput, UpdateSignatureComponentInput } from '../../../backend/src/functionalities/signature/component/models';
import type { SignatureElement, SignatureElementSearchResult, CreateSignatureElementInput, UpdateSignatureElementInput } from '../../../backend/src/functionalities/signature/element/models';
import type { ArchiveDocument, ArchiveDocumentSearchResult, CreateArchiveDocumentInput, UpdateArchiveDocumentInput } from '../../../backend/src/functionalities/archive/document/models';


import { authService } from '../index'; // Import the instance

const API_BASE_URL = '/api'; // Assuming your backend proxy is set up

class ApiError extends Error {
    status: number;
    details?: any;

    constructor(message: string, status: number, details?: any) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }
}


async function request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', // Added PATCH
    body?: any,
    requiresAuth: boolean = true
): Promise<T> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    const token = authService.token; // Access token via authService instance

    if (requiresAuth) {
        if (!token) {
            throw new ApiError('Authentication token is missing.', 401);
        }
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
        method: method,
        headers: headers,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.body = JSON.stringify(body);
    }

    let response: Response;
    let responseClone: Response; // For debugging if JSON parsing fails
    let textForDebug: string | null = null; // For debugging

    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        responseClone = response.clone(); // Clone response *before* trying to read body

        if (!response.ok) {
            let errorData: any = null;
            let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
            try {
                 // Try parsing error details if available (use the clone)
                 errorData = await responseClone.json();
                 // Use more specific message if backend provides one
                 errorMessage = errorData?.message || errorData?.error || errorMessage;
            } catch (jsonError) {
                 // If JSON parsing fails on error response, try reading as text (use the original response here)
                 try {
                    textForDebug = await response.text();
                    console.warn(`API Error (${response.status}): Could not parse error response as JSON. Text response:`, textForDebug);
                 } catch(textError) {
                    console.warn(`API Error (${response.status}): Could not parse error response as JSON or Text.`);
                 }
            }
            throw new ApiError(errorMessage, response.status, errorData);
        }

        // Handle successful responses
        if (response.status === 204) { // No Content
            return null as T; // Or handle as needed, maybe return {} as T
        }

        try {
            // Use the original response for successful JSON parsing
            return await response.json() as T;
        } catch (jsonError) {
             // This block might be hit if the server sends a 200/201 status but invalid JSON body
             console.error("API Success Response JSON Parsing Error:", jsonError);
             // Try reading the original response as text for debugging
             try {
                 textForDebug = await response.text();
                 console.error("Response Text (after JSON success error):", textForDebug);
             } catch(textError) {
                 console.error("Could not get text body after successful response JSON parse error.");
             }
             throw new ApiError('Failed to parse successful response body as JSON.', response.status, { originalError: jsonError, responseText: textForDebug });
        }

    } catch (error) {
        if (error instanceof ApiError) {
            throw error; // Re-throw known API errors
        }
        // Handle network errors or other unexpected issues
        console.error(`Network or unexpected error during API request to ${method} ${endpoint}:`, error);
        let message = 'Network error or unexpected issue occurred.';
        if (error instanceof Error) {
            message = error.message;
        }
        throw new ApiError(message, 0); // Use status 0 for network/unknown errors
    }
}


// --- User API ---
const login = (credentials: UserCredentials): Promise<{ token: string; user: Omit<User, "password"> }> => {
    return request('/users/login', 'POST', credentials, false);
};

const register = (userData: CreateUserInput): Promise<Omit<User, "password">> => {
    return request('/users/register', 'POST', userData, false);
};

const getCurrentUser = (): Promise<Omit<User, "password">> => {
    return request('/users/me', 'GET');
};

const getAllUsers = (): Promise<Omit<User, "password">[]> => {
    // Requires admin privileges (handled by backend)
    return request('/users', 'GET');
};

const updateUserRole = (login: string, newRole: UserRole): Promise<Omit<User, "password">> => {
    // Assuming UpdateUserRoleInput exists and just needs { role: UserRole }
    const payload: UpdateUserRoleInput = { role: newRole };
    // Using PATCH as it's a partial update
    return request(`/users/${encodeURIComponent(login)}/role`, 'PATCH', payload);
};


// --- Tag API ---
const createTag = (tagData: CreateTagInput): Promise<Tag> => {
    return request('/tags', 'POST', tagData);
};

const getAllTags = (): Promise<Tag[]> => {
    return request('/tags', 'GET');
};

const getTagById = (tagId: number): Promise<Tag> => {
    return request(`/tags/${tagId}`, 'GET');
};

const updateTag = (tagId: number, tagData: UpdateTagInput): Promise<Tag> => {
    return request(`/tags/${tagId}`, 'PUT', tagData);
};

const deleteTag = (tagId: number): Promise<void> => {
    return request(`/tags/${tagId}`, 'DELETE');
};

// --- Note API ---
const createNote = (noteData: CreateNoteInput): Promise<NoteWithDetails> => {
    return request('/notes', 'POST', noteData);
};

const getNoteById = (noteId: number): Promise<NoteWithDetails> => {
    return request(`/notes/${noteId}`, 'GET');
};

const updateNote = (noteId: number, noteData: UpdateNoteInput): Promise<NoteWithDetails> => {
    return request(`/notes/${noteId}`, 'PUT', noteData);
};

const deleteNote = (noteId: number): Promise<void> => {
    return request(`/notes/${noteId}`, 'DELETE');
};

const searchNotes = (searchRequest: SearchRequest): Promise<PaginatedSearchResult<NoteWithDetails>> => {
    return request('/notes/search', 'POST', searchRequest);
};

// --- Signature Component API ---
const createSignatureComponent = (componentData: CreateSignatureComponentInput): Promise<SignatureComponent> => {
    return request('/signatures/components', 'POST', componentData);
};

const getAllSignatureComponents = (): Promise<SignatureComponent[]> => {
    return request('/signatures/components', 'GET');
};

const getSignatureComponentById = (componentId: number): Promise<SignatureComponent> => {
    return request(`/signatures/components/${componentId}`, 'GET');
};

const updateSignatureComponent = (componentId: number, componentData: UpdateSignatureComponentInput): Promise<SignatureComponent> => {
    return request(`/signatures/components/${componentId}`, 'PUT', componentData);
};

const deleteSignatureComponent = (componentId: number): Promise<void> => {
    return request(`/signatures/components/${componentId}`, 'DELETE');
};

// --- Signature Element API ---
const createSignatureElement = (elementData: CreateSignatureElementInput): Promise<SignatureElement> => {
    return request('/signatures/elements', 'POST', elementData);
};

const getSignatureElementById = (elementId: number): Promise<SignatureElement> => {
    return request(`/signatures/elements/${elementId}`, 'GET');
};

const updateSignatureElement = (elementId: number, elementData: UpdateSignatureElementInput): Promise<SignatureElement> => {
    return request(`/signatures/elements/${elementId}`, 'PUT', elementData);
};

const deleteSignatureElement = (elementId: number): Promise<void> => {
    return request(`/signatures/elements/${elementId}`, 'DELETE');
};

const searchSignatureElements = (searchRequest: SearchRequest): Promise<PaginatedSearchResult<SignatureElementSearchResult>> => {
    return request('/signatures/elements/search', 'POST', searchRequest);
};

// --- Archive Document API ---
const createArchiveDocument = (docData: CreateArchiveDocumentInput): Promise<ArchiveDocument> => {
    return request('/archive/documents', 'POST', docData);
}

const getArchiveDocumentById = (docId: number, includeInactive: boolean = false): Promise<ArchiveDocument> => {
    const queryParams = includeInactive ? '?includeInactive=true' : '';
    return request(`/archive/documents/${docId}${queryParams}`, 'GET');
}

const updateArchiveDocument = (docId: number, docData: UpdateArchiveDocumentInput): Promise<ArchiveDocument> => {
    return request(`/archive/documents/${docId}`, 'PUT', docData);
}

const disableArchiveDocument = (docId: number): Promise<void> => {
    // Using DELETE might imply permanent removal, PATCH or a dedicated endpoint might be better
    // For now, stick to DELETE as per original potential design, or switch to PATCH if preferred.
    // Let's use PATCH for a soft delete/disable action
    return request(`/archive/documents/${docId}/disable`, 'PATCH'); // Assuming a dedicated endpoint
    // Or if using standard PUT/PATCH with a field:
    // return request(`/archive/documents/${docId}`, 'PATCH', { active: false });
}

const searchArchiveDocuments = (searchRequest: SearchRequest): Promise<PaginatedSearchResult<ArchiveDocumentSearchResult>> => {
    return request('/archive/documents/search', 'POST', searchRequest);
}


export default {
    // User
    login,
    register,
    getCurrentUser,
    getAllUsers,
    updateUserRole,
    // Tag
    createTag,
    getAllTags,
    getTagById,
    updateTag,
    deleteTag,
    // Note
    createNote,
    getNoteById,
    updateNote,
    deleteNote,
    searchNotes,
    // Signature Component
    createSignatureComponent,
    getAllSignatureComponents,
    getSignatureComponentById,
    updateSignatureComponent,
    deleteSignatureComponent,
    // Signature Element
    createSignatureElement,
    getSignatureElementById,
    updateSignatureElement,
    deleteSignatureElement,
    searchSignatureElements,
     // Archive Document
     createArchiveDocument,
     getArchiveDocumentById,
     updateArchiveDocument,
     disableArchiveDocument,
     searchArchiveDocuments,
    // General
    ApiError // Export the custom error class
};

// Add the getElementsByComponent method to the exported default object
// This ensures it's available for ElementSelector, using the mock/polyfilled version
if (typeof api.getElementsByComponent === 'function') {
    (api as any).getElementsByComponent = api.getElementsByComponent;
}
