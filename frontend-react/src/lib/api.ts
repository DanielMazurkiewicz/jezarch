// Import backend types with adjusted paths assuming sibling structure
import type {
    UserCredentials,
    User,
    UserRole,
} from "../../../backend/src/functionalities/user/models";
import type { Config, AppConfigKeys } from "../../../backend/src/functionalities/config/models";
import type { SslConfig } from "../../../backend/src/functionalities/config/ssl/models";
import type { LogEntry } from "../../../backend/src/functionalities/log/models";
import type { Tag } from "../../../backend/src/functionalities/tag/models";
// Import NoteWithDetails as well
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

// Added 'HEAD' to the allowed methods
type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

async function fetchApi<T>(
    endpoint: string,
    method: ApiMethod = "GET",
    body?: any,
    token?: string | null
): Promise<T> {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    };
    if (token) {
        headers["Authorization"] = token;
    }

    const config: RequestInit = {
        method,
        headers,
    };

    // Corrected check: Only add body for methods that typically have one
    if (body && !['GET', 'HEAD'].includes(method)) {
        config.body = JSON.stringify(body);
    }

    const url = `${API_BASE_URL}${endpoint}`;
    let response: Response;

    try {
        response = await fetch(url, config);
    } catch (networkError: any) {
        console.error("Network Error:", networkError);
        throw new Error(`Network error: ${networkError.message || 'Failed to connect to API'}`);
    }

    if (!response.ok) {
        let errorData = { message: `API request failed: ${response.status} ${response.statusText}` };
        try {
             const textResponse = await response.text();
             try {
                  const parsed = JSON.parse(textResponse);
                  if (typeof parsed === 'object' && parsed !== null && parsed.message) { errorData = parsed; }
                  else if (textResponse) { errorData = { message: textResponse }; }
             } catch (e) {
                  errorData = { message: textResponse || `API Error ${response.status}` };
             }
        } catch (e) { console.error("Failed to read error response body:", e); }
        console.error("API Error:", response.status, errorData);
        throw new Error(errorData.message || `API Error ${response.status}`);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
        // For DELETE or PATCH returning 204, return a success indicator or empty object
        return { success: true } as T; // Adjusted return type for void/204 responses
    }

    const contentType = response.headers.get('content-type');
    if (endpoint.endsWith('/api/ping') && contentType?.includes('text/plain')) {
        // Keep specific handling for text/plain endpoints like ping
        return await response.text() as T;
    }

    try {
        // Expect JSON for all other successful responses
        return await response.json() as T;
    } catch (jsonError: any) {
        console.error("JSON Parsing Error:", jsonError, "URL:", url, "Status:", response.status);
        let textForDebug = '(Could not read text response)';
        try { textForDebug = await response.text(); console.error("Response Text:", textForDebug); } catch { /* ignore */ }
        throw new Error(`Failed to parse API response: ${jsonError.message}. Response text: ${textForDebug}`);
    }
}


// --- API Function Exports ---
// API Status
const getApiStatus = () => fetchApi<{ message: string }>("/api/status");
const pingApi = () => fetchApi<string>("/api/ping");
// Auth
const login = (credentials: UserCredentials) => fetchApi<{ token: string; role: UserRole; login: string; userId?: number }>("/user/login", "POST", credentials);
const logout = (token: string) => fetchApi<{ success: boolean }>("/user/logout", "POST", null, token); // Expect success indicator
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
const createNote = (noteData: NoteInput, token: string) => fetchApi<NoteWithDetails>('/note', 'PUT', noteData, token); // Expect NoteWithDetails
const getNoteById = (noteId: number, token: string) => fetchApi<NoteWithDetails>(`/note/id/${noteId}`, 'GET', null, token); // Expect NoteWithDetails
const updateNote = (noteId: number, noteData: NoteInput, token: string) => fetchApi<NoteWithDetails>(`/note/id/${noteId}`, 'PATCH', noteData, token); // Expect NoteWithDetails
const deleteNote = (noteId: number, token: string) => fetchApi<{ message: string }>(`/note/id/${noteId}`, 'DELETE', null, token);
const getNotesByLogin = (login: string, token: string) => fetchApi<NoteWithDetails[]>(`/notes/by-login/${login}`, 'GET', null, token); // Expect NoteWithDetails[]
const searchNotes = (searchRequest: SearchRequest, token: string) => fetchApi<SearchResponse<NoteWithDetails>>("/notes/search", "POST", searchRequest, token); // Expect NoteWithDetails
// Signature Component
const createSignatureComponent = (data: CreateSignatureComponentInput, token: string) => fetchApi<SignatureComponent>('/signature/component', 'PUT', data, token);
const getAllSignatureComponents = (token: string) => fetchApi<SignatureComponent[]>('/signature/components', 'GET', null, token);
const getSignatureComponentById = (id: number, token: string) => fetchApi<SignatureComponent>(`/signature/component/${id}`, 'GET', null, token);
const updateSignatureComponent = (id: number, data: UpdateSignatureComponentInput, token: string) => fetchApi<SignatureComponent>(`/signature/component/${id}`, 'PATCH', data, token);
const deleteSignatureComponent = (id: number, token: string) => fetchApi<{ success: boolean }>(`/signature/component/${id}`, 'DELETE', null, token); // Expect success indicator
const reindexComponentElements = (id: number, token: string) => fetchApi<{ message: string, finalCount: number }>(`/signature/components/id/${id}/reindex`, 'POST', null, token);
// Signature Element
const createSignatureElement = (data: CreateSignatureElementInput, token: string) => fetchApi<SignatureElement>('/signature/element', 'PUT', data, token);
const getSignatureElementById = (id: number, populate: ('component' | 'parents')[] = [], token: string) => fetchApi<SignatureElement>(`/signature/element/${id}${populate.length ? `?populate=${populate.join(',')}` : ''}`, 'GET', null, token);
const updateSignatureElement = (id: number, data: UpdateSignatureElementInput, token: string) => fetchApi<SignatureElement>(`/signature/element/${id}`, 'PATCH', data, token);
const deleteSignatureElement = (id: number, token: string) => fetchApi<{ success: boolean }>(`/signature/element/${id}`, 'DELETE', null, token); // Expect success indicator
const getElementsByComponent = (componentId: number, token: string) => fetchApi<SignatureElement[]>(`/signature/components/id/${componentId}/elements/all`, 'GET', null, token);
const searchSignatureElements = (searchRequest: SearchRequest, token: string) => fetchApi<SearchResponse<SignatureElementSearchResult>>("/signature/elements/search", "POST", searchRequest, token);
// Archive Document
const createArchiveDocument = (data: CreateArchiveDocumentInput, token: string) => fetchApi<ArchiveDocument>('/archive/document', 'PUT', data, token);
const getArchiveDocumentById = (id: number, token: string) => fetchApi<ArchiveDocument>(`/archive/document/id/${id}`, 'GET', null, token);
const updateArchiveDocument = (id: number, data: UpdateArchiveDocumentInput, token: string) => fetchApi<ArchiveDocument>(`/archive/document/id/${id}`, 'PATCH', data, token);
const disableArchiveDocument = (id: number, token: string) => fetchApi<{ success: boolean }>(`/archive/document/id/${id}`, 'DELETE', null, token); // Expect success indicator
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