const fs = require('fs');
const path = require('path');
const bytenode = require('bytenode');

const MAIN_DIST_DIR = path.resolve(__dirname, '..', 'dist', 'main');

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

function createLoaderStub(filePath) {
  const jscFileName = `${path.basename(filePath, '.js')}.jsc`;
  const stub = [
    "require('bytenode');",
    `module.exports = require('./${jscFileName}');`,
    '',
  ].join('\n');

  fs.writeFileSync(filePath, stub, 'utf8');
}

function main() {
  if (!fs.existsSync(MAIN_DIST_DIR)) {
    throw new Error(`Main build output not found: ${MAIN_DIST_DIR}`);
  }

  const jsFiles = walk(MAIN_DIST_DIR);
  const generatedOutputs = [];

  try {
    for (const filePath of jsFiles) {
      const outputPath = filePath.replace(/\.js$/, '.jsc');
      bytenode.compileFile({
        filename: filePath,
        output: outputPath,
      });
      generatedOutputs.push(outputPath);
    }

    for (const filePath of jsFiles) {
      createLoaderStub(filePath);
    }
  } catch (error) {
    for (const outputPath of generatedOutputs) {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }
    throw error;
  }

  console.log(`Compiled ${jsFiles.length} main-process files to bytecode.`);
}

main();
