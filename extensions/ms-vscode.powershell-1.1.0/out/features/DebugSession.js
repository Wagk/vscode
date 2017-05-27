/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
"use strict";
const vscode = require("vscode");
const utils = require("../utils");
const vscode_languageclient_1 = require("vscode-languageclient");
var StartDebuggerNotification;
(function (StartDebuggerNotification) {
    StartDebuggerNotification.type = new vscode_languageclient_1.NotificationType('powerShell/startDebugger');
})(StartDebuggerNotification = exports.StartDebuggerNotification || (exports.StartDebuggerNotification = {}));
class DebugSessionFeature {
    constructor(sessionManager) {
        this.sessionManager = sessionManager;
        this.command = vscode.commands.registerCommand('PowerShell.StartDebugSession', config => { this.startDebugSession(config); });
    }
    setLanguageClient(languageClient) {
        languageClient.onNotification(StartDebuggerNotification.type, none => this.startDebugSession({
            request: 'launch',
            type: 'PowerShell',
            name: 'PowerShell Interactive Session'
        }));
    }
    dispose() {
        this.command.dispose();
    }
    startDebugSession(config) {
        let currentDocument = vscode.window.activeTextEditor.document;
        let debugCurrentScript = (config.script === "${file}") || !config.request;
        let generateLaunchConfig = !config.request;
        if (generateLaunchConfig) {
            // No launch.json, create the default configuration for both unsaved (Untitled) and saved documents.
            config.type = 'PowerShell';
            config.name = 'PowerShell Launch Current File';
            config.request = 'launch';
            config.args = [];
            config.script =
                currentDocument.isUntitled
                    ? currentDocument.uri.toString()
                    : currentDocument.fileName;
            // For a folder-less workspace, vscode.workspace.rootPath will be undefined.
            // PSES will convert that undefined to a reasonable working dir.
            config.cwd =
                currentDocument.isUntitled
                    ? vscode.workspace.rootPath
                    : currentDocument.fileName;
        }
        if (config.request === 'launch') {
            // For debug launch of "current script" (saved or unsaved), warn before starting the debugger if either
            // A) the unsaved document's language type is not PowerShell or
            // B) the saved document's extension is a type that PowerShell can't debug.
            if (debugCurrentScript) {
                if (currentDocument.isUntitled) {
                    if (currentDocument.languageId === 'powershell') {
                        if (!generateLaunchConfig) {
                            // Cover the case of existing launch.json but unsaved (Untitled) document.
                            // In this case, vscode.workspace.rootPath will not be undefined.
                            config.script = currentDocument.uri.toString();
                            config.cwd = vscode.workspace.rootPath;
                        }
                    }
                    else {
                        let msg = "To debug '" + currentDocument.fileName +
                            "', change the document's language mode to PowerShell or save the file with a PowerShell extension.";
                        vscode.window.showErrorMessage(msg);
                        return;
                    }
                }
                else {
                    let isValidExtension = false;
                    let extIndex = currentDocument.fileName.lastIndexOf('.');
                    if (extIndex !== -1) {
                        let ext = currentDocument.fileName.substr(extIndex + 1).toUpperCase();
                        isValidExtension = (ext === "PS1" || ext === "PSM1");
                    }
                    if ((currentDocument.languageId !== 'powershell') || !isValidExtension) {
                        let path = currentDocument.fileName;
                        let workspaceRootPath = vscode.workspace.rootPath;
                        if (currentDocument.fileName.startsWith(workspaceRootPath)) {
                            path = currentDocument.fileName.substring(vscode.workspace.rootPath.length + 1);
                        }
                        let msg = "'" + path + "' is a file type that cannot be debugged by the PowerShell debugger.";
                        vscode.window.showErrorMessage(msg);
                        return;
                    }
                }
            }
        }
        // Prevent the Debug Console from opening
        config.internalConsoleOptions = "neverOpen";
        // Create or show the interactive console
        // TODO #367: Check if "newSession" mode is configured
        vscode.commands.executeCommand('PowerShell.ShowSessionConsole', true);
        // Write out temporary debug session file
        utils.writeSessionFile(utils.getDebugSessionFilePath(), this.sessionManager.getSessionDetails());
        vscode.commands.executeCommand('vscode.startDebug', config);
    }
}
exports.DebugSessionFeature = DebugSessionFeature;
class SpecifyScriptArgsFeature {
    constructor(context) {
        this.context = context;
        let vscodeVersionArray = vscode.version.split('.');
        let editorVersion = {
            major: Number(vscodeVersionArray[0]),
            minor: Number(vscodeVersionArray[1]),
        };
        this.emptyInputBoxBugFixed =
            ((editorVersion.major > 1) ||
                ((editorVersion.major == 1) && (editorVersion.minor > 12)));
        this.command =
            vscode.commands.registerCommand('PowerShell.SpecifyScriptArgs', () => {
                return this.specifyScriptArguments();
            });
    }
    setLanguageClient(languageclient) {
        this.languageClient = languageclient;
    }
    dispose() {
        this.command.dispose();
    }
    specifyScriptArguments() {
        const powerShellDbgScriptArgsKey = 'powerShellDebugScriptArgs';
        let options = {
            ignoreFocusOut: true,
            placeHolder: "Enter script arguments or leave empty to pass no args"
        };
        if (this.emptyInputBoxBugFixed) {
            let prevArgs = this.context.workspaceState.get(powerShellDbgScriptArgsKey, '');
            if (prevArgs.length > 0) {
                options.value = prevArgs;
            }
        }
        return vscode.window.showInputBox(options).then(text => {
            // When user cancel's the input box (by pressing Esc), the text value is undefined.
            if (text !== undefined) {
                if (this.emptyInputBoxBugFixed) {
                    this.context.workspaceState.update(powerShellDbgScriptArgsKey, text);
                }
                return new Array(text);
            }
            return text;
        });
    }
}
exports.SpecifyScriptArgsFeature = SpecifyScriptArgsFeature;
var GetPSHostProcessesRequest;
(function (GetPSHostProcessesRequest) {
    GetPSHostProcessesRequest.type = new vscode_languageclient_1.RequestType('powerShell/getPSHostProcesses');
})(GetPSHostProcessesRequest || (GetPSHostProcessesRequest = {}));
class PickPSHostProcessFeature {
    constructor() {
        this.command =
            vscode.commands.registerCommand('PowerShell.PickPSHostProcess', () => {
                return this.getLanguageClient()
                    .then(_ => this.pickPSHostProcess(), _ => undefined);
            });
    }
    setLanguageClient(languageClient) {
        this.languageClient = languageClient;
        if (this.waitingForClientToken) {
            this.getLanguageClientResolve(this.languageClient);
            this.clearWaitingToken();
        }
    }
    dispose() {
        this.command.dispose();
    }
    getLanguageClient() {
        if (this.languageClient) {
            return Promise.resolve(this.languageClient);
        }
        else {
            // If PowerShell isn't finished loading yet, show a loading message
            // until the LanguageClient is passed on to us
            this.waitingForClientToken = new vscode.CancellationTokenSource();
            return new Promise((resolve, reject) => {
                this.getLanguageClientResolve = resolve;
                vscode.window
                    .showQuickPick(["Cancel"], { placeHolder: "Attach to PowerShell host process: Please wait, starting PowerShell..." }, this.waitingForClientToken.token)
                    .then(response => {
                    if (response === "Cancel") {
                        this.clearWaitingToken();
                        reject();
                    }
                });
                // Cancel the loading prompt after 60 seconds
                setTimeout(() => {
                    if (this.waitingForClientToken) {
                        this.clearWaitingToken();
                        reject();
                        vscode.window.showErrorMessage("Attach to PowerShell host process: PowerShell session took too long to start.");
                    }
                }, 60000);
            });
        }
    }
    pickPSHostProcess() {
        return this.languageClient.sendRequest(GetPSHostProcessesRequest.type, null).then(hostProcesses => {
            var items = [];
            for (var p in hostProcesses) {
                var windowTitle = "";
                if (hostProcesses[p].mainWindowTitle) {
                    windowTitle = `, Title: ${hostProcesses[p].mainWindowTitle}`;
                }
                items.push({
                    label: hostProcesses[p].processName,
                    description: `PID: ${hostProcesses[p].processId.toString()}${windowTitle}`,
                    pid: hostProcesses[p].processId
                });
            }
            ;
            if (items.length === 0) {
                return Promise.reject("There are no PowerShell host processes to attach to.");
            }
            let options = {
                placeHolder: "Select a PowerShell host process to attach to",
                matchOnDescription: true,
                matchOnDetail: true
            };
            return vscode.window.showQuickPick(items, options).then(item => {
                return item ? item.pid : "";
            });
        });
    }
    clearWaitingToken() {
        if (this.waitingForClientToken) {
            this.waitingForClientToken.dispose();
            this.waitingForClientToken = undefined;
        }
    }
}
exports.PickPSHostProcessFeature = PickPSHostProcessFeature;
//# sourceMappingURL=DebugSession.js.map