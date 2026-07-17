const { withGradleProperties } = require('expo/config-plugins');

module.exports = function withDisableAutoDownload(config) {
  return withGradleProperties(config, (config) => {
    config.modResults.push({
      type: 'property',
      key: 'org.gradle.java.installations.auto-download',
      value: 'false',
    });
    return config;
  });
};
