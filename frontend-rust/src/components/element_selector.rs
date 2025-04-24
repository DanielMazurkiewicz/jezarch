use crate::{
    api::{ApiClient, ApiError}, // Import ApiError
    models::{SignatureComponent, SignatureElement},
    // state::AppState, // AppState was unused
    components::loading_spinner,
};
use eframe::egui::{self, Button, ComboBox, Response, RichText, TextEdit, Ui, Widget};
use std::collections::HashSet;
use log; // Import log explicitly

// --- Helper Types for Async Results ---
type FetchComponentsResult = Result<Vec<SignatureComponent>, ApiError>;
type FetchElementsByComponentResult = Result<Vec<SignatureElement>, ApiError>;

// --- Unique IDs for Memory Storage ---
const SELECTOR_FETCH_COMPONENTS_RESULT_ID: egui::Id = egui::Id::new("selector_fetch_components_result");
const SELECTOR_FETCH_ELEMENTS_RESULT_ID_BASE: &str = "selector_fetch_elements_result_";

// Helper struct to manage the internal state of the popover part (using temp state)
#[derive(Clone, Debug, Default)]
struct ElementSelectPopoverState {
    search_term: String,
    filter_component_id: String, // Store as string for ComboBox
    is_loading_components: bool,
    is_loading_elements: bool,
    available_components: Vec<SignatureComponent>,
    available_elements: Vec<SignatureElement>, // Elements for the selected component
    error: Option<String>,
    is_open: bool, // Added field to control popover visibility
    last_fetched_component_id_str: String, // Track last fetched component ID
}

/// Widget for selecting multiple elements, often used for selecting parents.
pub struct ElementSelectorWidget<'a> {
    selected_ids: &'a mut Vec<i64>,
    label: String,
    // Exclude elements from this component (useful when selecting parents *within* the same component)
    exclude_component_id: Option<i64>,
    // Exclude the element itself (useful when editing an element's parents)
    exclude_element_id: Option<i64>,
    api_client: &'a ApiClient, // Pass API client for fetching
    token: Option<&'a str>, // Pass token for fetching
    id_source: egui::Id,
}

impl<'a> ElementSelectorWidget<'a> {
    pub fn new(
        selected_ids: &'a mut Vec<i64>,
        id_source: impl std::hash::Hash,
        api_client: &'a ApiClient,
        token: Option<&'a str>,
    ) -> Self {
        Self {
            selected_ids,
            label: "Select Parent Elements".to_string(),
            exclude_component_id: None,
            exclude_element_id: None,
            api_client,
            token,
            id_source: egui::Id::new(id_source),
        }
    }

    pub fn label(mut self, label: impl Into<String>) -> Self {
        self.label = label.into();
        self
    }

    pub fn exclude_component(mut self, component_id: Option<i64>) -> Self {
        self.exclude_component_id = component_id;
        self
    }

    pub fn exclude_element(mut self, element_id: Option<i64>) -> Self {
        self.exclude_element_id = element_id;
        self
    }
}

