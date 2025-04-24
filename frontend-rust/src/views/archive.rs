use crate::{
    state::{AppState, ArchiveViewState, ArchiveEditorState, ArchiveDocumentFormData},
    api::{ApiClient, ApiError},
    components::{self, pagination, archive::{document_list, document_form, document_preview_dialog}},
    models::*,
    // utils, // utils is unused currently
    // views::AppView, // AppView is unused currently - Removed
};
use eframe::egui::{self, Ui};
use std::{collections::HashMap, sync::{Arc, Mutex}}; // Import Arc, Mutex
use log;

const ARCHIVE_PAGE_SIZE: usize = 10;

// --- Helper types for async results stored in memory ---
type FetchDocumentsResult = Result<SearchResponse<ArchiveDocumentSearchResult>, ApiError>;
type FetchParentResult = Result<ArchiveDocument, ApiError>;
type DisableDocumentResult = Result<GenericSuccessResponse, ApiError>;

// --- Unique IDs for memory storage ---
const FETCH_DOCUMENTS_RESULT_ID_BASE: &str = "fetch_archive_documents_result_";
const FETCH_PARENT_RESULT_ID_BASE: &str = "fetch_archive_parent_result_";
const DISABLE_DOCUMENT_RESULT_ID_BASE: &str = "disable_archive_document_result_";


