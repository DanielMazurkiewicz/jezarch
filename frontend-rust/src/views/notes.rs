use crate::{
    state::{AppState, NotesViewState, NoteEditorState}, // Import relevant state structs
    api::{ApiClient, ApiError}, // Import ApiError
    components::{self, form_utils},
    models::*, // Import models directly
    utils,
};
use eframe::egui::{self, Ui};
use log; // Import log explicitly

// --- Helper types for async results stored in memory ---
type FetchNotesResult = Result<SearchResponse<NoteWithDetails>, ApiError>;
type SaveNoteResult = Result<NoteWithDetails, ApiError>;
type DeleteNoteResult = Result<GenericMessageResponse, ApiError>; // Assuming delete returns GenericMessageResponse

// --- Unique IDs for memory storage ---
const FETCH_NOTES_RESULT_ID_BASE: &str = "fetch_notes_result_";
const SAVE_NOTE_RESULT_ID: egui::Id = egui::Id::new("save_note_result");
const DELETE_NOTE_RESULT_ID_BASE: &str = "delete_note_result_";


// --- Notes View ---
pub fn show_notes_view(state: &mut AppState, api_client: &ApiClient, ui: &mut Ui) {
    let api_client_clone = api_client.clone(); // Clone for closures
    let ctx_clone = ui.ctx().clone();
    let current_page = state.ui_state.notes_view_state.current_page; // Read current page

    // Define unique ID for fetch result based on page
    let fetch_result_id = egui::Id::new(FETCH_NOTES_RESULT_ID_BASE).with(current_page);

    // --- Process Async Results ---
    // Process Fetch Result
    if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<FetchNotesResult>(fetch_result_id)) {
         let vs = &mut state.ui_state.notes_view_state;
         vs.is_loading = false;
         match result {
             Ok(response) => {
                 log::info!("Fetched {} notes. Total: {}. Pages: {}", response.data.len(), response.total_size, response.total_pages);
                 state.notes_cache = Some(response.data); // Update cache
                 vs.total_pages = response.total_pages;
                 vs.current_page = response.page; // Update page from response
                 vs.error = None;
             }
             Err(err) => {
                 log::error!("Failed to fetch notes: {}", err);
                 let err_msg = format!("Failed to fetch notes: {}", err);
                  vs.error = Some(err_msg);
                  state.notes_cache = None;
                  vs.total_pages = 1;
                  vs.current_page = 1; // Reset page on error?
             }
         }
     }

     // Process Save Result
      if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<SaveNoteResult>(SAVE_NOTE_RESULT_ID)) {
          let view_state = &mut state.ui_state.notes_view_state;
          match result {
              Ok(saved_note) => {
                  log::info!("Note saved successfully: ID {:?}", saved_note.note.note_id);
                   view_state.note_editor_state.error = None;
                   view_state.note_editor_state.is_loading = false;
                   // Refresh is handled by save_triggered flag check below
              }
              Err(err) => {
                  log::error!("Failed to save note: {}", err);
                  view_state.note_editor_state.error = Some(format!("Save failed: {}", err));
                   view_state.note_editor_state.is_loading = false;
                   view_state.note_editor_state.save_triggered = false; // Reset trigger on error
              }
          }
      }

     // Process Delete Result (Check flag, then maybe result in memory if needed)
      if let Some(deleted_id) = ctx_clone.memory_mut(|mem| mem.data.remove::<i64>("note_deleted_id_flag")) {
          let delete_result_id = egui::Id::new(DELETE_NOTE_RESULT_ID_BASE).with(deleted_id);
           if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<DeleteNoteResult>(delete_result_id)) {
                let vs = &mut state.ui_state.notes_view_state;
                match result {
                    Ok(_) => {
                         log::info!("Note {} deleted successfully.", deleted_id);
                         components::error_display::show_error_toast(&ctx_clone, "Note deleted.");
                         // Trigger refresh
                          trigger_notes_fetch(state, api_client_clone.clone(), ctx_clone.clone());
                    }
                    Err(e) => {
                         log::error!("Failed to delete note {}: {}", deleted_id, e);
                         let err_msg = format!("Failed to delete note: {}", e);
                         vs.error = Some(err_msg.clone());
                         vs.is_loading = false; // Stop loading on error
                         components::error_display::show_error_toast(&ctx_clone, &err_msg);
                    }
                }
           } else {
                // Result might not be ready yet, or deleted successfully and refresh already triggered
                 // Ensure loading is reset if no result found after flag was set
                state.ui_state.notes_view_state.is_loading = false;
           }
      }


    // --- Header and Create Button ---
    ui.horizontal(|ui| {
        ui.heading("Notes");
        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
            if ui.button("➕ Create Note").clicked() {
                 // Access view_state mutably here
                 let view_state = &mut state.ui_state.notes_view_state;
                view_state.editing_note_id = None; // Indicate creation
                view_state.note_editor_state = Default::default(); // Reset form state
                view_state.is_editor_open = true;
            }
        });
    });
    ui.label("Create, view, and manage personal & shared notes.");
    ui.separator();
    ui.add_space(10.0);

    // --- Search Bar Placeholder ---
     // components::search_bar::search_bar(...) // TODO: Integrate search bar

    // --- Fetch Notes if needed ---
    // Borrow immutably first for checks
    let should_fetch = state.notes_cache.is_none()
                       && !state.ui_state.notes_view_state.is_loading
                       && state.ui_state.notes_view_state.error.is_none();
    if should_fetch {
        // Only borrow mutably to trigger fetch if conditions met
        trigger_notes_fetch(state, api_client_clone.clone(), ctx_clone.clone());
    }

    // Borrow view_state mutably here for error display and loading checks
    let view_state = &mut state.ui_state.notes_view_state;

    // --- Display Errors ---
    if let Some(err) = &view_state.error {
        components::error_display::show_error_box(ui, err);
        ui.add_space(10.0);
    }


    // --- Loading Indicator or Notes List ---
    if view_state.is_loading {
        components::loading_spinner::show_centered_spinner(ui);
    } else {
        // Use a local binding for the default empty vec to satisfy the borrow checker
        let default_notes = vec![];
        let notes_to_display = state.notes_cache.as_ref().unwrap_or(&default_notes);
        let current_page_display = view_state.current_page; // Read before mutable borrow below
        let total_pages = view_state.total_pages;   // Read before mutable borrow below

        // Clone necessary data for pagination closure *before* mutable borrow for table
        let token_clone_pag = state.auth.token.clone();
        let api_client_clone_pag = api_client_clone.clone();
        let ctx_clone_pag = ctx_clone.clone();

        // Show table - needs mutable access to view_state for edit/preview state changes
         show_notes_table(ui, view_state, state, notes_to_display);

        ui.add_space(10.0);
         // Pagination - Use move closure
         components::pagination::show_pagination(
            ui,
            current_page_display,
            total_pages,
            move |new_page| {
                let api_c = api_client_clone_pag.clone();
                let token = token_clone_pag.clone();
                let context = ctx_clone_pag.clone();

                trigger_notes_fetch_paginated(
                    new_page,
                    api_c,
                    context.clone(),
                    token
                );
                // Set loading flag
                context.memory_mut(|mem| mem.data.insert_temp(egui::Id::new("notes_set_loading"), true));
                context.request_repaint();
            },
         );
    }
     // Check memory flag for loading state update
     if ctx_clone.memory_mut(|mem| mem.data.remove::<bool>(egui::Id::new("notes_set_loading"))).unwrap_or(false) {
         state.ui_state.notes_view_state.is_loading = true;
     }

    // Re-borrow view_state mutably for dialogs
    let view_state = &mut state.ui_state.notes_view_state;
    let is_editor_open = view_state.is_editor_open; // Copy bool

     // --- Editor Dialog ---
     if is_editor_open {
          // Use a temporary bool for the 'open' state of the window
          let mut temp_is_open = is_editor_open;
          show_note_editor_dialog(
               ui.ctx(),
               &mut temp_is_open, // Pass temp bool to window
               &mut view_state.note_editor_state, // Pass editor state
               view_state.editing_note_id,
               state.tags_cache.as_ref().map(|c| c.as_slice()).unwrap_or(&[]), // Pass tag cache slice
               state.auth.user_role(), // Pass user role
               api_client_clone.clone(),
               state.auth.token.clone(), // Pass token
          );
          // Update the actual state only if the window was closed by interaction
          if !temp_is_open {
              view_state.is_editor_open = false;
          }
     }


    // If form closed after save, trigger refresh (check immutable state first)
    let editor_state_saved = state.ui_state.notes_view_state.note_editor_state.save_triggered;
    let editor_closed = !state.ui_state.notes_view_state.is_editor_open;

    if editor_closed && editor_state_saved {
         log::debug!("Note editor closed after save attempt, triggering fetch.");
         state.ui_state.notes_view_state.note_editor_state.save_triggered = false; // Reset trigger
          trigger_notes_fetch(state, api_client_clone.clone(), ctx_clone.clone());
    }

    // --- Preview Dialog ---
    // TODO: Implement Preview Dialog display logic
}

