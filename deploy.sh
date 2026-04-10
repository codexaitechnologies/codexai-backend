#!/bin/bash
# Deploy script that uses production-only dependencies but keeps serverless plugins

set -e

echo "Preparing deployment with production-only dependencies..."

# Backup current node_modules
if [ -d "node_modules" ]; then
    mv node_modules node_modules_dev_backup
    echo "✓ Backed up dev node_modules"
fi

# Copy production node_modules
cp -r node_modules_prod node_modules
echo "✓ Copied production node_modules"

# Add back serverless plugins from dev backup
if [ -d "node_modules_dev_backup/serverless-dotenv-plugin" ]; then
    cp -r node_modules_dev_backup/serverless-dotenv-plugin node_modules/
    echo "✓ Added serverless-dotenv-plugin"
fi

if [ -d "node_modules_dev_backup/serverless-offline" ]; then
    cp -r node_modules_dev_backup/serverless-offline node_modules/
    echo "✓ Added serverless-offline"
fi

if [ -d "node_modules_dev_backup/.bin" ]; then
    cp -r node_modules_dev_backup/.bin node_modules/
    echo "✓ Added .bin"
fi

# Deploy
echo "Deploying to AWS..."
npx serverless deploy

# Restore dev node_modules
rm -rf node_modules
mv node_modules_dev_backup node_modules
echo "✓ Restored dev node_modules"

echo "✓ Deployment complete!"
