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
const constants_1 = require("../constants");
const gitService_1 = require("../gitService");
const logger_1 = require("../logger");
const quickPicks_1 = require("../quickPicks");
const path = require("path");
class DiffWithBranchCommand extends common_1.ActiveEditorCommand {
    constructor(git) {
        super(common_1.Commands.DiffWithBranch);
        this.git = git;
    }
    execute(editor, uri, args = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            uri = common_1.getCommandUri(uri, editor);
            if (uri === undefined)
                return undefined;
            args.line = args.line || (editor === undefined ? 0 : editor.selection.active.line);
            const gitUri = yield gitService_1.GitUri.fromUri(uri, this.git);
            if (!gitUri.repoPath)
                return vscode_1.window.showWarningMessage(`Unable to open branch compare`);
            const branches = yield this.git.getBranches(gitUri.repoPath);
            const pick = yield quickPicks_1.BranchesQuickPick.show(branches, `Compare ${path.basename(gitUri.fsPath)} to \u2026`, args.goBackCommand);
            if (pick === undefined)
                return undefined;
            if (pick instanceof quickPicks_1.CommandQuickPickItem)
                return pick.execute();
            const branch = pick.branch.name;
            if (branch === undefined)
                return undefined;
            try {
                const compare = yield this.git.getVersionedFile(gitUri.repoPath, gitUri.fsPath, branch);
                yield vscode_1.commands.executeCommand(constants_1.BuiltInCommands.Diff, vscode_1.Uri.file(compare), gitUri.fileUri(), `${path.basename(gitUri.fsPath)} (${branch}) \u2194 ${path.basename(gitUri.fsPath)}`, args.showOptions);
                return yield vscode_1.commands.executeCommand(constants_1.BuiltInCommands.RevealLine, { lineNumber: args.line, at: 'center' });
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'DiffWithBranchCommand', 'getVersionedFile');
                return vscode_1.window.showErrorMessage(`Unable to open branch compare. See output channel for more details`);
            }
        });
    }
}
exports.DiffWithBranchCommand = DiffWithBranchCommand;
//# sourceMappingURL=diffWithBranch.js.map