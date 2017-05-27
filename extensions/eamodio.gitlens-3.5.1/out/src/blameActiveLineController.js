'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const system_1 = require("./system");
const vscode_1 = require("vscode");
const blameAnnotationFormatter_1 = require("./blameAnnotationFormatter");
const comparers_1 = require("./comparers");
const configuration_1 = require("./configuration");
const constants_1 = require("./constants");
const gitService_1 = require("./gitService");
const moment = require("moment");
const activeLineDecoration = vscode_1.window.createTextEditorDecorationType({
    after: {
        margin: '0 0 0 4em'
    }
});
class BlameActiveLineController extends vscode_1.Disposable {
    constructor(context, git, gitContextTracker, annotationController) {
        super(() => this.dispose());
        this.git = git;
        this.gitContextTracker = gitContextTracker;
        this.annotationController = annotationController;
        this._currentLine = -1;
        this._updateBlameDebounced = system_1.Functions.debounce(this._updateBlame, 250);
        this._onConfigurationChanged();
        const subscriptions = [];
        subscriptions.push(vscode_1.workspace.onDidChangeConfiguration(this._onConfigurationChanged, this));
        subscriptions.push(git.onDidChangeGitCache(this._onGitCacheChanged, this));
        subscriptions.push(annotationController.onDidToggleBlameAnnotations(this._onBlameAnnotationToggled, this));
        this._disposable = vscode_1.Disposable.from(...subscriptions);
    }
    dispose() {
        this._editor && this._editor.setDecorations(activeLineDecoration, []);
        this._activeEditorLineDisposable && this._activeEditorLineDisposable.dispose();
        this._statusBarItem && this._statusBarItem.dispose();
        this._disposable && this._disposable.dispose();
    }
    _onConfigurationChanged() {
        const cfg = vscode_1.workspace.getConfiguration().get(constants_1.ExtensionKey);
        let changed = false;
        if (!system_1.Objects.areEquivalent(cfg.statusBar, this._config && this._config.statusBar)) {
            changed = true;
            if (cfg.statusBar.enabled) {
                const alignment = cfg.statusBar.alignment !== 'left' ? vscode_1.StatusBarAlignment.Right : vscode_1.StatusBarAlignment.Left;
                if (this._statusBarItem !== undefined && this._statusBarItem.alignment !== alignment) {
                    this._statusBarItem.dispose();
                    this._statusBarItem = undefined;
                }
                this._statusBarItem = this._statusBarItem || vscode_1.window.createStatusBarItem(alignment, alignment === vscode_1.StatusBarAlignment.Right ? 1000 : 0);
                this._statusBarItem.command = cfg.statusBar.command;
            }
            else if (!cfg.statusBar.enabled && this._statusBarItem) {
                this._statusBarItem.dispose();
                this._statusBarItem = undefined;
            }
        }
        if (!system_1.Objects.areEquivalent(cfg.blame.annotation.activeLine, this._config && this._config.blame.annotation.activeLine)) {
            changed = true;
            if (cfg.blame.annotation.activeLine !== 'off' && this._editor) {
                this._editor.setDecorations(activeLineDecoration, []);
            }
        }
        if (!system_1.Objects.areEquivalent(cfg.blame.annotation.activeLineDarkColor, this._config && this._config.blame.annotation.activeLineDarkColor) ||
            !system_1.Objects.areEquivalent(cfg.blame.annotation.activeLineLightColor, this._config && this._config.blame.annotation.activeLineLightColor)) {
            changed = true;
        }
        this._config = cfg;
        if (!changed)
            return;
        const trackActiveLine = cfg.statusBar.enabled || cfg.blame.annotation.activeLine !== 'off';
        if (trackActiveLine && !this._activeEditorLineDisposable) {
            const subscriptions = [];
            subscriptions.push(vscode_1.window.onDidChangeActiveTextEditor(this._onActiveTextEditorChanged, this));
            subscriptions.push(vscode_1.window.onDidChangeTextEditorSelection(this._onTextEditorSelectionChanged, this));
            subscriptions.push(this.gitContextTracker.onDidBlameabilityChange(this._onBlameabilityChanged, this));
            this._activeEditorLineDisposable = vscode_1.Disposable.from(...subscriptions);
        }
        else if (!trackActiveLine && this._activeEditorLineDisposable) {
            this._activeEditorLineDisposable.dispose();
            this._activeEditorLineDisposable = undefined;
        }
        this._onActiveTextEditorChanged(vscode_1.window.activeTextEditor);
    }
    isEditorBlameable(editor) {
        if (editor === undefined || editor.document === undefined)
            return false;
        if (!this.git.isTrackable(editor.document.uri))
            return false;
        if (editor.document.isUntitled && editor.document.uri.scheme === constants_1.DocumentSchemes.File)
            return false;
        return this.git.isEditorBlameable(editor);
    }
    _onActiveTextEditorChanged(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            this._currentLine = -1;
            const previousEditor = this._editor;
            previousEditor && previousEditor.setDecorations(activeLineDecoration, []);
            if (editor === undefined || !this.isEditorBlameable(editor)) {
                this.clear(editor);
                this._editor = undefined;
                return;
            }
            this._blameable = editor !== undefined && editor.document !== undefined && !editor.document.isDirty;
            this._editor = editor;
            this._uri = yield gitService_1.GitUri.fromUri(editor.document.uri, this.git);
            const maxLines = this._config.advanced.caching.statusBar.maxLines;
            if (this._config.advanced.caching.enabled && (maxLines <= 0 || editor.document.lineCount <= maxLines)) {
                this.git.getBlameForFile(this._uri);
            }
            this._updateBlameDebounced(editor.selection.active.line, editor);
        });
    }
    _onBlameabilityChanged(e) {
        this._blameable = e.blameable;
        if (!e.blameable || !this._editor) {
            this.clear(e.editor);
            return;
        }
        if (!comparers_1.TextEditorComparer.equals(this._editor, e.editor))
            return;
        this._updateBlameDebounced(this._editor.selection.active.line, this._editor);
    }
    _onBlameAnnotationToggled() {
        this._onActiveTextEditorChanged(vscode_1.window.activeTextEditor);
    }
    _onGitCacheChanged() {
        this._onActiveTextEditorChanged(vscode_1.window.activeTextEditor);
    }
    _onTextEditorSelectionChanged(e) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._blameable || !comparers_1.TextEditorComparer.equals(this._editor, e.textEditor))
                return;
            const line = e.selections[0].active.line;
            if (line === this._currentLine)
                return;
            this._currentLine = line;
            if (!this._uri && e.textEditor) {
                this._uri = yield gitService_1.GitUri.fromUri(e.textEditor.document.uri, this.git);
            }
            this._updateBlameDebounced(line, e.textEditor);
        });
    }
    _updateBlame(line, editor) {
        return __awaiter(this, void 0, void 0, function* () {
            line = line - this._uri.offset;
            let commit = undefined;
            let commitLine = undefined;
            if (this._blameable && line >= 0) {
                const blameLine = yield this.git.getBlameForLine(this._uri, line);
                commitLine = blameLine === undefined ? undefined : blameLine.line;
                commit = blameLine === undefined ? undefined : blameLine.commit;
            }
            if (commit !== undefined && commitLine !== undefined) {
                this.show(commit, commitLine, editor);
            }
            else {
                this.clear(editor);
            }
        });
    }
    clear(editor, previousEditor) {
        editor && editor.setDecorations(activeLineDecoration, []);
        if (editor) {
            setTimeout(() => editor.setDecorations(activeLineDecoration, []), 1);
        }
        this._statusBarItem && this._statusBarItem.hide();
    }
    show(commit, blameLine, editor) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!editor.document)
                return;
            if (this._config.statusBar.enabled && this._statusBarItem !== undefined) {
                switch (this._config.statusBar.date) {
                    case 'off':
                        this._statusBarItem.text = `$(git-commit) ${commit.author}`;
                        break;
                    case 'absolute':
                        const dateFormat = this._config.statusBar.dateFormat || 'MMMM Do, YYYY h:MMa';
                        let date;
                        try {
                            date = moment(commit.date).format(dateFormat);
                        }
                        catch (ex) {
                            date = moment(commit.date).format('MMMM Do, YYYY h:MMa');
                        }
                        this._statusBarItem.text = `$(git-commit) ${commit.author}, ${date}`;
                        break;
                    default:
                        this._statusBarItem.text = `$(git-commit) ${commit.author}, ${moment(commit.date).fromNow()}`;
                        break;
                }
                switch (this._config.statusBar.command) {
                    case configuration_1.StatusBarCommand.BlameAnnotate:
                        this._statusBarItem.tooltip = 'Toggle Blame Annotations';
                        break;
                    case configuration_1.StatusBarCommand.ShowBlameHistory:
                        this._statusBarItem.tooltip = 'Open Blame History Explorer';
                        break;
                    case configuration_1.StatusBarCommand.ShowFileHistory:
                        this._statusBarItem.tooltip = 'Open File History Explorer';
                        break;
                    case configuration_1.StatusBarCommand.DiffWithPrevious:
                        this._statusBarItem.tooltip = 'Compare with Previous Commit';
                        break;
                    case configuration_1.StatusBarCommand.ToggleCodeLens:
                        this._statusBarItem.tooltip = 'Toggle Git CodeLens';
                        break;
                    case configuration_1.StatusBarCommand.ShowQuickCommitDetails:
                        this._statusBarItem.tooltip = 'Show Commit Details';
                        break;
                    case configuration_1.StatusBarCommand.ShowQuickCommitFileDetails:
                        this._statusBarItem.tooltip = 'Show Line Commit Details';
                        break;
                    case configuration_1.StatusBarCommand.ShowQuickFileHistory:
                        this._statusBarItem.tooltip = 'Show File History';
                        break;
                    case configuration_1.StatusBarCommand.ShowQuickCurrentBranchHistory:
                        this._statusBarItem.tooltip = 'Show Branch History';
                        break;
                }
                this._statusBarItem.show();
            }
            if (this._config.blame.annotation.activeLine !== 'off') {
                const activeLine = this._config.blame.annotation.activeLine;
                const offset = this._uri.offset;
                const cfg = {
                    annotation: {
                        sha: true,
                        author: this._config.statusBar.enabled ? false : this._config.blame.annotation.author,
                        date: this._config.statusBar.enabled ? 'off' : this._config.blame.annotation.date,
                        message: true
                    }
                };
                const annotation = blameAnnotationFormatter_1.BlameAnnotationFormatter.getAnnotation(cfg, commit, blameAnnotationFormatter_1.BlameAnnotationFormat.Unconstrained);
                let logCommit = undefined;
                if (!commit.isUncommitted) {
                    logCommit = yield this.git.getLogCommit(this._uri.repoPath, this._uri.fsPath, commit.sha);
                }
                if (!editor.document)
                    return;
                let hoverMessage = undefined;
                if (activeLine !== 'inline') {
                    const possibleDuplicate = !logCommit || logCommit.message === commit.message;
                    if (!commit.isUncommitted && (!possibleDuplicate || !this.annotationController.isAnnotating(editor))) {
                        hoverMessage = blameAnnotationFormatter_1.BlameAnnotationFormatter.getAnnotationHover(cfg, blameLine, logCommit || commit);
                    }
                    else if (commit.isUncommitted) {
                        const changes = yield this.git.getDiffForLine(this._uri, blameLine.line + offset);
                        if (changes !== undefined) {
                            let original = changes[0];
                            if (original !== undefined) {
                                original = original.replace(/\n/g, '\`\n>\n> \`').trim();
                                hoverMessage = `\`${'0'.repeat(8)}\` &nbsp; __Uncommitted change__\n\n\---\n\`\`\`\n${original}\n\`\`\``;
                            }
                        }
                    }
                }
                let decorationOptions = undefined;
                switch (activeLine) {
                    case 'both':
                    case 'inline':
                        const range = editor.document.validateRange(new vscode_1.Range(blameLine.line + offset, 0, blameLine.line + offset, 1000000));
                        decorationOptions = [
                            {
                                range: range.with({
                                    start: range.start.with({
                                        character: range.end.character
                                    })
                                }),
                                hoverMessage: hoverMessage,
                                renderOptions: {
                                    after: {
                                        contentText: annotation
                                    },
                                    dark: {
                                        after: {
                                            color: this._config.blame.annotation.activeLineDarkColor || 'rgba(153, 153, 153, 0.35)'
                                        }
                                    },
                                    light: {
                                        after: {
                                            color: this._config.blame.annotation.activeLineLightColor || 'rgba(153, 153, 153, 0.35)'
                                        }
                                    }
                                }
                            }
                        ];
                        if (activeLine === 'both') {
                            decorationOptions.push({
                                range: range.with({
                                    end: range.end.with({
                                        character: editor.document.lineAt(range.end.line).firstNonWhitespaceCharacterIndex
                                    })
                                }),
                                hoverMessage: hoverMessage
                            });
                        }
                        break;
                    case 'hover':
                        decorationOptions = [
                            {
                                range: editor.document.validateRange(new vscode_1.Range(blameLine.line + offset, 0, blameLine.line + offset, 1000000)),
                                hoverMessage: hoverMessage
                            }
                        ];
                        break;
                }
                if (decorationOptions !== undefined) {
                    editor.setDecorations(activeLineDecoration, decorationOptions);
                }
            }
        });
    }
}
exports.BlameActiveLineController = BlameActiveLineController;
//# sourceMappingURL=blameActiveLineController.js.map