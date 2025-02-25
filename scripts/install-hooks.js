#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the Git hooks directory
let gitHooksDir;
try {
    // Try to get the hooks path from Git config
    gitHooksDir = execSync('git rev-parse --git-path hooks', { encoding: 'utf8' }).trim();
} catch (error) {
    // Fallback to the default location
    gitHooksDir = path.join(path.dirname(__dirname), '.git', 'hooks');
}

// Ensure the hooks directory exists
if (!fs.existsSync(gitHooksDir)) {
    console.error(`Git hooks directory not found: ${gitHooksDir}`);
    console.error('Are you running this script from within a Git repository?');
    process.exit(1);
}

// Path to our pre-push hook script
const ourPrePushScript = path.join(__dirname, 'pre-push.js');

// Path to the Git pre-push hook
const gitPrePushHook = path.join(gitHooksDir, 'pre-push');

// Create the pre-push hook
try {
    // Create the hook content
    const hookContent = `#!/bin/sh
# This hook was installed by blaze-template
# It calls the pre-push.js script to check if the SDK is linked

node "${ourPrePushScript}" "$@"
exit $?
`;

    // Write the hook file
    fs.writeFileSync(gitPrePushHook, hookContent);

    // Make it executable
    fs.chmodSync(gitPrePushHook, '755');

    console.log('✅ Git pre-push hook installed successfully');
} catch (error) {
    console.error('Error installing Git hook:', error);
    process.exit(1);
} 