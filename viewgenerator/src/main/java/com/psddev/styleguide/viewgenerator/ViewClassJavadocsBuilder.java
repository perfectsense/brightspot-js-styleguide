package com.psddev.styleguide.viewgenerator;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static com.psddev.styleguide.viewgenerator.ViewClassStringUtils.indent;
import static com.psddev.styleguide.viewgenerator.ViewClassStringUtils.NEW_LINE;

/**
 * Utility class for generating Javadocs source.
 */
class ViewClassJavadocsBuilder {

    private StringBuilder javadocsBuilder = new StringBuilder();

    private boolean paragraphStarted = false;
    private StringBuilder paragraphBuilder = new StringBuilder();

    private void appendToBuilder(String text) {
        if (paragraphStarted) {
            paragraphBuilder.append(text);
        } else {
            javadocsBuilder.append(text);
        }
    }

    public ViewClassJavadocsBuilder add(String text) {
        appendToBuilder(text);
        return this;
    }

    public ViewClassJavadocsBuilder addLine(String line) {
        add(line).add(NEW_LINE);
        return this;
    }

    public ViewClassJavadocsBuilder newLine() {
        addLine("");
        return this;
    }

    public ViewClassJavadocsBuilder addParagraph(String paragraph) {
        addLine("<p>" + paragraph + "</p>");
        return this;
    }

    public ViewClassJavadocsBuilder startParagraph() {
        paragraphStarted = true;
        return this;
    }

    public ViewClassJavadocsBuilder endParagraph() {
        paragraphStarted = false;
        if (paragraphBuilder.length() > 0) {
            addParagraph(paragraphBuilder.toString());
            paragraphBuilder.setLength(0);
        }
        return this;
    }

    public ViewClassJavadocsBuilder addParameter(String parameterName) {
        add("@param " + parameterName + " ");
        return this;
    }

    public ViewClassJavadocsBuilder addReturn() {
        add("@return ");
        return this;
    }

    public ViewClassJavadocsBuilder addLink(String link) {
        addLink(link, null);
        return this;
    }

    public ViewClassJavadocsBuilder addLink(String link, String label) {
        add("{@link ");
        add(link);
        if (label != null) {
            add(" ");
            add(label);
        }
        add("}");
        return this;
    }

    public ViewClassJavadocsBuilder addFieldValueTypesSnippet(TemplateFieldDefinition fieldDef) {
        fieldValueTypesSnippetHelper(fieldDef, false);
        return this;
    }

    public ViewClassJavadocsBuilder addCollectionFieldValueTypesSnippet(TemplateFieldDefinition fieldDef) {
        fieldValueTypesSnippetHelper(fieldDef, true);
        return this;
    }

    public ViewClassJavadocsBuilder addFieldAwareValueTypesSnippet(TemplateFieldDefinition fieldDef) {
        fieldValueTypesSnippetHelper(fieldDef, fieldDef instanceof TemplateFieldDefinitionList);
        return this;
    }

    private void fieldValueTypesSnippetHelper(TemplateFieldDefinition fieldDef, boolean isCollection) {

        Set<TemplateFieldType> fieldValueTypes = fieldDef.getFieldValueTypes();
        TemplateDefinition parentTemplateDef = fieldDef.getParentTemplate();

        List<String> javadocLinks = new ArrayList<>();

        fieldValueTypes.stream().sorted(Comparator.comparing(TemplateFieldType::getClassName)).forEach(fieldType -> {

            // TODO: Add logic to detect whether it really needs to be fully qualified or not
            StringBuilder javadocLinkBuilder = new StringBuilder();

            javadocLinkBuilder.append("{@link ");

            if (fieldType instanceof NativeJavaTemplateFieldType) {
                javadocLinkBuilder.append(fieldType.getFullyQualifiedClassName());

            } else {
                if (fieldType.hasSamePackageAs(parentTemplateDef)) {
                    javadocLinkBuilder.append(fieldType.getClassName());

                } else {
                    javadocLinkBuilder.append(fieldType.getFullyQualifiedClassName());
                    javadocLinkBuilder.append(" ");
                    javadocLinkBuilder.append(fieldType.getClassName());
                }
            }

            javadocLinkBuilder.append("}");

            javadocLinks.add(javadocLinkBuilder.toString());
        });

        StringBuilder builder = new StringBuilder();

        if (fieldDef.isStrictlyTyped) {
            builder.append("A ");
        } else {
            builder.append("Typically a ");
        }

        if (isCollection) {
            builder.append("Collection of ");
        }

        String operator = isCollection ? "and" : "or";

        builder.append(javadocLinks
                .stream()
                // join them with commas
                .collect(Collectors.joining("," + NEW_LINE))
                // isolate the last comma in the String and replace it with the operator " and" or " or"
                .replaceFirst("(.*),([^,]+$)", "$1 " + operator + "$2"));

        builder.append(".");

        add(builder.toString());
    }

    public String buildJavadocsSource(int indent) {
        return buildSourceHelper(indent, true);
    }

    public String buildCommentsSource(int indent) {
        return buildSourceHelper(indent, true);
    }

    private String buildSourceHelper(int indent, boolean isJavadoc) {
        StringBuilder builder = new StringBuilder();

        String[] lines = javadocsBuilder.toString().split(NEW_LINE);

        if (lines.length > 0) {

            builder.append(indent(indent));
            builder.append("/*");
            if (isJavadoc) {
                builder.append("*");
            }
            builder.append(NEW_LINE);

            for (String line : lines) {
                line = line.trim();

                builder.append(indent(indent)).append(" *");

                if (line.length() > 0) {
                    builder.append(" ");
                }

                builder.append(line);
                builder.append(NEW_LINE);
            }

            builder.append(indent(indent)).append(" */").append(NEW_LINE);
        }

        return builder.toString();
    }
}
