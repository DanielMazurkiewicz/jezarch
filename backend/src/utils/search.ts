
import { db } from "../initialization/db";
import { Log } from "../functionalities/log/db"; // Import Log

export type SearchOnCustomFieldHandlerResult = {
    whereCondition: string;
    joinClause?: string;
    params: any[];
} | null;


export type SearchOnCustomFieldHandler<T> = (
    element: SearchQueryElement,
    tableAlias: string
) => SearchOnCustomFieldHandlerResult | Promise<SearchOnCustomFieldHandlerResult>;

interface SearchQueryElement_Primitive {
    field: string;
    not: boolean;
    condition: "EQ" | "GT" | "GTE" | "LT" | "LTE";
    value: string | number | boolean | null;
}

interface SearchQueryElement_AnyOf {
    field: string;
    not: boolean;
    condition: "ANY_OF";
    value: (string | number | boolean | null)[] | number[][]; // Allow array of arrays for signatures
}

interface SearchQueryElement_Contains { // For text fragment
    field: string;
    not: boolean;
    condition: "FRAGMENT";
    value: string;
}

// New conditions for signature path search
interface SearchQueryElement_SignatureStartsWith {
    field: string; // e.g., "descriptiveSignature"
    not: boolean;
    condition: "STARTS_WITH";
    value: number[]; // A single path, e.g., [1, 2]
}

interface SearchQueryElement_SignatureContainsSequence {
    field: string; // e.g., "descriptiveSignature"
    not: boolean;
    condition: "CONTAINS_SEQUENCE";
    value: number[]; // A sequence of element IDs, e.g., [2, 3]
}


export type SearchQueryElement =
    | SearchQueryElement_Primitive
    | SearchQueryElement_AnyOf
    | SearchQueryElement_Contains
    | SearchQueryElement_SignatureStartsWith // Added new type
    | SearchQueryElement_SignatureContainsSequence; // Added new type

export type SearchQuery = SearchQueryElement[];

export interface SearchRequest {
    query: SearchQuery;
    page: number;
    pageSize: number;
}

export interface SearchResponse<T> {
    data: T[];
    page: number;
    pageSize: number;
    totalSize: number;
    totalPages: number;
}

interface BuildSearchQueriesResult {
    dataQuery: { sql: string; params: any[] };
    countQuery: { sql: string; params: any[] };
    page: number;
    pageSize: number;
    alias: string;
}

export async function buildSearchQueries<T extends Record<string, any>>(
    table: string,
    searchRequest: SearchRequest,
    allowedFields: (keyof T | string)[], // Allow string for potential JOINed fields like ownerLogin
    fieldHandlers?: Record<string, SearchOnCustomFieldHandler<T>>,
    primaryKeyField: string = `${table.slice(0, -1)}Id`
): Promise<BuildSearchQueriesResult> {
    const mainTableAlias = `${table}_main`;
    const whereConditions: string[] = [];
    const allParams: any[] = [];
    const joinClauses = new Set<string>();
    const page = Math.max(1, searchRequest.page || 1);
    const pageSize = Math.max(1, searchRequest.pageSize || 10);
    const offset = (page - 1) * pageSize;

    for (const element of searchRequest.query) {
        const field = element.field;

        if (fieldHandlers?.[field]) {
            const handlerResult = await fieldHandlers[field](element, mainTableAlias);
            if (handlerResult) {
                if (handlerResult.joinClause) joinClauses.add(handlerResult.joinClause);
                if (handlerResult.whereCondition) whereConditions.push(handlerResult.whereCondition);
                allParams.push(...handlerResult.params);
            }
            continue;
        }

        // Allow strings in allowedFields for fields like 'ownerLogin' that might come from a JOIN handled elsewhere
        // or fields like 'createdBy' which are directly searchable strings now.
        if (!allowedFields.includes(field)) {
             await Log.warn(`Search field '${field}' not explicitly allowed or handled. Ensure JOIN/field is valid.`, 'system', 'search', { field, table });
             // Continue processing, assuming it's a valid column name possibly added by a JOIN in handler
        }

        let baseCondition: string = '';
        let elementParams: any[] = [];
        let needsHandling = true;
        const qualifiedField = `${mainTableAlias}.${field}`; // Assume field exists on main table unless handled

        switch (element.condition) {
            case "EQ":
            case "GT":
            case "GTE":
            case "LT":
            case "LTE":
                const operator = { EQ: element.value === null ? "IS" : "=", GT: ">", GTE: ">=", LT: "<", LTE: "<=" }[element.condition];
                 if (!operator) { await Log.warn(`Unsupported operator for condition`, 'system', 'search', { field, condition: element.condition, table }); needsHandling = false; break; }
                 let valueToUse = element.value;
                 if (typeof valueToUse === 'boolean') valueToUse = valueToUse ? 1 : 0;
                 baseCondition = `${qualifiedField} ${operator} ?`;
                 elementParams.push(valueToUse);
                 break;
            case "ANY_OF":
                if (!Array.isArray(element.value)) { await Log.warn(`ANY_OF requires an array value`, 'system', 'search', { field, value: element.value, table }); needsHandling = false; break; }
                if (element.value.length === 0) baseCondition = element.not ? "1=1" : "1=0";
                else {
                    const valuesToUse = element.value.map(v => typeof v === 'boolean' ? (v ? 1 : 0) : v);
                    const placeholders = valuesToUse.map(() => "?").join(", ");
                    baseCondition = `${qualifiedField} ${element.not ? 'NOT ' : ''}IN (${placeholders})`;
                    elementParams.push(...valuesToUse);
                }
                element.not = false; // 'not' handled directly in the SQL IN operator part
                break;
            case "FRAGMENT":
                 if (typeof element.value !== 'string') { await Log.warn(`FRAGMENT requires a string value`, 'system', 'search', { field, value: element.value, table }); needsHandling = false; break; }
                 baseCondition = `${qualifiedField} LIKE ?`;
                 elementParams.push(`%${element.value}%`);
                 break;
            // STARTS_WITH and CONTAINS_SEQUENCE are expected to be handled by custom field handlers
            case "STARTS_WITH":
            case "CONTAINS_SEQUENCE":
                 await Log.warn(`Condition '${element.condition}' for field '${field}' should be handled by a custom field handler.`, 'system', 'search', { field, condition: element.condition, table });
                 needsHandling = false; // Mark as not handled by default logic
                 break;
            default:
                 const unknownCondition = (element as any).condition;
                 await Log.warn(`Unsupported search condition`, 'system', 'search', { field, condition: unknownCondition, table });
                 needsHandling = false;
                 break;
        }

        if (needsHandling && baseCondition) {
            if (element.not) baseCondition = `NOT (${baseCondition})`;
            whereConditions.push(baseCondition);
            allParams.push(...elementParams);
        }
    }

    const joins = Array.from(joinClauses).join('\n');
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const orderBy = `ORDER BY ${mainTableAlias}.${primaryKeyField} DESC`; // Consider making ORDER BY configurable

    // Adjust SELECT columns based on potential JOINs (only ownerLogin handled explicitly for now)
    // createdBy/updatedBy are now direct fields, no JOIN needed for them.
    let selectCols = `${mainTableAlias}.*`;
    if (joins.includes('LEFT JOIN users') || joins.includes('INNER JOIN users')) { // Check if a user join exists
        selectCols += ', users.login as ownerLogin'; // Keep selecting ownerLogin if joined for other tables (like notes)
    }
    // No need to explicitly select createdBy/updatedBy as they are part of `${mainTableAlias}.*`

    const dataQuery = { sql: `SELECT DISTINCT ${selectCols} FROM ${table} AS ${mainTableAlias} ${joins} ${whereClause} ${orderBy} LIMIT ? OFFSET ?`, params: [...allParams, pageSize, offset] };
    const countQuery = { sql: `SELECT COUNT(DISTINCT ${mainTableAlias}.${primaryKeyField}) as total FROM ${table} AS ${mainTableAlias} ${joins} ${whereClause}`, params: [...allParams] };

    return { dataQuery, countQuery, page, pageSize, alias: mainTableAlias };
}

