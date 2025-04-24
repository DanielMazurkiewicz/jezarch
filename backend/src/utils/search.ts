
import { db } from "../initialization/db";
import { Log } from "../functionalities/log/db"; // Import Log

export type SearchOnCustomFieldHandlerResult = {
    whereCondition: string;
    joinClause?: string; // Optional JOIN needed for this condition
    params: any[];
} | null; // Return null if the handler doesn't apply or generates no condition


export type SearchOnCustomFieldHandler<T> = (
    element: SearchQueryElement,
    tableAlias: string // Provide the alias of the main table
) => SearchOnCustomFieldHandlerResult | Promise<SearchOnCustomFieldHandlerResult>; // Can be async if handler needs DB lookups

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
    value: (string | number | boolean | null)[];
}

interface SearchQueryElement_Contains {
    field: string;
    not: boolean;
    condition: "FRAGMENT";
    value: string;
}
export type SearchQueryElement = SearchQueryElement_Primitive | SearchQueryElement_AnyOf | SearchQueryElement_Contains;
export type SearchQuery = SearchQueryElement[];

export interface SearchRequest {
    query: SearchQuery;
    page: number;
    pageSize: number;

    // sortBy?: keyof T;
    // sortDirection?: 'ASC' | 'DESC';
}

export interface SearchResponse<T> {
    data: T[];
    page: number;
    pageSize: number;
    totalSize: number;
    totalPages: number;
}

// Define the structure returned by buildSearchQueries
interface BuildSearchQueriesResult {
    dataQuery: { sql: string; params: any[] };
    countQuery: { sql: string; params: any[] };
    page: number;
    pageSize: number;
    alias: string; // <-- Added alias to return value
}

