// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { BaseRunnerResultAnalyzer } from '../baseRunner/BaseRunnerResultAnalyzer';
import { ITestResultDetails, TestStatus } from '../models';

const TEST_START: string = 'testStarted';
const TEST_IGNORED: string = 'testIgnored';
const TEST_FINISH: string = 'testFinished';

export class JUnit5RunnerResultAnalyzer extends BaseRunnerResultAnalyzer {

    protected processData(data: string): void {
        const outputData: IJUnit5TestOutputData = JSON.parse(data) as IJUnit5TestOutputData;
        if (outputData.attributes.type !== JUnit5TestType.TEST) {
            return;
        }
        switch (outputData.name) {
            case TEST_START:
                this.testResults.set(this.parseFullyQualifiedNameFromId(outputData.attributes.id), {
                    status: undefined,
                });
                break;
            case TEST_IGNORED:
                this.testResults.set(this.parseFullyQualifiedNameFromId(outputData.attributes.id),
                {
                    status: TestStatus.Skipped,
                    details: this.decodeContent(outputData.attributes.details),
                });
                break;
            case TEST_FINISH:
                const res: ITestResultDetails | undefined = this.testResults.get(this.parseFullyQualifiedNameFromId(outputData.attributes.id));
                if (!res) {
                    return;
                }
                res.status = this.parseTestStatus(outputData.attributes.status);
                res.details = this.decodeContent(outputData.attributes.details);
                res.duration = outputData.attributes.duration;
                break;
        }
    }

    private parseFullyQualifiedNameFromId(id: string): string {
        if (!id) {
            return id;
        }
        const regex: RegExp = /\[class:(.*?)\](?:\/\[method:(.*)\])?/gm;
        const match: RegExpExecArray | null = regex.exec(id);
        if (match) {
            if (match.length === 2) {
                return match[1];
            } else if (match.length === 3) {
                let methodName: string = match[2];
                const index: number = methodName.indexOf('(');
                if (index >= 0) {
                    methodName = methodName.substring(0, index);
                }
                return `${match[1]}#${methodName}`;
            }
        }
        return '';
    }

    private parseTestStatus(status: JUnit5TestStatus): TestStatus {
        switch (status) {
            case JUnit5TestStatus.FAILED:
                return TestStatus.Fail;
            case JUnit5TestStatus.SUCCESSFUL:
                return TestStatus.Pass;
            case JUnit5TestStatus.ABORTED:
                return TestStatus.Skipped;
        }
    }
}

interface IJUnit5TestOutputData {
    name: string;
    attributes: IJUnit5TestAttributes;
}

interface IJUnit5TestAttributes  {
    name: string;
    id: string;
    type: JUnit5TestType;
    duration: string;
    status: JUnit5TestStatus;
    message: string;
    details: string;
}

enum JUnit5TestType {
    TEST = 'TEST',
    CONTAINER = 'CONTAINER',
}

enum JUnit5TestStatus {
    FAILED = 'FAILED',
    SUCCESSFUL = 'SUCCESSFUL',
    ABORTED = 'ABORTED',
}
