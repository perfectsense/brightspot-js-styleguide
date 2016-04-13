package com.psddev.styleguide;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.psddev.dari.util.StringUtils;

class TemplateDefinitions {

    private Map<String, TemplateDefinition> definitions;

    private boolean isTemplateFieldDefinitionsResolved = false;

    public TemplateDefinitions(
            Set<JsonTemplateObject> jsonTemplateObjects,
            Set<String> mapTemplates,
            String javaPackagePrefix,
            String javaClassNamePrefix) {

        Map<String, List<JsonTemplateObject>> jsonTemplateObjectsMap = new HashMap<>();

        for (JsonTemplateObject jsonTemplateObject : jsonTemplateObjects) {

            String templateName = jsonTemplateObject.getTemplateName();

            if (JsonDataFile.DELEGATE_TEMPLATE_OBJECT_KEY.equals(templateName)) {
                continue;
            }

            List<JsonTemplateObject> list = jsonTemplateObjectsMap.get(templateName);
            if (list == null) {
                list = new ArrayList<>();
                jsonTemplateObjectsMap.put(templateName, list);
            }

            list.add(jsonTemplateObject);
        }

        // find the common path prefix ensuring that the paths do not start with slash
        int commonPrefixIndex = PathUtils.getCommonPrefixIndex(
                jsonTemplateObjectsMap.keySet().stream()
                        .map(name -> StringUtils.removeStart(name, "/"))
                        .collect(Collectors.toList()), '/');

        definitions = new HashMap<>();

        jsonTemplateObjectsMap.entrySet().forEach((entry) -> {

            // again for consistency, remove the leading slash
            String name = StringUtils.removeStart(entry.getKey(), "/");

            String commonName = name.substring(commonPrefixIndex);
            String commonNamePath;
            int lastSlashAt = commonName.lastIndexOf('/');
            if (lastSlashAt > 0) {
                commonNamePath = commonName.substring(0, lastSlashAt);
            } else {
                commonNamePath = "";
            }

            String javaPackageName = javaPackagePrefix + commonNamePath.replaceAll("/", ".");

            if (!mapTemplates.contains(name)) {
                definitions.put(StringUtils.ensureStart(name, "/"), new TemplateDefinition(
                        // add the leading slash back when passing to the TemplateDefinition
                        StringUtils.ensureStart(name, "/"),
                        StringUtils.removeSurrounding(javaPackageName, "."),
                        entry.getValue(),
                        mapTemplates,
                        javaClassNamePrefix));
            }
        });
    }

    private void resolveAllTemplateFieldDefinitions() {

        if (!isTemplateFieldDefinitionsResolved) {

            for (TemplateDefinition templateDef : definitions.values()) {
                templateDef.resolveFields(this);
            }

            isTemplateFieldDefinitionsResolved = true;
        }
    }

    public Collection<TemplateDefinition> get() {
        resolveAllTemplateFieldDefinitions();
        return definitions.values();
    }

    public TemplateDefinition getByName(String name) {
        resolveAllTemplateFieldDefinitions();
        return definitions.get(StringUtils.ensureStart(name, "/"));
    }

    /**
     * Gets the java class name for a given {@code templateName} relative to
     * another template such that if both templates live in the same java
     * package, the simple class name is returned, otherwise the fully qualified
     * class name is returned.
     *
     * @param templateName the name of the template to get a class name for.
     * @param relativeTemplateName the name of a template relative to the desired one.
     * @return an appropriate class name relative to another template's class.
     */
    String getTemplateDefinitionRelativeClassName(String templateName, String relativeTemplateName) {
        TemplateDefinition templateDef = definitions.get(templateName);
        if (templateDef != null) {

            String packageName = templateDef.getJavaPackageName();
            String className = templateDef.getJavaClassName();

            TemplateDefinition relativeTemplateDef = definitions.get(relativeTemplateName);

            if (relativeTemplateDef != null && packageName.equals(relativeTemplateDef.getJavaPackageName())) {
                return className;
            } else {
                return packageName + "." + className;
            }
        } else {
            return null;
        }
    }

    String getTemplateDefinitionFullyQualifiedClassName(String templateName) {
        TemplateDefinition templateDefinition = definitions.get(templateName);
        if (templateDefinition != null) {
            return templateDefinition.getJavaPackageName() + "." + templateDefinition.getJavaClassName();
        } else {
            return null;
        }
    }

    String getTemplateDefinitionClassName(String templateName) {
        TemplateDefinition templateDefinition = definitions.get(templateName);
        if (templateDefinition != null) {
            return templateDefinition.getJavaClassName();
        } else {
            return null;
        }
    }

    String getTemplateDefinitionPackageName(String templateName) {
        TemplateDefinition templateDefinition = definitions.get(templateName);
        if (templateDefinition != null) {
            return templateDefinition.getJavaPackageName();
        } else {
            return null;
        }
    }
}
