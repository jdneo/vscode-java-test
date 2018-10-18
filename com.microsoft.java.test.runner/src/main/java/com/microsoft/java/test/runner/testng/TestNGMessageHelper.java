package com.microsoft.java.test.runner.testng;

import com.microsoft.java.test.runner.common.MessageUtils;
import com.microsoft.java.test.runner.common.Pair;
import com.microsoft.java.test.runner.common.TestMessageConstants;
import com.microsoft.java.test.runner.common.TestOutputStream;

import org.testng.ISuite;
import org.testng.ITestClass;
import org.testng.ITestContext;
import org.testng.ITestResult;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public class TestNGMessageHelper {
    public static void reporterAttached(TestOutputStream stream) {
        stream.println(MessageUtils.create(TestMessageConstants.TEST_REPORTER_ATTACHED, (List<Pair>) null));
    }

    public static void rootPresentation(TestOutputStream stream) {
        stream.println(MessageUtils.create(TestMessageConstants.ROOT_NAME,
                new Pair(TestMessageConstants.NAME, "Default Suite")));
    }

    public static void testStarted(TestOutputStream stream, ITestResult description) {
        final String location = description.getTestContext().getName() + "." + description.getName();
        stream.println(MessageUtils.create(TestMessageConstants.TEST_STARTED,
                new Pair(TestMessageConstants.NAME, description.getName()),
                new Pair(TestMessageConstants.LOCATION, "java:test://" + location)));
    }

    public static void testIgnored(TestOutputStream stream, String name) {
        stream.println(
                MessageUtils.create(TestMessageConstants.TEST_IGNORED, new Pair(TestMessageConstants.NAME, name)));
    }

    public static void testFinished(TestOutputStream stream, ITestResult description, long duration) {
        stream.println(MessageUtils.create(TestMessageConstants.TEST_FINISHED,
                new Pair(TestMessageConstants.NAME, description.getName()),
                new Pair(TestMessageConstants.DURATION, String.valueOf(duration))));
    }

    public static void testSuiteFinished(TestOutputStream stream, String currentSuite) {
        stream.println(MessageUtils.create(TestMessageConstants.TEST_SUITE_FINISHED,
                new Pair(TestMessageConstants.NAME, currentSuite)));
    }

    public static void testSuiteStarted(TestOutputStream stream, ITestClass description) {
        stream.println(MessageUtils.create(TestMessageConstants.TEST_SUITE_STARTED,
                new Pair(TestMessageConstants.NAME, description.getName()),
                new Pair(TestMessageConstants.LOCATION, "java:test://" + description.getName())));
    }

    public static void suiteTreeNodeStarted(TestOutputStream stream, ITestContext description) {
        stream.println(MessageUtils.create(TestMessageConstants.SUITE_TREE_STARTED,
                new Pair(TestMessageConstants.NAME, description.getName()),
                new Pair(TestMessageConstants.LOCATION, "java:test://" + description.getName())));
    }

    public static void suiteTreeNodeEnded(TestOutputStream stream, ITestContext description) {
        stream.println(MessageUtils.create(TestMessageConstants.SUITE_TREE_ENDED,
                new Pair(TestMessageConstants.NAME, description.getName()),
                new Pair(TestMessageConstants.LOCATION, "java:test://" + description.getName())));
    }

    public static void testFailed(TestOutputStream stream, ITestResult failure, long duration) {
        final List<Pair> attributes = new ArrayList<>();
        attributes.add(new Pair(TestMessageConstants.NAME, failure.getName()));
        final Throwable exception = failure.getThrowable();
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

        stream.println(MessageUtils.create(TestMessageConstants.TEST_FAILED, attributes));
    }

    public static void testRunFinished(TestOutputStream stream, ISuite result) {
        final ITestContext context = getFirst(result.getResults().values()).getTestContext(); // Can only be one
        final int allTests = context.getAllTestMethods().length;
        final int failedTests = context.getFailedTests().size();
        final int skippedTests = context.getSkippedTests().size();

        final String message = String.format("Total tests run: %d, Failures: %d, Skips: %d", allTests, failedTests,
                skippedTests);
        stream.println(MessageUtils.create(TestMessageConstants.TEST_RESULT_SUMMARY,
                new Pair(TestMessageConstants.MESSAGE, message)));
    }

    private static <T> T getFirst(Collection<T> collection) {
        for (final T entry : collection) {
            return entry;
        }
        return null;
    }
}
