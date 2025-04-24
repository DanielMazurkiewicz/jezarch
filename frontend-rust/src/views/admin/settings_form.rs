use crate::{
    state::{AppState, SettingsState, SettingsFormData}, // Use SettingsFormData from state
    api::{ApiClient, ApiError, AppConfigKey, GenericMessageResponse}, // Import needed types
    components,
    models::AppConfig, // Import AppConfig model
};
use eframe::egui::{self, Ui};
use std::collections::HashMap; // For validation errors
use log; // Import log explicitly

// --- Helper Types for Async Results ---
type FetchSettingsResult = Result<AppConfig, ApiError>;
type UpdateSettingResult = Result<GenericMessageResponse, ApiError>;
// --- Unique IDs for Memory Storage ---
const FETCH_SETTINGS_RESULT_ID: egui::Id = egui::Id::new("fetch_settings_result");
const UPDATE_PORT_RESULT_ID: egui::Id = egui::Id::new("update_port_result");
const UPDATE_LANG_RESULT_ID: egui::Id = egui::Id::new("update_lang_result");


pub fn show_settings_tab(state: &mut AppState, api_client: &ApiClient, ui: &mut Ui) {
    let settings_state = &mut state.ui_state.admin_view_state.settings_state;
    let api_client_clone = api_client.clone(); // Clone for async tasks
    let ctx_clone = ui.ctx().clone(); // Clone for async tasks
    let token_clone = state.auth.token.clone(); // Clone token for async tasks

    // --- Process Async Results ---
     // Process Fetch Result
     if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<FetchSettingsResult>(FETCH_SETTINGS_RESULT_ID)) {
         settings_state.is_loading = false;
         settings_state.has_loaded = true; // Mark as loaded
         match result {
             Ok(configs) => {
                 log::info!("Fetched settings successfully.");
                 settings_state.form_data.port = configs.port.unwrap_or_default();
                 settings_state.form_data.default_language = configs.default_language.unwrap_or_default();
                 settings_state.error = None;
                 // Clear validation errors after successful fetch
                 settings_state.form_data.validation_errors.clear();
             }
             Err(err) => {
                 log::error!("Failed to fetch settings: {}", err);
                 settings_state.error = Some(format!("Failed to load settings: {}", err));
             }
         }
     }

     // Process Update Port Result
      if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<UpdateSettingResult>(UPDATE_PORT_RESULT_ID)) {
          match result {
              Ok(_) => log::info!("Port saved successfully."),
              Err(e) => {
                  log::error!("Failed to save port: {}", e);
                  // Append error to the main error display
                   let err_msg = format!("Port: {}", e);
                   settings_state.error = Some(settings_state.error.as_ref().map_or(err_msg.clone(), |prev| format!("{}\n{}", prev, err_msg)));
              }
          }
           // Decrement saving counter or check if all saves are done
           settings_state.pending_saves = settings_state.pending_saves.saturating_sub(1);
           if settings_state.pending_saves == 0 {
               settings_state.is_saving = false;
               if settings_state.error.is_none() {
                   log::info!("All settings saved successfully.");
                   // Optionally show success toast
               }
           }
      }
      // Process Update Language Result
      if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<UpdateSettingResult>(UPDATE_LANG_RESULT_ID)) {
           match result {
               Ok(_) => log::info!("Language saved successfully."),
               Err(e) => {
                    log::error!("Failed to save language: {}", e);
                    let err_msg = format!("Language: {}", e);
                    settings_state.error = Some(settings_state.error.as_ref().map_or(err_msg.clone(), |prev| format!("{}\n{}", prev, err_msg)));
               }
           }
            settings_state.pending_saves = settings_state.pending_saves.saturating_sub(1);
            if settings_state.pending_saves == 0 {
                settings_state.is_saving = false;
                if settings_state.error.is_none() {
                    log::info!("All settings saved successfully.");
                    // Optionally show success toast
                }
            }
       }


    ui.label(egui::RichText::new("Application Settings").strong());
    ui.label("Configure server port and default language. Changes may require a server restart.");
    ui.separator();
    ui.add_space(10.0);

    // --- Display Errors ---
    if let Some(err) = &settings_state.error {
        components::error_display::show_error_box(ui, err);
        ui.add_space(10.0);
    }

    // --- Fetch Settings on first load ---
    if !settings_state.has_loaded && !settings_state.is_loading {
        trigger_settings_fetch(settings_state, token_clone.clone(), api_client_clone.clone(), ctx_clone.clone());
    }

    // --- Loading ---
    if settings_state.is_loading {
        components::loading_spinner::show_centered_spinner(ui);
    } else {
        // --- Form ---
        let form_data = &mut settings_state.form_data; // Access mutable form data

        egui::Grid::new("settings_grid")
            .num_columns(2)
            .spacing([40.0, 4.0])
            .striped(false)
            .show(ui, |ui| {
                // Port
                ui.label("Server Port:");
                let port_input = ui.add(egui::TextEdit::singleline(&mut form_data.port)
                    .hint_text("e.g., 8080")
                    .desired_width(100.0));
                 if port_input.changed() { validate_port(form_data); } // Validate on change
                 components::form_utils::show_validation_error(ui, form_data.validation_errors.get("port").map(|s|s.as_str()));
                 ui.end_row();

                // Default Language
                ui.label("Default Language:");
                let lang_input = ui.add(egui::TextEdit::singleline(&mut form_data.default_language)
                    .hint_text("e.g., en")
                    .desired_width(100.0));
                 if lang_input.changed() { validate_language(form_data); } // Validate on change
                  components::form_utils::show_validation_error(ui, form_data.validation_errors.get("language").map(|s|s.as_str()));
                  ui.end_row();

                // Add more settings fields here...
            });

        ui.add_space(20.0);

        let can_save = form_data.validation_errors.is_empty(); // Check if no validation errors
        if ui.add_enabled(!settings_state.is_saving && can_save, egui::Button::new("Save Settings")).clicked() {
            log::info!("Save Settings clicked");
             // Check validation again before triggering save
             validate_port(form_data);
             validate_language(form_data);
             if form_data.validation_errors.is_empty() {
                  trigger_settings_save(settings_state, token_clone.clone(), api_client_clone.clone(), ctx_clone.clone());
             } else {
                 settings_state.error = Some("Please fix validation errors before saving.".to_string());
             }
        }
        if settings_state.is_saving {
             components::loading_spinner::show_spinner(ui, egui::vec2(16.0, 16.0));
        }
    }
}

