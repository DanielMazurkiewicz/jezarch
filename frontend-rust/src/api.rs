use crate::models::*;
use reqwest::{Client, Method, Response, StatusCode}; // Removed unused RequestBuilder
use serde::de::DeserializeOwned;
use serde::{Serialize, Deserialize}; // Import Deserialize trait
use thiserror::Error;
use url::Url;
use log; // Import log crate explicitly

const API_BASE_URL: &str = "http://localhost:8080/api";

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    #[error("API error: {status} - {message}")]
    Api { status: StatusCode, message: String },
    #[error("URL parsing error: {0}")]
    UrlParse(#[from] url::ParseError),
    #[error("JSON serialization error: {0}")]
    Serialize(#[from] serde_json::Error),
    #[error("Invalid response format: {0}")]
    InvalidFormat(String),
    #[error("Authentication token is missing")]
    MissingToken,
}

#[derive(Clone)]
pub struct ApiClient {
    client: Client,
    base_url: Url,
    // Removed token storage - token is passed per request
}

impl ApiClient {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            base_url: Url::parse(API_BASE_URL).expect("Failed to parse hardcoded base URL"),
        }
    }

    // --- Public methods ---

    // pub fn set_token(&mut self, token: Option<String>) { self.token = token; }
    // pub fn clear_token(&mut self) { self.token = None; }
    // pub fn has_token(&self) -> bool { self.token.is_some() }

    fn build_url(&self, endpoint: &str) -> Result<Url, ApiError> {
        self.base_url.join(endpoint.trim_start_matches('/'))
            .map_err(ApiError::UrlParse)
    }

    async fn send_request<T: DeserializeOwned + Default>(
        &self,
        method: Method,
        endpoint: &str,
        body: Option<&impl Serialize>,
        token: Option<&str>, // Accept token per request
    ) -> Result<T, ApiError> {
        let url = self.build_url(endpoint)?;
        log::debug!("Sending API request: {} {}", method, url);

        let mut request_builder = self.client.request(method.clone(), url);

        // Apply token if provided
        if let Some(auth_token) = token {
            request_builder = request_builder.bearer_auth(auth_token);
        }
        // else if let Some(self_token) = &self.token { // Fallback to internal token if needed (removed for now)
        //     request_builder = request_builder.bearer_auth(self_token);
        // }

        // Set common headers
        request_builder = request_builder.header("Accept", "application/json");

        // Add body and Content-Type header for relevant methods
        if method != Method::GET && method != Method::HEAD {
            if let Some(body_data) = body {
                // Log body only in trace level
                log::trace!("Request body: {:?}", serde_json::to_string(body_data));
                request_builder = request_builder.header("Content-Type", "application/json").json(body_data);
            }
        }

        // Send request and handle response
        let response = request_builder.send().await.map_err(ApiError::Network)?;
        Self::handle_response(response).await
    }

    async fn handle_response<T: DeserializeOwned + Default>(response: Response) -> Result<T, ApiError> {
        let status = response.status();
        log::debug!("Received API response status: {}", status);

        if status.is_success() {
            if status == StatusCode::NO_CONTENT {
                // Return default value for T when response is 204 No Content
                Ok(T::default())
            } else {
                let text = response.text().await.map_err(ApiError::Network)?;
                log::trace!("Successful response body text: {}", text);
                // Handle potentially empty success bodies by returning default T
                if text.is_empty() {
                    Ok(T::default())
                } else {
                    serde_json::from_str(&text)
                        .map_err(|e| ApiError::InvalidFormat(format!("JSON Parse Error: {}, Body: '{}'", e, text)))
                }
            }
        } else {
            // Attempt to read error body, provide fallback message if reading fails
            let error_text = response.text().await.unwrap_or_else(|_| "Failed to read error body".to_string());
            log::error!("API Error Response Body: {}", error_text);

            // Try to parse structured error message, fallback to raw text or status reason
            let message = serde_json::from_str::<serde_json::Value>(&error_text)
                .ok() // Convert Result to Option
                .and_then(|json_value| json_value.get("message").cloned()) // Get optional "message" field
                .and_then(|msg_value| msg_value.as_str().map(String::from)) // Convert to Option<String> if it's a string
                .unwrap_or_else(|| {
                    if !error_text.is_empty() {
                        error_text // Use raw error text if available
                    } else {
                        status.canonical_reason().unwrap_or("Unknown API error").to_string() // Fallback to status reason
                    }
                });

            Err(ApiError::Api { status, message })
        }
    }

    // --- API Function Implementations (Pass token explicitly) ---

    // Auth
    pub async fn login(&self, credentials: &UserCredentials) -> Result<AuthResponse, ApiError> {
        self.send_request(Method::POST, "/user/login", Some(credentials), None).await
    }

    pub async fn logout(&self, token: &str) -> Result<GenericSuccessResponse, ApiError> {
        self.send_request(Method::POST, "/user/logout", None::<&()>, Some(token)).await
    }

    pub async fn register(&self, user_data: &UserCredentials) -> Result<GenericMessageResponse, ApiError> {
        self.send_request(Method::POST, "/user/create", Some(user_data), None).await
    }

    // Users
    pub async fn get_all_users(&self, token: &str) -> Result<Vec<User>, ApiError> {
        self.send_request(Method::GET, "/users/all", None::<&()>, Some(token)).await
    }

    pub async fn update_user_role(&self, login: &str, role: UserRole, token: &str) -> Result<GenericMessageResponse, ApiError> {
        #[derive(Serialize)] struct RoleUpdate { role: UserRole }
        self.send_request(Method::PATCH, &format!("/user/by-login/{}", login), Some(&RoleUpdate { role }), Some(token)).await
    }

    // Tags
    pub async fn create_tag(&self, tag_data: &TagInput, token: &str) -> Result<Tag, ApiError> {
        self.send_request(Method::PUT, "/tag", Some(tag_data), Some(token)).await
    }

    pub async fn get_all_tags(&self, token: &str) -> Result<Vec<Tag>, ApiError> {
        self.send_request(Method::GET, "/tags", None::<&()>, Some(token)).await
    }

    pub async fn get_tag_by_id(&self, tag_id: i64, token: &str) -> Result<Tag, ApiError> {
        self.send_request(Method::GET, &format!("/tag/id/{}", tag_id), None::<&()>, Some(token)).await
    }

    pub async fn update_tag(&self, tag_id: i64, tag_data: &TagInput, token: &str) -> Result<Tag, ApiError> {
        self.send_request(Method::PATCH, &format!("/tag/id/{}", tag_id), Some(tag_data), Some(token)).await
    }

    pub async fn delete_tag(&self, tag_id: i64, token: &str) -> Result<GenericMessageResponse, ApiError> {
        self.send_request(Method::DELETE, &format!("/tag/id/{}", tag_id), None::<&()>, Some(token)).await
    }

    // Notes
    pub async fn create_note(&self, note_data: &NoteInput, token: &str) -> Result<NoteWithDetails, ApiError> {
        self.send_request(Method::PUT, "/note", Some(note_data), Some(token)).await
    }

    pub async fn get_note_by_id(&self, note_id: i64, token: &str) -> Result<NoteWithDetails, ApiError> {
        self.send_request(Method::GET, &format!("/note/id/{}", note_id), None::<&()>, Some(token)).await
    }

    pub async fn update_note(&self, note_id: i64, note_data: &NoteInput, token: &str) -> Result<NoteWithDetails, ApiError> {
        self.send_request(Method::PATCH, &format!("/note/id/{}", note_id), Some(note_data), Some(token)).await
    }

    pub async fn delete_note(&self, note_id: i64, token: &str) -> Result<GenericMessageResponse, ApiError> {
        self.send_request(Method::DELETE, &format!("/note/id/{}", note_id), None::<&()>, Some(token)).await
    }

    pub async fn search_notes(&self, search_req: &SearchRequest, token: &str) -> Result<SearchResponse<NoteWithDetails>, ApiError> {
        self.send_request(Method::POST, "/notes/search", Some(search_req), Some(token)).await
    }

    // Signature Components
    pub async fn create_signature_component(&self, data: &CreateSignatureComponentInput, token: &str) -> Result<SignatureComponent, ApiError> {
        self.send_request(Method::PUT, "/signature/component", Some(data), Some(token)).await
    }

    pub async fn get_all_signature_components(&self, token: &str) -> Result<Vec<SignatureComponent>, ApiError> {
        self.send_request(Method::GET, "/signature/components", None::<&()>, Some(token)).await
    }

    pub async fn get_signature_component_by_id(&self, id: i64, token: &str) -> Result<SignatureComponent, ApiError> {
        self.send_request(Method::GET, &format!("/signature/component/{}", id), None::<&()>, Some(token)).await
    }

    pub async fn update_signature_component(&self, id: i64, data: &UpdateSignatureComponentInput, token: &str) -> Result<SignatureComponent, ApiError> {
        self.send_request(Method::PATCH, &format!("/signature/component/{}", id), Some(data), Some(token)).await
    }

    pub async fn delete_signature_component(&self, id: i64, token: &str) -> Result<GenericSuccessResponse, ApiError> {
        self.send_request(Method::DELETE, &format!("/signature/component/{}", id), None::<&()>, Some(token)).await
    }

    pub async fn reindex_component_elements(&self, id: i64, token: &str) -> Result<ReindexResponse, ApiError> {
        self.send_request(Method::POST, &format!("/signature/components/id/{}/reindex", id), None::<&()>, Some(token)).await
    }

    // Signature Elements
    pub async fn create_signature_element(&self, data: &CreateSignatureElementInput, token: &str) -> Result<SignatureElement, ApiError> {
        self.send_request(Method::PUT, "/signature/element", Some(data), Some(token)).await
    }

    pub async fn get_signature_element_by_id(&self, id: i64, populate: &[&str], token: &str) -> Result<SignatureElement, ApiError> {
        let query = if populate.is_empty() { "".to_string() } else { format!("?populate={}", populate.join(",")) };
        self.send_request(Method::GET, &format!("/signature/element/{}{}", id, query), None::<&()>, Some(token)).await
    }

    pub async fn update_signature_element(&self, id: i64, data: &UpdateSignatureElementInput, token: &str) -> Result<SignatureElement, ApiError> {
        self.send_request(Method::PATCH, &format!("/signature/element/{}", id), Some(data), Some(token)).await
    }

    pub async fn delete_signature_element(&self, id: i64, token: &str) -> Result<GenericSuccessResponse, ApiError> {
        self.send_request(Method::DELETE, &format!("/signature/element/{}", id), None::<&()>, Some(token)).await
    }

    pub async fn get_elements_by_component(&self, component_id: i64, token: &str) -> Result<Vec<SignatureElement>, ApiError> {
        self.send_request(Method::GET, &format!("/signature/components/id/{}/elements/all", component_id), None::<&()>, Some(token)).await
    }

    pub async fn search_signature_elements(&self, search_req: &SearchRequest, token: &str) -> Result<SearchResponse<SignatureElementSearchResult>, ApiError> {
        self.send_request(Method::POST, "/signature/elements/search", Some(search_req), Some(token)).await
    }

    // Archive Documents
    pub async fn create_archive_document(&self, data: &CreateArchiveDocumentInput, token: &str) -> Result<ArchiveDocument, ApiError> {
        self.send_request(Method::PUT, "/archive/document", Some(data), Some(token)).await
    }

    pub async fn get_archive_document_by_id(&self, id: i64, token: &str) -> Result<ArchiveDocument, ApiError> {
        self.send_request(Method::GET, &format!("/archive/document/id/{}", id), None::<&()>, Some(token)).await
    }

    pub async fn update_archive_document(&self, id: i64, data: &UpdateArchiveDocumentInput, token: &str) -> Result<ArchiveDocument, ApiError> {
        self.send_request(Method::PATCH, &format!("/archive/document/id/{}", id), Some(data), Some(token)).await
    }

    pub async fn disable_archive_document(&self, id: i64, token: &str) -> Result<GenericSuccessResponse, ApiError> {
        self.send_request(Method::DELETE, &format!("/archive/document/id/{}", id), None::<&()>, Some(token)).await
    }

    pub async fn search_archive_documents(&self, search_req: &SearchRequest, token: &str) -> Result<SearchResponse<ArchiveDocumentSearchResult>, ApiError> {
        self.send_request(Method::POST, "/archive/documents/search", Some(search_req), Some(token)).await
    }

    // Admin / Config / Logs
    pub async fn get_all_configs(&self, token: &str) -> Result<AppConfig, ApiError> {
        self.send_request(Method::GET, "/configs", None::<&()>, Some(token)).await
    }

    pub async fn update_config(&self, key: AppConfigKey, value: &str, token: &str) -> Result<GenericMessageResponse, ApiError> {
        // Use strum's Display trait for SCREAMING_SNAKE_CASE conversion
        let endpoint = format!("/configs/{}", key);
        #[derive(Serialize)] struct ConfigUpdate<'a> { key: AppConfigKey, value: &'a str }
        self.send_request(Method::PUT, &endpoint, Some(&ConfigUpdate { key, value }), Some(token)).await
    }

    pub async fn upload_ssl(&self, ssl_config: &SslConfig, token: &str) -> Result<GenericMessageResponse, ApiError> {
        self.send_request(Method::PUT, "/config/ssl/upload", Some(ssl_config), Some(token)).await
    }

    pub async fn generate_ssl(&self, token: &str) -> Result<GenericMessageResponse, ApiError> {
        self.send_request(Method::POST, "/config/ssl/generate", None::<&()>, Some(token)).await
    }

    pub async fn search_logs(&self, search_req: &SearchRequest, token: &str) -> Result<SearchResponse<LogEntry>, ApiError> {
        self.send_request(Method::POST, "/logs/search", Some(search_req), Some(token)).await
    }
}

// Generic response types - Added Deserialize + Default where appropriate
#[derive(Debug, Clone, Deserialize, Default)] pub struct GenericSuccessResponse { #[serde(default)] pub success: bool }
#[derive(Debug, Clone, Deserialize, Default)] pub struct GenericMessageResponse { #[serde(default)] pub message: String }
#[derive(Debug, Clone, Deserialize, Default)] #[serde(rename_all = "camelCase")] pub struct ReindexResponse { #[serde(default)] pub message: String, #[serde(default)] pub final_count: i32 }