use crate::{
    api::{ApiClient, ApiError}, // Import ApiError
    components::{element_browser_popover_content, loading_spinner},
    models::{SignatureElement}, // Use appropriate model, removed unused SearchResult
    state::AppState, // Import AppState for the browser props
};
use eframe::egui::{self, Button, Response, RichText, Ui, Widget};
use std::collections::HashMap; // For caching resolved paths
use egui::mutex::Mutex; // Use egui's Mutex for state access across threads if needed
use std::sync::Arc; // Use Arc for shared ownership
use log; // Import log explicitly

/// Represents a resolved signature path for display.
#[derive(Clone, Debug)]
struct ResolvedSignature {
    id_path: Vec<i64>,
    display: String,
}

// State needs to be Send + Sync if updated from async task directly
// Using Arc<Mutex<HashMap>> for the cache passed in allows this.
// Internal widget state (like is_browser_open) can remain simple.
#[derive(Clone, Debug, Default)]
struct SignatureSelectorState {
    is_browser_open: bool,
    is_resolving: bool, // Flag to indicate if path resolution is in progress
    error: Option<String>,
}

// --- Helper Types for Async Results ---
type ResolveElementResult = Result<SignatureElement, ApiError>;
// ID to store the result map in memory temporarily
const RESOLVED_PATHS_RESULT_ID: egui::Id = egui::Id::new("resolved_paths_result");

/// Widget for selecting multiple signature paths.
pub struct SignatureSelectorWidget<'a> {
    signatures: &'a mut Vec<Vec<i64>>, // Vec of paths (Vec of element IDs)
    label: String,
    api_client: &'a ApiClient,
    token: Option<&'a str>,
    id_source: egui::Id,
    // Cache for resolved paths passed via Arc<Mutex>
    resolved_paths_cache: Arc<Mutex<HashMap<Vec<i64>, String>>>,
    // Pass AppState for the browser popup
    app_state_ref: &'a mut AppState,
}


impl<'a> SignatureSelectorWidget<'a> {
    pub fn new(
        signatures: &'a mut Vec<Vec<i64>>,
        id_source: impl std::hash::Hash,
        api_client: &'a ApiClient,
        token: Option<&'a str>,
        resolved_paths_cache: Arc<Mutex<HashMap<Vec<i64>, String>>>, // Expect Arc<Mutex<...>>
        app_state_ref: &'a mut AppState, // Add app_state_ref
    ) -> Self {
        Self {
            signatures,
            label: "Signatures".to_string(),
            api_client,
            token,
            id_source: egui::Id::new(id_source),
            resolved_paths_cache,
            app_state_ref, // Store app_state_ref
        }
    }

    pub fn label(mut self, label: impl Into<String>) -> Self {
        self.label = label.into();
        self
    }
}


