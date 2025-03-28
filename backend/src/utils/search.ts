// File: backend/src/utils/search.ts
import { db } from "../initialization/db";

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

export type SearchQuery = (SearchQueryElement_Primitive | SearchQueryElement_AnyOf | SearchQueryElement_Contains)[];

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

export function buildSearchQueries<T extends Record<string, any>>(
    table: string,
    searchRequest: SearchRequest,
    allowedFields: (keyof T)[]
) {
    const conditions: string[] = [];
    const params: any[] = [];
    const page = Math.max(1, searchRequest.page || 1);
    const pageSize = Math.max(1, searchRequest.pageSize || 10);

    for (const element of searchRequest.query) {
        const field = element.field;
        if (!allowedFields.includes(field as keyof T)) {
            throw new Error(`Invalid field: ${field}`);
        }

        let baseCondition: string;
        let elementParams: any[] = [];
        let handledNot = false;

        switch (element.condition) {
            case "EQ":
            case "GT":
            case "GTE":
            case "LT":
            case "LTE":
                const operator = {
                    EQ: "=",
                    GT: ">",
                    GTE: ">=",
                    LT: "<",
                    LTE: "<=",
                }[element.condition];
                baseCondition = `${field} ${operator} ?`;
                elementParams.push(element.value);
                break;

            case "ANY_OF":
                if (!Array.isArray(element.value)) {
                    throw new Error("ANY_OF requires an array value");
                }
                if (element.value.length === 0) {
                    baseCondition = element.not ? "1=1" : "1=0";
                    handledNot = true;
                } else {
                    const placeholders = element.value.map(() => "?").join(", ");
                    baseCondition = `${field} IN (${placeholders})`;
                    elementParams.push(...element.value);
                }
                break;

            case "FRAGMENT":
                baseCondition = `${field} LIKE ?`;
                elementParams.push(`%${element.value}%`);
                break;

            default:
                throw new Error(`Unsupported condition: ${(element as any).condition}`);
        }

        if (element.not && !handledNot) {
            baseCondition = `NOT (${baseCondition})`;
        }

        conditions.push(baseCondition);
        params.push(...elementParams);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;

    return {
        dataQuery: {
            sql: `SELECT * FROM ${table} ${whereClause} LIMIT ? OFFSET ?`,
            params: [...params, pageSize, offset],
        },
        countQuery: {
            sql: `SELECT COUNT(*) as total FROM ${table} ${whereClause}`,
            params: [...params],
        },
        page,
        pageSize,
    };
}

export async function executeSearch<T>(
    dataQuery: { sql: string; params: any[] },
    countQuery: { sql: string; params: any[] }
): Promise<SearchResponse<T>> {
    const countStmt = db.prepare(countQuery.sql);
    const countResult = countStmt.get(...countQuery.params) as { total: number };

    const dataStmt = db.prepare(dataQuery.sql);
    const dataResult = dataStmt.all(...dataQuery.params) as T[];

    return {
        data: dataResult,
        page: dataQuery.params[dataQuery.params.length - 2] as number,
        pageSize: dataQuery.params[dataQuery.params.length - 1] as number,
        totalSize: countResult.total,
        totalPages: Math.ceil(countResult.total / (dataQuery.params[dataQuery.params.length - 1] as number)),
    };
}