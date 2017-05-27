/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
"use strict";
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
var CommentHelpRequest;
(function (CommentHelpRequest) {
    CommentHelpRequest.type = new vscode_languageclient_1.RequestType("powerShell/getCommentHelp");
})(CommentHelpRequest = exports.CommentHelpRequest || (exports.CommentHelpRequest = {}));
var SearchState;
(function (SearchState) {
    SearchState[SearchState["Searching"] = 0] = "Searching";
    SearchState[SearchState["Locked"] = 1] = "Locked";
    SearchState[SearchState["Found"] = 2] = "Found";
})(SearchState || (SearchState = {}));
;
class HelpCompletionFeature {
    constructor() {
        this.helpCompletionProvider = new HelpCompletionProvider();
        let subscriptions = [];
        vscode_1.workspace.onDidChangeTextDocument(this.onEvent, this, subscriptions);
        this.disposable = vscode_1.Disposable.from(...subscriptions);
    }
    setLanguageClient(languageClient) {
        this.languageClient = languageClient;
        this.helpCompletionProvider.languageClient = languageClient;
    }
    dispose() {
        this.disposable.dispose();
    }
    onEvent(changeEvent) {
        this.helpCompletionProvider.updateState(changeEvent.document, changeEvent.contentChanges[0].text, changeEvent.contentChanges[0].range);
        // todo raise an event when trigger is found, and attach complete() to the event.
        if (this.helpCompletionProvider.triggerFound) {
            this.helpCompletionProvider.complete().then(() => this.helpCompletionProvider.reset());
        }
    }
}
exports.HelpCompletionFeature = HelpCompletionFeature;
class TriggerFinder {
    constructor(triggerCharacters) {
        this.triggerCharacters = triggerCharacters;
        this.state = SearchState.Searching;
        this.count = 0;
    }
    get found() {
        return this.state === SearchState.Found;
    }
    updateState(document, changeText) {
        switch (this.state) {
            case SearchState.Searching:
                if (changeText.length === 1 && changeText[0] === this.triggerCharacters[this.count]) {
                    this.state = SearchState.Locked;
                    this.document = document;
                    this.count++;
                }
                break;
            case SearchState.Locked:
                if (changeText.length === 1 && changeText[0] === this.triggerCharacters[this.count] && document === this.document) {
                    this.count++;
                    if (this.count === this.triggerCharacters.length) {
                        this.state = SearchState.Found;
                    }
                }
                else {
                    this.reset();
                }
                break;
            default:
                this.reset();
                break;
        }
    }
    reset() {
        this.state = SearchState.Searching;
        this.count = 0;
    }
}
class HelpCompletionProvider {
    constructor() {
        this.triggerFinderBlockComment = new TriggerFinder("<#");
        this.triggerFinderLineComment = new TriggerFinder("##");
    }
    get triggerFound() {
        return this.triggerFinderBlockComment.found || this.triggerFinderLineComment.found;
    }
    set languageClient(value) {
        this.langClient = value;
    }
    updateState(document, changeText, changeRange) {
        this.lastDocument = document;
        this.lastChangeText = changeText;
        this.lastChangeRange = changeRange;
        this.triggerFinderBlockComment.updateState(document, changeText);
        this.triggerFinderLineComment.updateState(document, changeText);
    }
    reset() {
        this.triggerFinderBlockComment.reset();
        this.triggerFinderLineComment.reset();
    }
    complete() {
        if (this.langClient === undefined) {
            return;
        }
        let change = this.lastChangeText;
        let triggerStartPos = this.lastChangeRange.start;
        let triggerEndPos = this.lastChangeRange.end;
        let doc = this.lastDocument;
        return this.langClient.sendRequest(CommentHelpRequest.type, {
            documentUri: doc.uri.toString(),
            triggerPosition: triggerStartPos,
            blockComment: this.triggerFinderBlockComment.found
        }).then(result => {
            if (result === undefined) {
                return;
            }
            let content = result.content;
            if (content === undefined) {
                return;
            }
            // todo add indentation level to the help content
            let editor = vscode_1.window.activeTextEditor;
            let replaceRange = new vscode_1.Range(triggerStartPos.translate(0, -1), triggerStartPos.translate(0, 1));
            // Trim the leading whitespace (used by the rule for indentation) as VSCode takes care of the indentation.
            // Trim the last empty line and join the strings.
            let text = content.map(x => x.trimLeft()).slice(0, -1).join(this.getEOL(doc.eol));
            editor.insertSnippet(new vscode_1.SnippetString(text), replaceRange);
        });
    }
    getEOL(eol) {
        // there are only two type of EndOfLine types.
        if (eol === vscode_1.EndOfLine.CRLF) {
            return "\r\n";
        }
        return "\n";
    }
}
//# sourceMappingURL=HelpCompletion.js.map