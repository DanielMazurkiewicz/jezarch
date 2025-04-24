use crate::{state::{AppState, SslFormState}, api::{ApiClient, ApiError}, components, models::{SslConfig, GenericMessageResponse}}; // Import types
use eframe::egui::{self, Ui};
use log; // Import log explicitly

// --- Helper Types for Async Results ---
type UploadSslResult = Result<GenericMessageResponse, ApiError>;
type GenerateSslResult = Result<GenericMessageResponse, ApiError>;
// --- Unique IDs for Memory Storage ---
const UPLOAD_SSL_RESULT_ID: egui::Id = egui::Id::new("upload_ssl_result");
const GENERATE_SSL_RESULT_ID: egui::Id = egui::Id::new("generate_ssl_result");

pub fn show_ssl_tab(state: &mut AppState, api_client: &ApiClient, ui: &mut Ui) {
    let form_state = &mut state.ui_state.admin_view_state.ssl_state;
    let api_client_clone = api_client.clone(); // Clone for async tasks
    let token_clone = state.auth.token.clone(); // Clone token for async tasks
    let ctx_clone = ui.ctx().clone(); // Clone context for async tasks

    // --- Process Async Results ---
     // Process Upload Result
     if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<UploadSslResult>(UPLOAD_SSL_RESULT_ID)) {
         form_state.is_uploading = false;
         match result {
             Ok(response) => {
                 log::info!("SSL upload successful: {}", response.message);
                 form_state.upload_success = true;
                 form_state.upload_error = None;
                 // Clear fields after successful upload? Optional.
                 // form_state.key_pem.clear();
                 // form_state.cert_pem.clear();
             }
             Err(e) => {
                 log::error!("SSL upload failed: {}", e);
                 form_state.upload_error = Some(format!("Upload failed: {}", e));
                 form_state.upload_success = false;
             }
         }
     }

     // Process Generate Result
     if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<GenerateSslResult>(GENERATE_SSL_RESULT_ID)) {
         form_state.is_generating = false;
         match result {
             Ok(response) => {
                 log::info!("SSL generation successful: {}", response.message);
                 form_state.generate_success = true;
                 form_state.generate_error = None;
             }
             Err(e) => {
                 log::error!("SSL generation failed: {}", e);
                 form_state.generate_error = Some(format!("Generation failed: {}", e));
                 form_state.generate_success = false;
             }
         }
     }


    ui.columns(2, |columns| {
        // --- Column 1: Upload Existing SSL ---
        columns[0].vertical(|ui| {
            ui.label(egui::RichText::new("Upload Existing SSL").strong());
            ui.label("Paste your private key and certificate (PEM format). Requires server restart.");
            ui.separator();
            ui.add_space(10.0);

            // Display upload status/error
            if let Some(err) = &form_state.upload_error {
                components::error_display::show_error_box(ui, err);
                ui.add_space(5.0);
            }
            if form_state.upload_success {
                ui.label(egui::RichText::new("✅ Upload Successful! Server restart needed.").color(ui.visuals().text_color())); // Simple success message
                ui.add_space(5.0);
            }

            ui.label("Private Key (.key)");
            ui.add(egui::TextEdit::multiline(&mut form_state.key_pem)
                .desired_width(f32::INFINITY)
                .desired_rows(8)
                .code_editor() // Use code editor style
                .hint_text("-----BEGIN PRIVATE KEY-----\n..."));

            ui.add_space(10.0);

            ui.label("Certificate (.crt/.pem)");
                ui.add(egui::TextEdit::multiline(&mut form_state.cert_pem)
                .desired_width(f32::INFINITY)
                .desired_rows(8)
                .code_editor()
                .hint_text("-----BEGIN CERTIFICATE-----\n..."));

            ui.add_space(10.0);

            let upload_button = egui::Button::new("⬆ Upload SSL Files");
            let can_upload = !form_state.is_uploading && !form_state.key_pem.trim().is_empty() && !form_state.cert_pem.trim().is_empty();
            if ui.add_enabled(can_upload, upload_button).clicked() {
                // TODO: Validate PEMs roughly? Backend should validate thoroughly.
                trigger_ssl_upload(form_state, token_clone.clone(), api_client_clone.clone(), ctx_clone.clone());
            }
            if form_state.is_uploading {
                components::loading_spinner::show_centered_spinner(ui);
            }
        });

        // --- Column 2: Generate Self-Signed ---
        columns[1].vertical(|ui| {
            ui.label(egui::RichText::new("Generate Self-Signed SSL").strong());
            ui.label("Generate a new certificate for testing/development (not production). Requires server restart.");
            ui.separator();
            ui.add_space(10.0);

            // Display generate status/error
            if let Some(err) = &form_state.generate_error {
                components::error_display::show_error_box(ui, err);
                ui.add_space(5.0);
            }
            if form_state.generate_success {
                ui.label(egui::RichText::new("✅ Generation Successful! Server restart needed.").color(ui.visuals().text_color()));
                ui.add_space(5.0);
            }

            let generate_button = egui::Button::new("🔄 Generate New Certificate");
            if ui.add_enabled(!form_state.is_generating, generate_button).clicked() {
                // TODO: Add confirmation dialog
                trigger_ssl_generate(form_state, token_clone.clone(), api_client_clone.clone(), ctx_clone.clone());
            }
            if form_state.is_generating {
                components::loading_spinner::show_centered_spinner(ui);
            }
        });
    });
}


// --- Async Upload Trigger ---
fn trigger_ssl_upload(
    form_state: &mut SslFormState,
    token: Option<String>,
    api_client: ApiClient,
    ctx: egui::Context,
) {
     if form_state.is_uploading { return; }
     let token = match token { Some(t) => t, None => {
          form_state.upload_error = Some("Authentication token missing.".to_string());
          return;
     }};

     form_state.is_uploading = true;
     form_state.upload_error = None;
     form_state.upload_success = false;

     let ssl_config = SslConfig {
          key: form_state.key_pem.trim().to_string(),
          cert: form_state.cert_pem.trim().to_string(),
     };

     tokio::spawn(async move {
          log::info!("Uploading SSL configuration...");
          let result: UploadSslResult = api_client.upload_ssl(&ssl_config, &token).await; // Explicit type

          // Store result in memory
           ctx.memory_mut(|mem| mem.data.insert_temp(UPLOAD_SSL_RESULT_ID, result));
           ctx.request_repaint();
     });
}

// --- Async Generate Trigger ---
fn trigger_ssl_generate(
     form_state: &mut SslFormState,
     token: Option<String>,
     api_client: ApiClient,
     ctx: egui::Context,
) {
     if form_state.is_generating { return; }
     let token = match token { Some(t) => t, None => {
          form_state.generate_error = Some("Authentication token missing.".to_string());
          return;
     }};

     form_state.is_generating = true;
     form_state.generate_error = None;
     form_state.generate_success = false;

     tokio::spawn(async move {
          log::info!("Generating self-signed SSL certificate...");
          let result: GenerateSslResult = api_client.generate_ssl(&token).await; // Explicit type

          // Store result in memory
          ctx.memory_mut(|mem| mem.data.insert_temp(GENERATE_SSL_RESULT_ID, result));
          ctx.request_repaint();
     });
}