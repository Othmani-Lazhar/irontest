package io.irontest.models.teststep;

/**
 * Created by Zheng on 1/06/2017.
 */
public class HTTPHeader {
    private String name;
    private String value;

    public HTTPHeader() {}

    public HTTPHeader(String name, String value) {
        this.name = name;
        this.value = value;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }
}
