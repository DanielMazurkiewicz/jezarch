// src/components/search_bar.rs
// Placeholder file for a potential reusable search bar component.
// Content can be added later if needed.
use eframe::egui::{self, Ui, Response, TextEdit};

#[derive(Clone, Debug, Default)]
pub struct SearchBarState {
    pub query: String,
}

/// A simple search bar widget.
/// Returns `true` if the search query was changed this frame (e.g., after Enter or losing focus).
pub fn search_bar(ui: &mut Ui, state: &mut SearchBarState, hint_text: &str) -> Response {
    let response = ui.add(
        TextEdit::singleline(&mut state.query)
            .hint_text(hint_text)
            .desired_width(200.0) // Adjust width as needed
    );

    if response.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter)) {
        // Indicate submission or change finalized (could also check if text actually changed)
        // response.mark_changed(); // This might be done automatically by TextEdit
    }
    response
}