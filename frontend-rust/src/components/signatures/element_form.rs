use crate::{
    state::{AppState, ElementEditorState}, // Assuming editor state is managed by the caller view
    api::{ApiClient, ApiError}, // Use ApiError directly
    models::{CreateSignatureElementInput, UpdateSignatureElementInput, SignatureComponent, SignatureElement}, // Import models directly
    components::{element_selector, form_utils, loading_spinner, error_display}, // Use crate::components
};
use eframe::egui::{self, Button, ScrollArea, TextEdit, Ui};
use log; // Import log explicitly

// --- Helper Types for Async Results ---
type SaveElementResult = Result<SignatureElement, ApiError>;
const SAVE_ELEMENT_RESULT_ID: egui::Id = egui::Id::new("save_element_result");

/// Renders the form for creating or editing a Signature Element.
pub fn show_element_form(
    ui: &mut Ui,
    editor_state: &mut ElementEditorState, // Holds form values, errors, loading state
    editing_element: Option<&SignatureElement>, // Pass original element for comparison on update
    parent_component: &SignatureComponent,
    api_client: ApiClient, // Cloned API client
    token: Option<String>, // Cloned token
    mut on_save: impl FnMut(Option<SignatureElement>), // Callback remains, but async will update state directly
) {
    let is_editing = editing_element.is_some();
    let ctx = ui.ctx().clone(); // Clone context for async task callback

    // --- Process Save Result ---
    if let Some(result) = ctx.memory_mut(|mem| mem.data.remove::<SaveElementResult>(SAVE_ELEMENT_RESULT_ID)) {
         editor_state.is_loading = false;
         editor_state.save_triggered = true; // Indicate save attempt processed
         match result {
             Ok(ref element) => {
                 editor_state.error = None;
                 on_save(Some(element.clone())); // Call original callback on success
             }
             Err(ref e) => {
                 editor_state.error = Some(format!("Save failed: {}", e));
                  on_save(None); // Call original callback on failure
             }
         }
     }


    let editing_element_id = editing_element.and_then(|el| el.signature_element_id);
    if is_editing && !editor_state.is_fetching_details && editor_state.selected_parent_ids.is_empty() {
        // TODO: Logic to fetch parents if needed when editing starts.
        log::warn!("Element form opened for editing, but parent IDs might not be fetched yet.");
    }

    // --- Form UI ---
    ScrollArea::vertical().max_height(ui.available_height() - 60.0).show(ui, |ui| {
         egui::Grid::new("element_form_grid")
            .num_columns(1)
            .spacing([10.0, 8.0])
            .show(ui, |ui| {
                 // Parent Component Info
                 ui.label("Component:");
                 ui.label(egui::RichText::new(&parent_component.name).strong());
                 ui.end_row();

                 // --- Name ---
                 ui.label("Name *");
                 let name_input = ui.add(TextEdit::singleline(&mut editor_state.name)
                     .desired_width(f32::INFINITY));
                 if name_input.changed() { validate_element_name(editor_state); }
                 form_utils::show_validation_error(ui, editor_state.validation_errors.get("name").map(|s| s.as_str()));
                 ui.end_row();

                 // --- Description ---
                 ui.label("Description");
                 ui.add(TextEdit::multiline(&mut editor_state.description)
                     .desired_rows(3)
                     .desired_width(f32::INFINITY));
                 ui.end_row();

                 // --- Index Override ---
                 ui.label("Index Override");
                 let index_hint = format!("Auto ({:?})", parent_component.index_type);
                 ui.add(TextEdit::singleline(&mut editor_state.index)
                     .hint_text(index_hint)
                     .desired_width(100.0));
                 form_utils::show_validation_error(ui, editor_state.validation_errors.get("index").map(|s| s.as_str()));
                 ui.end_row();

                 // --- Parent Selector ---
                 element_selector::show_element_selector(
                      ui,
                      &mut editor_state.selected_parent_ids,
                      &api_client,
                      token.as_deref(),
                      Some("Parent Elements (Optional)"),
                      parent_component.signature_component_id, // Pass Option<i64> directly
                      editing_element_id,
                 );
                 ui.end_row();
            });
     });

    ui.separator();

    // Display API errors from editor_state
    if let Some(err) = &editor_state.error {
        error_display::show_error_box(ui, err); // Use imported function directly
        ui.add_space(5.0);
    }

    // Action Buttons
    ui.horizontal(|ui| {
        let save_button_text = if is_editing { "Update Element" } else { "Create Element" };
        let save_button = Button::new(save_button_text);
        let can_save = editor_state.validation_errors.is_empty() && !editor_state.name.trim().is_empty();
        let api_client_clone = api_client.clone(); // Clone for async task

        if ui.add_enabled(!editor_state.is_loading && can_save, save_button).clicked() {
            log::info!("Save element triggered.");
            validate_element_name(editor_state);
            if editor_state.validation_errors.is_empty() {
                editor_state.is_loading = true;
                editor_state.error = None;
                 let element_id_to_save = editing_element_id;
                 let component_id = parent_component.signature_component_id.expect("Parent component ID missing in form"); // Expect ID here
                 let state_clone = editor_state.clone();
                 let token_clone = token.clone();
                 //let mut on_save_clone = on_save; // Closure no longer needed for success/failure handling

                 tokio::spawn(async move {
                     let result: SaveElementResult = trigger_element_save_request( // Explicit type annotation
                          element_id_to_save,
                          component_id,
                          state_clone,
                          api_client_clone, // Use cloned client
                          token_clone,
                     ).await;

                     // Store result in memory
                      ctx.memory_mut(|mem| mem.data.insert_temp(SAVE_ELEMENT_RESULT_ID, result));
                      ctx.request_repaint();
                 });
            }
        }

        if editor_state.is_loading {
            loading_spinner::show_spinner(ui, egui::vec2(16.0, 16.0));
        }
        // Cancel button is typically handled by the code opening the dialog/window
    });
}

// --- Validation Helpers ---
fn validate_element_name(state: &mut ElementEditorState) {
    if state.name.trim().is_empty() {
        state.validation_errors.insert("name".to_string(), "Name is required.".to_string());
    } else {
        state.validation_errors.remove("name");
    }
}

// --- Async Save Logic ---
async fn trigger_element_save_request(
    element_id: Option<i64>,
    component_id: i64,
    editor_state: ElementEditorState,
    api_client: ApiClient,
    token: Option<String>,
) -> Result<SignatureElement, ApiError> {
     let token = token.ok_or(ApiError::MissingToken)?;

     log::info!("Saving element request: ID {:?}, Name: {}", element_id, editor_state.name);

     if let Some(id) = element_id {
          let update_data = UpdateSignatureElementInput {
               name: Some(editor_state.name),
               description: Some(if editor_state.description.is_empty() { None } else { Some(editor_state.description) }),
               index: Some(if editor_state.index.is_empty() { None } else { Some(editor_state.index) }),
               parent_ids: Some(editor_state.selected_parent_ids),
          };
          api_client.update_signature_element(id, &update_data, &token).await
     } else {
          let create_data = CreateSignatureElementInput {
               signature_component_id: component_id,
               name: editor_state.name,
               description: if editor_state.description.is_empty() { None } else { Some(editor_state.description) },
               index: if editor_state.index.is_empty() { None } else { Some(editor_state.index) },
               parent_ids: editor_state.selected_parent_ids,
          };
          api_client.create_signature_element(&create_data, &token).await
     }
}