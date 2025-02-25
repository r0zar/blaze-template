#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Path to package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');

// Check if package.json exists
if (!fs.existsSync(packageJsonPath)) {
    console.log('package.json not found. Skipping check.');
    process.exit(0);
}

// Read the current package.json
let packageJson;
try {
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    packageJson = JSON.parse(packageJsonContent);
} catch (error) {
    console.error('Error reading package.json:', error);
    process.exit(1);
}

// Check if the SDK is linked
const isLinked = packageJson.pnpm &&
    packageJson.pnpm.overrides &&
    packageJson.pnpm.overrides['blaze-sdk'] &&
    packageJson.pnpm.overrides['blaze-sdk'].startsWith('link:');

if (isLinked) {
    console.error('\x1b[31m%s\x1b[0m', '⚠️  WARNING: You are trying to push with the Blaze SDK linked to a local path.');
    console.error('\x1b[31m%s\x1b[0m', 'This will cause build failures on Vercel or when others clone your repository.');
    console.error('\x1b[33m%s\x1b[0m', 'Run the following commands before pushing:');
    console.error('\x1b[33m%s\x1b[0m', '  pnpm unlink-sdk');
    console.error('\x1b[33m%s\x1b[0m', '  pnpm install');

    // Ask for confirmation
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('\x1b[36m%s\x1b[0m', 'Do you want to continue with the push anyway? (y/N): ', (answer) => {
        rl.close();
        if (answer.toLowerCase() !== 'y') {
            console.log('Push aborted. Please unlink the SDK before pushing.');
            process.exit(1);
        } else {
            console.log('Continuing with push despite linked SDK...');
            process.exit(0);
        }
    });
} else {
    // SDK is not linked, allow the push
    process.exit(0);
} 