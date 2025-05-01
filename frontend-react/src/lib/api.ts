// Import backend types with adjusted paths assuming sibling structure
import type {
    UserCredentials,
    User, // User now includes assignedTags?
    UserRole,
} from "../../../backend/src/functionalities/user/models";
import type { Config, AppConfigKeys } from "../../../backend/src/functionalities/config/models";
import type { SslConfig } from "../../../backend/src/functionalities/config/ssl/models";
import type { LogEntry } from "../../../backend/src/functionalities/log/models";
import type { Tag } from "../../../backend/src/functionalities/tag/models";
import type { Note, NoteInput, NoteWithDetails } from "../../../backend/src/functionalities/note/models";
import type {
    SignatureComponent,
    CreateSignatureComponentInput,
    UpdateSignatureComponentInput,
} from "../../../backend/src/functionalities/signature/component/models";
import type {
    SignatureElement,
    CreateSignatureElementInput,
    UpdateSignatureElementInput,
    SignatureElementSearchResult,
} from "../../../backend/src/functionalities/signature/element/models";
import type {
    ArchiveDocument,
    CreateArchiveDocumentInput,
    UpdateArchiveDocumentInput,
    ArchiveDocumentSearchResult,
} from "../../../backend/src/functionalities/archive/document/models";

import type { SearchRequest, SearchResponse } from "../../../backend/src/utils/search";


const API_BASE_URL = "/api";

type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

// --- Updated fetchApi to handle Blob responses ---
async function fetchApi<T>(
    endpoint: string,
    method: ApiMethod = "GET",
    body?: any,
    token?: string | null,
    options: { expectBlob?: boolean } = {} // Added options object
): Promise<T> {
    const headers: HeadersInit = {};
    // Default to JSON unless it's FormData or expectBlob is true
    if (!(body instanceof FormData) && !options.expectBlob) {
        headers["Content-Type"] = "application/json";
        headers["Accept"] = "application/json";
    } else if (options.expectBlob) {
        headers["Accept"] = 'application/vnd.sqlite3, application/octet-stream, */*'; // Accept blob types
    }
    // Note: 'Content-Type' for FormData is set automatically by the browser

    if (token) {
        headers["Authorization"] = token;
    }

    const config: RequestInit = {
        method,
        headers,
    };

    if (body && !['GET', 'HEAD'].includes(method)) {
        if (body instanceof FormData) {
             config.body = body; // Send FormData directly
         } else {
             config.body = JSON.stringify(body);
        }
    }

    const url = `${API_BASE_URL}${endpoint}`;
    let response: Response;

    try {
        console.log(`fetchApi: Requesting ${method} ${url}`); // Log request initiation
        response = await fetch(url, config);
         console.log(`fetchApi: Received response for ${url} - Status: ${response.status}, OK: ${response.ok}`); // Log response status
    } catch (networkError: any) {
        console.error(`fetchApi: Network Error for ${url}:`, networkError); // Log network errors
        throw new Error(`Network error: ${networkError.message || 'Failed to connect to API'}`);
    }

    if (!response.ok) {
        let errorData: any = { message: `API request failed: ${response.status} ${response.statusText}` };
        let errorText = '(Failed to read error body)';
        try {
             errorText = await response.text(); // Try to get error text
             console.warn(`fetchApi: Error Response Text for ${url}:`, errorText); // Log raw error text
             try {
                  const parsed = JSON.parse(errorText);
                  if (typeof parsed === 'object' && parsed !== null && typeof parsed.message === 'string' && parsed.message.length > 0) {
                      errorData = { ...parsed, message: parsed.message, errors: parsed.errors };
                  } else if (errorText.trim().length > 0) {
                     errorData = { message: errorText.trim() };
                  }
             } catch (e) { // JSON parsing failed, use raw text if not empty
                  if (errorText.trim().length > 0) {
                      errorData = { message: errorText.trim() };
                  }
             }
        } catch (e) { console.error(`fetchApi: Failed to read error response body for ${url}:`, e); }
        console.error(`fetchApi: API Error for ${url}:`, response.status, errorData); // Log structured error data
        const errorToThrow = new Error(errorData.message || `API Error ${response.status}`);
        if (errorData.errors) {
            (errorToThrow as any).errors = errorData.errors;
        }
        throw errorToThrow;
    }

    // Handle Blob response specifically
    if (options.expectBlob) {
         console.log(`fetchApi: Handling response as Blob for ${url}`);
        // Return the blob directly, assuming T is Blob
        return response.blob() as Promise<T>;
    }

    // Handle No Content response
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        console.log(`fetchApi: Handling 204 No Content for ${url}`);
        return { success: true } as T;
    }

    // --- Log Raw Text Response BEFORE parsing JSON ---
    let responseText: string | null = null;
    try {
        responseText = await response.text();
        console.log(`fetchApi: Raw Response Text for ${url}:`, responseText); // Log the raw text
    } catch (textError) {
        console.error(`fetchApi: Failed to read response text for ${url}:`, textError);
        throw new Error("Failed to read API response text.");
    }
    // --- End Logging Raw Text ---

    // Handle specific text/plain endpoint
    const contentType = response.headers.get('content-type');
    if (endpoint.endsWith('/api/ping') && contentType?.includes('text/plain')) {
        console.log(`fetchApi: Handling response as text/plain for ${url}`);
        return responseText as T; // Use the text already read
    }

    // Default: Attempt to parse JSON from the logged text
    try {
        const jsonData = JSON.parse(responseText); // Parse the text we already read
        console.log(`fetchApi: Parsed JSON for ${url}:`, jsonData); // Log parsed JSON
        return jsonData as T;
    } catch (jsonError: any) {
        console.error("fetchApi: JSON Parsing Error:", jsonError, "URL:", url, "Status:", response.status);
        // Log the raw text again in case of parsing error
        console.error("fetchApi: Raw text that failed to parse:", responseText);
        throw new Error(`Failed to parse API response: ${jsonError.message}.`);
    }
}


