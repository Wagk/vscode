'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionId = 'gitlens';
exports.ExtensionKey = exports.ExtensionId;
exports.ExtensionOutputChannelName = 'GitLens';
exports.QualifiedExtensionId = `eamodio.${exports.ExtensionId}`;
exports.ApplicationInsightsKey = 'a9c302f8-6483-4d01-b92c-c159c799c679';
exports.BuiltInCommands = {
    CloseActiveEditor: 'workbench.action.closeActiveEditor',
    CursorMove: 'cursorMove',
    Diff: 'vscode.diff',
    EditorScroll: 'editorScroll',
    ExecuteDocumentSymbolProvider: 'vscode.executeDocumentSymbolProvider',
    ExecuteCodeLensProvider: 'vscode.executeCodeLensProvider',
    Open: 'vscode.open',
    NextEditor: 'workbench.action.nextEditor',
    PreviewHtml: 'vscode.previewHtml',
    RevealLine: 'revealLine',
    SetContext: 'setContext',
    ShowReferences: 'editor.action.showReferences',
    ToggleRenderWhitespace: 'editor.action.toggleRenderWhitespace'
};
exports.DocumentSchemes = {
    File: 'file',
    Git: 'git',
    GitLensGit: 'gitlens-git'
};
exports.WorkspaceState = {
    GitLensVersion: 'gitlensVersion',
    SuppressGitVersionWarning: 'suppressGitVersionWarning',
    SuppressUpdateNotice: 'suppressUpdateNotice'
};
//# sourceMappingURL=constants.js.map