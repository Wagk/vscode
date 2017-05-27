'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const vscode = require('vscode');
const wrapper = require('./wrapper');
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        let cmake = null;
        try {
            cmake = yield wrapper.CMakeToolsWrapper.startup(context);
        }
        catch (e) {
            debugger;
            console.error('Error during CMake Tools initialization!', e);
        }
        if (cmake) {
            function register(name, fn) {
                fn = fn.bind(cmake);
                return vscode.commands.registerCommand(name, _ => fn());
            }
            for (const key of [
                'configure',
                'build',
                'install',
                'jumpToCacheFile',
                'clean',
                'cleanConfigure',
                'cleanRebuild',
                'buildWithTarget',
                'setDefaultTarget',
                'setBuildType',
                'ctest',
                'stop',
                'quickStart',
                'debugTargetProgramPath',
                'debugTarget',
                'selectDebugTarget',
                'selectEnvironments',
                'toggleCoverageDecorations',
            ]) {
                context.subscriptions.push(register('cmake.' + key, cmake[key]));
            }
        }
        return cmake;
    });
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map