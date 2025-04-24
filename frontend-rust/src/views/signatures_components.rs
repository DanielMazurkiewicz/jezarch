use crate::{
    state::{AppState, ComponentsViewState, ComponentEditorState}, // Import relevant state structs
    api::{ApiClient, ApiError}, // Import ApiError
    components::{self, form_utils},
    models::*, // Import models directly
    views::AppView, // Import AppView
};
use eframe::egui::{self, Ui};
use strum::IntoEnumIterator; // For index type enum
use log; // Import log explicitly

// --- Helper types for async results stored in memory ---
type FetchComponentsResult = Result<Vec<SignatureComponent>, ApiError>;
type SaveComponentResult = Result<SignatureComponent, ApiError>;
type DeleteComponentResult = Result<GenericSuccessResponse, ApiError>;
type ReindexComponentResult = Result<ReindexResponse, ApiError>;

// --- Unique IDs for memory storage ---
const FETCH_COMPONENTS_RESULT_ID: egui::Id = egui::Id::new("fetch_components_result");
const SAVE_COMPONENT_RESULT_ID: egui::Id = egui::Id::new("save_component_result");
const DELETE_COMPONENT_RESULT_ID_BASE: &str = "delete_component_result_";
const REINDEX_COMPONENT_RESULT_ID_BASE: &str = "reindex_component_result_";

