import { AppConfigKeys } from '../functionalities/config/models';
import { getConfig, setConfig } from '../functionalities/config/db';
import { AppParams, AppParamsDefaults } from './app_params';


export async function initializeConfigs() {
    const defaultLanguage = await getConfig(AppConfigKeys.DEFAULT_LANGUAGE);
    if (defaultLanguage) {
        AppParams.defaultLanguage = defaultLanguage
    } else {
        AppParams.defaultLanguage ||= AppParamsDefaults.defaultLanguage
    }

    const port = await getConfig(AppConfigKeys.PORT);
    if (port) {
        AppParams.port = parseInt(port)
    } else {
        AppParams.port ||= AppParamsDefaults.port
    }
}
