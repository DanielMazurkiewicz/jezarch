#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // hide console window on Windows in release

mod app;
mod views;
mod state;
mod models;
mod api;
mod components;
mod utils;
mod auth;
mod style; // If needed later

use app::JezArchApp;
use eframe::egui; // Import egui directly

#[tokio::main]
async fn main() -> Result<(), eframe::Error> {
    env_logger::init(); // Log to stderr (if you run with `RUST_LOG=debug`).
    log::info!("Starting JezArch Rust Frontend");

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1024.0, 768.0]) // Default window size
            .with_min_inner_size([600.0, 400.0])
            .with_icon(
                // NOTE: Icon loading requires `egui/png` or `egui/jpeg` feature or manual loading
                // For simplicity, we skip icon loading here. You'd typically use:
                // eframe::icon_data::from_png_bytes(&include_bytes!("../assets/logo.png")[..]).unwrap()
                // Or load SVG manually if needed and convert.
                egui::IconData::default()
            ),
        // follow_system_theme: true, // Removed to manually control theme if needed
        // default_theme: eframe::Theme::Light, // Removed to manually control theme if needed
        persist_window: true, // Remember window size/position
        ..Default::default()
    };

    eframe::run_native(
        "JezArch", // App name
        options,
        Box::new(|cc| {
            // Configure egui style if needed
            style::setup_style(&cc.egui_ctx);

            // Create the main app state
            Box::new(JezArchApp::new(cc))
        }),
    )
}