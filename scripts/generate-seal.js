const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

module.exports = async function generateSeal(context) {
  const productFilename = context.packager.appInfo.productFilename;
  const resourceCandidates = [
    path.join(context.appOutDir, 'resources'),
    path.join(context.appOutDir, `${productFilename}.app`, 'Contents', 'Resources'),
  ];
  const resourcesDir = resourceCandidates.find((candidate) =>
    fs.existsSync(path.join(candidate, 'app.asar'))
  );

  if (!resourcesDir) {
    throw new Error(`app.asar not found in expected resources directories: ${resourceCandidates.join(', ')}`);
  }

  const asarPath = path.join(resourcesDir, 'app.asar');
  const sealPath = path.join(resourcesDir, 'integrity.seal');

  const digest = await sha256File(asarPath);
  fs.writeFileSync(sealPath, `${digest}\n`, 'utf8');
  console.log(`Wrote ASAR integrity seal to ${sealPath}`);
};