// --- Specific Type for getConfig Response ---
type GetConfigResponse<K extends AppConfigKeys> = {
    [key in K]: string | null;
};


// --- API Function Exports (Remaining unchanged from previous step) ---
// API Status
const getApiStatus = () => fetchApi<{ message: string }>("/api/status");
const pingApi = () => fetchApi<string>("/api/ping");
// Auth
const login = (credentials: UserCredentials) => fetchApi<{ token: string } & Omit<User, 'password'>>("/user/login", "POST", credentials);
const logout = (token: string) => fetchApi<{ success: boolean }>("/user/logout", "POST", null, token);
const register = (userData: UserCredentials) => fetchApi<Omit<User, 'password'>>("/user/create", "POST", userData);
// User
const getAllUsers = (token: string) => fetchApi<Omit<User, "password">[]>("/users/all", "GET", null, token);
const getUserByLogin = (login: string, token: string) => fetchApi<Omit<User, "password">>(`/user/by-login/${login}`, "GET", null, token);
const updateUserRole = (login: string, role: UserRole | null, token: string) => fetchApi<{ message: string }>(`/user/by-login/${login}`, "PATCH", { role }, token);
const changePassword = (passwords: { oldPassword: string; password: string; }, token: string) => fetchApi<{ success: boolean }>("/user/change-password", "POST", passwords, token);
const adminSetUserPassword = (login: string, password: string, token: string) => fetchApi<{ success: boolean }>(`/user/by-login/${login}/set-password`, "PATCH", { password }, token);
const getAssignedTagsForUser = (login: string, token: string) => fetchApi<Tag[]>(`/user/by-login/${login}/tags`, "GET", null, token);
const assignTagsToUser = (login: string, tagIds: number[], token: string) => fetchApi<Tag[]>(`/user/by-login/${login}/tags`, "PUT", { tagIds }, token);
// Config
const getConfig = <K extends AppConfigKeys>(key: K, token: string) => fetchApi<GetConfigResponse<K>>(`/configs/${key}`, "GET", null, token);
const setConfig = (key: AppConfigKeys, value: string, token: string) => fetchApi<{ message: string }>(`/configs/${key}`, "PUT", { value }, token);
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
const reindexComponentElements = (id: number, token: string) => fetchApi<{ message: string, finalCount: number }>(`/signature/components/id/${id}/reindex`, 'POST', null, token);
// Signature Element
const createSignatureElement = (data: CreateSignatureElementInput, token: string) => fetchApi<SignatureElement>('/signature/element', 'PUT', data, token);
const getSignatureElementById = (id: number, populate: ('component' | 'parents')[] = [], token: string) => fetchApi<SignatureElement>(`/signature/element/${id}${populate.length ? `?populate=${populate.join(',')}` : ''}`, 'GET', null, token);
const updateSignatureElement = (id: number, data: UpdateSignatureElementInput, token: string) => fetchApi<SignatureElement>(`/signature/element/${id}`, 'PATCH', data, token);
const deleteSignatureElement = (id: number, token: string) => fetchApi<{ success: boolean }>(`/signature/element/${id}`, 'DELETE', null, token);
const getElementsByComponent = (componentId: number, token: string) => fetchApi<SignatureElement[]>(`/signature/components/id/${componentId}/elements/all`, 'GET', null, token);
const searchSignatureElements = (searchRequest: SearchRequest, token: string) => fetchApi<SearchResponse<SignatureElementSearchResult>>("/signature/elements/search", "POST", searchRequest, token);
// Archive Document
const createArchiveDocument = (data: CreateArchiveDocumentInput, token: string) => fetchApi<ArchiveDocument>('/archive/document', 'PUT', data, token);
const getArchiveDocumentById = (id: number, token: string) => fetchApi<ArchiveDocument>(`/archive/document/id/${id}`, 'GET', null, token);
const updateArchiveDocument = (id: number, data: UpdateArchiveDocumentInput, token: string) => fetchApi<ArchiveDocument>(`/archive/document/id/${id}`, 'PATCH', data, token);
const disableArchiveDocument = (id: number, token: string) => fetchApi<{ success: boolean }>(`/archive/document/id/${id}`, 'DELETE', null, token);
const searchArchiveDocuments = (searchRequest: SearchRequest, token: string) => fetchApi<SearchResponse<ArchiveDocumentSearchResult>>("/archive/documents/search", "POST", searchRequest, token);
// Admin DB Functions
const backupDatabase = (token: string) => fetchApi<Blob>("/admin/db/backup", "GET", null, token, { expectBlob: true });

export default {
    getApiStatus, pingApi, login, logout, register, getAllUsers, getUserByLogin,
    updateUserRole, changePassword, adminSetUserPassword,
    getAssignedTagsForUser, assignTagsToUser,
    getConfig, setConfig, uploadSsl, generateSsl, searchLogs, createTag, getAllTags,
    getTagById, updateTag, deleteTag, createNote, getNoteById, updateNote,
    deleteNote, getNotesByLogin, searchNotes, createSignatureComponent,
    getAllSignatureComponents, getSignatureComponentById, updateSignatureComponent,
    deleteSignatureComponent, reindexComponentElements, createSignatureElement,
    getSignatureElementById, updateSignatureElement, deleteSignatureElement,
    getElementsByComponent, searchSignatureElements, createArchiveDocument,
    getArchiveDocumentById, updateArchiveDocument, disableArchiveDocument, searchArchiveDocuments,
    backupDatabase,
};