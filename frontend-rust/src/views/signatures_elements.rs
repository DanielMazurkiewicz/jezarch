use crate::{
    state::{AppState, ElementsViewState},
    api::{ApiClient, ApiError},
    components::{self, signatures::element_form, pagination},
    models::*,
    views::AppView,
};
use eframe::egui::{self, Ui};
use log;

const ELEMENTS_PAGE_SIZE: usize = 15;

// --- Helper types for async results stored in memory ---
type FetchElementsResult = Result<SearchResponse<SignatureElementSearchResult>, ApiError>;
type DeleteElementResult = Result<GenericSuccessResponse, ApiError>;

pub fn show_elements_view(state: &mut AppState, api_client: &ApiClient, ui: &mut Ui) {
    let component_id = match state.current_component_id_viewing {
        Some(id) => id,
        None => {
            ui.centered_and_justified(|ui| {
                ui.label("Error: No signature component selected.");
                 if ui.button("Go back to Components").clicked() {
                      state.current_view = AppView::SignaturesComponents;
                 }
            });
            return;
        }
    };

    let api_client_clone = api_client.clone(); // Clone for closures/async tasks
    let ctx_clone = ui.ctx().clone(); // Clone context early
    let token_clone = state.auth.token.clone(); // Clone token early

    // Define unique IDs for memory storage
    let fetch_result_id = egui::Id::new("fetch_elements_result").with(component_id).with(state.ui_state.elements_view_state.current_page);
    let delete_result_id_base = egui::Id::new("delete_element_result");


    // Access parent component from cache (immutable borrow)
    let parent_component_opt = state.components_cache.as_ref()
        .and_then(|cache| cache.iter().find(|c| c.signature_component_id == Some(component_id)))
        .cloned(); // Clone the component data
    let parent_comp_name = parent_component_opt.as_ref().map(|c| c.name.as_str()).unwrap_or("...");

    // Header
    ui.horizontal(|ui| {
        if ui.button("⬅ Components").clicked() {
            state.current_view = AppView::SignaturesComponents;
            state.current_component_id_viewing = None;
             state.current_elements_cache = None; // Clear element cache when leaving
             state.ui_state.elements_view_state = Default::default(); // Reset view state
        }
        ui.heading(format!("Elements for: {}", parent_comp_name));
        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
            if ui.button("➕ New Element").clicked() {
                if parent_component_opt.is_some() {
                     let view_state = &mut state.ui_state.elements_view_state; // Borrow mutably here
                     view_state.editing_element_id = None;
                     view_state.element_editor_state = Default::default();
                     view_state.is_form_open = true;
                } else {
                     log::error!("Cannot create element: Parent component {} not found in cache.", component_id);
                      components::error_display::show_error_toast(ui.ctx(), "Parent component data missing. Try refreshing.");
                }
            }
        });
    });
    if let Some(parent_comp) = &parent_component_opt {
         ui.label(format!("Manage elements within the '{}' component (Index: {:?}).", parent_comp.name, parent_comp.index_type));
    }
    ui.separator();
    ui.add_space(10.0);

    // --- Search Bar Placeholder ---
     // components::search_bar::search_bar(...)

     // --- Process Async Results from Memory ---
     // Check for fetch results
     let fetch_result = ctx_clone.memory_mut(|mem| mem.data.remove::<FetchElementsResult>(fetch_result_id));
     if let Some(result) = fetch_result {
         log::debug!("Processing fetch result for component {}, page {}", component_id, state.ui_state.elements_view_state.current_page);
         // Check if context is still valid before updating
         if state.current_component_id_viewing == Some(component_id) {
             let vs = &mut state.ui_state.elements_view_state;
             vs.is_loading = false;
             match result {
                 Ok(resp) => {
                     log::info!("Fetched {} elements.", resp.data.len());
                     state.current_elements_cache = Some(resp.data);
                     vs.total_pages = resp.total_pages;
                     vs.current_page = resp.page;
                     vs.error = None;
                 },
                 Err(e) => {
                     log::error!("Failed fetch: {}", e);
                     vs.error = Some(format!("Fetch failed: {}", e));
                     vs.total_pages = 1;
                     state.current_elements_cache = None;
                     vs.current_page = 1; // Reset page on error?
                 }
             }
         } else {
              log::warn!("Elements fetch result received, but view context changed. Discarding.");
              state.ui_state.elements_view_state.is_loading = false; // Reset loading if context changed
         }
     }

     // Check for delete results (Iterate potentially - requires storing ID with result)
     // Simplified: Check for a single delete result ID if only one delete happens per frame max
     // A robust solution would store results in a HashMap<element_id, Result> in memory.
     // For now, let's assume the refresh after delete is the primary mechanism.
     // Check for delete status flag?
      if state.ui_state.elements_view_state.needs_refresh_after_delete {
           state.ui_state.elements_view_state.needs_refresh_after_delete = false; // Reset flag
           trigger_elements_fetch(
               component_id,
               state.ui_state.elements_view_state.current_page,
               token_clone.clone(),
               api_client_clone.clone(),
               ctx_clone.clone()
           );
           state.ui_state.elements_view_state.is_loading = true;
      }


     // --- Fetching Trigger ---
     // Borrow immutably first for checks
     let should_fetch = state.current_elements_cache.is_none()
                         && !state.ui_state.elements_view_state.is_loading
                         && state.ui_state.elements_view_state.error.is_none();
     if should_fetch {
         // Borrow mutably only to trigger fetch if needed
         trigger_elements_fetch(
             component_id,
             state.ui_state.elements_view_state.current_page, // Pass current page
             token_clone.clone(), // Clone token again
             api_client_clone.clone(),
             ctx_clone.clone()
        );
         state.ui_state.elements_view_state.is_loading = true; // Set loading after triggering
     }


    // --- Display Errors ---
    // Borrow immutably
    if let Some(err) = &state.ui_state.elements_view_state.error {
        components::error_display::show_error_box(ui, err);
        ui.add_space(10.0);
    }


    // --- Loading / Element List ---
    // Borrow immutably first
     let is_loading = state.ui_state.elements_view_state.is_loading;
    if is_loading {
        components::loading_spinner::show_centered_spinner(ui);
    } else {
        // Use a local binding for the default empty vec to satisfy the borrow checker
        let default_elements = vec![];
        let elements_to_display = state.current_elements_cache.as_ref().unwrap_or(&default_elements);

        // Clone necessary state for pagination closure
        let current_page = state.ui_state.elements_view_state.current_page;
        let total_pages = state.ui_state.elements_view_state.total_pages;
        let api_client_pag = api_client_clone.clone();
        let ctx_pag = ctx_clone.clone();
        let token_pag = token_clone.clone();
        let component_id_pag = component_id; // Copy component ID

        // Show table - requires mutable access to view_state for edit actions
        // Pass immutable AuthState
         show_elements_table(ui, &mut state.ui_state.elements_view_state, &state.auth, elements_to_display, &api_client_clone, token_clone.clone());

        ui.add_space(10.0);
         pagination::show_pagination(
             ui,
             current_page,
             total_pages,
             move |new_page| { // Use move closure
                  let token_c = token_pag.clone();
                  let api_c = api_client_pag.clone();
                  let ctx_c = ctx_pag.clone();
                  trigger_elements_fetch(component_id_pag, new_page, token_c, api_c, ctx_c); // Trigger fetch for new page
                  // Set loading state directly in the next frame's check or via memory
                   ctx_pag.memory_mut(|mem| mem.data.insert_temp(egui::Id::new("elements_set_loading"), true) );
                   ctx_pag.request_repaint();
             }
         );

        if elements_to_display.is_empty() && !is_loading {
            ui.centered_and_justified(|ui| {
                ui.label("No elements found for this component. Click 'New Element'.");
            });
        }
    }

    // Check memory for setting loading state
    if ctx_clone.memory_mut(|mem| mem.data.remove::<bool>(egui::Id::new("elements_set_loading"))).is_some() {
        state.ui_state.elements_view_state.is_loading = true;
    }

    // --- Editor Dialog ---
    // Re-borrow state mutably
    let view_state = &mut state.ui_state.elements_view_state;
    let is_form_open = view_state.is_form_open; // Copy bool
    if let Some(parent_component) = parent_component_opt { // Ensure parent is available
         let element_being_edited = if let Some(edit_id) = view_state.editing_element_id {
              // Borrow immutably for finding the element
              state.current_elements_cache.as_ref()
                  .and_then(|cache| cache.iter().find(|el_res| el_res.element.signature_element_id == Some(edit_id)))
                  .map(|el_res| el_res.element.clone())
         } else { None };

         if is_form_open { // Only show dialog if flag is true
              let mut temp_is_open = is_form_open;
              show_element_editor_dialog(
                   ui.ctx(),
                   &mut temp_is_open, // Pass temp bool mutably
                   &mut view_state.element_editor_state, // Pass nested editor state
                   element_being_edited.as_ref(),
                   parent_component, // Pass cloned parent component
                   api_client_clone.clone(),
                   state.auth.token.clone(), // Clone token
              );
               if !temp_is_open {
                   view_state.is_form_open = false; // Update state based on dialog interaction
               }
         }
    } else if is_form_open {
         components::error_display::show_error_toast(ui.ctx(), "Error: Parent component data is missing.");
         state.ui_state.elements_view_state.is_form_open = false; // Force close if opened erroneously
    }


    // Refresh trigger after save
    // Borrow immutably first
    let editor_saved = state.ui_state.elements_view_state.element_editor_state.save_triggered;
    let editor_closed = !state.ui_state.elements_view_state.is_form_open;
    if editor_closed && editor_saved {
        log::debug!("Element editor closed after save attempt, triggering fetch.");
        state.ui_state.elements_view_state.element_editor_state.save_triggered = false; // Reset trigger
        let token_re = state.auth.token.clone();
        trigger_elements_fetch(
            component_id,
            state.ui_state.elements_view_state.current_page, // Fetch current page again
            token_re,
            api_client_clone.clone(),
            ctx_clone.clone()
        );
        state.ui_state.elements_view_state.is_loading = true; // Set loading for fetch
    }
}


