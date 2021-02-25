// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { TestRun, TestRunState } from 'vscode';
import { logger } from '../../logger/logger';
import { IJavaTestItem } from '../../types';
import { ITestResult, TestStatus } from '../models';

export class NewJUnitRunnerResultAnalyzer {

    private currentTestResult: ITestResult;
    private traces: string;
    private isRecordingTraces: boolean;
    protected projectName: string;

    constructor(
        public options: TestRun<IJavaTestItem>,
        public map: Map<string, IJavaTestItem>
    ) {
        this.projectName = options.tests[0].projectName;
    }

    public analyzeData(data: string): void {
        const lines: string[] = data.split(/\r?\n/);
        for (const line of lines) {
            if (!line) {
                continue;
            }
            this.processData(line);
            logger.verbose(line + '\n');
        }
    }

    protected processData(data: string): void {
        if (data.startsWith(MessageId.TestStart)) {
            const testId: string = this.getTestId(data);
            if (!testId) {
                return;
            }
            const item: IJavaTestItem | undefined = this.map.get(testId);
            if (!item) {
                return;
            }
            this.options.setState(item, { state: TestRunState.Running });
            this.currentTestResult = {
                id: testId,
                status: TestStatus.Running,
            }
        } else if (data.startsWith(MessageId.TestEnd)) {
            const testId: string = this.getTestId(data);
            if (!testId) {
                return;
            }
            const item: IJavaTestItem | undefined = this.map.get(testId);
            if (!item) {
                return;
            }

            if (this.currentTestResult.trace) {
                this.options.setState(item, { state: TestRunState.Failed });
                this.currentTestResult.status = TestStatus.Fail;
            } else {
                this.options.setState(item, { state: TestRunState.Passed });
                this.currentTestResult.status = TestStatus.Pass;
            }
        } else if (data.startsWith(MessageId.TestFailed) || data.startsWith(MessageId.TestError)) {
            const testId: string = this.getTestId(data);
            if (!testId) {
                return;
            }
            const item: IJavaTestItem | undefined = this.map.get(testId);
            if (!item) {
                return;
            }

            this.options.setState(item, { state: TestRunState.Failed });
            this.currentTestResult.status =  TestStatus.Fail;
        } else if (data.startsWith(MessageId.TraceStart)) {
            this.traces = '';
            this.isRecordingTraces = true;
        } else if (data.startsWith(MessageId.TraceEnd)) {
            this.currentTestResult.trace = this.traces;
            this.isRecordingTraces = false;
            const item: IJavaTestItem | undefined = this.map.get(this.currentTestResult.id);
            if (!item) {
                return;
            }
            this.options.setState(item, { 
                state: TestRunState.Failed,
                messages: [{
                    message: this.currentTestResult.trace,
                    location: item.location,
                }]
            });
        } else if (this.isRecordingTraces) {
            this.traces += data + '\n';
        }
    }

    protected getTestId(message: string): string {
        /**
         * The following regex expression is used to parse the test runner's output, which match the following components:
         * '\d+,'                                - index from the test runner
         * '(?:@AssumptionFailure: |@Ignore: )?' - indicate if the case is ignored due to assumption failure or disabled
         * '(.*?)'                               - test method name
         * '(?:\[\d+\])?'                        - execution index, it will appear for the JUnit4's parameterized test
         * '\(([^)]*)\)[^(]*$'                   - class fully qualified name which wrapped by the last paired brackets, see:
         *                                         https://github.com/microsoft/vscode-java-test/issues/1075
         */
        const regexp: RegExp = /\d+,(?:@AssumptionFailure: |@Ignore: )?(.*?)(?:\[\d+\])?\(([^)]*)\)[^(]*$/;
        const matchResults: RegExpExecArray | null = regexp.exec(message);
        if (matchResults && matchResults.length === 3) {
            return `${this.projectName}@${matchResults[2]}#${matchResults[1]}`;
        }

        // In case the output is class level, i.e.: `%ERROR 2,a.class.FullyQualifiedName`
        const indexOfSpliter: number = message.lastIndexOf(',');
        if (indexOfSpliter > -1) {
            return `${this.projectName}@${message.slice(indexOfSpliter + 1)}#<TestError>`;
        }

        logger.error(`Failed to parse the message: ${message}`);
        return '';
    }

    protected unescape(content: string): string {
        return content.replace(/\\r/gm, '\r')
            .replace(/\\f/gm, '\f')
            .replace(/\\n/gm, '\n')
            .replace(/\\t/gm, '\t')
            .replace(/\\b/gm, '\b')
            .replace(/\\"/gm, '"');
    }
}

// function updateElapsedTime(result: ITestResult): void {
//     if (result.duration && result.duration < 0) {
//         const end: number = Date.now();
//         result.duration += end;
//     }
// }

enum MessageId {
    TestStart = '%TESTS',
    TestEnd = '%TESTE',
    TestFailed = '%FAILED',
    TestError = '%ERROR',
    TraceStart = '%TRACES',
    TraceEnd = '%TRACEE',
    IGNORE_TEST_PREFIX = '@Ignore: ',
    ASSUMPTION_FAILED_TEST_PREFIX = '@AssumptionFailure: ',
}