use crate::models::{UserRole, UserInfo};
use serde::{Deserialize, Serialize};
// use std::time::{Duration, Instant}; // Removed unused time imports
use log; // Import log crate explicitly

/// Represents the authentication state of the application.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)] // Ensures default values for new fields during deserialization
pub struct AuthState {
    pub token: Option<String>,
    pub user: Option<UserInfo>, // Store simplified user info
    pub is_loading: bool, // Still needed for initial check / async ops
    #[serde(skip)] // Don't persist temporary errors
    pub error: Option<String>,
    // Potential future fields:
    // #[serde(skip)]
    // pub token_expiry: Option<Instant>,
}

impl Default for AuthState {
    fn default() -> Self {
        Self {
            token: None,
            user: None,
            is_loading: false, // Start loading initially to check persisted state (set to false for now)
            error: None,
            // token_expiry: None,
        }
    }
}

impl AuthState {
    /// Checks if the user is currently authenticated (has a token and user info).
    pub fn is_authenticated(&self) -> bool {
        self.token.is_some() && self.user.is_some()
        // Add expiry check if implemented: && self.token_expiry.map_or(true, |exp| exp > Instant::now())
    }

    /// Clears the authentication state (logout).
    pub fn clear(&mut self) {
        log::info!("Clearing authentication state.");
        self.token = None;
        self.user = None;
        self.is_loading = false; // No longer loading after logout
        self.error = None;
        // self.token_expiry = None;
    }

    /// Updates the state after a successful login.
    pub fn set_authenticated(&mut self, token: String, user_info: UserInfo) {
         log::info!("Setting authentication state for user: {}", user_info.login);
         // Basic validation
         if token.trim().is_empty() {
             log::error!("Attempted to set authentication with an empty token.");
             self.error = Some("Internal error: Invalid token received.".to_string());
             self.clear(); // Reset state if token is invalid
             return;
         }
         if user_info.login.trim().is_empty() {
             log::error!("Attempted to set authentication with an empty login name.");
             self.error = Some("Internal error: Invalid user info received.".to_string());
             self.clear(); // Reset state if user info is invalid
             return;
         }
        self.token = Some(token);
        self.user = Some(user_info);
        self.is_loading = false;
        self.error = None;
        // Set expiry if backend provides it:
        // self.token_expiry = Some(Instant::now() + Duration::from_secs(expiry_duration_secs));
    }

     /// Returns the user's role if authenticated.
     pub fn user_role(&self) -> Option<UserRole> {
         self.user.as_ref().and_then(|u| u.role)
     }

     /// Returns the user's login name if authenticated.
     pub fn user_login(&self) -> Option<&str> {
         self.user.as_ref().map(|u| u.login.as_str())
     }

     /// Returns the user's ID if authenticated and available.
      pub fn user_id(&self) -> Option<i64> {
          self.user.as_ref().and_then(|u| u.user_id)
      }
}