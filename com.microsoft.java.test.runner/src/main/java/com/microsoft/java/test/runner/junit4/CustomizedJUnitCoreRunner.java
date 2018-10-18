/*
 * Copyright (c) 2012-2017 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
package com.microsoft.java.test.runner.junit4;

import com.microsoft.java.test.runner.common.TestRunnerMessageHelper;

import org.junit.runner.JUnitCore;
import org.junit.runner.Result;
import org.junit.runner.notification.RunListener;
import org.junit.runner.notification.RunNotifier;

import java.util.List;

public class CustomizedJUnitCoreRunner extends JUnitCore {
    public void run(String[] suites) {
        final List<JUnit4TestReference> testSuites = TestRunnerUtil.createTestReferences(suites);
        if (testSuites.isEmpty()) {
            TestRunnerMessageHelper.reporterAttached();
            return;
        }

        final JUnitExecutionListener listener = new JUnitExecutionListener();
        final RunNotifier runNotifier = new RunNotifier();
        runNotifier.addListener(listener);
        TestRunnerMessageHelper.rootPresentation();
        for (final JUnit4TestReference testReference : testSuites) {
            testReference.sendTree(listener);
        }

        final Result result = new Result();
        final RunListener resultListener = result.createListener();
        runNotifier.addListener(resultListener);

        for (final JUnit4TestReference testReference : testSuites) {
            testReference.run(runNotifier);
        }
        runNotifier.fireTestRunFinished(result);
    }
}