// --- Elements Table ---
fn show_elements_table(
    ui: &mut Ui,
    view_state: &mut ElementsViewState, // Mutable for edit actions
    auth_state: &crate::auth::AuthState, // Pass immutable AuthState
    elements: &[SignatureElementSearchResult],
    api_client: &ApiClient, // Pass immutable client
    token: Option<String>, // Pass token for delete
) {
     use egui_extras::{Column, TableBuilder};
     let is_admin = auth_state.user_role() == Some(UserRole::Admin);
     let token_clone = token; // Rename for clarity
     let ctx_table = ui.ctx().clone(); // Clone context before table

     let mut table = TableBuilder::new(ui); // Start builder
      table = table
         .striped(true)
         .resizable(true)
         .cell_layout(egui::Layout::left_to_right(egui::Align::Center))
         .column(Column::initial(80.0).at_least(60.0)) // Index
         .column(Column::auto()) // Name
         .column(Column::remainder().at_least(150.0)); // Description
      if is_admin { // Conditionally add actions column
          table = table.column(Column::initial(100.0).at_least(80.0))
      }

     table.header(20.0, |mut header| {
         header.col(|ui| { ui.strong("Index"); });
         header.col(|ui| { ui.strong("Name"); });
         header.col(|ui| { ui.strong("Description"); });
         if is_admin { header.col(|ui| { ui.strong(""); }); }
     })
     .body(|body| {
         body.rows(18.0, elements.len(), |mut row| {
             let element_search_result = &elements[row.index()];
             let element = &element_search_result.element;
             let element_id_opt = element.signature_element_id; // Copy ID for closure
             //let ctx_clone = ui.ctx().clone(); // Clone context for closure - Use ctx_table
             let api_client_delete = api_client.clone(); // Clone from immutable ref
             let token_delete = token_clone.clone();
             let delete_result_id_base = egui::Id::new("delete_element_result"); // ID base for delete

             row.col(|ui| { ui.label(element.index.as_deref().unwrap_or("-")); });
             row.col(|ui| { ui.label(&element.name); });
             row.col(|ui| { ui.label(element.description.as_deref().unwrap_or("")); });

             if is_admin {
                  row.col(|ui| {
                      ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                           let delete_button = ui.add(egui::Button::new("🗑").small()).on_hover_text("Delete Element");
                           if delete_button.clicked() {
                               if let Some(id) = element_id_opt {
                                    // TODO: Confirmation dialog
                                    let delete_result_id = delete_result_id_base.with(id);
                                    trigger_element_delete(id, delete_result_id, ctx_table.clone(), api_client_delete, token_delete); // Pass clones and ID
                               }
                           }
                           let edit_button = ui.add(egui::Button::new("✏").small()).on_hover_text("Edit Element");
                           if edit_button.clicked() {
                               if let Some(id) = element.signature_element_id {
                                    view_state.editing_element_id = Some(id);
                                    view_state.element_editor_state.name = element.name.clone();
                                    view_state.element_editor_state.description = element.description.clone().unwrap_or_default();
                                    view_state.element_editor_state.index = element.index.clone().unwrap_or_default();
                                    // TODO: Fetch and populate parent IDs here or in the dialog
                                    view_state.element_editor_state.selected_parent_ids = vec![]; // Placeholder
                                    view_state.element_editor_state.error = None;
                                    view_state.element_editor_state.is_loading = false;
                                    view_state.element_editor_state.is_fetching_details = true; // Indicate need to fetch parents
                                     view_state.element_editor_state.save_triggered = false; // Reset trigger
                                    view_state.is_form_open = true;
                               }
                           }
                      });
                  });
             }
         });
     });
}


