package com.psddev.styleguide.codegen;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Contains all of the metadata necessary to generate a Java class source file
 * representing a View interface along with a static inner Builder class. Its
 * metadata can and should be validated first to ensure that the generated
 * class will compile.
 */
final class ViewClassDefinition implements ViewClassFieldType {

    private ViewClassGeneratorContext context;

    private ViewKey viewKey;

    private Set<JsonViewMap> jsonViewMaps;

    private Map<String, ViewClassFieldDefinition> fieldDefsByName;

    private List<ViewClassDefinitionError> errors = new ArrayList<>();

    private boolean validated = false;

    /**
     * Creates a new view class definition identified by the given
     * {@code viewKey} and defined by the set of {@code jsonViewMaps} governed
     * by the given view class generator {@code context}.
     *
     * @param context The context/settings for the overall view class generator operation.
     * @param viewKey The key that uniquely identifies this view class definition.
     * @param jsonViewMaps Set of all the JSON based definitions and usages of this view
     *                     found in the styleguide that when combined create a unified
     *                     definition of all the fields and types for this view.
     */
    private ViewClassDefinition(ViewClassGeneratorContext context,
                                ViewKey viewKey,
                                Set<JsonViewMap> jsonViewMaps) {

        this.context = context;
        this.viewKey = viewKey;
        this.jsonViewMaps = jsonViewMaps;
    }

    /**
     * Gets the context/settings for the overall view class generator operation.
     *
     * @return the view class generation context.
     */
    public ViewClassGeneratorContext getContext() {
        return context;
    }

    /**
     * The key that uniquely identifies this view class definition.
     *
     * @return the view key for this view definition.
     */
    public ViewKey getViewKey() {
        return viewKey;
    }

    /**
     * Gets the Set of all the JSON based definitions and usages of this view
     * found in the styleguide that when combined create a unified definition
     * of all the fields and types for this view.
     *
     * @return the set of JSON view maps for this view definition.
     */
    public Set<JsonViewMap> getJsonViewMaps() {
        return jsonViewMaps;
    }

