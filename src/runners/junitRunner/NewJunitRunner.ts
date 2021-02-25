// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import getPort from 'get-port';
import { AddressInfo, createServer, Server, Socket } from 'net';
import { debug, DebugConfiguration, DebugSession, Disposable, TestRun, Uri, workspace } from 'vscode';
import { IProgressReporter } from '../../debugger.api';
import { logger } from '../../logger/logger';
import { BaseRunner } from '../baseRunner/BaseRunner';
import { BaseRunnerResultAnalyzer } from '../baseRunner/BaseRunnerResultAnalyzer';
import { IRunnerContext } from '../models';
import { JUnitRunnerResultAnalyzer } from './JUnitRunnerResultAnalyzer';
import * as os from 'os';
import * as path from 'path';
import * as iconv from 'iconv-lite';
import { IJavaTestItem } from '../../types';
import { NewJUnitRunnerResultAnalyzer } from './NewJUnitRunnerResultAnalyzer';

export class NewJUnitRunner {

    protected server: Server;
    protected socket: Socket;
    protected runnerResultAnalyzer: NewJUnitRunnerResultAnalyzer;

    private disposables: Disposable[] = [];

    constructor(
        public options: TestRun<IJavaTestItem>,
        public map: Map<string, IJavaTestItem>
    ) {}

    public async setup(): Promise<void> {
        await this.startSocketServer();
        this.runnerResultAnalyzer = new NewJUnitRunnerResultAnalyzer(
            this.options,
            this.map,
        );
    }

    public async run(launchConfiguration: DebugConfiguration): Promise<Set<string>> {
        if (launchConfiguration.args) {
            // We need to replace the socket port number since the socket is established from the client side.
            // The port number returned from the server side is a fake one.
            const args: string[] = launchConfiguration.args as string[];
            const portIndex: number = args.lastIndexOf('-port');
            if (portIndex > -1 && portIndex + 1 < args.length) {
                args[portIndex + 1] = `${(this.server.address() as AddressInfo).port}`;
            } else {
                args.push('-port', `${(this.server.address() as AddressInfo).port}`);
            }
        }
        
        let data: string = '';
        this.server.on('connection', (socket: Socket) => {
            this.socket = socket;
            socket.on('error', (err: Error) => {
                throw err;
            });

            socket.on('data', (buffer: Buffer) => {
                data = data.concat(iconv.decode(buffer, launchConfiguration.encoding || 'utf8'));
                const index: number = data.lastIndexOf(os.EOL);
                if (index >= 0) {
                    this.runnerResultAnalyzer.analyzeData(data.substring(0, index + os.EOL.length));
                    data = data.substring(index + os.EOL.length);
                }
            });

            socket.on('error', (err: Error) => {
                throw err;
            });

            this.server.on('error', (err: Error) => {
                throw err;
            });
        });

        // Run from integrated terminal will terminate the debug session immediately after launching,
        // So we force to use internal console here to make sure the session is still under debugger's control.
        launchConfiguration.console = 'internalConsole';
        launchConfiguration.internalConsoleOptions = 'openOnSessionStart';

        const uri: Uri = this.map.values().next().value.location!.uri;
        logger.verbose(`Launching with the following launch configuration: '${JSON.stringify(launchConfiguration, null, 2)}'\n`);

        return await debug.startDebugging(workspace.getWorkspaceFolder(uri), launchConfiguration).then(async (success: boolean) => {
            if (!success) {
                this.tearDown();
                // return this.testResultAnalyzer.tearDown();
            }

            return await new Promise<void>((resolve: () => void): void => {
                this.disposables.push(
                    debug.onDidTerminateDebugSession((session: DebugSession): void => {
                        if (launchConfiguration.name === session.name) {
                            this.tearDown();
                            if (data.length > 0) {
                                this.runnerResultAnalyzer.analyzeData(data);
                            }
                            return resolve();
                        }
                    }),
                );
            });
        }, ((reason: any): any => {
            logger.error(`${reason}`);
            this.tearDown();
            return;
        }));
    }

    public async tearDown(): Promise<void> {
        try {
            if (this.socket) {
                this.socket.removeAllListeners();
                this.socket.destroy();
            }
            if (this.server) {
                this.server.removeAllListeners();
                this.server.close(() => {
                    this.server.unref();
                });
            }
            for (const disposable of this.disposables) {
                disposable.dispose();
            }
        } catch (error) {
            logger.error('Failed to clean up', error);
        }
    }

    public get serverPort(): number {
        const address: AddressInfo = this.server.address() as AddressInfo;
        if (address) {
            return address.port;
        }

        throw new Error('The socket server is not started yet.');
    }

    protected async startSocketServer(): Promise<void> {
        this.server = createServer();
        const socketPort: number = await getPort();
        await new Promise<void>((resolve: () => void): void => {
            this.server.listen(socketPort, '127.0.0.1', resolve);
        });
    }

}
