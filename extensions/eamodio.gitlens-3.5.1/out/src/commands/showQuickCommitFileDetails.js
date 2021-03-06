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
const vscode_1 = require("vscode");
const common_1 = require("./common");
const gitService_1 = require("../gitService");
const logger_1 = require("../logger");
const quickPicks_1 = require("../quickPicks");
const path = require("path");
class ShowQuickCommitFileDetailsCommand extends common_1.ActiveEditorCachedCommand {
    constructor(git) {
        super(common_1.Commands.ShowQuickCommitFileDetails);
        this.git = git;
    }
    execute(editor, uri, args = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            uri = common_1.getCommandUri(uri, editor);
            if (uri === undefined)
                return undefined;
            let workingFileName = args.commit && args.commit.workingFileName;
            const gitUri = yield gitService_1.GitUri.fromUri(uri, this.git);
            if (args.sha === undefined) {
                if (editor === undefined)
                    return undefined;
                const blameline = editor.selection.active.line - gitUri.offset;
                if (blameline < 0)
                    return undefined;
                try {
                    const blame = yield this.git.getBlameForLine(gitUri, blameline);
                    if (blame === undefined)
                        return vscode_1.window.showWarningMessage(`Unable to show commit file details. File is probably not under source control`);
                    args.sha = blame.commit.isUncommitted ? blame.commit.previousSha : blame.commit.sha;
                    args.commit = blame.commit;
                    workingFileName = path.relative(args.commit.repoPath, gitUri.fsPath);
                }
                catch (ex) {
                    logger_1.Logger.error(ex, 'ShowQuickCommitFileDetailsCommand', `getBlameForLine(${blameline})`);
                    return vscode_1.window.showErrorMessage(`Unable to show commit file details. See output channel for more details`);
                }
            }
            try {
                if (args.commit === undefined || args.commit.type !== 'file') {
                    if (args.commit !== undefined) {
                        workingFileName = undefined;
                    }
                    if (args.fileLog !== undefined) {
                        args.commit = args.fileLog.commits.get(args.sha);
                        if (args.commit === undefined) {
                            args.fileLog = undefined;
                        }
                    }
                    if (args.fileLog === undefined) {
                        args.commit = yield this.git.getLogCommit(args.commit ? args.commit.repoPath : gitUri.repoPath, gitUri.fsPath, args.sha, { previous: true });
                        if (args.commit === undefined)
                            return vscode_1.window.showWarningMessage(`Unable to show commit file details`);
                    }
                }
                if (args.commit === undefined)
                    return vscode_1.window.showWarningMessage(`Unable to show commit file details`);
                args.commit.workingFileName = workingFileName;
                args.commit.workingFileName = yield this.git.findWorkingFileName(args.commit);
                const shortSha = args.sha.substring(0, 8);
                if (args.goBackCommand === undefined) {
                    args.goBackCommand = new quickPicks_1.CommandQuickPickItem({
                        label: `go back \u21A9`,
                        description: `\u00a0 \u2014 \u00a0\u00a0 to details of \u00a0$(git-commit) ${shortSha}`
                    }, common_1.Commands.ShowQuickCommitDetails, [
                        new gitService_1.GitUri(args.commit.uri, args.commit),
                        {
                            commit: args.commit,
                            sha: args.sha
                        }
                    ]);
                }
                const currentCommand = new quickPicks_1.CommandQuickPickItem({
                    label: `go back \u21A9`,
                    description: `\u00a0 \u2014 \u00a0\u00a0 to details of \u00a0$(file-text) ${path.basename(args.commit.fileName)} in \u00a0$(git-commit) ${shortSha}`
                }, common_1.Commands.ShowQuickCommitFileDetails, [
                    new gitService_1.GitUri(args.commit.uri, args.commit),
                    args
                ]);
                const pick = yield quickPicks_1.CommitFileDetailsQuickPick.show(this.git, args.commit, uri, args.goBackCommand, currentCommand, args.fileLog);
                if (pick === undefined)
                    return undefined;
                if (pick instanceof quickPicks_1.CommandQuickPickItem)
                    return pick.execute();
                return undefined;
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'ShowQuickCommitFileDetailsCommand');
                return vscode_1.window.showErrorMessage(`Unable to show commit file details. See output channel for more details`);
            }
        });
    }
}
exports.ShowQuickCommitFileDetailsCommand = ShowQuickCommitFileDetailsCommand;
//# sourceMappingURL=showQuickCommitFileDetails.js.map