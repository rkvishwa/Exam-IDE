const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BUILD_SIGNING_KEY = process.env.BUILD_SIGNING_KEY;
const PACKAGE_JSON_PATH = path.resolve(__dirname, '..', 'package.json');
const OUTPUT_PATH = path.resolve(__dirname, '..', 'dist', 'main', 'build-attestation.json');

function main() {
  if (!BUILD_SIGNING_KEY) {
    throw new Error('BUILD_SIGNING_KEY is required to build an attestable package.');
  }

  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  const version = String(packageJson.version || '0.0.0');
  const buildTimestamp = new Date().toISOString();
  const attestation = `${version}|${buildTimestamp}|sonar-official`;
  const token = crypto
    .createHmac('sha256', BUILD_SIGNING_KEY)
    .update(attestation)
    .digest('hex');

  const payload = {
    version,
    buildTimestamp,
    token,
    label: 'OFFICIAL_BUILD',
  };

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote build attestation to ${OUTPUT_PATH}`);
}

main();