// --- Element Editor Dialog ---
fn show_element_editor_dialog(
    ctx: &egui::Context,
    is_open: &mut bool, // Mutable bool reference
    editor_state: &mut crate::state::ElementEditorState, // Use qualified path
    editing_element: Option<&SignatureElement>,
    parent_component: SignatureComponent,
    api_client: ApiClient,
    token: Option<String>,
) -> Option<egui::Response> { // Return Option<Response>
    if !*is_open { return None; }

    let title_text = if editing_element.is_some() { "Edit Element" } else { "Create Element" };
    let mut keep_open = *is_open; // Use temp bool

    // TODO: Trigger fetch for parent IDs if editing_element.is_some() and is_fetching_details is true

    let window_response = egui::Window::new(title_text)
        .open(&mut keep_open) // Use temp bool
        .resizable(true)
        .collapsible(true)
        .default_width(500.0)
        .show(ctx, |ui| {
             element_form::show_element_form(
                 ui,
                 editor_state, // Pass nested editor state mutably
                 editing_element, // Pass the original element if editing
                 &parent_component,
                 api_client,
                 token,
                 |_save_result| {
                      // Callback logic now handled by save_triggered flag check in main view
                 }
             );
        });

    if !keep_open {
        *is_open = false; // Update original bool if closed
    }

    window_response.map(|inner| inner.response) // Return inner response
}


