const fs = require('fs/promises');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const { minify: minifyHtml } = require('html-minifier-terser');

const srcRoot = path.resolve(__dirname, '..', 'www');
const outRoot = path.resolve(__dirname, '..', 'dist');
const jsRoot = path.join(srcRoot, 'assets', 'js') + path.sep;
const libRoot = path.join(srcRoot, 'assets', 'lib') + path.sep;
const cssRoot = path.join(srcRoot, 'assets', 'css') + path.sep;

const htmlMinifyOptions = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeEmptyAttributes: true,
  keepClosingSlash: true,
  minifyCSS: false,
  minifyJS: false
};

const isUnder = (fullPath, rootPath) =>
  fullPath.startsWith(rootPath);

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const makeWritable = async (dirPath) => {
  try {
    await fs.chmod(dirPath, 0o666);
  } catch {
    return;
  }
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await makeWritable(fullPath);
      continue;
    }
    try {
      await fs.chmod(fullPath, 0o666);
    } catch {
      // 続行する
    }
  }
};

const removeDir = async (dirPath) => {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (err) {
    if (err && (err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'EACCES')) {
      await makeWritable(dirPath);
      await fs.rm(dirPath, { recursive: true, force: true });
      return;
    }
    throw err;
  }
};

const copyFile = async (srcPath, destPath) => {
  await ensureDir(path.dirname(destPath));
  await fs.copyFile(srcPath, destPath);
};

const minifyJsFile = async (srcPath, destPath, isModule) => {
  const code = await fs.readFile(srcPath, 'utf8');
  const result = await minify(code, {
    module: isModule,
    ecma: 2022,
    compress: {
      drop_console: true,
      passes: 2
    },
    mangle: true,
    format: {
      comments: false
    }
  });
  if (result && result.error) {
    throw new Error(`JS minify failed: ${srcPath}\n${result.error}`);
  }
  if (!result || !result.code) {
    throw new Error(`JS minify failed: ${srcPath}`);
  }
  await ensureDir(path.dirname(destPath));
  await fs.writeFile(destPath, result.code, 'utf8');
};

const minifyCssFile = async (srcPath, destPath) => {
  const code = await fs.readFile(srcPath, 'utf8');
  const output = new CleanCSS({ level: 2 }).minify(code);
  if (output.errors && output.errors.length > 0) {
    throw new Error(`CSS minify failed: ${srcPath}\n${output.errors.join('\n')}`);
  }
  await ensureDir(path.dirname(destPath));
  await fs.writeFile(destPath, output.styles, 'utf8');
};

const minifyHtmlFile = async (srcPath, destPath) => {
  const code = await fs.readFile(srcPath, 'utf8');
  const result = await minifyHtml(code, htmlMinifyOptions);
  await ensureDir(path.dirname(destPath));
  await fs.writeFile(destPath, result, 'utf8');
};

const walk = async (dirPath) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...await walk(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
};

const isLockError = (err) =>
  err && (err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'EACCES');

const build = async () => {
  try {
    await removeDir(outRoot);
  } catch (err) {
    if (!isLockError(err)) {
      throw err;
    }
    console.warn('[build] dist cleanup skipped due to locked files. Continuing...');
  }
  await ensureDir(outRoot);

  const files = await walk(srcRoot);
  for (const fullPath of files) {
    const relPath = path.relative(srcRoot, fullPath);
    const destPath = path.join(outRoot, relPath);
    const ext = path.extname(fullPath).toLowerCase();

    if (ext === '.js' && isUnder(fullPath + path.sep, jsRoot)) {
      await minifyJsFile(fullPath, destPath, true);
      continue;
    }

    if (ext === '.js' && isUnder(fullPath + path.sep, libRoot)) {
      await minifyJsFile(fullPath, destPath, true);
      continue;
    }

    if (ext === '.css' && isUnder(fullPath + path.sep, cssRoot)) {
      await minifyCssFile(fullPath, destPath);
      continue;
    }

    if (ext === '.html') {
      await minifyHtmlFile(fullPath, destPath);
      continue;
    }

    await copyFile(fullPath, destPath);
  }
};

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
