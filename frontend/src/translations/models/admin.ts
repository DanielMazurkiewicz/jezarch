// frontend-react/src/translations/models/admin.ts
import { TranslationSet } from "../models";

export type AdminTranslationKey =
  | 'adminPanelTitle'
  | 'adminPanelDescription'
  | 'userManagementTab'
  | 'appSettingsTab'
  | 'databaseTab'
  | 'logsTab'
  | 'accessDeniedTitle'
  | 'accessDeniedMessage'
  | 'databaseManagementTitle'
  | 'databaseBackupTitle'
  | 'databaseBackupDescription'
  | 'downloadBackupButton'
  | 'databaseRestoreInfo'
  | 'logViewerTitle'
  | 'logViewerDescription'
  | 'purgeLogsOlderThanLabel'
  | 'daysLabel'
  | 'purgeButton'
  | 'confirmLogPurgeTitle'
  | 'confirmLogPurgeMessage' // Includes {days}
  | 'appSettingsTitleAdmin'
  | 'appSettingsDescriptionAdmin'
  | 'defaultLanguageLabel'
  | 'httpPortLabel'
  | 'httpsPortLabel'
  | 'httpsConfigTitle'
  | 'httpsConfigDescription'
  | 'httpsKeyPathLabel'
  | 'httpsCertPathLabel'
  | 'httpsCaPathLabel'
  | 'clearHttpsSettingsButton'
  | 'confirmClearHttpsTitle'
  | 'confirmClearHttpsMessage'
  | 'userManagementTitleAdmin'
  | 'userManagementDescriptionAdmin'
  | 'createUserButtonAdmin'
  | 'userLoginColumn'
  | 'userRoleColumn'
  | 'userLanguageColumn'
  | 'userAssignedTagsColumn'
  | 'userActionsColumn'
  | 'setLanguageButtonTooltip' // Includes {login}
  | 'assignTagsButtonTooltip' // Includes {login}
  | 'setPasswordButtonTooltip' // Includes {login}
  | 'createNewUserDialogTitle'
  | 'createNewUserDialogDescription'
  | 'setPasswordDialogTitle' // Includes {login}
  | 'setPasswordDialogDescription'
  | 'newPasswordLabel'
  | 'assignTagsDialogTitle' // Includes {login}
  | 'assignTagsDialogDescription'
  | 'setLanguageDialogTitle' // Includes {login}
  | 'setLanguageDialogDescription'
  | 'noUsersFound'
  | 'cannotChangeOwnRoleWarning'
  | 'roleUpdatedSuccess' // Includes {login}, {roleText}
  | 'passwordSetSuccess' // Includes {login}
  | 'languageUpdatedSuccess' // Includes {login}, {language}
  | 'tagsAssignedSuccess' // Includes {login}
  | 'userCreatedSuccessAdmin' // Includes {login}
  | 'selectRolePlaceholder'
  | 'noRoleOption'
  | 'adminRoleOption'
  | 'employeeRoleOption'
  | 'userRoleOption'
  | 'selectLanguagePlaceholder'
  | 'tagsCannotBeAssignedWarning'
  | 'saveSettingsSuccessMessage'
  | 'saveSettingsRestartWarning'
  | 'settingsPathNotFoundWarning' // Includes {path}
  | 'clearHttpsSuccessMessage'
  | 'clearHttpsAlreadyClearMessage'
  | 'logPurgeSuccessMessage' // Includes {count}, {days}
  | 'logPurgeInvalidDaysError'
  | 'invalidConfigKeyError'
  | 'invalidPortError'
  | 'invalidLanguageCodeError'
  | 'httpsKeyCertRequiredError'
  | 'httpsCertKeyRequiredError'
  | 'dbBackupDownloadStartedMessage'
  | 'dbBackupFailedError'
  | 'dbRestoreManualInfo'
  | 'logsTimestampColumn'
  | 'logsLevelColumn'
  | 'logsUserColumn'
  | 'logsCategoryColumn'
  | 'logsMessageColumn'
  | 'logsDataColumn'
  | 'logLevelInfo'
  | 'logLevelWarn'
  | 'logLevelError'
  | 'logUserSystem'
  | 'logCategoryGeneral'
  | 'noLogsFound'
  | 'clickRowToViewDetails'
  | 'logDataDialogTitle'
  | 'noAdditionalData'
  | 'unitLoadFailedError'
  | 'selectedElementLoadFailedError'
  | 'errorMessageTemplate'
  | 'userFetchFailedError'
  | 'tagLoadFailedError'
  | 'userFetchDetailsFailedError'
  | 'userRoleUpdateFailedError' // Includes {login}, {message}
  | 'userPasswordSetFailedError' // Includes {login}, {message}
  | 'userLanguageUpdateFailedError' // Includes {login}, {message}
  | 'userTagAssignFailedError' // Includes {message}
  | 'setPasswordButton'
  | 'createdBySearchLabel' // New
  | 'updatedBySearchLabel' // New
  ;

export type AdminTranslationSet = TranslationSet<AdminTranslationKey>;