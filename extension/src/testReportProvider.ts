// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as path from 'path';
import * as pug from 'pug';
import { ExtensionContext, TextDocumentContentProvider, Uri, workspace, WorkspaceConfiguration } from 'vscode';
import { ITestItemBase } from './protocols';
import { ITestResult, ITestResultDetails, TestStatus } from './runners/models';
import { testResultManager } from './testResultManager';
import { decodeTestReportUri, encodeTestReportUri, TestReportType } from './utils/testReportUtils';

class TestReportProvider implements TextDocumentContentProvider {
    private compiledReportTemplate: pug.compileTemplate;
    // private compiledErrorTemplate: pug.compileTemplate;
    private context: ExtensionContext;

    public initialize(context: ExtensionContext): void {
        this.context = context;
        this.compiledReportTemplate = pug.compileFile(this.context.asAbsolutePath(path.join('resources', 'templates', 'report.pug')));
        // this.compiledErrorTemplate = pug.compileFile(this.context.asAbsolutePath(path.join('resources', 'templates', 'report_error.pug')));
    }

    public async provideTextDocumentContent(uri: Uri): Promise<string> {
        const [uriArray, fullNameArray, reportType] = decodeTestReportUri(uri);
        const resultsToRender: ITestResult[] = [];
        for (let i: number = 0; i < uriArray.length; i++) {
            const result: ITestResultDetails | undefined = testResultManager.getResult(Uri.parse(uriArray[i]).fsPath, fullNameArray[i]);
            if (result) {
                resultsToRender.push({uri: uriArray[i].toString(), fullName: fullNameArray[i], result});
            }
        }
        return this.report(resultsToRender, reportType, false);
    }

    public get scheme(): string {
        return 'test-report';
    }

    public get testReportName(): string {
        return 'Test Report';
    }

    private report(results: ITestResult[], type: TestReportType, isLegacy: boolean): string {
        const passedTests: ITestItemBase[] = results.filter((result: ITestResult) => result.result && result.result.status === TestStatus.Pass);
        const failedTests: ITestItemBase[] = results.filter((result: ITestResult) => result.result && result.result.status === TestStatus.Fail);
        const skippedTests: ITestItemBase[] = results.filter((result: ITestResult) => result.result && result.result.status === TestStatus.Skipped);
        return this.render({
            tests: type === TestReportType.All ? results : (type === TestReportType.Failed ? failedTests : passedTests),
            uri: `command:vscode.previewHtml?${encodeURIComponent(JSON.stringify(encodeTestReportUri(results, TestReportType.All)))}`,
            passedUri: `command:vscode.previewHtml?${encodeURIComponent(JSON.stringify(encodeTestReportUri(results, TestReportType.Passed)))}`,
            failedUri: 'command:vscode.previewHtml?' + encodeURIComponent(JSON.stringify(encodeTestReportUri(results, TestReportType.Failed))),
            type,
            name: results.length === 1 ? results[0].fullName.replace('#', '.') : undefined,
            showFilters: results.length > 1,
            isLegacy,
            cssFile: this.cssTheme(),
            totalCount: results.length,
            passCount: passedTests.length,
            failedCount: failedTests.length,
            skippedCount: skippedTests.length,
        }, this.compiledReportTemplate);
    }

    private render(data: {}, template: pug.compileTemplate): string {
        return template(data);
    }

    private cssTheme(): string {
        const config: WorkspaceConfiguration = workspace.getConfiguration();
        const theme: string | undefined = config.get<string>('workbench.colorTheme');
        const reportTheme: string = theme && theme.toLowerCase().indexOf('light') !== -1 ? 'light.css' : 'dark.css';
        return this.context.asAbsolutePath(path.join('resources', 'templates', 'css', reportTheme));
    }
}

export const testReportProvider: TestReportProvider = new TestReportProvider();
