use crate::{
    api::{ApiClient, ApiError},
    components::{loading_spinner, signatures::element_form}, // Removed unused element_selector
    models::*,
    state::{AppState, ElementEditorState}, // Use ElementEditorState from state module
};
use eframe::egui::{self, Button, ComboBox, Response, RichText, TextEdit, Ui}; // Removed Id, SelectableLabel
use std::{collections::HashSet, time::Duration, hash::Hash}; // Added Hash
use serde::{Serialize, Deserialize}; // Add serde derives
use log;

const DEBOUNCE_DELAY: Duration = Duration::from_millis(300); // Debounce delay for search

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize, Default)] // Added Default derive
enum SelectionMode {
    #[default] // Add default variant
    Hierarchical,
    Free,
}

// State stored in egui memory for the browser popover
#[derive(Clone, Debug, Default, Serialize, Deserialize)] // Derive Serialize/Deserialize
#[serde(default)] // Ensure default values on load
struct BrowserState {
    mode: SelectionMode,
    selected_component_id: String, // Store as String for ComboBox
    current_path_elements: Vec<SignatureElement>, // Elements in the currently built path
    available_components: Vec<SignatureComponent>,
    available_elements: Vec<SignatureElement>, // Elements available for selection at current step
    search_term: String,
    debounced_search_term: String,
    last_search_update: f64, // Time of last search term change
    is_loading_components: bool,
    is_loading_elements: bool,
    error: Option<String>,
    is_create_dialog_open: bool, // Internal flag to control create dialog
    // Add a field to track dependencies for fetching elements
    #[serde(skip)]
    last_fetch_dependencies_hash: u64,
}

// --- Helper types for async results stored in memory ---
type FetchComponentsResult = Result<Vec<SignatureComponent>, ApiError>;
type FetchElementsResult = Result<Vec<SignatureElement>, ApiError>;

// --- Unique IDs for memory storage ---
const BROWSER_FETCH_COMPONENTS_RESULT_ID: egui::Id = egui::Id::new("browser_fetch_components_result");
const BROWSER_FETCH_ELEMENTS_RESULT_ID: egui::Id = egui::Id::new("browser_fetch_elements_result");


/// Props for the Element Browser Popover Content.
pub struct ElementBrowserPopoverProps<'a> {
    pub on_select_signature: Box<dyn FnMut(Vec<i64>) + 'a>, // Callback with the selected path IDs
    pub api_client: &'a ApiClient,
    pub token: Option<&'a str>,
    pub ui: &'a mut Ui, // Pass Ui directly
    // Pass AppState reference for accessing editor state for the create dialog
    pub app_state_ref: &'a mut AppState,
}

