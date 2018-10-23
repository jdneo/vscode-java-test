package com.microsoft.java.test.runner.common;

import java.util.Arrays;
import java.util.List;

public class MessageUtils {

    public static TestMessageItem createWithName(String title, String nameValue) {
        return create(title, new Pair(TestMessageConstants.NAME, nameValue));
    }

    public static TestMessageItem create(String title, Pair... attributes) {
        List<Pair> pairList = null;
        if (attributes != null) {
            pairList = Arrays.asList(attributes);
        }
        return create(title, pairList);
    }

    public static TestMessageItem create(String title, List<Pair> attributes) {
        final TestMessageItem item = new TestMessageItem(TestMessageType.Info, title, attributes);
        return item;
    }

}
