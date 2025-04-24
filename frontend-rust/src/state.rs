use crate::{auth::AuthState, views::AppView, models::*, api::ApiClient}; // Import ApiClient
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::{Arc, Mutex}}; // Import Arc, Mutex

const APP_NAME: &str = "jezarch_fe_rust";
const CONFIG_NAME: &str = "app_state";

/// Represents the overall mutable state of the application.
#[derive(Serialize, Deserialize)]
#[serde(default)]
pub struct AppState {
    pub auth: AuthState,
    pub current_view: AppView,
    pub current_component_id_viewing: Option<i64>,
    pub current_archive_unit_id_viewing: Option<i64>,

    // Caches for fetched data (Consider using Arc/Mutex if accessed across threads)
    #[serde(skip)] pub tags_cache: Option<Vec<Tag>>,
    #[serde(skip)] pub components_cache: Option<Vec<SignatureComponent>>,
    #[serde(skip)] pub notes_cache: Option<Vec<NoteWithDetails>>,
    #[serde(skip)] pub current_elements_cache: Option<Vec<SignatureElementSearchResult>>,

    // UI State - not serialized
    #[serde(skip)] pub ui_state: UiState,

    // Store ApiClient here (transient, not serialized)
    // Requires AppState to be Send+Sync, which needs careful handling of caches if they become shared
    #[serde(skip)] pub api_client: ApiClient,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            auth: AuthState::default(), current_view: AppView::default(),
            current_component_id_viewing: None, current_archive_unit_id_viewing: None,
            tags_cache: None, components_cache: None, notes_cache: None,
            current_elements_cache: None,
            ui_state: UiState::default(),
            api_client: ApiClient::new(), // Initialize ApiClient
        }
    }
}

// --- UI State (Not serialized) ---
#[derive(Debug, Default)]
pub struct UiState {
    pub global_error: Option<String>,
    pub login_form_state: LoginFormState,
    pub register_form_state: RegisterFormState,
    pub notes_view_state: NotesViewState,
    pub tags_view_state: TagsViewState,
    pub admin_view_state: AdminViewState,
    pub archive_view_state: ArchiveViewState, // Add Archive View state
    pub components_view_state: ComponentsViewState,
    pub elements_view_state: ElementsViewState,
}

