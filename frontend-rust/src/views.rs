use crate::state::AppState;
use crate::api::ApiClient;
use eframe::egui;
use strum_macros::{Display, EnumIter}; // For deriving Display and iterating over enum variants
use log; // Import log explicitly

// Module declarations point to files or subdirectories with mod.rs
mod login;
mod register;
mod dashboard;
mod notes;
mod tags;
mod signatures_components;
mod signatures_elements;
pub mod archive; // Make archive public
mod admin; // This correctly points to src/views/admin/mod.rs

/// Represents the different primary views or pages of the application.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Display, EnumIter, serde::Serialize, serde::Deserialize)]
pub enum AppView {
    Loading, // Initial loading state
    Login,
    Register,
    Dashboard,
    Notes,
    Tags,
    SignaturesComponents, // Renamed from Signatures
    SignaturesElements,   // New view for elements of a component
    Archive,
    Admin,
    // Potentially add Error view or handle errors globally
}

impl Default for AppView {
    fn default() -> Self {
        AppView::Loading // Start in loading state
    }
}


/// Main router function to display the correct view based on AppState.
pub fn show_view(state: &mut AppState, api_client: &ApiClient, ctx: &egui::Context) {
    // Handle global loading state separately
    if state.auth.is_loading && state.current_view == AppView::Loading { // Only show full loading screen initially
        egui::CentralPanel::default().show(ctx, |ui| {
            ui.centered_and_justified(|ui| {
                crate::components::loading_spinner::show_spinner(ui, egui::Vec2::splat(32.0));
            });
        });
        return;
    }

    // Handle unauthenticated views
    if !state.auth.is_authenticated() {
        match state.current_view {
            AppView::Login => login::show_login_view(state, api_client, ctx),
            AppView::Register => register::show_register_view(state, api_client, ctx),
            // Redirect any other view to Login if not authenticated
            _ => {
                state.current_view = AppView::Login;
                login::show_login_view(state, api_client, ctx);
            }
        }
        return;
    }

    // --- Authenticated Views ---
    // Render the main layout (Sidebar + Header + Content Area)
    show_main_layout(state, api_client, ctx);

}

/// Renders the main application layout for authenticated users.
fn show_main_layout(state: &mut AppState, api_client: &ApiClient, ctx: &egui::Context) {
    crate::components::sidebar::show_sidebar(state, ctx);

    egui::CentralPanel::default()
        .frame(egui::Frame::central_panel(&ctx.style()).inner_margin(egui::Margin::ZERO)) // Remove central panel padding
        .show(ctx, |ui| {
            ui.vertical(|ui| {
                crate::components::header::show_header(state, ui);

                // Content Area with padding
                 egui::Frame::none()
                    .inner_margin(egui::Margin::same(16.0)) // Add padding around the content
                    .fill(ctx.style().visuals.window_fill()) // Use window background for content area
                    .show(ui, |ui| {
                        // Max width container (optional, for centering content)
                        // ui.set_max_width(1200.0); // Example max width, views can override if needed

                        // Display error overlay if any
                        if let Some(err_msg) = state.ui_state.global_error.as_deref() {
                            crate::components::error_display::show_error_toast(ctx, err_msg);
                            // TODO: Consider clearing the error after showing it once or after a delay
                            // state.ui_state.global_error = None;
                        }

                        // Route to the specific view function
                        match state.current_view {
                            AppView::Dashboard => dashboard::show_dashboard_view(state, ui),
                            AppView::Notes => notes::show_notes_view(state, api_client, ui),
                            AppView::Tags => tags::show_tags_view(state, api_client, ui),
                            AppView::SignaturesComponents => signatures_components::show_components_view(state, api_client, ui),
                            AppView::SignaturesElements => {
                                 // Ensure we have a component ID to view elements for
                                 if state.current_component_id_viewing.is_some() {
                                      signatures_elements::show_elements_view(state, api_client, ui);
                                 } else {
                                      // If no component ID, redirect back to components list
                                      log::warn!("Attempted to view elements without selecting a component. Redirecting.");
                                      state.current_view = AppView::SignaturesComponents;
                                      signatures_components::show_components_view(state, api_client, ui);
                                      crate::components::error_display::show_error_toast(ctx, "Select a component first.");
                                 }
                            },
                            AppView::Archive => archive::show_archive_view(state, api_client, ui),
                            AppView::Admin => {
                                // Ensure user has admin rights (double check)
                                if state.auth.user_role() == Some(crate::models::UserRole::Admin) {
                                    admin::show_admin_view(state, api_client, ui);
                                } else {
                                    state.current_view = AppView::Dashboard; // Redirect non-admins
                                    dashboard::show_dashboard_view(state, ui);
                                     crate::components::error_display::show_error_toast(ctx, "Admin privileges required.");
                                }
                            }
                            // Handle Login/Register/Loading cases (should have been redirected)
                            AppView::Login | AppView::Register | AppView::Loading => {
                                 log::warn!("Unexpected view state reached while authenticated: {:?}", state.current_view);
                                 state.current_view = AppView::Dashboard;
                                 dashboard::show_dashboard_view(state, ui);
                            }
                        }
                    });
            });
        });
}