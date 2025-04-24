use eframe::{egui, epaint}; // Import epaint
use egui::{Painter, Stroke, Ui, Vec2}; // Use Painter directly, removed unused Sense, Response
use std::f32::consts::TAU; // TAU = 2 * PI

/// Renders a simple spinning arc indicator.
pub fn show_spinner(ui: &mut Ui, diameter: Vec2) {
    // Allocate space and get a painter
    let (rect, _response) = ui.allocate_exact_size(diameter, egui::Sense::hover());
    let painter = ui.painter_at(rect); // Get painter for the allocated rect

    let radius = (rect.width() / 2.0).min(rect.height() / 2.0) - 2.0; // Leave some padding

    // Determine spinner color based on visuals
    let color = ui.visuals().text_color();

    // Simple animation based on time
    let time = ui.input(|i| i.time);
    let start_angle = (time * 2.0) as f32 % TAU; // Rotate twice per second

    painter.arc( // Use painter.arc directly
        rect.center(),
        radius,
        start_angle,
        TAU * 0.75, // Sweep angle (3/4 circle)
        Stroke::new(2.0, color),
    );
}

/// Centers and shows a loading spinner.
pub fn show_centered_spinner(ui: &mut Ui) {
     ui.centered_and_justified(|ui| {
         show_spinner(ui, Vec2::splat(32.0));
     });
}