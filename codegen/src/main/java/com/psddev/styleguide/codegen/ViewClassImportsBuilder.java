package com.psddev.styleguide.codegen;

import java.util.HashMap;
import java.util.Map;

import com.psddev.dari.util.ObjectUtils;

/**
 * Manages all of the imports that need to be included in the generated view
 * class. Takes care of removing duplicates and discarding redundant or implicit
 * imports.
 *
 */
class ViewClassImportsBuilder {

    /**
     * A placeholder String for where in the generated file the import
     * definitions will be placed since the imports are declared first, but the
     * entire list isn't known until the entire file has been processed.
     */
    public static final String PLACEHOLDER = "${importsPlaceholder}";

    private String currentPackage;

    // key is the simple or "local" class name, used to detect conflicts.
    private Map<String, ViewClassFieldType> imports = new HashMap<>();

    /**
     * Creates a new import statement builder for the given package name.
     *
     * @param currentPackage the package that the imports will be relative to.
     */
    public ViewClassImportsBuilder(String currentPackage) {
        this.currentPackage = currentPackage;
    }

    /**
     * Creates a new import statement builder for the given view class definition.
     *
     * @param viewDefinition the view class definition the imports will be relative to.
     */
    public ViewClassImportsBuilder(ViewClassDefinition viewDefinition) {
        this.currentPackage = viewDefinition.getPackageName();
    }

    /**
     * Adds a fully qualified class name to the list of imports. If the class
     * is a native java class, or the class is in the same package as the
     * underlying view class definition, then it won't be added to the list
     * but it will just safely be ignored, and the method will still return
     * true. The method returns false if the class being added would cause a
     * conflict with the existing imports in that there already exists a class
     * with the same simple name.
     *
     * @param fullyQualifiedClassName the fully qualified class name to add.
     * @return true if adding the import wouldn't , false otherwise.
     */
    public boolean add(String fullyQualifiedClassName) {
        return add(() -> fullyQualifiedClassName);
    }

    /**
     * Adds a fieldType to the list of imports. If the class
     * is a native java class, or the class is in the same package as the
     * underlying view class definition, then it won't be added to the list
     * but it will just safely be ignored, and the method will still return
     * true. The method returns false if the class being added would cause a
     * conflict with the existing imports in that there already exists a class
     * with the same simple name.
     *
     * @param fieldType the view class field type to add.
     * @return true if adding the import wouldn't cause conflicts, false otherwise.
     */
    public boolean add(ViewClassFieldType fieldType) {
        ViewClassFieldType prev = imports.putIfAbsent(fieldType.getLocalClassName(), fieldType);
        return prev == null || prev.contentEquals(fieldType);
    }

    /**
     * Gets the list of import statements as they would appear in a Java class
     * file.
     *
     * @return the import statements source code.
     */
    public String getImportStatements() {
        StringBuilder builder = new StringBuilder();

        imports.values().stream()

                // don't write out the import if it's already in this package, or it's a native java class
                .filter(ft -> !isSamePackage(ft) && !ft.getPackageName().equals("java.lang"))

                // sort the imports alphabetically
                .sorted((ft1, ft2) -> ObjectUtils.compare(ft1.getFullyQualifiedClassName(), ft2.getFullyQualifiedClassName(), true))

                // append to the builder
                .forEach(ft -> builder.append("import ").append(ft.getFullyQualifiedClassName()).append(";\n"));

        return builder.toString();
    }

    /*
     * Returns true if the specified {@code fieldType} is in the same package
     * as the view class definition that this builder is managing to determine
     * if an import statement is needed or not.
     */
    private boolean isSamePackage(ViewClassFieldType fieldType) {
        return currentPackage.equals(fieldType.getPackageName());
    }
}
