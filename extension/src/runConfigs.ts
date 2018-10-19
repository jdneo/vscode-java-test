// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export interface IRunConfigItem {
    name: string;
    projectName: string;
    workingDirectory: string;
    args: any[];
    vmargs: any[];
    env: { [key: string]: string; };
    preLaunchTask: string;
}

export interface IRunConfig {
    default: string;
    items: IRunConfigItem[];
}

export interface ITestConfig {
    run: IRunConfig;
    debug: IRunConfig;
}