// --- Async Fetch Trigger ---
fn trigger_elements_fetch(
    component_id: i64,
    page: usize,
    token: Option<String>,
    api_client: ApiClient,
    ctx: egui::Context
) {
     let token = match token { Some(t) => t, None => {
         log::error!("trigger_elements_fetch: Authentication missing");
          let error_result: FetchElementsResult = Err(ApiError::MissingToken);
          let fetch_result_id = egui::Id::new("fetch_elements_result").with(component_id).with(page);
          ctx.memory_mut(|mem| mem.data.insert_temp(fetch_result_id, error_result));
          ctx.request_repaint();
         return;
     }};

      // Loading state is set before calling this function by the caller

     let search_req = SearchRequest {
          query: vec![
               SearchQueryElement {
                   field: "signatureComponentId".to_string(),
                   condition: SearchCondition::Eq,
                   value: component_id.into(),
                   not: false,
               }
          ],
          page,
          page_size: ELEMENTS_PAGE_SIZE,
          sort: vec![
                SortElement { field: "index".to_string(), direction: SortDirection::Asc },
                SortElement { field: "name".to_string(), direction: SortDirection::Asc },
          ],
     };

     tokio::spawn(async move {
          log::info!("Fetching elements for component ID: {}, page: {}", component_id, search_req.page);
          let result: FetchElementsResult = api_client.search_signature_elements(&search_req, &token).await; // Explicit type

          // Send result back to UI thread by storing in memory
          let fetch_result_id = egui::Id::new("fetch_elements_result").with(component_id).with(page);
          ctx.memory_mut(|mem| mem.data.insert_temp(fetch_result_id, result));
          ctx.request_repaint();
     });
}

// --- Async Delete Trigger ---
fn trigger_element_delete(
    element_id: i64,
    result_id: egui::Id, // Unique ID to store result
    ctx: egui::Context,
    api_client: ApiClient,
    token: Option<String>
) {
      log::warn!("trigger_element_delete called for ID {}", element_id);
       // TODO: Confirmation dialog
       let token = match token { Some(t) => t, None => {
            components::error_display::show_error_toast(&ctx, "Authentication required.");
            return;
       }};
       let api_client_clone = api_client.clone(); // Clone API client
       let ctx_clone = ctx.clone(); // Clone context

       // Indicate loading specific to this deletion (optional, maybe just use global loading)

       tokio::spawn(async move {
           let result: DeleteElementResult = api_client.delete_signature_element(element_id, &token).await; // Explicit type

           // Store result in memory for processing in the next frame
            ctx_clone.memory_mut(|mem| {
                mem.data.insert_temp(result_id, result);
                // Set a general flag indicating a delete finished, triggering refresh check
                 if let Some(vs_state) = mem.data.get_temp_mut_or_default::<ElementsViewState>(egui::Id::new("elements_view_state_marker")) { // Find view state marker
                    vs_state.needs_refresh_after_delete = true;
                 } else { // Fallback: set a generic flag
                    mem.data.insert_temp(egui::Id::new("elements_deleted_flag"), true);
                 }
            });
            ctx_clone.request_repaint();
       });
}

// Marker for the view state ID - used to update needs_refresh_after_delete
// This is a bit hacky; a better state management approach would avoid this.
// In show_elements_view, add this before the table:
// ui.memory_mut(|mem| { mem.data.insert_temp(egui::Id::new("elements_view_state_marker"), state.ui_state.elements_view_state.clone()); });
// And add needs_refresh_after_delete to ElementsViewState
// And check for the generic flag if the specific marker isn't found