// --- Notes Table ---
fn show_notes_table(
    ui: &mut Ui,
    view_state: &mut NotesViewState, // Mutable for edit/preview state changes
    state: &AppState, // Immutable for read-only access (auth, cache, api_client)
    notes: &[NoteWithDetails],
) {
    use egui_extras::{Column, TableBuilder};
    let current_user_id = state.auth.user_id();
    let is_admin = state.auth.user_role() == Some(UserRole::Admin);
    let api_client_clone = state.api_client.clone(); // Clone from immutable AppState
    let token_clone = state.auth.token.clone(); // Clone token for delete closure
    let ctx_table = ui.ctx().clone(); // Clone context before table

    let table = TableBuilder::new(ui)
        .striped(true)
        .resizable(true)
        .cell_layout(egui::Layout::left_to_right(egui::Align::Center))
        .column(Column::auto()) // Title
        .column(Column::initial(100.0).at_least(80.0)) // Author
        .column(Column::initial(100.0).at_least(80.0)) // Modified
        .column(Column::initial(70.0).range(50.0..=80.0)) // Shared
        .column(Column::remainder().at_least(100.0)) // Tags
        .column(Column::initial(100.0).at_least(80.0)); // Actions

    table.header(20.0, |mut header| {
        header.col(|ui| { ui.strong("Title"); });
        header.col(|ui| { ui.strong("Author"); });
        header.col(|ui| { ui.strong("Modified"); });
        header.col(|ui| { ui.strong("Shared"); });
        header.col(|ui| { ui.strong("Tags"); });
        header.col(|ui| { ui.strong(""); });
    })
    .body(|body| {
        body.rows(18.0, notes.len(), |mut row| {
            let note_with_details = &notes[row.index()];
            let note = &note_with_details.note;
            let is_owner = Some(note.owner_user_id) == current_user_id;
            let can_delete = is_owner || is_admin;
            let note_id_opt = note.note_id; // Copy note ID for closure
            //let ctx_clone = ui.ctx().clone(); // Clone context for closure - use ctx_table
            let api_client_delete = api_client_clone.clone(); // Clone again for this specific row's closure
            let token_delete = token_clone.clone(); // Clone again for this specific row's closure
            let delete_result_id_base = egui::Id::new(DELETE_NOTE_RESULT_ID_BASE); // Base ID for delete result


            row.col(|ui| {
                if ui.link(&note.title).clicked() {
                    log::info!("Preview link clicked for note ID: {:?}", note.note_id);
                    view_state.previewing_note_id = note.note_id;
                    view_state.is_preview_open = true;
                }
            });
            row.col(|ui| {
                ui.label(note_with_details.owner_login.as_deref().unwrap_or("Unknown"));
            });
            row.col(|ui| {
                ui.label(utils::format_datetime_human(note.modified_on));
            });
            row.col(|ui| {
                if note.shared { ui.label("Yes"); } else { ui.label("No"); }
            });
            row.col(|ui| {
                 ui.horizontal_wrapped(|ui| {
                     for tag in note_with_details.tags.iter().take(3) {
                           ui.label(egui::RichText::new(&tag.name).small())
                              .on_hover_text(tag.description.as_deref().unwrap_or(""));
                          ui.add_space(4.0);
                     }
                     if note_with_details.tags.len() > 3 {
                           ui.label(egui::RichText::new(format!("+{}", note_with_details.tags.len() - 3)).small());
                     }
                      if note_with_details.tags.is_empty() {
                          ui.weak("(None)");
                      }
                  });
            });
            row.col(|ui| {
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                     let delete_button = ui.add_enabled(can_delete, egui::Button::new("🗑").small()).on_hover_text("Delete Note");
                     if delete_button.clicked() {
                        log::warn!("Delete button clicked for note ID: {:?}", note_id_opt);
                        if let Some(id) = note_id_opt {
                             let delete_result_id = delete_result_id_base.with(id);
                             trigger_note_delete(token_delete, id, delete_result_id, ctx_table.clone(), api_client_delete);
                        }
                    }
                    let edit_button = ui.add(egui::Button::new("✏").small()).on_hover_text("Edit Note");
                    if edit_button.clicked() {
                        log::info!("Edit button clicked for note ID: {:?}", note.note_id);
                        if let Some(id) = note.note_id {
                             view_state.editing_note_id = Some(id);
                             view_state.note_editor_state.title = note.title.clone();
                             view_state.note_editor_state.content = note.content.clone().unwrap_or_default();
                             view_state.note_editor_state.shared = note.shared;
                             view_state.note_editor_state.selected_tag_ids = note_with_details.tags.iter().filter_map(|t| t.tag_id).collect();
                             view_state.note_editor_state.error = None;
                             view_state.note_editor_state.is_loading = false;
                              view_state.note_editor_state.save_triggered = false;
                             view_state.is_editor_open = true;
                        }
                    }
                });
            });
        });
    });

    if notes.is_empty() && !view_state.is_loading {
        ui.centered_and_justified(|ui| {
            ui.label("No notes found. Click 'Create Note' to start.");
        });
    }
}

