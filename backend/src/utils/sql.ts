import { sqliteNow } from './sqlite';

export const buildUpdateFields = (data: Record<string, unknown | undefined>, tableAlias = ''): { sets: string[]; params: any[] } => {
    const sets: string[] = [];
    const params: unknown[] = [];
    const prefix = tableAlias ? `${tableAlias}.` : '';

    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
            sets.push(`${prefix}${key} = ?`);
            params.push(value);
        }
    }

    return { sets, params };
};

export const buildUpdateQuery = (table: string, data: Record<string, unknown | undefined>, idColumn: string, id: number | string): { query: string; params: any[] } => {
    const { sets, params } = buildUpdateFields(data);

    if (sets.length === 0) return { query: '', params: [] };

    sets.push('modifiedOn = ?');
    params.push(sqliteNow());

    const query = `UPDATE ${table} SET ${sets.join(', ')} WHERE ${idColumn} = ? RETURNING *`;
    params.push(id);

    return { query, params };
};
