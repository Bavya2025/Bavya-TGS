allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.projectDirectory
        .dir("../build")

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    // Only apply custom build directory if the subproject is on the same drive root as the workspace
    // This avoids "different roots" errors for plugins located in the C: drive pub cache
    if (project.projectDir.path.substring(0, 3).lowercase() == rootProject.projectDir.path.substring(0, 3).lowercase()) {
        project.layout.buildDirectory.value(newSubprojectBuildDir)
    }
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
