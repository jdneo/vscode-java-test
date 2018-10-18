/*******************************************************************************
* Copyright (c) 2017 Microsoft Corporation and others.
* All rights reserved. This program and the accompanying materials
* are made available under the terms of the Eclipse Public License v1.0
* which accompanies this distribution, and is available at
* http://www.eclipse.org/legal/epl-v10.html
*
* Contributors:
*     Microsoft Corporation - initial API and implementation
*******************************************************************************/

package com.microsoft.java.test.runner;

import com.microsoft.java.test.runner.common.ITestLauncher;
import com.microsoft.java.test.runner.junit4.JUnitLauncher;
import com.microsoft.java.test.runner.junit5.CustomizedConsoleLauncher;
import com.microsoft.java.test.runner.testng.TestNGLauncher;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class Launcher {
    private static final String JUNIT = "junit";
    private static final String JUNIT5 = "junit5";
    private static final String TESTNG = "testng";

    private static final Map<String, ITestLauncher> launcherMap;

    static {
        launcherMap = new HashMap<>();
        launcherMap.put(JUNIT, new JUnitLauncher());
        launcherMap.put(JUNIT5, new CustomizedConsoleLauncher());
        launcherMap.put(TESTNG, new TestNGLauncher());
    }

    public static void main(String[] args) {
        System.exit(execute(args));
    }

    private static int execute(String[] args) {
        try {
            if (args == null || args.length == 0) {
                System.err.print("No arguments provided.");
                return 1;
            }

            final ITestLauncher launcher = launcherMap.get(args[0]);
            if (launcher == null) {
                System.err.print("Unsupported runner type: " + args[0] + ".");
                return 1;
            }

            final String[] params = Arrays.copyOfRange(args, 1, args.length);
            return launcher.execute(params);
        } catch (final Exception e) {
            e.printStackTrace();
            return 1;
        } finally {
            System.err.flush();
            System.out.flush();
        }
    }
}
