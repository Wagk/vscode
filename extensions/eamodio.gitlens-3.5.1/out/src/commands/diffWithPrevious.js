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
const common_1 = require("./common");
const constants_1 = require("../constants");
const gitService_1 = require("../gitService");
const logger_1 = require("../logger");
const moment = require("moment");
const path = require("path");
class DiffWithPreviousCommand extends common_1.ActiveEditorCommand {
    constructor(git) {
        super(common_1.Commands.DiffWithPrevious);
        this.git = git;
    }
    execute(editor, uri, args = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            uri = common_1.getCommandUri(uri, editor);
            if (uri === undefined)
                return undefined;
            args.line = args.line || (editor === undefined ? 0 : editor.selection.active.line);
            if (args.commit === undefined || (args.commit.type !== 'file') || args.range !== undefined) {
                const gitUri = yield gitService_1.GitUri.fromUri(uri, this.git);
                try {
                    if (gitUri.sha === undefined && (yield this.git.isFileUncommitted(gitUri))) {
                        return vscode_1.commands.executeCommand(common_1.Commands.DiffWithWorking, uri, { showOptions: args.showOptions });
                    }
                    const sha = args.commit === undefined ? gitUri.sha : args.commit.sha;
                    const log = yield this.git.getLogForFile(gitUri.repoPath, gitUri.fsPath, undefined, sha ? undefined : 2, args.range);
                    if (log === undefined)
                        return vscode_1.window.showWarningMessage(`Unable to open compare. File is probably not under source control`);
                    args.commit = (sha && log.commits.get(sha)) || system_1.Iterables.first(log.commits.values());
                }
                catch (ex) {
                    logger_1.Logger.error(ex, 'DiffWithPreviousCommand', `getLogForFile(${gitUri.repoPath}, ${gitUri.fsPath})`);
                    return vscode_1.window.showErrorMessage(`Unable to open compare. See output channel for more details`);
                }
            }
            if (args.commit.previousSha === undefined)
                return vscode_1.window.showInformationMessage(`Commit ${args.commit.shortSha} (${args.commit.author}, ${moment(args.commit.date).fromNow()}) has no previous commit`);
            try {
                const [rhs, lhs] = yield Promise.all([
                    this.git.getVersionedFile(args.commit.repoPath, args.commit.uri.fsPath, args.commit.sha),
                    this.git.getVersionedFile(args.commit.repoPath, args.commit.previousUri.fsPath, args.commit.previousSha)
                ]);
                yield vscode_1.commands.executeCommand(constants_1.BuiltInCommands.Diff, vscode_1.Uri.file(lhs), vscode_1.Uri.file(rhs), `${path.basename(args.commit.previousUri.fsPath)} (${args.commit.previousShortSha}) \u2194 ${path.basename(args.commit.uri.fsPath)} (${args.commit.shortSha})`, args.showOptions);
                return yield vscode_1.commands.executeCommand(constants_1.BuiltInCommands.RevealLine, { lineNumber: args.line, at: 'center' });
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'DiffWithPreviousCommand', 'getVersionedFile');
                return vscode_1.window.showErrorMessage(`Unable to open compare. See output channel for more details`);
            }
        });
    }
}
exports.DiffWithPreviousCommand = DiffWithPreviousCommand;
//# sourceMappingURL=diffWithPrevious.js.map