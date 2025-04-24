use eframe::egui;

/// A simple reusable password input widget that hides the text.
pub struct PasswordInputWidget<'a> {
    buffer: &'a mut String,
    hint_text: String,
    desired_width: Option<f32>,
}

impl<'a> PasswordInputWidget<'a> {
    pub fn new(buffer: &'a mut String) -> Self {
        Self {
            buffer,
            hint_text: "Password".to_string(),
            desired_width: None,
        }
    }

    pub fn hint_text(mut self, text: impl Into<String>) -> Self {
        self.hint_text = text.into();
        self
    }

     pub fn desired_width(mut self, width: f32) -> Self {
         self.desired_width = Some(width);
         self
     }
}

impl<'a> egui::Widget for PasswordInputWidget<'a> {
    fn ui(self, ui: &mut egui::Ui) -> egui::Response {
        let mut text_edit = egui::TextEdit::singleline(self.buffer)
             .password(true) // This hides the text
             .hint_text(self.hint_text);

        if let Some(w) = self.desired_width {
            text_edit = text_edit.desired_width(w);
        }

         ui.add(text_edit)
    }
}


// Convenience function (alternative to using the Widget directly)
 pub fn password_edit(ui: &mut egui::Ui, buffer: &mut String) -> egui::Response {
     ui.add(
         egui::TextEdit::singleline(buffer)
             .password(true)
             .hint_text("Password") // Default hint text
     )
 }