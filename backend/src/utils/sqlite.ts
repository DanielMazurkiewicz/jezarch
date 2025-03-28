export const sqliteDate = (date: number | string | Date) => {
    return (new Date(date)).toISOString().replace("T", " ").split(".")[0]; // "2024-03-27 15:30:45"
}

export const sqliteNow = () => {
    return (new Date()).toISOString().replace("T", " ").split(".")[0]; // "2024-03-27 15:30:45"
}