// frontend-solid/src/lib/api.ts
// Adjusted error handling and potential types

// Assuming backend types are still accessible via relative paths
// (Adjust paths if your project structure differs significantly)
import type {
    UserCredentials,
    User,
    UserRole,
} from '../../../backend/src/functionalities/user/models';
import type { Config, AppConfigKeys } from '../../../backend/src/functionalities/config/models';
import type { SslConfig } from '../../../backend/src/functionalities/config/ssl/models';
import type { LogEntry } from '../../../backend/src/functionalities/log/models';
import type { Tag } from '../../../backend/src/functionalities/tag/models';
import type { Note, NoteInput, NoteWithDetails } from '../../../backend/src/functionalities/note/models';
import type {
    SignatureComponent,
    CreateSignatureComponentInput,
    UpdateSignatureComponentInput,
} from '../../../backend/src/functionalities/signature/component/models';
import type {
    SignatureElement,
    CreateSignatureElementInput,
    UpdateSignatureElementInput,
    SignatureElementSearchResult,
} from '../../../backend/src/functionalities/signature/element/models';
import type {
    ArchiveDocument,
    CreateArchiveDocumentInput,
    UpdateArchiveDocumentInput,
    ArchiveDocumentSearchResult,
} from '../../../backend/src/functionalities/archive/document/models';

import type { SearchRequest, SearchResponse } from '../../../backend/src/utils/search';


const API_BASE_URL = "/api"; // Assuming Bun serves API under /api

type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

class ApiError extends Error {
    status?: number;
    errorBody?: any;

    constructor(message: string, status?: number, errorBody?: any) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errorBody = errorBody;
    }
}


async function fetchApi<T>(
    endpoint: string,
    method: ApiMethod = "GET",
    body?: any,
    token?: string | null
): Promise<T> {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        "Accept": "application/json", // Still *request* JSON
    };
    if (token) {
        headers["Authorization"] = token;
    }

    const config: RequestInit = {
        method,
        headers,
    };

    if (body && !['GET', 'HEAD'].includes(method)) {
        config.body = JSON.stringify(body);
    }

    const url = `${API_BASE_URL}${endpoint}`;
    let response: Response;

    try {
        // console.log(`[API Request] ${method} ${url}`);
        response = await fetch(url, config);
        // console.log(`[API Response] ${method} ${url} - Status: ${response.status}`);
    } catch (networkError: any) {
        console.error(`[API Fetch Error] Network error for ${method} ${url}:`, networkError);
        throw new ApiError(`Network error: ${networkError.message || 'Failed to connect to API'}`);
    }

    if (!response.ok) {
        let errorBody: any = null;
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        try {
             const textResponse = await response.text();
             try {
                  errorBody = JSON.parse(textResponse);
                  if (typeof errorBody === 'object' && errorBody !== null) {
                      errorMessage = errorBody.message || errorBody.error || JSON.stringify(errorBody);
                  } else if (textResponse) {
                      // If parsing fails but text exists, use the text
                      errorMessage = textResponse;
                  }
             } catch (e) {
                  // If JSON parsing fails, use the raw text response as the message/body
                  errorBody = textResponse;
                  errorMessage = textResponse || errorMessage; // Use text if available
             }
        } catch (e) { console.error(`[API Fetch Error] Failed to read error response body for ${method} ${url}:`, e); }
        console.error(`[API Fetch Error] ${method} ${url} failed with status ${response.status}:`, errorMessage, errorBody);
        throw new ApiError(errorMessage, response.status, errorBody);
    }

    // Handle No Content responses
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        // console.log(`[API Response Body] ${method} ${url} - Status 204/No Content`);
        // Return a suitable value for 'No Content', possibly based on T
        // If T expects { success: boolean }, return that. Otherwise, null or undefined might be better.
        return { success: true } as unknown as T; // Adjust as needed for specific API calls
    }

    const contentType = response.headers.get('content-type');
    // console.log(`[API Response Info] ${method} ${url} - Content-Type: ${contentType}`);

    // Only attempt JSON parsing if the content type indicates it or if it's unknown
    if (contentType && (contentType.includes('application/json') || contentType.includes('text/plain'))) {
         // Clone the response to read the text for logging/fallback without consuming the body
         // const responseClone = response.clone();
         // const responseText = await responseClone.text();
         // console.log(`[API Response Body Raw] ${method} ${url} - Text:`, responseText);

        try {
            // Attempt to parse the original response body as JSON
            const jsonData = await response.json();
            // console.log(`[API Response Body Parsed] ${method} ${url} - JSON:`, jsonData);
            return jsonData as T;
        } catch (jsonError: any) {
            // If JSON parsing fails, but content type was JSON, it's an error
            if (contentType.includes('application/json')) {
                 console.error(`[API Fetch Error] Failed to parse JSON response for ${method} ${url} (Status ${response.status}). Content-Type was '${contentType}'. Error: ${jsonError.message}`);
                 const responseText = await response.text(); // Read text from original response now
                 throw new ApiError(`Failed to parse API response as JSON. Content-Type: ${contentType}`, response.status, responseText);
            } else {
                // If content type was text/plain, return the text directly
                 console.warn(`[API Fetch Warning] Content-Type was ${contentType}. Returning raw text.`);
                 return await response.text() as unknown as T; // Return raw text
            }
        }
    } else {
        // If content type is neither JSON nor plain text (e.g., HTML error page), return text
        console.warn(`[API Fetch Warning] Unexpected Content-Type '${contentType}' for ${method} ${url}. Returning raw text.`);
        return await response.text() as unknown as T;
    }
}


