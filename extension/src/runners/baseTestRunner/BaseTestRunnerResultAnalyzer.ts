// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ITestItem } from '../../protocols';
import { ITestResult, ITestResultDetails } from '../models';

export abstract class BaseTestRunnerResultAnalyzer {
    protected testResults: Map<string, ITestResultDetails> = new Map<string, ITestResultDetails>();
    constructor(protected _tests: ITestItem[]) {
    }
    public abstract analyzeData(data: string): void;
    public abstract analyzeError(error: string): void;
    public abstract feedBack(): ITestResult[];
}
