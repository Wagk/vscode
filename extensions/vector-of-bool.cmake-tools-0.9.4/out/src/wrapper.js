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
const legacy = require('./legacy');
const client = require('./client');
const util = require('./util');
const config_1 = require('./config');
class CMakeToolsWrapper {
    constructor(_ctx) {
        this._ctx = _ctx;
        this._reconfiguredEmitter = new vscode.EventEmitter();
        this.reconfigured = this._reconfiguredEmitter.event;
    }
    dispose() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.shutdown();
            this._reconfiguredEmitter.dispose();
        });
    }
    _sourceDir() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).sourceDir;
        });
    }
    get sourceDir() {
        return this._sourceDir();
    }
    _mainListFile() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).mainListFile;
        });
    }
    get mainListFile() {
        return this._mainListFile();
    }
    _binaryDir() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).binaryDir;
        });
    }
    get binaryDir() {
        return this._binaryDir();
    }
    _cachePath() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).cachePath;
        });
    }
    get cachePath() {
        return this._cachePath();
    }
    _executableTargets() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).executableTargets;
        });
    }
    get executableTargets() {
        return this._executableTargets();
    }
    _diagnostics() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).diagnostics;
        });
    }
    get diagnostics() {
        return this._diagnostics();
    }
    _targets() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).targets;
        });
    }
    get targets() {
        return this._targets();
    }
    executeCMakeCommand(args, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).executeCMakeCommand(args, options);
        });
    }
    execute(program, args, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).execute(program, args, options);
        });
    }
    compilationInfoForFile(filepath) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).compilationInfoForFile(filepath);
        });
    }
    configure(extraArgs, runPrebuild) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).configure(extraArgs, runPrebuild);
        });
    }
    build(target) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).build(target);
        });
    }
    install() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).install();
        });
    }
    jumpToCacheFile() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).jumpToCacheFile();
        });
    }
    clean() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).clean();
        });
    }
    cleanConfigure() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).cleanConfigure();
        });
    }
    cleanRebuild() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).cleanRebuild();
        });
    }
    buildWithTarget() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).buildWithTarget();
        });
    }
    setDefaultTarget() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).setDefaultTarget();
        });
    }
    setBuildType() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).setBuildType();
        });
    }
    ctest() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).ctest();
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).stop();
        });
    }
    quickStart() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).quickStart();
        });
    }
    debugTarget() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).debugTarget();
        });
    }
    debugTargetProgramPath() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).debugTargetProgramPath();
        });
    }
    selectDebugTarget() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).selectDebugTarget();
        });
    }
    selectEnvironments() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).selectEnvironments();
        });
    }
    setActiveVariantCombination(settings) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).setActiveVariantCombination(settings);
        });
    }
    toggleCoverageDecorations() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._impl).toggleCoverageDecorations();
        });
    }
    _setupEvents() {
        return __awaiter(this, void 0, void 0, function* () {
            const cmt = yield this._impl;
            cmt.reconfigured(this._reconfiguredEmitter.fire);
        });
    }
    reload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.shutdown();
            if (config_1.config.experimental_useCMakeServer) {
                const cmpath = config_1.config.cmakePath;
                const version_ex = yield util.execute(config_1.config.cmakePath, ['--version']).onComplete;
                console.assert(version_ex.stdout);
                const version_re = /cmake version (.*?)\r?\n/;
                const version = util.parseVersion(version_re.exec(version_ex.stdout)[1]);
                // We purposefully exclude versions <3.7.1, which have some major CMake
                // server bugs
                if (util.versionGreater(version, '3.7.1')) {
                    this._impl = client.ServerClientCMakeTools.startup(this._ctx);
                    yield this._impl;
                    yield this._setupEvents();
                    return this;
                }
                vscode.window.showWarningMessage('CMake Server is not available with the current CMake executable. Please upgrade to CMake 3.7.2 or newer first.');
            }
            // Fall back to use the legacy plugin
            const cmt = new legacy.CMakeTools(this._ctx);
            this._impl = cmt.initFinished;
            yield this._impl;
            yield this._setupEvents();
            return this;
        });
    }
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            const impl = yield this._impl;
            if (impl instanceof client.ServerClientCMakeTools) {
                yield impl.dangerousShutdownClient();
            }
            if (impl) {
                impl.dispose();
            }
        });
    }
    static startup(ct) {
        const cmt = new CMakeToolsWrapper(ct);
        return cmt.reload();
    }
}
exports.CMakeToolsWrapper = CMakeToolsWrapper;
;
//# sourceMappingURL=wrapper.js.map