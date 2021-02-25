package com.microsoft.java.test.plugin.model;

import com.google.gson.annotations.SerializedName;

public enum TestKind {

    @SerializedName("-1")
    None(-1),

    @SerializedName("0")
    JUnit(0),
    
    @SerializedName("1")
    JUnit5(1),
    
    @SerializedName("2")
    TestNG(2);

    private int value;
    private TestKind(int value){
        this.value = value;
    }
}
