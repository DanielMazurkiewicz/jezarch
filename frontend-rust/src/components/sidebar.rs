use crate::{state::AppState, views::AppView, models::UserRole};
use eframe::egui;
use strum::IntoEnumIterator; // To iterate over AppView variants
use log; // Import log explicitly

pub fn show_sidebar(state: &mut AppState, ctx: &egui::Context) {
    egui::SidePanel::left("sidebar")
        .resizable(false) // Prevent resizing for simplicity
        .default_width(200.0)
        .show(ctx, |ui| {
            ui.add_space(10.0);
            ui.heading("JezArch");
            if let Some(login) = state.auth.user_login() {
                 ui.small(format!("User: {}", login));
            }
             if let Some(role) = state.auth.user_role() {
                 ui.small(format!("Role: {:?}", role));
            }

            ui.separator();

            ui.with_layout(egui::Layout::top_down_justified(egui::Align::LEFT), |ui| {
                let current_view = state.current_view; // Clone for comparison

                 // Iterate over views suitable for the sidebar
                 for view in AppView::iter() {
                     // Skip views not meant for the sidebar
                     match view {
                         AppView::Loading | AppView::Login | AppView::Register | AppView::SignaturesElements => continue,
                         // Conditionally show Admin view
                          AppView::Admin if state.auth.user_role() != Some(UserRole::Admin) => continue,
                         _ => {}
                     }

                     // TODO: Add icons later if desired
                     // let icon = match view { ... };
                     let label = view.to_string(); // Get display name from strum

                     // Use SelectableLabel for navigation items
                     if ui.selectable_label(current_view == view, label).clicked() {
                         if current_view != view { // Only change if different view clicked
                             state.current_view = view;
                             // Reset specific view state when switching? (Optional)
                             match view {
                                  AppView::SignaturesComponents => {
                                       state.current_component_id_viewing = None;
                                       state.ui_state.components_view_state = Default::default(); // Reset component view state
                                       state.components_cache = None; // Clear component cache
                                  },
                                  AppView::Archive => {
                                       state.current_archive_unit_id_viewing = None;
                                       state.ui_state.archive_view_state = Default::default(); // Reset archive view state
                                       // Cache cleared within the archive view itself when unit changes
                                  },
                                  AppView::SignaturesElements => {
                                       // State reset handled when navigating from components view
                                  }
                                  _ => {} // Add resets for other views if needed
                             }
                         }
                     }
                 }
            });

             // Logout button at the bottom
            ui.with_layout(egui::Layout::bottom_up(egui::Align::Center), |ui| {
                 ui.add_space(10.0);
                 if ui.button("Logout").clicked() {
                     // Trigger logout logic (async task needed)
                     // For now, just clear the state directly
                     log::info!("Logout button clicked (clearing state directly for now)");
                     state.auth.clear();
                     // TODO: Trigger API logout call async
                     // state.trigger_logout(); // which sets a flag for the async handler
                 }
                  ui.separator();
            });
        });
}