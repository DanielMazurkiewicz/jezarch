use crate::state::AppState;
use eframe::egui;

pub fn show_header(state: &mut AppState, ui: &mut egui::Ui) {
    // Use a TopBottomPanel or just a horizontal layout within the central panel's vertical layout
    egui::Frame::none()
        .inner_margin(egui::Margin::symmetric(16.0, 8.0)) // Padding for the header area
        .fill(ui.visuals().widgets.inactive.bg_fill) // Use a subtle background
        .stroke(ui.visuals().widgets.inactive.bg_stroke) // Add a bottom border implicitly
        .show(ui, |ui| {
             ui.horizontal_wrapped(|ui| {
                 ui.label(egui::RichText::new(state.current_view.to_string()).heading()); // Show current view name as title

                 ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                      // Logout Button (Example, same logic as sidebar)
                      if ui.button("Logout").clicked() {
                          log::info!("Header Logout button clicked (clearing state directly for now)");
                          state.auth.clear();
                      }

                      // Display User Info
                      if let Some(login) = state.auth.user_login() {
                          if let Some(role) = state.auth.user_role() {
                              ui.label(format!("{} ({:?})", login, role));
                          } else {
                               ui.label(login);
                          }
                      }
                 });
            });
        });
     ui.separator(); // Add a visual separator below the header
}