// File: backend/src/utils/search.ts
import { db } from "../initialization/db";


export type SearchOnCustomFieldHandlerResult = {
    whereCondition: string;
    joinClause?: string; // Optional JOIN needed for this condition
    params: any[];
} | null; // Return null if the handler doesn't apply or generates no condition


export type SearchOnCustomFieldHandler<T> = (
    element: SearchQueryElement,
    tableAlias: string // Provide the alias of the main table
) => SearchOnCustomFieldHandlerResult;

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


export function buildSearchQueries<T extends Record<string, any>>(
    table: string,
    searchRequest: SearchRequest,
    allowedFields: (keyof T)[],
    fieldHandlers?: Record<string, SearchOnCustomFieldHandler<T>>,
    // Add primary key for distinct counting
    primaryKeyField: string = `${table.slice(0, -1)}Id` // Infer 'noteId' from 'notes', 'userId' from 'users' etc. Adjust if needed.
) {
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
            const handlerResult = fieldHandlers[field](element, mainTableAlias);
            if (handlerResult) {
                if (handlerResult.joinClause) {
                    joinClauses.add(handlerResult.joinClause);
                }
                // Only add condition if it's not empty (handler might return empty string for logic)
                if (handlerResult.whereCondition) {
                   whereConditions.push(handlerResult.whereCondition);
                }
                allParams.push(...handlerResult.params);
            }
            continue; // Move to the next element
        }

        // Handle standard fields
        if (!allowedFields.includes(field as keyof T)) {
            // Optionally log or skip invalid fields instead of throwing
            console.warn(`Search skipped invalid field: ${field}`);
            continue;
            // throw new Error(`Invalid field: ${field}`);
        }

        let baseCondition: string;
        let elementParams: any[] = [];
        let needsHandling = true; // Flag to check if condition was generated

        switch (element.condition) {
            case "EQ":
            case "GT":
            case "GTE":
            case "LT":
            case "LTE":
                const operator = {
                    EQ: element.value === null ? "IS" : "=", // Handle NULL correctly
                    GT: ">",
                    GTE: ">=",
                    LT: "<",
                    LTE: "<=",
                }[element.condition];
                 // Ensure operator exists for the condition
                 if (!operator) {
                    console.warn(`Unsupported operator for condition: ${element.condition}`);
                    needsHandling = false;
                    break;
                 }

                baseCondition = `${mainTableAlias}.${field} ${operator} ?`;
                elementParams.push(element.value);
                break;

            case "ANY_OF":
                if (!Array.isArray(element.value)) {
                     console.warn(`ANY_OF requires an array value for field ${field}`);
                     needsHandling = false;
                     break;
                    // throw new Error("ANY_OF requires an array value");
                }
                if (element.value.length === 0) {
                    // If array is empty, 'IN ()' is invalid SQL.
                    // field IN () should match nothing. NOT IN () should match everything.
                    baseCondition = element.not ? "1=1" : "1=0"; // Always true or always false
                } else {
                    const placeholders = element.value.map(() => "?").join(", ");
                    baseCondition = `${mainTableAlias}.${field} ${element.not ? 'NOT ' : ''}IN (${placeholders})`;
                    elementParams.push(...element.value);
                }
                // 'not' is handled directly above for IN clause
                element.not = false; // Prevent double negation below
                break;

            case "FRAGMENT":
                 if (typeof element.value !== 'string') {
                    console.warn(`FRAGMENT requires a string value for field ${field}`);
                    needsHandling = false;
                    break;
                 }
                baseCondition = `${mainTableAlias}.${field} LIKE ?`;
                elementParams.push(`%${element.value}%`);
                break;

            default:
                 console.warn(`Unsupported condition: ${(element as any).condition}`);
                 needsHandling = false;
                 break;
                // throw new Error(`Unsupported condition: ${(element as any).condition}`);
        }

        if (needsHandling) {
            if (element.not) { // Apply NOT only if not already handled (like in ANY_OF)
                // @ts-ignore
                if (baseCondition) {
                    baseCondition = `NOT (${baseCondition})`;
                }
            }
            // @ts-ignore
            if (baseCondition) whereConditions.push(baseCondition);
            allParams.push(...elementParams);
        }
    }

    // Build final queries
    const joins = Array.from(joinClauses).join('\n');
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Add default sorting for consistent pagination (adjust field as needed)
    const orderBy = `ORDER BY ${mainTableAlias}.${primaryKeyField} DESC`; // Example: ORDER BY notes_main.noteId DESC

    const dataQuery = {
        sql: `
            SELECT DISTINCT ${mainTableAlias}.*
            FROM ${table} AS ${mainTableAlias}
            ${joins}
            ${whereClause}
            ${orderBy}
            LIMIT ? OFFSET ?
        `,
        // IMPORTANT: Pagination params MUST come last
        params: [...allParams, pageSize, offset]
    };

    const countQuery = {
        sql: `
            SELECT COUNT(DISTINCT ${mainTableAlias}.${primaryKeyField}) as total
            FROM ${table} AS ${mainTableAlias}
            ${joins}
            ${whereClause}
        `,
         // IMPORTANT: Count query uses only the filter params
        params: [...allParams]
    };

    return {
        dataQuery,
        countQuery,
        page,
        pageSize
    };
}

export async function executeSearch<T>(
    dataQuery: { sql: string; params: any[] },
    countQuery: { sql: string; params: any[] }
): Promise<SearchResponse<T>> {
    // console.log("Count SQL:", countQuery.sql); // Debugging
    // console.log("Count Params:", countQuery.params); // Debugging
    const countStmt = db.prepare(countQuery.sql);
    const countResult = countStmt.get(...countQuery.params) as { total: number };
    const totalSize = countResult?.total ?? 0;


    let dataResult: T[] = [];
    if (totalSize > 0) {
        // Only fetch data if count > 0
        // console.log("Data SQL:", dataQuery.sql); // Debugging
        // console.log("Data Params:", dataQuery.params); // Debugging
        const dataStmt = db.prepare(dataQuery.sql);
        dataResult = dataStmt.all(...dataQuery.params) as T[];
    }

    const pageSize = dataQuery.params[dataQuery.params.length - 2] as number; // pageSize is second to last
    const page = Math.ceil((dataQuery.params[dataQuery.params.length - 1] as number) / pageSize) + 1; // offset is last


    return {
        data: dataResult,
        page: page,
        pageSize: pageSize,
        totalSize: totalSize,
        totalPages: Math.ceil(totalSize / pageSize),
    };
}