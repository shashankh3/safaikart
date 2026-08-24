const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withManifestFix(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;
    if (!androidManifest.$['xmlns:tools']) {
      androidManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const mainApplication = androidManifest.application?.[0];
    if (mainApplication && mainApplication['meta-data']) {
      mainApplication['meta-data'].forEach((meta) => {
        if (
          meta.$?.['android:name'] === 'com.google.firebase.messaging.default_notification_color' ||
          meta.$?.['android:name'] === 'com.google.firebase.messaging.default_notification_icon'
        ) {
          meta.$['tools:replace'] = 'android:resource';
        }
      });
    }

    return config;
  });
};
