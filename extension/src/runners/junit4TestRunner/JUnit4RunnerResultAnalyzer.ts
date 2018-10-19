// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { BaseTestRunnerResultAnalyzer } from '../baseTestRunner/BaseTestRunnerResultAnalyzer';
import { ITestResult } from '../models';

export class JUnit4RunnerResultAnalyzer extends BaseTestRunnerResultAnalyzer {
    public analyzeData(data: string): void {
        // tslint:disable-next-line:no-console
        console.log('Info: ' + data);
    }

    public analyzeError(error: string): void {
        // tslint:disable-next-line:no-console
        console.log('Error: ' + error);
    }

    public feedBack(): ITestResult[] {
        throw new Error('Method not implemented.');
    }
}