// --- Archive View ---
pub fn show_archive_view(state: &mut AppState, api_client: &ApiClient, ui: &mut Ui) {
    let api_client_clone = api_client.clone(); // Clone for use in closures/async tasks
    let ctx_clone = ui.ctx().clone(); // Clone context
    let token_clone = state.auth.token.clone(); // Clone token early

    // Use current_archive_unit_id_viewing from AppState directly for context
    let current_unit_id = state.current_archive_unit_id_viewing;
    let current_page = state.ui_state.archive_view_state.current_page; // Read current page

    // --- Define IDs for async results ---
     let fetch_parent_result_id = egui::Id::new(FETCH_PARENT_RESULT_ID_BASE).with(current_unit_id.unwrap_or(0));
     let fetch_docs_result_id = egui::Id::new(FETCH_DOCUMENTS_RESULT_ID_BASE).with(current_unit_id.unwrap_or(0)).with(current_page);

    // --- Process Async Results ---
     // Process Parent Fetch Result
     if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<FetchParentResult>(fetch_parent_result_id)) {
          let unit_id = current_unit_id.expect("Result ID should only exist if current_unit_id was Some");
          // Check if still viewing this unit before updating state
          if state.current_archive_unit_id_viewing == Some(unit_id) {
               let vs = &mut state.ui_state.archive_view_state;
               vs.is_loading_parent = false;
               match result {
                   Ok(unit) if unit.doc_type == ArchiveDocumentType::Unit => {
                       vs.parent_unit_info = Some(unit);
                       vs.error = None;
                   },
                   Ok(_) => {
                       log::error!("Fetched item {} is not a unit.", unit_id);
                       vs.error = Some(format!("Item ID {} is not a Unit.", unit_id));
                       vs.parent_unit_info = None;
                       state.current_archive_unit_id_viewing = None; // Force back to root
                   },
                   Err(e) => {
                       log::error!("Failed to fetch parent unit {}: {}", unit_id, e);
                       vs.error = Some(format!("Failed to load unit {}: {}", unit_id, e));
                       vs.parent_unit_info = None;
                       state.current_archive_unit_id_viewing = None; // Force back to root
                   }
               }
          } else {
               log::warn!("Parent unit fetch result received, but view context changed. Discarding.");
               state.ui_state.archive_view_state.is_loading_parent = false; // Ensure loading is reset
          }
     }

     // Process Documents Fetch Result
      if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<FetchDocumentsResult>(fetch_docs_result_id)) {
           // Check if context is still valid before updating
           if state.current_archive_unit_id_viewing == current_unit_id {
               let vs = &mut state.ui_state.archive_view_state;
               vs.is_loading = false;
               match result {
                   Ok(response) => {
                       log::info!("Fetched {} archive items.", response.data.len());
                       vs.documents_cache = response.data;
                       vs.total_pages = response.total_pages;
                       vs.current_page = response.page;
                       vs.error = None;
                   }
                   Err(e) => {
                       log::error!("Failed to fetch archive documents: {}", e);
                       let err_msg = format!("Failed to load items: {}", e);
                       vs.error = Some(err_msg);
                       vs.documents_cache.clear();
                       vs.total_pages = 1;
                       vs.current_page = 1;
                   }
               }
           } else {
                log::warn!("Archive fetch result received, but view context changed. Discarding.");
                state.ui_state.archive_view_state.is_loading = false; // Ensure loading is reset
           }
      }

      // Process Disable Result (Check flag, process result from memory)
       if let Some(disabled_id) = ctx_clone.memory_mut(|mem| mem.data.remove::<i64>("archive_document_disabled_id_flag")) {
           let disable_result_id = egui::Id::new(DISABLE_DOCUMENT_RESULT_ID_BASE).with(disabled_id);
           if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<DisableDocumentResult>(disable_result_id)) {
                let vs = &mut state.ui_state.archive_view_state;
                match result {
                    Ok(_) => {
                        log::info!("Document {} disabled successfully.", disabled_id);
                        components::error_display::show_error_toast(&ctx_clone, "Item disabled.");
                        // Trigger refresh
                         trigger_documents_fetch(
                              state.current_archive_unit_id_viewing,
                              vs.current_page,
                              vs.search_query.clone(),
                              state.auth.token.clone(),
                              api_client_clone.clone(),
                              ctx_clone.clone()
                         );
                         vs.is_loading = true; // Set loading for refresh
                    }
                    Err(e) => {
                        log::error!("Failed to disable document {}: {}", disabled_id, e);
                        let err_msg = format!("Failed to disable item: {}", e);
                        vs.error = Some(err_msg.clone());
                        vs.is_loading = false; // Stop loading on error
                        components::error_display::show_error_toast(&ctx_clone, &err_msg);
                    }
                }
           } else {
                state.ui_state.archive_view_state.is_loading = false; // Reset loading if result wasn't ready
           }
       }

    // --- Fetch Parent Unit Details (if navigating within a unit) ---
     if current_unit_id.is_some() && state.ui_state.archive_view_state.parent_unit_info.is_none() && !state.ui_state.archive_view_state.is_loading_parent {
         trigger_parent_unit_fetch(current_unit_id, fetch_parent_result_id, token_clone.clone(), api_client_clone.clone(), ctx_clone.clone());
         // Set loading flag after triggering
         state.ui_state.archive_view_state.is_loading_parent = true;
     }
     // Clear parent info if we navigate back to root
      if current_unit_id.is_none() && state.ui_state.archive_view_state.parent_unit_info.is_some() {
           let view_state = &mut state.ui_state.archive_view_state;
          view_state.parent_unit_info = None;
          view_state.error = None; // Clear potential parent fetch errors
      }

    // --- Header ---
    ui.horizontal(|ui| {
        // Back button if inside a unit
        if let Some(_id) = current_unit_id {
            if ui.button("⬅ Archive Root").clicked() {
                 state.current_archive_unit_id_viewing = None;
                 let view_state = &mut state.ui_state.archive_view_state;
                 view_state.current_page = 1;
                 view_state.search_query.clear();
                  view_state.documents_cache.clear(); // Clear cache when going to root
                  let new_fetch_docs_result_id = egui::Id::new(FETCH_DOCUMENTS_RESULT_ID_BASE).with(0).with(1); // ID for root, page 1
                  trigger_documents_fetch(
                      None, // current_unit_id
                      1, // page
                      vec![], // empty query
                      new_fetch_docs_result_id,
                      token_clone.clone(),
                      api_client_clone.clone(),
                      ctx_clone.clone()
                  );
                  view_state.is_loading = true; // Set loading for fetch
            }
        }

        let is_loading_parent = state.ui_state.archive_view_state.is_loading_parent;
        let parent_title = state.ui_state.archive_view_state.parent_unit_info.as_ref().map(|p| p.title.clone());

        if is_loading_parent {
             ui.label("Loading Unit...");
        } else if let Some(title) = parent_title {
            ui.heading(format!("Unit: {}", title));
        } else {
            ui.heading("Archive");
        }

        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
            if ui.button("➕ Create Item").clicked() {
                 let view_state = &mut state.ui_state.archive_view_state;
                 let forced_parent_title_dialog = view_state.parent_unit_info.as_ref().map(|p| p.title.clone());
                view_state.editing_document_id = None;
                view_state.archive_editor_state = ArchiveEditorState {
                    form_data: ArchiveDocumentFormData {
                        parent_unit_archive_document_id: current_unit_id,
                        ..Default::default()
                    },
                    forced_parent_title: forced_parent_title_dialog,
                    resolved_signatures_cache: Arc::new(Mutex::new(HashMap::new())), // Initialize cache here
                    ..Default::default()
                };
                view_state.is_editor_open = true;
            }
        });
    });
    let parent_title_desc = state.ui_state.archive_view_state.parent_unit_info.as_ref().map(|p| p.title.clone());
    let description = if let Some(title) = parent_title_desc {
         format!("Browsing items within unit \"{}\".", title)
    } else {
         "Manage archival documents and units.".to_string()
    };
    ui.label(description);
    ui.separator();
    ui.add_space(10.0);

    // --- Search Bar Placeholder ---
     // components::search_bar::search_bar(...)

     // --- Fetch Trigger ---
     // Borrow immutably first for checks
     let should_fetch = state.ui_state.archive_view_state.documents_cache.is_empty()
         && !state.ui_state.archive_view_state.is_loading
         && state.ui_state.archive_view_state.error.is_none();
     if should_fetch {
         // Only borrow mutably to trigger fetch if conditions met
         let current_page_fetch = state.ui_state.archive_view_state.current_page;
         let search_query = state.ui_state.archive_view_state.search_query.clone();
         let fetch_docs_result_id_trigger = egui::Id::new(FETCH_DOCUMENTS_RESULT_ID_BASE).with(current_unit_id.unwrap_or(0)).with(current_page_fetch);
         trigger_documents_fetch(
            state.current_archive_unit_id_viewing,
            current_page_fetch,
            search_query,
            fetch_docs_result_id_trigger,
            token_clone.clone(),
            api_client_clone.clone(),
            ctx_clone.clone()
        );
         state.ui_state.archive_view_state.is_loading = true; // Set loading after triggering
     }


    // --- Display Errors ---
    // Borrow immutably
     if let Some(err) = &state.ui_state.archive_view_state.error {
         components::error_display::show_error_box(ui, err);
         ui.add_space(10.0);
     }


    // --- Loading Indicator or Document List ---
     let is_loading = state.ui_state.archive_view_state.is_loading;
     if is_loading {
        components::loading_spinner::show_centered_spinner(ui);
    } else {
         // Clone necessary state for pagination closure
         let current_page_display = state.ui_state.archive_view_state.current_page;
         let total_pages = state.ui_state.archive_view_state.total_pages;
         let search_query_pag = state.ui_state.archive_view_state.search_query.clone();
         let token_pag = token_clone.clone();
         let api_c_pagination = api_client_clone.clone();
         let ctx_c_pagination = ctx_clone.clone();
         let current_unit_id_clone = state.current_archive_unit_id_viewing;


        // Show table - pass mutable view_state for navigation/actions
         let unit_id_to_open = document_list::show_document_list(ui, state, &mut state.ui_state.archive_view_state, &api_client_clone);

         // Handle navigation request from table
         if let Some(unit_id) = unit_id_to_open {
              state.current_archive_unit_id_viewing = Some(unit_id);
              let view_state_nav = &mut state.ui_state.archive_view_state;
              view_state_nav.current_page = 1;
              view_state_nav.search_query.clear();
              view_state_nav.documents_cache.clear(); // Clear cache when going to new unit
              view_state_nav.parent_unit_info = None; // Clear old parent info
              let fetch_docs_result_id_nav = egui::Id::new(FETCH_DOCUMENTS_RESULT_ID_BASE).with(unit_id).with(1);
              trigger_documents_fetch(
                  Some(unit_id),
                  1, // page
                  vec![], // empty query
                  fetch_docs_result_id_nav,
                  token_clone.clone(),
                  api_client_clone.clone(),
                  ctx_clone.clone()
              );
              view_state_nav.is_loading = true; // Set loading for fetch
              view_state_nav.is_loading_parent = true; // Also trigger parent fetch
         }

        ui.add_space(10.0);
        // Pagination
         pagination::show_pagination(
            ui,
            current_page_display,
            total_pages,
            move |new_page| { // `move` captures cloned variables
                 let api_c = api_c_pagination.clone();
                 let ctx_c = ctx_c_pagination.clone();
                 let token_c = token_pag.clone();
                 let query_c = search_query_pag.clone();
                 let fetch_docs_result_id_page = egui::Id::new(FETCH_DOCUMENTS_RESULT_ID_BASE).with(current_unit_id_clone.unwrap_or(0)).with(new_page);

                trigger_documents_fetch(
                    current_unit_id_clone,
                    new_page, // Pass the new page number
                    query_c, // Pass cloned search query
                    fetch_docs_result_id_page,
                    token_c,
                    api_c,
                    ctx_c.clone(), // Clone context for setting loading state
                );
                 // Signal loading start via memory flag
                 ctx_c.memory_mut(|mem| mem.data.insert_temp(egui::Id::new("archive_set_loading"), true));
                 ctx_c.request_repaint();
            },
         );
    }
      // Check memory flag for loading state update
      if ctx_clone.memory_mut(|mem| mem.data.remove::<bool>(egui::Id::new("archive_set_loading"))).unwrap_or(false) {
          state.ui_state.archive_view_state.is_loading = true;
      }

    // --- Editor Dialog ---
     let is_editor_open = state.ui_state.archive_view_state.is_editor_open;
     if is_editor_open {
           let mut temp_is_editor_open = is_editor_open; // Use a temporary mutable bool
           let editing_doc_id = state.ui_state.archive_view_state.editing_document_id;

           document_form::show_document_editor_dialog(
                &ctx_clone, // Pass context reference
                &mut temp_is_editor_open,
                &mut state.ui_state.archive_view_state.archive_editor_state, // Pass mutable state directly
                editing_doc_id,
                &api_client_clone, // Pass immutable client
                token_clone.clone(), // Pass token
           );

           if !temp_is_editor_open {
               state.ui_state.archive_view_state.is_editor_open = false;
           }
     }


    // If form closed after save, trigger refresh
    let editor_closed_after_save = !state.ui_state.archive_view_state.is_editor_open
                                      && state.ui_state.archive_view_state.archive_editor_state.save_triggered;
    if editor_closed_after_save {
        log::debug!("Archive editor closed after save attempt, triggering fetch.");
        state.ui_state.archive_view_state.archive_editor_state.save_triggered = false; // Reset trigger
        let current_page_refresh = state.ui_state.archive_view_state.current_page;
        let search_query_refresh = state.ui_state.archive_view_state.search_query.clone();
        let fetch_docs_result_id_refresh = egui::Id::new(FETCH_DOCUMENTS_RESULT_ID_BASE).with(current_unit_id.unwrap_or(0)).with(current_page_refresh);
        trigger_documents_fetch(
            state.current_archive_unit_id_viewing,
            current_page_refresh,
            search_query_refresh,
            fetch_docs_result_id_refresh,
            token_clone.clone(),
            api_client_clone.clone(),
            ctx_clone.clone()
        );
        state.ui_state.archive_view_state.is_loading = true; // Set loading for fetch
    }

    // --- Preview Dialog ---
     let is_preview_open = state.ui_state.archive_view_state.is_preview_open;
     if is_preview_open {
          let mut temp_is_preview_open = is_preview_open; // Use temp bool
          let previewing_id = state.ui_state.archive_view_state.previewing_document_id;
          // Find the document to preview from the cache (immutable borrow)
          let doc_to_preview = state.ui_state.archive_view_state.documents_cache.iter()
             .find(|doc| doc.document.archive_document_id == previewing_id)
             .cloned();

          let token_preview = token_clone.clone();
          let api_client_cb = api_client_clone.clone();
          let ctx_cb = ctx_clone.clone();
          let view_state_ptr = &mut state.ui_state.archive_view_state as *mut crate::state::ArchiveViewState; // Pointer for callbacks

          // Check permissions
           let can_modify_previewed = if let Some(doc) = doc_to_preview.as_ref().map(|d| &d.document) {
               state.auth.user_role() == Some(UserRole::Admin) || state.auth.user_id() == Some(doc.owner_user_id)
           } else { false };


          document_preview_dialog::show_document_preview_dialog(
               &ctx_cb, // Pass context by reference
               &mut temp_is_preview_open, // Pass temp bool
               doc_to_preview.clone(), // Clone the document data for the dialog
               can_modify_previewed, // Pass permission flag
               // Edit callback - Captures pointer, requires unsafe
               move |doc_id| {
                    // SAFETY: Ensure this callback is only called from the UI thread
                    // where `view_state_ptr` is valid. This should hold true for egui callbacks.
                    unsafe {
                         let view_state_ref = &mut *view_state_ptr;
                         if let Some(doc) = view_state_ref.documents_cache.iter().find(|d| d.document.archive_document_id == Some(doc_id)).map(|d| d.document.clone()) {
                              // Mutate view_state directly to signal edit
                              view_state_ref.editing_document_id = Some(doc_id);
                              view_state_ref.archive_editor_state = Default::default(); // Reset editor state first
                              view_state_ref.archive_editor_state.form_data = crate::state::ArchiveDocumentFormData::from_model(&doc);
                              view_state_ref.archive_editor_state.forced_parent_title = if let Some(parent_id) = doc.parent_unit_archive_document_id {
                                     view_state_ref.parent_unit_info.as_ref().filter(|p| p.archive_document_id == Some(parent_id)).map(|p| p.title.clone())
                              } else { None };
                              view_state_ref.is_editor_open = true;
                         } else {
                              log::error!("Could not find document with ID {} to edit from preview.", doc_id);
                              // Optionally show an error toast
                              components::error_display::show_error_toast(&ctx_cb, "Error: Document not found for editing.");
                         }
                    }
               },
               // Disable callback
               move |doc_id| { // `move` captures cloned variables
                    trigger_document_disable(doc_id, ctx_cb.clone(), token_preview.clone(), api_client_cb.clone());
               }
          );
          if !temp_is_preview_open {
               state.ui_state.archive_view_state.is_preview_open = false;
               state.ui_state.archive_view_state.previewing_document_id = None;
          }
     }
}


