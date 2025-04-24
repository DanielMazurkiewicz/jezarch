use eframe::egui::{Ui, RichText}; // Removed unused self import

/// Simple helper to display a validation error message below a field.
pub fn show_validation_error(ui: &mut Ui, error_message: Option<&str>) {
    if let Some(msg) = error_message {
        if !msg.is_empty() {
            ui.add_space(2.0);
            ui.label(RichText::new(msg).color(ui.visuals().error_fg_color).small());
        }
    }
}