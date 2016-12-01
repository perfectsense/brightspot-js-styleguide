package com.psddev.styleguide.codegen;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

import org.junit.Assert;
import org.junit.Test;

public class TestPackageJsonExistence {

    @Test
    public void testPackageJsonExistence() throws Exception {

        List<ViewClassDefinition> classDefs = TestUtils.getViewClassDefinitionsForClass(getClass());

        Assert.assertEquals(2, classDefs.size());

        Assert.assertEquals(
                new HashSet<>(Arrays.asList("com.psddev.plugin", "com.psddev.plugin.bar")),
                classDefs.stream().map(ViewClassDefinition::getPackageName).collect(Collectors.toSet()));
    }
}
