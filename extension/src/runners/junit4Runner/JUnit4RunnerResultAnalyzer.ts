// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Uri } from 'vscode';
import { ITestItem } from '../../protocols';
import { BaseRunnerResultAnalyzer } from '../baseRunner/BaseRunnerResultAnalyzer';
import { ITestResult, ITestResultDetails, TestStatus } from '../models';

const SUITE_START: string = 'testSuiteStarted';
const SUITE_FINISH: string = 'testSuiteFinished';
const TEST_START: string = 'testStarted';
const TEST_FAIL: string = 'testFailed';
const TEST_FINISH: string = 'testFinished';

export class JUnit4RunnerResultAnalyzer extends BaseRunnerResultAnalyzer {
    private currentClassName: string | undefined;

    protected processData(data: string): void {
        let res: ITestResultDetails | undefined;
        const outputData: IJUnit4TestOutputData = JSON.parse(data) as IJUnit4TestOutputData;
        switch (outputData.name) {
            case SUITE_START:
                this.currentClassName = outputData.attributes.name;
                break;
            case SUITE_FINISH:
                this.currentClassName = undefined;
                break;
            case TEST_START:
                this.testResults.set(`${this.currentClassName}#${outputData.attributes.name}`, {
                    status: undefined,
                });
                break;
            case TEST_FAIL:
                res = this.testResults.get(`${this.currentClassName}#${outputData.attributes.name}`);
                if (!res) {
                    return;
                }
                res.status = TestStatus.Fail;
                res.message = this.decodeContent(outputData.attributes.message);
                res.details = this.decodeContent(outputData.attributes.details);
                break;
            case TEST_FINISH:
                res = this.testResults.get(`${this.currentClassName}#${outputData.attributes.name}`);
                if (!res) {
                    return;
                }
                if (!res.status) {
                    res.status = TestStatus.Pass;
                }
                res.duration = outputData.attributes.duration;
                break;
        }
    }

    protected processMethod(test: ITestItem): ITestResult {
        let testResultDetails: ITestResultDetails | undefined = this.testResults.get(test.fullName);
        if (!testResultDetails) {
            testResultDetails = { status: TestStatus.Skipped };
        }

        return {
            fullName: test.fullName,
            uri: Uri.parse(test.uri).toString(),
            result: testResultDetails,
        };
    }

    private decodeContent(content: string): string {
        if (!content) {
            return content;
        }
        return content.replace(new RegExp('&#x40;', 'gm'), '@');
    }
}

interface IJUnit4TestOutputData {
    type: JUnit4TestOutputType;
    name: string;
    attributes: IJUnitTestAttributes;
}

interface IJUnitTestAttributes  {
    name: string;
    duration: string;
    location: string;
    message: string;
    details: string;
}

enum JUnit4TestOutputType {
    Info,
    Error,
}