// --- Components View ---
pub fn show_components_view(state: &mut AppState, api_client: &ApiClient, ui: &mut Ui) {
    let api_client_clone = api_client.clone(); // Clone for closures/async tasks
    let ctx_clone = ui.ctx().clone();

    // --- Process Async Results ---
     // Process Fetch Result
     if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<FetchComponentsResult>(FETCH_COMPONENTS_RESULT_ID)) {
         let view_state = &mut state.ui_state.components_view_state;
         view_state.is_loading = false;
         match result {
             Ok(components) => {
                 log::info!("Fetched {} components successfully.", components.len());
                 let mut sorted_components = components;
                 sorted_components.sort_by(|a, b| a.name.cmp(&b.name));
                 state.components_cache = Some(sorted_components);
                 view_state.error = None;
             }
             Err(err) => {
                 log::error!("Failed to fetch components: {}", err);
                 view_state.error = Some(format!("Failed to fetch components: {}", err));
                 state.components_cache = None;
             }
         }
     }

     // Process Save Result
     if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<SaveComponentResult>(SAVE_COMPONENT_RESULT_ID)) {
         let view_state = &mut state.ui_state.components_view_state;
         match result {
             Ok(saved_comp) => {
                 log::info!("Component saved successfully: ID {:?}", saved_comp.signature_component_id);
                 view_state.component_editor_state.error = None;
                 view_state.component_editor_state.is_loading = false;
                 // Refresh handled by save_triggered flag below
             }
             Err(err) => {
                 log::error!("Failed to save component: {}", err);
                 view_state.component_editor_state.error = Some(format!("Save failed: {}", err));
                 view_state.component_editor_state.is_loading = false;
                 view_state.component_editor_state.save_triggered = false; // Reset trigger on error
             }
         }
     }

     // Process Delete Result (check flag, process result from memory)
      if let Some(deleted_id) = ctx_clone.memory_mut(|mem| mem.data.remove::<i64>("component_deleted_id_flag")) {
          let delete_result_id = egui::Id::new(DELETE_COMPONENT_RESULT_ID_BASE).with(deleted_id);
          if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<DeleteComponentResult>(delete_result_id)) {
               let vs = &mut state.ui_state.components_view_state;
               match result {
                   Ok(_) => {
                       log::info!("Component {} deleted successfully.", deleted_id);
                       components::error_display::show_error_toast(&ctx_clone, "Component deleted.");
                       // Trigger refresh
                       trigger_components_fetch(state.auth.token.clone(), api_client_clone.clone(), ctx_clone.clone());
                   }
                   Err(e) => {
                       log::error!("Failed to delete component {}: {}", deleted_id, e);
                       let err_msg = format!("Failed to delete component: {}", e);
                       vs.error = Some(err_msg.clone());
                       vs.is_loading = false; // Stop loading on error
                       components::error_display::show_error_toast(&ctx_clone, &err_msg);
                   }
               }
          } else {
               state.ui_state.components_view_state.is_loading = false; // Reset loading if result wasn't ready
          }
      }

     // Process Reindex Result (check flag, process result from memory)
      if let Some(reindexed_id) = ctx_clone.memory_mut(|mem| mem.data.remove::<i64>("component_reindexed_id_flag")) {
          let reindex_result_id = egui::Id::new(REINDEX_COMPONENT_RESULT_ID_BASE).with(reindexed_id);
          if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<ReindexComponentResult>(reindex_result_id)) {
              let vs = &mut state.ui_state.components_view_state;
               match result {
                   Ok(reindex_response) => {
                       log::info!("Component {} reindexed successfully. {}", reindexed_id, reindex_response.message);
                       components::error_display::show_error_toast(&ctx_clone, &format!("Reindex complete: {}", reindex_response.message));
                       // Trigger refresh
                        trigger_components_fetch(state.auth.token.clone(), api_client_clone.clone(), ctx_clone.clone());
                   }
                   Err(e) => {
                       log::error!("Failed to reindex component {}: {}", reindexed_id, e);
                       let err_msg = format!("Failed to reindex component: {}", e);
                       vs.error = Some(err_msg.clone());
                       vs.is_loading = false; // Stop loading on error
                       components::error_display::show_error_toast(&ctx_clone, &err_msg);
                   }
               }
          } else {
              state.ui_state.components_view_state.is_loading = false; // Reset loading if result wasn't ready
          }
      }


    // Header
    ui.horizontal(|ui| {
        ui.heading("Signature Components");
        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
            // Admins can create/edit
            if state.auth.user_role() == Some(UserRole::Admin) { // Check auth state directly
                if ui.button("➕ New Component").clicked() {
                    let view_state = &mut state.ui_state.components_view_state; // Borrow mutably here
                    view_state.editing_component_id = None;
                    view_state.component_editor_state = Default::default(); // Reset form state
                    view_state.is_form_open = true;
                }
            }
        });
    });
    ui.label("Define hierarchical components (like folders) for signatures.");
    ui.separator();
    ui.add_space(10.0);

    // --- Fetch Components if needed ---
    // Borrow immutably first for checks
    let should_fetch = state.components_cache.is_none()
                       && !state.ui_state.components_view_state.is_loading
                       && state.ui_state.components_view_state.error.is_none();

    if should_fetch {
        // Borrow mutably only to trigger fetch
        let token_clone_fetch = state.auth.token.clone(); // Clone token before mutable borrow
        trigger_components_fetch(token_clone_fetch, api_client_clone.clone(), ctx_clone.clone());
        state.ui_state.components_view_state.is_loading = true; // Set loading after triggering
    }

    // --- Display Errors ---
    // Borrow immutably first
    if let Some(err) = &state.ui_state.components_view_state.error {
        components::error_display::show_error_box(ui, err);
        ui.add_space(10.0);
    }


    // --- Loading or Component List ---
    // Borrow immutably first
    let is_loading = state.ui_state.components_view_state.is_loading;
    if is_loading {
        components::loading_spinner::show_centered_spinner(ui);
    } else if let Some(components) = &state.components_cache {
         // Pass state mutably to table display (needed for edit/delete actions)
         // Pass api_client immutably
        show_components_table(ui, &mut state.ui_state.components_view_state, state, components, api_client);
        if components.is_empty() {
            ui.centered_and_justified(|ui| {
                let is_admin = state.auth.user_role() == Some(UserRole::Admin);
                let msg = if is_admin { "No components created yet. Click 'New Component'." } else { "No components found." };
                ui.label(msg);
            });
        }
    }

    // --- Editor Dialog ---
    // Borrow mutably here
    let view_state = &mut state.ui_state.components_view_state;
    let is_form_open = view_state.is_form_open; // Copy bool
     if is_form_open {
          let mut temp_is_open = is_form_open;
          show_component_editor_dialog(
               ui.ctx(),
               &mut temp_is_open, // Pass temp bool mutably
               &mut view_state.component_editor_state, // Pass editor state mutably
               view_state.editing_component_id,
               api_client_clone.clone(),
               state.auth.token.clone(), // Pass token
          );
          if !temp_is_open {
              view_state.is_form_open = false; // Update state based on dialog interaction
          }
     }


    // If form closed after save, trigger refresh
    // Borrow immutably first
    let editor_closed_after_save = !state.ui_state.components_view_state.is_form_open
                                     && state.ui_state.components_view_state.component_editor_state.save_triggered;
    if editor_closed_after_save {
         log::debug!("Component editor closed after save attempt, triggering fetch.");
         state.ui_state.components_view_state.component_editor_state.save_triggered = false; // Reset trigger
         let token_clone_refresh = state.auth.token.clone(); // Clone token before mutable borrow
         trigger_components_fetch(token_clone_refresh, api_client_clone.clone(), ctx_clone.clone());
         // Also set loading flag
         state.ui_state.components_view_state.is_loading = true;
    }
}