// --- Note Editor Dialog ---
fn show_note_editor_dialog(
    ctx: &egui::Context,
    is_open: &mut bool, // Take mutable bool reference
    editor_state: &mut NoteEditorState,
    editing_note_id: Option<i64>,
    available_tags: &[Tag],
    current_user_role: Option<UserRole>,
    api_client: ApiClient,
    token: Option<String>,
) -> Option<egui::Response> { // Return Option<Response> for interaction checks
    if !*is_open { return None; }

    let title_text = if editing_note_id.is_some() { "Edit Note" } else { "Create Note" };
    let mut keep_open = *is_open; // Use a temporary bool for the window

    let window_response = egui::Window::new(title_text)
        .open(&mut keep_open) // Use the temp bool here
        .resizable(true)
        .collapsible(true)
        .default_width(550.0)
        .show(ctx, |ui| {
            let ctx_clone = ui.ctx().clone(); // Clone context for save trigger
            egui::ScrollArea::vertical().max_height(ui.available_height() - 60.0).show(ui, |ui| {
                 egui::Grid::new("note_form_grid")
                    .num_columns(1)
                    .spacing([10.0, 8.0])
                    .show(ui, |ui| {
                        // --- Title ---
                        ui.label("Title *");
                        let title_input = ui.add(egui::TextEdit::singleline(&mut editor_state.title)
                            .desired_width(f32::INFINITY));
                         if title_input.changed() { // Validate on change
                              if editor_state.title.trim().is_empty() {
                                   editor_state.validation_errors.insert("title".to_string(), "Title is required.".to_string());
                              } else {
                                   editor_state.validation_errors.remove("title");
                              }
                         }
                         form_utils::show_validation_error(ui, editor_state.validation_errors.get("title").map(|s| s.as_str()));
                         ui.end_row();

                         // --- Content ---
                         ui.label("Content");
                         ui.add(egui::TextEdit::multiline(&mut editor_state.content)
                             .desired_rows(8)
                             .desired_width(f32::INFINITY));
                         ui.end_row();

                         // --- Tags ---
                          ui.label("Tags");
                           components::tag_selector::show_tag_selector(
                              ui,
                              &mut editor_state.selected_tag_ids,
                              available_tags
                          );
                          ui.end_row();

                         // --- Shared Checkbox ---
                         let is_owner = true; // Placeholder - needs proper check if note exists
                         let is_admin = current_user_role == Some(UserRole::Admin);
                         let can_change_shared = is_owner || is_admin;
                         ui.add_enabled_ui(can_change_shared, |ui| {
                              ui.checkbox(&mut editor_state.shared, "Share this note publicly");
                         }).response.on_disabled_hover_text("Only owner or admin can change shared status");
                         ui.end_row();
                    });
             }); // End ScrollArea

             ui.separator();

              if let Some(err) = &editor_state.error {
                  components::error_display::show_error_box(ui, err);
                  ui.add_space(5.0);
              }

             ui.horizontal(|ui| {
                  let save_button = egui::Button::new(if editing_note_id.is_some() { "Update" } else { "Create" });
                   let can_save = editor_state.validation_errors.is_empty() && !editor_state.title.trim().is_empty();

                  if ui.add_enabled(!editor_state.is_loading && can_save, save_button).clicked() {
                       log::info!("Save note triggered.");
                       trigger_note_save(
                           editing_note_id,
                           editor_state, // Pass mutable ref
                           api_client,
                           token,
                           ctx_clone,
                       );
                  }

                  if editor_state.is_loading {
                       components::loading_spinner::show_spinner(ui, egui::vec2(16.0, 16.0));
                  }

                   ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                       if ui.button("Cancel").clicked() {
                           keep_open = false; // Modify the temp bool
                            editor_state.save_triggered = false;
                       }
                   });
             });
        });

     // Update the original `is_open` reference if the window was closed
     if !keep_open {
         *is_open = false;
     }

    window_response.map(|inner| inner.response) // Return the inner response
}