// --- Async Fetch Triggers ---

// Fetch Parent Unit Details (Takes Option<i64> and Option<String> for token)
fn trigger_parent_unit_fetch(
    unit_id_opt: Option<i64>,
    result_id: egui::Id, // ID to store result
    token_opt: Option<String>,
    api_client: ApiClient,
    ctx: egui::Context
) {
     let unit_id = match unit_id_opt {
          Some(id) => id, None => return,
     };
     let token = match token_opt { Some(t) => t, None => {
          log::error!("trigger_parent_unit_fetch: Auth token missing");
          let error_result: FetchParentResult = Err(ApiError::MissingToken);
          ctx.memory_mut(|mem| mem.data.insert_temp(result_id, error_result));
          ctx.request_repaint();
          return;
     }};

      // Set loading state via memory flag (checked in main view loop)
      ctx.memory_mut(|mem| mem.data.insert_temp(egui::Id::new("archive_parent_set_loading"), true));
      ctx.request_repaint();

     tokio::spawn(async move {
         log::info!("Fetching parent unit details for ID: {}", unit_id);
         let result: FetchParentResult = api_client.get_archive_document_by_id(unit_id, &token).await; // Explicit type

         // Store result in memory
         ctx.memory_mut(|mem| mem.data.insert_temp(result_id, result));
         ctx.request_repaint();
     });
}


