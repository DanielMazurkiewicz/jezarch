use crate::{
    state::{AppState, UserManagementState},
    api::{ApiClient, ApiError},
    components,
    models::*,
};
use eframe::egui::{self, Ui};
use log; // Import log explicitly

// --- Helper Types for Async Results ---
type FetchUsersResult = Result<Vec<User>, ApiError>;
type UpdateRoleResult = Result<GenericMessageResponse, ApiError>;

// --- Unique IDs for Memory Storage ---
const FETCH_USERS_RESULT_ID: egui::Id = egui::Id::new("fetch_users_result");
const UPDATE_ROLE_RESULT_ID_BASE: &str = "update_role_result_";

pub fn show_user_management_tab(state: &mut AppState, api_client: &ApiClient, ui: &mut Ui) {
    let view_state = &mut state.ui_state.admin_view_state.user_management_state;
    let api_client_clone = api_client.clone(); // Clone for async tasks
    let token_clone = state.auth.token.clone(); // Clone token for async tasks
    let ctx_clone = ui.ctx().clone(); // Clone context for async tasks

    // --- Process Async Results ---
     // Process Fetch Users Result
     if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<FetchUsersResult>(FETCH_USERS_RESULT_ID)) {
         view_state.is_loading = false;
         match result {
             Ok(users) => {
                 log::info!("Fetched {} users successfully.", users.len());
                 // Sort users before storing
                 let mut sorted_users = users;
                 sorted_users.sort_by(|a, b| a.login.cmp(&b.login));
                 view_state.users = sorted_users;
                 view_state.error = None;
             }
             Err(err) => {
                 log::error!("Failed to fetch users: {}", err);
                 view_state.error = Some(format!("Failed to fetch users: {}", err));
                 view_state.users.clear(); // Clear users on error
             }
         }
     }

     // Process Update Role Result (check flag, process result from memory)
     if let Some(updated_login) = ctx_clone.memory_mut(|mem| mem.data.remove::<String>("user_role_updated_flag")) {
         let update_result_id = egui::Id::new(UPDATE_ROLE_RESULT_ID_BASE).with(&updated_login);
         if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<UpdateRoleResult>(update_result_id)) {
              match result {
                  Ok(_) => {
                      log::info!("Successfully updated role for user {}", updated_login);
                      view_state.error = None; // Clear previous errors
                       // Optionally show a success toast
                       components::error_display::show_error_toast(&ctx_clone, &format!("Role updated for {}", updated_login));
                  }
                  Err(e) => {
                      log::error!("Failed to update role for user {}: {}", updated_login, e);
                      view_state.error = Some(format!("Failed to update role for {}: {}", updated_login, e));
                       // Find the user and revert the role in the UI state - Needs original role
                        if let Some(user) = view_state.users.iter_mut().find(|u| u.login == updated_login) {
                             // We need to know the *previous* role to revert.
                             // This approach is tricky. A better way might be to refetch users on error,
                             // or store the original role before making the change.
                             // For simplicity, we might just show the error and let the user retry/refresh.
                             log::warn!("Role update failed for user {}. UI might be inconsistent until refresh.", updated_login);
                        }
                  }
              }
         }
         // Reset loading indicator for this user (if implemented)
     }

    ui.label(egui::RichText::new("User Management").strong());
    ui.label("View and manage user roles. You cannot change your own role here.");
    ui.separator();
    ui.add_space(10.0);

    // --- Display Errors ---
    if let Some(err) = &view_state.error {
        components::error_display::show_error_box(ui, err);
        ui.add_space(10.0);
    }

    // --- Fetch users if needed ---
    // Check if users are empty AND not loading AND no previous error
    let should_fetch = view_state.users.is_empty() && !view_state.is_loading && view_state.error.is_none();
    if should_fetch {
         trigger_users_fetch(token_clone.clone(), api_client_clone.clone(), ctx_clone.clone());
         view_state.is_loading = true; // Set loading state immediately after triggering
    }

    // --- Loading or User List ---
    if view_state.is_loading {
        components::loading_spinner::show_centered_spinner(ui);
    } else {
        show_users_table(ui, view_state, &state.auth.user, api_client_clone, token_clone, ctx_clone); // Pass clones needed for role update
    }
}

