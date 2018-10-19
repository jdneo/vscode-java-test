// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { QuickPickItem, window } from 'vscode';
import { ITestItem } from '../protocols';
import { IRunConfig, IRunConfigItem, ITestConfig } from '../runConfigs';
import { RunnerExecutor } from '../runners/runnerExecutor';
import { testConfigManager } from '../testConfigManager';

export async function runTests(runnerExecutor: RunnerExecutor, tests: ITestItem[], isDebug: boolean, isDefaultConfig: boolean): Promise<void> {
    const config: IRunConfigItem | undefined = await getTestConfig(tests, isDebug, isDefaultConfig);
    return runnerExecutor.run(tests, isDebug, config);
}

async function getTestConfig(tests: ITestItem[], isDebug: boolean, isDefaultConfig: boolean): Promise<IRunConfigItem | undefined> {
    const configs: ITestConfig[] = await testConfigManager.loadConfig(tests);
    const runConfigs: IRunConfig[] = isDebug ? configs.map((c: ITestConfig) => c.debug) : configs.map((c: ITestConfig) => c.run);
    if (isDefaultConfig) {
        // we don't support `Run with default config` if you trigger the test from multi-root folders.
        if (runConfigs.length !== 1 || !runConfigs[0].default) {
            return undefined;
        }
        const runConfig: IRunConfig = runConfigs[0];
        const candidates: IRunConfigItem[] = runConfig.items.filter((item: IRunConfigItem) => item.name === runConfig.default);
        if (candidates.length === 0) {
            window.showWarningMessage(`There is no config with name: ${runConfig.default}.`);
            return undefined;
        }
        if (candidates.length > 1) {
            window.showWarningMessage(`Duplicate configs with default name: ${runConfig.default}.`);
        }
        return candidates[0];
    }

    if (runConfigs.length > 1) {
        window.showWarningMessage('It is not supported to run tests with config from multi root.');
    }

    const configItems: IRunConfigItem[] = [];
    for (const config of runConfigs) {
        configItems.push(...config.items);
    }
    const choices: IRunConfigQuickPick[] = [];
    for (const configItem of configItems) {
        choices.push({
            label: configItem.name,
            description: `Project name: ${configItem.projectName}`,
            item: configItem,
        });
    }
    const selection: IRunConfigQuickPick | undefined = await window.showQuickPick(choices, { placeHolder: 'Select test config' });
    if (!selection) {
        throw new Error('Please specify the test config to use!');
    }
    return selection.item;
}

interface IRunConfigQuickPick extends QuickPickItem {
    item: IRunConfigItem;
}
