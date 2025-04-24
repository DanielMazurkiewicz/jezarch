// Declare modules for each admin tab/section
// Expose the main show_admin_view function
use crate::{state::{AppState, AdminTab}, api::ApiClient};
use eframe::egui::{self, Ui};
use strum::IntoEnumIterator; // To iterate over AdminTab variants

pub mod user_management;
pub mod settings_form;
pub mod ssl_config;
pub mod log_viewer;


/// Displays the main admin panel with tabs for different sections.
pub fn show_admin_view(state: &mut AppState, api_client: &ApiClient, ui: &mut Ui) {
    ui.heading("Administration Panel");
    ui.separator();
    ui.add_space(10.0);

    let current_tab = state.ui_state.admin_view_state.current_tab;

    ui.horizontal(|ui| {
        for tab in AdminTab::iter() {
            ui.selectable_value(&mut state.ui_state.admin_view_state.current_tab, tab, tab.to_string());
        }
    });
    ui.separator();
    ui.add_space(10.0);

    // Show content based on selected tab
    match current_tab {
        AdminTab::Users => user_management::show_user_management_tab(state, api_client, ui),
        AdminTab::Settings => settings_form::show_settings_tab(state, api_client, ui),
        AdminTab::Ssl => ssl_config::show_ssl_tab(state, api_client, ui),
        AdminTab::Logs => log_viewer::show_logs_tab(state, api_client, ui),
    }
}