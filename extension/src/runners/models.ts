// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ITestItem } from '../protocols';
import { IRunConfig } from '../runConfigs';

export interface ITestRunnerParams {
    tests: ITestItem[];
    isDebug: boolean;
    storagePath: string;
    port: number | undefined;
    config: IRunConfig;
    classpathStr: string;
    runnerJarFilePath: string;
    runnerClassName: string;
}

export interface ITestResult {
    uri: string;
    test: string;
    result: ITestResultDetails;
}

export interface ITestResultDetails {
    status?: TestStatus;
    details?: string;
    message?: string;
    duration?: string;
    summary?: string;
}

export enum TestStatus {
    Pass = 'Pass',
    Fail = 'Fail',
    Skipped = 'Skipped',
}
