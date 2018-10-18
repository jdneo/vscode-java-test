// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as cp from 'child_process';
import * as fse from 'fs-extra';
import * as getPort from 'get-port';
import * as os from 'os';
import * as path from 'path';
import * as kill from 'tree-kill';
import { debug, Uri, workspace, WorkspaceFolder } from 'vscode';
import { ITestItem } from '../../protocols';
import { IRunConfig } from '../../runConfigs';
import * as classpathUtils from '../../utils/classPathUtils';
import { resolveRuntimeClassPath } from '../../utils/commandUtils';
import { ITestRunner } from '../ITestRunner';
import { ITestResult, ITestRunnerParams } from '../models';
import { BaseTestRunnerResultAnalyzer } from './BaseTestRunnerResultAnalyzer';

export abstract class BaseTestRunner implements ITestRunner {
    private process: cp.ChildProcess | undefined;
    private storagePathForCurrentSession: string | undefined;
    constructor(
        protected _javaHome: string,
        protected _storagePath: string) {}

    public abstract clone(): ITestRunner;
    public abstract get runnerJarFilePath(): string;
    public abstract get runnerClassName(): string;
    public abstract get debugConfigName(): string;
    public abstract constructCommandParams(params: ITestRunnerParams): Promise<string[]>;
    public abstract getTestResultAnalyzer(params: ITestRunnerParams): BaseTestRunnerResultAnalyzer;

    public get serverHome(): string {
        return path.join(__dirname, '..', '..', '..', '..', 'server');
    }

    public async setup(tests: ITestItem[], config: IRunConfig, isDebug: boolean = false): Promise<ITestRunnerParams> {
        if (!this.runnerJarFilePath) {
            throw new Error('Failed to locate test server runtime!');
        }
        const port: number | undefined = isDebug ? await getPort() : undefined;
        const testPaths: string[] = tests.map((item: ITestItem) => Uri.parse(item.uri).fsPath);
        const classpaths: string[] = [...await resolveRuntimeClassPath(testPaths), this.runnerJarFilePath];
        this.storagePathForCurrentSession = path.join(this._storagePath, new Date().getTime().toString());
        const classpathStr: string = await classpathUtils.getClassPathString(classpaths, this.storagePathForCurrentSession);
        return {
            tests,
            isDebug,
            storagePath: this.storagePathForCurrentSession,
            port,
            classpathStr,
            runnerJarFilePath: this.runnerJarFilePath,
            runnerClassName: this.runnerClassName,
            config,
        };
    }

    public async run(params: ITestRunnerParams): Promise<ITestResult[]> {
        if (!params) {
            throw new Error('Illegal env type, should pass in IJarFileTestRunnerParameters!');
        }
        const commandParams: string[] = await this.constructCommandParams(params);
        const options: cp.SpawnOptions = { cwd: params.config.workingDirectory, env: process.env };
        if (params.config && params.config.env) {
            options.env = {...params.config.env, ...options.env};
        }
        return new Promise<ITestResult[]>((resolve: (result: ITestResult[]) => void, reject: (error: Error) => void): void => {
            const testResultAnalyzer: BaseTestRunnerResultAnalyzer = this.getTestResultAnalyzer(params);
            let buffer: string = '';
            this.process = cp.spawn(path.join(this._javaHome, 'bin', 'java'), commandParams, options);
            this.process.on('error', (error: Error) => {
                reject(error);
            });
            this.process.stderr.on('data', (data: Buffer) => {
                testResultAnalyzer.analyzeError(data.toString());
            });
            this.process.stdout.on('data', (data: Buffer) => {
                buffer = buffer.concat(data.toString());
                const index: number = buffer.lastIndexOf(os.EOL);
                if (index >= 0) {
                    testResultAnalyzer.analyzeData(buffer.substring(0, index));
                    buffer = buffer.substring(index + os.EOL.length);
                }
            });
            this.process.on('close', (signal: number) => {
                if (buffer.length > 0) {
                    testResultAnalyzer.analyzeData(buffer);
                }
                const result: ITestResult[] = testResultAnalyzer.feedBack();
                if (signal && signal !== 0) {
                    reject(new Error(`Runner exited with code ${signal}.`));
                } else {
                    resolve(result);
                }
            });
            if (params.isDebug) {
                const uri: Uri = Uri.parse(params.tests[0].uri);
                const rootDir: WorkspaceFolder | undefined = workspace.getWorkspaceFolder(Uri.file(uri.fsPath));
                setTimeout(() => {
                    debug.startDebugging(rootDir, {
                        name: this.debugConfigName,
                        type: 'java',
                        request: 'attach',
                        hostName: 'localhost',
                        port: params.port,
                        projectName: params.config ? params.config.projectName : undefined,
                    });
                }, 500);
            }
        });
    }

    public async cleanUp(): Promise<void> {
        try {
            await new Promise<void>((_resolve: () => void, reject: (err: Error) => void): void => {
                if (this.process) {
                    kill(this.process.pid, 'SIGTERM', (error: Error | undefined) => {
                        if (error) {
                            reject(error);
                        }
                        this.process = undefined;
                    });
                }
            });
            if (this.storagePathForCurrentSession) {
                await fse.remove(this.storagePathForCurrentSession);
                this.storagePathForCurrentSession = undefined;
            }
        } catch (error) {
            // swallow
        }
    }

    public postRun(): void {
        throw new Error('Method not implemented.');
    }

    public async cancel(): Promise<void> {
        // if (this.process) {
        //     return new Promise<void>((resolve: () => void, reject: (err: Error) => void): void => {
        //         kill(this.process.pid, 'SIGTERM', (error: Error | undefined) => {
        //             if (error) {
        //                 reject(error);
        //             }
        //             resolve();
        //         });
        //     });
        // }
    }
}
