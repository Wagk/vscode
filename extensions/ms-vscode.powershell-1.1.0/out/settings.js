/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
const vscode = require("vscode");
function load(myPluginId) {
    let configuration = vscode.workspace.getConfiguration(myPluginId);
    let defaultScriptAnalysisSettings = {
        enable: true,
        settingsPath: ""
    };
    let defaultDeveloperSettings = {
        featureFlags: [],
        powerShellExePath: undefined,
        bundledModulesPath: undefined,
        editorServicesLogLevel: "Normal",
        editorServicesWaitForDebugger: false,
        powerShellExeIsWindowsDevBuild: false
    };
    let defaultCodeFormattingSettings = {
        openBraceOnSameLine: true,
        newLineAfterOpenBrace: true,
        newLineAfterCloseBrace: true,
        whitespaceBeforeOpenBrace: true,
        whitespaceBeforeOpenParen: true,
        whitespaceAroundOperator: true,
        whitespaceAfterSeparator: true,
        ignoreOneLineBlock: true,
        alignPropertyValuePairs: true
    };
    let defaultIntegratedConsoleSettings = {
        showOnStartup: true,
        focusConsoleOnExecute: true
    };
    return {
        startAutomatically: configuration.get("startAutomatically", true),
        useX86Host: configuration.get("useX86Host", false),
        enableProfileLoading: configuration.get("enableProfileLoading", false),
        scriptAnalysis: configuration.get("scriptAnalysis", defaultScriptAnalysisSettings),
        developer: configuration.get("developer", defaultDeveloperSettings),
        codeFormatting: configuration.get("codeFormatting", defaultCodeFormattingSettings),
        integratedConsole: configuration.get("integratedConsole", defaultIntegratedConsoleSettings)
    };
}
exports.load = load;
//# sourceMappingURL=settings.js.map