// --- Validation ---
fn validate_port(form_data: &mut SettingsFormData) {
     match form_data.port.parse::<u16>() {
         Ok(p) if (1..=65535).contains(&p) => { form_data.validation_errors.remove("port"); },
         Ok(_) => { form_data.validation_errors.insert("port".to_string(), "Port must be between 1 and 65535.".to_string()); },
         Err(_) => { form_data.validation_errors.insert("port".to_string(), "Port must be a valid number.".to_string()); },
     }
 }

 fn validate_language(form_data: &mut SettingsFormData) {
     if form_data.default_language.trim().len() < 2 {
         form_data.validation_errors.insert("language".to_string(), "Language code is too short (e.g., 'en').".to_string());
     } else {
          form_data.validation_errors.remove("language");
     }
 }


// --- Async Fetch ---
fn trigger_settings_fetch(settings_state: &mut SettingsState, token: Option<String>, api_client: ApiClient, ctx: egui::Context) {
    if settings_state.is_loading { return; }

    settings_state.is_loading = true;
    settings_state.error = None;
    let token = match token {
        Some(t) => t,
        None => {
             settings_state.is_loading = false;
             settings_state.error = Some("Authentication token missing.".to_string());
             return;
        }
    };

    tokio::spawn(async move {
        log::info!("Fetching all application settings");
        // Assuming an endpoint to get all relevant settings at once
        let result: FetchSettingsResult = api_client.get_all_configs(&token).await; // Explicit type

        // Store result in memory
         ctx.memory_mut(|mem| mem.data.insert_temp(FETCH_SETTINGS_RESULT_ID, result));
         ctx.request_repaint();
    });
}

// --- Async Save ---
fn trigger_settings_save(settings_state: &mut SettingsState, token: Option<String>, api_client: ApiClient, ctx: egui::Context) {
     if settings_state.is_saving { return; }

     // Clone data needed for async task
     let port_str = settings_state.form_data.port.clone();
     let lang_str = settings_state.form_data.default_language.clone();
     let token = match token {
        Some(t) => t,
        None => {
             settings_state.is_saving = false;
             settings_state.error = Some("Authentication token missing.".to_string());
             return;
        }
    };

     settings_state.is_saving = true;
     settings_state.error = None;
     settings_state.pending_saves = 0; // Reset pending saves counter

     log::info!("Saving application settings...");

     // Save Port
      settings_state.pending_saves += 1;
      let api_client_port = api_client.clone();
      let token_port = token.clone();
      let ctx_port = ctx.clone();
      tokio::spawn(async move {
          let result: UpdateSettingResult = api_client_port.update_config(AppConfigKey::Port, &port_str, &token_port).await;
           ctx_port.memory_mut(|mem| mem.data.insert_temp(UPDATE_PORT_RESULT_ID, result));
           ctx_port.request_repaint();
      });

     // Save Language
      settings_state.pending_saves += 1;
      let api_client_lang = api_client.clone();
      let token_lang = token.clone();
      let ctx_lang = ctx.clone();
      tokio::spawn(async move {
          let result: UpdateSettingResult = api_client_lang.update_config(AppConfigKey::DefaultLanguage, &lang_str, &token_lang).await;
          ctx_lang.memory_mut(|mem| mem.data.insert_temp(UPDATE_LANG_RESULT_ID, result));
          ctx_lang.request_repaint();
      });

     // Save other settings...
     // settings_state.pending_saves += 1;
     // tokio::spawn(...) for other settings
}

// Add pending_saves: usize to SettingsState in state.rs
#[derive(Debug, Default, Clone)] pub struct SettingsState { pub is_loading: bool, pub is_saving: bool, pub error: Option<String>, pub form_data: SettingsFormData, pub has_loaded: bool, pub pending_saves: usize } // Add pending_saves