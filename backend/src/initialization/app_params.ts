import { CmdParams } from './cmd';
import {
    AppConfigKeys,
    DEFAULT_HIDDEN_UI_ELEMENTS,
    DEFAULT_COMPONENT_SORT_MODE,
    DEFAULT_ELEMENT_SORT_MODE,
    type UiElementId,
    type ComponentSortMode,
    type ElementSortMode,
} from '../functionalities/config/models'; // Import AppConfigKeys

// Updated interface to reflect new config structure
export interface ApplicationParams {
    defaultLanguage: string;

    dbPath: string;

    httpPort: number; // Renamed from port
    httpsPort: number; // New
    httpsKeyPath: string | null; // New, stores path
    httpsCertPath: string | null; // New, stores path
    httpsCaPath: string | null; // New, stores path

    hiddenUiElements: UiElementId[]; // Cosmetically hidden UI controls, app-wide

    // Signature tree picker ordering (presentation only, set by admins).
    componentSortMode: ComponentSortMode;
    componentSortReversed: boolean;
    elementSortMode: ElementSortMode;
    elementSortReversed: boolean;
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

    hiddenUiElements: [...DEFAULT_HIDDEN_UI_ELEMENTS],

    componentSortMode: DEFAULT_COMPONENT_SORT_MODE,
    componentSortReversed: false,
    elementSortMode: DEFAULT_ELEMENT_SORT_MODE,
    elementSortReversed: false,
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