// Fetch Documents (Initial / Refresh / Paginated)
fn trigger_documents_fetch(
    current_unit_id: Option<i64>,
    page: usize,
    search_query: Vec<SearchQueryElement>,
    result_id: egui::Id, // ID to store result
    token: Option<String>,
    api_client: ApiClient,
    ctx: egui::Context,
) {
    // Loading state must be set by the caller before this is called

    let token = match token { Some(t) => t, None => {
        log::error!("trigger_documents_fetch: Auth token missing.");
        let error_result: FetchDocumentsResult = Err(ApiError::MissingToken);
        ctx.memory_mut(|mem| mem.data.insert_temp(result_id, error_result));
        ctx.request_repaint();
        return;
    }};

    tokio::spawn(async move {
        log::info!("Fetching archive documents for unit: {:?}, page: {}", current_unit_id, page);

        let mut query = search_query; // Use the passed query
         // Add/update parent unit filter
         query.retain(|q| q.field != "parentUnitArchiveDocumentId"); // Remove existing filter first
         if let Some(unit_id) = current_unit_id {
              query.push(SearchQueryElement {
                   field: "parentUnitArchiveDocumentId".to_string(),
                   condition: SearchCondition::Eq,
                   value: unit_id.into(),
                   not: false,
              });
         } else {
             // Add filter for null parent when at root
              query.push(SearchQueryElement {
                   field: "parentUnitArchiveDocumentId".to_string(),
                   condition: SearchCondition::Eq, // Assuming backend supports null check with Eq
                   value: serde_json::Value::Null,
                   not: false,
              });
         }

        let search_req = SearchRequest {
            query,
            page,
            page_size: ARCHIVE_PAGE_SIZE,
            sort: vec![
                 SortElement { field: "doc_type".to_string(), direction: SortDirection::Asc }, // Use model field name
                 SortElement { field: "title".to_string(), direction: SortDirection::Asc },
            ],
        };

        let result: FetchDocumentsResult = api_client.search_archive_documents(&search_req, &token).await; // Explicit type

        // Store result in memory
        ctx.memory_mut(|mem| mem.data.insert_temp(result_id, result));
        ctx.request_repaint();
    });
}


