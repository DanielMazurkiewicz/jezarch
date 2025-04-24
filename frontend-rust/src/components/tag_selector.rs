use crate::models::Tag;
use eframe::egui::{self, Button, Response, Ui, Widget}; // Removed RichText, unused Serialize/Deserialize
use std::collections::HashSet; // For efficient ID lookup
// Removed unused serde imports

/// A widget for selecting multiple tags from a list using a popover with search.
pub struct TagSelectorWidget<'a> {
    selected_ids: &'a mut Vec<i64>,
    available_tags: &'a [Tag],
    id_source: egui::Id, // Unique ID for the widget state
    hint_text: String,
}

impl<'a> TagSelectorWidget<'a> {
    pub fn new(
        selected_ids: &'a mut Vec<i64>,
        available_tags: &'a [Tag],
        id_source: impl std::hash::Hash,
    ) -> Self {
        Self {
            selected_ids,
            available_tags,
            id_source: egui::Id::new(id_source),
            hint_text: "Select tags...".to_string(),
        }
    }

     pub fn hint_text(mut self, hint: impl Into<String>) -> Self {
        self.hint_text = hint.into();
        self
    }
}

// Internal state stored in egui memory (using temp state)
#[derive(Clone, Default, Debug)] // No need for Serialize/Deserialize if using temp state
struct TagSelectorState {
    search_term: String,
    is_open: bool,
}

impl<'a> Widget for TagSelectorWidget<'a> {
    fn ui(self, ui: &mut Ui) -> Response {
        let mut selector_state = ui.memory_mut(|mem| {
             // Use temporary state for the popover
             mem.data.get_temp_mut_or_default::<TagSelectorState>(self.id_source).clone()
        });

        // --- Trigger Button ---
        // Shows selected tags or hint text
        let trigger_text = if self.selected_ids.is_empty() {
            self.hint_text.clone()
        } else {
            // Find names for selected IDs and join them
            let selected_set: HashSet<_> = self.selected_ids.iter().cloned().collect();
            let names: Vec<&str> = self.available_tags
                .iter()
                .filter(|tag| tag.tag_id.map_or(false, |id| selected_set.contains(&id)))
                .map(|tag| tag.name.as_str())
                .collect();
            if names.len() > 3 {
                format!("{} tags selected", names.len()) // Show count if many selected
            } else {
                names.join(", ")
            }
        };

        // Create button, takes available width
        let trigger_response = ui.add_sized(
             [ui.available_width(), ui.text_style_height(&egui::TextStyle::Button)],
             Button::new(trigger_text)
        );

        if trigger_response.clicked() {
            selector_state.is_open = !selector_state.is_open;
             // Clear search when opening
             if selector_state.is_open {
                  selector_state.search_term.clear();
             }
        }

        // --- Popover Content ---
        if selector_state.is_open {
            let area_response = egui::Area::new(self.id_source.with("popup"))
                .order(egui::Order::Foreground)
                .fixed_pos(trigger_response.rect.left_bottom() + egui::vec2(0.0, 4.0)) // Position below button
                .show(ui.ctx(), |ui| {
                     egui::Frame::popup(ui.style())
                        .show(ui, |ui| {
                             ui.set_min_width(trigger_response.rect.width().max(200.0)); // Match button width or min 200
                             ui.set_max_height(250.0); // Limit height

                             // Search Input
                             ui.add(
                                 egui::TextEdit::singleline(&mut selector_state.search_term)
                                     .hint_text("Search tags...")
                                     .desired_width(f32::INFINITY),
                             );
                             ui.separator();

                             // Tag List (Scrollable)
                             egui::ScrollArea::vertical().show(ui, |ui| {
                                 let selected_set: HashSet<_> = self.selected_ids.iter().cloned().collect();
                                 let search_lower = selector_state.search_term.to_lowercase();

                                 let mut count = 0;
                                 for tag in self.available_tags {
                                      if let Some(tag_id) = tag.tag_id {
                                          if tag.name.to_lowercase().contains(&search_lower) {
                                              count += 1;
                                              let is_selected = selected_set.contains(&tag_id);
                                              if ui.selectable_label(is_selected, &tag.name).clicked() {
                                                  if is_selected {
                                                       self.selected_ids.retain(|&id| id != tag_id);
                                                  } else {
                                                       self.selected_ids.push(tag_id);
                                                  }
                                                  // Maybe request repaint?
                                                  ui.ctx().request_repaint();
                                              }
                                          }
                                      }
                                 }
                                  if count == 0 {
                                     ui.weak("No matching tags found.");
                                  }
                             });
                        });
                });

             // Close popup if clicked outside
             if !trigger_response.clicked() && ui.input(|i| i.pointer.any_click()) && !area_response.response.rect.contains(ui.input(|i| i.pointer.interact_pos().unwrap_or_default())) {
                 selector_state.is_open = false;
             }
              // Close popup on Escape key
             if selector_state.is_open && ui.input(|i| i.key_pressed(egui::Key::Escape)) {
                 selector_state.is_open = false;
             }
        }

         // Store the internal state temporarily
          ui.memory_mut(|mem| mem.data.insert_temp(self.id_source, selector_state));


        trigger_response // Return the response of the trigger button
    }
}

/// Convenience function to show the TagSelectorWidget.
///
/// `id_source`: A unique identifier for this instance of the selector (e.g., "note_editor_tags").
pub fn show_tag_selector<'a>(
    ui: &mut Ui,
    selected_ids: &'a mut Vec<i64>,
    available_tags: &'a [Tag],
    // id_source: impl std::hash::Hash, // Optional: allow passing custom ID source
) -> Response {
     let id_source = ui.next_auto_id(); // Generate an automatic ID based on context
     ui.add(TagSelectorWidget::new(selected_ids, available_tags, id_source))
}