// --- Users Table ---
fn show_users_table(
    ui: &mut Ui,
    view_state: &mut UserManagementState,
    current_admin_user: &Option<UserInfo>,
    api_client: ApiClient, // Pass clones
    token: Option<String>,
    ctx: egui::Context,
) {
     use egui_extras::{Column, TableBuilder};

     let current_admin_login = current_admin_user.as_ref().map(|u| &u.login);

     let table = TableBuilder::new(ui)
         .striped(true)
         .resizable(true)
         .cell_layout(egui::Layout::left_to_right(egui::Align::Center))
         .column(Column::auto()) // Login
         .column(Column::initial(150.0).at_least(100.0)) // User ID
         .column(Column::initial(200.0).at_least(150.0)); // Role (Dropdown)

     table.header(20.0, |mut header| {
         header.col(|ui| { ui.strong("Login"); });
         header.col(|ui| { ui.strong("User ID"); });
         header.col(|ui| { ui.strong("Role"); });
     })
     .body(|body| {
         // Use index-based access for mutable borrow inside loop
         let users_count = view_state.users.len();
         body.rows(18.0, users_count, |mut row| {
              let user_index = row.index();
              // Get mutable access to the user within the view_state vector
              if let Some(user) = view_state.users.get_mut(user_index) {
                   let is_self = current_admin_login == Some(&user.login);
                   let user_login_clone = user.login.clone(); // Clone for closure
                   let update_role_result_id = egui::Id::new(UPDATE_ROLE_RESULT_ID_BASE).with(&user_login_clone); // ID for update result

                   row.col(|ui| {
                       ui.label(&user.login);
                   });
                   row.col(|ui| {
                        // Display User ID if available
                        ui.label(user.user_id.map_or_else(|| "-".to_string(), |id| id.to_string()));
                   });
                   row.col(|ui| {
                       let current_role = user.role.unwrap_or_default(); // Default if None
                       let mut selected_role = current_role; // Temporary variable starts with current role

                       // Disable combo box if it's the current admin user
                       ui.add_enabled_ui(!is_self, |ui| {
                            let combo_response = egui::ComboBox::from_id_source(format!("role_combo_{}", user.user_id.unwrap_or(user_index as i64)))
                                .selected_text(format!("{:?}", selected_role)) // Show the temporary role
                                .show_ui(ui, |ui| {
                                    ui.selectable_value(&mut selected_role, UserRole::Admin, "Admin");
                                    ui.selectable_value(&mut selected_role, UserRole::RegularUser, "Regular User");
                                });

                             // Check if the combo box interaction changed the temporary variable
                             if combo_response.inner.map_or(false, |r| r.changed()) {
                                 if selected_role != current_role { // Check if role actually changed
                                     log::info!("Role changed for user '{}' to {:?}", user_login_clone, selected_role);
                                     // Update the actual user role in the state *before* triggering API call
                                     user.role = Some(selected_role);
                                     trigger_role_update(user_login_clone.clone(), selected_role, update_role_result_id, token.clone(), api_client.clone(), ctx.clone());
                                     // TODO: Add visual indication that role update is in progress
                                 }
                             }
                        });


                       if is_self {
                           ui.weak("(Cannot change own role)"); // Use weak text for less emphasis
                       }
                   });
              }
         });
     });

      if view_state.users.is_empty() && !view_state.is_loading {
          ui.centered_and_justified(|ui| {
              ui.label("No users found.");
          });
      }
}

// --- Async Fetch Trigger ---
fn trigger_users_fetch(token: Option<String>, api_client: ApiClient, ctx: egui::Context) {
     let token = match token { Some(t) => t, None => {
         log::error!("trigger_users_fetch: Auth token missing.");
         // Store error result in memory
          let error_result: FetchUsersResult = Err(ApiError::MissingToken);
          ctx.memory_mut(|mem| mem.data.insert_temp(FETCH_USERS_RESULT_ID, error_result));
          ctx.request_repaint();
         return;
     }};

     // Loading state is set before calling this

     tokio::spawn(async move {
          log::info!("Fetching all users");
          let result: FetchUsersResult = api_client.get_all_users(&token).await; // Explicit type

          // Store result in memory
          ctx.memory_mut(|mem| mem.data.insert_temp(FETCH_USERS_RESULT_ID, result));
          ctx.request_repaint();
     });
}

// --- Async Role Update Trigger ---
fn trigger_role_update(
    login: String,
    new_role: UserRole,
    result_id: egui::Id, // Unique ID for the result
    token: Option<String>,
    api_client: ApiClient,
    ctx: egui::Context,
) {
      let token = match token { Some(t) => t, None => {
          log::error!("trigger_role_update: Auth token missing.");
          // Store error result in memory
          let error_result: UpdateRoleResult = Err(ApiError::MissingToken);
          ctx.memory_mut(|mem| mem.data.insert_temp(result_id, error_result));
           // Store flag indicating completion (even on error)
           ctx.memory_mut(|mem| mem.data.insert_temp("user_role_updated_flag", login));
          ctx.request_repaint();
          return;
      }};

      // TODO: Indicate loading specifically for this user's role update

      tokio::spawn(async move {
           log::info!("Updating role for user {} to {:?}", login, new_role);
           let result: UpdateRoleResult = api_client.update_user_role(&login, new_role, &token).await; // Explicit type
           let login_clone = login.clone(); // Clone login for flag

           // Store result and flag in memory
            ctx.memory_mut(|mem| {
                mem.data.insert_temp(result_id, result);
                mem.data.insert_temp("user_role_updated_flag", login_clone); // Flag completion
            });
           ctx.request_repaint();
      });
}