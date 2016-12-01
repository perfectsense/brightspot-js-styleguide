package com.psddev.styleguide.codegen;

import java.util.List;
import java.util.Set;

import org.junit.Test;

import static org.junit.Assert.*;

public class TestRepeatDataUrl {

    @Test
    public void testRepeatDataUrl() throws Exception {

        // generate the template definitions
        List<ViewClassDefinition> definitions = TestUtils.getViewClassDefinitionsForClass(getClass());

        // verify there's a definition for the list template
        ViewClassDefinition itemDef = definitions.stream().filter(classDef -> classDef.getViewKey().getName().equals("templates/list.hbs")).findFirst().get();

        // get its fields
        List<ViewClassFieldDefinition> fields = itemDef.getFieldDefinitions();

        // find a field named "items"
        ViewClassFieldDefinition itemsFieldDef = fields.stream().filter(field -> "items".equals(field.getFieldName())).findFirst().get();

        // verify it's a list
        assertTrue(itemsFieldDef.getEffectiveType() == JsonList.class);

        // get the list item types
        Set<ViewClassFieldType> listItemTypes = itemsFieldDef.getFieldValueTypes();

        // verify there's only 1 type
        assertEquals(1, listItemTypes.size());

        // verify the type is "item"
        assertEquals("com.psddev.base.templates.ItemView", listItemTypes.stream().findFirst().get().getFullyQualifiedClassName());
    }
}
