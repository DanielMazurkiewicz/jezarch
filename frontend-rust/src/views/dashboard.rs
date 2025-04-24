use crate::state::AppState;
use eframe::egui;

pub fn show_dashboard_view(state: &mut AppState, ui: &mut egui::Ui) {
    ui.vertical_centered(|ui| {
        ui.heading("Dashboard");
        ui.separator();
        ui.add_space(10.0);

        if let Some(login) = state.auth.user_login() {
            ui.label(format!("Welcome, {}!", login));
        } else {
            ui.label("Welcome!");
        }

        ui.add_space(10.0);
        ui.label("Select a section from the sidebar to get started.");

        // Example: Add more dashboard widgets later
        // ui.collapsing("Stats", |ui| {
        //     ui.label("Notes count: ...");
        //     ui.label("Documents count: ...");
        // });
    });
}