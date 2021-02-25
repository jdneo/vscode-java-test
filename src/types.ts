// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Location, TestItem } from "vscode";
import { TestKind, TestLevel } from "./protocols";

export interface IJavaTestItem extends TestItem {
    projectName: string;
    testKind: TestKind;
    testLevel: TestLevel;
}

export class JavaTestItem implements IJavaTestItem {
    public runnable : boolean = true;
    public debuggable: boolean = true;
    public children: JavaTestItem[] = [];
    public location: Location | undefined;
    public jdtHandler: string;
    public fullName: string;

    constructor(
        public label: string,
        public readonly id: string,
        public testKind: TestKind,
        public projectName: string,
        public testLevel: TestLevel,
    ) {}

    public async getChildren(): Promise<void> {
        // this.children = await 
    }
}

export class TestRoot implements IJavaTestItem {
    projectName: string;
    testKind: TestKind;
    testLevel: TestLevel;
    id?: string | undefined;
    description?: string | undefined;
    runnable?: boolean | undefined;
    debuggable?: boolean | undefined;
    location?: Location | undefined;
    public readonly label: string = 'Java Tests';
    public children: JavaTestItem[] = [];
}