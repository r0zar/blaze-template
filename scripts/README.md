# SDK Linking Scripts

These scripts help you manage the development workflow when working with the local Blaze SDK.

## Usage

### Link to Local SDK

To use the local version of the Blaze SDK (from the parent directory):

```bash
# Run the link script
pnpm link-sdk

# Install dependencies to apply the changes
pnpm install
```

This will:
1. Modify your package.json to use the local SDK via pnpm overrides
2. Store the original version for later use

### Unlink from Local SDK

Before pushing to GitHub or deploying to Vercel, unlink from the local SDK:

```bash
# Run the unlink script
pnpm unlink-sdk

# Install dependencies to apply the changes
pnpm install
```

This will:
1. Remove the pnpm override for the Blaze SDK
2. Restore the original version in your dependencies

## How It Works

- The `link-sdk.js` script adds a pnpm override to use the local SDK from `../../blaze`
- The `unlink-sdk.js` script removes this override and restores the original version

## Important Notes

- Always run `pnpm unlink-sdk` before pushing to GitHub or deploying to Vercel
- The scripts automatically store and restore the original SDK version
- After running either script, you need to run `pnpm install` to apply the changes 