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
const system_1 = require("../system");
const vscode_1 = require("vscode");
const commands_1 = require("../commands");
const common_1 = require("./common");
const gitService_1 = require("../gitService");
const remotes_1 = require("./remotes");
const moment = require("moment");
const path = require("path");
class CommitWithFileStatusQuickPickItem extends common_1.OpenFileCommandQuickPickItem {
    constructor(commit, status) {
        const icon = gitService_1.getGitStatusIcon(status.status);
        let directory = gitService_1.GitService.normalizePath(path.dirname(status.fileName));
        if (!directory || directory === '.') {
            directory = '';
        }
        const description = (status.status === 'R' && status.originalFileName)
            ? `${directory} \u00a0\u2190\u00a0 ${status.originalFileName}`
            : directory;
        let sha;
        let shortSha;
        if (status.status === 'D') {
            sha = commit.previousSha;
            shortSha = commit.previousShortSha;
        }
        else {
            sha = commit.sha;
            shortSha = commit.shortSha;
        }
        super(gitService_1.GitService.toGitContentUri(sha, shortSha, status.fileName, commit.repoPath, status.originalFileName), {
            label: `\u00a0\u00a0\u00a0\u00a0${icon}\u00a0\u00a0 ${path.basename(status.fileName)}`,
            description: description
        });
        this.commit = commit;
        this.fileName = status.fileName;
        this.gitUri = gitService_1.GitUri.fromFileStatus(status, {
            fileName: status.fileName,
            repoPath: commit.repoPath,
            sha: commit.sha,
            originalFileName: status.originalFileName
        });
        this.sha = sha;
        this.shortSha = shortSha;
        this.status = status.status;
    }
    onDidPressKey(key) {
        if (this.commit.previousSha === undefined)
            return super.onDidPressKey(key);
        return vscode_1.commands.executeCommand(commands_1.Commands.DiffWithPrevious, this.gitUri, {
            commit: this.commit,
            showOptions: {
                preserveFocus: true,
                preview: false
            }
        });
    }
}
exports.CommitWithFileStatusQuickPickItem = CommitWithFileStatusQuickPickItem;
class OpenCommitFilesCommandQuickPickItem extends common_1.OpenFilesCommandQuickPickItem {
    constructor(commit, item) {
        const uris = commit.fileStatuses.map(s => (s.status === 'D')
            ? gitService_1.GitService.toGitContentUri(commit.previousSha, commit.previousShortSha, s.fileName, commit.repoPath, s.originalFileName)
            : gitService_1.GitService.toGitContentUri(commit.sha, commit.shortSha, s.fileName, commit.repoPath, s.originalFileName));
        super(uris, item || {
            label: `$(file-symlink-file) Open Changed Files`,
            description: `\u00a0 \u2014 \u00a0\u00a0 in \u00a0$(git-commit) ${commit.shortSha}`
        });
    }
}
exports.OpenCommitFilesCommandQuickPickItem = OpenCommitFilesCommandQuickPickItem;
class OpenCommitWorkingTreeFilesCommandQuickPickItem extends common_1.OpenFilesCommandQuickPickItem {
    constructor(commit, versioned = false, item) {
        const repoPath = commit.repoPath;
        const uris = commit.fileStatuses.filter(_ => _.status !== 'D').map(_ => gitService_1.GitUri.fromFileStatus(_, repoPath));
        super(uris, item || {
            label: `$(file-symlink-file) Open Changed Working Files`,
            description: ''
        });
    }
}
exports.OpenCommitWorkingTreeFilesCommandQuickPickItem = OpenCommitWorkingTreeFilesCommandQuickPickItem;
class CommitDetailsQuickPick {
    static show(git, commit, uri, goBackCommand, currentCommand, repoLog) {
        return __awaiter(this, void 0, void 0, function* () {
            const items = commit.fileStatuses.map(fs => new CommitWithFileStatusQuickPickItem(commit, fs));
            const stash = commit.type === 'stash';
            let index = 0;
            if (stash) {
                items.splice(index++, 0, new common_1.CommandQuickPickItem({
                    label: `$(git-pull-request) Apply Stashed Changes`,
                    description: `\u00a0 \u2014 \u00a0\u00a0 ${commit.message}`
                }, commands_1.Commands.StashApply, [
                    {
                        confirm: true,
                        deleteAfter: false,
                        stashItem: commit,
                        goBackCommand: currentCommand
                    }
                ]));
                items.splice(index++, 0, new common_1.CommandQuickPickItem({
                    label: `$(x) Delete Stashed Changes`,
                    description: `\u00a0 \u2014 \u00a0\u00a0 ${commit.message}`
                }, commands_1.Commands.StashDelete, [
                    {
                        confirm: true,
                        stashItem: commit,
                        goBackCommand: currentCommand
                    }
                ]));
            }
            if (!stash) {
                items.splice(index++, 0, new common_1.CommandQuickPickItem({
                    label: `$(clippy) Copy Commit ID to Clipboard`,
                    description: `\u00a0 \u2014 \u00a0\u00a0 ${commit.shortSha}`
                }, commands_1.Commands.CopyShaToClipboard, [
                    uri,
                    {
                        sha: commit.sha
                    }
                ]));
            }
            items.splice(index++, 0, new common_1.CommandQuickPickItem({
                label: `$(clippy) Copy Message to Clipboard`,
                description: `\u00a0 \u2014 \u00a0\u00a0 ${commit.message}`
            }, commands_1.Commands.CopyMessageToClipboard, [
                uri,
                {
                    message: commit.message,
                    sha: commit.sha
                }
            ]));
            if (!stash) {
                const remotes = system_1.Arrays.uniqueBy(yield git.getRemotes(commit.repoPath), _ => _.url, _ => !!_.provider);
                if (remotes.length) {
                    items.splice(index++, 0, new remotes_1.OpenRemotesCommandQuickPickItem(remotes, {
                        type: 'commit',
                        sha: commit.sha
                    }, currentCommand));
                }
                items.splice(index++, 0, new common_1.CommandQuickPickItem({
                    label: `$(git-compare) Directory Compare with Previous Commit`,
                    description: `\u00a0 \u2014 \u00a0\u00a0 $(git-commit) ${commit.previousShortSha || `${commit.shortSha}^`} \u00a0 $(git-compare) \u00a0 $(git-commit) ${commit.shortSha}`
                }, commands_1.Commands.DiffDirectory, [
                    commit.uri,
                    {
                        shaOrBranch1: commit.previousSha || `${commit.sha}^`,
                        shaOrBranch2: commit.sha
                    }
                ]));
            }
            items.splice(index++, 0, new common_1.CommandQuickPickItem({
                label: `$(git-compare) Directory Compare with Working Tree`,
                description: `\u00a0 \u2014 \u00a0\u00a0 $(git-commit) ${commit.shortSha} \u00a0 $(git-compare) \u00a0 $(file-directory) Working Tree`
            }, commands_1.Commands.DiffDirectory, [
                uri,
                {
                    shaOrBranch1: commit.sha
                }
            ]));
            items.splice(index++, 0, new common_1.CommandQuickPickItem({
                label: `Changed Files`,
                description: commit.getDiffStatus()
            }, commands_1.Commands.ShowQuickCommitDetails, [
                uri,
                {
                    commit,
                    repoLog,
                    sha: commit.sha,
                    goBackCommand
                }
            ]));
            items.push(new OpenCommitFilesCommandQuickPickItem(commit));
            items.push(new OpenCommitWorkingTreeFilesCommandQuickPickItem(commit));
            if (goBackCommand) {
                items.splice(0, 0, goBackCommand);
            }
            let previousCommand = undefined;
            let nextCommand = undefined;
            if (!stash) {
                if (repoLog !== undefined && !repoLog.truncated && repoLog.sha === undefined) {
                    previousCommand = commit.previousSha === undefined
                        ? undefined
                        : new common_1.KeyCommandQuickPickItem(commands_1.Commands.ShowQuickCommitDetails, [
                            commit.previousUri,
                            {
                                repoLog,
                                sha: commit.previousSha,
                                goBackCommand
                            }
                        ]);
                    nextCommand = commit.nextSha === undefined
                        ? undefined
                        : new common_1.KeyCommandQuickPickItem(commands_1.Commands.ShowQuickCommitDetails, [
                            commit.nextUri,
                            {
                                repoLog,
                                sha: commit.nextSha,
                                goBackCommand
                            }
                        ]);
                }
                else {
                    previousCommand = () => __awaiter(this, void 0, void 0, function* () {
                        let log = repoLog;
                        let c = log && log.commits.get(commit.sha);
                        if (c === undefined || c.previousSha === undefined) {
                            log = yield git.getLogForRepo(commit.repoPath, commit.sha, git.config.advanced.maxQuickHistory);
                            c = log && log.commits.get(commit.sha);
                            if (c) {
                                c.nextSha = commit.nextSha;
                            }
                        }
                        if (c === undefined || c.previousSha === undefined)
                            return commands_1.KeyNoopCommand;
                        return new common_1.KeyCommandQuickPickItem(commands_1.Commands.ShowQuickCommitDetails, [
                            c.previousUri,
                            {
                                repoLog: log,
                                sha: c.previousSha,
                                goBackCommand
                            }
                        ]);
                    });
                    nextCommand = () => __awaiter(this, void 0, void 0, function* () {
                        let log = repoLog;
                        let c = log && log.commits.get(commit.sha);
                        if (c === undefined || c.nextSha === undefined) {
                            log = undefined;
                            c = undefined;
                            const nextLog = yield git.getLogForRepo(commit.repoPath, commit.sha, 1, true);
                            const next = nextLog && system_1.Iterables.first(nextLog.commits.values());
                            if (next !== undefined && next.sha !== commit.sha) {
                                c = commit;
                                c.nextSha = next.sha;
                            }
                        }
                        if (c === undefined || c.nextSha === undefined)
                            return commands_1.KeyNoopCommand;
                        return new common_1.KeyCommandQuickPickItem(commands_1.Commands.ShowQuickCommitDetails, [
                            c.nextUri,
                            {
                                repoLog: log,
                                sha: c.nextSha,
                                goBackCommand
                            }
                        ]);
                    });
                }
            }
            const scope = yield commands_1.Keyboard.instance.beginScope({
                left: goBackCommand,
                ',': previousCommand,
                '.': nextCommand
            });
            const pick = yield vscode_1.window.showQuickPick(items, {
                matchOnDescription: true,
                matchOnDetail: true,
                placeHolder: `${commit.shortSha} \u00a0\u2022\u00a0 ${commit.author ? `${commit.author}, ` : ''}${moment(commit.date).fromNow()} \u00a0\u2022\u00a0 ${commit.message}`,
                ignoreFocusOut: common_1.getQuickPickIgnoreFocusOut(),
                onDidSelectItem: (item) => {
                    scope.setKeyCommand('right', item);
                    if (typeof item.onDidSelect === 'function') {
                        item.onDidSelect();
                    }
                }
            });
            yield scope.dispose();
            return pick;
        });
    }
}
exports.CommitDetailsQuickPick = CommitDetailsQuickPick;
//# sourceMappingURL=commitDetails.js.map