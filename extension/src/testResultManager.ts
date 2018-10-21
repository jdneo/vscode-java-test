// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable } from 'vscode';
import { ITestResult, ITestResultDetails } from './runners/models';

class TestResultManager implements Disposable {
    private testResultMap: Map<string, IResultsInUri> = new Map<string, IResultsInUri>();

    public storeResult(...results: ITestResult[]): void {
        for (const result of results) {
            if (!this.testResultMap.has(result.uri)) {
                this.testResultMap.set(result.uri, {
                    methodsMap: new Map<string, ITestResultDetails>(),
                    isDirty: false,
                });
            }
            this.testResultMap.get(result.uri)!.methodsMap.set(result.fullName, result.result);
        }
    }

    public getResult(uriString: string, testFullName: string): ITestResultDetails | undefined {
        const resultsInUri: IResultsInUri | undefined = this.testResultMap.get(uriString);
        if (resultsInUri) {
            return resultsInUri.methodsMap.get(testFullName);
        }
        return undefined;
    }

    public hasResultWithUri(uriString: string): boolean {
        return this.testResultMap.has(uriString);
    }

    public dispose(): void {
        this.testResultMap.clear();
    }
}

interface IResultsInUri {
    methodsMap: Map<string, ITestResultDetails>;
    isDirty: boolean;
}

export const testResultManager: TestResultManager = new TestResultManager();
