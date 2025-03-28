export interface LogEntry {
    id?: number;
    level: 'info' | 'error';
    createdOn: Date;
    userId?: string; // User associated with the log entry
    category?: string; // Category of the log entry (e.g., "auth", "db")
    message: string; // Detailed information about the event
    data: any
}
