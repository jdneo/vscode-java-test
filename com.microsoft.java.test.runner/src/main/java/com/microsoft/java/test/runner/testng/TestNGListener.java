package com.microsoft.java.test.runner.testng;

import com.microsoft.java.test.runner.common.TestOutputStream;

import org.testng.IClassListener;
import org.testng.ISuite;
import org.testng.ISuiteListener;
import org.testng.ITestClass;
import org.testng.ITestContext;
import org.testng.ITestListener;
import org.testng.ITestResult;

public class TestNGListener implements ISuiteListener, ITestListener, IClassListener {

    private final TestOutputStream stream;

    public TestNGListener() {
        this.stream = TestOutputStream.instance();
        TestNGMessageHelper.reporterAttached(stream);
    }

    @Override
    public void onBeforeClass(ITestClass testClass) {
        TestNGMessageHelper.testSuiteStarted(stream, testClass);

    }

    @Override
    public void onAfterClass(ITestClass testClass) {
        TestNGMessageHelper.testSuiteFinished(stream, testClass.getName());

    }

    @Override
    public void onTestStart(ITestResult result) {
        TestNGMessageHelper.testStarted(stream, result);

    }

    @Override
    public void onTestSuccess(ITestResult result) {
        final long duration = result.getEndMillis() - result.getStartMillis();
        TestNGMessageHelper.testFinished(stream, result, duration);

    }

    @Override
    public void onTestFailure(ITestResult result) {
        final long duration = result.getEndMillis() - result.getStartMillis();
        TestNGMessageHelper.testFinished(stream, result, duration);
        TestNGMessageHelper.testFailed(stream, result, duration);

    }

    @Override
    public void onTestSkipped(ITestResult result) {
        TestNGMessageHelper.testIgnored(stream, result.getName());

    }

    @Override
    public void onTestFailedButWithinSuccessPercentage(ITestResult result) {
        onTestFailure(result);

    }

    @Override
    public void onStart(ITestContext context) {
        TestNGMessageHelper.suiteTreeNodeStarted(stream, context);

    }

    @Override
    public void onFinish(ITestContext context) {
        TestNGMessageHelper.suiteTreeNodeEnded(stream, context);

    }

    @Override
    public void onStart(ISuite suite) {
    }

    @Override
    public void onFinish(ISuite suite) {
        TestNGMessageHelper.testRunFinished(stream, suite);

    }

}
