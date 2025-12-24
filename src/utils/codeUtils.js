// ============================================================
// 代码工具函数
// ============================================================
const vscode = require("vscode");

function findClosingBraceIndex(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findClosingParenIndex(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findPropValueRangeInObject(objText, valueStartRel) {
  let i = valueStartRel;
  while (i < objText.length && /\s/.test(objText[i])) i++;
  const start = i;
  let depth = 0,
    inStr = false,
    quote = null;
  for (; i < objText.length; i++) {
    const ch = objText[i];
    if (inStr) {
      if (ch === quote && objText[i - 1] !== "\\") {
        inStr = false;
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      quote = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      if (depth > 0) depth--;
      else break;
    } else if (ch === "," && depth === 0) break;
  }
  return { start, end: i };
}

function buildNested(keys) {
  let nested = "";
  for (let i = keys.length - 1; i >= 0; i--) {
    nested =
      i === keys.length - 1
        ? `{ ${keys[i]}: '' }`
        : `{ ${keys[i]}: ${nested} }`;
  }
  return nested;
}

async function insertProperty(
  document,
  text,
  openAbs,
  closeAbs,
  key,
  value,
  indentTabs,
  additionOverride
) {
  const objContent = text.slice(openAbs + 1, closeAbs);
  const isMultiline = objContent.includes("\n");
  let prev = closeAbs - 1;
  while (prev > openAbs && /\s/.test(text[prev])) prev--;
  const edit = new vscode.WorkspaceEdit();
  if (isMultiline) {
    if (text[prev] !== ",")
      edit.insert(document.uri, document.positionAt(prev + 1), ",");
    const lastNl = text.lastIndexOf("\n", closeAbs - 1);
    const indentMatch =
      lastNl >= 0 ? text.slice(lastNl + 1, closeAbs).match(/^\s*/) : null;
    const indent = indentMatch ? indentMatch[0] : "\t".repeat(indentTabs || 2);
    const segment = lastNl >= 0 ? text.slice(lastNl + 1, closeAbs) : "";
    const prefix = /^\s*$/.test(segment) ? "" : "\n";
    const addition = additionOverride ?? `${key}: ${value}`;
    edit.insert(
      document.uri,
      document.positionAt(closeAbs),
      `${prefix}${indent}${addition}\n`
    );
  } else {
    const addition = additionOverride ?? `${key}: ${value}`;
    edit.insert(document.uri, document.positionAt(closeAbs), `, ${addition}`);
  }
  await vscode.workspace.applyEdit(edit);
  return true;
}

function findTopLevelKeyIndexInObject(objText, key) {
  let i = 0,
    depth = 0,
    inStr = false,
    quote = null;
  while (i < objText.length) {
    const ch = objText[i];
    if (inStr) {
      if (ch === quote && objText[i - 1] !== "\\") {
        inStr = false;
        quote = null;
      }
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inStr = true;
      quote = ch;
      i++;
      continue;
    }
    if (ch === "{") {
      depth++;
      i++;
      continue;
    }
    if (ch === "}") {
      if (depth > 0) depth--;
      i++;
      continue;
    }
    if (depth === 0 && objText.startsWith(key, i)) {
      const prev = i - 1;
      const boundary = prev < 0 || /[\s,]/.test(objText[prev]);
      if (boundary) {
        let j = i + key.length;
        while (j < objText.length && /\s/.test(objText[j])) j++;
        if (objText[j] === ":") return i;
      }
    }
    i++;
  }
  return -1;
}

module.exports = {
  findClosingBraceIndex,
  findClosingParenIndex,
  findPropValueRangeInObject,
  buildNested,
  insertProperty,
  findTopLevelKeyIndexInObject,
};
