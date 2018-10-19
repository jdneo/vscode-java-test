// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ITestItem } from '../protocols';
import { IRunConfigItem } from '../runConfigs';
import { ITestResult } from './models';

export interface ITestRunner {
    setup(tests: ITestItem[], isDebug: boolean, config?: IRunConfigItem): Promise<void>;
    run(): Promise<ITestResult[]>;
    cleanUp(): Promise<void>;
}
