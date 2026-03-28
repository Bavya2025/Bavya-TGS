allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

// Global build directory override to fix drive-mismatch errors
val customBuildDir = File(rootProject.projectDir.parent, "build")
subprojects {
    layout.buildDirectory.set(File(customBuildDir, project.name))
}

subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
