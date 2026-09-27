plugins { id("com.android.application") }

android {
    namespace = "de.vossfit.vitality"
    compileSdk = 35
    defaultConfig {
        applicationId = "de.vossfit.vitality"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.10.0")
}
