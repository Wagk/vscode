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
const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const async = require('./async');
const config_1 = require('./config');
const util = require('./util');
const MSVC_ENVIRONMENT_VARIABLES = [
    'CL',
    '_CL_',
    'INCLUDE',
    'LIBPATH',
    'LINK',
    '_LINK_',
    'LIB',
    'PATH',
    'TMP',
    'FRAMEWORKDIR',
    'FRAMEWORKDIR64',
    'FRAMEWORKVERSION',
    'FRAMEWORKVERSION64',
    'UCRTCONTEXTROOT',
    'UCRTVERSION',
    'UNIVERSALCRTSDKDIR',
    'VCINSTALLDIR',
    'VCTARGETSPATH',
    'WINDOWSLIBPATH',
    'WINDOWSSDKDIR',
    'WINDOWSSDKLIBVERSION',
    'WINDOWSSDKVERSION',
];
// Detect Visual C++ environments
function tryCreateVCEnvironment(dist, arch) {
    return __awaiter(this, void 0, void 0, function* () {
        const name = `${dist.name} - ${arch}`;
        const mutex = 'msvc';
        const common_dir = process.env[dist.variable];
        if (!common_dir) {
            return { name, mutex };
        }
        const vcdir = path.normalize(path.join(common_dir, '../../VC'));
        const vcvarsall = path.join(vcdir, 'vcvarsall.bat');
        if (!(yield async.exists(vcvarsall))) {
            return { name, mutex };
        }
        const bat = [
            `@echo off`,
            `call "${vcvarsall}" ${arch}`,
            `if NOT ERRORLEVEL 0 exit 1`,
        ];
        for (const envvar of MSVC_ENVIRONMENT_VARIABLES) {
            bat.push(`echo ${envvar} := %${envvar}%`);
        }
        const fname = Math.random().toString() + '.bat';
        const batpath = path.join(vscode.workspace.rootPath, '.vscode', fname);
        yield util.ensureDirectory(path.dirname(batpath));
        yield util.writeFile(batpath, bat.join('\r\n'));
        const prom = new Promise((resolve, reject) => {
            const pipe = proc.spawn(batpath, [], { shell: true });
            let stdout_acc = '';
            pipe.stdout.on('data', (data) => {
                stdout_acc += data.toString();
            });
            pipe.stdout.on('close', () => {
                resolve(stdout_acc);
            });
            pipe.on('exit', (code) => {
                fs.unlink(batpath, err => {
                    if (err) {
                        console.error(`Error removing temporary batch file!`, err);
                    }
                });
                if (code) {
                    resolve(null);
                }
            });
        });
        const output = yield prom;
        if (!output) {
            console.log(`Environment detection for ${name} failed`);
            return { name, mutex };
        }
        const variables = output.split('\n')
            .map(l => l.trim())
            .filter(l => l.length != 0)
            .reduce((acc, line) => {
            const mat = /(\w+) := ?(.*)/.exec(line);
            console.assert(!!mat, line);
            acc.set(mat[1], mat[2]);
            return acc;
        }, new Map());
        return { name, mutex, variables };
    });
}
// Detect MinGW environments
function tryCreateMinGWEnvironment(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const ret = {
            name: `MinGW - ${dir}`,
            mutex: 'mingw',
            description: `Root at ${dir}`,
        };
        function prependEnv(key, ...values) {
            let env_init = process.env[key] || '';
            return values.reduce((acc, val) => {
                if (acc.length !== 0) {
                    return val + ';' + acc;
                }
                else {
                    return val;
                }
            }, env_init);
        }
        ;
        const gcc_path = path.join(dir, 'bin', 'gcc.exe');
        if (yield async.exists(gcc_path)) {
            ret.variables = new Map([
                [
                    'PATH',
                    prependEnv('PATH', path.join(dir, 'bin'), path.join(dir, 'git', 'cmd'))
                ],
                [
                    'C_INCLUDE_PATH', prependEnv('C_INCLUDE_PATH', path.join(dir, 'include'), path.join(dir, 'include', 'freetype'))
                ],
                [
                    'CXX_INCLUDE_PATH',
                    prependEnv('CXX_INCLUDE_PATH', path.join(dir, 'include'), path.join(dir, 'include', 'freetype'))
                ]
            ]);
        }
        return ret;
    });
}
const ENVIRONMENTS = [{
        getEnvironments() {
            if (process.platform !== 'win32') {
                return [];
            }
            ;
            const dists = [
                {
                    name: 'Visual C++ 12.0',
                    variable: 'VS120COMNTOOLS',
                },
                {
                    name: 'Visual C++ 14.0',
                    variable: 'VS140COMNTOOLS',
                }
            ];
            const archs = ['x86', 'amd64', 'amd64_arm'];
            const prom_vs_environments = dists.reduce((acc, dist) => {
                return acc.concat(archs.reduce((acc, arch) => {
                    const maybe_env = tryCreateVCEnvironment(dist, arch);
                    acc.push(maybe_env);
                    return acc;
                }, []));
            }, []);
            const prom_mingw_environments = config_1.config.mingwSearchDirs.map(tryCreateMinGWEnvironment);
            return prom_vs_environments.concat(prom_mingw_environments);
        }
    }];