// --- API Function Exports (No changes needed here) ---
const getApiStatus = () => fetchApi<{ message: string }>("/status");
const pingApi = () => fetchApi<string>("/ping");
// Auth
const login = (credentials: UserCredentials) => fetchApi<{ token: string; role: UserRole | null; login: string; userId?: number }>("/user/login", "POST", credentials); // Role can be null
const logout = (token: string) => fetchApi<{ success: boolean }>("/user/logout", "POST", null, token);
const register = (userData: UserCredentials) => fetchApi<{ login: string; message: string }>("/user/create", "POST", userData);
// User
const getAllUsers = (token: string) => fetchApi<Omit<User, "password">[]>("/users/all", "GET", null, token);
const getUserByLogin = (login: string, token: string) => fetchApi<Omit<User, "password">>(`/user/by-login/${login}`, "GET", null, token);
const updateUserRole = (login: string, role: UserRole, token: string) => fetchApi<{ message: string }>(`/user/by-login/${login}`, "PATCH", { role }, token);
const changePassword = (passwords: { oldPassword: string; password: string; }, token: string) => fetchApi<{ message: string }>("/user/change-password", "POST", passwords, token);
// Config
const getConfig = (key: AppConfigKeys, token: string) => fetchApi<{ [key: string]: string }>(`/configs/${key}`, "GET", null, token);
const setConfig = (key: AppConfigKeys, value: string, token: string) => fetchApi<{ message: string }>(`/configs/${key}`, "PUT", { key, value }, token);
const uploadSsl = (sslConfig: SslConfig, token: string) => fetchApi<{ message: string }>("/config/ssl/upload", "PUT", sslConfig, token);
const generateSsl = (token: string) => fetchApi<{ message: string }>("/config/ssl/generate", "POST", null, token);
// Log
const searchLogs = (searchRequest: SearchRequest, token: string) => fetchApi<SearchResponse<LogEntry>>("/logs/search", "POST", searchRequest, token);
// Tag
const createTag = (tagData: Pick<Tag, 'name' | 'description'>, token: string) => fetchApi<Tag>('/tag', 'PUT', tagData, token);
const getAllTags = (token: string) => fetchApi<Tag[]>('/tags', 'GET', null, token);
const getTagById = (tagId: number, token: string) => fetchApi<Tag>(`/tag/id/${tagId}`, 'GET', null, token);
const updateTag = (tagId: number, tagData: Partial<Pick<Tag, 'name' | 'description'>>, token: string) => fetchApi<Tag>(`/tag/id/${tagId}`, 'PATCH', tagData, token);
const deleteTag = (tagId: number, token: string) => fetchApi<{ message: string }>(`/tag/id/${tagId}`, 'DELETE', null, token);
// Note
const createNote = (noteData: NoteInput, token: string) => fetchApi<NoteWithDetails>('/note', 'PUT', noteData, token);
const getNoteById = (noteId: number, token: string) => fetchApi<NoteWithDetails>(`/note/id/${noteId}`, 'GET', null, token);
const updateNote = (noteId: number, noteData: NoteInput, token: string) => fetchApi<NoteWithDetails>(`/note/id/${noteId}`, 'PATCH', noteData, token);
const deleteNote = (noteId: number, token: string) => fetchApi<{ message: string }>(`/note/id/${noteId}`, 'DELETE', null, token);
const getNotesByLogin = (login: string, token: string) => fetchApi<NoteWithDetails[]>(`/notes/by-login/${login}`, 'GET', null, token);
const searchNotes = (searchRequest: SearchRequest, token: string) => fetchApi<SearchResponse<NoteWithDetails>>("/notes/search", "POST", searchRequest, token);
// Signature Component
const createSignatureComponent = (data: CreateSignatureComponentInput, token: string) => fetchApi<SignatureComponent>('/signature/component', 'PUT', data, token);
const getAllSignatureComponents = (token: string) => fetchApi<SignatureComponent[]>('/signature/components', 'GET', null, token);
const getSignatureComponentById = (id: number, token: string) => fetchApi<SignatureComponent>(`/signature/component/${id}`, 'GET', null, token);
const updateSignatureComponent = (id: number, data: UpdateSignatureComponentInput, token: string) => fetchApi<SignatureComponent>(`/signature/component/${id}`, 'PATCH', data, token);
const deleteSignatureComponent = (id: number, token: string) => fetchApi<{ success: boolean }>(`/signature/component/${id}`, 'DELETE', null, token);
const reindexComponentElements = (id: number, token: string) => fetchApi<{ message: string, finalCount: number }>(`/signature/component/${id}/reindex`, 'POST', null, token);
// Signature Element
const createSignatureElement = (data: CreateSignatureElementInput, token: string) => fetchApi<SignatureElement>('/signature/element', 'PUT', data, token);
const getSignatureElementById = (id: number, populate: ('component' | 'parents')[] = [], token: string) => fetchApi<SignatureElement>(`/signature/element/${id}${populate.length ? `?populate=${populate.join(',')}` : ''}`, 'GET', null, token);
const updateSignatureElement = (id: number, data: UpdateSignatureElementInput, token: string) => fetchApi<SignatureElement>(`/signature/element/${id}`, 'PATCH', data, token);
const deleteSignatureElement = (id: number, token: string) => fetchApi<{ success: boolean }>(`/signature/element/${id}`, 'DELETE', null, token);
const getElementsByComponent = (componentId: number, token: string) => fetchApi<SignatureElement[]>(`/signature/component/${componentId}/elements/all`, 'GET', null, token); // Endpoint verified
const searchSignatureElements = (searchRequest: SearchRequest, token: string) => fetchApi<SearchResponse<SignatureElementSearchResult>>("/signature/elements/search", "POST", searchRequest, token);
// Archive Document
const createArchiveDocument = (data: CreateArchiveDocumentInput, token: string) => fetchApi<ArchiveDocument>('/archive/document', 'PUT', data, token);
const getArchiveDocumentById = (id: number, token: string) => fetchApi<ArchiveDocument>(`/archive/document/id/${id}`, 'GET', null, token);
const updateArchiveDocument = (id: number, data: UpdateArchiveDocumentInput, token: string) => fetchApi<ArchiveDocument>(`/archive/document/id/${id}`, 'PATCH', data, token);
const disableArchiveDocument = (id: number, token: string) => fetchApi<{ success: boolean }>(`/archive/document/id/${id}`, 'DELETE', null, token);
const searchArchiveDocuments = (searchRequest: SearchRequest, token: string) => fetchApi<SearchResponse<ArchiveDocumentSearchResult>>("/archive/documents/search", "POST", searchRequest, token);


export default {
    getApiStatus, pingApi, login, logout, register, getAllUsers, getUserByLogin,
    updateUserRole, changePassword, getConfig, setConfig, uploadSsl, generateSsl,
    searchLogs, createTag, getAllTags, getTagById, updateTag, deleteTag, createNote,
    getNoteById, updateNote, deleteNote, getNotesByLogin, searchNotes, createSignatureComponent,
    getAllSignatureComponents, getSignatureComponentById, updateSignatureComponent,
    deleteSignatureComponent, reindexComponentElements, createSignatureElement,
    getSignatureElementById, updateSignatureElement, deleteSignatureElement,
    getElementsByComponent, searchSignatureElements, createArchiveDocument,
    getArchiveDocumentById, updateArchiveDocument, disableArchiveDocument, searchArchiveDocuments,
};