// --- Async Delete Trigger ---
pub fn trigger_document_disable( // Made public
    doc_id: i64,
    ctx: egui::Context,
    token: Option<String>,
    api_client: ApiClient,
) {
     log::warn!("trigger_document_disable called for ID {}", doc_id);
     // TODO: Confirmation dialog

     let token = match token { Some(t) => t, None => {
          components::error_display::show_error_toast(&ctx, "Authentication required.");
          return;
     }};
     let result_id = egui::Id::new(DISABLE_DOCUMENT_RESULT_ID_BASE).with(doc_id); // Unique ID for result

    // Set loading state via memory flag
     ctx.memory_mut(|mem| mem.data.insert_temp(egui::Id::new("archive_set_loading"), true));
     ctx.request_repaint();

      tokio::spawn(async move {
           log::info!("Disabling archive document ID: {}", doc_id);
           let result: DisableDocumentResult = api_client.disable_archive_document(doc_id, &token).await; // Explicit type

           // Store result and flag in memory
            ctx.memory_mut(|mem| {
                mem.data.insert_temp(result_id, result);
                mem.data.insert_temp("archive_document_disabled_id_flag", doc_id); // Flag completion
            });
            ctx.request_repaint();
      });
}

// Helper to check loading flags in main view loop
pub fn check_and_set_archive_loading(ctx: &egui::Context, state: &mut AppState) {
     if ctx.memory_mut(|mem| mem.data.remove::<bool>(egui::Id::new("archive_parent_set_loading"))).unwrap_or(false) {
         state.ui_state.archive_view_state.is_loading_parent = true;
     }
      if ctx.memory_mut(|mem| mem.data.remove::<bool>(egui::Id::new("archive_set_loading"))).unwrap_or(false) {
          state.ui_state.archive_view_state.is_loading = true;
      }
}