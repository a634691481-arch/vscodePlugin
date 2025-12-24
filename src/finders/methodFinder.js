// ============================================================
// 方法定义查找
// ============================================================

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
      const methodsBlock = methodsMatch[0];
      const methodsContent = methodsMatch[1];
      const base = scriptStartIndex + scriptContent.indexOf(methodsBlock);
      const candidates = [
        new RegExp(`${methodName}\\s*\\(`, "g"),
        new RegExp(`${methodName}\\s*:\\s*function\\s*\\(`, "g"),
        new RegExp(`${methodName}\\s*:\\s*\\([^)]*\\)\\s*=>`, "g"),
      ];
      for (const pattern of candidates) {
        const m = methodsContent.match(pattern);
        if (m) {
          const relInBlock = methodsBlock.indexOf(m[0]);
          if (relInBlock >= 0) return { index: base + relInBlock };
          const relContentStart = methodsBlock.indexOf(methodsContent);
          const relInContent = methodsContent.indexOf(m[0]);
          if (relContentStart >= 0 && relInContent >= 0) {
            return { index: base + relContentStart + relInContent };
          }
        }
      }
    }
  }
  return null;
}

module.exports = { findMethodDefinition };
