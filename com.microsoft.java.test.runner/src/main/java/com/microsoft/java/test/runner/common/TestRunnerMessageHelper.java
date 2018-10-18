package com.microsoft.java.test.runner.common;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.List;

public class TestRunnerMessageHelper {
    public static void reporterAttached() {
        TestOutputStream.instance()
                .println(MessageUtils.create(TestMessageConstants.TEST_REPORTER_ATTACHED, (List<Pair>) null));
    }

    public static void rootPresentation() {
        TestOutputStream.instance()
                .println(MessageUtils.createWithName(TestMessageConstants.ROOT_NAME, "Default Suite"));
    }

    public static void testStarted(String className, String methodName) {
        TestOutputStream.instance().println(MessageUtils.createWithNameAndLocation(TestMessageConstants.TEST_STARTED,
                methodName, "java:test://" + className + "." + methodName));
    }

    public static void testIgnored(String methodName) {
        TestOutputStream.instance().println(MessageUtils.createWithName(TestMessageConstants.TEST_IGNORED, methodName));
    }

    public static void testFinished(String methodName, long duration) {
        TestOutputStream.instance()
                .println(MessageUtils.create(TestMessageConstants.TEST_FINISHED,
                        new Pair(TestMessageConstants.NAME, methodName),
                        new Pair(TestMessageConstants.DURATION, String.valueOf(duration))));
    }

    public static void testSuiteFinished(String className) {
        TestOutputStream.instance()
                .println(MessageUtils.createWithName(TestMessageConstants.TEST_SUITE_FINISHED, className));
    }

    public static void testSuiteStarted(String className) {
        TestOutputStream.instance().println(MessageUtils.createWithNameAndLocation(
                TestMessageConstants.TEST_SUITE_STARTED, className, "java:test://" + className));
    }

    public static void treeNode(String className, String methodName) {
        TestOutputStream.instance().println(MessageUtils.createWithNameAndLocation(TestMessageConstants.SUITE_TREE_NODE,
                methodName, "java:test://" + className + "." + methodName));
    }

    public static void suiteTreeNodeStarted(String className) {
        TestOutputStream.instance().println(MessageUtils.createWithNameAndLocation(
                TestMessageConstants.SUITE_TREE_STARTED, className, "java:test://" + className));
    }

    public static void suiteTreeNodeEnded(String className) {
        TestOutputStream.instance().println(MessageUtils.createWithNameAndLocation(
                TestMessageConstants.SUITE_TREE_ENDED, className, "java:test://" + className));
    }

    public static void testFailed(String methodName, Throwable exception, long duration) {
        final List<Pair> attributes = new ArrayList<>();
        attributes.add(new Pair(TestMessageConstants.NAME, methodName));
        if (exception != null) {
            final String failMessage = exception.getMessage();
            final StringWriter writer = new StringWriter();
            final PrintWriter printWriter = new PrintWriter(writer);
            exception.printStackTrace(printWriter);
            final String stackTrace = writer.getBuffer().toString();
            attributes.add(new Pair(TestMessageConstants.MESSAGE, failMessage));
            attributes.add(new Pair(TestMessageConstants.DETAILS, stackTrace));
        } else {
            attributes.add(new Pair(TestMessageConstants.MESSAGE, ""));
        }
        attributes.add(new Pair(TestMessageConstants.DURATION, String.valueOf(duration)));

        TestOutputStream.instance().println(MessageUtils.create(TestMessageConstants.TEST_FAILED, attributes));
    }

    public static void testRunFinished(int all, int fail, int skip) {
        final String message = String.format("Total tests run: %d, Failures: %d, Skips: %d", all, fail, skip);
        TestOutputStream.instance().println(MessageUtils.create(TestMessageConstants.TEST_RESULT_SUMMARY,
                new Pair(TestMessageConstants.MESSAGE, message)));
    }
}
