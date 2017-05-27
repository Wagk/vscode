/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
"use strict";
const vscode = require("vscode");
const path = require("path");
class ExamplesFeature {
    constructor() {
        this.examplesPath = path.resolve(__dirname, "../../examples");
        this.command = vscode.commands.registerCommand('PowerShell.OpenExamplesFolder', () => {
            vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(this.examplesPath), true);
        });
    }
    setLanguageClient(languageclient) {
    }
    dispose() {
        this.command.dispose();
    }
}
exports.ExamplesFeature = ExamplesFeature;
//# sourceMappingURL=Examples.js.map