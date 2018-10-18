// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export interface IRunConfig {
    name: string;
    projectName: string;
    workingDirectory: string;
    args: any[];
    vmargs: any[];
    env: {[key: string]: string; };
    preLaunchTask: string;
}