    /**
     * Gets all the documentation notes about the view class represented by
     * this view class definition.
     *
     * @return the set of documentation notes.
     */
    public Set<String> getNotes() {
        return jsonViewMaps.stream()
                .map(JsonViewMap::getNotes)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    @Override
    public String getFullyQualifiedClassName() {
        return viewKey.getFullyQualifiedClassName();
    }

    /**
     * Validates the metadata contained within this view class definition. If
     * any of the metadata present in this definition would result in an invalid
     * Java class being generated further down stream then an error is added to
     * this definition's errors list which can be checked prior to view class
     * source code generation.
     */
    private void validate() {

        if (validated) {
            return;
        }

        viewKey.validate();

        if (viewKey.hasAnyErrors()) {
            errors.addAll(viewKey.getErrors().stream().map(error -> new ViewClassDefinitionError(this, error)).collect(Collectors.toList()));
        }

        for (ViewClassFieldDefinition fieldDef : getFieldDefinitions()) {

            fieldDef.validate();

            if (fieldDef.hasAnyErrors()) {
                errors.addAll(fieldDef.getErrors());
            }
        }

        validated = true;
    }

    /**
     * Checks if there are any errors with this view class definition such that
     * generating a Java class from it would cause it to not compile or
     * otherwise cause some downstream error.
     *
     * @return true if there are nay errors with this view class definition.
     */
    public boolean hasAnyErrors() {
        return !getErrors().isEmpty();
    }

    /**
     * Gets the list of errors with this view class definition. The list can
     * be further modified if needed.
     *
     * @return the list errors, or and empty list if there are no errors.
     */
    public List<ViewClassDefinitionError> getErrors() {
        return errors;
    }

    /**
     * Gets the full list view class field definitions including those that
     * have an effective value of null.
     *
     * @return the list of field definitions.
     */
    public List<ViewClassFieldDefinition> getFieldDefinitions() {

        if (fieldDefsByName == null) {

            Map<String, Set<Map.Entry<JsonKey, JsonValue>>> fieldValuesMap = new HashMap<>();

            for (JsonViewMap jsonViewMap : jsonViewMaps) {

                for (Map.Entry<JsonKey, JsonValue> entry : jsonViewMap.getValues().entrySet()) {

                    String fieldName = entry.getKey().getName();

                    Set<Map.Entry<JsonKey, JsonValue>> fieldValues = fieldValuesMap.get(fieldName);
                    if (fieldValues == null) {
                        fieldValues = new HashSet<>();
                        fieldValuesMap.put(fieldName, fieldValues);
                    }

                    fieldValues.add(entry);
                }
            }

            fieldDefsByName = fieldValuesMap.entrySet().stream()
                    .collect(Collectors.toMap(
                            Map.Entry::getKey,
                            entry -> new ViewClassFieldDefinition(this, entry.getKey(), entry.getValue())));
        }

        return new ArrayList<>(fieldDefsByName.values());
    }

    /**
     * Gets only the field definitions that are not effectively null.
     *
     * @return the non-null field definitions only.
     */
    public List<ViewClassFieldDefinition> getNonNullFieldDefinitions() {
        return getFieldDefinitions().stream()
                .filter(fieldDef -> fieldDef.getEffectiveType() != null)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    /**
     * Creates a new view class definition object, validates it, and keeps a
     * reference to it so that all of the created definitions can be analyzed
     * holistically.
     *
     * @param context the class generation context
     * @param jsonViewMaps the set of all JSON view maps that make up all the
     *                     class definitions.
     * @return a list of newly created and validated view class definitions.
     */
    public static List<ViewClassDefinition> createDefinitions(ViewClassGeneratorContext context, Set<JsonViewMap> jsonViewMaps) {

        // Sort the view maps by view key
        Map<ViewKey, Set<JsonViewMap>> jsonViewMapsByViewKey = new HashMap<>();

        for (JsonViewMap jsonViewMap : jsonViewMaps) {

            ViewKey viewKey = jsonViewMap.getViewKey();

            Set<JsonViewMap> set = jsonViewMapsByViewKey.get(viewKey);
            if (set == null) {
                set = new HashSet<>();
                jsonViewMapsByViewKey.put(viewKey, set);
            }
            set.add(jsonViewMap);
        }

        List<ViewClassDefinition> classDefs = new ArrayList<>();

        for (Map.Entry<ViewKey, Set<JsonViewMap>> entry : jsonViewMapsByViewKey.entrySet()) {
            ViewClassDefinition classDef = new ViewClassDefinition(context, entry.getKey(), entry.getValue());
            classDefs.add(classDef);
        }

        context.setClassDefinitions(classDefs);

        // validate each class definition individually
        classDefs.forEach(ViewClassDefinition::validate);

        // Perform additional validation on the class definitions as a whole

        /*
         * Check for conflicting class names. This is an edge case that can only
         * be detected by evaluating all of the view class definitions
         * holistically.
         */
        Map<String, Set<ViewClassDefinition>> classNamesToClassDefs = new LinkedHashMap<>();

        for (ViewClassDefinition classDef : classDefs) {

            String className = classDef.getFullyQualifiedClassName();

            Set<ViewClassDefinition> classDefsForClassName = classNamesToClassDefs.get(className);
            if (classDefsForClassName == null) {
                classDefsForClassName = new LinkedHashSet<>();
                classNamesToClassDefs.put(className, classDefsForClassName);
            }

            classDefsForClassName.add(classDef);
        }

        // loop through the map and if there exists a class name that maps to
        // multiple view class definitions then we know there's an error.
        for (Map.Entry<String, Set<ViewClassDefinition>> entry : classNamesToClassDefs.entrySet()) {

            Set<ViewClassDefinition> classDefsForClassName = entry.getValue();

            if (classDefsForClassName.size() > 1) {

                for (ViewClassDefinition classDef : new HashSet<>(classDefsForClassName)) {

                    String conflictingViewKeysString = classDefsForClassName.stream()
                            .map(cd -> cd.getViewKey().getName())
                            .filter(name -> !name.equals(classDef.getViewKey().getName()))
                            .collect(Collectors.joining(", "));

                    classDef.getErrors().add(new ViewClassDefinitionError(classDef,
                            "Resolves to conflicting class name [" + entry.getKey()
                                    + "] shared with the following view definitions: [" + conflictingViewKeysString + "]"));
                }
            }
        }

        return classDefs;
    }
}
