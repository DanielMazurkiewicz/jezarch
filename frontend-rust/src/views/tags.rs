use crate::{
    state::{AppState, TagsViewState, TagEditorState}, // Import TagEditorState from state
    api::{ApiClient, ApiError}, // Import ApiError
    components::{self, form_utils},
    models::*, // Import models directly
};
use eframe::egui::{self, Ui};
use log; // Import log explicitly

// --- Helper types for async results stored in memory ---
type FetchTagsResult = Result<Vec<Tag>, ApiError>;
type SaveTagResult = Result<Tag, ApiError>;
type DeleteTagResult = Result<GenericMessageResponse, ApiError>; // Assuming delete returns GenericMessageResponse

// --- Unique IDs for memory storage ---
const FETCH_TAGS_RESULT_ID: egui::Id = egui::Id::new("fetch_tags_result");
const SAVE_TAG_RESULT_ID: egui::Id = egui::Id::new("save_tag_result");
const DELETE_TAG_RESULT_ID_BASE: &str = "delete_tag_result_";


// --- Tags View ---
pub fn show_tags_view(state: &mut AppState, api_client: &ApiClient, ui: &mut Ui) {
    let view_state = &mut state.ui_state.tags_view_state;
    let is_admin = state.auth.user_role() == Some(UserRole::Admin);
    let api_client_clone = api_client.clone(); // Clone for closures/async tasks
    let ctx_clone = ui.ctx().clone();

    // --- Process Async Results ---
    // Process Fetch Result
    if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<FetchTagsResult>(FETCH_TAGS_RESULT_ID)) {
        view_state.is_loading = false;
        match result {
            Ok(tags) => {
                log::info!("Fetched {} tags successfully.", tags.len());
                let mut sorted_tags = tags;
                sorted_tags.sort_by(|a, b| a.name.cmp(&b.name));
                state.tags_cache = Some(sorted_tags);
                view_state.error = None;
            }
            Err(err) => {
                log::error!("Failed to fetch tags: {}", err);
                view_state.error = Some(format!("Failed to fetch tags: {}", err));
                state.tags_cache = None;
            }
        }
    }

    // Process Save Result
    if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<SaveTagResult>(SAVE_TAG_RESULT_ID)) {
        match result {
            Ok(saved_tag) => {
                log::info!("Tag saved successfully: ID {:?}", saved_tag.tag_id);
                view_state.tag_editor_state.error = None;
                view_state.tag_editor_state.is_loading = false;
                // Refresh handled by save_triggered flag below
            }
            Err(err) => {
                log::error!("Failed to save tag: {}", err);
                view_state.tag_editor_state.error = Some(format!("Save failed: {}", err));
                view_state.tag_editor_state.is_loading = false;
                view_state.tag_editor_state.save_triggered = false; // Reset trigger on error
            }
        }
    }

    // Process Delete Result (Check flag, then maybe result in memory if needed)
    if let Some(deleted_id) = ctx_clone.memory_mut(|mem| mem.data.remove::<i64>("tag_deleted_id_flag")) {
        let delete_result_id = egui::Id::new(DELETE_TAG_RESULT_ID_BASE).with(deleted_id);
        if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<DeleteTagResult>(delete_result_id)) {
            match result {
                Ok(_) => {
                    log::info!("Tag {} deleted successfully.", deleted_id);
                    components::error_display::show_error_toast(&ctx_clone, "Tag deleted.");
                    // Trigger refresh
                    trigger_tags_fetch(state, api_client_clone.clone(), ctx_clone.clone());
                }
                Err(e) => {
                    log::error!("Failed to delete tag {}: {}", deleted_id, e);
                    let err_msg = format!("Failed to delete tag: {}", e);
                    view_state.error = Some(err_msg.clone());
                    view_state.is_loading = false; // Stop loading on error
                    components::error_display::show_error_toast(&ctx_clone, &err_msg);
                }
            }
        } else {
             // Result not ready, or deleted successfully and refresh triggered. Reset loading if needed.
             view_state.is_loading = false;
        }
    }


    // Header and Create Button
    ui.horizontal(|ui| {
        ui.heading("Manage Tags");
        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
            if is_admin { // Simplified check for button display
                if ui.button("➕ Create Tag").clicked() {
                    view_state.editing_tag_id = None;
                    view_state.tag_editor_state = Default::default();
                    view_state.is_form_open = true;
                }
            }
        });
    });
    ui.label("Organize your notes and documents using tags.");
    ui.separator();
    ui.add_space(10.0);

    // --- Fetch Tags if needed ---
    // Borrow immutably first for checks
    let should_fetch = state.tags_cache.is_none()
                       && !state.ui_state.tags_view_state.is_loading
                       && state.ui_state.tags_view_state.error.is_none();
    if should_fetch {
        // Only borrow mutably to trigger fetch
        trigger_tags_fetch(state, api_client_clone.clone(), ctx_clone.clone());
    }

    // --- Display Errors ---
    // Borrow immutably
    if let Some(err) = &state.ui_state.tags_view_state.error {
        components::error_display::show_error_box(ui, err);
        ui.add_space(10.0);
    }


    // --- Loading Indicator or Tag List ---
    // Borrow immutably
    let is_loading = state.ui_state.tags_view_state.is_loading;
    if is_loading {
        components::loading_spinner::show_centered_spinner(ui);
    } else if let Some(tags) = &state.tags_cache {
         // Pass immutable AppState to table display, but mutable TagsViewState
        show_tags_table(ui, &mut state.ui_state.tags_view_state, state, tags);
        if tags.is_empty() {
            ui.centered_and_justified(|ui| {
                let msg = if is_admin { "No tags found. Click 'Create Tag' to add one." } else { "No tags found." };
                ui.label(msg);
            });
        }
    }

    // --- Editor Dialog ---
    // Borrow mutably
    let view_state = &mut state.ui_state.tags_view_state;
    let is_form_open = view_state.is_form_open; // Copy bool
     if is_form_open {
          let mut temp_is_open = is_form_open;
          show_tag_editor_dialog(
               ui.ctx(),
               &mut temp_is_open, // Pass bool mutably
               &mut view_state.tag_editor_state, // Pass editor form state mutably
               view_state.editing_tag_id,
               api_client_clone.clone(),
               state.auth.token.clone(), // Pass token for API calls
          );
          if !temp_is_open {
              view_state.is_form_open = false; // Update state based on dialog interaction
          }
     }


    // If form closed after save, trigger refresh
    // Borrow immutably
    let editor_saved = state.ui_state.tags_view_state.tag_editor_state.save_triggered;
    let editor_closed = !state.ui_state.tags_view_state.is_form_open;
    if editor_closed && editor_saved {
         log::debug!("Tag editor closed after save attempt, triggering fetch.");
         state.ui_state.tags_view_state.tag_editor_state.save_triggered = false; // Reset trigger
         trigger_tags_fetch(state, api_client_clone.clone(), ctx_clone.clone());
    }
}