// --- Components Table ---
fn show_components_table(
    ui: &mut Ui,
    view_state: &mut ComponentsViewState, // Mutable view state for edit action
    state: &mut AppState, // Pass AppState mutably for navigation clicks
    components: &[SignatureComponent],
    api_client: &ApiClient, // Pass immutable api_client
) {
    use egui_extras::{Column, TableBuilder};

    let is_admin = state.auth.user_role() == Some(UserRole::Admin);
    let token_clone = state.auth.token.clone(); // Clone token for closures
    let ctx_table = ui.ctx().clone(); // Clone context before table


    let mut table = TableBuilder::new(ui)
        .striped(true)
        .resizable(true)
        .cell_layout(egui::Layout::left_to_right(egui::Align::Center))
        .column(Column::initial(150.0).at_least(120.0)) // Name
        .column(Column::remainder().at_least(150.0))    // Description
        .column(Column::initial(120.0).at_least(100.0)) // Index Type
        .column(Column::initial(80.0).at_least(60.0));  // Elements count
    if is_admin {
        table = table.column(Column::initial(120.0).at_least(100.0)); // Actions
    }

    table.header(20.0, |mut header| {
        header.col(|ui| { ui.strong("Name"); });
        header.col(|ui| { ui.strong("Description"); });
        header.col(|ui| { ui.strong("Index Type"); });
        header.col(|ui| { ui.strong("Elements"); });
        if is_admin {
            header.col(|ui| { ui.strong(""); }); // Actions header
        }
    })
    .body(|body| {
        body.rows(18.0, components.len(), |mut row| {
            let component = &components[row.index()];
            let component_id_opt = component.signature_component_id; // Copy for closure
            //let ctx_clone = ui.ctx().clone(); // Use ctx_table
            let api_client_delete = api_client.clone(); // Clone from passed immutable ref
            let token_delete = token_clone.clone();
            let api_client_reindex = api_client.clone(); // Clone from passed immutable ref
            let token_reindex = token_clone.clone();
            let delete_result_id_base = egui::Id::new(DELETE_COMPONENT_RESULT_ID_BASE);
            let reindex_result_id_base = egui::Id::new(REINDEX_COMPONENT_RESULT_ID_BASE);


            // Use row.col for each column's content
            row.col(|ui| {
                 let link_response = ui.link(&component.name);
                 if link_response.clicked() {
                     if let Some(id) = component_id_opt {
                         log::info!("Navigate to elements for component ID: {}", id);
                         // Mutate state directly here (as we have &mut AppState)
                         state.current_component_id_viewing = Some(id);
                         state.current_view = AppView::SignaturesElements;
                         // Reset elements view state when navigating
                         state.ui_state.elements_view_state = Default::default();
                         state.current_elements_cache = None;
                     }
                 }
                  link_response.on_hover_text(format!("Open elements for '{}'", component.name));
            });
            row.col(|ui| {
                 ui.label(component.description.as_deref().unwrap_or(""));
            });
            row.col(|ui| {
                 ui.label(format!("{:?}", component.index_type));
            });
            row.col(|ui| {
                 ui.label(component.index_count.map_or("-".to_string(), |c| c.to_string()));
            });
            if is_admin {
                 row.col(|ui| {
                     ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                          let delete_button = ui.add(egui::Button::new("🗑").small()).on_hover_text("Delete Component");
                          if delete_button.clicked() {
                             log::warn!("Delete component clicked: ID {:?}", component_id_opt);
                             if let Some(id) = component_id_opt {
                                  let delete_result_id = delete_result_id_base.with(id);
                                  trigger_component_delete(token_delete, id, delete_result_id, ctx_table.clone(), api_client_delete);
                             }
                          }
                          let reindex_button = ui.add(egui::Button::new("🔄").small()).on_hover_text("Re-index Elements");
                           if reindex_button.clicked() {
                             log::warn!("Re-index component clicked: ID {:?}", component_id_opt);
                             if let Some(id) = component_id_opt {
                                 let reindex_result_id = reindex_result_id_base.with(id);
                                  trigger_component_reindex(token_reindex, id, reindex_result_id, ctx_table.clone(), api_client_reindex);
                             }
                           }
                          let edit_button = ui.add(egui::Button::new("✏").small()).on_hover_text("Edit Component");
                           if edit_button.clicked() {
                             log::info!("Edit component clicked: ID {:?}", component.signature_component_id);
                             if let Some(id) = component.signature_component_id {
                                 view_state.editing_component_id = Some(id);
                                 view_state.component_editor_state.name = component.name.clone();
                                 view_state.component_editor_state.description = component.description.clone().unwrap_or_default();
                                 view_state.component_editor_state.index_type = component.index_type;
                                 view_state.component_editor_state.error = None;
                                 view_state.component_editor_state.is_loading = false;
                                  view_state.component_editor_state.save_triggered = false;
                                 view_state.is_form_open = true;
                             }
                           }
                     });
                 });
            }
        });
    });
}

