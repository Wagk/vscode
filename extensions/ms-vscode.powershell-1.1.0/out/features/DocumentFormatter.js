/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
"use strict";
const vscode = require("vscode");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
var Window = vscode.window;
const Settings = require("../settings");
const Utils = require("../utils");
const AnimatedStatusBar = require("../controls/animatedStatusBar");
var ScriptFileMarkersRequest;
(function (ScriptFileMarkersRequest) {
    ScriptFileMarkersRequest.type = new vscode_languageclient_1.RequestType("powerShell/getScriptFileMarkers");
})(ScriptFileMarkersRequest = exports.ScriptFileMarkersRequest || (exports.ScriptFileMarkersRequest = {}));
var ScriptRegionRequest;
(function (ScriptRegionRequest) {
    ScriptRegionRequest.type = new vscode_languageclient_1.RequestType("powerShell/getScriptRegion");
})(ScriptRegionRequest = exports.ScriptRegionRequest || (exports.ScriptRegionRequest = {}));
var ScriptFileMarkerLevel;
(function (ScriptFileMarkerLevel) {
    ScriptFileMarkerLevel[ScriptFileMarkerLevel["Information"] = 0] = "Information";
    ScriptFileMarkerLevel[ScriptFileMarkerLevel["Warning"] = 1] = "Warning";
    ScriptFileMarkerLevel[ScriptFileMarkerLevel["Error"] = 2] = "Error";
})(ScriptFileMarkerLevel || (ScriptFileMarkerLevel = {}));
function toRange(scriptRegion) {
    return new vscode.Range(scriptRegion.startLineNumber - 1, scriptRegion.startColumnNumber - 1, scriptRegion.endLineNumber - 1, scriptRegion.endColumnNumber - 1);
}
function toOneBasedPosition(position) {
    return position.translate({ lineDelta: 1, characterDelta: 1 });
}
function editComparer(leftOperand, rightOperand) {
    if (leftOperand.startLineNumber < rightOperand.startLineNumber) {
        return -1;
    }
    else if (leftOperand.startLineNumber > rightOperand.startLineNumber) {
        return 1;
    }
    else {
        if (leftOperand.startColumnNumber < rightOperand.startColumnNumber) {
            return -1;
        }
        else if (leftOperand.startColumnNumber > rightOperand.startColumnNumber) {
            return 1;
        }
        else {
            return 0;
        }
    }
}
class DocumentLocker {
    constructor() {
        this.lockedDocuments = new Object();
    }
    isLocked(document) {
        return this.isLockedInternal(this.getKey(document));
    }
    lock(document, unlockWhenDone) {
        this.lockInternal(this.getKey(document), unlockWhenDone);
    }
    unlock(document) {
        this.unlockInternal(this.getKey(document));
    }
    unlockAll() {
        Object.keys(this.lockedDocuments).slice().forEach(documentKey => this.unlockInternal(documentKey));
    }
    getKey(document) {
        return document.uri.toString();
    }
    lockInternal(documentKey, unlockWhenDone) {
        if (!this.isLockedInternal(documentKey)) {
            this.lockedDocuments[documentKey] = true;
        }
        if (unlockWhenDone !== undefined) {
            unlockWhenDone.then(() => this.unlockInternal(documentKey));
        }
    }
    unlockInternal(documentKey) {
        if (this.isLockedInternal(documentKey)) {
            delete this.lockedDocuments[documentKey];
        }
    }
    isLockedInternal(documentKey) {
        return this.lockedDocuments.hasOwnProperty(documentKey);
    }
}
class PSDocumentFormattingEditProvider {
    constructor(aggregateUndoStop = true) {
        // The order in which the rules will be executed starting from the first element.
        this.ruleOrder = [
            "PSPlaceCloseBrace",
            "PSPlaceOpenBrace",
            "PSUseConsistentWhitespace",
            "PSUseConsistentIndentation",
            "PSAlignAssignmentStatement"
        ];
        this.aggregateUndoStop = aggregateUndoStop;
        this.lineDiff = 0;
    }
    get emptyPromise() {
        return Promise.resolve(vscode_1.TextEdit[0]);
    }
    provideDocumentFormattingEdits(document, options, token) {
        return this.provideDocumentRangeFormattingEdits(document, null, options, token);
    }
    provideDocumentRangeFormattingEdits(document, range, options, token) {
        let editor = this.getEditor(document);
        if (editor === undefined) {
            return this.emptyPromise;
        }
        // Check if the document is already being formatted.
        // If so, then ignore the formatting request.
        if (this.isDocumentLocked(document)) {
            return this.emptyPromise;
        }
        let textEdits = this.executeRulesInOrder(editor, range, options, 0);
        this.lockDocument(document, textEdits);
        PSDocumentFormattingEditProvider.showStatusBar(document, textEdits);
        return textEdits;
    }
    provideOnTypeFormattingEdits(document, position, ch, options, token) {
        return this.getScriptRegion(document, position, ch).then(scriptRegion => {
            if (scriptRegion === null) {
                return this.emptyPromise;
            }
            return this.provideDocumentRangeFormattingEdits(document, toRange(scriptRegion), options, token);
        });
    }
    setLanguageClient(languageClient) {
        this.languageClient = languageClient;
        // setLanguageClient is called while restarting a session,
        // so this makes sure we clean up the document locker and
        // any residual status bars
        PSDocumentFormattingEditProvider.documentLocker.unlockAll();
        PSDocumentFormattingEditProvider.disposeAllStatusBars();
    }
    getScriptRegion(document, position, ch) {
        let oneBasedPosition = toOneBasedPosition(position);
        return this.languageClient.sendRequest(ScriptRegionRequest.type, {
            fileUri: document.uri.toString(),
            character: ch,
            line: oneBasedPosition.line,
            column: oneBasedPosition.character
        }).then((result) => {
            if (result === null) {
                return null;
            }
            return result.scriptRegion;
        });
    }
    snapRangeToEdges(range, document) {
        return range.with({
            start: range.start.with({ character: 0 }),
            end: document.lineAt(range.end.line).range.end
        });
    }
    getEditor(document) {
        return Window.visibleTextEditors.find((e, n, obj) => { return e.document === document; });
    }
    isDocumentLocked(document) {
        return PSDocumentFormattingEditProvider.documentLocker.isLocked(document);
    }
    lockDocument(document, unlockWhenDone) {
        PSDocumentFormattingEditProvider.documentLocker.lock(document, unlockWhenDone);
    }
    executeRulesInOrder(editor, range, options, index) {
        if (this.languageClient !== null && index < this.ruleOrder.length) {
            let rule = this.ruleOrder[index];
            let uniqueEdits = [];
            let document = editor.document;
            let edits;
            return this.languageClient.sendRequest(ScriptFileMarkersRequest.type, {
                fileUri: document.uri.toString(),
                settings: this.getSettings(rule)
            })
                .then((result) => {
                edits = result.markers.map(marker => { return marker.correction.edits[0]; });
                // sort in decending order of the edits
                edits.sort((left, right) => {
                    return -1 * editComparer(left, right);
                });
                // we need to update the range as the edits might
                // have changed the original layout
                if (range !== null) {
                    if (this.lineDiff !== 0) {
                        range = range.with({ end: range.end.translate({ lineDelta: this.lineDiff }) });
                    }
                    // extend the range such that it starts at the first character of the
                    // start line of the range.
                    range = this.snapRangeToEdges(range, document);
                    // filter edits that are contained in the input range
                    edits = edits.filter(edit => range.contains(toRange(edit).start));
                }
                // We cannot handle multiple edits at the same point hence we
                // filter the markers so that there is only one edit per region
                if (edits.length > 0) {
                    uniqueEdits.push(edits[0]);
                    for (let edit of edits.slice(1)) {
                        let lastEdit = uniqueEdits[uniqueEdits.length - 1];
                        if (lastEdit.startLineNumber !== edit.startLineNumber
                            || (edit.startColumnNumber + edit.text.length) < lastEdit.startColumnNumber) {
                            uniqueEdits.push(edit);
                        }
                    }
                }
                // reset line difference to 0
                this.lineDiff = 0;
                // we do not return a valid array because our text edits
                // need to be executed in a particular order and it is
                // easier if we perform the edits ourselves
                return this.applyEdit(editor, uniqueEdits, 0, index);
            })
                .then(() => {
                // execute the same rule again if we left out violations
                // on the same line
                let newIndex = index + 1;
                if (uniqueEdits.length !== edits.length) {
                    newIndex = index;
                }
                return this.executeRulesInOrder(editor, range, options, newIndex);
            });
        }
        else {
            return this.emptyPromise;
        }
    }
    applyEdit(editor, edits, markerIndex, ruleIndex) {
        if (markerIndex >= edits.length) {
            return;
        }
        let undoStopAfter = !this.aggregateUndoStop || (ruleIndex === this.ruleOrder.length - 1 && markerIndex === edits.length - 1);
        let undoStopBefore = !this.aggregateUndoStop || (ruleIndex === 0 && markerIndex === 0);
        let edit = edits[markerIndex];
        let editRange = toRange(edit);
        // accumulate the changes in number of lines
        // get the difference between the number of lines in the replacement text and
        // that of the original text
        this.lineDiff += this.getNumLines(edit.text) - (editRange.end.line - editRange.start.line + 1);
        return editor.edit((editBuilder) => {
            editBuilder.replace(editRange, edit.text);
        }, {
            undoStopAfter: undoStopAfter,
            undoStopBefore: undoStopBefore
        }).then((isEditApplied) => {
            return this.applyEdit(editor, edits, markerIndex + 1, ruleIndex);
        }); // TODO handle rejection
    }
    getNumLines(text) {
        return text.split(/\r?\n/).length;
    }
    getSettings(rule) {
        let psSettings = Settings.load(Utils.PowerShellLanguageId);
        let ruleSettings = new Object();
        ruleSettings["Enable"] = true;
        switch (rule) {
            case "PSPlaceOpenBrace":
                ruleSettings["OnSameLine"] = psSettings.codeFormatting.openBraceOnSameLine;
                ruleSettings["NewLineAfter"] = psSettings.codeFormatting.newLineAfterOpenBrace;
                ruleSettings["IgnoreOneLineBlock"] = psSettings.codeFormatting.ignoreOneLineBlock;
                break;
            case "PSPlaceCloseBrace":
                ruleSettings["IgnoreOneLineBlock"] = psSettings.codeFormatting.ignoreOneLineBlock;
                ruleSettings["NewLineAfter"] = psSettings.codeFormatting.newLineAfterCloseBrace;
                break;
            case "PSUseConsistentIndentation":
                ruleSettings["IndentationSize"] = vscode.workspace.getConfiguration("editor").get("tabSize");
                break;
            case "PSUseConsistentWhitespace":
                ruleSettings["CheckOpenBrace"] = psSettings.codeFormatting.whitespaceBeforeOpenBrace;
                ruleSettings["CheckOpenParen"] = psSettings.codeFormatting.whitespaceBeforeOpenParen;
                ruleSettings["CheckOperator"] = psSettings.codeFormatting.whitespaceAroundOperator;
                ruleSettings["CheckSeparator"] = psSettings.codeFormatting.whitespaceAfterSeparator;
                break;
            case "PSAlignAssignmentStatement":
                ruleSettings["CheckHashtable"] = psSettings.codeFormatting.alignPropertyValuePairs;
                break;
            default:
                break;
        }
        let settings = new Object();
        settings[rule] = ruleSettings;
        return settings;
    }
    static showStatusBar(document, hideWhenDone) {
        let statusBar = AnimatedStatusBar.showAnimatedStatusBarMessage("Formatting PowerShell document", hideWhenDone);
        this.statusBarTracker[document.uri.toString()] = statusBar;
        hideWhenDone.then(() => {
            this.disposeStatusBar(document.uri.toString());
        });
    }
    static disposeStatusBar(documentUri) {
        if (this.statusBarTracker.hasOwnProperty(documentUri)) {
            this.statusBarTracker[documentUri].dispose();
            delete this.statusBarTracker[documentUri];
        }
    }
    static disposeAllStatusBars() {
        Object.keys(this.statusBarTracker).slice().forEach((key) => this.disposeStatusBar(key));
    }
}
PSDocumentFormattingEditProvider.documentLocker = new DocumentLocker();
PSDocumentFormattingEditProvider.statusBarTracker = new Object();
class DocumentFormatterFeature {
    constructor() {
        this.firstTriggerCharacter = "}";
        this.moreTriggerCharacters = ["\n"];
        this.documentFormattingEditProvider = new PSDocumentFormattingEditProvider();
        this.formattingEditProvider = vscode.languages.registerDocumentFormattingEditProvider("powershell", this.documentFormattingEditProvider);
        this.rangeFormattingEditProvider = vscode.languages.registerDocumentRangeFormattingEditProvider("powershell", this.documentFormattingEditProvider);
        this.onTypeFormattingEditProvider = vscode.languages.registerOnTypeFormattingEditProvider("powershell", this.documentFormattingEditProvider, this.firstTriggerCharacter, ...this.moreTriggerCharacters);
    }
    setLanguageClient(languageclient) {
        this.languageClient = languageclient;
        this.documentFormattingEditProvider.setLanguageClient(languageclient);
    }
    dispose() {
        this.formattingEditProvider.dispose();
        this.rangeFormattingEditProvider.dispose();
        this.onTypeFormattingEditProvider.dispose();
    }
}
exports.DocumentFormatterFeature = DocumentFormatterFeature;
//# sourceMappingURL=DocumentFormatter.js.map