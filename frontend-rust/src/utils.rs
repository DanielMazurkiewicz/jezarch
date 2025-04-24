use chrono::{DateTime, Utc, TimeZone}; // Add TimeZone for local conversion

/// Formats a DateTime<Utc> into a human-readable string (e.g., "Oct 26, 2023").
pub fn format_datetime_human(dt: DateTime<Utc>) -> String {
    // Convert to local time for more relevant display
    let local_dt = chrono::Local.from_utc_datetime(&dt.naive_utc());
    local_dt.format("%b %d, %Y").to_string() // e.g., Oct 26, 2023
     // Alternatively, include time: local_dt.format("%b %d, %Y %H:%M").to_string()
}

/// Formats an optional DateTime<Utc> into a human-readable string or a placeholder.
pub fn format_optional_datetime(dt_opt: Option<DateTime<Utc>>) -> String {
    match dt_opt {
        Some(dt) => format_datetime_human(dt),
        None => "-".to_string(), // Or "N/A"
    }
}

// Add other utility functions as needed, e.g., for string manipulation, etc.