// executeSearch remains unchanged
export async function executeSearch<T>(
    dataQuery: { sql: string; params: any[] },
    countQuery: { sql: string; params: any[] }
): Promise<SearchResponse<T>> {
    if (!countQuery || typeof countQuery.sql !== 'string' || !Array.isArray(countQuery.params)) {
        const errorMsg = "executeSearch received invalid countQuery argument";
        await Log.error(errorMsg, 'system', 'search', { countQuery });
        throw new Error(errorMsg);
    }
    if (!dataQuery || typeof dataQuery.sql !== 'string' || !Array.isArray(dataQuery.params)) {
        const errorMsg = "executeSearch received invalid dataQuery argument";
        await Log.error(errorMsg, 'system', 'search', { dataQuery });
        throw new Error(errorMsg);
    }

    let totalSize = 0;
    try {
        const countStmt = db.prepare(countQuery.sql);
        const countResult = countStmt.get(...countQuery.params) as { total: number };
        totalSize = countResult?.total ?? 0;
    } catch (e: any) {
        await Log.error("Failed to execute count query", 'system', 'database', { sql: countQuery.sql, params: countQuery.params, error: e });
        throw new Error(`Failed to execute count query: ${e.message}`);
    }

    let dataResult: T[] = [];
    const pageSizeIndex = dataQuery.params.length - 2;
    const offsetIndex = dataQuery.params.length - 1;
    let pageSize = typeof dataQuery.params[pageSizeIndex] === 'number' ? dataQuery.params[pageSizeIndex] : 10;
    const offset = typeof dataQuery.params[offsetIndex] === 'number' ? dataQuery.params[offsetIndex] : 0;

    if (pageSize <= 0) {
        await Log.warn("Invalid page size requested, defaulting to 10", 'system', 'search', { requestedPageSize: pageSize });
        pageSize = 10;
        dataQuery.params[pageSizeIndex] = 10;
    }

    if (totalSize > offset) {
        try {
            const dataStmt = db.prepare(dataQuery.sql);
            dataResult = dataStmt.all(...dataQuery.params) as T[];
        } catch (e: any) {
             await Log.error("Failed to execute data query", 'system', 'database', { sql: dataQuery.sql, params: dataQuery.params, error: e });
             throw new Error(`Failed to execute data query: ${e.message}`);
        }
    } else if (totalSize > 0) {
         await Log.info("Skipping data query as totalSize <= offset", 'system', 'search', { totalSize, offset });
    }

    const finalPageSize = pageSize;
    const page = Math.floor(offset / finalPageSize) + 1;

    return {
        data: dataResult,
        page: page,
        pageSize: finalPageSize,
        totalSize: totalSize,
        totalPages: Math.ceil(totalSize / finalPageSize),
    };
}
