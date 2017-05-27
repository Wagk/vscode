/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
"use strict";
const vscode = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
const checkboxQuickPick_1 = require("../controls/checkboxQuickPick");
var GetPSSARulesRequest;
(function (GetPSSARulesRequest) {
    GetPSSARulesRequest.type = new vscode_languageclient_1.RequestType("powerShell/getPSSARules");
})(GetPSSARulesRequest = exports.GetPSSARulesRequest || (exports.GetPSSARulesRequest = {}));
var SetPSSARulesRequest;
(function (SetPSSARulesRequest) {
    SetPSSARulesRequest.type = new vscode_languageclient_1.RequestType("powerShell/setPSSARules");
})(SetPSSARulesRequest = exports.SetPSSARulesRequest || (exports.SetPSSARulesRequest = {}));
class RuleInfo {
}
class SelectPSSARulesFeature {
    constructor() {
        this.command = vscode.commands.registerCommand("PowerShell.SelectPSSARules", () => {
            if (this.languageClient === undefined) {
                return;
            }
            this.languageClient.sendRequest(GetPSSARulesRequest.type, null).then((returnedRules) => {
                if (returnedRules == null) {
                    vscode.window.showWarningMessage("PowerShell extension uses PSScriptAnalyzer settings file - Cannot update rules.");
                    return;
                }
                let options = returnedRules.map(function (rule) {
                    return { label: rule.name, isSelected: rule.isEnabled };
                });
                checkboxQuickPick_1.showCheckboxQuickPick(options)
                    .then((updatedOptions) => {
                    if (updatedOptions === undefined) {
                        return;
                    }
                    this.languageClient.sendRequest(SetPSSARulesRequest.type, {
                        filepath: vscode.window.activeTextEditor.document.uri.fsPath,
                        ruleInfos: updatedOptions.map(function (option) {
                            return { name: option.label, isEnabled: option.isSelected };
                        })
                    });
                });
            });
        });
    }
    setLanguageClient(languageclient) {
        this.languageClient = languageclient;
    }
    dispose() {
        this.command.dispose();
    }
}
exports.SelectPSSARulesFeature = SelectPSSARulesFeature;
//# sourceMappingURL=SelectPSSARules.js.map