// --- Tags Table ---
fn show_tags_table(
    ui: &mut Ui,
    view_state: &mut TagsViewState, // Need mutable view_state for edit actions
    state: &AppState, // Immutable state for read-only checks and api_client clone
    tags: &[Tag]
) {
     use egui_extras::{Column, TableBuilder};

     let is_admin = state.auth.user_role() == Some(UserRole::Admin);
     let api_client_clone = state.api_client.clone(); // Clone api_client for delete closure
     let token_clone = state.auth.token.clone(); // Clone token for delete closure
     let ctx_table = ui.ctx().clone(); // Clone context before table

     let mut table = TableBuilder::new(ui) // Make table mutable
         .striped(true)
         .resizable(true)
         .cell_layout(egui::Layout::left_to_right(egui::Align::Center))
         .column(Column::initial(150.0).at_least(100.0)) // Name
         .column(Column::remainder().at_least(200.0)); // Description
         if is_admin {
             table = table.column(Column::initial(100.0).at_least(80.0)); // Actions
         }

     table.header(20.0, |mut header| {
         header.col(|ui| { ui.strong("Name"); });
         header.col(|ui| { ui.strong("Description"); });
         if is_admin {
              header.col(|ui| { ui.strong(""); }); // Actions header
         }
     })
     .body(|body| {
         body.rows(18.0, tags.len(), |mut row| {
             let tag = &tags[row.index()];
             let tag_id_opt = tag.tag_id; // Copy option for closure
             //let ctx_clone = ui.ctx().clone(); // Use ctx_table
             let api_client_delete = api_client_clone.clone(); // Clone again for this row
             let token_delete = token_clone.clone(); // Clone again for this row
             let delete_result_id_base = egui::Id::new(DELETE_TAG_RESULT_ID_BASE); // Base ID for delete result

             row.col(|ui| {
                 ui.label(&tag.name);
             });
             row.col(|ui| {
                  ui.label(tag.description.as_deref().unwrap_or(""));
             });
             if is_admin {
                 row.col(|ui| {
                     ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                          let delete_button = ui.add(egui::Button::new("🗑").small()).on_hover_text("Delete Tag");
                          if delete_button.clicked() {
                              log::warn!("Delete button clicked for tag ID: {:?}", tag_id_opt);
                              if let Some(id) = tag_id_opt {
                                   let delete_result_id = delete_result_id_base.with(id);
                                   trigger_tag_delete(token_delete, id, delete_result_id, ctx_table.clone(), api_client_delete);
                              }
                          }
                           let edit_button = ui.add(egui::Button::new("✏").small()).on_hover_text("Edit Tag");
                          if edit_button.clicked() {
                              log::info!("Edit button clicked for tag ID: {:?}", tag.tag_id);
                              if let Some(id) = tag.tag_id {
                                   view_state.editing_tag_id = Some(id);
                                   view_state.tag_editor_state.name = tag.name.clone();
                                   view_state.tag_editor_state.description = tag.description.clone().unwrap_or_default();
                                   view_state.tag_editor_state.error = None;
                                   view_state.tag_editor_state.is_loading = false;
                                    view_state.tag_editor_state.save_triggered = false; // Reset trigger
                                   view_state.is_form_open = true;
                              }
                          }
                     });
                 });
             }
         });
     });
}

