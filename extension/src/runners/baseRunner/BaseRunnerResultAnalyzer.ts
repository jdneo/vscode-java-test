// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ITestItem, TestLevel } from '../../protocols';
import { ITestResult, ITestResultDetails } from '../models';

export abstract class BaseRunnerResultAnalyzer {
    protected testResults: Map<string, ITestResultDetails> = new Map<string, ITestResultDetails>();
    private readonly regex: RegExp = /@@<TestRunner-({[\s\S]*?})-TestRunner>/gm;

    constructor(protected tests: ITestItem[]) {
    }

    public analyzeData(data: string): void {
        let match: RegExpExecArray | null;
        do {
            match = this.regex.exec(data);
            if (match) {
                try {
                    this.processData(match[1]);
                } catch (ex) {
                    // Swallow
                }
            }
        } while (match);
    }

    public analyzeError(error: string): void {
        // Logger.error(`Error occurred: ${error}`);
    }

    public feedBack(isCanceled: boolean): ITestResult[] {
        const result: ITestResult[] = [];
        for (const test of this.tests) {
            if (isCanceled) {
                return result;
            }
            if (test.level === TestLevel.Class) {
                test.children.forEach((method: ITestItem) => result.push(this.processMethod(method)));
            } else {
                result.push(this.processMethod(test));
            }
        }
        return result;
    }

    protected abstract processData(data: string): void;
    protected abstract processMethod(test: ITestItem): ITestResult;

    protected get outputRegex(): RegExp {
        return this.regex;
    }
}