/// Renders the content for the element browser popover.
pub fn show_element_browser(props: ElementBrowserPopoverProps) -> Response {
    let ElementBrowserPopoverProps {
        mut on_select_signature,
        api_client,
        token,
        ui,
        app_state_ref, // Destructure app_state_ref
    } = props;

    let id = ui.id().with("element_browser_popover");
    let mut browser_state = ui.memory_mut(|mem| {
        // Use get_persisted_mut_or_default which returns &mut T directly
        mem.data.get_persisted_mut_or_default::<BrowserState>(id).clone() // Clone needed to avoid double mutable borrow later
    });
    let time = ui.input(|i| i.time);

     // --- Process Async Results ---
     // Fetch Components Result
     if let Some(result) = ui.ctx().memory_mut(|mem| mem.data.remove::<FetchComponentsResult>(BROWSER_FETCH_COMPONENTS_RESULT_ID)) {
         // Update state directly within the closure, needs mutable borrow again
         ui.memory_mut(|mem| {
             if let Some(state) = mem.data.get_persisted_mut::<BrowserState>(id) { // Use get_persisted_mut
                 state.is_loading_components = false;
                 match result {
                     Ok(mut comps) => {
                         comps.sort_by(|a,b| a.name.cmp(&b.name));
                         state.available_components = comps;
                         state.error = None;
                     },
                     Err(e) => {
                         state.error = Some(format!("Comps: {}", e));
                         state.available_components.clear();
                     }
                 }
             }
         });
         // No need to update local `browser_state` copy, it's stale now, will be re-read next frame if needed.
     }

     // Fetch Elements Result
     if let Some(result) = ui.ctx().memory_mut(|mem| mem.data.remove::<FetchElementsResult>(BROWSER_FETCH_ELEMENTS_RESULT_ID)) {
          ui.memory_mut(|mem| {
              if let Some(state) = mem.data.get_persisted_mut::<BrowserState>(id) { // Use get_persisted_mut
                  state.is_loading_elements = false;
                  match result {
                      Ok(mut elems) => {
                          elems.sort_by(|a, b| (a.index.as_deref().unwrap_or(&a.name)).cmp(b.index.as_deref().unwrap_or(&b.name)));
                          state.available_elements = elems;
                          state.error = None;
                      },
                      Err(e) => {
                          state.error = Some(format!("Elements: {}", e));
                          state.available_elements.clear();
                      }
                  }
              }
          });
     }


    // --- Debounce Search Term ---
    if browser_state.last_search_update < time - DEBOUNCE_DELAY.as_secs_f64()
        && browser_state.search_term != browser_state.debounced_search_term
    {
        browser_state.debounced_search_term = browser_state.search_term.clone();
        // Element fetch is triggered based on dependency hash change below
        browser_state.last_fetch_dependencies_hash = 0; // Force fetch on debounce change
    }

    // --- Fetch Components (if needed) ---
    let api_client_comps = api_client.clone();
    let token_comps = token.map(String::from);
    let ctx_comps = ui.ctx().clone(); // Clone context for async task
    if browser_state.available_components.is_empty() && !browser_state.is_loading_components {
         browser_state.is_loading_components = true;
         browser_state.error = None;
         tokio::spawn(async move {
             let result: FetchComponentsResult = if let Some(t) = token_comps {
                 api_client_comps.get_all_signature_components(&t).await
             } else { Err(ApiError::MissingToken) };
             // Store result in memory
             ctx_comps.memory_mut(|mem| mem.data.insert_temp(BROWSER_FETCH_COMPONENTS_RESULT_ID, result));
             ctx_comps.request_repaint();
         });
    }

    // --- Fetch Elements Logic ---
    let api_client_elems = api_client.clone();
    let token_elems = token.map(String::from);
    let current_mode = browser_state.mode;
    let last_element_id = browser_state.current_path_elements.last().and_then(|el| el.signature_element_id);
    let filter_comp_id_str = browser_state.selected_component_id.clone();
    let search_text = browser_state.debounced_search_term.trim().to_string();
    //let id_elems = id; // No longer needed for direct state update
    let ctx_elems = ui.ctx().clone(); // Clone context for async task

    // Determine if a fetch is necessary based on dependencies changing
     let current_dependencies_hash = egui::util::hash((
         current_mode,
         last_element_id,
         &filter_comp_id_str,
         &search_text,
     ));
     let mut needs_fetch = false;
     if browser_state.last_fetch_dependencies_hash != current_dependencies_hash {
         needs_fetch = true;
         browser_state.last_fetch_dependencies_hash = current_dependencies_hash; // Update hash in state
     }


    if needs_fetch && !browser_state.is_loading_elements {
         browser_state.is_loading_elements = true;
         browser_state.error = None; // Clear previous error

         tokio::spawn(async move { // No return value needed from spawn block itself
              log::debug!("Triggering element fetch. Mode: {:?}, LastEl: {:?}, Comp: '{}', Search: '{}'", current_mode, last_element_id, filter_comp_id_str, search_text);
              let result: FetchElementsResult = if let Some(t) = token_elems {
                  let mut search_req = SearchRequest { page_size: 200, ..Default::default() }; // Limit results
                  let mut has_condition = false; // Track if any query condition is added

                  if !search_text.is_empty() {
                       search_req.query.push(SearchQueryElement { field: "name".to_string(), condition: SearchCondition::Fragment, value: search_text.into(), not: false });
                       has_condition = true;
                  }

                   match current_mode {
                       SelectionMode::Hierarchical => {
                            if let Some(parent_id) = last_element_id {
                                 // Fetch children of the last element
                                 search_req.query.push(SearchQueryElement { field: "parentIds".to_string(), condition: SearchCondition::AnyOf, value: vec![parent_id].into(), not: false });
                                 has_condition = true;
                            } else if let Ok(comp_id) = filter_comp_id_str.parse::<i64>() {
                                 // Fetch root elements of the selected component
                                 search_req.query.push(SearchQueryElement { field: "signatureComponentId".to_string(), condition: SearchCondition::Eq, value: comp_id.into(), not: false });
                                 search_req.query.push(SearchQueryElement { field: "hasParents".to_string(), condition: SearchCondition::Eq, value: false.into(), not: false });
                                 has_condition = true;
                            }
                            // If no component/parent selected, has_condition remains false, no fetch needed.
                       },
                       SelectionMode::Free => {
                           if let Ok(comp_id) = filter_comp_id_str.parse::<i64>() {
                                // Fetch all elements from the selected component (filtered by search term if any)
                                search_req.query.push(SearchQueryElement { field: "signatureComponentId".to_string(), condition: SearchCondition::Eq, value: comp_id.into(), not: false });
                                has_condition = true;
                           }
                           // If only search term, query across all components is handled by the name fragment filter (has_condition already true)
                           // If no component and no search term, has_condition remains false.
                       }
                   }
                   // Only proceed if there's a query condition (component, parent, or search term)
                   if has_condition {
                        api_client_elems.search_signature_elements(&search_req, &t).await
                           .map(|res| res.data.into_iter().map(|sr| sr.element).collect())
                   } else {
                        Ok(vec![]) // No condition, return empty list without API call
                   }
              } else {
                   Err(ApiError::MissingToken)
              };

              // Store result in memory
              ctx_elems.memory_mut(|mem| mem.data.insert_temp(BROWSER_FETCH_ELEMENTS_RESULT_ID, result));
              ctx_elems.request_repaint();
         }); // end tokio::spawn
    }


    // --- UI Rendering ---
    let response = ui.vertical(|ui| {
        // Mode Selector
        ui.horizontal(|ui| {
             ui.label("Mode:");
             if ui.selectable_value(&mut browser_state.mode, SelectionMode::Hierarchical, "Hierarchical").changed() {
                  browser_state.available_elements.clear(); // Clear elements on mode change
                  browser_state.last_fetch_dependencies_hash = 0; // Force refetch
             };
             if ui.selectable_value(&mut browser_state.mode, SelectionMode::Free, "Free").changed() {
                  browser_state.available_elements.clear(); // Clear elements on mode change
                  browser_state.last_fetch_dependencies_hash = 0; // Force refetch
             };

             if ui.button("🔄").on_hover_text("Reset Selection").clicked() {
                  browser_state.current_path_elements.clear();
                  browser_state.selected_component_id.clear();
                  browser_state.search_term.clear();
                  browser_state.debounced_search_term.clear();
                  browser_state.available_elements.clear(); // Clear elements on reset
                  browser_state.error = None;
                  browser_state.last_fetch_dependencies_hash = 0; // Force refetch
             }
        });
        ui.separator();

        // Current Path Display
         ui.horizontal_wrapped(|ui| {
              ui.label("Path:");
               if browser_state.current_path_elements.is_empty() {
                   ui.weak("(Empty)");
               } else {
                   for (i, element) in browser_state.current_path_elements.iter().enumerate() {
                        if i > 0 { ui.label("/"); }
                        let name = format!("{}{}", element.index.as_deref().map(|idx| format!("[{}] ", idx)).unwrap_or_default(), element.name);
                        ui.label(RichText::new(name).strong()); // Display built path
                   }
               }
               if !browser_state.current_path_elements.is_empty() {
                   // Use Button::new(...).small() before adding it
                   let remove_button = Button::new("❌").small();
                   if ui.add(remove_button).on_hover_text("Remove Last").clicked() {
                        browser_state.current_path_elements.pop();
                        // Reset available elements as context changed
                        browser_state.available_elements.clear();
                         browser_state.last_fetch_dependencies_hash = 0; // Force refetch
                   }
               }
         });
         ui.separator();

        // Component Selector (Hierarchical start or Free mode filter)
         if browser_state.mode == SelectionMode::Free || browser_state.current_path_elements.is_empty() {
              ui.horizontal(|ui| {
                   ui.label("Component:");
                   let _combo_response = ComboBox::from_id_source("browser_comp_combo") // Assign to _ to avoid unused warning
                        .width(ui.available_width() * 0.7) // Adjust width as needed
                        .selected_text(
                             browser_state.available_components.iter()
                                 .find(|c| c.signature_component_id.map(|id| id.to_string()) == Some(browser_state.selected_component_id.clone()))
                                 .map(|c| c.name.as_str())
                                 .unwrap_or("Select or type...")
                         )
                        .show_ui(ui, |ui| {
                             ui.style_mut().wrap_mode = Some(egui::TextWrapMode::Extend); // Use wrap_mode
                             if ui.selectable_value(&mut browser_state.selected_component_id, "".to_string(), "(Any / Clear)").changed() {
                                  browser_state.available_elements.clear(); // Clear elements if component changes
                                  browser_state.last_fetch_dependencies_hash = 0;
                             };
                             for comp in &browser_state.available_components {
                                 if let Some(id) = comp.signature_component_id {
                                      if ui.selectable_value(
                                           &mut browser_state.selected_component_id,
                                           id.to_string(),
                                           &comp.name,
                                      ).changed() {
                                           browser_state.available_elements.clear(); // Clear elements if component changes
                                           browser_state.last_fetch_dependencies_hash = 0;
                                      };
                                 }
                             }
                        });

                    // Button to Create Element in Selected Component
                    let can_create = !browser_state.selected_component_id.is_empty();
                    if ui.add_enabled(can_create, Button::new("➕ New")).on_hover_text("Create element in selected component").clicked() {
                         browser_state.is_create_dialog_open = true;
                         // Reset editor state when opening dialog
                         app_state_ref.ui_state.elements_view_state.element_editor_state = Default::default();
                    }
              });
              ui.separator();
         }

        // Element Search / Selector
        let search_edit = ui.add(
            TextEdit::singleline(&mut browser_state.search_term)
                .hint_text("Search Elements...")
                .desired_width(f32::INFINITY),
        );
         if search_edit.changed() {
             browser_state.last_search_update = time; // Update time for debounce check
         }

        // Available Elements List
        egui::ScrollArea::vertical().max_height(200.0).show(ui, |ui| {
             if browser_state.is_loading_elements {
                  loading_spinner::show_centered_spinner(ui);
             } else if let Some(err) = &browser_state.error {
                  ui.colored_label(ui.visuals().error_fg_color, err);
             } else {
                 let current_path_ids: HashSet<_> = browser_state.current_path_elements.iter().filter_map(|el| el.signature_element_id).collect();
                 let mut count = 0;
                  for element in &browser_state.available_elements {
                       // Don't show elements already in the path
                       if element.signature_element_id.map_or(false, |id| current_path_ids.contains(&id)) {
                           continue;
                       }
                       count += 1;
                       let label = format!("{} {}", element.index.as_deref().map(|i| format!("[{}]", i)).unwrap_or_default(), element.name);
                       if ui.selectable_label(false, label).clicked() { // Always show as non-selected in list
                            browser_state.current_path_elements.push(element.clone());
                            browser_state.search_term.clear(); // Clear search on selection
                            browser_state.debounced_search_term.clear();
                            // Reset available elements as context changed
                            browser_state.available_elements.clear();
                              browser_state.last_fetch_dependencies_hash = 0; // Force refetch
                       }
                  }
                   let nothing_to_show_msg =
                       if browser_state.mode == SelectionMode::Hierarchical && browser_state.selected_component_id.is_empty() && browser_state.current_path_elements.is_empty() {
                           "Select a component to start."
                       } else if browser_state.mode == SelectionMode::Free && browser_state.selected_component_id.is_empty() && browser_state.search_term.is_empty() {
                           "Select component or enter search term."
                       } else {
                            "No elements found matching criteria."
                       };

                   if count == 0 && !browser_state.is_loading_elements {
                      ui.weak(nothing_to_show_msg);
                   }
             }
        });
        ui.separator();

         // Confirm Button
         ui.horizontal(|ui| {
             ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                  let confirm_enabled = !browser_state.current_path_elements.is_empty();
                  if ui.add_enabled(confirm_enabled, Button::new("✅ Select Signature")).clicked() {
                       // Always allow selection if path is not empty
                       let ids: Vec<i64> = browser_state.current_path_elements.iter().filter_map(|el| el.signature_element_id).collect();
                       (on_select_signature)(ids);
                       // Reset state after confirming? Optional. Consider leaving it for next selection.
                       // browser_state = Default::default();
                  }
             });
         });

         // --- Internal Element Creation Dialog ---
         let mut is_create_open = browser_state.is_create_dialog_open;
         if is_create_open {
              // Find the component to pass to the form
              let parent_component_for_create = browser_state.available_components.iter()
                  .find(|c| c.signature_component_id.map(|id| id.to_string()) == Some(browser_state.selected_component_id.clone()))
                  .cloned(); // Clone the component data

               if let Some(parent_comp) = parent_component_for_create {
                   let mut keep_dialog_open = is_create_open; // Temp bool for dialog window
                   egui::Window::new("Create New Element")
                       .open(&mut keep_dialog_open) // Use temp bool
                       .resizable(true)
                       .collapsible(true)
                       .show(ui.ctx(), |ui| {
                            // Pass the nested element_editor_state from AppState mutably
                            element_form::show_element_form(
                                ui,
                                &mut app_state_ref.ui_state.elements_view_state.element_editor_state,
                                None, // Creating new
                                &parent_comp, // Pass immutable reference
                                api_client.clone(),
                                token.map(String::from),
                                |saved_element| { // Callback on save
                                    if saved_element.is_some() {
                                         log::info!("Element created via browser dialog, closing dialog and forcing refetch.");
                                          // Update state via memory closure - now just sets flags
                                          ui.ctx().memory_mut(|mem| {
                                               if let Some(state) = mem.data.get_persisted_mut::<BrowserState>(id) {
                                                    state.is_create_dialog_open = false; // Close dialog
                                                    state.available_elements.clear(); // Clear current element list
                                                    state.last_fetch_dependencies_hash = 0; // Force refetch on next update
                                               }
                                          });
                                          ui.ctx().request_repaint();
                                    } else {
                                         // Error handled within the form, just keep dialog open maybe?
                                         log::warn!("Element save failed from browser dialog.");
                                    }
                                }
                            );
                       });
                    // Update the main state bool if the dialog was closed
                    if !keep_dialog_open {
                         is_create_open = false;
                    }
               } else {
                    // Should not happen if button logic is correct, but handle defensively
                    is_create_open = false;
                    browser_state.error = Some("Cannot create element: Parent component not found.".to_string());
               }
         }
         // Update state based on dialog interaction
         browser_state.is_create_dialog_open = is_create_open;


    }).response; // End main vertical layout

    // Persist browser state
    ui.memory_mut(|mem| mem.data.insert_persisted(id, browser_state));

    response
}