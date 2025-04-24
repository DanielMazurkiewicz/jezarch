use crate::{
    state::AppState, // Keep AppState for navigation/auth
    api::ApiClient, // Need ApiClient for actions
    models::*,
};
use eframe::egui::{self, Ui};
use log; // Import log explicitly

/// Displays a table of Archive Documents (Units and Documents).
/// Takes immutable AppState to read auth/cache and ApiClient.
/// Returns Option<i64> representing the ID of a unit to navigate into,
/// or signals edit/disable actions via state mutation flags (handled by caller).
pub fn show_document_list(
    ui: &mut Ui,
    state: &AppState, // Use immutable state for reading
    view_state: &mut crate::state::ArchiveViewState, // Pass mutable view state
    api_client: &ApiClient, // Pass immutable ApiClient
) -> Option<i64> { // Return Option<UnitIdToOpen>
    let current_user_id = state.auth.user_id();
    let is_admin = state.auth.user_role() == Some(UserRole::Admin);
    let token = state.auth.token.clone(); // Clone token for delete action
    let ctx = ui.ctx().clone(); // Clone context for delete action

    let mut unit_to_open: Option<i64> = None; // Store navigation request

    ui.label("Items:"); // Simple header for the list section

    egui::ScrollArea::vertical().auto_shrink([false; 2]).show(ui, |ui| {
        if view_state.documents_cache.is_empty() && !view_state.is_loading {
             ui.centered_and_justified(|ui| {
                  ui.label("No items found in this location.");
             });
             return;
        }

        use egui_extras::{Column, TableBuilder};

        let table = TableBuilder::new(ui)
            .striped(true)
            .resizable(true)
            .cell_layout(egui::Layout::left_to_right(egui::Align::Center))
            .column(Column::initial(40.0).at_least(30.0))      // Type icon
            .column(Column::auto().at_least(150.0))            // Title
            .column(Column::initial(120.0).at_least(100.0))    // Creator
            .column(Column::initial(100.0).at_least(80.0))     // Date
            .column(Column::initial(150.0).at_least(100.0))    // Topo Sig
            .column(Column::initial(150.0).at_least(100.0))    // Desc Sig
            .column(Column::initial(130.0).at_least(110.0));   // Actions

        table.header(20.0, |mut header| {
            header.col(|ui| { ui.strong("Type"); });
            header.col(|ui| { ui.strong("Title"); });
            header.col(|ui| { ui.strong("Creator"); });
            header.col(|ui| { ui.strong("Date"); });
            header.col(|ui| { ui.strong("Topo Sig"); });
            header.col(|ui| { ui.strong("Desc Sig"); });
            header.col(|ui| { ui.strong(""); }); // Actions header
        })
        .body(|body| {
            // Clone data needed for closures *outside* the row loop to avoid repeated cloning
            // Note: Cloning documents_cache inside the loop might be necessary if state is modified within the loop
            // For now, assume it's read-only within the loop iterations.
            let docs_cache_clone = view_state.documents_cache.clone(); // Clone cache to iterate over
            let num_rows = docs_cache_clone.len();

            body.rows(18.0, num_rows, |mut row| {
                // Get data from the cloned cache
                if let Some(doc_result) = docs_cache_clone.get(row.index()) {
                    let doc = &doc_result.document;
                    let is_owner_or_admin = is_admin || Some(doc.owner_user_id) == current_user_id;
                    let is_unit = doc.doc_type == ArchiveDocumentType::Unit;
                    let doc_id_opt = doc.archive_document_id;
                    let doc_clone_for_edit = doc.clone(); // Clone only needed for edit callback
                    let api_client_delete = api_client.clone(); // Clone for delete closure
                    let token_delete = token.clone(); // Clone for delete closure
                    let ctx_delete = ctx.clone(); // Clone context for delete closure

                    row.col(|ui| {
                        let icon = if is_unit { "📁" } else { "📄" };
                        ui.label(icon);
                    });
                    row.col(|ui| {
                         let title_text = egui::RichText::new(&doc.title).strong();
                         if ui.link(title_text).clicked() {
                              if is_unit {
                                   if let Some(id) = doc_id_opt {
                                       log::info!("Opening unit ID: {}", id);
                                       unit_to_open = Some(id); // Signal navigation request
                                   }
                              } else {
                                   log::info!("Previewing document ID: {:?}", doc_id_opt);
                                   // Mutate view_state directly (passed mutably)
                                   view_state.previewing_document_id = doc_id_opt;
                                   view_state.is_preview_open = true;
                              }
                         }
                    });
                    row.col(|ui| { ui.label(&doc.creator); });
                    row.col(|ui| { ui.label(&doc.creation_date); });
                    row.col(|ui| {
                          ui.label(doc_result.resolved_topographic_signatures.first().map(|s| s.as_str()).unwrap_or("-"));
                    });
                     row.col(|ui| {
                          ui.label(doc_result.resolved_descriptive_signatures.first().map(|s| s.as_str()).unwrap_or("-"));
                     });
                    row.col(|ui| {
                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                             // Disable Button
                             let delete_button = ui.add_enabled(is_owner_or_admin, egui::Button::new("🗑").small()).on_hover_text("Disable Item");
                             if delete_button.clicked() {
                                 if let Some(id) = doc_id_opt {
                                      log::warn!("Disable clicked for item ID: {}", id);
                                      // Trigger the disable action defined in archive.rs view
                                      crate::views::archive::trigger_document_disable(id, ctx_delete, token_delete, api_client_delete);
                                 }
                             }
                             // Edit Button
                             let edit_button = ui.add_enabled(is_owner_or_admin, egui::Button::new("✏").small()).on_hover_text("Edit Item");
                             if edit_button.clicked() {
                                   // Mutate view_state directly to signal edit
                                   view_state.editing_document_id = doc_id_opt;
                                   view_state.archive_editor_state = Default::default(); // Reset editor state first
                                   view_state.archive_editor_state.form_data = crate::state::ArchiveDocumentFormData::from_model(&doc_clone_for_edit);
                                   view_state.archive_editor_state.forced_parent_title = if let Some(parent_id) = doc_clone_for_edit.parent_unit_archive_document_id {
                                       // Try to find parent title in the current cache or parent_unit_info
                                       docs_cache_clone.iter().find(|d| d.document.archive_document_id == Some(parent_id)).map(|d| d.document.title.clone())
                                        .or_else(|| state.ui_state.archive_view_state.parent_unit_info.as_ref().filter(|p| p.archive_document_id == Some(parent_id)).map(|p| p.title.clone()))
                                   } else { None };
                                   view_state.is_editor_open = true;
                             }
                              // Preview Button (only for documents)
                             if !is_unit {
                                  let preview_button = ui.add(egui::Button::new("👁").small()).on_hover_text("Preview Document");
                                 if preview_button.clicked() {
                                     log::info!("Preview button clicked for doc ID: {:?}", doc_id_opt);
                                     // Mutate view_state directly
                                     view_state.previewing_document_id = doc_id_opt;
                                     view_state.is_preview_open = true;
                                 }
                             } else {
                                ui.allocate_space(ui.spacing().interact_size);
                             }
                        });
                    });
                } else {
                     log::warn!("Could not get document at index {} in archive list body", row.index());
                }
            });
        });
    }); // End ScrollArea

    unit_to_open // Return navigation request
}