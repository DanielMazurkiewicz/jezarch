use eframe::egui;

/// Displays an error message in a distinct box.
pub fn show_error_box(ui: &mut egui::Ui, error_message: &str) {
    if error_message.is_empty() {
        return;
    }

    let visuals = ui.visuals().clone();
    let error_color = visuals.error_fg_color; // Use theme's error color
    let background_color = error_color.linear_multiply(0.1); // Faint background

    egui::Frame::none()
        .inner_margin(egui::Margin::same(8.0))
        .rounding(ui.style().visuals.widgets.inactive.rounding)
        .fill(background_color)
        .stroke(egui::Stroke::new(1.0, error_color.linear_multiply(0.5)))
        .show(ui, |ui| {
            ui.horizontal(|ui| {
                // Optional: Add an icon
                // ui.label(egui::RichText::new("❗").color(error_color));
                ui.label(egui::RichText::new(error_message).color(error_color));
            });
        });
}


/// Shows a temporary error toast notification at the bottom center.
pub fn show_error_toast(ctx: &egui::Context, error_message: &str) {
    // Simple implementation using a temporary window.
    // More robust solutions might use egui_notify or a custom toast manager.
    if error_message.is_empty() { return; }

     egui::Window::new("Error")
        .anchor(egui::Align2::CENTER_BOTTOM, egui::Vec2::new(0.0, -20.0)) // Position at bottom center
        .title_bar(false)
        .resizable(false)
        .collapsible(false)
        .auto_sized()
        .show(ctx, |ui| {
             let visuals = ui.visuals().clone();
             let error_color = visuals.error_fg_color;
             let background_color = visuals.widgets.active.bg_fill; // Use active widget background
             egui::Frame::none()
                 .inner_margin(egui::Margin::symmetric(12.0, 8.0))
                 .fill(background_color)
                 .stroke(egui::Stroke::new(1.0, error_color))
                 .rounding(ui.style().visuals.widgets.inactive.rounding)
                 .show(ui, |ui| {
                    ui.horizontal(|ui| {
                         // ui.label(egui::RichText::new("❗").color(error_color));
                         ui.label(egui::RichText::new(error_message).color(error_color));
                    });
                 });
             // Auto-close after a delay (simple repaint check)
             // A real toast needs better timer management
             ctx.request_repaint_after(std::time::Duration::from_secs(5));
             // We need a mechanism to remove this specific toast state after the duration.
             // This simple version just shows it until the next state change clears the error.
         });

}