// --- View Specific States ---
#[derive(Debug, Default, Clone)] pub struct LoginFormState { pub login: String, pub password: String, pub is_loading: bool, pub error: Option<String> }
#[derive(Debug, Default, Clone)] pub struct RegisterFormState { pub login: String, pub password: String, pub confirm_password: String, pub is_loading: bool, pub is_success: bool, pub error: Option<String> }
#[derive(Debug, Default, Clone)] pub struct NotesViewState { pub is_loading: bool, pub error: Option<String>, pub search_term: String, pub current_page: usize, pub total_pages: usize, pub editing_note_id: Option<i64>, pub is_editor_open: bool, pub previewing_note_id: Option<i64>, pub is_preview_open: bool, pub note_editor_state: NoteEditorState }
#[derive(Debug, Default, Clone)] pub struct TagsViewState { pub is_loading: bool, pub error: Option<String>, pub editing_tag_id: Option<i64>, pub is_form_open: bool, pub tag_editor_state: TagEditorState }
#[derive(Debug, Default, Clone)] pub struct ComponentsViewState { pub is_loading: bool, pub error: Option<String>, pub editing_component_id: Option<i64>, pub is_form_open: bool, pub component_editor_state: ComponentEditorState }
#[derive(Debug, Default, Clone)] pub struct ElementsViewState { pub is_loading: bool, pub error: Option<String>, pub editing_element_id: Option<i64>, pub is_form_open: bool, pub element_editor_state: ElementEditorState, pub current_page: usize, pub total_pages: usize, pub needs_refresh_after_delete: bool } // Added needs_refresh_after_delete
#[derive(Debug, Default, Clone)] pub struct AdminViewState { pub current_tab: AdminTab, pub user_management_state: UserManagementState, pub settings_state: SettingsState, pub ssl_state: SslFormState, pub logs_state: LogViewState }
#[derive(Debug, Clone, Default)] // Added Default derive
pub struct ArchiveViewState {
     pub is_loading: bool, // Loading documents list
     pub is_loading_parent: bool, // Loading parent unit info
     pub error: Option<String>,
     pub search_query: Vec<SearchQueryElement>, // Store current search query
     pub current_page: usize,
     pub total_pages: usize,
     pub documents_cache: Vec<ArchiveDocumentSearchResult>, // Cache for currently displayed items
     pub parent_unit_info: Option<ArchiveDocument>, // Details of the unit being viewed
     pub editing_document_id: Option<i64>,
     pub is_editor_open: bool,
     pub previewing_document_id: Option<i64>,
     pub is_preview_open: bool,
     pub archive_editor_state: ArchiveEditorState, // Embed editor state
     pub needs_refresh_after_disable: bool, // Added flag for refresh after disable
}

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, strum_macros::Display, strum_macros::EnumIter)]
pub enum AdminTab { #[default] Users, Settings, Ssl, Logs }
#[derive(Debug, Default, Clone)] pub struct UserManagementState { pub is_loading: bool, pub error: Option<String>, pub users: Vec<User> }
#[derive(Debug, Default, Clone)] pub struct SettingsState { pub is_loading: bool, pub is_saving: bool, pub error: Option<String>, pub form_data: SettingsFormData, pub has_loaded: bool, pub pending_saves: usize } // Add pending_saves
#[derive(Debug, Clone, Default)] pub struct SslFormState { pub key_pem: String, pub cert_pem: String, pub is_uploading: bool, pub upload_error: Option<String>, pub upload_success: bool, pub is_generating: bool, pub generate_error: Option<String>, pub generate_success: bool }
#[derive(Debug, Clone, Default)] pub struct LogViewState { pub logs: Vec<LogEntry>, pub is_loading: bool, pub error: Option<String>, pub current_page: usize, pub total_pages: usize }

// --- Editor State Structs ---
#[derive(Clone, Debug, Default)] pub struct TagEditorState { pub name: String, pub description: String, pub is_loading: bool, pub error: Option<String>, pub validation_errors: HashMap<String, String>, pub save_triggered: bool, }
#[derive(Clone, Debug, Default)] pub struct NoteEditorState { pub title: String, pub content: String, pub shared: bool, pub selected_tag_ids: Vec<i64>, pub is_loading: bool, pub error: Option<String>, pub validation_errors: HashMap<String, String>, pub save_triggered: bool, }
#[derive(Clone, Debug, Default)] pub struct ComponentEditorState { pub name: String, pub description: String, pub index_type: SignatureComponentIndexType, pub is_loading: bool, pub error: Option<String>, pub validation_errors: HashMap<String, String>, pub save_triggered: bool, }
#[derive(Clone, Debug, Default)] pub struct ElementEditorState { pub name: String, pub description: String, pub index: String, pub selected_parent_ids: Vec<i64>, pub is_loading: bool, pub is_fetching_details: bool, pub error: Option<String>, pub validation_errors: HashMap<String, String>, pub save_triggered: bool, }
#[derive(Debug, Clone, Default)] pub struct SettingsFormData { pub port: String, pub default_language: String, pub validation_errors: HashMap<String, String>, }
#[derive(Clone, Debug, Default)]
pub struct ArchiveEditorState {
    pub form_data: ArchiveDocumentFormData, // Embed the form data struct
    pub is_loading: bool, // Saving state
    pub is_fetching_details: bool, // Loading state for edit mode
    pub error: Option<String>,
    pub validation_errors: HashMap<String, String>,
    pub save_triggered: bool,
     // Cache for resolved signatures specific to this editor instance - Wrap in Arc<Mutex>
     pub resolved_signatures_cache: Arc<Mutex<HashMap<Vec<i64>, String>>>,
     // Store forced parent title if creating within a unit
     pub forced_parent_title: Option<String>,
}

// --- Archive Form Data --- (mirrors form fields)
#[derive(Clone, Debug, Default)]
pub struct ArchiveDocumentFormData {
     pub parent_unit_archive_document_id: Option<i64>,
     pub doc_type: ArchiveDocumentType, // Use model enum directly
     pub title: String,
     pub creator: String,
     pub creation_date: String,
     pub number_of_pages: String, // Use string for input flexibility
     pub document_type: String,
     pub dimensions: String,
     pub binding: String,
     pub condition: String,
     pub document_language: String,
     pub content_description: String,
     pub remarks: String,
     pub access_level: String,
     pub access_conditions: String,
     pub additional_information: String,
     pub related_documents_references: String,
     pub is_digitized: bool,
     pub digitized_version_link: String,
     pub selected_tag_ids: Vec<i64>,
     // Store signatures directly in form state for the SignatureSelector
     pub topographic_signatures: Vec<Vec<i64>>,
     pub descriptive_signatures: Vec<Vec<i64>>,
}

impl ArchiveDocumentFormData {
     // Helper to populate form data from an existing model (e.g., when editing)
     pub fn from_model(doc: &ArchiveDocument) -> Self {
         Self {
             parent_unit_archive_document_id: doc.parent_unit_archive_document_id,
             doc_type: doc.doc_type,
             title: doc.title.clone(),
             creator: doc.creator.clone(),
             creation_date: doc.creation_date.clone(),
             number_of_pages: doc.number_of_pages.map_or(String::new(), |n| n.to_string()),
             document_type: doc.document_type.clone().unwrap_or_default(),
             dimensions: doc.dimensions.clone().unwrap_or_default(),
             binding: doc.binding.clone().unwrap_or_default(),
             condition: doc.condition.clone().unwrap_or_default(),
             document_language: doc.document_language.clone().unwrap_or_default(),
             content_description: doc.content_description.clone().unwrap_or_default(),
             remarks: doc.remarks.clone().unwrap_or_default(),
             access_level: doc.access_level.clone().unwrap_or_default(),
             access_conditions: doc.access_conditions.clone().unwrap_or_default(),
             additional_information: doc.additional_information.clone().unwrap_or_default(),
             related_documents_references: doc.related_documents_references.clone().unwrap_or_default(),
             is_digitized: doc.is_digitized.unwrap_or(false),
             digitized_version_link: doc.digitized_version_link.clone().unwrap_or_default(),
             selected_tag_ids: doc.tags.iter().filter_map(|t| t.tag_id).collect(),
             topographic_signatures: doc.topographic_signature_element_ids.clone(),
             descriptive_signatures: doc.descriptive_signature_element_ids.clone(),
         }
     }
}


// --- Persistence Logic ---
impl AppState {
    /// Load only the serializable parts of the state.
    pub fn load() -> Result<Self, confy::ConfyError> {
        let loaded_state: AppStateSerializable = confy::load(APP_NAME, Some(CONFIG_NAME))?;
        Ok(AppState {
             auth: loaded_state.auth,
             current_view: loaded_state.current_view,
             current_component_id_viewing: loaded_state.current_component_id_viewing,
             current_archive_unit_id_viewing: loaded_state.current_archive_unit_id_viewing,
             ..Default::default() // Initialize non-serializable fields to default
        })
    }

    /// Save only the serializable parts of the state.
    pub fn save(&self) -> Result<(), confy::ConfyError> {
        let state_to_save = AppStateSerializable {
            auth: self.auth.clone(),
            current_view: self.current_view,
            current_component_id_viewing: self.current_component_id_viewing,
            current_archive_unit_id_viewing: self.current_archive_unit_id_viewing,
        };
        confy::store(APP_NAME, Some(CONFIG_NAME), state_to_save)
    }
}

/// A separate struct containing only the fields to be serialized/deserialized.
#[derive(Serialize, Deserialize, Default)]
struct AppStateSerializable {
    auth: AuthState,
    current_view: AppView,
    current_component_id_viewing: Option<i64>,
    current_archive_unit_id_viewing: Option<i64>,
}