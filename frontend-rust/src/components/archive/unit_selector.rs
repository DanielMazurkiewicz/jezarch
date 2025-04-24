use crate::{
    api::{ApiClient, ApiError}, // Use ApiError directly
    models::{SearchRequest, SearchCondition, SearchQueryElement, ArchiveDocument, ArchiveDocumentType, SortElement, SortDirection, SearchResponse, ArchiveDocumentSearchResult}, // Added ArchiveDocumentSearchResult
    components::loading_spinner,
};
use eframe::egui::{self, ComboBox, Response, Ui, Widget}; // Removed Id import
use serde::{Serialize, Deserialize}; // Needed for state persistence if used
use log; // Import log explicitly

// State stored in memory for the selector (Make it Serializable)
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
struct UnitSelectorState {
    available_units: Vec<ArchiveDocument>,
    is_loading: bool,
    error: Option<String>,
}

// --- Helper Types for Async Results ---
type FetchUnitsResult = Result<SearchResponse<ArchiveDocumentSearchResult>, ApiError>;
const FETCH_UNITS_RESULT_ID: egui::Id = egui::Id::new("unit_selector_fetch_units_result");


/// Widget for selecting a parent Archive Unit.
pub struct UnitSelectorWidget<'a> {
    selected_unit_id: &'a mut Option<i64>, // Use Option<i64>
    // ID of the current document being edited (to prevent selecting itself as parent)
    current_document_id: Option<i64>,
    api_client: &'a ApiClient,
    token: Option<&'a str>,
    id_source: egui::Id,
}

impl<'a> UnitSelectorWidget<'a> {
    pub fn new(
        selected_unit_id: &'a mut Option<i64>,
        id_source: impl std::hash::Hash,
        api_client: &'a ApiClient,
        token: Option<&'a str>,
    ) -> Self {
        Self {
            selected_unit_id,
            current_document_id: None,
            api_client,
            token,
            id_source: egui::Id::new(id_source),
        }
    }

    pub fn current_document_id(mut self, id: Option<i64>) -> Self {
        self.current_document_id = id;
        self
    }
}

impl<'a> Widget for UnitSelectorWidget<'a> {
    fn ui(self, ui: &mut Ui) -> Response {
        let mut selector_state = ui.memory_mut(|mem| {
             // Use temporary state unless persistence is truly needed for this dropdown's cache
            mem.data.get_temp_mut_or_default::<UnitSelectorState>(self.id_source).clone()
        });
        let current_doc_id = self.current_document_id; // Clone for processing result

        // --- Process Fetch Results ---
        if let Some(result) = ui.ctx().memory_mut(|mem| mem.data.remove::<FetchUnitsResult>(FETCH_UNITS_RESULT_ID)) {
             // Update state directly via memory
             ui.memory_mut(|mem| {
                 // get_temp_mut_or_default returns &mut T directly
                 let state = mem.data.get_temp_mut_or_default::<UnitSelectorState>(self.id_source);
                 state.is_loading = false;
                 match result {
                     Ok(units_results) => {
                         state.available_units = units_results.data.into_iter()
                             .map(|sr| sr.document)
                             .filter(|unit| unit.archive_document_id != current_doc_id)
                             .collect();
                         state.error = None;
                     },
                     Err(e) => {
                         state.error = Some(format!("Failed load units: {}", e));
                         state.available_units.clear();
                     }
                 }
             });
             // Re-read state after update
             selector_state = ui.memory_mut(|mem| mem.data.get_temp_mut_or_default::<UnitSelectorState>(self.id_source).clone());
        }


        // --- Fetch Units if needed ---
        let ctx = ui.ctx().clone();
        let api_client = self.api_client.clone();
        let token = self.token.map(String::from);
        //let id = self.id_source; // Not needed for direct state update
        //let current_doc_id = self.current_document_id; // Clone for async closure - already cloned

        if selector_state.available_units.is_empty() && !selector_state.is_loading {
            selector_state.is_loading = true;
            selector_state.error = None;

            tokio::spawn(async move {
                 let result: FetchUnitsResult = if let Some(t) = token {
                      let search_req = SearchRequest {
                           query: vec![SearchQueryElement {
                                field: "doc_type".to_string(), // Field name in model is doc_type
                                condition: SearchCondition::Eq,
                                value: serde_json::to_value(ArchiveDocumentType::Unit).unwrap_or_default(), // Serialize enum
                                not: false,
                           }],
                           page_size: 500,
                           sort: vec![SortElement { field: "title".to_string(), direction: SortDirection::Asc }],
                           ..Default::default() // Use default for the rest of SearchRequest
                      };
                      api_client.search_archive_documents(&search_req, &t).await
                 } else { Err(ApiError::MissingToken) };

                 // Store result in memory
                 ctx.memory_mut(|mem| mem.data.insert_temp(FETCH_UNITS_RESULT_ID, result));
                 ctx.request_repaint();
            });
             // Store updated loading state
             ui.memory_mut(|mem| mem.data.insert_temp(self.id_source, selector_state.clone()));
        }

        // --- ComboBox ---
        let selected_text = if selector_state.is_loading {
             "Loading units...".to_string()
        } else if let Some(err) = &selector_state.error {
             format!("Error: {}", err)
        } else {
            self.selected_unit_id
                .and_then(|id| selector_state.available_units.iter().find(|u| u.archive_document_id == Some(id)))
                .map(|u| u.title.clone())
                .unwrap_or_else(|| "Select parent unit...".to_string())
        };

        let combo_response = ComboBox::from_id_source(self.id_source.with("combo"))
            .selected_text(selected_text)
            .width(ui.available_width())
            .show_ui(ui, |ui| {
                 ui.style_mut().wrap_mode = Some(egui::TextWrapMode::Extend); // Use wrap_mode
                // Option to clear selection
                if ui.selectable_label(self.selected_unit_id.is_none(), "(No Parent)").clicked() {
                     *self.selected_unit_id = None;
                }
                 ui.separator();
                // List available units
                if selector_state.is_loading {
                     loading_spinner::show_spinner(ui, egui::vec2(16.0, 16.0)); // Use show_spinner directly
                } else {
                     for unit in &selector_state.available_units {
                         if let Some(id) = unit.archive_document_id {
                              if ui.selectable_value(self.selected_unit_id, Some(id), &unit.title).clicked() {
                                  // Value is updated automatically by selectable_value
                              }
                         }
                     }
                }
            });

         // Store state temporarily
         ui.memory_mut(|mem| mem.data.insert_temp(self.id_source, selector_state));


        combo_response.response // Return the inner egui::Response
    }
}

/// Convenience function to show the UnitSelectorWidget.
pub fn show_unit_selector<'a>(
    ui: &mut Ui,
    selected_unit_id: &'a mut Option<i64>,
    api_client: &'a ApiClient,
    token: Option<&'a str>,
    current_document_id: Option<i64>,
) -> Response {
    let id_source = ui.next_auto_id(); // Generate ID
    ui.add(
        UnitSelectorWidget::new(selected_unit_id, id_source, api_client, token)
            .current_document_id(current_document_id)
    )
}