// --- Async Fetch Triggers ---
// Fetch Initial / Refresh
fn trigger_notes_fetch(state: &mut AppState, api_client: ApiClient, ctx: egui::Context) {
      // Set loading state immediately
      state.ui_state.notes_view_state.is_loading = true;
      state.ui_state.notes_view_state.error = None;

      trigger_notes_fetch_paginated(
         1, // page
         api_client,
         ctx,
         state.auth.token.clone()
     );
}

// Fetch Paginated
fn trigger_notes_fetch_paginated(
     page: usize,
     api_client: ApiClient,
     ctx: egui::Context,
     token: Option<String>,
) {
     // Set loading state immediately via context memory store (checked in main view)
    ctx.memory_mut(|mem| mem.data.insert_temp(egui::Id::new("notes_set_loading"), true) );
    ctx.request_repaint();


    let token = match token {
         Some(t) => t,
         None => {
             let fetch_result_id = egui::Id::new(FETCH_NOTES_RESULT_ID_BASE).with(page);
             let error_result: FetchNotesResult = Err(ApiError::MissingToken);
             ctx.memory_mut(|mem| mem.data.insert_temp(fetch_result_id, error_result));
             ctx.request_repaint();
             return;
         }
     };

     let search_req = SearchRequest {
          query: vec![], // TODO: Build query from search_term
          page,
          page_size: 10,
          sort: vec![SortElement { field: "modifiedOn".to_string(), direction: SortDirection::Desc }],
     };

    tokio::spawn(async move {
        log::info!("Fetching notes page: {}", search_req.page);
        let result: FetchNotesResult = api_client.search_notes(&search_req, &token).await; // Explicit type

        // Send result back to UI thread by storing it in memory
        let fetch_result_id = egui::Id::new(FETCH_NOTES_RESULT_ID_BASE).with(page);
        ctx.memory_mut(|mem| mem.data.insert_temp(fetch_result_id, result));
        ctx.request_repaint(); // Wake up UI thread
    });
}


