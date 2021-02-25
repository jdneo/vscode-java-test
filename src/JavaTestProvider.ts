// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { CancellationToken, commands, DebugConfiguration, EventEmitter, ExtensionContext, Location, Position, Range, RelativePattern, TestHierarchy, TestItem, TestProvider, TestRun, TextDocument, Uri, workspace, WorkspaceFolder } from 'vscode';
import { findTestPackagesAndTypes, getTestMethods, getTestTypes, ITestItem, resolveJUnitLaunchArguments, searchTestCodeLens } from '../extension.bundle';
import { TestKind, TestLevel } from './protocols';
import { IJavaTestItem, JavaTestItem, TestRoot } from './types';
import * as _ from "lodash";
import * as path from "path";
import { JUnitRunner } from './runners/junitRunner/JunitRunner';
import { BaseRunner, IJUnitLaunchArguments } from './runners/baseRunner/BaseRunner';
import { randomSequence } from './utils/configUtils';
import { NewJUnitRunner } from './runners/junitRunner/NewJunitRunner';

export class JavaTestProvider implements TestProvider {

    private context: ExtensionContext;

    public initialize(context: ExtensionContext) {
        this.context = context;
    }

    /**
     * @inheritdoc
     */
    public createWorkspaceTestHierarchy(workspaceFolder: WorkspaceFolder): TestHierarchy<IJavaTestItem> | undefined {
        const root: TestRoot = new TestRoot();
        const pattern: RelativePattern = new RelativePattern(workspaceFolder, '**/*.java');
        const changeTestEmitter = new EventEmitter<IJavaTestItem>();
        const watcher = workspace.createFileSystemWatcher(pattern);
        // TODO: Implements watchers
        // watcher.onDidCreate(async uri => await updateTestsInFile(root, uri, changeTestEmitter));
        // watcher.onDidChange(async uri => await updateTestsInFile(root, uri, changeTestEmitter));
        // watcher.onDidDelete(uri => {
            // removeTestsForFile(root, uri);
            // changeTestEmitter.fire(root);
        // });

        const discoveredInitialTests = this.discoverInitialTests(root, changeTestEmitter);
        return {
            root,
            onDidChangeTest: changeTestEmitter.event,
            discoveredInitialTests,
            dispose: () => watcher.dispose(),
          };
    }

    public createDocumentTestHierarchy(document: TextDocument): TestHierarchy<IJavaTestItem> | undefined {
        const root: TestRoot = new TestRoot();
        const changeTestEmitter = new EventEmitter<IJavaTestItem>();
        const discoveredInitialTests = this.discoverInitialDocumentTests(root, document.uri.toString(), changeTestEmitter);
        return {
            root,
            onDidChangeTest: changeTestEmitter.event,
            discoveredInitialTests: discoveredInitialTests,
            dispose: () => {},
        };
    }

    private async discoverInitialDocumentTests(root: TestRoot, uri: string, emitter: EventEmitter<IJavaTestItem>): Promise<void> {
        const testTypes: JavaTestItem[] = await getTestTypes(uri);
        for (const type of testTypes) {
            type.location = new Location(
                Uri.parse(type.location!.uri.toString()),
                new Range(
                    type.location!.range.start.line,
                    type.location!.range.start.character,
                    type.location!.range.end.line,
                    type.location!.range.end.character,
                ),
            );
            type.children = await getTestMethods(type.jdtHandler);
            for (const m of type.children) {
                m.location = new Location(
                    Uri.parse(m.location!.uri.toString()),
                    new Range(
                        m.location!.range.start.line,
                        m.location!.range.start.character,
                        m.location!.range.end.line,
                        m.location!.range.end.character,
                    ),
                )
            }
            root.children.push(type);
        }
        emitter.fire(root);
    }

    public async runTests(options: TestRun<IJavaTestItem>, cancellationToken: CancellationToken): Promise<void> {
        const methods: IJavaTestItem[] = [];
        this.findTestMethods(methods, options.tests);
        const map: Map<string, IJavaTestItem> = new Map<string, IJavaTestItem>();
        for (const m of methods) {
            if (m.id) {
                map.set(m.id, m);
            }
        }
        const runner: NewJUnitRunner = new NewJUnitRunner(options, map);
        try {
            await runner.setup();
            const resolvedConfiguration: DebugConfiguration = await this.getDebugConfigurationForEclipseRunner(options.tests[0]);
            await runner.run(resolvedConfiguration)
        } finally {
            await runner.tearDown();
        }
    }

