"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const proc = require('child_process');
const net = require('net');
const path = require('path');
const vscode = require('vscode');
const async = require('./async');
const cache = require('./cache');
const config_1 = require('./config');
const util = require('./util');
const MESSAGE_WRAPPER_RE = /\[== "CMake Server" ==\[([^]*?)\]== "CMake Server" ==\]\s*([^]*)/;
class StartupError extends global.Error {
    constructor(retc) {
        super('Error starting up cmake-server');
        this.retc = retc;
    }
}
exports.StartupError = StartupError;
class ServerError extends global.Error {
    constructor(e, errorMessage = e.errorMessage, cookie = e.cookie, inReplyTo = e.inReplyTo) {
        super(e.errorMessage);
        this.errorMessage = errorMessage;
        this.cookie = cookie;
        this.inReplyTo = inReplyTo;
    }
}
exports.ServerError = ServerError;
class CMakeServerClient {
    constructor(params) {
        this._accInput = '';
        this._promisesResolvers = new Map;
        this._params = params;
        let pipe_file = path.join(params.tmpdir, '.cmserver-pipe');
        if (process.platform == 'win32') {
            pipe_file = '\\\\?\\pipe\\' + pipe_file;
        }
        else {
            pipe_file = path.join(params.binaryDir, `.cmserver.${process.pid}`);
        }
        const child = this._proc = proc.spawn(params.cmakePath, ['-E', 'server', '--experimental', `--pipe=${pipe_file}`], {
            env: params.environment,
        });
        child.stderr.on('data', (dat) => {
            console.error('Error from cmake-server process:', dat.toString());
        });
        console.log('Started new CMake Server instance with PID', child.pid);
        setTimeout(() => {
            const end_promise = new Promise(resolve => {
                const pipe = this._pipe = net.createConnection(pipe_file);
                pipe.on('data', this._onMoreData.bind(this));
                pipe.on('error', (e) => {
                    debugger;
                    pipe.end();
                });
                pipe.on('end', () => {
                    pipe.end();
                    resolve();
                });
            });
            const exit_promise = new Promise(resolve => {
                child.on('exit', () => {
                    resolve();
                });
            });
            this._endPromise = Promise.all([end_promise, exit_promise]);
            this._proc = child;
            child.stdout.on('data', this._onErrorData.bind(this));
            child.stderr.on('data', this._onErrorData.bind(this));
            child.on('close', (retc, signal) => {
                if (retc !== 0) {
                    console.error('The connection to cmake-server was terminated unexpectedly');
                    console.error(`cmake-server exited with status ${retc} (${signal})`);
                    params.onCrash(retc, signal).catch(e => {
                        console.error('Unhandled error in onCrash', e);
                    });
                }
            });
        }, 1000);
    }
    _onMoreData(data) {
        const str = data.toString();
        this._accInput += str;
        while (1) {
            const input = this._accInput;
            let mat = MESSAGE_WRAPPER_RE.exec(input);
            if (!mat) {
                break;
            }
            const [_all, content, tail] = mat;
            if (!_all || !content || tail === undefined) {
                debugger;
                throw new global.Error('Protocol error talking to CMake! Got this input: ' + input);
            }
            this._accInput = tail;
            const message = JSON.parse(content);
            this._onMessage(message);
        }
    }
    _dispatchProgress(m) { }
    _takePromiseForCookie(cookie) {
        const item = this._promisesResolvers.get(cookie);
        if (!item) {
            throw new global.Error('Invalid cookie: ' + cookie);
        }
        this._promisesResolvers.delete(cookie);
        return item;
    }
    _onMessage(some) {
        if ('cookie' in some) {
            const cookied = some;
            switch (some.type) {
                case 'reply': {
                    const reply = cookied;
                    this._takePromiseForCookie(cookied.cookie).resolve(reply);
                    return;
                }
                case 'error': {
                    const err = new ServerError(cookied);
                    this._takePromiseForCookie(cookied.cookie).reject(err);
                    return;
                }
                case 'progress': {
                    const prog = cookied;
                    this._params.onProgress(prog).catch(e => {
                        console.error('Unandled error in onProgress', e);
                    });
                    return;
                }
            }
        }
        switch (some.type) {
            case 'hello': {
                this._params.onHello(some).catch(e => {
                    console.error('Unhandled error in onHello', e);
                });
                return;
            }
            case 'message': {
                this._params.onMessage(some).catch(e => {
                    console.error('Unhandled error in onMessage', e);
                });
                return;
            }
            case 'signal': {
                const sig = some;
                switch (sig.name) {
                    case 'dirty': {
                        this._params.onDirty().catch(e => {
                            console.error('Unhandled error in onDirty', e);
                        });
                        return;
                    }
                    case 'fileChange': {
                        return;
                    }
                }
            }
        }
        debugger;
        console.warn(`Can't yet handle the ${some.type} messages`);
    }
    sendRequest(type, params = {}) {
        const cp = Object.assign({ type }, params);
        const cookie = cp.cookie = Math.random().toString();
        const pr = new Promise((resolve, reject) => {
            this._promisesResolvers.set(cookie, { resolve: resolve, reject: reject });
        });
        console.log(`Sending message to cmake-server: ${JSON.stringify(cp)}`);
        this._pipe.write('\n[== "CMake Server" ==[\n');
        this._pipe.write(JSON.stringify(cp));
        this._pipe.write('\n]== "CMake Server" ==]\n');
        return pr;
    }
    setGlobalSettings(params) {
        return this.sendRequest('setGlobalSettings', params);
    }
    getCMakeCacheContent() {
        return this.sendRequest('cache');
    }
    getGlobalSettings() {
        return this.sendRequest('globalSettings');
    }
    configure(params) {
        return this.sendRequest('configure', params);
    }
    compute(params) {
        return this.sendRequest('compute', params);
    }
    codemodel(params) {
        return this.sendRequest('codemodel', params);
    }
    _onErrorData(data) {
        console.error(data.toString());
    }
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            this._pipe.end();
            yield this._endPromise;
        });
    }
    static start(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let resolved = false;
            const tmpdir = path.join(vscode.workspace.rootPath, '.vscode');
            // Ensure the binary directory exists
            yield util.ensureDirectory(params.binaryDir);
            return new Promise((resolve, reject) => {
                const client = new CMakeServerClient({
                    tmpdir,
                    sourceDir: params.sourceDir,
                    binaryDir: params.binaryDir,
                    onMessage: params.onMessage,
                    cmakePath: params.cmakePath,
                    environment: params.environment,
                    onProgress: params.onProgress,
                    onDirty: params.onDirty,
                    onCrash: (retc) => __awaiter(this, void 0, void 0, function* () {
                        if (!resolved) {
                            reject(new StartupError(retc));
                        }
                    }),
                    onHello: (msg) => __awaiter(this, void 0, void 0, function* () {
                        // We've gotten the hello message. We need to commense handshake
                        try {
                            const generator = yield util.pickGenerator(config_1.config.preferredGenerators);
                            if (!generator) {
                                vscode.window.showErrorMessage('Unable to determine CMake Generator to use');
                                throw new global.Error('No generator!');
                            }
                            let src_dir = params.sourceDir;
                            // Work-around: CMake Server checks that CMAKE_HOME_DIRECTORY
                            // in the cmake cache is the same as what we provide when we
                            // set up the connection. Because CMake may normalize the
                            // path differently than we would, we should make sure that
                            // we pass the value that is specified in the cache exactly
                            // to avoid causing CMake server to spuriously fail.
                            const cache_path = path.join(params.binaryDir, 'CMakeCache.txt');
                            if (yield async.exists(cache_path)) {
                                const tmpcache = yield cache.CMakeCache.fromPath(cache_path);
                                const home = tmpcache.get('CMAKE_HOME_DIRECTORY');
                                if (home &&
                                    util.normalizePath(home.as()) ==
                                        util.normalizePath(src_dir)) {
                                    src_dir = home.as();
                                }
                            }
                            const hsparams = {
                                sourceDirectory: src_dir,
                                buildDirectory: params.binaryDir,
                                generator: generator,
                                toolset: config_1.config.toolset || undefined,
                                protocolVersion: msg.supportedProtocolVersions[0]
                            };
                            const res = yield client.sendRequest('handshake', hsparams);
                            resolved = true;
                            resolve(client);
                        }
                        catch (e) {
                            resolved = true;
                            reject(e);
                        }
                    }),
                });
            });
        });
    }
}
exports.CMakeServerClient = CMakeServerClient;
function createCooke() {
    return 'cookie-' + Math.random().toString();
}
exports.createCooke = createCooke;
//# sourceMappingURL=server-client.js.map