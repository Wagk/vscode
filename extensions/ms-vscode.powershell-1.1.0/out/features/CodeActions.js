/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
"use strict";
const vscode = require("vscode");
var Window = vscode.window;
class CodeActionsFeature {
    constructor() {
        this.command = vscode.commands.registerCommand('PowerShell.ApplyCodeActionEdits', (edit) => {
            Window.activeTextEditor.edit((editBuilder) => {
                editBuilder.replace(new vscode.Range(edit.StartLineNumber - 1, edit.StartColumnNumber - 1, edit.EndLineNumber - 1, edit.EndColumnNumber - 1), edit.Text);
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
exports.CodeActionsFeature = CodeActionsFeature;
//# sourceMappingURL=CodeActions.js.map