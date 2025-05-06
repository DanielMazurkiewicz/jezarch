import { CmdParams } from './cmd';
import { AppConfigKeys } from '../functionalities/config/models'; // Import AppConfigKeys

// Updated interface to reflect new config structure
export interface ApplicationParams {
    defaultLanguage: string;

    dbPath: string;

    httpPort: number; // Renamed from port
    httpsPort: number; // New
    httpsKeyPath: string | null; // New, stores path
    httpsCertPath: string | null; // New, stores path
    httpsCaPath: string | null; // New, stores path
}

// Updated defaults
export const AppParamsDefaults: ApplicationParams = {
    defaultLanguage: "en",

    dbPath: './jezarch.sqlite.db',

    httpPort: 8080,
    httpsPort: 8443,
    httpsKeyPath: null,
    httpsCertPath: null,
    httpsCaPath: null,
};

export const AppParamsHttpsDefaults = {
    httpsKeyPath: "./cert/private.key",
    httpsCertPath: "./cert/certificate.crt",
    httpsCaPath: "./cert/ca_bundle.crt",
}

// AppParams now uses defaults directly, will be populated/overridden by config/cmd later
export const AppParams: ApplicationParams = { ...AppParamsDefaults };


// Logging initial parameters (before config/cmd override)
console.log("* Initial AppParams (Defaults):", AppParams);

// This function is now primarily for confirming parameters *after* all sources (defaults, config, cmd) have been processed.
// It doesn't set values anymore, that happens in initializeConfigs and initializeCmdParams.
export const finalizeAppParams = () => {
    // Log the final effective parameters after initialization steps
    console.log("* Final Effective AppParams:", AppParams);
}

// Removed old initializeAppParams logic as it's replaced by initializeConfigs and command-line parsing.