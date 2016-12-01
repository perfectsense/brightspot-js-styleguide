package com.psddev.styleguide.codegen;

import org.junit.Test;

public class TestEmptyList {

    @Test(expected = ViewClassGeneratorException.class)
    public void testEmptyList() throws Exception {
        // Should throw an error
        TestUtils.getDefaultGeneratorForClass(getClass()).getGeneratedClasses();
    }
}
