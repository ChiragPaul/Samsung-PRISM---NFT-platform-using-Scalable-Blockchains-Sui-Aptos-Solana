const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Target directory of the Move package
const packagePath = path.join(__dirname, '../sui_contracts');
const publishedTomlPath = path.join(packagePath, 'Published.toml');

function readPublishedMetadata() {
  if (!fs.existsSync(publishedTomlPath)) {
    return null;
  }

  const content = fs.readFileSync(publishedTomlPath, 'utf-8');
  const testnetSection = content.match(/\[published\.testnet\]([\s\S]*?)(?:\n\[|$)/);
  if (!testnetSection) {
    return null;
  }

  const section = testnetSection[1];
  const publishedAt = section.match(/published-at\s*=\s*"([^"]+)"/)?.[1] || '';
  const upgradeCapability = section.match(/upgrade-capability\s*=\s*"([^"]+)"/)?.[1] || '';

  if (!publishedAt || !upgradeCapability) {
    return null;
  }

  return { publishedAt, upgradeCapability };
}

try {
  console.log('Building and publishing Sui Move package...');
  console.log(`Path: ${packagePath}`);
  const publishedMetadata = readPublishedMetadata();
  const isUpgrade = Boolean(publishedMetadata);
  const deployCommand = isUpgrade
    ? `sui client upgrade --upgrade-capability ${publishedMetadata.upgradeCapability} --gas-budget 200000000 --json`
    : 'sui client publish --gas-budget 200000000 --json';

  console.log(isUpgrade ? 'Existing testnet package found. Running upgrade...' : 'No prior testnet publish found. Running publish...');

  const deployOutput = execSync(deployCommand, {
    cwd: packagePath,
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  const parsedOutput = JSON.parse(deployOutput);
  const objectChanges = parsedOutput.objectChanges || [];

  let packageId = publishedMetadata?.publishedAt || '';
  let marketplaceId = '';
  let loyaltyId = '';

  objectChanges.forEach((change) => {
    if (change.type === 'published') {
      packageId = change.packageId;
    }
    if (change.type === 'created' && change.objectType.includes('::marketplace::Marketplace')) {
      marketplaceId = change.objectId;
    }
    if (change.type === 'created' && change.objectType.includes('::loyalty::Loyalty')) {
      loyaltyId = change.objectId;
    }
  });

  console.log('Deployment successful!');
  console.log('=============================');
  console.log(`PACKAGE_ID: ${packageId}`);
  if (marketplaceId) console.log(`MARKETPLACE_ID: ${marketplaceId}`);
  if (loyaltyId) console.log(`LOYALTY_ID: ${loyaltyId}`);
  console.log('=============================');
  console.log('Please copy these values into your frontend environment variables (.env file):');
  console.log(`VITE_PACKAGE_ID=${packageId}`);
  if (marketplaceId) console.log(`VITE_MARKETPLACE_ID=${marketplaceId}`);
  if (loyaltyId) console.log(`VITE_LOYALTY_ID=${loyaltyId}`);
} catch (err) {
  console.error('Deployment failed!');
  if (err.message) console.error(err.message);
  if (err.stdout) console.error(err.stdout.toString());
  if (err.stderr) console.error(err.stderr.toString());
  process.exit(1);
}