impl<'a> Widget for SignatureSelectorWidget<'a> {
    fn ui(self, ui: &mut Ui) -> Response {
        let mut selector_state = ui.memory_mut(|mem| {
             // Use get_temp_mut_or_default which returns &mut T directly
            mem.data.get_temp_mut_or_default::<SignatureSelectorState>(self.id_source).clone() // Clone to avoid double borrow
        });

        // --- Process Async Resolve Results ---
        if let Some(resolved_data) = ui.ctx().memory_mut(|mem| mem.data.remove::<HashMap<Vec<i64>, String>>(RESOLVED_PATHS_RESULT_ID)) {
             if !resolved_data.is_empty() {
                  let mut cache = self.resolved_paths_cache.lock();
                  cache.extend(resolved_data);
             }
             // Update state after processing
             ui.memory_mut(|mem| {
                 if let Some(state) = mem.data.get_temp_mut::<SignatureSelectorState>(self.id_source) {
                     state.is_resolving = false;
                     // TODO: Handle errors reported from the async task if necessary
                     // state.error = ...
                 }
             });
             // Refresh local copy of state
             selector_state = ui.memory_mut(|mem| mem.data.get_temp_mut_or_default::<SignatureSelectorState>(self.id_source).clone());
        }


        // Clone necessary data for async task before moving self
        let api_client_resolve = self.api_client.clone();
        let token_resolve = self.token.map(String::from);
        let id_resolve = self.id_source; // Used only for selector state update marker
        let cache_clone = Arc::clone(&self.resolved_paths_cache);
        let signatures_clone = self.signatures.clone(); // Clone current signatures for filtering
        let ctx_resolve = ui.ctx().clone();


        // --- Resolve paths that are not yet cached ---
        let paths_to_resolve: Vec<Vec<i64>> = { // Scope the cache lock
            let cache = cache_clone.lock();
            signatures_clone.iter()
                .filter(|p| !p.is_empty() && !cache.contains_key(*p)) // Also check if path is not empty
                .cloned()
                .collect()
        };


        if !paths_to_resolve.is_empty() && !selector_state.is_resolving {
            selector_state.is_resolving = true;
            selector_state.error = None; // Clear previous errors

            tokio::spawn(async move {
                 log::info!("Resolving {} signature paths...", paths_to_resolve.len());
                 let mut resolved_data = HashMap::new();
                 let mut _errors = Vec::new(); // Store errors if needed

                 for id_path in paths_to_resolve {
                      if id_path.is_empty() { continue; }
                      let mut display_parts = Vec::with_capacity(id_path.len());
                      let mut path_had_error = false; // Track errors for this specific path

                      for element_id in &id_path {
                           if let Some(t) = &token_resolve {
                               match api_client_resolve.get_signature_element_by_id(*element_id, &[], t).await {
                                    Ok(el) => display_parts.push(format!("{}{}", el.index.as_deref().map(|i| format!("[{}] ", i)).unwrap_or_default(), el.name)),
                                    Err(e) => {
                                         log::error!("Failed to resolve element ID {} in path {:?}: {}", element_id, id_path, e);
                                         display_parts.push(format!("[ErrID:{}]", element_id));
                                         let error_msg = format!("Path {:?}: {}", id_path, e);
                                         // Avoid duplicate generic errors
                                         // if !errors.contains(&error_msg) { errors.push(error_msg); }
                                         path_had_error = true;
                                    }
                               }
                           } else {
                                _errors.push("Missing token for resolving".to_string());
                                path_had_error = true;
                                break; // Stop resolving this path if token is missing
                           }
                      }
                       // Store even if there was an error, to show partial result / error indicator
                       resolved_data.insert(id_path, display_parts.join(" / "));
                 }

                 // Send result back via memory store
                 ctx_resolve.memory_mut(|mem| mem.data.insert_temp(RESOLVED_PATHS_RESULT_ID, resolved_data));
                  // Optionally store errors if needed: ctx_resolve.memory_mut(|mem| mem.data.insert_temp(RESOLVED_PATHS_ERROR_ID, errors));
                 ctx_resolve.request_repaint();
            });
             // Update the state in memory immediately after spawning
             ui.memory_mut(|mem| mem.data.insert_temp(self.id_source, selector_state.clone()));
        }

        // --- Main Widget Layout ---
        let outer_response = ui.vertical(|ui| {
            // Header (Label + Add Button)
            ui.horizontal(|ui| {
                ui.label(&self.label);
                 ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                      let add_button = ui.add(Button::new("➕ Add").small());
                      if add_button.clicked() {
                           selector_state.is_browser_open = true;
                      }

                      // --- Element Browser Popover ---
                      if selector_state.is_browser_open {
                           // Use show_element_browser directly, passing a callback
                           let popover_id = self.id_source.with("browser_popover"); // Unique ID for the popover
                            // Need mutable access to signatures and app_state_ref, which is tricky.
                            // We modify the original `signatures` ref directly in the callback.
                            // Pass `app_state_ref` mutably into the props.
                           let signatures_ptr = self.signatures as *mut Vec<Vec<i64>>;
                           let selector_id_clone = self.id_source; // Clone ID for callback
                           //let app_state_ptr = self.app_state_ref as *mut AppState; // Pointer for app state

                           egui::popup_below_widget(ui, popover_id, &add_button, |ui_popover| { // Use popup_below_widget
                               ui_popover.set_max_width(500.0); // Set max width for browser

                               // Instantiate the browser content props
                                let browser_props = element_browser_popover_content::ElementBrowserPopoverProps {
                                    ui: ui_popover, // Pass the popup ui mutable reference
                                    api_client: self.api_client,
                                    token: self.token,
                                    app_state_ref: self.app_state_ref, // Pass the mutable reference
                                    on_select_signature: Box::new(move |selected_ids| {
                                         // Callback when a signature is selected in the browser
                                         log::info!("Signature selected from browser: {:?}", selected_ids);

                                         // SAFETY: Ensure this callback is only called from the UI thread
                                         // where `signatures` is valid. This should hold true for egui callbacks.
                                         // We need mutable access, hence the pointer.
                                         unsafe {
                                              let signatures_ref = &mut *signatures_ptr;
                                              // Avoid adding duplicates by comparing the vectors directly
                                              if !signatures_ref.contains(&selected_ids) {
                                                   signatures_ref.push(selected_ids);
                                              }
                                         }

                                         // Update state via memory, not direct mutation here
                                          // Use the context captured by the closure
                                          ui_popover.ctx().memory_mut(|mem| {
                                              if let Some(state) = mem.data.get_temp_mut::<SignatureSelectorState>(selector_id_clone) {
                                                   state.is_browser_open = false; // Close browser on select
                                              }
                                          });
                                          ui_popover.ctx().request_repaint(); // Request repaint after selection
                                    }),
                               };
                                // Show the browser content
                                element_browser_popover_content::show_element_browser(browser_props);
                           });

                            // Close popover logic (simplified - handled by popup_below_widget implicitly on outside click)
                            if ui.input(|i| i.key_pressed(egui::Key::Escape)) {
                                 selector_state.is_browser_open = false;
                            }
                      } // end if browser open
                 }); // end right_to_left layout
            }); // end horizontal header

            // --- List of Selected Signatures ---
            ui.add_space(4.0);
            let list_frame = egui::Frame::group(ui.style())
                 .inner_margin(egui::Margin::same(4.0));

            list_frame.show(ui, |ui| {
                 ui.set_max_height(150.0); // Limit height of the list area
                 egui::ScrollArea::vertical().show(ui, |ui| {
                      if selector_state.is_resolving && self.signatures.is_empty() { // Show spinner only if list is empty while resolving
                           loading_spinner::show_centered_spinner(ui);
                      } else if self.signatures.is_empty() {
                           ui.weak("(None)");
                      } else {
                           let cache = self.resolved_paths_cache.lock(); // Lock cache for display
                           let mut removed_idx: Option<usize> = None;
                           for i in 0..self.signatures.len() {
                                if let Some(path) = self.signatures.get(i) { // Safely get path
                                     ui.horizontal(|ui| {
                                         // Display resolved path or loading/error state
                                         let display_text = cache.get(path)
                                             .cloned()
                                             .unwrap_or_else(|| "(Resolving...)".to_string());
                                         ui.label(display_text);

                                         ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                                             if ui.add(Button::new("❌").small()).clicked() {
                                                 removed_idx = Some(i); // Mark index for removal
                                             }
                                         });
                                     });
                                }
                           }
                            // Perform removal outside the loop
                            if let Some(idx) = removed_idx {
                                 if idx < self.signatures.len() { // Bounds check before removing
                                     let _removed_path = self.signatures.remove(idx);
                                     // No need to explicitly remove from cache - it will be unused
                                     // self.resolved_paths_cache.lock().remove(&removed_path); // Optional cleanup
                                 }
                            }
                      }
                 }); // end ScrollArea
            }); // end Frame::group

             // Display resolving errors
             if let Some(err) = &selector_state.error {
                 ui.label(RichText::new(err).color(ui.visuals().error_fg_color).small());
             }

        }).response; // end outer_response vertical layout

        // Persist selector state (if it needs persisting, otherwise use temp)
         ui.memory_mut(|mem| mem.data.insert_temp(self.id_source, selector_state)); // Use insert_temp


        outer_response
    }
}


/// Convenience function to show the SignatureSelectorWidget.
/// Requires mutable access to a cache (`HashMap<Vec<i64>, String>`) stored in the parent component's state, passed via Arc<Mutex>.
pub fn show_signature_selector<'a>(
    ui: &mut Ui,
    signatures: &'a mut Vec<Vec<i64>>,
    resolved_paths_cache: Arc<Mutex<HashMap<Vec<i64>, String>>>, // Expect Arc<Mutex<...>>
    api_client: &'a ApiClient,
    token: Option<&'a str>,
    label: Option<&str>,
    app_state_ref: &'a mut AppState, // Pass AppState reference
) -> Response {
    let id_source = ui.next_auto_id();
    let mut selector = SignatureSelectorWidget::new(
        signatures,
        id_source,
        api_client,
        token,
        resolved_paths_cache, // Pass Arc<Mutex> cache reference
        app_state_ref, // Pass AppState reference
    );
    if let Some(lbl) = label {
        selector = selector.label(lbl);
    }
    ui.add(selector)
}