// --- Component Editor Dialog ---
fn show_component_editor_dialog(
    ctx: &egui::Context,
    is_open: &mut bool,
    editor_state: &mut ComponentEditorState,
    editing_component_id: Option<i64>,
    api_client: ApiClient,
    token: Option<String>,
) -> Option<egui::Response> { // Return Option<Response>
    if !*is_open { return None; }

    let title = if editing_component_id.is_some() { "Edit Component" } else { "Create Component" };
    let mut keep_open = *is_open; // Use temp bool

    let window_response = egui::Window::new(title)
        .open(&mut keep_open) // Use temp bool
        .resizable(false)
        .collapsible(false)
        .default_width(450.0)
        .show(ctx, |ui| {
            let ctx_clone = ui.ctx().clone(); // Clone context for save trigger
            egui::Grid::new("component_form_grid")
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

                    // Index Type
                    ui.label("Index Formatting *");
                     egui::ComboBox::from_id_source("index_type_combo")
                        .selected_text(format!("{:?}", editor_state.index_type))
                        .show_ui(ui, |ui| {
                            for index_type in SignatureComponentIndexType::iter() { // Use iter() from IntoEnumIterator
                                ui.selectable_value(
                                    &mut editor_state.index_type,
                                    index_type,
                                    format!("{:?}", index_type), // Use Debug format for display
                                );
                            }
                        });
                    ui.end_row();
                });

            ui.separator();

             if let Some(err) = &editor_state.error {
                 components::error_display::show_error_box(ui, err);
                 ui.add_space(5.0);
             }

            ui.horizontal(|ui| {
                let save_button = egui::Button::new(if editing_component_id.is_some() { "Update" } else { "Create" });
                let can_save = editor_state.validation_errors.is_empty() && !editor_state.name.trim().is_empty();

                if ui.add_enabled(!editor_state.is_loading && can_save, save_button).clicked() {
                     log::info!("Save component triggered.");
                    trigger_component_save(
                        editing_component_id,
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

     if !keep_open {
         *is_open = false;
     }

    window_response.map(|inner| inner.response) // Return inner response
}

// --- Async Fetch Trigger ---
fn trigger_components_fetch(token: Option<String>, api_client: ApiClient, ctx: egui::Context) {
    let token = match token {
        Some(t) => t,
        None => {
            log::error!("trigger_components_fetch: Authentication token missing.");
            let error_result: FetchComponentsResult = Err(ApiError::MissingToken);
            ctx.memory_mut(|mem| mem.data.insert_temp(FETCH_COMPONENTS_RESULT_ID, error_result));
            ctx.request_repaint();
            return;
        }
    };

    // Set loading state via context memory (checked in main view loop)
    ctx.memory_mut(|mem| mem.data.insert_temp(egui::Id::new("components_set_loading"), true) );
    ctx.request_repaint();


    tokio::spawn(async move {
        log::info!("Fetching all signature components");
        let result: FetchComponentsResult = api_client.get_all_signature_components(&token).await; // Explicit type

        // Send result back to UI thread via memory store
        ctx.memory_mut(|mem| mem.data.insert_temp(FETCH_COMPONENTS_RESULT_ID, result));
        ctx.request_repaint(); // Wake up UI thread
    });
}

// --- Async Save Trigger ---
fn trigger_component_save(
    component_id: Option<i64>,
    editor_state_ref: &mut ComponentEditorState,
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
        log::info!("Saving component: ID {:?}, Name: {}", component_id, editor_state_clone.name);

        let result: SaveComponentResult = if let Some(id) = component_id { // Add type hint
             let update_data = UpdateSignatureComponentInput {
                 name: Some(editor_state_clone.name.clone()),
                 description: Some(if editor_state_clone.description.is_empty() { None } else { Some(editor_state_clone.description.clone()) }),
                 index_type: Some(editor_state_clone.index_type),
             };
             api_client.update_signature_component(id, &update_data, &token).await
        } else {
            let create_data = CreateSignatureComponentInput {
                name: editor_state_clone.name.clone(),
                description: if editor_state_clone.description.is_empty() { None } else { Some(editor_state_clone.description.clone()) },
                index_type: editor_state_clone.index_type,
            };
            api_client.create_signature_component(&create_data, &token).await
        };

        // Send result back to UI thread via memory store
        ctx.memory_mut(|mem| mem.data.insert_temp(SAVE_COMPONENT_RESULT_ID, result));
        ctx.request_repaint();
    });
}

// --- Async Delete Trigger ---
fn trigger_component_delete(
    token: Option<String>,
    component_id: i64,
    result_id: egui::Id, // Unique ID for result
    ctx: egui::Context,
    api_client: ApiClient
) {
     log::warn!("trigger_component_delete called for ID {}", component_id);
     // TODO: Implement confirmation dialog

      let token = match token { Some(t) => t, None => {
           components::error_display::show_error_toast(&ctx, "Authentication required.");
           return;
      }};

      // Indicate loading
       ctx.memory_mut(|mem| mem.data.insert_temp(egui::Id::new("components_set_loading"), true));
       ctx.request_repaint();


      tokio::spawn(async move {
           let result: DeleteComponentResult = api_client.delete_signature_component(component_id, &token).await; // Explicit type

           // Store result and flag completion in memory
            ctx.memory_mut(|mem| {
                mem.data.insert_temp(result_id, result);
                mem.data.insert_temp("component_deleted_id_flag", component_id); // Flag completion
            });
            ctx.request_repaint();
      });
}

// --- Async Reindex Trigger ---
fn trigger_component_reindex(
    token: Option<String>,
    component_id: i64,
    result_id: egui::Id, // Unique ID for result
    ctx: egui::Context,
    api_client: ApiClient
) {
     log::warn!("trigger_component_reindex called for ID {}", component_id);
     // TODO: Implement confirmation dialog

      let token = match token { Some(t) => t, None => {
           components::error_display::show_error_toast(&ctx, "Authentication required.");
           return;
      }};

       // Indicate loading
       ctx.memory_mut(|mem| mem.data.insert_temp(egui::Id::new("components_set_loading"), true));
       ctx.request_repaint();


      tokio::spawn(async move {
           let result: ReindexComponentResult = api_client.reindex_component_elements(component_id, &token).await; // Explicit type

           // Store result and flag completion in memory
            ctx.memory_mut(|mem| {
                mem.data.insert_temp(result_id, result);
                mem.data.insert_temp("component_reindexed_id_flag", component_id); // Flag completion
            });
            ctx.request_repaint();
      });
}

// Helper function to check memory flag for loading state update
fn check_and_set_components_loading(ctx: &egui::Context, state: &mut AppState) {
    if ctx.memory_mut(|mem| mem.data.remove::<bool>(egui::Id::new("components_set_loading"))).unwrap_or(false) {
        state.ui_state.components_view_state.is_loading = true;
    }
}