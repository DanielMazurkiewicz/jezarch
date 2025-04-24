use crate::{views::AppView, state::AppState, api::ApiClient};
use eframe::{egui, App, Frame};
// use std::sync::{Arc, Mutex}; // Removed unused imports
use std::time::Duration;

/// Main application state holder.
pub struct JezArchApp {
    /// Holds application state like auth, data, view, etc.
    pub state: AppState, // Made public for callbacks
    pub api_client: ApiClient, // Made public for callbacks
    // Add fields for managing async operations if needed (e.g., using poll-promise)
    // Example: login_promise: Option<poll_promise::Promise<Result<models::AuthResponse, api::ApiError>>>
}

impl JezArchApp {
    /// Constructor for the application.
    pub fn new(_cc: &eframe::CreationContext<'_>) -> Self {
        // Try to load persisted state (like auth token)
        let state = AppState::load().unwrap_or_else(|e| {
            log::warn!("Failed to load persisted state: {}. Using default.", e);
            AppState::default()
        });

        // Setup egui context (e.g., fonts, style) if not done in main.rs
        // setup_custom_fonts(&cc.egui_ctx);

        Self {
            state,
            api_client: ApiClient::new(),
            // Initialize async fields if needed
        }
    }
}

impl App for JezArchApp {
    /// Called whenever the application state needs to be updated or repainted.
    fn update(&mut self, ctx: &egui::Context, _frame: &mut Frame) { // Use _frame for persistence check
        // Simple periodic repaint request for dynamic content or animations
        ctx.request_repaint_after(Duration::from_millis(100));

        // Check memory flags and update state accordingly
        // Example: Check for loading flags set by async triggers
        crate::views::tags::check_and_set_tags_loading(ctx, &mut self.state);
        crate::views::signatures_components::check_and_set_components_loading(ctx, &mut self.state);
        // Add checks for other views as needed


        // Determine which view to show based on auth state
        let current_view = if self.state.auth.is_loading {
            AppView::Loading
        } else if !self.state.auth.is_authenticated() {
            // Allow switching between login/register within the Unauthenticated state
            match self.state.current_view {
                AppView::Login | AppView::Register => self.state.current_view,
                _ => AppView::Login, // Default to login if not auth'd and not explicitly on register
            }
        } else {
            // If authenticated, show the requested view or default to Dashboard
            match self.state.current_view {
                AppView::Login | AppView::Register | AppView::Loading => AppView::Dashboard, // Redirect away from auth/loading views
                _ => self.state.current_view,
            }
        };
        // Update the state's current view if it changed due to auth logic
        self.state.current_view = current_view;


        // Show the appropriate view
        crate::views::show_view(&mut self.state, &self.api_client, ctx);

        // Persist state occasionally (e.g., on window close)
        if ctx.input(|i| i.viewport().close_requested()) {
            // save() is called automatically by eframe on close, but we might want finer control
             log::info!("Close requested, attempting to save state...");
             if let Err(e) = self.state.save() {
                 log::error!("Failed to save app state on close request: {}", e);
             }
        }
    }

    /// Called on shutdown. Persist state here.
    fn save(&mut self, _storage: &mut dyn eframe::Storage) {
        if let Err(e) = self.state.save() {
            log::error!("Failed to save app state on shutdown: {}", e);
        }
    }

     // Example: Customize window background based on theme or state
     fn clear_color(&self, visuals: &egui::Visuals) -> [f32; 4] {
         visuals.window_fill().to_normalized_gamma_f32()
     }
}

// Helper function (example)
// fn setup_custom_fonts(ctx: &egui::Context) {
//     let mut fonts = egui::FontDefinitions::default();
//     // Add custom fonts if needed
//     // fonts.font_data.insert("my_font".to_owned(), egui::FontData::from_static(include_bytes!("my_font.ttf")));
//     // fonts.families.entry(egui::FontFamily::Proportional).or_default().insert(0, "my_font".to_owned());
//     ctx.set_fonts(fonts);
// }