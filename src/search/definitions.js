const { findClosingBraceIndex } = require("../shared/utils");

function isMethodReference(line, methodName) {
  if (line.includes(methodName + "(")) {
    return true;
  }
  const eventBindingPatterns = [
    new RegExp(`@\\w+(?:\\.\\w+)*=["']\\s*${methodName}\\s*["']`),
    new RegExp(`v-on:\\w+(?:\\.\\w+)*=["']\\s*${methodName}\\s*["']`),
    new RegExp(`@\\w+(?:\\.\\w+)*=["']\\s*${methodName}\\s*\\(`),
    new RegExp(`v-on:\\w+(?:\\.\\w+)*=["']\\s*${methodName}\\s*\\(`),
  ];
  for (const pattern of eventBindingPatterns) {
    if (pattern.test(line)) {
      return true;
    }
  }
  return false;
}

function findTopLevelKeyIndexInObject(objText, key) {
  let i = 0;
  let depth = 0;
  let inStr = false;
  let quote = null;
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
    if (depth === 0) {
      if (objText.startsWith(key, i)) {
        const prev = i - 1;
        const boundary = prev < 0 || /[\s,]/.test(objText[prev]);
        if (boundary) {
          let j = i + key.length;
          while (j < objText.length && /\s/.test(objText[j])) j++;
          if (objText[j] === ":") return i;
        }
      }
    }
    i++;
  }
  return -1;
}

function findVariableDefinition(text, fullPath, baseName, isVue3) {
  const scriptMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) return null;
  const scriptContent = scriptMatch[1];
  const scriptStartIndex =
    scriptMatch.index + scriptMatch[0].indexOf(scriptContent);
  if (isVue3) {
    const patterns = [
      new RegExp(`const\\s+${baseName}\\s*=`, "g"),
      new RegExp(`let\\s+${baseName}\\s*=`, "g"),
      new RegExp(`var\\s+${baseName}\\s*=`, "g"),
    ];
    for (const pattern of patterns) {
      const match = scriptContent.match(pattern);
      if (match) {
        return { index: scriptStartIndex + scriptContent.indexOf(match[0]) };
      }
    }
  } else {
    const dataMatch = scriptContent.match(
      /data\s*\(\)\s*{\s*return\s*{([\s\S]*?)}/m
    );
    if (dataMatch) {
      const dataContent = dataMatch[1];
      const whole = dataMatch[0];
      const wholeAbs = scriptStartIndex + scriptContent.indexOf(whole);
      const contentAbsStart =
        wholeAbs + whole.indexOf("return {") + "return {".length;
      const idx = findTopLevelKeyIndexInObject(dataContent, baseName);
      if (idx >= 0) {
        return { index: contentAbsStart + idx };
      }
    }
  }
  return null;
}

