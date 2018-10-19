// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as os from 'os';
import { commands, Disposable, Extension, ExtensionContext, extensions, FileSystemWatcher, languages, Uri, window, workspace } from 'vscode';
import { initializeFromJsonFile, instrumentOperation } from 'vscode-extension-telemetry-wrapper';
import { testCodeLensProvider } from './codeLensProvider';
import { openTextDocumentForNode } from './commands/explorerCommands';
import { runTests } from './commands/runTests';
import { JavaTestRunnerCommands } from './constants/commands';
import { explorerNodeManager } from './explorer/explorerNodeManager';
import { testExplorer } from './explorer/testExplorer';
import { TestTreeNode } from './explorer/TestTreeNode';
import { ITestItem } from './protocols';
import { RunnerExecutor } from './runners/runnerExecutor';

export async function activate(context: ExtensionContext): Promise<void> {
    await initializeFromJsonFile(context.asAbsolutePath('./package.json'));
    await instrumentOperation('activation', doActivate)(context);
}

export function deactivate(): void {
    // do nothing
}

async function doActivate(_operationId: string, context: ExtensionContext): Promise<void> {
    const javaHome: string = await getJavaHome();
    if (!javaHome) {
        throw new Error('Could not find Java home...');
    }

    testExplorer.initialize(context);
    const watcher: FileSystemWatcher = workspace.createFileSystemWatcher('**/*.{[jJ][aA][vV][aA]}');
    watcher.onDidChange((uri: Uri) => {
        const node: TestTreeNode | undefined = explorerNodeManager.getNode(uri.fsPath);
        if (node) {
            testExplorer.refresh(node);
        }
    });
    watcher.onDidDelete((uri: Uri) => {
        explorerNodeManager.removeNode(uri.fsPath);
        testExplorer.refresh();
    });
    watcher.onDidCreate(() => {
        testExplorer.refresh();
    });

    const runnerExecutor: RunnerExecutor = new RunnerExecutor(javaHome, context.storagePath || os.tmpdir());

    context.subscriptions.push(
        window.registerTreeDataProvider(testExplorer.testExplorerViewId, testExplorer),
        explorerNodeManager,
        watcher,
        languages.registerCodeLensProvider('java', testCodeLensProvider),
        instrumentAndRegisterCommand(JavaTestRunnerCommands.OPEN_DOCUMENT_FOR_NODE, async (node: TestTreeNode) => await openTextDocumentForNode(node)),
        instrumentAndRegisterCommand(JavaTestRunnerCommands.REFRESH_EXPLORER, (node: TestTreeNode) => testExplorer.refresh(node)),
        instrumentAndRegisterCommand(JavaTestRunnerCommands.RUN_TEST_FROM_CODELENS, async (tests: ITestItem[]) => await runTests(runnerExecutor, tests, false, true)),
    );
    await commands.executeCommand('setContext', 'java.test.activated', true);
}

function instrumentAndRegisterCommand(name: string, cb: (...args: any[]) => any): Disposable {
    const instrumented: (...args: any[]) => any = instrumentOperation(name, async (_operationId: string, ...args: any[]) => await cb(...args));
    return commands.registerCommand(name, instrumented);
}

async function getJavaHome(): Promise<string> {
    const extension: Extension<any> | undefined = extensions.getExtension('redhat.java');
    try {
        const extensionApi: any = await extension!.activate();
        if (extensionApi && extensionApi.javaRequirement) {
            return extensionApi.javaRequirement.java_home;
        }
    } catch (error) {
        // Swallow the error
    }

    return '';
}
