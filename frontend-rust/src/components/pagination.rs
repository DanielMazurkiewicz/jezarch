use eframe::egui::{self, Button, Ui};

/// Renders simple pagination controls.
///
/// `current_page`: The currently active page (1-based).
/// `total_pages`: The total number of pages.
/// `on_page_change`: Callback function when a page button (Prev, Next, or number) is clicked.
pub fn show_pagination(
    ui: &mut Ui,
    current_page: usize,
    total_pages: usize,
    mut on_page_change: impl FnMut(usize),
) {
    if total_pages <= 1 {
        return; // Don't show if only one page
    }

    ui.horizontal(|ui| {
        ui.spacing_mut().item_spacing.x = 2.0; // Reduce spacing between buttons

        // --- Previous Button ---
        let prev_enabled = current_page > 1;
        if ui.add_enabled(prev_enabled, Button::new("◀ Prev")).clicked() {
            on_page_change(current_page - 1);
        }

        // --- Page Number Logic (Simplified) ---
        // Show first page, ellipsis, pages around current, ellipsis, last page
        const MAX_VISIBLE_PAGES: usize = 5; // How many page numbers to show directly

        let mut pages_to_show: Vec<Option<usize>> = Vec::new(); // None represents ellipsis

        if total_pages <= MAX_VISIBLE_PAGES {
            // Show all pages
            for i in 1..=total_pages {
                pages_to_show.push(Some(i));
            }
        } else {
             // Complex case: show first, last, and pages around current
             let side_pages = (MAX_VISIBLE_PAGES - 3) / 2; // Pages on each side of current (excluding first/last/current)
             let extra_page = (MAX_VISIBLE_PAGES - 3) % 2; // If odd number, one side gets an extra slot

             let mut start_page = current_page.saturating_sub(side_pages);
             let mut end_page = current_page.saturating_add(side_pages + extra_page);

             // Adjust if near the beginning
             if start_page <= 2 {
                 end_page = (1 + (MAX_VISIBLE_PAGES - 2)).min(total_pages - 1); // Ensure end_page doesn't exceed total_pages-1
                 start_page = 2; // Start from 2
             }
             // Adjust if near the end
             else if end_page >= total_pages - 1 {
                  start_page = (total_pages - (MAX_VISIBLE_PAGES - 2)).max(2); // Ensure start_page doesn't go below 2
                  end_page = total_pages - 1; // End before the last page
             }

            // Add first page
            pages_to_show.push(Some(1));

            // Add ellipsis before if needed
            if start_page > 2 {
                 pages_to_show.push(None);
            }

             // Add middle pages
             for i in start_page..=end_page {
                  if i > 1 && i < total_pages { // Ensure we don't duplicate first/last or go out of bounds
                       pages_to_show.push(Some(i));
                  }
             }

             // Add ellipsis after if needed
             if end_page < total_pages - 1 {
                 pages_to_show.push(None);
             }

            // Add last page
            pages_to_show.push(Some(total_pages));
        }

        // --- Render Page Numbers ---
        for page_opt in pages_to_show {
            if let Some(page_num) = page_opt {
                 let is_current = page_num == current_page;
                 // Highlight the current page button
                 let button = Button::new(page_num.to_string()).small().selected(is_current);
                 if ui.add(button).clicked() {
                      if !is_current { // Only trigger change if not the current page
                          on_page_change(page_num);
                      }
                 }
             } else {
                 // Render ellipsis
                 ui.label("...");
            }
        }

        // --- Next Button ---
        let next_enabled = current_page < total_pages;
        if ui.add_enabled(next_enabled, Button::new("Next ▶")).clicked() {
            on_page_change(current_page + 1);
        }
    });
}