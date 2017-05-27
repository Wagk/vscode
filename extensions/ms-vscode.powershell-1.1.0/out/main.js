/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
const vscode = require("vscode");
const utils = require("./utils");
const path = require("path");
const Settings = require("./settings");
const logging_1 = require("./logging");
const session_1 = require("./session");
const utils_1 = require("./utils");
const Console_1 = require("./features/Console");
const Examples_1 = require("./features/Examples");
const OpenInISE_1 = require("./features/OpenInISE");
const ExpandAlias_1 = require("./features/ExpandAlias");
const ShowOnlineHelp_1 = require("./features/ShowOnlineHelp");
const CodeActions_1 = require("./features/CodeActions");
const RemoteFiles_1 = require("./features/RemoteFiles");
const DebugSession_1 = require("./features/DebugSession");
const DebugSession_2 = require("./features/DebugSession");
const DebugSession_3 = require("./features/DebugSession");
const SelectPSSARules_1 = require("./features/SelectPSSARules");
const PowerShellFindModule_1 = require("./features/PowerShellFindModule");
const NewFileOrProject_1 = require("./features/NewFileOrProject");
const ExtensionCommands_1 = require("./features/ExtensionCommands");
const DocumentFormatter_1 = require("./features/DocumentFormatter");
const HelpCompletion_1 = require("./features/HelpCompletion");
// NOTE: We will need to find a better way to deal with the required
//       PS Editor Services version...
var requiredEditorServicesVersion = "1.1.0";
var logger = undefined;
var sessionManager = undefined;
var extensionFeatures = [];
function activate(context) {
    checkForUpdatedVersion(context);
    vscode.languages.setLanguageConfiguration(utils_1.PowerShellLanguageId, {
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\=\+\[\{\]\}\\\|\;\'\"\,\.\<\>\/\?\s]+)/g,
        indentationRules: {
            // ^(.*\*/)?\s*\}.*$
            decreaseIndentPattern: /^(.*\*\/)?\s*\}.*$/,
            // ^.*\{[^}"']*$
            increaseIndentPattern: /^.*\{[^}"']*$/
        },
        comments: {
            lineComment: '#',
            blockComment: ['<#', '#>']
        },
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
        ],
        onEnterRules: [
            {
                // e.g. /** | */
                beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
                afterText: /^\s*\*\/$/,
                action: { indentAction: vscode.IndentAction.IndentOutdent, appendText: ' * ' }
            },
            {
                // e.g. /** ...|
                beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
                action: { indentAction: vscode.IndentAction.None, appendText: ' * ' }
            },
            {
                // e.g.  * ...|
                beforeText: /^(\t|(\ \ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/,
                action: { indentAction: vscode.IndentAction.None, appendText: '* ' }
            },
            {
                // e.g.  */|
                beforeText: /^(\t|(\ \ ))*\ \*\/\s*$/,
                action: { indentAction: vscode.IndentAction.None, removeText: 1 }
            },
            {
                // e.g.  *-----*/|
                beforeText: /^(\t|(\ \ ))*\ \*[^/]*\*\/\s*$/,
                action: { indentAction: vscode.IndentAction.None, removeText: 1 }
            }
        ]
    });
    // Create the logger
    logger = new logging_1.Logger();
    sessionManager =
        new session_1.SessionManager(requiredEditorServicesVersion, logger);
    // Create features
    extensionFeatures = [
        new Console_1.ConsoleFeature(),
        new Examples_1.ExamplesFeature(),
        new OpenInISE_1.OpenInISEFeature(),
        new ExpandAlias_1.ExpandAliasFeature(),
        new ShowOnlineHelp_1.ShowHelpFeature(),
        new PowerShellFindModule_1.FindModuleFeature(),
        new ExtensionCommands_1.ExtensionCommandsFeature(),
        new SelectPSSARules_1.SelectPSSARulesFeature(),
        new CodeActions_1.CodeActionsFeature(),
        new NewFileOrProject_1.NewFileOrProjectFeature(),
        new DocumentFormatter_1.DocumentFormatterFeature(),
        new RemoteFiles_1.RemoteFilesFeature(),
        new DebugSession_1.DebugSessionFeature(sessionManager),
        new DebugSession_2.PickPSHostProcessFeature(),
        new DebugSession_3.SpecifyScriptArgsFeature(context),
        new HelpCompletion_1.HelpCompletionFeature()
    ];
    sessionManager.setExtensionFeatures(extensionFeatures);
    var extensionSettings = Settings.load(utils.PowerShellLanguageId);
    if (extensionSettings.startAutomatically) {
        sessionManager.start();
    }
}
exports.activate = activate;
function checkForUpdatedVersion(context) {
    const showReleaseNotes = "Show Release Notes";
    const powerShellExtensionVersionKey = 'powerShellExtensionVersion';
    var extensionVersion = vscode
        .extensions
        .getExtension("ms-vscode.PowerShell")
        .packageJSON
        .version;
    var storedVersion = context.globalState.get(powerShellExtensionVersionKey);
    if (!storedVersion) {
    }
    else if (extensionVersion !== storedVersion) {
        vscode
            .window
            .showInformationMessage(`The PowerShell extension has been updated to version ${extensionVersion}!`, showReleaseNotes)
            .then(choice => {
            if (choice === showReleaseNotes) {
                vscode.commands.executeCommand('markdown.showPreview', vscode.Uri.file(path.resolve(__dirname, "../CHANGELOG.md")));
            }
        });
    }
    context.globalState.update(powerShellExtensionVersionKey, extensionVersion);
}
function deactivate() {
    // Clean up all extension features
    extensionFeatures.forEach(feature => {
        feature.dispose();
    });
    // Dispose of the current session
    sessionManager.dispose();
    // Dispose of the logger
    logger.dispose();
}
exports.deactivate = deactivate;
//# sourceMappingURL=main.js.map