// Update the function signature to explicitly return a Promise of the result structure
export async function buildSearchQueries<T extends Record<string, any>>(
    table: string,
    searchRequest: SearchRequest,
    allowedFields: (keyof T)[],
    fieldHandlers?: Record<string, SearchOnCustomFieldHandler<T>>,
    primaryKeyField: string = `${table.slice(0, -1)}Id` // Infer 'noteId' from 'notes', 'userId' from 'users' etc. Adjust if needed.
): Promise<BuildSearchQueriesResult> {
    // Define the alias to be used consistently
    const mainTableAlias = `${table}_main`;

    const whereConditions: string[] = [];
    const allParams: any[] = []; // Collect all WHERE/JOIN params here
    const joinClauses = new Set<string>(); // Collect unique JOIN clauses

    const page = Math.max(1, searchRequest.page || 1);
    const pageSize = Math.max(1, searchRequest.pageSize || 10);
    const offset = (page - 1) * pageSize;

    // Process each query element
    for (const element of searchRequest.query) {
        const field = element.field;

        // Handle custom fields first
        if (fieldHandlers?.[field]) {
            // Pass the defined mainTableAlias to the handler
            const handlerResult = await fieldHandlers[field](element, mainTableAlias); // Use await as handler can be async
            if (handlerResult) {
                if (handlerResult.joinClause) {
                    joinClauses.add(handlerResult.joinClause);
                }
                if (handlerResult.whereCondition) {
                   whereConditions.push(handlerResult.whereCondition);
                }
                allParams.push(...handlerResult.params);
            }
            continue; // Move to the next element
        }

        // Handle standard fields
        // Ensure the field is allowed OR if it's potentially added by a JOIN (like ownerLogin)
        // We assume fieldHandlers handle JOINed fields correctly.
        // For direct fields, check against allowedFields.
        if (!allowedFields.includes(field as keyof T)) {
            // Check if it might be a field from a JOIN (basic check, could be more robust)
            // For now, allow fields not strictly in allowedFields if a handler didn't process it.
            // Log a warning for potential unexpected fields.
             await Log.warn(`Search field '${field}' not in allowedDirectFields or handled by custom handler. Proceeding, ensure JOIN/field is valid.`, 'system', 'search', { field, table });
             // Allow standard processing for potentially JOINed fields like 'ownerLogin' if no handler exists
             // continue; // If strict checking is desired, uncomment this.
        }

        let baseCondition: string = '';
        let elementParams: any[] = [];
        let needsHandling = true;

        // === Standard Field Processing ===
         // Use the defined mainTableAlias for standard fields
         const qualifiedField = `${mainTableAlias}.${field}`;

        switch (element.condition) {
            case "EQ":
            case "GT":
            case "GTE":
            case "LT":
            case "LTE":
                const operator = {
                    EQ: element.value === null ? "IS" : "=",
                    GT: ">",
                    GTE: ">=",
                    LT: "<",
                    LTE: "<=",
                }[element.condition];
                 if (!operator) {
                    await Log.warn(`Unsupported operator for condition`, 'system', 'search', { field, condition: element.condition, table });
                    needsHandling = false;
                    break;
                 }
                 // Handle boolean values correctly (convert to 1/0 for SQLite)
                 let valueToUse = element.value;
                 if (typeof valueToUse === 'boolean') {
                     valueToUse = valueToUse ? 1 : 0;
                 }
                 baseCondition = `${qualifiedField} ${operator} ?`;
                 elementParams.push(valueToUse);
                 break;

            case "ANY_OF":
                if (!Array.isArray(element.value)) {
                     await Log.warn(`ANY_OF requires an array value`, 'system', 'search', { field, value: element.value, table });
                     needsHandling = false;
                     break;
                }
                if (element.value.length === 0) {
                    // Match nothing if array is empty, unless NOT is true
                    baseCondition = element.not ? "1=1" : "1=0";
                } else {
                    // Handle boolean values in array
                    const valuesToUse = element.value.map(v => typeof v === 'boolean' ? (v ? 1 : 0) : v);
                    const placeholders = valuesToUse.map(() => "?").join(", ");
                    baseCondition = `${qualifiedField} ${element.not ? 'NOT ' : ''}IN (${placeholders})`;
                    elementParams.push(...valuesToUse);
                }
                element.not = false; // Prevent double negation below
                break;

            case "FRAGMENT":
                 if (typeof element.value !== 'string') {
                    await Log.warn(`FRAGMENT requires a string value`, 'system', 'search', { field, value: element.value, table });
                    needsHandling = false;
                    break;
                 }
                 baseCondition = `${qualifiedField} LIKE ?`;
                 elementParams.push(`%${element.value}%`);
                 break;

            default:
                 const unknownCondition = (element as any).condition;
                 await Log.warn(`Unsupported search condition`, 'system', 'search', { field, condition: unknownCondition, table });
                 needsHandling = false;
                 break;
        }

        if (needsHandling) {
            if (element.not) {
                if (baseCondition) { baseCondition = `NOT (${baseCondition})`; }
            }
            if (baseCondition) whereConditions.push(baseCondition);
            allParams.push(...elementParams);
        }
    }

    // Build final queries
    const joins = Array.from(joinClauses).join('\n');
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    // Use the defined mainTableAlias for ordering
    const orderBy = `ORDER BY ${mainTableAlias}.${primaryKeyField} DESC`; // Consider making sorting configurable

    // Define columns to select, including potential JOIN columns
    // For now, select all from main table alias. Handlers might add specific selects if needed.
    // Example: Add u.login if ownerLogin handler adds a JOIN u
    let selectCols = `${mainTableAlias}.*`;
    // Add common JOIN columns if they exist in handlers (e.g., ownerLogin)
    if (joins.includes('users')) { // Basic check for user join
        selectCols += ', users.login as ownerLogin';
    }

    const dataQuery = {
        sql: `
            SELECT DISTINCT ${selectCols}
            FROM ${table} AS ${mainTableAlias}
            ${joins}
            ${whereClause}
            ${orderBy}
            LIMIT ? OFFSET ?
        `,
        params: [...allParams, pageSize, offset]
    };

    // Count query needs to count based on the primary key of the main table
    const countQuery = {
        sql: `
            SELECT COUNT(DISTINCT ${mainTableAlias}.${primaryKeyField}) as total
            FROM ${table} AS ${mainTableAlias}
            ${joins}
            ${whereClause}
        `,
        params: [...allParams]
    };

    return {
        dataQuery,
        countQuery,
        page,
        pageSize,
        alias: mainTableAlias // <-- Return the alias used
    };
}

// executeSearch function remains the same as provided previously
export async function executeSearch<T>(
    dataQuery: { sql: string; params: any[] },
    countQuery: { sql: string; params: any[] }
): Promise<SearchResponse<T>> {

    // === Add Input Validation ===
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
    // ============================

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
    let pageSize = typeof dataQuery.params[pageSizeIndex] === 'number' ? dataQuery.params[pageSizeIndex] : 10; // Default page size
    const offset = typeof dataQuery.params[offsetIndex] === 'number' ? dataQuery.params[offsetIndex] : 0;     // Default offset

    if (pageSize <= 0) {
        await Log.warn("Invalid page size requested, defaulting to 10", 'system', 'search', { requestedPageSize: pageSize });
        pageSize = 10; // Correct the value used, not just the parameter list
        dataQuery.params[pageSizeIndex] = 10;
    }

    if (totalSize > offset) { // Fetch data only if there's potentially something on the requested page
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

    const finalPageSize = pageSize; // Use the validated/defaulted page size
    const page = Math.floor(offset / finalPageSize) + 1;


    return {
        data: dataResult,
        page: page,
        pageSize: finalPageSize,
        totalSize: totalSize,
        totalPages: Math.ceil(totalSize / finalPageSize),
    };
}