impl<'a> Widget for ElementSelectorWidget<'a> {
    fn ui(self, ui: &mut Ui) -> Response {
        let mut popover_state = ui.memory_mut(|mem| {
             // Use temporary state
             mem.data.get_temp_mut_or_default::<ElementSelectPopoverState>(self.id_source).clone()
        });

        // --- Process Async Results ---
        // Process Fetch Components Result
         if let Some(result) = ui.ctx().memory_mut(|mem| mem.data.remove::<FetchComponentsResult>(SELECTOR_FETCH_COMPONENTS_RESULT_ID)) {
             // Update state directly via memory
             ui.memory_mut(|mem| {
                 // get_temp_mut_or_default returns &mut T directly
                 let state = mem.data.get_temp_mut_or_default::<ElementSelectPopoverState>(self.id_source);
                 state.is_loading_components = false;
                 match result {
                     Ok(mut comps) => {
                         comps.sort_by(|a, b| a.name.cmp(&b.name));
                         state.available_components = comps;
                         state.error = None;
                     },
                     Err(e) => {
                         state.error = Some(format!("Failed to load components: {}", e));
                         state.available_components.clear();
                     }
                 }
             });
             // Re-read the state for the rest of the UI update
             popover_state = ui.memory_mut(|mem| mem.data.get_temp_mut_or_default::<ElementSelectPopoverState>(self.id_source).clone());
         }

         // Process Fetch Elements Result
         // Ensure filter_component_id isn't empty before creating the ID
         let fetch_elements_result_id = if !popover_state.filter_component_id.is_empty() {
             Some(egui::Id::new(SELECTOR_FETCH_ELEMENTS_RESULT_ID_BASE).with(&popover_state.filter_component_id))
         } else {
             None
         };

         if let Some(id) = fetch_elements_result_id {
             if let Some(result) = ui.ctx().memory_mut(|mem| mem.data.remove::<FetchElementsByComponentResult>(id)) {
                 // Update state directly via memory
                 ui.memory_mut(|mem| {
                      // get_temp_mut_or_default returns &mut T directly
                      let state = mem.data.get_temp_mut_or_default::<ElementSelectPopoverState>(self.id_source);
                      state.is_loading_elements = false;
                      match result {
                           Ok(mut elems) => {
                                // Filter out the element being edited, then sort
                                 elems.retain(|el| el.signature_element_id != self.exclude_element_id);
                                 elems.sort_by(|a, b| (a.index.as_deref().unwrap_or(&a.name)).cmp(b.index.as_deref().unwrap_or(&b.name)));
                                 state.available_elements = elems;
                                 state.error = None; // Clear previous error on success
                           },
                           Err(e) => {
                                state.error = Some(format!("Failed to load elements: {}", e));
                                state.available_elements.clear();
                           }
                      }
                 });
                 // Re-read the state
                 popover_state = ui.memory_mut(|mem| mem.data.get_temp_mut_or_default::<ElementSelectPopoverState>(self.id_source).clone());
             }
         }


        // --- Fetch components if needed ---
        let ctx = ui.ctx().clone();
        let api_client = self.api_client.clone();
        let token = self.token.map(String::from);
        //let id = self.id_source; // No longer needed for direct state update
        if popover_state.available_components.is_empty() && !popover_state.is_loading_components {
            popover_state.is_loading_components = true;
            tokio::spawn(async move {
                 let result: FetchComponentsResult = if let Some(t) = token {
                     api_client.get_all_signature_components(&t).await
                 } else {
                      Err(ApiError::MissingToken)
                 };
                 // Store result in memory
                  ctx.memory_mut(|mem| mem.data.insert_temp(SELECTOR_FETCH_COMPONENTS_RESULT_ID, result));
                  ctx.request_repaint();
            });
             // Store updated loading state
             ui.memory_mut(|mem| mem.data.insert_temp(self.id_source, popover_state.clone()));
        }

         // --- Fetch elements when filter_component_id changes ---
         let ctx_elements = ui.ctx().clone();
         let api_client_elements = self.api_client.clone();
         let token_elements = self.token.map(String::from);
         //let id_elements = self.id_source; // No longer needed for direct state update
         let component_id_to_fetch = popover_state.filter_component_id.parse::<i64>().ok();
         //let exclude_element_id_clone = self.exclude_element_id; // Clone for async closure - not needed with memory store

         // Determine if a fetch is necessary based on component ID changing
         let mut needs_fetch = false;
         if !popover_state.filter_component_id.is_empty() && popover_state.filter_component_id != popover_state.last_fetched_component_id_str {
              needs_fetch = true;
         } else if popover_state.filter_component_id.is_empty() && !popover_state.last_fetched_component_id_str.is_empty() {
             // Clear elements if component is cleared
             popover_state.available_elements.clear();
             popover_state.last_fetched_component_id_str.clear();
             ui.memory_mut(|mem| mem.data.insert_temp(self.id_source, popover_state.clone()));
         }


         // Trigger fetch only if component ID is valid, fetch needed and not currently loading
         if let Some(comp_id) = component_id_to_fetch {
               if needs_fetch && !popover_state.is_loading_elements {
                    popover_state.is_loading_elements = true;
                    popover_state.error = None; // Clear previous error
                    popover_state.last_fetched_component_id_str = popover_state.filter_component_id.clone(); // Update tracker
                    tokio::spawn(async move {
                         let result: FetchElementsByComponentResult = if let Some(t) = token_elements {
                             api_client_elements.get_elements_by_component(comp_id, &t).await
                         } else {
                              Err(ApiError::MissingToken)
                         };
                         // Store result in memory with component ID in the key
                         let fetch_elements_result_id = egui::Id::new(SELECTOR_FETCH_ELEMENTS_RESULT_ID_BASE).with(comp_id.to_string());
                         ctx_elements.memory_mut(|mem| mem.data.insert_temp(fetch_elements_result_id, result));
                         ctx_elements.request_repaint();
                    });
                    // Store updated loading and tracker state
                    ui.memory_mut(|mem| mem.data.insert_temp(self.id_source, popover_state.clone()));
               }
         }


        // --- Main Widget Layout (Box containing Label, Badges, Popover Trigger) ---
        let outer_response = ui.vertical(|ui| {
             ui.label(&self.label); // Show the provided label

             // Display selected element badges (non-interactive part)
             ui.horizontal_wrapped(|ui| {
                  ui.spacing_mut().item_spacing.x = 4.0;
                  if self.selected_ids.is_empty() {
                       ui.weak("(None selected)");
                  } else {
                      // TODO: Fetch/cache element names for selected IDs to display badges properly
                      // This requires more state management, possibly in the parent component.
                      // For now, just show IDs:
                       for id in self.selected_ids.iter() {
                            // Simple placeholder badge wrapped in a Frame
                             egui::Frame::group(ui.style())
                                .inner_margin(egui::Margin::symmetric(4.0, 1.0))
                                .show(ui, |ui| {
                                    let badge_label = ui.label(format!("ID: {}", id));
                                    badge_label.on_hover_text(format!("Element ID: {}", id));
                                });
                       }
                  }
             });
             ui.add_space(4.0);

             // --- Popover Trigger Button ---
              let trigger_text = "Select Elements..."; // Simple trigger text
              let trigger_response = ui.add(
                  Button::new(trigger_text).min_size(egui::vec2(150.0, 0.0)) // Min width
              );
              if trigger_response.clicked() {
                   popover_state.is_open = !popover_state.is_open;
                   if popover_state.is_open { popover_state.search_term.clear(); } // Clear search on open
              }

             // --- Popover Content (Element Selection List) ---
              if popover_state.is_open {
                  let area_response = egui::Area::new(self.id_source.with("selector_popup"))
                      .order(egui::Order::Foreground)
                      .fixed_pos(trigger_response.rect.left_bottom() + egui::vec2(0.0, 4.0))
                      .show(ui.ctx(), |ui| {
                          egui::Frame::popup(ui.style())
                              .show(ui, |ui| {
                                  ui.set_min_width(trigger_response.rect.width().max(250.0));
                                  ui.set_max_height(300.0);

                                   // Optional: Component Filter Dropdown
                                   ui.horizontal(|ui| {
                                        ui.label("From Component:");
                                        ComboBox::from_id_source("comp_filter_combo")
                                             .selected_text(
                                                  popover_state.available_components.iter()
                                                      .find(|c| c.signature_component_id.map(|id| id.to_string()) == Some(popover_state.filter_component_id.clone()))
                                                      .map(|c| c.name.as_str())
                                                      .unwrap_or("Select...")
                                             )
                                             .show_ui(ui, |ui| {
                                                 if ui.selectable_value(&mut popover_state.filter_component_id, "".to_string(), "(All/Clear)").changed() {
                                                     // Fetch logic handles the change
                                                 }
                                                  for comp in &popover_state.available_components {
                                                       if let Some(id) = comp.signature_component_id {
                                                             // Filter out excluded component
                                                             if self.exclude_component_id != Some(id) {
                                                                  if ui.selectable_value(
                                                                       &mut popover_state.filter_component_id,
                                                                       id.to_string(),
                                                                       &comp.name,
                                                                  ).changed() {
                                                                       // Fetch logic handles the change
                                                                  }
                                                             }
                                                       }
                                                  }
                                             });
                                   });
                                   ui.separator();

                                   // Search Input for Elements
                                   ui.add(
                                       TextEdit::singleline(&mut popover_state.search_term)
                                           .hint_text("Search elements...")
                                           .desired_width(f32::INFINITY),
                                   );
                                   ui.separator();

                                   // Element List
                                   egui::ScrollArea::vertical().show(ui, |ui| {
                                       if popover_state.is_loading_elements {
                                            loading_spinner::show_centered_spinner(ui);
                                       } else if let Some(err) = &popover_state.error {
                                            ui.colored_label(ui.visuals().error_fg_color, err);
                                       } else if popover_state.filter_component_id.is_empty() {
                                            ui.weak("Select a component to view elements.");
                                       } else {
                                            let selected_set: HashSet<_> = self.selected_ids.iter().cloned().collect();
                                            let search_lower = popover_state.search_term.to_lowercase();
                                            let mut count = 0;

                                            for element in &popover_state.available_elements {
                                                 if let Some(element_id) = element.signature_element_id {
                                                      // Filter by search term
                                                      let name_match = element.name.to_lowercase().contains(&search_lower);
                                                      let index_match = element.index.as_deref().unwrap_or("").to_lowercase().contains(&search_lower);
                                                      if name_match || index_match
                                                      {
                                                           count += 1;
                                                           let is_selected = selected_set.contains(&element_id);
                                                           let label = format!("{} {}", element.index.as_deref().map(|i| format!("[{}]", i)).unwrap_or_default(), element.name);
                                                           if ui.selectable_label(is_selected, label).clicked() {
                                                                if is_selected {
                                                                     self.selected_ids.retain(|&id| id != element_id);
                                                                } else {
                                                                     self.selected_ids.push(element_id);
                                                                }
                                                           }
                                                      }
                                                 }
                                            }
                                            if count == 0 && !popover_state.available_elements.is_empty() {
                                                 ui.weak("No matching elements found in this component.");
                                            } else if count == 0 && popover_state.available_elements.is_empty() && !popover_state.is_loading_elements {
                                                 ui.weak("No elements in this component.");
                                            }
                                       }
                                   }); // End ScrollArea
                              }); // End Frame
                      }); // End Area

                   // Close popup if clicked outside
                   if ui.input(|i| i.pointer.any_click() || i.key_pressed(egui::Key::Escape))
                       && !trigger_response.clicked()
                       && !area_response.response.rect.contains(ui.input(|i| i.pointer.interact_pos().unwrap_or_default()))
                   {
                       popover_state.is_open = false;
                   }

              } // End if popover_state.is_open

             // --- Display Error from Fetching ---
             if let Some(err) = &popover_state.error {
                 ui.label(RichText::new(err).color(ui.visuals().error_fg_color).small());
             }

        }).response; // End outer_response vertical layout

        // Store popover state temporarily
        ui.memory_mut(|mem| mem.data.insert_temp(self.id_source, popover_state));


        outer_response
    }
}

/// Convenience function to show the ElementSelectorWidget.
pub fn show_element_selector<'a>(
    ui: &mut Ui,
    selected_ids: &'a mut Vec<i64>,
    api_client: &'a ApiClient,
    token: Option<&'a str>,
    // Optional parameters
    label: Option<&str>,
    exclude_component_id: Option<i64>,
    exclude_element_id: Option<i64>,
) -> Response {
     let id_source = ui.next_auto_id(); // Generate ID
     let mut selector = ElementSelectorWidget::new(selected_ids, id_source, api_client, token)
          .exclude_component(exclude_component_id)
          .exclude_element(exclude_element_id);
     if let Some(lbl) = label {
          selector = selector.label(lbl);
     }
     ui.add(selector)
}