    private findTestMethods(methods: IJavaTestItem[], tests: IJavaTestItem[]): void {
        for (const test of tests) {
            if (test.testLevel === TestLevel.Method) {
                methods.push(test);
            } else if (!_.isEmpty(test.children)) {
                this.findTestMethods(methods, test.children as IJavaTestItem[]);
            }
        }
    }

    private async discoverInitialTests(root: TestRoot, emitter: EventEmitter<IJavaTestItem>): Promise<void> {
        const projectsInWorkspaceFolder: string[] = await commands.executeCommand("java.execute.workspaceCommand", "java.project.getAll") || [];
        
        for (const projectRoot of projectsInWorkspaceFolder) {
            // skip default project
            if (projectRoot.indexOf('jdt.ls-java-project') > 0) {
                continue;
            }
            root.children.push(new JavaTestItem(
                path.basename(projectRoot),
                projectRoot,
                TestKind.None,
                path.basename(projectRoot),
                TestLevel.Root,
            ));
        }

        for (const project of root.children) {
            const packages: JavaTestItem[] = await findTestPackagesAndTypes(project.projectName);
            for (const p of packages) {
                delete p.location;
                project.children.push(p);
                for (const c of p.children) {
                    c.location = new Location(
                        Uri.parse(c.location!.uri.toString()),
                        new Range(
                            c.location!.range.start.line,
                            c.location!.range.start.character,
                            c.location!.range.end.line,
                            c.location!.range.end.character,
                        ),
                    )
                    c.children = await getTestMethods(c.jdtHandler);
                    for (const m of c.children) {
                        m.location = new Location(
                            Uri.parse(m.location!.uri.toString()),
                            new Range(
                                m.location!.range.start.line,
                                m.location!.range.start.character,
                                m.location!.range.end.line,
                                m.location!.range.end.character,
                            ),
                        )
                    }
                }
            }
        }

        // const queue: JavaTestItem[] = root.children;
        // while (queue.length > 0) {
        //     const item: JavaTestItem | undefined = queue.shift();
        //     if (!item) {
        //         continue;
        //     }
        // }
        // const packages: JavaTestItem[] = await findTestPackagesAndTypes(root.projectName);
        emitter.fire(root);
    }

    private async getDebugConfigurationForEclipseRunner(test: IJavaTestItem): Promise<DebugConfiguration> {
        const junitLaunchArgs: IJUnitLaunchArguments = await this.getJUnitLaunchArguments(test as JavaTestItem);
    
        return {
            name: `Launch Java Tests - ${randomSequence()}`,
            type: 'java',
            request: 'launch',
            mainClass: junitLaunchArgs.mainClass,
            projectName: junitLaunchArgs.projectName,
            cwd: junitLaunchArgs.workingDirectory,
            classPaths: junitLaunchArgs.classpath,
            modulePaths: junitLaunchArgs.modulepath,
            args: junitLaunchArgs.programArguments,
            vmArgs: junitLaunchArgs.vmArguments,
            // noDebug: !runnerContext.isDebug,
            // ...moreEntries,
        };
    }

    private async getJUnitLaunchArguments(test: JavaTestItem): Promise<IJUnitLaunchArguments> {
        let className: string = '';
        let methodName: string = '';
    
        if (test.fullName) {
            const nameArray: string[] = test.fullName.split('#');
            className = nameArray[0];
            if (nameArray.length > 1) {
                methodName = nameArray[1];
            }
        }
    
        let start: Position | undefined;
        let end: Position | undefined;
        if (test.testKind === TestKind.JUnit5 && test.testLevel === TestLevel.Method) {
            start = test.location?.range.start;
            end = test.location?.range.end;
        }
    
        return await resolveJUnitLaunchArguments(test.location!.uri.toString(), className, methodName, test.projectName, test.testLevel, test.testKind, start, end, false);
    }
}