function findNestedPropertyDefinition(text, fullPath, baseName, isVue3) {
  const parts = fullPath.split(".");
  if (parts.length < 2) return null;
  const chain = parts.slice(1);
  const scriptMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) return null;
  const scriptContent = scriptMatch[1];
  const scriptStartIndex =
    scriptMatch.index + scriptMatch[0].indexOf(scriptContent);
  if (isVue3) {
    const decl = scriptContent.match(
      new RegExp(`(const|let|var)\\s+${baseName}\\s*=\\s*(ref|reactive)\\s*\\(`)
    );
    if (!decl) return null;
    const afterDeclRel = decl.index + decl[0].length;
    const braceRelInSlice = scriptContent.indexOf("{", afterDeclRel);
    if (braceRelInSlice < 0) return null;
    let open = scriptStartIndex + braceRelInSlice;
    let close = findClosingBraceIndex(text, open);
    let objText = text.slice(open + 1, close);
    let parentKey = chain[0];
    for (let i = 0; i < chain.length; i++) {
      const key = chain[i];
      if (i === 0 && chain.length > 1) {
        const pm = objText.match(new RegExp(`\\b${parentKey}\\s*:\\s*`));
        if (!pm) return null;
        const valueStartRel = pm.index + pm[0].length;
        const range = require("../shared/utils").findPropValueRangeInObject(
          objText,
          valueStartRel
        );
        const innerOpenAbs = open + 1 + range.start;
        if (text[innerOpenAbs] !== "{") return null;
        open = innerOpenAbs;
        close = findClosingBraceIndex(text, open);
        objText = text.slice(open + 1, close);
      }
      if (i === chain.length - 1) {
        const idxRel = objText.search(new RegExp(`\\b${key}\\s*:`));
        if (idxRel < 0) return null;
        return { index: open + 1 + idxRel };
      }
    }
    return null;
  } else {
    const dataMatch = scriptContent.match(
      /data\s*\(\)\s*{\s*return\s*{([\s\S]*?)}/m
    );
    if (!dataMatch) return null;
    const dataContent = dataMatch[1];
    const whole = dataMatch[0];
    const wholeAbs = scriptStartIndex + scriptContent.indexOf(whole);
    const contentAbsStart =
      wholeAbs + whole.indexOf("return {") + "return {".length;
    const baseIdxRel = findTopLevelKeyIndexInObject(dataContent, baseName);
    if (baseIdxRel < 0) return null;
    const baseObjOpenRel = dataContent.indexOf("{", baseIdxRel);
    if (baseObjOpenRel < 0) return null;
    let open = contentAbsStart + baseObjOpenRel;
    let close = findClosingBraceIndex(text, open);
    let objText = text.slice(open + 1, close);
    for (let i = 0; i < chain.length; i++) {
      const key = chain[i];
      if (i < chain.length - 1) {
        const pm = objText.match(new RegExp(`\\b${key}\\s*:\\s*`));
        if (!pm) return null;
        const valueStartRel = pm.index + pm[0].length;
        const range = require("../shared/utils").findPropValueRangeInObject(
          objText,
          valueStartRel
        );
        const innerOpenAbs = open + 1 + range.start;
        if (text[innerOpenAbs] !== "{") return null;
        open = innerOpenAbs;
        close = findClosingBraceIndex(text, open);
        objText = text.slice(open + 1, close);
      } else {
        const idxRel = objText.search(new RegExp(`\\b${key}\\s*:`));
        if (idxRel < 0) return null;
        return { index: open + 1 + idxRel };
      }
    }
    return null;
  }
}

function findMethodDefinition(text, methodName, isVue3) {
  const scriptMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) return null;
  const scriptContent = scriptMatch[1];
  const scriptStartIndex =
    scriptMatch.index + scriptMatch[0].indexOf(scriptContent);
  if (isVue3) {
    const patterns = [
      new RegExp(`const\\s+${methodName}\\s*=`, "g"),
      new RegExp(`function\\s+${methodName}\\s*\\(`, "g"),
    ];
    for (const pattern of patterns) {
      const match = scriptContent.match(pattern);
      if (match) {
        return { index: scriptStartIndex + scriptContent.indexOf(match[0]) };
      }
    }
  } else {
    const methodsMatch = scriptContent.match(/methods\s*:\s*{([\s\S]*?)}\s*/m);
    if (methodsMatch) {
      const methodsContent = methodsMatch[1];
      const methodPattern = new RegExp(`${methodName}\\s*\\(`, "g");
      if (methodPattern.test(methodsContent)) {
        const match = methodsContent.match(methodPattern);
        return {
          index:
            scriptStartIndex +
            scriptContent.indexOf(methodsMatch[0]) +
            methodsMatch[0].indexOf(match[0]),
        };
      }
    }
  }
  return null;
}

module.exports = {
  isMethodReference,
  findTopLevelKeyIndexInObject,
  findVariableDefinition,
  findNestedPropertyDefinition,
  findMethodDefinition,
};
