use crate::{state::{AppState, LogViewState}, api::{ApiClient, ApiError}, components, models::*, utils}; // Import ApiError
use eframe::egui::{self, Ui};
use log; // Import log explicitly

// --- Helper Types for Async Results ---
type FetchLogsResult = Result<SearchResponse<LogEntry>, ApiError>;
// --- Unique IDs for Memory Storage ---
const FETCH_LOGS_RESULT_ID_BASE: &str = "fetch_logs_result_";


pub fn show_logs_tab(state: &mut AppState, api_client: &ApiClient, ui: &mut Ui) {
    let logs_state = &mut state.ui_state.admin_view_state.logs_state;
    let ctx_clone = ui.ctx().clone(); // Clone context for async
    let api_client_clone = api_client.clone(); // Clone api_client for async
    let token_clone = state.auth.token.clone(); // Clone token for async
    let current_page = logs_state.current_page; // Read current page for ID

    // --- Process Fetch Results ---
    let fetch_logs_result_id = egui::Id::new(FETCH_LOGS_RESULT_ID_BASE).with(current_page);
    if let Some(result) = ctx_clone.memory_mut(|mem| mem.data.remove::<FetchLogsResult>(fetch_logs_result_id)) {
         logs_state.is_loading = false;
         match result {
             Ok(response) => {
                 log::info!("Fetched {} logs.", response.data.len());
                 logs_state.logs = response.data;
                 logs_state.current_page = response.page;
                 logs_state.total_pages = response.total_pages;
                 logs_state.error = None;
             },
             Err(e) => {
                 log::error!("Failed to fetch logs: {}", e);
                 logs_state.error = Some(format!("Failed to load logs: {}", e));
                 logs_state.logs.clear();
                 logs_state.current_page = 1;
                 logs_state.total_pages = 1;
             }
         }
     }

    ui.label(egui::RichText::new("System Logs").strong());
    ui.label("View system events, errors, and warnings.");
    ui.separator();
    ui.add_space(10.0);

    // TODO: Add Search/Filter Bar
    ui.label("Filters: [Placeholder]");
    ui.separator();
    ui.add_space(10.0);

    // --- Display Errors ---
    if let Some(err) = &logs_state.error {
        components::error_display::show_error_box(ui, err);
        ui.add_space(10.0);
    }

    // --- Fetch logs if needed ---
    // Check if logs are empty AND not loading AND no previous error
    let should_fetch = logs_state.logs.is_empty() && !logs_state.is_loading && logs_state.error.is_none();
    if should_fetch {
        trigger_logs_fetch(logs_state.current_page, api_client_clone.clone(), token_clone.clone(), ctx_clone.clone());
        logs_state.is_loading = true; // Set loading state immediately after triggering
    }

    // --- Loading or Log Table ---
    if logs_state.is_loading {
        components::loading_spinner::show_centered_spinner(ui);
    } else {
        show_logs_table(ui, &logs_state.logs);
        ui.add_space(10.0);

        // Clone necessary data for pagination closure
        let current_page_display = logs_state.current_page; // Use local copy for display
        let total_pages = logs_state.total_pages;
        let api_client_pag = api_client_clone.clone();
        let token_pag = token_clone.clone();
        let ctx_pag = ctx_clone.clone();

        components::pagination::show_pagination(
            ui,
            current_page_display,
            total_pages,
            move |new_page| {
                log::info!("Pagination changed to page: {}", new_page);
                // Trigger fetch for the new page
                let api_c = api_client_pag.clone();
                let token = token_pag.clone();
                let ctx_c = ctx_pag.clone();
                trigger_logs_fetch(new_page, api_c, token, ctx_c.clone());
                // Set loading state via memory flag
                ctx_c.memory_mut(|mem| mem.data.insert_temp(egui::Id::new("logs_set_loading"), true));
                ctx_c.request_repaint();
            });
    }
     // Check memory flag for loading state update
     if ctx_clone.memory_mut(|mem| mem.data.remove::<bool>(egui::Id::new("logs_set_loading"))).unwrap_or(false) {
         logs_state.is_loading = true;
     }
}

