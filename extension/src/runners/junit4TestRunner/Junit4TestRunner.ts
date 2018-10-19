// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ITestItem } from '../../protocols';
import { BaseTestRunner } from '../baseTestRunner/BaseTestRunner';
import { BaseTestRunnerResultAnalyzer } from '../baseTestRunner/BaseTestRunnerResultAnalyzer';
import { JUnit4RunnerResultAnalyzer } from './JUnit4RunnerResultAnalyzer';

export class JUnit4TestRunner extends BaseTestRunner {

    public constructCommandParams(): string[] {
        return [...super.constructCommandParams(), 'junit', ...this.tests.map((t: ITestItem) => t.fullName)];
    }

    public getTestResultAnalyzer(): BaseTestRunnerResultAnalyzer {
        return new JUnit4RunnerResultAnalyzer(this.tests);
    }
}
