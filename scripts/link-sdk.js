const fs = require('fs');
const path = require('path');

// Path to package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');

// Read the current package.json
let packageJson;
try {
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    packageJson = JSON.parse(packageJsonContent);
} catch (error) {
    console.error('Error reading package.json:', error);
    process.exit(1);
}

// Store the current version for later use
const currentVersion = packageJson.dependencies['blaze-sdk'];

// Create or update pnpm section with overrides
if (!packageJson.pnpm) {
    packageJson.pnpm = {};
}

if (!packageJson.pnpm.overrides) {
    packageJson.pnpm.overrides = {};
}

// Add the local SDK override
packageJson.pnpm.overrides['blaze-sdk'] = 'link:../blaze';

// Store the original version in a custom field for unlink script
packageJson._originalSdkVersion = currentVersion;

// Write the updated package.json
try {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Successfully linked to local SDK');
    console.log('Run "pnpm install" to apply the changes');
} catch (error) {
    console.error('Error writing package.json:', error);
    process.exit(1);
} 