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
class ShowQuickStashListCommand extends common_1.ActiveEditorCachedCommand {
    constructor(git) {
        super(common_1.Commands.ShowQuickStashList);
        this.git = git;
    }
    execute(editor, uri, args = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            uri = common_1.getCommandUri(uri, editor);
            try {
                const repoPath = yield this.git.getRepoPathFromUri(uri);
                if (!repoPath)
                    return vscode_1.window.showWarningMessage(`Unable to show stashed changes`);
                const stash = yield this.git.getStashList(repoPath);
                if (stash === undefined)
                    return vscode_1.window.showWarningMessage(`Unable to show stashed changes`);
                const currentCommand = new quickPicks_1.CommandQuickPickItem({
                    label: `go back \u21A9`,
                    description: `\u00a0 \u2014 \u00a0\u00a0 to stashed changes`
                }, common_1.Commands.ShowQuickStashList, [
                    uri,
                    {
                        goBackCommand: args.goBackCommand
                    }
                ]);
                const pick = yield quickPicks_1.StashListQuickPick.show(this.git, stash, 'list', args.goBackCommand, currentCommand);
                if (pick === undefined)
                    return undefined;
                if (pick instanceof quickPicks_1.CommandQuickPickItem)
                    return pick.execute();
                return vscode_1.commands.executeCommand(common_1.Commands.ShowQuickCommitDetails, new gitService_1.GitUri(pick.commit.uri, pick.commit), {
                    commit: pick.commit,
                    sha: pick.commit.sha,
                    goBackCommand: currentCommand
                });
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'ShowQuickStashListCommand');
                return vscode_1.window.showErrorMessage(`Unable to show stashed changes. See output channel for more details`);
            }
        });
    }
}
exports.ShowQuickStashListCommand = ShowQuickStashListCommand;
//# sourceMappingURL=showQuickStashList.js.map