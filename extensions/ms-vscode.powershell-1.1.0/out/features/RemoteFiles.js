/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
"use strict";
const os = require("os");
const path = require("path");
const vscode = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
var DidSaveTextDocumentNotification;
(function (DidSaveTextDocumentNotification) {
    DidSaveTextDocumentNotification.type = new vscode_languageclient_1.NotificationType('textDocument/didSave');
})(DidSaveTextDocumentNotification = exports.DidSaveTextDocumentNotification || (exports.DidSaveTextDocumentNotification = {}));
class RemoteFilesFeature {
    constructor() {
        // Get the common PowerShell Editor Services temporary file path
        // so that remote files from previous sessions can be closed.
        this.tempSessionPathPrefix =
            path.join(os.tmpdir(), 'PSES-')
                .toLowerCase();
        // At startup, close any lingering temporary remote files
        this.closeRemoteFiles();
        vscode.workspace.onDidSaveTextDocument(doc => {
            if (this.languageClient && this.isDocumentRemote(doc)) {
                this.languageClient.sendNotification(DidSaveTextDocumentNotification.type, {
                    textDocument: vscode_languageclient_1.TextDocumentIdentifier.create(doc.uri.toString())
                });
            }
        });
    }
    setLanguageClient(languageclient) {
        this.languageClient = languageclient;
    }
    dispose() {
        // Close any leftover remote files before exiting
        this.closeRemoteFiles();
    }
    isDocumentRemote(doc) {
        return doc.languageId === "powershell" &&
            doc.fileName.toLowerCase().startsWith(this.tempSessionPathPrefix);
    }
    closeRemoteFiles() {
        var remoteDocuments = vscode.workspace.textDocuments.filter(doc => this.isDocumentRemote(doc));
        function innerCloseFiles() {
            if (remoteDocuments.length > 0) {
                var doc = remoteDocuments.pop();
                return vscode.window
                    .showTextDocument(doc)
                    .then(editor => vscode.commands.executeCommand("workbench.action.closeActiveEditor"))
                    .then(_ => innerCloseFiles());
            }
        }
        ;
        innerCloseFiles();
    }
}
exports.RemoteFilesFeature = RemoteFilesFeature;
//# sourceMappingURL=RemoteFiles.js.map