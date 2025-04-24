use crate::{models::*, utils}; // Removed unused state::AppState
use eframe::egui::{self, Button, RichText, ScrollArea}; // Removed unused Ui

/// Displays a dialog with detailed information about an Archive Document or Unit.
pub fn show_document_preview_dialog(
    ctx: &egui::Context,
    is_open: &mut bool,
    doc_result: Option<ArchiveDocumentSearchResult>, // Pass the search result which includes resolved sigs
    can_modify: bool, // Pass permission flag explicitly
    mut on_edit: impl FnMut(i64), // Callback with ID
    mut on_disable: impl FnMut(i64), // Callback with ID
) {
    if !*is_open || doc_result.is_none() {
        return;
    }

    let doc_res = doc_result.unwrap(); // Safe to unwrap here due to check above
    let doc = &doc_res.document;
    let is_unit = doc.doc_type == ArchiveDocumentType::Unit;
    let title = format!("{} Preview: {}", if is_unit { "Unit" } else { "Document" }, doc.title);
    let mut keep_open = *is_open; // Use temporary bool for window

    egui::Window::new(title)
        .open(&mut keep_open) // Use temp bool
        .resizable(true)
        .collapsible(true)
        .default_width(600.0)
        .default_height(500.0)
        .show(ctx, |ui| {
            ScrollArea::vertical().show(ui, |ui| {
                egui::Grid::new("preview_grid").num_columns(2).spacing([10.0, 4.0]).show(ui, |ui| {
                     ui.strong("ID:"); ui.label(doc.archive_document_id.map_or("-".to_string(), |id| id.to_string())); ui.end_row();
                     ui.strong("Type:"); ui.label(format!("{:?}", doc.doc_type)); ui.end_row();
                     ui.strong("Title:"); ui.label(&doc.title); ui.end_row();
                     ui.strong("Creator:"); ui.label(&doc.creator); ui.end_row();
                     ui.strong("Creation Date:"); ui.label(&doc.creation_date); ui.end_row();
                     if let Some(parent_id) = doc.parent_unit_archive_document_id {
                         ui.strong("Parent Unit ID:"); ui.label(parent_id.to_string()); /* TODO: Make link? */ ui.end_row();
                     }
                     ui.strong("Owner:"); ui.label(doc.owner_login.as_deref().unwrap_or("N/A")); ui.end_row();
                     ui.strong("Created On:"); ui.label(utils::format_optional_datetime(doc.created_on)); ui.end_row();
                     ui.strong("Modified On:"); ui.label(utils::format_optional_datetime(doc.modified_on)); ui.end_row();
                     ui.strong("Active:"); ui.label(if doc.active { "Yes" } else { "No" }); ui.end_row();
                });

                ui.separator();

                // --- Physical Details ---
                ui.strong("Physical Details:");
                 egui::Grid::new("physical_grid").num_columns(2).spacing([10.0, 4.0]).show(ui, |ui| {
                     if let Some(v) = doc.number_of_pages { ui.label("Pages:"); ui.label(v.to_string()); ui.end_row(); }
                     if let Some(v) = &doc.document_type { ui.label("Doc Type:"); ui.label(v); ui.end_row(); }
                     if let Some(v) = &doc.dimensions { ui.label("Dimensions:"); ui.label(v); ui.end_row(); }
                     if let Some(v) = &doc.binding { ui.label("Binding:"); ui.label(v); ui.end_row(); }
                     if let Some(v) = &doc.condition { ui.label("Condition:"); ui.label(v); ui.end_row(); }
                     if let Some(v) = &doc.document_language { ui.label("Language:"); ui.label(v); ui.end_row(); }
                 });
                 ui.separator();

                 // --- Content & Context ---
                 ui.strong("Content & Context:");
                  if let Some(v) = &doc.content_description { ui.label("Description:"); ui.label(v); }
                  if let Some(v) = &doc.remarks { ui.label("Remarks:"); ui.label(v); }
                  if let Some(v) = &doc.additional_information { ui.label("Additional Info:"); ui.label(v); }
                  if let Some(v) = &doc.related_documents_references { ui.label("Related Docs:"); ui.label(v); }
                  ui.separator();

                 // --- Access & Digitization ---
                 ui.strong("Access & Digitization:");
                 egui::Grid::new("access_grid").num_columns(2).spacing([10.0, 4.0]).show(ui, |ui| {
                      if let Some(v) = &doc.access_level { ui.label("Access Level:"); ui.label(v); ui.end_row(); }
                      if let Some(v) = &doc.access_conditions { ui.label("Access Conditions:"); ui.label(v); ui.end_row(); }
                      ui.label("Digitized:");
                       ui.horizontal(|ui| {
                            ui.label(if doc.is_digitized.unwrap_or(false) { "Yes" } else { "No" });
                            if let Some(link) = &doc.digitized_version_link {
                                 ui.hyperlink_to("(Link)", link).on_hover_text(link);
                            }
                       });
                       ui.end_row();
                 });
                 ui.separator();

                 // --- Indexing ---
                 ui.strong("Indexing:");
                 ui.label("Tags:");
                 ui.horizontal_wrapped(|ui| {
                      if doc.tags.is_empty() { ui.weak("(None)"); }
                      for tag in &doc.tags { ui.label(&tag.name); /* TODO: Use Badge */ }
                 });
                 ui.add_space(5.0);
                  ui.label("Topographic Signatures:");
                   ui.horizontal_wrapped(|ui| {
                        if doc_res.resolved_topographic_signatures.is_empty() { ui.weak("(None)"); }
                        for sig in &doc_res.resolved_topographic_signatures { ui.label(RichText::new(sig).monospace()); /* TODO: Use Badge */ }
                   });
                   ui.add_space(5.0);
                  ui.label("Descriptive Signatures:");
                   ui.horizontal_wrapped(|ui| {
                        if doc_res.resolved_descriptive_signatures.is_empty() { ui.weak("(None)"); }
                        for sig in &doc_res.resolved_descriptive_signatures { ui.label(RichText::new(sig).monospace()); /* TODO: Use Badge */ }
                   });

            }); // End ScrollArea

            // --- Footer Actions ---
            ui.separator();
            ui.horizontal(|ui| {
                 // Disable Button (Left)
                  if ui.add_enabled(can_modify, Button::new("🗑 Disable")).on_hover_text("Disable this item").clicked() {
                      if let Some(id) = doc.archive_document_id {
                           on_disable(id);
                           // keep_open = false; // Removed: Modify state outside the closure
                           // Signal close externally instead of modifying keep_open here
                      }
                  }

                 // Edit & Close Buttons (Right)
                 ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                      if ui.button("Close").clicked() {
                           // keep_open = false; // Removed: Modify state outside the closure
                      }
                      if ui.add_enabled(can_modify, Button::new("✏ Edit")).clicked() {
                           if let Some(id) = doc.archive_document_id {
                                on_edit(id);
                                // keep_open = false; // Removed: Modify state outside the closure
                           }
                      }
                 });
            });
        });

    // Update the outer state variable if the window was closed *or* an action was taken
     // We need a way to know if on_edit or on_disable was called to close the dialog.
     // For now, let's assume clicking the button *intends* to close the dialog.
    if !keep_open {
        *is_open = false;
    }
}