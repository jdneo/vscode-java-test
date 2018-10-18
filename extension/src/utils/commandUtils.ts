// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { commands } from 'vscode';
import { JavaLanguageServerCommands, JavaTestRunnerDelegateCommands } from '../constants/commands';
import { ISearchChildrenNodeRequest, ITestItem } from '../protocols';

export async function searchTestItems(request: ISearchChildrenNodeRequest): Promise<ITestItem[]> {
    const entries: ITestItem[] | undefined = await executeJavaLanguageServerCommand<ITestItem[]>(
        JavaTestRunnerDelegateCommands.SEARCH_TEST_ITEMS, JSON.stringify(request));
    return entries || [];
}

export async function searchTestCodeLens(uri: string): Promise<ITestItem[]> {
    const entries: ITestItem[] | undefined = await executeJavaLanguageServerCommand<ITestItem[]>(
        JavaTestRunnerDelegateCommands.SEARCH_TEST_CODE_LENS, uri);
    return entries || [];
}

export async function resolveRuntimeClassPath(paths: string[]): Promise<string[]> {
    const classpaths: string[] | undefined = await executeJavaLanguageServerCommand<string[]>(
        JavaTestRunnerDelegateCommands.RESOLVE_RUNTIME_CLASSPATH, paths);
    return classpaths || [];
}

function executeJavaLanguageServerCommand<T>(...rest: any[]): Thenable<T | undefined> {
    return commands.executeCommand<T>(JavaLanguageServerCommands.EXECUTE_WORKSPACE_COMMAND, ...rest);
}
