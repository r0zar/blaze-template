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

// Check if we have the original version stored
if (packageJson._originalSdkVersion) {
    // Restore the original version
    packageJson.dependencies['blaze-sdk'] = packageJson._originalSdkVersion;

    // Remove the custom field
    delete packageJson._originalSdkVersion;
} else {
    console.log('No original version found. Using the latest published version.');
    // You might want to fetch the latest version from npm here
    // For now, we'll just use a fixed version
    packageJson.dependencies['blaze-sdk'] = '0.5.6';
}

// Remove the override if it exists
if (packageJson.pnpm && packageJson.pnpm.overrides && packageJson.pnpm.overrides['blaze-sdk']) {
    delete packageJson.pnpm.overrides['blaze-sdk'];

    // Clean up empty objects
    if (Object.keys(packageJson.pnpm.overrides).length === 0) {
        delete packageJson.pnpm.overrides;
    }

    if (packageJson.pnpm && Object.keys(packageJson.pnpm).length === 0) {
        delete packageJson.pnpm;
    }
}

// Write the updated package.json
try {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Successfully unlinked local SDK');
    console.log('Run "pnpm install" to apply the changes');
} catch (error) {
    console.error('Error writing package.json:', error);
    process.exit(1);
} 