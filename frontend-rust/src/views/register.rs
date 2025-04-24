use crate::{state::AppState, api::{ApiClient, ApiError}, components};
use eframe::egui;
use crate::models::{UserCredentials, GenericMessageResponse}; // Import GenericMessageResponse
use log; // Import log explicitly

// Define a unique ID for the register result in memory
const REGISTER_RESULT_ID: egui::Id = egui::Id::new("register_result");
type RegisterResult = Result<GenericMessageResponse, ApiError>;

pub fn show_register_view(state: &mut AppState, api_client: &ApiClient, ctx: &egui::Context) {

    // --- Process Register Result from Memory ---
    if let Some(result) = ctx.memory_mut(|mem| mem.data.remove::<RegisterResult>(REGISTER_RESULT_ID)) {
        state.ui_state.register_form_state.is_loading = false;
        match result {
            Ok(response) => {
                log::info!("Registration successful. Message: {}", response.message);
                state.ui_state.register_form_state.is_success = true;
                state.ui_state.register_form_state.error = None;
            }
            Err(err) => {
                log::error!("Registration failed: {}", err);
                let err_msg = match err {
                    ApiError::Api { status, message } if status == reqwest::StatusCode::CONFLICT => "Login name already exists.".to_string(),
                    _ => format!("Registration failed: {}", err),
                };
                state.ui_state.register_form_state.error = Some(err_msg);
                state.ui_state.register_form_state.is_success = false;
                // Keep login field populated on error, clear passwords
                state.ui_state.register_form_state.password.clear();
                state.ui_state.register_form_state.confirm_password.clear();
            }
        }
    }


    egui::CentralPanel::default()
        .frame(egui::Frame::none().inner_margin(egui::Margin::same(20.0)))
        .show(ctx, |ui| {
            ui.vertical_centered_justified(|ui| {
                 egui::Frame::window(&ui.style()) // Use window frame style for card appearance
                    .inner_margin(egui::Margin::same(24.0))
                    .rounding(ui.style().visuals.window_rounding)
                    .shadow(ui.style().visuals.window_shadow)
                    .show(ui, |ui| {
                        ui.set_max_width(380.0); // Limit form width

                        ui.vertical_centered(|ui| {
                             ui.heading("Create Account");
                             ui.label("Enter your details to register.");
                             ui.add_space(20.0);
                        });

                        // --- Success Message ---
                        if state.ui_state.register_form_state.is_success {
                             egui::Frame::none()
                                .inner_margin(egui::Margin::same(12.0))
                                .fill(ui.visuals().code_bg_color)
                                .stroke(egui::Stroke::new(1.0, ui.visuals().text_color().linear_multiply(0.3)))
                                .rounding(ui.style().visuals.widgets.inactive.rounding)
                                .show(ui, |ui| {
                                     ui.vertical_centered(|ui| {
                                         ui.label(egui::RichText::new("✅ Registration Successful!").strong());
                                         ui.label("You can now log in with your new account.");
                                         ui.add_space(10.0);
                                         if ui.button("Go to Login").clicked() {
                                             state.current_view = crate::views::AppView::Login;
                                             state.ui_state.register_form_state = Default::default();
                                         }
                                     });
                                 });
                            return; // Don't show the form if successful
                        }

                        // Display Register Error
                        if let Some(err) = &state.ui_state.register_form_state.error {
                            components::error_display::show_error_box(ui, err);
                            ui.add_space(10.0);
                        }

                        // --- Registration Form ---
                        let mut registration_triggered = false;

                        ui.add(egui::Label::new("Login"));
                         let login_input = ui.add(egui::TextEdit::singleline(&mut state.ui_state.register_form_state.login)
                            .hint_text("Choose a username")
                            .desired_width(f32::INFINITY));

                        ui.add_space(10.0);

                        ui.add(egui::Label::new("Password"));
                         let password_widget = components::password_input::PasswordInputWidget::new(
                            &mut state.ui_state.register_form_state.password,
                         ).desired_width(f32::INFINITY);
                         let password_input_response = ui.add(password_widget);


                        ui.add_space(10.0);

                        ui.add(egui::Label::new("Confirm Password"));
                         let confirm_password_widget = components::password_input::PasswordInputWidget::new(
                              &mut state.ui_state.register_form_state.confirm_password,
                          ).desired_width(f32::INFINITY);
                          let confirm_password_input_response = ui.add(confirm_password_widget);


                        // Password Match Validation
                        let passwords_match = state.ui_state.register_form_state.password == state.ui_state.register_form_state.confirm_password;
                        if !passwords_match && !state.ui_state.register_form_state.confirm_password.is_empty() {
                            ui.add_space(2.0);
                            ui.label(egui::RichText::new("Passwords do not match").color(ui.visuals().error_fg_color).small());
                        }

                        ui.add_space(20.0);

                        // Submit Button
                        let is_loading = state.ui_state.register_form_state.is_loading;
                        let register_button = egui::Button::new("Create Account").min_size(egui::vec2(ui.available_width(), 0.0));
                        let can_submit = passwords_match
                            && !state.ui_state.register_form_state.login.trim().is_empty()
                            && !state.ui_state.register_form_state.password.is_empty();


                        // Check if Enter key was pressed after the last input field lost focus
                        let enter_pressed = ui.input(|i| i.key_pressed(egui::Key::Enter));
                        if (ui.add_enabled(!is_loading && can_submit, register_button).clicked()) ||
                           (enter_pressed && (login_input.lost_focus() || password_input_response.lost_focus() || confirm_password_input_response.lost_focus()) && can_submit)
                        {
                             registration_triggered = true;
                        }

                         if registration_triggered {
                            handle_register_request(state, api_client.clone(), ctx.clone());
                         }

                        if is_loading {
                            ui.add_space(5.0);
                            components::loading_spinner::show_centered_spinner(ui);
                        }

                        ui.add_space(15.0);
                        ui.separator();
                        ui.add_space(15.0);

                        // Switch to Login View
                        ui.horizontal(|ui| {
                            ui.label("Already have an account?");
                            if ui.link("Login").clicked() {
                                state.current_view = crate::views::AppView::Login;
                                state.ui_state.register_form_state = Default::default();
                            }
                        });
                    });
            });
        });
}


// --- Async Registration Handling ---
fn handle_register_request(state: &mut AppState, api_client: ApiClient, ctx: egui::Context) {
     if state.ui_state.register_form_state.password != state.ui_state.register_form_state.confirm_password
         || state.ui_state.register_form_state.login.trim().is_empty() // Check trimmed login
         || state.ui_state.register_form_state.password.is_empty() {
          state.ui_state.register_form_state.error = Some("Please ensure all fields are filled and passwords match.".to_string());
         return;
     }

    let credentials = UserCredentials {
        login: state.ui_state.register_form_state.login.trim().to_string(), // Send trimmed login
        password: state.ui_state.register_form_state.password.clone(),
    };

    state.ui_state.register_form_state.is_loading = true;
    state.ui_state.register_form_state.error = None;
    state.ui_state.register_form_state.is_success = false;

    tokio::spawn(async move {
        log::info!("Attempting registration for user: {}", credentials.login);
        let result: RegisterResult = api_client.register(&credentials).await; // Explicit type

        // Send result back to UI thread via memory store
        ctx.memory_mut(|mem| mem.data.insert_temp(REGISTER_RESULT_ID, result));
        ctx.request_repaint(); // Wake up UI thread
    });
}