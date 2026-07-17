const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'node_modules', '@react-native', 'gradle-plugin', 'settings.gradle.kts');

if (fs.existsSync(targetPath)) {
  let content = fs.readFileSync(targetPath, 'utf8');
  content = content.replace(
    /plugins\s*\{\s*id\("org\.gradle\.toolchains\.foojay-resolver-convention"\)\.version\("0\.5\.0"\)\s*\}/g,
    'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0") }'
  );
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('Patched foojay-resolver-convention version in @react-native/gradle-plugin to 1.0.0');
} else {
  console.log('Could not find @react-native/gradle-plugin/settings.gradle.kts');
}