// --- Async Save Trigger ---
fn trigger_note_save(
    note_id: Option<i64>,
    editor_state_ref: &mut NoteEditorState,
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
        log::info!("Saving note: ID {:?}, Title: {}", note_id, editor_state_clone.title);

        let note_data = NoteInput {
             title: editor_state_clone.title.clone(),
             content: if editor_state_clone.content.is_empty() { None } else { Some(editor_state_clone.content.clone()) },
             shared: editor_state_clone.shared,
             tag_ids: editor_state_clone.selected_tag_ids.clone(),
        };

        let result: SaveNoteResult = if let Some(id) = note_id { // Add type hint
             api_client.update_note(id, &note_data, &token).await
         } else {
             api_client.create_note(&note_data, &token).await
         };

        // Send result back to UI thread via memory store
        ctx.memory_mut(|mem| mem.data.insert_temp(SAVE_NOTE_RESULT_ID, result));
        ctx.request_repaint();
    });
}

// --- Async Delete Trigger ---
fn trigger_note_delete(
    token: Option<String>,
    note_id: i64,
    result_id: egui::Id, // ID to store the result
    ctx: egui::Context,
    api_client: ApiClient
) {
     log::warn!("trigger_note_delete called for ID {}", note_id);
     // TODO: Implement confirmation dialog

      let token = match token { Some(t) => t, None => {
           components::error_display::show_error_toast(&ctx, "Authentication required.");
           return;
      }};

      // Indicate loading (e.g., by setting a flag in memory or state)
      ctx.memory_mut(|mem| mem.data.insert_temp(egui::Id::new("notes_set_loading"), true));
      ctx.request_repaint();


      tokio::spawn(async move {
           let result: DeleteNoteResult = api_client.delete_note(note_id, &token).await;

           // Store result and a flag indicating completion
            ctx.memory_mut(|mem| {
                mem.data.insert_temp(result_id, result);
                mem.data.insert_temp("note_deleted_id_flag", note_id); // Flag completion
            });
            ctx.request_repaint();
      });
}