// --- Tag Editor Dialog ---
fn show_tag_editor_dialog(
    ctx: &egui::Context,
    is_open: &mut bool, // Pass mutable bool reference
    editor_state: &mut TagEditorState,
    editing_tag_id: Option<i64>,
    api_client: ApiClient,
    token: Option<String>,
) -> Option<egui::Response> { // Return Option<Response>
    if !*is_open { return None; }

    let title = if editing_tag_id.is_some() { "Edit Tag" } else { "Create Tag" };
    let mut keep_open = *is_open; // Use temp bool

    let window_response = egui::Window::new(title)
        .open(&mut keep_open) // Use temp bool
        .resizable(false)
        .collapsible(false)
        .default_width(400.0)
        .show(ctx, |ui| {
            let ctx_clone = ui.ctx().clone(); // Clone context for save trigger
            egui::Grid::new("tag_form_grid")
                .num_columns(1)
                .spacing([10.0, 8.0])
                .show(ui, |ui| {
                    // Name
                    ui.label("Name *");
                    let name_input = ui.add(egui::TextEdit::singleline(&mut editor_state.name)
                        .desired_width(f32::INFINITY));
                    if name_input.changed() { // Validate on change
                         if editor_state.name.trim().is_empty() {
                              editor_state.validation_errors.insert("name".to_string(), "Name is required.".to_string());
                         } else {
                              editor_state.validation_errors.remove("name");
                         }
                    }
                    form_utils::show_validation_error(ui, editor_state.validation_errors.get("name").map(|s| s.as_str()));
                    ui.end_row();

                    // Description
                    ui.label("Description (Optional)");
                    ui.add(egui::TextEdit::multiline(&mut editor_state.description)
                        .desired_rows(3)
                        .desired_width(f32::INFINITY));
                    ui.end_row();
                });

            ui.separator();

             if let Some(err) = &editor_state.error {
                 components::error_display::show_error_box(ui, err);
                 ui.add_space(5.0);
             }

            ui.horizontal(|ui| {
                let save_button = egui::Button::new(if editing_tag_id.is_some() { "Update" } else { "Create" });
                 let can_save = editor_state.validation_errors.is_empty() && !editor_state.name.trim().is_empty();

                if ui.add_enabled(!editor_state.is_loading && can_save, save_button).clicked() {
                     log::info!("Save tag triggered.");
                    trigger_tag_save(
                        editing_tag_id,
                        editor_state, // Pass mutable ref
                        api_client,
                        token.clone(),
                        ctx_clone,
                    );
                }

                if editor_state.is_loading {
                     components::loading_spinner::show_spinner(ui, egui::vec2(16.0, 16.0));
                }

                 ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                     if ui.button("Cancel").clicked() {
                         keep_open = false; // Modify temp bool
                          editor_state.save_triggered = false;
                     }
                 });
            });
        });

    // Update original is_open if closed
    if !keep_open {
        *is_open = false;
    }
    window_response.map(|inner| inner.response) // Return inner response
}

