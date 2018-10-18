// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ITestItem } from '../protocols';
import { IRunConfig } from '../runConfigs';
import { ITestResult, ITestRunnerParams } from './models';

export interface ITestRunner {
    setup(tests: ITestItem[], config: IRunConfig, isDebug: boolean): Promise<ITestRunnerParams>;
    run(params: ITestRunnerParams): Promise<ITestResult[]>;
    postRun(): void;
    cancel(): Promise<void>;
    clone(): ITestRunner;
    cleanUp(): Promise<void>;
}