function availableEnvironments() {
    return ENVIRONMENTS.reduce((acc, provider) => {
        return acc.concat(provider.getEnvironments());
    }, []);
}
exports.availableEnvironments = availableEnvironments;
class EnvironmentManager {
    constructor() {
        /**
         * List of availalble build environments.
         */
        this._availableEnvironments = new Map();
        this.environmentsLoaded = Promise.all(availableEnvironments().map((pr) => __awaiter(this, void 0, void 0, function* () {
            try {
                const env = yield pr;
                if (env.variables) {
                    console.log(`Detected available environment "${env.name}`);
                    this._availableEnvironments.set(env.name, {
                        name: env.name,
                        variables: env.variables,
                        mutex: env.mutex,
                        description: env.description,
                    });
                }
            }
            catch (e) {
                console.error('Error detecting an environment', e);
            }
        })));
        /**
         * The environments (by name) which are currently active in the workspace
         */
        this.activeEnvironments = [];
        this._activeEnvironmentsChangedEmitter = new vscode.EventEmitter();
        this.onActiveEnvironmentsChanges = this._activeEnvironmentsChangedEmitter.event;
    }
    get availableEnvironments() {
        return this._availableEnvironments;
    }
    activateEnvironments(...names) {
        for (const name of names) {
            const env = this.availableEnvironments.get(name);
            if (!env) {
                const msg = `Invalid build environment named ${name}`;
                vscode.window.showErrorMessage(msg);
                console.error(msg);
                continue;
            }
            for (const other of this.availableEnvironments.values()) {
                if (other.mutex === env.mutex && env.mutex !== undefined) {
                    const other_idx = this.activeEnvironments.indexOf(other.name);
                    if (other_idx >= 0) {
                        this.activeEnvironments.splice(other_idx, 1);
                    }
                }
            }
            this.activeEnvironments.push(name);
        }
        this._activeEnvironmentsChangedEmitter.fire(this.activeEnvironments);
    }
    deactivateEnvironment(name) {
        const idx = this.activeEnvironments.indexOf(name);
        if (idx >= 0) {
            this.activeEnvironments.splice(idx, 1);
            this._activeEnvironmentsChangedEmitter.fire(this.activeEnvironments);
        }
        else {
            throw new Error(`Attempted to deactivate environment ${name} which is not yet active!`);
        }
    }
    selectEnvironments() {
        return __awaiter(this, void 0, void 0, function* () {
            const entries = Array.from(this.availableEnvironments.entries())
                .map(([name, env]) => ({
                name: name,
                label: this.activeEnvironments.indexOf(name) >= 0 ?
                    `$(check) ${name}` :
                    name,
                description: env.description || '',
            }));
            const chosen = yield vscode.window.showQuickPick(entries);
            if (!chosen) {
                return;
            }
            this.activeEnvironments.indexOf(chosen.name) >= 0 ?
                this.deactivateEnvironment(chosen.name) :
                this.activateEnvironments(chosen.name);
        });
    }
    /**
     * @brief The current environment variables to use when executing commands,
     *    as specified by the active build environments.
     */
    get currentEnvironmentVariables() {
        const active_env = this.activeEnvironments.reduce((acc, name) => {
            const env_ = this.availableEnvironments.get(name);
            console.assert(env_);
            const env = env_;
            for (const entry of env.variables.entries()) {
                acc[entry[0]] = entry[1];
            }
            return acc;
        }, {});
        const proc_env = process.env;
        return util.mergeEnvironment(process.env, active_env);
    }
}
exports.EnvironmentManager = EnvironmentManager;
//# sourceMappingURL=environment.js.map