// --- Async Fetch Trigger ---
fn trigger_tags_fetch(state: &mut AppState, api_client: ApiClient, ctx: egui::Context) {
    let view_state = &mut state.ui_state.tags_view_state;
    if view_state.is_loading { return; }

    view_state.is_loading = true;
    view_state.error = None;
    let token = match state.auth.token.clone() {
        Some(t) => t,
        None => {
            view_state.is_loading = false;
            view_state.error = Some("Authentication token missing.".to_string());
            return;
        }
    };

    tokio::spawn(async move {
        log::info!("Fetching all tags");
        let result: FetchTagsResult = api_client.get_all_tags(&token).await; // Explicit type

        // Send result back to UI thread via memory store
        ctx.memory_mut(|mem| mem.data.insert_temp(FETCH_TAGS_RESULT_ID, result));
        ctx.request_repaint(); // Wake up UI thread
    });
}

// --- Async Save Trigger ---
fn trigger_tag_save(
    tag_id: Option<i64>,
    editor_state_ref: &mut TagEditorState,
    api_client: ApiClient,
    token: Option<String>,
    ctx: egui::Context,
) {
     let token = match token {
         Some(t) => t,
         None => {
              editor_state_ref.error = Some("Authentication required to save.".to_string());
              editor_state_ref.is_loading = false;
              return;
         }
     };

    editor_state_ref.is_loading = true;
    editor_state_ref.error = None;
    editor_state_ref.save_triggered = true; // Set trigger immediately

    let editor_state_clone = editor_state_ref.clone();

    tokio::spawn(async move {
        log::info!("Saving tag: ID {:?}, Name: {}", tag_id, editor_state_clone.name);

        let tag_data = TagInput {
            name: editor_state_clone.name.clone(),
            description: if editor_state_clone.description.is_empty() { None } else { Some(editor_state_clone.description.clone()) },
        };

        let result: SaveTagResult = if let Some(id) = tag_id { // Add type hint
            api_client.update_tag(id, &tag_data, &token).await
        } else {
            api_client.create_tag(&tag_data, &token).await
        };

        // Send result back to UI thread via memory store
        ctx.memory_mut(|mem| mem.data.insert_temp(SAVE_TAG_RESULT_ID, result));
        ctx.request_repaint();
    });
}

// --- Async Delete Trigger ---
fn trigger_tag_delete(
    token: Option<String>,
    tag_id: i64,
    result_id: egui::Id, // ID to store result
    ctx: egui::Context,
    api_client: ApiClient
) {
     log::warn!("trigger_tag_delete called for ID {}", tag_id);
     // TODO: Implement confirmation dialog

      let token = match token { Some(t) => t, None => {
           components::error_display::show_error_toast(&ctx, "Authentication required.");
           return;
      }};

      // Indicate loading
       ctx.memory_mut(|mem| mem.data.insert_temp(egui::Id::new("tags_set_loading"), true));
       ctx.request_repaint();


      tokio::spawn(async move {
           let result: DeleteTagResult = api_client.delete_tag(tag_id, &token).await; // Explicit type

           // Store result and flag completion in memory
            ctx.memory_mut(|mem| {
                mem.data.insert_temp(result_id, result);
                mem.data.insert_temp("tag_deleted_id_flag", tag_id); // Flag completion
            });
            ctx.request_repaint();
      });
}

// Helper function to check the memory flag in the main view loop
fn check_and_set_tags_loading(ctx: &egui::Context, state: &mut AppState) {
    if ctx.memory_mut(|mem| mem.data.remove::<bool>(egui::Id::new("tags_set_loading"))).unwrap_or(false) {
        state.ui_state.tags_view_state.is_loading = true;
    }
}