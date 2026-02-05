// dist フォルダ内の HTML/CSS/JS を静的チェックするスクリプト
// - HTML: HTMLHint
// - CSS: css-tree の構文解析
// - JS: acorn の構文解析
// 失敗時は非ゼロで終了する

const fs = require("fs");
const path = require("path");

const { HTMLHint } = require("htmlhint");
const csstree = require("css-tree");
const acorn = require("acorn");

const ROOT = process.argv[2] || "dist";

const HTML_HINT_RULES = {
  "attr-lowercase": true,
  "attr-value-double-quotes": true,
  "doctype-first": true,
  "doctype-html5": true,
  "id-unique": true,
  "img-alt-require": true,
  "spec-char-escape": true,
  "tag-pair": true,
  "tagname-lowercase": true,
};

function collectFiles(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, out);
      continue;
    }
    out.push(full);
  }
}

function lintHtml(filePath, content, errors) {
  const result = HTMLHint.verify(content, HTML_HINT_RULES);
  for (const item of result) {
    errors.push({
      file: filePath,
      line: item.line || 1,
      col: item.col || 1,
      message: `HTML: ${item.message}`,
    });
  }
}

function lintCss(filePath, content, errors) {
  try {
    csstree.parse(content, { positions: true });
  } catch (err) {
    errors.push({
      file: filePath,
      line: err.line || 1,
      col: err.column || 1,
      message: `CSS: ${err.message}`,
    });
  }
}

function lintJs(filePath, content, errors) {
  try {
    acorn.parse(content, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
    });
  } catch (err) {
    errors.push({
      file: filePath,
      line: err.loc?.line || 1,
      col: err.loc?.column || 1,
      message: `JS: ${err.message}`,
    });
  }
}

function run() {
  if (!fs.existsSync(ROOT)) {
    console.error(`dist フォルダが見つかりません: ${ROOT}`);
    process.exit(2);
  }

  const files = [];
  collectFiles(ROOT, files);

  const errors = [];
  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== ".html" && ext !== ".css" && ext !== ".js") {
      continue;
    }
    const content = fs.readFileSync(filePath, "utf8");
    if (ext === ".html") {
      lintHtml(filePath, content, errors);
    } else if (ext === ".css") {
      lintCss(filePath, content, errors);
    } else if (ext === ".js") {
      lintJs(filePath, content, errors);
    }
  }

  if (errors.length === 0) {
    console.log("lint: エラーなし");
    return;
  }

  for (const error of errors) {
    console.error(`${error.file}:${error.line}:${error.col} ${error.message}`);
  }
  process.exit(1);
}

run();
