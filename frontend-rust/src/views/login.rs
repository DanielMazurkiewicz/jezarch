use crate::{state::AppState, api::{ApiClient, ApiError}, components}; // Import ApiError
use eframe::egui;
use crate::models::{UserCredentials, UserInfo, AuthResponse}; // Import AuthResponse
use log; // Import log explicitly

// Define a unique ID for the login result in memory
const LOGIN_RESULT_ID: egui::Id = egui::Id::new("login_result");
type LoginResult = Result<AuthResponse, ApiError>;

pub fn show_login_view(state: &mut AppState, api_client: &ApiClient, ctx: &egui::Context) {

     // --- Process Login Result from Memory ---
     if let Some(result) = ctx.memory_mut(|mem| mem.data.remove::<LoginResult>(LOGIN_RESULT_ID)) {
         state.ui_state.login_form_state.is_loading = false;
         match result {
             Ok(auth_response) => {
                 log::info!("Login successful for user: {}", auth_response.login);
                 state.auth.set_authenticated(
                     auth_response.token,
                     UserInfo { // Use UserInfo directly
                         user_id: auth_response.user_id,
                         login: auth_response.login,
                         role: auth_response.role,
                     },
                 );
                 state.ui_state.login_form_state.login.clear();
                 state.ui_state.login_form_state.password.clear();
                 state.ui_state.login_form_state.error = None;
                 // View transition happens in main update loop
             }
             Err(err) => {
                 log::error!("Login failed: {}", err);
                 let err_msg = match err {
                      ApiError::Api { status, message } if status == reqwest::StatusCode::UNAUTHORIZED => "Invalid login or password.".to_string(),
                      _ => format!("Login failed: {}", err),
                 };
                 state.ui_state.login_form_state.error = Some(err_msg.clone());
                 state.auth.error = Some(err_msg);
                 state.ui_state.login_form_state.password.clear();
             }
         }
     }


    egui::CentralPanel::default()
        .frame(egui::Frame::none().inner_margin(egui::Margin::same(20.0))) // Add padding
        .show(ctx, |ui| {
            ui.vertical_centered_justified(|ui| {
                 // Use a Card-like frame for the login form
                 egui::Frame::window(&ui.style()) // Use window frame style for card appearance
                    .inner_margin(egui::Margin::same(24.0))
                    .rounding(ui.style().visuals.window_rounding)
                    .shadow(ui.style().visuals.window_shadow)
                    .show(ui, |ui| {
                         ui.set_max_width(350.0); // Limit form width

                        ui.vertical_centered(|ui| {
                             ui.heading("Welcome Back");
                             ui.label("Sign in to access your JezArch account.");
                             ui.add_space(20.0);
                        });

                         // Display Login Error
                         if let Some(err) = &state.ui_state.login_form_state.error {
                             components::error_display::show_error_box(ui, err);
                             ui.add_space(10.0);
                         }

                         // Login Form Fields
                         ui.add(egui::Label::new("Login"));
                         let login_input = ui.add(egui::TextEdit::singleline(&mut state.ui_state.login_form_state.login)
                             .hint_text("Your username")
                             .desired_width(f32::INFINITY)); // Take full width

                         ui.add_space(10.0);

                         ui.add(egui::Label::new("Password"));
                          // Use the PasswordInputWidget directly
                          let password_widget = components::password_input::PasswordInputWidget::new(
                             &mut state.ui_state.login_form_state.password,
                          ).desired_width(f32::INFINITY);
                          let password_input_response = ui.add(password_widget);


                         ui.add_space(20.0);

                         // Submit Button
                         let is_loading = state.ui_state.login_form_state.is_loading;
                         let login_button = egui::Button::new("Sign In").min_size(egui::vec2(ui.available_width(), 0.0));
                          // Check lost_focus on the Response returned by ui.add()
                         if (ui.add_enabled(!is_loading, login_button).clicked()) ||
                             (ui.input(|i| i.key_pressed(egui::Key::Enter)) && (login_input.lost_focus() || password_input_response.lost_focus()))
                         {
                             // Trigger login async task
                             handle_login_request(state, api_client.clone(), ctx.clone());
                         }

                         if is_loading {
                             ui.add_space(5.0);
                             components::loading_spinner::show_centered_spinner(ui);
                         }

                         ui.add_space(15.0);
                         ui.separator();
                         ui.add_space(15.0);

                         // Switch to Register View
                         ui.horizontal(|ui| {
                             ui.label("Don't have an account?");
                             if ui.link("Register").clicked() {
                                 state.current_view = crate::views::AppView::Register;
                                 // Clear login form state when switching
                                 state.ui_state.login_form_state = Default::default();
                             }
                         });
                    });
            });
        });
}

// --- Async Login Handling ---
fn handle_login_request(state: &mut AppState, api_client: ApiClient, ctx: egui::Context) {
    let credentials = UserCredentials {
        login: state.ui_state.login_form_state.login.clone(),
        password: state.ui_state.login_form_state.password.clone(),
    };

    state.ui_state.login_form_state.is_loading = true;
    state.ui_state.login_form_state.error = None;
    state.auth.error = None;

    tokio::spawn(async move {
        log::info!("Attempting login for user: {}", credentials.login);
        let result: LoginResult = api_client.login(&credentials).await; // Explicit type

        // Send result back to UI thread by storing it in memory
        ctx.memory_mut(|mem| mem.data.insert_temp(LOGIN_RESULT_ID, result));
        ctx.request_repaint(); // Wake up UI thread
    });
}