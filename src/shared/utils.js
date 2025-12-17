function findClosingBraceIndex(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findClosingParenIndex(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
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
  let depth = 0;
  let inStr = false;
  let quote = null;
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
    } else if (ch === "," && depth === 0) {
      break;
    }
  }
  const end = i;
  return { start, end };
}

module.exports = {
  findClosingBraceIndex,
  findClosingParenIndex,
  findPropValueRangeInObject,
};
