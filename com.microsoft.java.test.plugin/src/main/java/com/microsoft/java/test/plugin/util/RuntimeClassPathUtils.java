package com.microsoft.java.test.plugin.util;

import org.eclipse.core.resources.IProject;
import org.eclipse.core.resources.ResourcesPlugin;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IPath;
import org.eclipse.core.runtime.Path;
import org.eclipse.jdt.core.IJavaProject;
import org.eclipse.jdt.launching.JavaRuntime;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

public class RuntimeClassPathUtils {
    public static String[] resolveRuntimeClassPath(List<Object> arguments) throws CoreException {
        if (arguments == null || arguments.size() == 0) {
            return new String[0];
        }
        final IPath[] testPaths = Arrays.stream(((String[]) arguments.get(0)))
                .map(fsPath -> new Path(fsPath))
                .toArray(IPath[]::new);

        final List<IProject> projectList = Arrays.stream(ResourcesPlugin.getWorkspace().getRoot().getProjects())
                .filter(project -> project != null && project.exists())
                .collect(Collectors.toList());

        final Set<IProject> projectsToTest = Arrays.stream(testPaths)
                .map(testPath -> {
                    for (final IProject project : projectList) {
                        if (project.getFullPath().isPrefixOf(testPath)) {
                            return project;
                        }
                    }
                    return null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        final List<String> classPathList = new ArrayList<>();
        for (final IProject projectPath : projectsToTest) {
            final IJavaProject javaProject = ProjectUtils.getJavaProject(projectPath);
            classPathList.addAll(Arrays.asList(JavaRuntime.computeDefaultRuntimeClassPath(javaProject)));
        }
        return classPathList.toArray(new String[classPathList.size()]);
    }
}