// --- Logs Table ---
fn show_logs_table(ui: &mut Ui, logs: &[LogEntry]) {
     use egui_extras::{Column, TableBuilder};

     let table = TableBuilder::new(ui)
         .striped(true)
         .resizable(true)
         .cell_layout(egui::Layout::left_to_right(egui::Align::Center))
         .column(Column::initial(150.0).at_least(120.0)) // Timestamp
         .column(Column::initial(60.0).at_least(50.0))  // Level
         .column(Column::initial(80.0).at_least(60.0))  // User
         .column(Column::initial(100.0).at_least(80.0)) // Category
         .column(Column::remainder().at_least(200.0))   // Message
         .column(Column::initial(100.0).at_least(60.0)); // Data

     table.header(20.0, |mut header| {
         header.col(|ui| { ui.strong("Timestamp"); });
         header.col(|ui| { ui.strong("Level"); });
         header.col(|ui| { ui.strong("User"); });
         header.col(|ui| { ui.strong("Category"); });
         header.col(|ui| { ui.strong("Message"); });
         header.col(|ui| { ui.strong("Data"); });
     })
     .body(|body| {
         body.rows(18.0, logs.len(), |mut row| {
             let log = &logs[row.index()];
             row.col(|ui| {
                 // Format timestamp locally
                 ui.label(utils::format_datetime_human(log.created_on));
             });
             row.col(|ui| {
                  // Use color based on level
                  let color = match log.level.to_lowercase().as_str() {
                       "error" => ui.visuals().error_fg_color,
                       "warn" => ui.visuals().warn_fg_color,
                       _ => ui.visuals().text_color(),
                  };
                  ui.label(egui::RichText::new(&log.level).color(color));
             });
             row.col(|ui| {
                 ui.label(log.user_id.map_or_else(|| "-".to_string(), |id| id.to_string()));
             });
             row.col(|ui| {
                  ui.label(log.category.as_deref().unwrap_or("-"));
             });
             row.col(|ui| {
                 ui.label(&log.message); // Consider truncating long messages
             });
             row.col(|ui| {
                  if let Some(data) = &log.data {
                      // Simple hover popup for data
                       let response = ui.link("View");
                        response.on_hover_ui_at_pointer(|ui| {
                           ui.set_max_width(300.0);
                           ui.label("Log Data:");
                           // Try to format JSON nicely, fallback to raw string
                           match serde_json::from_str::<serde_json::Value>(data) {
                                Ok(json_val) => {
                                     ui.code(serde_json::to_string_pretty(&json_val).unwrap_or_else(|_| data.clone()));
                                }
                                Err(_) => {
                                     ui.code(data);
                                }
                           }
                        });
                  } else {
                      ui.label("-");
                  }
             });
         });
     });

      if logs.is_empty() {
          ui.centered_and_justified(|ui| {
              ui.label("No logs found matching criteria.");
          });
      }
}

// --- Async Fetch Trigger ---
fn trigger_logs_fetch(
    page: usize,
    api_client: ApiClient,
    token: Option<String>,
    ctx: egui::Context,
) {
     let token = match token { Some(t) => t, None => {
         log::error!("trigger_logs_fetch: Auth token missing.");
         // Store error result in memory
          let fetch_logs_result_id = egui::Id::new(FETCH_LOGS_RESULT_ID_BASE).with(page);
          let error_result: FetchLogsResult = Err(ApiError::MissingToken);
          ctx.memory_mut(|mem| mem.data.insert_temp(fetch_logs_result_id, error_result));
          ctx.request_repaint();
         return;
     }};

    // Loading state should already be set before calling this

    tokio::spawn(async move {
        log::info!("Fetching logs page: {}", page);
        let search_req = SearchRequest {
             query: vec![], // TODO: Add filters from state
             page,
             page_size: 20, // Or configure page size
             sort: vec![SortElement { field: "createdOn".to_string(), direction: SortDirection::Desc }],
        };
        let result: FetchLogsResult = api_client.search_logs(&search_req, &token).await; // Explicit type

        // Store result in memory
        let fetch_logs_result_id = egui::Id::new(FETCH_LOGS_RESULT_ID_BASE).with(page);
        ctx.memory_mut(|mem| mem.data.insert_temp(fetch_logs_result_id, result));
        ctx.request_repaint();
    });
}