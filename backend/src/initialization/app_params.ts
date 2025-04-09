import { CmdParams } from './cmd';

export interface ApplicationParams {
    dbPath: string;
    port: number;
    defaultLanguage: string;
}


export const AppParamsDefaults: ApplicationParams = {
    dbPath: './jezarch.sqlite.db',
    port: 8080,
    defaultLanguage: "en",
};

export const AppParams: ApplicationParams = {
    dbPath: CmdParams.dbPath
        || process.env.JEZARCH_DB_PATH
        || AppParamsDefaults.dbPath,

    port: CmdParams.port
        || parseInt(process.env.JEZARCH_PORT || "0"),

    defaultLanguage: CmdParams.defaultLanguage
        || process.env.JEZARCH_DEFAULT_LANGUAGE
        || "",
};
console.log("* initializeAppParams (A)")

export const initializeAppParams = () => {
    console.log("* initializeAppParams (B)")
}