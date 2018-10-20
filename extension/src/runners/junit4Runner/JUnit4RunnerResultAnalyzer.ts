// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ITestItem } from '../../protocols';
import { BaseRunnerResultAnalyzer } from '../baseRunner/BaseRunnerResultAnalyzer';
import { ITestResult } from '../models';

export class JUnit4RunnerResultAnalyzer extends BaseRunnerResultAnalyzer {
    protected processData(data: string): void {
        throw new Error('Method not implemented.');
    }

    protected processMethod(test: ITestItem): ITestResult {
        throw new Error('Method not implemented.');
    }
}
