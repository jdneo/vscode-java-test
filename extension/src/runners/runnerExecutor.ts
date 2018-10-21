// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as cp from 'child_process';
import { window } from 'vscode';
import { testCodeLensProvider } from '../codeLensProvider';
import { CHILD_PROCESS_MAX_BUFFER_SIZE } from '../constants/configs';
import { ITestItem, TestKind } from '../protocols';
import { IExecutionConfig } from '../runConfigs';
import { testResultManager } from '../testResultManager';
import { killProcess } from '../utils/cpUtils';
import { ITestRunner } from './ITestRunner';
import { JUnit4Runner } from './junit4Runner/Junit4Runner';
import { ITestResult } from './models';

export class RunnerExecutor {
    private readonly javaHome: string;
    private readonly storageRootPath: string;
    private isRunning: boolean;
    private preLaunchTask: cp.ChildProcess | undefined;
    private runnerMap: Map<ITestRunner, ITestItem[]> | undefined;

    constructor(javaHome: string, storageRootPath: string) {
        this.javaHome = javaHome;
        this.storageRootPath = storageRootPath;
    }

    public async run(testItems: ITestItem[], isDebug: boolean = false, config?: IExecutionConfig): Promise<void> {
        if (this.isRunning) {
            window.showInformationMessage('A test session is currently running. Please wait until it finishes.');
            return;
        }
        this.isRunning = true;
        try {
            this.runnerMap = this.classifyTestsByKind(testItems);
            for (const [runner, tests] of this.runnerMap.entries()) {
                if (config && config.preLaunchTask.length > 0) {
                    this.preLaunchTask = cp.exec(
                        config.preLaunchTask,
                        {
                            maxBuffer: CHILD_PROCESS_MAX_BUFFER_SIZE,
                            cwd: config.workingDirectory,
                        },
                    );
                    await this.execPreLaunchTask();
                }
                await runner.setup(tests, isDebug, config);
                const results: ITestResult[] = await runner.run();
                testResultManager.storeResult(...results);
                testCodeLensProvider.refresh();
            }
        } catch (error) {
            // Swallow
        } finally {
            await this.cleanUp();
        }
    }

    private async cleanUp(): Promise<void> {
        try {
            if (this.preLaunchTask) {
                await killProcess(this.preLaunchTask);
                this.preLaunchTask = undefined;
            }

            const promises: Array<Promise<void>> = [];
            if (this.runnerMap) {
                for (const runner of this.runnerMap.keys()) {
                    promises.push(runner.cleanUp());
                }
                this.runnerMap.clear();
                this.runnerMap = undefined;
            }
            await Promise.all(promises);
        } catch (error) {
            // Swallow
        }
        this.isRunning = false;
    }

    private classifyTestsByKind(tests: ITestItem[]): Map<ITestRunner, ITestItem[]> {
        const testMap: Map<string, ITestItem[]> = this.mapTestsByProjectAndKind(tests);
        return this.mapTestsByRunner(testMap);
    }

    private mapTestsByProjectAndKind(tests: ITestItem[]): Map<string, ITestItem[]> {
        const map: Map<string, ITestItem[]> = new Map<string, ITestItem[]>();
        for (const test of tests) {
            const key: string = test.project.concat(test.kind.toString());
            const testArray: ITestItem[] | undefined = map.get(key);
            if (testArray) {
                testArray.push(test);
            } else {
                map.set(key, [test]);
            }
        }
        return map;
    }

    private mapTestsByRunner(testsPerProjectAndKind: Map<string, ITestItem[]>): Map<ITestRunner, ITestItem[]> {
        const map: Map<ITestRunner, ITestItem[]> = new Map<ITestRunner, ITestItem[]>();
        for (const tests of testsPerProjectAndKind.values()) {
            const runner: ITestRunner | undefined = this.getRunnerByKind(tests[0].kind);
            if (runner) {
                map.set(runner, tests);
            } else {
                window.showWarningMessage(`Cannot find matched runner to run the test: ${tests[0].kind}`);
            }
        }
        return map;
    }

    private getRunnerByKind(kind: TestKind): ITestRunner | undefined {
        switch (kind) {
            case TestKind.JUnit:
                return new JUnit4Runner(this.javaHome, this.storageRootPath);
            default:
                return undefined;
        }
    }

    private async execPreLaunchTask(): Promise<number> {
        return new Promise<number>((resolve: (ret: number) => void, reject: (err: Error) => void): void => {
            if (this.preLaunchTask) {
                this.preLaunchTask.on('error', (err: Error) => {
                    // Logger.error(
                    //     `Error occurred while executing prelaunch task.`,
                    //     {
                    //         name: err.name,
                    //         message: err.message,
                    //         stack: err.stack,
                    //     });
                    reject(err);
                });
                this.preLaunchTask.stderr.on('data', (_data: Buffer) => {
                    // Logger.error(`Error occurred: ${data.toString()}`);
                });
                this.preLaunchTask.stdout.on('data', (_data: Buffer) => {
                    // Logger.info(data.toString());
                });
                this.preLaunchTask.on('close', (signal: number) => {
                    if (signal && signal !== 0) {
                        reject(new Error(`Prelaunch task exited with code ${signal}.`));
                    } else {
                        resolve(signal);
                    }
                });
            }
        });
    }
}
